import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProducts, type DBProduct } from "@/lib/products";
import { findSimilarProducts, type SimilarityResult } from "@/engine/similarityEngine";
import { computeProductQuality } from "@/lib/productQualityScore";

// ── Types ────────────────────────────────────────────────────

export interface ProductSubmission {
  id: string;
  partner_id: string;
  product_data: Partial<DBProduct>;
  status: "pending_review" | "approved" | "merged" | "rejected" | "feedback_sent";
  submission_type: "new" | "edit";
  target_product_id: string | null;
  similarity_score: number | null;
  detected_duplicate_id: string | null;
  merged_description: string | null;
  admin_notes: string | null;
  admin_feedback: Record<string, unknown> | null;
  feedback_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Partner hook: submit a new product with dedup detection ──

export function useProductSubmission() {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitProduct = useCallback(
    async (productData: Partial<DBProduct>, options?: {
      editMode?: boolean;
      targetProductId?: string;
    }): Promise<{
      submissionId: string;
      duplicate: SimilarityResult | null;
    }> => {
      if (!user?.id) throw new Error("Not authenticated");

      setIsSubmitting(true);
      setError(null);

      try {
        // 1. Fetch catalog (subset by category if available)
        const catalog = await fetchProducts();
        const subset = productData.category
          ? catalog.filter((p) => p.category === productData.category)
          : catalog;

        // 2. Run similarity engine
        const matches = findSimilarProducts(productData, subset);
        const bestMatch = matches.length > 0 && matches[0].score > 70 ? matches[0] : null;

        // 3. If duplicate found, call merge-descriptions edge function
        let mergedDescription: string | null = null;
        if (bestMatch) {
          try {
            const { data: mergeData } = await supabase.functions.invoke(
              "merge-descriptions",
              {
                body: {
                  description_b: productData.long_description ?? productData.short_description ?? "",
                  description_a:
                    bestMatch.product.long_description ?? bestMatch.product.short_description ?? "",
                  product_name: productData.name ?? "",
                },
              }
            );
            mergedDescription = mergeData?.merged ?? null;
          } catch {
            // Edge function may not be deployed yet; continue without merge
          }
        }

        // 4. Resolve the actual partners.id (not the auth user id)
        const { data: partnerRow } = await supabase
          .from("partners")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        const resolvedPartnerId = partnerRow?.id ?? user.id;

        // 5. Upsert into product_submissions (replace existing pending edit for same product)
        const isEdit = options?.editMode && options?.targetProductId;
        const submissionPayload = {
          partner_id: resolvedPartnerId,
          product_data: productData as Record<string, unknown>,
          status: "pending_review",
          similarity_score: bestMatch ? bestMatch.score : null,
          detected_duplicate_id: bestMatch ? bestMatch.product.id : null,
          merged_description: mergedDescription,
          admin_notes: null,
          submission_type: isEdit ? "edit" : "new",
          target_product_id: isEdit ? options.targetProductId : null,
        };

        // If editing, replace any existing pending submission for the same target product
        if (isEdit) {
          await supabase
            .from("product_submissions")
            .delete()
            .eq("partner_id", resolvedPartnerId)
            .eq("target_product_id", options.targetProductId!)
            .eq("status", "pending_review");
        }

        const { data: submission, error: insertError } = await supabase
          .from("product_submissions")
          .insert(submissionPayload as any)
          .select("id")
          .single();

        if (insertError) throw insertError;

        // 5. Create notification for admins
        const partnerName = profile?.company ?? profile?.email ?? "Un partenaire";
        const dupLabel = isEdit
          ? `${partnerName} a soumis une modification de produit à valider`
          : bestMatch
          ? `${partnerName} a soumis un produit — doublon potentiel détecté`
          : `${partnerName} a soumis un nouveau produit à valider`;

        // Fetch admin user ids
        const { data: admins } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_type", "admin")
          .limit(50);

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin) => ({
            user_id: admin.id,
            title: isEdit ? "Modification produit soumise" : "Nouveau produit soumis",
            body: dupLabel,
            type: "product_submission",
            link: `/admin?tab=submissions`,
          }));

          await supabase
            .from("notifications")
            .insert(notifications as any);
        }

        return { submissionId: submission.id as string, duplicate: bestMatch };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Submission failed";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user?.id, profile]
  );

  return { submitProduct, isSubmitting, error };
}

// ── Admin hook: review submissions ───────────────────────────

export function useAdminSubmissions() {
  const queryClient = useQueryClient();

  const {
    data: submissions = [],
    isLoading,
    ...rest
  } = useQuery<ProductSubmission[]>({
    queryKey: ["admin-product-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_submissions")
        .select("*, partner:partner_id(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as unknown as ProductSubmission[];
    },
    staleTime: 1000 * 30,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["partner-products"] });
    queryClient.invalidateQueries({ queryKey: ["partner-pending-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["partner-submissions-feedback"] });
    queryClient.invalidateQueries({ queryKey: ["partner-products-count"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product-offers"] });
  };

  const notifyPartner = async (partnerId: string, title: string, body: string) => {
    // partnerId is from partners table — resolve to auth user_id for notifications
    const { data: partner } = await supabase.from("partners").select("user_id").eq("id", partnerId).maybeSingle();
    if (partner?.user_id) {
      await supabase.from("notifications").insert({ user_id: partner.user_id, title, body, type: "info", link: "/account?tab=products" });
    }
  };

  // Approve as a brand new product
  const approveAsNew = useCallback(
    async (id: string) => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission) throw new Error("Submission not found");

      const pd = submission.product_data as Record<string, unknown>;

      // Check submission is still pending (race condition protection)
      const { data: currentSubmission } = await supabase
        .from("product_submissions")
        .select("status")
        .eq("id", id)
        .single();
      if (currentSubmission?.status !== "pending_review") {
        throw new Error("Cette soumission a déjà été traitée par un autre administrateur");
      }

      // Validate required fields
      if (!pd.name || !pd.category) {
        throw new Error("Le produit soumis n'a pas de nom ou de catégorie");
      }

      // Convert base64 images to Storage URLs
      let finalImageUrl = (pd.image_url as string) ?? null;
      if (finalImageUrl && finalImageUrl.startsWith("data:image")) {
        finalImageUrl = await uploadBase64ToStorage(finalImageUrl, (pd.name as string) || "product", 0);
      }
      const rawGallery = (pd.gallery_urls as string[]) ?? [];
      const finalGallery: string[] = [];
      for (let i = 0; i < rawGallery.length; i++) {
        const url = rawGallery[i];
        if (url.startsWith("data:image")) {
          const uploaded = await uploadBase64ToStorage(url, (pd.name as string) || "product", i + 1);
          if (uploaded) finalGallery.push(uploaded);
        } else if (url.startsWith("http")) {
          finalGallery.push(url);
        }
      }
      // Fallback: use first gallery image as main image if image_url is missing
      if (!finalImageUrl && finalGallery.length > 0) {
        finalImageUrl = finalGallery[0];
      }
      // Process environment_urls (also may contain base64)
      const rawEnvNew = (pd.environment_urls as string[]) ?? [];
      const finalEnvNew: string[] = [];
      for (let i = 0; i < rawEnvNew.length; i++) {
        const url = rawEnvNew[i];
        if (url.startsWith("data:image")) {
          const uploaded = await uploadBase64ToStorage(url, (pd.name as string) || "env", i + 20);
          if (uploaded) finalEnvNew.push(uploaded);
        } else if (url.startsWith("http")) {
          finalEnvNew.push(url);
        }
      }

      // Explicitly map fields to avoid unknown JSONB keys in products table
      const productInsert: Record<string, unknown> = {
        // Identity
        name: pd.name,
        category: pd.category,
        subcategory: pd.subcategory ?? null,
        product_family: pd.product_family ?? null,
        collection: pd.collection ?? null,
        brand_source: pd.brand_source ?? null,
        supplier_internal: pd.supplier_internal ?? null,
        // Descriptions
        short_description: pd.short_description ?? null,
        long_description: pd.long_description ?? null,
        // Media
        image_url: finalImageUrl,
        gallery_urls: finalGallery,
        environment_urls: finalEnvNew,
        // Pricing
        indicative_price: pd.indicative_price ?? null,
        price_min: pd.price_min ?? null,
        price_max: pd.price_max ?? null,
        // Colors
        main_color: pd.main_color ?? null,
        secondary_color: pd.secondary_color ?? null,
        available_colors: pd.available_colors ?? [],
        color_variants: pd.color_variants ?? [],
        // Materials
        material_structure: pd.material_structure ?? null,
        material_seat: pd.material_seat ?? null,
        // Dimensions
        dimensions_length_cm: pd.dimensions_length_cm ?? null,
        dimensions_width_cm: pd.dimensions_width_cm ?? null,
        dimensions_height_cm: pd.dimensions_height_cm ?? null,
        seat_height_cm: pd.seat_height_cm ?? null,
        weight_kg: pd.weight_kg ?? null,
        table_shape: pd.table_shape ?? null,
        default_seating_capacity: pd.default_seating_capacity ?? null,
        recommended_seating_min: pd.recommended_seating_min ?? null,
        recommended_seating_max: pd.recommended_seating_max ?? null,
        combinable: pd.combinable ?? false,
        combined_capacity_if_joined: pd.combined_capacity_if_joined ?? null,
        // Tags
        style_tags: pd.style_tags ?? [],
        ambience_tags: pd.ambience_tags ?? [],
        palette_tags: pd.palette_tags ?? [],
        material_tags: pd.material_tags ?? [],
        use_case_tags: pd.use_case_tags ?? [],
        technical_tags: pd.technical_tags ?? [],
        product_type_tags: pd.product_type_tags ?? {},
        // Booleans
        is_outdoor: pd.is_outdoor ?? true,
        is_stackable: pd.is_stackable ?? false,
        is_chr_heavy_use: pd.is_chr_heavy_use ?? false,
        uv_resistant: pd.uv_resistant ?? false,
        weather_resistant: pd.weather_resistant ?? false,
        fire_retardant: pd.fire_retardant ?? false,
        lightweight: pd.lightweight ?? false,
        easy_maintenance: pd.easy_maintenance ?? false,
        customizable: pd.customizable ?? false,
        dismountable: pd.dismountable ?? false,
        requires_assembly: pd.requires_assembly ?? false,
        // Stock & delivery
        stock_status: pd.stock_status ?? "available",
        stock_quantity: pd.stock_quantity ?? null,
        estimated_delivery_days: pd.estimated_delivery_days ?? null,
        availability_type: pd.availability_type ?? "available",
        // Other
        country_of_manufacture: pd.country_of_manufacture ?? null,
        warranty: pd.warranty ?? null,
        maintenance_info: pd.maintenance_info ?? null,
        documents: pd.documents ?? [],
        // Multilingual fields
        short_description_fr: pd.short_description_fr ?? null,
        short_description_es: pd.short_description_es ?? null,
        short_description_it: pd.short_description_it ?? null,
        long_description_fr: pd.long_description_fr ?? null,
        long_description_es: pd.long_description_es ?? null,
        long_description_it: pd.long_description_it ?? null,
        name_fr: pd.name_fr ?? null,
        name_es: pd.name_es ?? null,
        name_it: pd.name_it ?? null,
        maintenance_info_fr: pd.maintenance_info_fr ?? null,
        maintenance_info_es: pd.maintenance_info_es ?? null,
        maintenance_info_it: pd.maintenance_info_it ?? null,
        // Scores — compute quality from product data
        data_quality_score: computeProductQuality(pd as Partial<DBProduct>).score / 100,
        popularity_score: 0.5,
        priority_score: 0.5,
        // Owner & status
        partner_id: submission.partner_id,
        publish_status: "published",
      };

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert(productInsert as any)
        .select("id")
        .single();

      if (productError) throw productError;

      // Create product_offers entry linking the partner to the new product
      const { error: offerError } = await supabase
        .from("product_offers")
        .insert({
          partner_id: submission.partner_id,
          product_id: newProduct.id,
          price: pd.price_min ?? null,
          stock_status: pd.stock_status ?? "available",
          stock_quantity: pd.stock_quantity ?? null,
          delivery_delay_days: pd.estimated_delivery_days ?? null,
          is_active: true,
          pricing_mode: "public",
          currency: "EUR",
          partner_ref: pd.supplier_internal ?? null,
          partner_color_name: pd.main_color ?? null,
          collection_name: pd.collection ?? null,
          minimum_order: pd.minimum_order ?? null,
        } as any);

      if (offerError) {
        console.warn("Failed to create product_offer:", offerError.message);
      }

      // Update submission status with approved_product_id
      const { error: updateError } = await supabase
        .from("product_submissions")
        .update({
          status: "approved",
          approved_product_id: newProduct.id,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (updateError) throw updateError;

      // Notify partner
      const productName = pd.name ?? "votre produit";
      await notifyPartner(submission.partner_id, "Produit approuvé", `Votre produit ${productName} a été approuvé et publié`);

      invalidate();
    },
    [submissions, queryClient]
  );

  // Approve an edit — update the existing product with new data
  // Upload base64/blob images to Storage, return public URL
  const uploadBase64ToStorage = async (dataUrl: string, productName: string, index: number): Promise<string | null> => {
    if (!dataUrl) return null;
    if (dataUrl.startsWith("http")) return dataUrl; // already a URL
    if (!dataUrl.startsWith("data:image")) return null; // not an image
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const path = `products/${slug}-${Date.now()}-${index}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: blob.type, upsert: true });
      if (error) return null;
      return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    } catch { return null; }
  };

  const approveEdit = useCallback(
    async (id: string) => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission) throw new Error("Submission not found");

      // Check submission is still pending (race condition protection)
      const { data: currentEditSubmission } = await supabase
        .from("product_submissions")
        .select("status")
        .eq("id", id)
        .single();
      if (currentEditSubmission?.status !== "pending_review") {
        throw new Error("Cette soumission a déjà été traitée par un autre administrateur");
      }

      const targetProductId = (submission as any).target_product_id;
      if (!targetProductId) throw new Error("Pas de produit cible pour cette modification");

      const pd = submission.product_data as Record<string, unknown>;

      // Convert base64 images to Storage URLs
      let finalImageUrl = (pd.image_url as string) ?? null;
      if (finalImageUrl && finalImageUrl.startsWith("data:image")) {
        finalImageUrl = await uploadBase64ToStorage(finalImageUrl, (pd.name as string) || "product", 0);
      }
      const rawGallery = (pd.gallery_urls as string[]) ?? [];
      const finalGallery: string[] = [];
      for (let i = 0; i < rawGallery.length; i++) {
        const url = rawGallery[i];
        if (url.startsWith("data:image")) {
          const uploaded = await uploadBase64ToStorage(url, (pd.name as string) || "product", i + 1);
          if (uploaded) finalGallery.push(uploaded);
        } else if (url.startsWith("http")) {
          finalGallery.push(url);
        }
      }
      if (!finalImageUrl && finalGallery.length > 0) {
        finalImageUrl = finalGallery[0];
      }
      const rawEnvEdit = (pd.environment_urls as string[]) ?? [];
      const finalEnvEdit: string[] = [];
      for (let i = 0; i < rawEnvEdit.length; i++) {
        const url = rawEnvEdit[i];
        if (url.startsWith("data:image")) {
          const uploaded = await uploadBase64ToStorage(url, (pd.name as string) || "env", i + 20);
          if (uploaded) finalEnvEdit.push(uploaded);
        } else if (url.startsWith("http")) {
          finalEnvEdit.push(url);
        }
      }

      // Build update payload (same fields as approveAsNew, minus scores/partner_id)
      const productUpdate: Record<string, unknown> = {
        name: pd.name, category: pd.category, subcategory: pd.subcategory ?? null,
        short_description: pd.short_description ?? null, long_description: pd.long_description ?? null,
        image_url: finalImageUrl, gallery_urls: finalGallery,
        environment_urls: finalEnvEdit,
        price_min: pd.price_min ?? null, price_max: pd.price_max ?? null,
        main_color: pd.main_color ?? null, secondary_color: pd.secondary_color ?? null,
        available_colors: pd.available_colors ?? [], color_variants: pd.color_variants ?? [],
        material_structure: pd.material_structure ?? null, material_seat: pd.material_seat ?? null,
        dimensions_length_cm: pd.dimensions_length_cm ?? null, dimensions_width_cm: pd.dimensions_width_cm ?? null,
        dimensions_height_cm: pd.dimensions_height_cm ?? null, seat_height_cm: pd.seat_height_cm ?? null,
        weight_kg: pd.weight_kg ?? null,
        style_tags: pd.style_tags ?? [], ambience_tags: pd.ambience_tags ?? [],
        material_tags: pd.material_tags ?? [], use_case_tags: pd.use_case_tags ?? [],
        technical_tags: pd.technical_tags ?? [], product_type_tags: pd.product_type_tags ?? {},
        is_outdoor: pd.is_outdoor ?? true, is_stackable: pd.is_stackable ?? false,
        is_chr_heavy_use: pd.is_chr_heavy_use ?? false, uv_resistant: pd.uv_resistant ?? false,
        weather_resistant: pd.weather_resistant ?? false, fire_retardant: pd.fire_retardant ?? false,
        lightweight: pd.lightweight ?? false, easy_maintenance: pd.easy_maintenance ?? false,
        stock_status: pd.stock_status ?? null, stock_quantity: pd.stock_quantity ?? null,
        estimated_delivery_days: pd.estimated_delivery_days ?? null,
        country_of_manufacture: pd.country_of_manufacture ?? null, warranty: pd.warranty ?? null,
        // Missing fields
        indicative_price: pd.indicative_price ?? null,
        product_family: pd.product_family ?? null,
        collection: pd.collection ?? null,
        brand_source: pd.brand_source ?? null,
        supplier_internal: pd.supplier_internal ?? null,
        table_shape: pd.table_shape ?? null,
        default_seating_capacity: pd.default_seating_capacity ?? null,
        recommended_seating_min: pd.recommended_seating_min ?? null,
        recommended_seating_max: pd.recommended_seating_max ?? null,
        combinable: pd.combinable ?? false,
        combined_capacity_if_joined: pd.combined_capacity_if_joined ?? null,
        requires_assembly: pd.requires_assembly ?? false,
        customizable: pd.customizable ?? false,
        dismountable: pd.dismountable ?? false,
        maintenance_info: pd.maintenance_info ?? null,
        documents: pd.documents ?? [],
        availability_type: pd.availability_type ?? "available",
        // Multilingual fields
        short_description_fr: pd.short_description_fr ?? null,
        short_description_es: pd.short_description_es ?? null,
        short_description_it: pd.short_description_it ?? null,
        long_description_fr: pd.long_description_fr ?? null,
        long_description_es: pd.long_description_es ?? null,
        long_description_it: pd.long_description_it ?? null,
        name_fr: pd.name_fr ?? null,
        name_es: pd.name_es ?? null,
        name_it: pd.name_it ?? null,
        maintenance_info_fr: pd.maintenance_info_fr ?? null,
        maintenance_info_es: pd.maintenance_info_es ?? null,
        maintenance_info_it: pd.maintenance_info_it ?? null,
        publish_status: "published",
      };

      const { data: updated, error: updateError } = await supabase
        .from("products")
        .update(productUpdate)
        .eq("id", targetProductId)
        .select("id");
      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error("Le produit cible n'existe plus. La modification n'a pas pu être appliquée.");

      // Update product_offers for this partner + product (price, stock, delivery)
      const offerUpdate: Record<string, unknown> = {};
      if (pd.price_min !== undefined) offerUpdate.price = pd.price_min ?? null;
      if (pd.stock_status !== undefined) offerUpdate.stock_status = pd.stock_status ?? null;
      if (pd.stock_quantity !== undefined) offerUpdate.stock_quantity = pd.stock_quantity ?? null;
      if (pd.estimated_delivery_days !== undefined) offerUpdate.delivery_delay_days = pd.estimated_delivery_days ?? null;
      if (pd.supplier_internal !== undefined) offerUpdate.partner_ref = pd.supplier_internal ?? null;
      if (pd.main_color !== undefined) offerUpdate.partner_color_name = pd.main_color ?? null;
      if (pd.collection !== undefined) offerUpdate.collection_name = pd.collection ?? null;

      if (Object.keys(offerUpdate).length > 0) {
        await supabase
          .from("product_offers")
          .update(offerUpdate)
          .eq("product_id", targetProductId)
          .eq("partner_id", submission.partner_id);
      }

      // Mark submission as approved
      await supabase
        .from("product_submissions")
        .update({ status: "approved", updated_at: new Date().toISOString() } as any)
        .eq("id", id);

      const productName = (pd.name as string) ?? "votre produit";
      await notifyPartner(submission.partner_id, "Modification approuvée", `Les modifications de ${productName} ont été publiées`);
      invalidate();
    },
    [submissions, queryClient]
  );

  // Approve as merge — link offer to existing product
  const approveAsMerge = useCallback(
    async (id: string) => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission || !submission.detected_duplicate_id)
        throw new Error("Submission not found or no duplicate detected");

      // Check submission is still pending (race condition protection)
      const { data: currentMergeSubmission } = await supabase
        .from("product_submissions")
        .select("status")
        .eq("id", id)
        .single();
      if (currentMergeSubmission?.status !== "pending_review") {
        throw new Error("Cette soumission a déjà été traitée par un autre administrateur");
      }

      const pd = submission.product_data as Record<string, unknown>;

      // Update existing product description if merged_description exists
      if (submission.merged_description) {
        await supabase
          .from("products")
          .update({
            long_description: submission.merged_description,
          } as any)
          .eq("id", submission.detected_duplicate_id);
      }

      // Create a product offer linking the partner to the existing product
      // Map all available fields from submission to offer
      const offerInsert: Record<string, unknown> = {
        product_id: submission.detected_duplicate_id,
        partner_id: submission.partner_id,
        price: pd.price_min ?? null,
        currency: "EUR",
        minimum_order: pd.minimum_order ?? null,
        purchase_type: pd.stock_status === "production" || pd.stock_status === "on_order"
          ? "production"
          : "stock",
        stock_status: pd.stock_status ?? "available",
        stock_quantity: pd.stock_quantity ?? null,
        delivery_delay_days: pd.estimated_delivery_days ?? null,
        partner_ref: pd.supplier_internal ?? null,
        partner_color_name: pd.main_color ?? null,
        notes: pd.indicative_price
          ? `Prix indicatif partenaire : ${pd.indicative_price}`
          : null,
        is_active: true,
      };

      const { error: offerError } = await supabase
        .from("product_offers")
        .insert(offerInsert as any);

      if (offerError) throw offerError;

      // Update submission status
      const { error: updateError } = await supabase
        .from("product_submissions")
        .update({ status: "merged", updated_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (updateError) throw updateError;

      // Notify partner
      const productName = pd.name ?? "votre produit";
      await notifyPartner(submission.partner_id, "Produit fusionné", `Votre produit ${productName} a été approuvé et fusionné avec un produit existant`);

      invalidate();
    },
    [submissions, queryClient]
  );

  // Reject
  const reject = useCallback(
    async (id: string, notes: string) => {
      const { error } = await supabase
        .from("product_submissions")
        .update({
          status: "rejected",
          admin_notes: notes,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (error) throw error;

      // Notify partner with rejection reason
      const submission = submissions.find((s) => s.id === id);
      if (submission) {
        const productName = (submission.product_data as Record<string, unknown>)?.name ?? "votre produit";
        const reason = notes ? ` — Raison : ${notes}` : "";
        await notifyPartner(submission.partner_id, "Produit rejeté", `Votre produit ${productName} a été rejeté${reason}`);
      }

      invalidate();
    },
    [submissions, queryClient]
  );

  // Re-generate merged description via edge function
  const regenerateMerge = useCallback(
    async (id: string) => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission || !submission.detected_duplicate_id)
        throw new Error("Submission not found or no duplicate");

      // Fetch the existing product's description
      const { data: existing } = await supabase
        .from("products")
        .select("long_description, short_description, name")
        .eq("id", submission.detected_duplicate_id)
        .single();

      const { data: mergeData, error: fnError } = await supabase.functions.invoke(
        "merge-descriptions",
        {
          body: {
            description_b:
              (submission.product_data as Record<string, unknown>)?.long_description ??
              (submission.product_data as Record<string, unknown>)?.short_description ??
              "",
            description_a:
              existing?.long_description ?? existing?.short_description ?? "",
            product_name:
              (submission.product_data as Record<string, unknown>)?.name ?? "",
          },
        }
      );

      if (fnError) throw fnError;

      const mergedDescription = mergeData?.merged ?? null;

      const { error: updateError } = await supabase
        .from("product_submissions")
        .update({
          merged_description: mergedDescription,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (updateError) throw updateError;

      invalidate();
    },
    [submissions, queryClient]
  );

  return {
    submissions,
    isLoading,
    approveAsNew,
    approveEdit,
    approveAsMerge,
    reject,
    regenerateMerge,
    ...rest,
  };
}

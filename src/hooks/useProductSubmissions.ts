import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProducts, type DBProduct } from "@/lib/products";
import { findSimilarProducts, type SimilarityResult } from "@/engine/similarityEngine";

// ── Types ────────────────────────────────────────────────────

export interface ProductSubmission {
  id: string;
  partner_id: string;
  product_data: Partial<DBProduct>;
  status: "pending_review" | "approved" | "merged" | "rejected";
  similarity_score: number | null;
  detected_duplicate_id: string | null;
  merged_description: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Partner hook: submit a new product with dedup detection ──

export function useProductSubmission() {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitProduct = useCallback(
    async (productData: Partial<DBProduct>): Promise<{
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

        // 4. Insert into product_submissions
        const submissionPayload = {
          partner_id: user.id,
          product_data: productData as Record<string, unknown>,
          status: "pending_review",
          similarity_score: bestMatch ? bestMatch.score : null,
          detected_duplicate_id: bestMatch ? bestMatch.product.id : null,
          merged_description: mergedDescription,
          admin_notes: null,
        };

        const { data: submission, error: insertError } = await supabase
          .from("product_submissions")
          .insert(submissionPayload as Record<string, unknown>)
          .select("id")
          .single();

        if (insertError) throw insertError;

        // 5. Create notification for admins
        const partnerName = profile?.company ?? profile?.email ?? "Un partenaire";
        const dupLabel = bestMatch
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
            title: "Nouveau produit soumis",
            body: dupLabel,
            type: "product_submission",
            link: `/admin?tab=submissions`,
          }));

          await supabase
            .from("notifications")
            .insert(notifications as Record<string, unknown>[]);
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as unknown as ProductSubmission[];
    },
    staleTime: 1000 * 30,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });

  const notifyPartner = async (partnerId: string, title: string, body: string) => {
    const { data: profile } = await supabase.from("user_profiles").select("id").eq("id", partnerId).maybeSingle();
    if (profile) {
      await supabase.from("notifications").insert({ user_id: profile.id, title, body, type: "info", link: "/account?tab=products" });
    }
  };

  // Approve as a brand new product
  const approveAsNew = useCallback(
    async (id: string) => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission) throw new Error("Submission not found");

      const productData = submission.product_data;

      // Insert into products table
      const { error: productError } = await supabase
        .from("products")
        .insert({
          ...productData,
          publish_status: "published",
        } as Record<string, unknown>);

      if (productError) throw productError;

      // Update submission status
      const { error: updateError } = await supabase
        .from("product_submissions")
        .update({ status: "approved", updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", id);

      if (updateError) throw updateError;

      // Notify partner
      const productName = (productData as Record<string, unknown>)?.name ?? "votre produit";
      await notifyPartner(submission.partner_id, "Produit approuvé", `Votre produit ${productName} a été approuvé et publié`);

      await invalidate();
    },
    [submissions, queryClient]
  );

  // Approve as merge — link offer to existing product
  const approveAsMerge = useCallback(
    async (id: string) => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission || !submission.detected_duplicate_id)
        throw new Error("Submission not found or no duplicate detected");

      // Update existing product description if merged_description exists
      if (submission.merged_description) {
        await supabase
          .from("products")
          .update({
            long_description: submission.merged_description,
          } as Record<string, unknown>)
          .eq("id", submission.detected_duplicate_id);
      }

      // Create a product offer linking the partner to the existing product
      const { error: offerError } = await supabase
        .from("product_offers")
        .insert({
          product_id: submission.detected_duplicate_id,
          partner_id: submission.partner_id,
          price: (submission.product_data as Record<string, unknown>)?.price_min ?? null,
          is_active: true,
        } as Record<string, unknown>);

      if (offerError) throw offerError;

      // Update submission status
      const { error: updateError } = await supabase
        .from("product_submissions")
        .update({ status: "merged", updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", id);

      if (updateError) throw updateError;

      // Notify partner
      const productName = (submission.product_data as Record<string, unknown>)?.name ?? "votre produit";
      await notifyPartner(submission.partner_id, "Produit fusionné", `Votre produit ${productName} a été approuvé et fusionné avec un produit existant`);

      await invalidate();
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
        } as Record<string, unknown>)
        .eq("id", id);

      if (error) throw error;

      // Notify partner with rejection reason
      const submission = submissions.find((s) => s.id === id);
      if (submission) {
        const productName = (submission.product_data as Record<string, unknown>)?.name ?? "votre produit";
        const reason = notes ? ` — Raison : ${notes}` : "";
        await notifyPartner(submission.partner_id, "Produit rejeté", `Votre produit ${productName} a été rejeté${reason}`);
      }

      await invalidate();
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
        } as Record<string, unknown>)
        .eq("id", id);

      if (updateError) throw updateError;

      await invalidate();
    },
    [submissions, queryClient]
  );

  return {
    submissions,
    isLoading,
    approveAsNew,
    approveAsMerge,
    reject,
    regenerateMerge,
    ...rest,
  };
}

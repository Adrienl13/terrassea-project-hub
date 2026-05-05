// ============================================================================
// referentials — React Query hooks for referential tables
// ÉTAPE 8d-5 (2026-05-05).
//
// Exposes 4 hooks for the certifications + material_brands ecosystem :
//   - useMaterialBrands(category?)              → catalog of material brands
//   - useCertifications({ category?, scope? })  → catalog of certifications
//   - usePartnerCertifications(partnerId)       → brand-level certs of a partner
//   - useProductCertifications(productId)       → product-level certs (PV)
//
// Pattern aligned with existing useFabricBrands() in VariantsGrid (queryKey
// convention `['referentials', tableName, filters]` enables targeted
// invalidations via queryClient.invalidateQueries(['referentials', ...])).
//
// NOTE
// supabase/types.ts is not yet regenerated for the new partner_certifications
// + product_certifications tables created in migrations 20260505122428 and
// 20260505122605. Types declared manually below until next regen.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ── Type aliases from auto-generated types ─────────────────────────────────

export type MaterialBrand = Database["public"]["Tables"]["material_brands"]["Row"];
export type Certification = Database["public"]["Tables"]["certifications"]["Row"];
export type PartnerCertification = Database["public"]["Tables"]["partner_certifications"]["Row"];
export type ProductCertification = Database["public"]["Tables"]["product_certifications"]["Row"];

export type PartnerCertificationWithDetails = PartnerCertification & {
  certification: Certification;
};

export type ProductCertificationWithDetails = ProductCertification & {
  certification: Certification;
};

// ── Hooks ───────────────────────────────────────────────────────────────────

const STALE_5_MIN = 1000 * 60 * 5;

/**
 * Catalog of material brands, optionally filtered by category
 * (composite / fabric / metal / other / wood).
 *
 * Drop-in replacement for the in-line `useFabricBrands()` once
 * VariantsGrid is migrated to call `useMaterialBrands('fabric')`.
 */
export function useMaterialBrands(category?: string) {
  return useQuery<MaterialBrand[]>({
    queryKey: ["referentials", "material_brands", category ?? null],
    queryFn: async () => {
      let q = supabase.from("material_brands").select("*").order("name");
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MaterialBrand[];
    },
    staleTime: STALE_5_MIN,
  });
}

/**
 * Catalog of certifications, optionally filtered by category and/or scope.
 * scope ∈ { brand, product_family, product_unit } — see migration 20260505121902.
 */
export function useCertifications(filters?: { category?: string; scope?: string }) {
  return useQuery<Certification[]>({
    queryKey: ["referentials", "certifications", filters ?? null],
    queryFn: async () => {
      let q = supabase.from("certifications").select("*").order("name");
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.scope) q = q.eq("scope", filters.scope);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Certification[];
    },
    staleTime: STALE_5_MIN,
  });
}

/**
 * Brand-level certifications held by a partner. Joined with `certifications`
 * to expose `name`, `slug`, `scope`, `logo_url` in a single query (avoids
 * N+1 in display).
 *
 * `enabled: !!partnerId` so the hook is safe to call before the partner ID
 * is loaded by a parent query.
 */
export function usePartnerCertifications(partnerId: string | undefined) {
  return useQuery<PartnerCertificationWithDetails[]>({
    queryKey: ["referentials", "partner_certifications", partnerId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_certifications")
        .select("*, certification:certifications(*)")
        .eq("partner_id", partnerId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as PartnerCertificationWithDetails[];
    },
    enabled: !!partnerId,
    staleTime: STALE_5_MIN,
  });
}

/**
 * Product-level certifications (PV) of a product. Same shape as
 * `usePartnerCertifications` but joining via `product_id`.
 */
export function useProductCertifications(productId: string | undefined) {
  return useQuery<ProductCertificationWithDetails[]>({
    queryKey: ["referentials", "product_certifications", productId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_certifications")
        .select("*, certification:certifications(*)")
        .eq("product_id", productId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as ProductCertificationWithDetails[];
    },
    enabled: !!productId,
    staleTime: STALE_5_MIN,
  });
}

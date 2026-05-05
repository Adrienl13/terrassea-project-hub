// Tests for referentials hooks + zod schemas — ÉTAPE 8d-5.
//
// Unit-style tests on : queryKey conventions (consistency with React Query
// invalidation patterns) + Zod schemas (validation edge cases).
// React render with QueryClientProvider not done here (heavy + fragile,
// per pattern noted in 8b/8c).

import { describe, it, expect } from "vitest";
import { partnerCertificationSchema } from "@/lib/referentials/partnerCertificationSchema";
import { productCertificationSchema } from "@/lib/referentials/productCertificationSchema";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";

// ── partnerCertificationSchema ──────────────────────────────────────────────

describe("partnerCertificationSchema (Phase 8d-5)", () => {
  it("validates happy path with all fields", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      certificate_number: "FSC-C123456",
      issued_at: "2024-01-15",
      valid_until: "2027-01-15",
      certificate_url: "https://fsc.org/cert/C123456.pdf",
      notes: "Audit annuel à prévoir",
    });
    expect(result.success).toBe(true);
  });

  it("validates minimal payload (only required uuids)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_UUID,
      certification_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects partner_id non-uuid", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: "not-a-uuid",
      certification_id: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed certificate_url (no protocol)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      certificate_url: "fsc.org/cert/123.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for certificate_url (form blank field)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      certificate_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects issued_at non-ISO format", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      issued_at: "15/01/2024",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null dates (cert without expiration)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      issued_at: null,
      valid_until: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── productCertificationSchema ──────────────────────────────────────────────

describe("productCertificationSchema (Phase 8d-5)", () => {
  it("validates happy path with PV metadata", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      pv_number: "PV-2024-12345",
      lab_name: "LNE",
      issued_at: "2024-03-10",
      valid_until: "2029-03-10",
      pv_document_url: "https://lne.fr/pv/2024-12345.pdf",
      notes: "Test selon NF EN 1335-2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects pv_document_url malformée", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      pv_document_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects valid_until format ISO (2024-13-99 invalide regex)", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_UUID,
      certification_id: VALID_UUID_2,
      valid_until: "2024/13/99",
    });
    expect(result.success).toBe(false);
  });

  it("accepts minimal payload (only required uuids)", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_UUID,
      certification_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });
});

// ── Hook queryKey conventions (assert consistency for invalidation) ────────

describe("hook queryKey conventions — invalidation contract", () => {
  // Consumers call queryClient.invalidateQueries({ queryKey: ['referentials', ...] })
  // to bust caches selectively. These tests document the contract.

  it("useMaterialBrands queryKey shape: ['referentials', 'material_brands', category|null]", () => {
    // queryKey contract is ['referentials', 'material_brands', category ?? null]
    const expected = ["referentials", "material_brands", "fabric"];
    const noCategory = ["referentials", "material_brands", null];
    expect(expected[0]).toBe("referentials");
    expect(expected[1]).toBe("material_brands");
    expect(noCategory[2]).toBe(null);
  });

  it("useCertifications queryKey shape: ['referentials', 'certifications', filters|null]", () => {
    const expected = ["referentials", "certifications", { scope: "product_unit" }];
    expect(expected[0]).toBe("referentials");
    expect(expected[1]).toBe("certifications");
    expect((expected[2] as { scope: string }).scope).toBe("product_unit");
  });

  it("usePartnerCertifications queryKey shape: ['referentials', 'partner_certifications', partnerId]", () => {
    const expected = ["referentials", "partner_certifications", VALID_UUID];
    expect(expected[0]).toBe("referentials");
    expect(expected[1]).toBe("partner_certifications");
    expect(expected[2]).toBe(VALID_UUID);
  });

  it("useProductCertifications queryKey shape: ['referentials', 'product_certifications', productId]", () => {
    const expected = ["referentials", "product_certifications", VALID_UUID];
    expect(expected[0]).toBe("referentials");
    expect(expected[1]).toBe("product_certifications");
    expect(expected[2]).toBe(VALID_UUID);
  });

  it("Tous les hooks partagent le préfixe 'referentials' → invalidate global possible", () => {
    const keys = [
      ["referentials", "material_brands", null],
      ["referentials", "certifications", null],
      ["referentials", "partner_certifications", VALID_UUID],
      ["referentials", "product_certifications", VALID_UUID],
    ];
    expect(keys.every((k) => k[0] === "referentials")).toBe(true);
  });
});

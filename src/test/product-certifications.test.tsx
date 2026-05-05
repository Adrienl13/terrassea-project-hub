// Tests for ProductCertifications schema — ÉTAPE 8e-2.

import { describe, it, expect } from "vitest";
import { productCertificationSchema } from "@/lib/referentials/productCertificationSchema";

const VALID_PRODUCT = "11111111-1111-4111-8111-111111111111";
const VALID_CERT = "22222222-2222-4222-8222-222222222222";

describe("productCertificationSchema — form-level validation (8e-2)", () => {
  it("validates happy path with PV metadata + empty pdf URL", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_PRODUCT,
      certification_id: VALID_CERT,
      pv_number: "LNE-2025-1234",
      lab_name: "LNE",
      issued_at: "2025-03-10",
      valid_until: "2030-03-10",
      pv_document_url: "",
      notes: "Test selon NF EN 1335-2",
    });
    expect(result.success).toBe(true);
  });

  it("validates minimal payload (only required uuids)", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_PRODUCT,
      certification_id: VALID_CERT,
    });
    expect(result.success).toBe(true);
  });

  it("rejects product_id non-uuid", () => {
    const result = productCertificationSchema.safeParse({
      product_id: "not-a-uuid",
      certification_id: VALID_CERT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects pv_document_url malformée (non-empty, no protocol)", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_PRODUCT,
      certification_id: VALID_CERT,
      pv_document_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects valid_until non-ISO format", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_PRODUCT,
      certification_id: VALID_CERT,
      valid_until: "10-03-2030",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null PV fields (partial form draft)", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_PRODUCT,
      certification_id: VALID_CERT,
      pv_number: null,
      lab_name: null,
      issued_at: null,
      valid_until: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing certification_id", () => {
    const result = productCertificationSchema.safeParse({
      product_id: VALID_PRODUCT,
    });
    expect(result.success).toBe(false);
  });
});

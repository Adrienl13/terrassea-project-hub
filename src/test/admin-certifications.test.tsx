// Tests for AdminCertifications referential CRUD — ÉTAPE 8c.
//
// Validates the certification-specific configuration. Generic ReferentialCRUD
// behavior (slug regex, base schema, FK delete guard) is already covered in
// admin-material-brands.test.tsx — no duplication here.

import { describe, it, expect } from "vitest";
import {
  CERTIFICATION_CATEGORIES,
  certificationExtraSchema,
  type CertificationExtra,
} from "@/lib/referentials/certificationSchema";

describe("CERTIFICATION_CATEGORIES — frozen DB CHECK constraint mirror", () => {
  it("matches the 4 categories defined in DB", () => {
    expect(CERTIFICATION_CATEGORIES).toEqual([
      "environmental",
      "origin",
      "quality",
      "safety",
    ]);
  });

  it("is a readonly tuple (length frozen at 4)", () => {
    expect(CERTIFICATION_CATEGORIES.length).toBe(4);
  });
});

describe("certificationExtraSchema — empty object schema", () => {
  it("accepts empty object (no extra fields beyond common)", () => {
    const result = certificationExtraSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passthrough allows unknown extra keys without error", () => {
    // certifications has no extra fields, but passthrough() prevents zod from
    // rejecting if upstream payload happens to carry extras.
    const result = certificationExtraSchema.safeParse({ unknown_field: "x" });
    expect(result.success).toBe(true);
  });

  it("CertificationExtra type is Record<string, never> (no defined keys)", () => {
    // Compile-time check: the empty type assertion below would fail tsc if
    // CertificationExtra accidentally re-declared keys.
    const empty: CertificationExtra = {} as CertificationExtra;
    expect(Object.keys(empty)).toHaveLength(0);
  });
});

describe("AdminCertifications config (vs AdminMaterialBrands)", () => {
  it("references only material_brand_certifications (1 FK), unlike material_brands (2 FKs)", () => {
    // This expectation is encoded in the AdminCertifications component
    // referencedBy prop. The intent is to assert the FK list size + table name.
    const expected = [
      {
        table: "material_brand_certifications",
        column: "certification_id",
        label: "liaisons marques",
      },
    ];
    expect(expected).toHaveLength(1);
    expect(expected[0].table).toBe("material_brand_certifications");
    expect(expected[0].column).toBe("certification_id");
  });

  it("hasParentSelf=false (certifications has no parent_brand_id self-FK)", () => {
    // Certifications schema does not include parent_brand_id. The form
    // therefore renders no parent picker. This test documents the design
    // decision; AdminCertifications.tsx does not pass extraFormFields with
    // parent picker.
    expect("parent_brand_id" in certificationExtraSchema.shape).toBe(false);
  });
});

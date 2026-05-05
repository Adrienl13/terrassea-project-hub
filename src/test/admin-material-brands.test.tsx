// Tests for AdminMaterialBrands referential CRUD — ÉTAPE 8b.
//
// Validates:
//   - Pure helpers from ReferentialCRUD (validateSlugFormat, baseReferentialSchema)
//   - material_brands extra schema (is_premium / is_proprietary / parent_brand_id uuid)
//   - Slug auto-generation from name via slugify (used by Sheet form)

import { describe, it, expect } from "vitest";
import {
  validateSlugFormat,
  baseReferentialSchema,
} from "@/lib/referentials/referentialSchema";
import {
  materialBrandExtraSchema,
  MATERIAL_BRAND_CATEGORIES,
} from "@/lib/referentials/materialBrandSchema";
import { slugify } from "@/lib/slug";

describe("validateSlugFormat (ReferentialCRUD)", () => {
  it("accepts lowercase alnum + dashes", () => {
    expect(validateSlugFormat("dickson-orchestra")).toBe(true);
    expect(validateSlugFormat("hpl-compact")).toBe(true);
    expect(validateSlugFormat("foo123")).toBe(true);
  });

  it("rejects uppercase", () => {
    expect(validateSlugFormat("Dickson")).toBe(false);
    expect(validateSlugFormat("HPL")).toBe(false);
  });

  it("rejects leading / trailing / double dashes", () => {
    expect(validateSlugFormat("-foo")).toBe(false);
    expect(validateSlugFormat("foo-")).toBe(false);
    expect(validateSlugFormat("foo--bar")).toBe(false);
  });

  it("rejects special chars", () => {
    expect(validateSlugFormat("foo_bar")).toBe(false);
    expect(validateSlugFormat("foo bar")).toBe(false);
    expect(validateSlugFormat("foo.bar")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateSlugFormat("")).toBe(false);
  });
});

describe("baseReferentialSchema", () => {
  it("validates a full happy-path payload", () => {
    const result = baseReferentialSchema.safeParse({
      slug: "dickson-orchestra",
      name: "Dickson Orchestra",
      category: "fabric",
      description_i18n: { fr: "Tissu acrylique" },
      logo_url: "https://example.com/logo.png",
      official_website: "https://dickson-constant.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects bad slug format", () => {
    const result = baseReferentialSchema.safeParse({
      slug: "Dickson Orchestra",
      name: "x",
      category: "fabric",
    });
    expect(result.success).toBe(false);
  });

  it("rejects URL without protocol", () => {
    const result = baseReferentialSchema.safeParse({
      slug: "x",
      name: "x",
      category: "fabric",
      logo_url: "example.com/logo.png",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null logo_url + null official_website", () => {
    const result = baseReferentialSchema.safeParse({
      slug: "x",
      name: "x",
      category: "fabric",
      logo_url: null,
      official_website: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("materialBrandExtraSchema", () => {
  it("validates default extra payload", () => {
    const result = materialBrandExtraSchema.safeParse({
      is_premium: false,
      is_proprietary: false,
      parent_company: null,
      parent_brand_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects parent_brand_id non-uuid", () => {
    const result = materialBrandExtraSchema.safeParse({
      is_premium: false,
      is_proprietary: false,
      parent_brand_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts parent_brand_id valid uuid", () => {
    const result = materialBrandExtraSchema.safeParse({
      is_premium: true,
      is_proprietary: false,
      parent_brand_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("MATERIAL_BRAND_CATEGORIES mirrors DB CHECK constraint values", () => {
    expect(MATERIAL_BRAND_CATEGORIES).toEqual([
      "composite",
      "fabric",
      "metal",
      "other",
      "wood",
    ]);
  });
});

describe("slugify integration with form auto-fill", () => {
  it("transforms typical brand names to valid slugs", () => {
    expect(slugify("Dickson Orchestra")).toBe("dickson-orchestra");
    expect(slugify("HPL Compact")).toBe("hpl-compact");
    expect(slugify("Sunbrella® Marine")).toBe("sunbrella-marine");
  });

  it("auto-slug result passes validateSlugFormat", () => {
    const inputs = [
      "Dickson Orchestra",
      "Composite Wood (WPC)",
      "Acrylic Spun-Dyed",
      "Café Lounge",
    ];
    for (const input of inputs) {
      const slug = slugify(input);
      expect(validateSlugFormat(slug)).toBe(true);
    }
  });
});

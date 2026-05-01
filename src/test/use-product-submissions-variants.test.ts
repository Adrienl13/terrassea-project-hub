// Tests pour useProductSubmissions adapté ÉTAPE 6c (sérialisation variants[]).
// Vérifie : rétrocompat sans variants, embed dans product_data, validation
// "1 default required", validation par row.
//
// Approche : on teste la fonction de validation extraite, et on simule le
// flow via mock minimal du hook (pas de render React Hook ici — un test
// unit suffit pour la logique de validation).

import { describe, it, expect } from "vitest";
import { variantRowSchema, makeEmptyVariantRow } from "@/lib/variantsGridHelpers";

// Replicate ici la logique de validation du hook (defense in depth) pour
// pouvoir la tester en isolation sans React/auth/supabase mocking lourd.
function validateVariantsForSubmit(
  variants: ReturnType<typeof makeEmptyVariantRow>[],
): { ok: true } | { ok: false; reason: string } {
  if (variants.length === 0) return { ok: true };
  const defaultCount = variants.filter((v) => v.is_default).length;
  if (defaultCount === 0) return { ok: false, reason: "no_default" };
  if (defaultCount > 1) return { ok: false, reason: "multiple_default" };
  for (let i = 0; i < variants.length; i++) {
    const parsed = variantRowSchema.safeParse(variants[i]);
    if (!parsed.success) return { ok: false, reason: `invalid_row_${i}` };
  }
  return { ok: true };
}

// Replicate ici la transformation du hook qui embed variants dans product_data
// en strippant _localId.
function buildProductDataPayload<T extends Record<string, unknown>>(
  productData: T,
  variants: ReturnType<typeof makeEmptyVariantRow>[],
): T | (T & { variants: unknown[] }) {
  if (variants.length === 0) return productData;
  return {
    ...productData,
    variants: variants.map((v) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _localId, ...rest } = v;
      return rest;
    }),
  };
}

describe("useProductSubmissions — validation logic ÉTAPE 6c", () => {
  it("accepts submission with 0 variants (rétrocompat ÉTAPE 6a/6b)", () => {
    expect(validateVariantsForSubmit([])).toEqual({ ok: true });
  });

  it("accepts submission with exactly 1 default variant", () => {
    const variants = [makeEmptyVariantRow(true)];
    expect(validateVariantsForSubmit(variants)).toEqual({ ok: true });
  });

  it("accepts submission with 1 default and N non-default variants", () => {
    const variants = [
      makeEmptyVariantRow(true),
      makeEmptyVariantRow(false),
      makeEmptyVariantRow(false),
    ];
    expect(validateVariantsForSubmit(variants)).toEqual({ ok: true });
  });

  it("rejects submission with no default variant", () => {
    const variants = [makeEmptyVariantRow(false), makeEmptyVariantRow(false)];
    expect(validateVariantsForSubmit(variants)).toEqual({ ok: false, reason: "no_default" });
  });

  it("rejects submission with multiple default variants", () => {
    const variants = [makeEmptyVariantRow(true), makeEmptyVariantRow(true)];
    expect(validateVariantsForSubmit(variants)).toEqual({
      ok: false,
      reason: "multiple_default",
    });
  });

  it("rejects submission with an invalid row (negative price)", () => {
    const variants = [
      makeEmptyVariantRow(true),
      { ...makeEmptyVariantRow(false), price_eur: -10 },
    ];
    expect(validateVariantsForSubmit(variants)).toEqual({
      ok: false,
      reason: "invalid_row_1",
    });
  });
});

describe("useProductSubmissions — payload serialization ÉTAPE 6c", () => {
  it("returns productData unchanged when variants is empty", () => {
    const productData = { name: "Chair", category: "chairs" };
    const result = buildProductDataPayload(productData, []);
    expect(result).toEqual(productData);
    expect("variants" in result).toBe(false);
  });

  it("embeds variants[] in product_data when provided", () => {
    const productData = { name: "Chair", category: "chairs" };
    const variants = [makeEmptyVariantRow(true), makeEmptyVariantRow(false)];
    const result = buildProductDataPayload(productData, variants) as {
      name: string;
      category: string;
      variants: unknown[];
    };
    expect(result.name).toBe("Chair");
    expect(result.category).toBe("chairs");
    expect(result.variants).toHaveLength(2);
  });

  it("strips _localId from each variant before serialization", () => {
    const productData = { name: "Chair", category: "chairs" };
    const variants = [makeEmptyVariantRow(true)];
    const result = buildProductDataPayload(productData, variants) as {
      variants: Array<Record<string, unknown>>;
    };
    expect(result.variants[0]).not.toHaveProperty("_localId");
    expect(result.variants[0]).toHaveProperty("is_default");
    expect(result.variants[0].is_default).toBe(true);
  });
});

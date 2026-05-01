// Tests for src/lib/productMedia.ts — chantier Modèle B variants ÉTAPE 3.
// Validates the zod schema (notably the XOR product_id / variant_id),
// defaults, and helper functions.

import { describe, it, expect } from "vitest";
import {
  productMediaDraftSchema,
  defaultProductMediaDraft,
  primaryMediaOf,
  mediaByKind,
  isVariantMedia,
  PRODUCT_MEDIA_KINDS,
  type DBProductMedia,
} from "@/lib/productMedia";

const PRODUCT_UUID = "11111111-1111-4111-8111-111111111111";
const VARIANT_UUID = "22222222-2222-4222-8222-222222222222";

describe("productMediaDraftSchema", () => {
  it("accepts a draft attached to a product", () => {
    const draft = defaultProductMediaDraft({ product_id: PRODUCT_UUID });
    draft.url = "https://cdn.example.com/img.jpg";
    expect(productMediaDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("accepts a draft attached to a variant", () => {
    const draft = defaultProductMediaDraft({ variant_id: VARIANT_UUID });
    draft.url = "https://cdn.example.com/img.jpg";
    expect(productMediaDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects a draft attached to BOTH product and variant (XOR)", () => {
    const result = productMediaDraftSchema.safeParse({
      product_id: PRODUCT_UUID,
      variant_id: VARIANT_UUID,
      kind: "image",
      url: "https://cdn.example.com/img.jpg",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message === "media_must_have_exactly_one_of_product_id_or_variant_id",
        ),
      ).toBe(true);
    }
  });

  it("rejects a draft attached to NEITHER (XOR)", () => {
    const result = productMediaDraftSchema.safeParse({
      kind: "image",
      url: "https://cdn.example.com/img.jpg",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every kind value", () => {
    for (const kind of PRODUCT_MEDIA_KINDS) {
      const result = productMediaDraftSchema.safeParse({
        product_id: PRODUCT_UUID,
        kind,
        url: "https://cdn.example.com/file",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown kind", () => {
    const result = productMediaDraftSchema.safeParse({
      product_id: PRODUCT_UUID,
      kind: "audio",
      url: "https://cdn.example.com/file.mp3",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL", () => {
    const result = productMediaDraftSchema.safeParse({
      product_id: PRODUCT_UUID,
      kind: "image",
      url: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative width_px / height_px / bytes", () => {
    expect(
      productMediaDraftSchema.safeParse({
        product_id: PRODUCT_UUID,
        kind: "image",
        url: "https://cdn.example.com/img.jpg",
        width_px: -1,
      }).success,
    ).toBe(false);
    expect(
      productMediaDraftSchema.safeParse({
        product_id: PRODUCT_UUID,
        kind: "image",
        url: "https://cdn.example.com/img.jpg",
        height_px: 0,
      }).success,
    ).toBe(false);
    expect(
      productMediaDraftSchema.safeParse({
        product_id: PRODUCT_UUID,
        kind: "image",
        url: "https://cdn.example.com/img.jpg",
        bytes: -1,
      }).success,
    ).toBe(false);
  });
});

describe("defaultProductMediaDraft", () => {
  it("creates a product-level draft", () => {
    const d = defaultProductMediaDraft({ product_id: PRODUCT_UUID });
    expect(d.product_id).toBe(PRODUCT_UUID);
    expect(d.variant_id).toBe(null);
    expect(d.kind).toBe("image");
    expect(d.is_primary).toBe(false);
  });

  it("creates a variant-level draft", () => {
    const d = defaultProductMediaDraft({ variant_id: VARIANT_UUID }, "video");
    expect(d.product_id).toBe(null);
    expect(d.variant_id).toBe(VARIANT_UUID);
    expect(d.kind).toBe("video");
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const stubMedia = (overrides: Partial<DBProductMedia> = {}): DBProductMedia =>
  ({
    id: "m1",
    product_id: PRODUCT_UUID,
    variant_id: null,
    kind: "image",
    url: "https://cdn.example.com/img.jpg",
    alt_text_i18n: null,
    width_px: null,
    height_px: null,
    bytes: null,
    display_order: 100,
    is_primary: false,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  }) as DBProductMedia;

describe("primaryMediaOf", () => {
  it("returns null on empty list", () => {
    expect(primaryMediaOf([])).toBe(null);
  });

  it("prefers the is_primary flagged media", () => {
    const a = stubMedia({ id: "a", is_primary: false, display_order: 10 });
    const b = stubMedia({ id: "b", is_primary: true, display_order: 200 });
    expect(primaryMediaOf([a, b])?.id).toBe("b");
  });

  it("falls back to lowest display_order when none flagged", () => {
    const a = stubMedia({ id: "a", is_primary: false, display_order: 200 });
    const b = stubMedia({ id: "b", is_primary: false, display_order: 10 });
    const c = stubMedia({ id: "c", is_primary: false, display_order: 50 });
    expect(primaryMediaOf([a, b, c])?.id).toBe("b");
  });
});

describe("mediaByKind", () => {
  it("filters by kind and orders by display_order asc", () => {
    const list = [
      stubMedia({ id: "v1", kind: "video", display_order: 50 }),
      stubMedia({ id: "i2", kind: "image", display_order: 30 }),
      stubMedia({ id: "i1", kind: "image", display_order: 10 }),
    ];
    const images = mediaByKind(list, "image");
    expect(images.map((m) => m.id)).toEqual(["i1", "i2"]);
  });
});

describe("isVariantMedia", () => {
  it("returns true if variant_id is set", () => {
    expect(isVariantMedia({ variant_id: VARIANT_UUID })).toBe(true);
  });
  it("returns false if variant_id is null", () => {
    expect(isVariantMedia({ variant_id: null })).toBe(false);
  });
});

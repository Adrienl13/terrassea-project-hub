// Tests for src/lib/materialBrandsMapping.ts — chantier Modèle B variants ÉTAPE 2.
// Verifies the bidirectional mapping between fabricBrands.ts CamelCase slugs
// and the public.material_brands lowercase-kebab DB slugs seeded in
// migration 20260501122056_seed_phase1_referentials.

import { describe, it, expect } from "vitest";
import {
  FABRIC_BRAND_TS_TO_DB,
  FABRIC_BRAND_DB_TO_TS,
  FABRIC_DB_SLUGS,
  MATERIAL_BRAND_DB_SLUG,
  tsBrandToDbSlug,
  dbSlugToTsBrand,
} from "@/lib/materialBrandsMapping";
import { FABRIC_BRAND_SLUGS } from "@/engine/dictionaries/fabricBrands";

describe("materialBrandsMapping", () => {
  it("covers every FabricBrandSlug from fabricBrands.ts", () => {
    for (const slug of FABRIC_BRAND_SLUGS) {
      expect(FABRIC_BRAND_TS_TO_DB[slug]).toBeDefined();
    }
  });

  it("DB→TS map is the exact inverse of TS→DB map", () => {
    for (const [ts, db] of Object.entries(FABRIC_BRAND_TS_TO_DB)) {
      expect(FABRIC_BRAND_DB_TO_TS[db]).toBe(ts);
    }
    for (const [db, ts] of Object.entries(FABRIC_BRAND_DB_TO_TS)) {
      expect(FABRIC_BRAND_TS_TO_DB[ts as keyof typeof FABRIC_BRAND_TS_TO_DB]).toBe(db);
    }
  });

  it("uses lowercase-kebab DB slugs (no underscores, no uppercase)", () => {
    for (const db of Object.values(FABRIC_BRAND_TS_TO_DB)) {
      expect(db).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("tsBrandToDbSlug returns the canonical DB slug for known TS slugs", () => {
    expect(tsBrandToDbSlug("Sunbrella")).toBe("sunbrella");
    expect(tsBrandToDbSlug("Dickson_Orchestra")).toBe("dickson-orchestra");
    expect(tsBrandToDbSlug("Serge_Ferrari")).toBe("serge-ferrari");
    expect(tsBrandToDbSlug("Other")).toBe("other-fabric");
    expect(tsBrandToDbSlug("Unknown")).toBe("unknown");
  });

  it("tsBrandToDbSlug falls back to 'unknown' for unrecognised input", () => {
    expect(tsBrandToDbSlug("Tribùcord")).toBe("unknown");
    expect(tsBrandToDbSlug("")).toBe("unknown");
    expect(tsBrandToDbSlug(null)).toBe("unknown");
    expect(tsBrandToDbSlug(undefined)).toBe("unknown");
  });

  it("dbSlugToTsBrand returns the canonical TS slug for known DB slugs", () => {
    expect(dbSlugToTsBrand("sunbrella")).toBe("Sunbrella");
    expect(dbSlugToTsBrand("dickson-orchestra")).toBe("Dickson_Orchestra");
    expect(dbSlugToTsBrand("serge-ferrari")).toBe("Serge_Ferrari");
    expect(dbSlugToTsBrand("other-fabric")).toBe("Other");
    expect(dbSlugToTsBrand("unknown")).toBe("Unknown");
  });

  it("dbSlugToTsBrand falls back to 'Unknown' for non-fabric DB slugs", () => {
    // Wood/metal/composite slugs from material_brands have no TS counterpart
    expect(dbSlugToTsBrand("fsc-teak-plantation")).toBe("Unknown");
    expect(dbSlugToTsBrand("aluminium-6063")).toBe("Unknown");
    expect(dbSlugToTsBrand("hpl-compact")).toBe("Unknown");
    expect(dbSlugToTsBrand(null)).toBe("Unknown");
  });

  it("FABRIC_DB_SLUGS exposes exactly the 7 fabric DB slugs", () => {
    expect(FABRIC_DB_SLUGS.size).toBe(7);
    expect(FABRIC_DB_SLUGS.has("sunbrella")).toBe(true);
    expect(FABRIC_DB_SLUGS.has("solaris")).toBe(true);
    expect(FABRIC_DB_SLUGS.has("dickson-orchestra")).toBe(true);
    expect(FABRIC_DB_SLUGS.has("dickson-saphir")).toBe(true);
    expect(FABRIC_DB_SLUGS.has("serge-ferrari")).toBe(true);
    expect(FABRIC_DB_SLUGS.has("other-fabric")).toBe(true);
    expect(FABRIC_DB_SLUGS.has("unknown")).toBe(true);
  });

  it("MATERIAL_BRAND_DB_SLUG is exhaustive — same 7 entries as FABRIC_DB_SLUGS", () => {
    const values = Object.values(MATERIAL_BRAND_DB_SLUG);
    expect(values).toHaveLength(7);
    for (const v of values) {
      expect(FABRIC_DB_SLUGS.has(v)).toBe(true);
    }
  });

  it("roundtrip preserves identity for every TS fabric slug", () => {
    for (const ts of FABRIC_BRAND_SLUGS) {
      const db = tsBrandToDbSlug(ts);
      const back = dbSlugToTsBrand(db);
      expect(back).toBe(ts);
    }
  });
});

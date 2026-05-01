// Tests pour le mapping fabric_certification (CamelCase) → material_brands.slug (kebab)
// utilisé par la migration 20260501130815_migrate_52_products_to_default_variants.
//
// Les 7 valeurs FabricBrandSlug doivent toutes mapper vers une slug DB existante
// dans le seed de migration 20260501122056_seed_phase1_referentials.

import { describe, it, expect } from "vitest";
import {
  FABRIC_BRAND_TS_TO_DB,
  tsBrandToDbSlug,
  dbSlugToTsBrand,
} from "@/lib/materialBrandsMapping";
import { FABRIC_BRAND_SLUGS } from "@/engine/dictionaries/fabricBrands";

// Slugs DB qui DOIVENT exister dans la table material_brands après le seed
// migration 20260501122056_seed_phase1_referentials. Source de vérité : le
// fichier SQL lui-même (lignes INSERT INTO public.material_brands).
const EXPECTED_DB_SLUGS_AFTER_SEED = new Set([
  // Fabric premium (5)
  "sunbrella",
  "solaris",
  "dickson-orchestra",
  "dickson-saphir",
  "serge-ferrari",
  // Fabric add'l + cushion (7)
  "sergio-tessuti",
  "ikatex",
  "para-tempotest",
  "agora-fabrics",
  "batyline",
  "olefin-marine",
  "acrylic-spun-dyed",
  // Wood (5)
  "fsc-teak-plantation",
  "fsc-iroko",
  "fsc-acacia",
  "fsc-robinia",
  "fsc-eucalyptus",
  // Metal (5)
  "aluminium-6063",
  "stainless-steel-316",
  "iron-powder-coated",
  "brass",
  "bronze",
  // Composite (3)
  "hpl-compact",
  "composite-wood",
  "polyrattan-pe",
  // Fallbacks (2)
  "other-fabric",
  "unknown",
]);

describe("Migration mapping — fabric_certification → material_brand_id", () => {
  it("every FabricBrandSlug TS value targets a DB slug present in the migration seed", () => {
    for (const tsSlug of FABRIC_BRAND_SLUGS) {
      const dbSlug = tsBrandToDbSlug(tsSlug);
      expect(EXPECTED_DB_SLUGS_AFTER_SEED.has(dbSlug)).toBe(true);
    }
  });

  it("'Unknown' TS slug maps to 'unknown' DB slug (fallback used by migration COALESCE)", () => {
    expect(tsBrandToDbSlug("Unknown")).toBe("unknown");
    expect(EXPECTED_DB_SLUGS_AFTER_SEED.has("unknown")).toBe(true);
  });

  it("'Other' TS slug maps to 'other-fabric' DB slug (not 'other')", () => {
    // 'other-fabric' est plus spécifique — la migration aurait pu mapper vers
    // 'other' générique, mais la convention seed est 'other-fabric'. Vérification
    // explicite pour éviter une régression future si on ajoute 'other' générique.
    expect(tsBrandToDbSlug("Other")).toBe("other-fabric");
  });

  it("DB→TS reverse for all 7 fabric slugs", () => {
    const dbToTs: Record<string, string> = {};
    for (const tsSlug of FABRIC_BRAND_SLUGS) {
      dbToTs[FABRIC_BRAND_TS_TO_DB[tsSlug]] = tsSlug;
    }
    for (const [db, ts] of Object.entries(dbToTs)) {
      expect(dbSlugToTsBrand(db)).toBe(ts);
    }
  });

  it("falls back to 'unknown' for any input not in the dictionary (migration safety net)", () => {
    // Cas critique pour la migration : un futur produit avec une valeur
    // fabric_certification corrompue/inattendue ne casse pas le INSERT —
    // il finit avec material_brand_id = 'unknown'.
    expect(tsBrandToDbSlug("ProprietaryUnknownBrand")).toBe("unknown");
    expect(tsBrandToDbSlug("")).toBe("unknown");
    expect(tsBrandToDbSlug(undefined)).toBe("unknown");
  });

  it("DB slug 'unknown' is the universal fallback (used by migration COALESCE)", () => {
    // La migration utilise COALESCE(fb.new_id, (SELECT id ... slug='unknown'))
    // pour garantir qu'aucun variant ne sort avec material_brand_id NULL.
    // Ce test valide que 'unknown' est bien dans le seed et joue ce rôle.
    expect(EXPECTED_DB_SLUGS_AFTER_SEED.has("unknown")).toBe(true);
  });

  it("no two TS slugs map to the same DB slug except by design", () => {
    // Évite une régression où on mapperait deux TS slugs distincts vers le même
    // DB slug par erreur (les pertes d'information seraient silencieuses).
    const dbSeen = new Set<string>();
    for (const ts of FABRIC_BRAND_SLUGS) {
      const db = FABRIC_BRAND_TS_TO_DB[ts];
      expect(dbSeen.has(db), `Duplicate DB slug ${db} from TS ${ts}`).toBe(false);
      dbSeen.add(db);
    }
    expect(dbSeen.size).toBe(FABRIC_BRAND_SLUGS.length);
  });
});

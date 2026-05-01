/**
 * ProductModelForm — Alias documentaire de AddProductForm
 *
 * Phase 1 ÉTAPE 6a — Cet alias marque l'intention architecturale
 * Modèle/Variants du chantier Modèle B variants étendu (cf.
 * docs/strategy/PRODUCT_DATA_VISION.md §4.1 et
 * docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md).
 *
 * L'extraction JSX progressive du form modèle vers ce composant dédié
 * est différée Phase 2 (quand le state autour de variants[] se stabilisera
 * et que les patterns d'usage réel seront observés). Décision arbitrée
 * 2026-05-02 (Option B, semantic split) entre :
 *   - Option A : extraction Context complète (1.5j, risque régression élevé)
 *   - Option B : alias doc + nouveau placeholder VariantsSection (3h, retenue)
 *   - Option C : découpage progressif (refusée, manque d'ancrage)
 *
 * Pour l'instant : utilisé comme point d'ancrage architectural et import
 * canonique. Encouragez les imports 'ProductModelForm' plutôt que
 * 'AddProductForm' dans le nouveau code Phase 1+.
 */

// Default export uniquement — un alias unique évite le warning react-refresh
// "only export components". Importez via `import ProductModelForm from
// "@/components/partner-dashboard/ProductModelForm"` pour bénéficier du
// nom sémantique.
export { default } from "./AddProductForm";

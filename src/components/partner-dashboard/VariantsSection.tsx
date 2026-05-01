// ============================================================================
// VariantsSection — Placeholder Phase 1 ÉTAPE 6a
// ============================================================================
//
// Cette section est l'emplacement futur de la grille editable des variantes
// (couleurs, dimensions, tissus, finitions, prix par déclinaison) qui sera
// implémentée en ÉTAPE 6b du chantier Modèle B variants étendu.
//
// Pour l'instant (ÉTAPE 6a — Option B "semantic split" actée 2026-05-02),
// ce composant rend juste un placeholder informatif. Il est isolé (aucune
// dépendance vers le state de AddProductForm) pour permettre une évolution
// indépendante en ÉTAPE 6b sans casser AddProductForm.
//
// Réf : docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §5.1 (fichiers à créer)
//      docs/strategy/PRODUCT_DATA_VISION.md §4.1 (architecture Modèle B)

import { Layers, Construction, Sparkles } from "lucide-react";

export default function VariantsSection() {
  return (
    <div className="space-y-4">
      <div className="border border-dashed border-border rounded-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-200 mb-4">
          <Construction className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="font-display font-bold text-base text-foreground mb-2">
          Section Variantes — disponible ÉTAPE 6b
        </h3>
        <p className="text-xs font-body text-muted-foreground leading-relaxed max-w-md mx-auto">
          Cette section permettra de gérer les déclinaisons (couleurs, dimensions,
          tissus, finitions, prix) de votre produit en mode tableur editable.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-body text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          <span>1 modèle peut avoir N variantes</span>
        </div>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          Pour l&apos;instant, votre produit est créé avec une variante par défaut
          (héritée des dimensions/couleur/prix renseignés dans les onglets
          précédents). La gestion fine des déclinaisons arrive très bientôt.
        </p>
      </div>
    </div>
  );
}

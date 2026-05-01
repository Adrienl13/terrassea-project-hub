// ============================================================================
// VariantsSection — Section de gestion des variantes du produit
// ============================================================================
//
// Conteneur de la grille editable VariantsGrid intégré comme onglet
// "Variantes" dans AddProductForm. Chantier Modèle B variants étendu, Phase 1.
//
// Architecture :
//   - VariantsSection : enveloppe explicative + intégration VariantsGrid
//   - VariantsGrid : grille editable HTML table + Combobox shadcn + zod
//
// La persistance des variantes vers product_variants se fait à l'étape 6c
// via useProductSubmissions adapté. Pour l'instant, le state est local à
// VariantsGrid et n'est pas envoyé au submit du produit.

import { Layers } from "lucide-react";
import VariantsGrid from "./VariantsGrid";
import type { LocalVariantRow } from "@/lib/variantsGridHelpers";

interface VariantsSectionProps {
  initial?: LocalVariantRow[];
  onChange?: (rows: LocalVariantRow[]) => void;
}

export default function VariantsSection({ initial, onChange }: VariantsSectionProps = {}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          Déclinez votre produit en plusieurs variantes (couleurs, dimensions, tissus,
          finitions, prix). Une variante doit être marquée comme défaut — elle sera
          affichée par défaut sur la fiche publique.
        </p>
      </div>

      <VariantsGrid initial={initial} onChange={onChange} />
    </div>
  );
}

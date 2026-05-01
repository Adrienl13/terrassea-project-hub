// ============================================================================
// VariantBulkActions — Barre d'actions bulk pour VariantsGrid
// ============================================================================
//
// Phase 1 ÉTAPE 6c du chantier Modèle B variants étendu.
//
// 3 opérations bulk sur les variants sélectionnés :
//   1. Apply price : assigner un même prix à toutes les variants sélectionnées
//   2. Duplicate with variation : dupliquer 1 variant N fois en variant un champ
//      (ex : largeur 80 → 100, 120) pour générer des dimensions
//   3. Toggle stock : marquer les variants sélectionnées comme en stock /
//      hors stock en bloc
//
// Composant dumb (présentationnal) : reçoit selectedCount + 3 callbacks,
// gère son propre micro-state (input prix, input dimensions duplicate).
// La logique de mutation des rows est faite par le parent (VariantsGrid).

import { useState } from "react";
import { Layers, Copy, ToggleLeft, ToggleRight, Euro, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface VariantBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onApplyPrice: (price: number) => void;
  onDuplicateWithDimensions: (widths: number[]) => void;
  onToggleStock: (inStock: boolean) => void;
  onClearSelection: () => void;
}

export default function VariantBulkActions({
  selectedCount,
  totalCount,
  onApplyPrice,
  onDuplicateWithDimensions,
  onToggleStock,
  onClearSelection,
}: VariantBulkActionsProps) {
  const [priceInput, setPriceInput] = useState<string>("");
  const [dimensionsInput, setDimensionsInput] = useState<string>("");

  const handleApplyPrice = () => {
    const n = Number(priceInput);
    if (!Number.isFinite(n) || n < 0) return;
    onApplyPrice(n);
    setPriceInput("");
  };

  const handleDuplicate = () => {
    // Parse "100, 120, 140" → [100, 120, 140]
    const widths = dimensionsInput
      .split(/[\s,;]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (widths.length === 0) return;
    onDuplicateWithDimensions(widths);
    setDimensionsInput("");
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-sm"
      data-testid="variant-bulk-actions"
    >
      <div className="flex items-center gap-2 mr-2">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-display font-semibold text-foreground">
          {selectedCount} / {totalCount} sélectionnée{selectedCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Action 1 — Apply price */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold rounded-sm border border-border bg-card hover:border-foreground hover:text-foreground transition-colors"
            aria-label="Apply price to selected variants"
          >
            <Euro className="h-3 w-3" />
            Appliquer prix
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              Prix unique pour les {selectedCount} variantes
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="ex: 99.50"
                aria-label="Bulk price input"
                className="flex-1 rounded-sm border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground"
              />
              <button
                type="button"
                onClick={handleApplyPrice}
                disabled={!priceInput || Number(priceInput) < 0}
                className="px-3 py-1 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-sm hover:opacity-90 disabled:opacity-40"
              >
                Appliquer
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Action 2 — Duplicate with dimensions */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={selectedCount !== 1}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold rounded-sm border border-border bg-card hover:border-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Duplicate selected variant with dimension variations"
            title={selectedCount !== 1 ? "Sélectionnez exactement 1 variante pour dupliquer" : ""}
          >
            <Copy className="h-3 w-3" />
            Dupliquer (dim.)
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2">
            <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              Largeurs (cm) pour les nouvelles variantes
            </label>
            <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
              Ex : <code>100, 120, 140</code> crée 3 variantes additionnelles
              avec ces largeurs (autres champs préservés).
            </p>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={dimensionsInput}
                onChange={(e) => setDimensionsInput(e.target.value)}
                placeholder="100, 120, 140"
                aria-label="Bulk duplicate widths input"
                className="flex-1 rounded-sm border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground"
              />
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={!dimensionsInput.trim()}
                className="px-3 py-1 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-sm hover:opacity-90 disabled:opacity-40"
              >
                Dupliquer
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Action 3 — Toggle stock */}
      <button
        type="button"
        onClick={() => onToggleStock(true)}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold rounded-sm border border-border bg-card hover:border-foreground hover:text-foreground transition-colors"
        aria-label="Mark selected as in stock"
      >
        <ToggleRight className="h-3 w-3" />
        En stock
      </button>
      <button
        type="button"
        onClick={() => onToggleStock(false)}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold rounded-sm border border-border bg-card hover:border-foreground hover:text-foreground transition-colors"
        aria-label="Mark selected as out of stock"
      >
        <ToggleLeft className="h-3 w-3" />
        Hors stock
      </button>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Clear selection"
      >
        <X className="h-3 w-3" />
        Désélectionner
      </button>
    </div>
  );
}

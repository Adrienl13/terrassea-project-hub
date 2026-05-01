// ============================================================================
// VariantsGrid — Grille editable des variantes d'un produit
// ============================================================================
//
// Phase 1 ÉTAPE 6b du chantier Modèle B variants étendu.
//
// Permet à un partner de gérer les déclinaisons (sku, dimensions, tissu,
// couleur, finition, prix, stock) du produit en cours de création/édition,
// directement depuis l'AddProductForm.
//
// Pour ÉTAPE 6b : state local (useState array). L'intégration avec le state
// du form parent + persistance vers product_variants se fait en ÉTAPE 6c via
// useProductSubmissions adapté.
//
// Référentiels chargés via React Query :
//   - material_brands (filtré category='fabric' pour le picker tissu)
//   - colors_canonical
//   - finishes_canonical
//
// Validation Zod par row inline (variantRowSchema slim — sans product_id qui
// n'existe pas encore en flow création). Compteur global "X / Y valides".

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  type LocalVariantRow,
  variantRowSchema,
  makeEmptyVariantRow,
} from "@/lib/variantsGridHelpers";

// ── Référentiels (React Query) ─────────────────────────────────────────────

type RefOption = { value: string; label: string };

function useFabricBrands() {
  return useQuery<RefOption[]>({
    queryKey: ["material_brands_fabric"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_brands")
        .select("id, slug, name, category")
        .eq("category", "fabric")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({ value: r.id, label: `${r.name} (${r.slug})` }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

function useColorsCanonical() {
  return useQuery<RefOption[]>({
    queryKey: ["colors_canonical"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colors_canonical")
        .select("slug, label_i18n")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []).map((r) => {
        const labels = r.label_i18n as Record<string, string> | null;
        const label = labels?.fr ?? labels?.en ?? r.slug;
        return { value: r.slug, label: `${label} (${r.slug})` };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

function useFinishesCanonical() {
  return useQuery<RefOption[]>({
    queryKey: ["finishes_canonical"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finishes_canonical")
        .select("slug, label_i18n")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []).map((r) => {
        const labels = r.label_i18n as Record<string, string> | null;
        const label = labels?.fr ?? labels?.en ?? r.slug;
        return { value: r.slug, label: `${label} (${r.slug})` };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ── Combobox réutilisable pour les 3 référentiels ──────────────────────────

interface ComboboxProps {
  value: string | null;
  onChange: (next: string | null) => void;
  options: RefOption[];
  placeholder: string;
  isLoading?: boolean;
  emptyText?: string;
  ariaLabel?: string;
}

function ReferentialCombobox({
  value,
  onChange,
  options,
  placeholder,
  isLoading,
  emptyText = "Aucun résultat",
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? null,
    [options, value],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "flex w-full items-center justify-between gap-1 rounded-sm border border-border bg-card px-2 py-1.5 text-left text-xs font-body outline-none transition-colors",
            "hover:border-foreground/40 focus:ring-1 focus:ring-foreground",
            !selectedLabel && "text-muted-foreground",
          )}
          disabled={isLoading}
        >
          <span className="truncate">
            {isLoading ? "Chargement…" : selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {value !== null && (
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground"
                >
                  — Effacer la sélection —
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Main VariantsGrid ──────────────────────────────────────────────────────

interface VariantsGridProps {
  initial?: LocalVariantRow[];
  onChange?: (rows: LocalVariantRow[]) => void;
}

export default function VariantsGrid({ initial = [], onChange }: VariantsGridProps) {
  const [rows, setRows] = useState<LocalVariantRow[]>(initial);

  const fabrics = useFabricBrands();
  const colors = useColorsCanonical();
  const finishes = useFinishesCanonical();

  // Notify parent on changes
  useEffect(() => {
    onChange?.(rows);
    // We deliberately don't include onChange in deps to avoid render loops if
    // the parent doesn't memo it. Revisit when ÉTAPE 6c plumbs the real flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Per-row Zod validation
  const validations = useMemo(
    () => rows.map((row) => variantRowSchema.safeParse(row)),
    [rows],
  );
  const validCount = validations.filter((v) => v.success).length;
  const hasInvalidRows = validCount !== rows.length;
  const hasMultipleDefaults = rows.filter((r) => r.is_default).length > 1;
  const hasNoDefault = rows.length > 0 && rows.every((r) => !r.is_default);

  // Handlers
  const addRow = useCallback(() => {
    setRows((prev) => {
      const isFirst = prev.length === 0;
      return [...prev, makeEmptyVariantRow(isFirst)];
    });
  }, []);

  const deleteRow = useCallback((localId: string) => {
    setRows((prev) => {
      const removed = prev.find((r) => r._localId === localId);
      const next = prev.filter((r) => r._localId !== localId);
      // If we removed the default, promote the first remaining row
      if (removed?.is_default && next.length > 0 && !next.some((r) => r.is_default)) {
        next[0] = { ...next[0], is_default: true };
      }
      return next;
    });
  }, []);

  const updateRow = useCallback((localId: string, updates: Partial<LocalVariantRow>) => {
    setRows((prev) => prev.map((r) => (r._localId === localId ? { ...r, ...updates } : r)));
  }, []);

  const setDefault = useCallback((localId: string) => {
    setRows((prev) => prev.map((r) => ({ ...r, is_default: r._localId === localId })));
  }, []);

  const numberFromInput = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          Variantes du produit
        </h4>
        {rows.length > 0 && (
          <span
            className={cn(
              "text-[10px] font-display font-semibold rounded-full px-2 py-0.5",
              hasInvalidRows
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200",
            )}
            data-testid="variants-grid-counter"
          >
            {validCount} / {rows.length} valides
          </span>
        )}
      </div>

      <div className="border border-border rounded-sm overflow-x-auto">
        <table className="min-w-full text-xs font-body">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">SKU</th>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">L (cm)</th>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">l (cm)</th>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Tissu</th>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Couleur</th>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Finition</th>
              <th className="px-2 py-2 text-left font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Prix €</th>
              <th className="px-2 py-2 text-center font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Stock</th>
              <th className="px-2 py-2 text-center font-display font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Default</th>
              <th className="w-8 px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Aucune variante. Cliquez sur le bouton ci-dessous pour ajouter une déclinaison.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const validation = validations[idx];
                const rowError = !validation.success;
                return (
                  <tr
                    key={row._localId}
                    data-testid={`variant-row-${idx}`}
                    className={cn(
                      "border-b border-border last:border-0",
                      rowError && "bg-red-50/30",
                    )}
                  >
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={row.sku ?? ""}
                        onChange={(e) =>
                          updateRow(row._localId, { sku: e.target.value || null })
                        }
                        placeholder="SKU"
                        aria-label={`Variant ${idx + 1} SKU`}
                        className="w-24 rounded-sm border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.width_cm ?? ""}
                        onChange={(e) =>
                          updateRow(row._localId, { width_cm: numberFromInput(e.target.value) })
                        }
                        aria-label={`Variant ${idx + 1} width`}
                        className="w-16 rounded-sm border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={row.depth_cm ?? ""}
                        onChange={(e) =>
                          updateRow(row._localId, { depth_cm: numberFromInput(e.target.value) })
                        }
                        aria-label={`Variant ${idx + 1} depth`}
                        className="w-16 rounded-sm border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <ReferentialCombobox
                        value={row.material_brand_id}
                        onChange={(v) => updateRow(row._localId, { material_brand_id: v })}
                        options={fabrics.data ?? []}
                        placeholder="Tissu…"
                        isLoading={fabrics.isLoading}
                        ariaLabel={`Variant ${idx + 1} fabric`}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <ReferentialCombobox
                        value={row.fabric_color_slug}
                        onChange={(v) => updateRow(row._localId, { fabric_color_slug: v })}
                        options={colors.data ?? []}
                        placeholder="Couleur…"
                        isLoading={colors.isLoading}
                        ariaLabel={`Variant ${idx + 1} color`}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <ReferentialCombobox
                        value={row.frame_finish_slug}
                        onChange={(v) => updateRow(row._localId, { frame_finish_slug: v })}
                        options={finishes.data ?? []}
                        placeholder="Finition…"
                        isLoading={finishes.isLoading}
                        ariaLabel={`Variant ${idx + 1} finish`}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.price_eur ?? ""}
                        onChange={(e) =>
                          updateRow(row._localId, { price_eur: numberFromInput(e.target.value) })
                        }
                        aria-label={`Variant ${idx + 1} price`}
                        className="w-20 rounded-sm border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.in_stock}
                        onChange={(e) => updateRow(row._localId, { in_stock: e.target.checked })}
                        aria-label={`Variant ${idx + 1} in stock`}
                        className="h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="radio"
                        name="variant-default"
                        checked={row.is_default}
                        onChange={() => setDefault(row._localId)}
                        aria-label={`Variant ${idx + 1} is default`}
                        className="h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(row._localId)}
                        aria-label={`Delete variant ${idx + 1}`}
                        className="text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold border border-dashed border-border rounded-sm hover:border-foreground hover:text-foreground transition-colors text-muted-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une variante
      </button>

      {/* Cross-row warnings */}
      {hasMultipleDefaults && (
        <div className="flex items-start gap-1.5 text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Plusieurs variantes sont marquées comme défaut. Une seule est autorisée.</span>
        </div>
      )}
      {hasNoDefault && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Aucune variante n&apos;est marquée comme défaut. La première variante doit être désignée comme défaut.</span>
        </div>
      )}

      {/* Per-row errors */}
      {validations.some((v) => !v.success) && (
        <div className="space-y-1">
          {validations.map((v, idx) =>
            !v.success ? (
              <div
                key={idx}
                className="flex items-start gap-1.5 text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-1.5"
                data-testid={`variant-error-${idx}`}
              >
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  Variante #{idx + 1} : {v.error.issues.map((i) => i.path.join(".") || i.message).join(", ")}
                </span>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}


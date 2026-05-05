// ============================================================================
// AdminMaterialBrands — admin CRUD for material_brands referential
// ÉTAPE 8b (2026-05-05).
//
// Thin composer over <ReferentialCRUD> generic. Provides the material_brands-
// specific schema + form fields (is_premium, is_proprietary, parent_company,
// parent_brand_id self-FK).
// ============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ReferentialCRUD from "./referentials/ReferentialCRUD";
import {
  MATERIAL_BRAND_CATEGORIES,
  materialBrandExtraSchema,
  type MaterialBrandExtra,
} from "@/lib/referentials/materialBrandSchema";

const DEFAULT_EXTRA: MaterialBrandExtra = {
  is_premium: false,
  is_proprietary: false,
  parent_company: null,
  parent_brand_id: null,
};

// ── Parent brand picker (Combobox) ──────────────────────────────────────────

interface ParentPickerProps {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}

function ParentBrandCombobox({ value, onChange }: ParentPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: brands = [] } = useQuery({
    queryKey: ["material_brands_for_parent_picker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("material_brands")
        .select("id, slug, name")
        .order("name");
      return (data ?? []) as { id: string; slug: string; name: string }[];
    },
    staleTime: 1000 * 60 * 5,
  });
  const selectedLabel =
    brands.find((b) => b.id === value)?.name ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-1 rounded-sm border border-border bg-card px-2 py-1.5 text-left text-xs",
            "hover:border-foreground/40 focus:ring-1 focus:ring-foreground",
            !selectedLabel && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selectedLabel ?? "— aucune —"}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>Aucune marque</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground"
                >
                  — Effacer —
                </CommandItem>
              )}
              {brands.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.name}
                  onSelect={() => {
                    onChange(b.id);
                    setOpen(false);
                  }}
                >
                  {b.name}{" "}
                  <span className="text-muted-foreground ml-1">({b.slug})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AdminMaterialBrands() {
  return (
    <ReferentialCRUD<MaterialBrandExtra>
      tableName="material_brands"
      title="Marques de matériau"
      categoryEnum={MATERIAL_BRAND_CATEGORIES}
      extraSchema={materialBrandExtraSchema}
      extraDefaults={DEFAULT_EXTRA}
      extraFormFields={(extra, setExtra) => (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mb-premium"
              checked={!!extra.is_premium}
              onCheckedChange={(c) => setExtra({ is_premium: !!c })}
            />
            <Label htmlFor="mb-premium" className="cursor-pointer">
              Marque premium
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mb-proprietary"
              checked={!!extra.is_proprietary}
              onCheckedChange={(c) => setExtra({ is_proprietary: !!c })}
            />
            <Label htmlFor="mb-proprietary" className="cursor-pointer">
              Marque propriétaire
            </Label>
          </div>
          <div>
            <Label htmlFor="mb-parent-company">Société mère</Label>
            <Input
              id="mb-parent-company"
              value={extra.parent_company ?? ""}
              onChange={(e) =>
                setExtra({ parent_company: e.target.value || null })
              }
              placeholder="ex: Dickson, Sunbrella…"
            />
          </div>
          <div>
            <Label>Marque parente (héritage)</Label>
            <ParentBrandCombobox
              value={extra.parent_brand_id}
              onChange={(v) => setExtra({ parent_brand_id: v })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Optionnel. Phase 2 : validation anti-cycle.
            </p>
          </div>
        </>
      )}
      referencedBy={[
        { table: "product_variants", column: "material_brand_id", label: "variants" },
        {
          table: "material_brand_certifications",
          column: "material_brand_id",
          label: "certifications liées",
        },
      ]}
    />
  );
}

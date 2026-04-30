import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FABRIC_BRAND_SLUGS,
  FABRIC_BRAND_LABELS,
  type FabricBrandSlug,
} from "@/engine/dictionaries/fabricBrands";
import type { ParasolSpecs, SpecsSectionProps } from "./shared/types";

// ============================================================================
// ParasolSpecsSection — category-specific specs editor for "Parasols"
// Pure presentational ; parent owns the state.
// Mobile-first grid, tooltips on technical fields.
// ============================================================================

function HelpTip({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground" aria-label="info">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ParasolSpecsSection({
  value,
  onChange,
  errors,
  disabled,
}: SpecsSectionProps<ParasolSpecs>) {
  const { t } = useTranslation();
  const set = <K extends keyof ParasolSpecs>(key: K, v: ParasolSpecs[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("products.specs.parasols.title")}
      </h3>

      {/* ── Fabric ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.parasols.section_fabric")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fabric_g_m2" className="text-xs flex items-center gap-1.5">
              {t("products.specs.parasols.fabric_grammage")}
              <HelpTip label={t("products.specs.parasols.fabric_grammage_help")} />
            </Label>
            <Input
              id="fabric_g_m2"
              type="number"
              step="1"
              min={150}
              max={450}
              value={value.fabric_g_m2 ?? ""}
              onChange={(e) =>
                set("fabric_g_m2", e.target.value === "" ? null : Math.round(Number(e.target.value)))
              }
              placeholder={t("products.specs.parasols.fabric_grammage_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.fabric_g_m2)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fabric_certification" className="text-xs flex items-center gap-1.5">
              {t("products.specs.parasols.fabric_certification")}
              <HelpTip label={t("products.specs.parasols.fabric_certification_help")} />
            </Label>
            <Select
              value={value.fabric_certification}
              onValueChange={(v) => set("fabric_certification", v as FabricBrandSlug)}
              disabled={disabled}
            >
              <SelectTrigger id="fabric_certification" aria-invalid={Boolean(errors?.fabric_certification)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FABRIC_BRAND_SLUGS.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {FABRIC_BRAND_LABELS[slug]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* ── Structure ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.parasols.section_structure")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pole_diameter_mm" className="text-xs flex items-center gap-1.5">
              {t("products.specs.parasols.pole_diameter")}
              <HelpTip label={t("products.specs.parasols.pole_diameter_help")} />
            </Label>
            <Input
              id="pole_diameter_mm"
              type="number"
              step="1"
              min={30}
              max={80}
              value={value.pole_diameter_mm ?? ""}
              onChange={(e) =>
                set("pole_diameter_mm", e.target.value === "" ? null : Math.round(Number(e.target.value)))
              }
              placeholder={t("products.specs.parasols.pole_diameter_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.pole_diameter_mm)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min_base_weight_kg" className="text-xs flex items-center gap-1.5">
              {t("products.specs.parasols.min_base_weight")}
              <HelpTip label={t("products.specs.parasols.min_base_weight_help")} />
            </Label>
            <Input
              id="min_base_weight_kg"
              type="number"
              step="1"
              min={15}
              max={150}
              value={value.min_base_weight_kg ?? ""}
              onChange={(e) =>
                set("min_base_weight_kg", e.target.value === "" ? null : Math.round(Number(e.target.value)))
              }
              placeholder={t("products.specs.parasols.min_base_weight_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.min_base_weight_kg)}
              inputMode="numeric"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Performance ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.parasols.section_performance")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wind_beaufort_max" className="text-xs flex items-center gap-1.5">
              {t("products.specs.parasols.wind_beaufort_max")}
              <HelpTip label={t("products.specs.parasols.wind_beaufort_max_help")} />
            </Label>
            <Input
              id="wind_beaufort_max"
              type="number"
              step="1"
              min={0}
              max={12}
              value={value.wind_beaufort_max ?? ""}
              onChange={(e) =>
                set("wind_beaufort_max", e.target.value === "" ? null : Math.round(Number(e.target.value)))
              }
              placeholder={t("products.specs.parasols.wind_beaufort_max_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.wind_beaufort_max)}
              inputMode="numeric"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer self-end pb-2">
            <Checkbox
              checked={value.heating_compatible}
              onCheckedChange={(c) => set("heating_compatible", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.parasols.heating_compat")}
                <HelpTip label={t("products.specs.parasols.heating_compat_help")} />
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TableSpecs, SpecsSectionProps } from "./shared/types";

// ============================================================================
// TableSpecsSection — category-specific specs editor for "Tables"
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

export default function TableSpecsSection({
  value,
  onChange,
  errors,
  disabled,
}: SpecsSectionProps<TableSpecs>) {
  const { t } = useTranslation();
  const set = <K extends keyof TableSpecs>(key: K, v: TableSpecs[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("products.specs.tables.title")}
      </h3>

      {/* ── Storage & stability ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.tables.section_storage")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.is_tippable}
              onCheckedChange={(c) => set("is_tippable", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.tables.tippable")}
                <HelpTip label={t("products.specs.tables.tippable_help")} />
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.outdoor_anchor_compatible}
              onCheckedChange={(c) => set("outdoor_anchor_compatible", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.tables.anchor_compatible")}
                <HelpTip label={t("products.specs.tables.anchor_compatible_help")} />
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {/* ── Top ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.tables.section_top")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="top_thickness_cm" className="text-xs flex items-center gap-1.5">
              {t("products.specs.tables.top_thickness")}
              <HelpTip label={t("products.specs.tables.top_thickness_help")} />
            </Label>
            <Input
              id="top_thickness_cm"
              type="number"
              step="0.1"
              min={0.5}
              max={15}
              value={value.top_thickness_cm ?? ""}
              onChange={(e) =>
                set("top_thickness_cm", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder={t("products.specs.tables.top_thickness_placeholder")}
              disabled={disabled}
              inputMode="decimal"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer self-end pb-2">
            <Checkbox
              checked={value.built_in_umbrella_hole}
              onCheckedChange={(c) => {
                const checked = c === true;
                onChange({
                  ...value,
                  built_in_umbrella_hole: checked,
                  // Reset diameter if user unchecks
                  umbrella_hole_diameter_mm: checked ? value.umbrella_hole_diameter_mm : null,
                });
              }}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.tables.umbrella_hole")}
                <HelpTip label={t("products.specs.tables.umbrella_hole_help")} />
              </span>
            </span>
          </label>
        </div>
        {value.built_in_umbrella_hole && (
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="umbrella_hole_diameter_mm" className="text-xs">
              {t("products.specs.tables.umbrella_hole_diameter")}
            </Label>
            <Input
              id="umbrella_hole_diameter_mm"
              type="number"
              step="1"
              min={20}
              max={80}
              value={value.umbrella_hole_diameter_mm ?? ""}
              onChange={(e) =>
                set(
                  "umbrella_hole_diameter_mm",
                  e.target.value === "" ? null : Math.round(Number(e.target.value)),
                )
              }
              placeholder={t("products.specs.tables.umbrella_hole_diameter_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.umbrella_hole_diameter_mm)}
              inputMode="numeric"
            />
            {errors?.umbrella_hole_diameter_mm && (
              <p className="text-xs text-destructive">
                {t(`products.specs.tables.errors.${errors.umbrella_hole_diameter_mm}`)}
              </p>
            )}
          </div>
        )}
      </fieldset>

      {/* ── Modularity ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.tables.section_extension")}
        </legend>
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={value.extension_capability}
            onCheckedChange={(c) => {
              const checked = c === true;
              onChange({
                ...value,
                extension_capability: checked,
                extension_max_length_cm: checked ? value.extension_max_length_cm : null,
              });
            }}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="flex-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              {t("products.specs.tables.extension")}
              <HelpTip label={t("products.specs.tables.extension_help")} />
            </span>
          </span>
        </label>
        {value.extension_capability && (
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="extension_max_length_cm" className="text-xs">
              {t("products.specs.tables.extension_max_length")}
            </Label>
            <Input
              id="extension_max_length_cm"
              type="number"
              step="1"
              min={80}
              max={400}
              value={value.extension_max_length_cm ?? ""}
              onChange={(e) =>
                set(
                  "extension_max_length_cm",
                  e.target.value === "" ? null : Math.round(Number(e.target.value)),
                )
              }
              placeholder={t("products.specs.tables.extension_max_length_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.extension_max_length_cm)}
              inputMode="numeric"
            />
            {errors?.extension_max_length_cm && (
              <p className="text-xs text-destructive">
                {t(`products.specs.tables.errors.${errors.extension_max_length_cm}`)}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}

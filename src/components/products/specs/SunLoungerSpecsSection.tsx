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
import type { SunLoungerSpecs, SpecsSectionProps } from "./shared/types";

// ============================================================================
// SunLoungerSpecsSection — category-specific specs editor for "Sun Loungers"
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

export default function SunLoungerSpecsSection({
  value,
  onChange,
  errors,
  disabled,
}: SpecsSectionProps<SunLoungerSpecs>) {
  const { t } = useTranslation();
  const set = <K extends keyof SunLoungerSpecs>(key: K, v: SunLoungerSpecs[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("products.specs.sun_loungers.title")}
      </h3>

      {/* ── Comfort ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.sun_loungers.section_comfort")}
        </legend>
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={value.cushion_quick_dry}
            onCheckedChange={(c) => set("cushion_quick_dry", c === true)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="flex-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              {t("products.specs.sun_loungers.cushion_quick_dry")}
              <HelpTip label={t("products.specs.sun_loungers.cushion_quick_dry_help")} />
            </span>
          </span>
        </label>
      </fieldset>

      {/* ── Environment resistance ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.sun_loungers.section_environment")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.salt_water_resistance}
              onCheckedChange={(c) => set("salt_water_resistance", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.sun_loungers.salt_water")}
                <HelpTip label={t("products.specs.sun_loungers.salt_water_help")} />
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.chlorine_resistance}
              onCheckedChange={(c) => set("chlorine_resistance", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.sun_loungers.chlorine")}
                <HelpTip label={t("products.specs.sun_loungers.chlorine_help")} />
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.sand_drainage}
              onCheckedChange={(c) => set("sand_drainage", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.sun_loungers.sand_drainage")}
                <HelpTip label={t("products.specs.sun_loungers.sand_drainage_help")} />
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {/* ── Storage ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.sun_loungers.section_storage")}
        </legend>
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="nesting_capacity" className="text-xs flex items-center gap-1.5">
            {t("products.specs.sun_loungers.nesting")}
            <HelpTip label={t("products.specs.sun_loungers.nesting_help")} />
          </Label>
          <Input
            id="nesting_capacity"
            type="number"
            step="1"
            min={1}
            max={50}
            value={value.nesting_capacity ?? ""}
            onChange={(e) =>
              set("nesting_capacity", e.target.value === "" ? null : Math.round(Number(e.target.value)))
            }
            placeholder={t("products.specs.sun_loungers.nesting_placeholder")}
            disabled={disabled}
            aria-invalid={Boolean(errors?.nesting_capacity)}
            inputMode="numeric"
          />
        </div>
      </fieldset>
    </div>
  );
}

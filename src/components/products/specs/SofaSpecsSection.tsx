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
import {
  SOFA_MODULES,
  type SofaModule,
  type SofaSpecs,
  type SpecsSectionProps,
} from "./shared/types";

// ============================================================================
// SofaSpecsSection — category-specific specs editor for "Sofas / Lounge Seating"
// Pure presentational ; parent owns the state.
// available_modules is a jsonb on DB ; validation enforced front-side via zod.
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

export default function SofaSpecsSection({
  value,
  onChange,
  errors,
  disabled,
}: SpecsSectionProps<SofaSpecs>) {
  const { t } = useTranslation();
  const set = <K extends keyof SofaSpecs>(key: K, v: SofaSpecs[K]) =>
    onChange({ ...value, [key]: v });

  const toggleModule = (mod: SofaModule) => {
    const set = new Set(value.available_modules);
    if (set.has(mod)) set.delete(mod);
    else set.add(mod);
    // Preserve original SOFA_MODULES order for deterministic output
    onChange({
      ...value,
      available_modules: SOFA_MODULES.filter((m) => set.has(m)),
    });
  };

  const isModuleSelected = (mod: SofaModule) => value.available_modules.includes(mod);
  const noModules = value.available_modules.length === 0;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("products.specs.sofas.title")}
      </h3>

      {/* ── Modularity & Configuration ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
          {t("products.specs.sofas.section_modularity")}
          <HelpTip label={t("products.specs.sofas.modules_help")} />
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SOFA_MODULES.map((mod) => (
            <label
              key={mod}
              className="flex items-start gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={isModuleSelected(mod)}
                onCheckedChange={() => toggleModule(mod)}
                disabled={disabled}
                className="mt-0.5"
              />
              <span className="flex-1">
                {t(`products.specs.sofas.modules.${mod.replace(/-/g, "_")}`)}
              </span>
            </label>
          ))}
        </div>
        {noModules && (
          <p className="text-[11px] font-body italic text-muted-foreground">
            {t("products.specs.sofas.no_modules")}
          </p>
        )}
      </fieldset>

      {/* ── Comfort & Dimensions ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.sofas.section_comfort")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="seat_depth_cm" className="text-xs flex items-center gap-1.5">
              {t("products.specs.sofas.seat_depth")}
              <HelpTip label={t("products.specs.sofas.seat_depth_help")} />
            </Label>
            <Input
              id="seat_depth_cm"
              type="number"
              step="0.5"
              min={30}
              max={120}
              value={value.seat_depth_cm ?? ""}
              onChange={(e) =>
                set("seat_depth_cm", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder={t("products.specs.sofas.seat_depth_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.seat_depth_cm)}
              inputMode="decimal"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer self-end pb-2">
            <Checkbox
              checked={value.cushion_replacement_available}
              onCheckedChange={(c) => set("cushion_replacement_available", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.sofas.cushion_replacement")}
                <HelpTip label={t("products.specs.sofas.cushion_replacement_help")} />
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {/* ── Acoustic Performance ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.sofas.section_acoustic")}
        </legend>
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="acoustic_nrc" className="text-xs flex items-center gap-1.5">
            {t("products.specs.sofas.acoustic_nrc")}
            <HelpTip label={t("products.specs.sofas.acoustic_nrc_help")} />
          </Label>
          <Input
            id="acoustic_nrc"
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={value.acoustic_nrc ?? ""}
            onChange={(e) =>
              set("acoustic_nrc", e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder={t("products.specs.sofas.acoustic_nrc_placeholder")}
            disabled={disabled}
            aria-invalid={Boolean(errors?.acoustic_nrc)}
            inputMode="decimal"
          />
        </div>
      </fieldset>
    </div>
  );
}

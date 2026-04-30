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
import SubdivisionPicker from "./shared/SubdivisionPicker";
import {
  SUBDIVISION_SEAT_HEIGHT_HINTS,
  SUBDIVISION_HINT_TOLERANCE_CM,
  type BarStoolSpecs,
  type SpecsSectionProps,
} from "./shared/types";

// ============================================================================
// BarStoolSpecsSection — category-specific specs editor for "Bar Stools"
// Soft cross-validation : warns if seat_height_cm is far from the recommended
// height for the chosen subdivision (counter ~65, bar ~75, tall ~85).
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

export default function BarStoolSpecsSection({
  value,
  onChange,
  errors,
  disabled,
}: SpecsSectionProps<BarStoolSpecs>) {
  const { t } = useTranslation();
  const set = <K extends keyof BarStoolSpecs>(key: K, v: BarStoolSpecs[K]) =>
    onChange({ ...value, [key]: v });

  // Soft hint: seat height vs subdivision
  const expectedSeatHeight = SUBDIVISION_SEAT_HEIGHT_HINTS[value.subdivision];
  const seatHeightMismatch =
    expectedSeatHeight !== null &&
    value.seat_height_cm !== null &&
    Math.abs(value.seat_height_cm - expectedSeatHeight) > SUBDIVISION_HINT_TOLERANCE_CM;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("products.specs.bar_stools.title")}
      </h3>

      {/* ── Subdivision & Height ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.bar_stools.section_height")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="subdivision" className="text-xs flex items-center gap-1.5">
              {t("products.specs.bar_stools.subdivision")}
              <HelpTip label={t("products.specs.bar_stools.subdivision_help")} />
            </Label>
            <SubdivisionPicker
              id="subdivision"
              value={value.subdivision}
              onChange={(v) => set("subdivision", v)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bar_seat_height_cm" className="text-xs flex items-center gap-1.5">
              {t("products.specs.bar_stools.seat_height")}
              <HelpTip label={t("products.specs.bar_stools.seat_height_help")} />
            </Label>
            <Input
              id="bar_seat_height_cm"
              type="number"
              step="0.5"
              min={40}
              max={95}
              value={value.seat_height_cm ?? ""}
              onChange={(e) =>
                set("seat_height_cm", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder={t("products.specs.bar_stools.seat_height_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.seat_height_cm)}
              inputMode="decimal"
            />
            {seatHeightMismatch && expectedSeatHeight !== null && (
              <p className="text-[11px] text-amber-600 dark:text-amber-500">
                {t("products.specs.bar_stools.seat_height_mismatch", {
                  subdivision: t(`products.specs.shared.subdivision.${value.subdivision}`),
                  recommended: expectedSeatHeight,
                })}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── Comfort & Rotation ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.bar_stools.section_comfort")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.footrest}
              onCheckedChange={(c) => set("footrest", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.bar_stools.footrest")}
                <HelpTip label={t("products.specs.bar_stools.footrest_help")} />
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={value.swivel}
              onCheckedChange={(c) => set("swivel", c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                {t("products.specs.bar_stools.swivel")}
                <HelpTip label={t("products.specs.bar_stools.swivel_help")} />
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SubdivisionPicker from "./shared/SubdivisionPicker";
import type { HighTableSpecs, SpecsSectionProps } from "./shared/types";

// ============================================================================
// HighTableSpecsSection — for Tables with subcategory matching "high"
// Mounted inside the Tables block in AddProductForm/AdminProductReview.
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

export default function HighTableSpecsSection({
  value,
  onChange,
  errors,
  disabled,
}: SpecsSectionProps<HighTableSpecs>) {
  const { t } = useTranslation();
  const set = <K extends keyof HighTableSpecs>(key: K, v: HighTableSpecs[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t("products.specs.high_tables.title")}
      </h3>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {t("products.specs.high_tables.section_height")}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="high_table_subdivision" className="text-xs flex items-center gap-1.5">
              {t("products.specs.high_tables.subdivision")}
              <HelpTip label={t("products.specs.high_tables.subdivision_help")} />
            </Label>
            <SubdivisionPicker
              id="high_table_subdivision"
              value={value.subdivision}
              onChange={(v) => set("subdivision", v)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="table_top_height_cm" className="text-xs flex items-center gap-1.5">
              {t("products.specs.high_tables.table_top_height")}
              <HelpTip label={t("products.specs.high_tables.table_top_height_help")} />
            </Label>
            <Input
              id="table_top_height_cm"
              type="number"
              step="0.5"
              min={60}
              max={130}
              value={value.table_top_height_cm ?? ""}
              onChange={(e) =>
                set("table_top_height_cm", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder={t("products.specs.high_tables.table_top_height_placeholder")}
              disabled={disabled}
              aria-invalid={Boolean(errors?.table_top_height_cm)}
              inputMode="decimal"
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}

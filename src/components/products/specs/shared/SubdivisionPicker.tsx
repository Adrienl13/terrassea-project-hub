import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SUBDIVISION_OPTIONS, type SubdivisionOption } from "./types";

// ============================================================================
// SubdivisionPicker — shared dropdown for Bar Stools and High Tables
// 4 canonical values : counter / bar / tall / unknown
// Localized labels via i18n key products.specs.shared.subdivision.<option>
// ============================================================================

export type SubdivisionPickerProps = {
  id?: string;
  value: SubdivisionOption;
  onChange: (next: SubdivisionOption) => void;
  disabled?: boolean;
  helpId?: string;
  ariaInvalid?: boolean;
};

export default function SubdivisionPicker({
  id = "subdivision",
  value,
  onChange,
  disabled,
  ariaInvalid,
}: SubdivisionPickerProps) {
  const { t } = useTranslation();
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SubdivisionOption)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-invalid={ariaInvalid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUBDIVISION_OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {t(`products.specs.shared.subdivision.${opt}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

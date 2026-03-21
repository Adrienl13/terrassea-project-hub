import { useTranslation } from "react-i18next";
import type { ColorVariant } from "@/lib/products";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  variants: ColorVariant[];
  selectedColor: string | null;
  onSelectColor: (colorSlug: string) => void;
  size?: "sm" | "md";
}

const SWATCH_SIZE = {
  sm: "w-4 h-4",   // 16px
  md: "w-6 h-6",   // 24px
} as const;

const RING_SIZE = {
  sm: "ring-1 ring-offset-1",
  md: "ring-2 ring-offset-2",
} as const;

export default function ColorVariantSelector({
  variants,
  selectedColor,
  onSelectColor,
  size = "md",
}: Props) {
  const { t } = useTranslation();
  const maxVisible = size === "sm" ? 5 : variants.length;
  const visible = variants.slice(0, maxVisible);
  const remaining = variants.length - maxVisible;

  const selectedVariant = variants.find((v) => v.color_slug === selectedColor);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TooltipProvider delayDuration={200}>
          {visible.map((v) => {
            const isSelected = selectedColor === v.color_slug;
            const isUnavailable = !v.available;

            return (
              <Tooltip key={v.color_slug}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (v.available) onSelectColor(v.color_slug);
                    }}
                    disabled={isUnavailable}
                    className={`
                      ${SWATCH_SIZE[size]} rounded-full border border-border relative flex-shrink-0 transition-all
                      ${isSelected ? `${RING_SIZE[size]} ring-foreground` : ""}
                      ${isUnavailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-110"}
                    `}
                    style={{ backgroundColor: v.color_hex }}
                    aria-label={v.label_en}
                  >
                    {isUnavailable && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="block bg-foreground/60 rounded-full"
                          style={{
                            width: "140%",
                            height: "1px",
                            transform: "rotate(-45deg)",
                          }}
                        />
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {v.label_en}
                  {isUnavailable && (
                    <span className="text-muted-foreground ml-1">
                      ({t("colorSelector.unavailable")})
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {remaining > 0 && (
          <span className="text-[10px] text-muted-foreground font-body ml-0.5">
            +{remaining} {t("colorSelector.moreColors")}
          </span>
        )}
      </div>

      {size === "md" && selectedVariant && (
        <span className="text-xs text-muted-foreground font-body mt-0.5">
          {selectedVariant.label_en}
        </span>
      )}
    </div>
  );
}

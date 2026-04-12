import { Star } from "lucide-react";
import { useCallback } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };

export default function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const cls = SIZES[size];
  const interactive = !!onChange;

  const handleKeyDown = useCallback(
    (star: number, e: React.KeyboardEvent) => {
      if (!onChange) return;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(Math.min(star + 1, 5));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(Math.max(star - 1, 1));
      }
    },
    [onChange]
  );

  return (
    <div
      className={`flex items-center gap-0.5 ${interactive ? "cursor-pointer" : ""}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Rating" : `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role={interactive ? "radio" : undefined}
          aria-checked={interactive ? star === value : undefined}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          disabled={!interactive}
          tabIndex={interactive ? (star === value || (value === 0 && star === 1) ? 0 : -1) : -1}
          onClick={() => onChange?.(star)}
          onKeyDown={(e) => handleKeyDown(star, e)}
          className={`${
            interactive
              ? "hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 rounded-sm"
              : ""
          } disabled:cursor-default`}
        >
          <Star
            className={`${cls} ${
              star <= value
                ? "text-amber-400 fill-amber-400"
                : "text-border"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-16"} border border-dashed border-border rounded-xl`}>
      <div className={`${compact ? "w-10 h-10" : "w-14 h-14"} rounded-full bg-muted/50 flex items-center justify-center mb-3`}>
        <Icon className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-muted-foreground/40`} />
      </div>
      <p className={`${compact ? "text-xs" : "text-sm"} font-display font-semibold text-foreground mb-1`}>
        {title}
      </p>
      {description && (
        <p className={`${compact ? "text-[10px]" : "text-xs"} font-body text-muted-foreground mb-4 max-w-xs`}>
          {description}
        </p>
      )}
      {actionLabel && (actionHref || onAction) && (
        <div className="flex items-center gap-3">
          {actionHref ? (
            <Link
              to={actionHref}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && secondaryHref && (
            <Link
              to={secondaryHref}
              className="text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

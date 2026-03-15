import { Badge } from "@/components/ui/badge";
import { getAvailability } from "./ProductDetailDrawer";
import type { DBProduct } from "@/lib/products";

interface AvailabilityBadgeProps {
  product: DBProduct;
  compact?: boolean;
}

const AvailabilityBadge = ({ product, compact = false }: AvailabilityBadgeProps) => {
  const availability = getAvailability(product);
  const Icon = availability.icon;

  return (
    <Badge variant={availability.variant} className="text-[10px] gap-1 font-body">
      <Icon className="h-2.5 w-2.5" />
      {compact ? availability.label : availability.label}
    </Badge>
  );
};

export default AvailabilityBadge;

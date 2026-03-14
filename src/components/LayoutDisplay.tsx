import { LayoutRecommendation } from "@/engine/types";
import { TableProperties } from "lucide-react";

interface LayoutDisplayProps {
  layout: LayoutRecommendation;
}

const LayoutDisplay = ({ layout }: LayoutDisplayProps) => {
  return (
    <div className="border border-border rounded-sm p-5 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <TableProperties className="h-4 w-4 text-foreground" />
        <span className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">
          {layout.label}
        </span>
        <span className="ml-auto text-xs font-body text-muted-foreground">
          {layout.totalSeats} seats
        </span>
      </div>

      <div className="space-y-2">
        {layout.tableGroups.map((group, i) => (
          <div key={i} className="flex items-center justify-between text-sm font-body">
            <span className="text-foreground">
              <span className="font-display font-semibold">{group.quantity}×</span>{" "}
              {group.tableFormat} tables
              <span className="text-muted-foreground ml-1.5 text-xs">
                ({group.shape})
              </span>
            </span>
            <span className="text-muted-foreground text-xs">
              {group.seatsPerTable} seats each → {group.totalSeats} seats
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-body text-muted-foreground">
          Chairs needed: <span className="font-semibold text-foreground">{layout.chairCount}</span>
        </span>
      </div>

      {layout.notes && (
        <p className="text-[11px] font-body text-muted-foreground mt-2 italic">
          {layout.notes}
        </p>
      )}
    </div>
  );
};

export default LayoutDisplay;

import { useState } from "react";
import { LayoutRecommendation, TableGroup } from "@/engine/types";
import { TableProperties, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import SpatialMetricsDisplay from "./SpatialMetricsDisplay";

interface Props {
  layout: LayoutRecommendation;
  onLayoutChange?: (layout: LayoutRecommendation) => void;
  budgetEstimate?: { min: number; max: number; avgPerSeat: number } | null;
}

const TABLE_FORMAT_OPTIONS = [
  { format: "70×70", shape: "square", seats: 2 },
  { format: "80×80", shape: "square", seats: 4 },
  { format: "120×70", shape: "rectangular", seats: 4 },
  { format: "120×80", shape: "rectangular", seats: 4 },
  { format: "160×80", shape: "rectangular", seats: 6 },
  { format: "Ø80", shape: "round", seats: 4 },
  { format: "Ø120", shape: "round", seats: 6 },
];

const EditableLayoutDisplay = ({ layout, onLayoutChange, budgetEstimate }: Props) => {
  const [editing, setEditing] = useState(false);
  const [groups, setGroups] = useState<TableGroup[]>(layout.tableGroups);

  const updateGroup = (index: number, qty: number) => {
    const updated = [...groups];
    updated[index] = { ...updated[index], quantity: Math.max(0, qty), totalSeats: Math.max(0, qty) * updated[index].seatsPerTable };
    setGroups(updated.filter((g) => g.quantity > 0));
  };

  const addGroup = () => {
    const fmt = TABLE_FORMAT_OPTIONS[0];
    setGroups([...groups, {
      tableFormat: fmt.format,
      shape: fmt.shape,
      quantity: 1,
      seatsPerTable: fmt.seats,
      totalSeats: fmt.seats,
    }]);
  };

  const changeFormat = (index: number, format: string) => {
    const fmt = TABLE_FORMAT_OPTIONS.find((f) => f.format === format);
    if (!fmt) return;
    const updated = [...groups];
    updated[index] = {
      ...updated[index],
      tableFormat: fmt.format,
      shape: fmt.shape,
      seatsPerTable: fmt.seats,
      totalSeats: updated[index].quantity * fmt.seats,
    };
    setGroups(updated);
  };

  const removeGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const applyChanges = () => {
    const totalSeats = groups.reduce((s, g) => s + g.totalSeats, 0);
    onLayoutChange?.({
      ...layout,
      tableGroups: groups,
      totalSeats,
      chairCount: totalSeats,
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setGroups(layout.tableGroups);
    setEditing(false);
  };

  const displayGroups = editing ? groups : layout.tableGroups;
  const displayTotal = displayGroups.reduce((s, g) => s + g.totalSeats, 0);

  return (
    <div className="border border-border rounded-sm p-5 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <TableProperties className="h-4 w-4 text-foreground" />
        <span className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">
          {layout.label}
        </span>
        <span className="ml-auto text-xs font-body text-muted-foreground">
          {displayTotal} seats
        </span>
        {onLayoutChange && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit layout"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayGroups.map((group, i) => (
          <div key={i} className="flex items-center justify-between text-sm font-body gap-2">
            {editing ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="number"
                    min={0}
                    value={group.quantity}
                    onChange={(e) => updateGroup(i, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <select
                    value={group.tableFormat}
                    onChange={(e) => changeFormat(i, e.target.value)}
                    className="h-8 text-xs bg-background border border-border rounded-sm px-2 text-foreground"
                  >
                    {TABLE_FORMAT_OPTIONS.map((fmt) => (
                      <option key={fmt.format} value={fmt.format}>
                        {fmt.format} ({fmt.seats} seats)
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={() => removeGroup(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-foreground">
                  <span className="font-display font-semibold">{group.quantity}×</span>{" "}
                  {group.tableFormat} tables
                  <span className="text-muted-foreground ml-1.5 text-xs">({group.shape})</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {group.seatsPerTable} seats each → {group.totalSeats} seats
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={addGroup}
            className="flex items-center gap-1 text-[10px] font-body text-muted-foreground hover:text-foreground border border-dashed border-border rounded-sm px-2 py-1 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add table format
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              onClick={applyChanges}
              className="flex items-center gap-1 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full px-3 py-1 hover:opacity-90 transition-opacity"
            >
              <Check className="h-3.5 w-3.5" /> Apply
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-body text-muted-foreground">
          Chairs needed: <span className="font-semibold text-foreground">{editing ? displayTotal : layout.chairCount}</span>
        </span>
      </div>

      {/* Spatial metrics */}
      {layout.spatialMetrics && !editing && (
        <SpatialMetricsDisplay metrics={layout.spatialMetrics} />
      )}

      {/* Budget estimate */}
      {budgetEstimate && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body text-muted-foreground">Estimated furniture budget</span>
            <span className="text-sm font-display font-semibold text-foreground">
              €{budgetEstimate.min.toLocaleString()} – €{budgetEstimate.max.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-body text-muted-foreground">Average per seat</span>
            <span className="text-xs font-body text-muted-foreground">
              €{budgetEstimate.avgPerSeat.toFixed(0)}
            </span>
          </div>
        </div>
      )}

      {layout.notes && (
        <p className="text-[11px] font-body text-muted-foreground mt-2 italic">
          {layout.notes}
        </p>
      )}
    </div>
  );
};

export default EditableLayoutDisplay;

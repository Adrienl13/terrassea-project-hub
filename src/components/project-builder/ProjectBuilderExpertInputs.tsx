import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectParameters, TableMixEntry } from "@/engine/types";
import { getDensityInfo, getMaxSeats } from "@/engine/spatialEngine";

interface Props {
  params: ProjectParameters;
  onChange: (updates: Partial<ProjectParameters>) => void;
  onBack: () => void;
  onNext: () => void;
}

const TABLE_FORMATS = [
  { format: "70×70", seats: 2, label: "70×70 cm — 2 seats" },
  { format: "80×80", seats: 4, label: "80×80 cm — 4 seats" },
  { format: "120×70", seats: 4, label: "120×70 cm — 4 seats" },
  { format: "120×80", seats: 4, label: "120×80 cm — 4 seats" },
  { format: "160×80", seats: 6, label: "160×80 cm — 6 seats" },
  { format: "200×90", seats: 8, label: "200×90 cm — 8 seats" },
  { format: "Ø80", seats: 4, label: "Ø80 cm round — 4 seats" },
  { format: "Ø120", seats: 6, label: "Ø120 cm round — 6 seats" },
];

const ESTABLISHMENT_TYPES = ["restaurant", "hotel", "rooftop", "beach-club", "bar", "camping", "event", "pool"];

const ProjectBuilderExpertInputs = ({ params, onChange, onBack, onNext }: Props) => {
  const [tableMix, setTableMix] = useState<TableMixEntry[]>([
    { format: "70×70", quantity: 10, seatsPerTable: 2 },
    { format: "120×70", quantity: 5, seatsPerTable: 4 },
  ]);

  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);

  const totalSeatsFromMix = tableMix.reduce((sum, t) => sum + t.quantity * t.seatsPerTable, 0);
  const totalTables = tableMix.reduce((sum, t) => sum + t.quantity, 0);
  const effectiveSeats = params.seatingCapacity ?? totalSeatsFromMix;
  const densityInfo = getDensityInfo(effectiveSeats, surface);

  const updateTableMix = (index: number, updates: Partial<TableMixEntry>) => {
    setTableMix(prev => prev.map((entry, i) => i === index ? { ...entry, ...updates } : entry));
  };

  const addTableRow = () => {
    const unused = TABLE_FORMATS.find(f => !tableMix.some(t => t.format === f.format));
    if (unused) {
      setTableMix(prev => [...prev, { format: unused.format, quantity: 1, seatsPerTable: unused.seats }]);
    }
  };

  const removeTableRow = (index: number) => {
    if (tableMix.length > 1) setTableMix(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormatChange = (index: number, format: string) => {
    const f = TABLE_FORMATS.find(t => t.format === format);
    updateTableMix(index, { format, seatsPerTable: f?.seats ?? 2 });
  };

  const canProceed = params.establishmentType && (params.seatingCapacity || totalSeatsFromMix > 0);

  return (
    <motion.div
      key="expert"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-1">
        Technical configurator
      </h2>
      <p className="text-sm font-body text-muted-foreground mb-8">
        Enter your project specifications directly. All parameters in one view.
      </p>

      <div className="space-y-6">
        {/* ── Section 1: Establishment ── */}
        <fieldset className="border border-border rounded-sm p-4">
          <legend className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground px-2">
            Establishment
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ESTABLISHMENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => onChange({ establishmentType: type })}
                className={`px-3 py-1.5 text-xs font-display font-semibold rounded-sm border transition-all capitalize ${
                  params.establishmentType === type
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {type.replace("-", " ")}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── Section 2: Dimensions & Capacity ── */}
        <fieldset className="border border-border rounded-sm p-4">
          <legend className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground px-2">
            Space & Capacity
          </legend>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-[10px] font-body text-muted-foreground mb-1 block">Seats (target)</Label>
              <Input
                type="number" min={1} max={500} placeholder="60"
                value={params.seatingCapacity ?? ""}
                onChange={e => onChange({ seatingCapacity: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div>
              <Label className="text-[10px] font-body text-muted-foreground mb-1 block">Length (m)</Label>
              <Input
                type="number" min={1} placeholder="12"
                value={params.terraceLength ?? ""}
                onChange={e => {
                  const len = e.target.value ? parseFloat(e.target.value) : null;
                  const w = params.terraceWidth;
                  onChange({ terraceLength: len, terraceSurfaceM2: len && w ? Math.round(len * w) : params.terraceSurfaceM2 });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px] font-body text-muted-foreground mb-1 block">Width (m)</Label>
              <Input
                type="number" min={1} placeholder="8"
                value={params.terraceWidth ?? ""}
                onChange={e => {
                  const w = e.target.value ? parseFloat(e.target.value) : null;
                  const len = params.terraceLength;
                  onChange({ terraceWidth: w, terraceSurfaceM2: len && w ? Math.round(len * w) : params.terraceSurfaceM2 });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px] font-body text-muted-foreground mb-1 block">Area (m²)</Label>
              <Input
                type="number" min={1} placeholder="96"
                value={params.terraceSurfaceM2 ?? (params.terraceLength && params.terraceWidth ? Math.round(params.terraceLength * params.terraceWidth) : "")}
                onChange={e => onChange({ terraceSurfaceM2: e.target.value ? parseFloat(e.target.value) : null, terraceLength: null, terraceWidth: null })}
              />
            </div>
          </div>

          {/* Density & feasibility indicators */}
          {densityInfo && (
            <div className="space-y-2 py-2 px-3 rounded-sm bg-muted/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${densityInfo.dotClass}`} />
                <span className={`text-xs font-body font-medium ${densityInfo.textClass}`}>
                  {densityInfo.label}
                </span>
                <span className="text-[10px] font-body text-muted-foreground">
                  — {densityInfo.spacePerSeat} m²/seat
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  densityInfo.feasibility === "good" ? "bg-green-500" :
                  densityInfo.feasibility === "compact" ? "bg-amber-500" : "bg-red-500"
                }`} />
                <span className={`text-xs font-body font-medium ${
                  densityInfo.feasibility === "good" ? "text-green-600" :
                  densityInfo.feasibility === "compact" ? "text-amber-600" : "text-red-600"
                }`}>
                  {densityInfo.feasibilityLabel}
                </span>
              </div>
              {surface && (
                <p className="text-[10px] font-body text-muted-foreground">
                  Recommended: {getMaxSeats(surface, "dense")}–{getMaxSeats(surface, "comfortable")} seats for {surface} m²
                </p>
              )}
            </div>
          )}
        </fieldset>

        {/* ── Section 3: Table Mix ── */}
        <fieldset className="border border-border rounded-sm p-4">
          <legend className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground px-2">
            Table Mix Configuration
          </legend>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 text-[10px] font-body text-muted-foreground uppercase tracking-wider">
              <span>Format</span>
              <span>Qty</span>
              <span>Seats/tbl</span>
              <span>Subtotal</span>
              <span />
            </div>

            {tableMix.map((entry, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-center">
                <select
                  value={entry.format}
                  onChange={e => handleFormatChange(i, e.target.value)}
                  className="h-9 rounded-sm border border-border bg-card px-2 text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {TABLE_FORMATS.map(f => (
                    <option key={f.format} value={f.format}>{f.label}</option>
                  ))}
                </select>
                <Input
                  type="number" min={0} value={entry.quantity}
                  onChange={e => updateTableMix(i, { quantity: parseInt(e.target.value) || 0 })}
                  className="text-center text-xs"
                />
                <Input
                  type="number" min={1} max={12} value={entry.seatsPerTable}
                  onChange={e => updateTableMix(i, { seatsPerTable: parseInt(e.target.value) || 1 })}
                  className="text-center text-xs"
                />
                <span className="text-xs font-body font-semibold text-foreground text-center">
                  {entry.quantity * entry.seatsPerTable}
                </span>
                <button
                  onClick={() => removeTableRow(i)}
                  disabled={tableMix.length <= 1}
                  className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {tableMix.length < TABLE_FORMATS.length && (
            <button
              onClick={addTableRow}
              className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors mt-3"
            >
              <Plus className="h-3.5 w-3.5" /> Add table format
            </button>
          )}

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs font-body text-muted-foreground">
              {totalTables} tables
            </span>
            <span className="text-sm font-display font-bold text-foreground">
              {totalSeatsFromMix} seats from table mix
            </span>
          </div>
        </fieldset>

        {/* ── Section 4: Style & Budget ── */}
        <fieldset className="border border-border rounded-sm p-4">
          <legend className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground px-2">
            Style & Budget
          </legend>

          <div className="mb-4">
            <Label className="text-[10px] font-body text-muted-foreground mb-1.5 block">Style</Label>
            <div className="flex flex-wrap gap-1.5">
              {["mediterranean", "modern", "bistro", "natural", "industrial", "luxury", "coastal", "tropical"].map(s => (
                <button
                  key={s}
                  onClick={() => onChange({ style: params.style.includes(s) ? params.style.filter(x => x !== s) : [...params.style, s] })}
                  className={`px-3 py-1.5 text-xs font-display font-semibold rounded-sm border transition-all capitalize ${
                    params.style.includes(s)
                      ? "border-foreground bg-foreground text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-foreground/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-body text-muted-foreground mb-1.5 block">Budget per seat</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "economy", label: "€50–80" },
                { value: "mid", label: "€80–120" },
                { value: "premium", label: "€120–180" },
                { value: "luxury", label: "€180+" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ budgetLevel: opt.value })}
                  className={`px-3 py-1.5 text-xs font-display font-semibold rounded-sm border transition-all ${
                    params.budgetLevel === opt.value
                      ? "border-foreground bg-foreground text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-foreground/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={() => {
            if (!params.seatingCapacity && totalSeatsFromMix > 0) {
              onChange({ seatingCapacity: totalSeatsFromMix });
            }
            onNext();
          }}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold rounded-full transition-all ${
            canProceed
              ? "bg-foreground text-primary-foreground hover:opacity-90"
              : "bg-border text-muted-foreground cursor-not-allowed"
          }`}
        >
          Review & Generate <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ProjectBuilderExpertInputs;

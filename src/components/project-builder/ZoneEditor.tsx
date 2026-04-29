import { Plus, Trash2, LayoutGrid } from "lucide-react";
import type { ProjectZone } from "@/engine/types";

// ═══════════════════════════════════════════════════════════
// ZONE EDITOR — Chantier 2 (multi-zones)
// ═══════════════════════════════════════════════════════════
// Minimal MVP: users add one row per zone (pool, restaurant, rooftop…)
// and each row lets them set label, zone type, seating capacity, surface.
// Style and timeline inherit from the parent project params.
// ═══════════════════════════════════════════════════════════

interface ZoneEditorProps {
  zones: ProjectZone[];
  onChange: (zones: ProjectZone[]) => void;
}

const ZONE_PRESETS: { zone: string; label: string }[] = [
  { zone: "pool",       label: "Piscine" },
  { zone: "terrace",    label: "Terrasse restaurant" },
  { zone: "rooftop",    label: "Rooftop" },
  { zone: "beach-club", label: "Beach club" },
  { zone: "bar",        label: "Bar / lounge" },
  { zone: "garden",     label: "Jardin" },
  { zone: "other",      label: "Autre" },
];

function newZone(index: number): ProjectZone {
  return {
    id: crypto.randomUUID(),
    label: `Zone ${index + 1}`,
    projectZone: "terrace",
    seatingCapacity: null,
    terraceSurfaceM2: null,
  };
}

export default function ZoneEditor({ zones, onChange }: ZoneEditorProps) {
  const addZone = () => {
    onChange([...zones, newZone(zones.length)]);
  };

  const updateZone = (id: string, patch: Partial<ProjectZone>) => {
    onChange(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };

  const removeZone = (id: string) => {
    onChange(zones.filter((z) => z.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Zones du projet
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Décrivez chaque zone séparément : piscine, restaurant, rooftop… Chaque zone génère ses propres concepts.
          </p>
        </div>
        <button
          type="button"
          onClick={addZone}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body uppercase tracking-wider border border-border rounded bg-card hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une zone
        </button>
      </div>

      {zones.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune zone définie. Le projet sera traité comme une zone unique.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-3 items-end border border-border rounded-md p-4 bg-card/50"
            >
              <Field label="Nom de la zone">
                <input
                  type="text"
                  value={zone.label}
                  onChange={(e) => updateZone(zone.id, { label: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded"
                  placeholder="Ex: Piscine hôtel"
                />
              </Field>
              <Field label="Type">
                <select
                  value={zone.projectZone}
                  onChange={(e) => updateZone(zone.id, { projectZone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded"
                >
                  {ZONE_PRESETS.map((p) => (
                    <option key={p.zone} value={p.zone}>{p.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Couverts">
                <input
                  type="number"
                  min={0}
                  value={zone.seatingCapacity ?? ""}
                  onChange={(e) =>
                    updateZone(zone.id, {
                      seatingCapacity: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded"
                  placeholder="40"
                />
              </Field>
              <Field label="Surface (m²)">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={zone.terraceSurfaceM2 ?? ""}
                  onChange={(e) =>
                    updateZone(zone.id, {
                      terraceSurfaceM2: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded"
                  placeholder="80"
                />
              </Field>
              <button
                type="button"
                onClick={() => removeZone(zone.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                aria-label="Supprimer cette zone"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-body">
        {label}
      </span>
      {children}
    </label>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, Sparkles, AlertTriangle, Check } from "lucide-react";
import ConceptCard from "./ConceptCard";
import type { DBProduct } from "@/lib/products";
import type { MultiZoneResult } from "@/engine/multiZoneEngine";
import type { ComplianceReport } from "@/engine/complianceEngine";
import { logGenerationSnapshot } from "@/lib/conceptTracking";

// ═══════════════════════════════════════════════════════════
// MULTI-ZONE RESULTS — Chantier 2 view
// ═══════════════════════════════════════════════════════════
// Renders the output of `generateMultiZoneProject`: cross-zone aggregate
// KPIs + per-zone concept cards + compliance flags.
// ═══════════════════════════════════════════════════════════

interface MultiZoneResultsProps {
  result: MultiZoneResult;
  products: DBProduct[];
}

export default function MultiZoneResults({ result, products }: MultiZoneResultsProps) {
  const { zones, aggregate } = result;
  const [snapshotIdByZone, setSnapshotIdByZone] = useState<Record<string, string | null>>({});

  // Log one snapshot per zone so each zone's concepts get their own funnel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string | null> = {};
      for (const z of zones) {
        const id = await logGenerationSnapshot({
          parameters: z.parameters,
          concepts: z.concepts,
          generationContext: { multiZone: true, zoneId: z.zone.id, zoneLabel: z.zone.label },
        });
        out[z.zone.id] = id;
      }
      if (!cancelled) setSnapshotIdByZone(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [zones]);

  return (
    <section className="py-16 px-6">
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-foreground" />
            <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
              Projet multi-zones
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            {zones.length} zones analysées
          </h2>
        </motion.div>

        {/* Aggregate KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          <KpiPill label="Couverts totaux" value={aggregate.totalSeats.toLocaleString()} />
          <KpiPill label="Surface totale" value={`${aggregate.totalTerraceSurface.toFixed(0)} m²`} />
          <KpiPill
            label="Enveloppe indicative"
            value={
              aggregate.indicativeTotalMin > 0
                ? `${Math.round(aggregate.indicativeTotalMin / 1000)}–${Math.round(
                    aggregate.indicativeTotalMax / 1000
                  )} k€`
                : "—"
            }
          />
          <KpiPill label="Produits distincts" value={aggregate.distinctProducts.toString()} />
          <KpiPill
            label="Alertes conformité"
            value={aggregate.crossZoneBlockers.toString()}
            tone={aggregate.crossZoneBlockers > 0 ? "danger" : "ok"}
          />
        </div>

        {/* Per-zone sections */}
        <div className="space-y-12">
          {zones.map((zoneResult, i) => (
            <div key={zoneResult.zone.id}>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-foreground text-background text-xs font-display font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {zoneResult.zone.label}
                    </h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {zoneResult.zone.projectZone} · {zoneResult.parameters.seatingCapacity ?? "?"} couverts
                      {zoneResult.parameters.terraceSurfaceM2
                        ? ` · ${zoneResult.parameters.terraceSurfaceM2} m²`
                        : ""}
                    </p>
                  </div>
                </div>
                <ComplianceSummary reports={zoneResult.compliance} />
              </div>

              {/* Compliance issues (if any) */}
              <ComplianceIssues reports={zoneResult.compliance} />

              {/* Concept cards for this zone */}
              <div className="space-y-8 mt-6">
                {zoneResult.concepts.map((concept, ci) => (
                  <ConceptCard
                    key={concept.id}
                    concept={concept}
                    index={ci}
                    products={products}
                    snapshotId={snapshotIdByZone[zoneResult.zone.id] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────

function KpiPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/30 bg-red-500/5 text-red-700"
      : tone === "ok"
      ? "border-green-500/20 bg-green-500/5 text-green-700"
      : "border-border bg-card text-foreground";
  return (
    <div className={`border ${toneClass} rounded-md px-4 py-3`}>
      <p className="text-[10px] font-body uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-lg font-display font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function ComplianceSummary({ reports }: { reports: Record<string, ComplianceReport> }) {
  const values = Object.values(reports);
  if (values.length === 0) return null;
  const blockers = values.reduce((s, r) => s + r.issues.filter((i) => i.severity === "blocker").length, 0);
  const warnings = values.reduce((s, r) => s + r.issues.filter((i) => i.severity === "warning").length, 0);
  if (blockers === 0 && warnings === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-700">
        <Check className="h-3.5 w-3.5" /> Conforme
      </span>
    );
  }
  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${
        blockers > 0 ? "text-red-700" : "text-amber-700"
      }`}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {blockers > 0 ? `${blockers} blocage${blockers > 1 ? "s" : ""}` : `${warnings} avertissement${warnings > 1 ? "s" : ""}`}
    </span>
  );
}

function ComplianceIssues({ reports }: { reports: Record<string, ComplianceReport> }) {
  const allIssues = Object.values(reports)
    .flatMap((r) => r.issues)
    .filter((i) => i.severity !== "info");

  // Dedupe by code — same issue across layouts shouldn't spam
  const seen = new Set<string>();
  const unique = allIssues.filter((i) => {
    if (seen.has(i.code)) return false;
    seen.add(i.code);
    return true;
  });

  if (unique.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {unique.map((issue) => (
        <div
          key={issue.code}
          className={`text-xs px-3 py-2 rounded border ${
            issue.severity === "blocker"
              ? "border-red-500/30 bg-red-500/5 text-red-700"
              : "border-amber-500/30 bg-amber-500/5 text-amber-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{issue.title}</p>
              <p className="opacity-80 mt-0.5">{issue.description}</p>
              {issue.suggestion && (
                <p className="opacity-70 mt-1 italic flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {issue.suggestion}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

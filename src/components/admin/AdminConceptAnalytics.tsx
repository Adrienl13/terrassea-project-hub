import { useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, Flame, Target,
  TrendingUp, Layers,
} from "lucide-react";
import {
  aggregateByScoringVersion,
  fetchConceptFunnel,
  type FunnelRow,
  type ScoringVersionAggregate,
} from "@/lib/conceptTracking";
import { supabase } from "@/integrations/supabase/client";

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Concept analytics (Chantier 1 feedback loop)
// ══════════════════════════════════════════════════════════════════════════════
// Three views:
//   1. Scoring version comparison — conversion rates by SCORING_VERSION
//   2. Last 30 days funnel — rolling view of views → add-to-cart → quotes
//   3. Most-added products — which products convert, not just which score highest
// ══════════════════════════════════════════════════════════════════════════════

interface TopProduct {
  product_id: string;
  product_name: string | null;
  add_count: number;
  quote_count: number;
}

export default function AdminConceptAnalytics() {
  const [versions, setVersions] = useState<ScoringVersionAggregate[]>([]);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [v, f] = await Promise.all([
        aggregateByScoringVersion(),
        fetchConceptFunnel(500),
      ]);
      const top = await fetchTopAddedProducts();
      if (!cancelled) {
        setVersions(v);
        setFunnel(f);
        setTopProducts(top);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const generations = funnel.length;
    const views = funnel.reduce((s, r) => s + (r.views ?? 0), 0);
    const added = funnel.reduce((s, r) => s + (r.products_added ?? 0), 0);
    const quotes = funnel.reduce((s, r) => s + (r.quotes_requested ?? 0), 0);
    return { generations, views, added, quotes };
  }, [funnel]);

  const overallConv = {
    viewRate: totals.generations > 0 ? totals.views / totals.generations : 0,
    addRate: totals.views > 0 ? totals.added / totals.views : 0,
    quoteRate: totals.generations > 0 ? totals.quotes / totals.generations : 0,
  };

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Activity className="h-4 w-4 animate-pulse" />
        Chargement des données d'observation...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-1">
          Observation du moteur de concepts
        </h2>
        <p className="text-sm text-muted-foreground">
          Entonnoir de conversion, comparaison des versions de scoring, produits les plus ajoutés.
        </p>
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Layers}
          label="Générations"
          value={totals.generations.toLocaleString()}
          hint="Briefs parsés"
        />
        <KpiCard
          icon={TrendingUp}
          label="Vues concepts"
          value={totals.views.toLocaleString()}
          hint={`${(overallConv.viewRate * 100).toFixed(0)}% vues/génération`}
        />
        <KpiCard
          icon={Target}
          label="Produits ajoutés"
          value={totals.added.toLocaleString()}
          hint={`${(overallConv.addRate * 100).toFixed(0)}% de conversion panier`}
        />
        <KpiCard
          icon={Flame}
          label="Devis demandés"
          value={totals.quotes.toLocaleString()}
          hint={`${(overallConv.quoteRate * 100).toFixed(1)}% devis/génération`}
        />
      </div>

      {/* Versions comparison */}
      <section className="border border-border rounded-md overflow-hidden">
        <header className="px-4 py-3 bg-card border-b border-border flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-display font-semibold">Comparaison par version de scoring</h3>
        </header>
        {versions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Pas encore de données. La vue se remplira dès que des concepts sont générés sur la version actuelle.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-body px-4 py-2">Version</th>
                <th className="text-right font-body px-4 py-2">Générations</th>
                <th className="text-right font-body px-4 py-2">Taux de vue</th>
                <th className="text-right font-body px-4 py-2">Taux panier</th>
                <th className="text-right font-body px-4 py-2">Taux devis</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.scoring_version} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs">{v.scoring_version}</td>
                  <td className="px-4 py-2 text-right">{v.total_generations}</td>
                  <td className="px-4 py-2 text-right">{(v.view_rate * 100).toFixed(0)}%</td>
                  <td className="px-4 py-2 text-right">{(v.add_to_cart_rate * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right">{(v.quote_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent funnel */}
      <section className="border border-border rounded-md overflow-hidden">
        <header className="px-4 py-3 bg-card border-b border-border flex items-center gap-2">
          <Activity className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-display font-semibold">Dernières générations (100 max)</h3>
        </header>
        {funnel.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune génération enregistrée.</p>
        ) : (
          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left font-body px-4 py-2">Date</th>
                  <th className="text-left font-body px-4 py-2">Établissement</th>
                  <th className="text-left font-body px-4 py-2">Budget</th>
                  <th className="text-right font-body px-4 py-2">Couverts</th>
                  <th className="text-right font-body px-4 py-2">Concepts</th>
                  <th className="text-right font-body px-4 py-2">Vues</th>
                  <th className="text-right font-body px-4 py-2">Ajouts</th>
                  <th className="text-right font-body px-4 py-2">Devis</th>
                </tr>
              </thead>
              <tbody>
                {funnel.slice(0, 100).map((row) => (
                  <tr key={row.snapshot_id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(row.generated_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 capitalize">{row.establishment_type || "—"}</td>
                    <td className="px-4 py-2 capitalize">{row.budget_level || "—"}</td>
                    <td className="px-4 py-2 text-right">{row.seating_capacity ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{row.concepts_generated ?? 0}</td>
                    <td className="px-4 py-2 text-right">{row.views ?? 0}</td>
                    <td className="px-4 py-2 text-right">{row.products_added ?? 0}</td>
                    <td className="px-4 py-2 text-right">
                      {row.quotes_requested ?? 0 > 0 ? (
                        <span className="text-green-600 font-semibold">{row.quotes_requested}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top added products */}
      <section className="border border-border rounded-md overflow-hidden">
        <header className="px-4 py-3 bg-card border-b border-border flex items-center gap-2">
          <Flame className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-display font-semibold">Produits les plus ajoutés au panier</h3>
        </header>
        {topProducts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun ajout au panier enregistré.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-body px-4 py-2">Produit</th>
                <th className="text-right font-body px-4 py-2">Ajouts</th>
                <th className="text-right font-body px-4 py-2">Devis</th>
                <th className="text-right font-body px-4 py-2">Taux de conversion</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => {
                const rate = p.add_count > 0 ? (p.quote_count / p.add_count) * 100 : 0;
                return (
                  <tr key={p.product_id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{p.product_name || p.product_id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-right">{p.add_count}</td>
                    <td className="px-4 py-2 text-right">{p.quote_count}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {rate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border border-border rounded-md p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-body uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

// ── DB helper: aggregate top added products ─────────────────

async function fetchTopAddedProducts(limit = 20): Promise<TopProduct[]> {
  const { data, error } = await supabase
    .from("concept_events")
    .select("product_id, event_type")
    .in("event_type", ["product_added_to_cart", "quote_requested"])
    .not("product_id", "is", null)
    .limit(2000);
  if (error || !data) return [];

  const counts: Record<string, { adds: number; quotes: number }> = {};
  for (const row of data) {
    if (!row.product_id) continue;
    if (!counts[row.product_id]) counts[row.product_id] = { adds: 0, quotes: 0 };
    if (row.event_type === "product_added_to_cart") counts[row.product_id].adds += 1;
    if (row.event_type === "quote_requested")       counts[row.product_id].quotes += 1;
  }

  const ids = Object.keys(counts);
  if (ids.length === 0) return [];

  // Enrich with product names
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", ids);
  const nameById = new Map<string, string>();
  for (const p of products ?? []) nameById.set(p.id as string, (p.name as string) ?? "");

  return ids
    .map((id) => ({
      product_id: id,
      product_name: nameById.get(id) ?? null,
      add_count: counts[id].adds,
      quote_count: counts[id].quotes,
    }))
    .sort((a, b) => b.add_count - a.add_count)
    .slice(0, limit);
}

// Admin overview of Founding Partner cohort (Dette 108 Session 2).
//
// Liste tous les is_founding=true partners avec leur tier + total_points +
// dernière action + count actions. Filtres par tier + recherche par nom.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Crown } from "lucide-react";
import FoundingBadge from "@/components/common/FoundingBadge";
import AdminFoundingPartnerDetail from "@/components/admin/AdminFoundingPartnerDetail";
import type { FoundingTier } from "@/hooks/useFoundingScore";

type ScoreRow = {
  partner_id: string;
  partner_name: string;
  slug: string | null;
  is_founding: boolean;
  founding_joined_at: string | null;
  total_points: number | null;
  actions_count: number | null;
  tier: FoundingTier;
};

type LatestActionRow = {
  partner_id: string;
  action_type: string;
  created_at: string;
};

const TIER_FILTERS: Array<"all" | FoundingTier> = ["all", "founder", "silver", "gold", "platinum"];

export default function AdminFoundingOverview() {
  const [filterTier, setFilterTier] = useState<"all" | FoundingTier>("all");
  const [search, setSearch] = useState("");
  const [detailPartnerId, setDetailPartnerId] = useState<string | null>(null);

  const { data: scores, isLoading } = useQuery({
    queryKey: ["admin-founding-scores"],
    queryFn: async (): Promise<ScoreRow[]> => {
      const { data, error } = await supabase
        .from("founding_partner_scores")
        .select("partner_id, partner_name, slug, is_founding, founding_joined_at, total_points, actions_count, tier")
        .order("total_points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });

  const { data: latestActions } = useQuery({
    queryKey: ["admin-founding-latest-actions"],
    queryFn: async (): Promise<Map<string, LatestActionRow>> => {
      const { data, error } = await supabase
        .from("founding_actions")
        .select("partner_id, action_type, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, LatestActionRow>();
      for (const row of (data ?? []) as LatestActionRow[]) {
        if (!map.has(row.partner_id)) map.set(row.partner_id, row);
      }
      return map;
    },
  });

  const counts = useMemo(() => {
    const c = { all: 0, founder: 0, silver: 0, gold: 0, platinum: 0 } as Record<"all" | FoundingTier, number>;
    for (const s of scores ?? []) {
      c.all++;
      c[s.tier]++;
    }
    return c;
  }, [scores]);

  const filtered = useMemo(() => {
    let rows = scores ?? [];
    if (filterTier !== "all") rows = rows.filter((r) => r.tier === filterTier);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.partner_name.toLowerCase().includes(q) || (r.slug ?? "").toLowerCase().includes(q));
    }
    return rows;
  }, [scores, filterTier, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Crown className="h-5 w-5" /> Cohorte Founding Partners
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d'ensemble des marques Founding (Vague 2). Tier dérivé via somme de points selon les seuils Founder 0+ / Silver 1000+ / Gold 3000+ / Platinum 8000+.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIER_FILTERS.map((t) => (
              <Button
                key={t}
                variant={filterTier === t ? "default" : "outline"}
                onClick={() => setFilterTier(t)}
                className="justify-between"
              >
                <span className="capitalize">{t === "all" ? "Tous" : t}</span>
                <Badge variant="secondary">{counts[t]}</Badge>
              </Button>
            ))}
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par nom ou slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partners ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">Aucun partenaire ne correspond aux filtres.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => {
                const last = latestActions?.get(r.partner_id);
                return (
                  <li
                    key={r.partner_id}
                    onClick={() => setDetailPartnerId(r.partner_id)}
                    className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1 cursor-pointer hover:bg-muted/40 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="min-w-[180px]">
                      <div className="font-medium">{r.partner_name}</div>
                      {r.slug ? <div className="text-xs text-muted-foreground">{r.slug}</div> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span><strong>{(r.total_points ?? 0).toLocaleString()}</strong> pts</span>
                      <span>· {r.actions_count ?? 0} actions</span>
                      {r.founding_joined_at ? (
                        <span>· depuis {new Date(r.founding_joined_at).toLocaleDateString()}</span>
                      ) : null}
                      {last ? (
                        <span>· dernière : {last.action_type.replace(/_/g, " ")} ({new Date(last.created_at).toLocaleDateString()})</span>
                      ) : null}
                    </div>
                    <div className="ml-auto"><FoundingBadge tier={r.tier} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cliquez sur une ligne pour voir le détail. Catalogue actions + seuils stockés dans <code>platform_settings.founding_tiers_config</code>. Actions deferred (invitations, co-développement, milestones) seront activées via Dettes 110a/110b/Vague 3.
      </p>

      <AdminFoundingPartnerDetail
        partnerId={detailPartnerId}
        open={!!detailPartnerId}
        onOpenChange={(o) => { if (!o) setDetailPartnerId(null); }}
      />
    </div>
  );
}

// Modal drill-down détaillé sur un partner Founding (Day 13 finalization Lot 2).
//
// Sections :
//   1. Identité partner (logo, name, contact_email, contact_phone, country,
//      founding_joined_at, profile_status)
//   2. Score Founding (badge tier, total points, progression vers tier suivant)
//   3. Historique complet des founding_actions (chronologique DESC)

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mail, Phone, MapPin, Calendar, Loader2, Crown, Sparkles } from "lucide-react";
import FoundingBadge from "@/components/common/FoundingBadge";
import {
  useFoundingScore,
  type FoundingActionConfig,
} from "@/hooks/useFoundingScore";

interface Props {
  partnerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABEL: Record<FoundingActionConfig["category"], string> = {
  onboarding: "Onboarding",
  transaction: "Transactions",
  invitation: "Invitations",
  co_dev: "Co-développement",
  milestone: "Paliers",
};

function formatActionName(actionType: string): string {
  return actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminFoundingPartnerDetail({ partnerId, open, onOpenChange }: Props) {
  const { data: partner, isLoading: loadingPartner } = useQuery({
    queryKey: ["admin-partner-info", partnerId],
    enabled: !!partnerId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, contact_email, contact_phone, contact_name, city, country, profile_status, profile_reviewed_at, created_at, is_founding, founding_joined_at")
        .eq("id", partnerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { score, history, config, nextTier, pointsToNextTier, tierProgress } = useFoundingScore(open && partnerId ? partnerId : undefined);

  const pointsByCategory = useMemo(() => {
    if (!history || !config) return null;
    const buckets: Record<string, number> = {};
    for (const a of history) {
      const cat = config.actions[a.actionType]?.category ?? "other";
      buckets[cat] = (buckets[cat] ?? 0) + a.points;
    }
    return buckets;
  }, [history, config]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            {partner?.name ?? "Founding Partner"}
          </DialogTitle>
        </DialogHeader>

        {loadingPartner ? (
          <div className="py-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
        ) : !partner ? (
          <p className="py-6 text-sm text-muted-foreground">Partner introuvable.</p>
        ) : (
          <div className="space-y-5">
            {/* Section 1 — Identité */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
                    ) : (
                      <Crown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{partner.name}</div>
                    {partner.slug ? <div className="text-xs text-muted-foreground">{partner.slug}</div> : null}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {partner.is_founding ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Founding</Badge> : null}
                      {partner.profile_status ? <Badge variant="outline" className="text-[10px] capitalize">{partner.profile_status}</Badge> : null}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {partner.contact_email ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {partner.contact_email}</div>
                  ) : null}
                  {partner.contact_phone ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {partner.contact_phone}</div>
                  ) : null}
                  {(partner.city || partner.country) ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {[partner.city, partner.country].filter(Boolean).join(", ")}</div>
                  ) : null}
                  {partner.founding_joined_at ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Founding depuis {new Date(partner.founding_joined_at).toLocaleDateString()}</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Section 2 — Score Founding */}
            {score ? (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <FoundingBadge tier={score.tier} />
                    <div>
                      <span className="text-2xl font-bold tabular-nums">{score.totalPoints.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2">pts cumulés</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-auto">
                      {score.actionsCount} action{score.actionsCount > 1 ? "s" : ""}
                    </div>
                  </div>
                  {nextTier && pointsToNextTier !== null ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Vers <strong className="capitalize">{nextTier}</strong></span>
                        <span>{pointsToNextTier.toLocaleString()} pts restants</span>
                      </div>
                      <Progress value={tierProgress} className="h-1.5" />
                    </div>
                  ) : null}

                  {/* Décomposition par catégorie */}
                  {pointsByCategory ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
                      {Object.entries(pointsByCategory).map(([cat, pts]) => (
                        <div key={cat} className="text-xs">
                          <div className="text-muted-foreground">{CATEGORY_LABEL[cat as FoundingActionConfig["category"]] ?? cat}</div>
                          <div className="font-semibold">{pts.toLocaleString()} pts</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun score Founding (le partner n'a pas encore d'action enregistrée).</p>
            )}

            {/* Section 3 — Historique complet */}
            <Card>
              <CardContent className="pt-6">
                <div className="font-medium text-sm mb-3 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Historique complet</div>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
                ) : (
                  <ul className="divide-y">
                    {history.map((h) => (
                      <li key={h.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium">{formatActionName(h.actionType)}</span>
                        {h.referenceId ? (
                          <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{h.referenceId}</code>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}</span>
                        <Badge variant="secondary" className="ml-auto">+{h.points} pts</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Révocation manuelle d'une action suspecte = Dette 113 (admin tooling, non implémenté MVP).
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

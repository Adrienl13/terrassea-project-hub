// Founding Program section for partner dashboard (Dette 108 Session 2).
//
// Affiche :
//   - Tier courant + badge + points + progression vers tier suivant
//   - Historique des actions (founding_actions)
//   - Catalogue (founding_tiers_config) avec statut active / deferred

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sparkles, TrendingUp, Loader2, AlertCircle,
  FileText, ShoppingCart, UserCheck, Package, Users, MessageSquare, Award,
} from "lucide-react";
import FoundingBadge from "@/components/common/FoundingBadge";
import {
  useFoundingScore,
  FOUNDING_TIER_ORDER,
  type FoundingTier,
  type FoundingActionConfig,
} from "@/hooks/useFoundingScore";

const TIER_LABEL: Record<FoundingTier, string> = {
  founder: "Founder",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const ACTION_ICONS: Record<string, typeof Sparkles> = {
  profile_completed: UserCheck,
  cgv_uploaded: FileText,
  first_5_products: Package,
  first_order_received: ShoppingCart,
  partner_invited_signup: Users,
  partner_invited_approved: Users,
  architect_invited_signup: Users,
  architect_invited_active: Users,
  client_invited_signup: Users,
  client_invited_first_order: Users,
  feedback_submitted: MessageSquare,
  feedback_adopted: MessageSquare,
  suggestion_implemented: Sparkles,
  ten_orders_milestone: Award,
  fifty_orders_milestone: Award,
};

const CATEGORY_LABEL: Record<FoundingActionConfig["category"], string> = {
  onboarding: "Onboarding",
  transaction: "Transactions",
  invitation: "Invitations",
  co_dev: "Co-développement",
  milestone: "Paliers",
};

function formatActionName(actionType: string): string {
  return actionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FoundingProgramSection({ partnerId }: { partnerId: string }) {
  const { score, history, config, nextTier, pointsToNextTier, tierProgress, isLoading } = useFoundingScore(partnerId);

  const actionsByCategory = useMemo(() => {
    if (!config) return [];
    const groups: Array<{ category: FoundingActionConfig["category"]; actions: Array<[string, FoundingActionConfig]> }> = [];
    const order: Array<FoundingActionConfig["category"]> = ["onboarding", "transaction", "invitation", "co_dev", "milestone"];
    for (const cat of order) {
      const entries = Object.entries(config.actions).filter(([, c]) => c.category === cat);
      if (entries.length) groups.push({ category: cat, actions: entries });
    }
    return groups;
  }, [config]);

  if (isLoading) {
    return <Card><CardContent className="py-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</CardContent></Card>;
  }

  if (!score || !score.isFounding) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Programme Founding non actif</AlertTitle>
        <AlertDescription>
          Votre compte n'est pas (encore) marqué Founding. Les marques onboardées pendant la fenêtre de lancement Vague 1 sont éligibles automatiquement. Contactez-nous si cela vous semble incorrect.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Programme Founding Partner</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vous êtes Founding Partner depuis {score.foundingJoinedAt ? new Date(score.foundingJoinedAt).toLocaleDateString() : "—"}. Le programme récompense votre engagement à co-développer la plateforme.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <span>Votre statut</span>
            <FoundingBadge tier={score.tier} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="text-3xl font-bold tabular-nums">{score.totalPoints.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground ml-2">points cumulés</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {score.actionsCount} action{score.actionsCount > 1 ? "s" : ""} enregistrée{score.actionsCount > 1 ? "s" : ""}
            </div>
          </div>

          {nextTier && pointsToNextTier !== null ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vers {TIER_LABEL[nextTier]}</span>
                <span className="font-medium">{pointsToNextTier.toLocaleString()} pts restants</span>
              </div>
              <Progress value={tierProgress} className="h-2" />
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {tierProgress}% du palier suivant
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              🎉 Vous avez atteint le tier maximum Platinum Founder. Merci pour votre engagement exceptionnel.
            </p>
          )}
        </CardContent>
      </Card>

      {config ? (
        <Card>
          <CardHeader>
            <CardTitle>Tiers et seuils</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FOUNDING_TIER_ORDER.map((t) => {
                const threshold = config.thresholds[t] ?? 0;
                const reached = score.totalPoints >= threshold;
                return (
                  <div
                    key={t}
                    className={`rounded-md border p-3 ${reached ? "bg-muted/50 border-muted-foreground/40" : "border-border"}`}
                  >
                    <FoundingBadge tier={t} size="sm" />
                    <div className="mt-2 text-xs text-muted-foreground">
                      {threshold === 0 ? "Statut historique" : `Dès ${threshold.toLocaleString()} pts`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {config && actionsByCategory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Comment gagner des points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              💡 Les actions marquées <span className="font-medium">♾️ Accumulable</span> peuvent être réalisées plusieurs fois — chaque répétition donne les points correspondants. Les invitations approuvées amplifient aussi la visibilité de vos produits dans le réseau.
            </p>
            {actionsByCategory.map(({ category, actions }) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-2">{CATEGORY_LABEL[category]}</h3>
                <ul className="space-y-1.5">
                  {actions.map(([actionType, c]) => {
                    const Icon = ACTION_ICONS[actionType] ?? Sparkles;
                    const accumulable = !c.one_shot;
                    return (
                      <li key={actionType} className="flex flex-wrap items-center gap-2 text-sm">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{formatActionName(actionType)}</span>
                        <Badge variant="secondary" className="text-[10px]">+{c.points} pts{accumulable ? " / occurrence" : ""}</Badge>
                        {accumulable ? (
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                            ♾️ Accumulable
                          </Badge>
                        ) : null}
                        {!c.active ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Bientôt
                          </Badge>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Historique de mes actions</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action enregistrée pour le moment. Les premières arrivent en complétant votre profil et en téléversant vos CGV.</p>
          ) : (
            <ul className="divide-y">
              {history.map((h) => {
                const Icon = ACTION_ICONS[h.actionType] ?? Sparkles;
                return (
                  <li key={h.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{formatActionName(h.actionType)}</span>
                    <span className="text-muted-foreground text-xs">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                    </span>
                    <Badge variant="secondary" className="ml-auto">+{h.points} pts</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

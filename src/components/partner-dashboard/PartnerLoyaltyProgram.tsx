import { useTranslation } from "react-i18next";
import {
  Sparkles, Zap, Crown, Gem, Check, X, TrendingUp,
  FileText, ShoppingCart, Star, UserCheck, Gift,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  usePartnerLoyalty,
  usePartnerTierConfig,
  TIER_CONFIG,
  type PartnerTier,
} from "@/hooks/usePartnerAnalytics";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  partnerId: string;
}

// ── Tier visual helpers ────────────────────────────────────────────────────────

const TIER_ICONS: Record<PartnerTier, typeof Zap> = {
  growth: Zap,
  elite: Crown,
  elite_prestige: Gem,
};

const TIER_GRADIENT: Record<PartnerTier, string> = {
  growth: "from-blue-500 to-blue-600",
  elite: "from-amber-500 to-amber-600",
  elite_prestige: "from-purple-500 to-violet-600",
};

const TIER_BG: Record<PartnerTier, string> = {
  growth: "bg-blue-50 border-blue-200",
  elite: "bg-amber-50 border-amber-200",
  elite_prestige: "bg-purple-50 border-purple-200",
};

const TIER_TEXT: Record<PartnerTier, string> = {
  growth: "text-blue-700",
  elite: "text-amber-700",
  elite_prestige: "text-purple-700",
};

const TIER_RING: Record<PartnerTier, string> = {
  growth: "ring-blue-300",
  elite: "ring-amber-300",
  elite_prestige: "ring-purple-300",
};

// ── Action icon map ────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, typeof Zap> = {
  quote_sent: FileText,
  order_confirmed: ShoppingCart,
  five_star_review: Star,
  profile_complete: UserCheck,
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function PartnerLoyaltyProgram({ partnerId }: Props) {
  const { t } = useTranslation();
  const {
    loyalty,
    history,
    isEnabled,
    currentTier,
    nextTier,
    pointsToNextTier,
    tierProgress,
    isLoading,
  } = usePartnerLoyalty(partnerId);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ── Disabled state ─────────────────────────────────────────────────────────

  if (!isEnabled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/40 px-6 py-5">
        <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-sm text-muted-foreground">
          {t("partnerLoyalty.comingSoon")}
        </p>
      </div>
    );
  }

  const { isEligibleForUpgrade, eligibleTier, subscriptionPlan } = usePartnerTierConfig(partnerId);

  const points = loyalty?.pointsBalance ?? 0;
  const lifetimePoints = loyalty?.lifetimePoints ?? 0;
  const TierIcon = TIER_ICONS[currentTier];
  const tierConfig = TIER_CONFIG[currentTier];
  const nextTierConfig = nextTier ? TIER_CONFIG[nextTier] : null;

  const TIER_KEYS: PartnerTier[] = ["growth", "elite", "elite_prestige"];

  const FEATURES: {
    key: string;
    field: keyof typeof TIER_CONFIG.growth;
    type: "value" | "boolean";
  }[] = [
    { key: "commission", field: "commission", type: "value" },
    { key: "maxProducts", field: "maxProducts", type: "value" },
    { key: "featuredProducts", field: "featuredProducts", type: "value" },
    { key: "advancedAnalytics", field: "hasAdvancedAnalytics", type: "boolean" },
    { key: "proLeads", field: "hasProLeads", type: "boolean" },
    { key: "csvExport", field: "hasCsvExport", type: "boolean" },
    { key: "prioritySupport", field: "hasPrioritySupport", type: "boolean" },
    { key: "dedicatedManager", field: "hasDedicatedManager", type: "boolean" },
    { key: "coBranding", field: "hasCoBranding", type: "boolean" },
  ];

  const EARN_ACTIONS = [
    { key: "sendQuotes", icon: FileText, points: 10, suffix: "perQuote" },
    { key: "confirmOrders", icon: ShoppingCart, points: 100, suffix: "perOrder" },
    { key: "getReviews", icon: Star, points: 50, suffix: "perReview" },
    { key: "completeProfile", icon: UserCheck, points: 200, suffix: "oneTime" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Tier card ─────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div
          className={`bg-gradient-to-r ${TIER_GRADIENT[currentTier]} px-6 py-5 text-white`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`rounded-full bg-white/20 p-1.5 ring-2 ring-white/30`}>
                  <TierIcon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                  {t(`partnerLoyalty.tier.${currentTier}`)}
                </span>
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {points.toLocaleString()}{" "}
                <span className="text-base font-medium opacity-80">
                  {t("partnerLoyalty.points")}
                </span>
              </p>
              <p className="text-xs opacity-70">
                {t("partnerLoyalty.lifetimePoints", {
                  count: lifetimePoints.toLocaleString(),
                })}
              </p>
            </div>
            <Gift className="h-10 w-10 opacity-20" />
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Progress bar */}
          {nextTier && pointsToNextTier !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  {t("partnerLoyalty.progressLabel", {
                    points: pointsToNextTier.toLocaleString(),
                    tier: t(`partnerLoyalty.tier.${nextTier}`),
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tierProgress}%
                </span>
              </div>
              <Progress value={tierProgress} className="h-2.5" />
            </div>
          )}

          {/* Next tier preview */}
          {nextTierConfig && nextTier && (
            <div
              className={`flex items-center gap-3 rounded-lg border p-3 ${TIER_BG[nextTier]}`}
            >
              <div
                className={`flex items-center justify-center rounded-full p-1.5 ${TIER_TEXT[nextTier]}`}
              >
                {(() => {
                  const NextIcon = TIER_ICONS[nextTier];
                  return <NextIcon className="h-4 w-4" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${TIER_TEXT[nextTier]}`}>
                  {t("partnerLoyalty.unlockNext", {
                    tier: t(`partnerLoyalty.tier.${nextTier}`),
                  })}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t(`partnerLoyalty.tierTeaser.${nextTier}`)}
                </p>
              </div>
              <TrendingUp className={`h-4 w-4 shrink-0 ${TIER_TEXT[nextTier]}`} />
            </div>
          )}

          {/* Already at top tier */}
          {!nextTier && (
            <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <Gem className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-medium text-purple-700">
                {t("partnerLoyalty.topTier")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Upgrade eligibility banner ────────────────────────────────── */}
      {isEligibleForUpgrade && eligibleTier && (
        <Card className={`border-2 ${TIER_BG[eligibleTier]}`}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${TIER_GRADIENT[eligibleTier]} flex items-center justify-center shrink-0`}>
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className={`font-display font-bold text-sm ${TIER_TEXT[eligibleTier]}`}>
                {t("partnerLoyalty.eligibleForUpgrade", { tier: TIER_CONFIG[eligibleTier].name })}
              </p>
              <p className="text-xs font-body text-muted-foreground mt-0.5">
                {t("partnerLoyalty.eligibleDescription")}
              </p>
            </div>
            <a
              href="mailto:partners@terrassea.com?subject=Tier%20Upgrade%20Request"
              className={`shrink-0 px-4 py-2 rounded-full font-display font-semibold text-xs text-white bg-gradient-to-r ${TIER_GRADIENT[eligibleTier]} hover:opacity-90 transition-opacity`}
            >
              {t("partnerLoyalty.requestUpgrade")}
            </a>
          </CardContent>
        </Card>
      )}

      {/* ── Tier comparison table ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("partnerLoyalty.tierComparison")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 w-[180px]">
                    {t("partnerLoyalty.feature")}
                  </TableHead>
                  {TIER_KEYS.map((tier) => {
                    const Icon = TIER_ICONS[tier];
                    const isCurrent = tier === currentTier;
                    return (
                      <TableHead
                        key={tier}
                        className={`text-center ${isCurrent ? `font-bold ${TIER_TEXT[tier]}` : ""}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{t(`partnerLoyalty.tier.${tier}`)}</span>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="ml-1 text-[9px] px-1.5 py-0"
                            >
                              {t("partnerLoyalty.currentBadge")}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {FEATURES.map((feat) => (
                  <TableRow key={feat.key}>
                    <TableCell className="pl-5 font-medium text-sm">
                      {t(`partnerLoyalty.features.${feat.key}`)}
                    </TableCell>
                    {TIER_KEYS.map((tier) => {
                      const cfg = TIER_CONFIG[tier];
                      const isCurrent = tier === currentTier;
                      const val = cfg[feat.field];

                      let display: React.ReactNode;
                      if (feat.type === "boolean") {
                        display = val ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        );
                      } else if (feat.key === "commission") {
                        display = `${val}%`;
                      } else if (feat.key === "maxProducts") {
                        display =
                          val === null
                            ? t("partnerLoyalty.unlimited")
                            : String(val);
                      } else {
                        display = String(val);
                      }

                      return (
                        <TableCell
                          key={tier}
                          className={`text-center text-sm ${
                            isCurrent
                              ? `font-semibold ${TIER_TEXT[tier]}`
                              : "text-muted-foreground"
                          }`}
                        >
                          {display}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Points activity ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("partnerLoyalty.recentActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("partnerLoyalty.noActivity")}
            </p>
          ) : (
            <div className="space-y-1">
              {history.slice(0, 10).map((entry) => {
                const ActionIcon = ACTION_ICONS[entry.action] ?? Sparkles;
                const isPositive = entry.points > 0;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center rounded-full bg-muted p-2 shrink-0">
                      <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.description ?? t(`partnerLoyalty.actions.${entry.action}`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isPositive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {entry.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── How to earn points ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("partnerLoyalty.howToEarn")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EARN_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.key}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-muted/60 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-center rounded-full bg-primary/10 p-2.5 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {t(`partnerLoyalty.earn.${action.key}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      +{action.points} {t("partnerLoyalty.points")} /{" "}
                      {t(`partnerLoyalty.earn.${action.suffix}`)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 font-bold text-green-700 bg-green-100"
                  >
                    +{action.points}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

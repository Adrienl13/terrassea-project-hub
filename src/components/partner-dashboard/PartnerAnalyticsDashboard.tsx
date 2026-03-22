import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Eye,
  FileText,
  TrendingUp,
  TrendingDown,
  Target,
  Lock,
  Download,
  Crown,
  ArrowUpRight,
  MapPin,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePartnerAnalytics,
  usePartnerTierConfig,
  TIER_CONFIG,
  type PartnerTier,
} from "@/hooks/usePartnerAnalytics";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  partnerId: string;
  tier: "starter" | "growth" | "elite" | "elite_pro";
}

// ── Period mapping ─────────────────────────────────────────────────────────────

const PERIOD_MAP = {
  "30d": 30,
  "90d": 90,
  "1y": 365,
} as const;

type PeriodKey = keyof typeof PERIOD_MAP;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

function formatTrend(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-[9px] text-muted-foreground">--</span>;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[9px] font-semibold"
      style={{ color: isPositive ? "#059669" : "#DC2626" }}
    >
      <Icon className="h-3 w-3" />
      {formatTrend(value)}
    </span>
  );
}

function SparkDots({ trend }: { trend: number }) {
  const dots = useMemo(() => {
    const base = 3;
    const values = Array.from({ length: 7 }, (_, i) => {
      const factor = 1 + (trend / 100) * ((i - 3) / 3);
      return Math.max(1, Math.round(base * factor));
    });
    const max = Math.max(...values);
    return values.map((v) => Math.round((v / max) * 100));
  }, [trend]);

  return (
    <div className="flex items-end gap-px h-4 mt-1">
      {dots.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-foreground/15"
          style={{ height: `${Math.max(15, h)}%` }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PartnerAnalyticsDashboard({ partnerId, tier }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30d");

  const { analytics, trends, topProducts, isLoading, period, setPeriod } =
    usePartnerAnalytics(partnerId);
  const { config: tierConfig } = usePartnerTierConfig(partnerId);

  // Sync period
  const handlePeriodChange = useCallback(
    (key: string) => {
      const k = key as PeriodKey;
      setPeriodKey(k);
      setPeriod(PERIOD_MAP[k]);
    },
    [setPeriod]
  );

  const tierCfg = TIER_CONFIG[tier];
  const hasAdvanced = tierCfg.hasAdvancedAnalytics;
  const hasPrestige = tier === "elite_pro";
  const hasCsvExport = tierCfg.hasCsvExport;

  // Commission calculations
  const commissionRate = tierCfg.commission;
  const thisMonthRevenue = analytics?.totalRevenue ?? 0;
  const thisMonthCommission = Math.round(thisMonthRevenue * (commissionRate / 100));
  const monthlyTarget = tier === "elite_pro" ? 5000 : tier === "elite" ? 2000 : tier === "growth" ? 500 : 200;
  const commissionProgress = monthlyTarget > 0 ? Math.min(100, Math.round((thisMonthCommission / monthlyTarget) * 100)) : 0;

  // CSV Export
  const handleCsvExport = useCallback(() => {
    if (!analytics || !topProducts) return;

    const rows: string[][] = [
      ["Metric", "Value", "Trend (%)"],
      ["Views", String(analytics.totalViews), String(trends?.views ?? 0)],
      ["Quote Requests", String(analytics.totalQuotes), String(trends?.quotes ?? 0)],
      ["Revenue (EUR)", String(analytics.totalRevenue), String(trends?.revenue ?? 0)],
      ["Conversion Rate (%)", String(analytics.avgConversionRate), String(trends?.conversionRate ?? 0)],
      ["Avg Response Time (h)", String(analytics.avgResponseTime), String(trends?.responseTime ?? 0)],
      [],
      ["Top Product", "Quotes"],
      ...topProducts.map((p) => [p.productName, String(p.quoteCount)]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `partner-analytics-${periodKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [analytics, topProducts, trends, periodKey]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded-sm" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Period selector ───────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-bold text-sm text-foreground">
          {t("partnerAnalytics.title")}
        </h2>
        <div className="flex items-center gap-3">
          {hasCsvExport && (
            <button
              onClick={handleCsvExport}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
            >
              <Download className="h-3 w-3" />
              {t("partnerAnalytics.exportCsv")}
            </button>
          )}
          <Tabs value={periodKey} onValueChange={handlePeriodChange}>
            <TabsList className="h-8">
              <TabsTrigger value="30d" className="text-[10px] px-3 h-6">
                {t("partnerAnalytics.period30d")}
              </TabsTrigger>
              <TabsTrigger value="90d" className="text-[10px] px-3 h-6">
                {t("partnerAnalytics.period90d")}
              </TabsTrigger>
              <TabsTrigger value="1y" className="text-[10px] px-3 h-6">
                {t("partnerAnalytics.period1y")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Eye}
          label={t("partnerAnalytics.views")}
          value={String(analytics?.totalViews ?? 0)}
          trend={trends?.views ?? 0}
        />
        <KpiCard
          icon={FileText}
          label={t("partnerAnalytics.quoteRequests")}
          value={String(analytics?.totalQuotes ?? 0)}
          trend={trends?.quotes ?? 0}
        />
        <KpiCard
          icon={TrendingUp}
          label={t("partnerAnalytics.revenue")}
          value={`\u20AC${formatCurrency(analytics?.totalRevenue ?? 0)}`}
          trend={trends?.revenue ?? 0}
        />
        <KpiCard
          icon={Target}
          label={t("partnerAnalytics.conversionRate")}
          value={`${analytics?.avgConversionRate ?? 0}%`}
          trend={trends?.conversionRate ?? 0}
        />
      </div>

      {/* ── Commission Tracker ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-display font-semibold flex items-center gap-2">
            {t("partnerAnalytics.commissionTracking")}
            <span
              className="text-[9px] font-display font-bold px-2 py-0.5 rounded-full"
              style={{
                background: tier === "elite_pro" ? "#F5F3FF" : tier === "elite" ? "#FFFBEB" : "#EFF6FF",
                color: tier === "elite_pro" ? "#7C3AED" : tier === "elite" ? "#D97706" : "#2563EB",
              }}
            >
              {commissionRate}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border border-border rounded-sm divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-body text-muted-foreground">
                {t("partnerAnalytics.thisMonth")}
              </span>
              <span className="text-xs font-display font-semibold text-foreground">
                {"\u20AC"}{thisMonthCommission.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-body text-muted-foreground">
                {t("partnerAnalytics.lastMonth")}
              </span>
              <span className="text-xs font-display font-semibold text-foreground">
                {"\u20AC"}--
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10px] font-body text-muted-foreground">
                {t("partnerAnalytics.allTime")}
              </span>
              <span className="text-xs font-display font-semibold text-foreground">
                {"\u20AC"}{Math.round((analytics?.totalRevenue ?? 0) * (commissionRate / 100)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress bar toward monthly target */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground">
                {t("partnerAnalytics.monthlyTarget")}
              </span>
              <span className="text-[9px] font-semibold text-foreground">
                {"\u20AC"}{monthlyTarget.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${commissionProgress}%`,
                  background: commissionProgress >= 100 ? "#059669" : tier === "elite_pro" ? "#7C3AED" : tier === "elite" ? "#D97706" : "#2563EB",
                }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 text-right">{commissionProgress}%</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Advanced Analytics (tier-gated) ────────────────────────────────── */}
      <div className="relative">
        {!hasAdvanced && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-16 bg-gradient-to-b from-background/80 to-background/95 rounded-sm">
            <div className="text-center max-w-sm">
              <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="font-display font-bold text-sm text-foreground mb-1">
                {t("partnerAnalytics.advancedLocked")}
              </p>
              <p className="text-[10px] font-body text-muted-foreground mb-3 leading-relaxed">
                {t("partnerAnalytics.advancedLockedDesc")}
              </p>
              <button onClick={() => navigate("/become-partner")} className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold rounded-full text-white bg-amber-600 hover:bg-amber-700 transition-colors mx-auto">
                <Crown className="h-3 w-3" />
                {t("partnerAnalytics.upgradeToElite")}
              </button>
            </div>
          </div>
        )}

        <div className={!hasAdvanced ? "opacity-30 pointer-events-none select-none" : ""}>
          <div className="space-y-4">
            {/* Response Time */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-display font-semibold">
                  {t("partnerAnalytics.responseTime")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display font-bold text-2xl text-foreground">
                    {analytics?.avgResponseTime ?? 0}h
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t("partnerAnalytics.avgResponseLabel")}
                  </span>
                </div>
                <ResponseTimeChart />
              </CardContent>
            </Card>

            {/* Top 5 Products */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-display font-semibold">
                  {t("partnerAnalytics.topProducts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-4 text-center">
                    {t("partnerAnalytics.noData")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left font-display font-semibold text-muted-foreground py-2 pr-4">
                            {t("partnerAnalytics.productName")}
                          </th>
                          <th className="text-right font-display font-semibold text-muted-foreground py-2 px-2">
                            {t("partnerAnalytics.quotes")}
                          </th>
                          <th className="text-right font-display font-semibold text-muted-foreground py-2 pl-2">
                            {t("partnerAnalytics.productRevenue")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4 font-body text-foreground truncate max-w-[200px]">
                              {p.productName}
                            </td>
                            <td className="py-2 px-2 text-right text-muted-foreground">
                              {p.quoteCount}
                            </td>
                            <td className="py-2 pl-2 text-right font-semibold text-foreground">
                              --
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Retention + Sector Benchmark */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-display font-semibold">
                    {t("partnerAnalytics.clientRetention")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="font-display font-bold text-2xl text-foreground">--</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("partnerAnalytics.repeatClients")}
                      </p>
                    </div>
                    <div>
                      <p className="font-display font-bold text-2xl text-foreground">--%</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("partnerAnalytics.retentionRate")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-display font-semibold">
                    {t("partnerAnalytics.sectorBenchmark")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <BenchmarkBar
                      label={t("partnerAnalytics.yourConversion")}
                      value={analytics?.avgConversionRate ?? 0}
                      color="#2563EB"
                    />
                    <BenchmarkBar
                      label={t("partnerAnalytics.sectorAverage")}
                      value={22}
                      color="#D1D5DB"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Elite Prestige Extras ──────────────────────────────────────────── */}
      {hasPrestige && (
        <div className="space-y-4">
          {/* Geographic Heatmap Placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-display font-semibold flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-purple-600" />
                {t("partnerAnalytics.demandByRegion")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {["France", "Spain", "Italy", "Portugal", "Greece"].map((country, i) => {
                  const widths = [80, 55, 40, 25, 15];
                  return (
                    <div key={country} className="flex items-center gap-3">
                      <span className="text-[10px] font-body text-foreground w-20 shrink-0">
                        {country}
                      </span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${widths[i]}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Forecast */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-display font-semibold">
                {t("partnerAnalytics.revenueForecast")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 9 }).map((_, i) => {
                  const isProjected = i >= 6;
                  const height = 20 + Math.random() * 60 + i * 5;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isProjected
                            ? "bg-purple-300 border border-dashed border-purple-400"
                            : "bg-purple-500"
                        }`}
                        style={{ height: `${Math.min(100, height)}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground">
                        {isProjected ? "P" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2 text-center">
                {t("partnerAnalytics.forecastNote")}
              </p>
            </CardContent>
          </Card>

          {/* Dedicated Account Manager */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-display font-semibold flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-purple-600" />
                {t("partnerAnalytics.accountManager")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-3 border border-purple-200 rounded-sm bg-purple-50/50">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-xs text-foreground">
                    Sophie Martin
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("partnerAnalytics.dedicatedManager")}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Mail className="h-3 w-3" /> sophie.martin@terrassea.com
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Phone className="h-3 w-3" /> +33 1 42 00 00 00
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: number;
}) {
  return (
    <div className="border border-border rounded-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <TrendIndicator value={trend} />
      </div>
      <p className="font-display font-bold text-lg text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-0.5">{label}</p>
      <SparkDots trend={trend} />
    </div>
  );
}

// ── Response Time Chart (CSS bars by day of week) ──────────────────────────────

function ResponseTimeChart() {
  const { t } = useTranslation();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayLabels = [
    t("partnerAnalytics.dayMon"),
    t("partnerAnalytics.dayTue"),
    t("partnerAnalytics.dayWed"),
    t("partnerAnalytics.dayThu"),
    t("partnerAnalytics.dayFri"),
    t("partnerAnalytics.daySat"),
    t("partnerAnalytics.daySun"),
  ];
  // Placeholder values until wired to real per-day data
  const values = [4.2, 3.8, 5.1, 3.5, 6.2, 8.0, 7.5];
  const max = Math.max(...values);

  return (
    <div className="flex items-end gap-2 h-20">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[8px] text-muted-foreground">{v}h</span>
          <div
            className="w-full rounded-t-sm bg-blue-500/80"
            style={{ height: `${max > 0 ? (v / max) * 100 : 0}%` }}
          />
          <span className="text-[8px] text-muted-foreground">{dayLabels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Benchmark Bar ──────────────────────────────────────────────────────────────

function BenchmarkBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-body text-muted-foreground">{label}</span>
        <span className="text-[10px] font-display font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}

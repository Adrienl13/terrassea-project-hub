import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, Crown, Gem, ToggleLeft, ToggleRight, BarChart3,
  FileText, Eye, ShoppingCart, Package, TrendingUp, TrendingDown,
  Download, Calendar, ChevronDown, ChevronUp, Building2,
  Globe, Users, Inbox, Layers, Zap, Settings2, FolderOpen,
  ArrowRight, Activity, Percent, MapPin,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

type BrandTab = "overview" | "parameters" | "activity" | "export";

interface BrandFeatures {
  brand_page_enabled: boolean;
  brief_inbox_enabled: boolean;
  collection_manager_enabled: boolean;
  network_dashboard_enabled: boolean;
  api_sync_enabled: boolean;
  featured_products_enabled: boolean;
  analytics_export_enabled: boolean;
}

const DEFAULT_FEATURES: BrandFeatures = {
  brand_page_enabled: true,
  brief_inbox_enabled: true,
  collection_manager_enabled: true,
  network_dashboard_enabled: true,
  api_sync_enabled: false,
  featured_products_enabled: false,
  analytics_export_enabled: false,
};

const FEATURE_META: { key: keyof BrandFeatures; label: string; description: string; icon: any; networkOnly?: boolean }[] = [
  { key: "brand_page_enabled",         label: "Page marque publique",        description: "Page dédiée visible sur le catalogue",         icon: Globe },
  { key: "brief_inbox_enabled",        label: "Réception de briefs",         description: "Recevoir des demandes de projets qualifiées",  icon: Inbox },
  { key: "collection_manager_enabled", label: "Gestion des collections",     description: "Créer et organiser des collections produits",   icon: Layers },
  { key: "network_dashboard_enabled",  label: "Dashboard réseau",            description: "Gestion des distributeurs et routage",          icon: Users, networkOnly: true },
  { key: "api_sync_enabled",           label: "Synchronisation API stock",   description: "Sync automatique ERP → catalogue",              icon: Zap },
  { key: "featured_products_enabled",  label: "Produits mis en avant",       description: "Boost de visibilité sur les produits phares",   icon: TrendingUp },
  { key: "analytics_export_enabled",   label: "Export analytics",            description: "Téléchargement de rapports CSV/PDF",            icon: Download },
];

const PERIOD_OPTIONS = [
  { value: 30,  label: "30 jours" },
  { value: 90,  label: "90 jours" },
  { value: 365, label: "12 mois" },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AdminBrandManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<BrandTab>("overview");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(30);

  // ── Fetch all brand partners ──────────────────────────────
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, company_name, logo_url, plan, partner_mode, brand_features, is_active, country, created_at")
        .in("plan", ["brand_member", "brand_network"])
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredBrands = useMemo(() => {
    if (!search) return brands;
    const q = search.toLowerCase();
    return brands.filter(b => b.company_name?.toLowerCase().includes(q));
  }, [brands, search]);

  const selectedBrand = brands.find(b => b.id === selectedBrandId) ?? null;

  // Auto-select first brand if none selected
  if (!selectedBrandId && brands.length > 0 && !brandsLoading) {
    setSelectedBrandId(brands[0].id);
  }

  // ── Fetch analytics for selected brand ────────────────────
  const periodStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d.toISOString().split("T")[0];
  }, [period]);

  const prevPeriodStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - period * 2);
    return d.toISOString().split("T")[0];
  }, [period]);

  const { data: analytics } = useQuery({
    queryKey: ["admin-brand-analytics", selectedBrandId, period],
    queryFn: async () => {
      if (!selectedBrandId) return null;
      const { data, error } = await supabase
        .from("partner_analytics")
        .select("*")
        .eq("partner_id", selectedBrandId)
        .gte("period_date", periodStart)
        .order("period_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  const { data: prevAnalytics } = useQuery({
    queryKey: ["admin-brand-analytics-prev", selectedBrandId, period],
    queryFn: async () => {
      if (!selectedBrandId) return null;
      const { data, error } = await supabase
        .from("partner_analytics")
        .select("*")
        .eq("partner_id", selectedBrandId)
        .gte("period_date", prevPeriodStart)
        .lt("period_date", periodStart);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  const { data: briefs = [] } = useQuery({
    queryKey: ["admin-brand-briefs", selectedBrandId],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from("project_briefs")
        .select("*")
        .eq("brand_partner_id", selectedBrandId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["admin-brand-offers", selectedBrandId],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from("product_offers")
        .select("id, collection_name, product_id, is_active, price, stock_status, product:product_id(name, category, image_url)")
        .eq("partner_id", selectedBrandId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  const { data: distributors = [] } = useQuery({
    queryKey: ["admin-brand-distributors", selectedBrandId],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from("brand_distributors")
        .select("id, country_code, is_exclusive, is_active, priority, distributor:distributor_id(id, company_name, country, logo_url)")
        .eq("brand_id", selectedBrandId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId && selectedBrand?.plan === "brand_network",
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-brand-orders", selectedBrandId, periodStart],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, commission_amount, status, quantity, product_name, created_at")
        .eq("partner_id", selectedBrandId)
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  const { data: quoteRequests = [] } = useQuery({
    queryKey: ["admin-brand-quotes", selectedBrandId, periodStart],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, status, quantity, total_price, product_id, created_at, company, client_city")
        .eq("partner_id", selectedBrandId)
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrandId,
  });

  // ── Computed metrics ──────────────────────────────────────
  const metrics = useMemo(() => {
    const a = analytics || [];
    const pa = prevAnalytics || [];
    const totalViews = a.reduce((s, r) => s + (r.views || 0), 0);
    const totalQuoteReqs = a.reduce((s, r) => s + (r.quote_requests || 0), 0);
    const totalOrders = a.reduce((s, r) => s + (r.orders_count || 0), 0);
    const totalRevenue = a.reduce((s, r) => s + (r.orders_value || 0), 0);
    const totalCommission = a.reduce((s, r) => s + (r.commission_amount || 0), 0);
    const avgConversion = a.length > 0 ? a.reduce((s, r) => s + (r.conversion_rate || 0), 0) / a.length : 0;
    const avgResponse = a.length > 0 ? a.reduce((s, r) => s + (r.avg_response_hours || 0), 0) / a.length : 0;

    const prevViews = pa.reduce((s, r) => s + (r.views || 0), 0);
    const prevRevenue = pa.reduce((s, r) => s + (r.orders_value || 0), 0);
    const prevQuoteReqs = pa.reduce((s, r) => s + (r.quote_requests || 0), 0);
    const prevOrders = pa.reduce((s, r) => s + (r.orders_count || 0), 0);

    const pct = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    return {
      totalViews, totalQuoteReqs, totalOrders, totalRevenue, totalCommission, avgConversion, avgResponse,
      viewsTrend: pct(totalViews, prevViews),
      revenueTrend: pct(totalRevenue, prevRevenue),
      quotesTrend: pct(totalQuoteReqs, prevQuoteReqs),
      ordersTrend: pct(totalOrders, prevOrders),
    };
  }, [analytics, prevAnalytics]);

  const briefMetrics = useMemo(() => {
    const total = briefs.length;
    const pending = briefs.filter(b => b.status === "pending_review").length;
    const accepted = briefs.filter(b => b.status === "accepted").length;
    const declined = briefs.filter(b => b.status === "declined").length;
    const routed = briefs.filter(b => b.status === "routed").length;
    const avgScore = total > 0 ? Math.round(briefs.reduce((s, b) => s + (b.qualification_score || 0), 0) / total) : 0;
    return { total, pending, accepted, declined, routed, avgScore };
  }, [briefs]);

  // ── Feature toggle handler ────────────────────────────────
  const toggleFeature = async (featureKey: keyof BrandFeatures) => {
    if (!selectedBrand) return;
    const current: BrandFeatures = { ...DEFAULT_FEATURES, ...(selectedBrand.brand_features as any || {}) };
    const updated = { ...current, [featureKey]: !current[featureKey] };

    const { error } = await supabase
      .from("partners")
      .update({ brand_features: updated as any })
      .eq("id", selectedBrand.id);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(`${FEATURE_META.find(f => f.key === featureKey)?.label} ${updated[featureKey] ? "activé" : "désactivé"}`);
    queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
  };

  // ── CSV Export ────────────────────────────────────────────
  const exportCSV = () => {
    if (!selectedBrand || !analytics?.length) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const headers = ["Date", "Vues", "Demandes devis", "Devis envoyés", "Devis acceptés", "Commandes", "CA (€)", "Commission (€)", "Taux conversion (%)", "Temps réponse (h)"];
    const rows = (analytics || []).map(r => [
      r.period_date, r.views, r.quote_requests, r.quotes_sent, r.quotes_accepted,
      r.orders_count, r.orders_value, r.commission_amount,
      r.conversion_rate?.toFixed(1), r.avg_response_hours?.toFixed(1),
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${selectedBrand.company_name?.replace(/\s+/g, "_")}-${period}j.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport CSV téléchargé");
  };

  // ── Render helpers ────────────────────────────────────────
  const TrendBadge = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      value > 0 ? "bg-emerald-50 text-emerald-700" : value < 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
    }`}>
      {value > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : value < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : null}
      {value > 0 ? "+" : ""}{value}%
    </span>
  );

  const KpiCard = ({ label, value, sub, trend, icon: Icon, color }: { label: string; value: string | number; sub?: string; trend?: number; icon: any; color: string }) => (
    <div className="border border-border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + "15" }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p className="text-xl font-display font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] font-body text-muted-foreground/70">{sub}</p>}
    </div>
  );

  const tabItems: { id: BrandTab; label: string; icon: any }[] = [
    { id: "overview",   label: "Vue d'ensemble", icon: BarChart3 },
    { id: "parameters", label: "Paramètres",     icon: Settings2 },
    { id: "activity",   label: "Activité",       icon: Activity },
    { id: "export",     label: "Rapports",       icon: FileText },
  ];

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" />
            Gestion des Marques
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            {brands.length} marque{brands.length > 1 ? "s" : ""} partenaires &middot; Brand Member & Brand Network
          </p>
        </div>
      </div>

      {/* Brand selector + search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une marque..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-xs font-body focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filteredBrands.map(brand => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrandId(brand.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-body transition-all ${
                selectedBrandId === brand.id
                  ? "border-purple-400 bg-purple-50 text-purple-800 shadow-sm"
                  : "border-border bg-white text-foreground hover:border-purple-200"
              }`}
            >
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                  <Crown className="h-3 w-3 text-purple-500" />
                </div>
              )}
              <span className="font-semibold">{brand.company_name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                brand.plan === "brand_network" ? "bg-violet-100 text-violet-700" : "bg-purple-100 text-purple-700"
              }`}>
                {brand.plan === "brand_network" ? "Network" : "Member"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!selectedBrand && (
        <div className="text-center py-16 text-muted-foreground text-sm font-body">
          {brandsLoading ? "Chargement..." : "Aucune marque partenaire trouvée."}
        </div>
      )}

      {selectedBrand && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {tabItems.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-body font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 1: OVERVIEW                                     */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Brand header card */}
              <div className="border border-purple-200 rounded-xl p-5 bg-gradient-to-r from-purple-50/80 to-violet-50/50">
                <div className="flex items-start gap-4">
                  {selectedBrand.logo_url ? (
                    <img src={selectedBrand.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-purple-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Crown className="h-7 w-7 text-purple-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-lg text-foreground">{selectedBrand.company_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        selectedBrand.plan === "brand_network" ? "bg-violet-100 text-violet-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {selectedBrand.plan === "brand_network" ? "Brand Network" : "Brand Member"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        selectedBrand.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        {selectedBrand.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[10px] font-body text-muted-foreground">
                      {selectedBrand.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedBrand.country}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Depuis {new Date(selectedBrand.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{offers.length} produit{offers.length > 1 ? "s" : ""} actif{offers.length > 1 ? "s" : ""}</span>
                      {selectedBrand.plan === "brand_network" && (
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{distributors.length} distributeur{distributors.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Period selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">Période :</span>
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`px-3 py-1 rounded-full text-[10px] font-body font-medium transition-all ${
                      period === opt.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <KpiCard icon={Eye}          color="#7C3AED" label="Vues produits"    value={metrics.totalViews.toLocaleString()} trend={metrics.viewsTrend} />
                <KpiCard icon={FileText}     color="#2563EB" label="Demandes devis"   value={metrics.totalQuoteReqs} trend={metrics.quotesTrend} />
                <KpiCard icon={ShoppingCart}  color="#059669" label="Commandes"        value={metrics.totalOrders} trend={metrics.ordersTrend} />
                <KpiCard icon={TrendingUp}   color="#D4603A" label="CA généré"        value={`${metrics.totalRevenue.toLocaleString()}€`} trend={metrics.revenueTrend} />
                <KpiCard icon={Percent}      color="#7C3AED" label="Commission"       value={`${metrics.totalCommission.toLocaleString()}€`} sub={`Taux conversion: ${metrics.avgConversion.toFixed(1)}%`} />
              </div>

              {/* Briefs funnel + Collections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brief pipeline */}
                <div className="border border-border rounded-xl p-4 bg-white">
                  <h4 className="text-xs font-display font-bold text-foreground mb-3 flex items-center gap-2">
                    <Inbox className="h-3.5 w-3.5 text-purple-600" />
                    Pipeline des briefs
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: "Total reçus",    value: briefMetrics.total,    color: "bg-purple-500" },
                      { label: "En attente",     value: briefMetrics.pending,  color: "bg-amber-500" },
                      { label: "Acceptés",       value: briefMetrics.accepted, color: "bg-emerald-500" },
                      { label: "Déclinés",       value: briefMetrics.declined, color: "bg-red-400" },
                      ...(selectedBrand.plan === "brand_network" ? [{ label: "Routés", value: briefMetrics.routed, color: "bg-blue-500" }] : []),
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${item.color}`} />
                          <span className="text-[11px] font-body text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="text-xs font-display font-bold text-foreground">{item.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-body text-muted-foreground">Score qualification moyen</span>
                        <span className="text-xs font-display font-bold text-purple-600">{briefMetrics.avgScore}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collections summary */}
                <div className="border border-border rounded-xl p-4 bg-white">
                  <h4 className="text-xs font-display font-bold text-foreground mb-3 flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-purple-600" />
                    Collections & produits
                  </h4>
                  {(() => {
                    const collections: Record<string, number> = {};
                    offers.forEach(o => {
                      const name = o.collection_name || t("brand.noCollection", "Sans collection");
                      collections[name] = (collections[name] || 0) + 1;
                    });
                    const entries = Object.entries(collections).sort((a, b) => b[1] - a[1]);
                    if (entries.length === 0) {
                      return <p className="text-[11px] font-body text-muted-foreground">Aucun produit actif</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {entries.slice(0, 8).map(([name, count]) => (
                          <div key={name} className="flex items-center justify-between">
                            <span className="text-[11px] font-body text-foreground truncate max-w-[200px]">{name}</span>
                            <span className="text-[10px] font-display font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{count} produit{count > 1 ? "s" : ""}</span>
                          </div>
                        ))}
                        {entries.length > 8 && (
                          <p className="text-[10px] font-body text-muted-foreground">+{entries.length - 8} autres collections</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Recent orders */}
              {orders.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-white">
                  <h4 className="text-xs font-display font-bold text-foreground mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
                    Commandes récentes
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-body">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 font-medium">Produit</th>
                          <th className="text-center py-2 font-medium">Qté</th>
                          <th className="text-right py-2 font-medium">Montant</th>
                          <th className="text-right py-2 font-medium">Commission</th>
                          <th className="text-center py-2 font-medium">Statut</th>
                          <th className="text-right py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map(order => (
                          <tr key={order.id} className="border-b border-border/50 hover:bg-gray-50/50">
                            <td className="py-2 font-medium text-foreground truncate max-w-[180px]">{order.product_name || "—"}</td>
                            <td className="py-2 text-center">{order.quantity}</td>
                            <td className="py-2 text-right font-semibold">{(order.total_amount || 0).toLocaleString()}€</td>
                            <td className="py-2 text-right text-purple-600">{(order.commission_amount || 0).toLocaleString()}€</td>
                            <td className="py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                order.status === "delivered" ? "bg-emerald-50 text-emerald-700" :
                                order.status === "shipped" ? "bg-blue-50 text-blue-700" :
                                order.status === "confirmed" ? "bg-amber-50 text-amber-700" :
                                "bg-gray-50 text-gray-600"
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Network: distributors */}
              {selectedBrand.plan === "brand_network" && distributors.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-white">
                  <h4 className="text-xs font-display font-bold text-foreground mb-3 flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-violet-600" />
                    Réseau de distributeurs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {distributors.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-gray-50/50">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm">
                          {d.country_code ? String.fromCodePoint(...d.country_code.toUpperCase().split("").map((c: string) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌍"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-display font-semibold text-foreground truncate">
                            {(d.distributor as any)?.company_name || "—"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">{d.country_code}</span>
                            {d.is_exclusive && <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Exclusif</span>}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${d.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                              {d.is_active ? "Actif" : "Inactif"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 2: PARAMETERS / FEATURE TOGGLES                */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "parameters" && (
            <div className="space-y-6">
              {/* Feature toggles */}
              <div className="border border-border rounded-xl p-5 bg-white">
                <h4 className="text-sm font-display font-bold text-foreground mb-1">Fonctionnalités activées</h4>
                <p className="text-[10px] font-body text-muted-foreground mb-4">Activer ou désactiver les modules pour cette marque</p>

                <div className="space-y-3">
                  {FEATURE_META.map(feat => {
                    if (feat.networkOnly && selectedBrand.plan !== "brand_network") return null;
                    const features: BrandFeatures = { ...DEFAULT_FEATURES, ...(selectedBrand.brand_features as any || {}) };
                    const enabled = features[feat.key];
                    return (
                      <div
                        key={feat.key}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          enabled ? "border-purple-200 bg-purple-50/50" : "border-border bg-gray-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            enabled ? "bg-purple-100" : "bg-gray-100"
                          }`}>
                            <feat.icon className={`h-4 w-4 ${enabled ? "text-purple-600" : "text-gray-400"}`} />
                          </div>
                          <div>
                            <p className="text-xs font-display font-semibold text-foreground">{feat.label}</p>
                            <p className="text-[10px] font-body text-muted-foreground">{feat.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFeature(feat.key)}
                          className="flex-shrink-0"
                        >
                          {enabled ? (
                            <ToggleRight className="h-7 w-7 text-purple-600" />
                          ) : (
                            <ToggleLeft className="h-7 w-7 text-gray-300" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plan overrides */}
              <div className="border border-border rounded-xl p-5 bg-white">
                <h4 className="text-sm font-display font-bold text-foreground mb-1">Paramètres du plan</h4>
                <p className="text-[10px] font-body text-muted-foreground mb-4">Ces valeurs sont modifiables dans Abonnements &gt; {selectedBrand.company_name}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-border rounded-xl p-3 bg-gray-50">
                    <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
                    <p className="text-sm font-display font-bold text-purple-600">
                      {selectedBrand.plan === "brand_network" ? "Brand Network" : "Brand Member"}
                    </p>
                  </div>
                  <div className="border border-border rounded-xl p-3 bg-gray-50">
                    <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1">Commission</p>
                    <p className="text-sm font-display font-bold text-foreground">
                      {selectedBrand.plan === "brand_network" ? "1.5%" : "2%"}
                    </p>
                  </div>
                  <div className="border border-border rounded-xl p-3 bg-gray-50">
                    <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1">Produits max</p>
                    <p className="text-sm font-display font-bold text-foreground">999</p>
                  </div>
                  <div className="border border-border rounded-xl p-3 bg-gray-50">
                    <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1">Statut</p>
                    <p className={`text-sm font-display font-bold ${selectedBrand.is_active ? "text-emerald-600" : "text-red-600"}`}>
                      {selectedBrand.is_active ? "Actif" : "Inactif"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 3: ACTIVITY REPORT                              */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "activity" && (
            <div className="space-y-6">
              {/* Period selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">Période :</span>
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`px-3 py-1 rounded-full text-[10px] font-body font-medium transition-all ${
                      period === opt.value ? "bg-purple-600 text-white" : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Engagement metrics */}
              <div className="border border-border rounded-xl p-5 bg-white">
                <h4 className="text-xs font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-purple-600" />
                  Engagement & visibilité
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard icon={Eye}      color="#7C3AED" label="Vues totales"      value={metrics.totalViews.toLocaleString()} trend={metrics.viewsTrend} />
                  <KpiCard icon={FileText}  color="#2563EB" label="Demandes de devis"  value={metrics.totalQuoteReqs} trend={metrics.quotesTrend} />
                  <KpiCard icon={Activity}  color="#059669" label="Taux de conversion" value={`${metrics.avgConversion.toFixed(1)}%`} />
                  <KpiCard icon={Clock}     color="#D4603A" label="Temps rép. moyen"   value={`${metrics.avgResponse.toFixed(1)}h`} />
                </div>
              </div>

              {/* Top products by quotes */}
              <div className="border border-border rounded-xl p-5 bg-white">
                <h4 className="text-xs font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                  Produits les plus demandés
                </h4>
                {(() => {
                  const productQuotes: Record<string, { count: number; revenue: number; product_id: string }> = {};
                  quoteRequests.forEach(q => {
                    const pid = q.product_id || "unknown";
                    if (!productQuotes[pid]) productQuotes[pid] = { count: 0, revenue: 0, product_id: pid };
                    productQuotes[pid].count++;
                    productQuotes[pid].revenue += (q.total_price || 0);
                  });
                  const sorted = Object.entries(productQuotes).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

                  // Map product ids to names from offers
                  const productNames: Record<string, string> = {};
                  offers.forEach(o => {
                    if (o.product_id && (o.product as any)?.name) {
                      productNames[o.product_id] = (o.product as any).name;
                    }
                  });

                  if (sorted.length === 0) {
                    return <p className="text-[11px] font-body text-muted-foreground">Aucune demande de devis sur la période</p>;
                  }

                  return (
                    <table className="w-full text-[11px] font-body">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 font-medium">#</th>
                          <th className="text-left py-2 font-medium">Produit</th>
                          <th className="text-right py-2 font-medium">Devis</th>
                          <th className="text-right py-2 font-medium">CA potentiel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(([pid, data], i) => (
                          <tr key={pid} className="border-b border-border/50">
                            <td className="py-2 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 font-medium text-foreground truncate max-w-[200px]">{productNames[pid] || pid.slice(0, 8)}</td>
                            <td className="py-2 text-right font-semibold">{data.count}</td>
                            <td className="py-2 text-right text-purple-600">{data.revenue.toLocaleString()}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Revenue breakdown */}
              <div className="border border-border rounded-xl p-5 bg-white">
                <h4 className="text-xs font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
                  Revenus & commissions
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard icon={ShoppingCart} color="#059669" label="Commandes"       value={metrics.totalOrders} trend={metrics.ordersTrend} />
                  <KpiCard icon={TrendingUp}  color="#D4603A" label="CA total"         value={`${metrics.totalRevenue.toLocaleString()}€`} trend={metrics.revenueTrend} />
                  <KpiCard icon={Percent}     color="#7C3AED" label="Commission totale" value={`${metrics.totalCommission.toLocaleString()}€`} />
                  <KpiCard icon={Package}     color="#2563EB" label="Panier moyen"      value={metrics.totalOrders > 0 ? `${Math.round(metrics.totalRevenue / metrics.totalOrders).toLocaleString()}€` : "—"} />
                </div>
              </div>

              {/* Brief details */}
              {briefs.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-white">
                  <h4 className="text-xs font-display font-bold text-foreground mb-4 flex items-center gap-2">
                    <Inbox className="h-3.5 w-3.5 text-purple-600" />
                    Détail des briefs reçus
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-body">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 font-medium">Établissement</th>
                          <th className="text-left py-2 font-medium">Pays</th>
                          <th className="text-center py-2 font-medium">Budget</th>
                          <th className="text-center py-2 font-medium">Score</th>
                          <th className="text-center py-2 font-medium">Statut</th>
                          <th className="text-right py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {briefs.slice(0, 20).map(brief => (
                          <tr key={brief.id} className="border-b border-border/50 hover:bg-gray-50/50">
                            <td className="py-2 font-medium text-foreground">
                              {brief.establishment_type}{brief.stars_or_class ? ` ${brief.stars_or_class}` : ""}
                            </td>
                            <td className="py-2">{brief.country || "—"}</td>
                            <td className="py-2 text-center">{brief.budget_range || "—"}</td>
                            <td className="py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                (brief.qualification_score || 0) >= 70 ? "bg-emerald-50 text-emerald-700" :
                                (brief.qualification_score || 0) >= 40 ? "bg-amber-50 text-amber-700" :
                                "bg-red-50 text-red-700"
                              }`}>
                                {brief.qualification_score || 0}
                              </span>
                            </td>
                            <td className="py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                brief.status === "accepted" ? "bg-emerald-50 text-emerald-700" :
                                brief.status === "routed" ? "bg-blue-50 text-blue-700" :
                                brief.status === "declined" ? "bg-red-50 text-red-700" :
                                "bg-amber-50 text-amber-700"
                              }`}>
                                {brief.status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-muted-foreground">{new Date(brief.created_at).toLocaleDateString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quote requests detail */}
              {quoteRequests.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-white">
                  <h4 className="text-xs font-display font-bold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    Demandes de devis — Personnes intéressées
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-body">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 font-medium">Entreprise</th>
                          <th className="text-left py-2 font-medium">Ville</th>
                          <th className="text-center py-2 font-medium">Qté</th>
                          <th className="text-right py-2 font-medium">Montant</th>
                          <th className="text-center py-2 font-medium">Statut</th>
                          <th className="text-right py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteRequests.slice(0, 20).map(q => (
                          <tr key={q.id} className="border-b border-border/50 hover:bg-gray-50/50">
                            <td className="py-2 font-medium text-foreground">{q.company || "—"}</td>
                            <td className="py-2 text-muted-foreground">{q.client_city || "—"}</td>
                            <td className="py-2 text-center">{q.quantity || "—"}</td>
                            <td className="py-2 text-right font-semibold">{(q.total_price || 0).toLocaleString()}€</td>
                            <td className="py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                q.status === "accepted" || q.status === "signed" ? "bg-emerald-50 text-emerald-700" :
                                q.status === "replied" ? "bg-blue-50 text-blue-700" :
                                q.status === "rejected" ? "bg-red-50 text-red-700" :
                                "bg-amber-50 text-amber-700"
                              }`}>
                                {q.status}
                              </span>
                            </td>
                            <td className="py-2 text-right text-muted-foreground">{new Date(q.created_at).toLocaleDateString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 4: EXPORT / MEETING REPORTS                     */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "export" && (
            <div className="space-y-6">
              <div className="border border-purple-200 rounded-xl p-6 bg-gradient-to-r from-purple-50/80 to-violet-50/50">
                <h4 className="text-sm font-display font-bold text-foreground mb-1">Rapports pour réunion</h4>
                <p className="text-[11px] font-body text-muted-foreground mb-4">
                  Générez des rapports synthétiques pour vos réunions mensuelles ou annuelles avec {selectedBrand.company_name}.
                </p>

                {/* Period selector */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">Période :</span>
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPeriod(opt.value)}
                      className={`px-3 py-1 rounded-full text-[10px] font-body font-medium transition-all ${
                        period === opt.value ? "bg-purple-600 text-white" : "bg-white text-muted-foreground border border-border hover:border-purple-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Summary cards for meeting */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-white rounded-xl p-4 border border-border text-center">
                    <p className="text-2xl font-display font-bold text-purple-600">{metrics.totalViews.toLocaleString()}</p>
                    <p className="text-[10px] font-body text-muted-foreground">Vues produits</p>
                    <TrendBadge value={metrics.viewsTrend} />
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-border text-center">
                    <p className="text-2xl font-display font-bold text-blue-600">{metrics.totalQuoteReqs + briefMetrics.total}</p>
                    <p className="text-[10px] font-body text-muted-foreground">Demandes totales</p>
                    <p className="text-[9px] text-muted-foreground">{metrics.totalQuoteReqs} devis + {briefMetrics.total} briefs</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-border text-center">
                    <p className="text-2xl font-display font-bold text-emerald-600">{metrics.totalRevenue.toLocaleString()}€</p>
                    <p className="text-[10px] font-body text-muted-foreground">Chiffre d'affaires</p>
                    <TrendBadge value={metrics.revenueTrend} />
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-border text-center">
                    <p className="text-2xl font-display font-bold text-foreground">{metrics.avgConversion.toFixed(1)}%</p>
                    <p className="text-[10px] font-body text-muted-foreground">Taux de conversion</p>
                    <p className="text-[9px] text-muted-foreground">Rép. moy. {metrics.avgResponse.toFixed(1)}h</p>
                  </div>
                </div>

                {/* Key insights */}
                <div className="bg-white rounded-xl p-4 border border-border mb-6">
                  <h5 className="text-xs font-display font-bold text-foreground mb-3">Points clés</h5>
                  <div className="space-y-2 text-[11px] font-body text-muted-foreground">
                    <p>• <strong>{offers.length}</strong> produit{offers.length > 1 ? "s" : ""} actif{offers.length > 1 ? "s" : ""} dans le catalogue</p>
                    <p>• <strong>{briefMetrics.accepted}</strong> brief{briefMetrics.accepted > 1 ? "s" : ""} accepté{briefMetrics.accepted > 1 ? "s" : ""} sur <strong>{briefMetrics.total}</strong> reçus ({briefMetrics.total > 0 ? Math.round(briefMetrics.accepted / briefMetrics.total * 100) : 0}% d'acceptation)</p>
                    <p>• <strong>{metrics.totalOrders}</strong> commande{metrics.totalOrders > 1 ? "s" : ""} sur la période pour un total de <strong>{metrics.totalRevenue.toLocaleString()}€</strong></p>
                    {metrics.totalOrders > 0 && (
                      <p>• Panier moyen : <strong>{Math.round(metrics.totalRevenue / metrics.totalOrders).toLocaleString()}€</strong></p>
                    )}
                    {selectedBrand.plan === "brand_network" && (
                      <p>• <strong>{distributors.filter(d => d.is_active).length}</strong> distributeur{distributors.filter(d => d.is_active).length > 1 ? "s" : ""} actif{distributors.filter(d => d.is_active).length > 1 ? "s" : ""} dans <strong>{new Set(distributors.map(d => d.country_code)).size}</strong> pays</p>
                    )}
                    <p>• Commission générée : <strong>{metrics.totalCommission.toLocaleString()}€</strong></p>
                  </div>
                </div>

                {/* Export buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-body font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger le rapport CSV
                  </button>
                  <button
                    onClick={() => {
                      // Export briefs CSV
                      if (!briefs.length) { toast.error("Aucun brief à exporter"); return; }
                      const headers = ["Date", "Établissement", "Pays", "Capacité", "Budget", "Score qualification", "Statut", "Collections intéressées"];
                      const rows = briefs.map(b => [
                        new Date(b.created_at).toLocaleDateString("fr-FR"),
                        `${b.establishment_type || ""}${b.stars_or_class ? " " + b.stars_or_class : ""}`,
                        b.country || "", b.capacity || "", b.budget_range || "",
                        b.qualification_score || 0, b.status || "",
                        (b.collections_interest || []).join("; "),
                      ].join(","));
                      const csv = [headers.join(","), ...rows].join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `briefs-${selectedBrand.company_name?.replace(/\s+/g, "_")}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Export briefs téléchargé");
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 text-purple-700 text-xs font-body font-medium hover:bg-purple-50 transition-colors"
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    Exporter les briefs
                  </button>
                  <button
                    onClick={() => {
                      // Export quote requests CSV
                      if (!quoteRequests.length) { toast.error("Aucune demande à exporter"); return; }
                      const headers = ["Date", "Entreprise", "Ville", "Quantité", "Montant", "Statut"];
                      const rows = quoteRequests.map(q => [
                        new Date(q.created_at).toLocaleDateString("fr-FR"),
                        q.company || "", q.client_city || "", q.quantity || "",
                        q.total_price || 0, q.status || "",
                      ].join(","));
                      const csv = [headers.join(","), ...rows].join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `devis-${selectedBrand.company_name?.replace(/\s+/g, "_")}-${period}j.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Export devis téléchargé");
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-body font-medium hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Exporter les devis
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

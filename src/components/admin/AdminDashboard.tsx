import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import {
  Package, Users, Building2, FileText, ClipboardList,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Star, BarChart3, ShoppingCart, Globe,
} from "lucide-react";

// ── KPI Card ──
function KPICard({ icon: Icon, label, value, sub, trend, color = "text-foreground" }: {
  icon: any; label: string; value: string | number; sub?: string;
  trend?: { value: string; up: boolean }; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-sm p-5 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-sm bg-foreground/5`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-display font-semibold ${trend.up ? "text-green-600" : "text-red-500"}`}>
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] font-body text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] font-body text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

// ── Mini bar chart ──
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-body text-muted-foreground w-24 truncate">{label}</span>
      <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-display font-semibold text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: products = [] } = useProducts();

  // Users count by type
  const { data: userStats } = useQuery({
    queryKey: ["admin_user_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("user_type");
      if (error) throw error;
      const types = { client: 0, partner: 0, architect: 0, admin: 0 };
      (data || []).forEach((u: any) => { if (u.user_type in types) types[u.user_type as keyof typeof types]++; });
      return { total: data?.length || 0, ...types };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Partners
  const { data: partnerStats } = useQuery({
    queryKey: ["admin_partner_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("id, is_public, partner_type, country");
      if (error) throw error;
      const list = data || [];
      const countries = new Set(list.map(p => p.country).filter(Boolean));
      const types: Record<string, number> = {};
      list.forEach(p => { types[p.partner_type || "other"] = (types[p.partner_type || "other"] || 0) + 1; });
      return {
        total: list.length,
        public: list.filter(p => p.is_public).length,
        countries: countries.size,
        byType: types,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Applications pending
  const { data: appStats } = useQuery({
    queryKey: ["admin_app_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_applications").select("status");
      if (error) throw error;
      const list = data || [];
      return {
        total: list.length,
        pending: list.filter((a: any) => a.status === "pending").length,
        approved: list.filter((a: any) => a.status === "approved").length,
        rejected: list.filter((a: any) => a.status === "rejected").length,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Quote requests
  const { data: quoteStats } = useQuery({
    queryKey: ["admin_quote_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_requests").select("id, project_name, created_at");
      if (error) throw error;
      const list = data || [];
      const pro = list.filter((r: any) => r.project_name?.includes("Pro Service"));
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recent = list.filter((r: any) => new Date(r.created_at) > thirtyDaysAgo);
      return { total: list.length, pro: pro.length, standard: list.length - pro.length, recent: recent.length };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Product offers
  const { data: offerStats } = useQuery({
    queryKey: ["admin_offer_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_offers").select("id, is_active");
      if (error) throw error;
      const list = data || [];
      return { total: list.length, active: list.filter((o: any) => o.is_active).length };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Product stats
  const publishedCount = products.filter(p => (p as any).publish_status === "published").length;
  const pendingReview = products.filter(p => (p as any).publish_status === "pending_review").length;
  const draftCount = products.filter(p => !(p as any).publish_status || (p as any).publish_status === "draft").length;

  const qualityStats = {
    excellent: products.filter(p => p.data_quality_score >= 0.8).length,
    good:      products.filter(p => p.data_quality_score >= 0.6 && p.data_quality_score < 0.8).length,
    fair:      products.filter(p => p.data_quality_score >= 0.4 && p.data_quality_score < 0.6).length,
    incomplete:products.filter(p => p.data_quality_score < 0.4).length,
  };

  // Category distribution
  const catDist: Record<string, number> = {};
  products.forEach(p => { catDist[p.category] = (catDist[p.category] || 0) + 1; });
  const catSorted = Object.entries(catDist).sort((a, b) => b[1] - a[1]);
  const maxCat = catSorted[0]?.[1] || 1;

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {(pendingReview > 0 || (appStats?.pending || 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingReview > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-body text-amber-700">
                <strong>{pendingReview}</strong> produit{pendingReview > 1 ? "s" : ""} en attente de validation
              </span>
            </div>
          )}
          {(appStats?.pending || 0) > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-sm">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-body text-amber-700">
                <strong>{appStats?.pending}</strong> candidature{(appStats?.pending || 0) > 1 ? "s" : ""} partenaire en attente
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Package}
          label="Produits total"
          value={products.length}
          sub={`${publishedCount} publiés · ${draftCount} brouillons`}
          color="text-foreground"
        />
        <KPICard
          icon={Users}
          label="Utilisateurs"
          value={userStats?.total || 0}
          sub={`${userStats?.client || 0} clients · ${userStats?.partner || 0} partenaires · ${userStats?.architect || 0} architectes`}
          color="text-blue-600"
        />
        <KPICard
          icon={Building2}
          label="Fournisseurs"
          value={partnerStats?.total || 0}
          sub={`${partnerStats?.public || 0} publics · ${partnerStats?.countries || 0} pays`}
          color="text-emerald-600"
        />
        <KPICard
          icon={FileText}
          label="Demandes de devis"
          value={quoteStats?.total || 0}
          sub={`${quoteStats?.recent || 0} ces 30 derniers jours`}
          color="text-purple-600"
        />
      </div>

      {/* Second row of KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={ClipboardList}
          label="Candidatures"
          value={appStats?.total || 0}
          sub={`${appStats?.pending || 0} en attente · ${appStats?.approved || 0} approuvées`}
          color="text-amber-600"
        />
        <KPICard
          icon={ShoppingCart}
          label="Offres fournisseurs"
          value={offerStats?.total || 0}
          sub={`${offerStats?.active || 0} actives`}
          color="text-indigo-600"
        />
        <KPICard
          icon={Star}
          label="Qualité catalogue"
          value={`${products.length > 0 ? Math.round((qualityStats.excellent + qualityStats.good) / products.length * 100) : 0}%`}
          sub={`${qualityStats.excellent} excellent · ${qualityStats.good} bon`}
          color="text-green-600"
        />
        <KPICard
          icon={Globe}
          label="Pro Service"
          value={quoteStats?.pro || 0}
          sub={`${quoteStats?.standard || 0} demandes standard`}
          color="text-teal-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories distribution */}
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-sm text-foreground">Produits par catégorie</h3>
          </div>
          <div className="space-y-2.5">
            {catSorted.map(([cat, count]) => (
              <MiniBar key={cat} label={cat} value={count} max={maxCat} color="bg-foreground/70" />
            ))}
            {catSorted.length === 0 && (
              <p className="text-xs text-muted-foreground font-body">Aucun produit.</p>
            )}
          </div>
        </div>

        {/* Quality breakdown */}
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-sm text-foreground">Qualité des données</h3>
          </div>
          <div className="space-y-2.5">
            <MiniBar label="Excellent (≥80%)" value={qualityStats.excellent} max={products.length || 1} color="bg-green-500" />
            <MiniBar label="Bon (60-79%)" value={qualityStats.good} max={products.length || 1} color="bg-blue-500" />
            <MiniBar label="Moyen (40-59%)" value={qualityStats.fair} max={products.length || 1} color="bg-amber-500" />
            <MiniBar label="Incomplet (<40%)" value={qualityStats.incomplete} max={products.length || 1} color="bg-red-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-[10px] font-body text-muted-foreground">
              <span>Score moyen</span>
              <span className="font-display font-semibold text-foreground">
                {products.length > 0
                  ? `${Math.round((products.reduce((s, p) => s + p.data_quality_score, 0) / products.length) * 100)}%`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Publish status */}
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-sm text-foreground">Statut de publication</h3>
          </div>
          <div className="space-y-2.5">
            <MiniBar label="Publiés" value={publishedCount} max={products.length || 1} color="bg-green-500" />
            <MiniBar label="En revue" value={pendingReview} max={products.length || 1} color="bg-amber-500" />
            <MiniBar label="Brouillons" value={draftCount} max={products.length || 1} color="bg-muted-foreground/50" />
            <MiniBar label="Rejetés" value={products.filter(p => (p as any).publish_status === "rejected").length} max={products.length || 1} color="bg-red-500" />
          </div>
        </div>

        {/* Partners by type */}
        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-sm text-foreground">Fournisseurs par type</h3>
          </div>
          <div className="space-y-2.5">
            {partnerStats?.byType && Object.entries(partnerStats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <MiniBar key={type} label={type} value={count} max={partnerStats.total || 1} color="bg-emerald-500" />
              ))}
            {(!partnerStats?.byType || Object.keys(partnerStats.byType).length === 0) && (
              <p className="text-xs text-muted-foreground font-body">Aucun fournisseur.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-sm text-foreground">Actions recommandées</h3>
        </div>
        <div className="space-y-2">
          {pendingReview > 0 && (
            <div className="flex items-center gap-3 py-2 border-b border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-body text-foreground flex-1">
                {pendingReview} produit{pendingReview > 1 ? "s" : ""} à valider dans l'onglet Produits
              </span>
              <span className="text-[10px] font-display font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Urgent</span>
            </div>
          )}
          {(appStats?.pending || 0) > 0 && (
            <div className="flex items-center gap-3 py-2 border-b border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-body text-foreground flex-1">
                {appStats?.pending} candidature{(appStats?.pending || 0) > 1 ? "s" : ""} partenaire à examiner
              </span>
              <span className="text-[10px] font-display font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Urgent</span>
            </div>
          )}
          {qualityStats.incomplete > 0 && (
            <div className="flex items-center gap-3 py-2 border-b border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs font-body text-foreground flex-1">
                {qualityStats.incomplete} produit{qualityStats.incomplete > 1 ? "s" : ""} avec des données incomplètes {"(<"}40%{")"}
              </span>
              <span className="text-[10px] font-display font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Améliorer</span>
            </div>
          )}
          {pendingReview === 0 && (appStats?.pending || 0) === 0 && qualityStats.incomplete === 0 && (
            <p className="text-xs font-body text-muted-foreground py-2">Tout est en ordre. Aucune action requise.</p>
          )}
        </div>
      </div>
    </div>
  );
}

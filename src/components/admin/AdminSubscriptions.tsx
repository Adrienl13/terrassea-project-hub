import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, Building2, Shield, Star, Crown, Percent,
  Package, Pause, Play, ChevronDown, ChevronUp,
  CheckCircle2, Clock, CreditCard, Save, Gem,
} from "lucide-react";

const PLAN_CONFIG: Record<string, { label: string; icon: any; color: string; commission: number; maxProducts: number; maxFeatured: number; price: string }> = {
  starter:   { label: "Starter",   icon: Shield, color: "#6B7280", commission: 8,   maxProducts: 30,  maxFeatured: 0,  price: "Gratuit" },
  growth:    { label: "Growth",    icon: Star,   color: "#2563EB", commission: 5,   maxProducts: 50,  maxFeatured: 0,  price: "249\u20AC/mois" },
  elite:     { label: "Elite",     icon: Crown,  color: "#D4603A", commission: 3.5, maxProducts: 150, maxFeatured: 15, price: "499\u20AC/mois" },
  brand_member:  { label: "Brand Member",  icon: Crown, color: "#7C3AED", commission: 2,   maxProducts: 999, maxFeatured: 0,  price: "799\u20AC/mois" },
  brand_network: { label: "Brand Network", icon: Gem,   color: "#6D28D9", commission: 1.5, maxProducts: 999, maxFeatured: 0,  price: "1299\u20AC/mois" },
};

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// ── Overrides form state ──────────────────────────────────────────────────────

interface OverrideFormState {
  maxProducts: string;
  maxFeatured: string;
  commissionRate: string;
  engagementMonths: string;
}

function emptyOverrides(): OverrideFormState {
  return { maxProducts: "", maxFeatured: "", commissionRate: "", engagementMonths: "" };
}

function initOverrides(sub: any): OverrideFormState {
  return {
    maxProducts: sub?.max_products != null ? String(sub.max_products) : "",
    maxFeatured: sub?.max_featured != null ? String(sub.max_featured) : "",
    commissionRate: sub?.commission_rate != null ? String(sub.commission_rate) : "",
    engagementMonths: sub?.engagement_months != null ? String(sub.engagement_months) : "",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(emptyOverrides());
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Fetch partners with their subscriptions
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, name, slug, country_code, plan, is_active, contact_email, created_at")
        .order("name");

      const { data: subData } = await supabase
        .from("partner_subscriptions")
        .select("*");

      const subMap: Record<string, any> = {};
      (subData || []).forEach((s: any) => { subMap[s.partner_id] = s; });

      return (partnerData || []).map((p: any) => ({
        ...p,
        subscription: subMap[p.id] || null,
      }));
    },
  });

  const filtered = partners.filter((p: any) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.contact_email || "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" || p.plan === planFilter;
    return matchSearch && matchPlan;
  });

  // Stats
  const planCounts: Record<string, number> = { starter: 0, growth: 0, elite: 0, brand_member: 0, brand_network: 0 };
  partners.forEach((p: any) => { if (p.plan && planCounts[p.plan] !== undefined) planCounts[p.plan]++; });
  const totalMRR = partners.reduce((s: number, p: any) => {
    if (p.plan === "growth") return s + 249;
    if (p.plan === "elite") return s + 499;
    if (p.plan === "brand_member") return s + 799;
    if (p.plan === "brand_network") return s + 1299;
    return s;
  }, 0);

  const MODE_FOR_PLAN: Record<string, string> = {
    starter: "standard", growth: "standard", elite: "standard",
    brand_member: "brand_member", brand_network: "brand_network",
  };

  const changePlan = async (partnerId: string, newPlan: string) => {
    const { error } = await supabase.from("partners").update({ plan: newPlan, partner_mode: MODE_FOR_PLAN[newPlan] || "standard" }).eq("id", partnerId);
    if (error) { toast.error("Erreur : " + error.message); return; }

    // Also update partner_subscriptions.plan to keep in sync
    const { data: existingSub } = await supabase
      .from("partner_subscriptions")
      .select("id")
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (existingSub) {
      await supabase.from("partner_subscriptions")
        .update({ plan: newPlan, updated_at: new Date().toISOString() })
        .eq("partner_id", partnerId);
    } else {
      await supabase.from("partner_subscriptions")
        .insert({ partner_id: partnerId, plan: newPlan, status: "active" } as any);
    }

    toast.success(`Plan mis \u00e0 jour \u2192 ${PLAN_CONFIG[newPlan]?.label || newPlan}`);
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["admin_partners"] });
  };

  const toggleSubscriptionStatus = async (partnerId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase.from("partner_subscriptions").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("partner_id", partnerId);
    if (error) { toast.error("Erreur"); return; }
    toast.success(newStatus === "paused" ? "Abonnement mis en pause" : "Abonnement r\u00e9activ\u00e9");
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  const saveOverrides = async (partnerId: string, partnerPlan: string) => {
    setSavingOverrides(true);
    try {
      const plan = PLAN_CONFIG[partnerPlan] || PLAN_CONFIG.starter;
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Parse overrides; empty string means "use plan default" (null in DB)
      const maxProd = overrideForm.maxProducts.trim();
      updates.max_products = maxProd !== "" ? parseInt(maxProd, 10) : null;

      const maxFeat = overrideForm.maxFeatured.trim();
      updates.max_featured = maxFeat !== "" ? parseInt(maxFeat, 10) : null;

      const commRate = overrideForm.commissionRate.trim();
      updates.commission_rate = commRate !== "" ? parseFloat(commRate) : null;

      const engMonths = overrideForm.engagementMonths.trim();
      updates.engagement_months = engMonths !== "" ? parseInt(engMonths, 10) : null;

      // Upsert: first try update, if no rows affected then insert
      const { data: existing } = await supabase
        .from("partner_subscriptions")
        .select("id")
        .eq("partner_id", partnerId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("partner_subscriptions")
          .update(updates as any)
          .eq("partner_id", partnerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("partner_subscriptions")
          .insert({ partner_id: partnerId, plan: partnerPlan, status: "active", ...updates } as any);
        if (error) throw error;
      }

      toast.success("Overrides sauvegard\u00e9s");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "Echec de sauvegarde"));
    } finally {
      setSavingOverrides(false);
    }
  };

  // When expanding a partner row, initialize override form from their subscription
  const handleExpand = (partnerId: string, sub: any) => {
    if (expandedId === partnerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(partnerId);
    setOverrideForm(initOverrides(sub));
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg">Abonnements partenaires</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">G\u00e9rez les plans, commissions, overrides et statuts des abonnements fournisseurs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(PLAN_CONFIG).map(([key, cfg]) => (
          <div key={key} className="border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cfg.color}12` }}>
              <cfg.icon className="h-5 w-5" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="font-display font-bold text-lg">{planCounts[key] || 0}</p>
              <p className="text-[9px] font-display font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
            </div>
          </div>
        ))}
        <div className="border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#D4603A]/10">
            <CreditCard className="h-5 w-5 text-[#D4603A]" />
          </div>
          <div>
            <p className="font-display font-bold text-lg">\u20AC{totalMRR.toLocaleString()}</p>
            <p className="text-[9px] font-display font-semibold text-[#D4603A]">MRR estim\u00e9</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email\u2026"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40" />
        </div>
        <div className="flex gap-1">
          {[{ id: "all", label: "Tous" }, ...Object.entries(PLAN_CONFIG).map(([k, v]) => ({ id: k, label: v.label }))].map(f => (
            <button key={f.id} onClick={() => setPlanFilter(f.id)}
              className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full transition-all ${
                planFilter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Aucun partenaire avec ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any) => {
            const plan = PLAN_CONFIG[p.plan] || PLAN_CONFIG.starter;
            const sub = p.subscription;
            const isExpanded = expandedId === p.id;
            const subStatus = sub?.status || "active";

            // Effective values (override or plan default)
            const effectiveMaxProducts = sub?.max_products ?? plan.maxProducts;
            const effectiveCommission = sub?.commission_rate ?? plan.commission;
            const effectiveMaxFeatured = sub?.max_featured ?? plan.maxFeatured;

            return (
              <div key={p.id} className="border border-border rounded-xl overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => handleExpand(p.id, sub)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-card/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${plan.color}12` }}>
                    <plan.icon className="h-4 w-4" style={{ color: plan.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-bold text-foreground truncate">{p.name}</span>
                      {countryFlag(p.country_code) && <span className="text-sm">{countryFlag(p.country_code)}</span>}
                      <span className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${plan.color}12`, color: plan.color }}>
                        {plan.label}
                      </span>
                      {subStatus === "paused" && (
                        <span className="text-[8px] font-display font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Pause</span>
                      )}
                    </div>
                    <p className="text-[10px] font-body text-muted-foreground">
                      Commission {effectiveCommission}%{sub?.commission_rate != null ? " (override)" : ""}
                      {" \u00b7 "}Max {effectiveMaxProducts === 999 ? "\u221E" : effectiveMaxProducts} prod.{sub?.max_products != null ? " (override)" : ""}
                      {" \u00b7 "}{effectiveMaxFeatured} mis en avant
                      {p.contact_email && ` \u00b7 ${p.contact_email}`}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-4">
                    {/* Plan selector */}
                    <div>
                      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">Changer le plan</p>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(PLAN_CONFIG).map(([key, cfg]) => {
                          const isActive = p.plan === key;
                          return (
                            <button
                              key={key}
                              onClick={() => !isActive && changePlan(p.id, key)}
                              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all ${
                                isActive ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/20"
                              }`}
                            >
                              <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                              <span className="text-[10px] font-display font-bold">{cfg.label}</span>
                              <span className="text-[8px] font-body text-muted-foreground">{cfg.commission}% \u00b7 {cfg.maxProducts === 999 ? "\u221E" : cfg.maxProducts} prod.</span>
                              <span className="text-[7px] font-body text-muted-foreground/70">{cfg.price}</span>
                              {isActive && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] font-body text-muted-foreground mt-1.5">
                        Le changement de plan met \u00e0 jour automatiquement : commission, max produits, visibilit\u00e9.
                      </p>
                    </div>

                    {/* ── Overrides section ───────────────────────────────────── */}
                    <div className="border border-dashed border-border rounded-xl p-4 space-y-3 bg-muted/20">
                      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                        Overrides <span className="font-normal normal-case">(laisser vide = d\u00e9faut plan)</span>
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Max products override */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-display font-semibold text-muted-foreground">
                            Produits max
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={9999}
                              value={overrideForm.maxProducts}
                              onChange={e => setOverrideForm(prev => ({ ...prev, maxProducts: e.target.value }))}
                              placeholder={String(plan.maxProducts)}
                              className="w-full px-2.5 py-2 border border-border rounded-lg text-sm font-body text-right focus:outline-none focus:border-foreground/40"
                            />
                          </div>
                          <p className="text-[8px] font-body text-muted-foreground/70">
                            D\u00e9faut : {plan.maxProducts === 999 ? "\u221E" : plan.maxProducts}
                          </p>
                        </div>

                        {/* Max featured override */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-display font-semibold text-muted-foreground">
                            Mis en avant max
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={overrideForm.maxFeatured}
                              onChange={e => setOverrideForm(prev => ({ ...prev, maxFeatured: e.target.value }))}
                              placeholder={String(plan.maxFeatured)}
                              className="w-full px-2.5 py-2 border border-border rounded-lg text-sm font-body text-right focus:outline-none focus:border-foreground/40"
                            />
                          </div>
                          <p className="text-[8px] font-body text-muted-foreground/70">
                            D\u00e9faut : {plan.maxFeatured}
                          </p>
                        </div>

                        {/* Commission rate override */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-display font-semibold text-muted-foreground">
                            Commission (%)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={30}
                              step={0.5}
                              value={overrideForm.commissionRate}
                              onChange={e => setOverrideForm(prev => ({ ...prev, commissionRate: e.target.value }))}
                              placeholder={String(plan.commission)}
                              className="w-full px-2.5 py-2 border border-border rounded-lg text-sm font-body text-right focus:outline-none focus:border-foreground/40"
                            />
                            <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-[8px] font-body text-muted-foreground/70">
                            D\u00e9faut : {plan.commission}%
                          </p>
                        </div>

                        {/* Engagement period */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-display font-semibold text-muted-foreground">
                            Engagement (mois)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={overrideForm.engagementMonths}
                              onChange={e => setOverrideForm(prev => ({ ...prev, engagementMonths: e.target.value }))}
                              placeholder="Aucun"
                              className="w-full px-2.5 py-2 border border-border rounded-lg text-sm font-body text-right focus:outline-none focus:border-foreground/40"
                            />
                          </div>
                          <p className="text-[8px] font-body text-muted-foreground/70">
                            P\u00e9riode d'engagement personnalis\u00e9e
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => saveOverrides(p.id, p.plan || "starter")}
                        disabled={savingOverrides}
                        className="flex items-center gap-1.5 text-[10px] font-display font-semibold px-4 py-2 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50"
                      >
                        <Save className="h-3 w-3" />
                        {savingOverrides ? "Sauvegarde\u2026" : "Sauvegarder les overrides"}
                      </button>
                    </div>

                    {/* Subscription details */}
                    {sub && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                        <div className="border border-border rounded-lg p-2">
                          <p className="font-display font-semibold text-muted-foreground uppercase">Statut</p>
                          <p className={`font-body mt-0.5 font-semibold ${subStatus === "active" ? "text-emerald-600" : "text-amber-600"}`}>
                            {subStatus === "active" ? "Actif" : "En pause"}
                          </p>
                        </div>
                        <div className="border border-border rounded-lg p-2">
                          <p className="font-display font-semibold text-muted-foreground uppercase">Commandes</p>
                          <p className="font-body mt-0.5">{sub.confirmed_orders_count || 0}</p>
                        </div>
                        <div className="border border-border rounded-lg p-2">
                          <p className="font-display font-semibold text-muted-foreground uppercase">Cr\u00e9\u00e9 le</p>
                          <p className="font-body mt-0.5">{new Date(sub.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="border border-border rounded-lg p-2">
                          <p className="font-display font-semibold text-muted-foreground uppercase">Mis \u00e0 jour</p>
                          <p className="font-body mt-0.5">{sub.updated_at ? new Date(sub.updated_at).toLocaleDateString("fr-FR") : "\u2014"}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {sub && (
                        <button
                          onClick={() => toggleSubscriptionStatus(p.id, subStatus)}
                          className={`flex items-center gap-1.5 text-[10px] font-display font-semibold px-3 py-2 rounded-lg border transition-colors ${
                            subStatus === "active"
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {subStatus === "active" ? <><Pause className="h-3 w-3" /> Mettre en pause</> : <><Play className="h-3 w-3" /> R\u00e9activer</>}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

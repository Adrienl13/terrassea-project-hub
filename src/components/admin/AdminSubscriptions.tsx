import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, Building2, Shield, Star, Crown, Percent,
  Package, Pause, Play, ChevronDown, ChevronUp,
  CheckCircle2, Clock, CreditCard,
} from "lucide-react";

const PLAN_CONFIG: Record<string, { label: string; icon: any; color: string; commission: number; maxProducts: number }> = {
  starter: { label: "Starter", icon: Shield, color: "#6B7280", commission: 8, maxProducts: 10 },
  growth:  { label: "Growth",  icon: Star,   color: "#2563EB", commission: 5, maxProducts: 50 },
  elite:   { label: "Elite",   icon: Crown,  color: "#D4603A", commission: 3, maxProducts: 999 },
};

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch partners with their subscriptions
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data: partnerData } = await (supabase
        .from("partners" as any)
        .select("id, name, slug, country_code, plan, is_active, contact_email, created_at")
        .order("name") as any);

      const { data: subData } = await (supabase
        .from("partner_subscriptions" as any)
        .select("*") as any);

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
  const planCounts: Record<string, number> = { starter: 0, growth: 0, elite: 0 };
  partners.forEach((p: any) => { if (p.plan && planCounts[p.plan] !== undefined) planCounts[p.plan]++; });
  const totalMRR = partners.reduce((s: number, p: any) => {
    if (p.plan === "growth") return s + 249;
    if (p.plan === "elite") return s + 499;
    return s;
  }, 0);

  const changePlan = async (partnerId: string, newPlan: string) => {
    // Update partners.plan → trigger syncs subscription + visibility
    const { error } = await (supabase.from("partners" as any).update({ plan: newPlan }).eq("id", partnerId) as any);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`Plan mis à jour → ${PLAN_CONFIG[newPlan]?.label || newPlan}`);
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["admin_partners"] });
  };

  const toggleSubscriptionStatus = async (partnerId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await (supabase.from("partner_subscriptions" as any).update({ status: newStatus, updated_at: new Date().toISOString() }).eq("partner_id", partnerId) as any);
    if (error) { toast.error("Erreur"); return; }
    toast.success(newStatus === "paused" ? "Abonnement mis en pause" : "Abonnement réactivé");
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  const updateCommissionRate = async (partnerId: string, rate: number) => {
    const { error } = await (supabase.from("partner_subscriptions" as any).update({ commission_rate: rate, updated_at: new Date().toISOString() }).eq("partner_id", partnerId) as any);
    if (error) { toast.error("Erreur"); return; }
    toast.success(`Commission mise à jour : ${rate}%`);
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg">Abonnements partenaires</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">Gérez les plans, commissions et statuts des abonnements fournisseurs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
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
            <p className="font-display font-bold text-lg">€{totalMRR.toLocaleString()}</p>
            <p className="text-[9px] font-display font-semibold text-[#D4603A]">MRR estimé</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
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

            return (
              <div key={p.id} className="border border-border rounded-xl overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
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
                      Commission {sub?.commission_rate || plan.commission}% · Max {sub?.max_products || plan.maxProducts} prod.
                      {p.contact_email && ` · ${p.contact_email}`}
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
                      <div className="grid grid-cols-3 gap-2">
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
                              <span className="text-[8px] font-body text-muted-foreground">{cfg.commission}% · {cfg.maxProducts === 999 ? "∞" : cfg.maxProducts} prod.</span>
                              {isActive && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] font-body text-muted-foreground mt-1.5">
                        Le changement de plan met à jour automatiquement : commission, max produits, visibilité.
                      </p>
                    </div>

                    {/* Custom commission override */}
                    <div>
                      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Commission personnalisée</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          step={0.5}
                          defaultValue={sub?.commission_rate || plan.commission}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== (sub?.commission_rate || plan.commission)) {
                              updateCommissionRate(p.id, val);
                            }
                          }}
                          className="w-20 px-3 py-2 border border-border rounded-lg text-sm font-body text-right focus:outline-none focus:border-foreground/40"
                        />
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[9px] font-body text-muted-foreground">
                          Défaut plan {plan.label} : {plan.commission}%
                        </span>
                      </div>
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
                          <p className="font-display font-semibold text-muted-foreground uppercase">Créé le</p>
                          <p className="font-body mt-0.5">{new Date(sub.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="border border-border rounded-lg p-2">
                          <p className="font-display font-semibold text-muted-foreground uppercase">Mis à jour</p>
                          <p className="font-body mt-0.5">{sub.updated_at ? new Date(sub.updated_at).toLocaleDateString("fr-FR") : "—"}</p>
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
                          {subStatus === "active" ? <><Pause className="h-3 w-3" /> Mettre en pause</> : <><Play className="h-3 w-3" /> Réactiver</>}
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

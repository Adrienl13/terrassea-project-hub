import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllPartnersAdmin } from "@/hooks/useFavouritesDB";
import { toast } from "sonner";
import {
  Eye, EyeOff, Shield, Star, Crown, ChevronDown,
  ChevronUp, Search, Globe, MapPin, Save,
} from "lucide-react";

// ── Country flag helper ────────────────────────────────────────────────────────

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ── Visibility config ──────────────────────────────────────────────────────────

const VISIBILITY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; desc: string }> = {
  hidden:    { label: "Masqué",     icon: EyeOff, color: "#9CA3AF", bg: "#F3F4F6", desc: "Invisible partout" },
  anonymous: { label: "Anonyme",    icon: Shield, color: "#D97706", bg: "#FFFBEB", desc: "Visible comme 'Partenaire vérifié'" },
  standard:  { label: "Standard",   icon: Eye,    color: "#2563EB", bg: "#EFF6FF", desc: "Nom + pays visible, logo masqué" },
  featured:  { label: "Mis en avant", icon: Crown, color: "#D4603A", bg: "#FEF2F0", desc: "Profil complet + priorité d'affichage" },
};

const PLAN_VISIBILITY: Record<string, string> = {
  starter: "anonymous",
  growth: "standard",
  elite: "featured",
};

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function AdminPartnerVisibility() {
  const { data: partners = [], isLoading } = useAllPartnersAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = partners.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const updatePartner = async (partnerId: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from("partners")
      .update(updates)
      .eq("id", partnerId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Partenaire mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg text-foreground">Visibilité des partenaires</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">
          Gérez la visibilité de chaque fournisseur. Le niveau par défaut dépend de leur plan, mais vous pouvez le surcharger.
        </p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(VISIBILITY_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border" style={{ background: cfg.bg }}>
            <cfg.icon className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} />
            <div>
              <p className="text-[10px] font-display font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-[8px] font-body text-muted-foreground">{cfg.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un partenaire…"
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40"
        />
      </div>

      {/* Partner list */}
      <div className="space-y-2">
        {filtered.map((p: any) => {
          const isExpanded = expandedId === p.id;
          const vis = VISIBILITY_CONFIG[p.visibility_level || "standard"];
          const defaultVis = PLAN_VISIBILITY[p.plan] || "standard";
          const isOverridden = p.admin_visibility_override;

          return (
            <div key={p.id} className="border border-border rounded-xl overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-card/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                {/* Logo / Flag */}
                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">{countryFlag(p.country_code)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-display font-bold text-foreground truncate">{p.name}</p>
                    {p.country_code && <span className="text-sm">{countryFlag(p.country_code)}</span>}
                    {isOverridden && (
                      <span className="text-[8px] font-display font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                        Override
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {p.city || "—"} · Plan {p.plan || "—"}
                    {p.avgRating && (
                      <span className="ml-1.5">
                        <Star className="h-2.5 w-2.5 inline text-amber-500 fill-amber-500" /> {p.avgRating} ({p.totalRatings})
                      </span>
                    )}
                  </p>
                </div>

                {/* Visibility badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[9px] font-display font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1"
                    style={{ background: vis.bg, color: vis.color }}
                  >
                    <vis.icon className="h-3 w-3" /> {vis.label}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-4">
                  {/* Visibility controls */}
                  <div className="mt-3">
                    <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Niveau de visibilité
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(VISIBILITY_CONFIG).map(([key, cfg]) => {
                        const isActive = (p.visibility_level || "standard") === key;
                        const isDefault = defaultVis === key;
                        return (
                          <button
                            key={key}
                            onClick={() => updatePartner(p.id, {
                              visibility_level: key,
                              admin_visibility_override: key !== defaultVis,
                            })}
                            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border-2 transition-all text-center ${
                              isActive
                                ? "border-foreground bg-foreground/5"
                                : "border-border hover:border-foreground/20"
                            }`}
                          >
                            <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                            <span className="text-[9px] font-display font-bold" style={{ color: isActive ? cfg.color : undefined }}>
                              {cfg.label}
                            </span>
                            {isDefault && (
                              <span className="text-[7px] font-body text-muted-foreground">défaut plan</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Partner details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                    <div>
                      <p className="font-display font-semibold text-muted-foreground uppercase tracking-wider">Pays</p>
                      <p className="font-body text-foreground mt-0.5">{countryFlag(p.country_code)} {p.country || "—"}</p>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-muted-foreground uppercase tracking-wider">Ville</p>
                      <p className="font-body text-foreground mt-0.5">{p.city || "—"}</p>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-muted-foreground uppercase tracking-wider">Note moyenne</p>
                      <p className="font-body text-foreground mt-0.5">
                        {p.avgRating ? `${p.avgRating}/5 (${p.totalRatings} avis)` : "Pas encore noté"}
                      </p>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-muted-foreground uppercase tracking-wider">Actif</p>
                      <p className="font-body text-foreground mt-0.5">{p.is_active ? "✅ Oui" : "❌ Non"}</p>
                    </div>
                  </div>

                  {/* Admin notes */}
                  <div>
                    <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes admin</p>
                    <textarea
                      defaultValue={p.admin_notes || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (p.admin_notes || "")) {
                          updatePartner(p.id, { admin_notes: e.target.value });
                        }
                      }}
                      placeholder="Notes internes sur ce partenaire…"
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40 resize-none"
                    />
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => updatePartner(p.id, { is_active: !p.is_active })}
                      className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        p.is_active
                          ? "border-red-200 text-red-700 hover:bg-red-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {p.is_active ? "Désactiver" : "Réactiver"}
                    </button>
                    <button
                      onClick={() => updatePartner(p.id, {
                        visibility_level: defaultVis,
                        admin_visibility_override: false,
                      })}
                      className="text-[10px] font-display font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Remettre visibilité par défaut
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

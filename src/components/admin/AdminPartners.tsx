import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Search, Eye, ArrowLeft, Globe, MapPin,
  Award, Package, Truck,
} from "lucide-react";

type Partner = {
  id: string;
  slug: string;
  name: string;
  partner_type: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  coverage_zone: string | null;
  materials: string[];
  specialties: string[];
  certifications: string[];
  project_types: string[];
  production_capacity: string | null;
  partner_subtype: string | null;
  is_public: boolean;
  is_featured: boolean;
  priority_order: number | null;
  created_at: string;
  updated_at: string;
};

export default function AdminPartners() {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Partner | null>(null);

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ["admin_partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });

  // Get product counts per partner
  const { data: productCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["admin_partner_product_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("supplier_internal");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (p.supplier_internal) counts[p.supplier_internal] = (counts[p.supplier_internal] || 0) + 1;
      });
      return counts;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Get offer counts per partner
  const { data: offerCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["admin_partner_offer_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("partner_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((o: any) => {
        if (o.partner_id) counts[o.partner_id] = (counts[o.partner_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 1000 * 60 * 5,
  });

  const types = [...new Set(partners.map(p => p.partner_type).filter(Boolean))];

  const filtered = partners.filter(p => {
    const matchText = !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.city || "").toLowerCase().includes(filter.toLowerCase()) ||
      (p.country || "").toLowerCase().includes(filter.toLowerCase());
    const matchType = typeFilter === "all" || p.partner_type === typeFilter;
    return matchText && matchType;
  });

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Chargement...</p>;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour
        </button>

        <div className="flex items-start gap-4 mb-6">
          {selected.logo_url && (
            <img src={selected.logo_url} alt="" className="w-12 h-12 rounded-sm object-cover bg-card border border-border" />
          )}
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{selected.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 capitalize">
                {selected.partner_type}
              </span>
              {selected.is_public && (
                <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                  Public
                </span>
              )}
              {selected.is_featured && (
                <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  Mis en avant
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Info */}
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Informations générales</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Slug", value: selected.slug },
                { label: "Ville", value: selected.city },
                { label: "Pays", value: selected.country },
                { label: "Zone de couverture", value: selected.coverage_zone },
                { label: "Sous-type", value: selected.partner_subtype },
                { label: "Capacité de production", value: selected.production_capacity },
                { label: "Site web", value: selected.website },
                { label: "Produits associés", value: String(productCounts[selected.slug] || 0) },
                { label: "Offres", value: String(offerCounts[selected.id] || 0) },
              ].filter(({ value }) => value && value !== "null").map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</span>
                  <p className="text-sm font-body text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {selected.description && (
            <div className="border border-border rounded-sm p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">Description</h3>
              <p className="text-sm font-body text-muted-foreground">{selected.description}</p>
            </div>
          )}

          {/* Tags */}
          <div className="grid grid-cols-2 gap-4">
            {selected.materials?.length > 0 && (
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                  <Package className="h-3 w-3" /> Matériaux
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selected.materials.map(m => (
                    <span key={m} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{m}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.specialties?.length > 0 && (
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                  <Award className="h-3 w-3" /> Spécialités
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selected.specialties.map(s => (
                    <span key={s} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.certifications?.length > 0 && (
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                  <Award className="h-3 w-3" /> Certifications
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selected.certifications.map(c => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.project_types?.length > 0 && (
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                  <Truck className="h-3 w-3" /> Types de projets
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selected.project_types.map(t => (
                    <span key={t} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text" value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Rechercher un fournisseur..."
            className="w-full bg-card border border-border rounded-sm pl-9 pr-4 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 mb-5 flex-wrap">
        <button onClick={() => setTypeFilter("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${
            typeFilter === "all" ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground"
          }`}>
          Tous
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${typeFilter === "all" ? "bg-white/20" : "bg-card"}`}>
            {partners.length}
          </span>
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all capitalize ${
              typeFilter === t ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground"
            }`}>
            {t}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${typeFilter === t ? "bg-white/20" : "bg-card"}`}>
              {partners.filter(p => p.partner_type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Aucun fournisseur trouvé.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Fournisseur", "Type", "Localisation", "Produits", "Offres", "Statut", ""].map(h => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(partner => (
                <tr key={partner.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {partner.logo_url ? (
                        <img src={partner.logo_url} alt="" className="w-7 h-7 rounded object-cover bg-card" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-card border border-border flex items-center justify-center">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-display font-semibold text-xs text-foreground">{partner.name}</p>
                        <p className="text-[10px] text-muted-foreground">{partner.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 rounded px-1.5 py-0.5 capitalize font-display font-semibold">
                      {partner.partner_type}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[partner.city, partner.country].filter(Boolean).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-muted-foreground">
                    {productCounts[partner.slug] || 0}
                  </td>
                  <td className="py-3 px-2 text-xs text-muted-foreground">
                    {offerCounts[partner.id] || 0}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      {partner.is_public && (
                        <span className="text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                          Public
                        </span>
                      )}
                      {partner.is_featured && (
                        <span className="text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                          Featured
                        </span>
                      )}
                      {!partner.is_public && !partner.is_featured && (
                        <span className="text-[9px] text-muted-foreground">Privé</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => setSelected(partner)}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

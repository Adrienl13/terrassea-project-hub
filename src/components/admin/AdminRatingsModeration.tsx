import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Star, Search, CheckCircle2, Trash2, Shield, AlertTriangle,
  Building2, User, Clock, Filter,
} from "lucide-react";

export default function AdminRatingsModeration() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");
  const [search, setSearch] = useState("");

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ["admin-ratings"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("partner_ratings" as any)
        .select("*, partner:partner_id(name, slug, country_code), user:user_id(first_name, last_name, email, company)")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const total = ratings.length;
  const verified = ratings.filter((r: any) => r.is_verified).length;
  const pending = total - verified;
  const avgRating = total > 0 ? (ratings.reduce((s: number, r: any) => s + r.rating, 0) / total).toFixed(1) : "—";

  const filtered = ratings.filter((r: any) => {
    if (filter === "pending" && r.is_verified) return false;
    if (filter === "verified" && !r.is_verified) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.partner?.name || "").toLowerCase().includes(q) ||
        (r.user?.first_name || "").toLowerCase().includes(q) ||
        (r.user?.email || "").toLowerCase().includes(q) ||
        (r.review || "").toLowerCase().includes(q);
    }
    return true;
  });

  const verifyRating = async (id: string) => {
    const { error } = await (supabase.from("partner_ratings" as any).update({ is_verified: true }).eq("id", id) as any);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Avis vérifié");
    queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  const unverifyRating = async (id: string) => {
    const { error } = await (supabase.from("partner_ratings" as any).update({ is_verified: false }).eq("id", id) as any);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Vérification retirée");
    queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  const deleteRating = async (id: string) => {
    if (!confirm("Supprimer cet avis ? Cette action est irréversible.")) return;
    const { error } = await (supabase.from("partner_ratings" as any).delete().eq("id", id) as any);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Avis supprimé");
    queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg">Modération des avis</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">Validez, rejetez ou supprimez les avis clients sur les fournisseurs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total avis" value={String(total)} icon={Star} color="#D97706" />
        <StatCard label="À vérifier" value={String(pending)} icon={Clock} color="#DC2626" />
        <StatCard label="Vérifiés" value={String(verified)} icon={CheckCircle2} color="#059669" />
        <StatCard label="Note moyenne" value={String(avgRating)} icon={Star} color="#D4603A" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par fournisseur, client, contenu…"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40" />
        </div>
        <div className="flex gap-1">
          {([
            { id: "all" as const, label: "Tous", count: total },
            { id: "pending" as const, label: "À vérifier", count: pending },
            { id: "verified" as const, label: "Vérifiés", count: verified },
          ]).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full transition-all ${
                filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"
              }`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Aucun avis avec ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <div key={r.id} className={`border rounded-xl p-4 ${r.is_verified ? "border-emerald-200 bg-emerald-50/20" : "border-border"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Partner */}
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-display font-bold text-foreground">{r.partner?.name || "—"}</span>
                    {r.is_verified && (
                      <span className="text-[8px] font-display font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Vérifié
                      </span>
                    )}
                  </div>

                  {/* Rating stars */}
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"}`} />
                    ))}
                    <span className="text-xs font-display font-bold ml-1">{r.rating}/5</span>
                  </div>

                  {/* Review text */}
                  {r.review && (
                    <p className="text-sm font-body text-muted-foreground italic mb-2">"{r.review}"</p>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-2 text-[10px] font-body text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{r.user?.first_name} {r.user?.last_name}</span>
                    <span>·</span>
                    <span>{r.user?.email}</span>
                    {r.user?.company && <><span>·</span><span>{r.user.company}</span></>}
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!r.is_verified ? (
                    <button onClick={() => verifyRating(r.id)}
                      className="flex items-center gap-1 text-[10px] font-display font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="h-3 w-3" /> Valider
                    </button>
                  ) : (
                    <button onClick={() => unverifyRating(r.id)}
                      className="flex items-center gap-1 text-[10px] font-display font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                      <AlertTriangle className="h-3 w-3" /> Retirer
                    </button>
                  )}
                  <button onClick={() => deleteRating(r.id)}
                    className="flex items-center gap-1 text-[10px] font-display font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-lg">{value}</p>
    </div>
  );
}

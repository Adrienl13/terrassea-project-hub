import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Search, Eye, Pencil, Save, X, ArrowLeft,
  Shield, Building2, Compass, User,
} from "lucide-react";
import { toast } from "sonner";

type UserProfile = {
  id: string;
  email: string;
  user_type: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  country: string | null;
  siren: string | null;
  created_at: string;
};

const USER_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  client:    { label: "Client",     icon: User,      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  partner:   { label: "Partenaire", icon: Building2,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  architect: { label: "Architecte", icon: Compass,    color: "text-purple-700",  bg: "bg-purple-50 border-purple-200" },
  admin:     { label: "Admin",      icon: Shield,     color: "text-red-700",     bg: "bg-red-50 border-red-200" },
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserProfile[];
    },
  });

  const filtered = users.filter(u => {
    const matchText = !filter ||
      (u.email || "").toLowerCase().includes(filter.toLowerCase()) ||
      (u.first_name || "").toLowerCase().includes(filter.toLowerCase()) ||
      (u.last_name || "").toLowerCase().includes(filter.toLowerCase()) ||
      (u.company || "").toLowerCase().includes(filter.toLowerCase());
    const matchType = typeFilter === "all" || u.user_type === typeFilter;
    return matchText && matchType;
  });

  const counts = {
    all: users.length,
    client: users.filter(u => u.user_type === "client").length,
    partner: users.filter(u => u.user_type === "partner").length,
    architect: users.filter(u => u.user_type === "architect").length,
    admin: users.filter(u => u.user_type === "admin").length,
  };

  const handleEdit = (user: UserProfile) => {
    setEditForm({ ...user });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.id) return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          company: editForm.company,
          phone: editForm.phone,
          country: editForm.country,
          user_type: editForm.user_type as any,
        })
        .eq("id", editForm.id);
      if (error) throw error;
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setEditing(false);
      setSelected(prev => prev ? { ...prev, ...editForm } as UserProfile : null);
    } catch (err: any) {
      toast.error(err.message || "Erreur de mise à jour");
    }
  };

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Chargement...</p>;

  // Detail view
  if (selected) {
    const cfg = USER_TYPE_CONFIG[selected.user_type] || USER_TYPE_CONFIG.client;
    const TypeIcon = cfg.icon;

    return (
      <div>
        <button onClick={() => { setSelected(null); setEditing(false); }}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg}`}>
            <TypeIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
            <span className={`text-[10px] font-display font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
          <span className="text-[10px] font-body text-muted-foreground">
            Inscrit le {new Date(selected.created_at).toLocaleDateString("fr-FR")}
          </span>
        </div>

        {editing ? (
          <div className="space-y-5 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Prénom</label>
                <input
                  value={editForm.first_name || ""}
                  onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Nom</label>
                <input
                  value={editForm.last_name || ""}
                  onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Email</label>
              <input value={selected.email} disabled
                className="w-full bg-muted border border-border rounded-sm px-3 py-2 text-sm font-body text-muted-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Entreprise</label>
                <input
                  value={editForm.company || ""}
                  onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Téléphone</label>
                <input
                  value={editForm.phone || ""}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Pays</label>
                <input
                  value={editForm.country || ""}
                  onChange={e => setEditForm(p => ({ ...p, country: e.target.value }))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-body text-muted-foreground block mb-1">Type</label>
                <select
                  value={editForm.user_type || "client"}
                  onChange={e => setEditForm(p => ({ ...p, user_type: e.target.value }))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="client">Client</option>
                  <option value="partner">Partenaire</option>
                  <option value="architect">Architecte</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
              <button onClick={() => setEditing(false)}
                className="px-5 py-2.5 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="border border-border rounded-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm text-foreground">Informations</h3>
                <button onClick={() => handleEdit(selected)}
                  className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3 w-3" /> Modifier
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Prénom", value: selected.first_name },
                  { label: "Nom", value: selected.last_name },
                  { label: "Email", value: selected.email },
                  { label: "Téléphone", value: selected.phone },
                  { label: "Entreprise", value: selected.company },
                  { label: "Pays", value: selected.country },
                  { label: "SIREN", value: selected.siren },
                  { label: "Type", value: cfg.label },
                ].filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</span>
                    <p className="text-sm font-body text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
            placeholder="Rechercher un utilisateur..."
            className="w-full bg-card border border-border rounded-sm pl-9 pr-4 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {[
          { id: "all", label: "Tous" },
          { id: "client", label: "Clients" },
          { id: "partner", label: "Partenaires" },
          { id: "architect", label: "Architectes" },
          { id: "admin", label: "Admins" },
        ].map(f => (
          <button key={f.id} onClick={() => setTypeFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${
              typeFilter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground"
            }`}>
            {f.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${typeFilter === f.id ? "bg-white/20" : "bg-card"}`}>
              {counts[f.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Aucun utilisateur trouvé.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Nom", "Email", "Entreprise", "Pays", "Type", ""].map(h => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const cfg = USER_TYPE_CONFIG[user.user_type] || USER_TYPE_CONFIG.client;
                return (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="py-3 px-2 text-[10px] text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-display font-semibold text-xs text-foreground">
                        {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{user.company || "—"}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{user.country || "—"}</td>
                    <td className="py-3 px-2">
                      <span className={`text-[9px] font-display font-semibold px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => setSelected(user)}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

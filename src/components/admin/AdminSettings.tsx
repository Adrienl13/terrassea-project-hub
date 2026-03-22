import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Save, Percent, CreditCard, Mail, Globe, Package, FileText, Clock, Sparkles } from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  features:   { label: "Fonctionnalités", icon: Sparkles, color: "#8B5CF6" },
  commission: { label: "Commissions", icon: Percent, color: "#D4603A" },
  orders:     { label: "Commandes & Livraisons", icon: CreditCard, color: "#2563EB" },
  quotes:     { label: "Devis & Signatures", icon: FileText, color: "#7C3AED" },
  plans:      { label: "Plans partenaires", icon: Package, color: "#059669" },
  payment:    { label: "Paiement", icon: CreditCard, color: "#059669" },
  email:      { label: "Emails", icon: Mail, color: "#D97706" },
  general:    { label: "Général", icon: Globe, color: "#6B7280" },
  shipping:   { label: "Livraison", icon: Clock, color: "#0891B2" },
};

const CATEGORY_ORDER = ["features", "commission", "orders", "quotes", "plans", "payment", "email", "general", "shipping"];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .order("category");
      if (error) throw error;
      return data || [];
    },
  });

  const grouped: Record<string, any[]> = {};
  settings.forEach((s: any) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  const handleSave = async (key: string, value: string) => {
    // Parse value: try number, then boolean, then keep as string
    let jsonValue: any = value;
    if (value === "true") jsonValue = true;
    else if (value === "false") jsonValue = false;
    else if (!isNaN(Number(value)) && value.trim() !== "") jsonValue = Number(value);
    else jsonValue = value;

    const { error } = await supabase
      .from("platform_settings")
      .update({ value: jsonValue, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("key", key);

    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Paramètre mis à jour");
    queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    setEditedValues(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const getDisplayValue = (setting: any): string => {
    const val = setting.value;
    if (typeof val === "string") return val;
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  };

  const isBoolean = (setting: any) => typeof setting.value === "boolean";
  const isNumber = (setting: any) => typeof setting.value === "number";

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display font-bold text-lg">Configuration de la plateforme</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">
          Ces paramètres affectent le fonctionnement global de Terrassea. Les modifications prennent effet immédiatement.
        </p>
      </div>

      {CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(cat => {
        const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
        return (
          <div key={cat} className="border border-border rounded-xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-2 px-5 py-3 bg-card border-b border-border">
              <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
              <h3 className="font-display font-bold text-sm">{cfg.label}</h3>
            </div>

            {/* Settings rows */}
            <div className="divide-y divide-border">
              {grouped[cat].map((setting: any) => {
                const currentEdit = editedValues[setting.key];
                const displayValue = currentEdit !== undefined ? currentEdit : getDisplayValue(setting);
                const hasChanged = currentEdit !== undefined && currentEdit !== getDisplayValue(setting);

                return (
                  <div key={setting.key} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-display font-semibold text-foreground">{setting.label || setting.key}</p>
                      <p className="text-[9px] font-body text-muted-foreground font-mono">{setting.key}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isBoolean(setting) ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displayValue === "true"}
                            onChange={(e) => handleSave(setting.key, e.target.checked ? "true" : "false")}
                            className="rounded border-border"
                          />
                          <span className="text-xs font-body">{displayValue === "true" ? "Activé" : "Désactivé"}</span>
                        </label>
                      ) : (
                        <>
                          <input
                            type={isNumber(setting) ? "number" : "text"}
                            value={displayValue}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(setting.key, displayValue); }}
                            className="w-40 px-3 py-1.5 border border-border rounded-lg text-sm font-body text-right focus:outline-none focus:border-foreground/40"
                          />
                          {hasChanged && (
                            <button
                              onClick={() => handleSave(setting.key, displayValue)}
                              className="flex items-center gap-1 text-[10px] font-display font-semibold text-[#D4603A] hover:underline"
                            >
                              <Save className="h-3 w-3" /> Sauver
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
        <Settings className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-blue-700">
          Les taux de commission par plan sont appliqués à la création de chaque commande. Modifier un taux ici n'affecte pas les commandes existantes.
        </p>
      </div>
    </div>
  );
}

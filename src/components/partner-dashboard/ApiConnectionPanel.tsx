import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X, Copy, Check, Eye, EyeOff, RefreshCw, Loader2,
  Zap, Globe, Shield, Clock, AlertTriangle, CheckCircle2,
  XCircle, ArrowDownUp, Server, Key, Link2, Settings2,
  ChevronDown, ChevronUp, Code2, Info,
} from "lucide-react";
import { PLAN_CONFIG, type PartnerPlan } from "./PartnerSections";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApiConnection {
  id: string;
  partner_id: string;
  sync_mode: "push" | "pull" | "both";
  terrassea_api_key: string;
  webhook_secret: string;
  external_api_url: string | null;
  external_api_key: string | null;
  external_api_headers: Record<string, string>;
  pull_interval_minutes: number;
  field_mapping: {
    sku_field: string;
    stock_field: string;
    price_field: string;
    status_field: string;
  };
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: "success" | "error" | "partial" | null;
  last_sync_message: string | null;
  last_sync_products_count: number;
  total_syncs: number;
  consecutive_errors: number;
}

interface SyncLog {
  id: string;
  sync_mode: string;
  status: string;
  products_updated: number;
  products_failed: number;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ApiConnectionPanel({
  plan,
  partnerId,
  onClose,
}: {
  plan: PartnerPlan;
  partnerId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const config = PLAN_CONFIG[plan];
  const isElite = plan === "elite";

  const [connection, setConnection] = useState<ApiConnection | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showExternalKey, setShowExternalKey] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state for editing
  const [syncMode, setSyncMode] = useState<"push" | "pull" | "both">("push");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalKey, setExternalKey] = useState("");
  const [pullInterval, setPullInterval] = useState(60);
  const [fieldMapping, setFieldMapping] = useState({
    sku_field: "sku",
    stock_field: "quantity",
    price_field: "price",
    status_field: "status",
  });

  // ── Load connection ──

  useEffect(() => {
    loadConnection();
  }, [partnerId]);

  const loadConnection = async () => {
    if (!partnerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("partner_api_connections")
      .select("*")
      .eq("partner_id", partnerId)
      .maybeSingle();

    if (data) {
      setConnection(data as any);
      setSyncMode(data.sync_mode as any);
      setExternalUrl(data.external_api_url || "");
      setExternalKey(data.external_api_key || "");
      setPullInterval(data.pull_interval_minutes || 60);
      if (data.field_mapping) setFieldMapping(data.field_mapping as any);

      // Load logs
      const { data: logsData } = await supabase
        .from("stock_sync_logs")
        .select("id, sync_mode, status, products_updated, products_failed, error_message, duration_ms, created_at")
        .eq("connection_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setLogs((logsData || []) as SyncLog[]);
    }

    setLoading(false);
  };

  // ── Create / Update connection ──

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        partner_id: partnerId,
        sync_mode: syncMode,
        external_api_url: externalUrl || null,
        external_api_key: externalKey || null,
        pull_interval_minutes: pullInterval,
        field_mapping: fieldMapping,
        updated_at: new Date().toISOString(),
      };

      if (connection) {
        const { error } = await supabase
          .from("partner_api_connections")
          .update(payload)
          .eq("id", connection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("partner_api_connections")
          .insert({ ...payload, is_active: false });
        if (error) throw error;
      }

      await loadConnection();
      toast.success(t('api.toast.saved'));
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!connection) return;

    // Validate before activating
    if (!connection.is_active) {
      if ((syncMode === "pull" || syncMode === "both") && !externalUrl) {
        toast.error(t('api.toast.missingUrl'));
        return;
      }
    }

    const { error } = await supabase
      .from("partner_api_connections")
      .update({ is_active: !connection.is_active, updated_at: new Date().toISOString() })
      .eq("id", connection.id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(connection.is_active ? t('api.toast.deactivated') : t('api.toast.activated'));
      await loadConnection();
    }
  };

  const regenerateKey = async () => {
    if (!connection) return;
    if (!confirm("Régénérer la clé API ? L'ancienne clé cessera de fonctionner immédiatement.")) return;

    const { error } = await supabase.rpc("gen_random_uuid"); // just to test
    // Actually update with a new key
    const { error: updateErr } = await supabase
      .from("partner_api_connections")
      .update({
        terrassea_api_key: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    if (updateErr) {
      toast.error("Erreur : " + updateErr.message);
    } else {
      toast.success("Nouvelle clé API générée.");
      await loadConnection();
    }
  };

  // ── Helpers ──

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copié !`);
  };

  const webhookUrl = `${window.location.origin.replace('localhost:5173', '<your-supabase-project>.supabase.co')}/functions/v1/stock-sync-webhook`;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-background rounded-sm p-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-background border border-border rounded-sm shadow-xl w-full max-w-2xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />
              {t('api.title')}
            </h2>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              {t('api.subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Elite gate */}
          {!isElite && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-sm border-2 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-display font-semibold text-amber-700">{t('api.elite.gate')}</p>
                <p className="text-[10px] font-body text-amber-600 mt-0.5 leading-relaxed">
                  {t('api.elite.gateMsg')}
                </p>
              </div>
            </div>
          )}

          {/* Status banner if connection exists */}
          {connection && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-sm border ${
              connection.is_active
                ? connection.last_sync_status === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
                : "border-border bg-card"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  connection.is_active
                    ? connection.last_sync_status === "error" ? "bg-red-500" : "bg-green-500 animate-pulse"
                    : "bg-muted-foreground"
                }`} />
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">
                    {connection.is_active ? t('api.status.active') : t('api.status.inactive')}
                  </p>
                  {connection.last_sync_at && (
                    <p className="text-[9px] font-body text-muted-foreground">
                      Dernière sync : {new Date(connection.last_sync_at).toLocaleString("fr-FR")}
                      {connection.last_sync_products_count > 0 && ` · ${connection.last_sync_products_count} produits`}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={toggleActive}
                disabled={!isElite && !connection.is_active}
                className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-full transition-colors ${
                  connection.is_active
                    ? "border border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                    : "bg-foreground text-primary-foreground hover:opacity-90 disabled:opacity-50"
                }`}
              >
                {connection.is_active ? t('api.status.disable') : t('api.status.enable')}
              </button>
            </div>
          )}

          {/* Sync mode selector */}
          <div>
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Mode de synchronisation
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "push" as const, label: "Push (recommandé)", desc: "Votre système nous envoie les MAJ", icon: Server },
                { value: "pull" as const, label: "Pull", desc: "On interroge votre API", icon: Globe },
                { value: "both" as const, label: "Les deux", desc: "Push + Pull de secours", icon: ArrowDownUp },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSyncMode(opt.value)}
                  className={`p-3 border rounded-sm text-left transition-colors ${
                    syncMode === opt.value
                      ? "border-foreground bg-card"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <opt.icon className={`h-4 w-4 mb-1.5 ${syncMode === opt.value ? "text-foreground" : "text-muted-foreground"}`} />
                  <p className="text-[10px] font-display font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[9px] font-body text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* PUSH configuration */}
          {(syncMode === "push" || syncMode === "both") && (
            <div className="space-y-3">
              <p className="text-xs font-display font-semibold text-foreground flex items-center gap-2">
                <Server className="h-3.5 w-3.5" /> Configuration Push
              </p>
              <p className="text-[10px] font-body text-muted-foreground">
                Utilisez ces identifiants pour envoyer vos mises à jour de stock à Terrassea.
              </p>

              {/* Webhook URL */}
              <div>
                <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  URL du Webhook
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-card border border-border rounded-sm px-3 py-2 text-[11px] font-mono text-foreground truncate">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(webhookUrl, "URL")}
                    className="p-2 border border-border rounded-sm hover:border-foreground transition-colors shrink-0"
                  >
                    {copied === "URL" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* API Key */}
              {connection?.terrassea_api_key && (
                <div>
                  <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Votre clé API Terrassea
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <code className="block bg-card border border-border rounded-sm px-3 py-2 text-[11px] font-mono text-foreground truncate">
                        {showApiKey ? connection.terrassea_api_key : "••••••••••••••••••••••••••••••••"}
                      </code>
                    </div>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 border border-border rounded-sm hover:border-foreground transition-colors shrink-0"
                    >
                      {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(connection.terrassea_api_key, "Clé API")}
                      className="p-2 border border-border rounded-sm hover:border-foreground transition-colors shrink-0"
                    >
                      {copied === "Clé API" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={regenerateKey}
                      className="p-2 border border-border rounded-sm hover:border-foreground transition-colors shrink-0"
                      title="Régénérer la clé"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* API Documentation toggle */}
              <button
                onClick={() => setShowDocs(!showDocs)}
                className="flex items-center gap-2 text-[10px] font-display font-semibold text-foreground"
              >
                <Code2 className="h-3 w-3" /> Documentation de l'API
                {showDocs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showDocs && (
                <div className="bg-card border border-border rounded-sm p-4 space-y-3">
                  <p className="text-[10px] font-display font-semibold text-foreground">Requête HTTP</p>
                  <pre className="bg-foreground text-primary-foreground rounded-sm p-3 text-[10px] font-mono overflow-x-auto whitespace-pre">{`POST ${webhookUrl}
Headers:
  Content-Type: application/json
  X-Api-Key: <votre_clé_api>

Body:
{
  "products": [
    {
      "sku": "RIV-001",
      "quantity": 150,
      "price": 140.00,
      "status": "in_stock",
      "delivery_days": 5
    },
    {
      "sku": "PAR-003",
      "quantity": 0,
      "status": "out_of_stock"
    }
  ]
}`}</pre>
                  <p className="text-[10px] font-display font-semibold text-foreground">Réponse</p>
                  <pre className="bg-foreground text-primary-foreground rounded-sm p-3 text-[10px] font-mono overflow-x-auto whitespace-pre">{`{
  "success": true,
  "updated": 2,
  "failed": 0,
  "total": 2,
  "errors": [],
  "duration_ms": 234
}`}</pre>
                  <div className="text-[9px] font-body text-muted-foreground space-y-1">
                    <p><strong>sku</strong> : correspond au champ "Référence partenaire" de vos offres produits</p>
                    <p><strong>quantity</strong> : quantité en stock (le statut est déduit automatiquement si omis)</p>
                    <p><strong>price</strong> : prix HT unitaire (optionnel, met à jour le prix de l'offre)</p>
                    <p><strong>status</strong> : in_stock, low_stock, out_of_stock, discontinued (optionnel)</p>
                    <p><strong>delivery_days</strong> : délai de livraison en jours (optionnel)</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PULL configuration */}
          {(syncMode === "pull" || syncMode === "both") && (
            <div className="space-y-3">
              <p className="text-xs font-display font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" /> Configuration Pull
              </p>
              <p className="text-[10px] font-body text-muted-foreground">
                Renseignez l'URL de votre API de stock. Terrassea interrogera votre système à intervalle régulier.
              </p>

              <div>
                <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  URL de votre API de stock
                </label>
                <input
                  value={externalUrl}
                  onChange={e => setExternalUrl(e.target.value)}
                  placeholder="https://votre-erp.com/api/v1/stock"
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Clé API de votre système
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showExternalKey ? "text" : "password"}
                    value={externalKey}
                    onChange={e => setExternalKey(e.target.value)}
                    placeholder="Votre clé API / token d'accès"
                    className="flex-1 bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                  />
                  <button
                    onClick={() => setShowExternalKey(!showExternalKey)}
                    className="p-2 border border-border rounded-sm hover:border-foreground transition-colors shrink-0"
                  >
                    {showExternalKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Fréquence de synchronisation
                </label>
                <select
                  value={pullInterval}
                  onChange={e => setPullInterval(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value={5}>Toutes les 5 minutes</option>
                  <option value={15}>Toutes les 15 minutes</option>
                  <option value={30}>Toutes les 30 minutes</option>
                  <option value={60}>Toutes les heures</option>
                  <option value={360}>Toutes les 6 heures</option>
                  <option value={1440}>Une fois par jour</option>
                </select>
              </div>

              {/* Field mapping */}
              <div>
                <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Mapping des champs (noms des champs dans votre API)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "sku_field" as const, label: "Champ SKU / Référence", placeholder: "sku" },
                    { key: "stock_field" as const, label: "Champ quantité stock", placeholder: "quantity" },
                    { key: "price_field" as const, label: "Champ prix", placeholder: "price" },
                    { key: "status_field" as const, label: "Champ statut", placeholder: "status" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[9px] font-body text-muted-foreground block mb-0.5">{f.label}</label>
                      <input
                        value={fieldMapping[f.key]}
                        onChange={e => setFieldMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full bg-card border border-border rounded-sm px-2.5 py-1.5 text-[11px] font-mono outline-none focus:ring-1 focus:ring-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sync logs */}
          {connection && logs.length > 0 && (
            <div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-2 text-[10px] font-display font-semibold text-foreground"
              >
                <Clock className="h-3 w-3" /> Historique des synchronisations ({connection.total_syncs} total)
                {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showLogs && (
                <div className="mt-2 border border-border rounded-sm overflow-hidden">
                  <table className="w-full text-[10px] font-body">
                    <thead className="bg-card">
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Mode</th>
                        <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Statut</th>
                        <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">MAJ</th>
                        <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-card/50">
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-3 py-2">{log.sync_mode}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full ${
                              log.status === "success" ? "bg-green-50 text-green-700" :
                              log.status === "partial" ? "bg-amber-50 text-amber-700" :
                              "bg-red-50 text-red-600"
                            }`}>
                              {log.status === "success" ? <CheckCircle2 className="h-2.5 w-2.5" /> :
                               log.status === "partial" ? <AlertTriangle className="h-2.5 w-2.5" /> :
                               <XCircle className="h-2.5 w-2.5" />}
                              {log.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {log.products_updated}
                            {log.products_failed > 0 && <span className="text-red-500"> / {log.products_failed} err</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {connection ? "Mettre à jour" : "Configurer la connexion"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, Mail, Building2, FileText, Loader2, Inbox } from "lucide-react";

interface CatalogLead {
  id: string;
  partner_id: string;
  catalog_id: string;
  catalog_title: string | null;
  name: string | null;
  email: string;
  company: string | null;
  locale: string | null;
  created_at: string;
  partner: { name: string | null; slug: string | null } | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toCsv(rows: CatalogLead[]): string {
  const header = ["Date", "Partenaire", "Catalogue", "Nom", "Email", "Société", "Langue"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      formatDate(r.created_at),
      r.partner?.name ?? r.partner_id,
      r.catalog_title ?? r.catalog_id,
      r.name ?? "",
      r.email,
      r.company ?? "",
      r.locale ?? "",
    ].map((v) => esc(String(v))).join(","),
  );
  return [header.map(esc).join(","), ...lines].join("\n");
}

export default function AdminCatalogLeads() {
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<CatalogLead[]>({
    queryKey: ["catalog-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_leads")
        .select("id, partner_id, catalog_id, catalog_title, name, email, company, locale, created_at, partner:partners(name, slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CatalogLead[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.email, l.name, l.company, l.catalog_title, l.partner?.name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [leads, search]);

  const exportCsv = () => {
    const csv = toCsv(filtered);
    // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalog-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-base text-foreground">Leads — téléchargements de catalogue</h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            Contacts ayant téléchargé un catalogue PDF sur une page partenaire / marque.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Exporter CSV ({filtered.length})
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (email, nom, société, catalogue, marque)…"
          className="w-full text-sm font-body bg-white border border-border rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <Inbox className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-display font-semibold text-foreground mb-1">
            {leads.length === 0 ? "Aucun lead pour l'instant" : "Aucun résultat"}
          </p>
          <p className="text-xs font-body text-muted-foreground max-w-xs">
            {leads.length === 0
              ? "Les contacts apparaîtront ici dès qu'un visiteur télécharge un catalogue."
              : "Aucun lead ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-border rounded-lg px-4 py-3 hover:border-foreground/20 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-foreground truncate">{l.name || "—"}</span>
                  <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-xs font-body text-[#D4603A] hover:underline truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" /> {l.email}
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] font-body text-muted-foreground">
                  {l.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {l.company}</span>}
                  <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3 text-[#D4603A]" /> {l.catalog_title || l.catalog_id}</span>
                  <span className="font-semibold text-foreground/70">{l.partner?.name || l.partner_id}</span>
                  {l.locale && <span className="uppercase">{l.locale}</span>}
                </div>
              </div>
              <span className="text-[11px] font-body text-muted-foreground whitespace-nowrap">{formatDate(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

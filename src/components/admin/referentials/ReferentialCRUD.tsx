// ============================================================================
// ReferentialCRUD — generic admin CRUD for material_brands / certifications /
// (future) colors_canonical, finishes_canonical
// ÉTAPE 8b (2026-05-05).
//
// Renders:
//   - Table list with slug / name / category badge / # FK references
//   - "Add" button → Sheet drawer in create mode
//   - Click row → Sheet drawer in edit mode
//   - Common form fields: slug (auto from name), name, category, description_i18n
//     (en/fr/it/es), logo_url, official_website
//   - Caller-provided extra fields via `extraFormFields` render prop
//   - Delete with FK guard: blocks if `referencedBy` count > 0
//
// Pure helpers (validateSlugFormat, fkRefCount) extracted for unit tests.
// ============================================================================

import { useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ZodSchema } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { slugify } from "@/lib/slug";
import {
  baseReferentialSchema,
  type ReferentialRow,
  type FKReference,
} from "@/lib/referentials/referentialSchema";

// ── Component props (only export now) ───────────────────────────────────────

interface ReferentialCRUDProps<TExtra extends Record<string, unknown>> {
  tableName: "material_brands" | "certifications";
  title: string;
  /** Allowed values for the `category` column (CHECK constraint mirror). */
  categoryEnum: readonly string[];
  /** Zod schema for caller-specific fields (merged into the unified form schema). */
  extraSchema: ZodSchema<TExtra>;
  /** Default values for caller-specific fields (used when creating a new row). */
  extraDefaults: TExtra;
  /** Render prop for caller-specific form fields (Checkbox/Combobox/etc.). */
  extraFormFields: (
    extra: TExtra,
    setExtra: (next: Partial<TExtra>) => void,
  ) => ReactNode;
  /** FKs entrantes — checked before DELETE, blocks if any count > 0. */
  referencedBy: FKReference[];
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ReferentialCRUD<TExtra extends Record<string, unknown>>({
  tableName,
  title,
  categoryEnum,
  extraSchema,
  extraDefaults,
  extraFormFields,
  referencedBy,
}: ReferentialCRUDProps<TExtra>) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ReferentialRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch all rows ────────────────────────────────────────────────────────
  const { data: rows = [], isLoading } = useQuery<ReferentialRow[]>({
    queryKey: ["referentials", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ReferentialRow[];
    },
  });

  const grouped: Record<string, ReferentialRow[]> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  // ── FK reference count for delete guard ───────────────────────────────────
  async function countReferences(rowId: string): Promise<{ table: string; label: string; count: number }[]> {
    const out: { table: string; label: string; count: number }[] = [];
    for (const ref of referencedBy) {
      const { count } = await supabase
        .from(ref.table)
        .select("id", { count: "exact", head: true })
        .eq(ref.column, rowId);
      out.push({ table: ref.table, label: ref.label, count: count ?? 0 });
    }
    return out;
  }

  async function handleDelete(rowId: string) {
    const refs = await countReferences(rowId);
    const blocking = refs.filter((r) => r.count > 0);
    if (blocking.length > 0) {
      const summary = blocking.map((r) => `${r.count} ${r.label}`).join(", ");
      toast.error(`Suppression impossible : référencé par ${summary}`);
      setDeletingId(null);
      return;
    }
    const { error } = await supabase.from(tableName).delete().eq("id", rowId);
    if (error) {
      toast.error("Erreur suppression : " + error.message);
      setDeletingId(null);
      return;
    }
    toast.success("Supprimé");
    setDeletingId(null);
    queryClient.invalidateQueries({ queryKey: ["referentials", tableName] });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            {rows.length} entrée{rows.length > 1 ? "s" : ""} · catégories : {categoryEnum.join(", ")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-muted-foreground text-sm">Chargement…</p>}

      {/* Grouped table */}
      {!isLoading &&
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-muted/40 border-b border-border">
              <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-foreground">
                {cat} <span className="text-muted-foreground">({list.length})</span>
              </span>
            </div>
            <div className="divide-y divide-border">
              {list.map((row) => (
                <div key={row.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-sm truncate">{row.name}</span>
                      <Badge variant="outline" className="text-[10px]">{row.slug}</Badge>
                      {Boolean((row as { is_premium?: boolean }).is_premium) && (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">premium</Badge>
                      )}
                    </div>
                    {row.official_website && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{row.official_website}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(row)} title="Editer">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(row.id)}
                    className="text-destructive hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* Edit / Create Sheet */}
      <ReferentialFormSheet
        open={createOpen || editing !== null}
        mode={editing ? "edit" : "create"}
        row={editing}
        title={title}
        tableName={tableName}
        categoryEnum={categoryEnum}
        extraSchema={extraSchema}
        extraDefaults={extraDefaults}
        extraFormFields={extraFormFields}
        onClose={() => {
          setEditing(null);
          setCreateOpen(false);
        }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["referentials", tableName] });
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La suppression sera bloquée si l'entrée est référencée par d'autres tables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Form Sheet (internal sub-component) ─────────────────────────────────────

interface FormSheetProps<TExtra extends Record<string, unknown>> {
  open: boolean;
  mode: "create" | "edit";
  row: ReferentialRow | null;
  title: string;
  tableName: string;
  categoryEnum: readonly string[];
  extraSchema: ZodSchema<TExtra>;
  extraDefaults: TExtra;
  extraFormFields: (
    extra: TExtra,
    setExtra: (next: Partial<TExtra>) => void,
  ) => ReactNode;
  onClose: () => void;
  onSaved: () => void;
}

function ReferentialFormSheet<TExtra extends Record<string, unknown>>({
  open,
  mode,
  row,
  title,
  tableName,
  categoryEnum,
  extraSchema,
  extraDefaults,
  extraFormFields,
  onClose,
  onSaved,
}: FormSheetProps<TExtra>) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(categoryEnum[0] ?? "");
  const [descEn, setDescEn] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descIt, setDescIt] = useState("");
  const [descEs, setDescEs] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [officialWebsite, setOfficialWebsite] = useState("");
  const [extra, setExtra] = useState<TExtra>(extraDefaults);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);

  // Reset / hydrate on open / row change
  useEffect(() => {
    if (mode === "edit" && row) {
      setSlug(row.slug);
      setName(row.name);
      setCategory(row.category);
      setDescEn(row.description_i18n?.en ?? "");
      setDescFr(row.description_i18n?.fr ?? "");
      setDescIt(row.description_i18n?.it ?? "");
      setDescEs(row.description_i18n?.es ?? "");
      setLogoUrl(row.logo_url ?? "");
      setOfficialWebsite(row.official_website ?? "");
      setExtra({ ...extraDefaults, ...(row as unknown as TExtra) });
      setSlugTouched(true);
    } else if (mode === "create") {
      setSlug("");
      setName("");
      setCategory(categoryEnum[0] ?? "");
      setDescEn("");
      setDescFr("");
      setDescIt("");
      setDescEs("");
      setLogoUrl("");
      setOfficialWebsite("");
      setExtra(extraDefaults);
      setSlugTouched(false);
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, row]);

  // Auto-slug from name in create mode (until slug touched)
  useEffect(() => {
    if (mode === "create" && !slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, mode, slugTouched]);

  function setExtraPartial(patch: Partial<TExtra>) {
    setExtra((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    const baseInput = {
      slug,
      name,
      category,
      description_i18n: {
        en: descEn || undefined,
        fr: descFr || undefined,
        it: descIt || undefined,
        es: descEs || undefined,
      },
      logo_url: logoUrl || null,
      official_website: officialWebsite || null,
    };
    const baseParse = baseReferentialSchema.safeParse(baseInput);
    const extraParse = extraSchema.safeParse(extra);
    if (!baseParse.success || !extraParse.success) {
      const errs: Record<string, string> = {};
      if (!baseParse.success) {
        for (const issue of baseParse.error.issues) {
          errs[issue.path.join(".")] = issue.message;
        }
      }
      if (!extraParse.success) {
        for (const issue of extraParse.error.issues) {
          errs[issue.path.join(".")] = issue.message;
        }
      }
      setErrors(errs);
      toast.error("Validation échouée");
      return;
    }
    setSaving(true);
    const payload = {
      ...baseParse.data,
      ...extraParse.data,
      description_i18n: Object.values(baseParse.data.description_i18n ?? {}).some(Boolean)
        ? baseParse.data.description_i18n
        : null,
      updated_at: new Date().toISOString(),
    };
    const { error } =
      mode === "create"
        ? await supabase.from(tableName).insert(payload as never)
        : await supabase.from(tableName).update(payload as never).eq("id", row!.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(mode === "create" ? "Créé" : "Mis à jour");
    onSaved();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Nouvelle entrée" : `Editer ${row?.name ?? ""}`}</SheetTitle>
          <SheetDescription className="text-[11px]">{title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="ref-name">Nom *</Label>
            <Input id="ref-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="ref-slug">Slug *</Label>
            <Input
              id="ref-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="auto-genere depuis nom"
            />
            {errors.slug && <p className="text-[10px] text-destructive mt-0.5">{errors.slug}</p>}
          </div>

          <div>
            <Label htmlFor="ref-cat">Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ref-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryEnum.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extra fields (caller-provided) */}
          {extraFormFields(extra, setExtraPartial)}

          {/* i18n descriptions */}
          <details className="border border-border rounded-md p-3">
            <summary className="text-xs font-display font-semibold cursor-pointer">Descriptions i18n</summary>
            <div className="space-y-2 mt-3">
              <div>
                <Label htmlFor="ref-desc-en" className="text-[10px]">EN</Label>
                <Textarea id="ref-desc-en" value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="ref-desc-fr" className="text-[10px]">FR</Label>
                <Textarea id="ref-desc-fr" value={descFr} onChange={(e) => setDescFr(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="ref-desc-it" className="text-[10px]">IT</Label>
                <Textarea id="ref-desc-it" value={descIt} onChange={(e) => setDescIt(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="ref-desc-es" className="text-[10px]">ES</Label>
                <Textarea id="ref-desc-es" value={descEs} onChange={(e) => setDescEs(e.target.value)} rows={2} />
              </div>
            </div>
          </details>

          <div>
            <Label htmlFor="ref-logo">Logo URL</Label>
            <Input id="ref-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
            {errors.logo_url && <p className="text-[10px] text-destructive mt-0.5">{errors.logo_url}</p>}
          </div>

          <div>
            <Label htmlFor="ref-web">Site officiel</Label>
            <Input
              id="ref-web"
              value={officialWebsite}
              onChange={(e) => setOfficialWebsite(e.target.value)}
              placeholder="https://…"
            />
            {errors.official_website && (
              <p className="text-[10px] text-destructive mt-0.5">{errors.official_website}</p>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6 flex flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

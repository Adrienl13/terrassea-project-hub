// ============================================================================
// ProductImagesUpload — admin-side product images upload (Dette 29).
//
// 3 sections (cohérent avec partner-side AddProductForm) :
//   - Image principale (single)
//   - Galerie produit (multi)
//   - Mises en situation / ambiances (multi)
//
// Réutilise le pattern d'upload de AddProductForm.tsx:395+ :
// supabase.storage.from("product-images").upload(path, file).
// Bucket RLS déjà OK pour authenticated (admin inclus).
//
// Path : products/admin/{productId|temp-timestamp}/{section}-{i}-{rand}.{ext}
// ============================================================================

import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateImageUpload } from "@/lib/validateUpload";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";

interface Props {
  productId?: string | null;
  partnerId?: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  environmentUrls: string[];
  onChangeImage: (url: string | null) => void;
  onChangeGallery: (urls: string[]) => void;
  onChangeEnvironment: (urls: string[]) => void;
}

type Section = "main" | "gallery" | "environment";

const labelClass =
  "text-[10px] uppercase tracking-wider text-muted-foreground font-display font-semibold";

export default function ProductImagesUpload({
  productId,
  partnerId,
  imageUrl,
  galleryUrls,
  environmentUrls,
  onChangeImage,
  onChangeGallery,
  onChangeEnvironment,
}: Props) {
  const [busy, setBusy] = useState<Section | null>(null);

  const buildPath = (section: Section, ext: string) => {
    const owner = partnerId ?? "admin";
    const scope = productId ?? `temp-${Date.now()}`;
    const rand = Math.random().toString(36).slice(2, 8);
    return `products/${owner}/${scope}/${section}-${Date.now()}-${rand}.${ext}`;
  };

  const uploadFile = async (file: File, section: Section): Promise<string | null> => {
    const err = validateImageUpload(file, { maxSizeMB: 5 });
    if (err) {
      toast.error(err);
      return null;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = buildPath(section, ext);
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      toast.error(`Upload échoué : ${upErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleMainPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("main");
    try {
      const url = await uploadFile(file, "main");
      if (url) {
        onChangeImage(url);
        toast.success("Image principale uploadée");
      }
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  };

  const handleMultiPick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    section: "gallery" | "environment",
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(section);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, section);
        if (url) uploaded.push(url);
      }
      if (uploaded.length === 0) return;
      if (section === "gallery") {
        onChangeGallery([...galleryUrls, ...uploaded]);
      } else {
        onChangeEnvironment([...environmentUrls, ...uploaded]);
      }
      toast.success(
        `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploadée${uploaded.length > 1 ? "s" : ""}`,
      );
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <SectionMain
        imageUrl={imageUrl}
        busy={busy === "main"}
        onPick={handleMainPick}
        onClear={() => onChangeImage(null)}
      />
      <SectionMulti
        title="Galerie produit"
        description="Photos détaillées du produit (différents angles, gros plans)."
        urls={galleryUrls}
        busy={busy === "gallery"}
        onPick={(e) => handleMultiPick(e, "gallery")}
        onRemove={(i) => onChangeGallery(galleryUrls.filter((_, idx) => idx !== i))}
      />
      <SectionMulti
        title="Mises en situation / ambiances"
        description="Visuels d'ambiance (pool deck, restaurant, terrasse…). Distincts de la galerie produit."
        urls={environmentUrls}
        busy={busy === "environment"}
        onPick={(e) => handleMultiPick(e, "environment")}
        onRemove={(i) =>
          onChangeEnvironment(environmentUrls.filter((_, idx) => idx !== i))
        }
      />
    </div>
  );
}

// ── Sub-section : main image ─────────────────────────────────────────────────

function SectionMain({
  imageUrl,
  busy,
  onPick,
  onClear,
}: {
  imageUrl: string | null;
  busy: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className={labelClass}>Image principale</p>
          <p className="text-[11px] font-body text-muted-foreground mt-1">
            Photo de référence affichée en tête de fiche produit.
          </p>
        </div>
        {imageUrl && (
          <button
            onClick={onClear}
            className="text-[10px] font-display font-semibold text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Retirer
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />
      {imageUrl ? (
        <div className="flex items-start gap-3">
          <img
            src={imageUrl}
            alt="Image principale"
            className="w-32 h-32 rounded-xl object-cover border border-border"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground/30 transition-colors inline-flex items-center gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Remplacer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-foreground/30 transition-colors disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mx-auto" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-display font-semibold text-foreground">
                Cliquer pour uploader
              </p>
              <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                JPG, PNG, WebP — max 5 Mo
              </p>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Sub-section : multi (gallery / environment) ──────────────────────────────

function SectionMulti({
  title,
  description,
  urls,
  busy,
  onPick,
  onRemove,
}: {
  title: string;
  description: string;
  urls: string[];
  busy: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className={labelClass}>{title}</p>
        <p className="text-[11px] font-body text-muted-foreground mt-1">
          {description}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-foreground/30 transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mx-auto" />
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-display font-semibold text-foreground">
            <Upload className="h-3.5 w-3.5" /> Ajouter des images
          </span>
        )}
      </button>
      {urls.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

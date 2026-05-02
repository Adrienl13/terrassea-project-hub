// ============================================================================
// VariantSelector — Sélecteur de variantes sur la fiche produit publique
// ============================================================================
//
// Phase 1 ÉTAPE 9a du chantier Modèle B variants étendu.
//
// Affiche les déclinaisons commercialisées d'un produit (dimensions, couleur,
// tissu, finition, prix, stock) sous forme de cards radio adaptées à la
// largeur disponible. Permet à l'acheteur CHR de sélectionner précisément la
// configuration qu'il veut.
//
// Layout adaptatif :
//   - 0-1 variants : composant ne rend RIEN (la fiche affiche la default
//     comme avant — backward compat 51/52 products avec 1 default unique)
//   - 2-5 variants : grille de radio cards
//   - 6+ variants : dropdown compact
//
// Pricing : le prix affiché reflète déjà la commission partenaire (appliquée
// dans fetchProductVariantsByProductId).

import { Check } from "lucide-react";
import type { DBProductVariant } from "@/lib/productVariants";
import { variantDimensionLabel } from "@/lib/productVariants";

interface VariantSelectorProps {
  variants: DBProductVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Locale FR par défaut Phase 1, expansion ÉTAPE 10/Phase 2. */
  locale?: "fr" | "en" | "es" | "it";
}

export default function VariantSelector({
  variants,
  selectedId,
  onSelect,
  locale = "fr",
}: VariantSelectorProps) {
  // Backward compat : 0 ou 1 variant → ne rend rien (la fiche affiche la
  // default unique sans sélecteur, comme avant ÉTAPE 9a).
  if (variants.length <= 1) return null;

  // Layout strategy
  const useDropdown = variants.length >= 6;

  if (useDropdown) {
    return (
      <VariantSelectorDropdown
        variants={variants}
        selectedId={selectedId}
        onSelect={onSelect}
        locale={locale}
      />
    );
  }

  return (
    <VariantSelectorRadioCards
      variants={variants}
      selectedId={selectedId}
      onSelect={onSelect}
      locale={locale}
    />
  );
}

// ── Radio cards (2-5 variants) ──────────────────────────────────────────────

function VariantSelectorRadioCards({
  variants,
  selectedId,
  onSelect,
  locale,
}: VariantSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
        {labelForLocale("Choisir une déclinaison", locale)}
      </label>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
        }}
        role="radiogroup"
        aria-label="Variantes disponibles"
      >
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(v.id)}
              className={`relative text-left rounded-sm border p-3 transition-colors ${
                isSelected
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/40"
              }`}
              data-testid={`variant-card-${v.id}`}
            >
              {isSelected && (
                <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-foreground" />
              )}
              {v.is_default && !isSelected && (
                <span className="absolute top-2 right-2 text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                  Default
                </span>
              )}
              <VariantCardBody variant={v} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Dropdown (6+ variants) ──────────────────────────────────────────────────

function VariantSelectorDropdown({
  variants,
  selectedId,
  onSelect,
  locale,
}: VariantSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
        {labelForLocale("Choisir une déclinaison", locale)}
      </label>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-sm border border-border bg-card px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        aria-label="Variantes disponibles"
        data-testid="variant-dropdown"
      >
        {variants.map((v) => {
          const dim = variantDimensionLabel(v) ?? "—";
          const color = v.fabric_color_slug ?? "";
          const price = v.price_eur != null ? `€${Number(v.price_eur).toFixed(2)}` : "Sur demande";
          const tag = v.is_default ? " (default)" : "";
          return (
            <option key={v.id} value={v.id}>
              {dim} · {color || "—"} · {price}{tag}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// ── Card body (shared between modes) ────────────────────────────────────────

function VariantCardBody({ variant }: { variant: DBProductVariant }) {
  const dim = variantDimensionLabel(variant);
  const color = variant.fabric_color_slug;
  const finish = variant.frame_finish_slug;
  const colorHex = variant.fabric_color_hex as string | null;
  const priceLabel =
    variant.price_eur != null ? `€${Number(variant.price_eur).toFixed(2)}` : "Sur demande";

  return (
    <div className="space-y-1.5 pr-4">
      {/* Top line — dimensions */}
      <div className="text-xs font-display font-semibold text-foreground">
        {dim ?? "—"}
      </div>
      {/* Material info — color (with swatch if hex available) + finish */}
      {(color || finish) && (
        <div className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground">
          {color && (
            <span className="flex items-center gap-1">
              {colorHex && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                  style={{ backgroundColor: colorHex }}
                  aria-hidden="true"
                />
              )}
              <span>{prettifySlug(color)}</span>
            </span>
          )}
          {color && finish && <span>·</span>}
          {finish && <span>{prettifySlug(finish)}</span>}
        </div>
      )}
      {/* Price */}
      <div className="text-sm font-display font-bold text-foreground pt-1">
        {priceLabel}
      </div>
      {/* Stock badge */}
      <StockMiniBadge variant={variant} />
    </div>
  );
}

function StockMiniBadge({ variant }: { variant: DBProductVariant }) {
  const inStock = variant.in_stock === true;
  const mto = variant.is_made_to_order === true;
  const text = inStock ? "En stock" : mto ? "Sur commande" : "Stock limité";
  const colorClass = inStock
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : mto
    ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-muted-foreground bg-muted/40 border-border";
  return (
    <span
      className={`inline-block text-[9px] font-display font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${colorClass}`}
    >
      {text}
    </span>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function prettifySlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelForLocale(fr: string, locale: "fr" | "en" | "es" | "it"): string {
  // Phase 1 : FR uniquement, EN/ES/IT à câbler ÉTAPE 10 / Phase 2 si besoin.
  if (locale === "en") return "Choose a variant";
  if (locale === "es") return "Elegir una variante";
  if (locale === "it") return "Scegli una variante";
  return fr;
}

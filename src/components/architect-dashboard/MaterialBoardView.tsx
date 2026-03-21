import { useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X, Plus, Share2, FileDown, FolderPlus, Search, Pencil, Check,
  Palette, Tag, Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { ml } from "@/lib/i18nFields";
import type { DBProduct } from "@/lib/products";
import { useMaterialBoards } from "@/hooks/useArchitectProjects";

// ── Types ───────────────────────────────────────────────────────────────────────

interface Props {
  boardId: string;
  isReadOnly?: boolean;
}

interface BoardProduct {
  id: string;
  product: DBProduct;
  note: string;
  position: number;
}

interface MaterialBoard {
  id: string;
  name: string;
  description: string;
  projectName: string | null;
  products: BoardProduct[];
}

// ── Mock data (will be replaced by real queries) ────────────────────────────────

const MOCK_BOARDS: Record<string, MaterialBoard> = {
  "board-1": {
    id: "board-1",
    name: "Mediterranean Terrace",
    description: "Warm tones, natural materials, coastal feel",
    projectName: "Sofitel Rooftop Paris",
    products: [],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

function generateShareLink(boardId: string): string {
  return `${window.location.origin}/material-board/${boardId}?shared=true`;
}

function formatDimensions(p: DBProduct): string {
  const parts: string[] = [];
  if (p.dimensions_length_cm) parts.push(`${p.dimensions_length_cm}L`);
  if (p.dimensions_width_cm) parts.push(`${p.dimensions_width_cm}W`);
  if (p.dimensions_height_cm) parts.push(`${p.dimensions_height_cm}H`);
  return parts.length > 0 ? `${parts.join(" x ")} cm` : "";
}

function formatPrice(p: DBProduct): string | null {
  if (p.price_min != null && p.price_max != null) {
    return `€${p.price_min} – €${p.price_max}`;
  }
  if (p.price_min != null) return `from €${p.price_min}`;
  if (p.indicative_price) return p.indicative_price;
  return null;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function MaterialBoardView({ boardId, isReadOnly = false }: Props) {
  const { t } = useTranslation();
  const { addItem } = useProjectCart();

  // Board state (mock-backed for now; hook is available when backend is wired)
  const [board, setBoard] = useState<MaterialBoard>(
    () => MOCK_BOARDS[boardId] ?? {
      id: boardId,
      name: t("materialBoard.untitledBoard"),
      description: "",
      projectName: null,
      products: [],
    },
  );

  // Editable name
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(board.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Product search overlay
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Product notes editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  // ── Product search query ──────────────────────────────────────────────────────

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["material-board-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .neq("availability_type", "discontinued")
        .or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .order("priority_score", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as DBProduct[];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  // ── Style summary computation ─────────────────────────────────────────────────

  const styleSummary = useMemo(() => {
    const styleTags = new Set<string>();
    const materialTags = new Set<string>();
    const paletteColors = new Set<string>();

    for (const bp of board.products) {
      bp.product.style_tags?.forEach((t) => styleTags.add(t));
      bp.product.material_tags?.forEach((t) => materialTags.add(t));
      bp.product.palette_tags?.forEach((t) => paletteColors.add(t));
      if (bp.product.main_color) paletteColors.add(bp.product.main_color);
      if (bp.product.secondary_color) paletteColors.add(bp.product.secondary_color);
    }

    return {
      styleTags: Array.from(styleTags),
      materialTags: Array.from(materialTags),
      paletteColors: Array.from(paletteColors),
    };
  }, [board.products]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSaveName = useCallback(() => {
    setBoard((b) => ({ ...b, name: draftName }));
    setEditingName(false);
    toast.success(t("materialBoard.boardUpdated"));
  }, [draftName, t]);

  const handleAddProduct = useCallback((product: DBProduct) => {
    const exists = board.products.some((bp) => bp.product.id === product.id);
    if (exists) {
      toast.info(t("materialBoard.alreadyOnBoard"));
      return;
    }
    setBoard((b) => ({
      ...b,
      products: [
        ...b.products,
        {
          id: `bp-${Date.now()}`,
          product,
          note: "",
          position: b.products.length,
        },
      ],
    }));
    setShowSearch(false);
    setSearchQuery("");
    toast.success(t("materialBoard.productAdded"));
  }, [board.products, t]);

  const handleRemoveProduct = useCallback((bpId: string) => {
    setBoard((b) => ({
      ...b,
      products: b.products.filter((bp) => bp.id !== bpId),
    }));
    toast.success(t("materialBoard.productRemoved"));
  }, [t]);

  const handleSaveNote = useCallback((bpId: string) => {
    setBoard((b) => ({
      ...b,
      products: b.products.map((bp) =>
        bp.id === bpId ? { ...bp, note: draftNote } : bp,
      ),
    }));
    setEditingNoteId(null);
    setDraftNote("");
  }, [draftNote]);

  const handleShare = useCallback(() => {
    const link = generateShareLink(boardId);
    navigator.clipboard.writeText(link).then(() => {
      toast.success(t("materialBoard.linkCopied"));
    }).catch(() => {
      toast.error(t("materialBoard.linkCopyFailed"));
    });
  }, [boardId, t]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  const handleAddAllToProject = useCallback(() => {
    if (board.products.length === 0) {
      toast.info(t("materialBoard.nothingToAdd"));
      return;
    }
    for (const bp of board.products) {
      addItem(bp.product, board.name, 1);
    }
    toast.success(
      t("materialBoard.addedToProject", { count: board.products.length }),
    );
  }, [board.products, board.name, addItem, t]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="material-board-root">
      {/* ── Print-only header ──────────────────────────────────────────────────── */}
      <div className="hidden print:block mb-8">
        <p className="font-display text-xs tracking-widest text-muted-foreground uppercase mb-1">
          Terrassea — {t("materialBoard.title")}
        </p>
        <h1 className="font-display text-2xl font-bold text-foreground">{board.name}</h1>
        {board.projectName && (
          <p className="text-sm text-muted-foreground mt-1">{board.projectName}</p>
        )}
        {board.description && (
          <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
        )}
      </div>

      {/* ── Screen header ──────────────────────────────────────────────────────── */}
      <div className="print:hidden mb-6">
        {/* Board name (editable) */}
        <div className="flex items-center gap-3 mb-1">
          {editingName && !isReadOnly ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="font-display text-xl font-bold bg-transparent border-b border-foreground outline-none text-foreground"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-foreground">{board.name}</h2>
              {!isReadOnly && (
                <button
                  onClick={() => { setDraftName(board.name); setEditingName(true); }}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Project name & description */}
        {board.projectName && (
          <p className="text-sm text-muted-foreground mb-0.5">{board.projectName}</p>
        )}
        {board.description && (
          <p className="text-sm text-muted-foreground">{board.description}</p>
        )}
      </div>

      {/* ── Actions bar ────────────────────────────────────────────────────────── */}
      <div className="print:hidden flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold border border-border rounded-sm hover:border-foreground hover:text-foreground text-muted-foreground transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          {t("materialBoard.share")}
        </button>
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold border border-border rounded-sm hover:border-foreground hover:text-foreground text-muted-foreground transition-colors"
        >
          <FileDown className="h-3.5 w-3.5" />
          {t("materialBoard.exportPdf")}
        </button>
        {!isReadOnly && (
          <button
            onClick={handleAddAllToProject}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {t("materialBoard.addAllToProject")}
          </button>
        )}
      </div>

      {/* ── Board canvas (3-column grid) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 print:grid-cols-3 print:gap-6">
        {board.products.map((bp) => {
          const dims = formatDimensions(bp.product);
          const price = formatPrice(bp.product);

          return (
            <div
              key={bp.id}
              className="relative bg-card border border-border rounded-sm overflow-hidden group"
            >
              {/* Remove button */}
              {!isReadOnly && (
                <button
                  onClick={() => handleRemoveProduct(bp.id)}
                  className="print:hidden absolute top-2 right-2 z-10 p-1 bg-background/80 backdrop-blur-sm rounded-full text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title={t("materialBoard.remove")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Product image */}
              <div className="aspect-square bg-muted overflow-hidden">
                {bp.product.image_url ? (
                  <img
                    src={bp.product.image_url}
                    alt={ml(bp.product, "name")}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Layers className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="p-3">
                <p className="font-display font-semibold text-sm text-foreground leading-tight mb-1">
                  {ml(bp.product, "name")}
                </p>

                {/* Key specs */}
                <div className="space-y-0.5 text-[11px] text-muted-foreground mb-2">
                  {dims && <p>{dims}</p>}
                  {bp.product.material_structure && (
                    <p>{bp.product.material_structure}</p>
                  )}
                  {bp.product.main_color && (
                    <p className="flex items-center gap-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-border print:border-gray-300"
                        style={{
                          backgroundColor: bp.product.main_color.startsWith("#")
                            ? bp.product.main_color
                            : undefined,
                        }}
                      />
                      {bp.product.main_color}
                    </p>
                  )}
                  {price && <p className="font-semibold text-foreground">{price}</p>}
                </div>

                {/* Architect note */}
                <div className="print:hidden">
                  {editingNoteId === bp.id && !isReadOnly ? (
                    <div className="flex items-start gap-1.5">
                      <textarea
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder={t("materialBoard.addNote")}
                        className="flex-1 text-[11px] bg-muted/50 border border-border rounded-sm p-1.5 resize-none outline-none focus:border-foreground text-foreground min-h-[48px]"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNote(bp.id)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (isReadOnly) return;
                        setEditingNoteId(bp.id);
                        setDraftNote(bp.note);
                      }}
                      className={`w-full text-left text-[11px] rounded-sm px-1.5 py-1 transition-colors ${
                        bp.note
                          ? "text-muted-foreground italic"
                          : "text-muted-foreground/60 hover:text-muted-foreground"
                      } ${isReadOnly ? "cursor-default" : "hover:bg-muted/50 cursor-pointer"}`}
                    >
                      {bp.note || (isReadOnly ? "" : t("materialBoard.addNote"))}
                    </button>
                  )}
                </div>

                {/* Print-only note */}
                {bp.note && (
                  <p className="hidden print:block text-[10px] text-gray-500 italic mt-1">
                    {bp.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Add product card ──────────────────────────────────────────────────── */}
        {!isReadOnly && (
          <button
            onClick={() => setShowSearch(true)}
            className="print:hidden flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent"
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="font-display text-xs font-semibold">
              {t("materialBoard.addProduct")}
            </span>
          </button>
        )}
      </div>

      {/* ── Style summary bar ────────────────────────────────────────────────── */}
      {board.products.length > 0 && (
        <div className="border border-border rounded-sm p-4 mb-8 bg-card print:border-gray-300">
          <p className="font-display text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            {t("materialBoard.styleSummary")}
          </p>

          <div className="flex flex-wrap gap-6">
            {/* Style tags */}
            {styleSummary.styleTags.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Tag className="h-3 w-3" />
                  {t("materialBoard.styles")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {styleSummary.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] font-display font-semibold bg-muted text-muted-foreground rounded-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Palette colors */}
            {styleSummary.paletteColors.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Palette className="h-3 w-3" />
                  {t("materialBoard.palette")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {styleSummary.paletteColors.map((color) => (
                    <span
                      key={color}
                      className="w-5 h-5 rounded-full border border-border print:border-gray-300"
                      style={{
                        backgroundColor: color.startsWith("#") ? color : undefined,
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Material tags */}
            {styleSummary.materialTags.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Layers className="h-3 w-3" />
                  {t("materialBoard.materials")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {styleSummary.materialTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] font-display font-semibold border border-border text-muted-foreground rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Product search overlay ───────────────────────────────────────────── */}
      {showSearch && (
        <>
          {/* Backdrop */}
          <div
            className="print:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => { setShowSearch(false); setSearchQuery(""); }}
          />

          {/* Panel */}
          <div className="print:hidden fixed inset-x-4 top-[15%] z-50 max-w-lg mx-auto bg-background border border-border rounded-sm shadow-2xl overflow-hidden">
            {/* Search header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("materialBoard.searchProducts")}
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground font-body"
                autoFocus
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {isSearching && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {t("materialBoard.searching")}
                </p>
              )}

              {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {t("materialBoard.noResults")}
                </p>
              )}

              {!isSearching && searchQuery.trim().length < 2 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {t("materialBoard.typeToSearch")}
                </p>
              )}

              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-sm bg-muted overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={ml(product, "name")}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Layers className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xs font-semibold text-foreground truncate">
                      {ml(product, "name")}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {product.category}
                      {product.brand_source ? ` — ${product.brand_source}` : ""}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Print-only style summary ─────────────────────────────────────────── */}
      {board.products.length > 0 && (
        <div className="hidden print:block mt-6 pt-4 border-t border-gray-300">
          <p className="font-display text-xs font-semibold uppercase tracking-wider mb-2">
            {t("materialBoard.styleSummary")}
          </p>
          <div className="flex flex-wrap gap-4 text-[10px] text-gray-600">
            {styleSummary.styleTags.length > 0 && (
              <span>{t("materialBoard.styles")}: {styleSummary.styleTags.join(", ")}</span>
            )}
            {styleSummary.materialTags.length > 0 && (
              <span>{t("materialBoard.materials")}: {styleSummary.materialTags.join(", ")}</span>
            )}
            {styleSummary.paletteColors.length > 0 && (
              <span className="flex items-center gap-1">
                {t("materialBoard.palette")}:
                {styleSummary.paletteColors.map((c) => (
                  <span
                    key={c}
                    className="inline-block w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: c.startsWith("#") ? c : undefined }}
                  />
                ))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

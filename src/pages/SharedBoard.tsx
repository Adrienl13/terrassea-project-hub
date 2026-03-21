import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ml } from "@/lib/i18nFields";
import { Palette, Package, ExternalLink } from "lucide-react";
import type { DBProduct } from "@/lib/products";

interface BoardItem {
  id: string;
  product_id: string;
  note: string | null;
  sort_order: number | null;
  product: DBProduct | null;
}

interface SharedBoardData {
  id: string;
  board_name: string;
  description: string | null;
  items: BoardItem[];
}

export default function SharedBoard() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { data: board, isLoading, error } = useQuery({
    queryKey: ["shared-board", token],
    queryFn: async (): Promise<SharedBoardData | null> => {
      if (!token) return null;

      const { data: boardRow, error: boardErr } = await supabase
        .from("material_boards")
        .select("id, board_name, description")
        .eq("share_token", token)
        .single();

      if (boardErr || !boardRow) return null;

      const { data: itemRows } = await supabase
        .from("board_items")
        .select("id, product_id, note, sort_order")
        .eq("board_id", boardRow.id)
        .order("sort_order", { ascending: true });

      const items: BoardItem[] = [];
      for (const item of itemRows || []) {
        const { data: product } = await supabase
          .from("products")
          .select("*")
          .eq("id", item.product_id)
          .single();

        items.push({
          ...item,
          product: product as DBProduct | null,
        });
      }

      return {
        ...boardRow,
        items,
      };
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Palette className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h1 className="text-lg font-display font-bold text-foreground mb-2">
          {t("sharedBoard.notFound", "Board not found")}
        </h1>
        <p className="text-sm font-body text-muted-foreground max-w-md">
          {t("sharedBoard.notFoundDesc", "This material board link may have expired or is invalid.")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Palette className="h-4 w-4" />
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider">
            {t("sharedBoard.materialBoard", "Material Board")}
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">{board.board_name}</h1>
        {board.description && (
          <p className="text-sm font-body text-muted-foreground mt-1">{board.description}</p>
        )}
        <p className="text-[10px] font-body text-muted-foreground mt-2">
          {board.items.length} {t("sharedBoard.products", "products")}
        </p>
      </div>

      {/* Product grid */}
      {board.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-body text-muted-foreground">
            {t("sharedBoard.empty", "This board has no products yet.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {board.items.map((item) => {
            const product = item.product;
            if (!product) return null;

            const name = ml(product, "name", lang) || product.name || "—";
            const image = product.image || "/placeholder.svg";

            return (
              <div
                key={item.id}
                className="border border-border rounded-sm overflow-hidden bg-card"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-display font-semibold text-foreground truncate">
                    {name}
                  </p>
                  {product.category && (
                    <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                      {product.category}
                      {product.subcategory ? ` / ${product.subcategory}` : ""}
                    </p>
                  )}
                  {item.note && (
                    <p className="text-[10px] font-body text-muted-foreground mt-2 italic">
                      {item.note}
                    </p>
                  )}
                  <a
                    href={`/products/${product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-body text-primary hover:underline mt-2"
                  >
                    {t("sharedBoard.viewProduct", "View product")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-border text-center">
        <p className="text-[10px] font-body text-muted-foreground">
          {t("sharedBoard.poweredBy", "Powered by Terrassea")}
        </p>
      </div>
    </div>
  );
}

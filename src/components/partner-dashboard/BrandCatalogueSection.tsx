import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package, Search, Save, Power, PowerOff, Tag,
  Truck, ChevronDown, ChevronUp, Lock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandDistributorRecord {
  id: string;
  brand_id: string;
  allow_price_override: boolean | null;
  brand_name: string;
}

interface InheritedOffer {
  id: string;
  product_id: string;
  partner_id: string;
  source_offer_id: string;
  price: number | null;
  stock_status: string | null;
  stock_quantity: number | null;
  delivery_delay_days: number | null;
  is_active: boolean | null;
  product_name: string;
  product_image: string | null;
  product_category: string | null;
  brand_name: string;
  brand_id: string;
  allow_price_override: boolean;
}

interface EditState {
  [offerId: string]: {
    price?: number | null;
    stock_status?: string | null;
    stock_quantity?: number | null;
    delivery_delay_days?: number | null;
    is_active?: boolean | null;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BrandCatalogueSection({ partnerId }: { partnerId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editState, setEditState] = useState<EditState>({});
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  // 1. Fetch brand_distributors where this partner is the distributor
  const { data: brandDistributors = [] } = useQuery<BrandDistributorRecord[]>({
    queryKey: ["brand-distributors-for-distributor", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_distributors")
        .select("id, brand_id, allow_price_override")
        .eq("distributor_id", partnerId)
        .eq("is_active", true);
      if (error || !data || data.length === 0) return [];

      // Fetch brand names
      const brandIds = data.map((d) => d.brand_id);
      const { data: brands } = await supabase
        .from("partners")
        .select("id, name")
        .in("id", brandIds);
      const brandMap = new Map((brands || []).map((b: { id: string; name: string }) => [b.id, b.name]));

      return data.map((d) => ({
        id: d.id,
        brand_id: d.brand_id,
        allow_price_override: d.allow_price_override,
        brand_name: brandMap.get(d.brand_id) || "Unknown Brand",
      }));
    },
    enabled: !!partnerId,
  });

  // 2. Fetch inherited offers (source_offer_id IS NOT NULL)
  const { data: inheritedOffers = [], isLoading } = useQuery<InheritedOffer[]>({
    queryKey: ["inherited-offers", partnerId, brandDistributors],
    queryFn: async () => {
      const { data: offers, error } = await supabase
        .from("product_offers")
        .select("id, product_id, partner_id, source_offer_id, price, stock_status, stock_quantity, delivery_delay_days, is_active")
        .eq("partner_id", partnerId)
        .not("source_offer_id", "is", null);
      if (error || !offers || offers.length === 0) return [];

      // Fetch product details
      const productIds = [...new Set(offers.map((o) => o.product_id))];
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url, category")
        .in("id", productIds);
      const productMap = new Map((products || []).map((p) => [p.id, p]));

      // Fetch source offers to find brand partner IDs
      const sourceOfferIds = [...new Set(offers.map((o) => o.source_offer_id).filter(Boolean))] as string[];
      const { data: sourceOffers } = await supabase
        .from("product_offers")
        .select("id, partner_id")
        .in("id", sourceOfferIds);
      const sourceOfferMap = new Map((sourceOffers || []).map((so) => [so.id, so.partner_id]));

      // Build brand info map from brandDistributors
      const brandDistMap = new Map(brandDistributors.map((bd) => [bd.brand_id, bd]));

      return offers.map((offer) => {
        const product = productMap.get(offer.product_id);
        const sourceBrandId = sourceOfferMap.get(offer.source_offer_id!);
        const brandDist = brandDistMap.get(sourceBrandId);

        return {
          id: offer.id,
          product_id: offer.product_id,
          partner_id: offer.partner_id,
          source_offer_id: offer.source_offer_id!,
          price: offer.price,
          stock_status: offer.stock_status,
          stock_quantity: offer.stock_quantity,
          delivery_delay_days: offer.delivery_delay_days,
          is_active: offer.is_active,
          product_name: product?.name ?? "Unknown product",
          product_image: product?.image_url ?? null,
          product_category: product?.category ?? null,
          brand_name: brandDist?.brand_name ?? "Unknown Brand",
          brand_id: sourceBrandId ?? "",
          allow_price_override: brandDist?.allow_price_override ?? false,
        };
      });
    },
    enabled: !!partnerId && brandDistributors.length > 0,
  });

  // 3. Save mutation
  const saveMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const changes = editState[offerId];
      if (!changes) return;
      const { error } = await supabase
        .from("product_offers")
        .update(changes)
        .eq("id", offerId);
      if (error) throw error;
    },
    onSuccess: (_data, offerId) => {
      toast.success(t("brandCatalogue.saved", "Changes saved"));
      setEditState((prev) => {
        const next = { ...prev };
        delete next[offerId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["inherited-offers", partnerId] });
    },
    onError: () => {
      toast.error(t("brandCatalogue.saveError", "Failed to save changes"));
    },
  });

  // 4. Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ offerId, newActive }: { offerId: string; newActive: boolean }) => {
      const { error } = await supabase
        .from("product_offers")
        .update({ is_active: newActive })
        .eq("id", offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inherited-offers", partnerId] });
    },
    onError: () => {
      toast.error(t("brandCatalogue.toggleError", "Failed to update status"));
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getEditValue = <K extends keyof EditState[string]>(
    offerId: string,
    field: K,
    original: EditState[string][K],
  ): EditState[string][K] => {
    return editState[offerId]?.[field] !== undefined ? editState[offerId][field] : original;
  };

  const setEditField = (offerId: string, field: string, value: string | number | boolean | null) => {
    setEditState((prev) => ({
      ...prev,
      [offerId]: { ...prev[offerId], [field]: value },
    }));
  };

  const hasChanges = (offerId: string) => {
    return editState[offerId] && Object.keys(editState[offerId]).length > 0;
  };

  const toggleBrand = (brandId: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  // Group offers by brand
  const grouped = inheritedOffers.reduce<Record<string, InheritedOffer[]>>((acc, offer) => {
    const key = offer.brand_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(offer);
    return acc;
  }, {});

  // Apply search filter
  const filteredGrouped = Object.entries(grouped).reduce<Record<string, InheritedOffer[]>>(
    (acc, [brandId, offers]) => {
      const filtered = searchTerm
        ? offers.filter(
            (o) =>
              o.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              o.brand_name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : offers;
      if (filtered.length > 0) acc[brandId] = filtered;
      return acc;
    },
    {},
  );

  const totalOffers = inheritedOffers.length;
  const activeOffers = inheritedOffers.filter((o) => o.is_active !== false).length;

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!isLoading && inheritedOffers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-body text-muted-foreground mb-1">
          {t("brandCatalogue.empty", "No inherited offers yet")}
        </p>
        <p className="text-xs font-body text-muted-foreground/70">
          {t("brandCatalogue.emptyHint", "Brand offers will appear here when a brand syncs their catalogue to you.")}
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-base text-foreground">
            {t("brandCatalogue.title", "Brand catalogue")}
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            {t("brandCatalogue.subtitle", "{{active}} active of {{total}} inherited offers", {
              active: activeOffers,
              total: totalOffers,
            })}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("brandCatalogue.searchPlaceholder", "Search products...")}
          className="w-full pl-9 pr-4 py-2 border border-border rounded-sm text-sm font-body bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Grouped by brand */}
      {Object.entries(filteredGrouped).map(([brandId, offers]) => {
        const brandName = offers[0]?.brand_name ?? "Unknown Brand";
        const isExpanded = expandedBrands.has(brandId) || expandedBrands.size === 0;
        const brandActiveCount = offers.filter((o) => o.is_active !== false).length;

        return (
          <div key={brandId} className="border border-border rounded-sm overflow-hidden">
            {/* Brand header */}
            <button
              onClick={() => toggleBrand(brandId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-display font-semibold text-foreground">
                  {brandName}
                </span>
                <span className="text-[10px] font-body text-muted-foreground">
                  ({brandActiveCount}/{offers.length} {t("brandCatalogue.active", "active")})
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Offer rows */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {offers.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    editValue={(field, original) => getEditValue(offer.id, field, original)}
                    onFieldChange={(field, value) => setEditField(offer.id, field, value)}
                    hasChanges={hasChanges(offer.id)}
                    onSave={() => saveMutation.mutate(offer.id)}
                    isSaving={saveMutation.isPending}
                    onToggleActive={(newActive) =>
                      toggleActiveMutation.mutate({ offerId: offer.id, newActive })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Offer Row ─────────────────────────────────────────────────────────────────

function OfferRow({
  offer,
  editValue,
  onFieldChange,
  hasChanges,
  onSave,
  isSaving,
  onToggleActive,
}: {
  offer: InheritedOffer;
  editValue: <K extends keyof EditState[string]>(field: K, original: EditState[string][K]) => EditState[string][K];
  onFieldChange: (field: string, value: string | number | boolean | null) => void;
  hasChanges: boolean;
  onSave: () => void;
  isSaving: boolean;
  onToggleActive: (newActive: boolean) => void;
}) {
  const { t } = useTranslation();
  const isActive = offer.is_active !== false;
  const currentPrice = editValue("price", offer.price);
  const currentStockStatus = editValue("stock_status", offer.stock_status);
  const currentDeliveryDays = editValue("delivery_delay_days", offer.delivery_delay_days);

  return (
    <div
      className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
        !isActive ? "opacity-50 bg-muted/20" : ""
      }`}
    >
      {/* Product image + info */}
      <div className="flex items-center gap-3 min-w-0 sm:w-56 flex-shrink-0">
        <div className="w-12 h-12 rounded-sm overflow-hidden border border-border flex-shrink-0 bg-muted">
          {offer.product_image ? (
            <img
              src={offer.product_image}
              alt={offer.product_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-display font-semibold text-foreground truncate">
            {offer.product_name}
          </p>
          <span className="inline-flex items-center gap-1 text-[9px] font-body text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full mt-0.5">
            <Tag className="h-2.5 w-2.5" />
            {t("brandCatalogue.syncedFrom", "Synced from")} {offer.brand_name}
          </span>
        </div>
      </div>

      {/* Editable fields */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {/* Price */}
        <div className="flex flex-col">
          <label className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("brandCatalogue.price", "Price")}
          </label>
          {offer.allow_price_override ? (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                &euro;
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={currentPrice ?? ""}
                onChange={(e) =>
                  onFieldChange("price", e.target.value ? parseFloat(e.target.value) : null)
                }
                className="w-24 pl-6 pr-2 py-1.5 border border-border rounded-sm text-xs font-body bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
                disabled={!isActive}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs font-body text-muted-foreground h-[30px]">
              <Lock className="h-3 w-3" />
              <span>
                {currentPrice != null ? `${currentPrice.toFixed(2)}` : "---"}
              </span>
              <span className="text-[8px] italic">
                ({t("brandCatalogue.priceSetByBrand", "Price set by brand")})
              </span>
            </div>
          )}
        </div>

        {/* Stock status */}
        <div className="flex flex-col">
          <label className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("brandCatalogue.stock", "Stock")}
          </label>
          <select
            value={currentStockStatus ?? "in_stock"}
            onChange={(e) => onFieldChange("stock_status", e.target.value)}
            className="w-28 px-2 py-1.5 border border-border rounded-sm text-xs font-body bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            disabled={!isActive}
          >
            <option value="in_stock">{t("brandCatalogue.inStock", "In stock")}</option>
            <option value="low_stock">{t("brandCatalogue.lowStock", "Low stock")}</option>
            <option value="out_of_stock">{t("brandCatalogue.outOfStock", "Out of stock")}</option>
            <option value="on_order">{t("brandCatalogue.onOrder", "On order")}</option>
          </select>
        </div>

        {/* Delivery delay */}
        <div className="flex flex-col">
          <label className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            <Truck className="inline h-3 w-3 mr-0.5" />
            {t("brandCatalogue.deliveryDelay", "Delivery (days)")}
          </label>
          <input
            type="number"
            min={0}
            value={currentDeliveryDays ?? ""}
            onChange={(e) =>
              onFieldChange(
                "delivery_delay_days",
                e.target.value ? parseInt(e.target.value, 10) : null,
              )
            }
            className="w-20 px-2 py-1.5 border border-border rounded-sm text-xs font-body bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
            disabled={!isActive}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Save button */}
        {hasChanges && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            {t("brandCatalogue.save", "Save")}
          </button>
        )}

        {/* Toggle active/inactive */}
        <button
          onClick={() => onToggleActive(!isActive)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-display font-semibold rounded-sm border transition-colors ${
            isActive
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-green-200 text-green-600 hover:bg-green-50"
          }`}
          title={isActive ? t("brandCatalogue.deactivate", "Deactivate") : t("brandCatalogue.activate", "Activate")}
        >
          {isActive ? (
            <>
              <PowerOff className="h-3 w-3" />
              {t("brandCatalogue.deactivate", "Deactivate")}
            </>
          ) : (
            <>
              <Power className="h-3 w-3" />
              {t("brandCatalogue.activate", "Activate")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

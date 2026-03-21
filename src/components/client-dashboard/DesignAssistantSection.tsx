import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Camera, MapPin, Users, Tag, Package,
  ChevronDown, ChevronUp, ArrowRight, Plus, Clock,
} from "lucide-react";
import { useMoodBoard, type MoodBoardResult, type TerraceAnalysis } from "@/hooks/useMoodBoard";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductsByIds, type DBProduct } from "@/lib/products";
import MoodBoardAnalyzer from "@/components/mood-board/MoodBoardAnalyzer";
import type { Json } from "@/integrations/supabase/types";

// ── Credit dots ──────────────────────────────────────────────

function CreditDots({
  used, max, t,
}: {
  used: number; max: number; t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const remaining = max - used;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i < used ? "bg-muted-foreground/30" : "bg-green-500"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-body text-muted-foreground">
        {remaining > 0
          ? t("designAssistant.creditsRemaining", { count: remaining, max })
          : t("designAssistant.noCreditsLeft")}
      </span>
    </div>
  );
}

// ── Past analysis card ───────────────────────────────────────

interface PastAnalysis {
  id: string;
  user_id: string;
  image_path: string;
  analysis_result: Json | null;
  matched_product_ids: string[] | null;
  created_at: string | null;
}

function PastAnalysisCard({ analysis, t }: { analysis: PastAnalysis; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const parsed = analysis.analysis_result as unknown as TerraceAnalysis | null;
  const productIds = analysis.matched_product_ids ?? [];
  const productCount = productIds.length;

  // Get signed URL for thumbnail
  useEffect(() => {
    if (!analysis.image_path) return;
    supabase.storage
      .from("mood-images")
      .createSignedUrl(analysis.image_path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setImageUrl(data.signedUrl);
      });
  }, [analysis.image_path]);

  // Fetch matched products when expanded
  const { data: matchedProducts = [] } = useQuery<DBProduct[]>({
    queryKey: ["design-assistant-products", analysis.id],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      return fetchProductsByIds(productIds);
    },
    enabled: expanded && productIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const formattedDate = analysis.created_at
    ? new Date(analysis.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="border border-border rounded-lg overflow-hidden hover:border-foreground/20 transition-colors">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-24 h-24 flex-shrink-0 rounded-sm overflow-hidden bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Camera className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-display font-semibold text-foreground">
                {t("designAssistant.analysisFrom", { date: formattedDate })}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {parsed?.venue_type && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {t("designAssistant.venueDetected", { type: parsed.venue_type })}
                  </span>
                )}
                {parsed?.estimated_capacity != null && parsed.estimated_capacity > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {t("designAssistant.capacityDetected", { count: parsed.estimated_capacity })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                  <Package className="w-3 h-3" />
                  {t("designAssistant.matchedProducts", { count: productCount })}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-body">
              <Clock className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>

          {/* Style tags */}
          {parsed?.style_tags && parsed.style_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {parsed.style_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-body text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-muted/30"
                >
                  {tag}
                </span>
              ))}
              {parsed.material_tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-body text-foreground/70 border border-foreground/20 rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-foreground border border-border rounded-full px-3 py-1.5 hover:border-foreground transition-all"
            >
              <Tag className="w-3 h-3" />
              {t("designAssistant.viewProducts")}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (parsed?.venue_type) params.set("venue", parsed.venue_type);
                if (parsed?.estimated_capacity) params.set("capacity", String(parsed.estimated_capacity));
                if (parsed?.style_tags?.[0]) params.set("style", parsed.style_tags[0]);
                navigate(`/projects/new?${params.toString()}`);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-primary-foreground bg-foreground rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" />
              {t("designAssistant.createProject")}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded product grid */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4">
          {matchedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {matchedProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="border border-border rounded-sm bg-card overflow-hidden cursor-pointer group hover:border-foreground/30 transition-all"
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-display font-semibold text-foreground line-clamp-2">{product.name}</p>
                    <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                      {product.price_min ? `From ${product.price_min}\u00A0\u20AC` : product.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────

export default function DesignAssistantSection() {
  const { t } = useTranslation();
  const {
    analysesUsed,
    maxAnalyses,
    pastAnalyses,
  } = useMoodBoard();

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const handleAnalysisComplete = (_result: MoodBoardResult) => {
    // Auto-switch to history tab to show the saved result
    setActiveTab("history");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-display font-bold text-foreground">
              {t("moodBoard.pageTitle")}
            </h2>
          </div>
          <p className="text-xs font-body text-muted-foreground">
            {t("moodBoard.pageSubtitle")}
          </p>
        </div>
        <CreditDots used={analysesUsed} max={maxAnalyses} t={t} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2.5 text-xs font-display font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "new"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("designAssistant.tabNewAnalysis")}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-xs font-display font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("designAssistant.tabMyAnalyses")}
          {pastAnalyses.length > 0 && (
            <span className="text-[9px] font-display font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {pastAnalyses.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "new" && (
        <MoodBoardAnalyzer onAnalysisComplete={handleAnalysisComplete} />
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {pastAnalyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Camera className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-body text-muted-foreground mb-2">
                {t("designAssistant.noAnalysesYet")}
              </p>
              <button
                onClick={() => setActiveTab("new")}
                className="text-sm font-display font-semibold text-foreground hover:underline flex items-center gap-1"
              >
                {t("designAssistant.reAnalyze")}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            pastAnalyses.map((a) => (
              <PastAnalysisCard
                key={a.id}
                analysis={a as PastAnalysis}
                t={t}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

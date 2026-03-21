import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Upload, RotateCcw, Plus, ArrowRight, Scan } from "lucide-react";
import { useMoodBoard, type MoodBoardResult, type TerraceAnalysis } from "@/hooks/useMoodBoard";
import type { DBProduct } from "@/lib/products";

// ── Upload zone (State 1) ────────────────────────────────────

interface UploadZoneProps {
  canAnalyze: boolean;
  remainingAnalyses: number;
  maxAnalyses: number;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onAnalyze: () => void;
  t: (key: string, fallback?: string) => string;
}

function UploadZone({
  canAnalyze,
  remainingAnalyses,
  maxAnalyses,
  previewUrl,
  onFileSelect,
  onAnalyze,
  t,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => canAnalyze && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-sm p-12 transition-all cursor-pointer ${
          !canAnalyze
            ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
            : isDragOver
              ? "border-foreground bg-muted/20"
              : "border-border hover:border-foreground/40 bg-background"
        }`}
      >
        {previewUrl ? (
          <div className="w-full max-w-md">
            <img
              src={previewUrl}
              alt={t("moodBoard.uploadedPreview", "Preview")}
              className="w-full h-64 object-cover rounded-sm border border-border"
            />
          </div>
        ) : (
          <>
            <Camera className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-sm font-display font-semibold text-foreground">
              {t("moodBoard.uploadTitle", "Upload a photo of your terrace")}
            </p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              {t("moodBoard.uploadHint", "Drag & drop or click to browse")}
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={!canAnalyze}
        />
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-body">
          {t("moodBoard.analysesRemaining", "{{remaining}}/{{max}} analyses remaining").replace(
            "{{remaining}}",
            String(remainingAnalyses),
          ).replace("{{max}}", String(maxAnalyses))}
        </p>

        {previewUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze();
            }}
            disabled={!canAnalyze}
            className="px-6 py-2.5 rounded-full bg-foreground text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("moodBoard.analyze", "Analyze")}
          </button>
        )}
      </div>

      {!canAnalyze && (
        <p className="text-xs text-muted-foreground font-body text-center">
          {t("moodBoard.limitReached", "You have reached the maximum number of analyses.")}
        </p>
      )}
    </div>
  );
}

// ── Analyzing overlay (State 2) ──────────────────────────────

interface AnalyzingOverlayProps {
  imageUrl: string;
  t: (key: string, fallback?: string) => string;
}

function AnalyzingOverlay({ imageUrl, t }: AnalyzingOverlayProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-sm border border-border">
        <img
          src={imageUrl}
          alt={t("moodBoard.analyzing", "Analyzing")}
          className="w-full h-80 object-cover opacity-70"
        />
        {/* Scanning animation */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
          <div className="relative w-16 h-16 mb-4">
            <Scan className="w-16 h-16 text-foreground animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-foreground/30 animate-ping" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground">
            {t("moodBoard.analyzingText", "Analyzing your space...")}
          </p>
          {/* Progress bar animation */}
          <div className="w-48 h-1 bg-border rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-foreground rounded-full animate-[moodboard-progress_2.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes moodboard-progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Tag pill ─────────────────────────────────────────────────

function TagPill({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-body text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
      {label}
    </span>
  );
}

// ── Color dot ────────────────────────────────────────────────

function ColorDot({ hex, name }: { hex: string; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full border border-border flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs text-muted-foreground font-body">{name}</span>
    </div>
  );
}

// ── Match score bar ──────────────────────────────────────────

function MatchScoreBar({ score }: { score: number }) {
  const color = score > 70 ? "bg-green-500" : score > 40 ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────

interface MatchedProductCardProps {
  product: DBProduct;
  score: number;
  onAddToProject: (product: DBProduct) => void;
  t: (key: string, fallback?: string) => string;
}

function MatchedProductCard({ product, score, onAddToProject, t }: MatchedProductCardProps) {
  return (
    <div className="border border-border rounded-sm bg-card overflow-hidden group hover:border-foreground/40 transition-all">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Camera className="w-8 h-8" />
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Name */}
        <h4 className="text-xs font-display font-semibold text-foreground leading-tight line-clamp-2">
          {product.name}
        </h4>

        {/* Category */}
        <span className="inline-block text-[10px] font-body text-muted-foreground border border-border rounded-full px-2 py-0.5">
          {product.category}
        </span>

        {/* Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-body">
              {t("moodBoard.matchScore", "Match")}
            </span>
            <span className="text-[10px] font-display font-semibold text-foreground">
              {score}%
            </span>
          </div>
          <MatchScoreBar score={score} />
        </div>

        {/* Price */}
        {(product.price_min != null || product.price_max != null) && (
          <p className="text-[10px] text-muted-foreground font-body">
            {product.price_min != null && product.price_max != null
              ? `${product.price_min}${"\u2009"}-${"\u2009"}${product.price_max} \u20AC`
              : product.price_min != null
                ? `${t("moodBoard.from", "From")} ${product.price_min} \u20AC`
                : `${t("moodBoard.upTo", "Up to")} ${product.price_max} \u20AC`}
          </p>
        )}

        {/* Add to project */}
        <button
          onClick={() => onAddToProject(product)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-display font-semibold border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-foreground transition-all"
        >
          <Plus className="w-3 h-3" />
          {t("moodBoard.addToProject", "Add to project")}
        </button>
      </div>
    </div>
  );
}

// ── Results panel (State 3) ──────────────────────────────────

interface ResultsPanelProps {
  imageUrl: string;
  analysis: TerraceAnalysis;
  matchedProducts: (DBProduct & { matchScore: number })[];
  onAddToProject: (product: DBProduct) => void;
  onReset: () => void;
  t: (key: string, fallback?: string) => string;
}

function ResultsPanel({
  imageUrl,
  analysis,
  matchedProducts,
  onAddToProject,
  onReset,
  t,
}: ResultsPanelProps) {
  const navigate = useNavigate();

  // Normalise score to 0–100 for display
  const maxRawScore = matchedProducts.length > 0 ? matchedProducts[0].matchScore : 1;
  const normalise = (raw: number) => Math.round((raw / Math.max(maxRawScore, 1)) * 100);

  // Parse color_mood string into color items
  const colorMoodItems: Array<{ name: string; hex: string }> = (() => {
    if (!analysis.color_mood) return [];
    // color_mood may be a JSON string like '[{"name":"x","hex":"#fff"}]' or a plain description
    try {
      const parsed: unknown = JSON.parse(analysis.color_mood);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is { name: string; hex: string } =>
            typeof item === "object" && item !== null && "name" in item && "hex" in item,
        );
      }
    } catch {
      // Not JSON — try simple comma split or return empty
    }
    return [];
  })();

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left panel — 40% */}
      <div className="lg:w-[40%] space-y-4">
        {/* Photo */}
        <div className="relative rounded-sm overflow-hidden border border-border">
          <img
            src={imageUrl}
            alt={t("moodBoard.yourTerrace", "Your terrace")}
            className="w-full h-64 lg:h-80 object-cover"
          />
          <button
            onClick={onReset}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-full text-[10px] font-display font-semibold text-foreground hover:bg-background transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t("moodBoard.newAnalysis", "New analysis")}
          </button>
        </div>

        {/* Analysis summary */}
        <div className="border border-border rounded-sm bg-card p-4 space-y-4">
          <h3 className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">
            {t("moodBoard.analysisTitle", "Analysis")}
          </h3>

          {/* Design summary */}
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            {analysis.design_summary}
          </p>

          {/* Tags */}
          <div className="space-y-2">
            {analysis.style_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("moodBoard.style", "Style")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.style_tags.map((tag) => (
                    <TagPill key={tag} label={tag} />
                  ))}
                </div>
              </div>
            )}

            {analysis.palette_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("moodBoard.colors", "Colors")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.palette_tags.map((tag) => (
                    <TagPill key={tag} label={tag} />
                  ))}
                </div>
              </div>
            )}

            {analysis.material_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("moodBoard.materials", "Materials")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.material_tags.map((tag) => (
                    <TagPill key={tag} label={tag} />
                  ))}
                </div>
              </div>
            )}

            {analysis.ambience_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("moodBoard.ambiance", "Ambiance")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.ambience_tags.map((tag) => (
                    <TagPill key={tag} label={tag} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color mood */}
          {colorMoodItems.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("moodBoard.colorMood", "Color mood")}
              </p>
              <div className="flex flex-wrap gap-3">
                {colorMoodItems.map((c) => (
                  <ColorDot key={c.hex} hex={c.hex} name={c.name} />
                ))}
              </div>
            </div>
          )}

          {/* Venue & capacity */}
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            {analysis.venue_type && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("moodBoard.venueType", "Venue type")}
                </p>
                <p className="text-sm font-display font-semibold text-foreground capitalize">
                  {analysis.venue_type}
                </p>
              </div>
            )}
            {analysis.estimated_capacity > 0 && (
              <div>
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("moodBoard.estimatedCapacity", "Est. capacity")}
                </p>
                <p className="text-sm font-display font-semibold text-foreground">
                  {analysis.estimated_capacity} {t("moodBoard.seats", "seats")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — 60% */}
      <div className="lg:w-[60%] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">
              {t("moodBoard.recommendedTitle", "Recommended for your space")}
            </h3>
            <p className="text-[10px] text-muted-foreground font-body mt-0.5">
              {matchedProducts.length}{" "}
              {matchedProducts.length === 1
                ? t("moodBoard.productSingular", "product")
                : t("moodBoard.productPlural", "products")}
            </p>
          </div>
        </div>

        {/* Product grid */}
        {matchedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {matchedProducts.map((product) => (
              <MatchedProductCard
                key={product.id}
                product={product}
                score={normalise(product.matchScore)}
                onAddToProject={onAddToProject}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground font-body">
              {t("moodBoard.noMatches", "No matching products found. Try uploading a different photo.")}
            </p>
          </div>
        )}

        {/* CTA */}
        {matchedProducts.length > 0 && (
          <button
            onClick={() => navigate("/projects/new")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-foreground text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {t("moodBoard.createProjectCTA", "Create a project with this selection")}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function MoodBoardAnalyzer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    canAnalyze,
    remainingAnalyses,
    maxAnalyses,
    analyzeImage,
    isAnalyzing,
    error,
  } = useMoodBoard();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MoodBoardResult | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Clean up previous preview URL
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreviewUrl(url);
    setResult(null);
  }, [imagePreviewUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;
    try {
      const res = await analyzeImage(imageFile);
      setResult(res);
    } catch {
      // Error is handled by the hook
    }
  }, [imageFile, analyzeImage]);

  const handleReset = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setResult(null);
  }, [imagePreviewUrl]);

  const handleAddToProject = useCallback(
    (_product: DBProduct) => {
      // For now, navigate to project builder. A full implementation would add to cart context.
      navigate("/projects/new");
    },
    [navigate],
  );

  // ── Determine current state ────────────────────────────────
  const state: "idle" | "preview" | "analyzing" | "results" =
    result ? "results" : isAnalyzing ? "analyzing" : imagePreviewUrl ? "preview" : "idle";

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="border border-destructive/50 bg-destructive/5 rounded-sm p-3">
          <p className="text-xs text-destructive font-body">{error}</p>
        </div>
      )}

      {/* State: idle or preview */}
      {(state === "idle" || state === "preview") && (
        <UploadZone
          canAnalyze={canAnalyze}
          remainingAnalyses={remainingAnalyses}
          maxAnalyses={maxAnalyses}
          previewUrl={imagePreviewUrl}
          onFileSelect={handleFileSelect}
          onAnalyze={handleAnalyze}
          t={t}
        />
      )}

      {/* State: analyzing */}
      {state === "analyzing" && imagePreviewUrl && (
        <AnalyzingOverlay imageUrl={imagePreviewUrl} t={t} />
      )}

      {/* State: results */}
      {state === "results" && result && imagePreviewUrl && (
        <ResultsPanel
          imageUrl={imagePreviewUrl}
          analysis={result.analysis}
          matchedProducts={result.matchedProducts}
          onAddToProject={handleAddToProject}
          onReset={handleReset}
          t={t}
        />
      )}
    </div>
  );
}

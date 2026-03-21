import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProducts, type DBProduct } from "@/lib/products";
import type { Json } from "@/integrations/supabase/types";

// ── Analysis result from the Edge Function ────────────────
export interface TerraceAnalysis {
  is_outdoor: boolean;
  venue_type: string;
  style_tags: string[];
  ambience_tags: string[];
  palette_tags: string[];
  material_tags: string[];
  use_case_tags: string[];
  estimated_capacity: number;
  space_characteristics: string[];
  furniture_categories_needed: string[];
  design_summary: string;
  color_mood: string;
}

export interface MoodBoardResult {
  analysis: TerraceAnalysis;
  matchedProducts: (DBProduct & { matchScore: number })[];
  analysisId: string;
}

// ── Stored analysis row ───────────────────────────────────
interface ImageAnalysisRow {
  id: string;
  user_id: string;
  image_path: string;
  analysis_result: Json | null;
  matched_product_ids: string[] | null;
  created_at: string | null;
}

// ── Scoring logic ─────────────────────────────────────────

function countOverlap(a: string[], b: string[]): number {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.reduce((n, tag) => n + (setB.has(tag.toLowerCase()) ? 1 : 0), 0);
}

function scoreProduct(
  analysis: TerraceAnalysis,
  product: DBProduct
): number {
  let score = 0;

  // style_tags: +3 each
  score += countOverlap(analysis.style_tags, product.style_tags) * 3;

  // ambience_tags: +2 each
  score += countOverlap(analysis.ambience_tags, product.ambience_tags) * 2;

  // palette_tags: +2 each (compare against palette_tags + main_color)
  const productPalette = [
    ...product.palette_tags,
    ...(product.main_color ? [product.main_color] : []),
  ];
  score += countOverlap(analysis.palette_tags, productPalette) * 2;

  // material_tags: +3 each
  score += countOverlap(analysis.material_tags, product.material_tags) * 3;

  // category match: +5 if product.category is in furniture_categories_needed
  const neededCategories = new Set(
    analysis.furniture_categories_needed.map((c) => c.toLowerCase())
  );
  if (neededCategories.has(product.category.toLowerCase())) {
    score += 5;
  }

  return score;
}

function matchProducts(
  analysis: TerraceAnalysis,
  products: DBProduct[]
): (DBProduct & { matchScore: number })[] {
  return products
    .map((p) => ({ ...p, matchScore: scoreProduct(analysis, p) }))
    .filter((p) => p.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);
}

// ── File → base64 helper ──────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:<media_type>;base64,<data>" — extract the data part
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── Hook ──────────────────────────────────────────────────

export function useMoodBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Platform settings ───────────────────────────────────
  const { data: settingsData } = useQuery({
    queryKey: ["platform-settings", "mood_board"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["mood_board_enabled", "mood_board_max_analyses"]);
      if (err) throw err;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const isEnabled = useMemo(() => {
    const row = settingsData?.find((r) => r.key === "mood_board_enabled");
    if (!row) return true; // default enabled
    return row.value === true || row.value === "true";
  }, [settingsData]);

  const maxAnalyses = useMemo(() => {
    const row = settingsData?.find((r) => r.key === "mood_board_max_analyses");
    if (!row) return 10; // sensible default
    const val = typeof row.value === "number" ? row.value : Number(row.value);
    return Number.isFinite(val) ? val : 10;
  }, [settingsData]);

  // ── Count user's past analyses ──────────────────────────
  const { data: analysesUsed = 0 } = useQuery({
    queryKey: ["mood-board-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error: err } = await supabase
        .from("image_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (err) throw err;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  // ── Past analyses list ──────────────────────────────────
  const { data: pastAnalyses = [] } = useQuery<ImageAnalysisRow[]>({
    queryKey: ["mood-board-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error: err } = await supabase
        .from("image_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (err) throw err;
      return (data ?? []) as ImageAnalysisRow[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  // ── Derived state ───────────────────────────────────────
  const remainingAnalyses = maxAnalyses - analysesUsed;
  const canAnalyze = isEnabled && analysesUsed < maxAnalyses && !!user;

  // ── Main analysis function ──────────────────────────────
  const analyzeImage = useCallback(
    async (file: File): Promise<MoodBoardResult> => {
      if (!user) throw new Error("User must be authenticated");
      if (!canAnalyze) throw new Error("Analysis limit reached or feature disabled");

      setIsAnalyzing(true);
      setError(null);

      try {
        // 1. Convert File to base64
        const base64 = await fileToBase64(file);
        const mediaType = file.type || "image/jpeg";

        // 2. Upload original image to Supabase storage
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("mood-images")
          .upload(filePath, file, { contentType: mediaType });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        // 3. Call the Edge Function
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "analyze-terrace",
          { body: { image: base64, media_type: mediaType } }
        );
        if (fnError) throw new Error(`Analysis failed: ${fnError.message}`);

        const analysis = fnData as TerraceAnalysis;

        // 4. Match products
        const allProducts = await fetchProducts();
        const matched = matchProducts(analysis, allProducts);
        const matchedIds = matched.map((p) => p.id);

        // 5. Insert record in image_analyses
        const { data: insertData, error: insertError } = await supabase
          .from("image_analyses")
          .insert({
            user_id: user.id,
            image_path: filePath,
            analysis_result: analysis as unknown as Json,
            matched_product_ids: matchedIds,
          })
          .select("id")
          .single();
        if (insertError) throw new Error(`Failed to save analysis: ${insertError.message}`);

        // 6. Invalidate counts / history
        await queryClient.invalidateQueries({ queryKey: ["mood-board-count", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["mood-board-history", user.id] });

        return {
          analysis,
          matchedProducts: matched,
          analysisId: insertData.id,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [user, canAnalyze, queryClient]
  );

  return {
    analysesUsed,
    maxAnalyses,
    isEnabled,
    canAnalyze,
    remainingAnalyses,
    analyzeImage,
    isAnalyzing,
    error,
    pastAnalyses,
  };
}

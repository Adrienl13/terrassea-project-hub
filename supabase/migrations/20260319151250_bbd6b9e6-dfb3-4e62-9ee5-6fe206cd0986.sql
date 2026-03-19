-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create fuzzy search function
CREATE OR REPLACE FUNCTION public.fuzzy_search_products(
  search_query text,
  lang text DEFAULT 'en',
  category_filter text DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS SETOF products
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  similarity_threshold float := 0.15;
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.publish_status = 'published'
    AND COALESCE(p.availability_type, 'available') != 'discontinued'
    AND (category_filter IS NULL OR p.category ILIKE '%' || category_filter || '%')
    AND (
      -- Exact / ILIKE matches
      p.name ILIKE '%' || search_query || '%'
      OR p.category ILIKE '%' || search_query || '%'
      OR p.subcategory ILIKE '%' || search_query || '%'
      OR p.short_description ILIKE '%' || search_query || '%'
      OR p.main_color ILIKE '%' || search_query || '%'
      -- Trigram fuzzy on name
      OR similarity(p.name, search_query) > similarity_threshold
      -- Trigram fuzzy on category / subcategory
      OR similarity(p.category, search_query) > similarity_threshold
      OR similarity(COALESCE(p.subcategory, ''), search_query) > similarity_threshold
      -- Tag array matches
      OR search_query ILIKE ANY(SELECT '%' || unnest(p.style_tags) || '%')
      OR search_query ILIKE ANY(SELECT '%' || unnest(p.material_tags) || '%')
      OR search_query ILIKE ANY(SELECT '%' || unnest(p.use_case_tags) || '%')
      -- Fuzzy on tags
      OR EXISTS (
        SELECT 1 FROM unnest(p.style_tags || p.material_tags || p.ambience_tags) AS tag
        WHERE similarity(tag, search_query) > similarity_threshold
      )
      -- Multilang tag_definitions lookup
      OR EXISTS (
        SELECT 1 FROM tag_definitions td
        WHERE td.slug = ANY(p.style_tags || p.material_tags || p.ambience_tags)
        AND (
          (lang = 'fr' AND (td.label_fr ILIKE '%' || search_query || '%' OR similarity(COALESCE(td.label_fr, ''), search_query) > similarity_threshold))
          OR (lang = 'es' AND (td.label_es ILIKE '%' || search_query || '%' OR similarity(COALESCE(td.label_es, ''), search_query) > similarity_threshold))
          OR (lang = 'it' AND (td.label_it ILIKE '%' || search_query || '%' OR similarity(COALESCE(td.label_it, ''), search_query) > similarity_threshold))
          OR (lang = 'de' AND (td.label_de ILIKE '%' || search_query || '%' OR similarity(COALESCE(td.label_de, ''), search_query) > similarity_threshold))
          OR (lang = 'en' AND (td.label_en ILIKE '%' || search_query || '%' OR similarity(td.label_en, search_query) > similarity_threshold))
        )
      )
    )
  ORDER BY
    -- Exact matches first, then by similarity score, then priority
    CASE WHEN p.name ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity(p.name, search_query) DESC,
    p.priority_score DESC NULLS LAST,
    p.popularity_score DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Add trigram indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_trgm ON products USING gin (category gin_trgm_ops);
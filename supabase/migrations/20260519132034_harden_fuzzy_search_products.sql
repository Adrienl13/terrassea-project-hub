-- Harden public.fuzzy_search_products :
--
-- 1. Switch SECURITY DEFINER → SECURITY INVOKER. RLS audit confirmed both
--    underlying tables are readable by anon :
--      - products.products_select_combined  → published + non-discontinued
--      - tag_definitions."Public can read tag definitions"  → USING (true)
--    So this function no longer needs DEFINER to bypass RLS. Removing
--    DEFINER means the function's row visibility tracks RLS automatically,
--    eliminating the drift risk (if RLS on products ever tightens, the
--    function stops leaking the now-restricted rows).
--
-- 2. Cap limit_count to [1, 100] to prevent enumeration / bulk scraping
--    via a single call. Default stays at 50 when caller omits the arg.
--
-- Signature, return type (SETOF products) and search semantics are
-- preserved — no client-side change required.

CREATE OR REPLACE FUNCTION public.fuzzy_search_products(
  search_query text,
  lang text DEFAULT 'en'::text,
  category_filter text DEFAULT NULL::text,
  limit_count integer DEFAULT 50
)
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $function$
DECLARE
  similarity_threshold float := 0.15;
  v_limit             integer := LEAST(GREATEST(COALESCE(limit_count, 50), 1), 100);
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.publish_status = 'published'
    AND p.duplicate_of IS NULL
    AND COALESCE(p.availability_type, 'available') <> 'discontinued'
    AND (category_filter IS NULL OR p.category ILIKE '%' || category_filter || '%')
    AND (
      p.name ILIKE '%' || search_query || '%'
      OR p.category ILIKE '%' || search_query || '%'
      OR p.subcategory ILIKE '%' || search_query || '%'
      OR p.short_description ILIKE '%' || search_query || '%'
      OR p.main_color ILIKE '%' || search_query || '%'
      OR similarity(p.name, search_query) > similarity_threshold
      OR similarity(p.category, search_query) > similarity_threshold
      OR similarity(COALESCE(p.subcategory, ''), search_query) > similarity_threshold
      OR search_query ILIKE ANY(SELECT '%' || unnest(p.style_tags) || '%')
      OR search_query ILIKE ANY(SELECT '%' || unnest(p.material_tags) || '%')
      OR search_query ILIKE ANY(SELECT '%' || unnest(p.use_case_tags) || '%')
      OR EXISTS (
        SELECT 1 FROM unnest(p.style_tags || p.material_tags || p.ambience_tags) AS tag
        WHERE similarity(tag, search_query) > similarity_threshold
      )
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
    CASE WHEN p.name ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    similarity(p.name, search_query) DESC,
    p.priority_score DESC NULLS LAST,
    p.popularity_score DESC NULLS LAST
  LIMIT v_limit;
END;
$function$;

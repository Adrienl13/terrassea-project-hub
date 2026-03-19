CREATE OR REPLACE FUNCTION public.search_products_multilang(
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
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.publish_status = 'published'
    AND COALESCE(p.availability_type, 'available') != 'discontinued'
    AND (category_filter IS NULL OR p.category ILIKE '%' || category_filter || '%')
    AND (
      p.name ILIKE '%' || search_query || '%'
      OR p.category ILIKE '%' || search_query || '%'
      OR p.subcategory ILIKE '%' || search_query || '%'
      OR p.short_description ILIKE '%' || search_query || '%'
      OR p.main_color ILIKE '%' || search_query || '%'
      OR search_query ILIKE ANY(
        SELECT '%' || unnest(p.style_tags) || '%'
      )
      OR search_query ILIKE ANY(
        SELECT '%' || unnest(p.material_tags) || '%'
      )
      OR search_query ILIKE ANY(
        SELECT '%' || unnest(p.use_case_tags) || '%'
      )
      OR EXISTS (
        SELECT 1 FROM tag_definitions td
        WHERE td.slug = ANY(p.style_tags || p.material_tags || p.ambience_tags)
        AND (
          (lang = 'fr' AND td.label_fr ILIKE '%' || search_query || '%')
          OR (lang = 'es' AND td.label_es ILIKE '%' || search_query || '%')
          OR (lang = 'it' AND td.label_it ILIKE '%' || search_query || '%')
          OR (lang = 'de' AND td.label_de ILIKE '%' || search_query || '%')
          OR (lang = 'en' AND td.label_en ILIKE '%' || search_query || '%')
        )
      )
    )
  ORDER BY p.priority_score DESC NULLS LAST, p.popularity_score DESC NULLS LAST
  LIMIT limit_count;
END;
$$;
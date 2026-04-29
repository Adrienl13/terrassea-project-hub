-- Fix: concept_funnel view must use SECURITY INVOKER so RLS on the
-- underlying scoring_snapshots / concept_events tables is enforced for
-- the querying user. Without this, non-admins could read via the view.

CREATE OR REPLACE VIEW public.concept_funnel
WITH (security_invoker = true) AS
SELECT
  s.id                            AS snapshot_id,
  s.scoring_version,
  s.created_at                    AS generated_at,
  s.parameters->>'establishmentType'  AS establishment_type,
  s.parameters->>'budgetLevel'        AS budget_level,
  (s.parameters->>'seatingCapacity')::int AS seating_capacity,
  array_length(s.concept_ids, 1)  AS concepts_generated,
  COUNT(e.id) FILTER (WHERE e.event_type = 'concept_viewed')         AS views,
  COUNT(e.id) FILTER (WHERE e.event_type = 'concept_expanded')       AS expansions,
  COUNT(e.id) FILTER (WHERE e.event_type = 'product_added_to_cart')  AS products_added,
  COUNT(e.id) FILTER (WHERE e.event_type = 'quote_requested')        AS quotes_requested,
  COUNT(DISTINCT e.concept_id) FILTER (WHERE e.event_type = 'concept_expanded') AS distinct_concepts_expanded
FROM public.scoring_snapshots s
LEFT JOIN public.concept_events e ON e.snapshot_id = s.id
GROUP BY s.id;

COMMENT ON VIEW public.concept_funnel IS
  'Chantier 1 (feedback loop). Aggregated funnel view. SECURITY INVOKER = RLS of underlying tables is enforced.';

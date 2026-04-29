-- ============================================================================
-- CHANTIER 1 — Feedback Loop Infrastructure
-- ============================================================================
-- Enables observation of which concepts convert: from generation → view →
-- expand → add-to-cart → quote request. Required foundation for A/B testing
-- scoring weights and iterating on product selection logic.
--
-- Two tables:
--   scoring_snapshots  — immutable record of the generation context (params +
--                        scoring version + concept ids), 1 row per generation
--   concept_events     — interaction stream (viewed, expanded, product_added,
--                        alternative_toggled, quote_requested), many per
--                        snapshot
--
-- Anonymous inserts allowed (unauthenticated users generate concepts too).
-- Read access restricted to admins.
-- ============================================================================

-- ── scoring_snapshots: immutable generation context ─────────────────────────

CREATE TABLE IF NOT EXISTS public.scoring_snapshots (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         text NOT NULL,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scoring_version    text NOT NULL,
  parameters         jsonb NOT NULL,
  concept_ids        text[] NOT NULL DEFAULT '{}',
  concept_titles     text[] NOT NULL DEFAULT '{}',
  selected_product_ids uuid[] NOT NULL DEFAULT '{}',
  generation_context jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scoring_snapshots_session_idx
  ON public.scoring_snapshots(session_id);
CREATE INDEX IF NOT EXISTS scoring_snapshots_user_idx
  ON public.scoring_snapshots(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS scoring_snapshots_created_idx
  ON public.scoring_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS scoring_snapshots_version_idx
  ON public.scoring_snapshots(scoring_version);

ALTER TABLE public.scoring_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert scoring snapshots"
  ON public.scoring_snapshots
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins read scoring snapshots"
  ON public.scoring_snapshots
  FOR SELECT
  USING (public.is_admin());

-- ── concept_events: interaction stream ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.concept_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id        uuid REFERENCES public.scoring_snapshots(id) ON DELETE CASCADE,
  session_id         text NOT NULL,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type         text NOT NULL
                     CHECK (event_type IN (
                       'concept_generated',
                       'concept_viewed',
                       'concept_expanded',
                       'alternative_toggled',
                       'product_added_to_cart',
                       'product_removed_from_cart',
                       'quote_requested',
                       'layout_edited',
                       'concept_dismissed'
                     )),
  concept_id         text,
  concept_title      text,
  product_id         uuid,
  quantity           integer,
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS concept_events_snapshot_idx
  ON public.concept_events(snapshot_id);
CREATE INDEX IF NOT EXISTS concept_events_session_idx
  ON public.concept_events(session_id);
CREATE INDEX IF NOT EXISTS concept_events_type_idx
  ON public.concept_events(event_type);
CREATE INDEX IF NOT EXISTS concept_events_product_idx
  ON public.concept_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS concept_events_created_idx
  ON public.concept_events(created_at DESC);

ALTER TABLE public.concept_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert concept events"
  ON public.concept_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins read concept events"
  ON public.concept_events
  FOR SELECT
  USING (public.is_admin());

-- ── Aggregation view: conversion funnel per snapshot ────────────────────────
-- Useful for admin dashboards and A/B comparisons.

CREATE OR REPLACE VIEW public.concept_funnel AS
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

-- View inherits RLS from underlying tables (admin-only read).

COMMENT ON TABLE public.scoring_snapshots IS
  'Chantier 1 (feedback loop). Immutable record of a concept-generation event, capturing the scoring version + input parameters to enable A/B comparison.';
COMMENT ON TABLE public.concept_events IS
  'Chantier 1 (feedback loop). Stream of user interactions with generated concepts, linked to snapshot_id for conversion-funnel analysis.';
COMMENT ON VIEW public.concept_funnel IS
  'Chantier 1 (feedback loop). Aggregated funnel view: views → expansions → add-to-cart → quote, grouped by scoring_version.';

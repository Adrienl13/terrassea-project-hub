import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ProjectParameters, ProjectConcept } from "@/engine/types";

// JSON columns in Supabase generated types use the recursive `Json` union.
// Our client-side metadata shape is `Record<string, unknown>`; cast at the
// boundary rather than making every call site build a strict Json tree.
const asJson = (value: unknown): Json => value as Json;

// ═══════════════════════════════════════════════════════════
// CONCEPT TRACKING — Chantier 1 feedback loop client
// ═══════════════════════════════════════════════════════════
// Logs interactions with generated concepts so we can measure conversion
// funnels and A/B-compare scoring versions. Non-blocking: all calls are
// fire-and-forget. A failure here must never break user flow.
// ═══════════════════════════════════════════════════════════

// Bump when scoring weights / algorithm materially change. Snapshots are
// grouped by this value in aggregation views, so it's how we compare
// conversion rates across engine iterations.
export const SCORING_VERSION = "v1.0.0";

const SESSION_KEY = "terrassea_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return "unavailable";
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Snapshot: called once per concept generation ───────────

export interface SnapshotInput {
  parameters: ProjectParameters;
  concepts: ProjectConcept[];
  generationContext?: Record<string, unknown>;
}

export async function logGenerationSnapshot(
  input: SnapshotInput
): Promise<string | null> {
  const sessionId = getSessionId();
  const userId = await getUserId();

  const selectedProductIds = new Set<string>();
  for (const concept of input.concepts) {
    concept.bom?.slots?.forEach((slot) => selectedProductIds.add(slot.product.id));
    concept.products?.forEach((p) => selectedProductIds.add(p.productId));
  }

  try {
    const { data, error } = await supabase
      .from("scoring_snapshots")
      .insert({
        session_id: sessionId,
        user_id: userId,
        scoring_version: SCORING_VERSION,
        parameters: asJson(input.parameters),
        concept_ids: input.concepts.map((c) => c.id),
        concept_titles: input.concepts.map((c) => c.title),
        selected_product_ids: Array.from(selectedProductIds),
        generation_context: input.generationContext
          ? asJson(input.generationContext)
          : null,
      })
      .select("id")
      .single();

    if (error || !data) return null;

    // Log companion "concept_generated" event for funnel unity
    void logEvent({
      snapshotId: data.id,
      eventType: "concept_generated",
      metadata: {
        conceptCount: input.concepts.length,
        totalProducts: selectedProductIds.size,
      },
    });

    return data.id;
  } catch {
    return null;
  }
}

// ── Event logging ──────────────────────────────────────────

export type ConceptEventType =
  | "concept_generated"
  | "concept_viewed"
  | "concept_expanded"
  | "alternative_toggled"
  | "product_added_to_cart"
  | "product_removed_from_cart"
  | "quote_requested"
  | "layout_edited"
  | "concept_dismissed";

export interface EventInput {
  snapshotId?: string | null;
  eventType: ConceptEventType;
  conceptId?: string;
  conceptTitle?: string;
  productId?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}

export async function logEvent(input: EventInput): Promise<void> {
  const sessionId = getSessionId();
  const userId = await getUserId();

  try {
    await supabase.from("concept_events").insert({
      snapshot_id: input.snapshotId ?? null,
      session_id: sessionId,
      user_id: userId,
      event_type: input.eventType,
      concept_id: input.conceptId ?? null,
      concept_title: input.conceptTitle ?? null,
      product_id: input.productId ?? null,
      quantity: input.quantity ?? null,
      metadata: input.metadata ? asJson(input.metadata) : null,
    });
  } catch {
    // Silent — tracking must never break UX
  }
}

// ── Convenience wrappers for call sites ────────────────────

export const trackConceptViewed = (
  snapshotId: string | null,
  concept: Pick<ProjectConcept, "id" | "title">
) =>
  logEvent({
    snapshotId,
    eventType: "concept_viewed",
    conceptId: concept.id,
    conceptTitle: concept.title,
  });

export const trackConceptExpanded = (
  snapshotId: string | null,
  concept: Pick<ProjectConcept, "id" | "title">
) =>
  logEvent({
    snapshotId,
    eventType: "concept_expanded",
    conceptId: concept.id,
    conceptTitle: concept.title,
  });

export const trackAlternativeToggled = (
  snapshotId: string | null,
  concept: Pick<ProjectConcept, "id" | "title">,
  showingAlternative: boolean
) =>
  logEvent({
    snapshotId,
    eventType: "alternative_toggled",
    conceptId: concept.id,
    conceptTitle: concept.title,
    metadata: { showingAlternative },
  });

export const trackProductAddedToCart = (
  snapshotId: string | null,
  conceptId: string,
  conceptTitle: string,
  productId: string,
  quantity: number,
  extra?: Record<string, unknown>
) =>
  logEvent({
    snapshotId,
    eventType: "product_added_to_cart",
    conceptId,
    conceptTitle,
    productId,
    quantity,
    metadata: extra,
  });

export const trackQuoteRequested = (
  snapshotId: string | null,
  conceptId: string | undefined,
  productIds: string[]
) =>
  logEvent({
    snapshotId,
    eventType: "quote_requested",
    conceptId,
    metadata: { productIds, productCount: productIds.length },
  });

export const trackLayoutEdited = (
  snapshotId: string | null,
  conceptId: string
) =>
  logEvent({
    snapshotId,
    eventType: "layout_edited",
    conceptId,
  });

// ── Admin analytics helpers ────────────────────────────────
// Reads are gated by RLS to admins only. These helpers are safe to call from
// admin UIs without extra permission checks — non-admins receive empty arrays.

export interface FunnelRow {
  snapshot_id: string;
  scoring_version: string;
  generated_at: string;
  establishment_type: string | null;
  budget_level: string | null;
  seating_capacity: number | null;
  concepts_generated: number;
  views: number;
  expansions: number;
  products_added: number;
  quotes_requested: number;
  distinct_concepts_expanded: number;
}

export async function fetchConceptFunnel(
  limit = 100
): Promise<FunnelRow[]> {
  const { data, error } = await supabase
    .from("concept_funnel")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as FunnelRow[];
}

export interface ScoringVersionAggregate {
  scoring_version: string;
  total_generations: number;
  total_views: number;
  total_products_added: number;
  total_quotes: number;
  view_rate: number;
  add_to_cart_rate: number;
  quote_rate: number;
}

export async function aggregateByScoringVersion(): Promise<
  ScoringVersionAggregate[]
> {
  const rows = await fetchConceptFunnel(1000);
  const buckets: Record<string, ScoringVersionAggregate> = {};

  for (const row of rows) {
    const key = row.scoring_version;
    if (!buckets[key]) {
      buckets[key] = {
        scoring_version: key,
        total_generations: 0,
        total_views: 0,
        total_products_added: 0,
        total_quotes: 0,
        view_rate: 0,
        add_to_cart_rate: 0,
        quote_rate: 0,
      };
    }
    const bucket = buckets[key];
    bucket.total_generations += 1;
    bucket.total_views += row.views ?? 0;
    bucket.total_products_added += row.products_added ?? 0;
    bucket.total_quotes += row.quotes_requested ?? 0;
  }

  for (const bucket of Object.values(buckets)) {
    bucket.view_rate =
      bucket.total_generations > 0
        ? bucket.total_views / bucket.total_generations
        : 0;
    bucket.add_to_cart_rate =
      bucket.total_views > 0
        ? bucket.total_products_added / bucket.total_views
        : 0;
    bucket.quote_rate =
      bucket.total_generations > 0
        ? bucket.total_quotes / bucket.total_generations
        : 0;
  }

  return Object.values(buckets).sort((a, b) =>
    b.scoring_version.localeCompare(a.scoring_version)
  );
}

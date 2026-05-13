// ============================================================================
// supabaseAction — Standardized error handling for supabase writes.
//
// Origin : Dette 75 audit (2026-05-13). 7 latent bugs across Lots C/A/B/C/D
// of Dette 59 + AdminProductReview + AdminPartners cascade + AdminOrderTracking
// were masked by the same antipattern : `await supabase.from(...).X(...)` without
// `{ error }` destructure, wrapped in a silent `catch{}`, then a misleading
// `toast.success(...)`.
//
// This module provides four variants covering the patterns surfaced in Lots 1-4 :
//
//   • runSupabaseAction      — standard single write/read (Lot 4 style)
//   • runBulkSupabaseAction  — loop with ok/fail counter + adaptive toast (Lot 1 style)
//   • runRpcAction           — SECURITY DEFINER RPC wrapper (Lot 2 style)
//   • runMultiStepAction     — sequential steps marked critical/non-critical (Lot 3 style)
//
// The companion hook `useSupabaseAction()` in supabaseAction.hook.ts binds
// these to the React Query client for component-side use.
//
// Each function :
//   - Destructures { error } and surfaces it via console.error with a structured context tag
//   - Fires toast.{success,warning,error} adaptively (or skips if message is null)
//   - Invalidates React Query keys passed in `invalidateQueries`
//   - Returns a discriminated union { ok: true, data } | { ok: false, error }
//
// Convention enforced :
//   - NEVER let a supabase error fall through silently
//   - NEVER fire a success toast on a non-validated write
//   - When a non-critical step fails, fire toast.warning (not toast.error)
// ============================================================================

import type { PostgrestError } from "@supabase/supabase-js";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────────────

export type SupabaseActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PostgrestError | Error };

export interface SupabaseQueryResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

interface BaseOptions {
  /** Structured tag for console.error logging, e.g. "admin.products.bulkOffline". */
  context: string;
  /** Pre-translated text to display on success (omit to stay silent). */
  successMessage?: string | null;
  /** Pre-translated text to display on error. Required. */
  errorMessage: string;
  /** React Query keys to invalidate after success. */
  invalidateQueries?: QueryKey[];
  /** Optional QueryClient instance (passed from the hook or App-level singleton). */
  queryClient?: QueryClient;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function logError(context: string, error: unknown, meta?: Record<string, unknown>) {
  if (meta) {
    console.error(`[${context}]`, error, meta);
  } else {
    console.error(`[${context}]`, error);
  }
}

function invalidate(queryClient: QueryClient | undefined, keys: QueryKey[] | undefined) {
  if (!queryClient || !keys || keys.length === 0) return;
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

// ── 1. Standard single action (Lot 4 style) ─────────────────────────────────

interface StandardOptions<T> extends BaseOptions {
  /**
   * Function returning a Supabase response. Typical use :
   *   action: () => supabase.from("orders").update(...).eq("id", id)
   * or for selects :
   *   action: () => supabase.from("orders").select("*").eq("id", id).single()
   */
  action: () => PromiseLike<SupabaseQueryResponse<T>>;
  /** Treat a null data result as an error (default false — many writes return null data). */
  requireData?: boolean;
}

export async function runSupabaseAction<T>(opts: StandardOptions<T>): Promise<SupabaseActionResult<T>> {
  const { action, context, successMessage, errorMessage, invalidateQueries, queryClient, requireData = false } = opts;

  let response: SupabaseQueryResponse<T>;
  try {
    response = await action();
  } catch (err) {
    logError(context, err);
    toast.error(errorMessage);
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }

  const { data, error } = response;

  if (error) {
    logError(context, error);
    toast.error(errorMessage);
    return { ok: false, error };
  }

  if (requireData && data == null) {
    const err = new Error(`[${context}] expected data, got null`);
    logError(context, err);
    toast.error(errorMessage);
    return { ok: false, error: err };
  }

  if (successMessage) toast.success(successMessage);
  invalidate(queryClient, invalidateQueries);

  return { ok: true, data: data as T };
}

// ── 2. Bulk action with ok/fail counter (Lot 1 style) ───────────────────────

interface BulkOptions<TItem> {
  items: TItem[];
  /** Function executed for each item. Should return a Supabase response (error optional). */
  actionForItem: (item: TItem) => PromiseLike<{ error: PostgrestError | null }>;
  context: string;
  /** Toast when all items succeed (receives `ok` count). */
  fullSuccessMessage: (ok: number) => string;
  /** Toast when partial success (mix ok/fail). */
  partialMessage: (ok: number, failed: number) => string;
  /** Toast when nothing succeeded. */
  fullErrorMessage: (failed: number) => string;
  invalidateQueries?: QueryKey[];
  queryClient?: QueryClient;
}

export async function runBulkSupabaseAction<TItem>(
  opts: BulkOptions<TItem>,
): Promise<{ ok: number; failed: number; total: number }> {
  const { items, actionForItem, context, fullSuccessMessage, partialMessage, fullErrorMessage, invalidateQueries, queryClient } = opts;

  let ok = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const { error } = await actionForItem(item);
      if (error) {
        logError(`${context}:item`, error, { item });
        failed++;
      } else {
        ok++;
      }
    } catch (err) {
      logError(`${context}:item`, err, { item });
      failed++;
    }
  }

  invalidate(queryClient, invalidateQueries);

  if (failed === 0) {
    toast.success(fullSuccessMessage(ok));
  } else if (ok === 0) {
    toast.error(fullErrorMessage(failed));
  } else {
    toast.warning(partialMessage(ok, failed));
  }

  return { ok, failed, total: items.length };
}

// ── 3. RPC SECURITY DEFINER action (Lot 2 style) ────────────────────────────

interface RpcOptions<TParams, TResult> extends BaseOptions {
  /** Function returning a Supabase RPC call. Typical use :
   *   call: () => supabase.rpc("delete_partner_cascade", { p_partner_id: id })
   */
  call: () => Promise<SupabaseQueryResponse<TResult>>;
  /** Optional callback receiving the RPC return payload (e.g. counters) to compute success message. */
  successFromPayload?: (data: TResult) => string | null;
  /** Used as the static success message if `successFromPayload` is not provided. */
  successMessage?: string | null;
}

export async function runRpcAction<TParams, TResult>(opts: RpcOptions<TParams, TResult>): Promise<SupabaseActionResult<TResult>> {
  const { call, context, errorMessage, invalidateQueries, queryClient, successFromPayload, successMessage } = opts;

  let response: SupabaseQueryResponse<TResult>;
  try {
    response = await call();
  } catch (err) {
    logError(context, err);
    toast.error(errorMessage);
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }

  const { data, error } = response;

  if (error) {
    logError(context, error);
    toast.error(errorMessage);
    return { ok: false, error };
  }

  const computedSuccess = successFromPayload && data != null ? successFromPayload(data) : successMessage ?? null;
  if (computedSuccess) toast.success(computedSuccess);

  invalidate(queryClient, invalidateQueries);

  return { ok: true, data: data as TResult };
}

// ── 4. Multi-step action (Lot 3 style — atomic-ish across multiple writes) ──

interface StepDescriptor {
  label: string;
  action: () => PromiseLike<{ error: PostgrestError | null }>;
  /** When true, a failure aborts the chain and fires toast.error.
   *  When false, the failure is logged + toast.warning + the chain continues. */
  isCritical: boolean;
}

interface MultiStepOptions {
  steps: StepDescriptor[];
  context: string;
  successMessage: string;
  /** Used when one or more non-critical steps failed (drift acceptable but visible). */
  partialWarningMessage: string;
  /** Used when a critical step failed and the chain aborted. */
  errorMessage: string;
  invalidateQueries?: QueryKey[];
  queryClient?: QueryClient;
}

export async function runMultiStepAction(
  opts: MultiStepOptions,
): Promise<{ ok: boolean; completedSteps: number; failedSteps: string[] }> {
  const { steps, context, successMessage, partialWarningMessage, errorMessage, invalidateQueries, queryClient } = opts;

  const failedSteps: string[] = [];
  let completedSteps = 0;
  for (const step of steps) {
    try {
      const { error } = await step.action();
      if (error) {
        logError(`${context}:${step.label}`, error);
        failedSteps.push(step.label);
        if (step.isCritical) {
          toast.error(errorMessage);
          return { ok: false, completedSteps, failedSteps };
        }
      } else {
        completedSteps++;
      }
    } catch (err) {
      logError(`${context}:${step.label}`, err);
      failedSteps.push(step.label);
      if (step.isCritical) {
        toast.error(errorMessage);
        return { ok: false, completedSteps, failedSteps };
      }
    }
  }

  invalidate(queryClient, invalidateQueries);

  if (failedSteps.length === 0) {
    toast.success(successMessage);
  } else {
    toast.warning(partialWarningMessage);
  }

  return { ok: true, completedSteps, failedSteps };
}

// ============================================================================
// useSupabaseAction — React hook binding the supabaseAction helpers to the
// component-scoped React Query client. Use this from React components/hooks
// for ergonomic API. For non-React contexts (workers, etc.), import the bare
// functions from ./supabaseAction and pass `queryClient` explicitly.
// ============================================================================

import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  runBulkSupabaseAction,
  runMultiStepAction,
  runRpcAction,
  runSupabaseAction,
} from "./supabaseAction";

export function useSupabaseAction() {
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      standard: <T,>(opts: Omit<Parameters<typeof runSupabaseAction<T>>[0], "queryClient">) =>
        runSupabaseAction<T>({ ...opts, queryClient }),
      bulk: <TItem,>(opts: Omit<Parameters<typeof runBulkSupabaseAction<TItem>>[0], "queryClient">) =>
        runBulkSupabaseAction<TItem>({ ...opts, queryClient }),
      rpc: <TParams, TResult>(opts: Omit<Parameters<typeof runRpcAction<TParams, TResult>>[0], "queryClient">) =>
        runRpcAction<TParams, TResult>({ ...opts, queryClient }),
      multiStep: (opts: Omit<Parameters<typeof runMultiStepAction>[0], "queryClient">) =>
        runMultiStepAction({ ...opts, queryClient }),
    }),
    [queryClient],
  );
}

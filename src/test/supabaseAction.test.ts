// Tests for src/utils/supabaseAction.ts (Dette 75 Lot 5)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// Imports must happen after the mock is registered.
import { toast } from "sonner";
import {
  runBulkSupabaseAction,
  runMultiStepAction,
  runRpcAction,
  runSupabaseAction,
} from "../utils/supabaseAction";

const success = toast.success as ReturnType<typeof vi.fn>;
const warning = toast.warning as ReturnType<typeof vi.fn>;
const error = toast.error as ReturnType<typeof vi.fn>;

const makeQueryClient = (): QueryClient =>
  ({
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient);

beforeEach(() => {
  success.mockClear();
  warning.mockClear();
  error.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runSupabaseAction (standard)", () => {
  it("returns ok:true and fires success + invalidate on a successful response", async () => {
    const qc = makeQueryClient();
    const result = await runSupabaseAction({
      action: async () => ({ data: { id: "abc" }, error: null }),
      context: "test.standard",
      successMessage: "ok!",
      errorMessage: "fail!",
      invalidateQueries: [["foo"]],
      queryClient: qc,
    });

    expect(result).toEqual({ ok: true, data: { id: "abc" } });
    expect(success).toHaveBeenCalledWith("ok!");
    expect(error).not.toHaveBeenCalled();
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["foo"] });
  });

  it("returns ok:false and fires error when supabase returns error", async () => {
    const qc = makeQueryClient();
    const pgError = { message: "RLS denied", details: "", hint: "", code: "42501", name: "PostgrestError" } as never;
    const result = await runSupabaseAction({
      action: async () => ({ data: null, error: pgError }),
      context: "test.standard",
      successMessage: "ok!",
      errorMessage: "fail!",
      queryClient: qc,
    });

    expect(result.ok).toBe(false);
    expect(error).toHaveBeenCalledWith("fail!");
    expect(success).not.toHaveBeenCalled();
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it("treats null data as error when requireData is true", async () => {
    const result = await runSupabaseAction({
      action: async () => ({ data: null, error: null }),
      context: "test.requireData",
      errorMessage: "no data",
      requireData: true,
    });
    expect(result.ok).toBe(false);
    expect(error).toHaveBeenCalledWith("no data");
  });

  it("catches thrown exceptions and surfaces them as errors", async () => {
    const result = await runSupabaseAction({
      action: async () => {
        throw new Error("network down");
      },
      context: "test.throw",
      errorMessage: "boom",
    });
    expect(result.ok).toBe(false);
    expect(error).toHaveBeenCalledWith("boom");
  });

  it("skips success toast when successMessage is null", async () => {
    const result = await runSupabaseAction({
      action: async () => ({ data: { id: 1 }, error: null }),
      context: "test.quiet",
      errorMessage: "fail!",
      successMessage: null,
    });
    expect(result.ok).toBe(true);
    expect(success).not.toHaveBeenCalled();
  });
});

describe("runBulkSupabaseAction", () => {
  it("fires fullSuccess when all items succeed", async () => {
    const qc = makeQueryClient();
    const result = await runBulkSupabaseAction({
      items: [1, 2, 3],
      actionForItem: async () => ({ error: null }),
      context: "test.bulk",
      fullSuccessMessage: (ok) => `done ${ok}`,
      partialMessage: () => "partial",
      fullErrorMessage: () => "fail",
      invalidateQueries: [["bulk"]],
      queryClient: qc,
    });

    expect(result).toEqual({ ok: 3, failed: 0, total: 3 });
    expect(success).toHaveBeenCalledWith("done 3");
    expect(warning).not.toHaveBeenCalled();
    expect(qc.invalidateQueries).toHaveBeenCalled();
  });

  it("fires warning when partial failure", async () => {
    let calls = 0;
    const result = await runBulkSupabaseAction({
      items: [1, 2, 3],
      actionForItem: async () => {
        calls++;
        return calls === 2 ? { error: { message: "fail", details: "", hint: "", code: "x", name: "PostgrestError" } as never } : { error: null };
      },
      context: "test.bulk",
      fullSuccessMessage: () => "ok",
      partialMessage: (ok, failed) => `${ok}/${failed}`,
      fullErrorMessage: () => "fail",
    });

    expect(result).toEqual({ ok: 2, failed: 1, total: 3 });
    expect(warning).toHaveBeenCalledWith("2/1");
  });

  it("fires error when all items fail", async () => {
    const result = await runBulkSupabaseAction({
      items: [1, 2],
      actionForItem: async () => ({ error: { message: "no", details: "", hint: "", code: "x", name: "PostgrestError" } as never }),
      context: "test.bulk",
      fullSuccessMessage: () => "ok",
      partialMessage: () => "partial",
      fullErrorMessage: (f) => `all ${f} failed`,
    });

    expect(result).toEqual({ ok: 0, failed: 2, total: 2 });
    expect(error).toHaveBeenCalledWith("all 2 failed");
  });
});

describe("runRpcAction", () => {
  it("fires successFromPayload when provided", async () => {
    const result = await runRpcAction<{ id: string }, { count: number }>({
      call: async () => ({ data: { count: 5 }, error: null }),
      context: "test.rpc",
      errorMessage: "fail",
      successFromPayload: (data) => `deleted ${data.count}`,
    });

    expect(result.ok).toBe(true);
    expect(success).toHaveBeenCalledWith("deleted 5");
  });

  it("falls back to successMessage when no payload-based mapper", async () => {
    await runRpcAction<{ id: string }, { count: number }>({
      call: async () => ({ data: { count: 1 }, error: null }),
      context: "test.rpc",
      errorMessage: "fail",
      successMessage: "done",
    });
    expect(success).toHaveBeenCalledWith("done");
  });

  it("returns error when rpc returns error", async () => {
    const result = await runRpcAction<unknown, unknown>({
      call: async () => ({ data: null, error: { message: "unauthorized", details: "", hint: "", code: "42501", name: "PostgrestError" } as never }),
      context: "test.rpc",
      errorMessage: "denied",
    });
    expect(result.ok).toBe(false);
    expect(error).toHaveBeenCalledWith("denied");
  });
});

describe("runMultiStepAction", () => {
  it("fires success when all steps succeed", async () => {
    const result = await runMultiStepAction({
      steps: [
        { label: "step1", action: async () => ({ error: null }), isCritical: true },
        { label: "step2", action: async () => ({ error: null }), isCritical: false },
      ],
      context: "test.multi",
      successMessage: "ok",
      partialWarningMessage: "partial",
      errorMessage: "fail",
    });
    expect(result).toEqual({ ok: true, completedSteps: 2, failedSteps: [] });
    expect(success).toHaveBeenCalledWith("ok");
  });

  it("aborts on critical step failure", async () => {
    const step2 = vi.fn();
    const result = await runMultiStepAction({
      steps: [
        { label: "step1", action: async () => ({ error: { message: "no", details: "", hint: "", code: "x", name: "PostgrestError" } as never }), isCritical: true },
        { label: "step2", action: step2, isCritical: true },
      ],
      context: "test.multi",
      successMessage: "ok",
      partialWarningMessage: "partial",
      errorMessage: "fail",
    });
    expect(result.ok).toBe(false);
    expect(step2).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("fail");
  });

  it("continues past non-critical failure and fires warning", async () => {
    let calls = 0;
    const result = await runMultiStepAction({
      steps: [
        { label: "step1", action: async () => ({ error: null }), isCritical: true },
        { label: "step2", action: async () => { calls++; return { error: { message: "minor", details: "", hint: "", code: "x", name: "PostgrestError" } as never }; }, isCritical: false },
        { label: "step3", action: async () => ({ error: null }), isCritical: true },
      ],
      context: "test.multi",
      successMessage: "ok",
      partialWarningMessage: "drift",
      errorMessage: "fail",
    });
    expect(result.ok).toBe(true);
    expect(result.failedSteps).toEqual(["step2"]);
    expect(calls).toBe(1);
    expect(warning).toHaveBeenCalledWith("drift");
  });
});

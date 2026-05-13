# ADR — Error Handling Convention (`supabaseAction` helper)

> **Status** : ACCEPTED — 13 mai 2026
> **Origin** : Dette 75 Lot 5 (closure)
> **Authors** : Adrien Laniez · Claude
> **Linked docs** : `TOAST_TROMPEUR_AUDIT.md`, `DETTE_TECHNIQUE_AUDIT.md` (Dettes 75, 81, 82, 83)

---

## 1. Context

### What happened

Between Dette 30 (6 mai 2026) and Dette 59 Lot C (12 mai 2026), an internal feature — the admin "Demander des informations complémentaires" flow on partner applications — was **silently broken in production for 6 days**. The admin saw a green `toast.success("Demande d'informations envoyée par email.")` every time they used it. In reality :

1. The `partner_applications.admin_notes` column never existed → the UPDATE failed.
2. The `status` CHECK constraint rejected `'info_requested'` → second silent UPDATE failure.
3. The frontend read `selected.contact_email` instead of the real column `email` → recipient was `undefined`.
4. The Edge Function `send-notification-email` returned 401 (auth model mismatch).

Three bugs stacked, all swallowed by `try { ... } catch { /* silent */ }` + an unconditional `toast.success`.

### Audit findings (Dette 75)

A subsequent transverse audit scanned 166 `toast.success` callsites and ~55 silent catches. **5 critical/élevé/moyen cases** were identified and fixed in Lots 1-4 :

| Lot | Cas | Pattern |
|---|---|---|
| 1 | `AdminProductReview` bulk offline + bulk delete | Bulk write without `{ error }` check |
| 2 | `AdminPartners` cascade delete (9 tables) | Multi-write without atomicity |
| 3 | `AdminOrderTracking` auto-upgrade plan | 2-write drift risk |
| 4 | `AdminOrderTracking` `order_events` insert | Audit log silent failure |

The common root cause : **`await supabase.from(...).update/insert/delete(...)` does NOT throw on Postgres errors**. It returns `{ data, error }`. If the caller does not destructure `error`, the failure is invisible to user-facing code.

---

## 2. Decision

Adopt a single convention for **all new supabase writes** : pass through one of four helpers exposed by `src/utils/supabaseAction.ts` (or the React hook `useSupabaseAction`).

| Variant | When to use |
|---|---|
| `runSupabaseAction` | Single write/read, simple success/failure UX |
| `runBulkSupabaseAction` | Loop on N items, partial success acceptable |
| `runRpcAction` | SECURITY DEFINER RPC for atomic multi-table operations |
| `runMultiStepAction` | Sequential steps with mixed critical/non-critical priorities |

Each helper guarantees :
- `{ error }` is always destructured and surfaced via `console.error` with a structured tag `[context]`.
- A toast is fired only after validation. Successful path → `toast.success`. Critical failure → `toast.error`. Partial / drift → `toast.warning`.
- React Query invalidation is handled centrally via the `invalidateQueries` parameter.
- The return type is a discriminated union `{ ok: true, data } | { ok: false, error }` so callers can branch safely.

---

## 3. Conventions

### Mandatory for new code (post 2026-05-13)

- **All supabase writes** (`insert`, `update`, `delete`, `upsert`, `rpc`) MUST go through a helper. Direct `await supabase.from(...).X(...)` is **forbidden** outside of read-only `select` chains.
- **No `toast.success` before validation.** If the helper is not used (read-only data fetch), still verify `{ error }` before fire-and-forget logic.
- **`catch { /* silent */ }` is forbidden** on supabase writes. The helpers already capture errors. If a wrapper try/catch is needed for defense-in-depth, the `catch` must `console.error` at minimum.

### Acceptable silent fail (with explicit comment)

- localStorage cache writes (`// non-blocking cache`)
- Fire-and-forget tracking analytics (`// fire-and-forget`)
- Secondary in-app notifications when the primary action already succeeded

In these cases, the inline comment is **required** to signal intent.

### Migration policy for legacy code

- Code already refactored in Lots 1-4 of Dette 75 : not re-migrated (manual error checks are correct and equivalent).
- Other existing callsites : **progressive migration** — Dette 83 captures the remaining ~22 supabase writes without `{ error }` check. They migrate when the surrounding code is touched for any other reason ("touch-when-touched migration").

---

## 4. API

### `runSupabaseAction<T>`

```ts
const result = await runSupabaseAction({
  action: () => supabase.from("orders").update({ status: "shipped" }).eq("id", orderId),
  context: "admin.orders.markShipped",
  successMessage: "Commande marquée comme expédiée",
  errorMessage: "Impossible de marquer cette commande",
  invalidateQueries: [["admin-orders"]],
  queryClient, // omit if using useSupabaseAction hook
});
// result : { ok: true, data: ... } | { ok: false, error: ... }
```

### `runBulkSupabaseAction<TItem>`

```ts
const { ok, failed, total } = await runBulkSupabaseAction({
  items: selectedIds,
  actionForItem: (id) => supabase.from("products").update({ publish_status: "draft" }).eq("id", id),
  context: "admin.products.bulkOffline",
  fullSuccessMessage: (ok) => `${ok} produits mis hors ligne`,
  partialMessage: (ok, failed) => `${ok} mis hors ligne, ${failed} échec(s)`,
  fullErrorMessage: (n) => `Aucun produit mis hors ligne (${n} échecs)`,
  invalidateQueries: [["products"]],
});
```

### `runRpcAction<TParams, TResult>`

```ts
const result = await runRpcAction({
  call: () => supabase.rpc("delete_partner_cascade", { p_partner_id: id }),
  context: "admin.partners.delete",
  errorMessage: "Erreur lors de la suppression",
  successFromPayload: (data) => `Partenaire « ${data.partner_name} » supprimé`,
  invalidateQueries: [["partners"]],
});
```

### `runMultiStepAction`

```ts
await runMultiStepAction({
  steps: [
    { label: "update plan", action: () => supabase.from("partners").update({ plan: "growth" }).eq("id", id), isCritical: true },
    { label: "update subscription", action: () => supabase.from("partner_subscriptions").update({ plan: "growth" }).eq("partner_id", id), isCritical: false },
  ],
  context: "admin.partners.autoUpgrade",
  successMessage: "Plan mis à niveau (partner + subscription)",
  partialWarningMessage: "Plan mis à niveau côté partner mais subscription en échec — drift à réconcilier",
  errorMessage: "Échec mise à niveau plan",
});
```

---

## 5. Hook ergonomics

```tsx
import { useSupabaseAction } from "@/utils/supabaseAction.hook";

function MyComponent() {
  const supa = useSupabaseAction();

  const handleClick = () =>
    supa.standard({
      action: () => supabase.from("orders").update({...}).eq("id", id),
      context: "admin.orders.update",
      successMessage: "Mise à jour effectuée",
      errorMessage: "Échec de la mise à jour",
      invalidateQueries: [["orders"]],
    });
}
```

The hook automatically injects the component-scoped `QueryClient`. Use the bare functions only in non-React code (workers, helpers, scripts).

---

## 6. Trade-offs

### Why not just `.throwOnError()` ?

Supabase v2 offers `.throwOnError()` on `PostgrestBuilder`. It works but :
- Forces all error handling into a `try/catch` block (the antipattern that started this chantier).
- Doesn't standardize toast/log/query-invalidation behavior.
- Doesn't give a structured return for "partial success" (Lot 1 bulk case).

The helper accepts `.throwOnError()` chains naturally (they reject the promise), so it composes if anyone prefers that style.

### Why not a Mutation builder layer ?

React Query's `useMutation` already exists and is widely used. The helper is **complementary**, not a replacement. `useMutation` excels for component-bound async state (`isPending`, `isError`, `data`). The helper excels for one-shot admin actions, bulk operations, and standardizing toast/log behavior across callsites.

Future direction : if the codebase grows to need richer state management, a hybrid `useMutation` + helper pattern is acceptable.

---

## 7. Verification

- **Tests** : `src/test/supabaseAction.test.ts` — 14 tests covering all four variants (success, error, partial, throw, requireData, payload-mapped success).
- **Migration démo** : `AdminOrderTracking.tsx` `order_events.insert` migrated from Lot 4 inline handler to `runSupabaseAction(...)`. tsc + tests green.

---

## 8. Linked debts

- **Dette 81** — ESLint custom rule to detect `await supabase.from(...).{update,insert,delete}` without `{ error }` destructure (CI-level enforcement).
- **Dette 82** — Audit propagation erreur dans helpers business (`approveAsNew`, `reject`, etc.).
- **Dette 83** — Progressive migration of remaining legacy callsites to `supabaseAction` helpers (touch-when-touched).

---

## 9. History

| Date | Author | Change |
|---|---|---|
| 13 mai 2026 | Adrien Laniez + Claude | ADR initial — helper + tests + démo migration livrés |

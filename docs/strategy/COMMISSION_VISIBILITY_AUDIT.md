# Audit visibility commission Terrassea

> **Date** : 13 mai 2026
> **Auteur** : Adrien Laniez + Claude
> **Statut** : Audit terminé, leak frontend fixé. Defense-in-depth DB-level capturé en Dette 87.

---

## 1. Question founder

> « La commission est bien cachée du client ? C'est que le vendeur qui peut savoir combien je prends ? »

## 2. Intention business validée

- Commission **100 % cachée au client**.
- Visible : **partner** (transparence négociation) + **admin** (gestion).
- Pages publiques (`/partners`, `/become-partner`, `/legal`) peuvent mentionner les grilles tarifaires (par design SEO + B2B transparency).

---

## 3. Méthodologie

Audit en 3 vecteurs :
1. **UI components client-facing** — grep `commission` dans `src/components/{cart,quotes,orders,account,products,project}/`.
2. **Endpoints / RPCs** — vérification des `supabase.from(...)` côté client + RPCs accessibles `authenticated`.
3. **RLS** — policies sur `orders`, `quote_requests`, `partners`, `partner_subscriptions`.

---

## 4. Résultats par vecteur

### Vecteur 1 — UI Components 🟢 GREEN

Mentions `commission` dans le code frontend hors admin/partner :

| Fichier | Type | Verdict |
|---|---|---|
| `ProjectCartContext.tsx`, `VendorOffers.tsx`, `VariantSelector.tsx`, `ProductDetailDrawer.tsx`, `SupplierRecommendations.tsx`, `ProjectCart.tsx`, `productVariants.ts` | Commentaires "commission déjà appliquée upstream" — variable de pricing privée | ✅ Pas d'exposition |
| `StructuredData.tsx` (SEO JSON-LD) | Mentionne `commission %` par plan | ✅ Par design (grille tarifaire publique B2B SEO) |
| `Legal.tsx` (CGV publiques) | Mentionne "le marketplace déduit sa commission" | ✅ Par design (clause contractuelle) |
| `useAdminAnalytics.ts`, `usePartnerAnalytics.ts`, `AdminQuoteWorkflow.tsx` | Admin/partner contexts | ✅ Authorized viewers |

**Aucun composant client n'affiche commission_rate ni commission_amount.**

### Vecteur 2 — Endpoints / RPCs 🟠 LEAK FRONTEND TROUVÉ

Audit des hooks client-side qui lisent `orders` :

| Hook | Ligne | Pattern | Verdict |
|---|---|---|---|
| `useOrders.ts:60` (useClientOrders) | `select("*, partner:partner_id(name)")` | **LEAK** — payload JSON brut inclut `commission_rate`, `commission_amount` | 🟠 |
| `useOrders.ts:114` (useOrderDetail) | Idem | **LEAK** | 🟠 |
| `useClientDashboard.ts:175` (useClientQuotes) | `select("*, project, order:orders!quote_request_id(deposit_paid_at), product")` | `quote_requests` n'a pas de colonnes commission. JOIN orders limité à `deposit_paid_at`. | ✅ Safe |
| `useClientDashboard.ts:74` (useClientProjects) | Pas de référence orders | ✅ Safe |

**Mapping JS** côté useOrders n'expose pas commission, mais le **payload réseau HTTP** sortant de Supabase contient toutes les colonnes → visible en DevTools Network tab par n'importe quel client.

### Vecteur 3 — RLS data 🟡 DEFENSE-IN-DEPTH À AMÉLIORER

Policies actuelles sur `public.orders` :

```
Admins full access orders : ALL via is_admin()
Clients view own orders   : SELECT WHERE client_user_id = auth.uid() OR client_email = profile.email
Partners read own orders  : SELECT WHERE partner_id IN partners owned by auth.uid()
```

→ La policy `Clients view own orders` autorise un SELECT **row-wide** (toutes colonnes). Supabase **ne supporte pas le column-level RLS nativement** → si le frontend demande `commission_*` explicitement, le DB sert.

**Le frontend devient donc la frontière de sécurité** — d'où l'importance du fix Vecteur 2.

### Vecteur 4 — Emails Y1/Y2 Lot B 🟢 GREEN

`_email_order_payment_instructions_client` (Lot B + quality pass) affiche :
- Bénéficiaire, IBAN, BIC, Banque, Référence à indiquer, Échéance
- Acompte (montant)
- Montant total
- **Aucune mention de commission ni de partner_amount**

`_email_order_quote_accepted_partner` envoyé au **partner** : peut mentionner les montants partner (revenue), pas pertinent ici (cible partner authorized).

---

## 5. Bugs identifiés

🟠 **B1** — `useOrders.ts:60` : `select("*")` expose `commission_rate` + `commission_amount` sur le réseau côté client (DevTools).
🟠 **B2** — `useOrders.ts:114` : identique pour `useOrderDetail`.

---

## 6. Fixes appliqués (cette session)

### Frontend — explicit SELECT (commit en cours)

`src/hooks/useOrders.ts` :
- `useClientOrders` : remplacement `select("*, partner:partner_id(name)")` par **liste explicite de 28 colonnes** (sans commission_rate ni commission_amount).
- `useOrderDetail` : idem + cast `data as any → row` pour la déstructuration (column-string select ne narrow pas vers `Order` type).
- Commentaire pointeur vers Dette 87 pour la defense-in-depth DB.

**Effet** : le payload HTTP réseau ne contient plus les champs commission. Un client ouvrant DevTools ne voit que les 28 champs autorisés. Si quelqu'un essaie `supabase.from("orders").select("*")` directement en console, la requête réussit (RLS le permet) — mais ce n'est plus le code de l'app.

### Validation

- tsc : 0 erreur
- 629 tests passing
- Smoke prod : INSERT + DELETE order test, aucun side-effect

---

## 7. Conclusion

**Verdict global** : 🟢 **GREEN après fix immédiat**.

- Côté app normale, le client ne voit jamais commission ni dans l'UI ni dans le payload réseau.
- Defense-in-depth DB-level capture en Dette 87 (P3) pour bloquer le cas "expert ouvrant la console pour requêter directement".

---

## 8. Captures dettes

### Dette 87 — Defense-in-depth commission column-level protection (P3)

Supabase ne supporte pas le column-level RLS. Pour bloquer un client expert qui contournerait le frontend en faisant un `supabase.from("orders").select("commission_rate")` direct, deux options :

1. **VIEW client-safe** : créer `orders_client_view` qui exclut `commission_rate` et `commission_amount`. Révoquer `SELECT` sur `orders` au rôle `authenticated` (sauf admin/partner via leur policy). Repointer le frontend client sur la VIEW.
2. **Wrapper RPC** : `get_my_orders()` SECURITY DEFINER qui renvoie les orders du caller en omettant les champs commission. Frontend client utilise cette RPC.

**Effort** : 1-2 h (VIEW + RLS migration + frontend refactor).
**Priorité** : Niveau 3 — pas urgent puisque le frontend actuel ne demande plus ces champs et qu'un client non-technicien ne peut pas les obtenir.
**Quand** : avant Vague 2 transactions commerciales (pour s'aligner avec le sérieux des montants en jeu).

---

## 9. Historique

| Date | Auteur | Modification |
|---|---|---|
| 13 mai 2026 | Adrien Laniez + Claude | Audit initial + fix frontend immédiat |

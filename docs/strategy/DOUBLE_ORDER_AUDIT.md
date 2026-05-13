# Audit Dette 74 — Double création orders

> **Date** : 13 mai 2026
> **Origine** : Capture Dette 74 lors du Lot B de Dette 59 (Order lifecycle email triggers).
> **Statut** : ✅ **FIXED 2026-05-13** — Option Beta livrée. Trigger DB enrichi pour produire des orders complètes.

---

## 1. Contexte initial

Au moment du Lot B Dette 59 (12 mai 2026), j'ai noté que deux chemins distincts pouvaient INSERT dans `public.orders` pour le même `quote_request_id` :

1. `src/hooks/usePaymentFlow.ts:createOrderFromQuote` — INSERT direct côté frontend, riche (payment_reference, invoice_number, due_dates, commission via `v_effective_commissions`, tva_rate, partner_conditions…).
2. Trigger `public.auto_create_order_on_signature` — INSERT minimal côté DB sur `AFTER UPDATE quote_requests` quand `signed_at NULL → not-null`.

L'hypothèse initiale était une duplication possible avec double Y1+Y2 emails.

L'audit révèle un scénario plus subtil et plus inquiétant.

---

## 2. Flow réel décortiqué

### 2.1 Qui set `quote_requests.signed_at` ?

3 callsites identifiés :

| Callsite | Contexte |
|---|---|
| `ClientSections.tsx:1501` | Client signe son devis depuis son espace → `signQuoteRequest({...})` (lib/quoteDocuments) |
| `ArchitectSections.tsx:1271` | Architecte signe au nom du client (cas Pro Service) |
| `AdminQuoteWorkflow.tsx:172` | Admin force la signature pour intervention manuelle |

Tous les 3 finissent par un UPDATE de `quote_requests.signed_at`. Le trigger `trg_auto_create_order` fire alors **synchroniquement** dans la même transaction.

### 2.2 Qui appelle `createOrderFromQuote()` ?

**Un seul callsite** : `AdminQuoteWorkflow.tsx:460` — bouton admin "Créer une commande depuis ce devis". Pas appelé sur le flow client/architect signature.

### 2.3 Séquence chronologique

**Cas A — Client signe (chemin normal)** :
1. Client clique "Signer" dans ClientSections.
2. `signQuoteRequest()` met à jour `quote_requests.signed_at`.
3. Trigger `auto_create_order_on_signature` fire **dans la même transaction** → INSERT order minimal (status `pending_deposit`, deposit 30 %, commission via `partner_subscriptions` seul).
4. Trigger `notify_order_created` (Lot B) fire à son tour → emails Y1 (client payment instructions) + Y2 (partner quote accepted) envoyés.

**Cas B — Admin force la création** (sur un devis déjà signé) :
1. Admin clique "Créer commande" dans AdminQuoteWorkflow.
2. `createOrderFromQuote()` lit le quote, calcule payment_reference + invoice_number + due_dates + commission via `v_effective_commissions` + INSERT.
3. **Conflit avec l'index UNIQUE** → l'INSERT échoue (cf. §3).
4. Admin voit une erreur. L'order minimale créée par le trigger reste en place.

---

## 3. Protection DB en place

```sql
CREATE UNIQUE INDEX orders_quote_request_id_unique
  ON public.orders USING btree (quote_request_id)
  WHERE (quote_request_id IS NOT NULL);
```

→ **Une seule order par `quote_request_id`**. Pas de duplication.

Mais ce n'est pas une victoire : ça force le trigger à toujours gagner la course, et la version riche du frontend est **systématiquement perdue**.

---

## 4. Le vrai problème

L'order créée par le trigger est **fonctionnellement incomplète** :

| Champ | Trigger (gagne) | createOrderFromQuote (perd) |
|---|---|---|
| `payment_reference` | **NULL** | TRS-2026-NNNNNN (sequence) |
| `invoice_number` | **NULL** | INV-202605-NNNNN (sequence) |
| `deposit_due_date` | **NULL** | now() + 7j |
| `balance_due_date` | **NULL** | now() + 30j |
| `commission_rate` | `partner_subscriptions.commission_rate` (basique) | `v_effective_commissions` (brand-distributor aware) |
| `tva_rate` | **NULL** | depuis quote |
| `delivery_delay_days` | **NULL** | depuis quote |
| `delivery_conditions` | **NULL** | depuis quote |
| `payment_conditions` | **NULL** | depuis quote |
| `partner_conditions` | **NULL** | depuis quote |
| `estimated_delivery_date` | **NULL** | calculé depuis quote |
| `client_user_id` | **NULL** | depuis quote ou auth |
| `payment_method` | default `'bank_transfer'` | explicite `'bank_transfer'` |

### Conséquences

1. **Email Y1 (Lot B `notify_order_created`)** : envoyé avec `payment_reference = NULL`. Le template Lot B affiche `—` à la place de la référence → le client reçoit un email avec « Référence à indiquer : — ». **Inutilisable pour identifier le virement entrant**.
2. **Échéance paiement absente** : pas de `deposit_due_date` → la ligne "Échéance" du template Lot B est omise. Le client ne sait pas quand l'acompte doit être réglé.
3. **Audit légal & commercial** : pas d'`invoice_number` → impossible de générer la facture conforme. Pas de `tva_rate` → calcul TVA cassé en aval.
4. **Commission brand-distributor** : la table `v_effective_commissions` n'est pas consultée → si la marque a un accord distributeur avec un taux différent du plan-based, c'est ignoré → potentielle perte de revenu Terrassea ou conflit partenaire.

### Conditions actuelles qui masquent le bug

- **0 quote signed en prod** au moment de l'audit (vérifié : `count(*) WHERE signed_at IS NOT NULL = 0`).
- Le programme Founding Partner est en mode `pricing_visibility_mode='launch'` → pas de transactions commerciales encore.
- Le trigger `notify_order_created` (Lot B) tolère gracieusement les NULL via `COALESCE(..., '—')` dans le rendu, donc le mail s'envoie sans crash.

Le bug est dormant tant que personne ne signe vraiment un devis. Il deviendra **actif dès la première signature réelle**.

---

## 5. Vérification prod

```sql
SELECT
  (SELECT count(*) FROM public.quote_requests WHERE signed_at IS NOT NULL) AS total_signed_quotes,
  (SELECT count(*) FROM public.orders WHERE quote_request_id IS NOT NULL) AS total_orders_from_quotes,
  (SELECT count(*) FROM (
     SELECT quote_request_id FROM public.orders
     WHERE quote_request_id IS NOT NULL
     GROUP BY quote_request_id HAVING count(*) > 1
  ) dup) AS quotes_with_multiple_orders;
```

Résultat : `{0, 0, 0}` — pas de signed quote, pas d'order issued depuis quote, pas de duplicate (en partie grâce à l'index UNIQUE). Aucun bug actif aujourd'hui.

---

## 6. Scénarios cartographiés

| Scénario | Frontend `createOrderFromQuote` | Trigger DB | Résultat prod actuel |
|---|---|---|---|
| **A** (réel) | Skip silencieux ou échec sur conflit UNIQUE | Toujours fire en premier | 1 order **minimale** → Y1 email dégradé |
| B | Skip si existe (idempotent) | Toujours fire | 1 order minimale → identique scénario A |
| C | Supprimé entièrement | Toujours fire | 1 order minimale (statu quo) |
| D | Garde | Trigger supprimé | 1 order **riche** mais signe sans admin intervention ne crée plus rien |
| E (option recommandée) | Enrichi pour servir d'update post-fact | Trigger enrichi via valeurs pré-calculées dans `quote_requests` | 1 order riche dès le sign |

---

## 7. Plan correctif — options évaluées

### Option Alpha — Supprimer le frontend `createOrderFromQuote`

- ✅ Cohérent avec pattern Lot B (DB-first).
- ✅ Élimine la duplication de logique (le frontend devient lecteur).
- ❌ Le trigger reste minimal → conséquences §4 inchangées.
- ❌ Admin ne peut plus forcer la création d'une commande hors signature normale.
- **Verdict** : insuffisant seul. Nécessite Beta en complément.

### Option Beta — Enrichir le trigger DB

Réécrire `auto_create_order_on_signature` pour produire une order complète :
- Lire les conditions du quote (`tva_rate`, `delivery_delay_days`, `partner_conditions`, …).
- Générer `payment_reference` via `next_payment_reference()` (RPC déjà existante).
- Générer `invoice_number` via `next_invoice_number()`.
- Calculer `deposit_due_date` (+7j), `balance_due_date` (+30j).
- Consulter `v_effective_commissions` pour le taux exact si la marque a un accord distributeur.
- Set `client_user_id` via lookup `user_profiles.email = quote.email`.

- ✅ Single source of truth (DB).
- ✅ Toutes les signatures (client + architect + admin) produisent une order complète.
- ✅ Compatible avec l'index UNIQUE existant.
- ❌ Logique métier déplacée en SQL (plus lourd à maintenir).
- ❌ La logique `v_effective_commissions` doit être accessible depuis le trigger (vérifier les permissions).
- **Effort** : ~2 h.
- **Verdict** : RECOMMANDÉ.

### Option Gamma — UNIQUE constraint + upsert frontend

- Convertir l'index UNIQUE en VRAIE contrainte (mineur, déjà équivalent).
- Frontend `createOrderFromQuote` → utilise `ON CONFLICT DO UPDATE` pour enrichir l'order minimale créée par trigger.
- ✅ Frontend reste maître de la logique riche.
- ❌ 2 passes DB (trigger INSERT minimal puis frontend UPDATE) — overhead inutile.
- ❌ Complexité conceptuelle élevée (qui gagne sur quels champs ?).
- **Verdict** : sur-engineered.

### Option Delta — Trigger conditionnel + frontend prioritaire

- Trigger ne fire QUE si une order n'existe pas encore pour ce quote_request_id.
- Frontend `createOrderFromQuote` fire d'abord (path admin), trigger en filet de sécurité (path client/architect).
- ❌ Le frontend n'est pas appelé sur les flows client/architect → le trigger gagne dans 100 % des cas en pratique.
- **Verdict** : équivalent à statu quo.

---

## 8. Recommandation tranchée

**Option Beta** — enrichir le trigger `auto_create_order_on_signature` pour produire une order équivalente à `createOrderFromQuote` côté frontend.

Une fois Beta livrée :
- Le frontend `createOrderFromQuote` devient redondant pour le flow normal (sign client/architect) → peut être **supprimé** OU **gardé** comme admin fallback (capture en Dette 84).
- Le pattern « DB trigger as source of truth » s'aligne avec les Lots A/B/D Dette 59 (emails) et Lot C (RPC SECURITY DEFINER).

---

## 9. Effort estimé

| Phase | Durée |
|---|---|
| Pre-flight : vérifier que `v_effective_commissions` est accessible au trigger | 15 min |
| Rewrite `auto_create_order_on_signature` enrichi | 60 min |
| Migration + smoke test (insérer quote_request + UPDATE signed_at + vérifier order rich) | 30 min |
| Décision sur le sort de `createOrderFromQuote` frontend (suppression ou conservation comme admin fallback) | 15 min |
| Commit + push | 10 min |

**Total** : ~2 h.

---

## 10. Quand fixer

**Avant la première signature réelle** — donc avant Salone mi-juin 2026, ou plus tôt si une marque Founding Partner active la signature.

Tant que `pricing_visibility_mode='launch'` et que `total_signed_quotes = 0`, pas d'urgence. Mais doit être livré dans la fenêtre 2-4 semaines.

---

## 11. Captures dettes dérivées

### Dette 84 (potentielle) — Sort de `createOrderFromQuote` frontend

À trancher lors de l'implémentation Beta :
- **Supprimer** : cohérent avec DB-first, mais perd la possibilité admin manuelle.
- **Conserver comme `recreateOrderFromQuote()` admin** : utilise upsert pour ré-enrichir une order minimale qui aurait été créée prématurément.

À capturer formellement après la décision lors de la session Beta.

### Dette 85 (potentielle) — Migration `v_effective_commissions` accessible au trigger

Si le trigger n'a pas les permissions de lire `v_effective_commissions` (vue probablement avec RLS), créer une fonction SECURITY DEFINER `get_effective_commission_rate(brand_id, distributor_id)` accessible au trigger.

À investiguer en pre-flight Beta.

---

## 12. Historique

| Date | Auteur | Modification |
|---|---|---|
| 13 mai 2026 | Adrien Laniez + Claude | Audit initial — Option Beta recommandée |
| 13 mai 2026 | Adrien Laniez + Claude | ✅ Option Beta livrée — trigger enrichi, frontend `createOrderFromQuote` supprimé, `paymentUtils.ts` deleted (~280 lignes de code mort en moins) |

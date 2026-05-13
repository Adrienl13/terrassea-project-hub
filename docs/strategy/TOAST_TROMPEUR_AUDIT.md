# Audit toast trompeur — Dette 75

> **Date** : 13 mai 2026
> **Origine** : Découverte Lot C Dette 59 (3 bugs latents cumulés masqués par toast.success trompeur — partner application info-request)
> **Statut** : Audit exhaustif réalisé ; Lot 1 fixé ; Lots 2-N planifiés.

---

## 1. Contexte

Le 12 mai 2026, pendant le Lot C de Dette 59 (RPC `request_partner_application_info`), trois bugs cumulés ont été découverts :

1. La colonne `partner_applications.admin_notes` référencée par le frontend depuis Dette 30 (6 mai 2026) **n'existait pas**. L'UPDATE échouait silencieusement.
2. Le CHECK constraint sur `status` n'autorisait pas `'info_requested'` — pourtant le mapping `APP_STATUS_CONFIG` du frontend l'utilise.
3. Le frontend lisait `selected.contact_email` alors que la colonne `partner_applications` est `email` → recipient `undefined` sur l'invoke.

Le tout a été **masqué pendant 6 jours** par un `try/catch` silencieux + un `toast.success("Demande d'informations envoyée par email.")` inconditionnel. L'admin pensait avoir relancé des candidatures qui en réalité n'ont jamais bougé.

Hypothèse forte : ce pattern peut exister ailleurs dans la codebase.

**Enjeu** : 3-5 marques Salone intéressées, transactions à 1-2 semaines. Toute feature critique qui ment silencieusement = risque de réputation et de pertes business.

---

## 2. Méthodologie

### Patterns recherchés

| # | Pattern | Signal |
|---|---|---|
| P1 | `catch(()=>{})` arrow vide | Sur `.then()` chain |
| P2 | `} catch { ... }` bloc vide ou commentaire-seul | Bloc try/catch dans async function |
| P3 | Commentaires `silently`, `swallow`, `non-blocking`, `silent` | Auto-signalé |
| P4 | `toast.success` non-précédé de validation `{ error }` | Coeur du pattern |
| P5 | `await supabase.from(...).update/insert/delete(...)` sans destructure `{ error }` | Lot C antipattern direct |
| P6 | `await supabase.functions.invoke(...).catch(() => {})` | Edge Function call swallowed |

### Outils

- grep récursif sur `src/`
- Lecture contextuelle (8-15 lignes) pour chaque match
- Classification manuelle par criticité business

---

## 3. Résultats quantitatifs

| Catégorie | Total occurrences |
|---|---|
| `toast.success` callsites total | **166** |
| `} catch { ... }` (vide ou non-blocking commenté) | **~55** |
| `await supabase.from(...).{update,insert,delete}` sans `{ error }` check | **~22** |
| `.catch(() => {})` arrow vide | **2** |

Sur les ~55 catch silencieux, environ **40 sont volontaires** (localStorage cache, fire-and-forget tracking, post-action notifications secondaires). Les ~15 restants sont à examiner.

Sur les ~22 supabase writes sans error check :
- **9 sont déjà dans un try/catch sain** (l'erreur sera throw + catch parent toast.error).
- **8 sont des cleanups cascade non-critiques** (refresh, log secondaire, notification).
- **5 sont des cas type Lot C** : write critique business sans check → silent fail possible → toast.success trompeur.

---

## 4. Cartographie par criticité

### Distribution globale (sur les 5 cas critiques identifiés)

| Module | Fichier:Ligne | 🔴 Critique | 🟠 Élevé | 🟡 Moyen | 🟢 Faible |
|--------|---------------|-------------|----------|----------|----------|
| Admin Product Review | AdminProductReview.tsx:147 (handleBulkOffline) | ✅ | | | |
| Admin Product Review | AdminProductReview.tsx:161-163 (handleBulkDelete) | ✅ | | | |
| Admin Partners | AdminPartners.tsx:236-242 (cascade cleanup delete) | | ✅ | | |
| Admin Order Tracking | AdminOrderTracking.tsx:105 (order_events insert) | | | ✅ | |
| Admin Order Tracking | AdminOrderTracking.tsx:149-152 (partner plan upgrade) | | ✅ | | |

Plus 8-10 cas de niveau Faible (notifications secondaires non-blocking, cache, tracking) — non listés ici car comportement intentionnel et acceptable.

---

## 5. Top 5 cas critiques

### 🔴 Cas #1 — `handleBulkOffline` AdminProductReview.tsx:144-156

```tsx
const handleBulkOffline = async () => {
  setBulkLoading(true);
  for (const pid of selectedProductIds) {
    await supabase.from("products").update({ publish_status: "draft" }).eq("id", pid);
    // ❌ Pas de { error } destructure → silent fail possible
  }
  queryClient.invalidateQueries({ queryKey: ["products"] });
  // ...
  toast.success(`${selectedProductIds.length} produit${selectedProductIds.length > 1 ? "s" : ""} mis hors ligne`);
  // ❌ Toast affirme N produits offline même si toutes les UPDATEs ont échoué
};
```

**Risque** : Admin lance bulk offline sur 10 produits, en réalité 3 échouent silencieusement (RLS, network, CHECK). Toast affirme "10 produits mis hors ligne" → admin croit l'action terminée → 3 produits restent publiés et visibles aux clients.

**Fréquence anticipée** : Élevée — Admin reviewers vont approuver/déprécier les nouveaux produits des marques Salone.

### 🔴 Cas #2 — `handleBulkDelete` AdminProductReview.tsx:158-172

```tsx
const handleBulkDelete = async () => {
  setBulkLoading(true);
  for (const pid of selectedProductIds) {
    await supabase.from("product_offers").delete().eq("product_id", pid);       // ❌
    await supabase.from("product_submissions").delete().eq("target_product_id", pid); // ❌
    await supabase.from("products").delete().eq("id", pid);                      // ❌
  }
  // ...
  toast.success(`${selectedProductIds.length} produit${...} supprimé${...}`);
  // ❌ Triple silent failure possible. Pire : si `product_offers` delete échoue
  // mais que `products` delete réussit, on a des `product_offers` orphelins.
};
```

**Risque maximal** : orphan rows en DB + toast affirmant la suppression complète.

### 🟠 Cas #3 — `AdminPartners.tsx:236-242` cascade cleanup delete

```tsx
await supabase.from("brand_distributors").delete().or(`brand_id.eq.${id},distributor_id.eq.${id}`);
await supabase.from("products").update({ partner_id: null } as any).eq("partner_id", id);
await supabase.from("orders").update({ partner_id: null } as any).eq("partner_id", id);
// ... 4 autres updates
```

**Risque** : Suppression de partenaire avec cascade manuel. Si une étape échoue silencieusement, on a des FK orphelines (orders.partner_id pointant vers un partner supprimé après).

### 🟠 Cas #4 — `AdminOrderTracking.tsx:149-152` partner plan upgrade

```tsx
await supabase.from("partners").update({ plan: "growth" }).eq("id", partnerId);
// Update subscription record
await supabase.from("partner_subscriptions").update({
  plan: "growth",
  updated_at: new Date().toISOString(),
}).eq("partner_id", partnerId);
```

**Risque** : Auto-upgrade Starter → Growth après seuil volume. Si une seule UPDATE passe (partners OK mais subscriptions non, ou inverse), incohérence entre les deux tables.

### 🟡 Cas #5 — `AdminOrderTracking.tsx:105` order_events insert

```tsx
const { error } = await supabase.from("orders").update({...}).eq("id", id);  // ✓ checked
if (error) { toast.error("Erreur : " + error.message); return; }
// Log event
await supabase.from("order_events").insert({...});  // ❌ pas checked
toast.success(eventDesc);
```

**Risque** : Audit log perdu silencieusement. UPDATE réussie, mais history event manquant → diagnostic post-mortem difficile.

---

## 6. Plan correctif découpé en lots

### Lot 1 — Cas critiques AdminProductReview (cette session, 13 mai 2026)

- handleBulkOffline + handleBulkDelete
- Pattern : compter ok/fail par item, toast adapté
- Effort : ~30 min
- Smoke test : INSERT test products → bulk action → vérifier compteur

### Lot 2 — Cascade cleanup AdminPartners (session prochaine)

- AdminPartners.tsx:236-242 (delete partner cascade)
- Pattern : tracer chaque step, fail early si une étape critique
- Effort : ~1h
- Smoke test : INSERT test partner avec FK → delete → vérifier cascade complet

### Lot 3 — Auto-upgrade plan AdminOrderTracking (session prochaine)

- AdminOrderTracking.tsx:149-152 (partner plan upgrade)
- Pattern : transaction atomique via RPC OU séquence + rollback frontend
- Effort : ~45 min
- Smoke test : déclencher seuil volume → vérifier les 2 tables cohérentes

### Lot 4 — Audit log order_events (session prochaine)

- AdminOrderTracking.tsx:105 + autres `order_events.insert`
- Pattern : error check + log côté frontend même si non bloquant
- Effort : ~20 min
- Smoke test : forcer erreur RLS → vérifier comportement

### Lot 5 — Convention codebase (session prochaine)

- Documenter le pattern correctif dans `docs/strategy/CODE_PATTERNS.md`
- Ajouter ESLint rule custom si possible (force destructure `{ error }` sur `await supabase.*`)
- Audit + correction des ~15 autres catch silencieux ambigus

**Effort total estimé** : 3-4 h sur 2-3 sessions.

---

## 7. Pattern correctif standardisé

### Anti-pattern (à proscrire)

```tsx
// ❌ NE JAMAIS FAIRE
try {
  await supabase.from("products").update({...}).eq("id", id);
  // .update() retourne { data, error }. NE JETTE PAS d'exception.
} catch {
  // Jamais atteint pour les erreurs Postgres
}
toast.success("Produit mis à jour");  // ⚠️ MENT
```

### Pattern correct — write unique

```tsx
const { error } = await supabase.from("products").update({...}).eq("id", id);
if (error) {
  console.error("[bulkOffline]", error);
  toast.error(t("admin.products.errors.updateFailed"));
  return;
}
toast.success("Produit mis à jour");
queryClient.invalidateQueries({ queryKey: ["products"] });
```

### Pattern correct — bulk write (compteur ok/fail)

```tsx
let ok = 0, fail = 0;
for (const pid of selectedProductIds) {
  const { error } = await supabase.from("products").update({...}).eq("id", pid);
  if (error) {
    console.error(`[bulkOffline ${pid}]`, error);
    fail++;
  } else {
    ok++;
  }
}
if (fail === 0) {
  toast.success(`${ok} produit(s) mis hors ligne`);
} else if (ok === 0) {
  toast.error(`Aucun produit mis hors ligne (${fail} échec${fail > 1 ? 's' : ''})`);
} else {
  toast.warning(`${ok} mis hors ligne, ${fail} échec${fail > 1 ? 's' : ''}`);
}
queryClient.invalidateQueries({ queryKey: ["products"] });
```

### Pattern correct — cascade transactionnelle (RPC SECURITY DEFINER)

Pour les cascades multi-tables critiques (Cas #3 AdminPartners delete), préférer un RPC SECURITY DEFINER côté DB qui garantit l'atomicité, suivi du modèle Bug #1 / Dette 59 Lot C.

### Quand un silent fail est acceptable

Le pattern silent est acceptable **seulement si** :
- L'action est purement secondaire (notification, tracking analytics, cache invalidation).
- L'absence de feedback utilisateur ne crée pas d'attente fausse.
- L'échec ne dégrade pas la cohérence des données business.

Dans ces cas, le commentaire `// non-blocking` est OBLIGATOIRE pour signaler l'intention.

---

## 8. Captures de dettes filles

### Dette 75.1 — Lots 2-5 audit toast trompeur

**Statut** : Cartographiés ci-dessus, à exécuter sur 2-3 sessions.
**Priorité** : Niveau 2 (proches de Vague 2 transactions).
**Effort** : 3-4 h total.

### Dette 81 — ESLint rule custom destructure error

**Origine** : Pattern correctif standardisé section 7.

**Description** : Créer une règle ESLint custom qui détecte les appels `await supabase.from(...).{update,insert,delete}(...)` sans destructure `{ error }` ou sans `.throwOnError()`. Émet warning ou error en CI.

**Effort** : ~2 h (apprentissage AST + écriture règle + intégration).

**Priorité** : Niveau 3 (hygiène, prévention long terme).

**Statut** : à exécuter après stabilisation Vague 1.

### Dette 82 — Audit transverse "fonction qui retourne sans signal d'erreur"

**Origine** : Audit Dette 75.

**Description** : Au-delà du pattern toast trompeur, certaines fonctions helper (`approveAsNew`, `reject`, etc.) peuvent retourner `void` ou `Promise<void>` sans propager les erreurs Supabase. Audit dédié des helpers business pour vérifier la propagation.

**Effort** : ~1.5 h.

**Priorité** : Niveau 3.

**Statut** : à exécuter en complément Lot 5.

---

## 9. Historique

| Date | Auteur | Modification |
|---|---|---|
| 13 mai 2026 | Adrien Laniez + Claude | Audit initial + Lot 1 livré |

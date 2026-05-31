# Onboarding Partner Audit — 2026-05-07

**Auteur** : audit autonome lors de session Day 9 (founder + Claude Code)
**Scope** : capturer l'état actuel du flow d'onboarding partner, identifier
trous + frictions, et tracer une roadmap MVP actionnable.
**Format** : pure recon + analyse, aucune modification code.

---

## TL;DR

Le flow d'onboarding partner Terrassea Hub a la **plomberie** (gates, RLS,
profile validation workflow, auto-create) mais zéro **orchestration** côté
UX. **1 partner total en DB** (créé manuellement) après le go-live. Le flow
n'a jamais été éprouvé en condition réelle. Avant d'investir gros sur
l'acquisition partner, **Tier 1 quick wins (2-3 j)** suffisent pour
livrer une expérience digne du first-time login.

---

## 1. Flow actuel (recon factuelle)

### 1.1 Deux entry-points parallèles (redondance)

**Flow A — `/become-partner` (application + admin review)**
- Page publique no-account : `src/pages/BecomePartner.tsx` (791 LOC)
- 3 phases : `choose-profile` → `form` (29+ champs) → `submitted`
- INSERT dans `partner_applications` (status='pending')
- Notifie admins via `notifications` insert (link `/admin?tab=applications`)
- Admin review dans `AdminApplications.tsx` → si approve, **2 triggers DB**
  s'exécutent sur UPDATE :
  - `trg_create_partner_on_approval` → `create_partner_on_approval()`
  - `trg_auto_create_partner` → `auto_create_partner_on_approval()`
- → row `partners` créé (col `created_partner_id` du record application)
- Création du compte `auth.users` correspondant : **non visible dans le
  code** (probable processus manuel admin).

**Flow B — `/auth` self-serve avec userType='partner'**
- `src/pages/Auth.tsx:135-156` — `supabase.auth.signUp` avec
  `user_metadata = { user_type, partner_type, partner_mode, siren,
  company, … }`
- AUCUN passage par `partner_applications`. AUCUN admin review entry.
- `Account.tsx:495-528` contient un **fallback silent auto-create** : si
  `profile.user_type='partner'` ET pas de row `partners` → INSERT avec
  plan='starter' (ou brand_member/brand_network selon partner_mode).

→ **2 modèles de gating coexistent** sans documentation claire :
- Flow A = curated (application form publique → review humain → partner row)
- Flow B = self-serve direct (signup → row partners auto-créé silent)

### 1.2 Schema `partners` (47 colonnes)

Required at INSERT :
- `name`, `slug`, `partner_mode` (default 'standard')

Important defaults :
- `plan` = `'starter'` (free 8% commission)
- `profile_completed` = `false`
- `profile_status` = `'draft'`
- `is_active` = `true`
- `is_public` = `true` (Flow A) / `false` (Flow B auto-create)

Profile review workflow (cols `profile_*`) :
- Status states : `draft` → `submitted` → `pending_review` → (`approved`
  | `changes_requested` | `rejected`)
- Tracked : `profile_submitted_at`, `profile_reviewed_at`,
  `profile_reviewed_by`, `profile_review_notes`

### 1.3 Schema `partner_applications` (21 colonnes)

Application form snapshot + tracking :
- Identity : `company_name`, `contact_name`, `email`, `phone`, `website`,
  `vat_number`, `country`
- Capability : `partner_type`, `partner_mode`, `product_categories[]`,
  `delivery_countries[]`, `estimated_annual_volume`
- Workflow : `status`, `rejection_reason`, `reviewed_at`, `reviewed_by`,
  `selected_plan`, `created_partner_id`

### 1.4 Profile completion gate (Account.tsx:595-665)

**Fonctionnel et robuste** :
1. Profile pas complet + section ≠ "settings" → render `PartnerProfileForm`
2. `profile_status='pending_review'` → écran "en cours de validation" +
   timestamp soumission
3. `profile_status='changes_requested'` → form re-shown avec admin notes
4. `profile_status='rejected'` → écran "refusée" avec admin notes
5. `profile_completed=true` → dashboard normal

**Bonne pratique** : empêche partner de publier produits sans profil validé.

### 1.5 First-time UX partner

`PartnerOverview.tsx` (default landing /account?tab=overview) :
- Stats `—` ou `0` quand pas de produits / quotes
- "Latest requests" : empty state minimal
- "Top products" : empty state ("Aucun produit dans le catalogue")
- "Quick messages" : empty state
- `CommissionReminder` card (toujours visible, CTA upgrade)
- **ZÉRO welcome modal, ZÉRO checklist progression, ZÉRO tour interactif**

`PartnerCatalogueSection.tsx` (empty catalogue) :
- "Aucun produit en ligne" + hint "Importez via Excel ou ajoutez
  manuellement" (`pd.catalogue.noPublishedHint`)
- Bouton "Add product" présent, bouton "Import Excel" présent
- → empty state correct **mais isolé**, pas orchestré dans un flow guidé

### 1.6 Email automation

13 edge functions inventoriées (`supabase/functions/`) :
- `send-quote-notification`, `send-review-request`, `send-notification-email`
- AUCUNE `send-welcome-partner`, `send-application-received`,
  `send-profile-approved`, `send-first-product-published`
- → **0 séquence email post-signup**. Le partner attend silencieusement.

### 1.7 Volume actuel (DB live)

| Métrique | Valeur |
|---|---|
| Total partners | **1** (Pros Import, growth tier, profile_completed=true) |
| Partners créés via flow self-serve | **0** estimé |
| `partner_applications` rows total | **0** |
| Applications last 30d | **0** |
| Self-serve signups last 30d | **0** |

→ **Flow d'onboarding partner jamais joué en production réelle**. Le seul
partner existant a été créé manuellement par admin (probablement seed data
ou demo).

### 1.8 Steps mentalisées de signup à 1er produit publié

1. **Sign up** via `/auth` (B) OU `/become-partner` (A)
2. **(Flow A only)** Attendre admin approval (durée inconnue, pas d'email)
3. **(Flow B)** Auto-redirect `/account`, profile completion gate force
   `PartnerProfileForm`
4. **Remplir profile** (logo, description, country, SIREN, certifications,
   gallery, partner_type fields, partner_mode si brand)
5. **Submit profile** → écran "pending_review" → attendre admin (durée
   inconnue, pas d'email)
6. **Admin valide profile** → notification in-app (pas d'email)
7. **Naviguer vers section catalogue** → "Add product" ou "Import Excel"
8. **Créer 1er produit** → save draft → "Submit for review"
9. **Admin valide produit** → published ✅

→ **8 étapes**, dont **3 attentes admin opaques** (application, profile,
product). Aucune timeline ou SLA visible. Aucune relance email.

---

## 2. Trous + frictions identifiés

### 2.1 Trous totalement absents

| # | Manque | Impact |
|---|---|---|
| 1 | Welcome modal premier login partner | Partner ne sait pas par où commencer |
| 2 | Checklist progression visible (1/5, 2/5, …) | Pas de sense of progress |
| 3 | Email post-signup automation | Partner peut oublier sa candidature en attente |
| 4 | Email post-profile-approved | Partner ne sait pas quand revenir |
| 5 | Email "Your first product is live" | Pas de moment de satisfaction |
| 6 | Timeline/SLA admin review (display) | Anxiété d'attente |
| 7 | Sample product template ("Start from this") | Friction sur 1er produit |
| 8 | Tour interactif (overlay highlights) | UX du dashboard pas auto-explicatif |
| 9 | "Help" ou "Talk to founder" CTA visible | Pas de canal de support clair |
| 10 | Différenciation onboarding par partner_type | Manufacturer ≠ brand ≠ reseller, mais flow identique |

### 2.2 Frictions partiellement adressées

| # | Item | État actuel | Friction résiduelle |
|---|---|---|---|
| A | Profile validation gate | ✅ Fonctionnel (5 states) | Pas d'estimation de durée admin review |
| B | Empty state catalogue | ✅ Hint "Importez via Excel" | Pas de CTA proeminent, pas orchestré |
| C | Profile form layout | ✅ Champs séparés en sections | 817 LOC, intimidant, pas de progress bar |
| D | Profile review notes | ✅ Affichées si changes_requested | Pas de structure type-checklist |
| E | Application form `/become-partner` | ✅ 3 phases UX | Redundance avec /auth signup |

### 2.3 Dettes techniques de plomberie identifiées

| # | Dette | Impact |
|---|---|---|
| α | 2 triggers DB sur `partner_applications` UPDATE (`trg_create_partner_on_approval` + `trg_auto_create_partner`) | Possible duplicate insertion ou ordre non-déterministe |
| β | Création `auth.users` après application approval pas visible dans le code | Process probablement manuel admin (friction silencieuse) |
| γ | Confusion 2 flows (`/become-partner` vs `/auth`) | Pas de doc, pas de routing intelligent |

---

## 3. Capabilities cibles MVP onboarding

### 3.1 Tier 1 — Quick wins (2-3 j cumulé)

**Visible à l'utilisateur, faisable sans refactor majeur, impact immédiat.**

| Capability | Effort | Impact |
|---|---|---|
| Welcome modal au 1er login partner (1-shot, dismiss permanent) | 0.5 j | Onboarding visible |
| Onboarding checklist visible dans PartnerOverview (5 steps : profile, 1er produit, 1ère photo galerie, 1ère certif, 1er devis reçu) | 0.5 j | Sense of progress |
| Email "Application received" automatique post `/become-partner` | 0.5 j | Réassurance, attentes claires |
| Email "Profile approved" automatique au profile_status='approved' | 0.5 j | Trigger pour revenir |
| SLA visible "Examen sous 48h ouvrées" sur écran pending_review | 0.1 j | Reduce anxiété |
| CTA "Talk to founder" persistent dans nav partner | 0.2 j | Canal support clair |

**Total Tier 1 : 2.3 j**

### 3.2 Tier 2 — Structurant (4-6 j cumulé)

**Refactor flow + email sequences + différenciation par partner_type.**

| Capability | Effort | Impact |
|---|---|---|
| Sample product template "Start from this" (1 par catégorie) | 1 j | Removes blank-page anxiety |
| Email sequence post-signup (D+0, D+3, D+7, D+14) tailored partner_type | 1.5 j | Re-engagement |
| Tour interactif overlay highlights (react-joyride ou similaire) | 1 j | UX guidée |
| Routage intelligent `/become-partner` ↔ `/auth` (1 unified entry-point) | 1 j | Clarification |
| Profile form refactored en wizard 5 étapes (vs 1 long form) | 1.5 j | Réduction perçue de friction |

**Total Tier 2 : 6 j**

### 3.3 Tier 3 — Avancé (1-2 semaines cumulé)

**Personnalisation forte + analytics onboarding + A/B testing.**

| Capability | Effort | Impact |
|---|---|---|
| Onboarding analytics events (drop-off par step) | 1 j | Mesurer perte |
| A/B test entry-point CTA copy | 0.5 j | Optimization |
| Personalisation dashboard par partner_type (manufacturer vs brand vs reseller) | 2-3 j | Pertinence métier |
| Pre-filled product import par catégorie (manufacturer ⊃ chairs) | 1-2 j | Acceleration |
| Integration provider email (Loops, Resend, Postmark) | 1 j | Production-grade emails |
| Slack/email alerts internes "Nouvelle application reçue" | 0.5 j | Reactivité admin |

**Total Tier 3 : 6-8 j**

---

## 4. Roadmap proposée

### Recommandation founder

**Attaquer Tier 1 d'abord** (2-3 j sur 1 sprint focalisé). Justifications :

1. **Le flow n'a jamais été éprouvé en prod** (1 partner manuel) — pas
   d'urgence à sur-investir Tier 2/3 avant d'avoir validé Tier 1.
2. **Founder solo, pas de team** — Tier 2/3 nécessitent 6-8 j chacun, soit
   un mois de travail dédié.
3. **2026 = année acquisition, pas monétisation** (cf.
   `STRATEGIC_DECISIONS.md`) — le bon moment pour tester un onboarding
   minimal viable est maintenant, pas dans 6 mois.
4. **Email infrastructure manquante** : Tier 1 ajoute 2 emails (app
   received + profile approved). Si on intègre un provider (Loops/Resend),
   c'est un investissement réutilisable pour Tier 2 séquences.

### Décisions stratégiques requises

1. **Choix entry-point** : conserver les 2 flows en parallèle ou
   consolider ? `/become-partner` plus curé (admin gate) ; `/auth`
   plus rapide (self-serve). Recommandation : garder Flow A public, faire
   de Flow B un "fast path" caché (admin-only ou invitation only).
2. **Email provider** : Loops (preferred for SaaS) vs Resend (cheaper
   transactional) vs SendGrid (legacy). Coût mensuel ~$30-100. Décision
   bloquante pour Tier 1 emails.
3. **Free tier limitation** : `starter` plan permet 30 produits + 8%
   commission. Trop généreux pour pousser vers `growth` ? Trop limitant ?
   À reviewer après 5-10 vrais signups.
4. **Onboarding différentiel par catégorie** (Tier 3) : nécessaire ou
   over-engineering ? Si concentration produits sur 3 catégories
   (chairs, tables, parasols), on peut peut-être skip.

---

## 5. Implications dette technique (résumé)

3 nouvelles dettes capturées dans `DETTE_TECHNIQUE_AUDIT.md` :
- **Dette 49** — Welcome modal first-time partner (Tier 1)
- **Dette 50** — Onboarding checklist visible (Tier 1)
- **Dette 51** — Email automation post-signup partner (Tier 1)
- **Dette 52** — 2 triggers DB redondants `partner_applications` (alpha)
- **Dette 53** — Confusion 2 entry-points `/become-partner` vs `/auth`
  (gamma — Tier 2 refactor)

Voir tracker pour priorités, efforts, statuts.

---

## 6. Méta — ce qui fonctionne déjà bien

- Profile validation workflow robuste (5 states, admin notes, gate
  fonctionnel)
- Application form `/become-partner` UX correcte (3 phases, 17 countries,
  12 categories, plan selection)
- Empty states présentes (Catalogue, Overview top products, Quick messages)
- Auto-create silent dans Account.tsx (Flow B) prévient les états cassés
- RLS partners + partner_applications déjà cadré
- DB schema riche (47 cols partners, 21 cols applications) : pas besoin
  de nouvelles colonnes pour Tier 1

→ La plomberie est solide. Il manque l'**orchestration UX visible** et la
**communication asynchrone** (emails). C'est le coeur de Tier 1.

---

## 7. Implementation 2026-05-07 (soir) — Sujet 1 livré

### Contexte
Session de validation e2e du flow + premiers fix incrémentaux Tier 1.
Founder + Claude Code, ~2h. Pas de big-bang refactor : on a vérifié
empiriquement chaque maillon, capturé les vrais trous, livré ce qui
était cohérent dans la durée d'une session.

### Sujet 1 — Verified workflow (admin notifications + filtre public)

**Décision stratégique : Variante 1 (réutilisation vocab existant)**

Plutôt que d'inventer un nouveau statut `verified` qui aurait dupliqué
`profile_reviewed_at` / `profile_reviewed_by` et cassé `ProServiceGate.tsx`
+ `AdminPartners.tsx`, on a réutilisé le statut `approved` déjà en place
dans le workflow review. Zéro data migration, zéro refactor de surface.

**Code livré** :
- Migration `20260507161216_partner_admin_notifications.sql`
  (`supabase/migrations/`) :
  - RPC `create_partner_notification_to_admins(uuid, text, text, text, text)`
    — `SECURITY DEFINER`, GRANTED `authenticated` only. Centralise la loop
    sur `user_profiles.user_type='admin'` qui était inline dans
    `BecomePartner.tsx:283-302` (pattern auparavant non factorisé).
  - Trigger `partners_notify_review_ready` (AFTER UPDATE on `partners`,
    WHEN clause sur transition vers `pending_review`) → INSERT
    notification `partner_review_ready` pour chaque admin.
- `Account.tsx:489-548` — auto-create partner ajoute `.select().single()`
  + appel RPC `create_partner_notification_to_admins` wrappé try/catch
  (non-bloquant pour le signup).
- `BecomePartner.tsx:283-295` — refactor de la loop manuelle
  `user_profiles → notifications` vers la RPC unifiée. Préservation du
  comportement (try/catch, non-bloquant).
- `Partners.tsx:309` — filtre public `is_public=true` →
  `profile_status='approved'`. Vérification empirique préalable :
  0 incohérence (`is_public=true ∧ status≠'approved'`).
- `types.ts` régénéré (RPC visible).

**Skipped (out of scope ce soir, décisions explicites)** :
- Trigger auto-transition `draft → pending_review` quand profile complet :
  refusé car le bouton manuel "Submit for review" dans
  `PartnerProfileForm.tsx:289-294` est UX-correct et intentionnel.
- RPC `verify_partner_as_admin` (SECURITY DEFINER pour les actions admin) :
  reporté. UPDATE direct + RLS suffisant à ce stade. Capturable comme
  dette future Niveau 3 si audit trail nécessaire.

**Smoke test e2e — ALL GREEN sur les 6 steps** :
1. Cleanup partner Test précédent ✅
2. Nouveau signup self-serve avec `test-e2e-brand2-2026-05-07@terrassea.invalid` ✅
3. Notif admin `new_partner_signup` reçue côté admin ✅
4. Submit profile pour review → notif `partner_review_ready` ✅
5. Approve depuis `/admin?tab=partners` → `profile_status='approved'` ✅
6. Partner test apparaît sur `/partners` (filtre public) ✅

### Bug #2 — Reset password redirect failure (RÉSOLU code)

**Symptôme** : email reset reçu, click lien → redirige vers homepage,
auto-loggé mais password jamais changé → blocage si déconnexion.

**Cause root** : Supabase Auth fallback sur Site URL quand le
`redirectTo` n'est pas dans la `Redirect URLs` allowlist du projet
(allowlist préservée prod-only par décision founder).

**Fix livré (self-healing)** :
- `RecoveryGuard` ajouté dans `src/App.tsx` (composant inline ~20 LOC) :
  watch `isPasswordRecovery` (`AuthContext`) + `location.pathname`. Si
  recovery actif ET path ∉ {`/auth`, `/login`, `/reset-password`} →
  `navigate("/reset-password", { replace: true })`.
- Le code frontend pré-existant était déjà correct (route, form newPassword,
  `updateUser({ password })`, anti-redirect prematuré, détection synchrone
  du hash). Le guard est défensif : marche même si la config dashboard
  Supabase reste imparfaite ou si le fallback Site URL réapparaît dans
  un contexte futur (nouveau env, branch, staging).

**Tracé en dette** : Dette 55 (résolue) + Dette 56 (staging Supabase Q3
2026).

### Bugs / dettes capturés mais non fixés ce soir

- **Dette 54 — Email approval partner non envoyé** : pas d'email envoyé
  au partner quand admin approve. Bloqué amont par décision Dette 51
  (email provider). Niveau 2.
- **Dette 56 — Pas de projet Supabase staging** : 1 seul projet sert
  dev + prod. Limite tests + complique allowlist Auth. Niveau 3 Q3 2026.

### Validation CI locale finale

- `bunx tsc --noEmit` : clean
- `bun run lint` : 0 errors (610 warnings pré-existants, aucun nouveau)
- `bun run test` : 615 / 615 passed
- `bun run build` : OK
- Migration appliquée via `mcp__supabase__apply_migration` avec DO block
  validation (RPC + function + trigger présents post-apply)
- Recovery guard validé via injection de hash en console (
  `window.location.hash = "type=recovery&access_token=fake"` →
  redirect immédiat vers `/reset-password`)

### Décisions stratégiques en attente

1. **Dette 51 — Email provider** (Loops / Resend / SendGrid) — bloquant
   pour Dette 54 et Tier 1 emails séquences.
2. **Dette 56 — Staging Supabase** — Q3 2026, post acquisition phase.
3. **Sujets reportés à dimanche soir** : audits invitations
   (admin → partner / brand network) + currency multi-locale.

---

## Session 2026-05-31 — Première marque réelle : onboarding de bout en bout

**Contexte** : premier accord marque signé. Mise en production du flow complet
d'intégration (marque + produits + invitation). Commit front `3cab535` poussé
sur `main` (Vercel). Edge function `invite-brand-partner` déployée v5.

### Système — changements livrés

1. **Attribution `partner_id` admin (produits pour le compte d'une marque)**
   `ExcelImportModal` + `AddProductForm` + `useProductSubmissions.submitProduct`
   étaient câblés sur le partner du *user connecté* → un admin ne pouvait ni
   importer ni ajouter de produits pour une marque (import abandonné « Aucun
   profil partenaire trouvé » ; ajout manuel attribué à l'UUID admin → violation
   FK à l'approbation). Fix : prop/option `partnerId` optionnelle threadée depuis
   `PartnerCatalogueSection` (déjà fournie par `AdminBrandEditor`). RLS
   `"Admins full access to submissions"` autorise déjà l'insert pour tout
   `partner_id`. Aucun changement dans le dashboard partenaire (même valeur).

2. **Email d'invitation brandé + définition de mot de passe** (résout en partie
   **Dette 54** / **Dette 51**) — `invite-brand-partner` n'utilise plus l'email
   générique Supabase : `createUser` (sans email) → `generateLink(type:'recovery',
   redirectTo: SITE_URL/reset-password)` → email **Terrassea brandé** via
   `send-notification-email` (provider `webhook`→Resend, déjà actif). CTA →
   `/reset-password` → `RecoveryGuard` + `Auth.tsx` (`updateUser({ password })`).
   La marque définit son propre mot de passe. Création de marque ≠ envoi d'email
   (uniquement au clic « Inviter »).

3. **Bouton « Supprimer » dans `AdminBrandEditor`** — appelle la RPC existante
   `delete_partner_cascade` (soft-delete `deleted_at`, Dette 101). `AdminPartners`
   l'avait déjà ; l'éditeur de marque non.

### 3 gotchas résolus pour les edge functions invoquées navigateur

(diagnostiqués via `get_logs` edge-function + auth — voir mémoire
`feedback_edge_fn_verify_jwt_cors`)
- **`verify_jwt: true`** bloquait la requête avant la fonction (0 log,
  « Failed to send a request »). → redéployée `verify_jwt: false` (auth interne
  par `requireAdmin` conservée).
- **CORS origine figée** (`https://terrassea.com`) cassait le POST depuis tout
  autre domaine (préflight 204 puis POST bloqué navigateur). → reflet dynamique
  de l'`Origin` sur allowlist (terrassea.com + sous-domaines, vercel, lovable,
  localhost).
- **`listUsers` 500** sur lignes `auth.users` avec `email_change` NULL (bug
  GoTrue). → code refactoré pour résoudre l'utilisateur via `generateLink`
  (supprime `listUsers`).

### Données

- **Remédiation `auth.users`** : `UPDATE ... SET col = COALESCE(col,'')` sur
  `confirmation_token / recovery_token / email_change / email_change_token_new /
  _current / phone_change / phone_change_token / reauthentication_token`
  (2 lignes corrigées, 0 NULL restant). Cause racine du 500 `listUsers`.
  **Non versionné en migration** (réparation ponctuelle data, schéma auth) — à
  formaliser si récurrence.
- **Purge marques de test** : `Test` + `Test 2` supprimées définitivement
  (hard DELETE par id, 0 référence FK).

### Validation
- `bunx tsc --noEmit` clean · `bun run lint` 0 erreur (warnings pré-existants) ·
  `bun run test` 633/633 · `bun run build` OK.
- Edge function `invite-brand-partner` v5 ACTIVE (verify_jwt=false).

### Reste / à surveiller
- Ajouter `https://terrassea.com/reset-password` dans Auth → Redirect URLs
  (RecoveryGuard rattrape sinon — non bloquant).
- Email brandé en **FR uniquement** (marché primaire) — localiser si besoin.
- Suite onboarding marque : import CSV ~200 produits via `ExcelImportModal`
  (chemin déterministe, étendre `colAliases` pour les 27 specs si le fichier
  fournisseur les porte).

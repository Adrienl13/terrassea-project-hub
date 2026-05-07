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

# CGV Strategy — Conditions Générales de Vente partenaires

> **Statut** : Cadrage stratégique validé (12 mai 2026)
> **À valider par avocat** : OUI (différé, budget founder)
> **Implémentation** : 2-3 semaines (après démarchage stabilisé)
> **Auteur** : Adrien Laniez · Fondateur Terrassea

---

## 1. Contexte et problématique

Terrassea Hub est une marketplace B2B verticale outdoor hospitality CHR Europe. Terrassea est intermédiaire technique (non vendeur). Chaque marque partenaire est le vendeur réel.

Sans cadre CGV structuré :
- Terrassea exposée à responsabilité indirecte
- Aucune protection contractuelle propre (statut intermédiaire, médiation, RGPD)
- Cauchemar UX client (15 marques = 15 CGV différentes)
- Validation conformité impossible (avocat × 15 = irrationnel)

**Décision** : approche hybride (cadre obligatoire Terrassea + spécifique marque).

---

## 2. Décisions stratégiques validées

### 2.1 Approche

✅ **Hybride** : Cadre obligatoire Terrassea + Spécifique marque

❌ Rejetée : Pure upload marque (Terrassea exposée légalement)
❌ Rejetée : Pure modèle Terrassea (perte souveraineté marque)

### 2.2 Niveau du cadre Terrassea

✅ **Complet** : Blocs A + B + C + D + E

#### Bloc A — Statut juridique
- Terrassea est intermédiaire technique, NON vendeur (article L111-7 Code conso)
- Vendeur réel = la marque partenaire
- Contrat de vente directement entre client et marque

#### Bloc B — Droits du consommateur (B2C obligatoire EU)
- 14 jours de rétractation (article L221-18) — sauf produits personnalisés
- Garantie légale conformité 2 ans (article L217-3)
- Garantie vices cachés (article 1641 Code civil)
- Médiation gratuite obligatoire avant action judiciaire

#### Bloc C — Données personnelles (RGPD)
- Responsable traitement = Terrassea + Marque (co-responsabilité)
- Données minimales nécessaires
- Durée de conservation
- Droits client (accès, rectification, suppression, portabilité)
- DPO Terrassea contact

#### Bloc D — Recours et juridiction
- Médiation Terrassea (via médiateur conso agréé externe en V1) comme première étape obligatoire
- Droit applicable = droit du pays du consommateur (Règlement Rome I)
- Juridiction compétente = tribunal du consommateur
- Plateforme RLL (Règlement des Litiges en Ligne) UE

#### Bloc E — Responsabilité Terrassea (limitation)
- Terrassea pas responsable du contenu produit, qualité, livraison
- Terrassea responsable de la disponibilité technique de la plateforme
- Limitation de responsabilité Terrassea (montant transaction max)

### 2.3 Spécifique marque

✅ **Upload document PDF/Word + 7 métadonnées structurées**

#### 7 métadonnées obligatoires

| Champ | Type | Usage |
|---|---|---|
| Délai fabrication standard | Texte court | Affiché fiche produit |
| Délai livraison France | Texte court | Affiché checkout |
| Pays desservis | Multi-select | Filtre catalogue |
| Garantie produit (durée) | Number (années) | Badge fiche produit |
| Politique retour standard | Texte court | Affiché fiche |
| Politique retour sur-mesure | Toggle (oui/non) | Affiché fiche |
| Email SAV | Email | Lien direct client |

### 2.4 Médiation

✅ **Médiateur conso agréé externe** pour Vague 1
🔮 **Médiation Terrassea interne** plus tard (Vague 2/3)

**Options à étudier** :
- CNPM-MCM (~150-200€/an) — généraliste consommation
- AME (Association des Médiateurs Européens) — généraliste
- Médiation FEVAD — spécifique e-commerce (plus cher)

### 2.5 Format technique

✅ **Upload PDF (préféré) + Word (.docx) accepté**
✅ **Conversion Word → PDF côté serveur** (Edge Function)
✅ **Stockage final** : PDF (preuve légale)

### 2.6 Timing

| Phase | Quand |
|---|---|
| Cadrage stratégique | ✅ Fait (12 mai 2026) |
| Rédaction cadre Terrassea v1 | À planifier (1-2j) |
| Implémentation MVP | 2-3 semaines |
| Consultation avocat | Différée (budget founder) — avant transactions volume |
| Adhésion médiateur agréé | Avant 1ère transaction réelle |
| Cadre Terrassea v2 (post-avocat) | Quand avocat consulté |

### 2.7 Avocat

🟡 **Différé** (contrainte budget actuel)

**Décision founder** :
- Faire le maximum sans avocat aujourd'hui
- Investissement 200-500€ quand budget disponible
- Avocat marketplace EU spécialisé (LinkedIn search)

⚠️ **Risque assumé** : tant que cadre Terrassea = `self_validated`, exposition légale potentielle. Mitigé par :
- Templates inspirés Stripe Connect / Etsy / Shopify
- Pas de transaction commerciale en Vague 1 (gratuit)
- Clause provisoire Founding Partner (cf. 2.8)

### 2.8 Clause provisoire Founding Partner

✅ **À utiliser pendant Vague 1 du Founding Program**

Phrasing :
> *« Le présent accord constitue une lettre d'intention dans le cadre du Founding Partner Program. Les Conditions Générales définitives, en cours de finalisation juridique, vous seront soumises pour acceptation formelle avant toute transaction commerciale réelle. À ce stade, votre engagement reste limité à l'inscription gratuite au programme et à la visibilité sur la plateforme. »*

### 2.9 Quand exiger CGV des marques

✅ **Optionnelles à l'inscription, obligatoires avant publication produits**

Permet :
- Inscription sans friction
- Approval rapide (acquisition)
- Friction au moment « vente » = naturel (Stripe pattern)

---

## 3. Architecture technique MVP

### 3.1 Tables DB

#### Table `partner_cgv` (versions du document)

```sql
CREATE TABLE public.partner_cgv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  version int NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  storage_path text NOT NULL,
  file_sha256 text NOT NULL,
  file_size_bytes int NOT NULL,
  original_filename text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (partner_id, version)
);
```

#### Table `partner_cgv_metadata` (7 métadonnées)

```sql
CREATE TABLE public.partner_cgv_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  cgv_version_id uuid REFERENCES partner_cgv(id),
  manufacturing_lead_time text NOT NULL,
  delivery_lead_time_fr text NOT NULL,
  countries_served text[] NOT NULL,
  warranty_duration_years int NOT NULL,
  standard_return_policy text NOT NULL,
  custom_return_policy text,
  sav_email text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (partner_id)
);
```

#### Table `cgv_acceptances` (preuve transactionnelle)

```sql
CREATE TABLE public.cgv_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id),
  partner_id uuid NOT NULL REFERENCES partners(id),
  cgv_version_id uuid NOT NULL REFERENCES partner_cgv(id),
  cgv_file_sha256 text NOT NULL,
  order_id uuid REFERENCES orders(id),
  quote_request_id uuid REFERENCES quote_requests(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  client_ip text,
  client_user_agent text,
  terrassea_terms_version int NOT NULL,
  CHECK (order_id IS NOT NULL OR quote_request_id IS NOT NULL)
);
```

#### Table `terrassea_terms` (versioning cadre Terrassea)

```sql
CREATE TABLE public.terrassea_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int NOT NULL UNIQUE,
  content_md text NOT NULL,
  content_sha256 text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  legal_review_status text NOT NULL CHECK (legal_review_status IN ('draft', 'self_validated', 'lawyer_validated')),
  lawyer_review_at timestamptz,
  lawyer_review_by text
);
```

### 3.2 Supabase Storage

#### Bucket `partner-cgv`
- Privé (pas accessible publiquement)
- URL signée pour download (TTL 1h)
- RLS : Partner sees own / Admin sees all / Client sees during transaction

#### Naming convention

```
partner-cgv/
  └─ {partner_id}/
      ├─ v1_2026-05-12_originalfilename.pdf
      ├─ v2_2026-05-15_originalfilename.pdf
      └─ ...
```

#### Conversion Word → PDF
- Edge Function `convert-docx-to-pdf`
- Trigger : à l'upload Word
- Stocke uniquement le PDF (Word jeté après conversion)
- ⚠️ Capture dette si trop complexe pour MVP (alternative : refuser Word, demander PDF)

### 3.3 Composants frontend

- `PartnerCGVUploadForm.tsx` (upload + saisie 7 metadata)
- `PartnerCGVViewer.tsx` (affichage public sur fiche entreprise)
- `CGVAcceptanceCheckbox.tsx` (checkout / quote signature)
- `AdminCGVOverview.tsx` (dashboard admin pour suivre marques)

---

## 4. Plan opérationnel

### 4.1 Onboarding nouvelle marque

```
1. Marque s'inscrit Founding Partner
2. Admin approuve (email premium reçu ✅)
3. Dashboard partner : badge "⚠️ CGV requises avant publication"
4. Marque configure CGV (upload + 7 metadata, 5-10 min)
5. Badge devient "✅ CGV configurées (v1)"
6. Marque peut publier produits
```

### 4.2 Migration Founding Partners actuels

- Email de relance (une fois)
- Badge dashboard "⚠️ CGV requises"
- Pas de blocage onboarding (juste blocage publication)
- Suivi admin : liste partners sans CGV configurées
- Relance 7j puis 14j si non fait

### 4.3 Modification CGV par marque

- Workflow simple : upload nouveau doc + update metadata
- Trigger : nouvelle version (version+1)
- Anciennes versions conservées (snapshot des acceptations)
- Clients en cours non impactés (acceptation immutable)
- Nouvelles transactions : acceptation nouvelle version

### 4.4 Acceptation client au checkout

- Component `CGVAcceptanceCheckbox.tsx` obligatoire
- Affichage : 2 documents (Marque + Terrassea)
- Snapshot DB au clic (IP + user agent + sha256)
- Bouton paiement désactivé tant que pas coché

### 4.5 Modification cadre Terrassea (post-avocat)

- Trigger : nouvelle version `terrassea_terms` v2 = `lawyer_validated`
- Clients existants : continuent sur v1 (acceptée)
- Nouvelles transactions : acceptation v2 obligatoire
- Email aux clients existants (info non-bloquante)

### 4.6 Médiateur conso agréé

- Adhésion avant 1ère transaction réelle
- Options : CNPM-MCM, AME, FEVAD
- Coût : 150-300€/an
- Décision finale : avec avocat le moment venu

---

## 5. Plan d'implémentation

### Phase 1 — Rédaction cadre Terrassea v1 ✅ LIVRÉE 2026-05-14
- Fichier FR (authoritative) : `legal/terrassea-terms-v1.md` (5 blocs A+B+C+D+E + F + 3 annexes, B2B+B2C, `self_validated`)
- Fichier EN (informational, FR prevails) : `legal/terrassea-terms-v1-en.md` — traduction informationnelle ajoutée 2026-05-14 pour outreach Salone, disclaimer non-authoritative en tête, références juridiques FR préservées
- Inspiré Stripe Connect Terms (structure) + Etsy Seller Policy (clarté)
- Mentions provisoires Vague 1 préservées (Founding Partner, médiateur à désigner, DPO formel à désigner)
- Placeholders à compléter founder : `[SIREN]`, `[adresse]`, `[forme juridique]`, ville
- Migration `terrassea_terms` v1 = Phase 2 (à venir)

### Phase 2 — Migrations DB + Storage (1 jour)
- 4 tables (partner_cgv, partner_cgv_metadata, cgv_acceptances, terrassea_terms)
- RLS policies
- Bucket Storage `partner-cgv` + politiques
- Edge Function `convert-docx-to-pdf` (ou capture dette si trop complexe)

### Phase 3 — Components frontend (1 jour)
- `PartnerCGVUploadForm.tsx`
- `PartnerCGVViewer.tsx`
- `CGVAcceptanceCheckbox.tsx`
- `AdminCGVOverview.tsx`
- Intégration dashboards (partner + admin)

### Phase 4 — Tests + déploiement (0.5 jour)
- Smoke tests e2e
- Migration Founding Partners actuels (email)
- Documentation marques

### Phase 5 — Adhésion médiateur (avant 1ère transaction)
- Recherche médiateur agréé
- Adhésion + intégration référence dans CGV Terrassea

### Total effort : ~4-5 jours sur 2-3 semaines

---

## 6. Risques identifiés et mitigation

### Risque 1 — Cadre Terrassea non validé par avocat
**Probabilité** : Élevée (décision founder)
**Impact** : Moyen (exposition légale potentielle)
**Mitigation** :
- Templates inspirés acteurs reconnus EU
- Clause provisoire Founding Partner (Vague 1 gratuite)
- Investissement avocat dès budget disponible
- Pas de transactions commerciales avant validation v2

### Risque 2 — Conversion Word → PDF non triviale
**Probabilité** : Moyenne (technique)
**Impact** : Faible (workaround = refuser Word)
**Mitigation** :
- Implémentation MVP : refuser Word, demander PDF
- Capture dette future si besoin réel

### Risque 3 — Marques refusent de configurer CGV
**Probabilité** : Moyenne
**Impact** : Moyen (friction onboarding)
**Mitigation** :
- Pattern progressif (pas à l'inscription)
- Friction au moment « vente » = acceptable
- Tutorial vidéo + email guidé
- Founding Partner status = engagement → réduit friction

### Risque 4 — Versioning complexe en pratique
**Probabilité** : Faible (architecture solide)
**Impact** : Faible (versioning natif DB)
**Mitigation** :
- sha256 + snapshot immutable
- Test e2e du flow versioning avant prod

### Risque 5 — RGPD co-responsabilité mal couverte
**Probabilité** : Moyenne sans avocat
**Impact** : Élevé (CNIL pouvoir sanctionner)
**Mitigation** :
- Drafter Bloc C avec rigueur
- Référencer DPO Terrassea
- Validation avocat dès budget

---

## 7. Captures de dettes liées

### Dette 77 — Implémentation CGV partenaires
**Statut** : Cadrage stratégique fait, implémentation 2-3 semaines
**Priorité** : Haute (bloquant Vague 2 transactions commerciales)
**Effort** : 4-5 jours sur 2-3 semaines
**Référence** : Ce document `CGV_STRATEGY.md`

### Dette 78 — Consultation avocat marketplace EU
**Statut** : Différée (budget founder)
**Priorité** : Critique avant volume transactions
**Effort** : 200-500€ + 1-2h consultation
**À chercher** : LinkedIn « avocat e-commerce marketplace EU droit conso »

### Dette 79 — Adhésion médiateur conso agréé
**Statut** : Avant 1ère transaction réelle
**Priorité** : Haute
**Effort** : 150-300€/an + adhésion (~1h)
**Options** : CNPM-MCM, AME, FEVAD

### Dette 80 — Conversion Word → PDF côté serveur
**Statut** : Optionnel MVP
**Priorité** : Basse
**Effort** : Edge Function (mammoth.js + puppeteer ou service externe)
**Alternative** : refuser Word côté UI

---

## 8. Documents de référence (à consulter)

### Templates inspirants
- Stripe Connect Terms — https://stripe.com/connect-account/legal
- Etsy Seller Policy — https://www.etsy.com/legal/sellers
- Shopify Partner Program Agreement
- Vinted CGU — modèle marketplace C2C

### Réglementation EU
- Code de la consommation (FR) — articles L111-7, L121-1, L221-18, L217-3
- RGPD — articles 4, 6, 13, 14, 26 (co-responsabilité)
- Directive Services 2006/123/CE
- Digital Services Act (DSA) — applicable depuis 2024

### Médiateurs agréés
- CNPM-MCM — https://www.cnpm-mediation-consommation.eu
- AME — https://www.amediations.fr
- FEVAD Mediation

---

## 9. Décisions à prendre plus tard

1. **Médiateur retenu** (V1)
2. **Avocat retenu** (quand budget)
3. **Validation cadre Terrassea v2** (post-avocat)
4. **Évolution vers médiation Terrassea interne** (Vague 2/3)
5. **Workflow validation modification CGV** (review by admin ?)
6. **Multi-lang CGV marques** (FR only ou FR+EN+ES+IT ?)
7. **Durée conservation acceptations** (10 ans Code commerce)
8. **Politique CGV pour clients hors-EU** (juridiction ?)

---

## 10. Glossaire

**CGV** : Conditions Générales de Vente
**B2C** : Business-to-Consumer (entreprise → particulier)
**B2B** : Business-to-Business (entreprise → entreprise)
**CHR** : Cafés, Hôtels, Restaurants
**RLL** : Règlement des Litiges en Ligne (UE)
**DPO** : Data Protection Officer (RGPD)
**DSA** : Digital Services Act (réglementation UE 2022)
**CNIL** : Commission Nationale de l'Informatique et des Libertés
**DGCCRF** : Direction Générale de la Concurrence, de la Consommation et de la Répression des Fraudes

---

## 11. Historique

| Date | Auteur | Modification |
|---|---|---|
| 12 mai 2026 | Adrien Laniez | Cadrage stratégique initial |

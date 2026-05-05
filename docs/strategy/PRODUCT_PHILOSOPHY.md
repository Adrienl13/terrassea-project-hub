# Terrassea Hub — Philosophie produit & framing stratégique

## Positionnement temporel

Terrassea Hub n'est PAS un MVP en course contre une deadline 
événementielle.

C'est une plateforme construite pour des années d'opération 
en partenariat humain-IA continu.

Implications :
- Pas de "vite fait Phase 1"
- Pas de pression de démo artificielle
- Décisions architecturales orientées long-terme
- Trade-offs simplicité vs propreté → propreté gagne

## Positionnement marché

Marketplace B2B verticale pour le secteur CHR / hospitality 
outdoor en Europe, avec ambition d'être le standard 
professionnel pour :

- Architectes (besoin de précision technique, certifications, 
  fichiers 3D)
- Acheteurs travaux publics (besoin de conformité 
  réglementaire stricte)
- Restaurateurs / hôteliers / collectivités (besoin de 
  sourcing fiable)
- Marques fabricantes (besoin de visibilité qualifiée)

Ce n'est pas un Alibaba générique. C'est un outil métier.

## Principes architecturaux

### 1. Modélisation reflète le métier réel

Les structures de données doivent refléter la complexité 
réelle du métier, pas être simplifiées pour aller vite.

Exemple : les certifications ont 3 niveaux de granularité 
(marque / famille / produit). On modélise les 3, pas 
seulement le plus simple.

### 2. Réutilisabilité et composition

Quand un pattern apparaît 2 fois, on le factorise.
Exemple : ReferentialCRUD générique pour material_brands + 
certifications.

### 3. Régression zéro

Toute évolution doit préserver le fonctionnel existant.
Validation empirique systématique avant de marquer "done".

### 4. Validation manuelle browser obligatoire

Les tests automatiques (Vitest) ne remplacent pas la 
validation visuelle/comportementale par le founder.

### 5. Drift prevention strict

DB et code source restent synchronisés. Migrations 
versionnées. Pas de modification DB hors process.

### 6. Documentation continue

Chaque décision majeure documentée dans CHANGELOG.
Chaque incident documenté pour apprentissage futur.

## Workflow founder ↔ IA

Le founder pilote la stratégie et le métier. L'IA exécute 
techniquement et alerte sur les risques.

Patterns de collaboration :
- Plan-Execute avec STOP intermédiaires
- Validation empirique à chaque étape
- Vérifications avant et après les fixes (pas juste après)
- Le founder garde le pouvoir de décision sur les arbitrages

## Trade-offs acceptables

### Acceptables

- Tests E2E simplifiés en tests unitaires sur helpers
- i18n incomplète pour textes admin internes (FR uniquement)
- Cosmétique non-bloquante (couleurs à affiner, espacements)
- Optimisations de performance non urgentes

### Non-acceptables

- Modélisation DB simplifiée qui sera coûteuse à migrer plus tard
- Solutions qui ne reflètent pas le métier réel
- Régressions sur le code existant
- Patterns qui empêchent la composabilité future
- Drift entre DB et code source

## Segments d'expansion identifiés

### Marine (yachts / cruise / ferries)

Le mobilier outdoor pour CHR a une synergie naturelle avec le mobilier marine outdoor :
- Pool decks de cruise ships
- Terrasses de superyachts
- Lounges de ferries
- Bars de pont

Le segment marine est :
- Moins price-sensitive (marges plus élevées)
- Avec un référentiel certifications mature (IMO FTP / MED Wheelmark / MCA MGN 580 / USCG)
- Internationalisé naturellement (les yachts naviguent partout)
- Aligné avec les architectes navals que Terrassea cible déjà (mêmes designers de luxe que CHR)

Phase 1 (fondation, livrée 2026-05-05) :
- Référentiel marine ajouté en DB (6 certifications)
- Catégorie 'marine' dans le CHECK constraint
- Pas d'impact sur les forms partner existants

Phase 2 (futur) :
- Prospection active du segment marine
- Page landing dédiée yachts/cruise
- Partenariats avec architectes navals
- SEO ciblé "yacht furniture", "cruise ship outdoor furniture"

### Outdoor enrichi (bord de mer / pool decks)

Au-delà des normes feu standard (M1, EN 1021), le mobilier outdoor pertinent pour bord de mer / pool deck nécessite :
- Stabilité UV (ISO 4892)
- Résistance corrosion saline (ASTM B117, EN ISO 9227)

Ces certifications sont maintenant disponibles dans le référentiel pour permettre aux partners de qualifier leurs products outdoor avec précision pour les environnements marins ou côtiers.

## Dette technique vs simplification légitime

Dette technique = solution simplifiée qui devra être refactorée.

Simplification légitime = solution qui répond à un besoin 
réel sans complexité prématurée.

La distinction est importante. On accepte la simplification 
légitime, on refuse la dette technique non documentée.

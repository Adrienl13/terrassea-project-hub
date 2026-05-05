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

## Dette technique vs simplification légitime

Dette technique = solution simplifiée qui devra être refactorée.

Simplification légitime = solution qui répond à un besoin 
réel sans complexité prématurée.

La distinction est importante. On accepte la simplification 
légitime, on refuse la dette technique non documentée.

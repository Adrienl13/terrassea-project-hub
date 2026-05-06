# SEO & GEO Strategy — Terrassea Hub

**Date** : 2026-05-05  
**Statut** : Documenté, non implémenté  
**Priorité** : À traiter après dettes critiques (9, 2, 3)

## Contexte stratégique

Terrassea Hub vise une visibilité maximale auprès de 2 cibles 
prioritaires :
- **Architectes / décorateurs** (besoin précision technique, 
  certifications, fichiers 3D)
- **Acheteurs travaux publics / restaurants / hôtels** (besoin 
  conformité réglementaire stricte)

Ces cibles cherchent des solutions très spécifiques avec un 
intent achat élevé mais des volumes de recherche faibles. 
Approche SEO classique (high-volume keywords) inadaptée.

## Définitions

**SEO classique** : optimiser pour Google traditionnel  
**GEO (Generative Engine Optimization)** : optimiser pour 
moteurs IA (ChatGPT, Perplexity, Claude) qui citent des sources 
dans leurs réponses

## Approche stratégique : 3 phases progressives

### Phase 1 — Quick wins SEO/Schema sur l'existant (1-2 jours)

**Principe** : capitaliser sur le contenu unique que les 
partners créent (PV M1, certificats FSC, etc.) — Google et 
ChatGPT préfèrent les sources factuelles vérifiables uniques.

**Actions** :
- Schema.org Product enrichi sur fiches produits :
  - Référencer chaque certification associée 
    (Product → hasCertification → Certification)
  - Inclure organization (partner) avec ses certifs marque
  - Inclure validity dates pour Knowledge Graph
- Schema.org Organization sur pages partner :
  - Liste des certifications
  - Slugs canoniques
  - Logos
- Sitemap.xml dynamique :
  - Inclusion des fiches produits avec lastmod
  - Pages partner avec leurs certifs
- Meta descriptions auto-générées :
  - Format : "{product_name} — {category} certifié 
    {certifs_principales}"
  - Exemple : "BAHAMAS 001 — Chaise bistrot certifiée 
    M1 Feu, FSC pour ERP et restaurants"
- robots.txt audit (autorisation indexation, sitemap reference)

**Bénéfice attendu** :
- Indexation Google améliorée
- Citations dans réponses ChatGPT / Perplexity
- Fichiers de données structurées exposées (Product Knowledge 
  Graph)
- Effort éditorial = zéro (capitalise sur l'existant)

**Métriques à suivre** :
- Pages indexées (Google Search Console)
- Impressions / clics par fiche produit
- Citations dans réponses IA (manuelle)

### Phase 2 — Pages "Solutions" pilotes (3-5 jours)

**Principe** : créer 3 pages d'intersection certif × usage 
ciblant des long-tail keywords avec intent achat élevé.

**Pages pilotes proposées** :

1. `/solutions/mobilier-erp-m1-feu`
   - Cible : architectes, restaurateurs, hôteliers
   - Keywords : "mobilier ERP M1 feu", "chaise restaurant 
     conforme commission sécurité", "table outdoor certifiée 
     ERP"
   - Contenu : enjeu réglementaire ERP + listing produits 
     M1/M2 + FAQ + CTA

2. `/solutions/mobilier-yacht-imo`
   - Cible : architectes navals, designers yacht/cruise
   - Keywords : "mobilier yacht certifié IMO", "furniture 
     superyacht MED Wheelmark", "outdoor cruise ship pool deck"
   - Contenu : segment marine + listing produits IMO/MED + FAQ

3. `/solutions/mobilier-bord-de-mer-anti-corrosion`
   - Cible : hôtels en bord de mer, restaurants côtiers, plages
   - Keywords : "mobilier outdoor bord de mer", "résistance 
     corrosion saline", "chaise outdoor anti-UV"
   - Contenu : enjeux environnement marin + listing produits 
     avec certifs ASTM B117 / EN ISO 9227 / ISO 4892 + FAQ

**Architecture page Solution** :
- Headline orienté problème (pas "Qu'est-ce que M1")
- 200-400 mots de contenu utile
- Listing dynamique des produits qui matchent les certifs 
  associées (auto-fetch via filtre certification)
- FAQ 3-5 questions concrètes
- Schema.org Article + FAQ
- CTA "Demander un devis" / "Créer un compte"

**Période de mesure** : 4-6 semaines après publication

**Critères de succès** :
- Position Google top 10 sur ≥2 keywords cibles par page
- Trafic organique > 50 visiteurs/mois par page
- Conversion > 2% vers fiche produit ou login

**Si succès** → Phase 3
**Si échec** → analyse causes + pivot stratégique

### Phase 3 — Industrialisation conditionnelle (5-10 jours)

**Conditionnée à la validation Phase 2.**

Industrialisation sur 10-15 pages d'intersection :
- Croisements certif × usage × catégorie produit
- Croisements certif × région (SEO local)
- Croisements usage × matériau

Templates programmatiques (cf. pSEO).

## Approches NON retenues

### Articles génériques par certification (rejetée)

Créer 26 articles "Qu'est-ce que la FSC", "Qu'est-ce que 
ISO 9001", etc.

**Raisons du rejet** :
- Concurrence inégale avec sites officiels (FSC, ISO, etc.) 
  qui ont l'autorité maximale
- Contenu redondant (pas de valeur ajoutée vs existant)
- Pas de connexion claire avec le catalogue → bounce élevé 
  → Google déclasse
- ROI faible

## Métriques globales SEO/GEO

À tracker mensuellement :
- Pages indexées (Google Search Console)
- Impressions / clics organiques (par section : produits, 
  partners, solutions)
- Position moyenne sur keywords cibles
- Trafic organique vers fiches produits
- Conversion organique → login / quote request
- Citations IA (échantillon manuel : ChatGPT, Perplexity, 
  Claude)
- Backlinks (Ahrefs ou équivalent)

## Roadmap suggérée

**Q2 2026 (mai-juin)** : 
- Finir dettes critiques 9, 2, 3
- Audit Dette 18 (RLS warnings)

**Q3 2026 (juillet-septembre)** :
- Phase 1 implémentée
- Mesure baseline 1 mois
- Phase 2 implémentée (3 pilotes)
- Période de mesure 4-6 semaines

**Q4 2026 (octobre-décembre)** :
- Décision Phase 3 selon résultats Phase 2
- Industrialisation conditionnelle

## Risques identifiés

1. **Effort éditorial sous-estimé** : 4-6h par page Solution 
   pour du contenu qui ranke vraiment. Prévoir budget 
   rédactionnel.

2. **Contenu obsolète** : les certifications évoluent. Process 
   de mise à jour à définir (peut être semi-automatique avec 
   les données DB).

3. **Cannibalisation interne** : si plusieurs pages ciblent 
   des keywords similaires, Google peut hésiter. Plan SEO 
   architectural à respecter.

4. **Audit GEO encore expérimental** : les méthodes de 
   tracking citations IA sont émergentes. À monitorer.

## Notes implémentation

Au moment d'implémenter (Q3 2026 prévisionnel) :
- Vérifier état du projet et adapter selon évolutions
- Réaliser keyword research réel (Ahrefs, SEMrush, ou Google 
  Keyword Planner) avant de finaliser les pages Solutions
- Identifier les FAQ via questions réelles de prospects 
  (architecte rencontré, acheteur travaux publics)
- Coordonner avec stratégie commerciale globale

---

**Document à relire et actualiser au démarrage de la Phase 1.**

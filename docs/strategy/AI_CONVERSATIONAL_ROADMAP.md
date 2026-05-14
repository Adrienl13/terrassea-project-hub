# AI Conversational Roadmap — Terrassea Hub

> **Statut** : Cadrage stratégique validé (14 mai 2026, Day 13)
> **Origine** : Réflexion post-observation SourcingAI 2.0 (Made-in-China)
> **Décision globale** : Approche évolutive en 4 phases, PAS d'IA conversationnelle avant catalogue 1000+ produits matures
> **Auteur** : Adrien Laniez · Fondateur Terrassea

---

## 1. Contexte et observation marché

### 1.1 Le déclencheur : SourcingAI 2.0

Made-in-China.com a lancé SourcingAI 2.0 en octobre 2025, déployé internationalement depuis avril 2026. Fonctionnalités :
- AI matching buyer↔supplier
- Recherche multi-modale (texte, image, specs)
- Background checks suppliers
- Comparaison prix automatique
- Workflow end-to-end (sourcing → commande)
- 27+ industries, millions de produits
- ROI affiché : +35 % efficacité sourcing

### 1.2 Évolution du marché B2B 2024-2026

- ChatGPT a éduqué le grand public à conversational AI (2023+)
- B2B suit grand public avec 2-3 ans retard
- Marketplaces majeures lancent leur conversational AI :
  - Alibaba Aigent (2024)
  - Amazon Rufus B2B (2025)
  - Made-in-China SourcingAI (2025)
- Acheteurs B2B s'habituent à ce mode d'interaction
- Attentes pour TOUTE marketplace montent

### 1.3 Question stratégique pour Terrassea

Les acheteurs CHR hospitality qui découvrent Terrassea après avoir utilisé SourcingAI ou similaire vont-ils :
- Trouver ergonomique notre interface actuelle ?
- Attendre une fonctionnalité conversationnelle ?
- Préférer notre curation premium à leur AI volume ?

---

## 2. Vision long terme (12-24 mois)

### 2.1 Hypothèse de travail

L'IA conversationnelle sera un **complément attendu** dans la recherche produits B2B premium d'ici fin 2026 / mi-2027.

**Mais** : pas un remplacement de la curation et du service.

### 2.2 Ce que serait l'IA Terrassea idéale

PAS une IA généraliste comme SourcingAI.

OUI une IA spécialisée :
- **Expert outdoor hospitality CHR EU**
- Conseille selon contexte géographique (Méditerranée, Atlantique, Alpine, Urbain)
- Intègre normes ERP, certifications EU (FR M1, EN 13501, etc.)
- Multi-langue native (FR/EN/IT/ES/DE/NL)
- Bouclage business : redirige vers commercial humain si projet >100 k€
- Couche premium par-dessus la curation, pas le cœur du produit

### 2.3 Le moat Terrassea à protéger

L'IA NE DOIT PAS diluer le positionnement :

✅ Préserver : "Salone-grade curation, EU premium, service expert"
❌ Éviter : "AI sourcing platform" (ferait converger vers Made-in-China territory où Terrassea perdrait)

---

## 3. Pourquoi pas maintenant ?

### 3.1 Catalogue insuffisant

- 5-15 marques Vague 1 = 250-750 produits
- IA conversationnelle utile nécessite **1 000+ produits**
- Sinon : réponses fréquentes "aucun produit ne correspond"
- = Frustration utilisateur = pire que pas d'IA

### 3.2 Catalogue pas encore complexe

Critère founder : "produits complexes" requis.

Concrètement :
- Multi-variants (couleurs, dimensions, finitions)
- Configurables / paramétrables
- Specs techniques riches (certifications, normes)
- Bundles / collections

Vague 1 = produits encore basiques pour la plupart.

### 3.3 Coût opportunité solo founder

Implémentation IA bien faite = 3-5 semaines focus founder.

Pendant ces 3-5 semaines, **n'est PAS fait** :
- Démarchage marques Salone (priorité business absolue)
- Phase 1 CGV (bloquant Vague 2 commerciale)
- Vague 2 Founding Partner Tracking
- Réponses tactiques marques intéressées

= ROI négatif si fait trop tôt.

### 3.4 Risque qualité

IA conversationnelle médiocre = pire que pas d'IA.

Pour faire BIEN :
- Catalogue mature (1 000+ produits)
- Specs riches et propres
- 6-8 semaines testing/itération
- Monitoring continu hallucinations
- Multi-langue propre

Sous-investir → casser crédibilité curation Terrassea.

---

## 4. Stratégie évolutive en 4 phases

### Phase 0 — Vague 1 (maintenant à 5-15 marques)

**Pas d'IA conversationnelle.**

Focus :
- Démarchage Salone (priorité business)
- Phase 1 CGV (juridique requis)
- Mobile UX (fait Day 13, 6 commits)
- Recherche/filtres améliorés si nécessaire

### Phase 1 — 15-25 marques (Quick Quote Wizard)

**Pas encore d'IA conversationnelle.**

Alternative intermédiaire : Quick Quote Wizard.

Concept : Form structuré multi-étapes
1. Type établissement (Hôtel/Restaurant/Bar/Glamping)
2. Type projet (Ouverture/Rénovation/Extension)
3. Espace (Terrasse/Restaurant intérieur/Lobby/etc.)
4. Quantité approximative
5. Budget par pièce
6. Style préférence

Output : 3-6 produits matchés + 1 suggestion bundle.

Avantages vs IA pure :
- ✅ Implémentable avec petit catalogue
- ✅ 0 coût API LLM
- ✅ Pas d'hallucinations
- ✅ Capture **intentions structurées** (data précieuse)
- ✅ Effort dev : 3-5 jours
- ✅ Funnel naturel : Wizard → Quote → Order
- ✅ Data qui servira au POC IA Phase 2

Effort estimé : 3-5 jours founder solo.

### Phase 2 — 25-50 marques (1 000-3 000 produits, POC IA interne)

**POC IA conversationnelle interne, PAS lancement public.**

Objectifs :
- Tester avec catalogue réel
- Mesurer pertinence des réponses
- Identifier hallucinations
- Évaluer coût LLM réel
- Décider GO/NO-GO lancement public

Effort : 1-2 semaines exploration.

Décision : passer Phase 3 OUI / NON selon résultats.

### Phase 3 — 50+ marques (3 000+ produits, lancement public)

**IA hybride public.**

Architecture :
- **Quick Quote Wizard** (filtres structurés, par défaut)
- **+ IA conversationnelle premium** (mode "parler à un expert")
- Mode dégradé : si IA ne sait pas → redirige vers Wizard
- Multi-langue native (FR/EN/IT/ES/DE/NL)

Budget : ~200-500 $/mois LLM API.
Effort dev : 3-5 semaines (selon stade Phase 2).

### Phase 4 — 100+ marques (production scale)

**IA conversationnelle premium maintenue + enrichie.**

Évolutions :
- Suggestions bundle intelligentes
- Apprentissage patterns acheteurs
- Recherche multi-modale (image)
- Intégration RGPD-compliant avancée
- Bouclage commercial humain pour >100 k€

Budget : ~500-1 000 $/mois LLM API.

---

## 5. Analyse coûts détaillée

### 5.1 Coûts techniques (LLM API)

**Hypothèses business à 30 marques (~1 500 produits)** :
- 200 visiteurs uniques /jour
- 30 % utilisent l'IA (forecast)
- 5 messages moyens par conversation
- Total : 9 000 messages /mois

**Coûts LLM 2026** (estimations) :

| Provider | Modèle | Coût/message moyen |
|---|---|---|
| Anthropic Claude Sonnet 4.6 | Recommandé | ~$0.005-0.01 |
| OpenAI GPT-4o | Standard | ~$0.005-0.01 |
| Anthropic Claude Haiku 4.5 | Light | ~$0.002-0.005 |
| Mistral Large | EU alternative | ~$0.005-0.01 |

**Estimation mensuelle Sonnet 4.6** :
- 9 000 messages × $0.008 = ~72 $/mois (modeste)
- Avec pics et historique : 100-200 $/mois

### 5.2 Coûts infrastructure

- Vector DB (Supabase pgvector ou Pinecone) : 0-50 $/mois
- Monitoring (LangSmith, Helicone) : 0-50 $/mois
- Backend Edge Functions : inclus Supabase actuel

### 5.3 Synthèse 3 scénarios

| Scénario | Stade | LLM | Infra | Total /mois |
|---|---|---|---|---|
| MVP discret | 10 marques | 30 $ | 0 $ | **~30 $** |
| Vague 2 mature | 30 marques | 150 $ | 50 $ | **~200 $** |
| Scale | 100+ marques | 800 $ | 100 $ | **~900 $** |

### 5.4 Coût développement initial

**Solo founder (avec Claude Code)** : 12-20 jours.
**Outsourcing senior** : 9 600 - 16 000 €.

### 5.5 Coût opportunité (le vrai coût)

Solo founder Phase 2-3 (3-5 semaines focus IA) :
- Pas démarchage marques actif
- Pas Phase 1 CGV
- Pas Vague 2 tracking
- = Décalage roadmap business critique

→ **Ne JAMAIS lancer Phase 2-3 si démarchage actif urgent**.

---

## 6. Risques identifiés et mitigations

### 6.1 Risque hallucinations

**Impact** : 1 mauvaise recommandation à un client important = perte de confiance durable.

**Mitigation** :
- Phase 2 POC interne avec eval rigoureux
- System prompt strict ("ne JAMAIS inventer un produit")
- Verification finale : citer produit_id réel du catalogue
- Mode dégradé : redirige vers humain si incertitude

### 6.2 Risque RGPD

**Impact** : Logs conversation = données personnelles, sanction CNIL possible.

**Mitigation** :
- Rétention conversations max 30 jours
- Anonymisation logs après 7 jours
- Mention RGPD claire dans UI chat
- Pas de stockage PII dans prompts/responses

### 6.3 Risque dépendance LLM provider

**Impact** : Si Anthropic/OpenAI augmente prix +50 % du jour au lendemain.

**Mitigation** :
- Architecture multi-provider dès Phase 3 (Anthropic + Mistral fallback)
- Optimisation prompts pour minimiser tokens
- Cache intelligent réponses fréquentes

### 6.4 Risque dilution positionnement

**Impact** : Devenir "AI sourcing platform" diluer le moat curation.

**Mitigation** :
- L'IA reste UN canal parmi d'autres, pas le cœur
- Communication marketing préserve "EU premium curated"
- Quick Quote Wizard + IA cohabitent (différents besoins)

### 6.5 Risque coût opportunité

**Impact** : 3-5 semaines focus founder = retard sur démarchage / CGV.

**Mitigation** :
- Phase 2-3 lancé uniquement quand business sain
- Critères GO clairs (1 000+ produits, démarchage stabilisé)
- Possibilité outsourcing partiel Phase 3

### 6.6 Risque qualité catalogue

**Impact** : IA aussi bonne que data sous-jacente. Specs pauvres = pertinence pauvre.

**Mitigation** :
- Catalogue enrichment Phase 1 (specs structurées par marque)
- Onboarding marques avec template specs riches
- Quality scoring catalogue avant Phase 2

---

## 7. Critères de transition entre phases

### Phase 0 → Phase 1 (Quick Quote Wizard)

Critères de déclenchement :
- 15+ marques Founding Partner approuvées
- 500+ produits actifs catalogue
- Démarchage Salone stabilisé (process clair)
- Phase 1 CGV livrée
- Mobile UX validé (DONE Day 13)

### Phase 1 → Phase 2 (POC IA interne)

Critères :
- 25+ marques actives
- 1 000+ produits
- Quick Quote Wizard a généré 100+ requêtes (data intentions)
- Founder bandwidth dispo 1-2 semaines exploration

### Phase 2 → Phase 3 (lancement public)

Critères :
- POC interne montre pertinence >80 % des cas testés
- Hallucinations <5 % (eval rigoureux)
- 50+ marques actives
- 3 000+ produits
- Budget LLM justifiable vs GMV

### Phase 3 → Phase 4 (production scale)

Critères :
- 100+ marques actives
- Volume requests >10 000 /mois
- ROI mesuré conversion via AI > sans AI

---

## 8. Décisions stratégiques validées

### Décision 1 — PAS d'IA conversationnelle avant 1 000 produits

Rationale : trop frustrant pour utilisateur si trop de "no result".

### Décision 2 — Quick Quote Wizard comme intermédiaire

Rationale : capture intentions précieuses, ROI immédiat, prépare POC IA.

### Décision 3 — POC interne avant lancement public

Rationale : valider qualité avant exposer marques/clients.

### Décision 4 — IA hospitality CHR spécifique, PAS généraliste

Rationale : éviter convergence avec Made-in-China (volume war perdu d'avance).

### Décision 5 — Curation > AI dans communication marketing

Rationale : moat = qualité + service + EU, pas tech IA.

### Décision 6 — Budget LLM acceptable : 30-1 000 $/mois

Rationale : <5 % des revenus commission attendus.

### Décision 7 — Multi-provider dès Phase 3

Rationale : éviter dépendance unique provider (Anthropic + Mistral EU).

---

## 9. Captures dettes liées

### Dette 92 — Quick Quote Wizard MVP
**Statut** : À planifier Phase 1 (15-25 marques)
**Priorité** : Haute (différenciateur + capture data)
**Effort** : 3-5 jours dev

### Dette 93 — Catalogue enrichment process
**Statut** : À mettre en place Phase 1 (avant POC IA Phase 2)
**Priorité** : Moyenne
**Effort** : Process + template marques onboarding

### Dette 94 — POC IA conversationnelle interne
**Statut** : Phase 2 trigger (25-50 marques, 1 000+ produits)
**Priorité** : Haute (décision GO/NO-GO lancement)
**Effort** : 1-2 semaines exploration

### Dette 95 — Multi-provider LLM architecture
**Statut** : Phase 3 lancement public
**Priorité** : Moyenne
**Effort** : 3-5 jours architecture

---

## 10. Pourquoi cette stratégie est défensive ET offensive

### Défensive

- Ne pas se laisser distancer par évolution marché (acheteurs auront attentes)
- Ne pas surpayer pour résultat moyen (timing protégé)
- Ne pas casser positionnement curation (l'IA reste un canal)

### Offensive

- Différenciation vs Made-in-China : pas leur jeu (volume + généraliste)
- Différenciation vs marketplaces EU classiques (Vitra etc.) : modernité contrôlée
- Capture data structurée via Wizard puis IA = avantage long terme

---

## 11. Hypothèses à valider

### À valider en Phase 1

- [ ] Wizard est-il vraiment utilisé par les acheteurs ?
- [ ] Quelles questions reviennent le plus souvent ?
- [ ] Quel % d'acheteurs préféreraient une IA plutôt que des filtres ?

### À valider en Phase 2 (POC)

- [ ] Pertinence IA sur catalogue Terrassea réel ?
- [ ] Coût LLM réel par requête ?
- [ ] Hallucinations fréquence et nature ?
- [ ] Multi-langue qualité ?

### À valider en Phase 3 (public)

- [ ] ROI conversion vs sans IA ?
- [ ] Coût opportunité maintenue raisonnable ?
- [ ] Feedback marques sur l'expérience ?

---

## 12. Historique

| Date | Auteur | Modification |
|---|---|---|
| 14 mai 2026 | Adrien Laniez | Cadrage stratégique initial post-observation SourcingAI |

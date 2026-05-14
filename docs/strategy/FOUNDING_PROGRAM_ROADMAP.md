# Founding Partner Program — Roadmap

> Source de vérité pour le programme Founding Partner.
> Référencé par `platform_settings.pricing_visibility_mode`, `BecomePartnerLaunch.tsx`, et le wording email des relances marques.
> Dernière mise à jour : 2026-05-11.

---

## Pourquoi ce document existe

Pendant la phase de lancement (2026 H2 → seuil volume), Terrassea masque toute mention d'abonnement SaaS payant (Growth €249 / Elite €499 / Brand Member €799 / Brand Network €1 299) au profit d'un **programme Founding Partner** : accès gratuit + commission marketplace réduite (5%) + bénéfices à vie.

L'objectif n'est pas seulement de "cacher les prix" : c'est de **transformer cette période d'acquisition en levier de fidélisation long-terme**. Les partenaires qui rejoignent maintenant doivent percevoir qu'ils gagnent quelque chose d'unique et de **non-rattrapable** une fois les abonnements activés.

Ce document fige les 3 vagues d'implémentation : ce qui est livré aujourd'hui (Vague 1), ce qui suit (Vague 2), ce qui aboutit (Vague 3).

---

## Vague 1 — Bascule UI + commission unique (livrée 2026-05-11)

**État** : ✅ Livrée — `git commit` Vague 1.

**Périmètre** :

1. **Feature flag DB** : `platform_settings.pricing_visibility_mode='launch'` (réversible en un seul `UPDATE`). Default `'full'` à la création — la valeur courante en prod est `'launch'`.
2. **Commission unique** : `platform_settings.launch_commission_rate='5'` — 5% sur toutes les transactions marketplace, indépendamment du `plan` natif du partner.
3. **Trigger auto-upgrade désactivé** : `trg_sync_partner_plan` sur `partners` est `DISABLE` pendant le launch. Pas de bump silencieux starter → growth.
4. **Préservation données** : `partners.plan` reste tel quel (1× brand_member, 1× growth en prod au moment du switch). La bascule retour vers `full` réactivera mécaniquement les plans natifs.
5. **Page publique dédiée** : `/become-partner` route vers `BecomePartnerLaunch.tsx` (nouveau composant) quand `pricing_visibility_mode='launch'`. L'ancienne `BecomePartner.tsx` reste **intacte** et redevient active dès le retour `full`.
6. **Dashboard partner connecté** : `UpgradeCTA`, `UpgradeSuggestion`, `CommissionReminder` retournent `null` en mode launch (3 composants × 1 ligne ajoutée chacun).

**Wording principal** :
- "Accès gratuit pendant le lancement · Aucune carte requise"
- "5% de commission marketplace · Aucun abonnement"
- "Programme Founding Partner — bénéfices à vie"

**Ce qui NE bouge PAS en Vague 1** :
- Aucun tracking gamifié des actions Founding (pas de table `founding_points`, pas de scoring).
- Aucun badge "Founding Partner 2026" matérialisé en DB (juste mention narrative sur la page Launch).
- Aucun algorithm de boost ranking spécifique aux Founders.
- Schema.org `hasOfferCatalog` (`StructuredData.tsx`) **conservé tel quel** — Google indexe encore les prix anciens. Capturé en dette pour Vague 2.

---

## Vague 2 — Tracking MVP + matérialisation du statut (Q3 2026 estimé)

**État** : 🟡 Planifié — déclenché par decision founder, pas par seuil automatique.

**Déclencheur** : `pricing_visibility_mode` reste à `launch` pendant que la cohorte initiale (~15 marques visées post-salon Salone 2026) onboarde. Vague 2 commence quand le founder décide qu'il faut **mesurer** ce que font les partners pour les classer.

**Périmètre prévu** :

1. **Migration `partners.is_founding` (boolean)** + `partners.founding_joined_at` (timestamptz) — marquage léger, ajouté à tout partner créé pendant la fenêtre `pricing_visibility_mode='launch'` via trigger BEFORE INSERT.
2. **Table `founding_actions`** (event log append-only) avec colonnes :
   - `partner_id`, `action_type` (text : `quote_response_under_24h`, `catalogue_complete`, `architect_invited`, `distributor_invited`, `feedback_submitted`, etc.)
   - `points` (int)
   - `created_at`
   - `meta` (jsonb)
3. **View matérialisée `founding_partner_scores`** agrégant points par partner_id + dérivant un `tier` (`silver` / `gold` / `platinum`) selon seuils paramétrables dans `platform_settings.founding_tiers_config`.
4. **Affichage tier sur `BecomePartnerLaunch.tsx`** : section "Vos bénéfices" devient plus concrète avec mention des seuils ("5 actions → Silver, 15 → Gold, 30 → Platinum").
5. **Badge dans le dashboard partner** : `<FoundingBadge tier="gold" />` visible sur l'overview + sur la fiche publique du partner (`/partners/:slug`).

**Catalogue d'actions Founding prévues (à valider Vague 2)** :

| Action | Points | Anti-fraude |
|---|---|---|
| Réponse à un devis en < 24h | 2 | Compté max 1×/devis distinct |
| Catalogue complété (≥ 80% des champs critiques) | 10 | One-shot |
| Invitation architecte signée | 5 | Anti-spam : 1 par email distinct |
| Invitation distributeur signée | 5 | Idem |
| Feedback produit soumis (review interne) | 1 | Max 10 par mois |
| Participation Q&A founders network | 3 | Manuel admin |
| Première commande confirmée | 15 | One-shot |
| 10 commandes confirmées | 30 | One-shot, seuil unique |

**Ce qui reste hors-scope Vague 2** :
- Pas de logique de "perte" de points (additif uniquement, simple).
- Pas de boost ranking algorithmique.
- Pas d'animation UI gamifiée.

---

## Vague 3 — Full gamification + bascule pricing (calendrier non figé)

**État** : 🔵 Conceptuel — bascule conditionnée à la maturité de la cohorte Founding.

**Déclencheurs envisagés** (au moins un suffit) :
- ≥ 50 partners Founding actifs (où "actif" = ≥ 3 commandes signées sur 90 jours glissants).
- ≥ 100 architectes signés via parrainages Founding.
- CA marketplace mensuel ≥ €100k.
- Founder décision business (toujours possible d'avancer/reculer).

**Périmètre prévu** :

1. **Bascule `pricing_visibility_mode='full'`** : la page paid revient publique, `StructuredData.tsx` réindexable (cf. Dette 62).
2. **`launch_commission_rate` désactivée** : retour aux taux par plan natif (`partners.plan` est resté intact, la transition est mécanique).
3. **Trigger `trg_sync_partner_plan` réactivé** : `ALTER TABLE public.partners ENABLE TRIGGER trg_sync_partner_plan`. Les compteurs reprennent.
4. **Bénéfices Founding maintenus à vie** :
   - Badge "Founding Partner 2026" reste sur le profil public.
   - Boost ranking dans `/partners` listing : `ORDER BY is_founding DESC, founding_tier DESC, score DESC` (algorithm change isolé dans une view).
   - Commission réduite : `min(plan_commission, founding_locked_rate)`. Si `founding_locked_rate=3%` sur Platinum, le partner Platinum bumpé à Growth (5%) garde le 3%.
   - Featured listing sur la homepage pour Gold + Platinum.
   - Accès anticipé features beta (toggle `founding_beta_access` côté frontend).
5. **Network Founding** : page interne `/founding-partners` listant les pairs, accessible aux Founders uniquement (private routing + RLS).
6. **Communication** : email annonçant la bascule paid + ce que chaque Founder conserve.

**Multi-rôles extension (Vague 3.5 — optionnel)** :
- Le programme s'étend à `user_type='architect'` ("Founding Architect") et à `user_type='client'` haut volume (cf. Dette 67).
- Mécaniques de points adaptées à chaque rôle.

---

## Critères de transition Vague 1 → Vague 2 → Vague 3

| Question | Vague 1 → Vague 2 | Vague 2 → Vague 3 |
|---|---|---|
| Combien de partners actifs ? | 5+ engagés (un engageant = ≥ 1 action mesurable) | 30+ engagés |
| L'écosystème architecte / distributeur a-t-il décollé ? | Pas requis | Oui — ≥ 20 architectes ou ≥ 10 distributeurs onboardés |
| Le marché valide la valeur ? | Pas requis | Oui — CA marketplace ≥ €30k cumulé |
| Founder a-t-il la bande passante pour la complexité ? | Décision personnelle | Décision personnelle (cf. CLAUDE.md "1 chantier majeur / 2-3 semaines") |
| Le narratif "à vie" tient-il ? | Test soft sur cohorte initiale | Validation via NPS / témoignages founders |

Transitions **réversibles** : on peut rebasculer `full → launch` à tout moment en un UPDATE.

---

## Dettes en cours liées au programme

- **Dette 62** : Réindexer SEO après bascule pricing_visibility_mode='full'. Schema.org `hasOfferCatalog` dans `StructuredData.tsx` reste figé en Vague 1.
- **Dette 63** : Badge "Mode launch actif" dans `AdminSubscriptions.tsx` (optionnel cosmétique founder-only).
- **Dette 64** : Trigger `trg_sync_partner_plan` à réactiver lors de la bascule `full` (mémo de roll-back déjà dans la migration `20260511141703_vague_1_founding_partner_pricing_mode.sql`).
- **Dette 65** : Vague 2 livraison — tracking MVP (`partners.is_founding`, `founding_actions`, view `founding_partner_scores`).
- **Dette 66** : Vague 3 livraison — full gamification + bascule paid + boost ranking algorithmique.
- **Dette 67** : Extension multi-rôles (Founding Architect / Founding Client).
- **Dette 68** : Anti-fraude points (rate-limit, dédup invitations, modération manuelle pour Q&A).
- **Dette 69** : Algorithm boost ranking ordering `partners` listing en Vague 3.
- **Dette 70** : Migration légère `partners.is_founding` + `founding_joined_at` à isoler (Vague 2 amorce).
- **Dette 99** : **Activation Supabase Pro** prévue à la bascule Vague 2 — débloque le ROI Mobile Perf Lot 2 (image transforms) + daily backups + database snapshots (résilience production marketplace EU). ~25 $/mois. Helper d'optimisation images déjà en place (commit `f877947`), bascule = zéro changement de code.

Ces dettes sont également listées dans `DETTE_TECHNIQUE_AUDIT.md` pour traçabilité unifiée.

## Infrastructure requise pour Vague 2 transactionnelle

| Composant | Free actuel | Pro requis | Note |
|---|---|---|---|
| Database backups quotidiens | ❌ | ✅ | Résilience marketplace EU |
| Render Image API | ❌ (no-op) | ✅ | Mobile Perf Lot 2 (Dette 97 + 99) |
| Support email prioritaire | ❌ | ✅ | Réactivité incidents |
| Database snapshots | limité | ✅ | Recovery time réduit |
| Coût mensuel | 0 $ | ~25 $ | Cf. Dette 99 |

L'upgrade Supabase Pro est tracé comme **Dette 99**, déclenchée au démarrage transactionnel Vague 2 (commissions justifient le coût).

---

## Garde-fous opérationnels

- **`pricing_visibility_mode='full'` reste le default DB en cas de réinit / clone projet** — un nouvel environnement ne masquera jamais les prix sans qu'on le demande explicitement.
- **Aucune référence "Founding Partner" dans la table `partners`** tant que Vague 2 n'est pas livrée — la cohorte est implicite (créés pendant la fenêtre `launch`).
- **Le composant `BecomePartnerLaunch.tsx` ne contient pas de prix éventuels** — pas de "réduit de 50% pour les Founders" ni de "économisez €X" : la page reste 100% qualitative pour ne pas créer d'ancrage de prix par effet de mention.
- **`AdminSubscriptions.tsx`** affiche toujours les prix natifs (vue founder-only) : utile pour anticiper la bascule, sans biais utilisateur final.

# Strategic Decisions Log — Terrassea Hub

> Append-only log of founder-level decisions that shape the roadmap and the codebase.
> Each entry is dated, motivated, and tagged with downstream impact.
> This file is the canonical reference for all subsequent chantiers and for any agent
> reasoning about scope/priorities.

---

## 2026-04-29 — Architects stay free until end of 2026

**Decision** : Chantier 2 "Pricing architecte" is removed from Phase 1. All architects (`user_profiles.user_type='architect'`) remain on a fully free tier until end of 2026 at minimum. No `architect_subscription`, no tier (`Studio` / `Atelier` / `Maison`), no commission on architect-driven projects in 2026.

**Justification (founder)** :
- Volume of active architects is not yet sufficient to justify a paid layer.
- A free tier is currently the strongest acquisition lever — monetising too early would slow growth at the very moment the platform is trying to constitute critical mass.
- A paid tier with weak volume creates churn and political friction (architects feel "tested before adopted").

**Reassessment criteria (2027)** : the question will be re-opened in 2027 against three measurable criteria:
1. Active architects count (definition TBD — likely "logged in within last 90 days + at least 1 project")
2. Architect-led projects delivered (`architect_projects` with status = `delivered` or equivalent)
3. Demand surfaced from architects themselves (qualitative — survey, support tickets, sales calls)

**Impact on roadmap** :
- Phase 1 freed of Chantier 2 (~3-6 weeks of work depending on scope).
- These weeks will be reallocated to a high-ROI free-volume chantier, **TBD by founder at end of audit**.
- No `architect_subscription`, `architect_plan`, `architect_tier` types, columns, or tables to be introduced in 2026 — anything an agent might design that depends on these MUST be flagged and bounced back.

**Code implications (2026 freeze)** :
- `src/lib/partnerConstants.ts` keeps `PARTNER_PLANS` as-is (no architect-specific plan).
- `user_profiles.user_type='architect'` stays a behaviour switch (UI gating, dashboards), not a billing dimension.
- Any "architect tier" UI surface should be considered out-of-scope and removed if encountered.

**References** :
- This decision was acted upon during the 2026-04 codebase audit (cf. `RECON.md` §14.6).
- Confirmed by founder over chat on 2026-04-29.

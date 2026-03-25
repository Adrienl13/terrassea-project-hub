---
name: Architect Dashboard & Rewards
description: Architect/designer dashboard with engagement rewards system (Studio/Atelier/Maison tiers) and supplier calls feature
type: project
---

Architect dashboard built with dedicated components in `src/components/architect-dashboard/ArchitectSections.tsx`.

**Sections:** Overview, Projects, Quotes, Supplier Calls, Messages, Rewards, Favourites, Settings

**Rewards tiers:**
- Studio (0-999 pts): 5% discount, 10 quotes/month
- Atelier (1000-4999 pts): 10% discount, 30 quotes/month, priority responses, early access
- Maison (5000+ pts): 15% discount, unlimited quotes, dedicated account manager, co-branding, featured profile

**Supplier Calls:** Architects can publish project briefs for suppliers to respond to (appel à fournisseurs). Earns 75 points per call.

**Why:** The architect user type needed a dedicated space beyond the basic overview. Rewards system incentivizes engagement and bringing business to the platform.

**How to apply:** All data is currently mock/hardcoded. Database tables (architect_rewards, architect_points_history, architect_projects) need to be created in Supabase for real data integration.

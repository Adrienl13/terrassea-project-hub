-- ============================================================================
-- Dette 108 Session 2 — activate first_5_products action
-- Date : 2026-05-15
--
-- L'action 'first_5_products' (200 pts) était deferred en Session 1 car elle
-- requiert un count côté Edge function (les triggers DB AFTER INSERT products
-- exécuteraient la RPC à chaque insert, peu efficient). L'Edge function
-- record-founding-products-batch déployée en Session 2 fait le count + appel
-- RPC. On active l'action ici.
-- ============================================================================

UPDATE public.platform_settings
SET value = jsonb_set(
      value,
      '{actions,first_5_products,active}',
      'true'::jsonb
    ) #- '{actions,first_5_products,deferred_to}',
    updated_at = now()
WHERE key = 'founding_tiers_config';

# catalog-download

Lead-gated download d'un **catalogue PDF** partner/marque.

Un visiteur public (non authentifié) saisit son contact sur la page
`/partners/:slug` ou `/brands/:slug`. La fonction enregistre le **lead** puis
renvoie une **signed URL** éphémère vers le PDF stocké dans le bucket privé
`partner-catalogs`.

## Purpose
- Capturer les contacts intéressés (acquisition) sans rendre le PDF public.
- Le `path` du fichier n'est **jamais** exposé côté client : il est résolu
  serveur-side depuis `partners.documents` (jsonb) via `service_role`.

## Request
`POST` — `verify_jwt = false` (visiteurs anonymes).

```json
{
  "partner_id": "uuid",
  "catalog_id": "string (id de l'entrée dans partners.documents)",
  "email": "required, validé",
  "name": "optional",
  "company": "optional",
  "locale": "optional (en|fr|es|it)"
}
```

## Response
```json
{ "url": "signed url (TTL 300s)", "filename": "...", "title": "...", "expires_at": "ISO" }
```

## Required secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Tables / storage touched
- **Reads** `public.partners` (`name, contact_email, user_id, documents` —
  résout le catalogue ciblé + destinataire de la notification).
- **Inserts** `public.catalog_leads` (seul écrivain autorisé : service_role —
  INSERT révoqué pour anon/authenticated par RLS).
- **Inserts** `public.notifications` (notification in-app au partenaire — best
  effort).
- **Signs** un objet du bucket privé `partner-catalogs` (chemin
  `{partner_id}/{catalog_id}.pdf`).

## Notification partenaire (best effort)
Après l'enregistrement du lead et la génération de l'URL signée, la fonction
prévient le partenaire :
- **in-app** : ligne dans `notifications` pour le propriétaire (`partners.user_id`).
- **email** : via la fonction `send-notification-email` (Bearer service_role),
  envoyé à `partners.contact_email` (fallback : email du compte propriétaire).
  `reply_to` = email du prospect pour un suivi direct.

Ces notifications sont **best effort** : toute erreur est loggée mais n'empêche
JAMAIS le visiteur de recevoir son lien de téléchargement. L'email respecte le
toggle global `platform_settings.notification_email_enabled` (skip propre si off).

## Notes
- TTL signed URL = 300 s. Un échec d'insert lead **bloque** l'accès (pas de
  download silencieux non journalisé).
- Pas d'auth requise : la protection vient de la validation serveur + du fait
  que le path n'est pas devinable et que la signed URL expire vite.
- Dépend de `send-notification-email` (déjà déployée) pour l'envoi email.

## Re-deploy
```bash
# via MCP Supabase (deploy_edge_function, verify_jwt=false) ou CLI :
supabase functions deploy catalog-download --no-verify-jwt
```

Companion migration : `supabase/migrations/20260604120000_catalog_downloads_phase_1.sql`

-- ============================================================
-- Create the `partner-assets` storage bucket
-- Date : 2026-06-02
--
-- The app uploaded brand collection galleries, brand-reference
-- ("projets réalisés") photos and other partner marketing assets to a
-- `partner-assets` bucket that was NEVER created. Every upload failed
-- (bucket not found); some call sites swallowed the error, so photos
-- silently never appeared. This creates the bucket (public, so the
-- public brand page can render the images) + deliberate RLS policies.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('partner-assets', 'partner-assets', true, 10485760) -- 10 MB
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Public read: brand pages are public, anonymous visitors must see the photos.
-- (Bucket is public so the CDN serves objects regardless; this policy keeps the
-- authenticated Storage API consistent.)
drop policy if exists "partner_assets_public_read" on storage.objects;
create policy "partner_assets_public_read" on storage.objects
  for select
  using (bucket_id = 'partner-assets');

-- Writes: any authenticated user (partners upload their own; admins upload on
-- behalf of brands). Mirrors the existing `product-images` bucket policy set.
drop policy if exists "partner_assets_auth_insert" on storage.objects;
create policy "partner_assets_auth_insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'partner-assets' and auth.uid() is not null);

drop policy if exists "partner_assets_auth_update" on storage.objects;
create policy "partner_assets_auth_update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'partner-assets' and auth.uid() is not null)
  with check (bucket_id = 'partner-assets' and auth.uid() is not null);

drop policy if exists "partner_assets_auth_delete" on storage.objects;
create policy "partner_assets_auth_delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'partner-assets' and auth.uid() is not null);

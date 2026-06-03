-- ============================================================
-- Cold "originals" bucket — uncompressed source images
-- Date : 2026-06-03
--
-- The upload layer compresses display copies (max 2560px / WebP). For
-- SIGNATURE maisons only, we also archive the UNTOUCHED original here
-- (print / deep-zoom insurance). Private bucket, never served publicly.
-- Path convention: <partner_id>/<hint>-<ts>.<ext>.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('partner-originals', 'partner-originals', false, 26214400) -- 25 MB
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Write: any authenticated user (partners upload their own; admins on behalf).
drop policy if exists "partner_originals_auth_insert" on storage.objects;
create policy "partner_originals_auth_insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'partner-originals' and auth.uid() is not null);

-- Read: admins, or the owner partner (first path segment = their partner id).
drop policy if exists "partner_originals_read" on storage.objects;
create policy "partner_originals_read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-originals'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select p.id::text from public.partners p where p.user_id = auth.uid()
      )
    )
  );

-- Delete: same as read (admin or owner).
drop policy if exists "partner_originals_delete" on storage.objects;
create policy "partner_originals_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'partner-originals'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select p.id::text from public.partners p where p.user_id = auth.uid()
      )
    )
  );

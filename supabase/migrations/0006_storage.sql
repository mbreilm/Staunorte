-- =====================================================================
-- 0006_storage.sql  ·  Storage-Bucket für Ortsfotos (T8)
--
-- Öffentlich lesbar (Fotos sind Teil der öffentlichen Ortsdaten),
-- schreiben dürfen nur angemeldete Nutzer - die feinere Regel (nur nach
-- Check-in in den letzten 24 h) steht schon als RLS-Policy auf
-- public.place_photos in 0003_rls.sql.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

drop policy if exists "place-photos oeffentlich lesbar" on storage.objects;
create policy "place-photos oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'place-photos');

drop policy if exists "place-photos schreiben angemeldet" on storage.objects;
create policy "place-photos schreiben angemeldet"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'place-photos');

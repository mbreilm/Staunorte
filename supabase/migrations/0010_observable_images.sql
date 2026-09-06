-- =====================================================================
-- 0010_observable_images.sql  ·  Foto je Fahrzeugtyp (Vorbereitung Album)
--
-- Die Gruppen-Icons sagen nur, WAS FÜR EIN Gerät es ist (Bagger, Kran, …).
-- Wer wissen will, wie ein Straßenfertiger im Unterschied zu einer
-- Straßenfräse aussieht, braucht ein echtes Foto. Dieses Foto gehört wie
-- alle kategoriespezifischen Inhalte in die Datenbank, nicht ins Frontend
-- (CLAUDE.md Regel 2).
--
-- Hier entsteht nur die Ablage - das UI kommt separat. Solange
-- image_path NULL ist, zeigt die App weiter das Gruppen-Icon; die Fotos
-- können also Stück für Stück nachgezogen werden.
-- =====================================================================

-- Pfad im Bucket 'observable-photos', z. B. 'strassenfertiger.jpg'.
-- Bewusst nur der Pfad, keine volle URL: der Storage-Host steckt schon in
-- der Supabase-Konfiguration und würde sich bei einem Umzug doppelt ändern.
alter table public.observable_types
  add column if not exists image_path text;

-- Quellenangabe je Foto. Freie Bilder (Wikimedia Commons u. ä.) verlangen
-- Urheber- und Lizenznennung; ohne mitgeführte Angabe ist ein Foto später
-- nicht mehr rechtssicher verwendbar.
alter table public.observable_types
  add column if not exists image_credit text;

comment on column public.observable_types.image_path is
  'Dateipfad im Storage-Bucket observable-photos. NULL = App zeigt das Gruppen-Icon.';
comment on column public.observable_types.image_credit is
  'Pflichtangabe zu Urheber und Lizenz, sobald image_path gesetzt ist.';

-- Fotos des Katalogs sind öffentlich sichtbar (wie der Katalog selbst).
insert into storage.buckets (id, name, public)
values ('observable-photos', 'observable-photos', true)
on conflict (id) do nothing;

drop policy if exists "observable-photos oeffentlich lesbar" on storage.objects;
create policy "observable-photos oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'observable-photos');

-- Bewusst KEINE Insert-Policy: anders als Ortsfotos ist das hier
-- redaktioneller Inhalt. Hochgeladen wird mit dem Service-Role-Key
-- (umgeht RLS), damit niemand über die App Katalogbilder austauschen kann.

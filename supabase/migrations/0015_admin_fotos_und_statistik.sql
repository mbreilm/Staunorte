-- =====================================================================
-- 0015_admin_fotos_und_statistik.sql
--   * Fotoverwaltung für Admins: alle Fotos eines Orts sehen (auch
--     ausgeblendete), neue hinzufügen. Löschen nutzt das bereits
--     bestehende admin_foto_loeschen() aus 0008.
--   * page_views: minimaler, komplett anonymer Seitenaufruf-Zähler
--     (keine IP, keine Nutzer-ID, kein Zeitstempel-Bezug zu Personen) -
--     Grundlage für "Seitenaufrufe heute" im Analytics-Dashboard.
--   * admin_statistik() um zwei Kennzahlen erweitert.
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Fotos eines Orts, alle Status (Admin soll auch ausgeblendete sehen)
-- ---------------------------------------------------------------------
create or replace function public.admin_ort_fotos(p_place_id uuid)
returns table (
  id                uuid,
  storage_path      text,
  moderation_status text,
  created_at        timestamptz,
  uploaded_by       uuid,
  uploaded_by_email text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select ph.id, ph.storage_path, ph.moderation_status, ph.created_at,
         ph.uploaded_by, u.email::text
  from public.place_photos ph
  left join auth.users u on u.id = ph.uploaded_by
  where ph.place_id = p_place_id
  order by ph.created_at desc;
end;
$$;

-- Fügt ein bereits hochgeladenes Storage-Objekt als Foto hinzu. Die Datei
-- selbst lädt der Client direkt in den place-photos-Bucket hoch (dafür
-- reicht die bestehende "schreiben angemeldet"-Policy aus 0006) - diese
-- Funktion trägt danach nur die DB-Zeile nach, ohne die Check-in-Pflicht
-- aus der normalen place_photos-Insert-Policy (0003), da Admin-Uploads
-- nicht an einen eigenen Check-in gebunden sein sollen.
create or replace function public.admin_foto_hinzufuegen(
  p_place_id uuid,
  p_storage_path text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  insert into public.place_photos (place_id, storage_path, uploaded_by)
  values (p_place_id, p_storage_path, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Seitenaufrufe: eine Zeile pro Seitenaufruf, komplett anonym - keine
-- Spalte, die sich einer Person zuordnen ließe.
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;

drop policy if exists p_ins on public.page_views;
create policy p_ins on public.page_views for insert
  to anon, authenticated
  with check (true);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant insert on public.page_views to anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- admin_statistik() um Seitenaufrufe heute + Fotos gesamt erweitert.
-- CREATE OR REPLACE erlaubt keine Änderung des Rückgabetyps - alte
-- Funktion daher zuerst explizit entfernen (siehe 0009 für denselben
-- Kommentar/dasselbe Vorgehen).
-- ---------------------------------------------------------------------
drop function if exists public.admin_statistik();

create or replace function public.admin_statistik()
returns table (
  orte_gesamt          integer,
  orte_diese_woche     integer,
  checkins_gesamt      integer,
  checkins_diese_woche integer,
  nutzer_gesamt        integer,
  nutzer_diese_woche   integer,
  offene_meldungen     integer,
  seitenaufrufe_heute  integer,
  fotos_gesamt         integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_wochenbeginn timestamptz :=
    date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
  v_heute_beginn timestamptz :=
    date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select
    (select count(*)::int from public.places where is_hidden = false),
    (select count(*)::int from public.places
       where is_hidden = false and created_at >= v_wochenbeginn),
    (select count(*)::int from public.checkins where counts_toward_stats = true),
    (select count(*)::int from public.checkins
       where counts_toward_stats = true and created_at >= v_wochenbeginn),
    (select count(*)::int from public.profiles),
    (select count(*)::int from public.profiles where created_at >= v_wochenbeginn),
    (select count(*)::int from public.reports where resolved_at is null),
    (select count(*)::int from public.page_views where created_at >= v_heute_beginn),
    (select count(*)::int from public.place_photos where moderation_status = 'ok');
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.admin_ort_fotos(uuid) to authenticated';
    execute 'grant execute on function public.admin_foto_hinzufuegen(uuid,text) to authenticated';
    execute 'grant execute on function public.admin_statistik() to authenticated';
  end if;
end $$;

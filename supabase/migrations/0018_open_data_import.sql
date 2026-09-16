-- =====================================================================
-- 0018_open_data_import.sql · Baustellen aus OpenStreetMap einspielen
--
-- Zwei Dinge:
--   1. open_data_ort_anlegen() - legt einen Ort mit source='open_data' an.
--      Idempotent über (source, external_id): Ein zweiter Lauf legt nichts
--      doppelt an, sondern aktualisiert den vorhandenen Eintrag. Der
--      passende Unique-Index besteht seit 0001.
--   2. places_nearby() blendet importierte Orte aus, die nach 60 Tagen
--      noch niemand bestätigt hat.
--
-- Warum ein Filter beim Abfragen statt eines Löschjobs: Es gibt nichts
-- wegzuräumen, keinen Cron, und ein Ort, der nach 70 Tagen doch einen
-- Check-in bekommt, ist sofort wieder da. Dieselbe Haltung wie bei
-- confidence (CLAUDE.md Regel 3): berechnen statt speichern.
--
-- Herkunft der Daten: OpenStreetMap, Lizenz ODbL. Die Namensnennung
-- zeigt die Karte bereits im Attributionshinweis.
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Einspielen
-- ---------------------------------------------------------------------
create or replace function public.open_data_ort_anlegen(
  p_external_id text,
  p_title       text,
  p_lat         double precision,
  p_lon         double precision,
  p_category    text default 'baustelle',
  p_note        text default null,
  p_end_at      timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  -- Admins duerfen von Hand einspielen, der Server-Schluessel fuer den
  -- Import-Lauf. Beides sind bewusste Ausnahmen; fuer normale Nutzer
  -- bleibt der einzige Weg, einen Ort anzulegen, create_place().
  if not (public.ist_admin() or auth.role() = 'service_role') then
    raise exception 'KEIN_ADMIN';
  end if;

  -- Koordinaten prüfen, bevor sie in die Datenbank kommen. Ein einziger
  -- kaputter Wert genügt, um die Karte im Browser unbrauchbar zu machen -
  -- genau das ist in dieser App schon einmal passiert.
  if p_lat is null or p_lon is null
     or p_lat <> p_lat or p_lon <> p_lon          -- NaN ist ungleich sich selbst
     or abs(p_lat) > 90 or abs(p_lon) > 180 then
    raise exception 'UNGUELTIGE_KOORDINATEN';
  end if;

  insert into public.places (
    category_id, title, geom, source, is_confirmed, external_id,
    external_end_at, note, created_by
  )
  values (
    p_category, p_title,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    'open_data', false, p_external_id,
    p_end_at, p_note, auth.uid()
  )
  on conflict (source, external_id) where external_id is not null
  do update set
    title            = excluded.title,
    geom             = excluded.geom,
    external_end_at  = excluded.external_end_at,
    note             = excluded.note,
    -- last_activity_at bewusst NICHT anfassen: Sonst sähe ein erneuter
    -- Import wie frische Aktivität aus, obwohl niemand dort war.
    is_hidden        = false
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Unbestätigte Importe nach 60 Tagen ausblenden
-- ---------------------------------------------------------------------
drop function if exists public.places_nearby(
  double precision, double precision, integer, integer, text, boolean, text[]
);

create or replace function public.places_nearby(
  p_lat      double precision,
  p_lon      double precision,
  p_radius_m integer default 5000,
  p_limit    integer default 200,
  p_category text    default 'baustelle',
  p_only_active boolean default false,
  p_observable_type_ids text[] default null
) returns table (
  id                uuid,
  title             text,
  lat               double precision,
  lon               double precision,
  distance_m        double precision,
  status            text,
  source            text,
  is_confirmed      boolean,
  checkin_count     integer,
  activity          text,
  fresh_observables integer,
  thumb_path        text
)
language sql
stable
set search_path = public, extensions
as $$
  select
    p.id,
    p.title,
    ST_Y(p.geom::geometry),
    ST_X(p.geom::geometry),
    ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography),
    p.status,
    p.source,
    p.is_confirmed,
    p.checkin_count,
    public.place_is_active_now(p.id),
    (select count(*)::int from public.v_place_observables o
      where o.place_id = p.id and o.confidence >= 0.60),
    (select ph.storage_path from public.place_photos ph
      where ph.place_id = p.id and ph.moderation_status = 'ok'
      order by ph.created_at desc limit 1)
  from public.places p
  where p.category_id = p_category
    and p.is_hidden = false
    and p.status <> 'beendet'
    -- Importierte Orte sind Einladungen, keine Zusagen. Hat sie nach
    -- 60 Tagen niemand durch einen Check-in bestätigt, verschwinden sie.
    -- Nutzer-Orte sind davon nicht betroffen.
    and (
      p.source <> 'open_data'
      or p.checkin_count > 0
      or p.created_at > now() - interval '60 days'
    )
    and ST_DWithin(p.geom,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography, p_radius_m)
    and (not p_only_active or public.place_is_active_now(p.id) = 'aktiv')
    and (
      p_observable_type_ids is null
      or array_length(p_observable_type_ids, 1) is null
      or exists (
        select 1 from public.v_place_observables o
        where o.place_id = p.id
          and o.confidence >= 0.60
          and o.observable_type_id = any(p_observable_type_ids)
      )
    )
  order by ST_Distance(p.geom,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography)
  limit least(p_limit, 500);
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.open_data_ort_anlegen(text,text,double precision,double precision,text,text,timestamptz) to authenticated';
    execute 'revoke all on function public.open_data_ort_anlegen(text,text,double precision,double precision,text,text,timestamptz) from anon';
    execute 'grant execute on function public.places_nearby(double precision,double precision,integer,integer,text,boolean,text[]) to anon, authenticated';
  end if;
end $$;

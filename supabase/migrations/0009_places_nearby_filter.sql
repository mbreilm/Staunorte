-- =====================================================================
-- Filter für die Kartenabfrage (Claude-Design-Projekt "Staunorte", Filter-
-- Screen): "nur jetzt aktive Orte" und "nur Orte mit mindestens einem
-- frischen Fahrzeug aus dieser Auswahl". Neue Parameter mit Default ans
-- Ende angehängt, damit bestehende Aufrufe (ohne Filter) unverändert
-- weiterlaufen - Geschäftslogik bleibt in der Datenbank (CLAUDE.md).
-- =====================================================================

set search_path = public, extensions;

-- CREATE OR REPLACE ersetzt eine Funktion nur, wenn die Parametertypen exakt
-- übereinstimmen - mit den zwei neuen Parametern entsteht sonst ein zweiter,
-- überladener places_nearby() statt eines Ersatzes. Alte Signatur zuerst
-- explizit entfernen.
drop function if exists public.places_nearby(
  double precision, double precision, integer, integer, text
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

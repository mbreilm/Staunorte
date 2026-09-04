-- =====================================================================
-- 0007_place_location.sql
--
-- Für T9 (Check-in): Der Client braucht lat/lon eines bekannten Ortes,
-- um bei ZU_WEIT_ENTFERNT einen Pin-Korrektur-Flow anzubieten (mit der
-- aus T7 bekannten Standortauswahl). places.geom ist eine
-- geography(Point,4326) - direkt aus PostgREST nicht als Lat/Lon nutzbar,
-- siehe lib/supabase/types.ts.
--
-- update_place_location() nutzt dieselbe RLS wie das direkte Update auf
-- places (nur der Ersteller, nur unbestätigte Orte, siehe 0003_rls.sql
-- p_upd_own) - SECURITY INVOKER (Standard), keine Sonderrechte nötig.
-- =====================================================================

set search_path = public, extensions;

create or replace function public.place_location(p_place_id uuid)
returns table (lat double precision, lon double precision)
language sql
stable
as $$
  select ST_Y(geom::geometry), ST_X(geom::geometry)
  from public.places
  where id = p_place_id and is_hidden = false;
$$;

create or replace function public.update_place_location(
  p_place_id uuid,
  p_lat double precision,
  p_lon double precision
) returns void
language sql
as $$
  update public.places
  set geom = ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
  where id = p_place_id;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.place_location(uuid) to anon, authenticated';
    execute 'grant execute on function public.update_place_location(uuid,double precision,double precision) to authenticated';
  end if;
end $$;

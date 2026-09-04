-- =====================================================================
-- 0002_functions.sql  ·  Kern-Logik
--   * observable_confidence()  – der Frische-Zerfall (PRD Kap. 7)
--   * place_is_active_now()    – "lohnt sich der Weg jetzt?" (PRD Kap. 6.5)
--   * places_nearby()          – Kartenabfrage
--   * do_checkin()             – Check-in inkl. Positiv-/Negativsignalen
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Confidence: exponentieller Zerfall seit der letzten Sichtung.
--   * mehr unabhängige Melder  -> träger (Halbwertszeit steigt)
--   * Negativsignale           -> schneller (Halbwertszeit sinkt)
--   * permanente Merkmale      -> immer 1.0
-- STABLE (nicht IMMUTABLE), weil now() verwendet wird.
-- ---------------------------------------------------------------------
create or replace function public.observable_confidence(
  p_last_seen          timestamptz,
  p_half_life_days     numeric,
  p_is_permanent       boolean,
  p_negative_count     integer,
  p_distinct_reporters integer
) returns numeric
language sql
stable
as $$
  select case
    when p_is_permanent then 1.0::numeric
    when p_last_seen is null or p_half_life_days is null then 0::numeric
    else power(
      0.5::numeric,
      (extract(epoch from (now() - p_last_seen))::numeric / 86400.0)
      / greatest(
          p_half_life_days
            * (1 + 0.3 * least(greatest(coalesce(p_distinct_reporters, 1) - 1, 0), 3))
            * power(0.5::numeric, least(coalesce(p_negative_count, 0), 3)),
          0.25)
    )
  end;
$$;

create or replace function public.confidence_bucket(p_confidence numeric)
returns text language sql immutable as $$
  select case
    when p_confidence >= 0.60 then 'jetzt_hier'
    when p_confidence >= 0.25 then 'kuerzlich'
    else 'archiv'
  end;
$$;

-- ---------------------------------------------------------------------
-- View für Clients. negative_count wird bewusst NICHT ausgeliefert.
-- ---------------------------------------------------------------------
create or replace view public.v_place_observables
with (security_invoker = true) as
select
  po.place_id,
  po.observable_type_id,
  ot.name_de,
  ot.kid_name,
  ot.group_name,
  ot.class,
  ot.rarity,
  ot.icon,
  ot.is_permanent,
  po.first_seen_at,
  po.last_seen_at,
  po.positive_count,
  po.distinct_reporters,
  public.observable_confidence(po.last_seen_at, ot.half_life_days,
        ot.is_permanent, po.negative_count, po.distinct_reporters) as confidence,
  public.confidence_bucket(
    public.observable_confidence(po.last_seen_at, ot.half_life_days,
        ot.is_permanent, po.negative_count, po.distinct_reporters)) as bucket
from public.place_observables po
join public.observable_types ot on ot.id = po.observable_type_id
join public.places p            on p.id  = po.place_id
where p.is_hidden = false;

-- ---------------------------------------------------------------------
-- Feiertag?
-- ---------------------------------------------------------------------
create or replace function public.is_holiday_de_by(p_day date)
returns boolean language sql stable as $$
  select exists (select 1 from public.holidays where day = p_day);
$$;

-- ---------------------------------------------------------------------
-- "Jetzt vermutlich aktiv?"  ->  'aktiv' | 'ruhe' | 'unbekannt'
-- Beobachtung schlägt Angabe (PRD 6.5). Feiertag überschreibt alles.
-- ---------------------------------------------------------------------
create or replace function public.place_is_active_now(
  p_place_id uuid,
  p_at       timestamptz default now()
) returns text
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_local     timestamp;
  v_weekday   smallint;
  v_hour      smallint;
  v_minutes   integer;
  v_has_hours boolean;
  v_in_hours  boolean;
  v_active    integer := 0;
  v_quiet     integer := 0;
begin
  v_local   := p_at at time zone 'Europe/Berlin';
  v_weekday := (extract(isodow from v_local)::int - 1)::smallint;   -- 0 = Montag
  v_hour    := extract(hour from v_local)::smallint;
  v_minutes := extract(hour from v_local)::int * 60
             + extract(minute from v_local)::int;

  if public.is_holiday_de_by(v_local::date) then
    return 'ruhe';
  end if;

  select coalesce(active_count, 0), coalesce(quiet_count, 0)
    into v_active, v_quiet
  from public.place_activity
  where place_id = p_place_id and weekday = v_weekday and hour = v_hour;

  -- 1) Beobachtung (ab 3 Signalen belastbar)
  if v_active >= 3 and v_active > v_quiet then return 'aktiv'; end if;
  if v_quiet  >= 3 and v_quiet  > v_active then return 'ruhe';  end if;

  -- 2) Angegebene Zeiten
  select exists (select 1 from public.place_hours where place_id = p_place_id)
    into v_has_hours;

  if v_has_hours then
    select exists (
      select 1 from public.place_hours
      where place_id = p_place_id
        and weekday = v_weekday
        and v_minutes >= start_min
        and v_minutes <  end_min
    ) into v_in_hours;
    return case when v_in_hours then 'aktiv' else 'ruhe' end;
  end if;

  return 'unbekannt';
end;
$$;

-- ---------------------------------------------------------------------
-- Kartenabfrage: Orte im Umkreis
-- ---------------------------------------------------------------------
create or replace function public.places_nearby(
  p_lat      double precision,
  p_lon      double precision,
  p_radius_m integer default 5000,
  p_limit    integer default 200,
  p_category text    default 'baustelle'
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
  order by ST_Distance(p.geom,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography)
  limit least(p_limit, 500);
$$;

-- ---------------------------------------------------------------------
-- Ort anlegen (mit Duplikatschutz)
-- ---------------------------------------------------------------------
create or replace function public.create_place(
  p_title      text,
  p_lat        double precision,
  p_lon        double precision,
  p_observable_ids text[],
  p_address    text default null,
  p_note       text default null,
  p_attributes jsonb default '{}'::jsonb,
  p_category   text default 'baustelle'
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_geom geography := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;
  v_dupe uuid;
  v_id   uuid;
begin
  if v_user is null then raise exception 'NICHT_ANGEMELDET'; end if;
  if exists (select 1 from public.profiles where id = v_user and is_blocked) then
    raise exception 'GESPERRT';
  end if;
  if coalesce(array_length(p_observable_ids, 1), 0) = 0 then
    raise exception 'MINDESTENS_EIN_MERKMAL';
  end if;

  select p.id into v_dupe
  from public.places p
  where p.category_id = p_category
    and p.is_hidden = false
    and p.status <> 'beendet'
    and ST_DWithin(p.geom, v_geom, 100)
  order by ST_Distance(p.geom, v_geom)
  limit 1;

  if v_dupe is not null then
    raise exception 'DUPLIKAT:%', v_dupe;
  end if;

  insert into public.places (category_id, title, geom, address, note, attributes,
                             source, created_by, is_confirmed)
  values (p_category, p_title, v_geom, p_address, p_note,
          coalesce(p_attributes, '{}'::jsonb), 'user', v_user, false)
  returning id into v_id;

  -- Angegebene Merkmale sofort eintragen (sonst gingen sie verloren, falls
  -- der anschließende Check-in eine andere Auswahl enthält).
  insert into public.place_observables (place_id, observable_type_id,
          first_seen_at, last_seen_at, positive_count, negative_count, distinct_reporters)
  select v_id, x, now(), now(), 1, 0, 1
  from unnest(p_observable_ids) as x
  where exists (select 1 from public.observable_types o where o.id = x and o.is_active)
  on conflict (place_id, observable_type_id) do nothing;

  -- ... und direkt fürs Sammelalbum freischalten
  insert into public.user_observable_unlocks
    (user_id, observable_type_id, first_place_id, unlocked_at)
  select v_user, x, v_id, now()
  from unnest(p_observable_ids) as x
  where exists (select 1 from public.observable_types o where o.id = x and o.is_active)
  on conflict (user_id, observable_type_id) do nothing;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- CHECK-IN  ·  Herzstück
--   * Geofence-Prüfung (<= 200 m, GPS-Genauigkeit <= 100 m)
--   * max. 1 wertender Check-in pro Nutzer/Ort/24 h
--   * genannte Merkmale  -> last_seen_at = now(), negative_count = 0
--   * NICHT genannte, aktuell sichtbare Merkmale -> negative_count + 1
--     (= das implizite Negativsignal aus PRD 7.4)
--   * Aktivitäts-Histogramm für "jetzt aktiv?"
--   * Sammelalbum-Freischaltungen
-- ---------------------------------------------------------------------
create or replace function public.do_checkin(
  p_place_id       uuid,
  p_lat            double precision,
  p_lon            double precision,
  p_accuracy_m     double precision default null,
  p_observable_ids text[]           default '{}'
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user        uuid := auth.uid();
  v_geom        geography;
  v_dist        double precision;
  v_counts      boolean;
  v_checkin_id  uuid;
  v_now         timestamptz := now();
  v_local       timestamp;
  v_weekday     smallint;
  v_hour        smallint;
  v_ids         text[] := coalesce(p_observable_ids, '{}');
  v_has_sel     boolean;
  v_is_active   boolean;
  v_new_unlocks text[];
begin
  if v_user is null then raise exception 'NICHT_ANGEMELDET'; end if;
  if exists (select 1 from public.profiles where id = v_user and is_blocked) then
    raise exception 'GESPERRT';
  end if;

  v_has_sel := coalesce(array_length(v_ids, 1), 0) > 0;

  select geom into v_geom
  from public.places where id = p_place_id and is_hidden = false;
  if v_geom is null then raise exception 'ORT_NICHT_GEFUNDEN'; end if;

  v_dist := ST_Distance(v_geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography);
  if v_dist > 200 then
    raise exception 'ZU_WEIT_ENTFERNT:%', round(v_dist::numeric);
  end if;
  if p_accuracy_m is not null and p_accuracy_m > 100 then
    raise exception 'GPS_UNGENAU';
  end if;

  -- Wertet dieser Check-in? (max. 1 pro Nutzer/Ort/24 h)
  v_counts := not exists (
    select 1 from public.checkins
    where place_id = p_place_id
      and user_id  = v_user
      and counts_toward_stats
      and created_at > v_now - interval '24 hours');

  v_local   := v_now at time zone 'Europe/Berlin';
  v_weekday := (extract(isodow from v_local)::int - 1)::smallint;
  v_hour    := extract(hour from v_local)::smallint;

  insert into public.checkins (place_id, user_id, created_at, lat, lon,
                               accuracy_m, distance_m, local_weekday, local_hour,
                               counts_toward_stats)
  values (p_place_id, v_user, v_now, p_lat, p_lon,
          p_accuracy_m, v_dist, v_weekday, v_hour, v_counts)
  returning id into v_checkin_id;

  if v_has_sel then
    insert into public.checkin_observables (checkin_id, observable_type_id)
    select v_checkin_id, x
    from unnest(v_ids) as x
    where exists (select 1 from public.observable_types o where o.id = x and o.is_active)
    on conflict do nothing;
  end if;

  if v_counts then
    if v_has_sel then
      -- (a) Positivsignale
      insert into public.place_observables (place_id, observable_type_id,
              first_seen_at, last_seen_at, positive_count, negative_count, distinct_reporters)
      select p_place_id, x, v_now, v_now, 1, 0, 1
      from unnest(v_ids) as x
      where exists (select 1 from public.observable_types o where o.id = x and o.is_active)
      on conflict (place_id, observable_type_id) do update
        set last_seen_at   = v_now,
            positive_count = public.place_observables.positive_count + 1,
            negative_count = 0;

      -- (b) Implizites Negativsignal für nicht genannte, noch sichtbare Merkmale
      update public.place_observables po
      set negative_count = least(po.negative_count + 1, 3)
      from public.observable_types ot
      where po.place_id = p_place_id
        and ot.id = po.observable_type_id
        and ot.is_permanent = false
        and not (po.observable_type_id = any (v_ids))
        and public.observable_confidence(po.last_seen_at, ot.half_life_days,
              ot.is_permanent, po.negative_count, po.distinct_reporters) >= 0.25;

      -- (c) Anzahl unabhängiger Melder neu berechnen
      update public.place_observables po
      set distinct_reporters = sub.n
      from (
        select co.observable_type_id, count(distinct c.user_id)::int as n
        from public.checkins c
        join public.checkin_observables co on co.checkin_id = c.id
        where c.place_id = p_place_id
        group by co.observable_type_id
      ) sub
      where po.place_id = p_place_id
        and po.observable_type_id = sub.observable_type_id;
    end if;

    -- (d) Aktivitäts-Histogramm
    v_is_active := v_has_sel and exists (
      select 1 from public.observable_types
      where id = any (v_ids) and class in ('mobil','transient'));

    insert into public.place_activity (place_id, weekday, hour, active_count, quiet_count)
    values (p_place_id, v_weekday, v_hour,
            case when v_is_active then 1 else 0 end,
            case when v_is_active then 0 else 1 end)
    on conflict (place_id, weekday, hour) do update
      set active_count = public.place_activity.active_count + excluded.active_count,
          quiet_count  = public.place_activity.quiet_count  + excluded.quiet_count;

    -- (e) Ort aktualisieren
    update public.places
    set checkin_count    = checkin_count + 1,
        last_activity_at = v_now,
        is_confirmed     = true,
        status = case when status in ('ruhend','vermutlich_beendet','beendet')
                      then 'aktiv' else status end
    where id = p_place_id;
  end if;

  -- (f) Sammelalbum
  if v_has_sel then
    with ins as (
      insert into public.user_observable_unlocks
        (user_id, observable_type_id, first_place_id, unlocked_at)
      select v_user, x, p_place_id, v_now
      from unnest(v_ids) as x
      where exists (select 1 from public.observable_types o where o.id = x and o.is_active)
      on conflict (user_id, observable_type_id) do nothing
      returning observable_type_id
    )
    select coalesce(array_agg(observable_type_id), '{}') into v_new_unlocks from ins;
  else
    v_new_unlocks := '{}';
  end if;

  return jsonb_build_object(
    'checkin_id',  v_checkin_id,
    'counted',     v_counts,
    'distance_m',  round(v_dist::numeric, 1),
    'new_unlocks', to_jsonb(v_new_unlocks)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Ausführungsrechte
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.do_checkin(uuid,double precision,double precision,double precision,text[]) from public';
    execute 'grant execute on function public.do_checkin(uuid,double precision,double precision,double precision,text[]) to authenticated';
    execute 'revoke all on function public.create_place(text,double precision,double precision,text[],text,text,jsonb,text) from public';
    execute 'grant execute on function public.create_place(text,double precision,double precision,text[],text,text,jsonb,text) to authenticated';
    execute 'grant execute on function public.places_nearby(double precision,double precision,integer,integer,text) to anon, authenticated';
    execute 'grant execute on function public.place_is_active_now(uuid,timestamptz) to anon, authenticated';
  end if;
end $$;

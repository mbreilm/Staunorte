-- =====================================================================
-- 0019_merkliste.sql · Persönliche Merkliste
--
-- "Da will ich mal hin": Wer eine spannende Baustelle findet, setzt sie
-- auf die eigene Liste und findet sie später über Profil oder Kartenfilter
-- wieder.
--
-- Streng privat, im Geist von CLAUDE.md Regel 4 (Check-in-Daten sind
-- privat): Was jemand vorhat, geht niemanden sonst etwas an. Es gibt
-- deshalb keinen öffentlichen Zähler und keine fremde Leseberechtigung.
-- =====================================================================

set search_path = public, extensions;

create table if not exists public.place_bookmarks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- Für "meine Liste, neueste zuerst".
create index if not exists place_bookmarks_user_idx
  on public.place_bookmarks (user_id, created_at desc);

alter table public.place_bookmarks enable row level security;

drop policy if exists p_own on public.place_bookmarks;
create policy p_own on public.place_bookmarks for select
  using (user_id = auth.uid());

drop policy if exists p_ins on public.place_bookmarks;
create policy p_ins on public.place_bookmarks for insert
  with check (user_id = auth.uid() and auth.uid() is not null);

drop policy if exists p_del on public.place_bookmarks;
create policy p_del on public.place_bookmarks for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Umschalten: rein oder raus, je nachdem was gerade gilt
-- ---------------------------------------------------------------------
create or replace function public.merkliste_umschalten(p_place_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_drin boolean;
begin
  if v_user is null then raise exception 'NICHT_ANGEMELDET'; end if;

  -- Verhindert, dass sich jemand Merkzettel auf ausgeblendete oder gar
  -- nicht existierende Orte legt.
  if not exists (select 1 from public.places
                 where id = p_place_id and is_hidden = false) then
    raise exception 'ORT_NICHT_GEFUNDEN';
  end if;

  select exists (select 1 from public.place_bookmarks
                 where user_id = v_user and place_id = p_place_id)
    into v_drin;

  if v_drin then
    delete from public.place_bookmarks
     where user_id = v_user and place_id = p_place_id;
    return false;
  end if;

  insert into public.place_bookmarks (user_id, place_id)
  values (v_user, p_place_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Die eigene Liste, wahlweise nach Entfernung sortiert
-- ---------------------------------------------------------------------
create or replace function public.merkliste_orte(
  p_lat double precision default null,
  p_lon double precision default null
)
returns table (
  id            uuid,
  title         text,
  address       text,
  lat           double precision,
  lon           double precision,
  distance_m    double precision,
  status        text,
  source        text,
  is_confirmed  boolean,
  checkin_count integer,
  activity      text,
  gemerkt_am    timestamptz,
  thumb_path    text
)
language sql
stable
set search_path = public, extensions
as $$
  select
    p.id, p.title, p.address,
    ST_Y(p.geom::geometry), ST_X(p.geom::geometry),
    case when p_lat is null or p_lon is null then null
         else ST_Distance(p.geom,
                ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography)
    end,
    p.status, p.source, p.is_confirmed, p.checkin_count,
    public.place_is_active_now(p.id),
    b.created_at,
    (select ph.storage_path from public.place_photos ph
      where ph.place_id = p.id and ph.moderation_status = 'ok'
      order by ph.created_at desc limit 1)
  from public.place_bookmarks b
  join public.places p on p.id = b.place_id
  where b.user_id = auth.uid()
    and p.is_hidden = false
  -- Ohne Standortfreigabe gibt es keine Entfernung; dann zählt, was
  -- zuletzt gemerkt wurde.
  order by
    case when p_lat is null or p_lon is null then null
         else ST_Distance(p.geom,
                ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography)
    end asc nulls last,
    b.created_at desc;
$$;

-- ---------------------------------------------------------------------
-- Karte: Merkliste als Filter, und gemerkte Orte erkennbar machen
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
  p_observable_type_ids text[] default null,
  p_only_bookmarked boolean default false
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
  thumb_path        text,
  is_bookmarked     boolean
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
      order by ph.created_at desc limit 1),
    -- Immer nur die eigene Merkliste: auth.uid() ist bei anonymen
    -- Aufrufen null, dann steht hier überall false.
    exists (select 1 from public.place_bookmarks b
             where b.place_id = p.id and b.user_id = auth.uid())
  from public.places p
  where p.category_id = p_category
    and p.is_hidden = false
    and p.status <> 'beendet'
    and (
      p.source <> 'open_data'
      or p.checkin_count > 0
      or p.created_at > now() - interval '60 days'
    )
    and ST_DWithin(p.geom,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography, p_radius_m)
    and (not p_only_active or public.place_is_active_now(p.id) = 'aktiv')
    and (
      not p_only_bookmarked
      or exists (select 1 from public.place_bookmarks b
                  where b.place_id = p.id and b.user_id = auth.uid())
    )
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
    execute 'grant select, insert, delete on public.place_bookmarks to authenticated';
    execute 'grant execute on function public.merkliste_umschalten(uuid) to authenticated';
    execute 'grant execute on function public.merkliste_orte(double precision,double precision) to authenticated';
    execute 'revoke all on function public.merkliste_umschalten(uuid) from anon';
    execute 'revoke all on function public.merkliste_orte(double precision,double precision) from anon';
    execute 'grant execute on function public.places_nearby(double precision,double precision,integer,integer,text,boolean,text[],boolean) to anon, authenticated';
  end if;
end $$;

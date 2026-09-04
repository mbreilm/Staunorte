-- =====================================================================
-- 0001_schema.sql  ·  Grundschema
-- Projekt: Baustellen-App (Arbeitstitel "Baustellenjäger")
--
-- Bewusst generische Benennung (places / observables), damit später
-- weitere Ortskategorien (Spielplätze, Tierweiden) ohne Datenmigration
-- ergänzt werden können. Siehe PRD Kapitel 5.2.
-- =====================================================================

-- --- Erweiterungen -----------------------------------------------------
create schema if not exists extensions;
create extension if not exists postgis  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

set search_path = public, extensions;

-- --- Kompatibilitäts-Stub für lokale Tests -----------------------------
-- Auf Supabase existiert das Schema "auth" bereits -> dieser Block macht
-- dort NICHTS. Nur damit die Migration auch auf einem nackten Postgres
-- durchläuft (z. B. für Tests).
do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'auth') then
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid());
    execute $f$ create function auth.uid() returns uuid language sql stable as 'select null::uuid' $f$;
  end if;
end $$;

-- =====================================================================
-- Kategorien  (v1 enthält genau eine Zeile: 'baustelle')
-- =====================================================================
create table if not exists public.place_categories (
  id               text primary key,
  name_singular    text not null,
  name_plural      text not null,
  observable_label text not null,          -- "Fahrzeuge" / später "Spielgeräte"
  hours_label      text not null,          -- "Arbeitszeiten" / "Öffnungszeiten"
  lifecycle        text not null default 'endlich'
                   check (lifecycle in ('endlich','dauerhaft')),
  safety_notice    text not null default '',
  attribute_schema jsonb not null default '{}'::jsonb,
  marker_style     jsonb not null default '{}'::jsonb,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

comment on table public.place_categories is
  'Definiert pro Ortskategorie die UI-Texte und das Verhalten. Alle kategoriespezifischen Texte MÜSSEN von hier kommen, niemals im Frontend hartkodiert werden.';

-- =====================================================================
-- Profile
-- =====================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin     boolean not null default false,
  is_blocked   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- Orte
-- =====================================================================
create table if not exists public.places (
  id               uuid primary key default gen_random_uuid(),
  category_id      text not null references public.place_categories(id),
  title            text not null check (char_length(title) between 3 and 120),
  geom             geography(Point,4326) not null,
  address          text,
  attributes       jsonb not null default '{}'::jsonb,   -- z.B. {"phase":"rohbau"}
  status           text not null default 'aktiv'
                   check (status in ('aktiv','ruhend','vermutlich_beendet','beendet')),
  source           text not null default 'user'
                   check (source in ('user','open_data')),
  is_confirmed     boolean not null default false,       -- mind. 1 Nutzer-Check-in
  external_id      text,
  external_end_at  timestamptz,
  note             text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  checkin_count    integer not null default 0,
  is_hidden        boolean not null default false,
  hidden_reason    text
);

create index if not exists places_geom_idx     on public.places using gist (geom);
create index if not exists places_cat_stat_idx on public.places (category_id, status) where is_hidden = false;
create unique index if not exists places_external_uidx
  on public.places (source, external_id) where external_id is not null;

-- =====================================================================
-- Arbeits-/Öffnungszeiten  (optional, 0..n Zeilen pro Ort)
-- Kein Eintrag = "Zeiten unbekannt".
-- =====================================================================
create table if not exists public.place_hours (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places(id) on delete cascade,
  preset     text not null check (preset in ('werktags','werktags_sa','durchgehend','custom')),
  weekday    smallint not null check (weekday between 0 and 6),   -- 0 = Montag
  start_min  smallint not null check (start_min between 0 and 1440),
  end_min    smallint not null check (end_min   between 0 and 1440),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (end_min > start_min)
);
create index if not exists place_hours_idx on public.place_hours (place_id, weekday);

-- =====================================================================
-- Beobachtete Aktivität, aggregiert (7 x 24 Buckets pro Ort)
-- Enthält bewusst KEINEN Nutzerbezug.
-- =====================================================================
create table if not exists public.place_activity (
  place_id     uuid not null references public.places(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  hour         smallint not null check (hour between 0 and 23),
  active_count integer not null default 0,
  quiet_count  integer not null default 0,
  primary key (place_id, weekday, hour)
);

-- =====================================================================
-- Katalog beobachtbarer Merkmale (in v1: Baufahrzeuge)
-- =====================================================================
create table if not exists public.observable_types (
  id              text primary key,          -- slug, z.B. 'kettenbagger'
  category_id     text not null references public.place_categories(id),
  name_de         text not null,
  kid_name        text,
  group_name      text,                      -- "Bagger", "Kräne", ...
  class           text not null check (class in
                    ('permanent','standgeraet','stationaer_mobil','mobil','transient')),
  half_life_days  numeric,                   -- NULL nur bei class='permanent'
  is_permanent    boolean not null default false,
  rarity          text not null default 'haeufig'
                  check (rarity in ('haeufig','selten','legendaer')),
  sort_order      integer not null default 100,
  icon            text,
  kid_description text,
  is_active       boolean not null default true,
  check ( (is_permanent and half_life_days is null)
       or (not is_permanent and half_life_days is not null) )
);

-- =====================================================================
-- Aggregat: welches Merkmal an welchem Ort, wie frisch
-- "confidence" wird NICHT gespeichert, sondern zur Laufzeit berechnet.
-- =====================================================================
create table if not exists public.place_observables (
  place_id           uuid not null references public.places(id) on delete cascade,
  observable_type_id text not null references public.observable_types(id),
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  positive_count     integer  not null default 0,
  negative_count     smallint not null default 0,
  distinct_reporters integer  not null default 0,
  primary key (place_id, observable_type_id)
);

-- =====================================================================
-- Check-ins
-- =====================================================================
create table if not exists public.checkins (
  id                  uuid primary key default gen_random_uuid(),
  place_id            uuid not null references public.places(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  lat                 double precision,
  lon                 double precision,
  accuracy_m          double precision,
  distance_m          double precision,
  local_weekday       smallint,
  local_hour          smallint,
  counts_toward_stats boolean not null default true
);
create index if not exists checkins_place_idx on public.checkins (place_id, created_at desc);
create index if not exists checkins_user_idx  on public.checkins (user_id,  created_at desc);

create table if not exists public.checkin_observables (
  checkin_id         uuid not null references public.checkins(id) on delete cascade,
  observable_type_id text not null references public.observable_types(id),
  primary key (checkin_id, observable_type_id)
);

-- =====================================================================
-- Sammelalbum
-- =====================================================================
create table if not exists public.user_observable_unlocks (
  user_id            uuid not null references auth.users(id) on delete cascade,
  observable_type_id text not null references public.observable_types(id),
  first_place_id     uuid references public.places(id) on delete set null,
  unlocked_at        timestamptz not null default now(),
  primary key (user_id, observable_type_id)
);

-- =====================================================================
-- Fotos
-- =====================================================================
create table if not exists public.place_photos (
  id                uuid primary key default gen_random_uuid(),
  place_id          uuid not null references public.places(id) on delete cascade,
  storage_path      text not null,
  uploaded_by       uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  taken_at          timestamptz,
  exif_lat          double precision,
  exif_lon          double precision,
  moderation_status text not null default 'ok'
                    check (moderation_status in ('ok','gemeldet','entfernt'))
);
create index if not exists place_photos_idx on public.place_photos (place_id, created_at desc);

-- =====================================================================
-- Meldungen / Moderation
-- =====================================================================
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('place','photo')),
  target_id   uuid not null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason      text not null check (reason in
                ('existiert_nicht','falscher_ort','unpassendes_foto',
                 'personen_erkennbar','sonstiges')),
  comment     text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  unique (target_type, target_id, reporter_id)
);

-- =====================================================================
-- Feiertage (Deutschland + Bayern) — für "jetzt aktiv?"-Logik
-- =====================================================================
create table if not exists public.holidays (
  day  date primary key,
  name text not null
);

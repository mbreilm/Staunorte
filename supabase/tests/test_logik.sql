-- =====================================================================
-- test_logik.sql  ·  Funktionstest der Kern-Mechanik
-- Nur für lokale Tests gedacht, NICHT auf Supabase ausführen.
-- =====================================================================
set search_path = public, extensions;

-- auth.uid() für den Test steuerbar machen
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('test.uid', true), '')::uuid $$;

-- Zwei Testnutzer
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333')
on conflict do nothing;
insert into public.profiles (id) select id from auth.users on conflict do nothing;

\echo '--- 1) Ort anlegen (Nutzer 1) ---'
set test.uid = '11111111-1111-1111-1111-111111111111';
select public.create_place(
  'Testbaustelle Leopoldstraße', 48.1600, 11.5860,
  array['kettenbagger','turmdrehkran','fahrmischer'],
  'Leopoldstr. 1, München') as neuer_ort \gset

\echo '--- 2) Check-in Nutzer 1: nennt Bagger + Kran (NICHT den Fahrmischer) ---'
select public.do_checkin(:'neuer_ort', 48.16005, 11.58605, 12,
       array['kettenbagger','turmdrehkran']);

\echo '--- 3) Confidence direkt nach dem Check-in ---'
select observable_type_id, round(confidence,3) as confidence, bucket
from public.v_place_observables where place_id = :'neuer_ort'
order by observable_type_id;

\echo '--- 4) Check-in Nutzer 2, ebenfalls ohne Fahrmischer (Negativsignal #2) ---'
set test.uid = '22222222-2222-2222-2222-222222222222';
select public.do_checkin(:'neuer_ort', 48.15998, 11.58598, 20,
       array['kettenbagger']);

\echo '--- 5) Zweiter Check-in desselben Nutzers -> darf NICHT zaehlen ---'
select (public.do_checkin(:'neuer_ort', 48.15998, 11.58598, 20,
        array['kettenbagger']))->>'counted' as counted_zweiter_versuch;

\echo '--- 6) Negativsignale sichtbar machen ---'
select observable_type_id, positive_count, negative_count, distinct_reporters
from public.place_observables where place_id = :'neuer_ort'
order by observable_type_id;

\echo '--- 7) Zerfall simulieren: alle Sichtungen 4 Tage zurueckdatieren ---'
update public.place_observables set last_seen_at = now() - interval '4 days'
where place_id = :'neuer_ort';

select observable_type_id, round(confidence,3) as confidence, bucket
from public.v_place_observables where place_id = :'neuer_ort'
order by confidence desc;

\echo '--- 8) Geofence: Check-in aus 2 km Entfernung muss scheitern ---'
set test.uid = '33333333-3333-3333-3333-333333333333';
do $$
begin
  perform public.do_checkin(
    (select id from public.places where title like 'Testbaustelle%' limit 1),
    48.1800, 11.5860, 10, array['radlader']);
  raise exception 'FEHLER: Geofence hat NICHT gegriffen';
exception when others then
  if sqlerrm like 'ZU_WEIT_ENTFERNT%' then
    raise notice 'OK  Geofence greift: %', sqlerrm;
  else
    raise;
  end if;
end $$;

\echo '--- 9) Duplikatschutz: zweiter Ort 30 m daneben muss scheitern ---'
do $$
begin
  perform public.create_place('Doppelte Baustelle', 48.16020, 11.58620,
          array['radlader']);
  raise exception 'FEHLER: Duplikatschutz hat NICHT gegriffen';
exception when others then
  if sqlerrm like 'DUPLIKAT%' then
    raise notice 'OK  Duplikatschutz greift';
  else
    raise;
  end if;
end $$;

\echo '--- 10) Sammelalbum von Nutzer 1 ---'
select observable_type_id, first_place_id is not null as mit_ort
from public.user_observable_unlocks
where user_id = '11111111-1111-1111-1111-111111111111'
order by observable_type_id;

\echo '--- 11) Aktivitaets-Histogramm ---'
select weekday, hour, active_count, quiet_count
from public.place_activity where place_id = :'neuer_ort';

\echo '--- 12) Arbeitszeiten setzen und "jetzt aktiv?" pruefen ---'
insert into public.place_hours (place_id, preset, weekday, start_min, end_min)
select :'neuer_ort', 'werktags', g, 420, 960 from generate_series(0,4) g;

select
  public.place_is_active_now(:'neuer_ort', '2026-09-02 10:00+02'::timestamptz) as mittwoch_10uhr,
  public.place_is_active_now(:'neuer_ort', '2026-09-02 20:00+02'::timestamptz) as mittwoch_20uhr,
  public.place_is_active_now(:'neuer_ort', '2026-09-06 10:00+02'::timestamptz) as sonntag_10uhr,
  public.place_is_active_now(:'neuer_ort', '2026-10-03 10:00+02'::timestamptz) as feiertag_10uhr;

\echo '--- 13) Kartenabfrage ---'
select title, round(distance_m::numeric,1) as entfernung_m, activity,
       fresh_observables, checkin_count
from public.places_nearby(48.1610, 11.5870, 3000);

\echo '--- 14) Katalog vollstaendig? ---'
select class, count(*), min(half_life_days) as halbwertszeit
from public.observable_types group by class order by 3 nulls first;

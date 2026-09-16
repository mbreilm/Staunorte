-- =====================================================================
-- 0021_sitzungen_statt_seitenaufrufe.sql
--
-- Bisher schrieb die App bei JEDER Navigation eine Zeile nach page_views.
-- Das zählt Klicks, nicht Menschen: Wer einmal die App öffnet und durch
-- Karte, Album und Profil geht, erzeugte vier Zeilen. Für die Frage
-- "benutzt das überhaupt jemand" ist die Zahl damit wertlos, und die
-- Tabelle wuchs unnötig schnell (535 Zeilen in einer Woche).
--
-- Jetzt eine Zeile pro Sitzung. Die Kennung erzeugt der Browser selbst und
-- hält sie nur bis zum Schließen des Tabs (sessionStorage) - sie lässt
-- sich keiner Person zuordnen und überlebt den Besuch nicht.
--
-- Erfasst wird zusätzlich, ob jemand angemeldet war. Bewusst nur als
-- Ja/Nein ohne Nutzerkennung: Die Frage "wie viele Besucher legen sich ein
-- Konto zu" ist wichtig für den Start in München, die Zuordnung zu einer
-- Person wäre es nicht.
-- =====================================================================

set search_path = public, extensions;

create table if not exists public.app_sessions (
  id         bigint generated always as identity primary key,
  -- Zufallskennung aus dem Browser. Unique, damit ein doppelt abgesetzter
  -- Aufruf (zwei Tabs, schneller Neuaufbau) keine zweite Zeile erzeugt.
  session_id text not null unique check (char_length(session_id) between 8 and 64),
  angemeldet boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_created_idx
  on public.app_sessions (created_at desc);

alter table public.app_sessions enable row level security;

-- Nur Einfügen, und zwar von jedem - auch ohne Konto, denn genau die
-- anonymen Besuche sollen ja gezählt werden. Lesen darf niemand über die
-- Tabelle; die Auswertung läuft über admin_statistik().
drop policy if exists p_ins on public.app_sessions;
create policy p_ins on public.app_sessions for insert
  to anon, authenticated
  with check (true);

-- Alte Zählung abräumen (mit dem Auftraggeber abgestimmt): Die Zeilen
-- stammen überwiegend aus Tests und sind mit den neuen Zahlen ohnehin
-- nicht vergleichbar.
drop table if exists public.page_views;

-- ---------------------------------------------------------------------
-- Kennzahlen
-- ---------------------------------------------------------------------
drop function if exists public.admin_statistik();

create or replace function public.admin_statistik()
returns table (
  orte_gesamt           integer,
  orte_diese_woche      integer,
  checkins_gesamt       integer,
  checkins_diese_woche  integer,
  nutzer_gesamt         integer,
  nutzer_diese_woche    integer,
  offene_meldungen      integer,
  fotos_gesamt          integer,
  sitzungen_heute       integer,
  sitzungen_diese_woche integer,
  sitzungen_mit_konto_diese_woche integer,
  orte_mit_checkin      integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_wochenbeginn timestamptz := date_trunc('week', now());
  v_heute_beginn timestamptz := date_trunc('day', now());
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select
    (select count(*)::int from public.places),
    (select count(*)::int from public.places where created_at >= v_wochenbeginn),
    (select count(*)::int from public.checkins),
    (select count(*)::int from public.checkins where created_at >= v_wochenbeginn),
    (select count(*)::int from auth.users),
    (select count(*)::int from auth.users where created_at >= v_wochenbeginn),
    (select count(*)::int from public.reports where resolved_at is null),
    (select count(*)::int from public.place_photos),
    (select count(*)::int from public.app_sessions where created_at >= v_heute_beginn),
    (select count(*)::int from public.app_sessions where created_at >= v_wochenbeginn),
    (select count(*)::int from public.app_sessions
      where created_at >= v_wochenbeginn and angemeldet),
    -- Die entscheidende Zahl fuer den Start: Wie viele der importierten
    -- Orte hat ueberhaupt schon jemand bestaetigt? Das PRD nennt unter
    -- 20 % nach acht Wochen als Abbruchkriterium.
    (select count(*)::int from public.places where checkin_count > 0);
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant insert on public.app_sessions to anon, authenticated';
    execute 'grant execute on function public.admin_statistik() to authenticated';
    execute 'revoke execute on function public.admin_statistik() from public, anon';
  end if;
end $$;

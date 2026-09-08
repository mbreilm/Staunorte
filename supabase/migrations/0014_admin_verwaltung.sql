-- =====================================================================
-- 0014_admin_verwaltung.sql · Erweiterte Admin-Verwaltung
--   * Orte: durchsuchbare Gesamtliste, Titel bearbeiten, als beendet
--     markieren (Ausblenden/Löschen gibt es schon seit 0008)
--   * Nutzer: durchsuchbare Gesamtliste, Entsperren (Gegenstück zu
--     admin_nutzer_sperren aus 0008), Admin-Rechte umschalten
--   * admin_statistik(): einfache Kennzahlen fürs Analytics-Dashboard
--
-- Gleiches Muster wie 0008_moderation.sql: SECURITY DEFINER mit eigener
-- ist_admin()-Prüfung, statt RLS auf places/profiles für alle Nutzer zu
-- öffnen (CLAUDE.md Regel 5). Die Funktionen laufen mit den Rechten der
-- Rolle, die diese Migration ausführt (im SQL Editor: postgres) - daher
-- dürfen sie auf auth.users zugreifen, um E-Mail-Adressen für die
-- Admin-Ansicht nachzuschlagen. Das ist eine bewusste Ausnahme nur für
-- Admins, nicht öffentlich.
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Orte: Gesamtliste, durchsuchbar (auch ausgeblendete - Admins sollen
-- sehen, was durch die Melde-Schwelle automatisch verschwunden ist)
-- ---------------------------------------------------------------------
create or replace function public.admin_orte_liste(p_suche text default null)
returns table (
  id              uuid,
  title           text,
  category_id     text,
  status          text,
  source          text,
  is_confirmed    boolean,
  is_hidden       boolean,
  checkin_count   integer,
  created_at      timestamptz,
  ersteller_id    uuid,
  ersteller_email text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select
    p.id, p.title, p.category_id, p.status, p.source, p.is_confirmed,
    -- ::text nötig: auth.users.email ist intern varchar(255), RETURN QUERY
    -- verlangt aber exakte Typgleichheit mit der TABLE-Deklaration oben.
    p.is_hidden, p.checkin_count, p.created_at, p.created_by, u.email::text
  from public.places p
  left join auth.users u on u.id = p.created_by
  where p_suche is null or p.title ilike '%' || p_suche || '%'
  order by p.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_ort_beendet(p_place_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.places set status = 'beendet' where id = p_place_id;
end;
$$;

-- Nutzt die bestehende Längenprüfung der Spalte (3-120 Zeichen) - bei
-- Verstoß kommt ein normaler Postgres-Fehler (23514) beim Aufrufer an.
create or replace function public.admin_ort_titel_aendern(p_place_id uuid, p_titel text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.places set title = p_titel where id = p_place_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Nutzer: Gesamtliste, durchsuchbar, inkl. Beitragszahlen
-- ---------------------------------------------------------------------
create or replace function public.admin_nutzer_liste(p_suche text default null)
returns table (
  id               uuid,
  email            text,
  display_name     text,
  is_admin         boolean,
  is_blocked       boolean,
  created_at       timestamptz,
  anzahl_orte      integer,
  anzahl_checkins  integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select
    pr.id, u.email::text, pr.display_name, pr.is_admin, pr.is_blocked, pr.created_at,
    (select count(*)::int from public.places   where created_by = pr.id),
    (select count(*)::int from public.checkins where user_id    = pr.id)
  from public.profiles pr
  join auth.users u on u.id = pr.id
  where p_suche is null
     or u.email ilike '%' || p_suche || '%'
     or pr.display_name ilike '%' || p_suche || '%'
  order by pr.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_nutzer_entsperren(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.profiles set is_blocked = false where id = p_user_id;
end;
$$;

-- Schützt davor, dass sich ein Admin aus Versehen selbst die Rechte
-- entzieht und dann ganz ohne Admin-Zugang dasteht.
create or replace function public.admin_nutzer_admin_setzen(p_user_id uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  if p_user_id = auth.uid() then
    raise exception 'KANN_EIGENEN_ADMIN_STATUS_NICHT_AENDERN';
  end if;
  update public.profiles set is_admin = p_admin where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Analytics: einfache Kennzahlen, jeweils gesamt & diese Woche.
-- Wochenbeginn wie in place_checkins_this_week() (0005): Europe/Berlin,
-- Montag als Wochenstart.
-- ---------------------------------------------------------------------
create or replace function public.admin_statistik()
returns table (
  orte_gesamt          integer,
  orte_diese_woche     integer,
  checkins_gesamt      integer,
  checkins_diese_woche integer,
  nutzer_gesamt        integer,
  nutzer_diese_woche   integer,
  offene_meldungen     integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_wochenbeginn timestamptz :=
    date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
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
    (select count(*)::int from public.reports where resolved_at is null);
end;
$$;

-- ---------------------------------------------------------------------
-- Ausführungsrechte
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.admin_orte_liste(text) to authenticated';
    execute 'grant execute on function public.admin_ort_beendet(uuid) to authenticated';
    execute 'grant execute on function public.admin_ort_titel_aendern(uuid,text) to authenticated';
    execute 'grant execute on function public.admin_nutzer_liste(text) to authenticated';
    execute 'grant execute on function public.admin_nutzer_entsperren(uuid) to authenticated';
    execute 'grant execute on function public.admin_nutzer_admin_setzen(uuid,boolean) to authenticated';
    execute 'grant execute on function public.admin_statistik() to authenticated';
  end if;
end $$;

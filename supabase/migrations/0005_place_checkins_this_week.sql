-- =====================================================================
-- 0005_place_checkins_this_week.sql
--
-- Für die Detailseite (T6): "Check-ins diese Woche". Einzelne Check-ins
-- sind privat (RLS erlaubt nur user_id = auth.uid()), öffentlich ist laut
-- CLAUDE.md nur der aggregierte Zähler - daher SECURITY DEFINER, das aber
-- ausschließlich eine Zahl zurückgibt, keine Nutzer- oder Zeitdaten.
--
-- Wochenbeginn wie in do_checkin(): Europe/Berlin, Montag als Wochenstart.
-- =====================================================================

set search_path = public, extensions;

create or replace function public.place_checkins_this_week(p_place_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, extensions
as $$
  select count(*)::int
  from public.checkins
  where place_id = p_place_id
    and counts_toward_stats = true
    and created_at >= (
      date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin'
    );
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.place_checkins_this_week(uuid) to anon, authenticated';
  end if;
end $$;

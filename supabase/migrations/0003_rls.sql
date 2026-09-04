-- =====================================================================
-- 0003_rls.sql  ·  Row Level Security
--
-- Grundregel (PRD Kap. 5): Lesen ist öffentlich, Schreiben braucht ein Konto.
-- Check-in-Daten einzelner Nutzer sind für niemanden außer den Nutzer selbst
-- lesbar — öffentlich ist nur der aggregierte Zähler auf places.
-- =====================================================================

set search_path = public, extensions;

alter table public.place_categories        enable row level security;
alter table public.profiles                enable row level security;
alter table public.places                  enable row level security;
alter table public.place_hours             enable row level security;
alter table public.place_activity          enable row level security;
alter table public.observable_types        enable row level security;
alter table public.place_observables       enable row level security;
alter table public.checkins                enable row level security;
alter table public.checkin_observables     enable row level security;
alter table public.user_observable_unlocks enable row level security;
alter table public.place_photos            enable row level security;
alter table public.reports                 enable row level security;
alter table public.holidays                enable row level security;

-- --- Öffentlich lesbar -------------------------------------------------
drop policy if exists p_read on public.place_categories;
create policy p_read on public.place_categories for select using (true);

drop policy if exists p_read on public.observable_types;
create policy p_read on public.observable_types for select using (true);

drop policy if exists p_read on public.holidays;
create policy p_read on public.holidays for select using (true);

drop policy if exists p_read on public.places;
create policy p_read on public.places for select using (is_hidden = false);

drop policy if exists p_read on public.place_hours;
create policy p_read on public.place_hours for select using (
  exists (select 1 from public.places p where p.id = place_id and p.is_hidden = false));

drop policy if exists p_read on public.place_activity;
create policy p_read on public.place_activity for select using (
  exists (select 1 from public.places p where p.id = place_id and p.is_hidden = false));

drop policy if exists p_read on public.place_observables;
create policy p_read on public.place_observables for select using (
  exists (select 1 from public.places p where p.id = place_id and p.is_hidden = false));

drop policy if exists p_read on public.place_photos;
create policy p_read on public.place_photos for select using (
  moderation_status = 'ok'
  and exists (select 1 from public.places p where p.id = place_id and p.is_hidden = false));

-- --- Nur eigene Daten --------------------------------------------------
drop policy if exists p_own on public.profiles;
create policy p_own on public.profiles for select using (id = auth.uid());

drop policy if exists p_own_upd on public.profiles;
create policy p_own_upd on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists p_own on public.checkins;
create policy p_own on public.checkins for select using (user_id = auth.uid());

drop policy if exists p_own on public.checkin_observables;
create policy p_own on public.checkin_observables for select using (
  exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid()));

drop policy if exists p_own on public.user_observable_unlocks;
create policy p_own on public.user_observable_unlocks for select using (user_id = auth.uid());

-- --- Schreiben (nur angemeldet) ---------------------------------------
-- Orte werden über create_place() angelegt; direktes Update nur durch den
-- Ersteller und nur bei unbestätigten Orten (Tippfehler korrigieren).
drop policy if exists p_upd_own on public.places;
create policy p_upd_own on public.places for update
  using (created_by = auth.uid() and is_hidden = false)
  with check (created_by = auth.uid());

drop policy if exists p_ins on public.place_hours;
create policy p_ins on public.place_hours for insert
  with check (auth.uid() is not null);

drop policy if exists p_del on public.place_hours;
create policy p_del on public.place_hours for delete
  using (auth.uid() is not null);

drop policy if exists p_ins on public.place_photos;
create policy p_ins on public.place_photos for insert
  with check (
    uploaded_by = auth.uid()
    -- nur nach einem Check-in in den letzten 24 h am selben Ort
    and exists (
      select 1 from public.checkins c
      where c.place_id = place_photos.place_id
        and c.user_id = auth.uid()
        and c.created_at > now() - interval '24 hours'));

drop policy if exists p_ins on public.reports;
create policy p_ins on public.reports for insert
  with check (reporter_id = auth.uid() and auth.uid() is not null);

drop policy if exists p_own on public.reports;
create policy p_own on public.reports for select using (reporter_id = auth.uid());

-- --- Grants (Supabase-Rollen) -----------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant usage on schema public to anon, authenticated';
    execute 'grant select on all tables in schema public to anon, authenticated';
    execute 'grant insert, update, delete on public.place_hours, public.place_photos, public.reports to authenticated';
    execute 'grant update on public.places to authenticated';
  end if;
end $$;

-- --- Auto-Profil bei Registrierung ------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'auth' and table_name = 'users') then
    begin
      execute 'drop trigger if exists on_auth_user_created on auth.users';
      execute 'create trigger on_auth_user_created after insert on auth.users
               for each row execute function public.handle_new_user()';
    exception when insufficient_privilege then
      raise notice 'Trigger auf auth.users konnte nicht angelegt werden - im Supabase-Dashboard manuell anlegen.';
    end;
  end if;
end $$;

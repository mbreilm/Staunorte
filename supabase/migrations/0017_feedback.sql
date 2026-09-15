-- =====================================================================
-- 0017_feedback.sql · Rückmeldungen aus der App
--
-- Im Profil gibt es einen Knopf "Feedback geben" mit drei optionalen
-- Feldern (was gefällt, was stört, was fehlt). Die Rückmeldung geht per
-- E-Mail an den Betreiber UND landet hier in der Datenbank - geht eine
-- Mail verloren (Versandlimit, Spam-Ordner), ist die Rückmeldung trotzdem
-- da und im Admin-Bereich nachlesbar.
--
-- Nur für angemeldete Nutzer. Das ist keine Schikane, sondern schützt
-- davor, dass das Formular als Spam-Schleuder missbraucht wird - jede
-- Rückmeldung hängt an einem Konto.
--
-- Wie bei do_checkin() liegt die Regel in der Datenbank, nicht im
-- Frontend (CLAUDE.md Regel 5): Die Mengenbegrenzung gilt dann auch,
-- wenn jemand die API direkt anspricht.
-- =====================================================================

set search_path = public, extensions;

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  gefaellt   text check (char_length(gefaellt) <= 2000),
  stoert     text check (char_length(stoert)   <= 2000),
  fehlt      text check (char_length(fehlt)    <= 2000),
  created_at timestamptz not null default now(),
  -- Eine komplett leere Rückmeldung hilft niemandem.
  constraint feedback_nicht_leer check (
    coalesce(gefaellt, '') <> ''
    or coalesce(stoert, '') <> ''
    or coalesce(fehlt, '') <> ''
  )
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anlegen nur über feedback_senden() (siehe unten) - die Policy erlaubt
-- es zwar auch direkt, aber immer nur für das eigene Konto.
drop policy if exists p_ins on public.feedback;
create policy p_ins on public.feedback for insert
  with check (user_id = auth.uid() and auth.uid() is not null);

-- Lesen darf jeder nur die eigenen Rückmeldungen. Die Admin-Ansicht
-- läuft über admin_feedback_liste() an der RLS vorbei.
drop policy if exists p_own on public.feedback;
create policy p_own on public.feedback for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Absenden mit Mengenbegrenzung
-- ---------------------------------------------------------------------
create or replace function public.feedback_senden(
  p_gefaellt text default null,
  p_stoert   text default null,
  p_fehlt    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
  v_zahl integer;
begin
  if v_user is null then
    raise exception 'NICHT_ANGEMELDET';
  end if;

  -- Höchstens fünf Rückmeldungen pro Stunde und Konto. Wer wirklich
  -- etwas zu sagen hat, kommt damit aus; ein Skript nicht.
  select count(*) into v_zahl
  from public.feedback
  where user_id = v_user
    and created_at > now() - interval '1 hour';

  if v_zahl >= 5 then
    raise exception 'ZU_VIELE_RUECKMELDUNGEN';
  end if;

  insert into public.feedback (user_id, gefaellt, stoert, fehlt)
  values (
    v_user,
    nullif(btrim(coalesce(p_gefaellt, '')), ''),
    nullif(btrim(coalesce(p_stoert,   '')), ''),
    nullif(btrim(coalesce(p_fehlt,    '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Admin-Ansicht
-- ---------------------------------------------------------------------
create or replace function public.admin_feedback_liste()
returns table (
  id         uuid,
  gefaellt   text,
  stoert     text,
  fehlt      text,
  created_at timestamptz,
  user_id    uuid,
  user_email text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select
    f.id, f.gefaellt, f.stoert, f.fehlt, f.created_at, f.user_id,
    -- ::text nötig: auth.users.email ist intern varchar(255), RETURN QUERY
    -- verlangt exakte Typgleichheit mit der TABLE-Deklaration oben.
    u.email::text
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  order by f.created_at desc
  limit 200;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select, insert on public.feedback to authenticated';
    execute 'grant execute on function public.feedback_senden(text,text,text) to authenticated';
    execute 'grant execute on function public.admin_feedback_liste() to authenticated';
    execute 'revoke all on function public.feedback_senden(text,text,text) from anon';
    execute 'revoke all on function public.admin_feedback_liste() from anon';
  end if;
end $$;

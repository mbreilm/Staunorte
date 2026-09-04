-- =====================================================================
-- 0008_moderation.sql  ·  Melden & Moderation (T12)
--
-- Ticket-Text nennt "0006_moderation.sql" als Beispielnamen - 0006 ist
-- durch T8 (Storage) belegt, hier daher 0008, weiterhin aufsteigend
-- nummeriert.
--
-- Zwei Teile:
--  1. Trigger: ab 2 unabhängigen offenen Meldungen automatisch ausblenden
--     (nutzt die schon bestehenden RLS-Sichtbarkeitsfelder is_hidden /
--     moderation_status - keine neue RLS nötig).
--  2. Admin-Funktionen: SECURITY DEFINER mit eigener is_admin-Prüfung,
--     statt RLS auf places/place_photos/reports/profiles für alle
--     Nutzer zu öffnen (CLAUDE.md Regel 5: sicherheitsrelevante Logik
--     gehört in die Datenbank, nicht als offene RLS-Policy).
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1) Automatisches Ausblenden
-- ---------------------------------------------------------------------
create or replace function public.pruefe_meldeschwelle() returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_anzahl int;
begin
  select count(distinct reporter_id) into v_anzahl
  from public.reports
  where target_type = new.target_type
    and target_id = new.target_id
    and resolved_at is null;

  if v_anzahl >= 2 then
    if new.target_type = 'place' then
      update public.places set is_hidden = true where id = new.target_id;
    elsif new.target_type = 'photo' then
      update public.place_photos set moderation_status = 'gemeldet' where id = new.target_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists t_pruefe_meldeschwelle on public.reports;
create trigger t_pruefe_meldeschwelle
  after insert on public.reports
  for each row execute function public.pruefe_meldeschwelle();

-- ---------------------------------------------------------------------
-- 2) Admin-Funktionen
-- ---------------------------------------------------------------------
create or replace function public.ist_admin() returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.admin_meldungen_offen()
returns table (
  report_id    uuid,
  target_type  text,
  target_id    uuid,
  reason       text,
  comment      text,
  created_at   timestamptz,
  titel        text,
  foto_pfad    text,
  -- Ersteller des gemeldeten Inhalts (nicht der meldenden Person) - fürs
  -- "Nutzer sperren" in der Admin-Ansicht.
  ersteller_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  return query
  select
    r.id, r.target_type, r.target_id, r.reason, r.comment, r.created_at,
    coalesce(p1.title, p2.title),
    ph.storage_path,
    coalesce(p1.created_by, ph.uploaded_by)
  from public.reports r
  left join public.places p1 on r.target_type = 'place' and p1.id = r.target_id
  left join public.place_photos ph on r.target_type = 'photo' and ph.id = r.target_id
  left join public.places p2 on ph.place_id = p2.id
  where r.resolved_at is null
  order by r.created_at asc;
end;
$$;

create or replace function public.admin_ort_ausblenden(p_place_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.places set is_hidden = true where id = p_place_id;
  update public.reports set resolved_at = now()
    where target_type = 'place' and target_id = p_place_id and resolved_at is null;
end;
$$;

create or replace function public.admin_ort_loeschen(p_place_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  begin
    delete from storage.objects
      where bucket_id = 'place-photos'
        and name in (select storage_path from public.place_photos where place_id = p_place_id);
  exception when others then
    null; -- Storage-Aufräumen ist nice-to-have, darf das Löschen nicht blockieren.
  end;

  update public.reports set resolved_at = now()
    where target_type = 'place' and target_id = p_place_id and resolved_at is null;
  delete from public.places where id = p_place_id;
end;
$$;

create or replace function public.admin_foto_ausblenden(p_photo_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.place_photos set moderation_status = 'entfernt' where id = p_photo_id;
  update public.reports set resolved_at = now()
    where target_type = 'photo' and target_id = p_photo_id and resolved_at is null;
end;
$$;

create or replace function public.admin_foto_loeschen(p_photo_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pfad text;
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  select storage_path into v_pfad from public.place_photos where id = p_photo_id;
  if v_pfad is not null then
    begin
      delete from storage.objects where bucket_id = 'place-photos' and name = v_pfad;
    exception when others then
      null;
    end;
  end if;

  update public.reports set resolved_at = now()
    where target_type = 'photo' and target_id = p_photo_id and resolved_at is null;
  delete from public.place_photos where id = p_photo_id;
end;
$$;

create or replace function public.admin_meldung_erledigt(p_report_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.reports set resolved_at = now() where id = p_report_id;
end;
$$;

create or replace function public.admin_nutzer_sperren(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;
  update public.profiles set is_blocked = true where id = p_user_id;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.ist_admin() to authenticated';
    execute 'grant execute on function public.admin_meldungen_offen() to authenticated';
    execute 'grant execute on function public.admin_ort_ausblenden(uuid) to authenticated';
    execute 'grant execute on function public.admin_ort_loeschen(uuid) to authenticated';
    execute 'grant execute on function public.admin_foto_ausblenden(uuid) to authenticated';
    execute 'grant execute on function public.admin_foto_loeschen(uuid) to authenticated';
    execute 'grant execute on function public.admin_meldung_erledigt(uuid) to authenticated';
    execute 'grant execute on function public.admin_nutzer_sperren(uuid) to authenticated';
  end if;
end $$;

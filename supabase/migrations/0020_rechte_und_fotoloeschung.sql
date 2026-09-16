-- =====================================================================
-- 0020_rechte_und_fotoloeschung.sql
--
-- Zwei Befunde aus der Code-Durchsicht:
--
-- 1. Gelöschte Fotos blieben öffentlich abrufbar. admin_ort_loeschen()
--    und admin_foto_loeschen() versuchten, die Bilddatei direkt aus
--    storage.objects zu entfernen - das verbietet Supabase inzwischen
--    ("Direct deletion from storage tables is not allowed"). Der Fehler
--    wurde von einem `exception when others then null` verschluckt: Der
--    Datensatz verschwand, die Datei blieb liegen und war weiterhin für
--    jeden abrufbar, der die Adresse kannte.
--
--    Bei einem Foto, das gemeldet wurde, weil Personen darauf erkennbar
--    sind, ist genau das der Zweck des Löschens. Der tote Block fliegt
--    hier raus; das Entfernen der Datei übernehmen jetzt die Routen
--    /api/admin/foto-loeschen und /api/admin/ort-loeschen, die dafür die
--    Storage-Schnittstelle benutzen.
--
-- 2. Anonyme Aufrufer durften JEDE Funktion ausführen, auch
--    admin_ort_loeschen() und admin_nutzer_admin_setzen(). Abgewiesen
--    wurden sie zuverlässig - jede dieser Funktionen prüft ist_admin()
--    selbst, nachgemessen mit HTTP-Aufrufen ohne Anmeldung. Es fehlte
--    aber die zweite Verteidigungslinie: Wer künftig eine Funktion ohne
--    diese Prüfzeile ergänzt, hätte sie sofort offen im Netz.
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Toten Storage-Block entfernen
-- ---------------------------------------------------------------------
create or replace function public.admin_ort_loeschen(p_place_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  -- Die Bilddateien hat die aufrufende Server-Route bereits entfernt.
  -- Hier NICHT mehr versuchen: Supabase verbietet direkte Löschungen in
  -- storage.objects, und der frühere Versuch scheiterte still.
  update public.reports set resolved_at = now()
    where target_type = 'place' and target_id = p_place_id and resolved_at is null;

  -- Check-ins, Fotodatensätze und Beobachtungen hängen per Fremdschlüssel
  -- am Ort und gehen mit ihm.
  delete from public.places where id = p_place_id;
end;
$$;

create or replace function public.admin_foto_loeschen(p_photo_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.ist_admin() then raise exception 'KEIN_ADMIN'; end if;

  -- s.o.: Die Datei entfernt die Server-Route, hier nur der Datensatz.
  update public.reports set resolved_at = now()
    where target_type = 'photo' and target_id = p_photo_id and resolved_at is null;

  delete from public.place_photos where id = p_photo_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Ausführungsrechte: Positivliste statt Gießkanne
-- ---------------------------------------------------------------------
do $$
declare
  f record;
  -- Diese Funktionen MÜSSEN anonym aufrufbar bleiben: Lesen ist laut
  -- CLAUDE.md immer ohne Konto möglich, und die Kartenansicht sowie die
  -- Sicht v_place_observables greifen darauf zu.
  erlaubt text[] := array[
    'places_nearby',
    'place_is_active_now',
    'place_location',
    'place_checkins_this_week',
    'observable_confidence',
    'confidence_bucket',
    'is_holiday_de_by'
  ];
begin
  for f in
    select p.oid::regprocedure as signatur,
           p.proname,
           p.prorettype = 'trigger'::regtype as ist_trigger
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    if f.proname = any(erlaubt) then
      -- Ausdrücklich erlauben statt auf das Standardrecht zu bauen.
      execute format('grant execute on function %s to anon, authenticated', f.signatur);
    else
      -- Angemeldete zuerst ausdrücklich berechtigen, sonst nimmt ihnen der
      -- folgende Entzug von PUBLIC das Recht mit weg - Admins koennten
      -- dann ihre eigenen Funktionen nicht mehr aufrufen.
      -- Trigger-Funktionen brauchen das nicht: Sie laufen mit den Rechten
      -- der Tabelle, nicht des Aufrufers.
      if not f.ist_trigger then
        execute format('grant execute on function %s to authenticated', f.signatur);
      end if;
      execute format('revoke execute on function %s from public', f.signatur);
      execute format('revoke execute on function %s from anon', f.signatur);
    end if;
  end loop;
end $$;

-- Und für alles, was künftig dazukommt: kein Ausführungsrecht ohne
-- ausdrückliche Vergabe. Die bestehenden Migrationen erteilen ihre Rechte
-- ohnehin schon einzeln am Ende.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

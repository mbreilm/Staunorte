-- =====================================================================
-- 0016_fotos_beim_erfassen.sql
--
-- Hintergrund: Eine Baustelle darf jetzt auch aus der Ferne eingetragen
-- werden - die Koordinaten kommen dann aus dem GPS des hochgeladenen
-- Fotos (siehe app/neu/page.tsx). Der automatische Check-in beim Anlegen
-- nutzt seit derselben Änderung die ECHTE Geräteposition und scheitert
-- daher zu Recht, wenn man nicht vor Ort ist (do_checkin(), 200-m-Regel
-- bleibt unangetastet - Check-in weiterhin nur in der Nähe).
--
-- Folge: Die bisherige Insert-Policy auf place_photos ("nur nach einem
-- Check-in in den letzten 24 h") hätte genau die Fotos blockiert, die der
-- Auslöser für den neuen Ort waren. Sie bekommt deshalb einen zweiten,
-- eng begrenzten Weg: der Ersteller eines Orts darf innerhalb von 24 h
-- nach dem Anlegen Fotos dazu hochladen, auch ohne Check-in.
--
-- Bewusst NICHT unbefristet: sonst könnte man beliebig lange Fotos zu
-- eigenen Orten nachschieben, ohne je dort gewesen zu sein.
-- =====================================================================

set search_path = public, extensions;

drop policy if exists p_ins on public.place_photos;
create policy p_ins on public.place_photos for insert
  with check (
    uploaded_by = auth.uid()
    and (
      -- a) wie bisher: Check-in in den letzten 24 h am selben Ort
      exists (
        select 1 from public.checkins c
        where c.place_id = place_photos.place_id
          and c.user_id = auth.uid()
          and c.created_at > now() - interval '24 hours'
      )
      -- b) neu: eigener, gerade angelegter Ort (Erfassen aus der Ferne)
      or exists (
        select 1 from public.places p
        where p.id = place_photos.place_id
          and p.created_by = auth.uid()
          and p.created_at > now() - interval '24 hours'
      )
    )
  );

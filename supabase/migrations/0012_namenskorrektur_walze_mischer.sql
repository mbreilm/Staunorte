-- =====================================================================
-- 0012_namenskorrektur_walze_mischer.sql  ·  name_de/kid_name vertauscht
--
-- name_de erscheint im Check-in, in der Detailseite und im Filter -
-- dort sollte immer der Begriff stehen, den Eltern am ehesten kennen
-- (CLAUDE.md: Nutzer sind Eltern, nicht Kinder). Bei zwei Einträgen war
-- das Verhältnis umgekehrt: kid_name war der geläufigere/technischere
-- Begriff, name_de der unüblichere.
--
-- - walze: name_de "Walze" -> "Straßenwalze" (die längere, genauere
--   Bezeichnung), kid_name "Straßenwalze" -> "Walze" (die kürzere).
-- - fahrmischer: name_de "Fahrmischer" -> "Betonmischer" (das im Alltag
--   geläufigere Wort), kid_name "Betonmischer" -> "Fahrmischer".
-- =====================================================================

update public.observable_types
set name_de = 'Straßenwalze', kid_name = 'Walze'
where id = 'walze';

update public.observable_types
set name_de = 'Betonmischer', kid_name = 'Fahrmischer'
where id = 'fahrmischer';

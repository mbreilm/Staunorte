-- =====================================================================
-- 0011_observable_images_daten.sql  ·  Fotos den Fahrzeugtypen zuordnen
--
-- Setzt Pfad und Bildnachweis fuer die 29 Katalogfotos. Die Dateien liegen
-- im Bucket 'observable-photos' (siehe 0010_observable_images.sql) als WebP
-- mit 640 px laengster Kante.
--
-- Alle Fotos stammen von Wikimedia Commons unter freien Lizenzen. image_credit
-- MUSS dort angezeigt werden, wo das Bild erscheint - CC-BY/CC-BY-SA verlangen
-- die Nennung von Urheber und Lizenz. Quellenliste mit Links:
-- assets/observable-photos/CREDITS.md
-- =====================================================================

update public.observable_types as t set
  image_path   = v.pfad,
  image_credit = v.nachweis
from (values
  ('abbruchbagger', 'abbruchbagger.webp', 'Foto: Gareth James · CC BY-SA 2.0 · Wikimedia Commons'),
  ('bauaufzug', 'bauaufzug.webp', 'Foto: Niklitov · CC BY-SA 4.0 · Wikimedia Commons'),
  ('baucontainer', 'baucontainer.webp', 'Foto: Bidgee · CC BY-SA 2.5 au · Wikimedia Commons'),
  ('betonpumpe', 'betonpumpe.webp', 'Foto: High Contrast · CC BY 3.0 de · Wikimedia Commons'),
  ('bohrgeraet', 'bohrgeraet.webp', 'Foto: Störfix · CC BY-SA 3.0 · Wikimedia Commons'),
  ('dumper', 'dumper.webp', 'Foto: Michael Rivera · CC BY-SA 4.0 · Wikimedia Commons'),
  ('fahrmischer', 'fahrmischer.webp', 'Foto: Rab,Driver of P300NJB @Grampian Continental.. · CC BY 2.0 · Wikimedia Commons'),
  ('gabelstapler', 'gabelstapler.webp', 'Foto: Ossewa · CC BY 4.0 · Wikimedia Commons'),
  ('geruest', 'geruest.webp', 'Foto: VSchagow · CC BY-SA 4.0 · Wikimedia Commons'),
  ('hebebuehne', 'hebebuehne.webp', 'Foto: Dwight Burdette · CC BY 3.0 · Wikimedia Commons'),
  ('kanalspuelwagen', 'kanalspuelwagen.webp', 'Foto: 5snake5 · CC0 · Wikimedia Commons'),
  ('kehrmaschine', 'kehrmaschine.webp', 'Foto: Nemo bis · CC BY-SA 4.0 · Wikimedia Commons'),
  ('kettenbagger', 'kettenbagger.webp', 'Foto: WernerHerdecke~commonswiki · CC BY-SA 3.0 · Wikimedia Commons'),
  ('kipplaster', 'kipplaster.webp', 'Foto: High Contrast · CC BY 3.0 de · Wikimedia Commons'),
  ('minibagger', 'minibagger.webp', 'Foto: Ildar Sagdejev ( Specious ) · CC BY-SA 4.0 · Wikimedia Commons'),
  ('mobilbagger', 'mobilbagger.webp', 'Foto: U.S. Air Force photo by Tech. Sgt. Sergio Gamboa · Public domain · Wikimedia Commons'),
  ('mobilkran', 'mobilkran.webp', 'Foto: Bärbel Miemietz · CC BY-SA 4.0 · Wikimedia Commons'),
  ('planierraupe', 'planierraupe.webp', 'Foto: Mark Ahsmann · CC BY-SA 3.0 · Wikimedia Commons'),
  ('radlader', 'radlader.webp', 'Foto: Lothar Spurzem · CC BY-SA 2.0 de · Wikimedia Commons'),
  ('rammgeraet', 'rammgeraet.webp', 'Foto: AlfvanBeem · CC0 · Wikimedia Commons'),
  ('ruettelplatte', 'ruettelplatte.webp', 'Foto: Mj-bird · CC BY-SA 3.0 · Wikimedia Commons'),
  ('saugbagger', 'saugbagger.webp', 'Foto: Matti Blume · CC BY-SA 4.0 · Wikimedia Commons'),
  ('silo', 'silo.webp', 'Foto: Donald Trung Quoc Don (Chữ Hán: 徵國單) · CC BY-SA 4.0 · Wikimedia Commons'),
  ('strassenfertiger', 'strassenfertiger.webp', 'Foto: Famartin · CC BY-SA 4.0 · Wikimedia Commons'),
  ('strassenfraese', 'strassenfraese.webp', 'Foto: Famartin · CC BY-SA 4.0 · Wikimedia Commons'),
  ('teleskoplader', 'teleskoplader.webp', 'Foto: Thomas Bresson · CC BY 3.0 · Wikimedia Commons'),
  ('tieflader', 'tieflader.webp', 'Foto: Goldhofer Aktiengesellschaft · CC BY-SA 4.0 · Wikimedia Commons'),
  ('turmdrehkran', 'turmdrehkran.webp', 'Foto: Gafirita jean d''amour Uwimana · CC BY-SA 4.0 · Wikimedia Commons'),
  ('walze', 'walze.webp', 'Foto: Prefeitura de Itapevi from Itapevi, Brasil · CC BY 2.0 · Wikimedia Commons')
) as v(id, pfad, nachweis)
where t.id = v.id;

-- Kontrolle: sollte 0 Zeilen liefern
select id from public.observable_types
  where category_id = 'baustelle' and is_active and image_path is null;

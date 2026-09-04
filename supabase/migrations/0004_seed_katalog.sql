-- =====================================================================
-- 0004_seed_katalog.sql  ·  Stammdaten
--   * Kategorie "baustelle" (v1: die einzige)
--   * Fahrzeugkatalog (29 Typen) inkl. Halbwertszeiten und Kindertexten
--   * Feiertage Bayern 2026/2027
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Kategorie
-- ---------------------------------------------------------------------
insert into public.place_categories
  (id, name_singular, name_plural, observable_label, hours_label,
   lifecycle, safety_notice, attribute_schema, marker_style)
values (
  'baustelle', 'Baustelle', 'Baustellen', 'Fahrzeuge', 'Arbeitszeiten',
  'endlich',
  'Bitte die Baustelle niemals betreten. Nur von außerhalb der Absperrung zuschauen und Kinder an der Hand halten.',
  '{"phase": {"type":"enum","label":"Bauphase","values":["aushub","rohbau","tiefbau","strassenbau","abbruch","ausbau","unbekannt"]}}'::jsonb,
  '{"color":"#F2A20C","icon":"🚧"}'::jsonb
)
on conflict (id) do update
  set safety_notice    = excluded.safety_notice,
      attribute_schema = excluded.attribute_schema,
      marker_style     = excluded.marker_style;

-- ---------------------------------------------------------------------
-- Fahrzeugkatalog
-- class          -> Halbwertszeit (PRD 7.2)
--   standgeraet        30 Tage
--   stationaer_mobil   10 Tage
--   mobil               5 Tage
--   transient           1.5 Tage
-- ---------------------------------------------------------------------
insert into public.observable_types
  (id, category_id, name_de, kid_name, group_name, class, half_life_days,
   rarity, sort_order, icon, kid_description)
values
-- --- Standgeräte (30 Tage) -------------------------------------------
 ('turmdrehkran','baustelle','Turmdrehkran','Riesenkran','Kräne','standgeraet',30,'haeufig',10,'🏗️',
  'Der Turmdrehkran ist so hoch wie ein Haus. Oben sitzt eine Person in einer kleinen Kabine und hebt schwere Sachen von einer Seite zur anderen.'),
 ('bauaufzug','baustelle','Bauaufzug','Baustellen-Aufzug','Kräne','standgeraet',30,'selten',20,'🛗',
  'Der Bauaufzug fährt außen am Haus hoch und bringt Werkzeug und Material nach oben.'),
 ('baucontainer','baustelle','Baucontainer','Bauarbeiter-Häuschen','Ausstattung','standgeraet',30,'haeufig',30,'🏚️',
  'Im Baucontainer machen die Bauarbeiter Pause und ziehen sich um.'),
 ('silo','baustelle','Silo','Zement-Turm','Ausstattung','standgeraet',30,'haeufig',40,'🗼',
  'Im Silo wird Zementpulver aufbewahrt. Daraus wird später Beton gemischt.'),
 ('geruest','baustelle','Gerüst','Kletter-Gerüst','Ausstattung','standgeraet',30,'haeufig',50,'🧱',
  'Auf dem Gerüst können die Bauarbeiter außen am Haus stehen und arbeiten.'),

-- --- Stationär-mobil (10 Tage) ---------------------------------------
 ('kettenbagger','baustelle','Kettenbagger','Großer Bagger','Bagger','stationaer_mobil',10,'haeufig',60,'🚜',
  'Der Kettenbagger fährt auf Ketten wie ein Panzer. Damit rutscht er auch im Matsch nicht weg.'),
 ('abbruchbagger','baustelle','Abbruchbagger','Haus-Knacker','Bagger','stationaer_mobil',10,'legendaer',70,'🦖',
  'Der Abbruchbagger hat einen sehr langen Arm und knabbert damit alte Häuser ab.'),
 ('bohrgeraet','baustelle','Bohrgerät','Riesenbohrer','Spezial','stationaer_mobil',10,'legendaer',80,'🌀',
  'Das Bohrgerät bohrt tiefe Löcher in den Boden — manchmal tiefer, als ein Haus hoch ist.'),
 ('rammgeraet','baustelle','Rammgerät','Der Hämmerer','Spezial','stationaer_mobil',10,'legendaer',90,'🔨',
  'Das Rammgerät haut dicke Pfähle in den Boden. Das macht ordentlich Krach!'),
 ('mobilkran','baustelle','Mobilkran','Kran auf Rädern','Kräne','stationaer_mobil',10,'selten',100,'🏗️',
  'Der Mobilkran fährt auf Rädern zur Baustelle und stellt dort seine Stützen aus, damit er nicht umkippt.'),

-- --- Mobil (5 Tage) --------------------------------------------------
 ('mobilbagger','baustelle','Mobilbagger','Bagger auf Rädern','Bagger','mobil',5,'haeufig',110,'🚜',
  'Der Mobilbagger fährt auf Gummireifen und kann sogar auf der Straße fahren.'),
 ('minibagger','baustelle','Minibagger','Baby-Bagger','Bagger','mobil',5,'haeufig',120,'🚜',
  'Der Minibagger ist der kleinste Bagger. Er passt sogar in einen Garten.'),
 ('radlader','baustelle','Radlader','Schaufel-Lader','Lader','mobil',5,'haeufig',130,'🚛',
  'Der Radlader hat vorne eine große Schaufel und schiebt damit Erde und Steine zusammen.'),
 ('planierraupe','baustelle','Planierraupe','Schiebe-Raupe','Lader','mobil',5,'selten',140,'🚜',
  'Die Planierraupe schiebt mit einem breiten Schild den Boden ganz glatt.'),
 ('teleskoplader','baustelle','Teleskoplader','Ausfahr-Lader','Lader','mobil',5,'haeufig',150,'🚛',
  'Der Teleskoplader kann seinen Arm ganz weit ausfahren und Sachen nach oben heben.'),
 ('walze','baustelle','Walze','Straßenwalze','Straßenbau','mobil',5,'haeufig',160,'🛞',
  'Die Walze ist vorne ganz rund und schwer. Damit drückt sie die neue Straße fest.'),
 ('strassenfertiger','baustelle','Straßenfertiger','Asphalt-Maschine','Straßenbau','mobil',5,'selten',170,'🛣️',
  'Der Straßenfertiger legt den heißen Asphalt wie einen Teppich auf die Straße.'),
 ('strassenfraese','baustelle','Straßenfräse','Straßen-Raspel','Straßenbau','mobil',5,'selten',180,'⚙️',
  'Die Straßenfräse raspelt die alte Straße ab, damit eine neue drauf kann.'),
 ('dumper','baustelle','Dumper','Kipp-Kumpel','Transport','mobil',5,'selten',190,'🚚',
  'Der Dumper fährt Erde über die Baustelle und kippt sie hinten oder vorne ab.'),
 ('gabelstapler','baustelle','Gabelstapler','Stapler','Lader','mobil',5,'haeufig',200,'🏭',
  'Der Gabelstapler schiebt zwei Gabeln unter schwere Paletten und hebt sie hoch.'),
 ('hebebuehne','baustelle','Hebebühne','Hoch-Korb','Ausstattung','mobil',5,'haeufig',210,'🪜',
  'In der Hebebühne steht ein Bauarbeiter in einem Korb und fährt damit ganz nach oben.'),
 ('ruettelplatte','baustelle','Rüttelplatte','Zitter-Platte','Straßenbau','mobil',5,'haeufig',220,'📳',
  'Die Rüttelplatte zittert ganz schnell und macht den Boden dadurch fest.'),

-- --- Transient (1,5 Tage) --------------------------------------------
 ('fahrmischer','baustelle','Fahrmischer','Betonmischer','Beton','transient',1.5,'haeufig',230,'🛻',
  'Der Fahrmischer hat hinten eine große Trommel, die sich immer dreht — damit der Beton nicht hart wird.'),
 ('betonpumpe','baustelle','Betonpumpe','Beton-Rüssel','Beton','transient',1.5,'selten',240,'🐘',
  'Die Betonpumpe hat einen langen Arm wie ein Elefantenrüssel und spritzt damit Beton nach oben.'),
 ('kipplaster','baustelle','Kipplaster','Kipper','Transport','transient',1.5,'haeufig',250,'🚚',
  'Der Kipplaster bringt Sand und Schotter und kippt die Ladung hinten aus.'),
 ('tieflader','baustelle','Tieflader','Bagger-Taxi','Transport','transient',1.5,'selten',260,'🚛',
  'Der Tieflader ist ein extra flacher Lastwagen. Er bringt große Bagger zur Baustelle.'),
 ('kehrmaschine','baustelle','Kehrmaschine','Straßenfeger','Straßenbau','transient',1.5,'haeufig',270,'🧹',
  'Die Kehrmaschine hat runde Bürsten unten dran und fegt damit die Straße sauber.'),
 ('saugbagger','baustelle','Saugbagger','Riesen-Staubsauger','Spezial','transient',1.5,'legendaer',280,'🌪️',
  'Der Saugbagger saugt Erde mit einem dicken Schlauch aus dem Boden — wie ein riesiger Staubsauger.'),
 ('kanalspuelwagen','baustelle','Kanalspülwagen','Kanal-Wäscher','Spezial','transient',1.5,'legendaer',290,'💦',
  'Der Kanalspülwagen spritzt mit starkem Wasser die Rohre unter der Straße sauber.')
on conflict (id) do update
  set name_de         = excluded.name_de,
      kid_name        = excluded.kid_name,
      group_name      = excluded.group_name,
      class           = excluded.class,
      half_life_days  = excluded.half_life_days,
      rarity          = excluded.rarity,
      sort_order      = excluded.sort_order,
      icon            = excluded.icon,
      kid_description = excluded.kid_description;

-- ---------------------------------------------------------------------
-- Feiertage Bayern (überwiegend katholische Gemeinden -> inkl. Mariä Himmelfahrt)
-- Jährlich ergänzen! Ostern 2026 = 05.04., Ostern 2027 = 28.03.
-- ---------------------------------------------------------------------
insert into public.holidays (day, name) values
 ('2026-01-01','Neujahr'),
 ('2026-01-06','Heilige Drei Könige'),
 ('2026-04-03','Karfreitag'),
 ('2026-04-06','Ostermontag'),
 ('2026-05-01','Tag der Arbeit'),
 ('2026-05-14','Christi Himmelfahrt'),
 ('2026-05-25','Pfingstmontag'),
 ('2026-06-04','Fronleichnam'),
 ('2026-08-15','Mariä Himmelfahrt'),
 ('2026-10-03','Tag der Deutschen Einheit'),
 ('2026-11-01','Allerheiligen'),
 ('2026-12-25','1. Weihnachtstag'),
 ('2026-12-26','2. Weihnachtstag'),
 ('2027-01-01','Neujahr'),
 ('2027-01-06','Heilige Drei Könige'),
 ('2027-03-26','Karfreitag'),
 ('2027-03-29','Ostermontag'),
 ('2027-05-01','Tag der Arbeit'),
 ('2027-05-06','Christi Himmelfahrt'),
 ('2027-05-17','Pfingstmontag'),
 ('2027-05-27','Fronleichnam'),
 ('2027-08-15','Mariä Himmelfahrt'),
 ('2027-10-03','Tag der Deutschen Einheit'),
 ('2027-11-01','Allerheiligen'),
 ('2027-12-25','1. Weihnachtstag'),
 ('2027-12-26','2. Weihnachtstag')
on conflict (day) do nothing;

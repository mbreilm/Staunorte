-- =====================================================================
-- 0013_v_place_observables_foto.sql  ·  Fotofelder in v_place_observables
--
-- Die Detailseite soll beim Antippen eines Fahrzeugs (T5-Folge-Ticket:
-- Detail-Card mit echtem Foto statt nur Gruppen-Icon, das für mehrere
-- Ausprägungen einer Gruppe identisch ist) denselben Dialog zeigen wie
-- das Sammelalbum. image_path/image_credit/kid_description fehlten in
-- der View bisher; CREATE OR REPLACE VIEW darf neue Spalten anhängen,
-- ohne bestehende Aufrufer zu brechen.
-- =====================================================================

create or replace view public.v_place_observables
with (security_invoker = true) as
select
  po.place_id,
  po.observable_type_id,
  ot.name_de,
  ot.kid_name,
  ot.group_name,
  ot.class,
  ot.rarity,
  ot.icon,
  ot.is_permanent,
  po.first_seen_at,
  po.last_seen_at,
  po.positive_count,
  po.distinct_reporters,
  public.observable_confidence(po.last_seen_at, ot.half_life_days,
        ot.is_permanent, po.negative_count, po.distinct_reporters) as confidence,
  public.confidence_bucket(
    public.observable_confidence(po.last_seen_at, ot.half_life_days,
        ot.is_permanent, po.negative_count, po.distinct_reporters)) as bucket,
  ot.image_path,
  ot.image_credit,
  ot.kid_description
from public.place_observables po
join public.observable_types ot on ot.id = po.observable_type_id
join public.places p            on p.id  = po.place_id
where p.is_hidden = false;

// Katalogfotos der Fahrzeugtypen (Bucket aus 0010_observable_images.sql).
// Die Gruppen-Icons sagen nur, WAS FÜR EIN Gerät es ist; das Foto zeigt, wie
// es tatsächlich aussieht - nötig, weil kaum jemand einen Straßenfertiger von
// einer Straßenfräse unterscheiden kann.
import { createClient } from "@/lib/supabase/client";

const BILD_BUCKET = "observable-photos";

/**
 * Öffentliche URL des Fahrzeugfotos oder null, wenn für diesen Typ noch keins
 * hinterlegt ist. Solange `image_path` leer ist (oder die Spalte noch fehlt,
 * weil die Migration nicht eingespielt wurde), zeigt die App weiter das
 * Gruppen-Icon - deshalb hier bewusst ein weicher Zugriff statt einer Annahme.
 */
export function fahrzeugBildUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  return createClient().storage.from(BILD_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

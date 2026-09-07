"use client";

import { useState } from "react";
import type { PlaceObservableView } from "@/lib/supabase/types";
import { CheckinFlow } from "./CheckinFlow";

type Props = {
  placeId: string;
  categoryId: string;
  erstelltVon: string | null;
  bereitsGemeldet: PlaceObservableView[];
};

/**
 * "Ich bin hier"-Button auf der Detailseite (T6) - öffnet den Check-in-
 * Flow (T9) als Vollbild-Overlay, ohne die Seite zu verlassen.
 */
export function CheckinButton({
  placeId,
  categoryId,
  erstelltVon,
  bereitsGemeldet,
}: Props) {
  const [offen, setOffen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        // Kein .btn-block: dessen margin-top ist für frei stehende, volle
        // Breite gedacht und würde den Button hier gegenüber dem
        // RouteButton daneben nach unten verschieben (beide stehen in
        // derselben Zeile, mt-5 am äußeren Wrapper reicht als Abstand).
        className="btn btn-primary w-full h-[54px] text-base"
      >
        Ich bin hier 👋
      </button>
      {offen && (
        <CheckinFlow
          placeId={placeId}
          categoryId={categoryId}
          erstelltVon={erstelltVon}
          bereitsGemeldet={bereitsGemeldet}
          onClose={() => setOffen(false)}
        />
      )}
    </>
  );
}

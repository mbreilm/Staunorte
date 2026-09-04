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
        className="btn btn-primary btn-block h-12 text-base"
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

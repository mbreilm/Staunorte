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
        className="mt-6 h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white transition-colors hover:bg-orange-600"
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

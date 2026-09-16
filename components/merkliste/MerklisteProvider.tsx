"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

type MerklisteWert = {
  /** Kennungen aller gemerkten Orte. */
  gemerkt: ReadonlySet<string>;
  /** Erst wenn das stimmt, ist `gemerkt` aussagekraeftig. */
  geladen: boolean;
  istGemerkt: (placeId: string) => boolean;
  /** Schaltet um und liefert den neuen Zustand. */
  umschalten: (placeId: string) => Promise<boolean>;
};

const MerklisteContext = createContext<MerklisteWert | null>(null);

/**
 * Eine einzige Quelle für "was steht auf meiner Merkliste".
 *
 * Ohne das hielte jede Stelle ihre eigene Kopie: der Knopf auf der
 * Detailseite, der im Vorschau-Sheet, die Listenseite und die Marker auf
 * der Karte. Nimmt man einen Ort in der Liste herunter, wüsste die Karte
 * nichts davon und zeigte weiter den Stern - bis zum nächsten Neuladen.
 *
 * Deshalb liegt der Zustand hier oben, und alle vier lesen daraus.
 */
const LEER: ReadonlySet<string> = new Set();

export function MerklisteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Die Kennung des Kontos steckt IM Zustand. Dadurch laesst sich ohne
  // zusaetzlichen Effekt erkennen, ob die geladene Liste ueberhaupt zur
  // angemeldeten Person gehoert - nach einem Kontowechsel kann so nie die
  // Liste des Vorgaengers durchblitzen.
  const [zustand, setZustand] = useState<{
    uid: string | null;
    ids: ReadonlySet<string>;
  }>({ uid: null, ids: LEER });

  const passend = zustand.uid === (user?.id ?? null);
  const gemerkt = passend ? zustand.ids : LEER;
  // Ohne Konto gibt es nichts zu laden, also ist sofort alles bekannt.
  const geladen = user ? passend : true;

  useEffect(() => {
    if (!user) return;
    let verworfen = false;
    // Nur die Kennungen, nicht die ganzen Orte - das bleibt auch bei
    // hundert gemerkten Baustellen eine kleine Antwort.
    createClient()
      .from("place_bookmarks")
      .select("place_id")
      .then(({ data }) => {
        if (verworfen || !data) return;
        setZustand({ uid: user.id, ids: new Set(data.map((z) => z.place_id)) });
      });
    return () => {
      verworfen = true;
    };
  }, [user]);

  const setzeMerk = useCallback((placeId: string, drin: boolean) => {
    setZustand((alt) => {
      const ids = new Set(alt.ids);
      if (drin) ids.add(placeId);
      else ids.delete(placeId);
      return { ...alt, ids };
    });
  }, []);

  const umschalten = useCallback(
    async (placeId: string) => {
      const vorher = gemerkt.has(placeId);

      // Sofort umschalten, damit Knopf und Marker nicht auf die Datenbank
      // warten. Scheitert der Aufruf, wird zurückgedreht.
      setzeMerk(placeId, !vorher);

      const { data, error } = await createClient().rpc("merkliste_umschalten", {
        p_place_id: placeId,
      });

      if (error) {
        console.error("Merkliste umschalten fehlgeschlagen:", error.message);
        setzeMerk(placeId, vorher);
        return vorher;
      }

      if (typeof data === "boolean" && data !== !vorher) {
        // Datenbank sieht es anders als erwartet - ihr Wort zählt.
        setzeMerk(placeId, data);
        return data;
      }
      return !vorher;
    },
    [gemerkt, setzeMerk],
  );

  const wert = useMemo<MerklisteWert>(
    () => ({
      gemerkt,
      geladen,
      istGemerkt: (placeId: string) => gemerkt.has(placeId),
      umschalten,
    }),
    [gemerkt, geladen, umschalten],
  );

  return (
    <MerklisteContext.Provider value={wert}>{children}</MerklisteContext.Provider>
  );
}

export function useMerkliste() {
  const ctx = useContext(MerklisteContext);
  if (!ctx) {
    throw new Error("useMerkliste() muss innerhalb von <MerklisteProvider> aufgerufen werden");
  }
  return ctx;
}

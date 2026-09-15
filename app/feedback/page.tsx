"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ZurueckPfeil } from "@/components/icons/ZurueckPfeil";

/**
 * Rückmeldungen aus der App. Drei Felder, alle freiwillig - wer nur einen
 * Satz loswerden will, soll nicht drei Kästen ausfüllen müssen.
 *
 * Nur für angemeldete Nutzer: Jede Rückmeldung hängt damit an einem Konto,
 * der Betreiber kann direkt antworten, und das Formular taugt nicht als
 * Spam-Schleuder.
 */
export default function FeedbackSeite() {
  const { user, isLoading, requireAuth } = useAuth();
  const router = useRouter();
  const [gefaellt, setGefaellt] = useState("");
  const [stoert, setStoert] = useState("");
  const [fehlt, setFehlt] = useState("");
  const [status, setStatus] = useState<"idle" | "sendet" | "fertig" | "fehler">("idle");
  const [fehlertext, setFehlertext] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      requireAuth("Um uns zu schreiben, brauchst du ein Konto.", () =>
        router.replace("/konto"),
      );
    }
  }, [isLoading, user, requireAuth, router]);

  const etwasGeschrieben = Boolean(
    gefaellt.trim() || stoert.trim() || fehlt.trim(),
  );

  async function absenden(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!etwasGeschrieben) return;
    setStatus("sendet");

    try {
      const antwort = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gefaellt, stoert, fehlt }),
      });

      if (antwort.ok) {
        setStatus("fertig");
        return;
      }

      const { fehler } = (await antwort.json().catch(() => ({}))) as {
        fehler?: string;
      };
      setFehlertext(
        fehler === "zu_viele"
          ? "Du hast uns gerade schon einiges geschickt - magst du es in einer Stunde nochmal versuchen?"
          : "Das hat leider nicht geklappt. Magst du es nochmal versuchen?",
      );
      setStatus("fehler");
    } catch {
      setFehlertext("Das hat leider nicht geklappt. Magst du es nochmal versuchen?");
      setStatus("fehler");
    }
  }

  if (status === "fertig") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-6 pb-28">
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-accent-100)",
            color: "var(--color-accent-800)",
          }}
        >
          <p className="text-lg font-semibold">Danke dir!</p>
          <p className="mt-1 text-sm">
            Deine Rückmeldung ist angekommen. Wir lesen jede einzelne - und
            melden uns, wenn wir eine Frage dazu haben.
          </p>
        </div>
        <Link href="/" className="btn btn-primary h-12 text-base">
          Zurück zur Karte
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/konto" aria-label="Zurück zum Profil" className="btn btn-icon elev-sm">
          <ZurueckPfeil />
        </Link>
        <h1 className="text-2xl">Deine Meinung</h1>
      </div>

      <p className="text-sm text-muted">
        Was auch immer dir auffällt - schreib so viel oder so wenig du magst.
        Alle drei Felder sind freiwillig.
      </p>

      <form onSubmit={absenden} className="flex flex-col gap-4">
        <Feld
          id="gefaellt"
          label="Was gefällt dir?"
          platzhalter="Womit kommst du gut zurecht?"
          wert={gefaellt}
          setzen={setGefaellt}
        />
        <Feld
          id="stoert"
          label="Was stört dich?"
          platzhalter="Was war umständlich oder verwirrend?"
          wert={stoert}
          setzen={setStoert}
        />
        <Feld
          id="fehlt"
          label="Was fehlt dir?"
          platzhalter="Was würdest du dir wünschen?"
          wert={fehlt}
          setzen={setFehlt}
        />

        {status === "fehler" && (
          <p role="alert" className="text-sm" style={{ color: "var(--color-accent-700)" }}>
            {fehlertext}
          </p>
        )}

        <button
          type="submit"
          disabled={!etwasGeschrieben || status === "sendet"}
          className="btn btn-primary h-12 text-base"
        >
          {status === "sendet" ? "Wird geschickt …" : "Abschicken"}
        </button>
      </form>
    </main>
  );
}

function Feld({
  id,
  label,
  platzhalter,
  wert,
  setzen,
}: {
  id: string;
  label: string;
  platzhalter: string;
  wert: string;
  setzen: (wert: string) => void;
}) {
  return (
    <div className="field flex flex-col gap-2">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={3}
        maxLength={2000}
        placeholder={platzhalter}
        value={wert}
        onChange={(e) => setzen(e.target.value)}
        className="input"
      />
    </div>
  );
}

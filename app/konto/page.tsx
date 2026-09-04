"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthForm } from "@/components/AuthForm";

function RechtlichesLinks() {
  return (
    <div className="flex justify-center gap-4 text-xs text-muted">
      <Link href="/impressum" className="hover:underline">
        Impressum
      </Link>
      <Link href="/datenschutz" className="hover:underline">
        Datenschutz
      </Link>
      <Link href="/nutzungsbedingungen" className="hover:underline">
        Nutzungsbedingungen
      </Link>
    </div>
  );
}

function KontoContent() {
  const { user, isLoading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const hatFehler = searchParams.get("error") === "anmeldung_fehlgeschlagen";

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted">Wird geladen …</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pb-28">
        <h1 className="text-2xl">Dein Konto</h1>
        <div className="card">
          <p className="text-sm text-muted">Angemeldet als</p>
          <p className="mt-1 font-medium">{user.email}</p>
        </div>
        <button type="button" onClick={() => signOut()} className="btn btn-secondary h-12 text-base">
          Abmelden
        </button>
        <Link href="/" className="btn btn-ghost mx-auto text-sm">
          Zurück zur Karte
        </Link>
        <RechtlichesLinks />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pb-28">
      <div>
        <h1 className="text-2xl">Anmelden</h1>
        <p className="mt-1 text-sm text-muted">
          Zum Ansehen brauchst du kein Konto. Erst wenn du einen Ort erfassen
          oder einchecken willst, fragen wir danach.
        </p>
      </div>

      {hatFehler && (
        <p role="alert" className="text-sm" style={{ color: "var(--color-accent-700)" }}>
          Die Anmeldung hat nicht geklappt. Bitte versuch es noch mal.
        </p>
      )}

      <AuthForm />

      <Link href="/" className="btn btn-ghost mx-auto text-sm">
        Zurück zur Karte
      </Link>
      <RechtlichesLinks />
    </main>
  );
}

export default function KontoPage() {
  return (
    <Suspense fallback={null}>
      <KontoContent />
    </Suspense>
  );
}

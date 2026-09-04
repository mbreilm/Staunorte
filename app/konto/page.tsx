"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthForm } from "@/components/AuthForm";

function KontoContent() {
  const { user, isLoading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const hatFehler = searchParams.get("error") === "anmeldung_fehlgeschlagen";

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-zinc-500">Wird geladen …</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold text-zinc-900">Dein Konto</h1>
        <div className="rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Angemeldet als</p>
          <p className="mt-1 font-medium text-zinc-900">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="h-12 rounded-xl border border-zinc-300 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
        >
          Abmelden
        </button>
        <Link href="/" className="text-center text-sm text-zinc-500">
          Zurück zur Karte
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Anmelden</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Zum Ansehen brauchst du kein Konto. Erst wenn du einen Ort erfassen
          oder einchecken willst, fragen wir danach.
        </p>
      </div>

      {hatFehler && (
        <p role="alert" className="text-sm text-red-600">
          Die Anmeldung hat nicht geklappt. Bitte versuch es noch mal.
        </p>
      )}

      <AuthForm />

      <Link href="/" className="text-center text-sm text-zinc-500">
        Zurück zur Karte
      </Link>
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

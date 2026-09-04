"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Wohin nach erfolgreicher Anmeldung zurückgesprungen wird. */
  redirectPath?: string;
};

export function AuthForm({ redirectPath = "/" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  function callbackUrl() {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", redirectPath);
    return url.toString();
  }

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(
        "Der Link konnte nicht verschickt werden. Prüf die E-Mail-Adresse und versuch's noch mal.",
      );
      return;
    }
    setStatus("sent");
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });

    if (error) {
      setGoogleLoading(false);
      setStatus("error");
      setErrorMessage(
        "Die Anmeldung mit Google hat nicht geklappt. Versuch's noch mal.",
      );
    }
    // Bei Erfolg leitet der Browser sofort zu Google weiter.
  }

  if (status === "sent") {
    return (
      <div
        className="rounded-2xl p-4 text-sm"
        style={{ background: "var(--color-accent-100)", color: "var(--color-accent-800)" }}
      >
        <p className="font-semibold">Fast geschafft!</p>
        <p className="mt-1">
          Wir haben dir einen Anmelde-Link an <strong>{email}</strong>{" "}
          geschickt. Öffne dein E-Mail-Postfach und tipp auf den Link.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleMagicLink} className="field flex flex-col gap-2">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="du@beispiel.de"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input h-12"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn btn-primary h-12 text-base"
        >
          {status === "sending"
            ? "Link wird verschickt …"
            : "Anmelde-Link zuschicken"}
        </button>
      </form>

      {status === "error" && (
        <p role="alert" className="text-sm" style={{ color: "var(--color-accent-700)" }}>
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1" style={{ background: "var(--color-divider)" }} />
        oder
        <span className="h-px flex-1" style={{ background: "var(--color-divider)" }} />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="btn btn-secondary h-12 text-base"
      >
        <GoogleIcon />
        Mit Google anmelden
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
        c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4
        C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20
        C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
        l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
        c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
        c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24
        C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

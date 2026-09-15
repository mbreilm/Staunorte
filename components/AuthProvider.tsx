"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AuthGateSheet } from "./AuthGateSheet";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  /**
   * Prüft, ob ein Konto vorhanden ist. Wenn nicht, öffnet sie das
   * Anmelde-Bottom-Sheet mit einer Begründung und liefert false zurück -
   * der Aufrufer bricht die Aktion dann einfach ab.
   *
   * `beiAbbruch` wird gerufen, wenn das Sheet ohne Anmeldung geschlossen
   * wird ("Vielleicht später"). Nötig für Seiten, die ohne Konto gar
   * keinen Sinn ergeben: Auf /neu blieb man sonst im Erfassen-Ablauf
   * stehen, durfte Fotos auswählen und lief erst ganz am Ende auf.
   */
  requireAuth: (reason: string, beiAbbruch?: () => void) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gateReason, setGateReason] = useState<string | null>(null);
  // In einer Ref, nicht im State: Das Sheet soll sich beim Setzen nicht
  // neu aufbauen, und die Funktion wird nur beim Schließen gebraucht.
  const beiAbbruchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        // Anmeldung war erfolgreich - Gate-Sheet schließt sich von selbst.
        // Anmeldung geglückt: Sheet schließen, aber NICHT die
        // Ausweichaktion auslösen - die gilt nur fürs Abbrechen.
        if (session?.user) {
          beiAbbruchRef.current = null;
          setGateReason(null);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const requireAuth = useCallback(
    (reason: string, beiAbbruch?: () => void) => {
      if (user) return true;
      beiAbbruchRef.current = beiAbbruch ?? null;
      setGateReason(reason);
      return false;
    },
    [user],
  );

  // Geschlossen ohne Anmeldung: die hinterlegte Ausweichaktion ausführen.
  const gateSchliessen = useCallback(() => {
    setGateReason(null);
    const abbruch = beiAbbruchRef.current;
    beiAbbruchRef.current = null;
    abbruch?.();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, signOut, requireAuth }),
    [user, isLoading, signOut, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthGateSheet reason={gateReason} onClose={gateSchliessen} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() muss innerhalb von <AuthProvider> aufgerufen werden");
  }
  return ctx;
}

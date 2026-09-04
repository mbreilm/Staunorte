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
   */
  requireAuth: (reason: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gateReason, setGateReason] = useState<string | null>(null);

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
        if (session?.user) setGateReason(null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const requireAuth = useCallback(
    (reason: string) => {
      if (user) return true;
      setGateReason(reason);
      return false;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, signOut, requireAuth }),
    [user, isLoading, signOut, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthGateSheet reason={gateReason} onClose={() => setGateReason(null)} />
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

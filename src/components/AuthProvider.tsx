"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  isConfigured: boolean;
  displayName: string;
  setDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  authError: null,
  isConfigured: false,
  displayName: "",
  setDisplayName: () => {},
});

const DISPLAY_NAME_KEY = "theldr_display_name";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState("");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setSupabase(createClient());
    const stored = localStorage.getItem(DISPLAY_NAME_KEY);
    if (stored) setDisplayNameState(stored);
  }, [isConfigured]);

  useEffect(() => {
    if (!supabase) return;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            setAuthError(
              error.message.includes("Anonymous sign-ins are disabled")
                ? "Anonymous sign-ins are disabled in Supabase. Enable them under Authentication → Providers."
                : `Could not sign in: ${error.message}`
            );
          } else if (data.user) {
            setUser(data.user);
          }
        }
      } catch {
        setAuthError(
          "Could not reach Supabase. Check your URL and anon key in .env.local, then restart the dev server."
        );
      } finally {
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const setDisplayName = (name: string) => {
    setDisplayNameState(name);
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isConfigured && (loading || !supabase),
        authError,
        isConfigured,
        displayName,
        setDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

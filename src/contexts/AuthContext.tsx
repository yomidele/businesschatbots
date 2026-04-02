import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { logSecurityEvent } from "@/lib/security-logger";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── LOGIN ATTEMPT TRACKING ──
const LOGIN_ATTEMPTS_KEY = "auth_login_attempts";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getLoginAttempts(): { count: number; lockedUntil: number } {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function recordLoginAttempt(success: boolean): boolean {
  const attempts = getLoginAttempts();

  if (success) {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    return true;
  }

  attempts.count++;
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  return attempts.count < MAX_LOGIN_ATTEMPTS;
}

function isLoginLocked(): { locked: boolean; remainingMs: number } {
  const attempts = getLoginAttempts();
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    return { locked: true, remainingMs: attempts.lockedUntil - Date.now() };
  }
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  }
  return { locked: false, remainingMs: 0 };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const lockStatus = isLoginLocked();
    if (lockStatus.locked) {
      const mins = Math.ceil(lockStatus.remainingMs / 60_000);
      logSecurityEvent("login_failure", { email, reason: "account_locked" });
      return { error: new Error(`Too many failed attempts. Please try again in ${mins} minutes.`) };
    }

    logSecurityEvent("login_attempt", { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      recordLoginAttempt(false);
      logSecurityEvent("login_failure", { email });
    } else {
      recordLoginAttempt(true);
      logSecurityEvent("login_success", { email });
    }

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

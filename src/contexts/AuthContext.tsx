import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  user_type: "client" | "partner" | "architect" | "admin";
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  siren: string | null;
  phone: string | null;
  country: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isPasswordRecovery: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("[Auth] Failed to fetch user profile:", error.message, error.code, error.details);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    } catch (err) {
      console.error("[Auth] Unexpected error fetching profile:", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Detect password recovery from URL hash BEFORE any auth effects run
  // This must be synchronous to win the race against getSession
  const [detectedRecovery] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || hash.includes("type=magiclink")) {
        return true;
      }
    }
    return false;
  });

  // 1) Bootstrap: get initial session + fetch profile, THEN mark loading done
  useEffect(() => {
    let mounted = true;

    // If this is a password recovery, skip the bootstrap entirely
    // and let the onAuthStateChange handle it
    if (detectedRecovery) {
      setIsPasswordRecovery(true);
      setIsLoading(false);
      return () => { mounted = false; };
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("Failed to get session:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [detectedRecovery]);

  // 2) Listen for auth changes (sign-in, sign-out, token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
          // Set session so updateUser works, but DON'T set user (prevents redirect)
          setSession(session);
          return;
        }
        if (_event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
        } else {
          fetchProfile(session.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isLoading, isPasswordRecovery, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

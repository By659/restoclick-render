import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Ctx = { user: User | null; loading: boolean; roles: string[]; signOut: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, loading: true, roles: [], signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") qc.clear();
    });
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false); });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  useEffect(() => {
    if (!user) { setRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => setRoles((data ?? []).map((r) => r.role)));
  }, [user]);

  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); };
  return <AuthCtx.Provider value={{ user, loading, roles, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { setAccessToken, subscribeToAuthFailure } from "./token";
import { AuthContext, type AuthUser } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToAuthFailure(() => {
      setAccessToken(null);
      queryClient.clear();
      setUser(null);
    });
  }, [queryClient]);

  function signIn(token: string, loggedInUser: AuthUser) {
    setAccessToken(token);

    // Prevent cached data from another session
    // from being reused.
    queryClient.clear();

    setUser(loggedInUser);
  }

  function signOut() {
    setAccessToken(null);

    // Clear data associated with the previous session.
    queryClient.clear();

    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

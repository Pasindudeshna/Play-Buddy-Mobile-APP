import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

type AuthState = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      // Force a refresh so a claim granted by scripts/set-admin-claim.js
      // right before this login is picked up immediately, not just after
      // the token's normal ~1h refresh cycle.
      const tokenResult = await user.getIdTokenResult(true);
      setState({ user, isAdmin: tokenResult.claims.admin === true, loading: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

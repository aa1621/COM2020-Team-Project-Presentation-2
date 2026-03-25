import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthState,
  clearAuthUser,
  setAuthUser,
  setAuthState,
  subscribeAuthUser,
  type AuthState,
  type AuthUser,
} from "./authSession";

type AuthContextValue = {
  authState: AuthState | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuthState: (state: AuthState) => void;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthStateValue] = useState<AuthState | null>(null);

  useEffect(() => {
    setAuthStateValue(getAuthState());

    return subscribeAuthUser(() => {
      setAuthStateValue(getAuthState());
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authState,
      user: authState?.user ?? null,
      isAuthenticated: Boolean(authState?.user && authState?.session?.access_token),
      setAuthState,
      setUser: setAuthUser,
      clearUser: clearAuthUser,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

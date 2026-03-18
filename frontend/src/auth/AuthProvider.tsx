import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearDemoUser,
  getDemoUser,
  setDemoUser,
  subscribeDemoUser,
  type DemoUser,
} from "./demoAuth";

type AuthContextValue = {
  user: DemoUser | null;
  isAuthenticated: boolean;
  setUser: (user: DemoUser) => void;
  clearUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<DemoUser | null>(null);

  useEffect(() => {
    setUserState(getDemoUser());

    return subscribeDemoUser(() => {
      setUserState(getDemoUser());
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      setUser: setDemoUser,
      clearUser: clearDemoUser,
    }),
    [user]
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

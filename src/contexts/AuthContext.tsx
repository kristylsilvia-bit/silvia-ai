import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, onAuthStateChanged, type User } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshUser: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const refreshUser = useCallback(() => {
    if (!auth) return;
    setState((prev) => ({ ...prev, user: auth!.currentUser }));
  }, []);

  useEffect(() => {
    if (!auth) {
      setState({ user: null, loading: false });
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
  }, []);

  const value = useMemo(() => ({ ...state, refreshUser }), [state, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

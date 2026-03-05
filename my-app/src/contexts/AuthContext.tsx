'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, LoginRequest, SignupRequest, ApiError } from "../types/auth";
import * as api from "../lib/api";

// ============================================================
// AUTH CONTEXT
// ============================================================
// Provides authentication state and actions to the entire app.
//
// Usage in any component:
//   const { user, login, signup, logout, isLoading, error } = useAuth();
//
// The context automatically:
//   • Stores the JWT token in localStorage
//   • Restores the session on page reload (calls GET /auth/me)
//   • Redirects to "/" after login/signup (configurable)
// ============================================================

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  /** Field-level errors from the API (e.g. { email: "already taken" }) */
  fieldErrors: Record<string, string>;
  login: (data: LoginRequest) => Promise<boolean>;
  signup: (data: SignupRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Clear any displayed error messages */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Restore session on mount ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    setIsLoading(true);
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        // Token expired or invalid — clear it silently
        localStorage.removeItem("auth_token");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login ─────────────────────────────────────────────────
  const login = useCallback(async (data: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await api.login(data);
      localStorage.setItem("auth_token", res.token);
      setUser(res.user);
      return true; // success — page can redirect
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Login failed. Please try again.");
      if (apiErr.errors) setFieldErrors(apiErr.errors);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Signup ────────────────────────────────────────────────
  const signup = useCallback(async (data: SignupRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await api.signup(data);
      localStorage.setItem("auth_token", res.token);
      setUser(res.user);
      return true;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Signup failed. Please try again.");
      if (apiErr.errors) setFieldErrors(apiErr.errors);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const logoutHandler = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // ── Clear error ───────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        fieldErrors,
        login,
        signup,
        logout: logoutHandler,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access auth state and actions from any component */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

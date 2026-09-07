import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ss_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  // On first load, verify any stored token against the backend so a stale
  // or expired session doesn't silently show as logged in.
  useEffect(() => {
    const token = localStorage.getItem("ss_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => {
        const freshUser = res.data.user ?? res.data;
        setUser(freshUser);
        localStorage.setItem("ss_user", JSON.stringify(freshUser));
      })
      .catch(() => {
        localStorage.removeItem("ss_token");
        localStorage.removeItem("ss_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Call this after a successful email/password OR Google login with the
  // JWT and user object your backend returns.
  const login = useCallback((token, userData) => {
    localStorage.setItem("ss_token", token);
    localStorage.setItem("ss_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

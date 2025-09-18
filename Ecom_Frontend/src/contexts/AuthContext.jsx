import React, { createContext, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authTokens, setAuthTokensInternal] = useState(() => {
    try {
      const raw = localStorage.getItem("tokens");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      if (!authTokens) return null;
      const payload = jwtDecode(authTokens.access);
      // minimal user from token payload; will be enriched from /auth/me/
      return { id: payload.user_id || payload.id, username: payload.username || null };
    } catch {
      return null;
    }
  });

  // Save tokens helper - internal only
  const persistTokens = (tokens) => {
    setAuthTokensInternal(tokens);
    try {
      if (tokens) localStorage.setItem("tokens", JSON.stringify(tokens));
      else localStorage.removeItem("tokens");
    } catch {
      // ignore storage errors
    }
  };

  // Attempt refresh (call refresh endpoint). Returns new tokens or throws.
  const refreshTokens = async () => {
    const tokens = authTokens;
    if (!tokens?.refresh) throw new Error("No refresh token available");
    try {
      const res = await axiosClient.post("/auth/token/refresh/", { refresh: tokens.refresh });
      const newTokens = { ...tokens, ...res.data }; // merge (res.data typically has access)
      persistTokens(newTokens);
      return newTokens;
    } catch (err) {
      // If refresh fails, ensure logged out
      persistTokens(null);
      setUser(null);
      throw err;
    }
  };

  // Fetch profile (tries once; if 401 attempts refresh and retries once)
  const fetchProfile = async (attemptRefresh = true) => {
    if (!authTokens?.access) {
      setUser(null);
      return null;
    }

    try {
      const res = await axiosClient.get("/auth/me/", {
        headers: { Authorization: `Bearer ${authTokens.access}` },
      });
      setUser(res.data);
      return res.data;
    } catch (err) {
      const status = err?.response?.status;
      if ((status === 401 || status === 403) && attemptRefresh) {
        // try refresh then retry once
        try {
          const newTokens = await refreshTokens();
          const res2 = await axiosClient.get("/auth/me/", {
            headers: { Authorization: `Bearer ${newTokens.access}` },
          });
          setUser(res2.data);
          return res2.data;
        } catch (e) {
          // refresh failed -> user logged out already by refreshTokens
          setUser(null);
          return null;
        }
      }
      // other errors
      setUser(null);
      return null;
    }
  };

  // on mount / when tokens change: decode quickly and try to fetch profile
  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      if (!authTokens) {
        if (mounted) {
          setUser(null);
          try { localStorage.removeItem("tokens"); } catch {}
        }
        return;
      }

      // quick decode for instant UI
      try {
        const payload = jwt_decode(authTokens.access);
        if (mounted) setUser((prev) => ({ ...(prev || {}), id: payload.user_id || payload.id, username: payload.username || null }));
      } catch {
        // invalid token - clear
        persistTokens(null);
        if (mounted) setUser(null);
        return;
      }

      // try fetch profile to enrich
      if (mounted) await fetchProfile(true);
    };

    sync();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTokens]);

  // login: obtain tokens then fetch profile
  const login = async (username, password) => {
    try {
      const res = await axiosClient.post("/auth/token/", { username, password });
      if (!res?.data?.access) throw new Error("No access token returned");
      persistTokens(res.data);
      await fetchProfile(true);
      return res.data;
    } catch (err) {
      // normalize common DRF shapes
      const data = err?.response?.data;
      let msg = err?.message || "Login failed";
      if (data) {
        if (data.detail) msg = data.detail;
        else if (typeof data === "object") {
          const parts = [];
          Object.keys(data).forEach((k) => {
            const v = data[k];
            parts.push(`${k}: ${Array.isArray(v) ? v.join(" ") : v}`);
          });
          msg = parts.join(" | ");
        }
      }
      throw new Error(msg);
    }
  };

  // register: returns server response or throws Error with readable message
  const register = async (username, email, password) => {
    try {
      const res = await axiosClient.post("/auth/register/", {
        username,
        email,
        password,
        password2: password,
      });
      return res.data;
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        const parts = [];
        Object.keys(data).forEach((k) => {
          const v = data[k];
          parts.push(`${k}: ${Array.isArray(v) ? v.join(" ") : v}`);
        });
        throw new Error(parts.join(" | "));
      }
      throw new Error("Registration failed");
    }
  };

  const logout = () => {
    persistTokens(null);
    setUser(null);
  };

  // lightweight helper to get auth header
  const authHeader = () => (authTokens?.access ? { Authorization: `Bearer ${authTokens.access}` } : {});

  // do NOT expose setAuthTokensInternal directly
  return (
    <AuthContext.Provider
      value={{
        user,
        authTokens,
        login,
        register,
        logout,
        refreshTokens,
        authHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

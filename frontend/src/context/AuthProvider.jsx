import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import { getToken, onUnauthorized, setToken } from "../api/client";
import * as api from "../api/endpoints";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !getToken());

  useEffect(() => {
    onUnauthorized(() => setUser(null));
    if (!getToken()) return undefined;

    let cancelled = false;
    api
      .getMe()
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch((err) => {
        // A rejected session is cleared. A network error keeps the token so a refresh can retry.
        if (err.status === 401 || err.status === 403) setToken(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const next = await api.login(email, password);
    setUser(next);
    return next;
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    const next = await api.adminLogin(email, password);
    setUser(next);
    return next;
  }, []);

  const register = useCallback(async (fields) => {
    const next = await api.register(fields);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* even if the server call fails, this device is logged out */
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const res = await api.updateMe(fields);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      adminLogin,
      register,
      logout,
      updateProfile,
    }),
    [user, ready, login, adminLogin, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

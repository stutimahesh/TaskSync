import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenStore.get);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session from a saved token.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  // Any 401 from the API (e.g. an expired token) signs the user out.
  useEffect(() => {
    window.addEventListener("tasksync:unauthorized", logout);
    return () => window.removeEventListener("tasksync:unauthorized", logout);
  }, [logout]);

  const handleAuth = useCallback((data) => {
    tokenStore.set(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login: (email, password) => api.login({ email, password }).then(handleAuth),
      signup: (name, email, password) => api.signup({ name, email, password }).then(handleAuth),
      logout,
    }),
    [user, token, loading, handleAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

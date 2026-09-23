import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('payflow_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (t) => {
    const activeToken = t || token;
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: freshUser } = await api.me(activeToken);
      setUser(freshUser);
    } catch {
      // Token is invalid or expired
      localStorage.removeItem('payflow_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(newToken, newUser) {
    localStorage.setItem('payflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('payflow_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

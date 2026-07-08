import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_CHANGE_EVENT, clearAuthSession, getAuthSession } from '../api';
import { AuthContext } from './auth-state';

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => getAuthSession());

  const refreshAuth = useCallback(() => {
    setSession(getAuthSession());
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
  }, []);

  useEffect(() => {
    window.addEventListener('storage', refreshAuth);
    window.addEventListener(AUTH_CHANGE_EVENT, refreshAuth);

    return () => {
      window.removeEventListener('storage', refreshAuth);
      window.removeEventListener(AUTH_CHANGE_EVENT, refreshAuth);
    };
  }, [refreshAuth]);

  const value = useMemo(() => ({
    token: session.token,
    user: session.user,
    isAuthenticated: Boolean(session.token),
    refreshAuth,
    logout
  }), [session, refreshAuth, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

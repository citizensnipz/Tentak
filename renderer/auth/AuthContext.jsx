import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const isAuthenticated = !!currentUser;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.tentak?.profile?.get) {
      setSessionChecked(true);
      return;
    }
    window.tentak.profile
      .get()
      .then((res) => {
        if (res?.ok && res.data) setCurrentUser(res.data);
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  const logout = async () => {
    try {
      if (typeof window !== 'undefined' && window.tentak?.auth?.logout) {
        await window.tentak.auth.logout();
      }
    } catch {
      // ignore logout errors
    } finally {
      setCurrentUser(null);
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    sessionChecked,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}


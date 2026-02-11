import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  const isAuthenticated = !!currentUser;

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


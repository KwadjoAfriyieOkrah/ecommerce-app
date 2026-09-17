// ============================================================================
// AuthContext.jsx: shared authentication state for the storefront
// ============================================================================
// PURPOSE:
//   - Stores the logged-in user state and JWT token in one place for the full app.
//   - This makes login, logout, and route protection consistent across pages.
//
// WHY THIS APPROACH:
//   - React Context is the standard way to share global auth state without passing
//     props through every route or component.
//   - It keeps the app easier to maintain and allows protected screens to check the
//     current session in one place.
//
// DEPENDENCIES:
//   - React: createContext, useContext, useMemo, useState, useEffect
// ============================================================================

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

function safeReadUser() {
  const savedUser = localStorage.getItem('user');

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// FUNCTION: AuthProvider({ children })
// ────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   - Reads the existing token from localStorage and exposes login/logout helpers to
//     the app.
//   - It centralizes the auth state so any page can ask whether a user is logged in.
//
// PARAMETERS:
//   - children (ReactNode) — the tree that should receive the auth state
//
// RETURNS:
//   - A provider with the authenticated user, token, and auth helpers
//
// WHY THIS APPROACH:
//   - We keep the token in localStorage so the browser remembers the user between
//     refreshes, while the React state keeps the current session in memory.
//   - This is a typical frontend pattern for JWT-based apps.
// ────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => safeReadUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (email, password) => {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const nextUser = { email };
    setToken(data.token);
    setUser(nextUser);

    return nextUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      loading,
      login,
      logout,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}

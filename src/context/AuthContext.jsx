import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrganization(data.organization);
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch (err) {
      console.error('Auth verification failed', err);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to log in');
    }

    setUser(data.user);
    setOrganization(data.organization);
    addToast(`Welcome back, ${data.user.email}!`, 'success');
    return data;
  };

  const signup = async (email, password, confirmPassword, organizationName) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword, organizationName })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign up');
    }

    setUser(data.user);
    setOrganization(data.organization);
    addToast(`Account created for ${data.organization.name}!`, 'success');
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
      setOrganization(null);
      addToast('Signed out successfully', 'info');
    }
  };

  const updateOrgState = (updatedOrg) => {
    setOrganization((prev) => ({ ...prev, ...updatedOrg }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        signup,
        logout,
        checkAuth,
        updateOrgState,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

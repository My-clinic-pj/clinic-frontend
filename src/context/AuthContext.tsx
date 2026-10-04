import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { DEFAULT_CLINIC_NAME, clearLegacySettingsCache } from '../lib/defaults';

interface AuthContextType {
  token: string | null;
  username: string | null;
  userId: string | null;
  globalClinicName: string;
  setGlobalClinicName: (name: string) => void;
  login: (token: string, username: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [globalClinicName, setGlobalClinicName] = useState(DEFAULT_CLINIC_NAME);

  // Purge stale clinic info cached by older builds on first load
  useEffect(() => {
    clearLegacySettingsCache();
  }, []);

  useEffect(() => {
    // Reset immediately so a previous account's clinic name never lingers
    setGlobalClinicName(DEFAULT_CLINIC_NAME);
    if (!token) return;

    let cancelled = false;
    const fetchClinicName = async () => {
      try {
        const { data } = await api.get('/settings');
        if (cancelled) return;
        setGlobalClinicName(
          data?.success && data.data?.clinicName ? data.data.clinicName : DEFAULT_CLINIC_NAME
        );
      } catch (error) {
        console.error("Failed to fetch settings in auth context", error);
      }
    };
    fetchClinicName();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = (newToken: string, newUsername: string, newUserId: string) => {
    clearLegacySettingsCache();
    setGlobalClinicName(DEFAULT_CLINIC_NAME);
    setToken(newToken);
    setUsername(newUsername);
    setUserId(newUserId);
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('userId', newUserId);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setUserId(null);
    setGlobalClinicName(DEFAULT_CLINIC_NAME);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    clearLegacySettingsCache();
  };

  return (
    <AuthContext.Provider value={{ token, username, userId, globalClinicName, setGlobalClinicName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

//update

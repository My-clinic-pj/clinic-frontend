import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface AuthContextType {
  token: string | null;
  username: string | null;
  clinicId: string | null;
  globalClinicName: string;
  setGlobalClinicName: (name: string) => void;
  login: (token: string, username: string, clinicId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [clinicId, setClinicId] = useState<string | null>(localStorage.getItem('clinicId'));
  const [globalClinicName, setGlobalClinicName] = useState('My Clinic');

  useEffect(() => {
    if (token) {
      const fetchClinicName = async () => {
        try {
          const { data } = await api.get('/settings');
          if (data.success && data.data) {
            setGlobalClinicName(data.data.clinicName || 'My Clinic');
          }
        } catch (error) {
          console.error("Failed to fetch settings in auth context", error);
        }
      };
      fetchClinicName();
    }
  }, [token]);

  const login = (newToken: string, newUsername: string, newClinicId: string) => {
    setToken(newToken);
    setUsername(newUsername);
    setClinicId(newClinicId);
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('clinicId', newClinicId);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setClinicId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('clinicId');
  };

  return (
    <AuthContext.Provider value={{ token, username, clinicId, globalClinicName, setGlobalClinicName, login, logout }}>
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

import axios, { type AxiosInstance } from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { useRef, useEffect } from 'react';

/**
 * Base Axios instance pointing at the backend API.
 * Does NOT include auth headers — use the `useAxios` hook for authenticated requests.
 */
const api = axios.create({
  baseURL: 'http://localhost:4030/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Custom hook that returns a STABLE Axios instance with the Clerk Bearer token
 * automatically attached to every outgoing request via interceptors.
 *
 * Uses a ref to hold getToken so the Axios instance never changes identity,
 * which prevents infinite re-render loops in consuming hooks.
 */
export function useAxios(): AxiosInstance {
  const { getToken } = useAuth();

  // Store getToken in a ref so the interceptor always uses the latest version
  // without needing to recreate the Axios instance.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Create the Axios instance exactly once (via useRef, not useMemo)
  const instanceRef = useRef<AxiosInstance | null>(null);

  if (!instanceRef.current) {
    const instance = axios.create({
      baseURL: 'http://localhost:4030/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor — attach Bearer token before every request
    instance.interceptors.request.use(
      async (config) => {
        try {
          const token = await getTokenRef.current();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.error('Failed to retrieve Clerk token:', err);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — centralised error logging
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(
            `API Error ${error.response.status}:`,
            error.response.data
          );
        }
        return Promise.reject(error);
      }
    );

    instanceRef.current = instance;
  }

  return instanceRef.current;
}

export default api;

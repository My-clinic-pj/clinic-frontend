import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Synchronously attach the JWT from localStorage to every outgoing request
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export default api;

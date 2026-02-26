import axios from 'axios';
import { SERVER_URL } from '../config';

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global auth guard for admin pages: redirect to /admin on 401/403
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        if (isAdminRoute) {
          localStorage.removeItem('token');
          localStorage.removeItem('admin_auth');
          window.location.replace('/admin');
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;

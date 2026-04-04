import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'https://devconnect-production-2055.up.railway.app/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message;

    if (status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(message || 'You do not have permission to perform this action.');
    } else if (status === 404) {
      toast.error(message || 'Resource not found.');
    } else if (status === 429) {
      toast.error('You are doing that too much. Please slow down.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again in a moment.');
    } else if (!status) {
      toast.error('Network error. Check your connection.');
    }

    return Promise.reject(err);
  }
);

export default api;
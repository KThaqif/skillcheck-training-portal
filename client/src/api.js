import axios from 'axios';

function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000`;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || getDefaultApiBaseUrl();

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('skillcheck_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('skillcheck_token');
      localStorage.removeItem('skillcheck_user');
    }
    return Promise.reject(error);
  }
);

export default api;

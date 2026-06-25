import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Don't retry refresh endpoint itself — avoids infinite loop
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const newToken = res.data.accessToken;
          setAccessToken(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          setAccessToken(null);
          setRefreshToken(null);
        }
      }
    }
    return Promise.reject(error);
  }
);

import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/server';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Module-level unauthorized handler (set by AuthContext)
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// Attach token & deviceId from AsyncStorage for each request (safe and simple)
api.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (!config.headers) config.headers = {} as any;
      if (token) (config.headers as any).Authorization = `Bearer ${token}`;
      if (deviceId) (config.headers as any)['x-device-id'] = deviceId;
    } catch {
      // ignore
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor: call unauthorized handler on 401
api.interceptors.response.use(
  res => res,
  err => {
    const status = err?.response?.status;
    if (status === 401) {
      // clear token storage and notify auth layer
      AsyncStorage.removeItem('token').catch(() => {});
      AsyncStorage.removeItem('user').catch(() => {});
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  },
);

export default api;

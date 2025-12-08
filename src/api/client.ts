import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/server';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased to 30 seconds for better reliability
});

// Cache token and deviceId to avoid reading AsyncStorage on every request
let cachedToken: string | null = null;
let cachedDeviceId: string | null = null;

export const updateAuthCache = async () => {
  cachedToken = await AsyncStorage.getItem('token');
  cachedDeviceId = await AsyncStorage.getItem('deviceId');
};

export const clearAuthCache = () => {
  cachedToken = null;
  cachedDeviceId = null;
};

// Module-level unauthorized handler (set by AuthContext)
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// Attach token & deviceId from cache for each request (fast)
api.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      // Use cached values, fallback to AsyncStorage if not cached
      const token = cachedToken || (await AsyncStorage.getItem('token'));
      const deviceId =
        cachedDeviceId || (await AsyncStorage.getItem('deviceId'));

      // Update cache if it was null
      if (!cachedToken && token) cachedToken = token;
      if (!cachedDeviceId && deviceId) cachedDeviceId = deviceId;

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
      // clear token storage and cache
      clearAuthCache();
      AsyncStorage.removeItem('token').catch(() => {});
      AsyncStorage.removeItem('user').catch(() => {});
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  },
);

export default api;

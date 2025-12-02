import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '../api/client';

type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // load token and user from storage
    let mounted = true;
    (async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        const u = await AsyncStorage.getItem('user');
        let did = await AsyncStorage.getItem('deviceId');
        if (!did) {
          // simple UUID v4 generator
          const uuidv4 = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
              /[xy]/g,
              c => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              },
            );
          };
          did = uuidv4();
          await AsyncStorage.setItem('deviceId', did);
        }
        if (!mounted) return;
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    // register unauthorized handler to sign out when API returns 401
    setUnauthorizedHandler(() => {
      // clear storage and update state via signOut below
      (async () => {
        await AsyncStorage.removeItem('token').catch(() => {});
        await AsyncStorage.removeItem('user').catch(() => {});
      })();
      setToken(null);
      setUser(null);
    });
    return () => {
      mounted = false;
      setUnauthorizedHandler(() => {});
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (!res || !res.data || !res.data.success) {
        throw new Error(res?.data?.message || 'Login failed');
      }
      const { token: t, user: u } = res.data.data;
      setToken(t);
      setUser(u);
      await AsyncStorage.setItem('token', t);
      await AsyncStorage.setItem('user', JSON.stringify(u));
    } catch (err: any) {
      // Try to extract axios-style error information for clearer messages
      if (err && err.response && err.response.data) {
        const msg =
          err.response.data.message || JSON.stringify(err.response.data);
        throw new Error(`Server: ${msg}`);
      }
      if (err && err.message) throw new Error(err.message);
      throw new Error('Login failed (unknown error)');
    }
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

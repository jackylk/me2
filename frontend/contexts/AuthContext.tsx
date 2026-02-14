'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  isAuthenticated,
  getUserId,
  getUsername,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  LoginCredentials,
  RegisterData,
} from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 初始化认证状态
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      setAuthenticated(isAuth);

      if (isAuth) {
        const uid = getUserId();
        const uname = getUsername();
        setUserId(uid);
        setUsername(uname);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      await authLogin(credentials);
      const uid = getUserId();
      const uname = getUsername();
      setAuthenticated(true);
      setUserId(uid);
      setUsername(uname);

      // Wait a tick for state to propagate before redirecting
      await new Promise(resolve => setTimeout(resolve, 50));
      router.replace('/');
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await authRegister(data);
      const uid = getUserId();
      const uname = getUsername();
      setAuthenticated(true);
      setUserId(uid);
      setUsername(uname);

      // Wait a tick for state to propagate before redirecting
      await new Promise(resolve => setTimeout(resolve, 50));
      router.replace('/');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authLogout();
    setAuthenticated(false);
    setUserId(null);
    setUsername(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        userId,
        username,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

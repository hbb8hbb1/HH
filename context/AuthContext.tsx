import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  upgradeToPro: () => Promise<void>;
  grantFreePro: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('offerMagnet_token');
      const isGuest = localStorage.getItem('offerMagnet_isGuest') === 'true';

      if (isGuest) {
        setUser({
          id: 'guest_temp',
          name: '访客用户',
          email: 'guest@offermagnet.demo',
          isPro: false
        });
        setIsLoading(false);
        return;
      }

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          localStorage.removeItem('offerMagnet_token');
        }
      } catch (error) {
        console.warn("Auth check failed, likely backend is offline.");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登录失败');

      localStorage.removeItem('offerMagnet_isGuest');
      localStorage.setItem('offerMagnet_token', data.token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '注册失败');

      localStorage.removeItem('offerMagnet_isGuest');
      localStorage.setItem('offerMagnet_token', data.token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: 'guest_temp',
      name: '访客用户',
      email: 'guest@offermagnet.demo',
      isPro: false
    };
    setUser(guestUser);
    localStorage.setItem('offerMagnet_isGuest', 'true');
    localStorage.removeItem('offerMagnet_token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('offerMagnet_token');
    localStorage.removeItem('offerMagnet_isGuest');
  };

  const upgradeToPro = async (): Promise<void> => {
    if (user?.id === 'guest_temp') {
      setUser({ ...user, isPro: true });
      return;
    }
    try {
      const token = localStorage.getItem('offerMagnet_token');
      const res = await fetch(`${API_URL}/users/upgrade`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok && user) setUser({ ...user, isPro: true });
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
  };

  const grantFreePro = async () => {
    if (user && !user.isPro) await upgradeToPro();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginAsGuest, logout, upgradeToPro, grantFreePro }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
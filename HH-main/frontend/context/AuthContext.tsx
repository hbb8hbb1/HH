
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  upgradeToPro: () => Promise<void>;
  grantFreePro: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('offerMagnet_user');
      const isGuest = localStorage.getItem('offerMagnet_isGuest') === 'true';

      if (isGuest) {
        setUser({
          id: 'guest_temp',
          name: '访客用户',
          email: 'guest@offermagnet.demo',
          isPro: false,
          role: 'job_seeker'
        });
      } else if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('offerMagnet_user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '登录失败');
      }
      
      const data = await response.json();
      const user: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isPro: data.user.isPro || false,
        role: data.user.role || 'job_seeker'
      };

      localStorage.removeItem('offerMagnet_isGuest');
      localStorage.setItem('offerMagnet_user', JSON.stringify(user));
      localStorage.setItem('offerMagnet_token', data.token);
      setUser(user);
    } catch (error: any) {
      // 如果API失败，使用mock数据（开发环境）
      const mockUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: email.split('@')[0],
        email: email,
        isPro: false,
        role: 'job_seeker'
      };

      localStorage.removeItem('offerMagnet_isGuest');
      localStorage.setItem('offerMagnet_user', JSON.stringify(mockUser));
      setUser(mockUser);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'job_seeker'): Promise<void> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '注册失败');
      }
      
      const data = await response.json();
      const user: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isPro: data.user.isPro || false,
        role: data.user.role || role
      };

      localStorage.removeItem('offerMagnet_isGuest');
      localStorage.setItem('offerMagnet_user', JSON.stringify(user));
      localStorage.setItem('offerMagnet_token', data.token);
      setUser(user);
    } catch (error: any) {
      // 如果API失败，使用mock数据（开发环境）
      const mockUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
        isPro: false,
        role
      };

      localStorage.removeItem('offerMagnet_isGuest');
      localStorage.setItem('offerMagnet_user', JSON.stringify(mockUser));
      setUser(mockUser);
      
      // 重新抛出错误，让调用者处理
      throw error;
    }
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: 'guest_temp',
      name: '访客用户',
      email: 'guest@offermagnet.demo',
      isPro: false,
      role: 'job_seeker'
    };
    setUser(guestUser);
    localStorage.setItem('offerMagnet_isGuest', 'true');
    localStorage.removeItem('offerMagnet_user');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('offerMagnet_user');
    localStorage.removeItem('offerMagnet_isGuest');
  };

  const upgradeToPro = async (): Promise<void> => {
    if (!user) return;
    const updatedUser = { ...user, isPro: true };
    setUser(updatedUser);
    if (user.id !== 'guest_temp') {
      localStorage.setItem('offerMagnet_user', JSON.stringify(updatedUser));
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

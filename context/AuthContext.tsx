import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  upgradeToPro: () => Promise<void>;
  grantFreePro: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('offerMagnet_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock validation
        if (password.length < 6) {
          reject(new Error('密码长度不能少于6位'));
          return;
        }
        // Mock successful login
        // Check if this mock user was saved as pro in a previous session (simplified logic)
        const savedUserStr = localStorage.getItem('offerMagnet_user');
        const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        
        const mockUser: User = {
          id: 'u_' + Date.now(),
          name: email.split('@')[0], // Use part of email as name for mock
          email: email,
          isPro: savedUser?.email === email ? savedUser.isPro : false
        };
        setUser(mockUser);
        localStorage.setItem('offerMagnet_user', JSON.stringify(mockUser));
        resolve();
      }, 800); // Simulate network delay
    });
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!name || !email || !password) {
           reject(new Error('请填写所有必填项'));
           return;
        }
        const mockUser: User = {
          id: 'u_' + Date.now(),
          name: name,
          email: email,
          isPro: false,
        };
        setUser(mockUser);
        localStorage.setItem('offerMagnet_user', JSON.stringify(mockUser));
        resolve();
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('offerMagnet_user');
  };

  const upgradeToPro = async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (user) {
          const updatedUser = { ...user, isPro: true };
          setUser(updatedUser);
          localStorage.setItem('offerMagnet_user', JSON.stringify(updatedUser));
        }
        resolve();
      }, 1500); // Simulate payment processing
    });
  };

  const grantFreePro = () => {
    if (user && !user.isPro) {
      const updatedUser = { ...user, isPro: true };
      setUser(updatedUser);
      localStorage.setItem('offerMagnet_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, upgradeToPro, grantFreePro }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
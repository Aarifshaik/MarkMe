'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, AuthUser } from '@/types/auth';
import { verifyPassword } from '@/utils/auth-utils';
import { findKioskUser, findAdminUser, ADMIN_USER } from '@/config/users';

// Auth Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthUser }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: AuthUser };

// Auth Context Type
interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('auth-user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as AuthUser;
        dispatch({ type: 'RESTORE_SESSION', payload: user });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('auth-user');
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    } else {
      dispatch({ type: 'LOGIN_FAILURE' });
    }
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      // Check if it's an admin user
      const adminUser = findAdminUser(username);
      if (adminUser) {
        const isValidPassword = await verifyPassword(password, adminUser.passwordHash);
        if (isValidPassword) {
          const authUser: AuthUser = {
            username: adminUser.username,
            role: 'admin',
            displayName: 'Administrator',
          };
          
          localStorage.setItem('auth-user', JSON.stringify(authUser));
          dispatch({ type: 'LOGIN_SUCCESS', payload: authUser });
          return { success: true };
        }
      }

      // Check if it's a kiosk user
      const kioskUser = findKioskUser(username);
      if (kioskUser) {
        const isValidPassword = await verifyPassword(password, kioskUser.passwordHash);
        if (isValidPassword) {
          const authUser: AuthUser = {
            username: kioskUser.username,
            role: 'kiosk',
            cluster: kioskUser.cluster,
            displayName: kioskUser.displayName,
          };
          
          localStorage.setItem('auth-user', JSON.stringify(authUser));
          dispatch({ type: 'LOGIN_SUCCESS', payload: authUser });
          return { success: true };
        }
      }

      // If we reach here, authentication failed
      dispatch({ type: 'LOGIN_FAILURE' });
      return { success: false, error: 'Invalid username or password' };
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      return { success: false, error: 'An error occurred during login' };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth-user');
    dispatch({ type: 'LOGOUT' });
    // Navigation will be handled by the component calling logout
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
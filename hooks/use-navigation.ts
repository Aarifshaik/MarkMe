'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useNavigation() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigateToAdmin = () => {
    router.push('/admin');
  };

  const navigateToKiosk = () => {
    router.push('/kiosk');
  };

  const navigateToLogin = () => {
    router.push('/login');
  };

  const navigateToHome = () => {
    router.push('/');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigateToLogin();
    }
  };

  const navigateBasedOnRole = () => {
    if (user?.role === 'admin') {
      navigateToAdmin();
    } else if (user?.role === 'kiosk') {
      navigateToKiosk();
    } else {
      navigateToLogin();
    }
  };

  return {
    navigateToAdmin,
    navigateToKiosk,
    navigateToLogin,
    navigateToHome,
    handleLogout,
    navigateBasedOnRole,
    canAccessAdmin: user?.role === 'admin',
    canAccessKiosk: user?.role === 'admin' || user?.role === 'kiosk',
  };
}
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Redirect authenticated users to their appropriate dashboard
    if (!isLoading && isAuthenticated && user) {
      setIsRedirecting(true);
      if (user.role === 'admin') {
        router.replace('/admin');
      } else if (user.role === 'kiosk') {
        router.replace('/kiosk');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state when authenticated
  if (isRedirecting || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return <LoginForm />;
}
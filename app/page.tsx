'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;
    
    if (!isLoading) {
      hasRedirected.current = true;
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role === 'admin') {
        router.replace('/admin');
      } else if (user?.role === 'kiosk') {
        router.replace('/kiosk');
      } else {
        // Fallback: if authenticated but no valid role, go to login
        router.replace('/login');
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'kiosk')[];
  requiredCluster?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin', 'kiosk'],
  requiredCluster 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 second timeout
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  // Show loading spinner while checking authentication
  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If loading timed out or not authenticated, show login
  if (loadingTimeout || !isAuthenticated || !user) {
    return <LoginForm />;
  }

  // Check if user role is allowed
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check cluster requirement for kiosk users
  if (requiredCluster && user.role === 'kiosk' && user.cluster !== requiredCluster) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            You can only access data for your assigned cluster: {user.cluster}
          </p>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
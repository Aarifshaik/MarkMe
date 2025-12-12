'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/hooks/use-navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Shield, Home } from 'lucide-react';
import BackendSettings from './BackendSettings';

interface NavigationProps {
  currentPage?: 'admin' | 'kiosk' | 'home';
}

export default function Navigation({ currentPage }: NavigationProps) {
  const { user } = useAuth();
  const { 
    navigateToAdmin, 
    navigateToKiosk, 
    navigateToHome, 
    handleLogout,
    canAccessAdmin,
    canAccessKiosk 
  } = useNavigation();

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {currentPage === 'admin' && 'Admin Dashboard'}
          {currentPage === 'kiosk' && `Kiosk Interface - ${user?.cluster}`}
          {!currentPage && 'Employee Family Attendance System'}
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome, {user?.displayName}
        </p>
      </div>
      <div className="flex gap-2">
        {/* Backend Settings - for configuring dynamic URL */}
        <BackendSettings />
        {/* Navigation buttons based on user role and current page */}
        {canAccessAdmin && currentPage !== 'admin' && (
          <Button 
            onClick={navigateToAdmin} 
            variant="outline"
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin View
          </Button>
        )}
        
        {canAccessKiosk && currentPage !== 'kiosk' && (
          <Button 
            onClick={navigateToKiosk} 
            variant="outline"
          >
            <Users className="mr-2 h-4 w-4" />
            Kiosk View
          </Button>
        )}

        {currentPage && (
          <Button 
            onClick={navigateToHome} 
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        )}

        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
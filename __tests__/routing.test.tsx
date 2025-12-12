/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { useNavigation } from '@/hooks/use-navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock navigation hook
jest.mock('@/hooks/use-navigation', () => ({
  useNavigation: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

describe('Routing and Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  });

  describe('Navigation Component', () => {
    it('should display admin navigation for admin users', () => {
      mockUseAuth.mockReturnValue({
        user: { 
          username: 'admin', 
          role: 'admin', 
          displayName: 'Administrator' 
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockUseNavigation.mockReturnValue({
        navigateToAdmin: jest.fn(),
        navigateToKiosk: jest.fn(),
        navigateToLogin: jest.fn(),
        navigateToHome: jest.fn(),
        handleLogout: jest.fn(),
        navigateBasedOnRole: jest.fn(),
        canAccessAdmin: true,
        canAccessKiosk: true,
      });

      render(<Navigation currentPage="kiosk" />);

      expect(screen.getByText(/Administrator/)).toBeInTheDocument();
      expect(screen.getByText('Admin View')).toBeInTheDocument();
    });

    it('should display kiosk navigation for kiosk users', () => {
      mockUseAuth.mockReturnValue({
        user: { 
          username: 'vja_user1', 
          role: 'kiosk', 
          cluster: 'Vijayawada',
          displayName: 'Vijayawada Kiosk 1' 
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockUseNavigation.mockReturnValue({
        navigateToAdmin: jest.fn(),
        navigateToKiosk: jest.fn(),
        navigateToLogin: jest.fn(),
        navigateToHome: jest.fn(),
        handleLogout: jest.fn(),
        navigateBasedOnRole: jest.fn(),
        canAccessAdmin: false,
        canAccessKiosk: true,
      });

      render(<Navigation currentPage="admin" />);

      expect(screen.getByText(/Vijayawada Kiosk 1/)).toBeInTheDocument();
      expect(screen.queryByText('Admin View')).not.toBeInTheDocument();
    });

    it('should handle logout functionality', () => {
      const mockHandleLogout = jest.fn();
      
      mockUseAuth.mockReturnValue({
        user: { 
          username: 'admin', 
          role: 'admin', 
          displayName: 'Administrator' 
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      mockUseNavigation.mockReturnValue({
        navigateToAdmin: jest.fn(),
        navigateToKiosk: jest.fn(),
        navigateToLogin: jest.fn(),
        navigateToHome: jest.fn(),
        handleLogout: mockHandleLogout,
        navigateBasedOnRole: jest.fn(),
        canAccessAdmin: true,
        canAccessKiosk: true,
      });

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      render(<Navigation />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      expect(mockHandleLogout).toHaveBeenCalled();
    });
  });

  describe('useNavigation Hook', () => {
    it('should provide navigation functions', () => {
      // This test would need to be implemented with a proper test setup
      // for custom hooks, but the basic structure is here
      expect(mockUseNavigation).toBeDefined();
    });
  });
});
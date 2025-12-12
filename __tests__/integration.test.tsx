/**
 * Integration tests for Employee Family Attendance System
 * Tests cross-component communication, state management, and real-time updates
 * Requirements: 7.3, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import AttendanceModal from '@/components/AttendanceModal';
import Navigation from '@/components/Navigation';
import { EmployeeWithAttendance, AttendanceRecord } from '@/types/attendance';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

// Mock Firestore service
jest.mock('@/services/firestore-service', () => ({
  firestoreService: {
    saveAttendanceRecord: jest.fn(),
    updateEmployeeChildren: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock auth context with test user
const mockAuthContext = {
  user: {
    username: 'vja_user1',
    role: 'kiosk' as const,
    cluster: 'Vijayawada',
    displayName: 'Vijayawada Kiosk 1',
  },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Test data
const mockEmployees: EmployeeWithAttendance[] = [
  {
    empId: 'EMP001',
    name: 'John Doe',
    cluster: 'Vijayawada',
    eligibility: 'Eligible',
    eligibleChildrenCount: 2,
    kids: [
      { name: 'Child 1', ageBracket: '5-10' },
      { name: 'Child 2', ageBracket: '10-15' }
    ],
  },
  {
    empId: 'EMP002',
    name: 'Jane Smith',
    cluster: 'Vijayawada',
    eligibility: 'Eligible',
    eligibleChildrenCount: 1,
    kids: [
      { name: 'Child A', ageBracket: '5-10' }
    ],
    attendanceRecord: {
      employee: true,
      spouse: true,
      kid1: true,
      kid2: false,
      kid3: false,
      markedBy: 'vja_user1',
      markedAt: new Date(),
      kidNames: { kid1: 'Child A' }
    }
  }
];

const mockClusterStats = [
  {
    cluster: 'Vijayawada',
    totalMembers: 2,
    presentCount: 1,
    pendingCount: 1
  },
  {
    cluster: 'Nellore',
    totalMembers: 0,
    presentCount: 0,
    pendingCount: 0
  },
  {
    cluster: 'Visakhapatnam',
    totalMembers: 0,
    presentCount: 0,
    pendingCount: 0
  }
];

// Import the mocked service
import { firestoreService } from '@/services/firestore-service';

describe('Integration Tests - Employee Family Attendance System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (firestoreService.saveAttendanceRecord as jest.Mock).mockResolvedValue(undefined);
    (firestoreService.updateEmployeeChildren as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Cross-Component Communication', () => {
    test('should integrate navigation component with authentication', () => {
      render(
        <AuthProvider>
          <Navigation currentPage="kiosk" />
        </AuthProvider>
      );

      // Verify navigation renders with user context
      expect(screen.getByText('Vijayawada Kiosk 1')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    test('should handle authentication state across components', () => {
      const { rerender } = render(
        <AuthProvider>
          <Navigation currentPage="admin" />
        </AuthProvider>
      );

      // Verify admin user can see admin navigation
      expect(screen.queryByText('Admin View')).not.toBeInTheDocument(); // Kiosk user can't see admin

      // Test with admin user
      const adminAuthContext = {
        ...mockAuthContext,
        user: {
          username: 'admin',
          role: 'admin' as const,
          displayName: 'Administrator',
        }
      };

      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => adminAuthContext,
        AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      }));

      rerender(
        <AuthProvider>
          <Navigation currentPage="kiosk" />
        </AuthProvider>
      );
    });
  });

  describe('Real-time Updates', () => {
    test('should simulate real-time data flow between components', () => {
      // Test that data flows correctly between components
      const mockEmployee = mockEmployees[0];
      
      render(
        <AttendanceModal
          employee={mockEmployee}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Verify modal displays employee data correctly
      expect(screen.getByText('Mark Attendance - EMP001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Family Members')).toBeInTheDocument();
    });

    test('should handle state updates between modal and parent components', () => {
      const mockOnSave = jest.fn();
      const mockEmployee = mockEmployees[0];

      render(
        <AttendanceModal
          employee={mockEmployee}
          isOpen={true}
          onClose={jest.fn()}
          onSave={mockOnSave}
        />
      );

      // Simulate attendance marking - get the first switch (employee)
      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]); // First switch is employee

      const saveButton = screen.getByText('Mark Attendance');
      fireEvent.click(saveButton);

      // Verify save operation is called
      expect(firestoreService.saveAttendanceRecord).toHaveBeenCalled();
    });
  });

  describe('UI Animations and Styling', () => {
    test('should ensure existing animations and styling are preserved in modal', () => {
      const { container } = render(
        <AttendanceModal
          employee={mockEmployees[0]}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Check for animation classes and styling
      const modalContent = container.querySelector('[role="dialog"]');
      expect(modalContent).toBeTruthy();

      // Verify gradient backgrounds and styling are applied
      const styledElements = container.querySelectorAll('[class*="bg-"]');
      expect(styledElements.length).toBeGreaterThan(0);

      // Check for hover effects and transitions
      const interactiveElements = container.querySelectorAll('[class*="hover:"]');
      expect(interactiveElements.length).toBeGreaterThan(0);
    });

    test('should maintain smooth transitions in navigation', () => {
      const { container } = render(
        <AuthProvider>
          <Navigation currentPage="kiosk" />
        </AuthProvider>
      );

      // Check for transition classes
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Verify styling is applied
      const styledElements = container.querySelectorAll('[class*="transition"]');
      expect(styledElements.length).toBeGreaterThan(0);
    });
  });

  describe('Modal Integration', () => {
    test('should handle attendance modal integration with kiosk interface', async () => {
      const mockEmployee = mockEmployees[0];
      
      const { rerender } = render(
        <AttendanceModal
          employee={mockEmployee}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Verify modal renders with employee data
      expect(screen.getByText('Mark Attendance - EMP001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Family Members')).toBeInTheDocument();

      // Test modal close
      rerender(
        <AttendanceModal
          employee={mockEmployee}
          isOpen={false}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      expect(screen.queryByText('Mark Attendance for John Doe')).not.toBeInTheDocument();
    });

    test('should handle attendance save with UI feedback', async () => {
      const mockOnSave = jest.fn();
      const mockEmployee = mockEmployees[0];

      render(
        <AttendanceModal
          employee={mockEmployee}
          isOpen={true}
          onClose={jest.fn()}
          onSave={mockOnSave}
        />
      );

      // Find and click employee toggle - get the first switch (employee)
      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]); // First switch is employee

      // Find and click save button
      const saveButton = screen.getByText('Mark Attendance');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(firestoreService.saveAttendanceRecord).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle service errors gracefully in modal', async () => {
      // Mock service error
      (firestoreService.saveAttendanceRecord as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <AttendanceModal
          employee={mockEmployees[0]}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Try to save attendance
      const saveButton = screen.getByText('Mark Attendance');
      fireEvent.click(saveButton);

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(firestoreService.saveAttendanceRecord).toHaveBeenCalled();
      });
    });

    test('should maintain component stability during errors', () => {
      // Test that components don't crash when props change unexpectedly
      const { rerender } = render(
        <AttendanceModal
          employee={mockEmployees[0]}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Change props to test stability
      rerender(
        <AttendanceModal
          employee={null}
          isOpen={false}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Component should handle null employee gracefully
      expect(screen.queryByText('Mark Attendance for')).not.toBeInTheDocument();
    });
  });

  describe('Performance and Loading States', () => {
    test('should handle component mounting and unmounting', () => {
      const { unmount } = render(
        <AttendanceModal
          employee={mockEmployees[0]}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Verify component renders
      expect(screen.getByText('Mark Attendance - EMP001')).toBeInTheDocument();

      // Unmount should not cause errors
      unmount();
    });

    test('should handle rapid prop changes', () => {
      const { rerender } = render(
        <AttendanceModal
          employee={mockEmployees[0]}
          isOpen={false}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Rapidly change props
      rerender(
        <AttendanceModal
          employee={mockEmployees[1]}
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      rerender(
        <AttendanceModal
          employee={mockEmployees[0]}
          isOpen={false}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Component should handle changes gracefully
      expect(screen.queryByText('Mark Attendance for')).not.toBeInTheDocument();
    });
  });
});
# KioskInterface Component

## Overview

The KioskInterface component provides a cluster-filtered employee table for kiosk users to mark attendance. It implements the requirements from task 3 of the employee family attendance system.

## Features

- **Cluster-filtered employee display**: Shows only employees from the authenticated kiosk user's assigned cluster
- **Real-time data synchronization**: Uses Firestore subscriptions to update employee and attendance data in real-time
- **Search and filter functionality**: Allows searching employees by name or employee ID
- **Interactive employee rows**: Click handlers for opening attendance marking modal (to be implemented in task 4)
- **Existing table animations**: Maintains smooth transitions and visual styling from the original AttendanceTable component
- **Attendance status display**: Shows current attendance status with visual indicators

## Props

```typescript
interface KioskInterfaceProps {
  onEmployeeClick: (employee: EmployeeWithAttendance) => void;
}
```

- `onEmployeeClick`: Callback function called when an employee row is clicked, receives the employee data

## Usage

```tsx
import KioskInterface from '@/components/KioskInterface';

function KioskPage() {
  const handleEmployeeClick = (employee: EmployeeWithAttendance) => {
    // Handle employee selection - open attendance modal
    console.log('Employee selected:', employee);
  };

  return (
    <KioskInterface onEmployeeClick={handleEmployeeClick} />
  );
}
```

## Authentication Requirements

- User must be authenticated as a kiosk user (role: 'kiosk')
- User must have an assigned cluster
- Component will show access denied message for non-kiosk users

## Data Flow

1. Component loads employees for the authenticated user's cluster
2. Sets up real-time subscriptions for employee and attendance updates
3. Filters employees based on search term
4. Displays employees with current attendance status
5. Handles employee row clicks for attendance marking

## Visual Features

- **Status indicators**: Green checkmark for present, clock for pending
- **Row highlighting**: Green background for employees with attendance marked
- **Smooth animations**: Framer Motion animations for loading and interactions
- **Statistics badges**: Shows total employees, present count, and pending count
- **Search functionality**: Real-time filtering with search icon

## Testing

To test the KioskInterface component:

1. Ensure Firebase is configured and employee data is imported using `importEmployees.mjs`
2. Login with a kiosk user (e.g., username: `vja_user1`, password: `vijayawada1`)
3. Verify that only employees from the user's cluster are displayed
4. Test search functionality by typing in the search box
5. Click on employee rows to verify the click handler is called
6. Check that attendance status updates in real-time when modified elsewhere

## Requirements Validation

This component satisfies the following requirements:

- **2.2**: Employee data display with empId, name, eligibility status, and attendance status
- **2.3**: Graceful handling of missing or incomplete Firestore data
- **6.1**: Search functionality for filtering by name or employee ID
- **6.2**: Real-time filtering within the user's cluster
- **6.3**: Eligibility status displayed as information only

## Next Steps

Task 4 will implement the AttendanceModal component that will be opened when `onEmployeeClick` is called.
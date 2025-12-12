# Firestore Service Layer

This directory contains the Firestore service layer for the Employee Family Attendance system.

## Files

- `firestore-service.ts` - Main Firestore service class with all database operations
- `index.ts` - Export file for easy importing

## FirestoreService Class

The `FirestoreService` class is implemented as a singleton and provides all necessary operations for managing employee and attendance data.

### Key Features

1. **Employee Operations**
   - Fetch all employees or filter by cluster
   - Get individual employee records
   - Update employee children information

2. **Attendance Operations**
   - Save and retrieve attendance records
   - Get employees with their attendance status
   - Support for family member attendance tracking

3. **Real-time Subscriptions**
   - Subscribe to employee updates by cluster or globally
   - Subscribe to attendance updates with real-time notifications
   - Automatic cleanup and error handling

4. **Statistics and Analytics**
   - Calculate cluster-wise attendance statistics
   - Generate overall attendance summaries
   - Support for admin dashboard metrics

5. **Search and Filtering**
   - Search employees by name or employee ID
   - Cluster-based filtering
   - Real-time search capabilities

### Usage

```typescript
import { firestoreService } from '@/services/firestore-service';

// Get employees for a cluster
const employees = await firestoreService.getEmployeesByCluster('Vijayawada');

// Mark attendance
await firestoreService.saveAttendanceRecord('EMP001', {
  employee: true,
  spouse: true,
  kid1: false,
  kid2: false,
  kid3: false,
  markedBy: 'vja_user1'
});

// Subscribe to real-time updates
const unsubscribe = firestoreService.subscribeToClusterEmployees('Vijayawada', (employees) => {
  console.log('Updated employees:', employees);
});
```

## Data Models

### Employee Interface
```typescript
interface Employee {
  empId: string;
  name: string;
  cluster: 'Vijayawada' | 'Nellore' | 'Visakhapatnam';
  eligibility: string;
  eligibleChildrenCount: number;
  kids: Array<{
    name: string;
    ageBracket: string;
  }>;
}
```

### AttendanceRecord Interface
```typescript
interface AttendanceRecord {
  employee: boolean;
  spouse: boolean;
  kid1: boolean;
  kid2: boolean;
  kid3: boolean;
  markedBy: string;
  markedAt: Date;
  kidNames?: {
    kid1?: string;
    kid2?: string;
    kid3?: string;
  };
}
```

## Firestore Collections

### employees Collection
Path: `/employees/{empId}`

Stores employee information including personal details, cluster assignment, and family information.

### attendance Collection
Path: `/attendance/event/records/{empId}`

Stores attendance records for each employee and their family members.

## Error Handling

All methods include proper error handling with:
- Descriptive error messages
- Console logging for debugging
- Graceful degradation for missing data
- Network failure recovery

## Real-time Updates

The service supports real-time updates using Firestore's `onSnapshot` functionality:
- Automatic reconnection on network issues
- Efficient data synchronization
- Memory leak prevention with proper unsubscribe handling

## Cluster-based Access Control

All operations respect cluster-based access control:
- Kiosk users can only access their assigned cluster data
- Admin users can access all cluster data
- Proper filtering at the database level for security
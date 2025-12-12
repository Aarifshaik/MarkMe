# Routing and Navigation System

## Overview

The Employee Family Attendance system implements a comprehensive routing and navigation system using Next.js App Router with role-based access control and protected routes.

## Route Structure

```
/                    - Root route (redirects based on authentication)
├── /login           - Login page for authentication
├── /admin           - Admin dashboard (admin users only)
└── /kiosk           - Kiosk interface (admin and kiosk users)
```

## Authentication Flow

1. **Unauthenticated Users**: Redirected to `/login`
2. **Admin Users**: Can access both `/admin` and `/kiosk` routes
3. **Kiosk Users**: Can only access `/kiosk` route for their assigned cluster

## Components

### 1. Route Pages

#### `/` (Root Page)
- Automatically redirects users based on authentication status
- Unauthenticated → `/login`
- Admin → `/admin`
- Kiosk → `/kiosk`

#### `/login` (Login Page)
- Displays login form for authentication
- Redirects authenticated users to appropriate dashboard
- Handles role-based navigation after successful login

#### `/admin` (Admin Dashboard)
- Protected route for admin users only
- Displays comprehensive attendance statistics for all clusters
- Provides navigation to kiosk view

#### `/kiosk` (Kiosk Interface)
- Protected route for admin and kiosk users
- Shows cluster-specific employee data for kiosk users
- Shows all data for admin users with cluster filtering

### 2. Navigation Components

#### `Navigation` Component
- Provides consistent navigation header across all pages
- Role-based button visibility
- Handles logout functionality
- Shows appropriate page titles and user information

#### `ProtectedRoute` Component
- Wraps pages that require authentication
- Supports role-based access control
- Handles loading states during authentication checks
- Displays appropriate error messages for unauthorized access

### 3. Navigation Hook

#### `useNavigation` Hook
- Centralized navigation logic
- Provides navigation functions for all routes
- Handles role-based navigation
- Manages logout with redirect

```typescript
const {
  navigateToAdmin,
  navigateToKiosk,
  navigateToLogin,
  navigateToHome,
  handleLogout,
  navigateBasedOnRole,
  canAccessAdmin,
  canAccessKiosk
} = useNavigation();
```

## Security Features

### 1. Client-Side Protection
- `ProtectedRoute` component validates authentication
- Role-based access control for sensitive routes
- Automatic redirects for unauthorized access

### 2. Middleware Protection
- Next.js middleware for route-level protection
- Allows public access to login and static assets
- Delegates authentication checks to client-side components

### 3. Session Management
- localStorage-based session persistence
- Automatic session restoration on page reload
- Secure logout with session cleanup

## User Experience Features

### 1. Seamless Navigation
- Role-appropriate navigation buttons
- Contextual page titles and user information
- Smooth transitions between routes

### 2. Loading States
- Loading indicators during authentication checks
- Graceful handling of authentication state changes
- Proper error messaging for access denied scenarios

### 3. Logout Confirmation
- Confirmation dialog before logout
- Automatic redirect to login page
- Session cleanup and state reset

## Implementation Details

### Route Guards
```typescript
// Admin-only route
<ProtectedRoute allowedRoles={['admin']}>
  <AdminContent />
</ProtectedRoute>

// Admin and kiosk route
<ProtectedRoute allowedRoles={['admin', 'kiosk']}>
  <KioskContent />
</ProtectedRoute>
```

### Navigation Logic
```typescript
// Role-based navigation after login
if (user.role === 'admin') {
  router.push('/admin');
} else if (user.role === 'kiosk') {
  router.push('/kiosk');
}
```

### Session Persistence
```typescript
// Store user session
localStorage.setItem('auth-user', JSON.stringify(authUser));

// Restore session on app load
const storedUser = localStorage.getItem('auth-user');
if (storedUser) {
  const user = JSON.parse(storedUser);
  dispatch({ type: 'RESTORE_SESSION', payload: user });
}
```

## Testing

The routing system includes comprehensive tests covering:
- Navigation component rendering for different user roles
- Route protection and access control
- Logout functionality
- Navigation hook behavior

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 1.3**: Authentication succeeds and grants access to cluster-specific interface
- **Requirement 1.4**: Authentication fails and prevents access with error messaging

The routing system provides a secure, user-friendly navigation experience that properly segregates access based on user roles while maintaining smooth transitions and proper session management.
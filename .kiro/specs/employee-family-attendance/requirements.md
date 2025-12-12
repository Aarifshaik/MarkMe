# Requirements Document

## Introduction

This feature transforms the existing student-attendance UI into a comprehensive employee family-attendance marking interface for event management with role-based access control. The system supports one admin user who can view all data across locations, and multiple kiosk users who can only access their assigned geographic cluster. The system auto-loads employee data from Firestore, provides authentication for kiosk users, and enables modal-based attendance marking for employees and their family members with dynamic name entry capabilities.

## Glossary

- **Admin User**: A privileged user who can view real-time attendance data for all geographic locations and clusters
- **Kiosk User**: A location-specific user who can only mark attendance for employees in their assigned cluster
- **Employee**: A staff member with a unique Employee ID (empId) stored in Firestore
- **Family Member**: Attendees including employee, spouse, and up to 3 children (regardless of eligibility status)
- **Attendance Record**: A document stored at `/attendance/event/records/{empId}` containing attendance status for all family members
- **Eligibility Status**: Display-only information showing employee qualification (does not restrict attendance marking)
- **Cluster**: Geographic location/office grouping for employees (Vijayawada, Nellore, Visakhapatnam)
- **Modal Pop-up**: An overlay dialog for marking attendance with toggles and name input fields for family members
- **Real-time Preview**: Live display of "markedBy" and "markedAt" information before confirmation
- **SHA Hash Authentication**: Password verification system using hardcoded SHA hashes for kiosk user login
- **Dynamic Name Entry**: Input fields for entering children names when database records are incomplete
- **Firestore**: Firebase database storing employee data and attendance records
- **UI Refresh Animation**: Visual feedback when table data updates after attendance changes

## Requirements

### Requirement 1

**User Story:** As a kiosk user, I want to authenticate with my username and password to access the attendance marking interface for my assigned cluster, so that only authorized personnel can mark attendance.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL display a login screen requiring username and password
2. WHEN a kiosk user enters credentials THEN the system SHALL hash the password using SHA and compare against hardcoded hash values
3. WHEN authentication succeeds THEN the system SHALL grant access to the cluster-specific attendance interface
4. WHEN authentication fails THEN the system SHALL display an error message and prevent access to the attendance system
5. WHEN a user is authenticated THEN the system SHALL store their identity for "markedBy" tracking in attendance records

### Requirement 2

**User Story:** As a kiosk user, I want the system to automatically load employees from my assigned cluster and display them in the main table, so that I can see only the employees I am responsible for managing.

#### Acceptance Criteria

1. WHEN a kiosk user logs in THEN the system SHALL fetch employee documents from Firestore filtered by the user's assigned cluster
2. WHEN employee data is loaded THEN the system SHALL display each employee as a row showing empId, name, eligibility status, and attendance status
3. WHEN Firestore data is missing or incomplete THEN the system SHALL display placeholder values gracefully
4. WHEN the employee data loads THEN the system SHALL maintain the existing table animations and visual styling
5. WHEN data loading fails THEN the system SHALL show appropriate error messages and retry mechanisms

### Requirement 3

**User Story:** As a kiosk user, I want to click on an employee row to open a modal showing attendance toggles for the employee and up to 3 family members, so that I can mark attendance for all attendees regardless of eligibility status.

#### Acceptance Criteria

1. WHEN a kiosk user clicks on an employee row THEN the system SHALL open a modal pop-up displaying attendance controls
2. WHEN the modal opens THEN the system SHALL show toggles for employee, spouse, and up to 3 children (kid1, kid2, kid3)
3. WHEN children data is missing from the database THEN the system SHALL provide input fields to enter children names dynamically
4. WHEN displaying family members THEN the system SHALL show switches or checkboxes for each family member regardless of eligibility status
5. WHEN the modal displays THEN the system SHALL include a "Mark Attendance" button and real-time preview of "markedBy" and "markedAt" information

### Requirement 4

**User Story:** As a kiosk user, I want to confirm attendance selections and have the system save to Firestore with dynamic name updates, so that attendance and family information are properly recorded.

#### Acceptance Criteria

1. WHEN a kiosk user clicks "Mark Attendance" THEN the system SHALL write attendance data to `/attendance/event/records/{empId}` in Firestore
2. WHEN children names are entered dynamically THEN the system SHALL update the employee record with the new children information
3. WHEN attendance is successfully saved THEN the system SHALL update the employee row instantly with green highlight for marked or grey for unmarked
4. WHEN attendance is saved THEN the system SHALL display a toast confirmation message showing "Attendance marked successfully for {empId}"
5. WHEN the UI updates THEN the system SHALL trigger a soft table refresh animation to reflect changes

### Requirement 5

**User Story:** As a kiosk user, I want to re-open previously marked employee rows to view and edit their attendance, so that I can make corrections or updates to attendance records.

#### Acceptance Criteria

1. WHEN a kiosk user opens a previously marked employee row THEN the system SHALL display the modal with current attendance values pre-selected
2. WHEN viewing existing attendance THEN the system SHALL show the previous "markedBy" and "markedAt" information
3. WHEN editing existing attendance THEN the system SHALL change the button text to "Save Changes" instead of "Mark Attendance"
4. WHEN changes are saved THEN the system SHALL update the Firestore record and refresh the UI with the new values
5. WHEN updating attendance THEN the system SHALL preserve audit trail while updating current status and timestamp

### Requirement 6

**User Story:** As a kiosk user, I want to filter and search employees within my cluster, so that I can quickly find specific employees or groups.

#### Acceptance Criteria

1. WHEN the kiosk interface loads THEN the system SHALL display search functionality for filtering by name or employee ID
2. WHEN a kiosk user enters text in the search field THEN the system SHALL filter employees in real-time within their cluster
3. WHEN eligibility filter is applied THEN the system SHALL show eligibility status as display-only information
4. WHEN filters are applied THEN the system SHALL maintain smooth transitions and update the table with appropriate animations
5. WHEN no results are found THEN the system SHALL display appropriate "no employees found" messaging

### Requirement 7

**User Story:** As an admin user, I want to view real-time attendance statistics for all geographic locations, so that I can monitor overall event attendance across all clusters.

#### Acceptance Criteria

1. WHEN an admin user accesses the system THEN the system SHALL display attendance statistics for all clusters (Vijayawada, Nellore, Visakhapatnam)
2. WHEN displaying admin dashboard THEN the system SHALL show total members, real-time attendance, present count, and pending count for each location
3. WHEN attendance is marked by kiosk users THEN the system SHALL update admin statistics in real-time
4. WHEN viewing cluster data THEN the system SHALL provide separate statistics for each geographic location
5. WHEN admin views employee data THEN the system SHALL show all employees across all clusters with their current attendance status

### Requirement 8

**User Story:** As a system architect, I want kiosk user credentials and cluster assignments to be hardcoded in the application, so that user management is secure and deployment is simplified.

#### Acceptance Criteria

1. WHEN defining kiosk users THEN the system SHALL include hardcoded arrays for 4 users each in Vijayawada, Nellore, and Visakhapatnam clusters
2. WHEN storing user credentials THEN the system SHALL use SHA-hashed passwords that are hardcoded in the application
3. WHEN assigning clusters THEN the system SHALL map each kiosk user to their specific geographic location in the code
4. WHEN authenticating users THEN the system SHALL validate against the hardcoded credential arrays
5. WHEN tracking attendance THEN the system SHALL use the authenticated user's identifier for "markedBy" field in attendance records

### Requirement 9

**User Story:** As a system architect, I want all UI interactions to maintain the existing smooth transitions, animations, and visual theme, so that the user experience remains consistent and polished.

#### Acceptance Criteria

1. WHEN any UI element updates THEN the system SHALL use the existing animation library and transition styles
2. WHEN modals open or close THEN the system SHALL maintain smooth fade and scale animations
3. WHEN table rows update THEN the system SHALL use the existing highlight and color transition effects
4. WHEN filters are applied THEN the system SHALL animate table changes with the current smooth transition system
5. WHEN attendance status changes THEN the system SHALL use the existing green/grey color scheme and animation patterns
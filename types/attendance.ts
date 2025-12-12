export interface Student {
  regNo: string;
  name?: string;
  status?: 'present' | 'absent' | null;
}

export interface AttendanceSession {
  students: Student[];
  currentIndex: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  pending: number;
}

// Employee Family Attendance System Types

export interface Employee {
  empId: string;
  name: string;
  cluster: 'Vijayawada' | 'Nellore' | 'Visakhapatnam';
  eligibility: string;
  eligibleChildrenCount: number;
  kids: Array<{
    name: string;
    ageBracket: string;
  }>;
  attendance?: {
    employee: boolean;
    spouse: boolean;
    kid1: boolean;
    kid2: boolean;
    kid3: boolean;
  };
}

export interface AttendanceRecord {
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

export interface ClusterStats {
  cluster: string;
  totalMembers: number;
  presentCount: number;
  pendingCount: number;
  headCount: number; // Total people present (employee + family members)
}

export interface EmployeeWithAttendance extends Employee {
  attendanceRecord?: AttendanceRecord;
}
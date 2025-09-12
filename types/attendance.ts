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
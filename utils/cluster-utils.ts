import { Employee, AttendanceRecord, EmployeeWithAttendance, ClusterStats } from '@/types/attendance';

export type ClusterType = 'Vijayawada' | 'Nellore' | 'Visakhapatnam';

export const CLUSTERS: ClusterType[] = ['Vijayawada', 'Nellore', 'Visakhapatnam'];

/**
 * Filter employees by cluster
 */
export function filterEmployeesByCluster(employees: Employee[], cluster: ClusterType): Employee[] {
  return employees.filter(employee => employee.cluster === cluster);
}

/**
 * Filter employees with attendance by cluster
 */
export function filterEmployeesWithAttendanceByCluster(
  employees: EmployeeWithAttendance[], 
  cluster: ClusterType
): EmployeeWithAttendance[] {
  return employees.filter(employee => employee.cluster === cluster);
}

/**
 * Group employees by cluster
 */
export function groupEmployeesByCluster(employees: Employee[]): Record<ClusterType, Employee[]> {
  const grouped: Record<ClusterType, Employee[]> = {
    'Vijayawada': [],
    'Nellore': [],
    'Visakhapatnam': []
  };

  employees.forEach(employee => {
    if (CLUSTERS.includes(employee.cluster)) {
      grouped[employee.cluster].push(employee);
    }
  });

  return grouped;
}

/**
 * Calculate attendance statistics for a cluster
 */
export function calculateClusterAttendanceStats(employees: EmployeeWithAttendance[]): {
  totalEmployees: number;
  presentEmployees: number;
  pendingEmployees: number;
  attendanceRate: number;
} {
  const totalEmployees = employees.length;
  const presentEmployees = employees.filter(employee => 
    employee.attendanceRecord && hasAnyAttendance(employee.attendanceRecord)
  ).length;
  const pendingEmployees = totalEmployees - presentEmployees;
  const attendanceRate = totalEmployees > 0 ? (presentEmployees / totalEmployees) * 100 : 0;

  return {
    totalEmployees,
    presentEmployees,
    pendingEmployees,
    attendanceRate: Math.round(attendanceRate * 100) / 100 // Round to 2 decimal places
  };
}

/**
 * Check if an attendance record has any family member marked as present
 */
export function hasAnyAttendance(record: AttendanceRecord): boolean {
  return record.employee || record.spouse || record.kid1 || record.kid2 || record.kid3;
}

/**
 * Count total family members marked as present in an attendance record
 */
export function countPresentMembers(record: AttendanceRecord): number {
  let count = 0;
  if (record.employee) count++;
  if (record.spouse) count++;
  if (record.kid1) count++;
  if (record.kid2) count++;
  if (record.kid3) count++;
  return count;
}

/**
 * Get attendance status summary for an employee
 */
export function getAttendanceStatusSummary(employee: EmployeeWithAttendance): {
  status: 'present' | 'pending';
  presentCount: number;
  totalPossibleMembers: number;
} {
  if (!employee.attendanceRecord) {
    return {
      status: 'pending',
      presentCount: 0,
      totalPossibleMembers: getTotalPossibleMembers(employee)
    };
  }

  const presentCount = countPresentMembers(employee.attendanceRecord);
  const status = presentCount > 0 ? 'present' : 'pending';
  
  return {
    status,
    presentCount,
    totalPossibleMembers: getTotalPossibleMembers(employee)
  };
}

/**
 * Calculate total possible family members for an employee
 */
export function getTotalPossibleMembers(employee: Employee): number {
  // Employee + spouse + up to 3 children
  return 2 + Math.min(employee.kids?.length || 0, 3);
}

/**
 * Validate cluster name
 */
export function isValidCluster(cluster: string): cluster is ClusterType {
  return CLUSTERS.includes(cluster as ClusterType);
}

/**
 * Get cluster display name with formatting
 */
export function getClusterDisplayName(cluster: ClusterType): string {
  return cluster;
}

/**
 * Sort employees by name within cluster
 */
export function sortEmployeesByName(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sort employees by empId within cluster
 */
export function sortEmployeesByEmpId(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => a.empId.localeCompare(b.empId));
}

/**
 * Filter employees by search term (name or empId)
 */
export function filterEmployeesBySearch(employees: Employee[], searchTerm: string): Employee[] {
  if (!searchTerm.trim()) {
    return employees;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  return employees.filter(employee => 
    employee.name.toLowerCase().includes(lowerSearchTerm) ||
    employee.empId.toLowerCase().includes(lowerSearchTerm)
  );
}

/**
 * Create cluster statistics summary
 */
export function createClusterStatsSummary(employees: EmployeeWithAttendance[]): ClusterStats[] {
  const grouped = groupEmployeesByCluster(employees);
  
  return CLUSTERS.map(cluster => {
    const clusterEmployees = grouped[cluster];
    const stats = calculateClusterAttendanceStats(clusterEmployees);
    
    return {
      cluster,
      totalMembers: stats.totalEmployees,
      presentCount: stats.presentEmployees,
      pendingCount: stats.pendingEmployees
    };
  });
}
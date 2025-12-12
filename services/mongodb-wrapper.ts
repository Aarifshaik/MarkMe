/**
 * MongoDB Service Wrapper
 * 
 * This provides the same class-based API as FirestoreService
 * so we can drop it in as a replacement without changing component code
 */

'use client';

import * as mongodbApi from './mongodb-service';
import { cacheService } from './cache-service';
import type { Employee, AttendanceRecord, ClusterStats } from '@/types/attendance';

export interface EmployeeWithAttendance extends Employee {
  attendanceRecord?: AttendanceRecord;
}

export class MongoDBService {
  private static instance: MongoDBService;
  private clusterUnsubscribers: Map<string, () => void> = new Map();

  private constructor() {}

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  /**
 * Get all employees with attendance data
 * Supports stale-while-revalidate: returns cached data immediately, 
 * fetches fresh in background, calls onFresh when done
 */
  async getAllEmployeesWithAttendance(
    options: { useCache?: boolean; onFresh?: (data: EmployeeWithAttendance[]) => void } = {}
  ): Promise<EmployeeWithAttendance[]> {
    const forceRefresh = options.useCache === false;
    
    let latestEmployees: Employee[] = [];
    let latestAttendance = new Map<string, AttendanceRecord>();
    
    // Callback to merge and notify fresh data
    const notifyFresh = () => {
      if (options.onFresh && latestEmployees.length > 0) {
        const merged = latestEmployees.map(emp => ({
          ...emp,
          attendanceRecord: latestAttendance.get(emp.empId)
        }));
        options.onFresh(merged);
      }
    };

    const [employees, attendanceMap] = await Promise.all([
      mongodbApi.fetchAllEmployees(forceRefresh, (freshEmployees) => {
        latestEmployees = freshEmployees;
        notifyFresh();
      }),
      mongodbApi.fetchAllAttendance(forceRefresh, (freshAttendance) => {
        latestAttendance = freshAttendance;
        notifyFresh();
      })
    ]);
    
    latestEmployees = employees;
    latestAttendance = attendanceMap;

    return employees.map(emp => ({
      ...emp,
      attendanceRecord: attendanceMap.get(emp.empId)
    }));
  }

  /**
   * Get employees with attendance by cluster
   * Supports stale-while-revalidate pattern
   */
  async getEmployeesWithAttendanceByCluster(
    cluster: string,
    options: { useCache?: boolean; onFresh?: (data: EmployeeWithAttendance[]) => void } = {}
  ): Promise<EmployeeWithAttendance[]> {
    const forceRefresh = options.useCache === false;
    
    let latestEmployees: Employee[] = [];
    let latestAttendance = new Map<string, AttendanceRecord>();
    let freshDataReceived = { employees: false, attendance: false };
    
    // Callback to merge and notify fresh data when both are ready
    const notifyFresh = () => {
      if (options.onFresh && freshDataReceived.employees && freshDataReceived.attendance) {
        const merged = latestEmployees.map(emp => ({
          ...emp,
          attendanceRecord: latestAttendance.get(emp.empId)
        }));
        console.log(`🔄 [SWR] Fresh data ready: ${merged.length} employees for ${cluster}`);
        options.onFresh(merged);
      }
    };

    const [employees, attendanceMap] = await Promise.all([
      mongodbApi.fetchEmployeesByCluster(cluster, forceRefresh, (freshEmployees) => {
        latestEmployees = freshEmployees;
        freshDataReceived.employees = true;
        notifyFresh();
      }),
      mongodbApi.fetchClusterAttendance(cluster, forceRefresh, (freshAttendance) => {
        latestAttendance = freshAttendance;
        freshDataReceived.attendance = true;
        notifyFresh();
      })
    ]);
    
    latestEmployees = employees;
    latestAttendance = attendanceMap;

    return employees.map(emp => ({
      ...emp,
      attendanceRecord: attendanceMap.get(emp.empId)
    }));
  }

  /**
   * Save attendance record
   * Accepts partial AttendanceRecord (markedAt is added by server)
   */
  async saveAttendanceRecord(empId: string, data: Omit<AttendanceRecord, 'markedAt'> | AttendanceRecord, cluster?: string): Promise<void> {
    // Add markedAt if not present (for type compatibility)
    const fullRecord: AttendanceRecord = {
      ...data,
      markedAt: 'markedAt' in data ? data.markedAt : new Date()
    };
    return mongodbApi.saveAttendanceRecord(empId, fullRecord, cluster);
  }

  /**
   * Update employee children (not implemented in MongoDB yet)
   */
  async updateEmployeeChildren(empId: string, kids: { name: string; ageBracket: string }[]): Promise<void> {
    console.log(`[MongoDB] updateEmployeeChildren for ${empId} - not implemented yet`);
    // TODO: Add API endpoint for this
  }

  /**
   * Get cluster statistics
   * Maps MongoDB API response to ClusterStats type
   */
  async getClusterStats(): Promise<ClusterStats[]> {
    const stats = await mongodbApi.getClusterStats();
    return stats.map(s => ({
      cluster: s.cluster,
      totalMembers: s.totalEmployees,
      presentCount: s.attendedCount,
      pendingCount: s.totalEmployees - s.attendedCount
    }));
  }

  /**
   * Subscribe to all employees (matches Firestore API)
   */
  subscribeToAllEmployees(
    callback: (employees: Employee[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = mongodbApi.subscribeToAll(
      callback,
      () => {} // We handle attendance separately
    );
    return unsubscribe;
  }

  /**
   * Subscribe to all attendance (matches Firestore API)
   * Returns Record<string, AttendanceRecord> NOT Map
   */
  subscribeToAllAttendance(
    callback: (attendanceRecords: Record<string, AttendanceRecord>) => void
  ): () => void {
    const unsubscribe = mongodbApi.subscribeToAll(
      () => {}, // We handle employees separately  
      (attendanceMap: Map<string, AttendanceRecord>) => {
        // Convert Map to Record to match Firestore API
        const record: Record<string, AttendanceRecord> = {};
        attendanceMap.forEach((value, key) => {
          record[key] = value;
        });
        callback(record);
      }
    );
    return unsubscribe;
  }

  // Track active subscriptions to avoid duplicates
  private clusterSubscriptions: Map<string, {
    unsubscribe: () => void;
    employeeCallbacks: Set<(employees: Employee[]) => void>;
    attendanceCallbacks: Set<(records: Record<string, AttendanceRecord>) => void>;
  }> = new Map();

  /**
   * Subscribe to cluster employees (matches Firestore API)
   */
  subscribeToClusterEmployees(
    cluster: string,
    callback: (employees: Employee[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    console.log(`🔔 [Wrapper] subscribeToClusterEmployees called for: ${cluster}`);
    
    // Get or create subscription for this cluster
    let sub = this.clusterSubscriptions.get(cluster);
    
    if (!sub) {
      // Create new subscription
      console.log(`🔔 [Wrapper] Creating NEW subscription for cluster: ${cluster}`);
      const employeeCallbacks = new Set<(employees: Employee[]) => void>();
      const attendanceCallbacks = new Set<(records: Record<string, AttendanceRecord>) => void>();
      
      const unsubscribe = mongodbApi.subscribeToCluster(
        cluster,
        (employees) => {
          console.log(`🔔 [Wrapper] Employee update received, notifying ${employeeCallbacks.size} callbacks`);
          employeeCallbacks.forEach(cb => cb(employees));
        },
        (attendanceMap: Map<string, AttendanceRecord>) => {
          console.log(`🔔 [Wrapper] Attendance update received, notifying ${attendanceCallbacks.size} callbacks`);
          const record: Record<string, AttendanceRecord> = {};
          attendanceMap.forEach((value, key) => {
            record[key] = value;
          });
          attendanceCallbacks.forEach(cb => cb(record));
        }
      );
      
      sub = { unsubscribe, employeeCallbacks, attendanceCallbacks };
      this.clusterSubscriptions.set(cluster, sub);
    }
    
    // Add callback
    sub.employeeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      sub!.employeeCallbacks.delete(callback);
      // If no more callbacks, clean up subscription
      if (sub!.employeeCallbacks.size === 0 && sub!.attendanceCallbacks.size === 0) {
        sub!.unsubscribe();
        this.clusterSubscriptions.delete(cluster);
        console.log(`🔔 [Wrapper] Cleaned up subscription for cluster: ${cluster}`);
      }
    };
  }

  /**
   * Subscribe to cluster attendance (matches Firestore API)
   * Returns Record<string, AttendanceRecord> NOT Map
   */
  subscribeToClusterAttendance(
    cluster: string,
    callback: (attendanceRecords: Record<string, AttendanceRecord>) => void,
    employeeIds?: string[] // Optional, for compatibility
  ): () => void {
    console.log(`🔔 [Wrapper] subscribeToClusterAttendance called for: ${cluster}`);
    
    // Get or create subscription for this cluster
    let sub = this.clusterSubscriptions.get(cluster);
    
    if (!sub) {
      // Create new subscription
      console.log(`🔔 [Wrapper] Creating NEW subscription for cluster: ${cluster}`);
      const employeeCallbacks = new Set<(employees: Employee[]) => void>();
      const attendanceCallbacks = new Set<(records: Record<string, AttendanceRecord>) => void>();
      
      const unsubscribe = mongodbApi.subscribeToCluster(
        cluster,
        (employees) => {
          console.log(`🔔 [Wrapper] Employee update received, notifying ${employeeCallbacks.size} callbacks`);
          employeeCallbacks.forEach(cb => cb(employees));
        },
        (attendanceMap: Map<string, AttendanceRecord>) => {
          console.log(`🔔 [Wrapper] Attendance update received, notifying ${attendanceCallbacks.size} callbacks`);
          const record: Record<string, AttendanceRecord> = {};
          attendanceMap.forEach((value, key) => {
            record[key] = value;
          });
          attendanceCallbacks.forEach(cb => cb(record));
        }
      );
      
      sub = { unsubscribe, employeeCallbacks, attendanceCallbacks };
      this.clusterSubscriptions.set(cluster, sub);
    }
    
    // Add callback
    sub.attendanceCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      sub!.attendanceCallbacks.delete(callback);
      // If no more callbacks, clean up subscription
      if (sub!.employeeCallbacks.size === 0 && sub!.attendanceCallbacks.size === 0) {
        sub!.unsubscribe();
        this.clusterSubscriptions.delete(cluster);
        console.log(`🔔 [Wrapper] Cleaned up subscription for cluster: ${cluster}`);
      }
    };
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<boolean> {
    return mongodbApi.checkBackendHealth();
  }

  /**
   * Force sync from server
   */
  async forceSync(): Promise<void> {
    return mongodbApi.forceSyncFromServer();
  }
}

// Export singleton instance (same API as firestoreService)
export const mongodbService = MongoDBService.getInstance();

// Alias for drop-in replacement
export const firestoreService = mongodbService;

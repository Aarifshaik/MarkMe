import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, AttendanceRecord, EmployeeWithAttendance, ClusterStats } from '@/types/attendance';
import { withFirestoreRetry, firestoreCircuitBreaker } from '@/utils/retry-utils';
import { cacheService } from './cache-service';
import { firestoreTracker } from './firestore-tracker';

export class FirestoreService {
  private static instance: FirestoreService;

  private constructor() {
    // Initialize cache service
    if (typeof window !== 'undefined') {
      cacheService.init();
    }
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  // Employee Operations

  /**
   * Fetch all employees from Firestore with caching
   */
  async getAllEmployees(): Promise<Employee[]> {
    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const employeesRef = collection(db, 'employees');
        const snapshot = await getDocs(employeesRef);
        
        // Track this read operation
        firestoreTracker.trackRead('employees', snapshot.docs.length, 'getAllEmployees');
        
        const employees = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            empId: doc.id,
            name: data.name || 'Unknown Employee',
            cluster: data.cluster || 'Unknown',
            eligibility: data.eligibility || 'Not Specified',
            eligibleChildrenCount: data.eligibleChildrenCount || 0,
            kids: Array.isArray(data.kids) ? data.kids : [],
          } as Employee;
        });

        // Cache employees by cluster
        const clusterGroups = new Map<string, Employee[]>();
        employees.forEach(emp => {
          const cluster = emp.cluster || 'Unknown';
          if (!clusterGroups.has(cluster)) {
            clusterGroups.set(cluster, []);
          }
          clusterGroups.get(cluster)!.push(emp);
        });
        
        // Cache each cluster
        const clusterEntries = Array.from(clusterGroups.entries());
        for (let i = 0; i < clusterEntries.length; i++) {
          const [cluster, clusterEmployees] = clusterEntries[i];
          await cacheService.cacheEmployees(clusterEmployees, cluster);
          await cacheService.setLastSyncTime(cluster);
        }

        return employees;
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying getAllEmployees (attempt ${attempt}):`, error.message);
      }
    })();
  }

  /**
   * Fetch employees filtered by cluster with caching
   */
  async getEmployeesByCluster(cluster: string): Promise<Employee[]> {
    if (!cluster) {
      throw new Error('Cluster parameter is required');
    }

    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('cluster', '==', cluster));
        const snapshot = await getDocs(q);
        
        // Track this read operation
        firestoreTracker.trackRead('employees', snapshot.docs.length, `getEmployeesByCluster(${cluster})`);
        
        const employees = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            empId: doc.id,
            name: data.name || 'Unknown Employee',
            cluster: data.cluster || cluster,
            eligibility: data.eligibility || 'Not Specified',
            eligibleChildrenCount: data.eligibleChildrenCount || 0,
            kids: Array.isArray(data.kids) ? data.kids : [],
          } as Employee;
        });

        // Cache employees and update sync time
        await cacheService.cacheEmployees(employees, cluster);
        await cacheService.setLastSyncTime(cluster);

        return employees;
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying getEmployeesByCluster for ${cluster} (attempt ${attempt}):`, error.message);
      }
    })();
  }

  /**
   * Get a single employee by empId
   */
  async getEmployee(empId: string): Promise<Employee | null> {
    if (!empId) {
      throw new Error('Employee ID is required');
    }

    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const employeeRef = doc(db, 'employees', empId);
        const snapshot = await getDoc(employeeRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          return {
            empId: snapshot.id,
            name: data.name || 'Unknown Employee',
            cluster: data.cluster || 'Unknown',
            eligibility: data.eligibility || 'Not Specified',
            eligibleChildrenCount: data.eligibleChildrenCount || 0,
            kids: Array.isArray(data.kids) ? data.kids : [],
          } as Employee;
        }
        return null;
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying getEmployee for ${empId} (attempt ${attempt}):`, error.message);
      }
    })();
  }

  /**
   * Update employee record with new children names
   */
  async updateEmployeeChildren(empId: string, kids: Array<{ name: string; ageBracket: string }>): Promise<void> {
    if (!empId) {
      throw new Error('Employee ID is required');
    }

    if (!Array.isArray(kids)) {
      throw new Error('Kids must be an array');
    }

    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const employeeRef = doc(db, 'employees', empId);
        await updateDoc(employeeRef, { kids });
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying updateEmployeeChildren for ${empId} (attempt ${attempt}):`, error.message);
      }
    })();
  }

  // Attendance Operations

  /**
   * Get attendance record for an employee
   */
  async getAttendanceRecord(empId: string): Promise<AttendanceRecord | null> {
    if (!empId) {
      throw new Error('Employee ID is required');
    }

    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const attendanceRef = doc(db, 'attendance', 'event', 'records', empId);
        const snapshot = await getDoc(attendanceRef);
        
        // Track this read operation (1 read even if doc doesn't exist)
        firestoreTracker.trackRead('attendance/event/records', 1, `getAttendanceRecord(${empId})`);
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          return {
            employee: Boolean(data.employee),
            spouse: Boolean(data.spouse),
            kid1: Boolean(data.kid1),
            kid2: Boolean(data.kid2),
            kid3: Boolean(data.kid3),
            markedBy: data.markedBy || 'Unknown',
            markedAt: data.markedAt?.toDate() || new Date(),
            kidNames: data.kidNames || {},
          } as AttendanceRecord;
        }
        return null;
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying getAttendanceRecord for ${empId} (attempt ${attempt}):`, error.message);
      }
    })();
  }

  /**
   * OPTIMIZED: Batch fetch all attendance records in a single query
   * Instead of N+1 queries, this fetches everything at once
   * Note: This still costs 1 read per document returned
   */
  async getAllAttendanceRecordsBatch(): Promise<Map<string, AttendanceRecord>> {
    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const recordsRef = collection(db, 'attendance', 'event', 'records');
        const snapshot = await getDocs(recordsRef);
        
        const attendanceMap = new Map<string, AttendanceRecord>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          attendanceMap.set(doc.id, {
            employee: Boolean(data.employee),
            spouse: Boolean(data.spouse),
            kid1: Boolean(data.kid1),
            kid2: Boolean(data.kid2),
            kid3: Boolean(data.kid3),
            markedBy: data.markedBy || 'Unknown',
            markedAt: data.markedAt?.toDate() || new Date(),
            kidNames: data.kidNames || {},
          });
        });

        // Track this batch read operation
        firestoreTracker.trackRead('attendance/event/records', snapshot.size, `getAllAttendanceRecordsBatch() - ${snapshot.size} docs`);
        
        console.log(`📦 Batch loaded ${attendanceMap.size} attendance records (${attendanceMap.size} reads)`);
        return attendanceMap;
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying getAllAttendanceRecordsBatch (attempt ${attempt}):`, error.message);
      }
    })();
  }

  /**
   * COST-OPTIMIZED: Fetch attendance only for specific employee IDs
   * Uses batch queries with documentId() - much more efficient!
   * For 460 employees, this reads 460 docs instead of 1096
   */
  async getAttendanceRecordsForEmployees(empIds: string[]): Promise<Map<string, AttendanceRecord>> {
    if (empIds.length === 0) return new Map();

    const attendanceMap = new Map<string, AttendanceRecord>();
    const BATCH_SIZE = 30; // Firestore 'in' query supports up to 30 with documentId()

    // Split into batches for 'in' queries
    for (let i = 0; i < empIds.length; i += BATCH_SIZE) {
      const batchIds = empIds.slice(i, i + BATCH_SIZE);
      
      try {
        const attendanceRef = collection(db, 'attendance', 'event', 'records');
        const q = query(attendanceRef, where(documentId(), 'in', batchIds));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          attendanceMap.set(doc.id, {
            employee: Boolean(data.employee),
            spouse: Boolean(data.spouse),
            kid1: Boolean(data.kid1),
            kid2: Boolean(data.kid2),
            kid3: Boolean(data.kid3),
            markedBy: data.markedBy || 'Unknown',
            markedAt: data.markedAt?.toDate() || new Date(),
            kidNames: data.kidNames || {},
          });
        });
        
        // Track reads for this batch
        firestoreTracker.trackRead('attendance/event/records', snapshot.size, `getAttendanceRecordsForEmployees batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      } catch (error) {
        console.warn(`Failed to fetch attendance batch starting at ${i}:`, error);
      }
    }

    console.log(`📦 Fetched ${attendanceMap.size} attendance records for ${empIds.length} employees (saved ${1096 - attendanceMap.size} reads!)`);
    return attendanceMap;
  }

  /**
   * Save or update attendance record
   */
  async saveAttendanceRecord(empId: string, attendanceData: Omit<AttendanceRecord, 'markedAt'> & { markedAt?: Date }, cluster?: string): Promise<void> {
    if (!empId) {
      throw new Error('Employee ID is required');
    }

    if (!attendanceData.markedBy) {
      throw new Error('markedBy field is required');
    }

    const markedAt = attendanceData.markedAt || new Date();

    return withFirestoreRetry(async () => {
      return firestoreCircuitBreaker.execute(async () => {
        const attendanceRef = doc(db, 'attendance', 'event', 'records', empId);
        
        // Clean kidNames - remove undefined values (Firestore doesn't allow undefined)
        const cleanKidNames: Record<string, string> = {};
        if (attendanceData.kidNames) {
          Object.entries(attendanceData.kidNames).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              cleanKidNames[key] = value;
            }
          });
        }
        
        const recordToSave = {
          employee: Boolean(attendanceData.employee),
          spouse: Boolean(attendanceData.spouse),
          kid1: Boolean(attendanceData.kid1),
          kid2: Boolean(attendanceData.kid2),
          kid3: Boolean(attendanceData.kid3),
          markedBy: attendanceData.markedBy,
          markedAt: Timestamp.fromDate(markedAt),
          kidNames: cleanKidNames,
        };
        
        await setDoc(attendanceRef, recordToSave, { merge: true });
        
        // Track this write operation
        firestoreTracker.trackWrite('attendance/event/records', empId, 'saveAttendanceRecord');

        // Update cache immediately
        const cachedRecord: AttendanceRecord = {
          employee: recordToSave.employee,
          spouse: recordToSave.spouse,
          kid1: recordToSave.kid1,
          kid2: recordToSave.kid2,
          kid3: recordToSave.kid3,
          markedBy: recordToSave.markedBy,
          markedAt: markedAt,
          kidNames: recordToSave.kidNames,
        };
        await cacheService.cacheAttendanceRecord(empId, cachedRecord, cluster);
      });
    }, {
      onRetry: (attempt, error) => {
        console.warn(`Retrying saveAttendanceRecord for ${empId} (attempt ${attempt}):`, error.message);
      }
    })();
  }

  /**
   * Get employees with their attendance records for a specific cluster
   * Uses cache-first strategy for instant loading
   * OPTIMIZED: Uses batch fetch instead of N+1 queries
   * COST-OPTIMIZED: Only fetches attendance for THIS cluster's employees
   */
  async getEmployeesWithAttendanceByCluster(cluster: string, options?: { useCache?: boolean }): Promise<EmployeeWithAttendance[]> {
    const { useCache = true } = options || {};

    // Try to get cached data first for instant display
    if (useCache) {
      const cachedData = await cacheService.getCachedEmployeesWithAttendance(cluster);
      if (cachedData.length > 0) {
        console.log(`⚡ Returning ${cachedData.length} cached employees for ${cluster}`);
        return cachedData;
      }
    }

    try {
      const startTime = performance.now();
      
      // Step 1: Fetch employees for this cluster
      const employees = await this.getEmployeesByCluster(cluster);
      
      // Step 2: Fetch attendance ONLY for these employees (not all 1096!)
      const empIds = employees.map(e => e.empId);
      const clusterAttendance = await this.getAttendanceRecordsForEmployees(empIds);

      // Map attendance to employees
      const employeesWithAttendance = employees.map(employee => ({
        ...employee,
        attendanceRecord: clusterAttendance.get(employee.empId) || undefined
      }));

      console.log(`🔄 Fetch ${cluster} employees: ${(performance.now() - startTime).toFixed(0)}ms`);

      // Cache the attendance records
      await cacheService.cacheAttendanceRecords(clusterAttendance, cluster);

      return employeesWithAttendance;
    } catch (error) {
      console.error(`Error fetching employees with attendance for cluster ${cluster}:`, error);
      
      // Fallback to cache on error
      const cachedData = await cacheService.getCachedEmployeesWithAttendance(cluster);
      if (cachedData.length > 0) {
        console.log(`Returning ${cachedData.length} cached employees after error for ${cluster}`);
        return cachedData;
      }
      
      throw new Error(`Failed to fetch employees with attendance for cluster ${cluster}`);
    }
  }

  /**
   * Get all employees with their attendance records (for admin view)
   * Uses cache-first strategy for instant loading
   */
  async getAllEmployeesWithAttendance(options?: { useCache?: boolean }): Promise<EmployeeWithAttendance[]> {
    const { useCache = true } = options || {};

    // Try to get cached data first for instant display
    if (useCache) {
      const cachedData = await cacheService.getAllCachedEmployeesWithAttendance();
      if (cachedData.length > 0) {
        console.log(`⚡ Returning ${cachedData.length} cached employees`);
        return cachedData;
      }
    }

    try {
      const startTime = performance.now();
      
      // OPTIMIZED: Fetch employees and all attendance in parallel (2 queries instead of 1000+)
      const [employees, allAttendance] = await Promise.all([
        this.getAllEmployees(),
        this.getAllAttendanceRecordsBatch()
      ]);

      // Map attendance to employees
      const employeesWithAttendance = employees.map(employee => ({
        ...employee,
        attendanceRecord: allAttendance.get(employee.empId) || undefined
      }));

      console.log(`🔄 Fetch all employees: ${(performance.now() - startTime).toFixed(0)}ms`);

      // Cache the attendance records
      await cacheService.cacheAttendanceRecords(allAttendance);

      return employeesWithAttendance;
    } catch (error) {
      console.error('Error fetching all employees with attendance:', error);
      
      // Fallback to cache on error
      const cachedData = await cacheService.getAllCachedEmployeesWithAttendance();
      if (cachedData.length > 0) {
        console.log(`Returning ${cachedData.length} cached employees after error`);
        return cachedData;
      }
      
      throw new Error('Failed to fetch all employees with attendance');
    }
  }

  // Real-time Subscription Handlers

  /**
   * Subscribe to real-time updates for employees in a specific cluster
   */
  subscribeToClusterEmployees(
    cluster: string, 
    callback: (employees: Employee[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    if (!cluster) {
      throw new Error('Cluster parameter is required');
    }

    const employeesRef = collection(db, 'employees');
    const q = query(employeesRef, where('cluster', '==', cluster));
    
    return onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          // Track this listener update
          firestoreTracker.trackListenerUpdate('employees', snapshot.docChanges().length, `subscribeToClusterEmployees(${cluster})`);
          
          const employees = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              empId: doc.id,
              name: data.name || 'Unknown Employee',
              cluster: data.cluster || cluster,
              eligibility: data.eligibility || 'Not Specified',
              eligibleChildrenCount: data.eligibleChildrenCount || 0,
              kids: Array.isArray(data.kids) ? data.kids : [],
            } as Employee;
          });
          callback(employees);
        } catch (error) {
          console.error(`Error processing cluster employees snapshot for ${cluster}:`, error);
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }, 
      (error) => {
        console.error(`Error in cluster employees subscription for ${cluster}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );
  }

  /**
   * Subscribe to real-time updates for all employees (admin view)
   */
  subscribeToAllEmployees(
    callback: (employees: Employee[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const employeesRef = collection(db, 'employees');
    
    return onSnapshot(employeesRef, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          // Track this listener update
          firestoreTracker.trackListenerUpdate('employees', snapshot.docChanges().length, 'subscribeToAllEmployees');
          
          const employees = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              empId: doc.id,
              name: data.name || 'Unknown Employee',
              cluster: data.cluster || 'Unknown',
              eligibility: data.eligibility || 'Not Specified',
              eligibleChildrenCount: data.eligibleChildrenCount || 0,
              kids: Array.isArray(data.kids) ? data.kids : [],
            } as Employee;
          });
          callback(employees);
        } catch (error) {
          console.error('Error processing all employees snapshot:', error);
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }, 
      (error) => {
        console.error('Error in all employees subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );
  }

  /**
   * Subscribe to real-time attendance updates for a specific cluster
   */
  subscribeToClusterAttendance(
    cluster: string, 
    callback: (attendanceRecords: Record<string, AttendanceRecord>) => void,
    employeeIds?: string[]  // Optional: pass pre-loaded employee IDs to avoid cascade
  ): Unsubscribe {
    const attendanceRef = collection(db, 'attendance', 'event', 'records');
    
    // Cache employee IDs once to prevent cascade reads
    let cachedEmpIds: Set<string> | null = employeeIds ? new Set(employeeIds) : null;
    let isFirstSnapshot = true;
    
    return onSnapshot(attendanceRef, async (snapshot: QuerySnapshot<DocumentData>) => {
      try {
        // Track this listener update
        const changedCount = snapshot.docChanges().length;
        firestoreTracker.trackListenerUpdate(
          'attendance/event/records', 
          isFirstSnapshot ? snapshot.size : changedCount, 
          `subscribeToClusterAttendance(${cluster}) ${isFirstSnapshot ? '[INITIAL]' : '[UPDATE]'}`
        );
        
        // Only fetch employee IDs once on first snapshot if not provided
        if (!cachedEmpIds) {
          console.log(`⚠️ Fetching employee IDs for cluster filter (first time only)`);
          const employees = await this.getEmployeesByCluster(cluster);
          cachedEmpIds = new Set(employees.map(emp => emp.empId));
        }
        
        const attendanceRecords: Record<string, AttendanceRecord> = {};
        
        snapshot.docs.forEach(doc => {
          if (cachedEmpIds!.has(doc.id)) {
            const data = doc.data();
            attendanceRecords[doc.id] = {
              ...data,
              markedAt: data.markedAt?.toDate() || new Date()
            } as AttendanceRecord;
          }
        });
        
        isFirstSnapshot = false;
        callback(attendanceRecords);
      } catch (error) {
        console.error(`Error processing cluster attendance subscription for ${cluster}:`, error);
      }
    }, (error) => {
      console.error(`Error in cluster attendance subscription for ${cluster}:`, error);
    });
  }

  /**
   * Subscribe to real-time attendance updates for all employees (admin view)
   */
  subscribeToAllAttendance(callback: (attendanceRecords: Record<string, AttendanceRecord>) => void): Unsubscribe {
    const attendanceRef = collection(db, 'attendance', 'event', 'records');
    
    return onSnapshot(attendanceRef, (snapshot: QuerySnapshot<DocumentData>) => {
      // Track this listener update
      firestoreTracker.trackListenerUpdate('attendance/event/records', snapshot.docChanges().length, 'subscribeToAllAttendance');
      
      const attendanceRecords: Record<string, AttendanceRecord> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        attendanceRecords[doc.id] = {
          ...data,
          markedAt: data.markedAt?.toDate() || new Date()
        } as AttendanceRecord;
      });
      
      callback(attendanceRecords);
    }, (error) => {
      console.error('Error in all attendance subscription:', error);
    });
  }

  // Statistics and Analytics

  /**
   * Calculate cluster-wise statistics
   */
  async getClusterStats(): Promise<ClusterStats[]> {
    try {
      const clusters = ['Vijayawada', 'Nellore', 'Visakhapatnam'];
      const stats: ClusterStats[] = [];

      for (const cluster of clusters) {
        const employees = await this.getEmployeesWithAttendanceByCluster(cluster);
        
        const totalMembers = employees.length;
        const presentCount = employees.filter(emp => 
          emp.attendanceRecord && (
            emp.attendanceRecord.employee || 
            emp.attendanceRecord.spouse || 
            emp.attendanceRecord.kid1 || 
            emp.attendanceRecord.kid2 || 
            emp.attendanceRecord.kid3
          )
        ).length;
        const pendingCount = totalMembers - presentCount;

        stats.push({
          cluster,
          totalMembers,
          presentCount,
          pendingCount
        });
      }

      return stats;
    } catch (error) {
      console.error('Error calculating cluster stats:', error);
      throw new Error('Failed to calculate cluster statistics');
    }
  }

  /**
   * Get overall attendance statistics
   */
  async getOverallStats(): Promise<{ totalEmployees: number; totalPresent: number; totalPending: number }> {
    try {
      const employees = await this.getAllEmployeesWithAttendance();
      
      const totalEmployees = employees.length;
      const totalPresent = employees.filter(emp => 
        emp.attendanceRecord && (
          emp.attendanceRecord.employee || 
          emp.attendanceRecord.spouse || 
          emp.attendanceRecord.kid1 || 
          emp.attendanceRecord.kid2 || 
          emp.attendanceRecord.kid3
        )
      ).length;
      const totalPending = totalEmployees - totalPresent;

      return {
        totalEmployees,
        totalPresent,
        totalPending
      };
    } catch (error) {
      console.error('Error calculating overall stats:', error);
      throw new Error('Failed to calculate overall statistics');
    }
  }

  // Utility Methods

  /**
   * Search employees by name or empId within a cluster
   */
  async searchEmployeesInCluster(cluster: string, searchTerm: string): Promise<Employee[]> {
    try {
      const employees = await this.getEmployeesByCluster(cluster);
      
      if (!searchTerm.trim()) {
        return employees;
      }

      const lowerSearchTerm = searchTerm.toLowerCase();
      return employees.filter(employee => 
        employee.name.toLowerCase().includes(lowerSearchTerm) ||
        employee.empId.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error(`Error searching employees in cluster ${cluster}:`, error);
      throw new Error(`Failed to search employees in cluster ${cluster}`);
    }
  }

  /**
   * Search all employees by name or empId (admin view)
   */
  async searchAllEmployees(searchTerm: string): Promise<Employee[]> {
    try {
      const employees = await this.getAllEmployees();
      
      if (!searchTerm.trim()) {
        return employees;
      }

      const lowerSearchTerm = searchTerm.toLowerCase();
      return employees.filter(employee => 
        employee.name.toLowerCase().includes(lowerSearchTerm) ||
        employee.empId.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error searching all employees:', error);
      throw new Error('Failed to search all employees');
    }
  }
}

// Export singleton instance
export const firestoreService = FirestoreService.getInstance();
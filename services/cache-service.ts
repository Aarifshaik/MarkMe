/**
 * IndexedDB Cache Service for instant data loading
 * Stores employee and attendance data locally for offline-first experience
 */

import { Employee, AttendanceRecord, EmployeeWithAttendance } from '@/types/attendance';

const DB_NAME = 'markme-cache';
const DB_VERSION = 1;
const EMPLOYEES_STORE = 'employees';
const ATTENDANCE_STORE = 'attendance';
const METADATA_STORE = 'metadata';

interface CacheMetadata {
  key: string;
  lastSync: number;
  cluster?: string;
}

class CacheService {
  private static instance: CacheService;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        resolve(); // Don't reject, just continue without cache
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Employees store with indexes
        if (!db.objectStoreNames.contains(EMPLOYEES_STORE)) {
          const employeesStore = db.createObjectStore(EMPLOYEES_STORE, { keyPath: 'empId' });
          employeesStore.createIndex('cluster', 'cluster', { unique: false });
        }

        // Attendance store
        if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
          const attendanceStore = db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'empId' });
          attendanceStore.createIndex('cluster', 'cluster', { unique: false });
        }

        // Metadata store for sync timestamps
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.db !== null;
  }

  /**
   * Check if cache is fresh (less than X minutes old)
   * Used to skip unnecessary Firestore reads
   */
  async isCacheFresh(cluster: string, maxAgeMinutes: number = 5): Promise<boolean> {
    const lastSync = await this.getLastSyncTime(cluster);
    if (!lastSync) return false;
    
    const ageMinutes = (Date.now() - lastSync) / (1000 * 60);
    return ageMinutes < maxAgeMinutes;
  }

  /**
   * Get last sync timestamp for a cluster
   */
  async getLastSyncTime(cluster: string): Promise<number | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(`sync_${cluster}`);

      request.onsuccess = () => {
        const metadata = request.result as CacheMetadata | undefined;
        resolve(metadata?.lastSync || null);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Update last sync timestamp
   */
  async setLastSyncTime(cluster: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      store.put({
        key: `sync_${cluster}`,
        lastSync: Date.now(),
        cluster
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  }

  /**
   * Cache employees for a cluster
   */
  async cacheEmployees(employees: Employee[], cluster: string): Promise<void> {
    await this.init();
    if (!this.db || employees.length === 0) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMPLOYEES_STORE], 'readwrite');
      const store = transaction.objectStore(EMPLOYEES_STORE);

      // Add cluster info to each employee for querying
      employees.forEach(employee => {
        store.put({ ...employee, cluster });
      });

      transaction.oncomplete = () => {
        console.log(`Cached ${employees.length} employees for cluster ${cluster}`);
        resolve();
      };
      transaction.onerror = () => resolve();
    });
  }

  /**
   * Get cached employees by cluster
   */
  async getCachedEmployeesByCluster(cluster: string): Promise<Employee[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMPLOYEES_STORE], 'readonly');
      const store = transaction.objectStore(EMPLOYEES_STORE);
      const index = store.index('cluster');
      const request = index.getAll(cluster);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => resolve([]);
    });
  }

  /**
   * Get all cached employees
   */
  async getAllCachedEmployees(): Promise<Employee[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([EMPLOYEES_STORE], 'readonly');
      const store = transaction.objectStore(EMPLOYEES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => resolve([]);
    });
  }

  /**
   * Cache attendance records
   */
  async cacheAttendanceRecords(records: Map<string, AttendanceRecord>, cluster?: string): Promise<void> {
    await this.init();
    if (!this.db || records.size === 0) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([ATTENDANCE_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDANCE_STORE);

      records.forEach((record, empId) => {
        store.put({ ...record, empId, cluster: cluster || 'Unknown' });
      });

      transaction.oncomplete = () => {
        console.log(`Cached ${records.size} attendance records`);
        resolve();
      };
      transaction.onerror = () => resolve();
    });
  }

  /**
   * Cache a single attendance record
   */
  async cacheAttendanceRecord(empId: string, record: AttendanceRecord | null, cluster?: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([ATTENDANCE_STORE], 'readwrite');
      const store = transaction.objectStore(ATTENDANCE_STORE);

      if (record) {
        store.put({ ...record, empId, cluster });
      } else {
        store.delete(empId);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  }

  /**
   * Get cached attendance record for an employee
   */
  async getCachedAttendanceRecord(empId: string): Promise<AttendanceRecord | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([ATTENDANCE_STORE], 'readonly');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      const request = store.get(empId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Remove the empId key we added for IndexedDB
          const { empId: _, cluster: __, ...attendanceRecord } = result;
          resolve(attendanceRecord as AttendanceRecord);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Get cached attendance records by cluster
   */
  async getCachedAttendanceByCluster(cluster: string): Promise<Map<string, AttendanceRecord>> {
    await this.init();
    if (!this.db) return new Map();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([ATTENDANCE_STORE], 'readonly');
      const store = transaction.objectStore(ATTENDANCE_STORE);
      const index = store.index('cluster');
      const request = index.getAll(cluster);

      request.onsuccess = () => {
        const records = new Map<string, AttendanceRecord>();
        (request.result || []).forEach((record: any) => {
          const { empId, cluster: _, ...attendanceData } = record;
          records.set(empId, attendanceData as AttendanceRecord);
        });
        resolve(records);
      };

      request.onerror = () => resolve(new Map());
    });
  }

  /**
   * Get cached employees with attendance for a cluster
   */
  async getCachedEmployeesWithAttendance(cluster: string): Promise<EmployeeWithAttendance[]> {
    const [employees, attendanceMap] = await Promise.all([
      this.getCachedEmployeesByCluster(cluster),
      this.getCachedAttendanceByCluster(cluster)
    ]);

    return employees.map(employee => ({
      ...employee,
      attendanceRecord: attendanceMap.get(employee.empId) || undefined
    }));
  }

  /**
   * Get all cached employees with attendance
   */
  async getAllCachedEmployeesWithAttendance(): Promise<EmployeeWithAttendance[]> {
    await this.init();
    if (!this.db) return [];

    const [employees, attendanceRecords] = await Promise.all([
      this.getAllCachedEmployees(),
      new Promise<Map<string, AttendanceRecord>>((resolve) => {
        const transaction = this.db!.transaction([ATTENDANCE_STORE], 'readonly');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = new Map<string, AttendanceRecord>();
          (request.result || []).forEach((record: any) => {
            const { empId, cluster: _, ...attendanceData } = record;
            records.set(empId, attendanceData as AttendanceRecord);
          });
          resolve(records);
        };

        request.onerror = () => resolve(new Map());
      })
    ]);

    return employees.map(employee => ({
      ...employee,
      attendanceRecord: attendanceRecords.get(employee.empId) || undefined
    }));
  }

  /**
   * Check if we have cached data for a cluster
   */
  async hasCachedData(cluster: string): Promise<boolean> {
    const employees = await this.getCachedEmployeesByCluster(cluster);
    return employees.length > 0;
  }

  /**
   * Check if we have any cached data (for admin)
   */
  async hasAnyCachedData(): Promise<boolean> {
    const employees = await this.getAllCachedEmployees();
    return employees.length > 0;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(
        [EMPLOYEES_STORE, ATTENDANCE_STORE, METADATA_STORE],
        'readwrite'
      );

      transaction.objectStore(EMPLOYEES_STORE).clear();
      transaction.objectStore(ATTENDANCE_STORE).clear();
      transaction.objectStore(METADATA_STORE).clear();

      transaction.oncomplete = () => {
        console.log('Cache cleared');
        resolve();
      };
      transaction.onerror = () => resolve();
    });
  }

  /**
   * Clear cached data for a specific cluster
   */
  async clearClusterCache(cluster: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const employees = await this.getCachedEmployeesByCluster(cluster);
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(
        [EMPLOYEES_STORE, ATTENDANCE_STORE, METADATA_STORE],
        'readwrite'
      );

      const employeesStore = transaction.objectStore(EMPLOYEES_STORE);
      const attendanceStore = transaction.objectStore(ATTENDANCE_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      employees.forEach(emp => {
        employeesStore.delete(emp.empId);
        attendanceStore.delete(emp.empId);
      });

      metadataStore.delete(`sync_${cluster}`);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  }
}

export const cacheService = CacheService.getInstance();

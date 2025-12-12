/**
 * MongoDB Service - Replacement for Firestore
 * 
 * This service provides the same API as firestore-service.ts
 * but connects to our self-hosted MongoDB backend
 */

'use client';

import { cacheService } from './cache-service';
import { firestoreTracker } from './firestore-tracker';
import type { Employee, AttendanceRecord } from '@/types/attendance';

// Storage keys for dynamic backend URL
const STORAGE_KEY_API_URL = 'markme_backend_api_url';
const STORAGE_KEY_SOCKET_URL = 'markme_backend_socket_url';
const STORAGE_KEY_API_KEY = 'markme_api_key';

// Default values (used if localStorage is empty)
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_MONGODB_API_URL || 'http://localhost:5000/api';
const DEFAULT_SOCKET_URL = process.env.NEXT_PUBLIC_MONGODB_SOCKET_URL || 'http://localhost:5000';
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'markme-secret-key-2024';

/**
 * Get the current backend API URL (from localStorage or default)
 */
export function getBackendUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  return localStorage.getItem(STORAGE_KEY_API_URL) || DEFAULT_API_URL;
}

/**
 * Get the current Socket URL (from localStorage or default)
 */
export function getSocketUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SOCKET_URL;
  return localStorage.getItem(STORAGE_KEY_SOCKET_URL) || DEFAULT_SOCKET_URL;
}

/**
 * Get the current API key (from localStorage or default)
 */
export function getApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_API_KEY;
  return localStorage.getItem(STORAGE_KEY_API_KEY) || DEFAULT_API_KEY;
}

/**
 * Set the backend URL (saves to localStorage)
 * @param url - The new backend URL (e.g., https://abc123.trycloudflare.com)
 */
export function setBackendUrl(url: string): void {
  if (typeof window === 'undefined') return;
  
  // Normalize URL - remove trailing slash
  let normalizedUrl = url.trim().replace(/\/$/, '');
  
  // If user enters base URL, derive both API and Socket URLs
  const apiUrl = normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
  const socketUrl = normalizedUrl.endsWith('/api') ? normalizedUrl.replace('/api', '') : normalizedUrl;
  
  localStorage.setItem(STORAGE_KEY_API_URL, apiUrl);
  localStorage.setItem(STORAGE_KEY_SOCKET_URL, socketUrl);
  
  console.log(`🔗 Backend URL updated: API=${apiUrl}, Socket=${socketUrl}`);
  
  // Mark that settings changed - socket will reconnect on next use
}

/**
 * Set the API key (saves to localStorage)
 */
export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
  console.log('🔑 API key updated');
  
  // Mark that settings changed - socket will reconnect on next use
}

/**
 * Get current backend configuration
 */
export function getBackendConfig(): { apiUrl: string; socketUrl: string; apiKey: string } {
  return {
    apiUrl: getBackendUrl(),
    socketUrl: getSocketUrl(),
    apiKey: getApiKey()
  };
}

// Socket connection (lazy loaded)
let socket: any = null;
let isConnected = false;
let currentSocketUrl: string = '';
let currentSocketApiKey: string = '';

// Connection state listeners
type ConnectionListener = (connected: boolean) => void;
const connectionListeners: Set<ConnectionListener> = new Set();

/**
 * Initialize Socket.io connection
 * Will reinitialize if URL or API key has changed
 */
async function initializeSocket(): Promise<any> {
  const newSocketUrl = getSocketUrl();
  const newApiKey = getApiKey();
  
  // Check if we need to reconnect due to URL/key change
  if (socket && (currentSocketUrl !== newSocketUrl || currentSocketApiKey !== newApiKey)) {
    console.log('🔄 Socket URL or API key changed, reconnecting...');
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
  
  if (socket) return socket;
  
  // Store current config
  currentSocketUrl = newSocketUrl;
  currentSocketApiKey = newApiKey;
  
  // Dynamic import for socket.io-client
  const { io } = await import('socket.io-client');
  
  console.log(`🔌 Connecting to socket at: ${newSocketUrl}`);
  
  socket = io(newSocketUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 10000,
    auth: {
      apiKey: newApiKey
    },
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('🔌 Connected to MongoDB backend via Socket.io');
    isConnected = true;
    connectionListeners.forEach(listener => listener(true));
  });
  
  socket.on('disconnect', (reason: string) => {
    console.log('🔌 Disconnected from MongoDB backend:', reason);
    isConnected = false;
    connectionListeners.forEach(listener => listener(false));
  });
  
  socket.on('connect_error', (error: Error) => {
    console.error('🔌 Socket connection error:', error.message);
    isConnected = false;
    connectionListeners.forEach(listener => listener(false));
  });
  
  socket.on('error', (error: Error) => {
    console.error('🔌 Socket error:', error.message);
  });
  
  return socket;
}

/**
 * Force reconnect socket (call this after changing URL/key)
 */
export async function reconnectSocket(): Promise<void> {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
  await initializeSocket();
}

/**
 * Add connection state listener
 */
export function onConnectionChange(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  // Immediately notify of current state
  listener(isConnected);
  
  return () => {
    connectionListeners.delete(listener);
  };
}

/**
 * Check if connected to backend
 */
export function isBackendConnected(): boolean {
  return isConnected;
}

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${getBackendUrl()}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================================================
// EMPLOYEE OPERATIONS
// ============================================================================

/**
 * Fetch all employees with stale-while-revalidate pattern
 * - Returns cached data immediately if available
 * - Always fetches fresh data in background
 * - Calls onFresh callback when fresh data arrives
 */
export async function fetchAllEmployees(
  forceRefresh = false,
  onFresh?: (employees: Employee[]) => void
): Promise<Employee[]> {
  // First, try to get cached data to return immediately
  let cachedData: Employee[] = [];
  const hasCache = await cacheService.hasAnyCachedData();
  
  if (hasCache) {
    cachedData = await cacheService.getAllCachedEmployees();
    if (cachedData.length > 0) {
      console.log('📦 [MongoDB] Returning cached employees immediately');
      firestoreTracker.trackRead('employees', 0, 'cache');
    }
  }
  
  // Always fetch fresh data (stale-while-revalidate pattern)
  const fetchFresh = async () => {
    try {
      console.log('🌐 [MongoDB] Fetching fresh employees from server...');
      const employees = await fetchAPI<Employee[]>('/employees');
      
      // Cache by cluster
      const clusterGroups = new Map<string, Employee[]>();
      employees.forEach(emp => {
        const list = clusterGroups.get(emp.cluster) || [];
        list.push(emp);
        clusterGroups.set(emp.cluster, list);
      });
      
      // Use Array.from for compatibility
      const entries = Array.from(clusterGroups.entries());
      for (let i = 0; i < entries.length; i++) {
        const [cluster, emps] = entries[i];
        await cacheService.cacheEmployees(emps, cluster);
        await cacheService.setLastSyncTime(cluster);
      }
      await cacheService.setLastSyncTime('all');
      
      firestoreTracker.trackRead('employees', employees.length, 'MongoDB API');
      
      // Notify caller of fresh data
      if (onFresh) {
        onFresh(employees);
      }
      
      return employees;
    } catch (error) {
      console.error('❌ [MongoDB] Failed to fetch fresh employees:', error);
      throw error;
    }
  };
  
  // If we have cached data, fetch fresh in background and return cached immediately
  if (cachedData.length > 0 && !forceRefresh) {
    // Fetch fresh data in background (don't await)
    fetchFresh().catch(err => console.error('Background fetch failed:', err));
    return cachedData;
  }
  
  // No cache or force refresh - must wait for fresh data
  return fetchFresh();
}

/**
 * Fetch employees by cluster with stale-while-revalidate pattern
 */
export async function fetchEmployeesByCluster(
  cluster: string,
  forceRefresh = false,
  onFresh?: (employees: Employee[]) => void
): Promise<Employee[]> {
  // First, try to get cached data
  let cachedData: Employee[] = [];
  cachedData = await cacheService.getCachedEmployeesByCluster(cluster);
  
  if (cachedData.length > 0) {
    console.log(`📦 [MongoDB] Returning cached employees for ${cluster} immediately`);
    firestoreTracker.trackRead('employees', 0, 'cache');
  }
  
  // Always fetch fresh data
  const fetchFresh = async () => {
    try {
      console.log(`🌐 [MongoDB] Fetching fresh employees for cluster: ${cluster}`);
      const employees = await fetchAPI<Employee[]>(`/employees/cluster/${encodeURIComponent(cluster)}`);
      
      await cacheService.cacheEmployees(employees, cluster);
      await cacheService.setLastSyncTime(cluster);
      firestoreTracker.trackRead('employees', employees.length, 'MongoDB API');
      
      if (onFresh) {
        onFresh(employees);
      }
      
      return employees;
    } catch (error) {
      console.error(`❌ [MongoDB] Failed to fetch fresh employees for ${cluster}:`, error);
      throw error;
    }
  };
  
  // If cached, return immediately and fetch fresh in background
  if (cachedData.length > 0 && !forceRefresh) {
    fetchFresh().catch(err => console.error('Background fetch failed:', err));
    return cachedData;
  }
  
  // No cache - must wait for fresh data
  return fetchFresh();
}

/**
 * Get single employee by ID
 */
export async function getEmployeeById(empId: string): Promise<Employee | null> {
  try {
    const employee = await fetchAPI<Employee>(`/employees/${encodeURIComponent(empId)}`);
    return employee;
  } catch {
    return null;
  }
}

// ============================================================================
// ATTENDANCE OPERATIONS
// ============================================================================

interface AttendanceAPIRecord extends AttendanceRecord {
  empId: string;
}

/**
 * Fetch all attendance records with stale-while-revalidate pattern
 */
export async function fetchAllAttendance(
  forceRefresh = false,
  onFresh?: (attendance: Map<string, AttendanceRecord>) => void
): Promise<Map<string, AttendanceRecord>> {
  // First, try to get cached data
  let cachedData = new Map<string, AttendanceRecord>();
  const employees = await cacheService.getAllCachedEmployeesWithAttendance();
  employees.forEach(emp => {
    if (emp.attendanceRecord) {
      cachedData.set(emp.empId, emp.attendanceRecord);
    }
  });
  
  if (cachedData.size > 0) {
    console.log('📦 [MongoDB] Returning cached attendance immediately');
    firestoreTracker.trackRead('attendance', 0, 'cache');
  }
  
  // Always fetch fresh data
  const fetchFresh = async () => {
    try {
      console.log('🌐 [MongoDB] Fetching fresh attendance from server...');
      const response = await fetchAPI<AttendanceAPIRecord[] | Record<string, AttendanceRecord>>('/attendance');
      
      const attendanceMap = new Map<string, AttendanceRecord>();
      
      // Handle both array and object response formats
      if (Array.isArray(response)) {
        response.forEach(record => {
          const { empId, ...attendanceData } = record;
          attendanceMap.set(empId, attendanceData);
        });
      } else {
        // Object format: { empId: record }
        Object.entries(response).forEach(([empId, record]) => {
          attendanceMap.set(empId, record);
        });
      }
      
      // Cache the attendance
      await cacheService.cacheAttendanceRecords(attendanceMap);
      await cacheService.setLastSyncTime('all_attendance');
      firestoreTracker.trackRead('attendance', attendanceMap.size, 'MongoDB API');
      
      if (onFresh) {
        onFresh(attendanceMap);
      }
      
      return attendanceMap;
    } catch (error) {
      console.error('❌ [MongoDB] Failed to fetch fresh attendance:', error);
      throw error;
    }
  };
  
  // If cached, return immediately and fetch fresh in background
  if (cachedData.size > 0 && !forceRefresh) {
    fetchFresh().catch(err => console.error('Background fetch failed:', err));
    return cachedData;
  }
  
  // No cache - must wait for fresh data
  return fetchFresh();
}

/**
 * Fetch attendance for specific employee IDs (batch)
 */
export async function fetchAttendanceByEmployeeIds(
  empIds: string[],
  forceRefresh = false
): Promise<Map<string, AttendanceRecord>> {
  // Try cache first
  if (!forceRefresh) {
    const cachedResults = new Map<string, AttendanceRecord>();
    let allCached = true;
    
    for (const empId of empIds) {
      const cached = await cacheService.getCachedAttendanceRecord(empId);
      if (cached) {
        cachedResults.set(empId, cached);
      } else {
        allCached = false;
      }
    }
    
    if (allCached && cachedResults.size > 0) {
      firestoreTracker.trackRead('attendance', 0, 'cache');
      console.log('📦 [MongoDB] Using cached batch attendance');
      return cachedResults;
    }
  }
  
  console.log(`🌐 [MongoDB] Fetching attendance for ${empIds.length} employees...`);
  const records = await fetchAPI<AttendanceAPIRecord[]>('/attendance/batch', {
    method: 'POST',
    body: JSON.stringify({ empIds })
  });
  
  const attendanceMap = new Map<string, AttendanceRecord>();
  records.forEach(record => {
    const { empId, ...attendanceData } = record;
    attendanceMap.set(empId, attendanceData);
  });
  
  // Cache results
  await cacheService.cacheAttendanceRecords(attendanceMap);
  firestoreTracker.trackRead('attendance', records.length, 'MongoDB API');
  
  return attendanceMap;
}

/**
 * Fetch attendance for a cluster with stale-while-revalidate pattern
 */
export async function fetchClusterAttendance(
  cluster: string,
  forceRefresh = false,
  onFresh?: (attendance: Map<string, AttendanceRecord>) => void
): Promise<Map<string, AttendanceRecord>> {
  // First, try to get cached data
  let cachedData = await cacheService.getCachedAttendanceByCluster(cluster);
  
  if (cachedData.size > 0) {
    console.log(`📦 [MongoDB] Returning cached attendance for ${cluster} immediately`);
    firestoreTracker.trackRead('attendance', 0, 'cache');
  }
  
  // Always fetch fresh data
  const fetchFresh = async () => {
    try {
      console.log(`🌐 [MongoDB] Fetching fresh attendance for cluster: ${cluster}`);
      const response = await fetchAPI<AttendanceAPIRecord[] | Record<string, AttendanceRecord>>(`/attendance/cluster/${encodeURIComponent(cluster)}`);
      
      const attendanceMap = new Map<string, AttendanceRecord>();
      
      // Handle both array and object responses for backward compatibility
      if (Array.isArray(response)) {
        response.forEach(record => {
          const { empId, ...attendanceData } = record;
          attendanceMap.set(empId, attendanceData);
        });
      } else {
        // Handle object format { empId: record }
        Object.entries(response).forEach(([empId, record]) => {
          attendanceMap.set(empId, record);
        });
      }
      
      // Cache results
      await cacheService.cacheAttendanceRecords(attendanceMap, cluster);
      await cacheService.setLastSyncTime(`attendance_${cluster}`);
      firestoreTracker.trackRead('attendance', attendanceMap.size, 'MongoDB API');
      
      if (onFresh) {
        onFresh(attendanceMap);
      }
      
      return attendanceMap;
    } catch (error) {
      console.error(`❌ [MongoDB] Failed to fetch fresh attendance for ${cluster}:`, error);
      throw error;
    }
  };
  
  // If cached, return immediately and fetch fresh in background
  if (cachedData.size > 0 && !forceRefresh) {
    fetchFresh().catch(err => console.error('Background fetch failed:', err));
    return cachedData;
  }
  
  // No cache - must wait for fresh data
  return fetchFresh();
}

/**
 * Get single employee's attendance
 */
export async function getAttendanceByEmpId(empId: string): Promise<AttendanceRecord | null> {
  try {
    const record = await fetchAPI<AttendanceAPIRecord>(`/attendance/${encodeURIComponent(empId)}`);
    const { empId: _, ...attendanceData } = record;
    return attendanceData;
  } catch {
    return null;
  }
}

/**
 * Save attendance record
 */
export async function saveAttendanceRecord(
  empId: string,
  data: AttendanceRecord,
  cluster?: string
): Promise<void> {
  console.log(`💾 [MongoDB] Saving attendance for ${empId} (cluster: ${cluster || 'unknown'})`);
  
  // Clean up undefined values in kidNames
  const cleanKidNames: { [key: string]: string } = {};
  if (data.kidNames) {
    Object.entries(data.kidNames).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleanKidNames[key] = value;
      }
    });
  }
  
  await fetchAPI(`/attendance/${encodeURIComponent(empId)}`, {
    method: 'POST',
    body: JSON.stringify({
      employee: data.employee || false,
      spouse: data.spouse || false,
      kid1: data.kid1 || false,
      kid2: data.kid2 || false,
      kid3: data.kid3 || false,
      kidNames: cleanKidNames,
      markedBy: data.markedBy || 'Kiosk',
      cluster: cluster || 'Unknown' // Include cluster for socket broadcast
    })
  });
  
  firestoreTracker.trackWrite('attendance', empId, 'MongoDB API');
  
  // Update local cache
  await cacheService.cacheAttendanceRecord(empId, data, cluster);
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

// Track active cluster subscriptions to avoid duplicate listeners
const activeClusterSubscriptions: Map<string, {
  listeners: Set<{
    onEmployees: (employees: Employee[]) => void;
    onAttendance: (attendance: Map<string, AttendanceRecord>) => void;
  }>;
  handler: ((data: any) => void) | null;
}> = new Map();

/**
 * Subscribe to cluster updates (employees + attendance)
 */
export function subscribeToCluster(
  cluster: string,
  onEmployees: (employees: Employee[]) => void,
  onAttendance: (attendance: Map<string, AttendanceRecord>) => void
): () => void {
  let sock: any = null;
  let unsubscribed = false;
  
  console.log(`📡 [MongoDB] Setting up subscription for cluster: ${cluster}`);
  
  // Get or create subscription tracking for this cluster
  let subInfo = activeClusterSubscriptions.get(cluster);
  if (!subInfo) {
    subInfo = { listeners: new Set(), handler: null };
    activeClusterSubscriptions.set(cluster, subInfo);
  }
  
  // Add this listener
  const listener = { onEmployees, onAttendance };
  subInfo.listeners.add(listener);
  console.log(`📡 [MongoDB] Added listener for cluster ${cluster}, total listeners: ${subInfo.listeners.size}`);
  
  // Initialize socket and set up subscriptions
  initializeSocket().then(s => {
    if (unsubscribed) {
      console.log(`📡 [MongoDB] Subscription cancelled before socket ready`);
      return;
    }
    sock = s;
    
    // Get current subInfo (may have been updated)
    const currentSubInfo = activeClusterSubscriptions.get(cluster);
    if (!currentSubInfo) return;
    
    // Only set up handler if not already set up for this cluster
    if (!currentSubInfo.handler) {
      // Join cluster room - use correct event name matching backend
      sock.emit('subscribeToCluster', cluster);
      console.log(`📡 [MongoDB] Joined cluster room: ${cluster}, socket ID: ${sock.id}`);
      
      // Create handler for this cluster
      const handleAttendanceUpdate = (data: {
        empId: string;
        attendance?: AttendanceAPIRecord;
        record?: AttendanceAPIRecord;
        cluster?: string;
      }) => {
        console.log(`📡 [MongoDB] Received attendanceUpdated event:`, { 
          empId: data.empId, 
          cluster: data.cluster,
          myCluster: cluster,
          hasAttendance: !!data.attendance || !!data.record
        });
        
        // Check cluster match (handle undefined cluster as well)
        if (!data.cluster || data.cluster === cluster) {
          console.log(`📡 [MongoDB] ✅ Cluster match! Refreshing attendance for ${currentSubInfo.listeners.size} listeners...`);
          firestoreTracker.trackListenerUpdate('attendance', 1, 'socket');
          // Refetch attendance for this cluster
          fetchClusterAttendance(cluster, true).then(attendanceMap => {
            // Notify ALL listeners for this cluster
            currentSubInfo.listeners.forEach(l => l.onAttendance(attendanceMap));
          });
        } else {
          console.log(`📡 [MongoDB] ⏭️ Skipping - different cluster`);
        }
      };
      
      sock.on('attendanceUpdated', handleAttendanceUpdate);
      currentSubInfo.handler = handleAttendanceUpdate;
      console.log(`📡 [MongoDB] Registered attendanceUpdated handler for cluster: ${cluster}`);
    } else {
      console.log(`📡 [MongoDB] Handler already exists for cluster: ${cluster}`);
    }
  }).catch(err => {
    console.error('📡 [MongoDB] Failed to setup subscription:', err);
  });
  
  // Initial fetch
  fetchEmployeesByCluster(cluster).then(onEmployees);
  fetchClusterAttendance(cluster).then(onAttendance);
  
  // Return unsubscribe function
  return () => {
    unsubscribed = true;
    const currentSubInfo = activeClusterSubscriptions.get(cluster);
    
    if (currentSubInfo) {
      currentSubInfo.listeners.delete(listener);
      console.log(`📡 [MongoDB] Removed listener for cluster ${cluster}, remaining: ${currentSubInfo.listeners.size}`);
      
      // If no more listeners, clean up completely
      if (currentSubInfo.listeners.size === 0) {
        if (sock && currentSubInfo.handler) {
          sock.emit('unsubscribeFromCluster', cluster);
          sock.off('attendanceUpdated', currentSubInfo.handler);
          console.log(`📡 [MongoDB] Fully unsubscribed from cluster: ${cluster}`);
        }
        activeClusterSubscriptions.delete(cluster);
      }
    }
  };
}

/**
 * Subscribe to all updates (for admin)
 * Uses singleton pattern to avoid duplicate listeners
 */
let adminSubscription: {
  listeners: Set<{
    onEmployees: (employees: Employee[]) => void;
    onAttendance: (attendance: Map<string, AttendanceRecord>) => void;
  }>;
  handler: ((data: any) => void) | null;
} | null = null;

export function subscribeToAll(
  onEmployees: (employees: Employee[]) => void,
  onAttendance: (attendance: Map<string, AttendanceRecord>) => void
): () => void {
  let sock: any = null;
  let unsubscribed = false;
  
  console.log(`📡 [MongoDB] Setting up admin subscription for all updates`);
  
  // Get or create admin subscription
  if (!adminSubscription) {
    adminSubscription = { listeners: new Set(), handler: null };
  }
  
  // Add this listener
  const listener = { onEmployees, onAttendance };
  adminSubscription.listeners.add(listener);
  console.log(`📡 [MongoDB] Added admin listener, total listeners: ${adminSubscription.listeners.size}`);
  
  // Initialize socket and set up subscriptions
  initializeSocket().then(s => {
    if (unsubscribed) {
      console.log(`📡 [MongoDB] Admin subscription cancelled before socket ready`);
      return;
    }
    sock = s;
    
    if (!adminSubscription) return;
    
    // Only set up handler if not already set up
    if (!adminSubscription.handler) {
      // Join admin room - use correct event name matching backend
      sock.emit('subscribeToAll');
      console.log(`📡 [MongoDB] Admin joined all updates room, socket ID: ${sock.id}`);
      
      // Listen for any attendance updates - use correct event name matching backend
      const handleAttendanceUpdate = (data: any) => {
        console.log(`📡 [MongoDB] Admin received attendanceUpdated event:`, { 
          empId: data?.empId,
          cluster: data?.cluster
        });
        firestoreTracker.trackListenerUpdate('attendance', 1, 'socket');
        
        if (!adminSubscription) return;
        
        // Refetch all data and notify all listeners
        fetchAllEmployees(true).then(employees => {
          adminSubscription?.listeners.forEach(l => l.onEmployees(employees));
        });
        fetchAllAttendance(true).then(attendance => {
          adminSubscription?.listeners.forEach(l => l.onAttendance(attendance));
        });
      };
      
      sock.on('attendanceUpdated', handleAttendanceUpdate);
      adminSubscription.handler = handleAttendanceUpdate;
      console.log(`📡 [MongoDB] Registered attendanceUpdated handler for admin`);
    } else {
      console.log(`📡 [MongoDB] Admin handler already exists`);
    }
  }).catch(err => {
    console.error('📡 [MongoDB] Failed to setup admin subscription:', err);
  });
  
  // Initial fetch
  fetchAllEmployees().then(onEmployees);
  fetchAllAttendance().then(onAttendance);
  
  // Return unsubscribe function
  return () => {
    unsubscribed = true;
    
    if (adminSubscription) {
      adminSubscription.listeners.delete(listener);
      console.log(`📡 [MongoDB] Removed admin listener, remaining: ${adminSubscription.listeners.size}`);
      
      // If no more listeners, clean up completely
      if (adminSubscription.listeners.size === 0) {
        if (sock && adminSubscription.handler) {
          sock.emit('unsubscribeFromAll');
          sock.off('attendanceUpdated', adminSubscription.handler);
          console.log('📡 [MongoDB] Admin fully unsubscribed');
        }
        adminSubscription = null;
      }
    }
  };
}

// ============================================================================
// STATISTICS
// ============================================================================

interface ClusterStat {
  cluster: string;
  totalEmployees: number;
  attendedCount: number;
}

interface OverviewStat {
  totalEmployees: number;
  totalAttended: number;
  employeeAttended: number;
  spouseAttended: number;
  childrenAttended: number;
}

/**
 * Get cluster statistics
 */
export async function getClusterStats(): Promise<ClusterStat[]> {
  return fetchAPI('/stats/clusters');
}

/**
 * Get overall statistics
 */
export async function getOverviewStats(): Promise<OverviewStat> {
  return fetchAPI('/stats/overview');
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Clear all caches and force refresh
 */
export async function forceSyncFromServer(): Promise<void> {
  console.log('🔄 [MongoDB] Force syncing from server...');
  await cacheService.clearCache();
}

/**
 * Disconnect socket
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

/**
 * Get backend health status
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${getBackendUrl()}/health`, {
      signal: controller.signal,
      headers: {
        'x-api-key': getApiKey()
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

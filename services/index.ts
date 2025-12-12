/**
 * Service Exports
 * 
 * Set USE_MONGODB to true to use the self-hosted MongoDB backend
 * Set USE_MONGODB to false to use Firebase/Firestore
 */

// Toggle this to switch between backends
export const USE_MONGODB = true;

// Export the appropriate service based on the backend choice
// Note: We keep both imports for reference, but components should use
// the mongodb-service directly when USE_MONGODB is true

// Original Firestore service (COMMENTED OUT - preserved for reference)
// export { FirestoreService, firestoreService } from './firestore-service';

// New MongoDB service (ACTIVE)
export * as mongodbService from './mongodb-service';

// Re-export MongoDB service functions for easy access
export {
  fetchAllEmployees,
  fetchEmployeesByCluster,
  getEmployeeById,
  fetchAllAttendance,
  fetchClusterAttendance,
  fetchAttendanceByEmployeeIds,
  getAttendanceByEmpId,
  saveAttendanceRecord,
  subscribeToCluster,
  subscribeToAll,
  getClusterStats,
  getOverviewStats,
  forceSyncFromServer,
  checkBackendHealth,
  onConnectionChange,
  isBackendConnected,
  disconnect
} from './mongodb-service';

export * from '@/types/attendance';
export * from '@/utils/cluster-utils';
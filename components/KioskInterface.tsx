'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, UserCheck, Clock, Filter, AlertTriangle, RefreshCw, CloudOff, Cloud, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// Using MongoDB service instead of Firestore
// import { firestoreService } from '@/services/firestore-service';
import { firestoreService } from '@/services/mongodb-wrapper';
import { cacheService } from '@/services/cache-service';
import { EmployeeWithAttendance } from '@/types/attendance';
import { filterEmployeesBySearch, getAttendanceStatusSummary } from '@/utils/cluster-utils';
import { useErrorHandler, isRetryableError } from '@/hooks/use-error-handler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KioskSkeleton } from '@/components/ui/skeleton-loader';
import ErrorBoundary from '@/components/ErrorBoundary';
import AttendanceModal from '@/components/AttendanceModal';

interface KioskInterfaceProps {
  // Remove the onEmployeeClick prop since we'll handle it internally
}

function KioskInterfaceContent({}: KioskInterfaceProps) {
  const { user } = useAuth();
  const { handleError, clearError, retryOperation, isError, errorMessage } = useErrorHandler();
  const [employees, setEmployees] = useState<EmployeeWithAttendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [recentlyUpdatedEmployees, setRecentlyUpdatedEmployees] = useState<Set<string>>(new Set());
  
  // Modal state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithAttendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sorting state
  type SortField = 'empId' | 'name' | 'eligibility' | 'status';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('empId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Ensure user is a kiosk user with cluster
  if (!user || user.role !== 'kiosk' || !user.cluster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 font-medium">Access denied</p>
          <p className="text-gray-500 text-sm">Kiosk access required</p>
        </div>
      </div>
    );
  }

  // Load employees for the user's cluster
  // AGGRESSIVE CACHING: Only fetch from Firestore on first load or manual sync
  // Real-time subscriptions handle live updates (no extra reads)
  useEffect(() => {
    let unsubscribeEmployees: (() => void) | null = null;
    let unsubscribeAttendance: (() => void) | null = null;
    let isMounted = true;

    const loadEmployees = async (forceSync: boolean = false) => {
      try {
        clearError();

        // STEP 1: Check cache first
        const cachedData = await cacheService.getCachedEmployeesWithAttendance(user.cluster!);
        const cachedSyncTime = await cacheService.getLastSyncTime(user.cluster!);
        
        // Show cached data immediately if available
        if (cachedData.length > 0 && !forceSync) {
          console.log(`⚡ CACHE HIT: Showing ${cachedData.length} cached employees immediately`);
          setEmployees(cachedData);
          setIsLoading(false);
          setIsUsingCache(true);
          if (cachedSyncTime) {
            setLastSyncTime(new Date(cachedSyncTime));
          }
        }

        // STEP 2: Always fetch fresh data (stale-while-revalidate pattern)
        console.log(`🔄 [SWR] Fetching fresh data in ${cachedData.length > 0 ? 'background' : 'foreground'}...`);
        setIsSyncing(true);
        
        // Fetch fresh data with onFresh callback for background updates
        const freshData = await firestoreService.getEmployeesWithAttendanceByCluster(
          user.cluster!, 
          { 
            useCache: false,
            onFresh: (data) => {
              // This callback fires when background fetch completes
              if (isMounted && !forceSync) {
                console.log(`🔄 [SWR] Fresh data received: ${data.length} employees`);
                setEmployees(data);
                setIsUsingCache(false);
                setLastSyncTime(new Date());
                setIsSyncing(false);
              }
            }
          }
        );
        
        // If we didn't have cached data, use the fresh data directly
        if (isMounted && (cachedData.length === 0 || forceSync)) {
          console.log(`☁️ Fresh data: ${freshData.length} employees from server`);
          setEmployees(freshData);
          setIsUsingCache(false);
          setLastSyncTime(new Date());
          await cacheService.setLastSyncTime(user.cluster!);
        }
        
        // Set up real-time listeners for live updates
        const loadedEmployeeIds = freshData.map(e => e.empId);
        setupRealtimeListeners(loadedEmployeeIds, isMounted);

      } catch (err) {
        handleError(err, {
          toastTitle: 'Loading Error',
          retryable: isRetryableError(err),
        });
      } finally {
        if (isMounted) {
          setIsSyncing(false);
          setIsLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    const setupRealtimeListeners = (employeeIds: string[], mounted: boolean) => {
      if (!mounted) return;

      // Real-time employee listener (for name/cluster changes - rare)
      unsubscribeEmployees = firestoreService.subscribeToClusterEmployees(
        user.cluster!,
        async (updatedEmployees) => {
          if (!mounted) return;
          try {
            setEmployees(prevEmployees => {
              const existingAttendance = new Map(
                prevEmployees.map(e => [e.empId, e.attendanceRecord])
              );
              return updatedEmployees.map(employee => ({
                ...employee,
                attendanceRecord: existingAttendance.get(employee.empId) || undefined
              }));
            });
            await cacheService.cacheEmployees(updatedEmployees, user.cluster!);
          } catch (error) {
            handleError(error, { toastTitle: 'Sync Error', showToast: false });
          }
        },
        (error) => {
          handleError(error, { toastTitle: 'Connection Error', showToast: isRetryableError(error) });
        }
      );

      // Real-time attendance listener - THIS is how updates appear instantly!
      unsubscribeAttendance = firestoreService.subscribeToClusterAttendance(
        user.cluster!,
        (attendanceRecords) => {
          console.log('🔴 Real-time attendance update received!');
          setEmployees(prevEmployees => 
            prevEmployees.map(employee => ({
              ...employee,
              attendanceRecord: attendanceRecords[employee.empId] || undefined
            }))
          );
        },
        employeeIds
      );
    };

    // Store loadEmployees for manual sync button
    (window as unknown as { manualSync: () => void }).manualSync = () => loadEmployees(true);

    loadEmployees(false);

    // Cleanup subscriptions
    return () => {
      isMounted = false;
      if (unsubscribeEmployees) unsubscribeEmployees();
      if (unsubscribeAttendance) unsubscribeAttendance();
    };
  }, [user.cluster, handleError, clearError]);

  // Manual sync function
  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    console.log('🔄 Manual sync triggered...');
    
    try {
      const freshData = await firestoreService.getEmployeesWithAttendanceByCluster(user.cluster!, { useCache: false });
      setEmployees(freshData);
      setIsUsingCache(false);
      setLastSyncTime(new Date());
      await cacheService.setLastSyncTime(user.cluster!);
      console.log(`✅ Manual sync complete: ${freshData.length} employees`);
    } catch (err) {
      handleError(err, { toastTitle: 'Sync Failed', retryable: true });
    } finally {
      setIsSyncing(false);
    }
  }, [user.cluster, handleError, isSyncing]);

  // Clear cache function
  const handleClearCache = useCallback(async () => {
    if (isSyncing) return;
    
    console.log('🗑️ Clearing cache...');
    try {
      await cacheService.clearClusterCache(user.cluster!);
      console.log('✅ Cache cleared, syncing fresh data...');
      await handleManualSync();
    } catch (err) {
      handleError(err, { toastTitle: 'Clear Cache Failed' });
    }
  }, [user.cluster, handleError, isSyncing, handleManualSync]);

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Auto-sync when network reconnects (for lost connection scenarios)
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network reconnected - auto-syncing...');
      handleManualSync();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [handleManualSync]);

  // Prevent accidental refresh - show confirmation dialog
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = 'Data updates automatically in real-time. Are you sure you want to refresh?';
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Set initial load to false after first render
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    const filtered = filterEmployeesBySearch(employees, searchTerm);
    
    // Sort the filtered employees
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'empId':
          comparison = (a.empId || '').localeCompare(b.empId || '');
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'eligibility':
          comparison = (a.eligibility || '').localeCompare(b.eligibility || '');
          break;
        case 'status':
          const statusA = getAttendanceStatusSummary(a).status;
          const statusB = getAttendanceStatusSummary(b).status;
          comparison = statusA.localeCompare(statusB);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [employees, searchTerm, sortField, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = employees.length;
    let headCount = 0;
    const present = employees.filter(emp => {
      const summary = getAttendanceStatusSummary(emp);
      headCount += summary.presentCount; // Add all present family members
      return summary.status === 'present';
    }).length;
    const pending = total - present;

    return { total, present, pending, headCount };
  }, [employees]);

  const getStatusIcon = (employee: EmployeeWithAttendance) => {
    const summary = getAttendanceStatusSummary(employee);
    switch (summary.status) {
      case 'present':
        return <UserCheck className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (employee: EmployeeWithAttendance) => {
    const summary = getAttendanceStatusSummary(employee);
    switch (summary.status) {
      case 'present':
        return `Present (${summary.presentCount}/${summary.totalPossibleMembers})`;
      default:
        return 'Pending';
    }
  };

  const getRowClassName = (employee: EmployeeWithAttendance) => {
    const summary = getAttendanceStatusSummary(employee);
    const isRecentlyUpdated = recentlyUpdatedEmployees.has(employee.empId);
    const baseClasses = 'border-b border-gray-100 transition-all duration-300 cursor-pointer';
    
    if (isRecentlyUpdated) {
      // Special styling for recently updated rows with enhanced animation
      return `${baseClasses} ${summary.status === 'present' 
        ? 'bg-green-100 border-green-300 shadow-md hover:bg-green-150' 
        : 'bg-blue-50 border-blue-200 shadow-sm hover:bg-blue-100'
      }`;
    }
    
    switch (summary.status) {
      case 'present':
        return `${baseClasses} bg-green-50 hover:bg-green-100`;
      default:
        return `${baseClasses} hover:bg-gray-50`;
    }
  };

  // Handle employee row click
  const handleEmployeeClick = (employee: EmployeeWithAttendance) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  // Handle attendance save with enhanced UI feedback
  const handleAttendanceSave = (updatedEmployee: EmployeeWithAttendance) => {
    // Update the employee in the local state to reflect changes immediately
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.empId === updatedEmployee.empId ? updatedEmployee : emp
      )
    );

    // Mark this employee as recently updated for special animation
    setRecentlyUpdatedEmployees(prev => new Set(prev).add(updatedEmployee.empId));
    
    // Remove the recently updated status after animation completes
    setTimeout(() => {
      setRecentlyUpdatedEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatedEmployee.empId);
        return newSet;
      });
    }, 2000);
  };

  // Retry function
  const handleRetry = async () => {
    setIsRetrying(true);
    await retryOperation(async () => {
      const employeesWithAttendance = await firestoreService.getEmployeesWithAttendanceByCluster(user.cluster!);
      setEmployees(employeesWithAttendance);
    }, {
      toastTitle: 'Retry Failed',
    });
    setIsRetrying(false);
  };

  if (isLoading && !isError) {
    return <KioskSkeleton />;
  }

  if (isError && employees.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {user.displayName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <p className="text-red-600 font-medium mb-2">Unable to load employee data</p>
                <p className="text-gray-600 text-sm">{errorMessage}</p>
              </div>
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                className="mt-4"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-6xl mx-auto mt-8"
    >
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {user.displayName}
              </CardTitle>
              {/* Sync status indicator */}
              {isSyncing ? (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Syncing...
                </Badge>
              ) : isUsingCache ? (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                  <CloudOff className="h-3 w-3 mr-1" />
                  Offline Mode
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  <Cloud className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                <Users className="h-4 w-4 mr-1" />
                {stats.total} Employees
              </Badge>
              <Badge variant="outline" className="text-sm text-green-700 border-green-200">
                <UserCheck className="h-4 w-4 mr-1" />
                {stats.present} Present
              </Badge>
              <Badge variant="outline" className="text-sm text-gray-600 border-gray-200">
                <Clock className="h-4 w-4 mr-1" />
                {stats.pending} Pending
              </Badge>
              <Badge variant="outline" className="text-sm text-blue-700 border-blue-200 bg-blue-50">
                <Users className="h-4 w-4 mr-1" />
                {stats.headCount} Head Count
              </Badge>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by employee ID or name..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sync Status Bar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isUsingCache && lastSyncTime && (
                <>
                  <CloudOff className="h-4 w-4" />
                  <span>
                    Using cached data • Last synced: {lastSyncTime.toLocaleTimeString()}
                  </span>
                </>
              )}
              {!isUsingCache && (
                <>
                  <Cloud className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Live data • Real-time updates active</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-xs"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isSyncing}
              className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> Data syncs automatically in real-time. Use "Sync Now" only if you suspect data is out of date.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-300 transition-colors"
                    onClick={() => handleSort('empId')}
                  >
                    <div className="flex items-center">
                      Employee ID
                      {getSortIcon('empId')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-300 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-300 transition-colors"
                    onClick={() => handleSort('eligibility')}
                  >
                    <div className="flex items-center">
                      Eligibility
                      {getSortIcon('eligibility')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-300 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center">
                      Attendance Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee, index) => (
                      <motion.tr
                        key={employee.empId}
                        initial={{ opacity: 1 }}
                        animate={
                          recentlyUpdatedEmployees.has(employee.empId) ? {
                            opacity: 1,
                            scale: [1, 1.02, 1],
                            backgroundColor: getAttendanceStatusSummary(employee).status === 'present' 
                              ? ['rgb(240, 253, 244)', 'rgb(187, 247, 208)', 'rgb(240, 253, 244)']
                              : ['rgb(239, 246, 255)', 'rgb(191, 219, 254)', 'rgb(239, 246, 255)'],
                            transition: {
                              duration: 1.5,
                              ease: "easeInOut"
                            }
                          } : { opacity: 1 }
                        }
                        className={getRowClassName(employee)}
                        onClick={() => handleEmployeeClick(employee)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {employee.empId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {employee.name || 'Unknown Employee'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span>{employee.eligibility || 'Not specified'}</span>
                            <span className="text-xs text-gray-400">
                              {employee.eligibleChildrenCount > 0 
                                ? `${employee.eligibleChildrenCount} eligible children`
                                : 'No eligible children'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.div
                            className="flex items-center justify-center space-x-2 p-3 -m-3 rounded-lg"
                            whileHover={{
                              scale: 1.05,
                              transition: { type: "spring", stiffness: 400, damping: 10 }
                            }}
                            whileTap={{
                              scale: 0.95,
                              transition: { type: "spring", stiffness: 600, damping: 15 }
                            }}
                          >
                            <motion.div
                              key={`${employee.empId}-icon-${getAttendanceStatusSummary(employee).status}`}
                              initial={{ scale: 0.8, rotate: -10 }}
                              animate={{
                                scale: 1,
                                rotate: 0,
                                transition: {
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 20
                                }
                              }}
                            >
                              {getStatusIcon(employee)}
                            </motion.div>
                            <motion.span
                              key={`${employee.empId}-text-${getAttendanceStatusSummary(employee).status}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 25,
                                  delay: 0.1
                                }
                              }}
                              className={`text-sm font-medium ${
                                getAttendanceStatusSummary(employee).status === 'present' 
                                  ? 'text-green-700' 
                                  : 'text-gray-500'
                              }`}
                            >
                              {getStatusText(employee)}
                            </motion.span>
                          </motion.div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm 
                          ? 'No employees found matching your search.' 
                          : employees.length === 0 
                            ? 'No employees available. This might be a data loading issue.'
                            : 'No employees available in your cluster.'
                        }
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredEmployees.length > 0 && searchTerm && (
            <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Modal */}
      <AttendanceModal
        employee={selectedEmployee}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleAttendanceSave}
      />
    </motion.div>
  );
}

// Export with error boundary
export default function KioskInterface(props: KioskInterfaceProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="max-w-6xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Kiosk Interface Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <p className="text-red-600 font-medium mb-2">Interface Error</p>
                  <p className="text-gray-600 text-sm">
                    The kiosk interface encountered an error. Please refresh the page or contact support.
                  </p>
                </div>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <KioskInterfaceContent {...props} />
    </ErrorBoundary>
  );
}
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Search, 
  MapPin, 
  TrendingUp,
  Activity,
  Building2,
  Eye,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Cloud,
  CloudOff,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
// Using MongoDB service instead of Firestore
// import { firestoreService } from '@/services/firestore-service';
import { firestoreService } from '@/services/mongodb-wrapper';
import { cacheService } from '@/services/cache-service';
import { EmployeeWithAttendance, ClusterStats, AttendanceRecord } from '@/types/attendance';
import { useErrorHandler, isRetryableError } from '@/hooks/use-error-handler';
import { DashboardSkeleton } from '@/components/ui/skeleton-loader';
import ErrorBoundary from '@/components/ErrorBoundary';

// Animated Counter Component
const AnimatedCounter = ({ value }: { value: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, scale: 0.8, y: 15 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25,
          duration: 0.3
        }
      }}
      whileHover={{
        scale: 1.1,
        transition: { type: "spring", stiffness: 500, damping: 15 }
      }}
    >
      {value}
    </motion.span>
  );
};

// Cluster Statistics Card Component
const ClusterStatsCard = ({ stats }: { stats: ClusterStats }) => {
  const attendanceRate = stats.totalMembers > 0 
    ? Math.round((stats.presentCount / stats.totalMembers) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      }}
      whileHover={{
        scale: 1.02,
        y: -2,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 15
        }
      }}
    >
      <Card className="overflow-hidden border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold">{stats.cluster}</span>
            </div>
            <Badge variant="outline" className="text-sm">
              {attendanceRate}% Present
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="flex flex-col items-center mb-1">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-xs text-gray-600">Total</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                <AnimatedCounter value={stats.totalMembers} />
              </div>
            </div>
            <div className="text-center">
              <div className="flex flex-col items-center mb-1">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600">Present</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                <AnimatedCounter value={stats.presentCount} />
              </div>
            </div>
            <div className="text-center">
              <div className="flex flex-col items-center mb-1">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-600">Pending</span>
              </div>
              <div className="text-xl font-bold text-orange-600">
                <AnimatedCounter value={stats.pendingCount} />
              </div>
            </div>
            <div className="text-center">
              <div className="flex flex-col items-center mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600">Heads</span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                <AnimatedCounter value={stats.headCount} />
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${attendanceRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Employee Row Component for the table
const EmployeeRow = ({ employee }: { employee: EmployeeWithAttendance }) => {
  const hasAttendance = employee.attendanceRecord && (
    employee.attendanceRecord.employee ||
    employee.attendanceRecord.spouse ||
    employee.attendanceRecord.kid1 ||
    employee.attendanceRecord.kid2 ||
    employee.attendanceRecord.kid3
  );

  const getAttendanceCount = (record?: AttendanceRecord): number => {
    if (!record) return 0;
    return [
      record.employee,
      record.spouse,
      record.kid1,
      record.kid2,
      record.kid3
    ].filter(Boolean).length;
  };

  const attendanceCount = getAttendanceCount(employee.attendanceRecord);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`border-b transition-colors hover:bg-gray-50 ${
        hasAttendance ? 'bg-green-50' : 'bg-gray-50'
      }`}
    >
      <TableCell className="font-medium">{employee.empId}</TableCell>
      <TableCell>{employee.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {employee.cluster}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={employee.eligibility === 'Eligible' ? 'default' : 'secondary'}>
          {employee.eligibility}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        {hasAttendance ? (
          <div className="flex items-center justify-center">
            <UserCheck className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-green-600 font-medium">{attendanceCount}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Clock className="h-4 w-4 text-orange-600 mr-1" />
            <span className="text-orange-600">Pending</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        {employee.attendanceRecord?.markedAt 
          ? new Date(employee.attendanceRecord.markedAt).toLocaleString()
          : '-'
        }
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        {employee.attendanceRecord?.markedBy || '-'}
      </TableCell>
    </motion.tr>
  );
};

// Main AdminDashboard Component
function AdminDashboardContent() {
  const { handleError, clearError, retryOperation, isError, errorMessage } = useErrorHandler();
  const [clusterStats, setClusterStats] = useState<ClusterStats[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeWithAttendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sorting state
  type SortField = 'empId' | 'name' | 'cluster' | 'eligibility' | 'status' | 'markedAt';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('empId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Cluster filter state
  const [clusterFilter, setClusterFilter] = useState<string>('all');

  // Helper function to calculate cluster stats from employees
  const calculateClusterStats = useCallback((employees: EmployeeWithAttendance[]): ClusterStats[] => {
    const clusterMap = new Map<string, EmployeeWithAttendance[]>();
    
    employees.forEach(emp => {
      const cluster = emp.cluster || 'Unknown';
      if (!clusterMap.has(cluster)) {
        clusterMap.set(cluster, []);
      }
      clusterMap.get(cluster)!.push(emp);
    });

    return Array.from(clusterMap.entries()).map(([cluster, emps]) => {
      let headCount = 0;
      const presentCount = emps.filter(emp => {
        if (emp.attendanceRecord) {
          // Count all present family members for head count
          if (emp.attendanceRecord.employee) headCount++;
          if (emp.attendanceRecord.spouse) headCount++;
          if (emp.attendanceRecord.kid1) headCount++;
          if (emp.attendanceRecord.kid2) headCount++;
          if (emp.attendanceRecord.kid3) headCount++;
          
          return emp.attendanceRecord.employee ||
            emp.attendanceRecord.spouse ||
            emp.attendanceRecord.kid1 ||
            emp.attendanceRecord.kid2 ||
            emp.attendanceRecord.kid3;
        }
        return false;
      }).length;

      return {
        cluster,
        totalMembers: emps.length,
        presentCount,
        pendingCount: emps.length - presentCount,
        headCount
      };
    });
  }, []);

  // AGGRESSIVE CACHING: Only fetch from Firestore on first load or manual sync
  useEffect(() => {
    let unsubscribeEmployees: (() => void) | null = null;
    let unsubscribeAttendance: (() => void) | null = null;
    let isMounted = true;

    const loadData = async (forceSync: boolean = false) => {
      try {
        clearError();

        // STEP 1: Check cache first
        const cachedEmployees = await cacheService.getAllCachedEmployeesWithAttendance();
        const cachedSyncTime = await cacheService.getLastSyncTime('admin');
        
        // Show cached data immediately if available
        if (cachedEmployees.length > 0 && !forceSync) {
          console.log(`⚡ CACHE HIT: Showing ${cachedEmployees.length} cached employees immediately`);
          setAllEmployees(cachedEmployees);
          setClusterStats(calculateClusterStats(cachedEmployees));
          setLoading(false);
          setIsUsingCache(true);
          if (cachedSyncTime) {
            setLastSyncTime(new Date(cachedSyncTime));
          }
        }

        // STEP 2: Always fetch fresh data (stale-while-revalidate pattern)
        console.log(`🔄 [SWR] Fetching fresh data in ${cachedEmployees.length > 0 ? 'background' : 'foreground'}...`);
        setIsSyncing(true);
        
        // Fetch fresh data with onFresh callback for background updates
        const employees = await firestoreService.getAllEmployeesWithAttendance({ 
          useCache: false,
          onFresh: (data) => {
            // This callback fires when background fetch completes
            if (isMounted && !forceSync) {
              console.log(`🔄 [SWR] Fresh data received: ${data.length} employees`);
              setAllEmployees(data);
              setClusterStats(calculateClusterStats(data));
              setIsUsingCache(false);
              setLastSyncTime(new Date());
              setIsSyncing(false);
            }
          }
        });
        
        // If we didn't have cached data, use the fresh data directly
        if (isMounted && (cachedEmployees.length === 0 || forceSync)) {
          console.log(`☁️ Fresh data: ${employees.length} employees from server`);
          setAllEmployees(employees);
          setClusterStats(calculateClusterStats(employees));
          setIsUsingCache(false);
          setLastSyncTime(new Date());
          await cacheService.setLastSyncTime('admin');
        }
        
        // Set up real-time listeners
        setupRealtimeListeners(isMounted);

      } catch (err) {
        handleError(err, {
          toastTitle: 'Dashboard Loading Error',
          retryable: isRetryableError(err),
        });
      } finally {
        if (isMounted) {
          setIsSyncing(false);
          setLoading(false);
        }
      }
    };

    const setupRealtimeListeners = (mounted: boolean) => {
      if (!mounted) return;

      // Real-time employee listener - just update state, no extra fetches!
      unsubscribeEmployees = firestoreService.subscribeToAllEmployees(
        (employees) => {
          if (!mounted) return;
          // Merge with existing attendance - no extra reads!
          setAllEmployees(prevEmployees => {
            const existingAttendance = new Map(
              prevEmployees.map(e => [e.empId, e.attendanceRecord])
            );
            const updatedEmployees = employees.map(emp => ({
              ...emp,
              attendanceRecord: existingAttendance.get(emp.empId)
            }));
            // Recalculate stats from updated data
            setClusterStats(calculateClusterStats(updatedEmployees));
            return updatedEmployees;
          });
        },
        (error) => {
          handleError(error, { toastTitle: 'Connection Error', showToast: isRetryableError(error) });
        }
      );

      // Real-time attendance subscription - THIS is how kiosk updates appear instantly!
      unsubscribeAttendance = firestoreService.subscribeToAllAttendance((attendanceRecords) => {
        if (!mounted) return;
        console.log('🔴 Real-time attendance update received!');
        
        // Update employees with new attendance data - no extra reads!
        setAllEmployees(prevEmployees => {
          const updatedEmployees = prevEmployees.map(emp => ({
            ...emp,
            attendanceRecord: attendanceRecords[emp.empId]
          }));
          // Recalculate stats
          setClusterStats(calculateClusterStats(updatedEmployees));
          return updatedEmployees;
        });
      });
    };

    loadData(false);

    // Cleanup subscriptions on unmount
    return () => {
      isMounted = false;
      if (unsubscribeEmployees) unsubscribeEmployees();
      if (unsubscribeAttendance) unsubscribeAttendance();
    };
  }, [handleError, clearError]);

  // Manual sync function
  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    console.log('🔄 Admin manual sync triggered...');
    
    try {
      const employees = await firestoreService.getAllEmployeesWithAttendance({ useCache: false });
      setAllEmployees(employees);
      setClusterStats(calculateClusterStats(employees));
      setIsUsingCache(false);
      setLastSyncTime(new Date());
      await cacheService.setLastSyncTime('admin');
      console.log(`✅ Admin manual sync complete: ${employees.length} employees`);
    } catch (err) {
      handleError(err, { toastTitle: 'Sync Failed', retryable: true });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, handleError, calculateClusterStats]);

  // Clear cache function
  const handleClearCache = useCallback(async () => {
    if (isSyncing) return;
    
    console.log('🗑️ Clearing all cache...');
    try {
      await cacheService.clearCache();
      console.log('✅ Cache cleared, syncing fresh data...');
      await handleManualSync();
    } catch (err) {
      handleError(err, { toastTitle: 'Clear Cache Failed' });
    }
  }, [handleError, isSyncing, handleManualSync]);

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

  // Get unique clusters for filter dropdown
  const uniqueClusters = useMemo(() => {
    const clusters = new Set(allEmployees.map(emp => emp.cluster || 'Unknown'));
    return Array.from(clusters).sort();
  }, [allEmployees]);

  // Filter employees based on search term and cluster filter
  const filteredEmployees = useMemo(() => {
    let filtered = allEmployees;
    
    // Apply cluster filter first
    if (clusterFilter !== 'all') {
      filtered = filtered.filter(employee => employee.cluster === clusterFilter);
    }
    
    // Then apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.name.toLowerCase().includes(lowerSearchTerm) ||
        employee.empId.toLowerCase().includes(lowerSearchTerm) ||
        employee.cluster.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
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
        case 'cluster':
          comparison = (a.cluster || '').localeCompare(b.cluster || '');
          break;
        case 'eligibility':
          comparison = (a.eligibility || '').localeCompare(b.eligibility || '');
          break;
        case 'status':
          const hasAttendanceA = a.attendanceRecord && (a.attendanceRecord.employee || a.attendanceRecord.spouse || a.attendanceRecord.kid1 || a.attendanceRecord.kid2 || a.attendanceRecord.kid3);
          const hasAttendanceB = b.attendanceRecord && (b.attendanceRecord.employee || b.attendanceRecord.spouse || b.attendanceRecord.kid1 || b.attendanceRecord.kid2 || b.attendanceRecord.kid3);
          comparison = (hasAttendanceA ? 1 : 0) - (hasAttendanceB ? 1 : 0);
          break;
        case 'markedAt':
          const timeA = a.attendanceRecord?.markedAt ? new Date(a.attendanceRecord.markedAt).getTime() : 0;
          const timeB = b.attendanceRecord?.markedAt ? new Date(b.attendanceRecord.markedAt).getTime() : 0;
          comparison = timeA - timeB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allEmployees, searchTerm, clusterFilter, sortField, sortDirection]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalEmployees = allEmployees.length;
    let totalHeadCount = 0;
    const totalPresent = allEmployees.filter(emp => {
      if (emp.attendanceRecord) {
        // Count all present family members for head count
        if (emp.attendanceRecord.employee) totalHeadCount++;
        if (emp.attendanceRecord.spouse) totalHeadCount++;
        if (emp.attendanceRecord.kid1) totalHeadCount++;
        if (emp.attendanceRecord.kid2) totalHeadCount++;
        if (emp.attendanceRecord.kid3) totalHeadCount++;
        
        return emp.attendanceRecord.employee ||
          emp.attendanceRecord.spouse ||
          emp.attendanceRecord.kid1 ||
          emp.attendanceRecord.kid2 ||
          emp.attendanceRecord.kid3;
      }
      return false;
    }).length;
    const totalPending = totalEmployees - totalPresent;

    return { totalEmployees, totalPresent, totalPending, totalHeadCount };
  }, [allEmployees]);

  // Retry function
  const handleRetry = async () => {
    setIsRetrying(true);
    await retryOperation(async () => {
      const [stats, employees] = await Promise.all([
        firestoreService.getClusterStats(),
        firestoreService.getAllEmployeesWithAttendance()
      ]);
      setClusterStats(stats);
      setAllEmployees(employees);
    }, {
      toastTitle: 'Retry Failed',
    });
    setIsRetrying(false);
  };

  if (loading && !isError) {
    return <DashboardSkeleton />;
  }

  if (isError && allEmployees.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">Dashboard Error</h2>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            {/* Sync status indicator */}
            {isSyncing ? (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </Badge>
            ) : isUsingCache ? (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                <CloudOff className="h-3 w-3 mr-1" />
                Cached Data
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                <Cloud className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
          <p className="text-gray-600">
            Real-time attendance monitoring across all locations
          </p>
          
          {/* Sync Status Bar */}
          <div className="flex items-center justify-center gap-4 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isUsingCache && lastSyncTime && (
                <>
                  <CloudOff className="h-4 w-4" />
                  <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
                </>
              )}
              {!isUsingCache && (
                <>
                  <Cloud className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Real-time updates active</span>
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
        </motion.div>

        {/* Overall Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Overall Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    <AnimatedCounter value={overallStats.totalEmployees} />
                  </div>
                  <p className="text-gray-600">Total Employees</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    <AnimatedCounter value={overallStats.totalPresent} />
                  </div>
                  <p className="text-green-600">Present</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    <AnimatedCounter value={overallStats.totalPending} />
                  </div>
                  <p className="text-orange-600">Pending</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    <AnimatedCounter value={overallStats.totalHeadCount} />
                  </div>
                  <p className="text-blue-600">Total Head Count</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cluster Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="mr-2 h-6 w-6 text-blue-600" />
            Cluster Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <AnimatePresence>
              {clusterStats.map((stats, index) => (
                <motion.div
                  key={stats.cluster}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <ClusterStatsCard stats={stats} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Employee Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center">
                  <Eye className="mr-2 h-5 w-5 text-blue-600" />
                  All Employees ({filteredEmployees.length})
                  {clusterFilter !== 'all' && (
                    <Badge variant="secondary" className="ml-2">
                      {clusterFilter}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {/* Cluster Filter Dropdown */}
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <select
                      value={clusterFilter}
                      onChange={(e) => setClusterFilter(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="all">All Clusters</option>
                      {uniqueClusters.map(cluster => (
                        <option key={cluster} value={cluster}>{cluster}</option>
                      ))}
                    </select>
                  </div>
                  {/* Search Input */}
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-56"
                    />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-100 sticky top-0 z-10">
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('empId')}
                      >
                        <div className="flex items-center">
                          Employee ID
                          {getSortIcon('empId')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {getSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('cluster')}
                      >
                        <div className="flex items-center">
                          Cluster
                          {getSortIcon('cluster')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('eligibility')}
                      >
                        <div className="flex items-center">
                          Eligibility
                          {getSortIcon('eligibility')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center justify-center">
                          Attendance
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('markedAt')}
                      >
                        <div className="flex items-center">
                          Marked At
                          {getSortIcon('markedAt')}
                        </div>
                      </TableHead>
                      <TableHead>Marked By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredEmployees.map((employee) => (
                        <EmployeeRow key={employee.empId} employee={employee} />
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
                
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm ? 'No employees found matching your search.' : 'No employees available.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}

// Export with error boundary
export default function AdminDashboard() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-red-700 mb-2">Dashboard Error</h2>
                <p className="text-red-600 mb-4">
                  The admin dashboard encountered an error. Please refresh the page or contact support.
                </p>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </ErrorBoundary>
  );
}
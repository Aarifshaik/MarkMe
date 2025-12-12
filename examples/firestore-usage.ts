/**
 * Example usage of the Firestore service for employee family attendance
 * This file demonstrates how to use the FirestoreService class
 */

import { firestoreService } from '@/services/firestore-service';
import { filterEmployeesByCluster, calculateClusterAttendanceStats } from '@/utils/cluster-utils';

// Example: Get employees for a specific cluster
async function getVijayawadaEmployees() {
  try {
    const employees = await firestoreService.getEmployeesByCluster('Vijayawada');
    console.log('Vijayawada employees:', employees);
    return employees;
  } catch (error) {
    console.error('Error fetching Vijayawada employees:', error);
  }
}

// Example: Mark attendance for an employee
async function markAttendanceExample() {
  try {
    const attendanceData = {
      employee: true,
      spouse: true,
      kid1: true,
      kid2: false,
      kid3: false,
      markedBy: 'vja_user1',
      kidNames: {
        kid1: 'John Jr.',
        kid2: 'Jane Jr.'
      }
    };

    await firestoreService.saveAttendanceRecord('EMP001', attendanceData);
    console.log('Attendance marked successfully');
  } catch (error) {
    console.error('Error marking attendance:', error);
  }
}

// Example: Subscribe to real-time updates for a cluster
function subscribeToClusterUpdates() {
  const unsubscribe = firestoreService.subscribeToClusterEmployees('Vijayawada', (employees) => {
    console.log('Real-time update - Vijayawada employees:', employees);
  });

  // Remember to unsubscribe when component unmounts
  // unsubscribe();
  
  return unsubscribe;
}

// Example: Get cluster statistics
async function getClusterStatistics() {
  try {
    const stats = await firestoreService.getClusterStats();
    console.log('Cluster statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching cluster stats:', error);
  }
}

// Example: Search employees in a cluster
async function searchEmployeesExample() {
  try {
    const searchResults = await firestoreService.searchEmployeesInCluster('Nellore', 'John');
    console.log('Search results:', searchResults);
    return searchResults;
  } catch (error) {
    console.error('Error searching employees:', error);
  }
}

// Example: Update employee children information
async function updateEmployeeChildrenExample() {
  try {
    const newKids = [
      { name: 'Updated Child 1', ageBracket: '5-10' },
      { name: 'Updated Child 2', ageBracket: '10-15' }
    ];

    await firestoreService.updateEmployeeChildren('EMP001', newKids);
    console.log('Employee children updated successfully');
  } catch (error) {
    console.error('Error updating employee children:', error);
  }
}

export {
  getVijayawadaEmployees,
  markAttendanceExample,
  subscribeToClusterUpdates,
  getClusterStatistics,
  searchEmployeesExample,
  updateEmployeeChildrenExample
};
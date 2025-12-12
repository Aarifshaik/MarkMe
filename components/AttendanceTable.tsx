'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Search, Download, Edit3, RotateCcw } from 'lucide-react';

// import { Users, UserCheck, UserX, Clock,  } from 'lucide-react';
import { useAttendanceStore } from '@/store/attendance-store';
import { exportAttendanceToExcel } from '@/utils/excel-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AttendanceTable() {
  const { students, markAttendance, resetSession } = useAttendanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

    // Calculate stats directly from students array to ensure reactivity
  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const pending = students.filter(s => !s.status).length;

    return { total, present, absent, pending };
  }, [students]);

  // Set initial load to false after first render
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;

    const term = searchTerm.toLowerCase();
    return students.filter(student =>
      student.regNo.toLowerCase().includes(term) ||
      (student.name && student.name.toLowerCase().includes(term))
    );
  }, [students, searchTerm]);

  const handleExport = () => {
    const fileName = `attendance_${new Date().toISOString().split('T')[0]}`;
    exportAttendanceToExcel(students, fileName);
  };

  const handleStatusToggle = (index: number, currentStatus: 'present' | 'absent' | null | undefined) => {
    if (!isEditing) return;

    // Find the original index in the full students array
    const student = filteredStudents[index];
    const originalIndex = students.findIndex(s => s.regNo === student.regNo);

    if (originalIndex === -1) return;

    // Toggle status: present -> absent, absent -> present, null/undefined -> present
    let newStatus: 'present' | 'absent';
    if (currentStatus === 'present') {
      newStatus = 'absent';
    } else {
      newStatus = 'present';
    }

    markAttendance(originalIndex, newStatus);
  };

  const handleResetSession = () => {
    if (passkey === 'Rafeeq@8297') {
      resetSession();
      setShowResetDialog(false);
      setPasskey('');
      setPasskeyError('');
    } else {
      setPasskeyError('Incorrect passkey. Please try again.');
    }
  };

  if (students.length === 0) return null;

  const getStatusIcon = (status: 'present' | 'absent' | null | undefined) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: 'present' | 'absent' | null | undefined) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      default: return 'Pending';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-4xl mx-auto mt-8"
    >
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Attendance
            </CardTitle>
            <div className="flex items-center space-x-2">
                <Button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center space-x-2 ${isEditing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                >
                <Edit3 className="h-4 w-4" />
                <span>{isEditing ? 'Done' : 'Edit'}</span>
                </Button>
              <Button
                onClick={() => setShowResetDialog(true)}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          {/* Edit Mode Hint */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Edit Mode:</strong> Click on any row to toggle status (Present ↔ Absent, Pending → Present)
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar */}
            <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by registration number or name..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-1000">
                    Registration No.
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-1000">
                    Name
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => (
                      <motion.tr
                        key={student.regNo}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        className={`border-b border-gray-100 transition-colors duration-200 ${isEditing ? 'cursor-pointer' : ''} ${student.status === 'present' ? 'bg-green-100 hover:bg-green-200' :
                          student.status === 'absent' ? 'bg-red-100 hover:bg-red-200' :
                            'hover:bg-gray-50'
                          }`}
                        onClick={() => handleStatusToggle(index, student.status)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {student.regNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.div
                            className="flex items-center justify-center space-x-2 p-3 -m-3 rounded-lg"
                            whileHover={isEditing ? {
                              scale: 1.05,
                              transition: { type: "spring", stiffness: 400, damping: 10 }
                            } : {}}
                            whileTap={isEditing ? {
                              scale: 0.95,
                              transition: { type: "spring", stiffness: 600, damping: 15 }
                            } : {}}
                          >
                            <motion.div
                              key={`${student.regNo}-icon-${student.status}`}
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
                              {getStatusIcon(student.status)}
                            </motion.div>
                            <motion.span
                              key={`${student.regNo}-text-${student.status}`}
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
                              className={`text-sm font-medium ${student.status === 'present' ? 'text-green-700' :
                                student.status === 'absent' ? 'text-red-700' :
                                  'text-gray-500'
                                }`}
                            >
                              {getStatusText(student.status)}
                            </motion.span>
                          </motion.div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? 'No students found matching your search.' : 'No students available.'}
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 && searchTerm && (
            <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          )}
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 25,
            delay: 0.4
          }
        }}
        whileHover={{
          scale: 1.01,
          transition: { type: "spring" as const, stiffness: 400, damping: 15 }
        }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Export Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  Download the attendance report as an Excel file with color-coded status.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.present} present, {stats.absent} absent, {stats.pending} pending
                </p>
              </div>

              <motion.div
                whileHover={{
                  scale: 1.05,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
                whileTap={{
                  scale: 0.95,
                  transition: { type: "spring" as const, stiffness: 600, damping: 15 }
                }}
              >
                <Button
                  onClick={handleExport}
                  className="bg-green-600 hover:bg-green-700 transition-colors duration-150"
                >
                  <motion.div
                    whileHover={{
                      y: -2,
                      transition: { type: "spring" as const, stiffness: 400, damping: 10 }
                    }}
                  >
                    <Download className="mr-2 h-5 w-5" />
                  </motion.div>
                  Download Excel
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reset Session Dialog */}
      <AnimatePresence>
        {showResetDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setShowResetDialog(false);
              setPasskey('');
              setPasskeyError('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reset Session</h3>
              <p className="text-gray-600 mb-4">
                This will clear all attendance data. Enter the passkey to confirm.
              </p>
              <Input
                type="password"
                placeholder="Enter passkey..."
                value={passkey}
                onChange={(e) => {
                  setPasskey(e.target.value);
                  setPasskeyError('');
                }}
                className="mb-2"
              />
              {passkeyError && (
                <p className="text-red-500 text-sm mb-4">{passkeyError}</p>
              )}
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  // className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setShowResetDialog(false);
                    setPasskey('');
                    setPasskeyError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleResetSession}
                >
                  Reset
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
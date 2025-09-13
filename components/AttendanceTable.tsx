'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Search, Edit3 } from 'lucide-react';
import { useAttendanceStore } from '@/store/attendance-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AttendanceTable() {
  const { students, markAttendance, endTime, isActive } = useAttendanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Set initial load to false after first render
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Check if attendance is completed (session ended or all students marked)
  const canEdit = useMemo(() => {
    return endTime || (!isActive && students.some(s => s.status));
  }, [endTime, isActive, students]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;

    const term = searchTerm.toLowerCase();
    return students.filter(student =>
      student.regNo.toLowerCase().includes(term) ||
      (student.name && student.name.toLowerCase().includes(term))
    );
  }, [students, searchTerm]);

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

  const getRowClassName = (status: 'present' | 'absent' | null | undefined) => {
    let baseClasses = 'border-b border-gray-100 transition-all duration-300';

    if (status === 'present') {
      baseClasses += ' bg-green-100';
    } else if (status === 'absent') {
      baseClasses += ' bg-red-100';
    } else {
      baseClasses += ' hover:bg-gray-50';
    }

    if (isEditing && status) {
      baseClasses += ' hover:bg-opacity-70 cursor-pointer';
    }

    return baseClasses;
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
              Live Attendance
            </CardTitle>
            {canEdit && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>{isEditing ? 'Done Editing' : 'Edit Attendance'}</span>
                </Button>
              </motion.div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by registration number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Edit Mode Disclaimer - Only show when editing, no reserved space */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  transition: { duration: 0.15 }
                }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Edit Mode:</strong> Click on any status to toggle between Present and Absent
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden">
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
                    <div className="flex flex-col items-center justify-center min-h-[3rem]">
                      <span>Status</span>
                      <div className="h-4 flex items-center">
                        <AnimatePresence>
                          {isEditing && (
                            <motion.span
                              initial={{ opacity: 0, y: -5 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                transition: { duration: 0.2 }
                              }}
                              exit={{
                                opacity: 0,
                                y: -5,
                                transition: { duration: 0.15 }
                              }}
                              className="text-xs text-blue-600 whitespace-nowrap"
                            >
                              (Click to edit)
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => (
                      <motion.tr
                        key={student.regNo}
                        initial={isInitialLoad ? { opacity: 0, x: -10 } : false}
                        animate={isInitialLoad ? {
                          opacity: 1,
                          x: 0,
                          transition: {
                            delay: index * 0.02,
                            duration: 0.3,
                            ease: "easeOut"
                          }
                        } : {}}
                        className={`border-b border-gray-100 transition-colors duration-200 ${student.status === 'present' ? 'bg-green-100 hover:bg-green-200' :
                          student.status === 'absent' ? 'bg-red-100 hover:bg-red-200' :
                            'hover:bg-gray-50'
                          } ${isEditing && student.status ? 'cursor-pointer' : ''}`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {student.regNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.div
                            className={`flex items-center justify-center space-x-2 p-3 -m-3 rounded-lg ${isEditing && student.status ? 'cursor-pointer' : ''}`}
                            onClick={() => handleStatusToggle(index, student.status)}
                            whileHover={isEditing && student.status ? {
                              scale: 1.05,
                              transition: { type: "spring", stiffness: 400, damping: 10 }
                            } : {}}
                            whileTap={isEditing && student.status ? {
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
    </motion.div>
  );
}
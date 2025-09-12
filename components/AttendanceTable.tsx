'use client';

import { useState, useMemo } from 'react';
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
      baseClasses += ' bg-green-50';
    } else if (status === 'absent') {
      baseClasses += ' bg-red-50';
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
      transition={{ delay: 0.3, duration: 0.5 }}
      className="max-w-4xl mx-auto mt-8"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Live Attendance
            </CardTitle>
            {canEdit && (
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "default" : "outline"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>{isEditing ? 'Done Editing' : 'Edit Attendance'}</span>
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by registration number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isEditing && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Edit Mode:</strong> Click on any status to toggle between Present and Absent
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Registration No.
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Status {isEditing && <span className="text-xs text-blue-600">(Click to edit)</span>}
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => (
                      <motion.tr
                        key={student.regNo}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className={getRowClassName(student.status)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {student.regNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.div
                            key={student.status}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex items-center justify-center space-x-2 ${isEditing && student.status ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                              }`}
                            onClick={() => handleStatusToggle(index, student.status)}
                          >
                            {getStatusIcon(student.status)}
                            <span className={`text-sm font-medium ${student.status === 'present' ? 'text-green-700' :
                                student.status === 'absent' ? 'text-red-700' :
                                  'text-gray-500'
                              }`}>
                              {getStatusText(student.status)}
                            </span>
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
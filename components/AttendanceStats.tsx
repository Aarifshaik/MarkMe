'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Clock, Download } from 'lucide-react';
import { useAttendanceStore } from '@/store/attendance-store';
import { exportAttendanceToExcel } from '@/utils/excel-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Animated Counter Component for smooth number transitions
const AnimatedCounter = ({ value }: { value: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {value}
    </motion.span>
  );
};

export default function AttendanceStats() {
  const { students, isActive, endTime } = useAttendanceStore();

  // Calculate stats directly from students array to ensure reactivity
  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const pending = students.filter(s => !s.status).length;

    return { total, present, absent, pending };
  }, [students]);

  const handleExport = () => {
    const fileName = `attendance_${new Date().toISOString().split('T')[0]}`;
    exportAttendanceToExcel(students, fileName);
  };

  if (students.length === 0) return null;

  const statCards = [
    {
      title: 'Total Students',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Present',
      value: stats.present,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Absent',
      value: stats.absent,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card>
              <CardContent className={`p-6 ${stat.bgColor}`}>
                <div className="flex items-center">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      <AnimatedCounter value={stat.value} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      {/* <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Session Progress</h3>
              <span className="text-sm text-gray-500">
                <AnimatedCounter value={stats.total - stats.pending} /> of <AnimatedCounter value={stats.total} /> completed
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${stats.total > 0 ? ((stats.total - stats.pending) / stats.total) * 100 : 0}%`
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-blue-600 h-3 rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Export Section */}
      {(endTime || (!isActive && stats.present + stats.absent > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                Export Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">
                    Download the attendance report as an Excel file with color-coded status.
                  </p>
                  {endTime && (
                    <p className="text-sm text-gray-500 mt-1">
                      Session completed at {new Date(endTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleExport}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
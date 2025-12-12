'use client';

import { useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Users, UserCheck, UserX, Clock, Download } from 'lucide-react';
import { useAttendanceStore } from '@/store/attendance-store';
// import { exportAttendanceToExcel } from '@/utils/excel-utils';
// import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Optimized Animated Counter Component with spring physics
const AnimatedCounter = ({ value }: { value: number }) => {
  const spring = useSpring(value, {
    stiffness: 300,
    damping: 30,
    restDelta: 0.001
  });
  const display = useTransform(spring, (latest) => Math.round(latest));

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, scale: 0.8, y: 15 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: "spring" as const,
          stiffness: 400,
          damping: 25,
          duration: 0.3
        }
      }}
      whileHover={{
        scale: 1.1,
        transition: { type: "spring" as const, stiffness: 500, damping: 15 }
      }}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
};

export default function AttendanceStats() {
  const students = useAttendanceStore((state) => state.students);
  const isActive = useAttendanceStore((state) => state.isActive);
  const endTime = useAttendanceStore((state) => state.endTime);

  // Calculate stats directly from students array to ensure reactivity
  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const pending = students.filter(s => !s.status).length;

    return { total, present, absent, pending };
  }, [students]);

  // const handleExport = () => {
  //   const fileName = `attendance_${new Date().toISOString().split('T')[0]}`;
  //   exportAttendanceToExcel(students, fileName);
  // };

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

  // Optimized animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25
      }
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 15
      }
    }
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Statistics Cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={cardVariants}
              whileHover="hover"
              whileTap={{
                scale: 0.98,
                transition: { type: "spring" as const, stiffness: 600, damping: 15 }
              }}
            >
              <Card className="overflow-hidden">
                <CardContent className={`p-6 ${stat.bgColor} relative`}>
                  <motion.div
                    className="flex items-center"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{
                      x: 0,
                      opacity: 1,
                      transition: {
                        delay: index * 0.05,
                        type: "spring" as const,
                        stiffness: 300
                      }
                    }}
                  >
                    <motion.div
                      whileHover={{
                        rotate: 360,
                        scale: 1.1,
                        transition: {
                          type: "spring" as const,
                          stiffness: 400,
                          damping: 15,
                          duration: 0.6
                        }
                      }}
                    >
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </motion.div>
                    <div className="ml-4">
                      <motion.p
                        className="text-sm font-medium text-gray-600"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          transition: { delay: index * 0.05 + 0.1 }
                        }}
                      >
                        {stat.title}
                      </motion.p>
                      <motion.p
                        className="text-2xl font-bold text-gray-900"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          transition: {
                            delay: index * 0.05 + 0.2,
                            type: "spring" as const,
                            stiffness: 400,
                            damping: 20
                          }
                        }}
                      >
                        <AnimatedCounter value={stat.value} />
                      </motion.p>
                    </div>
                  </motion.div>

                  {/* Subtle background animation */}
                  <motion.div
                    className="absolute inset-0 opacity-10"
                    animate={{
                      background: [
                        `radial-gradient(circle at 0% 0%, ${stat.color.replace('text-', 'rgb(')} 0%, transparent 50%)`,
                        `radial-gradient(circle at 100% 100%, ${stat.color.replace('text-', 'rgb(')} 0%, transparent 50%)`,
                        `radial-gradient(circle at 0% 0%, ${stat.color.replace('text-', 'rgb(')} 0%, transparent 50%)`
                      ]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

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
        
      </motion.div>
    </>
  );
}
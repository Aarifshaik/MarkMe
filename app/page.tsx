'use client';

import { useAttendanceStore } from '@/store/attendance-store';
import FileUpload from '@/components/FileUpload';
import AttendanceSession from '@/components/AttendanceSession';
import AttendanceTable from '@/components/AttendanceTable';
import AttendanceStats from '@/components/AttendanceStats';
import { Toaster } from 'sonner';
import Footer from '@/components/Footer';

export default function Home() {
  // const { students, resetSession, isActive } = useAttendanceStore();
  const { students } = useAttendanceStore();

  // const handleReset = () => {
  //   if (window.confirm('Are you sure you want to reset the session? All progress will be lost.')) {
  //     resetSession();
  //   }
  // };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {students.length === 0 ? (
          <FileUpload />
        ) : (
          <div className="space-y-8">
            {/* Attendance Session Control Card */}
            {/* <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        Classroom Attendance Session
                      </h1>
                      <p className="text-gray-600 mt-1">
                        {students.length} students loaded
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="flex items-center"
                        disabled={isActive}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Session
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div> */}

            {/* Main Content */}
            <AttendanceSession />
            <AttendanceStats />
            <AttendanceTable />
          </div>
        )}

      </div>

      <Toaster
        position="top-right"
        richColors
        closeButton
      />
      <Footer />
    </main>

  );
}
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, CheckCircle } from 'lucide-react';
import { useAttendanceStore } from '@/store/attendance-store';
import { useKeyboard } from '@/hooks/use-keyboard';
import { RotateCcw } from 'lucide-react';
import { TTSManager } from '@/utils/tts-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AttendanceSession() {
  const {
    students,
    currentIndex,
    isActive,
    isPaused,
    startSession,
    endSession,
    nextStudent,
    previousStudent,
    markAttendance,
    setCurrentIndex,
    resetSession
  } = useAttendanceStore();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);
  const [ttsManager, setTtsManager] = useState<TTSManager | null>(null);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the session? All progress will be lost.')) {
      resetSession();
    }
  };

  const handlePause = () => {
    // Immediately stop any ongoing speech
    if (ttsManager) {
      ttsManager.stop();
    }
    setIsSpeaking(false);
    setRepeatCount(0);
    endSession();
  };

  // Initialize TTS manager on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTtsManager(new TTSManager());
    }
  }, []);

  const currentStudent = students[currentIndex];

  // Check if all students are completed
  const allStudentsCompleted = useMemo(() => {
    return students.length > 0 && students.every(student => student.status);
  }, [students]);

  // Keyboard handlers
  useKeyboard({
    onEnter: () => !allStudentsCompleted && handleMarkAttendance('present'),
    onShift: () => !allStudentsCompleted && handleMarkAttendance('absent'),
    onEscape: () => isActive ? handlePause : null,
    onArrowLeft: () => !allStudentsCompleted && previousStudent(),
    onArrowRight: () => !allStudentsCompleted && nextStudent(),
    onSpace: () => !allStudentsCompleted && speakCurrentStudent()
    // },isActive);
  });

  const handleMarkAttendance = async (status: 'present' | 'absent') => {
    if (!currentStudent || currentStudent.status) return;

    markAttendance(currentIndex, status);
    setRepeatCount(0);

    // Move to next unmarked student after a brief delay
    setTimeout(() => {
      // First, look for unmarked students after current index
      let nextUnmarkedIndex = students.findIndex(
        (student, index) => index > currentIndex && !student.status
      );

      // If no unmarked students after current index, look from the beginning
      if (nextUnmarkedIndex === -1) {
        nextUnmarkedIndex = students.findIndex(
          (student, index) => index < currentIndex && !student.status
        );
      }

      if (nextUnmarkedIndex !== -1) {
        setCurrentIndex(nextUnmarkedIndex);
      } else {
        // All students marked, end session
        endSession();
      }
    }, 800);
  };

  const speakCurrentStudent = async () => {
    if (!currentStudent || isSpeaking || !ttsManager) return;

    setIsSpeaking(true);
    try {
      const text = `Registration number ${currentStudent.regNo}`;
      await ttsManager.speak(text, { rate: 0.9 });
      setRepeatCount(prev => prev + 1);
    } catch (error) {
      console.error('TTS Error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Auto-speak when student changes
  useEffect(() => {
    if (isActive && !isPaused && currentStudent && !currentStudent.status && ttsManager) {
      const timer = setTimeout(() => {
        speakCurrentStudent();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isActive, isPaused, ttsManager]);

  // Auto-repeat after timeout
  useEffect(() => {
    if (!isActive || isPaused || !currentStudent || currentStudent.status || isSpeaking || !ttsManager) return;

    const timer = setTimeout(() => {
      if (repeatCount < 3) {
        speakCurrentStudent();
      } else {
        // Auto-mark as absent after 3 repeats
        handleMarkAttendance('absent');
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [repeatCount, isActive, isPaused, isSpeaking, ttsManager]);

  // Auto-navigate to unmarked students when current student is already marked
  useEffect(() => {
    if (!isActive || !currentStudent?.status) return;

    // If current student is already marked, find next unmarked student
    const timer = setTimeout(() => {
      // First, look for unmarked students after current index
      let nextUnmarkedIndex = students.findIndex(
        (student, index) => index > currentIndex && !student.status
      );

      // If no unmarked students after current index, look from the beginning
      if (nextUnmarkedIndex === -1) {
        nextUnmarkedIndex = students.findIndex(
          (student, index) => index < currentIndex && !student.status
        );
      }

      if (nextUnmarkedIndex !== -1) {
        setCurrentIndex(nextUnmarkedIndex);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentStudent?.status, isActive, currentIndex, students]);

  if (students.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Control Panel */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!isActive ? (
                <div className="flex items-center space-x-4">
                  <Button onClick={startSession} size="lg" className="bg-green-600 hover:bg-green-700">
                    <Play className="mr-2 h-5 w-5" />
                    Start Session
                  </Button>

                  <Button
                    onClick={handleReset}
                    size="lg"
                    variant="destructive"
                    disabled={isActive}
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Reset Session
                  </Button>
                </div>
              ) : (
                <Button onClick={handlePause} size="lg" variant="outline">
                  <Pause className="mr-2 h-5 w-5" />
                  Pause Session
                </Button>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">
                Student {currentIndex + 1} of {students.length}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={previousStudent}
                  disabled={currentIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={nextStudent}
                  disabled={currentIndex === students.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Student Display or Completion Card */}
      <AnimatePresence mode="wait">
        {allStudentsCompleted ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-center"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <CardContent className="p-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="space-y-4"
                >
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 border-4 border-green-300"
                  >
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </motion.div>

                  <div>
                    <h2 className="text-3xl font-bold text-green-800 mb-2">
                      Attendance Completed!
                    </h2>
                    <p className="text-lg text-green-700">
                      All {students.length} students have been marked
                    </p>
                    
                    <p className="text-lg text-orange-400 font-bold">
                       Don't forget to Download
                    </p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center space-x-4 pt-4"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">
                        {students.filter(s => s.status === 'present').length}
                      </div>
                      <div className="text-sm text-green-600">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {students.filter(s => s.status === 'absent').length}
                      </div>
                      <div className="text-sm text-red-500">Absent</div>
                    </div>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-center"
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-12">
                <motion.div
                  animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.6, repeat: isSpeaking ? Infinity : 0 }}
                  className="space-y-6"
                >
                  <div>
                    <p className="text-lg text-gray-600 mb-2">Current Student</p>
                    <h2 className="text-6xl font-bold text-gray-900 tracking-tight">
                      {currentStudent?.regNo}
                    </h2>
                    {currentStudent?.name && (
                      <p className="text-2xl text-gray-600 mt-4">{currentStudent.name}</p>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <AnimatePresence>
                    {currentStudent?.status ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${currentStudent.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {currentStudent.status === 'present' ? '✓ Present' : '✗ Absent'}
                      </motion.div>
                    ) : (
                      <motion.div className="space-y-4">
                        <div className="flex justify-center space-x-4">
                          <Button
                            onClick={() => handleMarkAttendance('present')}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
                          >
                            Present (Enter)
                          </Button>
                          <Button
                            onClick={() => handleMarkAttendance('absent')}
                            size="lg"
                            variant="destructive"
                            className="px-8 py-4 text-lg"
                          >
                            Absent (Shift)
                          </Button>
                        </div>

                        <Button
                          onClick={speakCurrentStudent}
                          variant="outline"
                          size="lg"
                          disabled={isSpeaking}
                          className="px-6 py-3"
                        >
                          <Volume2 className="mr-2 h-5 w-5" />
                          {isSpeaking ? 'Speaking...' : 'Repeat (Space)'}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {repeatCount > 0 && !currentStudent?.status && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-orange-600"
                    >
                      Called {repeatCount} time{repeatCount > 1 ? 's' : ''}
                      {repeatCount >= 3 && ' - Auto-marking absent soon...'}
                    </motion.p>
                  )}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      {isActive && !allStudentsCompleted && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex justify-center space-x-8 text-sm text-gray-600">
              <span><kbd className="px-2 py-1 bg-white rounded border">Enter</kbd> Present</span>
              <span><kbd className="px-2 py-1 bg-white rounded border">Shift</kbd> Absent</span>
              <span><kbd className="px-2 py-1 bg-white rounded border">Space</kbd> Repeat</span>
              <span><kbd className="px-2 py-1 bg-white rounded border">Esc</kbd> Pause</span>
              <span><kbd className="px-2 py-1 bg-white rounded border">←/→</kbd> Navigate</span>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
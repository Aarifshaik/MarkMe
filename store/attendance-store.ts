import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { Student, AttendanceSession, AttendanceStats } from '@/types/attendance';

interface AttendanceStore extends AttendanceSession {
  // Actions
  setStudents: (students: Student[]) => void;
  setCurrentIndex: (index: number) => void;
  markAttendance: (index: number, status: 'present' | 'absent') => void;
  nextStudent: () => void;
  previousStudent: () => void;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  resetSession: () => void;
  getStats: () => AttendanceStats;
}

export const useAttendanceStore = create<AttendanceStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        students: [],
        currentIndex: 0,
        isActive: false,
        isPaused: false,
        startTime: null,
        endTime: null,

        setStudents: (students) => set({ students, currentIndex: 0 }),
        
        setCurrentIndex: (index) => set({ currentIndex: index }),
        
        markAttendance: (index, status) => set((state) => ({
          students: state.students.map((student, i) => 
            i === index ? { ...student, status } : student
          )
        })),
        
        nextStudent: () => set((state) => ({
          currentIndex: Math.min(state.currentIndex + 1, state.students.length - 1)
        })),
        
        previousStudent: () => set((state) => ({
          currentIndex: Math.max(state.currentIndex - 1, 0)
        })),
        
        startSession: () => set({ 
          isActive: true, 
          isPaused: false, 
          startTime: new Date(),
          endTime: null 
        }),
        
        pauseSession: () => set({ isPaused: true }),
        
        resumeSession: () => set({ isPaused: false }),
        
        endSession: () => set({ 
          isActive: false, 
          isPaused: false, 
          endTime: new Date() 
        }),
        
        resetSession: () => set({
          students: [],
          currentIndex: 0,
          isActive: false,
          isPaused: false,
          startTime: null,
          endTime: null
        }),
        
        getStats: () => {
          const { students } = get();
          const total = students.length;
          const present = students.filter(s => s.status === 'present').length;
          const absent = students.filter(s => s.status === 'absent').length;
          const pending = students.filter(s => !s.status).length;
          
          return { total, present, absent, pending };
        }
      }),
      {
        name: 'attendance-session',
        partialize: (state) => ({
          students: state.students,
          currentIndex: state.currentIndex,
          startTime: state.startTime
        })
      }
    )
  )
);
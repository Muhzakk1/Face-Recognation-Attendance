import { Student, AttendanceRecord, ClassGroup } from '../types';
import { STORAGE_KEYS, MOCK_CLASSES } from '../constants';

// Helper to simulate delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const storageService = {
  // Students
  getStudents: (): Student[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  },

  saveStudent: async (student: Student): Promise<void> => {
    await delay(300); // Simulate network
    const students = storageService.getStudents();
    // Check if exists
    const index = students.findIndex((s) => s.id === student.id);
    if (index >= 0) {
      students[index] = student;
    } else {
      students.push(student);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  deleteStudent: async (id: string): Promise<void> => {
    await delay(300);
    // Fix: Convert to String to ensure robust comparison vs numbers/strings
    const students = storageService.getStudents().filter((s) => String(s.id) !== String(id));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  // Attendance
  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },

  recordAttendance: async (record: AttendanceRecord): Promise<void> => {
    // Basic backend logic: prevent double attendance within 5 minutes
    const allRecords = storageService.getAttendance();
    const recent = allRecords.find(
      (r) => 
        r.studentId === record.studentId && 
        new Date(r.timestamp).toDateString() === new Date().toDateString()
    );

    if (recent) {
      // Allow re-scan only if it's been > 1 minute (for demo purposes)
      const diff = new Date().getTime() - new Date(recent.timestamp).getTime();
      if (diff < 60000) {
        throw new Error('Already checked in recently');
      }
    }

    allRecords.unshift(record);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allRecords));
  },

  // Classes
  getClasses: (): ClassGroup[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(MOCK_CLASSES));
      return MOCK_CLASSES;
    }
    return JSON.parse(data);
  },
};
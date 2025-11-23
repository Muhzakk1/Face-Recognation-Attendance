export interface Student {
  id: string;
  name: string;
  nis: string; // Student ID Number
  className: string;
  photoUrl: string;
  faceDescriptor: number[] | null; // Serialized Float32Array
  registeredAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  method: 'face' | 'manual';
  status: 'present' | 'late' | 'absent';
  confidence: number;
}

export interface ClassGroup {
  id: string;
  name: string;
}

// Global declaration for face-api.js loaded via script tag
declare global {
  interface Window {
    faceapi: any;
  }
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  ATTENDANCE = 'ATTENDANCE',
  REPORTS = 'REPORTS'
}
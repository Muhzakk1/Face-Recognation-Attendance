export const FACE_MATCH_THRESHOLD = 0.6;
export const STORAGE_KEYS = {
  STUDENTS: 'facecheck_students',
  ATTENDANCE: 'facecheck_attendance',
  CLASSES: 'facecheck_classes',
};

// In a real app, these would point to your hosted models
// For this demo, we might rely on simulation if these fail to load due to CORS/Path issues
export const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const MOCK_CLASSES = [
  { id: '1', name: '10 IPA 1' },
  { id: '2', name: '10 IPA 2' },
  { id: '3', name: '11 IPS 1' },
  { id: '4', name: '12 IPA 1' },
];
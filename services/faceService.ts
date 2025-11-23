import { MODEL_URL, FACE_MATCH_THRESHOLD } from '../constants';
import { Student } from '../types';

let isModelsLoaded = false;
let faceMatcher: any = null;

// Helper to convert array back to Float32Array for face-api
const toFloat32 = (arr: number[]) => {
  return new Float32Array(arr);
};

export const faceService = {
  isLoaded: () => isModelsLoaded,

  loadModels: async () => {
    if (isModelsLoaded) return true;
    try {
      if (!window.faceapi) throw new Error('FaceAPI not loaded');
      
      console.log("Loading FaceAPI models...");
      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL) // Higher accuracy
      ]);
      isModelsLoaded = true;
      console.log("FaceAPI models loaded successfully");
      return true;
    } catch (error) {
      console.error("Failed to load models:", error);
      return false;
    }
  },

  // Initialize matcher with current student database
  updateMatcher: (students: Student[]) => {
    // Fix: Explicitly clear matcher if student list is empty
    if (students.length === 0) {
        faceMatcher = null;
        console.log("Face Matcher cleared (no students registered)");
        return;
    }

    if (!isModelsLoaded) return;

    try {
        const labeledDescriptors = students
        .filter(s => s.faceDescriptor && s.faceDescriptor.length > 0)
        .map(s => {
            return new window.faceapi.LabeledFaceDescriptors(
            s.id,
            [toFloat32(s.faceDescriptor!)]
            );
        });

        if (labeledDescriptors.length > 0) {
            faceMatcher = new window.faceapi.FaceMatcher(labeledDescriptors, FACE_MATCH_THRESHOLD);
            console.log("Face Matcher updated with", labeledDescriptors.length, "profiles");
        } else {
            faceMatcher = null;
        }
    } catch (err) {
        console.error("Error updating face matcher:", err);
    }
  },

  detectFace: async (video: HTMLVideoElement) => {
    if (!isModelsLoaded) return null;
    
    // Safety check for video dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
        // Use TinyFaceDetector for speed, or SSD for accuracy
        const detection = await window.faceapi
        .detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
        
        return detection;
    } catch (error) {
        console.error("Face detection error:", error);
        return null;
    }
  },

  matchFace: async (descriptor: Float32Array) => {
    if (!faceMatcher) return { label: 'unknown', distance: 1.0 };
    try {
        const bestMatch = faceMatcher.findBestMatch(descriptor);
        return bestMatch;
    } catch (e) {
        return { label: 'unknown', distance: 1.0 };
    }
  },

  // Utility to create an image element from webcam stream for "snapshot"
  createSnapshot: (video: HTMLVideoElement): string => {
    if (video.videoWidth === 0) return '';
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    }
    return '';
  }
};
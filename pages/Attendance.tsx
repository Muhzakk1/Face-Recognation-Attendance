import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, UserCheck, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { faceService } from '../services/faceService';
import { storageService } from '../services/storageService';
import { Student, AttendanceRecord } from '../types';

const Attendance: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [lastDetection, setLastDetection] = useState<{name: string, confidence: number} | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<string>('Initializing system...');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  // Debounce ref to prevent spamming
  const processingRef = useRef(false);

  useEffect(() => {
    // Load students and initialize matcher
    const storedStudents = storageService.getStudents();
    setStudents(storedStudents);
    
    const init = async () => {
        const loaded = await faceService.loadModels();
        if (loaded) {
            faceService.updateMatcher(storedStudents);
            setIsModelLoaded(true);
            startVideo();
        } else {
            setStatusMessage("Failed to load AI models. Check internet connection.");
            setStatusType('error');
        }
    };
    init();

    return () => {
        stopVideo();
    };
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then(stream => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setStatusMessage("Look at the camera to check in");
            setStatusType('info');
        }
      })
      .catch(err => {
        console.error(err);
        setStatusMessage("Camera access denied.");
        setStatusType('error');
      });
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // CRITICAL FIX: Use videoWidth/videoHeight instead of width/height
    // Wait for metadata to load to get correct dimensions
    if (videoRef.current.videoWidth === 0) {
        // If dimensions aren't ready, try again in a moment
        setTimeout(handleVideoPlay, 100);
        return;
    }

    const displaySize = { 
        width: videoRef.current.videoWidth, 
        height: videoRef.current.videoHeight 
    };
    
    // face-api specific: match dimensions
    try {
        window.faceapi.matchDimensions(canvasRef.current, displaySize);
    } catch (e) { /* ignore if simulation mode */ }

    const interval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
        if (processingRef.current) return;

        processingRef.current = true;

        try {
            const detection = await faceService.detectFace(videoRef.current);
            const ctx = canvasRef.current?.getContext('2d');
            
            // Clear previous drawing
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }

            if (detection) {
                // Resize for drawing
                const resizedDetections = window.faceapi.resizeResults(detection, displaySize);
                if (ctx) {
                    window.faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
                }

                // Match Face
                const match = await faceService.matchFace(detection.descriptor);
                
                if (match.label !== 'unknown') {
                    // Find student
                    const student = students.find(s => s.id === match.label);
                    if (student) {
                        await handleAttendance(student, match.distance);
                    }
                } else {
                    setLastDetection({ name: 'Unknown', confidence: 0 });
                }
            } else {
                setLastDetection(null);
            }
        } catch (error) {
            console.error("Detection loop error:", error);
        }
        
        processingRef.current = false;
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  };

  const handleAttendance = async (student: Student, distance: number) => {
    const confidence = Math.round((1 - distance) * 100);
    setLastDetection({ name: student.name, confidence });

    try {
        const newRecord: AttendanceRecord = {
            id: Date.now().toString(),
            studentId: student.id,
            studentName: student.name,
            timestamp: new Date().toISOString(),
            status: 'present',
            method: 'face',
            confidence: confidence
        };

        await storageService.recordAttendance(newRecord);

        setStatusMessage(`Welcome, ${student.name}! Attendance Recorded.`);
        setStatusType('success');
        
        // Reset status after 3 seconds
        setTimeout(() => {
            setStatusMessage("Look at the camera to check in");
            setStatusType('info');
            setLastDetection(null);
        }, 3000);

    } catch (error: any) {
        if (error.message.includes('Already')) {
            setStatusMessage(`${student.name}, you are already checked in.`);
            setStatusType('info');
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between max-w-7xl mx-auto w-full z-20">
        <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors backdrop-blur-sm">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-md">Attendance</h1>
            </div>
        </div>
        <div className="hidden md:block">
            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-300">Live System</span>
            </div>
        </div>
      </div>

      {/* Main Camera Container - Centered */}
      <div className="w-full max-w-4xl relative">
            <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl border-4 border-slate-800 aspect-video w-full">
                {/* Video Feed */}
                <video 
                    ref={videoRef} 
                    onPlay={handleVideoPlay}
                    autoPlay 
                    muted 
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                />
                {/* Overlay Canvas for Bounding Boxes */}
                <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full transform scale-x-[-1]"
                />

                {/* Status Overlay */}
                {!isModelLoaded && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center flex-col z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mb-4"></div>
                        <p className="text-white font-medium">Loading AI Models...</p>
                    </div>
                )}

                {/* Success Feedback Overlay */}
                {lastDetection && statusType === 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 transition-all">
                         <div className="bg-white text-slate-900 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <UserCheck size={40} />
                            </div>
                            <div className="text-center">
                                <h2 className="text-3xl font-bold">{lastDetection.name}</h2>
                                <p className="text-slate-500 mt-1">Checked In Successfully</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dynamic Status Message Bar */}
            <div className={`mt-6 p-4 rounded-xl text-center border transition-all duration-300 backdrop-blur-md ${
                statusType === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                statusType === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
                'bg-slate-800/50 border-slate-700/50 text-slate-300'
            }`}>
                <div className="flex items-center justify-center gap-2">
                    {statusType === 'error' && <AlertTriangle size={24} />}
                    <span className="font-medium text-xl">{statusMessage}</span>
                </div>
            </div>
      </div>
    </div>
  );
};

export default Attendance;

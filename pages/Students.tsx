import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Camera, RefreshCw, X, Save, Edit, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { faceService } from '../services/faceService';
import { Student, ClassGroup } from '../types';
import { MOCK_CLASSES } from '../constants';

const Students: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes] = useState<ClassGroup[]>(MOCK_CLASSES);
    
    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Delete Confirmation State (Replacement for window.confirm)
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({ name: '', nis: '', className: '' });
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [captureError, setCaptureError] = useState<string | null>(null);

    // New state for immediate update feature
    const [isAutoSaveMode, setIsAutoSaveMode] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setStudents(storageService.getStudents());
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        setCaptureError(null);
        setLoadingModels(true);

        // Ensure models are loaded before starting stream to prevent lag later
        const loaded = await faceService.loadModels();
        setLoadingModels(false);

        if (loaded && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: 'user' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                setCaptureError("Cannot access camera. Please allow permissions.");
                setIsCameraActive(false);
            }
        } else {
            // Fallback or Simulation
            if (!loaded) setCaptureError("AI Models failed to load. Using simulation mode.");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (e) { console.error(e) }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const handleCapture = async () => {
        if (!videoRef.current) return;

        // Check if video is actually ready
        if (videoRef.current.readyState < 2) {
            setCaptureError("Camera not ready yet. Please wait.");
            return;
        }

        setIsProcessing(true);
        setCaptureError(null);

        try {
            // 1. Capture visual image
            const photo = faceService.createSnapshot(videoRef.current);
            if (!photo) throw new Error("Failed to capture image from video stream.");

            // 2. Detect face and get descriptor
            if (faceService.isLoaded()) {
                const detection = await faceService.detectFace(videoRef.current);
                if (detection) {
                    // Success: Set both image and descriptor
                    const descriptorArray = Array.from(detection.descriptor) as number[];
                    setCapturedImage(photo);
                    setFaceDescriptor(descriptorArray);
                    stopCamera(); // Only stop camera on success

                    // Handle Auto Save if in Update Face Data mode
                    if (editingId && isAutoSaveMode) {
                        await performAutoSave(photo, descriptorArray);
                    }
                } else {
                    // Failure: Keep camera running
                    setCaptureError("No face detected. Please position yourself clearly.");
                }
            } else {
                // Simulation Mode
                console.warn("Using simulated descriptor");
                const mockDescriptor = Array.from({ length: 128 }, () => Math.random()) as number[];
                setCapturedImage(photo);
                setFaceDescriptor(mockDescriptor);
                stopCamera();

                if (editingId && isAutoSaveMode) {
                    await performAutoSave(photo, mockDescriptor);
                }
            }
        } catch (error) {
            console.error("Detection error", error);
            setCaptureError("An error occurred during face detection.");
        } finally {
            setIsProcessing(false);
        }
    };

    const performAutoSave = async (photo: string, descriptor: number[]) => {
        try {
            const studentData: Student = {
                id: editingId!,
                name: formData.name,
                nis: formData.nis,
                className: formData.className,
                photoUrl: photo,
                faceDescriptor: descriptor,
                registeredAt: students.find(s => s.id === editingId)?.registeredAt || new Date().toISOString()
            };

            await storageService.saveStudent(studentData);

            // Update global state
            loadData();
            faceService.updateMatcher(storageService.getStudents());

            // UI Feedback
            setIsAutoSaveMode(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Auto save failed", error);
            setCaptureError("Failed to update face data.");
        }
    };

    const handleEdit = (student: Student) => {
        setFormData({
            name: student.name,
            nis: student.nis,
            className: student.className
        });
        setCapturedImage(student.photoUrl);
        setFaceDescriptor(student.faceDescriptor);
        setEditingId(student.id);
        setCaptureError(null);
        setSaveSuccess(false);
        setIsAutoSaveMode(false);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!capturedImage || !faceDescriptor) {
            setCaptureError("Please capture a valid face photo first.");
            return;
        }

        try {
            const studentData: Student = {
                id: editingId || Date.now().toString(),
                name: formData.name,
                nis: formData.nis,
                className: formData.className,
                photoUrl: capturedImage,
                faceDescriptor: faceDescriptor,
                registeredAt: editingId
                    ? (students.find(s => s.id === editingId)?.registeredAt || new Date().toISOString())
                    : new Date().toISOString()
            };

            await storageService.saveStudent(studentData);
            setShowModal(false);
            resetForm();
            loadData();

            // Update face matcher in real-time
            const updatedStudents = storageService.getStudents();
            faceService.updateMatcher(updatedStudents);
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save student data. Local storage might be full.");
        }
    };

    // Prompt the custom modal instead of window.confirm
    const promptDelete = (id: string) => {
        setDeleteConfirmationId(id);
    };

    // Execute the actual deletion
    const confirmDelete = async () => {
        if (!deleteConfirmationId) return;

        try {
            await storageService.deleteStudent(deleteConfirmationId);

            // Refresh local state immediately
            const updatedStudents = storageService.getStudents();
            setStudents(updatedStudents);

            // Critical: Update the AI matcher to remove the deleted face profile
            faceService.updateMatcher(updatedStudents);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete student. Please try again.");
        } finally {
            setDeleteConfirmationId(null);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', nis: '', className: '' });
        setCapturedImage(null);
        setFaceDescriptor(null);
        setEditingId(null);
        setCaptureError(null);
        setIsAutoSaveMode(false);
        setSaveSuccess(false);
        stopCamera();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Student Management</h2>
                    <p className="text-slate-500">Register and manage student data for face recognition.</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); startCamera(); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Add Student
                </button>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">Student</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">ID (NIS)</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Class</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Registered</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                    <span className="font-medium text-slate-800">{student.name}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{student.nis}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium">{student.className}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{new Date(student.registeredAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(student)}
                                            className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                            title="Edit Student"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => promptDelete(student.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                            title="Delete Student"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    No students registered yet. Click "Add Student" to begin.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmationId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Student?</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Are you sure you want to delete this student? This action cannot be undone and face data will be removed.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setDeleteConfirmationId(null)}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingId ? 'Edit Student Details' : 'New Student Registration'}
                            </h3>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                placeholder="e.g. John Doe"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Student ID (NIS)</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                placeholder="e.g. 12345678"
                                                value={formData.nis}
                                                onChange={e => setFormData({ ...formData, nis: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                                                value={formData.className}
                                                onChange={e => setFormData({ ...formData, className: e.target.value })}
                                            >
                                                <option value="">Select Class</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Face Capture Section */}
                                    <div className="flex flex-col items-center justify-center bg-slate-100 rounded-xl p-4 border-2 border-dashed border-slate-300 relative">
                                        {capturedImage ? (
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black group-image">
                                                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />

                                                <div className="absolute bottom-2 right-2 flex gap-2">
                                                    {/* Update Face Data Button (Edit Mode Only) */}
                                                    {editingId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAutoSaveMode(true);
                                                                setCapturedImage(null);
                                                                setFaceDescriptor(null);
                                                                startCamera();
                                                            }}
                                                            className="bg-indigo-600/90 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg shadow-sm backdrop-blur-sm font-medium transition-all flex items-center gap-1"
                                                        >
                                                            <RefreshCw size={14} />
                                                            Update Face Data
                                                        </button>
                                                    )}

                                                    {/* Standard Retake Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsAutoSaveMode(false);
                                                            setCapturedImage(null);
                                                            setFaceDescriptor(null);
                                                            startCamera();
                                                        }}
                                                        className="bg-white/90 p-2 rounded-lg text-slate-700 hover:text-indigo-600 shadow-sm backdrop-blur-sm transition-all"
                                                        title="Retake Photo"
                                                    >
                                                        <RefreshCw size={18} />
                                                    </button>
                                                </div>

                                                {/* Success Notification */}
                                                {saveSuccess && (
                                                    <div className="absolute top-2 right-2 bg-emerald-500/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                                        <CheckCircle2 size={12} />
                                                        Saved!
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                                {loadingModels && (
                                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white z-10 flex-col">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                                        <span className="text-xs">Loading AI Models...</span>
                                                    </div>
                                                )}
                                                {isCameraActive ? (
                                                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                                ) : (
                                                    <div className="text-slate-400 flex flex-col items-center">
                                                        <Camera size={48} />
                                                        <span className="text-sm mt-2">Camera Inactive</span>
                                                    </div>
                                                )}

                                                {/* Error Overlay */}
                                                {captureError && (
                                                    <div className="absolute inset-x-0 bottom-0 bg-red-500/90 text-white text-xs p-2 text-center">
                                                        {captureError}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-4 w-full">
                                            {!capturedImage && (
                                                <button
                                                    type="button"
                                                    onClick={isCameraActive ? handleCapture : startCamera}
                                                    disabled={loadingModels || isProcessing}
                                                    className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${isCameraActive
                                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                                                        }`}
                                                >
                                                    <Camera size={18} />
                                                    {isProcessing ? 'Processing...' : isCameraActive ? 'Capture Face' : 'Start Camera'}
                                                </button>
                                            )}
                                            {faceDescriptor && !saveSuccess && (
                                                <div className="mt-2 text-center">
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full flex items-center justify-center gap-1">
                                                        <AlertCircle size={12} />
                                                        Face Data Encoded ✓
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-100">
                                    <button
                                        type="submit"
                                        disabled={!faceDescriptor || !capturedImage}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Save size={18} />
                                        {editingId ? 'Update Student Details' : 'Save Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
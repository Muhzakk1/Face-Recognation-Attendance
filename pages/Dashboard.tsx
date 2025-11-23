import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, Sparkles } from 'lucide-react';
import { storageService } from '../services/storageService';
import { generateAttendanceReport } from '../services/geminiService';
import { Student, AttendanceRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const s = storageService.getStudents();
    const a = storageService.getAttendance();
    setStudents(s);
    setAttendance(a);
    setLoading(false);
  }, []);

  const todayStr = new Date().toDateString();
  const presentToday = attendance.filter(r => new Date(r.timestamp).toDateString() === todayStr);
  
  // Calculate unique students present today (handle potential double scans)
  const uniquePresentToday = new Set(presentToday.map(r => r.studentId)).size;
  
  const absentCount = Math.max(0, students.length - uniquePresentToday);
  const attendanceRate = students.length > 0 ? Math.round((uniquePresentToday / students.length) * 100) : 0;

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    const report = await generateAttendanceReport(students, attendance);
    setAiReport(report);
    setGeneratingReport(false);
  };

  // Generate Dynamic Chart Data for Last 7 Days
  const getChartData = () => {
    const days = [];
    const totalStudents = students.length;

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toDateString();
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue"

        // Find attendance records for this specific date
        // We use a Set to ensure we count unique students, not just raw records
        const uniquePresentCount = new Set(
            attendance
                .filter(r => new Date(r.timestamp).toDateString() === dateString)
                .map(r => r.studentId)
        ).size;

        days.push({
            name: dayName,
            date: dateString,
            present: uniquePresentCount,
            // If total students is 0, absent is 0. Otherwise Total - Present
            absent: totalStudents > 0 ? Math.max(0, totalStudents - uniquePresentCount) : 0
        });
    }
    return days;
  };

  const chartData = getChartData();

  const StatCard = ({ title, value, icon: Icon, color, subText }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-3xl font-bold mt-2 text-slate-800">{value}</h3>
        {subText && <p className="text-xs text-slate-400 mt-1">{subText}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
        <p className="text-slate-500">Welcome back, Admin. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Students" 
            value={students.length} 
            icon={Users} 
            color="bg-blue-500" 
            subText="Registered in system"
        />
        <StatCard 
            title="Present Today" 
            value={uniquePresentToday} 
            icon={UserCheck} 
            color="bg-emerald-500" 
            subText={`${attendanceRate}% Attendance Rate`}
        />
        <StatCard 
            title="Absent Today" 
            value={absentCount} 
            icon={UserX} 
            color="bg-rose-500" 
            subText="Needs attention"
        />
        <StatCard 
            title="Late Arrivals" 
            value={presentToday.filter(p => p.status === 'late').length} 
            icon={Clock} 
            color="bg-amber-500" 
            subText="After 08:00 AM"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Attendance Trends (Last 7 Days)</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    cursor={{fill: '#f1f5f9'}}
                    labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                            return payload[0].payload.date;
                        }
                        return label;
                    }}
                  />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight Section */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
             <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-yellow-400" />
              <h3 className="text-lg font-bold">Gemini AI Insights</h3>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-h-[160px] text-sm text-slate-200 mb-4">
                {generatingReport ? (
                    <div className="flex items-center justify-center h-full gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating analysis...
                    </div>
                ) : aiReport ? (
                    <div className="prose prose-invert prose-sm overflow-y-auto max-h-[160px]">
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{aiReport}</pre>
                    </div>
                ) : (
                    <p className="text-center text-slate-400 pt-8">Click below to analyze attendance patterns.</p>
                )}
            </div>

            <button 
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
                {generatingReport ? 'Analyzing...' : 'Generate Daily Report'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Recent Activity</h3>
            <button className="text-sm text-indigo-600 font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                    <tr>
                        <th className="px-6 py-3 font-medium">Student</th>
                        <th className="px-6 py-3 font-medium">Time</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Method</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {attendance.slice(0, 5).map(record => (
                        <tr key={record.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium text-slate-800">{record.studentName}</td>
                            <td className="px-6 py-3 text-slate-500">{new Date(record.timestamp).toLocaleTimeString()}</td>
                            <td className="px-6 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                                    record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                    {record.status.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-slate-500">{record.method}</td>
                        </tr>
                    ))}
                    {attendance.length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No attendance records yet today.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useEffect, useState } from 'react';
import { FileText, Download, Search, Filter } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Student, AttendanceRecord } from '../types';

interface AttendanceRow {
  id: string;
  studentName: string;
  nis: string;
  date: string;
  time: string;
  status: string;
  confidence: number;
}

const Reports: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const students = storageService.getStudents();
    const attendance = storageService.getAttendance();

    // Map attendance to include Student NIS details
    const mappedData: AttendanceRow[] = attendance.map(record => {
      const student = students.find(s => s.id === record.studentId);
      const dateObj = new Date(record.timestamp);
      
      return {
        id: record.id,
        studentName: student ? student.name : record.studentName,
        nis: student ? student.nis : 'N/A', // NIS Requested
        date: dateObj.toLocaleDateString(),
        time: dateObj.toLocaleTimeString(),
        status: record.status,
        confidence: record.confidence
      };
    });

    setRecords(mappedData);
  };

  const filteredRecords = records.filter(r => 
    r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nis.includes(searchTerm)
  );

  const handleExport = () => {
    // Simple CSV Export
    const headers = ['Name', 'NIS', 'Date', 'Time', 'Status', 'Confidence'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => [r.studentName, r.nis, r.date, r.time, r.status, r.confidence + '%'].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Attendance Reports</h2>
          <p className="text-slate-500">View and export detailed attendance logs.</p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Name or NIS..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">ID (NIS)</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{record.studentName}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">{record.nis}</td>
                  <td className="px-6 py-4 text-slate-600">{record.date}</td>
                  <td className="px-6 py-4 text-slate-600">{record.time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                      record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {record.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{record.confidence}%</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center">
                    <FileText size={48} className="mb-2 opacity-50" />
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-right">
            Showing {filteredRecords.length} records
        </div>
      </div>
    </div>
  );
};

export default Reports;

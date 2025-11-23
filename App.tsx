import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Admin Routes wrapped in Layout */}
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/students" element={<Layout><Students /></Layout>} />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        
        {/* Full Screen Attendance Kiosk */}
        <Route path="/attendance" element={<Attendance />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;

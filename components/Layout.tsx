import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ScanFace, FileText, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/attendance', label: 'Attendance', icon: ScanFace },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
               <ScanFace className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FaceCheck AI</h1>
          </div>
          <p className="text-slate-400 text-xs mt-2 pl-11">School Attendance System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white">
                    <ScanFace size={18} />
                </div>
                <span className="font-bold text-slate-800">FaceCheck</span>
            </div>
            {/* Simple mobile nav for demo */}
            <div className="flex gap-4">
                <Link to="/" className="text-slate-600"><LayoutDashboard size={20}/></Link>
                <Link to="/attendance" className="text-indigo-600"><ScanFace size={20}/></Link>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
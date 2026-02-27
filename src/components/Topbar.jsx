// Topbar.jsx - Modern responsive topbar
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/': 'Dashboard',
  '/employees': 'Employees',
  '/employees/new': 'Add Employee',
  '/shifts': 'Shift Management',
  '/shifts/assign': 'Assign Shifts',
  '/attendance': 'Attendance',
  '/leaves': 'Leave Management',
  '/payroll': 'Payroll',
  '/loans': 'Loan Management',
  '/reports': 'Reports',
  '/holidays': 'Holiday Calendar',
};

function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  
  // Get page title based on current path
  const getPageTitle = () => {
    // Check for exact match first
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname];
    }
    // Check for partial matches (for dynamic routes)
    if (location.pathname.startsWith('/employees/')) return 'Employee Details';
    if (location.pathname.startsWith('/payroll/')) return 'Payroll Details';
    if (location.pathname.startsWith('/loans/')) return 'Loan Details';
    return 'ChandraHR';
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="bg-white border-b sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button - show when sidebar is hidden (below md) */}
          <button 
            onClick={onMenuClick}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="text-xl">☰</span>
          </button>
          
          {/* Page Title */}
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">{getPageTitle()}</h1>
            <p className="text-xs text-slate-500 hidden md:block">{today}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search - Hidden on mobile */}
          <div className="hidden md:block relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search..."
              className="w-48 lg:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Notifications */}
          <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <span className="text-xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-800">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Topbar;

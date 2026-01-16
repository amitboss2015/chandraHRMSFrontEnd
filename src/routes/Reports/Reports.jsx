// Reports.jsx - Modern reports management
import React from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import AttendanceReport from "./AttendanceReport";
import PayrollReport from "./PayrollReport";
import LoanReport from "./LoanReport";

function Reports() {
  const tabs = [
    { path: "attendance", label: "Attendance", icon: "✅" },
    { path: "payroll", label: "Payroll", icon: "💰" },
    { path: "loans", label: "Loans", icon: "💳" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">📈 Reports</h1>
        <p className="text-slate-500 text-sm mt-1">View and export detailed reports</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-all relative ${
                  isActive
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="animate-fadeIn">
        <Routes>
          <Route path="/" element={<Navigate to="attendance" />} />
          <Route path="attendance" element={<AttendanceReport />} />
          <Route path="payroll" element={<PayrollReport />} />
          <Route path="loans" element={<LoanReport />} />
        </Routes>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}

export default Reports;

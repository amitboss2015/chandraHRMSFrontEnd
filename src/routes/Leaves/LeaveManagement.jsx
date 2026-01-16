// LeaveManagement.jsx - Modern leave management with tabs
import React, { useState } from "react";
import LeaveTypes from "./LeaveTypes";
import MarkLeave from "./MarkLeave";
import LeaveCalendar from "./LeaveCalendar";
import LeaveReports from "./LeaveReports";

export default function LeaveManagement() {
  const [tab, setTab] = useState("mark");

  const tabs = [
    { id: "mark", label: "Mark Leave", icon: "📝" },
    { id: "reports", label: "Reports", icon: "📊" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "types", label: "Leave Types", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">📝 Leave Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage employee leaves and attendance</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex flex-wrap">
          {tabs.map((t, index) => (
            <button
              key={t.id}
              className={`flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-all relative ${
                tab === t.id
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
              }`}
              onClick={() => setTab(t.id)}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {tab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {tab === "mark" && <MarkLeave />}
        {tab === "reports" && <LeaveReports />}
        {tab === "calendar" && <LeaveCalendar />}
        {tab === "types" && <LeaveTypes />}
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

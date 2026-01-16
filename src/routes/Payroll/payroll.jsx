// Payroll.jsx - Modern payroll management wrapper
import React, { useState } from "react";
import PayrollGen from "./PayrollGen";
import SalarySheets from "./SalarySheets";
import Payslip from "./Payslip";

function Payroll() {
  const [activeTab, setActiveTab] = useState("generate");

  const tabs = [
    { id: "generate", label: "Generate Payroll", icon: "⚡" },
    { id: "sheets", label: "Salary Sheets", icon: "📊" },
    { id: "payslip", label: "Payslip", icon: "🧾" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">💰 Payroll Management</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and manage employee salaries</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-all relative ${
                activeTab === tab.id
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {activeTab === "generate" && <PayrollGen />}
        {activeTab === "sheets" && <SalarySheets />}
        {activeTab === "payslip" && <Payslip />}
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

export default Payroll;

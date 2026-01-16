// Loans.jsx - Modern loan management wrapper
import React, { useState } from "react";
import LoanList from "./LoanList";
import AddLoan from "./AddLoan";
import LoanReports from "./LoanReports";

function Loans() {
  const [activeTab, setActiveTab] = useState("list");

  const tabs = [
    { id: "list", label: "Loan List", icon: "📋" },
    { id: "add", label: "Add Loan", icon: "➕" },
    { id: "reports", label: "Reports", icon: "📈" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">💳 Loan Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage employee loans and advances</p>
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
        {activeTab === "list" && <LoanList />}
        {activeTab === "add" && <AddLoan />}
        {activeTab === "reports" && <LoanReports />}
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

export default Loans;

// LeaveManagement.jsx - Modern leave management with tabs
import React, { useState, useRef, useEffect } from "react";
import LeaveTypes from "./LeaveTypes";
import MarkLeave from "./MarkLeave";
import LeaveCalendar from "./LeaveCalendar";
import LeaveReports from "./LeaveReports";
import LeaveList from "./LeaveList";
import LeaveSetupWizard from "./LeaveSetupWizard";
import { getLeaveSetupStatus } from "./api";

export default function LeaveManagement() {
  const [tab, setTab] = useState("list");
  const [setupStatus, setSetupStatus] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const leaveListRef = useRef(null);

  const orgId = localStorage.getItem("hrms_tenant_id") || localStorage.getItem("orgId") || "SASA001";

  // Fetch setup status on mount
  useEffect(() => {
    const fetchSetupStatus = async () => {
      try {
        setLoadingSetup(true);
        const status = await getLeaveSetupStatus(orgId);
        setSetupStatus(status);
        
        // Auto-navigate to recommended tab if setup is incomplete and no tab is explicitly selected
        if (!status.setupComplete && status.recommended) {
          const recommendedUrl = status.recommended.url;
          if (recommendedUrl.includes('tab=leave-types')) {
            setTab('types');
          } else if (recommendedUrl.includes('tab=calendar')) {
            setTab('calendar');
          } else if (recommendedUrl.includes('tab=mark-leave')) {
            setTab('mark');
          }
        }
      } catch (error) {
        console.error("Failed to fetch setup status:", error);
        // Don't show error, just continue without wizard
      } finally {
        setLoadingSetup(false);
      }
    };

    fetchSetupStatus();
  }, [orgId]);

  // Refresh setup status (call this after creating leave types or calendar leaves)
  const refreshSetupStatus = async () => {
    try {
      const status = await getLeaveSetupStatus(orgId);
      setSetupStatus(status);
    } catch (error) {
      console.error("Failed to refresh setup status:", error);
    }
  };

  const tabs = [
    { id: "list", label: "Leave List", icon: "📋" },
    { 
      id: "mark", 
      label: "Mark Leave", 
      icon: "📝",
      disabled: setupStatus && !setupStatus.step3?.available,
      tooltip: setupStatus && !setupStatus.step3?.available ? "Create leave types first" : null
    },
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

      {/* Setup Wizard */}
      {!loadingSetup && (
        <LeaveSetupWizard 
          setupStatus={setupStatus} 
          onRefresh={refreshSetupStatus}
          onNavigate={setTab}
        />
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex flex-wrap">
          {tabs.map((t, index) => (
            <button
              key={t.id}
              className={`flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-all relative ${
                t.disabled
                  ? "text-slate-300 cursor-not-allowed opacity-50"
                  : tab === t.id
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
              }`}
              onClick={() => {
                if (t.disabled) return;
                setTab(t.id);
                // Refresh LeaveList when switching to it
                if (t.id === "list" && leaveListRef.current) {
                  setTimeout(() => {
                    leaveListRef.current?.loadLeaves?.();
                  }, 100);
                }
              }}
              disabled={t.disabled}
              title={t.tooltip || undefined}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {tab === t.id && !t.disabled && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {tab === "list" && <LeaveList ref={leaveListRef} />}
        {tab === "mark" && <MarkLeave onLeaveCreated={() => {
          // Switch to list tab and refresh when leave is created
          setTab("list");
          setTimeout(() => {
            leaveListRef.current?.loadLeaves?.();
          }, 200);
        }} />}
        {tab === "reports" && <LeaveReports />}
        {tab === "calendar" && <LeaveCalendar onCalendarCreated={refreshSetupStatus} />}
        {tab === "types" && <LeaveTypes onLeaveTypeCreated={refreshSetupStatus} />}
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

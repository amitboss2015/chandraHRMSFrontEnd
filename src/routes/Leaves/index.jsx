// src/routes/Leaves/index.jsx
import React, { useState } from "react";
import LeaveTypes from "./LeaveTypes";
import LeaveCalendar from "./LeaveCalendar";
import LeaveBalances from "./LeaveBalances";
import MarkLeave from "./MarkLeave";

export default function LeavePage({ orgId: propOrgId }) {
  const orgId = propOrgId || localStorage.getItem("orgId") || "ORG1";
  const [tab, setTab] = useState("mark"); // "mark" | "balances" | "types" | "calendar"

  const TabBtn = ({ id, children, icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-5 py-3 font-medium transition-colors ${
        tab === id
          ? "bg-white text-blue-700 border-b-2 border-blue-600 rounded-t-lg shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-t-lg"
      }`}
    >
      <span>{icon}</span>
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
        <span className="text-sm text-slate-500">Organization: {orgId}</span>
      </div>

      <div>
        {/* Tabs Navigation */}
        <div className="flex gap-1 border-b border-slate-200">
          <TabBtn id="mark" icon="✏️">
            Mark Leave
          </TabBtn>
          <TabBtn id="balances" icon="💰">
            Balances
          </TabBtn>
          <TabBtn id="types" icon="📋">
            Leave Types
          </TabBtn>
          <TabBtn id="calendar" icon="📅">
            Calendar
          </TabBtn>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-6 min-h-[400px]">
          {tab === "mark" && <MarkLeave orgId={orgId} />}
          {tab === "balances" && <LeaveBalances orgId={orgId} />}
          {tab === "types" && <LeaveTypes orgId={orgId} />}
          {tab === "calendar" && <LeaveCalendar orgId={orgId} />}
        </div>
      </div>
    </div>
  );
}

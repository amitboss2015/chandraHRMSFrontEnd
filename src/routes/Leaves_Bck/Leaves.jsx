// ===========================
// Leaves.jsx (Wrapper with Tabs)
// ===========================
import React, { useState } from "react";
import LeaveRecords from "./LeaveRecords";
import LeaveTypes from "./LeaveTypes";
import LeaveHistory from "./LeaveHistory";

function Leaves() {
  const [activeTab, setActiveTab] = useState("records");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Leaves Management</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`px-4 py-2 ${
            activeTab === "records"
              ? "border-b-2 border-blue-600 font-bold"
              : ""
          }`}
          onClick={() => setActiveTab("records")}
        >
          Leave Records
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "types" ? "border-b-2 border-blue-600 font-bold" : ""
          }`}
          onClick={() => setActiveTab("types")}
        >
          Leave Types
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "history"
              ? "border-b-2 border-blue-600 font-bold"
              : ""
          }`}
          onClick={() => setActiveTab("history")}
        >
          Leave History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "records" && <LeaveRecords />}
      {activeTab === "types" && <LeaveTypes />}
      {activeTab === "history" && <LeaveHistory />}
    </div>
  );
}

export default Leaves;

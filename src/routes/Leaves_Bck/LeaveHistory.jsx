// ===========================
// LeaveHistory.jsx
// ===========================
import React, { useState } from "react";
import Table from "../../components/Table";
import Field from "../../components/Field";

function LeaveHistory() {
  const [records] = useState([
    {
      id: 1,
      emp_name: "Amit Kumar",
      leave_type: "Casual Leave",
      start_date: "2025-08-10",
      end_date: "2025-08-12",
      total_days: 3,
      status: "APPROVED",
    },
    {
      id: 2,
      emp_name: "Rohit Singh",
      leave_type: "Sick Leave",
      start_date: "2025-08-15",
      end_date: "2025-08-16",
      total_days: 2,
      status: "PENDING",
    },
  ]);

  const headers = [
    "ID",
    "Employee",
    "Leave Type",
    "Start Date",
    "End Date",
    "Total Days",
    "Status",
  ];
  const rows = records.map((r) => [
    r.id,
    r.emp_name,
    r.leave_type,
    r.start_date,
    r.end_date,
    r.total_days,
    r.status,
  ]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Leave History</h2>
      <Table headers={headers} rows={rows} />
    </div>
  );
}

export default LeaveHistory;

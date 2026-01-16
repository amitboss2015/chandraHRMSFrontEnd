// src/routes/Leaves/LeaveReports.jsx
import React, { useState, useEffect, useMemo } from "react";
import { listEmployees } from "./api";

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080/api';
  return `http://${hostname}:8080/api`;
};
const API_BASE = getApiBase();

const getToken = () => sessionStorage.getItem("hrms_access_token") || "";
const getTenantId = () => localStorage.getItem("hrms_tenant_id") || "SASA001";

const authHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": getTenantId(),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export default function LeaveReports({ orgId: propOrgId }) {
  const orgId = propOrgId || localStorage.getItem("hrms_tenant_id") || localStorage.getItem("orgId") || "SASA001";

  const [reportType, setReportType] = useState("date-range"); // date-range | employee | daily
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date range filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });

  // Employee filter
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [empQuery, setEmpQuery] = useState("");

  // Report data
  const [reportData, setReportData] = useState(null);

  // Load employees
  useEffect(() => {
    listEmployees()
      .then(setEmployees)
      .catch((e) => console.error("Failed to load employees:", e));
  }, []);

  // Helper functions
  const getEmpCode = (e) =>
    e?.empCode ?? e?.code ?? e?.empId ?? (e?.id != null ? String(e.id) : "");
  const getEmpName = (e) =>
    e?.name ?? e?.fullName ?? [e?.firstName, e?.lastName].filter(Boolean).join(" ");

  // Fetch date range report (employees on leave in a period)
  const fetchDateRangeReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/leave/reports/date-range?orgId=${orgId}&fromDate=${fromDate}&toDate=${toDate}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReportData({ type: "date-range", data });
    } catch (e) {
      setError(e.message || "Failed to fetch report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee leave report
  const fetchEmployeeReport = async () => {
    if (!selectedEmployee) {
      setError("Please select an employee");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/leave/reports/employee?orgId=${orgId}&empId=${selectedEmployee}&fromDate=${fromDate}&toDate=${toDate}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReportData({ type: "employee", data, empId: selectedEmployee });
    } catch (e) {
      setError(e.message || "Failed to fetch report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch daily leave summary
  const fetchDailyReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/leave/reports/daily?orgId=${orgId}&fromDate=${fromDate}&toDate=${toDate}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReportData({ type: "daily", data });
    } catch (e) {
      setError(e.message || "Failed to fetch report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    switch (reportType) {
      case "date-range":
        fetchDateRangeReport();
        break;
      case "employee":
        fetchEmployeeReport();
        break;
      case "daily":
        fetchDailyReport();
        break;
      default:
        break;
    }
  };

  // Calculate summary stats from date-range report
  const summaryStats = useMemo(() => {
    if (!reportData || reportData.type !== "date-range") return null;
    const leaves = reportData.data || [];
    const totalLeaves = leaves.length;
    const uniqueEmployees = new Set(leaves.map((l) => l.empId)).size;
    const totalDays = leaves.reduce((sum, l) => sum + (parseFloat(l.totalDays) || 0), 0);
    const byType = {};
    leaves.forEach((l) => {
      const type = l.leaveTypeName || l.leaveTypeCode || "Unknown";
      byType[type] = (byType[type] || 0) + 1;
    });
    return { totalLeaves, uniqueEmployees, totalDays, byType };
  }, [reportData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Leave Reports</h2>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow-md p-5">
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === "date-range"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setReportType("date-range")}
          >
            📊 Leave Summary (Date Range)
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === "employee"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setReportType("employee")}
          >
            👤 Employee Leave Report
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === "daily"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setReportType("daily")}
          >
            📅 Daily Leave Calendar
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md p-2.5"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md p-2.5"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          
          {reportType === "employee" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Employee</label>
              <input
                className="w-full border border-slate-300 rounded-md p-2.5"
                list="emp-report-list"
                placeholder="Search employee..."
                value={empQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmpQuery(v);
                  const parsed = v.includes(" — ") ? v.split(" — ")[0] : v;
                  setSelectedEmployee(parsed);
                }}
              />
              <datalist id="emp-report-list">
                {employees
                  .filter((e) => {
                    const code = getEmpCode(e);
                    const name = getEmpName(e);
                    const n = empQuery.toLowerCase();
                    return !n || `${code} ${name}`.toLowerCase().includes(n);
                  })
                  .slice(0, 50)
                  .map((e) => {
                    const code = getEmpCode(e);
                    const name = getEmpName(e);
                    return <option key={e.id ?? code} value={`${code} — ${name}`} />;
                  })}
              </datalist>
            </div>
          )}

          <div className="flex items-end">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-md disabled:opacity-50 transition-colors"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? "Loading..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Summary Stats (for date-range report) */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{summaryStats.totalLeaves}</div>
            <div className="text-sm text-slate-500">Total Leave Requests</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{summaryStats.uniqueEmployees}</div>
            <div className="text-sm text-slate-500">Employees on Leave</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{summaryStats.totalDays.toFixed(1)}</div>
            <div className="text-sm text-slate-500">Total Leave Days</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm font-medium text-slate-700 mb-2">By Leave Type</div>
            <div className="space-y-1 text-sm">
              {Object.entries(summaryStats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-slate-600">{type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-slate-700">
              {reportData.type === "date-range" && "Leave Records"}
              {reportData.type === "employee" && `Leave History: ${reportData.empId}`}
              {reportData.type === "daily" && "Daily Leave Count"}
            </h3>
            <button
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              onClick={() => {
                // Export to CSV
                const data = reportData.data || [];
                if (data.length === 0) return;
                const headers = Object.keys(data[0]).join(",");
                const rows = data.map((r) => Object.values(r).join(",")).join("\n");
                const csv = headers + "\n" + rows;
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `leave-report-${fromDate}-to-${toDate}.csv`;
                a.click();
              }}
            >
              📥 Export CSV
            </button>
          </div>

          {/* Date Range / Employee Report Table */}
          {(reportData.type === "date-range" || reportData.type === "employee") && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {reportData.type === "date-range" && (
                      <>
                        <th className="text-left p-3 font-medium text-slate-600">Emp Code</th>
                        <th className="text-left p-3 font-medium text-slate-600">Employee Name</th>
                      </>
                    )}
                    <th className="text-left p-3 font-medium text-slate-600">Leave Type</th>
                    <th className="text-left p-3 font-medium text-slate-600">From</th>
                    <th className="text-left p-3 font-medium text-slate-600">To</th>
                    <th className="text-center p-3 font-medium text-slate-600">Days</th>
                    <th className="text-left p-3 font-medium text-slate-600">Duration</th>
                    <th className="text-left p-3 font-medium text-slate-600">Status</th>
                    <th className="text-left p-3 font-medium text-slate-600">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500">
                        No leave records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    (reportData.data || []).map((leave, idx) => (
                      <tr key={leave.id || idx} className="hover:bg-slate-50">
                        {reportData.type === "date-range" && (
                          <>
                            <td className="p-3 font-medium text-slate-800">{leave.empId || leave.empCode}</td>
                            <td className="p-3 text-slate-600">{leave.empName}</td>
                          </>
                        )}
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {leave.leaveTypeCode || leave.leaveTypeName}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{leave.startDate}</td>
                        <td className="p-3 text-slate-600">{leave.endDate}</td>
                        <td className="p-3 text-center font-medium">{leave.totalDays}</td>
                        <td className="p-3 text-slate-600 text-xs">{leave.durationKind}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              leave.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : leave.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : leave.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">{leave.remarks || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily Report - Calendar View */}
          {reportData.type === "daily" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">Date</th>
                      <th className="text-left p-3 font-medium text-slate-600">Day</th>
                      <th className="text-center p-3 font-medium text-slate-600">On Leave</th>
                      <th className="text-left p-3 font-medium text-slate-600">Employees</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reportData.data || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500">
                          No data for the selected period.
                        </td>
                      </tr>
                    ) : (
                      (reportData.data || []).map((day, idx) => {
                        const date = new Date(day.date);
                        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                          <tr
                            key={day.date || idx}
                            className={isWeekend ? "bg-slate-100" : "hover:bg-slate-50"}
                          >
                            <td className="p-3 font-mono">{day.date}</td>
                            <td className={`p-3 ${isWeekend ? "text-red-500 font-medium" : ""}`}>
                              {dayName}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                  day.count === 0
                                    ? "bg-green-100 text-green-700"
                                    : day.count <= 3
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {day.count}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 text-xs">
                              {day.employees?.slice(0, 5).join(", ")}
                              {day.employees?.length > 5 && ` +${day.employees.length - 5} more`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

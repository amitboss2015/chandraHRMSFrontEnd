import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/** ======= CONFIG ======= */
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/,"") || "http://localhost:8080/api";
const ORG_ID = import.meta.env.VITE_ORG_ID || "1";

/** Simple JSON fetcher that adds org headers */
async function fetchJson(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "X-Org-Id": ORG_ID,
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return resp.json();
}

/** Month utilities */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const today = new Date();

function AttendanceSheet() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("monthly"); // Default to monthly report
  const [month, setMonth] = useState(7); // July as default to match your test data
  const [year, setYear] = useState(2025);

  /** ===================== TAB 1: IMPORT ===================== */
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleFileChange = (e) => setSelectedFile(e.target.files?.[0] ?? null);

  const handleImport = async () => {
    if (!selectedFile) return alert("Please choose a .xls/.xlsx file first.");
    
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xls') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      return alert("Please upload a valid Excel file (.xls or .xlsx) or CSV file.");
    }
    
    setImportError("");
    setImportResult(null);
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("month", String(month));
      form.append("year", String(year));
      const resp = await fetch(`${API_BASE}/attendance/import`, {
        method: "POST",
        headers: { "X-Org-Id": ORG_ID },
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setImportResult(data);
      
      if (data.duplicate) {
        setImportError(`Duplicate upload detected: ${data.message}`);
      }
    } catch (e) {
      setImportError(e.message || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!batchId) return;
    if (!confirm(`Are you sure you want to delete Batch ${batchId}? This will remove all attendance data for ${MONTH_NAMES[month-1]} ${year}.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const resp = await fetch(`${API_BASE}/attendance/import/batches/${batchId}`, {
        method: "DELETE",
        headers: { "X-Org-Id": ORG_ID },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      alert(data.message || "Batch deleted successfully!");
      setImportResult(null);
      setImportError("");
    } catch (e) {
      alert("Failed to delete batch: " + (e.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  /** ===================== TAB 2: RECORDS (Employee-wise daily) ===================== */
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [inlineLogs, setInlineLogs] = useState([]);
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");

  // Manual punch update modal state
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState(null);
  const [manualPunchData, setManualPunchData] = useState({ manualIn: '', manualOut: '', remarks: '' });
  const [updatingPunch, setUpdatingPunch] = useState(false);

  // Load employees list on mount
  useEffect(() => {
    fetchJson("/attendance/employees")
      .then(data => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]));
  }, []);

  // Handle opening the manual punch modal
  const openPunchModal = (log) => {
    setSelectedLogForEdit(log);
    setManualPunchData({
      manualIn: log.manualIn || log.firstIn || '',
      manualOut: log.manualOut || log.lastOut || '',
      remarks: log.remarks || ''
    });
    setShowPunchModal(true);
  };

  // Handle updating manual punch
  const handleUpdateManualPunch = async () => {
    if (!selectedLogForEdit?.dayId) {
      alert("Cannot update: Day ID not found. Please recalculate attendance first.");
      return;
    }
    
    setUpdatingPunch(true);
    try {
      const params = new URLSearchParams();
      if (manualPunchData.manualIn) params.append('manualIn', manualPunchData.manualIn);
      if (manualPunchData.manualOut) params.append('manualOut', manualPunchData.manualOut);
      if (manualPunchData.remarks) params.append('remarks', manualPunchData.remarks);
      
      const response = await fetch(`${API_BASE}/attendance/day/${selectedLogForEdit.dayId}/manual-punch?${params.toString()}`, {
        method: 'PUT',
        headers: { 'X-Org-Id': ORG_ID, 'X-User': 'admin' }
      });
      
      if (!response.ok) throw new Error(await response.text());
      
      alert('Attendance updated successfully!');
      setShowPunchModal(false);
      loadInlineLogs(); // Reload the data
    } catch (e) {
      alert('Failed to update: ' + (e.message || 'Unknown error'));
    } finally {
      setUpdatingPunch(false);
    }
  };

  const loadInlineLogs = async () => {
    if (!selectedEmployee) return alert("Please select an employee");
    setInlineLoading(true);
    setInlineError("");
    try {
      const data = await fetchJson(`/attendance/logs?month=${month}&year=${year}&empCode=${selectedEmployee}`);
      setInlineLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setInlineError(e.message || "Failed to load logs");
      setInlineLogs([]);
    } finally {
      setInlineLoading(false);
    }
  };

  // Calculate summary from logs
  const logsSummary = useMemo(() => {
    if (!inlineLogs.length) return null;
    const present = inlineLogs.filter(l => l.status === 'PRESENT' || l.status === 'HALF_DAY' || l.status === 'OT_DAY').length;
    const absent = inlineLogs.filter(l => l.status === 'ABSENT').length;
    const halfDays = inlineLogs.filter(l => l.status === 'HALF_DAY').length;
    const weeklyOff = inlineLogs.filter(l => l.status === 'WEEKLY_OFF' || (l.isWeeklyOff && l.status !== 'OT_DAY')).length;
    const holidays = inlineLogs.filter(l => l.status === 'HOLIDAY' || (l.isHoliday && l.status !== 'OT_DAY')).length;
    const otDays = inlineLogs.filter(l => l.status === 'OT_DAY' || l.isOvertimeDay).length;
    const totalMins = inlineLogs.reduce((sum, l) => sum + (l.workMinutes || 0), 0);
    const dualShifts = inlineLogs.filter(l => l.dualShift).length;
    // New: Late/Early tracking
    const lateDays = inlineLogs.filter(l => l.isLateIn).length;
    const earlyOutDays = inlineLogs.filter(l => l.isEarlyOut).length;
    const totalLateMins = inlineLogs.reduce((sum, l) => sum + (l.lateByMins || 0), 0);
    const totalEarlyMins = inlineLogs.reduce((sum, l) => sum + (l.earlyByMins || 0), 0);
    return { present, absent, halfDays, weeklyOff, holidays, otDays, totalMins, dualShifts, lateDays, earlyOutDays, totalLateMins, totalEarlyMins };
  }, [inlineLogs]);

  /** ===================== TAB 3: MONTHLY SUMMARY ===================== */
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await fetchJson(`/attendance/summary?month=${month}&year=${year}`);
      setSummaryRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setSummaryError(e.message || "Failed to load summary");
      setSummaryRows([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => { 
    if (activeTab === "monthly") loadSummary(); 
  }, [activeTab, month, year]);

  const formatDuration = (totalMins) => {
    if (!totalMins || totalMins === 0) return "-";
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  // Calculate totals for summary
  const summaryTotals = useMemo(() => {
    if (!summaryRows.length) return null;
    return {
      totalEmployees: summaryRows.length,
      totalPresent: summaryRows.reduce((sum, r) => sum + (r.present || 0), 0),
      totalAbsent: summaryRows.reduce((sum, r) => sum + (r.absent || 0), 0),
      totalLeave: summaryRows.reduce((sum, r) => sum + (r.leaveDays || r.leave || 0), 0),
      totalWorkMins: summaryRows.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
    };
  }, [summaryRows]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">✅ Attendance Management</h1>
        <p className="text-slate-500 text-sm mt-1">Import, view and manage employee attendance</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex flex-wrap">
          {[
            { id: "monthly", label: "Monthly Report", icon: "📊" },
            { id: "records", label: "Attendance Records", icon: "📋" },
            { id: "import", label: "Import Attendance", icon: "📥" },
          ].map(tab => (
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

      {/* Month/Year controls */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        <select 
          value={month} 
          onChange={e => setMonth(parseInt(e.target.value, 10))} 
          className="px-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {MONTH_NAMES.map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
        </select>
        <select 
          value={year} 
          onChange={e => setYear(parseInt(e.target.value, 10))} 
          className="px-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ---------- Tab 1: Monthly Report (All Employees) ---------- */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={loadSummary} 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              🔄 Refresh
            </button>
            {summaryLoading && <span className="text-sm text-slate-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              Loading…
            </span>}
            {summaryError && <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">{summaryError}</span>}
          </div>

          {/* Summary Stats */}
          {summaryTotals && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{summaryTotals.totalEmployees}</div>
                <div className="text-sm text-slate-500">Total Employees</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">{summaryTotals.totalPresent}</div>
                <div className="text-sm text-slate-500">Total Present Days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-red-500">{summaryTotals.totalAbsent}</div>
                <div className="text-sm text-slate-500">Total Absent Days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-amber-500">{summaryTotals.totalLeave}</div>
                <div className="text-sm text-slate-500">Total Leave Days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{formatDuration(summaryTotals.totalWorkMins)}</div>
                <div className="text-sm text-slate-500">Total Work Hours</div>
              </div>
            </div>
          )}

          {!summaryLoading && !summaryError && (
            <div className="border rounded overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Emp Code</th>
                    <th className="border px-3 py-2 text-left">Employee Name</th>
                    <th className="border px-3 py-2 text-center bg-green-50">Present</th>
                    <th className="border px-3 py-2 text-center bg-red-50">Absent</th>
                    <th className="border px-3 py-2 text-center bg-blue-50">Leave</th>
                    <th className="border px-3 py-2 text-center bg-yellow-50">Half Days</th>
                    <th className="border px-3 py-2 text-center bg-slate-100">Weekly Off</th>
                    <th className="border px-3 py-2 text-center bg-blue-100">Holidays</th>
                    <th className="border px-3 py-2 text-center bg-orange-100">OT Days</th>
                    <th className="border px-3 py-2 text-center bg-amber-50">Late</th>
                    <th className="border px-3 py-2 text-center">Work Hours</th>
                    <th className="border px-3 py-2 text-center bg-purple-50">OT Hours</th>
                    <th className="border px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.length ? summaryRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border px-3 py-2 font-mono">{r.empCode}</td>
                      <td className="border px-3 py-2 font-medium">{r.empName || r.name}</td>
                      <td className="border px-3 py-2 text-center text-green-600 font-bold">{r.present}</td>
                      <td className="border px-3 py-2 text-center text-red-600 font-bold">{r.absent}</td>
                      <td className="border px-3 py-2 text-center text-blue-600">{r.leaveDays || r.leave || 0}</td>
                      <td className="border px-3 py-2 text-center text-yellow-600">{r.halfDays || 0}</td>
                      <td className="border px-3 py-2 text-center text-slate-600">{r.weeklyOff || 0}</td>
                      <td className="border px-3 py-2 text-center text-blue-700">{r.holidays || 0}</td>
                      <td className="border px-3 py-2 text-center">
                        {r.overtimeDays > 0 ? (
                          <span className="text-orange-600 font-bold">{r.overtimeDays}</span>
                        ) : '-'}
                      </td>
                      <td className="border px-3 py-2 text-center text-amber-600">{r.lateDays || 0}</td>
                      <td className="border px-3 py-2 text-center">{formatDuration(r.totalWorkMinutes)}</td>
                      <td className="border px-3 py-2 text-center text-purple-600">{formatDuration(r.otMinutes)}</td>
                      <td className="border px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            setSelectedEmployee(r.empCode);
                            setActiveTab("records");
                            setTimeout(() => loadInlineLogs(), 100);
                          }}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="border px-3 py-2 text-center text-gray-500" colSpan={13}>
                        No attendance data found for {MONTH_NAMES[month - 1]} {year}. Import attendance first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------- Tab 2: Records (Employee-wise Daily) ---------- */}
      {activeTab === "records" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Select Employee:</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="border p-2 rounded min-w-[250px]"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.empCode} value={emp.empCode}>
                  {emp.empCode} - {emp.name}
                </option>
              ))}
            </select>
            <button 
              onClick={loadInlineLogs} 
              disabled={!selectedEmployee}
              className={`px-4 py-2 rounded font-medium ${
                selectedEmployee ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500"
              }`}
            >
              Load Attendance
            </button>
          </div>

          {inlineLoading && <div className="text-sm text-gray-500">Loading…</div>}
          {inlineError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{inlineError}</div>}

          {/* Employee Summary Card */}
          {logsSummary && (
            <div className="bg-gray-50 border rounded p-4">
              <h4 className="font-semibold mb-2">Summary for {selectedEmployee}</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong className="text-green-600">{logsSummary.present}</strong> Present</span>
                <span><strong className="text-red-600">{logsSummary.absent}</strong> Absent</span>
                <span><strong className="text-yellow-600">{logsSummary.halfDays}</strong> Half Days</span>
                <span><strong className="text-gray-600">{logsSummary.weeklyOff}</strong> Weekly Off</span>
                <span><strong className="text-blue-600">{logsSummary.holidays}</strong> Holidays</span>
                <span className="text-orange-600"><strong>{logsSummary.otDays}</strong> OT Days</span>
                <span><strong className="text-purple-600">{logsSummary.dualShifts}</strong> Dual Shifts</span>
                <span><strong>{formatDuration(logsSummary.totalMins)}</strong> Total Work</span>
              </div>
              {/* Late/Early summary row */}
              {(logsSummary.lateDays > 0 || logsSummary.earlyOutDays > 0) && (
                <div className="flex flex-wrap gap-4 text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-amber-700">
                    🕐 <strong>{logsSummary.lateDays}</strong> Late IN ({formatDuration(logsSummary.totalLateMins)} total)
                  </span>
                  <span className="text-pink-600">
                    ⏪ <strong>{logsSummary.earlyOutDays}</strong> Early OUT ({formatDuration(logsSummary.totalEarlyMins)} total)
                  </span>
                </div>
              )}
            </div>
          )}

          {!inlineLoading && !inlineError && inlineLogs.length > 0 && (
            <div className="border rounded overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Date</th>
                    <th className="border px-3 py-2 text-left">Day</th>
                    <th className="border px-3 py-2 text-center text-green-700">First IN</th>
                    <th className="border px-3 py-2 text-center text-red-700">Last OUT</th>
                    <th className="border px-3 py-2 text-center">Punches</th>
                    <th className="border px-3 py-2 text-center">Work Hours</th>
                    <th className="border px-3 py-2 text-center">Status</th>
                    <th className="border px-3 py-2 text-center bg-amber-50">Late/Early</th>
                    <th className="border px-3 py-2 text-center">Shift</th>
                    <th className="border px-3 py-2 text-left">All Punches</th>
                    <th className="border px-3 py-2 text-center">Issue</th>
                    <th className="border px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineLogs.map((log, i) => {
                    const date = new Date(log.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const hasIssue = log.missingPunch || log.needsReview || log.dualShift;
                    
                    // Determine row background color based on status and issues
                    let rowBgClass = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    if (log.status === 'OT_DAY' || log.isOvertimeDay) {
                      rowBgClass = 'bg-orange-100 border-l-4 border-l-orange-500';
                    } else if (log.status === 'WEEKLY_OFF' || (log.isWeeklyOff && !log.punchCount)) {
                      rowBgClass = 'bg-slate-200 border-l-4 border-l-slate-400';
                    } else if (log.status === 'HOLIDAY' || (log.isHoliday && !log.punchCount)) {
                      rowBgClass = 'bg-blue-100 border-l-4 border-l-blue-400';
                    } else if (log.missingPunch) {
                      rowBgClass = 'bg-yellow-100 border-l-4 border-l-yellow-500';
                    } else if (log.isLateIn && log.isEarlyOut) {
                      // Both late and early - highlight more prominently
                      rowBgClass = 'bg-red-50 border-l-4 border-l-red-400';
                    } else if (log.isLateIn) {
                      rowBgClass = 'bg-amber-50 border-l-4 border-l-amber-400';
                    } else if (log.isEarlyOut) {
                      rowBgClass = 'bg-pink-50 border-l-4 border-l-pink-400';
                    } else if (log.dualShift) {
                      rowBgClass = 'bg-purple-100 border-l-4 border-l-purple-500';
                    } else if (log.needsReview) {
                      rowBgClass = 'bg-amber-50 border-l-4 border-l-amber-400';
                    } else if (isWeekend) {
                      rowBgClass = 'bg-gray-100';
                    }
                    
                    return (
                      <tr key={i} className={rowBgClass}>
                        <td className="border px-3 py-2 font-mono">{log.date}</td>
                        <td className={`border px-3 py-2 ${isWeekend ? 'text-red-500 font-medium' : ''}`}>{dayName}</td>
                        <td className="border px-3 py-2 text-center text-green-600 font-medium">
                          {log.manualIn || log.firstIn || '-'}
                          {log.manualIn && <span className="text-xs text-blue-600 ml-1">(M)</span>}
                        </td>
                        <td className="border px-3 py-2 text-center text-red-600 font-medium">
                          {log.manualOut ? (
                            <>
                              {log.manualOut}
                              <span className="text-xs text-blue-600 ml-1">(M)</span>
                            </>
                          ) : log.lastOut ? (
                            <>
                              {log.lastOut}
                              {log.crossedMidnight && <span className="text-xs text-purple-600 ml-1">(+1)</span>}
                            </>
                          ) : log.missingPunchType === 'OUT' ? (
                            <span className="text-orange-500 font-medium">Missing ⚠️</span>
                          ) : '-'}
                        </td>
                        <td className="border px-3 py-2 text-center">{log.punchCount || 0}</td>
                        <td className="border px-3 py-2 text-center font-medium">{formatDuration(log.workMinutes)}</td>
                        <td className="border px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                            log.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                            log.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-800' :
                            log.status === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                            log.status === 'WEEKLY_OFF' ? 'bg-slate-200 text-slate-700' :
                            log.status === 'HOLIDAY' ? 'bg-blue-200 text-blue-800' :
                            log.status === 'OT_DAY' ? 'bg-orange-200 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.status === 'WEEKLY_OFF' ? '🛌 WEEKLY OFF' : 
                             log.status === 'HOLIDAY' ? `🎉 ${log.holidayName || 'HOLIDAY'}` :
                             log.status === 'OT_DAY' ? '⏰ OVERTIME' :
                             log.status || 'ABSENT'}
                          </span>
                        </td>
                        {/* Late IN / Early OUT indicator */}
                        <td className="border px-3 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {log.isLateIn && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                🕐 Late +{log.lateByMins}m
                                {log.roundedIn && <span className="text-xs text-gray-500 ml-1">→{log.roundedIn}</span>}
                              </span>
                            )}
                            {log.isEarlyOut && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                                ⏪ Early +{log.earlyByMins}m
                                {log.roundedOut && <span className="text-xs text-gray-500 ml-1">→{log.roundedOut}</span>}
                              </span>
                            )}
                            {!log.isLateIn && !log.isEarlyOut && log.status === 'PRESENT' && (
                              <span className="text-xs text-green-600">✓ On Time</span>
                            )}
                            {!log.isLateIn && !log.isEarlyOut && log.status !== 'PRESENT' && '-'}
                          </div>
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {log.dualShift ? (
                            <span className="text-purple-600 font-medium text-xs">DUAL</span>
                          ) : (
                            <span className="text-xs">{log.shiftCode || log.shifts?.[0] || '-'}</span>
                          )}
                        </td>
                        <td className="border px-3 py-2 text-xs text-gray-600">
                          {log.punches?.join(', ') || '-'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {log.highlightReason ? (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.isOvertimeDay || log.status === 'OT_DAY' ? 'bg-orange-200 text-orange-800' :
                              log.isWeeklyOff || log.status === 'WEEKLY_OFF' ? 'bg-slate-200 text-slate-700' :
                              log.isHoliday || log.status === 'HOLIDAY' ? 'bg-blue-200 text-blue-800' :
                              log.missingPunch ? 'bg-amber-200 text-amber-800' :
                              log.dualShift ? 'bg-purple-200 text-purple-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {log.isOvertimeDay ? '⏰' : log.isWeeklyOff ? '🛌' : log.isHoliday ? '🎉' : '⚠️'} {log.highlightReason}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {(log.missingPunch || log.needsReview || log.punchCount === 1 || log.manualIn || log.manualOut) ? (
                            <button
                              onClick={() => openPunchModal(log)}
                              className={`px-2 py-1 text-xs rounded ${
                                log.missingPunch 
                                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                  : (log.manualIn || log.manualOut)
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              {log.missingPunch ? '⚠️ Fix' : (log.manualIn || log.manualOut) ? '✓ Edit' : '✏️ Edit'}
                            </button>
                          ) : log.dayId && (
                            <button
                              onClick={() => openPunchModal(log)}
                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!inlineLoading && !inlineError && inlineLogs.length === 0 && selectedEmployee && (
            <div className="text-center text-gray-500 py-8">
              No attendance records found for {selectedEmployee} in {MONTH_NAMES[month - 1]} {year}.
            </div>
          )}
        </div>
      )}

      {/* ---------- Tab 3: Import ---------- */}
      {activeTab === "import" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Import Instructions</h3>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Upload the biometric attendance Excel file directly (.xls or .xlsx)</li>
              <li>The system will read the <strong>"Logs"</strong> sheet with day-wise punch times</li>
              <li>Cross-midnight punches are handled automatically (e.g., "00:33" = OUT from previous day)</li>
              <li>Dual shifts are supported - employee can have multiple IN/OUT per day</li>
              <li className="text-orange-600 font-medium">Note: Delete existing batch before re-uploading for same month.</li>
            </ul>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <input 
              type="file" 
              accept=".xls,.xlsx" 
              className="border p-2 rounded bg-white" 
              onChange={handleFileChange} 
            />
            <button 
              onClick={handleImport} 
              disabled={!selectedFile || uploading}
              className={`px-4 py-2 rounded font-medium ${
                selectedFile && !uploading 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {uploading ? "Importing..." : "Import"}
            </button>
          </div>

          {selectedFile && (
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {importError && !importResult?.duplicate && (
            <div className="bg-red-50 border border-red-300 rounded p-3 text-red-700 text-sm">
              <strong>Error:</strong> {importError}
            </div>
          )}

          {importResult && importResult.duplicate && (
            <div className="bg-orange-50 border border-orange-300 rounded p-4">
              <h4 className="font-semibold text-orange-800 mb-2">⚠️ Attendance Already Exists</h4>
              <p className="text-sm text-orange-700 mb-3">{importResult.message}</p>
              <button 
                onClick={() => handleDeleteBatch(importResult.existingBatchId || importResult.batchId)}
                disabled={deleting}
                className={`px-4 py-2 rounded font-medium ${
                  deleting ? "bg-gray-300 text-gray-500" : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {deleting ? "Deleting..." : `Delete & Re-upload`}
              </button>
            </div>
          )}

          {importResult && !importResult.duplicate && (
            <div className={`border rounded p-4 ${importResult.failed > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
              <h4 className={`font-semibold mb-2 ${importResult.failed > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                {importResult.failed > 0 ? '⚠️ Import Completed with Errors' : '✅ Import Successful'}
              </h4>
              <div className="text-sm space-y-1">
                <div><strong>Batch ID:</strong> {importResult.batchId}</div>
                <div className="flex gap-4">
                  <span><strong>Total:</strong> {importResult.total}</span>
                  <span className="text-green-600"><strong>Success:</strong> {importResult.success}</span>
                  {importResult.failed > 0 && <span className="text-red-600"><strong>Failed:</strong> {importResult.failed}</span>}
                </div>
                <div className="mt-2">{importResult.message}</div>
                {importResult.errorsCsvUrl && (
                  <div className="mt-2">
                    <a 
                      className="text-blue-600 underline hover:text-blue-800" 
                      href={`${API_BASE}${importResult.errorsCsvUrl}`} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      📥 Download Error Details
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Punch Update Modal */}
      {showPunchModal && selectedLogForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              ✏️ Update Attendance - {selectedLogForEdit.date}
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
              <div><strong>Current Punches:</strong> {selectedLogForEdit.punches?.join(', ') || 'None'}</div>
              <div><strong>Status:</strong> {selectedLogForEdit.status}</div>
              {selectedLogForEdit.highlightReason && (
                <div className="text-orange-600 font-medium mt-1">
                  ⚠️ Issue: {selectedLogForEdit.highlightReason}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IN Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={manualPunchData.manualIn}
                  onChange={(e) => setManualPunchData({...manualPunchData, manualIn: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OUT Time (HH:MM) {selectedLogForEdit.missingPunchType === 'OUT' && <span className="text-orange-500">← Missing</span>}
                </label>
                <input
                  type="time"
                  value={manualPunchData.manualOut}
                  onChange={(e) => setManualPunchData({...manualPunchData, manualOut: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={manualPunchData.remarks}
                  onChange={(e) => setManualPunchData({...manualPunchData, remarks: e.target.value})}
                  placeholder="e.g., Employee forgot to punch out"
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPunchModal(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateManualPunch}
                disabled={updatingPunch}
                className={`px-4 py-2 rounded font-medium ${
                  updatingPunch ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {updatingPunch ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceSheet;

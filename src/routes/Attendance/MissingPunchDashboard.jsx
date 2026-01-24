import { useState, useEffect } from "react";

// API helper
const getApiBase = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  return '/api';
};
const API_BASE = getApiBase();

const getToken = () => sessionStorage.getItem("hrms_access_token") || "";
const getTenantId = () => localStorage.getItem("hrms_tenant_id") || "PASA";

async function fetchJson(path, options = {}) {
  const token = getToken();
  const tenantId = getTenantId();
  
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-Id": tenantId,
    ...(options.headers || {}),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`Auth error (${resp.status}). Please re-login.`);
    }
    throw new Error(text || `HTTP ${resp.status}`);
  }
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return resp.json();
}

const SHIFT = { inTime: "09:00", outTime: "17:30" };

const MissingPunchDashboard = () => {
  const [month, setMonth] = useState(12);
  const [year, setYear] = useState(2025);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fixes, setFixes] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetchJson(`/attendance/missing-punch-dashboard?month=${month}&year=${year}`);
      setData(response);
      setSelectedEmployee(null);
      setFixes({});
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Failed to load: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const setFix = (dayId, field, value) => {
    setFixes(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], dayId, [field]: value }
    }));
  };

  const resetFix = (dayId) => {
    setFixes(prev => {
      const copy = { ...prev };
      delete copy[dayId];
      return copy;
    });
  };

  const handleBulkFix = async () => {
    const fixList = Object.values(fixes).filter(f => f.manualIn || f.manualOut);
    if (!fixList.length) {
      setMessage({ type: "warning", text: "No fixes to apply" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetchJson("/attendance/bulk-fix-missing-punch", {
        method: "POST",
        body: JSON.stringify({ fixes: fixList, updatedBy: "admin" })
      });
      setMessage({ type: res.errorCount === 0 ? "success" : "warning", text: res.message });
      fetchData();
    } catch (error) {
      setMessage({ type: "error", text: "Failed: " + error.message });
    } finally {
      setSaving(false);
    }
  };

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header + Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-800">🔧 Missing Punch Fix</h1>
          <select value={month} onChange={e => setMonth(+e.target.value)} className="border rounded px-2 py-1 text-sm">
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded px-2 py-1 text-sm">
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchData} disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? "..." : "Refresh"}
          </button>
          <span className="text-xs text-gray-500">Shift: {SHIFT.inTime} - {SHIFT.outTime}</span>
        </div>

        {message && (
          <div className={`mb-3 p-2 rounded text-sm flex justify-between ${
            message.type === "success" ? "bg-green-100 text-green-800" :
            message.type === "error" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Summary */}
        {data && (
          <div className="flex gap-4 mb-4 text-sm">
            <div className="bg-white rounded shadow px-4 py-2">
              <span className="text-2xl font-bold text-red-600">{data.totalEmployeesWithIssues}</span>
              <span className="text-gray-500 ml-2">Employees</span>
            </div>
            <div className="bg-white rounded shadow px-4 py-2">
              <span className="text-2xl font-bold text-orange-600">{data.totalIssues}</span>
              <span className="text-gray-500 ml-2">Issues</span>
            </div>
            <div className="bg-white rounded shadow px-4 py-2">
              <span className="text-2xl font-bold text-purple-600">{data.totalMissingOut}</span>
              <span className="text-gray-500 ml-2">Missing OUT</span>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="flex gap-4">
          {/* Employee List */}
          <div className="w-64 bg-white rounded shadow flex-shrink-0">
            <div className="p-2 border-b bg-gray-50 text-sm font-medium">Employees</div>
            <div className="max-h-[500px] overflow-y-auto divide-y">
              {data?.employees?.map(emp => (
                <div 
                  key={emp.employeeId}
                  onClick={() => { setSelectedEmployee(emp); setFixes({}); }}
                  className={`p-2 cursor-pointer hover:bg-blue-50 text-sm ${
                    selectedEmployee?.employeeId === emp.employeeId ? "bg-blue-100" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium truncate">{emp.empName}</span>
                    <span className="text-red-600 font-bold">{emp.totalIssues}</span>
                  </div>
                  <div className="text-xs text-gray-500">{emp.empCode}</div>
                </div>
              ))}
              {!data?.employees?.length && (
                <div className="p-4 text-center text-gray-400 text-sm">✅ No issues found</div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 bg-white rounded shadow">
            <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
              <span className="text-sm font-medium">
                {selectedEmployee ? selectedEmployee.empName : "Select Employee"}
              </span>
              {Object.keys(fixes).length > 0 && (
                <button onClick={handleBulkFix} disabled={saving}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Saving..." : `💾 Save (${Object.keys(fixes).length})`}
                </button>
              )}
            </div>

            {selectedEmployee ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-center">IN Time</th>
                      <th className="px-2 py-2 text-center">OUT Time</th>
                      <th className="px-2 py-2 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedEmployee.days.map(day => {
                      // Use the data directly from API - it now returns effective times
                      const hasIn = !!day.firstIn;
                      const hasOut = !!day.lastOut;
                      const hasFix = fixes[day.dayId];
                      
                      return (
                        <tr key={day.dayId} className={`hover:bg-gray-50 ${hasFix ? "bg-yellow-50" : ""}`}>
                          <td className="px-2 py-2">
                            <div className="font-medium">{day.date}</div>
                            <div className="text-gray-400">{day.dayOfWeek}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {hasIn ? (
                              <span className={`font-medium ${day.hasManualIn ? "text-blue-600" : "text-green-600"}`}>
                                {day.hasManualIn ? "📝" : "✓"} {day.firstIn}
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="time"
                                  value={fixes[day.dayId]?.manualIn || ""}
                                  onChange={e => setFix(day.dayId, "manualIn", e.target.value)}
                                  className="border rounded px-1 py-0.5 w-20 text-center text-xs"
                                />
                                <button 
                                  onClick={() => setFix(day.dayId, "manualIn", SHIFT.inTime)}
                                  className="text-blue-600 hover:text-blue-800" title="Use 09:00">
                                  ⏱
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {hasOut ? (
                              <span className={`font-medium ${day.hasManualOut ? "text-blue-600" : "text-green-600"}`}>
                                {day.hasManualOut ? "📝" : "✓"} {day.lastOut}
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="time"
                                  value={fixes[day.dayId]?.manualOut || ""}
                                  onChange={e => setFix(day.dayId, "manualOut", e.target.value)}
                                  className="border rounded px-1 py-0.5 w-20 text-center text-xs"
                                />
                                <button 
                                  onClick={() => setFix(day.dayId, "manualOut", SHIFT.outTime)}
                                  className="text-purple-600 hover:text-purple-800" title="Use 17:30">
                                  ⏱
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {hasFix ? (
                              <button 
                                onClick={() => resetFix(day.dayId)}
                                className="text-red-500 hover:text-red-700 text-xs"
                                title="Reset changes">
                                ✕ Reset
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  if (!hasIn) setFix(day.dayId, "manualIn", SHIFT.inTime);
                                  if (!hasOut) setFix(day.dayId, "manualOut", SHIFT.outTime);
                                }}
                                className="text-green-600 hover:text-green-800 text-xs"
                                title="Auto-fill missing times">
                                ✨ Auto
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                👈 Select an employee to fix their missing punches
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissingPunchDashboard;

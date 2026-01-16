// ShiftAssign.jsx - User-friendly shift assignment UI
import React, { useState, useEffect, useMemo } from "react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  localStorage.getItem("baseUrl") ||
  "http://localhost:8080/api";

const authHeaders = () => {
  const t = localStorage.getItem("token") || "";
  const h = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

async function apiGet(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function ShiftAssign() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, shiftList] = await Promise.all([
        apiGet(`${API_BASE}/employees`),
        apiGet(`${API_BASE}/shifts`),
      ]);
      setEmployees(emps.filter(e => e.status === "ACTIVE"));
      setShifts(shiftList.filter(s => s.active !== false));
      if (shiftList.length > 0) {
        setSelectedShift(shiftList[0]);
        loadAssignments(shiftList[0].code);
      }
    } catch {
      setEmployees([]);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (shiftCode) => {
    try {
      const data = await apiGet(`${API_BASE}/employee-shifts/by-shift/${shiftCode}`);
      setAssignments(data);
      // Pre-select assigned employees
      const assigned = data.map(a => a.employee?.empCode).filter(Boolean);
      setSelectedEmps(assigned);
    } catch {
      setAssignments([]);
      setSelectedEmps([]);
    }
  };

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  const filteredEmps = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const matchSearch = !q || 
        e.firstName?.toLowerCase().includes(q) ||
        e.lastName?.toLowerCase().includes(q) ||
        e.empCode?.toLowerCase().includes(q);
      const matchDept = !filterDept || e.department === filterDept;
      return matchSearch && matchDept;
    });
  }, [employees, search, filterDept]);

  const toggleEmployee = (empCode) => {
    setSelectedEmps(prev => 
      prev.includes(empCode) 
        ? prev.filter(e => e !== empCode)
        : [...prev, empCode]
    );
  };

  const selectAll = () => {
    const allCodes = filteredEmps.map(e => e.empCode);
    const allSelected = allCodes.every(c => selectedEmps.includes(c));
    if (allSelected) {
      setSelectedEmps(prev => prev.filter(c => !allCodes.includes(c)));
    } else {
      setSelectedEmps(prev => [...new Set([...prev, ...allCodes])]);
    }
  };

  const addToPending = () => {
    if (!selectedShift) return setMessage({ type: "error", text: "Please select a shift" });
    if (selectedEmps.length === 0) return setMessage({ type: "error", text: "Please select employees" });
    if (!startDate) return setMessage({ type: "error", text: "Please select start date" });

    const newAssignments = selectedEmps.map(empCode => {
      const emp = employees.find(e => e.empCode === empCode);
      return {
        empCode,
        empName: `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim(),
        shiftCode: selectedShift.code,
        shiftName: selectedShift.name,
        startDate,
        endDate: endDate || startDate,
      };
    });

    // Remove duplicates
    setPendingAssignments(prev => {
      const existing = new Set(prev.map(p => `${p.empCode}-${p.shiftCode}-${p.startDate}`));
      const unique = newAssignments.filter(n => !existing.has(`${n.empCode}-${n.shiftCode}-${n.startDate}`));
      return [...prev, ...unique];
    });

    setMessage({ type: "success", text: `Added ${newAssignments.length} assignment(s) to preview` });
    setTimeout(() => setMessage(null), 3000);
  };

  const removePending = (index) => {
    setPendingAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const saveAssignments = async () => {
    if (pendingAssignments.length === 0) return;
    setSaving(true);
    try {
      const payload = pendingAssignments.map(a => ({
        empCode: a.empCode,
        shiftCode: a.shiftCode,
        patternType: "NONE",
        startDate: a.startDate,
        endDate: a.endDate,
        primary: true,
      }));
      await apiPost(`${API_BASE}/employee-shifts/bulk`, payload);
      setMessage({ type: "success", text: `Saved ${payload.length} assignment(s) successfully!` });
      setPendingAssignments([]);
      if (selectedShift) loadAssignments(selectedShift.code);
    } catch {
      setMessage({ type: "error", text: "Failed to save assignments" });
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return "";
    const time = t.slice(0, 5);
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">📅 Assign Shifts</h1>
        <p className="text-slate-500 text-sm mt-1">Assign employees to work shifts</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Shift Selection & Employees */}
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Select Shift */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">1</span>
              Select Shift
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {shifts.map(shift => (
                <button
                  key={shift.code}
                  onClick={() => {
                    setSelectedShift(shift);
                    loadAssignments(shift.code);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedShift?.code === shift.code
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500"
                      : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-slate-800">{shift.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Employees */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">2</span>
              Select Employees
              <span className="ml-auto text-sm font-normal text-slate-500">
                {selectedEmps.length} selected
              </span>
            </h2>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                onClick={selectAll}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                {filteredEmps.every(e => selectedEmps.includes(e.empCode)) ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* Employee List */}
            <div className="max-h-64 overflow-auto border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                {filteredEmps.map(emp => {
                  const isSelected = selectedEmps.includes(emp.empCode);
                  const isAssigned = assignments.some(a => a.employee?.empCode === emp.empCode);
                  return (
                    <button
                      key={emp.empCode}
                      onClick={() => toggleEmployee(emp.empCode)}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all text-left ${
                        isSelected 
                          ? "bg-emerald-100 border-emerald-300" 
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{emp.empCode}</div>
                      </div>
                      {isAssigned && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          Assigned
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filteredEmps.length === 0 && (
                <div className="p-8 text-center text-slate-500">No employees found</div>
              )}
            </div>
          </div>

          {/* Step 3: Set Dates */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">3</span>
              Set Duration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">End Date (optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addToPending}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                >
                  ➕ Add to Preview
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pending Assignments */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">📋 Pending ({pendingAssignments.length})</h2>
              {pendingAssignments.length > 0 && (
                <button
                  onClick={() => setPendingAssignments([])}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear All
                </button>
              )}
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm">No pending assignments</p>
                <p className="text-xs mt-1">Select shift, employees & dates to add</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {pendingAssignments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{a.empName}</div>
                      <div className="text-xs text-slate-500">
                        {a.shiftName} • {a.startDate}
                      </div>
                    </div>
                    <button
                      onClick={() => removePending(i)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingAssignments.length > 0 && (
              <button
                onClick={saveAssignments}
                disabled={saving}
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : `💾 Save ${pendingAssignments.length} Assignment(s)`}
              </button>
            )}
          </div>

          {/* Current Assignments */}
          {selectedShift && assignments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <h2 className="font-semibold text-slate-800 mb-3">
                Current: {selectedShift.name}
              </h2>
              <div className="space-y-1 max-h-48 overflow-auto">
                {assignments.slice(0, 10).map((a, i) => (
                  <div key={i} className="text-sm p-2 bg-slate-50 rounded-lg">
                    {a.employee?.firstName} {a.employee?.lastName}
                    <span className="text-slate-400 ml-1">({a.employee?.empCode})</span>
                  </div>
                ))}
                {assignments.length > 10 && (
                  <div className="text-sm text-slate-500 text-center py-2">
                    +{assignments.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

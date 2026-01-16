// src/routes/Employees/EmployeeList.jsx
// Modern, clean employee listing with search and card/table view
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { TEMPLATE_COLUMNS } from "./employeeTemplateSchema";
import { TEMPLATE_TO_MODEL } from "./employeeTemplateMappings";

const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (localStorage.getItem("baseUrl")) return localStorage.getItem("baseUrl");
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080/api';
  return `http://${hostname}:8080/api`;
};
const API_BASE = getApiBase();

const getToken = () =>
  sessionStorage.getItem("hrms_access_token") ||
  localStorage.getItem("token") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_TOKEN) ||
  "";

const getOrgId = () =>
  localStorage.getItem("hrms_tenant_id") ||
  localStorage.getItem("orgId") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ORG_ID) ||
  "";

const adaptApiEmployee = (e) => ({
  id: e.id,
  emp_code: e.empCode ?? "",
  first_name: e.firstName ?? "",
  last_name: e.lastName ?? "",
  department: e.department ?? "",
  designation: e.designation ?? "",
  employment_type: e.employmentType ?? "",
  shifts: Array.isArray(e.shifts) ? e.shifts : [],
  join_date: e.joinDate ?? "",
  status: e.status ?? "",
  salary_basis: (e.salaryBasis ?? "").toUpperCase(),
  base_salary: Number(e.baseSalary ?? 0),
  hourly_rate: Number(e.hourlyRate ?? 0),
  email: e.email ?? "",
  phone: e.phone ?? "",
  address: e.address ?? "",
  city: e.city ?? "",
  state: e.state ?? "",
  pincode: e.pincode ?? "",
  aadhaar: e.aadhaar ?? "",
  pan: e.pan ?? "",
  bank_account: e.bankAccount ?? "",
  ifsc: e.ifsc ?? "",
  bank_name: e.bankName ?? "",
  emergency_contact_name: e.emergencyContactName ?? "",
  emergency_contact_phone: e.emergencyContactPhone ?? "",
  ot_allowed: !!e.otAllowed,
  ot_duration_minutes: e.otDurationMinutes ?? null,
  org_id: getOrgId(),
});

const normalizeRow = (row) => {
  const model = {};
  Object.entries(TEMPLATE_TO_MODEL).forEach(([xlsKey, modelKey]) => {
    model[modelKey] = row?.[xlsKey] ?? "";
  });
  if (model.salary_basis) {
    const basis = ("" + model.salary_basis).toUpperCase();
    model.salary_basis = basis === "HOURLY" ? "HOURLY" : "MONTHLY";
  }
  model.base_salary = Number(model.base_salary) || 0;
  model.hourly_rate = Number(model.hourly_rate) || 0;
  if (model.join_date) {
    const d = new Date(model.join_date);
    if (!isNaN(d)) model.join_date = d.toISOString().slice(0, 10);
  }
  if (model.shifts) {
    model.shifts = ("" + model.shifts).split(",").map((s) => s.trim()).filter(Boolean);
  } else model.shifts = [];
  model.status = model.status || "ACTIVE";
  if (!model.org_id && getOrgId()) model.org_id = getOrgId();
  return model;
};

export default function EmployeeList() {
  const nav = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [viewMode, setViewMode] = useState("table"); // table or cards

  const authHeaders = useMemo(() => {
    const t = getToken();
    const tenantId = getOrgId() || 'SASA001';
    const h = { 
      "Content-Type": "application/json",
      "X-Tenant-Id": tenantId
    };
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const orgId = getOrgId();
      const url = orgId
        ? `${API_BASE}/employees?orgId=${encodeURIComponent(orgId)}`
        : `${API_BASE}/employees`;
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map(adaptApiEmployee)
        : Array.isArray(data?.content)
        ? data.content.map(adaptApiEmployee)
        : [];
      setEmployees(list);
    } catch (e) {
      console.error(e);
      setErr("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.last_name?.toLowerCase().includes(searchLower) ||
        emp.emp_code?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.phone?.includes(search) ||
        emp.department?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = filterStatus === "ALL" || emp.status === filterStatus;
      
      // Department filter
      const matchesDept = filterDept === "ALL" || emp.department === filterDept;
      
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, search, filterStatus, filterDept]);

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "Employee_Template.xlsx");
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const incoming = json.map(normalizeRow);

      const map = new Map();
      [...employees, ...incoming].forEach((emp) => {
        map.set(emp.emp_code, emp);
      });
      setEmployees(Array.from(map.values()));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleBulkSubmit = async () => {
    if (employees.length === 0) return alert("No employees to submit!");
    try {
      const res = await fetch(`${API_BASE}/employees/bulk-upload`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(
          employees.map((e) => (e.org_id ? e : { ...e, org_id: getOrgId() }))
        ),
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      alert("Employees uploaded successfully!");
      fetchEmployees();
    } catch (err) {
      console.error(err);
      alert("Error while uploading employees.");
    }
  };

  const handleDelete = async (emp_code) => {
    if (!emp_code) return;
    if (!window.confirm("Delete this employee?")) return;
    try {
      const url = `${API_BASE}/employees/${encodeURIComponent(emp_code)}`;
      const res = await fetch(url, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setEmployees((prev) => prev.filter((e) => e.emp_code !== emp_code));
    } catch (e) {
      console.error(e);
      alert("Failed to delete employee.");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
      INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
      RESIGNED: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status] || styles.INACTIVE}`}>
        {status}
      </span>
    );
  };

  const getInitials = (firstName, lastName) => {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
  };

  const formatSalary = (emp) => {
    if (emp.salary_basis === "HOURLY") {
      return emp.hourly_rate ? `₹${emp.hourly_rate}/hr` : "-";
    }
    return emp.base_salary ? `₹${Number(emp.base_salary).toLocaleString('en-IN')}` : "-";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {filteredEmployees.length} of {employees.length} employees
              </p>
            </div>
            <button
              onClick={() => nav("/employees/new")}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span> Add Employee
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by name, code, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RESIGNED">Resigned</option>
              </select>
              
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-2 text-sm ${viewMode === "table" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  📋
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-2 text-sm ${viewMode === "cards" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  🗃️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportTemplate}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium flex items-center gap-2"
            >
              📥 Download Template
            </button>
            <label className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors cursor-pointer text-sm font-medium flex items-center gap-2">
              📤 Import Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={handleBulkSubmit}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium flex items-center gap-2"
            >
              ☁️ Sync to Backend
            </button>
            <button
              onClick={fetchEmployees}
              className="ml-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              🔄 Refresh
            </button>
          </div>
          {err && <div className="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded">{err}</div>}
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Employees Found</h3>
            <p className="text-slate-500 mb-4">
              {search || filterStatus !== "ALL" || filterDept !== "ALL"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first employee"}
            </p>
            {!search && filterStatus === "ALL" && filterDept === "ALL" && (
              <button
                onClick={() => nav("/employees/new")}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                + Add First Employee
              </button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.emp_code}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.emp_code}
                        </h3>
                        {getStatusBadge(emp.status)}
                      </div>
                      <p className="text-sm text-slate-500">{emp.emp_code}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400">🏢</span>
                      <span className="truncate">{emp.department || "-"}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate">{emp.designation || "-"}</span>
                    </div>
                    {emp.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">📧</span>
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">📱</span>
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400">💰</span>
                      <span className="font-medium text-emerald-600">{formatSalary(emp)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t flex gap-2">
                  <button
                    onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}`, { state: { employee: emp } })}
                    className="flex-1 px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}/edit`, { state: { employee: emp } })}
                    className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(emp.emp_code)}
                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Join Date</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Salary</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.emp_code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {getInitials(emp.first_name, emp.last_name)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "-"}
                            </div>
                            <div className="text-xs text-slate-500">{emp.emp_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{emp.department || "-"}</div>
                        <div className="text-xs text-slate-500">{emp.designation || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{emp.email || "-"}</div>
                        <div className="text-xs text-slate-500">{emp.phone || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.join_date || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatSalary(emp)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(emp.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}`, { state: { employee: emp } })}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}/edit`, { state: { employee: emp } })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(emp.emp_code)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

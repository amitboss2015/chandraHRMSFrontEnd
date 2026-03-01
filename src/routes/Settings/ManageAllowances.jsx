// ManageAllowances.jsx - Bulk assign/remove allowance types to employees
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { allowanceApi, employeeApi, devicesApi, getTenantId } from "../../services/api";

export default function ManageAllowances() {
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState(null);

  const loadAssignedIds = async (typeId) => {
    if (!typeId) return;
    setLoadingAssigned(true);
    try {
      const ids = await allowanceApi.getAssignedEmployeeIds(typeId);
      setSelectedEmpIds(new Set(Array.isArray(ids) ? ids : []));
    } catch (e) {
      console.error(e);
      setSelectedEmpIds(new Set());
    } finally {
      setLoadingAssigned(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [types, emps, devList] = await Promise.all([
        allowanceApi.listTypes(getTenantId()),
        employeeApi.getAll(),
        devicesApi.getList(true).catch(() => []),
      ]);
      setAllowanceTypes(Array.isArray(types) ? types : []);
      setEmployees(Array.isArray(emps) ? emps : []);
      setDevices(Array.isArray(devList) ? devList : []);
      if (!selectedTypeId && types?.length > 0) {
        setSelectedTypeId(String(types[0].id));
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: e.message || "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      loadAssignedIds(selectedTypeId);
    } else {
      setSelectedEmpIds(new Set());
    }
  }, [selectedTypeId]);

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      !search ||
      [emp.empCode, emp.firstName, emp.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchDept = !deptFilter || emp.department === deptFilter;
    const matchDevice =
      !deviceFilter ||
      (deviceFilter === "__none__" ? !emp.biometricDeviceId : String(emp.biometricDeviceId) === deviceFilter);
    return matchSearch && matchDept && matchDevice;
  });

  const toggleEmployee = (id) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEmpIds.size === filteredEmployees.length) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(filteredEmployees.map((e) => e.id).filter(Boolean)));
    }
  };

  const assign = async () => {
    if (!selectedTypeId || selectedEmpIds.size === 0) {
      setMessage({ type: "warning", text: "Select an allowance type and at least one employee" });
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await allowanceApi.bulkAssign(Number(selectedTypeId), [...selectedEmpIds]);
      setMessage({ type: "success", text: res.message || `Assigned to ${res.assignedCount} employee(s)` });
      loadAssignedIds(selectedTypeId);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to assign" });
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async () => {
    if (!selectedTypeId || selectedEmpIds.size === 0) {
      setMessage({ type: "warning", text: "Select an allowance type and at least one employee" });
      return;
    }
    if (!confirm(`Remove this allowance from ${selectedEmpIds.size} selected employee(s)?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await allowanceApi.bulkRemove(Number(selectedTypeId), [...selectedEmpIds]);
      setMessage({ type: "success", text: res.message || `Removed from ${res.removedCount} employee(s)` });
      loadAssignedIds(selectedTypeId);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to remove" });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    amount != null
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
      : "₹0";

  const selectedType = allowanceTypes.find((t) => String(t.id) === selectedTypeId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Manage Allowance Assignment</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bulk assign or remove allowance types to/from employees
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : allowanceTypes.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              No allowance types found. Create types in{" "}
              <Link to="/settings/allowance-types" className="text-emerald-600 hover:underline">
                Settings → Allowance Types
              </Link>{" "}
              first.
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-slate-50">
                <label className="block text-sm font-medium text-slate-700 mb-2">1. Select Allowance Type</label>
                <select
                  className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2"
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  disabled={loadingAssigned}
                >
                  {allowanceTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({formatCurrency(t.amount)}/{t.calculationBasis === "PER_DAY" ? "day" : "month"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 border-b bg-slate-50 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Search employees</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="Code, name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Biometric Device</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="__none__">No device assigned</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.deviceCode || d.deviceName || `Device ${d.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 flex gap-3 border-b">
                <button
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                  onClick={assign}
                  disabled={actionLoading || selectedEmpIds.size === 0}
                >
                  {actionLoading ? "..." : `Assign to Selected (${selectedEmpIds.size})`}
                </button>
                <button
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 font-medium"
                  onClick={remove}
                  disabled={actionLoading || selectedEmpIds.size === 0}
                >
                  Remove from Selected ({selectedEmpIds.size})
                </button>
              </div>

              <div className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  2. Select Employees {loadingAssigned && <span className="text-slate-400 font-normal">(loading…)</span>}
                </label>
                <div className="mb-2">
                  <button
                    type="button"
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    onClick={toggleAll}
                  >
                    {selectedEmpIds.size === filteredEmployees.length ? "Deselect all" : "Select all"} ({filteredEmployees.length})
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto border rounded-lg divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-slate-500 text-sm">No employees match the filter</div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmpIds.has(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          className="rounded border-slate-300"
                        />
                        <span className="font-medium">{emp.empCode}</span>
                        <span className="text-slate-600">
                          {[emp.firstName, emp.lastName].filter(Boolean).join(" ")}
                        </span>
                        {emp.department && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {emp.department}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

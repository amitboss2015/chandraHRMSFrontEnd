// src/routes/Leaves/MarkLeave.jsx
import React, { useEffect, useState } from "react";
import {
  listLeaveTypes,
  previewMarkLeave,
  markLeave,
  listEmployees,
  listEmployeeLeaves,
  getBalanceForType,
  cancelLeave,
} from "./api";
import Field from "../../components/Field";

export default function MarkLeave({ orgId: propOrgId }) {
  const orgId = propOrgId || localStorage.getItem("orgId") || "ORG1";

  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [empQuery, setEmpQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(null);

  const [form, setForm] = useState({
    orgId,
    empId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    durationKind: "FULL_DAY",
    totalDays: 1,
    remarks: "",
  });

  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Helper functions
  const getEmpCode = (e) =>
    e?.empCode ?? e?.code ?? e?.empId ?? (e?.id != null ? String(e.id) : "");
  const getEmpName = (e) =>
    e?.name ?? e?.fullName ?? [e?.firstName, e?.lastName].filter(Boolean).join(" ");
  const parseEmpCode = (val) =>
    val && val.includes(" — ") ? val.split(" — ")[0] : val;

  // Calculate total days based on date range and duration kind
  const calculateTotalDays = (start, end, durationKind) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (durationKind === "HALF_DAY") {
      return diffDays * 0.5;
    }
    return diffDays;
  };

  // Load leave types
  useEffect(() => {
    listLeaveTypes(orgId)
      .then(setTypes)
      .catch((e) => console.error("Failed to load leave types:", e));
  }, [orgId]);

  // Load employees
  useEffect(() => {
    listEmployees()
      .then(setEmployees)
      .catch((e) => console.error("Failed to load employees:", e));
  }, []);

  // Load employee leave history when empId changes
  useEffect(() => {
    if (!form.empId) {
      setHistory([]);
      return;
    }
    listEmployeeLeaves(orgId, form.empId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [form.empId, orgId]);

  // Load balance when employee and leave type are selected
  useEffect(() => {
    if (!form.empId || !form.leaveTypeId) {
      setCurrentBalance(null);
      return;
    }
    const year = form.startDate ? new Date(form.startDate).getFullYear() : new Date().getFullYear();
    const month = form.startDate ? new Date(form.startDate).getMonth() + 1 : new Date().getMonth() + 1;
    
    getBalanceForType(orgId, form.empId, form.leaveTypeId, year, month)
      .then(setCurrentBalance)
      .catch(() => setCurrentBalance(null));
  }, [form.empId, form.leaveTypeId, form.startDate, orgId]);

  // Auto-calculate total days when dates change
  useEffect(() => {
    if (form.startDate && form.endDate) {
      const days = calculateTotalDays(form.startDate, form.endDate, form.durationKind);
      setForm((f) => ({ ...f, totalDays: days }));
    }
  }, [form.startDate, form.endDate, form.durationKind]);

  // Run preview
  const runPreview = async () => {
    setError(null);
    if (!form.empId || !form.leaveTypeId || !form.startDate || !form.endDate) {
      setError("Please fill all required fields");
      return;
    }
    setBusy(true);
    setPreview(null);
    try {
      const p = await previewMarkLeave({
        ...form,
        leaveTypeId: Number(form.leaveTypeId),
      });
      setPreview(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Save leave
  const save = async () => {
    setError(null);
    setSuccess(null);
    if (!form.empId || !form.leaveTypeId || !form.startDate || !form.endDate) {
      setError("Please fill all required fields");
      return;
    }
    setBusy(true);
    try {
      await markLeave({ ...form, leaveTypeId: Number(form.leaveTypeId) });
      setSuccess("Leave saved successfully!");
      setForm((f) => ({
        ...f,
        startDate: "",
        endDate: "",
        totalDays: 1,
        remarks: "",
      }));
      setPreview(null);
      // Refresh history and balance
      listEmployeeLeaves(orgId, form.empId).then(setHistory).catch(() => {});
      if (form.leaveTypeId) {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        getBalanceForType(orgId, form.empId, form.leaveTypeId, year, month)
          .then(setCurrentBalance)
          .catch(() => {});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Cancel leave
  const handleCancelLeave = async (leaveId) => {
    if (!confirm("Are you sure you want to cancel this leave?")) return;
    setBusy(true);
    try {
      await cancelLeave(leaveId, "Cancelled by admin");
      setSuccess("Leave cancelled successfully");
      listEmployeeLeaves(orgId, form.empId).then(setHistory).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Mark Leave (Admin)</h2>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Leave Form */}
      <div className="bg-white rounded-lg shadow-md p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Employee Selection */}
          <Field label="Employee" required>
            <input
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              list="emp-mark-list"
              placeholder="Search by code or name..."
              value={empQuery}
              onChange={(e) => {
                const v = e.target.value;
                setEmpQuery(v);
                setForm({ ...form, empId: parseEmpCode(v) });
              }}
              onBlur={() => {
                if (!empQuery.includes(" — ")) {
                  setForm((f) => ({ ...f, empId: empQuery }));
                }
              }}
            />
            <datalist id="emp-mark-list">
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
                  return (
                    <option key={e.id ?? code} value={`${code} — ${name}`} />
                  );
                })}
            </datalist>
          </Field>

          {/* Leave Type Selection */}
          <Field label="Leave Type" required>
            <select
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
            >
              <option value="">Select Leave Type</option>
              {types.map((t) => (
                <option key={t.id ?? `${t.code}-${t.name}`} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Duration Kind */}
          <Field label="Duration Type">
            <select
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
              value={form.durationKind}
              onChange={(e) => setForm({ ...form, durationKind: e.target.value })}
            >
              <option value="FULL_DAY">Full Day</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="HOURS">Hours</option>
            </select>
          </Field>

          {/* Start Date */}
          <Field label="Start Date" required>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>

          {/* End Date */}
          <Field label="End Date" required>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>

          {/* Total Days */}
          <Field label="Total Days">
            <input
              type="number"
              step="0.5"
              min="0.5"
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
              value={form.totalDays}
              onChange={(e) => setForm({ ...form, totalDays: Number(e.target.value || 0) })}
            />
          </Field>

          {/* Remarks */}
          <div className="md:col-span-3">
            <Field label="Remarks">
              <input
                className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
                placeholder="Optional remarks..."
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </Field>
          </div>
        </div>

        {/* Current Balance Display */}
        {currentBalance && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Current Balance</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {Number(currentBalance.monthlyBalance || 0).toFixed(1)}
                </div>
                <div className="text-sm text-blue-600">Monthly</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {Number(currentBalance.annualBalance || 0).toFixed(1)}
                </div>
                <div className="text-sm text-blue-600">Annual</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {Number(currentBalance.totalAvailable || 0).toFixed(1)}
                </div>
                <div className="text-sm text-green-600">Total Available</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-md disabled:opacity-50 transition-colors"
            disabled={busy}
            onClick={runPreview}
          >
            {busy ? "Processing..." : "Preview Impact"}
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-md disabled:opacity-50 transition-colors"
            disabled={busy}
            onClick={save}
          >
            {busy ? "Saving..." : "Save Leave"}
          </button>
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-slate-700">Leave Impact Preview</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-slate-500">From Monthly</div>
                <div className="text-xl font-bold text-orange-600">
                  -{Number(preview.willConsumeMonthly || 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-slate-500">From Annual</div>
                <div className="text-xl font-bold text-orange-600">
                  -{Number(preview.willConsumeAnnual || 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-slate-500">Monthly After</div>
                <div className="text-xl font-bold text-blue-600">
                  {Number(preview.monthlyBalanceAfter || 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-slate-500">Annual After</div>
                <div className="text-xl font-bold text-blue-600">
                  {Number(preview.annualBalanceAfter || 0).toFixed(1)}
                </div>
              </div>
              {preview.wouldConvertToUnpaid && (
                <div className="bg-red-50 p-3 rounded border border-red-200 md:col-span-2">
                  <div className="text-sm text-red-600">⚠️ Unpaid Days</div>
                  <div className="text-xl font-bold text-red-700">
                    {Number(preview.unpaidDays || 0).toFixed(1)} days will be unpaid
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leave History */}
      {form.empId && (
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="font-semibold text-lg text-slate-700 mb-4">
            Leave History for {form.empId}
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No leaves found for this employee.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">Type</th>
                    <th className="text-left p-3 font-medium text-slate-600">Duration</th>
                    <th className="text-left p-3 font-medium text-slate-600">From</th>
                    <th className="text-left p-3 font-medium text-slate-600">To</th>
                    <th className="text-right p-3 font-medium text-slate-600">Days</th>
                    <th className="text-left p-3 font-medium text-slate-600">Status</th>
                    <th className="text-left p-3 font-medium text-slate-600">Remarks</th>
                    <th className="text-center p-3 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h, idx) => (
                    <tr key={h.id ?? `${h.startDate}-${idx}`} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-medium text-slate-800">
                          {h.leaveType?.code}
                        </span>
                        <span className="text-slate-400"> — </span>
                        <span className="text-slate-600">{h.leaveType?.name}</span>
                      </td>
                      <td className="p-3 text-slate-600">{h.durationKind}</td>
                      <td className="p-3 text-slate-600">{h.startDate}</td>
                      <td className="p-3 text-slate-600">{h.endDate}</td>
                      <td className="p-3 text-right font-medium">{h.totalDays}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            h.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : h.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : h.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-xs">
                        {h.remarks || "-"}
                      </td>
                      <td className="p-3 text-center">
                        {h.status === "APPROVED" && (
                          <button
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                            onClick={() => handleCancelLeave(h.id)}
                            disabled={busy}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

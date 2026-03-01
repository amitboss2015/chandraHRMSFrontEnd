// AllowanceTypes.jsx - Manage dynamic allowance types (e.g. Fare Small ₹25, Fare Long ₹50)
import React, { useEffect, useState } from "react";
import { allowanceApi } from "../../services/api";
import { getTenantId } from "../../services/api";

const CALC_BASIS = [
  { value: "PER_DAY", label: "Per Day (days × rate)" },
  { value: "PER_MONTH", label: "Per Month (fixed)" },
  { value: "FIXED", label: "Fixed (one-time)" },
];
const DAYS_BASIS = [
  { value: "PRESENT_DAYS", label: "Present Days" },
  { value: "WORKING_DAYS", label: "Working Days" },
];

export default function AllowanceTypes() {
  const orgId = getTenantId() || "";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    amount: 0,
    calculationBasis: "PER_DAY",
    daysBasis: "PRESENT_DAYS",
    active: true,
  });

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await allowanceApi.listAllTypes(orgId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load allowance types");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [orgId]);

  const startCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      amount: 0,
      calculationBasis: "PER_DAY",
      daysBasis: "PRESENT_DAYS",
      active: true,
    });
    setShowEditor(true);
  };

  const startEdit = (r) => {
    setEditing(r);
    setForm({
      code: r.code || "",
      name: r.name || "",
      amount: r.amount ?? 0,
      calculationBasis: r.calculationBasis || "PER_DAY",
      daysBasis: r.daysBasis || "PRESENT_DAYS",
      active: r.active !== false,
    });
    setShowEditor(true);
  };

  const save = async () => {
    const payload = { ...form, tenantId: orgId };
    if (!payload.code || !payload.name) {
      alert("Code and Name are required");
      return;
    }
    try {
      if (editing) {
        await allowanceApi.updateType(editing.id, payload);
      } else {
        await allowanceApi.createType(payload);
      }
      setEditing(null);
      setShowEditor(false);
      await refresh();
    } catch (e) {
      alert(e.message || "Failed to save");
    }
  };

  const deleteType = async (r) => {
    if (!confirm(`Delete allowance type "${r.name}"?`)) return;
    try {
      await allowanceApi.deleteType(r.id);
      await refresh();
    } catch (e) {
      alert(e.message || "Failed to delete");
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Allowance Types</h1>
            <p className="text-slate-500 text-sm mt-1">
              Create attendance-based allowances (e.g. Fare Small ₹25/day, Fare Long ₹50/day)
            </p>
          </div>
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium"
            onClick={startCreate}
          >
            + New Type
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-700 bg-red-50">{error}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              No allowance types yet. Create one to assign to employees.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3 font-semibold text-slate-700">Code</th>
                    <th className="p-3 font-semibold text-slate-700">Name</th>
                    <th className="p-3 font-semibold text-slate-700">Amount</th>
                    <th className="p-3 font-semibold text-slate-700">Calculation</th>
                    <th className="p-3 font-semibold text-slate-700">Days Basis</th>
                    <th className="p-3 font-semibold text-slate-700">Status</th>
                    <th className="p-3 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-medium">{r.code}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{formatCurrency(r.amount)}</td>
                      <td className="p-3">{r.calculationBasis || "PER_DAY"}</td>
                      <td className="p-3">{r.daysBasis || "PRESENT_DAYS"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {r.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-4 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          onClick={() => deleteType(r)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showEditor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">
                {editing ? "Edit" : "Create"} Allowance Type
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. FARE_SMALL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Fare Small Distance"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calculation Basis</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={form.calculationBasis}
                    onChange={(e) => setForm({ ...form, calculationBasis: e.target.value })}
                  >
                    {CALC_BASIS.map((x) => (
                      <option key={x.value} value={x.value}>{x.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Days Basis</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    value={form.daysBasis}
                    onChange={(e) => setForm({ ...form, daysBasis: e.target.value })}
                  >
                    {DAYS_BASIS.map((x) => (
                      <option key={x.value} value={x.value}>{x.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <label htmlFor="active" className="text-sm">Active</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium"
                  onClick={save}
                >
                  Save
                </button>
                <button
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300"
                  onClick={() => {
                    setShowEditor(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

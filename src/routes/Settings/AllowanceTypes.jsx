// AllowanceTypes.jsx - Manage dynamic allowance types (e.g. Fare Small ₹25, Fare Long ₹50, Meal Allowance for second shift)
import React, { useEffect, useState } from "react";
import { allowanceApi, shiftApi } from "../../services/api";
import { getTenantId } from "../../services/api";

const CALC_BASIS = [
  { value: "PER_DAY", label: "Per Day (days × rate)" },
  { value: "PER_MONTH", label: "Per Month (fixed)" },
  { value: "FIXED", label: "Fixed (one-time)" },
];
const DAYS_BASIS = [
  { value: "PRESENT_DAYS", label: "Present Days" },
  { value: "WORKING_DAYS", label: "Working Days" },
  { value: "ELIGIBLE_SHIFT_DAYS", label: "Eligible shift days (only days that match shift + min work mins)" },
];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

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
    shiftCodeFilter: "",
    minWorkMinutesForEligibility: "",
    payoutMonth: "",
    payoutYear: "",
    active: true,
  });
  const [shifts, setShifts] = useState([]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, shiftList] = await Promise.all([
        allowanceApi.listAllTypes(orgId),
        shiftApi.getAll().catch(() => []),
      ]);
      setRows(Array.isArray(data) ? data : []);
      setShifts(Array.isArray(shiftList) ? shiftList : []);
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
      shiftCodeFilter: "",
      minWorkMinutesForEligibility: "",
      payoutMonth: "",
      payoutYear: "",
      active: true,
    });
    setShowEditor(true);
  };

  const startEdit = (r) => {
    setEditing(r);
    const shiftFilter = (r.shiftCodeFilter || r.shiftCode || "").trim();
    const hasShiftFilter = !!shiftFilter || r.minWorkMinutesForEligibility != null;
    setForm({
      code: r.code || "",
      name: r.name || "",
      amount: r.amount ?? 0,
      calculationBasis: r.calculationBasis || "PER_DAY",
      daysBasis: hasShiftFilter ? "ELIGIBLE_SHIFT_DAYS" : (r.daysBasis || "PRESENT_DAYS"),
      shiftCodeFilter: shiftFilter || "",
      minWorkMinutesForEligibility: r.minWorkMinutesForEligibility ?? "",
      payoutMonth: r.payoutMonth != null ? String(r.payoutMonth) : "",
      payoutYear: r.payoutYear != null ? String(r.payoutYear) : "",
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
    if (payload.calculationBasis === "FIXED") {
      const pm = payload.payoutMonth != null && payload.payoutMonth !== "" ? parseInt(payload.payoutMonth, 10) : null;
      const py = payload.payoutYear != null && payload.payoutYear !== "" ? parseInt(payload.payoutYear, 10) : null;
      if (pm == null || py == null || pm < 1 || pm > 12) {
        alert("For Fixed (one-time), Payout month and year are required so salary calculation includes this allowance only in that month.");
        return;
      }
      payload.payoutMonth = pm;
      payload.payoutYear = py;
    } else {
      payload.payoutMonth = null;
      payload.payoutYear = null;
    }
    if (payload.shiftCodeFilter === "") payload.shiftCodeFilter = null;
    if (payload.minWorkMinutesForEligibility === "" || payload.minWorkMinutesForEligibility == null) {
      payload.minWorkMinutesForEligibility = null;
    } else {
      payload.minWorkMinutesForEligibility = parseInt(payload.minWorkMinutesForEligibility, 10) || null;
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
                    <th className="p-3 font-semibold text-slate-700">Shift Filter</th>
                    <th className="p-3 font-semibold text-slate-700">Min Mins</th>
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
                      <td className="p-3">
                        {r.calculationBasis === "FIXED" && r.payoutMonth != null && r.payoutYear != null
                          ? `Fixed (one-time) – ${MONTH_NAMES[r.payoutMonth - 1]} ${r.payoutYear}`
                          : (r.calculationBasis || "PER_DAY")}
                      </td>
                      <td className="p-3">
                        {r.calculationBasis === "FIXED" ? "—" : (DAYS_BASIS.find((x) => x.value === (r.daysBasis || "PRESENT_DAYS"))?.label || r.daysBasis)}
                      </td>
                      <td className="p-3 text-slate-600">{r.shiftCodeFilter || "—"}</td>
                      <td className="p-3 text-slate-600">{r.minWorkMinutesForEligibility ?? "—"}</td>
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({
                        ...form,
                        calculationBasis: v,
                        ...(v === "FIXED" ? { daysBasis: "PRESENT_DAYS" } : {}),
                      });
                    }}
                  >
                    {CALC_BASIS.map((x) => (
                      <option key={x.value} value={x.value}>{x.label}</option>
                    ))}
                  </select>
                </div>
                {form.calculationBasis === "FIXED" && (
                  <>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-3">
                      <strong>Bonus / one-time payout:</strong> This allowance is included in salary only for the month and year you select below. No days basis is used.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payout month *</label>
                        <select
                          className="w-full border border-slate-300 rounded-lg px-3 py-2"
                          value={form.payoutMonth}
                          onChange={(e) => setForm({ ...form, payoutMonth: e.target.value })}
                        >
                          <option value="">Select month</option>
                          {MONTH_NAMES.map((name, i) => (
                            <option key={i} value={i + 1}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payout year *</label>
                        <select
                          className="w-full border border-slate-300 rounded-lg px-3 py-2"
                          value={form.payoutYear}
                          onChange={(e) => setForm({ ...form, payoutYear: e.target.value })}
                        >
                          <option value="">Select year</option>
                          {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
                {form.calculationBasis !== "FIXED" && (
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
                )}
                {form.calculationBasis === "PER_DAY" && form.daysBasis === "ELIGIBLE_SHIFT_DAYS" && (
                  <div className="border-t pt-4 mt-2 space-y-3">
                    <p className="text-sm font-medium text-slate-700">Eligibility conditions (only days fulfilling these will be counted)</p>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Shift Code Filter (required)</label>
                      <input
                        type="text"
                        placeholder="e.g. EVENING or NIGHT"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        value={form.shiftCodeFilter || ""}
                        onChange={(e) => setForm({ ...form, shiftCodeFilter: e.target.value })}
                        list="shift-codes-list"
                      />
                      <datalist id="shift-codes-list">
                        {shifts.map((s) => (
                          <option key={s.id} value={s.code} />
                        ))}
                      </datalist>
                      {shifts.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Quick add: {shifts.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="mr-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                              onClick={() => {
                                const cur = form.shiftCodeFilter || "";
                                const add = cur ? (cur.split(",").includes(s.code) ? cur : cur + "," + s.code) : s.code;
                                setForm({ ...form, shiftCodeFilter: add });
                              }}
                            >
                              {s.code}
                            </button>
                          ))}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">Only days when employee is assigned to this shift, or worked it, or work overlapped this shift timing.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Min Work Minutes</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 240 (4 hrs). Leave empty for no minimum."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        value={form.minWorkMinutesForEligibility ?? ""}
                        onChange={(e) => setForm({ ...form, minWorkMinutesForEligibility: e.target.value })}
                      />
                      <p className="text-xs text-slate-500 mt-1">Only days with at least this many work minutes on that day will be counted. Leave empty for no minimum.</p>
                    </div>
                  </div>
                )}
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

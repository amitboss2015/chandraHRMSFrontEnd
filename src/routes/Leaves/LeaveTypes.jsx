import React, { useEffect, useState } from "react";
import {
  listLeaveTypes,
  createLeaveType,
  updateLeaveType,
  activateLeaveType,
  deactivateLeaveType,
} from "./api";
import Field from "../../components/Field";

const ACCRUALS = ["ANNUAL", "MONTHLY", "HYBRID"];
const CF_BEHAVS = ["NONE", "ACCUMULATE_TO_ANNUAL", "ROLLOVER_MONTH", "EXPIRE"];
const CONSUME = ["MONTHLY_THEN_ANNUAL", "ANNUAL_THEN_MONTHLY"];
const MIN_UNITS = ["DAY", "HALF", "HOUR"];

export default function LeaveTypes({ orgId: propOrgId }) {
  const orgId = propOrgId || localStorage.getItem("hrms_tenant_id") || localStorage.getItem("orgId") || "SASA001";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // existing record or null
  const [showEditor, setShowEditor] = useState(false); // <<< new flag
  const [form, setForm] = useState({
    orgId,
    isPaid: true,
    accrualMode: "ANNUAL",
    consumeOrder: "MONTHLY_THEN_ANNUAL",
    minUnit: "DAY",
    active: true,
  });

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listLeaveTypes(orgId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load leave types");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, [orgId]);

  const startCreate = () => {
    setEditing(null);
    setForm({
      orgId,
      code: "",
      name: "",
      isPaid: true,
      accrualMode: "ANNUAL",
      consumeOrder: "MONTHLY_THEN_ANNUAL",
      minUnit: "DAY",
      active: true,
    });
    setShowEditor(true);               // <<< open editor
  };

  const startEdit = (r) => {
    setEditing(r);
    setForm({ ...r, orgId });
    setShowEditor(true);               // <<< open editor
  };

  const save = async () => {
    const payload = { ...form, orgId };
    if (!payload.code || !payload.name) return alert("Code and Name are required");
    try {
      editing ? await updateLeaveType(editing.id, payload) : await createLeaveType(payload);
      setEditing(null);
      setShowEditor(false);
      await refresh();
    } catch (e) {
      alert(e.message || "Failed to save");
    }
  };

  const toggleActive = async (r) => {
    try {
      if (r.active) await deactivateLeaveType(r.id);
      else await activateLeaveType(r.id);
      await refresh();
    } catch (e) {
      alert(e.message || "Failed to toggle active");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Leave Types</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={startCreate}>
          + New Type
        </button>
      </div>

      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">Error: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No leave types yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-2">Code</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Paid</th>
                  <th className="p-2">Accrual</th>
                  <th className="p-2">M.Quota</th>
                  <th className="p-2">M.CF</th>
                  <th className="p-2">Annual</th>
                  <th className="p-2">A.CF</th>
                  <th className="p-2">Consume</th>
                  <th className="p-2">MinUnit</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.code}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.isPaid ? "Yes" : "No"}</td>
                    <td className="p-2">{r.accrualMode}</td>
                    <td className="p-2">{r.monthlyQuotaDays ?? "-"}</td>
                    <td className="p-2">{r.monthlyCfBehavior ?? "-"}</td>
                    <td className="p-2">{r.annualAllocationDays ?? "-"}</td>
                    <td className="p-2">
                      {r.annualCfAllowed ? `Yes (cap ${r.annualCfCapDays ?? "-"})` : "No"}
                    </td>
                    <td className="p-2">{r.consumeOrder}</td>
                    <td className="p-2">{r.minUnit}</td>
                    <td className="p-2">{r.active ? "Active" : "Inactive"}</td>
                    <td className="p-2 flex gap-2">
                      <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => startEdit(r)}>
                        Edit
                      </button>
                      <button className="px-2 py-1 bg-slate-600 text-white rounded" onClick={() => toggleActive(r)}>
                        {r.active ? "Deactivate" : "Activate"}
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
        <div className="bg-white rounded shadow p-4 space-y-3">
          <h3 className="font-semibold text-lg">{editing ? "Edit" : "Create"} Leave Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Code" required>
              <input
                className="border p-2 rounded w-full"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </Field>
            <Field label="Name" required>
              <input
                className="border p-2 rounded w-full"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Paid?">
              <input
                type="checkbox"
                checked={!!form.isPaid}
                onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
              />
            </Field>

            <Field label="Accrual Mode">
              <select
                className="border p-2 rounded w-full"
                value={form.accrualMode || "ANNUAL"}
                onChange={(e) => setForm({ ...form, accrualMode: e.target.value })}
              >
                {ACCRUALS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Field>

            <Field label="Monthly Quota (days)">
              <input
                className="border p-2 rounded w-full"
                type="number"
                step="0.5"
                value={form.monthlyQuotaDays ?? ""}
                onChange={(e) =>
                  setForm({ ...form, monthlyQuotaDays: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>

            <Field label="Monthly CF Behavior">
              <select
                className="border p-2 rounded w-full"
                value={form.monthlyCfBehavior || ""}
                onChange={(e) => setForm({ ...form, monthlyCfBehavior: e.target.value || null })}
              >
                <option value="">-</option>
                {CF_BEHAVS.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>

            <Field label="Monthly CF Cap (days)">
              <input
                className="border p-2 rounded w-full"
                type="number"
                step="0.5"
                value={form.monthlyCfCapDays ?? ""}
                onChange={(e) =>
                  setForm({ ...form, monthlyCfCapDays: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>

            <Field label="Annual Allocation (days)">
              <input
                className="border p-2 rounded w-full"
                type="number"
                step="0.5"
                value={form.annualAllocationDays ?? ""}
                onChange={(e) =>
                  setForm({ ...form, annualAllocationDays: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>

            <Field label="Annual CF Allowed">
              <input
                type="checkbox"
                checked={!!form.annualCfAllowed}
                onChange={(e) => setForm({ ...form, annualCfAllowed: e.target.checked })}
              />
            </Field>

            <Field label="Annual CF Cap (days)">
              <input
                className="border p-2 rounded w-full"
                type="number"
                step="0.5"
                value={form.annualCfCapDays ?? ""}
                onChange={(e) =>
                  setForm({ ...form, annualCfCapDays: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>

            <Field label="Consume Order">
              <select
                className="border p-2 rounded w-full"
                value={form.consumeOrder || "MONTHLY_THEN_ANNUAL"}
                onChange={(e) => setForm({ ...form, consumeOrder: e.target.value })}
              >
                {CONSUME.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Min Unit">
              <select
                className="border p-2 rounded w-full"
                value={form.minUnit || "DAY"}
                onChange={(e) => setForm({ ...form, minUnit: e.target.value })}
              >
                {MIN_UNITS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>

            <Field label="Exclude Weekly Offs">
              <input
                type="checkbox"
                checked={!!form.excludeWeeklyOffs}
                onChange={(e) => setForm({ ...form, excludeWeeklyOffs: e.target.checked })}
              />
            </Field>
            <Field label="Exclude Holidays">
              <input
                type="checkbox"
                checked={!!form.excludeHolidays}
                onChange={(e) => setForm({ ...form, excludeHolidays: e.target.checked })}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={save}>
              {editing ? "Update" : "Create"}
            </button>
            <button
              className="bg-slate-600 text-white px-3 py-2 rounded"
              onClick={() => { setEditing(null); setShowEditor(false); setForm({ orgId }); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

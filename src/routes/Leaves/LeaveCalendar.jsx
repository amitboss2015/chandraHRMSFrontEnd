// src/routes/Leave/LeaveCalendar.jsx
import React, { useEffect, useState } from "react";
import { listCalendar, createCalendar, updateCalendar, deleteCalendar } from "./api-calendar";
import { listLeaveTypes } from "./api";
import Field from "../../components/Field";

const CATEGORIES = ["PUBLIC", "OPTIONAL", "COMPANY"];

export default function LeaveCalendar({ orgId: propOrgId, onCalendarCreated }) {
  const orgId = propOrgId || localStorage.getItem("hrms_tenant_id") || localStorage.getItem("orgId") || "SASA001"; // like other pages
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    orgId, date: "", name: "", category: "PUBLIC", leaveTypeId: null, paid: true, notes: ""
  });

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [cal, tps] = await Promise.all([listCalendar(orgId, year), listLeaveTypes(orgId)]);
      setRows(Array.isArray(cal) ? cal : []); setTypes(Array.isArray(tps) ? tps : []);
    } catch (e) { setError(e.message || "Failed to load"); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [orgId, year]);

  const startNew = () => { setEditing(null); setForm({ orgId, date:"", name:"", category:"PUBLIC", leaveTypeId:null, paid:true, notes:"" }); };
  const startEdit = (r) => {
    setEditing(r);
    setForm({ orgId, date:r.date, name:r.name, category:r.category, leaveTypeId:r.leaveType?.id ?? null, paid:!!r.paid, notes:r.notes||"" });
  };
  const save = async () => {
    if (!form.date || !form.name) return alert("Date and Name are required");
    const payload = { ...form, leaveTypeId: form.leaveTypeId || null };
    const isNew = !editing;
    editing ? await updateCalendar(editing.id, payload) : await createCalendar(payload);
    startNew(); 
    await refresh();
    // Notify parent to refresh setup status if a new calendar leave was created
    if (isNew && onCalendarCreated) {
      onCalendarCreated();
    }
  };
  const remove = async (r) => { if (confirm(`Delete ${r.name} (${r.date})?`)) { await deleteCalendar(r.id); await refresh(); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Year</span>
          <input type="number" className="border p-2 rounded w-28" value={year} onChange={(e)=>setYear(Number(e.target.value)||thisYear)} />
        </div>
        <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={startNew}>+ New Date</button>
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h3 className="font-semibold text-lg">{editing ? "Edit Date" : "Add Date"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Date" required><input type="date" className="border p-2 rounded w-full" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></Field>
          <Field label="Name" required><input className="border p-2 rounded w-full" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} /></Field>
          <Field label="Category">
            <select className="border p-2 rounded w-full" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Linked Leave Type (optional)">
            <select className="border p-2 rounded w-full" value={form.leaveTypeId || ""} onChange={e=>setForm({...form, leaveTypeId: e.target.value ? Number(e.target.value) : null})}>
              <option value="">-</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
            </select>
          </Field>
          <Field label="Paid?"><input type="checkbox" checked={!!form.paid} onChange={e=>setForm({...form, paid:e.target.checked})} /></Field>
          <Field label="Notes"><input className="border p-2 rounded w-full" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} /></Field>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={save}>{editing ? "Update" : "Create"}</button>
          {editing && <button className="bg-slate-600 text-white px-3 py-2 rounded" onClick={startNew}>Cancel</button>}
        </div>
      </div>

      <div className="bg-white rounded shadow">
        {loading ? <div className="p-4">Loading…</div>
        : error ? <div className="p-4 text-sm text-red-700">Error: {error}</div>
        : rows.length === 0 ? <div className="p-4 text-sm text-gray-600">No entries for {year}.</div>
        : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left"><tr>
                <th className="p-2">Date</th><th className="p-2">Name</th>
                <th className="p-2">Category</th><th className="p-2">Leave Type</th>
                <th className="p-2">Paid</th><th className="p-2">Notes</th><th className="p-2">Actions</th>
              </tr></thead>
              <tbody>{rows.map(r=>(
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.date}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.category}</td>
                  <td className="p-2">{r.leaveType ? `${r.leaveType.code} — ${r.leaveType.name}` : "-"}</td>
                  <td className="p-2">{r.paid ? "Yes" : "No"}</td>
                  <td className="p-2">{r.notes || "-"}</td>
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>startEdit(r)}>Edit</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=>remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ShiftList.jsx - Modern shift management UI
import React, { useMemo, useState, useEffect } from "react";

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
  if (!res.ok) throw new Error(`GET failed`);
  return res.json();
}

async function apiSend(url, method, body) {
  const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} failed`);
  return res.json().catch(() => ({}));
}

const EMPTY = {
  code: "",
  name: "",
  start: "",
  end: "",
  break_mins: 30,
  grace_in_mins: 0,
  grace_out_mins: 0,
  rounding: "NONE",
  is_active: true,
  days: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true },
};

function fromApi(s) {
  const startRaw = s.startTime || s.start_time || "";
  const endRaw = s.endTime || s.end_time || "";
  return {
    code: s.code ?? "",
    name: s.name ?? "",
    start: startRaw ? startRaw.slice(0,5) : "",
    end: endRaw ? endRaw.slice(0,5) : "",
    break_mins: s.breakMins ?? 30,
    grace_in_mins: s.graceInMins ?? 0,
    grace_out_mins: s.graceOutMins ?? 0,
    rounding: s.rounding ?? "NONE",
    is_active: !!s.active,
    days: {
      Mon: !!s.mon, Tue: !!s.tue, Wed: !!s.wed,
      Thu: !!s.thu, Fri: !!s.fri, Sat: !!s.sat, Sun: !!s.sun,
    },
  };
}

export default function ShiftList() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`${API_BASE}/shifts`);
      setShifts(data.map(fromApi));
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const onAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const onEdit = async (s) => {
    setEditing(s);
    try {
      const fresh = await apiGet(`${API_BASE}/shifts/${encodeURIComponent(s.code)}`);
      setForm(fromApi(fresh));
    } catch {
      setForm(fromApi(s));
    }
    setShowModal(true);
  };

  const onDelete = async (code) => {
    if (!confirm("Delete this shift?")) return;
    try {
      await fetch(`${API_BASE}/shifts/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      loadShifts();
    } catch {
      alert("Delete failed");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      code: form.code,
      name: form.name,
      start_time: form.start,
      end_time: form.end,
      breakMins: Number(form.break_mins) || 0,
      graceInMins: Number(form.grace_in_mins) || 0,
      graceOutMins: Number(form.grace_out_mins) || 0,
      rounding: form.rounding,
      mon: form.days.Mon, tue: form.days.Tue, wed: form.days.Wed,
      thu: form.days.Thu, fri: form.days.Fri, sat: form.days.Sat, sun: form.days.Sun,
      active: form.is_active,
    };

    try {
      if (editing) {
        await apiSend(`${API_BASE}/shifts/${encodeURIComponent(editing.code)}`, "PUT", payload);
      } else {
        await apiSend(`${API_BASE}/shifts`, "POST", payload);
      }
      setShowModal(false);
      loadShifts();
    } catch {
      alert("Save failed");
    }
  };

  const toggleDay = (d) => setForm(p => ({ ...p, days: { ...p.days, [d]: !p.days[d] } }));

  const formatTime = (t) => {
    if (!t) return "-";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🕐 Shift Management</h1>
          <p className="text-slate-500 text-sm mt-1">Configure work shifts and timings</p>
        </div>
        <button
          onClick={onAdd}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2 justify-center"
        >
          <span className="text-lg">+</span> Add Shift
        </button>
      </div>

      {/* Shift Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-5xl mb-4">🕐</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Shifts Configured</h3>
          <p className="text-slate-500 mb-4">Create your first shift to get started</p>
          <button
            onClick={onAdd}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            + Create Shift
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div
              key={shift.code}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                !shift.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Shift Header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{shift.name}</h3>
                    <p className="text-slate-300 text-sm">{shift.code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    shift.is_active ? "bg-emerald-500 text-white" : "bg-slate-500 text-slate-200"
                  }`}>
                    {shift.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Shift Details */}
              <div className="p-4 space-y-3">
                {/* Time */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className="text-center flex-1">
                    <div className="text-xs text-slate-500 mb-1">Start</div>
                    <div className="text-lg font-bold text-slate-800">{formatTime(shift.start)}</div>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="text-center flex-1">
                    <div className="text-xs text-slate-500 mb-1">End</div>
                    <div className="text-lg font-bold text-slate-800">{formatTime(shift.end)}</div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-500 text-xs">Break</div>
                    <div className="font-medium text-slate-800">{shift.break_mins} min</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-500 text-xs">Grace</div>
                    <div className="font-medium text-slate-800">{shift.grace_in_mins}/{shift.grace_out_mins} min</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg col-span-2">
                    <div className="text-slate-500 text-xs">Rounding</div>
                    <div className="font-medium text-slate-800">{shift.rounding || "None"}</div>
                  </div>
                </div>

                {/* Days */}
                <div className="flex justify-center gap-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <span
                      key={d}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium ${
                        shift.days[d]
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {d[0]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-slate-50 border-t flex gap-2">
                <button
                  onClick={() => onEdit(shift)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onDelete(shift.code)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? "Edit Shift" : "Add New Shift"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Shift Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g., MORNING"
                    required
                    disabled={editing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Shift Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Morning Shift"
                    required
                  />
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Break (min)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.break_mins}
                    onChange={(e) => setForm({ ...form, break_mins: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Grace In</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.grace_in_mins}
                    onChange={(e) => setForm({ ...form, grace_in_mins: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Grace Out</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={form.grace_out_mins}
                    onChange={(e) => setForm({ ...form, grace_out_mins: e.target.value })}
                  />
                </div>
              </div>

              {/* Rounding */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Rounding Rule</label>
                <select
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={form.rounding}
                  onChange={(e) => setForm({ ...form, rounding: e.target.value })}
                >
                  <option value="NONE">None</option>
                  <option value="NEAREST_5">Nearest 5 min</option>
                  <option value="NEAREST_15">Nearest 15 min</option>
                  <option value="NEAREST_30">Nearest 30 min</option>
                </select>
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Working Days</label>
                <div className="flex gap-2 flex-wrap">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        form.days[d]
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Active Shift</div>
                  <div className="text-xs text-slate-500">Enable this shift for assignments</div>
                </div>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {editing ? "Update Shift" : "Create Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

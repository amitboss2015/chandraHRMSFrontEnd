import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** ======= CONFIG ======= */
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/,"") || "http://localhost:8080/api";
const ORG_ID = import.meta.env.VITE_ORG_ID || "1";

/** JSON fetch with org header */
async function fetchJson(path) {
  const resp = await fetch(`${API_BASE}${path}`, { headers: { "X-Org-Id": ORG_ID } });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AttendanceLogs() {
  const navigate = useNavigate();
  const q = useQuery();

  // Initialize from query string
  const [month, setMonth] = useState(parseInt(q.get("month") || (new Date().getMonth()+1),10));
  const [year, setYear]   = useState(parseInt(q.get("year") || new Date().getFullYear(),10));
  const empId   = q.get("empId");
  const empCode = q.get("empCode");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const titleEmp = empCode ? `Employee ${empCode}` : (empId ? `Employee ${empId}` : "Unknown");

  const qs = useMemo(() => {
    const p = new URLSearchParams({ month:String(month), year:String(year) });
    if (empId) p.set("empId", empId);
    if (empCode) p.set("empCode", empCode);
    return p.toString();
  }, [month, year, empId, empCode]);

  const loadLogs = async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchJson(`/attendance/logs?${qs}`);
      setLogs(Array.isArray(data) ? data : []);
      // sync URL
      navigate(`/attendance/logs?${qs}`, { replace: true });
    } catch (e) {
      setError(e.message || "Failed to load logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ loadLogs(); /* initial + whenever month/year changes */ }, [month, year]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Attendance Logs for {titleEmp} ({String(month).padStart(2,"0")}/{year})
      </h2>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        <select value={month} onChange={(e)=>setMonth(parseInt(e.target.value,10))} className="border p-2">
          {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={year} onChange={(e)=>setYear(parseInt(e.target.value,10))} className="border p-2">
          {[new Date().getFullYear()-1,new Date().getFullYear(),new Date().getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={loadLogs} className="bg-blue-600 text-white px-3 py-2 rounded">Refresh</button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {loading && <span className="text-sm">Loading…</span>}
      </div>

      {/* Data */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">Date</th>
              <th className="border px-4 py-2">Punches</th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? logs.map((log, i)=>(
              <tr key={i}>
                <td className="border px-4 py-2">{log.date}</td>
                <td className="border px-4 py-2">
                  <ul className="list-disc pl-4">
                    {Array.isArray(log.punches) && log.punches.map((p, idx)=><li key={idx}>{p}</li>)}
                  </ul>
                </td>
              </tr>
            )) : (
              <tr><td className="border px-4 py-2" colSpan={2}>No punches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

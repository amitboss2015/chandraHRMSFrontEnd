// src/routes/Leave/api-calendar.js
import { API_BASE } from "./api"; // same file that LeaveTypes/MarkLeave use

const getToken = () => sessionStorage.getItem('hrms_access_token') || '';
const getTenantId = () => localStorage.getItem('hrms_tenant_id') || 'SASA001';

async function request(path, opts = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = getToken();
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: { 
      "Content-Type": "application/json",
      "X-Tenant-Id": getTenantId(),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(opts.headers || {}) 
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  const text = await res.text();
  const json = (res.headers.get("content-type") || "").includes("application/json")
    ? (() => { try { return JSON.parse(text); } catch { return text; } })()
    : text;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  return json;
}

const base = "/leave/calendar"; // -> /api/leave/calendar

export const listCalendar   = (orgId, year) => request(`${base}?orgId=${encodeURIComponent(orgId)}${year ? `&year=${year}` : ""}`);
export const createCalendar = (payload)     => request(base, { method: "POST", body: payload });
export const updateCalendar = (id, payload) => request(`${base}/${id}`, { method: "PUT", body: payload });
export const deleteCalendar = (id)          => request(`${base}/${id}`, { method: "DELETE" });

// api.js
function normalizeBase(u) {
  if (!u) return "";
  // trim spaces
  u = u.trim();
  // remove trailing slashes
  u = u.replace(/\/+$/, "");
  return u;
}

// Resolve API_BASE once
export const API_BASE =
  normalizeBase(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    localStorage.getItem("baseUrl") ||
    "http://localhost:8080/api"
  );

async function parseSmart(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await res.json();
    if (!res.ok) {
      // backend returned JSON error body
      const msg = json?.message || json?.error || JSON.stringify(json);
      throw new Error(`${res.status} ${res.statusText}: ${msg}`);
    }
    return json;
  }
  // Non-JSON response: read text and throw/return accordingly
  const text = await res.text();
  if (!res.ok) {
    // Surface server message (404 HTML, proxy error, etc.)
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  // Sometimes backends return empty body (204) or plain text "OK"
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, { method = "GET", body, headers } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
    // If your backend uses session/JWT cookies, enable credentials
    // credentials: "include",
    // mode: "cors", // usually default in browsers; keep if you need it explicit
  });
  return parseSmart(res);
}

/* ---------- Leave Types API ---------- */
// Adjust the base path to match your backend. Examples:
// 1) /api/leave/types?orgId=ORG1
// 2) /api/orgs/{orgId}/leave/types
// Below I’ll support style (1) by default; flip to (2) if that’s your backend.

const baseListPath = (orgId) => `/leave/types?orgId=${encodeURIComponent(orgId)}`;
// If you use org-scoped path, swap the above with:
// const baseListPath = (orgId) => `/orgs/${encodeURIComponent(orgId)}/leave/types`;

export function listLeaveTypes(orgId) {
  return request(baseListPath(orgId));
}

export function createLeaveType(payload) {
  // If org is implicit in payload/orgId or path, this is fine.
  return request(`/leave/types`, { method: "POST", body: payload });
}

export function updateLeaveType(id, payload) {
  return request(`/leave/types/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
}

export function activateLeaveType(id) {
  return request(`/leave/types/${encodeURIComponent(id)}/activate`, { method: "POST" });
}

export function deactivateLeaveType(id) {
  return request(`/leave/types/${encodeURIComponent(id)}/deactivate`, { method: "POST" });
}


// save ➜ POST /api/leave/admin/mark  (without previewOnly or false)
export async function markLeave(body) {
  const res = await fetch(`${API_BASE}/leave/admin/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, previewOnly: false }),
  });
  if (!res.ok) throw new Error(`${res.status} : ${res.statusText}`);
  return res.json();
}

// preview ➜ POST /api/leave/admin/mark  (with previewOnly=true)
export async function previewMarkLeave(body) {
  const res = await fetch(`${API_BASE}/leave/admin/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, previewOnly: true }),
  });
  if (!res.ok) throw new Error(`${res.status} : ${res.statusText}`);
  return res.json();
}

export async function listEmployees() {
  const res = await fetch(`${API_BASE}/employees`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json(); // expect [{code, name, ...}]
}

// list leaves for one employee (shown under the form)
export async function listEmployeeLeaves(orgId, empId) {
  const id = (empId ?? "").trim();
  if (!id || id === "\\") return [];           // <-- guard bogus value

  const url = `${API_BASE}/leave/admin/employee/${encodeURIComponent(id)}/leaves` +
              `?orgId=${encodeURIComponent(orgId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/* ---------- Leave Balances API ---------- */

// Get all leave balances for an employee for a year
export async function getBalances(orgId, empId, year, month) {
  let url = `${API_BASE}/leave/balances/${encodeURIComponent(empId)}?orgId=${encodeURIComponent(orgId)}&year=${year}`;
  if (month) {
    url += `&month=${month}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Get balance for a specific leave type
export async function getBalanceForType(orgId, empId, leaveTypeId, year, month) {
  const url = `${API_BASE}/leave/balances/${encodeURIComponent(empId)}/type/${leaveTypeId}?orgId=${encodeURIComponent(orgId)}&year=${year}&month=${month}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Close month for leave processing
export async function closeMonth(orgId, year, month) {
  const url = `${API_BASE}/leave/close/month?orgId=${encodeURIComponent(orgId)}&year=${year}&month=${month}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Close year for leave processing
export async function closeYear(orgId, year) {
  const url = `${API_BASE}/leave/close/year?orgId=${encodeURIComponent(orgId)}&year=${year}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Cancel a leave
export async function cancelLeave(leaveId, reason) {
  const url = `${API_BASE}/leave/admin/${leaveId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

/* ---------- Generic helpers if you still need them ---------- */
export const apiGet  = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: "POST", body });
export const apiPut  = (path, body) => request(path, { method: "PUT", body });
export const apiDel  = (path) => request(path, { method: "DELETE" });
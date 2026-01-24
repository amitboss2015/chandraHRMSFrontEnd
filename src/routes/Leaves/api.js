// api.js
function normalizeBase(u) {
  if (!u) return "";
  // trim spaces
  u = u.trim();
  // remove trailing slashes
  u = u.replace(/\/+$/, "");
  return u;
}

// Resolve API_BASE dynamically based on hostname
const getApiBase = () => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return normalizeBase(import.meta.env.VITE_API_BASE_URL);
  }
  if (localStorage.getItem("baseUrl")) {
    return normalizeBase(localStorage.getItem("baseUrl"));
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  return '/api';
};
export const API_BASE = getApiBase();

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

const getToken = () => sessionStorage.getItem('hrms_access_token') || '';
const getTenantId = () => localStorage.getItem('hrms_tenant_id') || 'SASA001';

async function request(path, { method = "GET", body, headers } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = getToken();
  
  // If no token, redirect to login
  if (!token) {
    console.log('❌ No token available, redirecting to login');
    window.location.href = '/login';
    throw new Error('No authentication token');
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      "X-Tenant-Id": getTenantId(),
      "Authorization": `Bearer ${token}`,
      ...headers,
    },
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
    credentials: "include",
  });
  
  // Handle auth errors - redirect to login
  if (res.status === 401 || res.status === 403) {
    console.log(`🔒 Auth error (${res.status}) - session expired`);
    sessionStorage.removeItem('hrms_access_token');
    localStorage.removeItem('hrms_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
  
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
  return request('/leave/admin/mark', {
    method: "POST",
    body: { ...body, previewOnly: false },
  });
}

// preview ➜ POST /api/leave/admin/mark  (with previewOnly=true)
export async function previewMarkLeave(body) {
  return request('/leave/admin/mark', {
    method: "POST",
    body: { ...body, previewOnly: true },
  });
}

export async function listEmployees() {
  return request('/employees');
}

// list leaves for one employee (shown under the form)
export async function listEmployeeLeaves(orgId, empId) {
  const id = (empId ?? "").trim();
  if (!id || id === "\\") return [];           // <-- guard bogus value
  return request(`/leave/admin/employee/${encodeURIComponent(id)}/leaves?orgId=${encodeURIComponent(orgId)}`);
}

/* ---------- Leave Balances API ---------- */

// Get all leave balances for an employee for a year
export async function getBalances(orgId, empId, year, month) {
  let path = `/leave/balances/${encodeURIComponent(empId)}?orgId=${encodeURIComponent(orgId)}&year=${year}`;
  if (month) {
    path += `&month=${month}`;
  }
  return request(path);
}

// Get balance for a specific leave type
export async function getBalanceForType(orgId, empId, leaveTypeId, year, month) {
  return request(`/leave/balances/${encodeURIComponent(empId)}/type/${leaveTypeId}?orgId=${encodeURIComponent(orgId)}&year=${year}&month=${month}`);
}

// Close month for leave processing
export async function closeMonth(orgId, year, month) {
  return request(`/leave/close/month?orgId=${encodeURIComponent(orgId)}&year=${year}&month=${month}`, { method: "POST" });
}

// Close year for leave processing
export async function closeYear(orgId, year) {
  return request(`/leave/close/year?orgId=${encodeURIComponent(orgId)}&year=${year}`, { method: "POST" });
}

// Cancel a leave
export async function cancelLeave(leaveId, reason) {
  return request(`/leave/admin/${leaveId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, { method: "DELETE" });
}

/* ---------- Generic helpers if you still need them ---------- */
export const apiGet  = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: "POST", body });
export const apiPut  = (path, body) => request(path, { method: "PUT", body });
export const apiDel  = (path) => request(path, { method: "DELETE" });
const BASE = "/api/employees"; // adjust to your backend

const getToken = () => sessionStorage.getItem("hrms_access_token") || "";
const getTenantId = () => localStorage.getItem("hrms_tenant_id") || "SASA001";

const authHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": getTenantId(),
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

const json = (body) => ({
  headers: authHeaders(),
  body: JSON.stringify(body),
});

export async function listEmployees() {
  const r = await fetch(BASE, { headers: authHeaders() });
  if (!r.ok) throw new Error("Failed to fetch employees");
  return r.json();
}

export async function getEmployee(empCode) {
  const r = await fetch(`${BASE}/${encodeURIComponent(empCode)}`, { headers: authHeaders() });
  if (!r.ok) throw new Error("Not found");
  return r.json();
}

export async function createEmployee(payload) {
  const r = await fetch(BASE, { method: "POST", ...json(payload) });
  if (!r.ok) throw new Error("Failed to create");
  return r.json();
}

export async function updateEmployee(empCode, payload) {
  const r = await fetch(`${BASE}/${encodeURIComponent(empCode)}`, {
    method: "PUT",
    ...json(payload),
  });
  if (!r.ok) throw new Error("Failed to update");
  return r.json();
}

export async function deleteEmployee(empCode) {
  const r = await fetch(`${BASE}/${encodeURIComponent(empCode)}`, { 
    method: "DELETE",
    headers: authHeaders()
  });
  if (!r.ok) throw new Error("Failed to delete");
  return true;
}

// helpful for selects
export async function listShifts() {
  const r = await fetch("/api/shifts", { headers: authHeaders() });
  if (!r.ok) throw new Error("Failed to fetch shifts");
  return r.json(); // [{id,name},...]
}

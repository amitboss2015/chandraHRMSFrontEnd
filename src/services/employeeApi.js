const BASE = "/api/employees"; // adjust to your backend

const json = (body) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function listEmployees() {
  const r = await fetch(BASE);
  if (!r.ok) throw new Error("Failed to fetch employees");
  return r.json();
}
export async function getEmployee(empCode) {
  const r = await fetch(`${BASE}/${encodeURIComponent(empCode)}`);
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
  const r = await fetch(`${BASE}/${encodeURIComponent(empCode)}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete");
  return true;
}

// helpful for selects
export async function listShifts() {
  const r = await fetch("/api/shifts");
  if (!r.ok) throw new Error("Failed to fetch shifts");
  return r.json(); // [{id,name},...]
}

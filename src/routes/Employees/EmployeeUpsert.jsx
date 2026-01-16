// src/routes/Employees/EmployeeUpsert.jsx
// Modern, clean employee form with organized sections
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  localStorage.getItem("baseUrl") ||
  "http://localhost:8080/api";

const getToken = () =>
  localStorage.getItem("token") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_TOKEN) ||
  "";

const authHeaders = () => {
  const t = getToken();
  const h = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

// API adapters
const fromApi = (e) => ({
  emp_code: e.empCode ?? "",
  first_name: e.firstName ?? "",
  last_name: e.lastName ?? "",
  email: e.email ?? "",
  phone: e.phone ?? "",
  employment_type: e.employmentType ?? "FULL_TIME",
  department: e.department ?? "",
  designation: e.designation ?? "",
  join_date: e.joinDate ?? "",
  status: e.status ?? "ACTIVE",
  // Address
  address: e.address ?? "",
  city: e.city ?? "",
  state: e.state ?? "",
  pincode: e.pincode ?? "",
  // KYC
  aadhaar: e.aadhaar ?? "",
  pan: e.pan ?? "",
  uan_number: e.uanNumber ?? "",
  esic_number: e.esicNumber ?? "",
  // Bank
  bank_name: e.bankName ?? "",
  bank_account: e.bankAccount ?? "",
  ifsc: e.ifsc ?? "",
  branch_name: e.branchName ?? "",
  // Salary
  salary_basis: (e.salaryBasis ?? "MONTHLY").toUpperCase(),
  base_salary: e.baseSalary ?? "",
  increment: e.increment ?? "",
  hourly_rate: e.hourlyRate ?? "",
  hra_percent: e.hraPercent ?? "",
  da_percent: e.daPercent ?? "",
  conveyance_allowance: e.conveyanceAllowance ?? "",
  medical_allowance: e.medicalAllowance ?? "",
  special_allowance: e.specialAllowance ?? "",
  other_allowance: e.otherAllowance ?? "",
  // Deductions
  epf_applicable: e.epfApplicable ?? true,
  esic_applicable: e.esicApplicable ?? true,
  pt_applicable: e.ptApplicable ?? true,
  tds_applicable: e.tdsApplicable ?? false,
  // OT
  ot_allowed: !!e.otAllowed,
  ot_duration: e.otDurationMinutes
    ? `${Math.floor(e.otDurationMinutes / 60)}:${String(e.otDurationMinutes % 60).padStart(2, "0")}`
    : "",
  // Work config
  weekly_off_days: e.weeklyOffDays ?? "",
  working_days_per_month: e.workingDaysPerMonth ?? 26,
  standard_working_hours: e.standardWorkingHoursPerDay ?? 8,
  // Emergency
  emergency_contact_name: e.emergencyContactName ?? "",
  emergency_contact_phone: e.emergencyContactPhone ?? "",
});

const toApi = (f) => ({
  empCode: f.emp_code?.trim() || "",
  firstName: f.first_name?.trim() || "",
  lastName: f.last_name?.trim() || "",
  email: f.email || null,
  phone: f.phone || null,
  employmentType: f.employment_type || "FULL_TIME",
  department: f.department || null,
  designation: f.designation || null,
  joinDate: f.join_date || null,
  status: f.status || "ACTIVE",
  // Address
  address: f.address || null,
  city: f.city || null,
  state: f.state || null,
  pincode: f.pincode || null,
  // KYC
  aadhaar: f.aadhaar || null,
  pan: f.pan || null,
  uanNumber: f.uan_number || null,
  esicNumber: f.esic_number || null,
  // Bank
  bankName: f.bank_name || null,
  bankAccount: f.bank_account || null,
  ifsc: f.ifsc || null,
  branchName: f.branch_name || null,
  // Salary
  salaryBasis: (f.salary_basis || "MONTHLY").toUpperCase(),
  baseSalary: Number(f.base_salary) || 0,
  increment: Number(f.increment) || 0,
  hourlyRate: Number(f.hourly_rate) || 0,
  hraPercent: Number(f.hra_percent) || null,
  daPercent: Number(f.da_percent) || null,
  conveyanceAllowance: Number(f.conveyance_allowance) || null,
  medicalAllowance: Number(f.medical_allowance) || null,
  specialAllowance: Number(f.special_allowance) || null,
  otherAllowance: Number(f.other_allowance) || null,
  // Deductions
  epfApplicable: f.epf_applicable,
  esicApplicable: f.esic_applicable,
  ptApplicable: f.pt_applicable,
  tdsApplicable: f.tds_applicable,
  // OT
  otAllowed: !!f.ot_allowed,
  otDurationMinutes:
    f.ot_duration && /^\d+:\d{2}$/.test(f.ot_duration)
      ? (() => {
          const [h, m] = f.ot_duration.split(":");
          return Number(h) * 60 + Number(m);
        })()
      : Number(f.ot_duration) || 0,
  // Work config
  weeklyOffDays: f.weekly_off_days || null,
  workingDaysPerMonth: Number(f.working_days_per_month) || 26,
  standardWorkingHoursPerDay: Number(f.standard_working_hours) || 8,
  // Emergency
  emergencyContactName: f.emergency_contact_name || null,
  emergencyContactPhone: f.emergency_contact_phone || null,
});

// API calls
async function apiGet(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}
async function apiSend(url, method, body) {
  const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${method} ${url} -> ${res.status} ${txt || ""}`);
  }
  return res.json().catch(() => ({}));
}
const getEmployee = (empCode) => apiGet(`${API_BASE}/employees/${encodeURIComponent(empCode)}`);
const createEmployee = (payload) => apiSend(`${API_BASE}/employees`, "POST", payload);
const updateEmployee = (empCode, payload) =>
  apiSend(`${API_BASE}/employees/${encodeURIComponent(empCode)}`, "PUT", payload);

// Empty form
const empty = {
  emp_code: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  employment_type: "FULL_TIME",
  department: "",
  designation: "",
  join_date: "",
  status: "ACTIVE",
  address: "",
  city: "",
  state: "",
  pincode: "",
  aadhaar: "",
  pan: "",
  uan_number: "",
  esic_number: "",
  bank_name: "",
  bank_account: "",
  ifsc: "",
  branch_name: "",
  salary_basis: "MONTHLY",
  base_salary: "",
  increment: "",
  hourly_rate: "",
  hra_percent: "",
  da_percent: "",
  conveyance_allowance: "",
  medical_allowance: "",
  special_allowance: "",
  other_allowance: "",
  epf_applicable: true,
  esic_applicable: true,
  pt_applicable: true,
  tds_applicable: false,
  ot_allowed: false,
  ot_duration: "",
  weekly_off_days: "SUNDAY",
  working_days_per_month: 26,
  standard_working_hours: 8,
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function EmployeeUpsert({ mode = "create" }) {
  const { empCode } = useParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const isEdit = mode === "edit";

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");

  const fetchedOnce = useRef(false);

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    if (isEdit) {
      if (state?.employee) {
        setForm({ ...empty, ...state.employee });
        return;
      }
      if (empCode) {
        setLoading(true);
        getEmployee(empCode)
          .then((data) => setForm({ ...empty, ...fromApi(data) }))
          .catch((e) => console.error(e))
          .finally(() => setLoading(false));
      }
    } else {
      setForm(empty);
    }
  }, [isEdit, empCode, state]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.emp_code?.trim()) return alert("Employee Code is required");
    if (!form.first_name?.trim()) return alert("First name is required");

    const payload = toApi(form);
    try {
      setLoading(true);
      if (isEdit) await updateEmployee(empCode, payload);
      else await createEmployee(payload);
      nav("/employees");
    } catch (err) {
      console.error(err);
      alert(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: "personal", label: "Personal Info", icon: "👤" },
    { id: "employment", label: "Employment", icon: "💼" },
    { id: "salary", label: "Salary & Allowances", icon: "💰" },
    { id: "bank", label: "Bank & KYC", icon: "🏦" },
    { id: "deductions", label: "Deductions", icon: "📋" },
    { id: "other", label: "Other Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {isEdit ? "Edit Employee" : "Add New Employee"}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isEdit ? `Editing: ${form.first_name} ${form.last_name}` : "Fill in the employee details"}
              </p>
            </div>
            <button
              onClick={() => nav(-1)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Section Navigation */}
          <div className="hidden md:block w-48 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border p-2 sticky top-24">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                    activeSection === section.id
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="flex-1 space-y-6">
            {/* Personal Information */}
            <Section
              id="personal"
              title="Personal Information"
              icon="👤"
              description="Basic employee details"
              isActive={activeSection === "personal"}
              onToggle={() => setActiveSection(activeSection === "personal" ? "" : "personal")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Employee Code" required>
                  <input
                    className="input-field"
                    value={form.emp_code}
                    onChange={(e) => onChange("emp_code", e.target.value)}
                    placeholder="e.g., EMP001"
                    disabled={isEdit}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => onChange("status", e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="RESIGNED">Resigned</option>
                  </select>
                </Field>
                <Field label="First Name" required>
                  <input
                    className="input-field"
                    value={form.first_name}
                    onChange={(e) => onChange("first_name", e.target.value)}
                    placeholder="Enter first name"
                  />
                </Field>
                <Field label="Last Name">
                  <input
                    className="input-field"
                    value={form.last_name}
                    onChange={(e) => onChange("last_name", e.target.value)}
                    placeholder="Enter last name"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="input-field"
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </Field>
                <Field label="Address" colSpan={2}>
                  <input
                    className="input-field"
                    value={form.address}
                    onChange={(e) => onChange("address", e.target.value)}
                    placeholder="Full address"
                  />
                </Field>
                <Field label="City">
                  <input
                    className="input-field"
                    value={form.city}
                    onChange={(e) => onChange("city", e.target.value)}
                    placeholder="City"
                  />
                </Field>
                <Field label="State">
                  <input
                    className="input-field"
                    value={form.state}
                    onChange={(e) => onChange("state", e.target.value)}
                    placeholder="State"
                  />
                </Field>
                <Field label="Pincode">
                  <input
                    className="input-field"
                    value={form.pincode}
                    onChange={(e) => onChange("pincode", e.target.value)}
                    placeholder="PIN Code"
                  />
                </Field>
              </div>
            </Section>

            {/* Employment Details */}
            <Section
              id="employment"
              title="Employment Details"
              icon="💼"
              description="Job role and work configuration"
              isActive={activeSection === "employment"}
              onToggle={() => setActiveSection(activeSection === "employment" ? "" : "employment")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Employment Type">
                  <select
                    className="input-field"
                    value={form.employment_type}
                    onChange={(e) => onChange("employment_type", e.target.value)}
                  >
                    <option value="FULL_TIME">Full-Time</option>
                    <option value="PART_TIME">Part-Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </Field>
                <Field label="Join Date">
                  <input
                    type="date"
                    className="input-field"
                    value={form.join_date}
                    onChange={(e) => onChange("join_date", e.target.value)}
                  />
                </Field>
                <Field label="Department">
                  <input
                    className="input-field"
                    value={form.department}
                    onChange={(e) => onChange("department", e.target.value)}
                    placeholder="e.g., Production"
                  />
                </Field>
                <Field label="Designation">
                  <input
                    className="input-field"
                    value={form.designation}
                    onChange={(e) => onChange("designation", e.target.value)}
                    placeholder="e.g., Operator"
                  />
                </Field>
                <Field label="Weekly Off">
                  <select
                    className="input-field"
                    value={form.weekly_off_days}
                    onChange={(e) => onChange("weekly_off_days", e.target.value)}
                  >
                    <option value="SUNDAY">Sunday</option>
                    <option value="SATURDAY,SUNDAY">Saturday & Sunday</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="">None</option>
                  </select>
                </Field>
                <Field label="Working Days/Month">
                  <input
                    type="number"
                    className="input-field"
                    value={form.working_days_per_month}
                    onChange={(e) => onChange("working_days_per_month", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            {/* Salary & Allowances */}
            <Section
              id="salary"
              title="Salary & Allowances"
              icon="💰"
              description="Compensation structure"
              isActive={activeSection === "salary"}
              onToggle={() => setActiveSection(activeSection === "salary" ? "" : "salary")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Salary Basis">
                  <select
                    className="input-field"
                    value={form.salary_basis}
                    onChange={(e) => onChange("salary_basis", e.target.value)}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </Field>
                {form.salary_basis === "MONTHLY" ? (
                  <>
                    <Field label="Base Salary (₹)">
                      <input
                        type="number"
                        className="input-field"
                        value={form.base_salary}
                        onChange={(e) => onChange("base_salary", e.target.value)}
                        placeholder="Monthly salary"
                      />
                    </Field>
                    <Field label="Increment (₹)">
                      <input
                        type="number"
                        className="input-field"
                        value={form.increment}
                        onChange={(e) => onChange("increment", e.target.value)}
                        placeholder="Monthly increment"
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Hourly Rate (₹)">
                    <input
                      type="number"
                      className="input-field"
                      value={form.hourly_rate}
                      onChange={(e) => onChange("hourly_rate", e.target.value)}
                      placeholder="Rate per hour"
                    />
                  </Field>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Allowances</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="HRA %">
                    <input
                      type="number"
                      className="input-field"
                      value={form.hra_percent}
                      onChange={(e) => onChange("hra_percent", e.target.value)}
                      placeholder="e.g., 40"
                    />
                  </Field>
                  <Field label="DA %">
                    <input
                      type="number"
                      className="input-field"
                      value={form.da_percent}
                      onChange={(e) => onChange("da_percent", e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </Field>
                  <Field label="Conveyance (₹)">
                    <input
                      type="number"
                      className="input-field"
                      value={form.conveyance_allowance}
                      onChange={(e) => onChange("conveyance_allowance", e.target.value)}
                    />
                  </Field>
                  <Field label="Medical (₹)">
                    <input
                      type="number"
                      className="input-field"
                      value={form.medical_allowance}
                      onChange={(e) => onChange("medical_allowance", e.target.value)}
                    />
                  </Field>
                  <Field label="Special (₹)">
                    <input
                      type="number"
                      className="input-field"
                      value={form.special_allowance}
                      onChange={(e) => onChange("special_allowance", e.target.value)}
                    />
                  </Field>
                  <Field label="Other (₹)">
                    <input
                      type="number"
                      className="input-field"
                      value={form.other_allowance}
                      onChange={(e) => onChange("other_allowance", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Bank & KYC */}
            <Section
              id="bank"
              title="Bank & KYC Details"
              icon="🏦"
              description="Financial and identity information"
              isActive={activeSection === "bank"}
              onToggle={() => setActiveSection(activeSection === "bank" ? "" : "bank")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KYC Column */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    📄 Identity Documents
                  </h4>
                  <div className="space-y-4">
                    <Field label="Aadhaar Number">
                      <input
                        className="input-field"
                        value={form.aadhaar}
                        onChange={(e) => onChange("aadhaar", e.target.value)}
                        placeholder="12 digit Aadhaar"
                        maxLength={12}
                      />
                    </Field>
                    <Field label="PAN Number">
                      <input
                        className="input-field uppercase"
                        value={form.pan}
                        onChange={(e) => onChange("pan", e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                      />
                    </Field>
                    <Field label="UAN Number">
                      <input
                        className="input-field"
                        value={form.uan_number}
                        onChange={(e) => onChange("uan_number", e.target.value)}
                        placeholder="Universal Account Number"
                      />
                    </Field>
                    <Field label="ESIC Number">
                      <input
                        className="input-field"
                        value={form.esic_number}
                        onChange={(e) => onChange("esic_number", e.target.value)}
                        placeholder="ESIC Number"
                      />
                    </Field>
                  </div>
                </div>

                {/* Bank Column */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    🏛️ Bank Account
                  </h4>
                  <div className="space-y-4">
                    <Field label="Bank Name">
                      <input
                        className="input-field"
                        value={form.bank_name}
                        onChange={(e) => onChange("bank_name", e.target.value)}
                        placeholder="e.g., State Bank of India"
                      />
                    </Field>
                    <Field label="Account Number">
                      <input
                        className="input-field"
                        value={form.bank_account}
                        onChange={(e) => onChange("bank_account", e.target.value)}
                        placeholder="Bank account number"
                      />
                    </Field>
                    <Field label="IFSC Code">
                      <input
                        className="input-field uppercase"
                        value={form.ifsc}
                        onChange={(e) => onChange("ifsc", e.target.value.toUpperCase())}
                        placeholder="SBIN0001234"
                      />
                    </Field>
                    <Field label="Branch Name">
                      <input
                        className="input-field"
                        value={form.branch_name}
                        onChange={(e) => onChange("branch_name", e.target.value)}
                        placeholder="Branch name"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            {/* Deductions */}
            <Section
              id="deductions"
              title="Statutory Deductions"
              icon="📋"
              description="Configure applicable deductions"
              isActive={activeSection === "deductions"}
              onToggle={() => setActiveSection(activeSection === "deductions" ? "" : "deductions")}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CheckboxField
                  label="EPF Applicable"
                  description="12% of basic"
                  checked={form.epf_applicable}
                  onChange={(v) => onChange("epf_applicable", v)}
                />
                <CheckboxField
                  label="ESIC Applicable"
                  description="0.75% of gross"
                  checked={form.esic_applicable}
                  onChange={(v) => onChange("esic_applicable", v)}
                />
                <CheckboxField
                  label="PT Applicable"
                  description="Professional Tax"
                  checked={form.pt_applicable}
                  onChange={(v) => onChange("pt_applicable", v)}
                />
                <CheckboxField
                  label="TDS Applicable"
                  description="Tax at source"
                  checked={form.tds_applicable}
                  onChange={(v) => onChange("tds_applicable", v)}
                />
              </div>
            </Section>

            {/* Other Settings */}
            <Section
              id="other"
              title="Other Settings"
              icon="⚙️"
              description="Overtime and emergency contacts"
              isActive={activeSection === "other"}
              onToggle={() => setActiveSection(activeSection === "other" ? "" : "other")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overtime */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Overtime Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="ot_allowed"
                        checked={form.ot_allowed}
                        onChange={(e) => onChange("ot_allowed", e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="ot_allowed" className="text-sm text-slate-700">
                        Overtime Allowed
                      </label>
                    </div>
                    {form.ot_allowed && (
                      <Field label="Max OT Duration (HH:MM)">
                        <input
                          className="input-field"
                          value={form.ot_duration}
                          onChange={(e) => onChange("ot_duration", e.target.value)}
                          placeholder="e.g., 02:00"
                        />
                      </Field>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Emergency Contact</h4>
                  <div className="space-y-4">
                    <Field label="Contact Name">
                      <input
                        className="input-field"
                        value={form.emergency_contact_name}
                        onChange={(e) => onChange("emergency_contact_name", e.target.value)}
                        placeholder="Emergency contact name"
                      />
                    </Field>
                    <Field label="Contact Phone">
                      <input
                        className="input-field"
                        value={form.emergency_contact_phone}
                        onChange={(e) => onChange("emergency_contact_phone", e.target.value)}
                        placeholder="Emergency contact phone"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => nav(-1)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-medium disabled:opacity-50"
              >
                {loading ? "Saving..." : isEdit ? "Update Employee" : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.15s;
          background: white;
        }
        .input-field:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .input-field:disabled {
          background: #f1f5f9;
          color: #64748b;
        }
        .input-field.uppercase {
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

// Section Component
function Section({ id, title, icon, description, isActive, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden" id={id}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 border-b hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <span className={`transition-transform ${isActive ? "rotate-180" : ""}`}>▼</span>
      </button>
      <div className={`transition-all duration-300 ${isActive ? "p-6" : "h-0 overflow-hidden"}`}>
        {children}
      </div>
    </div>
  );
}

// Field Component
function Field({ label, children, required, colSpan }) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// Checkbox Field
function CheckboxField({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </label>
  );
}

// src/routes/Employees/EmployeeUpsert.jsx
// Modern, clean employee form with organized sections
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { API_BASE } from "../../utils/apiConfig";

const getToken = () =>
  sessionStorage.getItem("hrms_access_token") || localStorage.getItem("token") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_TOKEN) ||
  "";

const getTenantId = () =>
  localStorage.getItem("hrms_tenant_id") || "SASA001";

const authHeaders = () => {
  const t = getToken();
  const h = { 
    "Content-Type": "application/json",
    "X-Tenant-Id": getTenantId()
  };
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
  // Biometric device
  biometric_device_id: e.biometricDeviceId ?? null,
  biometric_device_name: e.biometricDeviceName ?? "",
  device_emp_code: e.deviceEmpCode ?? "",
  use_emp_code_as_device_code: e.useEmpCodeAsDeviceCode ?? true,
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
  // Biometric device
  biometricDeviceId: f.biometric_device_id || null,
  deviceEmpCode: f.use_emp_code_as_device_code ? null : (f.device_emp_code || null),
  useEmpCodeAsDeviceCode: f.use_emp_code_as_device_code,
});

// API calls - with cache busting
async function apiGet(url) {
  // Add timestamp to prevent caching
  const cacheBuster = `_t=${Date.now()}`;
  const separator = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${separator}${cacheBuster}`, { 
    headers: { ...authHeaders(), 'Cache-Control': 'no-cache' }
  });
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
const getDevices = () => apiGet(`${API_BASE}/devices`);

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
  weekly_off_days: "",
  working_days_per_month: 26,
  standard_working_hours: 8,
  emergency_contact_name: "",
  emergency_contact_phone: "",
  // Biometric device
  biometric_device_id: null,
  biometric_device_name: "",
  device_emp_code: "",
  use_emp_code_as_device_code: true,
};

export default function EmployeeUpsert({ mode = "create" }) {
  const { empCode } = useParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const isEdit = mode === "edit";

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const fetchedOnce = useRef(false);

  // Load biometric devices
  useEffect(() => {
    setLoadingDevices(true);
    getDevices()
      .then((data) => setDevices(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error("Failed to load devices:", e);
        setDevices([]);
      })
      .finally(() => setLoadingDevices(false));
  }, []);

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    if (isEdit) {
      // Always fetch fresh data from API to ensure all fields are up-to-date
      // Don't use stale state from navigation as it may be missing newly added fields
      if (empCode) {
        setLoading(true);
        getEmployee(empCode)
          .then((data) => {
            console.log("API Response for employee:", data);
            console.log("Increment from API:", data.increment);
            setForm({ ...empty, ...fromApi(data) });
          })
          .catch((e) => console.error(e))
          .finally(() => setLoading(false));
      }
    } else {
      setForm(empty);
    }
  }, [isEdit, empCode]);

  // Validation patterns
  const validationRules = {
    emp_code: {
      required: true,
      pattern: /^[A-Za-z0-9_\s-]+$/,
      message: "Only letters, numbers, underscores, hyphens and spaces allowed (e.g. 05 L)"
    },
    first_name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[A-Za-z\s.'-]+$/,
      message: "Only letters, spaces, dots, apostrophes and hyphens allowed"
    },
    last_name: {
      pattern: /^[A-Za-z\s.'-]*$/,
      message: "Only letters, spaces, dots, apostrophes and hyphens allowed"
    },
    phone: {
      pattern: /^$|^[6-9]\d{9}$/,
      message: "Must be a 10-digit Indian mobile number starting with 6-9"
    },
    email: {
      pattern: /^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      message: "Enter a valid email address"
    },
    pincode: {
      pattern: /^$|^[1-9][0-9]{5}$/,
      message: "Must be a 6-digit Indian pincode"
    },
    aadhaar: {
      pattern: /^$|^[2-9]{1}[0-9]{11}$/,
      message: "Must be a 12-digit Aadhaar number"
    },
    pan: {
      pattern: /^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      message: "Must be in format ABCDE1234F"
    },
    ifsc: {
      pattern: /^$|^[A-Z]{4}0[A-Z0-9]{6}$/,
      message: "Must be in format SBIN0001234"
    },
    uan_number: {
      pattern: /^$|^[0-9]{12}$/,
      message: "Must be a 12-digit UAN number"
    },
    esic_number: {
      pattern: /^$|^[0-9]{17}$/,
      message: "Must be a 17-digit ESIC number"
    },
    emergency_contact_phone: {
      pattern: /^$|^[6-9]\d{9}$/,
      message: "Must be a 10-digit Indian mobile number"
    }
  };

  // Validate a single field
  const validateField = (key, value) => {
    const rules = validationRules[key];
    if (!rules) return "";
    
    // Required check
    if (rules.required && (!value || value.toString().trim() === "")) {
      return `${key.replace(/_/g, " ")} is required`;
    }
    
    // Min length
    if (rules.minLength && value && value.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }
    
    // Max length
    if (rules.maxLength && value && value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    // Pattern
    if (rules.pattern && value && !rules.pattern.test(value)) {
      return rules.message;
    }
    
    return "";
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    Object.keys(validationRules).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    // Clear error when user types
    if (errors[k]) {
      setErrors((prev) => ({ ...prev, [k]: "" }));
    }
  };

  const onBlur = (k) => {
    setTouched((prev) => ({ ...prev, [k]: true }));
    const error = validateField(k, form[k]);
    setErrors((prev) => ({ ...prev, [k]: error }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(validationRules).forEach((k) => (allTouched[k] = true));
    setTouched(allTouched);
    
    // Validate form
    if (!validateForm()) {
      // Find first section with error and navigate to it
      const errorFields = Object.keys(errors).filter((k) => errors[k]);
      if (errorFields.length > 0) {
        const field = errorFields[0];
        if (["emp_code", "first_name", "last_name", "phone", "email", "address", "city", "state", "pincode"].includes(field)) {
          setActiveSection("personal");
        } else if (["aadhaar", "pan", "uan_number", "esic_number", "bank_name", "bank_account", "ifsc"].includes(field)) {
          setActiveSection("bank");
        }
      }
      return;
    }

    const payload = toApi(form);
    try {
      setLoading(true);
      if (isEdit) {
        await updateEmployee(empCode, payload);
        nav("/employees"); // After edit, go back to employee list
      } else {
        await createEmployee(payload);
        nav("/shifts/assign"); // After creation, redirect to shift assignment
      }
    } catch (err) {
      console.error(err);
      // Try to parse backend validation errors
      const errMsg = err.message || "Save failed";
      if (errMsg.includes("errors")) {
        try {
          const parsed = JSON.parse(errMsg.substring(errMsg.indexOf("{")));
          if (parsed.errors) {
            setErrors((prev) => ({ ...prev, ...parsed.errors }));
            return;
          }
        } catch {}
      }
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: "personal", label: "Personal Info", icon: "👤" },
    { id: "employment", label: "Employment", icon: "💼" },
    { id: "biometric", label: "Biometric Device", icon: "🔐" },
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
                <Field label="Employee Code" required error={touched.emp_code && errors.emp_code} hint="Letters, numbers, _, -, spaces (e.g. 05 L)">
                  <input
                    className={`input-field ${touched.emp_code && errors.emp_code ? "border-red-400 bg-red-50" : ""}`}
                    value={form.emp_code}
                    onChange={(e) => onChange("emp_code", e.target.value)}
                    onBlur={() => onBlur("emp_code")}
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
                <Field label="First Name" required error={touched.first_name && errors.first_name}>
                  <input
                    className={`input-field ${touched.first_name && errors.first_name ? "border-red-400 bg-red-50" : ""}`}
                    value={form.first_name}
                    onChange={(e) => onChange("first_name", e.target.value)}
                    onBlur={() => onBlur("first_name")}
                    placeholder="Enter first name"
                  />
                </Field>
                <Field label="Last Name" error={touched.last_name && errors.last_name}>
                  <input
                    className={`input-field ${touched.last_name && errors.last_name ? "border-red-400 bg-red-50" : ""}`}
                    value={form.last_name}
                    onChange={(e) => onChange("last_name", e.target.value)}
                    onBlur={() => onBlur("last_name")}
                    placeholder="Enter last name"
                  />
                </Field>
                <Field label="Email" error={touched.email && errors.email} hint="Valid email address">
                  <input
                    type="email"
                    className={`input-field ${touched.email && errors.email ? "border-red-400 bg-red-50" : ""}`}
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    onBlur={() => onBlur("email")}
                    placeholder="email@example.com"
                  />
                </Field>
                <Field label="Phone" error={touched.phone && errors.phone} hint="10-digit mobile starting with 6-9">
                  <input
                    className={`input-field ${touched.phone && errors.phone ? "border-red-400 bg-red-50" : ""}`}
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    onBlur={() => onBlur("phone")}
                    placeholder="9876543210"
                    maxLength={10}
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
                <Field label="Pincode" error={touched.pincode && errors.pincode} hint="6-digit pincode">
                  <input
                    className={`input-field ${touched.pincode && errors.pincode ? "border-red-400 bg-red-50" : ""}`}
                    value={form.pincode}
                    onChange={(e) => onChange("pincode", e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                    onBlur={() => onBlur("pincode")}
                    placeholder="400001"
                    maxLength={6}
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
                    <option value="">None (Use Global Settings)</option>
                    <option value="SUNDAY">Sunday</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="SATURDAY,SUNDAY">Saturday & Sunday</option>
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

            {/* Biometric Device */}
            <Section
              id="biometric"
              title="Biometric Device"
              icon="🔐"
              description="Attendance device association"
              isActive={activeSection === "biometric"}
              onToggle={() => setActiveSection(activeSection === "biometric" ? "" : "biometric")}
            >
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                  <strong>💡 How it works:</strong> Link this employee to a biometric device for attendance tracking. 
                  The "Device Employee Code" is how this employee is identified in the biometric machine 
                  (often different from the HRMS code).
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Biometric Device">
                    <select
                      className="input-field"
                      value={form.biometric_device_id || ""}
                      onChange={(e) => onChange("biometric_device_id", e.target.value ? Number(e.target.value) : null)}
                      disabled={loadingDevices}
                    >
                      <option value="">-- Select Device --</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.deviceName} ({device.deviceCode})
                        </option>
                      ))}
                    </select>
                    {loadingDevices && <p className="text-xs text-slate-400 mt-1">Loading devices...</p>}
                    {!loadingDevices && devices.length === 0 && (
                      <p className="text-xs text-amber-500 mt-1">No devices found. Please add devices in Settings → Biometric Devices.</p>
                    )}
                  </Field>
                  
                  <div className="space-y-2">
                    <Field label="Device Employee Code" hint="Code in the biometric machine">
                      <div className="flex items-center gap-2">
                        <input
                          className={`input-field flex-1 ${form.use_emp_code_as_device_code ? "bg-slate-100" : ""}`}
                          value={form.use_emp_code_as_device_code ? form.emp_code : form.device_emp_code}
                          onChange={(e) => onChange("device_emp_code", e.target.value)}
                          placeholder="e.g., 101"
                          disabled={form.use_emp_code_as_device_code}
                        />
                      </div>
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.use_emp_code_as_device_code}
                        onChange={(e) => onChange("use_emp_code_as_device_code", e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Same as Employee Code
                    </label>
                  </div>
                </div>
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
                    <Field label="Allowance (₹)">
                      <input
                        type="number"
                        className="input-field"
                        value={form.increment}
                        onChange={(e) => onChange("increment", e.target.value)}
                        placeholder="Monthly allowance"
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
                    <Field label="Aadhaar Number" error={touched.aadhaar && errors.aadhaar} hint="12-digit number">
                      <input
                        className={`input-field ${touched.aadhaar && errors.aadhaar ? "border-red-400 bg-red-50" : ""}`}
                        value={form.aadhaar}
                        onChange={(e) => onChange("aadhaar", e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
                        onBlur={() => onBlur("aadhaar")}
                        placeholder="123456789012"
                        maxLength={12}
                      />
                    </Field>
                    <Field label="PAN Number" error={touched.pan && errors.pan} hint="Format: ABCDE1234F">
                      <input
                        className={`input-field uppercase ${touched.pan && errors.pan ? "border-red-400 bg-red-50" : ""}`}
                        value={form.pan}
                        onChange={(e) => onChange("pan", e.target.value.toUpperCase().slice(0, 10))}
                        onBlur={() => onBlur("pan")}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                      />
                    </Field>
                    <Field label="UAN Number" error={touched.uan_number && errors.uan_number} hint="12-digit number">
                      <input
                        className={`input-field ${touched.uan_number && errors.uan_number ? "border-red-400 bg-red-50" : ""}`}
                        value={form.uan_number}
                        onChange={(e) => onChange("uan_number", e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
                        onBlur={() => onBlur("uan_number")}
                        placeholder="123456789012"
                        maxLength={12}
                      />
                    </Field>
                    <Field label="ESIC Number" error={touched.esic_number && errors.esic_number} hint="17-digit number">
                      <input
                        className={`input-field ${touched.esic_number && errors.esic_number ? "border-red-400 bg-red-50" : ""}`}
                        value={form.esic_number}
                        onChange={(e) => onChange("esic_number", e.target.value.replace(/[^\d]/g, "").slice(0, 17))}
                        onBlur={() => onBlur("esic_number")}
                        placeholder="12345678901234567"
                        maxLength={17}
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
                    <Field label="IFSC Code" error={touched.ifsc && errors.ifsc} hint="Format: SBIN0001234">
                      <input
                        className={`input-field uppercase ${touched.ifsc && errors.ifsc ? "border-red-400 bg-red-50" : ""}`}
                        value={form.ifsc}
                        onChange={(e) => onChange("ifsc", e.target.value.toUpperCase().slice(0, 11))}
                        onBlur={() => onBlur("ifsc")}
                        placeholder="SBIN0001234"
                        maxLength={11}
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
                    <Field label="Contact Phone" error={touched.emergency_contact_phone && errors.emergency_contact_phone} hint="10-digit mobile">
                      <input
                        className={`input-field ${touched.emergency_contact_phone && errors.emergency_contact_phone ? "border-red-400 bg-red-50" : ""}`}
                        value={form.emergency_contact_phone}
                        onChange={(e) => onChange("emergency_contact_phone", e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                        onBlur={() => onBlur("emergency_contact_phone")}
                        placeholder="9876543210"
                        maxLength={10}
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

// Field Component with validation
function Field({ label, children, required, colSpan, error, hint }) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      )}
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

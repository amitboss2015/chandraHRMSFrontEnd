// src/routes/Employees/EmployeeProfile.jsx
// Modern, clean employee profile view with organized sections
import React, { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { API_BASE } from "../../utils/apiConfig";

const getToken = () =>
  sessionStorage.getItem("hrms_access_token") || localStorage.getItem("token") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_TOKEN) ||
  "";

const getTenantId = () =>
  localStorage.getItem("hrms_tenant_id") || "SASA001";

export default function EmployeeProfile() {
  const { empCode } = useParams();
  const nav = useNavigate();
  const { state } = useLocation();
  const [emp, setEmp] = useState(state?.employee || null);
  const [loading, setLoading] = useState(!state?.employee);

  // Fetch employee if not passed via state
  useEffect(() => {
    if (state?.employee) return;
    if (!empCode) return;

    setLoading(true);
    fetch(`${API_BASE}/employees/${encodeURIComponent(empCode)}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Id": getTenantId(),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Convert to snake_case for consistency
        setEmp({
          emp_code: data.empCode ?? "",
          first_name: data.firstName ?? "",
          last_name: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          employment_type: data.employmentType ?? "",
          department: data.department ?? "",
          designation: data.designation ?? "",
          join_date: data.joinDate ?? "",
          status: data.status ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          pincode: data.pincode ?? "",
          aadhaar: data.aadhaar ?? "",
          pan: data.pan ?? "",
          uan_number: data.uanNumber ?? "",
          esic_number: data.esicNumber ?? "",
          bank_name: data.bankName ?? "",
          bank_account: data.bankAccount ?? "",
          ifsc: data.ifsc ?? "",
          branch_name: data.branchName ?? "",
          salary_basis: data.salaryBasis ?? "MONTHLY",
          base_salary: data.baseSalary ?? 0,
          increment: data.increment ?? 0,
          hourly_rate: data.hourlyRate ?? 0,
          hra_percent: data.hraPercent ?? "",
          da_percent: data.daPercent ?? "",
          conveyance_allowance: data.conveyanceAllowance ?? "",
          medical_allowance: data.medicalAllowance ?? "",
          special_allowance: data.specialAllowance ?? "",
          other_allowance: data.otherAllowance ?? "",
          epf_applicable: data.epfApplicable ?? true,
          esic_applicable: data.esicApplicable ?? true,
          pt_applicable: data.ptApplicable ?? true,
          tds_applicable: data.tdsApplicable ?? false,
          ot_allowed: data.otAllowed ?? false,
          ot_duration_minutes: data.otDurationMinutes ?? 0,
          weekly_off_days: data.weeklyOffDays ?? "",
          working_days_per_month: data.workingDaysPerMonth ?? 26,
          emergency_contact_name: data.emergencyContactName ?? "",
          emergency_contact_phone: data.emergencyContactPhone ?? "",
        });
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [empCode, state?.employee]);

  const fullName = useMemo(() => {
    if (!emp) return empCode || "Employee";
    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
    return name || emp.emp_code || empCode;
  }, [emp, empCode]);

  const getInitials = () => {
    if (!emp) return "?";
    return ((emp.first_name?.[0] || "") + (emp.last_name?.[0] || "")).toUpperCase() || "?";
  };

  const formatSalary = () => {
    if (!emp) return "-";
    if (emp.salary_basis === "HOURLY") {
      return emp.hourly_rate ? `₹${emp.hourly_rate}/hr` : "-";
    }
    const base = Number(emp.base_salary) || 0;
    const inc = Number(emp.increment) || 0;
    const total = base + inc;
    return total ? `₹${total.toLocaleString("en-IN")}` : "-";
  };

  const maskAadhaar = (val) => {
    if (!val) return "-";
    const s = String(val);
    return s.length > 4 ? `**** **** ${s.slice(-4)}` : s;
  };

  const maskAccount = (val) => {
    if (!val) return "-";
    const s = String(val);
    return s.length > 4 ? `XXXX ${s.slice(-4)}` : s;
  };

  const getStatusStyle = (status) => {
    const styles = {
      ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
      INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
      RESIGNED: "bg-red-100 text-red-700 border-red-200",
    };
    return styles[status] || styles.INACTIVE;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Employee Not Found</h2>
          <p className="text-slate-500 mb-4">
            No employee data found for code: <strong>{empCode}</strong>
          </p>
          <button
            onClick={() => nav("/employees")}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => nav(-1)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Employee Profile</h1>
                <p className="text-sm text-slate-500">{emp.emp_code}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => nav(`/shifts/assign?emp=${encodeURIComponent(emp.emp_code)}`)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                📅 Assign Shifts
              </button>
              <button
                onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}/edit`, { state: { employee: emp } })}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
              >
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-24"></div>
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-xl bg-white shadow-lg flex items-center justify-center text-3xl font-bold text-emerald-600 border-4 border-white">
                {getInitials()}
              </div>
              <div className="flex-1 md:pb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-800">{fullName}</h2>
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusStyle(emp.status)}`}>
                    {emp.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 flex-wrap">
                  {emp.designation && <span>{emp.designation}</span>}
                  {emp.department && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{emp.department}</span>
                    </>
                  )}
                  {emp.employment_type && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="capitalize">{emp.employment_type.replace("_", " ").toLowerCase()}</span>
                    </>
                  )}
                </div>
              </div>
              {/* Quick Stats */}
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{formatSalary()}</div>
                  <div className="text-xs text-slate-500">Monthly Salary</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-700">{emp.join_date || "-"}</div>
                  <div className="text-xs text-slate-500">Join Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <InfoCard title="Contact Information" icon="📱">
            <InfoRow label="Email" value={emp.email} />
            <InfoRow label="Phone" value={emp.phone} />
            <InfoRow
              label="Address"
              value={
                [emp.address, emp.city, emp.state, emp.pincode].filter(Boolean).join(", ") || "-"
              }
            />
            <div className="border-t pt-3 mt-3">
              <div className="text-xs text-slate-500 mb-2">Emergency Contact</div>
              <InfoRow label="Name" value={emp.emergency_contact_name} />
              <InfoRow label="Phone" value={emp.emergency_contact_phone} />
            </div>
          </InfoCard>

          {/* Employment Details */}
          <InfoCard title="Employment Details" icon="💼">
            <InfoRow label="Employee Code" value={emp.emp_code} highlight />
            <InfoRow label="Department" value={emp.department} />
            <InfoRow label="Designation" value={emp.designation} />
            <InfoRow label="Employment Type" value={emp.employment_type?.replace("_", " ")} />
            <InfoRow label="Join Date" value={emp.join_date} />
            <InfoRow label="Weekly Off" value={emp.weekly_off_days?.replace(",", " & ")} />
            <InfoRow label="Working Days/Month" value={emp.working_days_per_month} />
          </InfoCard>

          {/* Salary Structure */}
          <InfoCard title="Salary Structure" icon="💰">
            <InfoRow label="Salary Basis" value={emp.salary_basis} />
            {emp.salary_basis === "HOURLY" ? (
              <InfoRow label="Hourly Rate" value={`₹${emp.hourly_rate || 0}`} highlight />
            ) : (
              <>
                <InfoRow
                  label="Base Salary"
                  value={`₹${Number(emp.base_salary || 0).toLocaleString("en-IN")}`}
                />
                <InfoRow
                  label="Allowance"
                  value={`₹${Number(emp.increment || 0).toLocaleString("en-IN")}`}
                />
                <InfoRow
                  label="Total (Base + Inc)"
                  value={`₹${(Number(emp.base_salary || 0) + Number(emp.increment || 0)).toLocaleString("en-IN")}`}
                  highlight
                />
              </>
            )}
            <div className="border-t pt-3 mt-3">
              <div className="text-xs text-slate-500 mb-2">Allowances</div>
              <div className="grid grid-cols-2 gap-2">
                <InfoRow label="HRA %" value={emp.hra_percent || "-"} compact />
                <InfoRow label="DA %" value={emp.da_percent || "-"} compact />
                <InfoRow label="Conveyance" value={emp.conveyance_allowance ? `₹${emp.conveyance_allowance}` : "-"} compact />
                <InfoRow label="Medical" value={emp.medical_allowance ? `₹${emp.medical_allowance}` : "-"} compact />
                <InfoRow label="Special" value={emp.special_allowance ? `₹${emp.special_allowance}` : "-"} compact />
                <InfoRow label="Other" value={emp.other_allowance ? `₹${emp.other_allowance}` : "-"} compact />
              </div>
            </div>
          </InfoCard>

          {/* Bank & KYC */}
          <InfoCard title="Bank & KYC Details" icon="🏦">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-2">Identity Documents</div>
                <InfoRow label="Aadhaar" value={maskAadhaar(emp.aadhaar)} />
                <InfoRow label="PAN" value={emp.pan || "-"} />
                <InfoRow label="UAN" value={emp.uan_number || "-"} />
                <InfoRow label="ESIC" value={emp.esic_number || "-"} />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Bank Account</div>
                <InfoRow label="Bank" value={emp.bank_name || "-"} />
                <InfoRow label="Account" value={maskAccount(emp.bank_account)} />
                <InfoRow label="IFSC" value={emp.ifsc || "-"} />
                <InfoRow label="Branch" value={emp.branch_name || "-"} />
              </div>
            </div>
          </InfoCard>

          {/* Deductions & Settings */}
          <InfoCard title="Statutory Deductions" icon="📋" fullWidth>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DeductionBadge
                label="EPF"
                description="12% of Basic"
                active={emp.epf_applicable}
              />
              <DeductionBadge
                label="ESIC"
                description="0.75% of Gross"
                active={emp.esic_applicable}
              />
              <DeductionBadge
                label="Professional Tax"
                description="State tax"
                active={emp.pt_applicable}
              />
              <DeductionBadge
                label="TDS"
                description="Tax at source"
                active={emp.tds_applicable}
              />
            </div>
          </InfoCard>

          {/* Overtime Settings */}
          {emp.ot_allowed && (
            <InfoCard title="Overtime Settings" icon="⏰" fullWidth>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-slate-700">Overtime Allowed</span>
                </div>
                {emp.ot_duration_minutes > 0 && (
                  <div className="text-sm text-slate-600">
                    Max Duration:{" "}
                    <strong>
                      {Math.floor(emp.ot_duration_minutes / 60)}h{" "}
                      {emp.ot_duration_minutes % 60}m
                    </strong>
                  </div>
                )}
              </div>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}

// Info Card Component
function InfoCard({ title, icon, children, fullWidth }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${fullWidth ? "lg:col-span-2" : ""}`}>
      <div className="px-5 py-3 bg-slate-50 border-b flex items-center gap-2">
        <span>{icon}</span>
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value, highlight, compact }) {
  return (
    <div className={`flex justify-between ${compact ? "py-1" : "py-2"} ${highlight ? "" : "border-b border-slate-50"}`}>
      <span className={`text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>{label}</span>
      <span className={`${highlight ? "text-emerald-600 font-bold" : "text-slate-800"} ${compact ? "text-xs" : "text-sm"} font-medium text-right`}>
        {value || "-"}
      </span>
    </div>
  );
}

// Deduction Badge Component
function DeductionBadge({ label, description, active }) {
  return (
    <div
      className={`p-3 rounded-lg border text-center transition-all ${
        active
          ? "bg-emerald-50 border-emerald-200"
          : "bg-slate-50 border-slate-200 opacity-50"
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}></span>
        <span className={`text-sm font-medium ${active ? "text-emerald-700" : "text-slate-500"}`}>
          {label}
        </span>
      </div>
      <div className="text-xs text-slate-500">{description}</div>
      <div className={`text-xs mt-1 ${active ? "text-emerald-600" : "text-slate-400"}`}>
        {active ? "✓ Applicable" : "✗ Not Applicable"}
      </div>
    </div>
  );
}

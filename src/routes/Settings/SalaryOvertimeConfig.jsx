import React, { useState, useEffect } from "react";

/** ======= CONFIG ======= */
const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/,"");
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  return `http://${hostname}:8080/api`;
};

const API_BASE = getApiBase();
const getToken = () => sessionStorage.getItem("hrms_access_token") || "";
const getTenantId = () => localStorage.getItem("hrms_tenant_id") || "SASA001";

async function fetchApi(path, options = {}) {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": getTenantId(),
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return resp.json();
}

function SalaryOvertimeConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [config, setConfig] = useState({
    // Salary Rules
    fullMonthSalaryThresholdDays: 28,
    salaryCalculationDaysInMonth: 30,
    standardWorkingHoursPerDay: 8,
    enableFullMonthSalaryThreshold: true,
    
    // Overtime Rules
    overtimeEnabled: true,
    overtimeMinThresholdMins: 30,
    regularOvertimeMultiplier: 1.0,
    weekendOvertimeMultiplier: 1.5,
    holidayOvertimeMultiplier: 2.0,
    maxOvertimeHoursPerDay: 4,
    maxOvertimeHoursPerMonth: 50,
    overtimeCalculationType: "HOURLY",
    
    // Late/Attendance Rules
    lateArrivalsPerAbsent: 3,
    deductForLateArrival: true,
    lateArrivalGraceMins: 0,
    halfDayMinHours: 4,
    fullDayMinHours: 7,
    
    // Statutory Deduction Rates (Organization-Level)
    esiEmployeeRate: 0.0075,
    esiEmployerRate: 0.0325,
    esiWageCeiling: 21000,
    pfEmployeeRate: 0.06,
    pfEmployerRate: 0.06,
    pfWageCeiling: 15000,
    pfCalculationBase: "FULL_PAYMENT",
    professionalTaxAmount: 0,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchApi("/config/salary-overtime");
      setConfig(data);
    } catch (e) {
      setError("Failed to load configuration: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await fetchApi("/config/salary-overtime", {
        method: "POST",
        body: JSON.stringify(config),
      });
      setConfig(updated);
      setSuccess("Configuration saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError("Failed to save configuration: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset to default configuration?")) return;
    setSaving(true);
    setError("");
    try {
      const defaults = await fetchApi("/config/salary-overtime/reset", { method: "POST" });
      setConfig(defaults);
      setSuccess("Configuration reset to defaults!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError("Failed to reset configuration: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-full">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              Salary & Overtime Configuration
            </h1>
            <p className="text-slate-500 mt-1">
              Configure payroll calculation rules and overtime policies
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
            {success}
          </div>
        )}

        {/* Salary Calculation Rules */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> Salary Calculation Rules
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Month Threshold */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="enableThreshold"
                  checked={config.enableFullMonthSalaryThreshold}
                  onChange={(e) => handleChange("enableFullMonthSalaryThreshold", e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="enableThreshold" className="font-medium text-slate-700">
                  Enable Full Month Salary Threshold
                </label>
              </div>
              <p className="text-sm text-slate-500 mb-3">
                If enabled, employees working more than threshold days get full month salary
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Threshold Days:</label>
                <input
                  type="number"
                  value={config.fullMonthSalaryThresholdDays}
                  onChange={(e) => handleChange("fullMonthSalaryThresholdDays", parseInt(e.target.value) || 0)}
                  disabled={!config.enableFullMonthSalaryThreshold}
                  className="w-20 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="1" max="31"
                />
                <span className="text-sm text-slate-500">days</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                ✓ Example: If set to 28, employee working 28+ days gets full 30-day salary
              </p>
            </div>

            {/* Days in Month */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <label className="block font-medium text-slate-700 mb-2">
                Days in Month for Salary Calculation
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Number of days considered for monthly salary division
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.salaryCalculationDaysInMonth}
                  onChange={(e) => handleChange("salaryCalculationDaysInMonth", parseInt(e.target.value) || 30)}
                  className="w-20 px-3 py-2 border rounded-lg"
                  min="28" max="31"
                />
                <span className="text-sm text-slate-500">days</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Per day rate = Monthly Salary ÷ {config.salaryCalculationDaysInMonth}
              </p>
            </div>

            {/* Working Hours */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <label className="block font-medium text-slate-700 mb-2">
                Standard Working Hours Per Day
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Used to calculate per-hour rate for overtime
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.standardWorkingHoursPerDay}
                  onChange={(e) => handleChange("standardWorkingHoursPerDay", parseInt(e.target.value) || 8)}
                  className="w-20 px-3 py-2 border rounded-lg"
                  min="1" max="24"
                />
                <span className="text-sm text-slate-500">hours</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Hourly rate = Daily Rate ÷ {config.standardWorkingHoursPerDay}
              </p>
            </div>
          </div>
        </div>

        {/* Overtime Rules */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">⏱️</span> Overtime Rules
          </h2>

          <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-lg">
            <input
              type="checkbox"
              id="overtimeEnabled"
              checked={config.overtimeEnabled}
              onChange={(e) => handleChange("overtimeEnabled", e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="overtimeEnabled" className="font-medium text-emerald-700">
              Enable Overtime Calculation
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Minimum Threshold */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <label className="block font-medium text-amber-800 mb-2">
                🕐 Minimum OT Threshold
              </label>
              <p className="text-sm text-amber-600 mb-3">
                Minimum minutes after shift to count as overtime
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.overtimeMinThresholdMins}
                  onChange={(e) => handleChange("overtimeMinThresholdMins", parseInt(e.target.value) || 0)}
                  disabled={!config.overtimeEnabled}
                  className="w-24 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="0" max="120"
                />
                <span className="text-sm text-amber-700">minutes</span>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Example: If 30, working 29 mins extra = No OT, 30 mins = OT starts
              </p>
            </div>

            {/* Regular OT Multiplier */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <label className="block font-medium text-slate-700 mb-2">
                Regular OT Multiplier
              </label>
              <p className="text-sm text-slate-500 mb-3">
                For overtime on regular working days
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={config.regularOvertimeMultiplier}
                  onChange={(e) => handleChange("regularOvertimeMultiplier", parseFloat(e.target.value) || 1)}
                  disabled={!config.overtimeEnabled}
                  className="w-24 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="0.5" max="5"
                />
                <span className="text-sm text-slate-500">× rate</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                1.0 = Normal, 1.5 = 1.5x, 2.0 = Double
              </p>
            </div>

            {/* Weekend OT Multiplier */}
            <div className="p-4 bg-purple-50 rounded-xl">
              <label className="block font-medium text-purple-700 mb-2">
                🏖️ Weekend OT Multiplier
              </label>
              <p className="text-sm text-purple-600 mb-3">
                For overtime on Sat/Sun (weekly off)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={config.weekendOvertimeMultiplier}
                  onChange={(e) => handleChange("weekendOvertimeMultiplier", parseFloat(e.target.value) || 1)}
                  disabled={!config.overtimeEnabled}
                  className="w-24 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="0.5" max="5"
                />
                <span className="text-sm text-purple-600">× rate</span>
              </div>
            </div>

            {/* Holiday OT Multiplier */}
            <div className="p-4 bg-orange-50 rounded-xl">
              <label className="block font-medium text-orange-700 mb-2">
                🎉 Holiday OT Multiplier
              </label>
              <p className="text-sm text-orange-600 mb-3">
                For overtime on declared holidays
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={config.holidayOvertimeMultiplier}
                  onChange={(e) => handleChange("holidayOvertimeMultiplier", parseFloat(e.target.value) || 2)}
                  disabled={!config.overtimeEnabled}
                  className="w-24 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="0.5" max="5"
                />
                <span className="text-sm text-orange-600">× rate</span>
              </div>
            </div>

            {/* Max OT Per Day */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <label className="block font-medium text-slate-700 mb-2">
                Max OT Hours Per Day
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Cap on daily overtime (excess not counted)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.maxOvertimeHoursPerDay}
                  onChange={(e) => handleChange("maxOvertimeHoursPerDay", parseInt(e.target.value) || 4)}
                  disabled={!config.overtimeEnabled}
                  className="w-24 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="1" max="12"
                />
                <span className="text-sm text-slate-500">hours</span>
              </div>
            </div>

            {/* Max OT Per Month */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <label className="block font-medium text-slate-700 mb-2">
                Max OT Hours Per Month
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Cap on monthly overtime
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.maxOvertimeHoursPerMonth}
                  onChange={(e) => handleChange("maxOvertimeHoursPerMonth", parseInt(e.target.value) || 50)}
                  disabled={!config.overtimeEnabled}
                  className="w-24 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="1" max="200"
                />
                <span className="text-sm text-slate-500">hours</span>
              </div>
            </div>

            {/* Calculation Type */}
            <div className="p-4 bg-blue-50 rounded-xl md:col-span-2 lg:col-span-1">
              <label className="block font-medium text-blue-700 mb-2">
                OT Calculation Type
              </label>
              <p className="text-sm text-blue-600 mb-3">
                How to calculate overtime pay
              </p>
              <select
                value={config.overtimeCalculationType}
                onChange={(e) => handleChange("overtimeCalculationType", e.target.value)}
                disabled={!config.overtimeEnabled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-slate-100"
              >
                <option value="HOURLY">Hourly (Salary/30/8 × Hours × Multiplier)</option>
                <option value="DAILY">Daily (Salary/30 × Days × Multiplier)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Late Arrival & Attendance Rules */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">⏰</span> Late Arrival & Attendance Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Late Arrivals Per Absent */}
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="deductForLate"
                  checked={config.deductForLateArrival}
                  onChange={(e) => handleChange("deductForLateArrival", e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <label htmlFor="deductForLate" className="font-medium text-red-700">
                  Deduct for Late Arrivals
                </label>
              </div>
              <p className="text-sm text-red-600 mb-3">
                How many late arrivals count as one absent
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.lateArrivalsPerAbsent}
                  onChange={(e) => handleChange("lateArrivalsPerAbsent", parseInt(e.target.value) || 3)}
                  disabled={!config.deductForLateArrival}
                  className="w-20 px-3 py-2 border rounded-lg disabled:bg-slate-100"
                  min="1" max="10"
                />
                <span className="text-sm text-red-600">lates = 1 absent</span>
              </div>
              <p className="text-xs text-red-500 mt-2">
                Example: If 3, then 3 late marks = 1 day salary deduction
              </p>
            </div>

            {/* Late Grace Period */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <label className="block font-medium text-slate-700 mb-2">
                Additional Late Grace Period
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Extra grace minutes (on top of shift's grace)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.lateArrivalGraceMins}
                  onChange={(e) => handleChange("lateArrivalGraceMins", parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border rounded-lg"
                  min="0" max="60"
                />
                <span className="text-sm text-slate-500">minutes</span>
              </div>
            </div>

            {/* Half Day Minimum */}
            <div className="p-4 bg-yellow-50 rounded-xl">
              <label className="block font-medium text-yellow-700 mb-2">
                Half Day Minimum Hours
              </label>
              <p className="text-sm text-yellow-600 mb-3">
                Minimum hours to count as half day
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.halfDayMinHours}
                  onChange={(e) => handleChange("halfDayMinHours", parseInt(e.target.value) || 4)}
                  className="w-20 px-3 py-2 border rounded-lg"
                  min="1" max="6"
                />
                <span className="text-sm text-yellow-600">hours</span>
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                Working &lt; {config.halfDayMinHours}h = Absent, ≥ {config.halfDayMinHours}h = Half Day
              </p>
            </div>

            {/* Full Day Minimum */}
            <div className="p-4 bg-emerald-50 rounded-xl">
              <label className="block font-medium text-emerald-700 mb-2">
                Full Day Minimum Hours
              </label>
              <p className="text-sm text-emerald-600 mb-3">
                Minimum hours to count as full day
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.fullDayMinHours}
                  onChange={(e) => handleChange("fullDayMinHours", parseInt(e.target.value) || 7)}
                  className="w-20 px-3 py-2 border rounded-lg"
                  min="4" max="12"
                />
                <span className="text-sm text-emerald-600">hours</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                Working ≥ {config.fullDayMinHours}h = Full Day Present
              </p>
            </div>
          </div>
        </div>

        {/* Statutory Deductions */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏛️</span> Statutory Deduction Rates (Organization-Level)
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            These rates apply to all employees in your organization. Individual employee flags (ESI Applicable, PF Applicable) control whether deductions apply.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ESI Employee Rate */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label className="block font-medium text-blue-700 mb-2">
                ESI Employee Rate (%)
              </label>
              <p className="text-sm text-blue-600 mb-3">
                Employee contribution to ESI
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={(config.esiEmployeeRate * 100).toFixed(2)}
                  onChange={(e) => handleChange("esiEmployeeRate", (parseFloat(e.target.value) || 0) / 100)}
                  className="w-24 px-3 py-2 border rounded-lg"
                  min="0" max="10"
                />
                <span className="text-sm text-blue-600">%</span>
              </div>
              <p className="text-xs text-blue-500 mt-2">
                Standard: 0.75%
              </p>
            </div>

            {/* ESI Employer Rate */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label className="block font-medium text-blue-700 mb-2">
                ESI Employer Rate (%)
              </label>
              <p className="text-sm text-blue-600 mb-3">
                Employer contribution to ESI
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={(config.esiEmployerRate * 100).toFixed(2)}
                  onChange={(e) => handleChange("esiEmployerRate", (parseFloat(e.target.value) || 0) / 100)}
                  className="w-24 px-3 py-2 border rounded-lg"
                  min="0" max="10"
                />
                <span className="text-sm text-blue-600">%</span>
              </div>
              <p className="text-xs text-blue-500 mt-2">
                Standard: 3.25%
              </p>
            </div>

            {/* ESI Wage Ceiling */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label className="block font-medium text-blue-700 mb-2">
                ESI Wage Ceiling (₹)
              </label>
              <p className="text-sm text-blue-600 mb-3">
                Employees above this are exempt
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">₹</span>
                <input
                  type="number"
                  value={config.esiWageCeiling}
                  onChange={(e) => handleChange("esiWageCeiling", parseInt(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border rounded-lg"
                  min="0"
                />
              </div>
              <p className="text-xs text-blue-500 mt-2">
                Standard: ₹21,000/month
              </p>
            </div>

            {/* PF Employee Rate */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <label className="block font-medium text-green-700 mb-2">
                PF Employee Rate (%)
              </label>
              <p className="text-sm text-green-600 mb-3">
                Employee contribution to PF
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={(config.pfEmployeeRate * 100).toFixed(1)}
                  onChange={(e) => handleChange("pfEmployeeRate", (parseFloat(e.target.value) || 0) / 100)}
                  className="w-24 px-3 py-2 border rounded-lg"
                  min="0" max="20"
                />
                <span className="text-sm text-green-600">%</span>
              </div>
              <p className="text-xs text-green-500 mt-2">
                Standard: 6% or 12%
              </p>
            </div>

            {/* PF Employer Rate */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <label className="block font-medium text-green-700 mb-2">
                PF Employer Rate (%)
              </label>
              <p className="text-sm text-green-600 mb-3">
                Employer contribution to PF
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={(config.pfEmployerRate * 100).toFixed(1)}
                  onChange={(e) => handleChange("pfEmployerRate", (parseFloat(e.target.value) || 0) / 100)}
                  className="w-24 px-3 py-2 border rounded-lg"
                  min="0" max="20"
                />
                <span className="text-sm text-green-600">%</span>
              </div>
              <p className="text-xs text-green-500 mt-2">
                Standard: 6% or 12%
              </p>
            </div>

            {/* PF Calculation Base */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <label className="block font-medium text-green-700 mb-2">
                PF Calculation Base
              </label>
              <p className="text-sm text-green-600 mb-3">
                What salary to calculate PF on
              </p>
              <select
                value={config.pfCalculationBase}
                onChange={(e) => handleChange("pfCalculationBase", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="BASIC">Basic Salary Only</option>
                <option value="FULL_PAYMENT">Basic + Increment (Full Payment)</option>
              </select>
            </div>

            {/* Professional Tax */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <label className="block font-medium text-purple-700 mb-2">
                Professional Tax (₹)
              </label>
              <p className="text-sm text-purple-600 mb-3">
                Fixed monthly PT amount
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-600">₹</span>
                <input
                  type="number"
                  value={config.professionalTaxAmount}
                  onChange={(e) => handleChange("professionalTaxAmount", parseInt(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border rounded-lg"
                  min="0"
                />
                <span className="text-sm text-purple-600">/month</span>
              </div>
              <p className="text-xs text-purple-500 mt-2">
                Varies by state (0 = Not applicable)
              </p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white">
          <h3 className="font-semibold mb-2">📋 Configuration Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
            <div className="bg-white/20 p-2 rounded-lg">
              <div className="text-white/80">Full Salary After</div>
              <div className="font-bold">{config.fullMonthSalaryThresholdDays} days</div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <div className="text-white/80">Min OT Threshold</div>
              <div className="font-bold">{config.overtimeMinThresholdMins} mins</div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <div className="text-white/80">Holiday OT Rate</div>
              <div className="font-bold">{config.holidayOvertimeMultiplier}× pay</div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <div className="text-white/80">Lates = 1 Absent</div>
              <div className="font-bold">{config.lateArrivalsPerAbsent} times</div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <div className="text-white/80">ESI Employee</div>
              <div className="font-bold">{(config.esiEmployeeRate * 100).toFixed(2)}%</div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <div className="text-white/80">PF Employee</div>
              <div className="font-bold">{(config.pfEmployeeRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalaryOvertimeConfig;

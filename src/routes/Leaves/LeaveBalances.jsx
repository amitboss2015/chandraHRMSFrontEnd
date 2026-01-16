import React, { useState, useEffect } from "react";
import { getBalances, closeMonth, closeYear, listEmployees, listLeaveTypes } from "./api";
import Field from "../../components/Field";

export default function LeaveBalances({ orgId: propOrgId }) {
  const orgId = propOrgId || localStorage.getItem("hrms_tenant_id") || localStorage.getItem("orgId") || "SASA001";

  const [employees, setEmployees] = useState([]);
  const [empQuery, setEmpQuery] = useState("");
  const [empId, setEmpId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Load employees on mount
  useEffect(() => {
    listEmployees()
      .then(setEmployees)
      .catch((e) => console.error("Failed to load employees:", e));
  }, []);

  // Helper to get employee code
  const getEmpCode = (e) =>
    e?.empCode ?? e?.code ?? e?.empId ?? (e?.id != null ? String(e.id) : "");
  const getEmpName = (e) =>
    e?.name ?? e?.fullName ?? [e?.firstName, e?.lastName].filter(Boolean).join(" ");

  const parseEmpCode = (val) =>
    val && val.includes(" — ") ? val.split(" — ")[0] : val;

  const fetchData = async () => {
    if (!empId) {
      setError("Please select an employee");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await getBalances(orgId, empId, Number(year));
      setData(result);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  const doCloseMonth = async (month) => {
    if (!month) {
      setError("Select month to close");
      return;
    }
    setBusy(true);
    try {
      await closeMonth(orgId, Number(year), Number(month));
      await fetchData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCloseYear = async () => {
    setBusy(true);
    try {
      await closeYear(orgId, Number(year));
      await fetchData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Leave Balances</h2>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Employee" required>
            <input
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              list="emp-balance-list"
              placeholder="Search by code or name..."
              value={empQuery}
              onChange={(e) => {
                const v = e.target.value;
                setEmpQuery(v);
                setEmpId(parseEmpCode(v));
              }}
              onBlur={() => {
                if (!empQuery.includes(" — ")) {
                  setEmpId(empQuery);
                }
              }}
            />
            <datalist id="emp-balance-list">
              {employees
                .filter((e) => {
                  const code = getEmpCode(e);
                  const name = getEmpName(e);
                  const n = empQuery.toLowerCase();
                  return !n || `${code} ${name}`.toLowerCase().includes(n);
                })
                .slice(0, 50)
                .map((e) => {
                  const code = getEmpCode(e);
                  const name = getEmpName(e);
                  return (
                    <option key={e.id ?? code} value={`${code} — ${name}`} />
                  );
                })}
            </datalist>
          </Field>

          <Field label="Year" required>
            <input
              type="number"
              className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2020"
              max="2030"
            />
          </Field>

          <div className="flex items-end">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-md disabled:opacity-50 transition-colors"
              disabled={busy}
              onClick={fetchData}
            >
              {busy ? "Loading..." : "Fetch Balances"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Balance Cards */}
      {data && data.balances && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-700">
              Balances for {data.empId} - {data.year}
            </h3>
            <div className="flex gap-2">
              <button
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                onClick={doCloseYear}
                disabled={busy}
              >
                Close Year
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.balances.map((bal) => (
              <div
                key={bal.leaveTypeId}
                className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                  <h4 className="font-bold text-white text-lg">
                    {bal.leaveTypeCode}
                  </h4>
                  <p className="text-blue-100 text-sm">{bal.leaveTypeName}</p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Total Available - Highlighted */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-3xl font-bold text-green-700">
                      {Number(bal.totalAvailable || 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Days Available
                    </div>
                  </div>

                  {/* Balance Details */}
                  <div className="space-y-2 text-sm">
                    {bal.accrualMode === "MONTHLY" || bal.accrualMode === "HYBRID" ? (
                      <>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-600">Monthly Opening</span>
                          <span className="font-medium">{Number(bal.monthlyOpening || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-600">Monthly Accrued</span>
                          <span className="font-medium text-green-600">+{Number(bal.monthlyAccrued || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-600">Monthly Used</span>
                          <span className="font-medium text-red-600">-{Number(bal.monthlyUsed || 0).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-600">Monthly Balance</span>
                          <span className="font-bold">{Number(bal.monthlyBalance || 0).toFixed(1)}</span>
                        </div>
                      </>
                    ) : null}

                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Annual Opening</span>
                      <span className="font-medium">{Number(bal.annualOpening || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Annual Allocated</span>
                      <span className="font-medium text-green-600">+{Number(bal.annualAccrued || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Annual Used</span>
                      <span className="font-medium text-red-600">-{Number(bal.annualUsed || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Annual Balance</span>
                      <span className="font-bold">{Number(bal.annualBalance || 0).toFixed(1)}</span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-600">Total Used This Year</span>
                      <span className="font-bold text-red-600">
                        {Number(bal.totalUsedThisYear || 0).toFixed(1)} days
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap pt-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        bal.isPaid
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bal.isPaid ? "Paid" : "Unpaid"}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {bal.accrualMode}
                    </span>
                    {bal.yearLocked && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        Year Locked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.balances.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <p className="text-slate-500">
                No leave types configured for this organization. Please set up leave types first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!data && !error && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <div className="text-slate-400 text-5xl mb-4">📋</div>
          <p className="text-slate-600">
            Select an employee and year to view their leave balances
          </p>
        </div>
      )}
    </div>
  );
}

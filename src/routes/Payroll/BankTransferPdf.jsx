// BankTransferPdf.jsx - Generate Bank Transfer PDF (Employee Bank Details Format)
import React, { useState, useEffect } from "react";
import { usePeriodSelection } from "../../utils/monthYearState";
import { payrollApi, employeeApi } from "../../services/api";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Validation: same as backend (Employee entity)
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_MAX = 20;
const BRANCH_MAX = 50;

function validateBankRow(row) {
  const err = {};
  const ifscVal = (row.ifsc || "").trim().toUpperCase();
  if (ifscVal && !IFSC_REGEX.test(ifscVal)) {
    err.ifsc = "IFSC must be 11 characters (e.g. SBIN0001234)";
  }
  const acc = (row.accountNumber || "").trim();
  if (acc.length > ACCOUNT_MAX) err.accountNumber = `Max ${ACCOUNT_MAX} characters`;
  const br = (row.branch || "").trim();
  if (br.length > BRANCH_MAX) err.branch = `Max ${BRANCH_MAX} characters`;
  return Object.keys(err).length ? err : null;
}

function BankTransferPdf() {
  const { month, year, setMonth, setYear } = usePeriodSelection();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [amountType, setAmountType] = useState("NET"); // "NET" | "GROSS"
  const [rows, setRows] = useState([]); // flattened list for table; accountNumber, ifsc, branch editable
  const [fieldErrors, setFieldErrors] = useState({}); // { rowIndex: { ifsc?, accountNumber?, branch? } }

  const loadList = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await payrollApi.getBankTransferList(year, month);
      setData(res);
      setSelectedIds([]);
      setFieldErrors({});
      const flat = (res.devices || []).flatMap((d) => (d.employees || []).map((e) => ({
        id: e.id,
        empCode: e.empCode || e.empId,
        empName: e.empName || e.empId,
        accountNumber: e.accountNumber ?? "",
        ifsc: e.ifsc ?? "",
        branch: e.branch ?? "",
        grossAmount: e.grossAmount ?? e.amount ?? 0,
        netAmount: e.netAmount ?? e.amount ?? 0,
      })));
      setRows(flat);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to load bank transfer list" });
      setData(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && data.year === year && data.month === month) return;
    setData(null);
  }, [year, month]);

  const allEmployeeIds = rows.map((r) => r.id);
  const isAllSelected = rows.length > 0 && selectedIds.length === rows.length;
  const isSomeSelected = selectedIds.length > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds([...allEmployeeIds]);
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const updateRow = (index, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    // Clear inline error for this field when user types
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next[index]) {
        next[index] = { ...next[index], [field]: undefined };
        if (Object.values(next[index]).every((v) => v == null)) delete next[index];
      }
      return next;
    });
  };

  const saveBankDetails = async () => {
    setMessage(null);
    const errors = {};
    rows.forEach((row, index) => {
      const e = validateBankRow(row);
      if (e) errors[index] = e;
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage({ type: "error", text: "Please fix the highlighted fields before saving." });
      return;
    }
    setFieldErrors({});
    try {
      setSaving(true);
      let saved = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          await employeeApi.updateBankDetails(row.empCode, {
            accountNumber: row.accountNumber || null,
            ifsc: row.ifsc || null,
            branch: row.branch || null,
          });
          saved++;
        } catch (err) {
          let msg = err.message || "Failed to save bank details";
          let errBody = null;
          const sep = " - ";
          const idx = err.message && err.message.indexOf(sep);
          if (idx !== -1) {
            try {
              errBody = JSON.parse(err.message.slice(idx + sep.length));
              if (errBody && errBody.message) msg = errBody.message;
            } catch (_) {}
          }
          setFieldErrors((prev) => ({ ...prev, [i]: errBody?.errors || { ifsc: msg } }));
          setMessage({ type: "error", text: `${row.empCode}: ${msg}` });
          return;
        }
      }
      setMessage({ type: "success", text: `Bank details updated for ${saved} employee(s).` });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to save bank details" });
    } finally {
      setSaving(false);
    }
  };

  const generatePdf = async () => {
    if (selectedIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one employee." });
      return;
    }
    try {
      setGenerating(true);
      setMessage(null);
      const blob = await payrollApi.generateBankTransferPdf(selectedIds, amountType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Employee_Bank_Details_Format_${year}_${String(month).padStart(2, "0")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `PDF downloaded for ${selectedIds.length} employee(s) (${amountType} salary).` });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to generate PDF" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Month/Year selection - same pattern as other payroll pages */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Select period</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {MONTH_NAMES.slice(1).map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={loadList}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load employees"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-sm font-medium text-slate-700 mr-2">Amount in PDF:</span>
                <label className="inline-flex items-center gap-2 mr-4 cursor-pointer">
                  <input
                    type="radio"
                    name="amountType"
                    checked={amountType === "NET"}
                    onChange={() => setAmountType("NET")}
                    className="text-emerald-600"
                  />
                  <span className="text-sm">Net salary</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="amountType"
                    checked={amountType === "GROSS"}
                    onChange={() => setAmountType("GROSS")}
                    className="text-emerald-600"
                  />
                  <span className="text-sm">Gross salary</span>
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Select all</span>
              </label>
              <span className="text-sm text-slate-500">
                {selectedIds.length} of {rows.length} selected
              </span>
              <button
                type="button"
                onClick={saveBankDetails}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save bank details"}
              </button>
              <button
                type="button"
                onClick={generatePdf}
                disabled={generating || !isSomeSelected}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Generating PDF…" : "Generate Bank Transfer PDF"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-2 w-10"></th>
                  <th className="text-left p-2 font-medium text-slate-700">Emp Name</th>
                  <th className="text-left p-2 font-medium text-slate-700">Emp ID</th>
                  <th className="text-left p-2 font-medium text-slate-700">Account Number</th>
                  <th className="text-left p-2 font-medium text-slate-700">IFSC Code</th>
                  <th className="text-left p-2 font-medium text-slate-700">Branch</th>
                  <th className="text-right p-2 font-medium text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="p-2 text-slate-800">{row.empName}</td>
                    <td className="p-2 font-medium text-slate-700">{row.empCode}</td>
                    <td className="p-2 align-top">
                      <div>
                        <input
                          type="text"
                          value={row.accountNumber}
                          onChange={(e) => updateRow(index, "accountNumber", e.target.value)}
                          className={`w-full max-w-[140px] border rounded px-2 py-1 text-slate-800 ${fieldErrors[index]?.accountNumber ? "border-red-500" : "border-slate-300"}`}
                          placeholder="Account number"
                          maxLength={ACCOUNT_MAX + 1}
                        />
                        {fieldErrors[index]?.accountNumber && (
                          <div className="text-red-600 text-xs mt-0.5">{fieldErrors[index].accountNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 align-top">
                      <div>
                        <input
                          type="text"
                          value={row.ifsc}
                          onChange={(e) => updateRow(index, "ifsc", e.target.value.toUpperCase())}
                          className={`w-full max-w-[120px] border rounded px-2 py-1 text-slate-800 uppercase ${fieldErrors[index]?.ifsc ? "border-red-500" : "border-slate-300"}`}
                          placeholder="e.g. SBIN0001234"
                          maxLength={11}
                        />
                        {fieldErrors[index]?.ifsc && (
                          <div className="text-red-600 text-xs mt-0.5">{fieldErrors[index].ifsc}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 align-top">
                      <div>
                        <input
                          type="text"
                          value={row.branch}
                          onChange={(e) => updateRow(index, "branch", e.target.value)}
                          className={`w-full max-w-[160px] border rounded px-2 py-1 text-slate-800 ${fieldErrors[index]?.branch ? "border-red-500" : "border-slate-300"}`}
                          placeholder="Branch"
                          maxLength={BRANCH_MAX + 1}
                        />
                        {fieldErrors[index]?.branch && (
                          <div className="text-red-600 text-xs mt-0.5">{fieldErrors[index].branch}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right font-medium text-emerald-700 whitespace-nowrap">
                      ₹{Number(amountType === "GROSS" ? row.grossAmount : row.netAmount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && rows.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-6 text-center text-amber-800">
          No payroll data for {MONTH_NAMES[month]} {year}. Generate payroll first, then load again.
        </div>
      )}
    </div>
  );
}

export default BankTransferPdf;

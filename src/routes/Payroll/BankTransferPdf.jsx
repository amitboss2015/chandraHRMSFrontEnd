// BankTransferPdf.jsx - Generate Bank Transfer PDF (Employee Bank Details Format)
import React, { useState, useEffect } from "react";
import { usePeriodSelection } from "../../utils/monthYearState";
import { payrollApi } from "../../services/api";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function BankTransferPdf() {
  const { month, year, setMonth, setYear } = usePeriodSelection();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [openPanels, setOpenPanels] = useState({});

  const loadList = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await payrollApi.getBankTransferList(year, month);
      setData(res);
      setSelectedIds([]);
      if (res.devices && res.devices.length > 0) {
        const open = {};
        res.devices.forEach((d, i) => {
          open[d.deviceCode] = i < 2;
        });
        setOpenPanels(open);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to load bank transfer list" });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && data.year === year && data.month === month) return;
    setData(null);
  }, [year, month]);

  const togglePanel = (deviceCode) => {
    setOpenPanels((prev) => ({ ...prev, [deviceCode]: !prev[deviceCode] }));
  };

  const allEmployeeIds = data?.devices?.flatMap((d) => d.employees.map((e) => e.id)) ?? [];
  const isAllSelected = allEmployeeIds.length > 0 && selectedIds.length === allEmployeeIds.length;
  const isSomeSelected = selectedIds.length > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds([...allEmployeeIds]);
    }
  };

  const toggleDeviceSelectAll = (employees) => {
    const ids = employees.map((e) => e.id);
    const allIn = ids.every((id) => selectedIds.includes(id));
    if (allIn) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const generatePdf = async () => {
    if (selectedIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one employee." });
      return;
    }
    try {
      setGenerating(true);
      setMessage(null);
      const blob = await payrollApi.generateBankTransferPdf(selectedIds);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Employee_Bank_Details_Format_${year}_${String(month).padStart(2, "0")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `PDF downloaded for ${selectedIds.length} employee(s).` });
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

      {data && data.devices && data.devices.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
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
              {selectedIds.length} of {allEmployeeIds.length} selected
            </span>
            <button
              type="button"
              onClick={generatePdf}
              disabled={generating || !isSomeSelected}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating PDF…" : "Generate Bank Transfer PDF"}
            </button>
          </div>

          <div className="space-y-2">
            {data.devices.map((device) => {
              const isOpen = openPanels[device.deviceCode] !== false;
              const employees = device.employees || [];
              const deviceSelectedCount = employees.filter((e) => selectedIds.includes(e.id)).length;
              const deviceAllSelected = employees.length > 0 && deviceSelectedCount === employees.length;

              return (
                <div
                  key={device.deviceCode}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => togglePanel(device.deviceCode)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 hover:bg-slate-100 border-b border-slate-200"
                  >
                    <span className="font-medium text-slate-800">
                      {device.deviceName || device.deviceCode}
                    </span>
                    <span className="text-sm text-slate-500">
                      {employees.length} employee(s)
                    </span>
                    <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span>
                  </button>
                  {isOpen && (
                    <div className="p-4">
                      <label className="flex items-center gap-2 mb-3 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={deviceAllSelected}
                          onChange={() => toggleDeviceSelectAll(employees)}
                          className="rounded border-slate-300"
                        />
                        <span className="font-medium text-slate-600">Select all in this device</span>
                      </label>
                      <ul className="space-y-2">
                        {employees.map((emp) => (
                          <li
                            key={emp.id}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(emp.id)}
                              onChange={() => toggleOne(emp.id)}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-800">{emp.empName}</span>
                            <span className="text-xs text-slate-500">{emp.empCode}</span>
                            <span className="text-xs text-slate-500">{emp.accountNumber || "—"}</span>
                            <span className="text-xs text-slate-500">{emp.ifsc || "—"}</span>
                            <span className="text-sm font-medium text-emerald-700 ml-auto">
                              ₹{Number(emp.amount).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {data && data.devices && data.devices.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-6 text-center text-amber-800">
          No payroll data for {MONTH_NAMES[month]} {year}. Generate payroll first, then load again.
        </div>
      )}
    </div>
  );
}

export default BankTransferPdf;

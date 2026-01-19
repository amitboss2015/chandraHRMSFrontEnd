import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

/** Simple JSON fetcher that adds auth and tenant headers */
async function fetchJson(path, options = {}) {
  const token = getToken();
  const tenantId = getTenantId();
  
  console.log(`📡 fetchJson: ${path}`, { 
    hasToken: !!token, 
    tokenPreview: token ? token.substring(0,50) + '...' : 'NONE',
    tenantId 
  });
  
  // If no token, redirect to login
  if (!token) {
    console.log('❌ No token available, redirecting to login');
    window.location.href = '/login';
    throw new Error('No authentication token');
  }
  
  const headers = {
    "X-Tenant-Id": tenantId,
    // Note: Removed X-Org-Id as backend now uses TenantContext from JWT
    "Authorization": `Bearer ${token}`,
    ...(options.headers || {}),
  };
  
  console.log('📤 Request headers:', Object.keys(headers));
  
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  
  console.log(`📥 Response: ${path}`, { status: resp.status, ok: resp.ok });
  
  // Handle auth errors - but DON'T immediately redirect, let's debug first
  if (resp.status === 401 || resp.status === 403) {
    console.log(`🔒 Auth error (${resp.status}) for ${path}`);
    console.log('🔍 Token that was sent:', token ? token.substring(0, 50) + '...' : 'NONE');
    console.log('🔍 Response headers:', [...resp.headers.entries()]);
    const errorText = await resp.text();
    console.log('🔍 Response body:', errorText);
    
    // DON'T redirect for now - just throw error so we can debug
    // sessionStorage.removeItem('hrms_access_token');
    // localStorage.removeItem('hrms_user');
    // window.location.href = '/login';
    throw new Error(`Auth error ${resp.status}: ${errorText || 'No details'}`);
  }
  
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return resp.json();
}

/** Month utilities */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const today = new Date();

function AttendanceSheet() {
  const navigate = useNavigate();
  
  // Debug: Log component mount and token status
  console.log('🎯 AttendanceSheet MOUNTED');
  console.log('🎯 Token status:', sessionStorage.getItem("hrms_access_token") ? 'Present' : 'MISSING');
  console.log('🎯 User status:', localStorage.getItem("hrms_user") ? 'Present' : 'MISSING');

  const [activeTab, setActiveTab] = useState("monthly"); // Default to monthly report
  const [month, setMonth] = useState(7); // July as default to match your test data
  const [year, setYear] = useState(2025);

  /** ===================== TAB 1: IMPORT ===================== */
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importStep, setImportStep] = useState('upload'); // 'upload', 'preview', 'result'
  
  // Existing batches state
  const [existingBatches, setExistingBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [existingBatchForMonth, setExistingBatchForMonth] = useState(null);

  /** ===================== STANDARD TEMPLATE IMPORT ===================== */
  const [templateFile, setTemplateFile] = useState(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [templateResult, setTemplateResult] = useState(null);
  const [templateError, setTemplateError] = useState("");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Load existing batches for the selected month/year
  const loadExistingBatches = async () => {
    setBatchesLoading(true);
    try {
      const data = await fetchJson('/attendance/import/batches');
      setExistingBatches(Array.isArray(data) ? data : []);
      // Check if there's a batch for the current month/year
      const batchForMonth = data.find(b => b.month === month && b.year === year);
      setExistingBatchForMonth(batchForMonth || null);
    } catch (e) {
      console.error('Failed to load batches:', e);
      setExistingBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  // Load batches when tab is active or month/year changes
  useEffect(() => {
    if (activeTab === 'import') {
      loadExistingBatches();
    }
  }, [activeTab, month, year]);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const resp = await fetch(`${API_BASE}/attendance/template/download?month=${month}&year=${year}`, {
        headers: { 
          "X-Tenant-Id": getTenantId(),
          "Authorization": `Bearer ${getToken()}`
        },
      });
      if (!resp.ok) throw new Error("Failed to download template");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_template_${year}_${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to download template: " + (e.message || "Unknown error"));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleTemplateImport = async () => {
    if (!templateFile) return alert("Please choose an Excel file first.");
    
    const fileName = templateFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return alert("Please upload a valid Excel file (.xlsx or .xls).");
    }
    
    setTemplateError("");
    setTemplateResult(null);
    try {
      setTemplateUploading(true);
      const form = new FormData();
      form.append("file", templateFile);
      const resp = await fetch(`${API_BASE}/attendance/template/import`, {
        method: "POST",
        headers: { 
          "X-Tenant-Id": getTenantId(),
          "Authorization": `Bearer ${getToken()}`
        },
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setTemplateResult(data);
    } catch (e) {
      setTemplateError(e.message || "Import failed");
    } finally {
      setTemplateUploading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files?.[0] ?? null);
    // Reset preview when file changes
    setPreviewData(null);
    setImportStep('upload');
    setImportResult(null);
    setImportError("");
  };

  // Step 1: Preview the file before importing
  const handlePreview = async () => {
    if (!selectedFile) return alert("Please choose a .xls/.xlsx file first.");
    
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xls') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      return alert("Please upload a valid Excel file (.xls or .xlsx) or CSV file.");
    }
    
    setImportError("");
    setPreviewData(null);
    
    try {
      setPreviewing(true);
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("month", String(month));
      form.append("year", String(year));
      
      const resp = await fetch(`${API_BASE}/attendance/import/preview`, {
        method: "POST",
        headers: { 
          "X-Tenant-Id": getTenantId(),
          "X-Org-Id": getTenantId(),
          ...(getToken() ? { "Authorization": `Bearer ${getToken()}` } : {})
        },
        body: form,
      });
      
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setPreviewData(data);
      
      if (data.duplicateExists) {
        setImportError(`Attendance for this period already exists. Delete Batch #${data.existingBatchId} first.`);
      } else if (data.valid) {
        setImportStep('preview');
      } else {
        setImportError(data.message || "Failed to parse file");
      }
    } catch (e) {
      setImportError(e.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // Step 2: Confirm and import after preview
  const handleConfirmImport = async () => {
    if (!selectedFile) return alert("No file selected.");
    
    setImportError("");
    setImportResult(null);
    
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("month", String(month));
      form.append("year", String(year));
      const resp = await fetch(`${API_BASE}/attendance/import`, {
        method: "POST",
        headers: { 
          "X-Tenant-Id": getTenantId(),
          "X-Org-Id": getTenantId(),
          ...(getToken() ? { "Authorization": `Bearer ${getToken()}` } : {})
        },
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setImportResult(data);
      setImportStep('result');
      
      if (data.duplicate) {
        setImportError(`Duplicate upload detected: ${data.message}`);
      }
    } catch (e) {
      setImportError(e.message || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  // Legacy handler (kept for compatibility)
  const handleImport = handleConfirmImport;
  
  // Reset to upload step
  const handleBackToUpload = () => {
    setImportStep('upload');
    setPreviewData(null);
    setImportResult(null);
    setImportError("");
  };

  const handleDeleteBatch = async (batchId, batchMonth, batchYear) => {
    if (!batchId) return;
    const monthName = MONTH_NAMES[(batchMonth || month) - 1];
    const yearVal = batchYear || year;
    
    if (!confirm(`Are you sure you want to delete Batch #${batchId}?\n\nThis will permanently remove ALL attendance data for ${monthName} ${yearVal}.\n\nThis action cannot be undone.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const resp = await fetch(`${API_BASE}/attendance/import/batches/${batchId}`, {
        method: "DELETE",
        headers: { 
          "X-Tenant-Id": getTenantId(),
          "X-Org-Id": getTenantId(),
          ...(getToken() ? { "Authorization": `Bearer ${getToken()}` } : {})
        },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      alert(data.message || "Batch deleted successfully!");
      setImportResult(null);
      setImportError("");
      setPreviewData(null);
      setExistingBatchForMonth(null);
      // Refresh the batches list
      await loadExistingBatches();
    } catch (e) {
      alert("Failed to delete batch: " + (e.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  /** ===================== TAB 2: RECORDS (Employee-wise daily) ===================== */
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [inlineLogs, setInlineLogs] = useState([]);
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");

  // Manual punch update modal state
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState(null);
  const [manualPunchData, setManualPunchData] = useState({ manualIn: '', manualOut: '', remarks: '' });
  const [updatingPunch, setUpdatingPunch] = useState(false);

  // Load employees list on mount
  useEffect(() => {
    console.log('🚀 AttendanceSheet useEffect - about to fetch employees');
    console.log('🚀 Token at fetch time:', sessionStorage.getItem("hrms_access_token") ? 'Present' : 'MISSING');
    
    fetchJson("/attendance/employees")
      .then(data => setEmployees(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('❌ Failed to fetch employees:', err);
        setEmployees([]);
      });
  }, []);

  // Handle opening the manual punch modal
  const openPunchModal = (log) => {
    setSelectedLogForEdit(log);
    setManualPunchData({
      manualIn: log.manualIn || log.firstIn || '',
      manualOut: log.manualOut || log.lastOut || '',
      remarks: log.remarks || ''
    });
    setShowPunchModal(true);
  };

  // Handle updating manual punch
  const handleUpdateManualPunch = async () => {
    if (!selectedLogForEdit?.dayId) {
      alert("Cannot update: Day ID not found. Please recalculate attendance first.");
      return;
    }
    
    setUpdatingPunch(true);
    try {
      const params = new URLSearchParams();
      if (manualPunchData.manualIn) params.append('manualIn', manualPunchData.manualIn);
      if (manualPunchData.manualOut) params.append('manualOut', manualPunchData.manualOut);
      if (manualPunchData.remarks) params.append('remarks', manualPunchData.remarks);
      
      const response = await fetch(`${API_BASE}/attendance/day/${selectedLogForEdit.dayId}/manual-punch?${params.toString()}`, {
        method: 'PUT',
        headers: { 
          'X-Tenant-Id': getTenantId(),
          'X-Org-Id': getTenantId(), 
          'X-User': 'admin',
          ...(getToken() ? { "Authorization": `Bearer ${getToken()}` } : {})
        }
      });
      
      if (!response.ok) throw new Error(await response.text());
      
      alert('Attendance updated successfully!');
      setShowPunchModal(false);
      loadInlineLogs(); // Reload the data
    } catch (e) {
      alert('Failed to update: ' + (e.message || 'Unknown error'));
    } finally {
      setUpdatingPunch(false);
    }
  };

  const loadInlineLogs = async () => {
    if (!selectedEmployee) return alert("Please select an employee");
    setInlineLoading(true);
    setInlineError("");
    try {
      const data = await fetchJson(`/attendance/logs?month=${month}&year=${year}&empCode=${selectedEmployee}`);
      setInlineLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setInlineError(e.message || "Failed to load logs");
      setInlineLogs([]);
    } finally {
      setInlineLoading(false);
    }
  };

  // Calculate summary from logs
  const logsSummary = useMemo(() => {
    if (!inlineLogs.length) return null;
    const present = inlineLogs.filter(l => l.status === 'PRESENT' || l.status === 'HALF_DAY' || l.status === 'OT_DAY').length;
    const absent = inlineLogs.filter(l => l.status === 'ABSENT').length;
    const halfDays = inlineLogs.filter(l => l.status === 'HALF_DAY').length;
    const weeklyOff = inlineLogs.filter(l => l.status === 'WEEKLY_OFF' || (l.isWeeklyOff && l.status !== 'OT_DAY')).length;
    const holidays = inlineLogs.filter(l => l.status === 'HOLIDAY' || (l.isHoliday && l.status !== 'OT_DAY')).length;
    const otDays = inlineLogs.filter(l => l.status === 'OT_DAY' || l.isOvertimeDay).length;
    const totalMins = inlineLogs.reduce((sum, l) => sum + (l.workMinutes || 0), 0);
    const dualShifts = inlineLogs.filter(l => l.dualShift).length;
    // New: Late/Early tracking
    const lateDays = inlineLogs.filter(l => l.isLateIn).length;
    const earlyOutDays = inlineLogs.filter(l => l.isEarlyOut).length;
    const totalLateMins = inlineLogs.reduce((sum, l) => sum + (l.lateByMins || 0), 0);
    const totalEarlyMins = inlineLogs.reduce((sum, l) => sum + (l.earlyByMins || 0), 0);
    return { present, absent, halfDays, weeklyOff, holidays, otDays, totalMins, dualShifts, lateDays, earlyOutDays, totalLateMins, totalEarlyMins };
  }, [inlineLogs]);

  /** ===================== TAB 3: MONTHLY SUMMARY ===================== */
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await fetchJson(`/attendance/summary?month=${month}&year=${year}`);
      setSummaryRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setSummaryError(e.message || "Failed to load summary");
      setSummaryRows([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Recalculate attendance state
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);

  const handleRecalculate = async () => {
    if (!confirm(`This will recalculate attendance for ${MONTH_NAMES[month-1]} ${year}.\n\nThis is useful if you added leaves after attendance was imported.\n\nContinue?`)) {
      return;
    }
    
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const resp = await fetch(`${API_BASE}/attendance/import/recalculate?month=${month}&year=${year}`, {
        method: "POST",
        headers: { 
          "X-Tenant-Id": getTenantId(),
          "Authorization": `Bearer ${getToken()}`
        },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setRecalcResult(data);
      // Reload summary after recalculation
      await loadSummary();
    } catch (e) {
      alert("Recalculation failed: " + (e.message || "Unknown error"));
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => { 
    if (activeTab === "monthly") loadSummary(); 
  }, [activeTab, month, year]);

  const formatDuration = (totalMins) => {
    if (!totalMins || totalMins === 0) return "-";
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  // Calculate totals for summary
  const summaryTotals = useMemo(() => {
    if (!summaryRows.length) return null;
    return {
      totalEmployees: summaryRows.length,
      totalPresent: summaryRows.reduce((sum, r) => sum + (r.present || 0), 0),
      totalAbsent: summaryRows.reduce((sum, r) => sum + (r.absent || 0), 0),
      totalLeave: summaryRows.reduce((sum, r) => sum + (r.leaveDays || r.leave || 0), 0),
      totalWorkMins: summaryRows.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
    };
  }, [summaryRows]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">✅ Attendance Management</h1>
        <p className="text-slate-500 text-sm mt-1">Import, view and manage employee attendance</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex flex-wrap">
          {[
            { id: "monthly", label: "Monthly Report", icon: "📊" },
            { id: "records", label: "Attendance Records", icon: "📋" },
            { id: "import", label: "Import Attendance", icon: "📥" },
          ].map(tab => (
            <button 
              key={tab.id}
              className={`flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-all relative ${
                activeTab === tab.id
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}
          </button>
        ))}
        </div>
      </div>

      {/* Month/Year controls */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        <select 
          value={month} 
          onChange={e => setMonth(parseInt(e.target.value, 10))} 
          className="px-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {MONTH_NAMES.map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
        </select>
        <select 
          value={year} 
          onChange={e => setYear(parseInt(e.target.value, 10))} 
          className="px-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ---------- Tab 1: Monthly Report (All Employees) ---------- */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={loadSummary} 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              🔄 Refresh
            </button>
            <button 
              onClick={handleRecalculate}
              disabled={recalculating}
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                recalculating 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:shadow-lg'
              }`}
              title="Recalculate attendance to sync with leave records"
            >
              {recalculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Recalculating...
                </>
              ) : (
                <>🔁 Recalculate</>
              )}
            </button>
            {summaryLoading && <span className="text-sm text-slate-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              Loading…
            </span>}
            {summaryError && <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">{summaryError}</span>}
            {recalcResult && (
              <span className="text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                ✅ {recalcResult.message}
              </span>
            )}
          </div>

          {/* Summary Stats */}
          {summaryTotals && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{summaryTotals.totalEmployees}</div>
                <div className="text-sm text-slate-500">Total Employees</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">{summaryTotals.totalPresent}</div>
                <div className="text-sm text-slate-500">Total Present Days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-red-500">{summaryTotals.totalAbsent}</div>
                <div className="text-sm text-slate-500">Total Absent Days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-amber-500">{summaryTotals.totalLeave}</div>
                <div className="text-sm text-slate-500">Total Leave Days</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{formatDuration(summaryTotals.totalWorkMins)}</div>
                <div className="text-sm text-slate-500">Total Work Hours</div>
              </div>
            </div>
          )}

          {!summaryLoading && !summaryError && (
            <div className="border rounded overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Emp Code</th>
                    <th className="border px-3 py-2 text-left">Employee Name</th>
                    <th className="border px-3 py-2 text-center bg-green-50">Present</th>
                    <th className="border px-3 py-2 text-center bg-red-50">Absent</th>
                    <th className="border px-3 py-2 text-center bg-blue-50">Leave</th>
                    <th className="border px-3 py-2 text-center bg-yellow-50">Half Days</th>
                    <th className="border px-3 py-2 text-center bg-slate-100">Weekly Off</th>
                    <th className="border px-3 py-2 text-center bg-blue-100">Holidays</th>
                    <th className="border px-3 py-2 text-center bg-orange-100">OT Days</th>
                    <th className="border px-3 py-2 text-center bg-amber-50">Late</th>
                    <th className="border px-3 py-2 text-center">Work Hours</th>
                    <th className="border px-3 py-2 text-center bg-purple-50">OT Hours</th>
                    <th className="border px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.length ? summaryRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border px-3 py-2 font-mono">{r.empCode}</td>
                      <td className="border px-3 py-2 font-medium">{r.empName || r.name}</td>
                      <td className="border px-3 py-2 text-center text-green-600 font-bold">{r.present}</td>
                      <td className="border px-3 py-2 text-center text-red-600 font-bold">{r.absent}</td>
                      <td className="border px-3 py-2 text-center text-blue-600">{r.leaveDays || r.leave || 0}</td>
                      <td className="border px-3 py-2 text-center text-yellow-600">{r.halfDays || 0}</td>
                      <td className="border px-3 py-2 text-center text-slate-600">{r.weeklyOff || 0}</td>
                      <td className="border px-3 py-2 text-center text-blue-700">{r.holidays || 0}</td>
                      <td className="border px-3 py-2 text-center">
                        {r.overtimeDays > 0 ? (
                          <span className="text-orange-600 font-bold">{r.overtimeDays}</span>
                        ) : '-'}
                      </td>
                      <td className="border px-3 py-2 text-center text-amber-600">{r.lateDays || 0}</td>
                      <td className="border px-3 py-2 text-center">{formatDuration(r.totalWorkMinutes)}</td>
                      <td className="border px-3 py-2 text-center text-purple-600">{formatDuration(r.otMinutes)}</td>
                      <td className="border px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            setSelectedEmployee(r.empCode);
                            setActiveTab("records");
                            setTimeout(() => loadInlineLogs(), 100);
                          }}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="border px-3 py-2 text-center text-gray-500" colSpan={13}>
                        No attendance data found for {MONTH_NAMES[month - 1]} {year}. Import attendance first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------- Tab 2: Records (Employee-wise Daily) ---------- */}
      {activeTab === "records" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Select Employee:</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="border p-2 rounded min-w-[250px]"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.empCode} value={emp.empCode}>
                  {emp.empCode} - {emp.name}
                </option>
              ))}
            </select>
            <button 
              onClick={loadInlineLogs} 
              disabled={!selectedEmployee}
              className={`px-4 py-2 rounded font-medium ${
                selectedEmployee ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500"
              }`}
            >
              Load Attendance
            </button>
          </div>

          {inlineLoading && <div className="text-sm text-gray-500">Loading…</div>}
          {inlineError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{inlineError}</div>}

          {/* Employee Summary Card */}
          {logsSummary && (
            <div className="bg-gray-50 border rounded p-4">
              <h4 className="font-semibold mb-2">Summary for {selectedEmployee}</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong className="text-green-600">{logsSummary.present}</strong> Present</span>
                <span><strong className="text-red-600">{logsSummary.absent}</strong> Absent</span>
                <span><strong className="text-yellow-600">{logsSummary.halfDays}</strong> Half Days</span>
                <span><strong className="text-gray-600">{logsSummary.weeklyOff}</strong> Weekly Off</span>
                <span><strong className="text-blue-600">{logsSummary.holidays}</strong> Holidays</span>
                <span className="text-orange-600"><strong>{logsSummary.otDays}</strong> OT Days</span>
                <span><strong className="text-purple-600">{logsSummary.dualShifts}</strong> Dual Shifts</span>
                <span><strong>{formatDuration(logsSummary.totalMins)}</strong> Total Work</span>
              </div>
              {/* Late/Early summary row */}
              {(logsSummary.lateDays > 0 || logsSummary.earlyOutDays > 0) && (
                <div className="flex flex-wrap gap-4 text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-amber-700">
                    🕐 <strong>{logsSummary.lateDays}</strong> Late IN ({formatDuration(logsSummary.totalLateMins)} total)
                  </span>
                  <span className="text-pink-600">
                    ⏪ <strong>{logsSummary.earlyOutDays}</strong> Early OUT ({formatDuration(logsSummary.totalEarlyMins)} total)
                  </span>
                </div>
              )}
            </div>
          )}

          {!inlineLoading && !inlineError && inlineLogs.length > 0 && (
            <div className="border rounded overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Date</th>
                    <th className="border px-3 py-2 text-left">Day</th>
                    <th className="border px-3 py-2 text-center text-green-700">First IN</th>
                    <th className="border px-3 py-2 text-center text-red-700">Last OUT</th>
                    <th className="border px-3 py-2 text-center">Punches</th>
                    <th className="border px-3 py-2 text-center">Work Hours</th>
                    <th className="border px-3 py-2 text-center">Status</th>
                    <th className="border px-3 py-2 text-center bg-amber-50">Late/Early</th>
                    <th className="border px-3 py-2 text-center">Shift</th>
                    <th className="border px-3 py-2 text-left">All Punches</th>
                    <th className="border px-3 py-2 text-center">Issue</th>
                    <th className="border px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineLogs.map((log, i) => {
                    const date = new Date(log.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const hasIssue = log.missingPunch || log.needsReview || log.dualShift;
                    
                    // Determine row background color based on status and issues
                    let rowBgClass = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    if (log.status === 'OT_DAY' || log.isOvertimeDay) {
                      rowBgClass = 'bg-orange-100 border-l-4 border-l-orange-500';
                    } else if (log.status === 'WEEKLY_OFF' || (log.isWeeklyOff && !log.punchCount)) {
                      rowBgClass = 'bg-slate-200 border-l-4 border-l-slate-400';
                    } else if (log.status === 'HOLIDAY' || (log.isHoliday && !log.punchCount)) {
                      rowBgClass = 'bg-blue-100 border-l-4 border-l-blue-400';
                    } else if (log.missingPunch) {
                      rowBgClass = 'bg-yellow-100 border-l-4 border-l-yellow-500';
                    } else if (log.isLateIn && log.isEarlyOut) {
                      // Both late and early - highlight more prominently
                      rowBgClass = 'bg-red-50 border-l-4 border-l-red-400';
                    } else if (log.isLateIn) {
                      rowBgClass = 'bg-amber-50 border-l-4 border-l-amber-400';
                    } else if (log.isEarlyOut) {
                      rowBgClass = 'bg-pink-50 border-l-4 border-l-pink-400';
                    } else if (log.dualShift) {
                      rowBgClass = 'bg-purple-100 border-l-4 border-l-purple-500';
                    } else if (log.needsReview) {
                      rowBgClass = 'bg-amber-50 border-l-4 border-l-amber-400';
                    } else if (isWeekend) {
                      rowBgClass = 'bg-gray-100';
                    }
                    
                    return (
                      <tr key={i} className={rowBgClass}>
                        <td className="border px-3 py-2 font-mono">{log.date}</td>
                        <td className={`border px-3 py-2 ${isWeekend ? 'text-red-500 font-medium' : ''}`}>{dayName}</td>
                        <td className="border px-3 py-2 text-center text-green-600 font-medium">
                          {log.manualIn || log.firstIn || '-'}
                          {log.manualIn && <span className="text-xs text-blue-600 ml-1">(M)</span>}
                        </td>
                        <td className="border px-3 py-2 text-center text-red-600 font-medium">
                          {log.manualOut ? (
                            <>
                              {log.manualOut}
                              <span className="text-xs text-blue-600 ml-1">(M)</span>
                            </>
                          ) : log.lastOut ? (
                            <>
                              {log.lastOut}
                              {log.crossedMidnight && <span className="text-xs text-purple-600 ml-1">(+1)</span>}
                            </>
                          ) : log.missingPunchType === 'OUT' ? (
                            <span className="text-orange-500 font-medium">Missing ⚠️</span>
                          ) : '-'}
                        </td>
                        <td className="border px-3 py-2 text-center">{log.punchCount || 0}</td>
                        <td className="border px-3 py-2 text-center font-medium">{formatDuration(log.workMinutes)}</td>
                        <td className="border px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                            log.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                            log.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-800' :
                            log.status === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                            log.status === 'WEEKLY_OFF' ? 'bg-slate-200 text-slate-700' :
                            log.status === 'HOLIDAY' ? 'bg-blue-200 text-blue-800' :
                            log.status === 'OT_DAY' ? 'bg-orange-200 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.status === 'WEEKLY_OFF' ? '🛌 WEEKLY OFF' : 
                             log.status === 'HOLIDAY' ? `🎉 ${log.holidayName || 'HOLIDAY'}` :
                             log.status === 'OT_DAY' ? '⏰ OVERTIME' :
                             log.status || 'ABSENT'}
                          </span>
                        </td>
                        {/* Late IN / Early OUT indicator */}
                        <td className="border px-3 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {log.isLateIn && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                🕐 Late +{log.lateByMins}m
                                {log.roundedIn && <span className="text-xs text-gray-500 ml-1">→{log.roundedIn}</span>}
                              </span>
                            )}
                            {log.isEarlyOut && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                                ⏪ Early +{log.earlyByMins}m
                                {log.roundedOut && <span className="text-xs text-gray-500 ml-1">→{log.roundedOut}</span>}
                              </span>
                            )}
                            {!log.isLateIn && !log.isEarlyOut && log.status === 'PRESENT' && (
                              <span className="text-xs text-green-600">✓ On Time</span>
                            )}
                            {!log.isLateIn && !log.isEarlyOut && log.status !== 'PRESENT' && '-'}
                          </div>
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {log.dualShift ? (
                            <span className="text-purple-600 font-medium text-xs">DUAL</span>
                          ) : (
                            <span className="text-xs">{log.shiftCode || log.shifts?.[0] || '-'}</span>
                          )}
                        </td>
                        <td className="border px-3 py-2 text-xs text-gray-600">
                          {log.punches?.join(', ') || '-'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {log.highlightReason ? (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.isOvertimeDay || log.status === 'OT_DAY' ? 'bg-orange-200 text-orange-800' :
                              log.isWeeklyOff || log.status === 'WEEKLY_OFF' ? 'bg-slate-200 text-slate-700' :
                              log.isHoliday || log.status === 'HOLIDAY' ? 'bg-blue-200 text-blue-800' :
                              log.missingPunch ? 'bg-amber-200 text-amber-800' :
                              log.dualShift ? 'bg-purple-200 text-purple-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {log.isOvertimeDay ? '⏰' : log.isWeeklyOff ? '🛌' : log.isHoliday ? '🎉' : '⚠️'} {log.highlightReason}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {(log.missingPunch || log.needsReview || log.punchCount === 1 || log.manualIn || log.manualOut) ? (
                            <button
                              onClick={() => openPunchModal(log)}
                              className={`px-2 py-1 text-xs rounded ${
                                log.missingPunch 
                                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                  : (log.manualIn || log.manualOut)
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              {log.missingPunch ? '⚠️ Fix' : (log.manualIn || log.manualOut) ? '✓ Edit' : '✏️ Edit'}
                            </button>
                          ) : log.dayId && (
                            <button
                              onClick={() => openPunchModal(log)}
                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!inlineLoading && !inlineError && inlineLogs.length === 0 && selectedEmployee && (
            <div className="text-center text-gray-500 py-8">
              No attendance records found for {selectedEmployee} in {MONTH_NAMES[month - 1]} {year}.
            </div>
          )}
        </div>
      )}

      {/* ---------- Tab 3: Import Attendance ---------- */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* Existing Batch Alert for Selected Month */}
          {existingBatchForMonth && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📁</span>
                  <div>
                    <h3 className="font-bold text-amber-800">
                      Attendance Already Uploaded for {MONTH_NAMES[month-1]} {year}
                    </h3>
                    <p className="text-amber-700 text-sm mt-1">
                      Batch #{existingBatchForMonth.id} was uploaded on {new Date(existingBatchForMonth.uploadedAt).toLocaleString()} 
                      by {existingBatchForMonth.uploadedBy || 'admin'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-emerald-700">✓ {existingBatchForMonth.successRows} records imported</span>
                      {existingBatchForMonth.errorRows > 0 && (
                        <span className="text-red-600">✗ {existingBatchForMonth.errorRows} errors</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBatch(existingBatchForMonth.id, existingBatchForMonth.month, existingBatchForMonth.year)}
                  disabled={deleting}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    deleting 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {deleting ? 'Deleting...' : '🗑️ Delete & Re-upload'}
                </button>
              </div>
              <p className="text-amber-600 text-xs mt-3">
                ⚠️ To upload new attendance for this period, first delete the existing batch.
              </p>
            </div>
          )}

          {/* All Imported Batches */}
          {existingBatches.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Imported Attendance Batches
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Batch ID</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Period</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Uploaded</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">Records</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">Errors</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {existingBatches.map((batch) => (
                      <tr key={batch.id} className={batch.month === month && batch.year === year ? 'bg-emerald-50' : ''}>
                        <td className="px-4 py-3 font-mono font-medium">#{batch.id}</td>
                        <td className="px-4 py-3">
                          <span className={batch.month === month && batch.year === year ? 'font-bold text-emerald-700' : ''}>
                            {MONTH_NAMES[batch.month - 1]} {batch.year}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(batch.uploadedAt).toLocaleString()}
                          <br />
                          <span className="text-slate-400">by {batch.uploadedBy || 'admin'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-emerald-600">{batch.successRows}</span>
                          <span className="text-slate-400">/{batch.totalRows}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {batch.errorRows > 0 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {batch.errorRows} errors
                            </span>
                          ) : (
                            <span className="text-emerald-500">✓</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {batch.errorRows > 0 && (
                              <a
                                href={`${API_BASE}/attendance/import/batches/${batch.id}/errors.csv`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                              >
                                📥 Errors
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteBatch(batch.id, batch.month, batch.year)}
                              disabled={deleting}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {batchesLoading && (
                <div className="text-center text-slate-500 py-4">Loading batches...</div>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          {!existingBatchForMonth && (
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-2 ${importStep === 'upload' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    importStep === 'upload' ? 'bg-emerald-500 text-white' : 
                    importStep !== 'upload' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200'
                  }`}>1</span>
                  <span className="font-medium">Upload</span>
                </div>
                <div className={`w-12 h-0.5 ${importStep !== 'upload' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                <div className={`flex items-center gap-2 ${importStep === 'preview' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    importStep === 'preview' ? 'bg-emerald-500 text-white' : 
                    importStep === 'result' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200'
                  }`}>2</span>
                  <span className="font-medium">Preview</span>
                </div>
                <div className={`w-12 h-0.5 ${importStep === 'result' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                <div className={`flex items-center gap-2 ${importStep === 'result' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    importStep === 'result' ? 'bg-emerald-500 text-white' : 'bg-slate-200'
                  }`}>3</span>
                  <span className="font-medium">Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Upload */}
          {importStep === 'upload' && !existingBatchForMonth && (
            <>
              {/* Download Template */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📥</span>
                  Download Template (Optional)
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Download an empty template for <strong>{MONTH_NAMES[month-1]} {year}</strong>, 
                  or upload your biometric machine export directly.
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                    downloadingTemplate 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {downloadingTemplate ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Downloading...
                    </>
                  ) : (
                    <>📥 Download Template</>
                  )}
                </button>
              </div>

              {/* Upload File */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📤</span>
                  Upload Biometric File
                </h3>
                
                <div className="flex gap-3 items-center flex-wrap">
                  <input 
                    type="file" 
                    accept=".xls,.xlsx" 
                    className="border p-2 rounded-xl bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
                    onChange={handleFileChange} 
                  />
                  <button 
                    onClick={handlePreview} 
                    disabled={!selectedFile || previewing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                      selectedFile && !previewing 
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-lg" 
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {previewing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>🔍 Preview Import</>
                    )}
                  </button>
                </div>

                {selectedFile && (
                  <div className="text-sm text-slate-600 mt-2">
                    Selected: <span className="font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}

                {importError && (
                  <div className="mt-4 bg-red-50 border border-red-300 rounded-xl p-4 text-red-700 text-sm">
                    <strong>❌ Error:</strong> {importError}
                    {previewData?.duplicateExists && (
                      <button 
                        onClick={() => handleDeleteBatch(previewData.existingBatchId, previewData.detectedMonth || month, previewData.detectedYear || year)}
                        disabled={deleting}
                        className={`ml-4 px-3 py-1 rounded font-medium text-xs ${
                          deleting ? "bg-gray-300 text-gray-500" : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        {deleting ? "Deleting..." : `🗑️ Delete Batch #${previewData.existingBatchId}`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Template Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="font-bold text-blue-800 mb-3">📋 Supported Format (Biometric Logs)</h3>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border px-2 py-1">No</th>
                        <th className="border px-2 py-1">Name</th>
                        <th className="border px-2 py-1">1</th>
                        <th className="border px-2 py-1">2</th>
                        <th className="border px-2 py-1">3</th>
                        <th className="border px-2 py-1">...</th>
                        <th className="border px-2 py-1">31</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border px-2 py-1 font-mono">2</td>
                        <td className="border px-2 py-1">md sarwar</td>
                        <td className="border px-2 py-1 font-mono text-xs whitespace-pre">08:59{'\n'}17:39</td>
                        <td className="border px-2 py-1 font-mono text-xs whitespace-pre">08:58{'\n'}17:45</td>
                        <td className="border px-2 py-1 font-mono text-xs whitespace-pre">08:57{'\n'}17:39</td>
                        <td className="border px-2 py-1">...</td>
                        <td className="border px-2 py-1 font-mono text-xs">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-blue-700 space-y-1">
                  <p>• <strong>Format:</strong> Same as biometric machine export (days as columns)</p>
                  <p>• <strong>Cell format:</strong> IN time on first line, OUT time on second line</p>
                  <p>• <strong>Cross-midnight:</strong> Times like 00:33 are treated as OUT from previous day</p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Preview */}
          {importStep === 'preview' && previewData && (
            <div className="space-y-6">
              {/* Preview Summary */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">👁️</span>
                    Import Preview
                  </h3>
                  <button 
                    onClick={handleBackToUpload}
                    className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1"
                  >
                    ← Back to Upload
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-slate-700">{previewData.totalEmployeesInFile || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Employees in File</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-600">{previewData.matchedEmployees || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">✓ Matched</div>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${previewData.unmatchedEmployees > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <div className={`text-3xl font-bold ${previewData.unmatchedEmployees > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {previewData.unmatchedEmployees || 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">⚠️ Not Found</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{previewData.totalPunchRecords || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Punch Records</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{previewData.daysWithData || 0}</div>
                    <div className="text-xs text-slate-500 mt-1">Days with Data</div>
                  </div>
                </div>

                {/* File Info */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">File:</span>
                      <span className="ml-2 font-medium">{previewData.fileName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Format:</span>
                      <span className="ml-2 font-medium">{previewData.detectedFormat}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Period:</span>
                      <span className="ml-2 font-medium">{previewData.detectedPeriod}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <span className="ml-2 font-medium text-emerald-600">✓ Ready to Import</span>
                    </div>
                  </div>
                </div>

                {/* Unmatched Employees Warning */}
                {previewData.unmatchedEmployees > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
                    <h4 className="font-semibold text-amber-800 mb-2">⚠️ Unmatched Employees ({previewData.unmatchedEmployees})</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      These employees exist in the file but not in ChandraHR. Their attendance will be skipped.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {previewData.employeeMatches?.filter(e => !e.matched).slice(0, 10).map((emp, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-100 rounded text-xs text-amber-800">
                          {emp.empCodeInFile} - {emp.nameInFile}
                        </span>
                      ))}
                      {previewData.unmatchedEmployees > 10 && (
                        <span className="px-2 py-1 bg-amber-200 rounded text-xs text-amber-800">
                          +{previewData.unmatchedEmployees - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Sample Data Preview */}
                {previewData.sampleRows?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 mb-3">📋 Sample Data (First 5 Employees, First 7 Days)</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="border px-2 py-1">Code</th>
                            <th className="border px-2 py-1">Name</th>
                            {[1,2,3,4,5,6,7].map(d => (
                              <th key={d} className="border px-2 py-1 text-center">{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.sampleRows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="border px-2 py-1 font-mono">{row.empCode}</td>
                              <td className="border px-2 py-1">{row.name}</td>
                              {[1,2,3,4,5,6,7].map(d => {
                                const dayData = row.days?.find(day => day.dayOfMonth === d);
                                return (
                                  <td key={d} className="border px-2 py-1 text-center font-mono">
                                    {dayData ? (
                                      <span className={`${dayData.status === 'ONLY_IN' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {dayData.punches?.join('\n') || '-'}
                                      </span>
                                    ) : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                  <button 
                    onClick={handleBackToUpload}
                    className="px-6 py-2.5 rounded-xl font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmImport}
                    disabled={uploading}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                      !uploading 
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-lg" 
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Importing...
                      </>
                    ) : (
                      <>✅ Confirm & Import</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {importStep === 'result' && importResult && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className={`${importResult.failed > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'} rounded-xl p-6`}>
                <h4 className={`text-xl font-bold mb-4 ${importResult.failed > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                  {importResult.failed > 0 ? '⚠️ Import Completed with Errors' : '✅ Import Successful!'}
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-slate-700">{importResult.total || 0}</div>
                    <div className="text-sm text-slate-500">Total Punches</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-green-600">{importResult.success || 0}</div>
                    <div className="text-sm text-slate-500">Imported</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-red-500">{importResult.failed || 0}</div>
                    <div className="text-sm text-slate-500">Failed</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-blue-600">#{importResult.batchId || '-'}</div>
                    <div className="text-sm text-slate-500">Batch ID</div>
                  </div>
                </div>

                <p className="text-slate-600 mb-4">{importResult.message}</p>
                
                {importResult.errorsCsvUrl && (
                  <a 
                    className="text-blue-600 underline hover:text-blue-800 text-sm" 
                    href={`${API_BASE}${importResult.errorsCsvUrl}`} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    📥 Download Error Details (CSV)
                  </a>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => {
                    handleBackToUpload();
                    setSelectedFile(null);
                  }}
                  className="px-6 py-2.5 rounded-xl font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Import Another File
                </button>
                <button 
                  onClick={() => setActiveTab('monthly')}
                  className="px-6 py-2.5 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  View Monthly Report →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Punch Update Modal */}
      {showPunchModal && selectedLogForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              ✏️ Update Attendance - {selectedLogForEdit.date}
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
              <div><strong>Current Punches:</strong> {selectedLogForEdit.punches?.join(', ') || 'None'}</div>
              <div><strong>Status:</strong> {selectedLogForEdit.status}</div>
              {selectedLogForEdit.highlightReason && (
                <div className="text-orange-600 font-medium mt-1">
                  ⚠️ Issue: {selectedLogForEdit.highlightReason}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IN Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={manualPunchData.manualIn}
                  onChange={(e) => setManualPunchData({...manualPunchData, manualIn: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OUT Time (HH:MM) {selectedLogForEdit.missingPunchType === 'OUT' && <span className="text-orange-500">← Missing</span>}
                </label>
                <input
                  type="time"
                  value={manualPunchData.manualOut}
                  onChange={(e) => setManualPunchData({...manualPunchData, manualOut: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={manualPunchData.remarks}
                  onChange={(e) => setManualPunchData({...manualPunchData, remarks: e.target.value})}
                  placeholder="e.g., Employee forgot to punch out"
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPunchModal(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateManualPunch}
                disabled={updatingPunch}
                className={`px-4 py-2 rounded font-medium ${
                  updatingPunch ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {updatingPunch ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceSheet;

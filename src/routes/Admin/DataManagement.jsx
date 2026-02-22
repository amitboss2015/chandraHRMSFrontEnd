import React, { useState, useEffect } from "react";
import { getToken, getTenantId } from "../../services/api";
import { API_BASE } from "../../utils/apiConfig";

/**
 * Data Management Page
 * - Reset month data before re-import
 * - Employee salary bulk update (template download/upload)
 * - Biometric device association (template download/upload)
 * - Imported file history and download
 * - Single employee payroll recalculation
 */
function DataManagement() {
  const [activeTab, setActiveTab] = useState("reset");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Reset data state
  const [resetYear, setResetYear] = useState(new Date().getFullYear());
  const [resetMonth, setResetMonth] = useState(new Date().getMonth() + 1);
  const [resetPreview, setResetPreview] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // File upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState("salary");
  
  // Imported files state
  const [importedFiles, setImportedFiles] = useState([]);
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  
  // Payroll recalculation state
  const [recalcEmpId, setRecalcEmpId] = useState("");
  const [recalcYear, setRecalcYear] = useState(new Date().getFullYear());
  const [recalcMonth, setRecalcMonth] = useState(new Date().getMonth() + 1);

  const headers = {
    "X-Tenant-Id": getTenantId(),
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadImportedFiles();
    }
  }, [activeTab, fileTypeFilter]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // ============ RESET DATA ============
  const handleResetPreview = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/admin/data/reset/preview?year=${resetYear}&month=${resetMonth}`,
        { headers }
      );
      if (!resp.ok) throw new Error("Failed to get preview");
      const data = await resp.json();
      setResetPreview(data);
      setShowResetConfirm(true);
    } catch (e) {
      showMessage("error", e.message);
    }
    setLoading(false);
  };

  const handleResetConfirm = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/admin/data/reset?year=${resetYear}&month=${resetMonth}&confirmed=true`,
        { method: "POST", headers }
      );
      if (!resp.ok) throw new Error("Reset failed");
      const data = await resp.json();
      showMessage("success", data.message || "Data reset successfully");
      setShowResetConfirm(false);
      setResetPreview(null);
    } catch (e) {
      showMessage("error", e.message);
    }
    setLoading(false);
  };

  // ============ TEMPLATE DOWNLOADS ============
  const handleDownloadTemplate = async (type) => {
    setLoading(true);
    try {
      const endpoint = type === "salary" 
        ? "/admin/data/salary/template" 
        : "/admin/data/biometric/template";
      
      const resp = await fetch(`${API_BASE}${endpoint}`, { headers });
      if (!resp.ok) throw new Error("Download failed");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showMessage("success", "Template downloaded successfully");
    } catch (e) {
      showMessage("error", e.message);
    }
    setLoading(false);
  };

  // ============ FILE UPLOADS ============
  const handleFileUpload = async () => {
    if (!uploadFile) {
      showMessage("error", "Please select a file");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      
      const endpoint = uploadType === "salary" 
        ? "/admin/data/salary/import" 
        : "/admin/data/biometric/import";
      
      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        },
        body: formData
      });
      
      const result = await resp.json();
      if (result.success || result.updatedCount > 0) {
        showMessage("success", `Import successful: ${result.updatedCount} updated, ${result.skippedCount} skipped`);
      } else {
        showMessage("error", result.message || "Import failed");
      }
      
      setUploadFile(null);
      loadImportedFiles();
    } catch (e) {
      showMessage("error", e.message);
    }
    setLoading(false);
  };

  // ============ IMPORTED FILES ============
  const loadImportedFiles = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/admin/data/files?limit=50`;
      if (fileTypeFilter) url += `&fileType=${fileTypeFilter}`;
      
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error("Failed to load files");
      const data = await resp.json();
      setImportedFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load files:", e);
    }
    setLoading(false);
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const resp = await fetch(`${API_BASE}/admin/data/files/${fileId}/download`, { headers });
      if (!resp.ok) throw new Error("Download failed");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      showMessage("error", e.message);
    }
  };

  // ============ PAYROLL RECALCULATION ============
  const handleRecalculatePayroll = async () => {
    if (!recalcEmpId) {
      showMessage("error", "Please enter employee code");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/payroll/recalculate/${recalcEmpId}?year=${recalcYear}&month=${recalcMonth}`,
        { method: "POST", headers }
      );
      
      const result = await resp.json();
      if (result.success) {
        showMessage("success", "Payroll recalculated successfully");
      } else {
        showMessage("error", result.error || "Recalculation failed");
      }
    } catch (e) {
      showMessage("error", e.message);
    }
    setLoading(false);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const tabs = [
    { id: "reset", label: "Reset & Re-import", icon: "🔄" },
    { id: "bulk", label: "Bulk Updates", icon: "📤" },
    { id: "history", label: "Import History", icon: "📁" },
    { id: "recalc", label: "Payroll Recalc", icon: "💰" }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Data Management</h1>
        <p className="text-slate-500 mt-1">Manage data imports, exports, and maintenance operations</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" :
          message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
          "bg-blue-50 text-blue-700 border border-blue-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
              activeTab === tab.id
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        
        {/* Reset & Re-import Tab */}
        {activeTab === "reset" && (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                ⚠️ Reset Month Data
              </h3>
              <p className="text-red-600 text-sm mt-2">
                Clear all data for a month before re-importing. This will delete:
                attendance records, payroll, and loan associations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <select
                  value={resetMonth}
                  onChange={(e) => setResetMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  value={resetYear}
                  onChange={(e) => setResetYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleResetPreview}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Preview Reset"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Updates Tab */}
        {activeTab === "bulk" && (
          <div className="space-y-6">
            {/* Download Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-2">💰 Employee Salary Update</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Download template with current salaries, update values, and upload to apply changes.
                </p>
                <button
                  onClick={() => handleDownloadTemplate("salary")}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  📥 Download Template
                </button>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-2">📱 Biometric Device Association</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Download template to assign employees to biometric devices in bulk.
                </p>
                <button
                  onClick={() => handleDownloadTemplate("biometric")}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  📥 Download Template
                </button>
              </div>
            </div>

            {/* Upload Section */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-4">📤 Upload Updated File</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="salary">Salary Update</option>
                    <option value="biometric">Biometric Association</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select File</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleFileUpload}
                    disabled={loading || !uploadFile}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
              {uploadFile && (
                <p className="mt-2 text-sm text-slate-500">Selected: {uploadFile.name}</p>
              )}
            </div>
          </div>
        )}

        {/* Import History Tab */}
        {activeTab === "history" && (
          <div>
            <div className="flex gap-4 mb-4">
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Types</option>
                <option value="ATTENDANCE_LOG">Attendance Log</option>
                <option value="SALARY_UPDATE">Salary Update</option>
                <option value="BIOMETRIC_ASSOCIATION">Biometric Association</option>
              </select>
              <button
                onClick={loadImportedFiles}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">File Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Uploaded</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Size</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Result</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {importedFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">📄 {file.originalFileName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          {file.fileType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{file.fileSizeFormatted}</td>
                      <td className="px-4 py-3">
                        {file.errorCount > 0 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                            {file.successCount}/{file.totalRows}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {file.successCount} OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDownloadFile(file.id, file.originalFileName)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ⬇️ Download
                        </button>
                      </td>
                    </tr>
                  ))}
                  {importedFiles.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                        No files found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payroll Recalculation Tab */}
        {activeTab === "recalc" && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-700">🔄 Recalculate Single Employee Payroll</h3>
              <p className="text-blue-600 text-sm mt-2">
                Delete and regenerate payroll for a single employee. Useful when employee data has changed.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code</label>
                <input
                  type="text"
                  value={recalcEmpId}
                  onChange={(e) => setRecalcEmpId(e.target.value)}
                  placeholder="e.g., 4"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <select
                  value={recalcMonth}
                  onChange={(e) => setRecalcMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  value={recalcYear}
                  onChange={(e) => setRecalcYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRecalculatePayroll}
                  disabled={loading || !recalcEmpId}
                  className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Recalculate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && resetPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Confirm Data Reset</h3>
            <p className="text-slate-600 mb-4">
              This will permanently delete the following data for {months[resetMonth - 1]} {resetYear}:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm"><strong>Payroll Records:</strong> {resetPreview.payrollRecords}</p>
              <p className="text-sm"><strong>Attendance Records:</strong> {resetPreview.attendanceRecords}</p>
              <p className="text-sm"><strong>Loan Associations:</strong> {resetPreview.loanAssociations}</p>
            </div>
            <p className="text-red-600 text-sm font-medium mb-4">This action cannot be undone!</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-4 shadow-xl">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-slate-600">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;

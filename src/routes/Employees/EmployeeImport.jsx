// src/routes/Employees/EmployeeImport.jsx
// Modern employee import component with Excel template support and validation
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (localStorage.getItem("baseUrl")) return localStorage.getItem("baseUrl");
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080/api';
  return `http://${hostname}:8080/api`;
};
const API_BASE = getApiBase();

const getToken = () =>
  sessionStorage.getItem("hrms_access_token") ||
  localStorage.getItem("token") ||
  "";

const getTenantId = () =>
  localStorage.getItem("hrms_tenant_id") || "SASA001";

export default function EmployeeImport() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const authHeaders = () => {
    const token = getToken();
    const headers = {
      "X-Tenant-Id": getTenantId()
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  // Download template
  const downloadTemplate = async (full = false) => {
    try {
      const url = `${API_BASE}/employees/template/download?full=${full}`;
      const res = await fetch(url, { headers: authHeaders() });
      
      if (!res.ok) throw new Error("Failed to download template");
      
      const blob = await res.blob();
      const filename = full ? "employee_import_template_full.xlsx" : "employee_import_template.xlsx";
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download template: " + err.message);
    }
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.endsWith('.xlsx') && 
        !selectedFile.name.endsWith('.xls')) {
      alert("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }
    
    setFile(selectedFile);
    setResult(null);
  };

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  // Upload and import file
  const handleImport = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/employees/import`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.successCount > 0) {
        // Show success message
      }
    } catch (err) {
      console.error(err);
      setResult({
        success: false,
        message: "Import failed: " + err.message,
        errors: []
      });
    } finally {
      setUploading(false);
    }
  };

  // Reset state
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setShowErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Import Employees</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload an Excel file to bulk import employees
              </p>
            </div>
            <button
              onClick={() => nav("/employees")}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              ← Back to List
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Step 1: Download Template */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h2 className="font-semibold text-blue-900">Download Template</h2>
                <p className="text-sm text-blue-700">Get the Excel template to fill employee data</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => downloadTemplate(false)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:shadow-md transition-all font-medium"
              >
                <span className="text-xl">📥</span>
                Basic Template
                <span className="text-xs bg-blue-400/50 px-2 py-0.5 rounded ml-1">Recommended</span>
              </button>
              <button
                onClick={() => downloadTemplate(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-medium"
              >
                <span className="text-xl">📋</span>
                Full Template
                <span className="text-xs bg-blue-100 px-2 py-0.5 rounded ml-1">All fields</span>
              </button>
            </div>
            
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2">
                <span className="text-amber-500">💡</span>
                <div className="text-sm text-amber-800">
                  <strong>Basic Template</strong> includes only essential fields (Emp Code, First Name, Phone, Email, etc.). 
                  You can add more details later by editing each employee.
                  <br />
                  <strong>Full Template</strong> includes all available fields including salary, bank details, and allowances.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Upload File */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h2 className="font-semibold text-emerald-900">Upload Filled Template</h2>
                <p className="text-sm text-emerald-700">Select or drag your completed Excel file</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50"
                  : file
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
              }`}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
                id="file-upload"
              />
              
              {file ? (
                <div className="space-y-3">
                  <div className="text-5xl">📄</div>
                  <div>
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl">📁</div>
                  <div>
                    <p className="font-medium text-slate-700">
                      Drag & drop your Excel file here
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      or{" "}
                      <label
                        htmlFor="file-upload"
                        className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer underline"
                      >
                        browse to select
                      </label>
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    Supported formats: .xlsx, .xls
                  </p>
                </div>
              )}
            </div>

            {/* Import Button */}
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleImport}
                disabled={!file || uploading}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  !file || uploading
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:shadow-md"
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <span className="text-xl">📤</span>
                    Import Employees
                  </>
                )}
              </button>
              
              {file && !uploading && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className={`px-6 py-4 border-b ${
              result.success 
                ? "bg-green-50 border-green-100" 
                : result.successCount > 0 
                  ? "bg-amber-50 border-amber-100"
                  : "bg-red-50 border-red-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  result.success ? "bg-green-500" : result.successCount > 0 ? "bg-amber-500" : "bg-red-500"
                }`}>
                  3
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    result.success ? "text-green-900" : result.successCount > 0 ? "text-amber-900" : "text-red-900"
                  }`}>
                    Import Results
                  </h2>
                  <p className={`text-sm ${
                    result.success ? "text-green-700" : result.successCount > 0 ? "text-amber-700" : "text-red-700"
                  }`}>
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{result.totalRows || 0}</div>
                  <div className="text-sm text-slate-500">Total Rows</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{result.successCount || 0}</div>
                  <div className="text-sm text-green-600">Imported</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{result.errorCount || 0}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-500">{result.skippedCount || 0}</div>
                  <div className="text-sm text-slate-500">Skipped</div>
                </div>
              </div>

              {/* Error List */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-2 text-red-600 font-medium hover:text-red-700"
                  >
                    <span className={`transition-transform ${showErrors ? "rotate-90" : ""}`}>▶</span>
                    {showErrors ? "Hide" : "Show"} {result.errors.length} Error(s)
                  </button>
                  
                  {showErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-red-800">Row</th>
                            <th className="px-4 py-2 text-left font-semibold text-red-800">Emp Code</th>
                            <th className="px-4 py-2 text-left font-semibold text-red-800">Field</th>
                            <th className="px-4 py-2 text-left font-semibold text-red-800">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                          {result.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-red-100/50">
                              <td className="px-4 py-2 text-red-700">{err.rowNumber}</td>
                              <td className="px-4 py-2 text-red-700 font-mono">{err.empCode || "-"}</td>
                              <td className="px-4 py-2 text-red-700">{err.field || "-"}</td>
                              <td className="px-4 py-2 text-red-600">{err.errorMessage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex items-center gap-4">
                {result.successCount > 0 && (
                  <button
                    onClick={() => nav("/employees")}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow hover:shadow-md transition-all font-medium"
                  >
                    View Employees →
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Import Another File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Rules Info */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span>📋</span> Validation Rules
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 mb-2">Required Fields</h4>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  <span className="font-medium">Emp Code</span>
                  <span className="text-slate-500">- Letters, numbers, _, -</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  <span className="font-medium">First Name</span>
                  <span className="text-slate-500">- 2-50 characters</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 mb-2">Field Formats</h4>
                <div className="space-y-2 text-slate-600">
                  <p><strong>Phone:</strong> 10 digits starting with 6-9</p>
                  <p><strong>Email:</strong> Valid email format</p>
                  <p><strong>Pincode:</strong> 6-digit Indian pincode</p>
                  <p><strong>PAN:</strong> ABCDE1234F format</p>
                  <p><strong>IFSC:</strong> SBIN0001234 format</p>
                  <p><strong>Join Date:</strong> YYYY-MM-DD</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

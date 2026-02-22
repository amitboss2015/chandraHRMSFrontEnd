// src/routes/Employees/EmployeeImport.jsx
// Modern employee import component with Excel template support and validation
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE } from "../../utils/apiConfig";

const getToken = () =>
  sessionStorage.getItem("hrms_access_token") ||
  localStorage.getItem("token") ||
  "";

const getTenantId = () =>
  localStorage.getItem("hrms_tenant_id") || "SASA001";

// Token refresh helper
const tryRefreshToken = async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': getTenantId(),
      },
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      sessionStorage.setItem('hrms_access_token', data.accessToken);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return false;
  }
};

// Helper to fetch with auto-refresh on 401/403
const fetchWithRefresh = async (url, options = {}) => {
  let response = await fetch(url, options);
  
  if (response.status === 401 || response.status === 403) {
    console.log(`🔒 Auth error (${response.status}), attempting token refresh...`);
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Update token in headers and retry
      const newHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${getToken()}`,
      };
      response = await fetch(url, { ...options, headers: newHeaders });
      
      if (response.status === 401 || response.status === 403) {
        // Still failing after refresh, redirect to login
        sessionStorage.removeItem('hrms_access_token');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    } else {
      sessionStorage.removeItem('hrms_access_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }
  
  return response;
};

// Encode device info into a filename-safe token
const encodeDeviceToken = (deviceId, deviceCode) => {
  const payload = JSON.stringify({ d: deviceId, c: deviceCode, t: Date.now() });
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Decode device token from filename
const decodeDeviceToken = (token) => {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return { deviceId: payload.d, deviceCode: payload.c, timestamp: payload.t };
  } catch (e) {
    console.error("Failed to decode device token:", e);
    return null;
  }
};

// Extract device token from filename pattern: 
// New format: [DeviceName]_employee_template_[TOKEN].xlsx
// Legacy format: employee_template_[TOKEN].xlsx
const extractDeviceFromFilename = (filename) => {
  // Try new format first: DeviceName_employee_template_TOKEN.xlsx
  const newMatch = filename.match(/_employee_template_([A-Za-z0-9_-]+)\.xlsx$/i);
  if (newMatch) {
    return decodeDeviceToken(newMatch[1]);
  }
  
  // Fallback to legacy format: employee_template_TOKEN.xlsx
  const legacyMatch = filename.match(/^employee_template_([A-Za-z0-9_-]+)\.xlsx$/i);
  if (legacyMatch) {
    return decodeDeviceToken(legacyMatch[1]);
  }
  
  return null;
};

export default function EmployeeImport() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  
  // Biometric device state
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [detectedDevice, setDetectedDevice] = useState(null);
  const [overrideDevice, setOverrideDevice] = useState(false); // Allow manual device override

  const authHeaders = () => {
    const token = getToken();
    const headers = {
      "X-Tenant-Id": getTenantId()
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  // Load biometric devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      setLoadingDevices(true);
      try {
        const res = await fetch(`${API_BASE}/devices`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setDevices(Array.isArray(data) ? data : []);
          // Auto-select default device if exists
          const defaultDevice = data.find(d => d.isDefault);
          if (defaultDevice) {
            setSelectedDeviceId(String(defaultDevice.id));
          } else if (data.length === 1) {
            setSelectedDeviceId(String(data[0].id));
          }
        }
      } catch (e) {
        console.error("Failed to load devices:", e);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, []);

  // Download template with device info encoded in filename
  const downloadTemplate = async (full = false) => {
    if (!selectedDeviceId) {
      alert("Please select a biometric device first");
      return;
    }
    
    const selectedDevice = devices.find(d => String(d.id) === selectedDeviceId);
    if (!selectedDevice) {
      alert("Selected device not found");
      return;
    }
    
    try {
      const url = `${API_BASE}/employees/template/download?full=${full}&deviceId=${selectedDeviceId}`;
      const res = await fetch(url, { headers: authHeaders() });
      
      if (!res.ok) throw new Error("Failed to download template");
      
      const blob = await res.blob();
      
      // Encode device info in filename, starting with device name for clarity
      const deviceToken = encodeDeviceToken(selectedDevice.id, selectedDevice.deviceCode);
      const deviceName = (selectedDevice.deviceName || selectedDevice.deviceCode).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${deviceName}_employee_template_${deviceToken}.xlsx`;
      
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
    
    // Try to extract device info from filename
    const deviceInfo = extractDeviceFromFilename(selectedFile.name);
    if (deviceInfo) {
      setDetectedDevice(deviceInfo);
      // Find matching device in our list
      const matchingDevice = devices.find(d => d.id === deviceInfo.deviceId);
      if (matchingDevice) {
        setSelectedDeviceId(String(matchingDevice.id));
      } else {
        // Device mismatch - could be tampered or from different tenant
        setDetectedDevice({ ...deviceInfo, mismatch: true });
      }
    } else {
      setDetectedDevice(null);
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
    
    // Validate device selection
    if (!selectedDeviceId && !detectedDevice) {
      alert("Please select a biometric device first, or use a template downloaded from this system.");
      return;
    }
    
    // Check for device mismatch (tampering detection)
    if (detectedDevice?.mismatch) {
      const proceed = confirm(
        "⚠️ Warning: The device encoded in the filename does not match any device in your system.\n\n" +
        "This could mean:\n" +
        "• The file was modified\n" +
        "• The file is from a different organization\n\n" +
        "Do you want to continue with the currently selected device?"
      );
      if (!proceed) return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Send device ID - if override is enabled, use selected; otherwise detect from filename
      const deviceIdToUse = overrideDevice ? selectedDeviceId : (detectedDevice?.deviceId || selectedDeviceId);
      if (deviceIdToUse) {
        formData.append("deviceId", deviceIdToUse);
      }

      // Use fetchWithRefresh for auto token refresh on 401/403
      const res = await fetchWithRefresh(`${API_BASE}/employees/import`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.successCount > 0) {
        // Auto-redirect to shift assignment UI after successful import
        setTimeout(() => {
          nav("/shifts/assign", { replace: true });
        }, 2000); // Small delay to show success message before redirect
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
    setDetectedDevice(null);
    setOverrideDevice(false);
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
        {/* Step 0: Select Biometric Device */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                🔐
              </div>
              <div>
                <h2 className="font-semibold text-purple-900">Select Biometric Device</h2>
                <p className="text-sm text-purple-700">Choose the device these employees will be associated with</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Biometric Device <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={loadingDevices}
              >
                <option value="">-- Select Device --</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.deviceName} ({device.deviceCode})
                    {device.isDefault ? ' ⭐ Default' : ''}
                  </option>
                ))}
              </select>
              {loadingDevices && (
                <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                  Loading devices...
                </p>
              )}
              {!loadingDevices && devices.length === 0 && (
                <p className="mt-2 text-sm text-amber-600">
                  ⚠️ No biometric devices found. Please add a device in Settings → Biometric Devices first.
                </p>
              )}
            </div>
            
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex gap-2">
                <span className="text-purple-500">💡</span>
                <div className="text-sm text-purple-800">
                  The selected device will be embedded in the template filename. When you import the filled template,
                  employees will automatically be associated with this device. This helps match attendance records correctly.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${!selectedDeviceId ? 'opacity-50 pointer-events-none' : ''}`}>
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
            {selectedDeviceId && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                ✅ Template will be linked to: <strong>{devices.find(d => String(d.id) === selectedDeviceId)?.deviceName}</strong>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => downloadTemplate(false)}
                disabled={!selectedDeviceId}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">📥</span>
                Basic Template
                <span className="text-xs bg-blue-400/50 px-2 py-0.5 rounded ml-1">Recommended</span>
              </button>
              <button
                onClick={() => downloadTemplate(true)}
                disabled={!selectedDeviceId}
                className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${!selectedDeviceId ? 'opacity-50 pointer-events-none' : ''}`}>
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
            {/* Detected Device Info */}
            {detectedDevice && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                detectedDevice.mismatch 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
                {detectedDevice.mismatch ? (
                  <>
                    ⚠️ <strong>Device Mismatch:</strong> The template was created for device ID {detectedDevice.deviceId} 
                    ({detectedDevice.deviceCode}), but this device is not found in your system. 
                    The file may have been modified or is from a different organization.
                  </>
                ) : (
                  <>
                    ✅ <strong>Device Detected:</strong> Template linked to{' '}
                    <strong>{devices.find(d => d.id === detectedDevice.deviceId)?.deviceName || detectedDevice.deviceCode}</strong>
                  </>
                )}
              </div>
            )}
            
            {/* Device Override Option */}
            {file && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideDevice}
                    onChange={(e) => setOverrideDevice(e.target.checked)}
                    className="mt-1 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-medium text-amber-800">Override device assignment</span>
                    <p className="text-sm text-amber-700 mt-1">
                      Check this if you want to import employees to a <strong>different device</strong> than what the template was created for.
                      {overrideDevice && (
                        <span className="block mt-2 text-amber-900">
                          → Employees will be imported to: <strong>{devices.find(d => String(d.id) === selectedDeviceId)?.deviceName || 'Selected device'}</strong>
                        </span>
                      )}
                    </p>
                  </div>
                </label>
              </div>
            )}
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

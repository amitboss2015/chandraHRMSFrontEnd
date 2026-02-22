// src/routes/Employees/EmployeeList.jsx
// Modern, clean employee listing with search and card/table view
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { TEMPLATE_COLUMNS } from "./employeeTemplateSchema";
import { TEMPLATE_TO_MODEL } from "./employeeTemplateMappings";
import { API_BASE } from "../../utils/apiConfig";

const getToken = () =>
  sessionStorage.getItem("hrms_access_token") ||
  localStorage.getItem("token") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_TOKEN) ||
  "";

const getOrgId = () =>
  localStorage.getItem("hrms_tenant_id") ||
  localStorage.getItem("orgId") ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ORG_ID) ||
  "";

// Token refresh helper
const tryRefreshToken = async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': getOrgId(),
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

const adaptApiEmployee = (e) => ({
  id: e.id,
  emp_code: e.empCode ?? "",
  first_name: e.firstName ?? "",
  last_name: e.lastName ?? "",
  department: e.department ?? "",
  designation: e.designation ?? "",
  employment_type: e.employmentType ?? "",
  shifts: Array.isArray(e.shifts) ? e.shifts : [],
  join_date: e.joinDate ?? "",
  status: e.status ?? "",
  salary_basis: (e.salaryBasis ?? "").toUpperCase(),
  base_salary: Number(e.baseSalary ?? 0),
  hourly_rate: Number(e.hourlyRate ?? 0),
  email: e.email ?? "",
  phone: e.phone ?? "",
  address: e.address ?? "",
  city: e.city ?? "",
  state: e.state ?? "",
  pincode: e.pincode ?? "",
  aadhaar: e.aadhaar ?? "",
  pan: e.pan ?? "",
  bank_account: e.bankAccount ?? "",
  ifsc: e.ifsc ?? "",
  bank_name: e.bankName ?? "",
  emergency_contact_name: e.emergencyContactName ?? "",
  emergency_contact_phone: e.emergencyContactPhone ?? "",
  ot_allowed: !!e.otAllowed,
  ot_duration_minutes: e.otDurationMinutes ?? null,
  org_id: getOrgId(),
});

const normalizeRow = (row) => {
  const model = {};
  Object.entries(TEMPLATE_TO_MODEL).forEach(([xlsKey, modelKey]) => {
    model[modelKey] = row?.[xlsKey] ?? "";
  });
  if (model.salary_basis) {
    const basis = ("" + model.salary_basis).toUpperCase();
    model.salary_basis = basis === "HOURLY" ? "HOURLY" : "MONTHLY";
  }
  model.base_salary = Number(model.base_salary) || 0;
  model.hourly_rate = Number(model.hourly_rate) || 0;
  if (model.join_date) {
    const d = new Date(model.join_date);
    if (!isNaN(d)) model.join_date = d.toISOString().slice(0, 10);
  }
  if (model.shifts) {
    model.shifts = ("" + model.shifts).split(",").map((s) => s.trim()).filter(Boolean);
  } else model.shifts = [];
  model.status = model.status || "ACTIVE";
  if (!model.org_id && getOrgId()) model.org_id = getOrgId();
  return model;
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

// Extract device token from filename pattern: employee_template_[TOKEN].xlsx
const extractDeviceFromFilename = (filename) => {
  const match = filename.match(/employee_template_([A-Za-z0-9_-]+)\.xlsx$/i);
  if (match) {
    return decodeDeviceToken(match[1]);
  }
  return null;
};

export default function EmployeeList() {
  const nav = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [viewMode, setViewMode] = useState("table"); // table or cards
  
  // Selection state for bulk operations
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef(null);
  
  // Salary Update Modal State
  const [showSalaryUpdateModal, setShowSalaryUpdateModal] = useState(false);
  const [salaryUpdateFile, setSalaryUpdateFile] = useState(null);
  const [isDraggingSalary, setIsDraggingSalary] = useState(false);
  const [updatingSalary, setUpdatingSalary] = useState(false);
  const [salaryUpdateResult, setSalaryUpdateResult] = useState(null);
  const salaryFileInputRef = useRef(null);
  
  // Biometric device state (shared between import and salary update)
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [detectedDevice, setDetectedDevice] = useState(null);
  
  // Salary update device state
  const [selectedSalaryDeviceId, setSelectedSalaryDeviceId] = useState('');

  const authHeaders = useMemo(() => {
    const t = getToken();
    const tenantId = getOrgId() || 'SASA001';
    const h = { 
      "Content-Type": "application/json",
      "X-Tenant-Id": tenantId
    };
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const orgId = getOrgId();
      const url = orgId
        ? `${API_BASE}/employees?orgId=${encodeURIComponent(orgId)}`
        : `${API_BASE}/employees`;
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map(adaptApiEmployee)
        : Array.isArray(data?.content)
        ? data.content.map(adaptApiEmployee)
        : [];
      setEmployees(list);
    } catch (e) {
      console.error(e);
      setErr("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Refresh employee list when window regains focus (e.g., after navigating back from import page)
  useEffect(() => {
    const handleFocus = () => {
      fetchEmployees();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchEmployees]);

  // Load biometric devices when import modal or salary update modal opens
  useEffect(() => {
    if (!showImportModal && !showSalaryUpdateModal) return;
    
    const loadDevices = async () => {
      setLoadingDevices(true);
      try {
        const res = await fetch(`${API_BASE}/devices`, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          setDevices(Array.isArray(data) ? data : []);
          // Auto-select default device if exists
          const defaultDevice = data.find(d => d.isDefault);
          if (showImportModal) {
            if (defaultDevice) {
              setSelectedDeviceId(String(defaultDevice.id));
            } else if (data.length === 1) {
              setSelectedDeviceId(String(data[0].id));
            }
          }
          if (showSalaryUpdateModal) {
            if (defaultDevice) {
              setSelectedSalaryDeviceId(String(defaultDevice.id));
            } else if (data.length === 1) {
              setSelectedSalaryDeviceId(String(data[0].id));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load devices:", e);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, [showImportModal, showSalaryUpdateModal, authHeaders]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.last_name?.toLowerCase().includes(searchLower) ||
        emp.emp_code?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.phone?.includes(search) ||
        emp.department?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = filterStatus === "ALL" || emp.status === filterStatus;
      
      // Department filter
      const matchesDept = filterDept === "ALL" || emp.department === filterDept;
      
      return matchesSearch && matchesStatus && matchesDept;
    });
    
    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle null/undefined values
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        // Convert to string for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [employees, search, filterStatus, filterDept, sortConfig]);
  
  // Handle column sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Handle checkbox selection
  const handleSelectEmployee = (empCode) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empCode)) {
        newSet.delete(empCode);
      } else {
        newSet.add(empCode);
      }
      return newSet;
    });
  };
  
  // Handle select all
  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.emp_code)));
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) {
      alert("Please select at least one employee to delete");
      return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${selectedEmployees.size} employee(s)?\n\nThis will permanently delete:\n- All attendance records\n- All payroll records\n- All leave records\n- All loan records\n- All shift assignments\n- All biometric mappings\n\nThis action cannot be undone!`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      const empCodes = Array.from(selectedEmployees);
      const res = await fetchWithRefresh(`${API_BASE}/employees/bulk`, {
        method: "DELETE",
        headers: authHeaders,
        body: JSON.stringify(empCodes)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Delete failed (${res.status})`);
      }
      
      const result = await res.json();
      alert(result.message || `Successfully deleted ${empCodes.length} employee(s)`);
      setSelectedEmployees(new Set());
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      alert("Error deleting employees: " + err.message);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "Employee_Template.xlsx");
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const incoming = json.map(normalizeRow);

      const map = new Map();
      [...employees, ...incoming].forEach((emp) => {
        map.set(emp.emp_code, emp);
      });
      setEmployees(Array.from(map.values()));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleBulkSubmit = async () => {
    if (employees.length === 0) return alert("No employees to submit!");
    try {
      const res = await fetch(`${API_BASE}/employees/bulk-upload`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(
          employees.map((e) => (e.org_id ? e : { ...e, org_id: getOrgId() }))
        ),
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      alert("Employees uploaded successfully!");
      fetchEmployees();
    } catch (err) {
      console.error(err);
      alert("Error while uploading employees.");
    }
  };

  // ==================== IMPORT MODAL FUNCTIONS ====================
  
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
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      
      // Encode device info in filename
      const deviceToken = encodeDeviceToken(selectedDevice.id, selectedDevice.deviceCode);
      const filename = `employee_template_${deviceToken}.xlsx`;
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      alert("Failed to download template: " + error.message);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
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
    
    setImportFile(selectedFile);
    setImportResult(null);
  };

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []);

  const handleImportSubmit = async () => {
    if (!importFile) return alert("Please select a file first");
    
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
    
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      // Send device ID - prioritize detected device from filename, fallback to selected
      const deviceIdToUse = detectedDevice?.deviceId || selectedDeviceId;
      if (deviceIdToUse) {
        formData.append("deviceId", deviceIdToUse);
      }
      
      // Use fetchWithRefresh for auto token refresh on 401/403
      const res = await fetchWithRefresh(`${API_BASE}/employees/import`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${getToken()}`,
          "X-Tenant-Id": getOrgId()
        },
        body: formData
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success && data.successCount > 0) {
        // Refresh employee list to show newly imported employees
        await fetchEmployees();
        // Auto-redirect to shift assignment UI after a short delay
        setTimeout(() => {
          closeImportModal();
          nav("/shifts/assign");
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      setImportResult({ success: false, message: "Import failed: " + error.message, errors: [] });
    } finally {
      setImporting(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowErrors(false);
    setDetectedDevice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    resetImportModal();
  };

  // ==================== SALARY UPDATE MODAL FUNCTIONS ====================
  
  const downloadSalaryTemplate = async () => {
    if (!selectedSalaryDeviceId) {
      alert("Please select a biometric device first");
      return;
    }
    
    try {
      const url = `${API_BASE}/employees/salary/template/download?deviceId=${selectedSalaryDeviceId}`;
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `salary_update_template_${selectedSalaryDeviceId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      alert("Failed to download template: " + error.message);
    }
  };

  const handleSalaryFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      alert("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }
    
    setSalaryUpdateFile(selectedFile);
    setSalaryUpdateResult(null);
  };

  const handleSalaryDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleSalaryDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSalary(true); }, []);
  const handleSalaryDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSalary(false); }, []);
  const handleSalaryDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSalary(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleSalaryFileSelect(droppedFile);
  }, []);

  const handleSalaryUpdateSubmit = async () => {
    if (!salaryUpdateFile) return alert("Please select a file first");
    
    if (!selectedSalaryDeviceId) {
      alert("Please select a biometric device first");
      return;
    }
    
    setUpdatingSalary(true);
    setSalaryUpdateResult(null);
    
    try {
      const formData = new FormData();
      formData.append("file", salaryUpdateFile);
      
      const res = await fetchWithRefresh(`${API_BASE}/employees/salary/import`, {
        method: "POST",
        headers: {
          "X-Tenant-Id": getOrgId() || 'SASA001',
          "Authorization": `Bearer ${getToken()}`
        },
        body: formData
      });
      
      const data = await res.json();
      setSalaryUpdateResult(data);
      if (data.success || (data.updatedCount > 0)) {
        await fetchEmployees();
        setTimeout(() => {
          closeSalaryUpdateModal();
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      setSalaryUpdateResult({ success: false, message: "Update failed: " + error.message, errors: [] });
    } finally {
      setUpdatingSalary(false);
    }
  };

  const resetSalaryUpdateModal = () => {
    setSalaryUpdateFile(null);
    setSalaryUpdateResult(null);
    if (salaryFileInputRef.current) salaryFileInputRef.current.value = "";
  };

  const closeSalaryUpdateModal = () => {
    setShowSalaryUpdateModal(false);
    resetSalaryUpdateModal();
  };

  const handleDelete = async (emp_code) => {
    if (!emp_code) return;
    const confirmMessage = `Are you sure you want to delete this employee?\n\nThis will permanently delete:\n- All attendance records\n- All payroll records\n- All leave records\n- All loan records\n- All shift assignments\n- All biometric mappings\n\nThis action cannot be undone!`;
    if (!window.confirm(confirmMessage)) return;
    try {
      const url = `${API_BASE}/employees/${encodeURIComponent(emp_code)}`;
      const res = await fetchWithRefresh(url, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setSelectedEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(emp_code);
        return newSet;
      });
      await fetchEmployees();
    } catch (e) {
      console.error(e);
      alert("Failed to delete employee: " + e.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
      INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
      RESIGNED: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status] || styles.INACTIVE}`}>
        {status}
      </span>
    );
  };

  const getInitials = (firstName, lastName) => {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
  };

  const formatSalary = (emp) => {
    if (emp.salary_basis === "HOURLY") {
      return emp.hourly_rate ? `₹${emp.hourly_rate}/hr` : "-";
    }
    return emp.base_salary ? `₹${Number(emp.base_salary).toLocaleString('en-IN')}` : "-";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {filteredEmployees.length} of {employees.length} employees
              </p>
            </div>
            <button
              onClick={() => nav("/employees/new")}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span> Add Employee
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by name, code, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RESIGNED">Resigned</option>
              </select>
              
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-2 text-sm ${viewMode === "table" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  📋
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-2 text-sm ${viewMode === "cards" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  🗃️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium flex items-center gap-2"
            >
              📤 Import Employees
            </button>
            <button
              onClick={() => setShowSalaryUpdateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium flex items-center gap-2"
            >
              💰 Update Salary
            </button>
            {selectedEmployees.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                🗑️ Delete Selected ({selectedEmployees.size})
              </button>
            )}
            <button
              onClick={fetchEmployees}
              className="ml-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium flex items-center gap-2"
            >
              🔄 Refresh
            </button>
          </div>
          {err && <div className="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded">{err}</div>}
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Employees Found</h3>
            <p className="text-slate-500 mb-4">
              {search || filterStatus !== "ALL" || filterDept !== "ALL"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first employee"}
            </p>
            {!search && filterStatus === "ALL" && filterDept === "ALL" && (
              <button
                onClick={() => nav("/employees/new")}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                + Add First Employee
              </button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.emp_code}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.emp_code}
                        </h3>
                        {getStatusBadge(emp.status)}
                      </div>
                      <p className="text-sm text-slate-500">{emp.emp_code}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400">🏢</span>
                      <span className="truncate">{emp.department || "-"}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate">{emp.designation || "-"}</span>
                    </div>
                    {emp.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">📧</span>
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">📱</span>
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-slate-400">💰</span>
                      <span className="font-medium text-emerald-600">{formatSalary(emp)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t flex gap-2">
                  <button
                    onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}`, { state: { employee: emp } })}
                    className="flex-1 px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}/edit`, { state: { employee: emp } })}
                    className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(emp.emp_code)}
                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Employee Name</span>
                        <button
                          onClick={() => handleSort('first_name')}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                          title="Sort by name"
                        >
                          {sortConfig.key === 'first_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Employee Code</span>
                        <button
                          onClick={() => handleSort('emp_code')}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                          title="Sort by code"
                        >
                          {sortConfig.key === 'emp_code' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Department</span>
                        <button
                          onClick={() => handleSort('department')}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                          title="Sort by department"
                        >
                          {sortConfig.key === 'department' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Contact</span>
                        <button
                          onClick={() => handleSort('email')}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                          title="Sort by email"
                        >
                          {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>Join Date</span>
                        <button
                          onClick={() => handleSort('join_date')}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                          title="Sort by join date"
                        >
                          {sortConfig.key === 'join_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                      <div className="flex items-center justify-end gap-2">
                        <span>Salary</span>
                        <button
                          onClick={() => handleSort('base_salary')}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                          title="Sort by salary"
                        >
                          {sortConfig.key === 'base_salary' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.emp_code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(emp.emp_code)}
                          onChange={() => handleSelectEmployee(emp.emp_code)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {getInitials(emp.first_name, emp.last_name)}
                          </div>
                          <div className="font-medium text-slate-800">
                            {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-mono text-sm">{emp.emp_code || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{emp.department || "-"}</div>
                        <div className="text-xs text-slate-500">{emp.designation || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{emp.email || "-"}</div>
                        <div className="text-xs text-slate-500">{emp.phone || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.join_date || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatSalary(emp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}`, { state: { employee: emp } })}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => nav(`/employees/${encodeURIComponent(emp.emp_code)}/edit`, { state: { employee: emp } })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(emp.emp_code)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ==================== IMPORT MODAL ==================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-violet-500 to-violet-600 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Import Employees</h2>
                <p className="text-violet-100 text-sm">Upload Excel file to bulk import employees</p>
              </div>
              <button
                onClick={closeImportModal}
                className="text-white/80 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 0: Select Biometric Device */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">🔐</div>
                  <div>
                    <h3 className="font-semibold text-purple-900">Select Biometric Device</h3>
                    <p className="text-xs text-purple-700">Choose the device these employees will be associated with</p>
                  </div>
                </div>
                <div className="max-w-md">
                  <select
                    className="w-full px-4 py-2.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
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
                    <p className="mt-2 text-xs text-purple-600 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                      Loading devices...
                    </p>
                  )}
                  {!loadingDevices && devices.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      ⚠️ No biometric devices found. Please add a device in Settings → Biometric Devices first.
                    </p>
                  )}
                </div>
                {selectedDeviceId && (
                  <div className="mt-3 p-2 bg-purple-100 border border-purple-200 rounded-lg text-xs text-purple-800">
                    💡 The selected device will be embedded in the template filename. When you import the filled template,
                    employees will automatically be associated with this device.
                  </div>
                )}
              </div>

              {/* Step 1: Download Template */}
              <div className={`bg-blue-50 rounded-xl p-4 border border-blue-100 ${!selectedDeviceId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                  <h3 className="font-semibold text-blue-900">Download Template</h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">Get the Excel template, fill in employee data, then upload it back.</p>
                {selectedDeviceId && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                    ✅ Template will be linked to: <strong>{devices.find(d => String(d.id) === selectedDeviceId)?.deviceName}</strong>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => downloadTemplate(false)}
                    disabled={!selectedDeviceId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📥 Basic Template
                  </button>
                  <button
                    onClick={() => downloadTemplate(true)}
                    disabled={!selectedDeviceId}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📋 Full Template
                  </button>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className={`bg-emerald-50 rounded-xl p-4 border border-emerald-100 ${!selectedDeviceId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                  <h3 className="font-semibold text-emerald-900">Upload Filled Template</h3>
                </div>
                
                {/* Detected Device Info */}
                {detectedDevice && (
                  <div className={`mb-3 p-2 rounded-lg text-xs ${
                    detectedDevice.mismatch 
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-green-50 border border-green-200 text-green-800'
                  }`}>
                    {detectedDevice.mismatch ? (
                      <>
                        ⚠️ <strong>Device Mismatch:</strong> The template was created for device ID {detectedDevice.deviceId} 
                        ({detectedDevice.deviceCode}), but this device is not found in your system.
                      </>
                    ) : (
                      <>
                        ✅ <strong>Device Detected:</strong> Template linked to{' '}
                        <strong>{devices.find(d => d.id === detectedDevice.deviceId)?.deviceName || detectedDevice.deviceCode}</strong>
                      </>
                    )}
                  </div>
                )}
                
                {/* Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragging ? "border-emerald-500 bg-emerald-100" : 
                    importFile ? "border-emerald-400 bg-white" : "border-emerald-300 hover:border-emerald-400 bg-white"
                  }`}
                  onDragEnter={handleDragIn}
                  onDragLeave={handleDragOut}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    className="hidden"
                  />
                  
                  {importFile ? (
                    <div className="space-y-2">
                      <div className="text-4xl">📄</div>
                      <p className="font-medium text-slate-800">{importFile.name}</p>
                      <p className="text-xs text-slate-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); resetImportModal(); }}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl">📁</div>
                      <p className="font-medium text-slate-700">Drag & drop or click to select</p>
                      <p className="text-xs text-slate-500">Supports .xlsx and .xls files</p>
                    </div>
                  )}
                </div>

                {/* Import Button */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleImportSubmit}
                    disabled={!importFile || importing}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                      !importFile || importing
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-emerald-500 text-white hover:bg-emerald-600"
                    }`}
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>📤 Import Now</>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 3: Results */}
              {importResult && (
                <div className={`rounded-xl p-4 border ${
                  importResult.success ? "bg-green-50 border-green-200" : 
                  importResult.successCount > 0 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold ${
                      importResult.success ? "bg-green-500" : importResult.successCount > 0 ? "bg-amber-500" : "bg-red-500"
                    }`}>3</div>
                    <h3 className={`font-semibold ${
                      importResult.success ? "text-green-900" : importResult.successCount > 0 ? "text-amber-900" : "text-red-900"
                    }`}>Import Results</h3>
                  </div>
                  
                  {/* Clear success/failure message */}
                  {importResult.successCount > 0 ? (
                    <p className="text-sm mb-4 text-green-700 font-medium">
                      ✅ Successfully imported {importResult.successCount} employee(s)!
                      <span className="block text-xs text-green-600 mt-1">
                        {importResult.successCount} कर्मचारी सफलतापूर्वक आयातित हुए!
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm mb-4 text-red-700">{importResult.message}</p>
                  )}
                  
                  {/* Stats - Show meaningful counts */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-green-200">
                      <div className="text-2xl font-bold text-green-600">{importResult.successCount || 0}</div>
                      <div className="text-xs text-green-600 font-medium">✓ Imported Successfully</div>
                      <div className="text-xs text-green-500">सफलतापूर्वक आयातित</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-amber-200">
                      <div className="text-2xl font-bold text-amber-600">{importResult.skippedCount || 0}</div>
                      <div className="text-xs text-amber-600 font-medium">⏭ Already Exists</div>
                      <div className="text-xs text-amber-500">पहले से मौजूद</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-red-200">
                      <div className="text-2xl font-bold text-red-600">{importResult.errorCount || 0}</div>
                      <div className="text-xs text-red-600 font-medium">✗ Failed</div>
                      <div className="text-xs text-red-500">असफल</div>
                    </div>
                  </div>
                  
                  {/* Summary explanation */}
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-3">
                    <strong>Summary:</strong> Out of {(importResult.successCount || 0) + (importResult.skippedCount || 0) + (importResult.errorCount || 0)} data rows in your file, 
                    {importResult.successCount > 0 && <span className="text-green-600"> {importResult.successCount} new employees were added</span>}
                    {importResult.skippedCount > 0 && <span className="text-amber-600">, {importResult.skippedCount} were skipped (already exist)</span>}
                    {importResult.errorCount > 0 && <span className="text-red-600">, {importResult.errorCount} had errors</span>}.
                  </div>

                  {/* Duplicate Name Warnings (same name in different device) */}
                  {importResult.duplicateWarnings && importResult.duplicateWarnings.length > 0 && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⚠️</span>
                        <div>
                          <p className="text-sm font-bold text-purple-800">
                            {importResult.duplicateWarnings.length} employee(s) with same name found in other devices
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            अन्य डिवाइस में समान नाम वाले {importResult.duplicateWarnings.length} कर्मचारी मिले
                          </p>
                          <div className="mt-2 space-y-1">
                            {importResult.duplicateWarnings.slice(0, 5).map((dup, idx) => (
                              <div key={idx} className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                Row {dup.rowNumber}: <strong>{dup.firstName} {dup.lastName}</strong> 
                                (Code: {dup.empCode}) - exists in <strong>{dup.existingDevice}</strong>, 
                                importing to <strong>{dup.targetDevice}</strong>
                              </div>
                            ))}
                            {importResult.duplicateWarnings.length > 5 && (
                              <div className="text-xs text-purple-600">
                                ... and {importResult.duplicateWarnings.length - 5} more
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-purple-600 mt-2 italic">
                            Note: These were still imported. Same person can't punch at multiple devices simultaneously.
                            <br/>नोट: ये अभी भी आयातित किए गए। एक व्यक्ति एक साथ कई डिवाइस पर पंच नहीं कर सकता।
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors (real failures) */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="flex items-center gap-2 text-red-600 font-medium hover:text-red-700 text-sm mb-2"
                      >
                        <span className={`transition-transform ${showErrors ? "rotate-90" : ""}`}>▶</span>
                        {showErrors ? "Hide" : "Show"} {importResult.errors.length} Error(s) - असफल
                      </button>
                      
                      {showErrors && (
                        <div className="bg-white border border-red-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-red-100 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-red-800">Row</th>
                                <th className="px-3 py-2 text-left font-semibold text-red-800">Code</th>
                                <th className="px-3 py-2 text-left font-semibold text-red-800">Error</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-red-100">
                              {importResult.errors.map((err, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-red-700">{err.rowNumber}</td>
                                  <td className="px-3 py-2 text-red-700 font-mono">{err.empCode || "-"}</td>
                                  <td className="px-3 py-2 text-red-600">{err.errorMessage}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Skipped entries (already exist) */}
                  {importResult.skipped && importResult.skipped.length > 0 && (
                    <div className="mb-3">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-amber-600 font-medium hover:text-amber-700">
                          ⏭ {importResult.skipped.length} Skipped (already exist) - पहले से मौजूद
                        </summary>
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                          {importResult.skipped.slice(0, 20).map((skip, idx) => (
                            <div key={idx} className="text-xs text-amber-700 py-0.5">
                              Row {skip.rowNumber}: <span className="font-mono">{skip.empCode}</span> - {skip.reason}
                            </div>
                          ))}
                          {importResult.skipped.length > 20 && (
                            <div className="text-xs text-amber-600 mt-1">
                              ... and {importResult.skipped.length - 20} more
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}

                  {importResult.successCount > 0 && (
                    <>
                      {/* Next Steps Guidance */}
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          📋 Next Steps / अगले कदम
                        </h4>
                        <div className="space-y-2 text-sm">
                          <a 
                            href="/shifts/assign" 
                            className="flex items-center gap-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            title="Assign shifts to employees | कर्मचारियों को शिफ्ट असाइन करें"
                          >
                            <span className="text-lg">⏰</span>
                            <span className="flex-1">
                              <strong>Assign Shifts</strong> - Link employees to work timings
                              <br/><span className="text-blue-600 text-xs">शिफ्ट असाइन करें - कर्मचारियों को कार्य समय से जोड़ें</span>
                            </span>
                            <span className="text-blue-400">→</span>
                          </a>
                          <a 
                            href="/attendance" 
                            className="flex items-center gap-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            title="Upload biometric attendance data | बायोमेट्रिक उपस्थिति डेटा अपलोड करें"
                          >
                            <span className="text-lg">📤</span>
                            <span className="flex-1">
                              <strong>Import Attendance</strong> - Upload biometric punch data
                              <br/><span className="text-blue-600 text-xs">उपस्थिति आयात करें - बायोमेट्रिक पंच डेटा अपलोड करें</span>
                            </span>
                            <span className="text-blue-400">→</span>
                          </a>
                          <a 
                            href="/settings/devices" 
                            className="flex items-center gap-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            title="Add more biometric devices if needed | यदि आवश्यक हो तो और बायोमेट्रिक डिवाइस जोड़ें"
                          >
                            <span className="text-lg">📟</span>
                            <span className="flex-1">
                              <strong>Manage Devices</strong> - Add more biometric devices (optional)
                              <br/><span className="text-blue-600 text-xs">डिवाइस प्रबंधित करें - और बायोमेट्रिक डिवाइस जोड़ें (वैकल्पिक)</span>
                            </span>
                            <span className="text-blue-400">→</span>
                          </a>
                        </div>
                      </div>
                      
                      <button
                        onClick={closeImportModal}
                        className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                      >
                        ✓ Done
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={closeImportModal}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SALARY UPDATE MODAL ==================== */}
      {showSalaryUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Update Salary</h2>
                <p className="text-blue-100 text-sm">Upload Excel file to bulk update employee salaries</p>
              </div>
              <button
                onClick={closeSalaryUpdateModal}
                className="text-white/80 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 0: Select Biometric Device */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">🔐</div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Select Biometric Device</h3>
                    <p className="text-xs text-blue-700">Choose the device to filter employees</p>
                  </div>
                </div>
                <div className="max-w-md">
                  <select
                    className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    value={selectedSalaryDeviceId}
                    onChange={(e) => setSelectedSalaryDeviceId(e.target.value)}
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
                    <p className="mt-2 text-xs text-blue-600 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                      Loading devices...
                    </p>
                  )}
                  {!loadingDevices && devices.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      ⚠️ No biometric devices found. Please add a device in Settings → Biometric Devices first.
                    </p>
                  )}
                </div>
                {selectedSalaryDeviceId && (
                  <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded-lg text-xs text-blue-800">
                    💡 Employees from <strong>{devices.find(d => String(d.id) === selectedSalaryDeviceId)?.deviceName}</strong> will be included in the template.
                  </div>
                )}
              </div>

              {/* Step 1: Download Template */}
              <div className={`bg-green-50 rounded-xl p-4 border border-green-100 ${!selectedSalaryDeviceId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                  <h3 className="font-semibold text-green-900">Download Template</h3>
                </div>
                <p className="text-sm text-green-700 mb-3">Get the Excel template with employee codes, names, and current salary data. Fill in new values and upload.</p>
                {selectedSalaryDeviceId && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                    ✅ Template will include employees from: <strong>{devices.find(d => String(d.id) === selectedSalaryDeviceId)?.deviceName}</strong>
                  </div>
                )}
                <button
                  onClick={downloadSalaryTemplate}
                  disabled={!selectedSalaryDeviceId}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📥 Download Salary Template
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className={`bg-emerald-50 rounded-xl p-4 border border-emerald-100 ${!selectedSalaryDeviceId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                  <h3 className="font-semibold text-emerald-900">Upload Filled Template</h3>
                </div>
                
                {/* Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDraggingSalary ? "border-emerald-500 bg-emerald-100" : 
                    salaryUpdateFile ? "border-emerald-400 bg-white" : "border-emerald-300 hover:border-emerald-400 bg-white"
                  }`}
                  onDragEnter={handleSalaryDragIn}
                  onDragLeave={handleSalaryDragOut}
                  onDragOver={handleSalaryDrag}
                  onDrop={handleSalaryDrop}
                  onClick={() => salaryFileInputRef.current?.click()}
                >
                  <input
                    ref={salaryFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleSalaryFileSelect(e.target.files?.[0])}
                    className="hidden"
                  />
                  
                  {salaryUpdateFile ? (
                    <div className="space-y-2">
                      <div className="text-4xl">📄</div>
                      <p className="font-medium text-slate-800">{salaryUpdateFile.name}</p>
                      <p className="text-xs text-slate-500">{(salaryUpdateFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); resetSalaryUpdateModal(); }}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl">📁</div>
                      <p className="font-medium text-slate-700">Drag & drop or click to select</p>
                      <p className="text-xs text-slate-500">Supports .xlsx and .xls files</p>
                    </div>
                  )}
                </div>

                {/* Update Button */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleSalaryUpdateSubmit}
                    disabled={!salaryUpdateFile || updatingSalary}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                      !salaryUpdateFile || updatingSalary
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-emerald-500 text-white hover:bg-emerald-600"
                    }`}
                  >
                    {updatingSalary ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>💰 Update Salaries</>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 3: Results */}
              {salaryUpdateResult && (
                <div className={`rounded-xl p-4 border ${
                  salaryUpdateResult.success ? "bg-green-50 border-green-200" : 
                  salaryUpdateResult.updatedCount > 0 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold ${
                      salaryUpdateResult.success ? "bg-green-500" : salaryUpdateResult.updatedCount > 0 ? "bg-amber-500" : "bg-red-500"
                    }`}>3</div>
                    <h3 className={`font-semibold ${
                      salaryUpdateResult.success ? "text-green-900" : salaryUpdateResult.updatedCount > 0 ? "text-amber-900" : "text-red-900"
                    }`}>Update Results</h3>
                  </div>
                  
                  {salaryUpdateResult.updatedCount > 0 ? (
                    <p className="text-sm mb-4 text-green-700 font-medium">
                      ✅ Successfully updated {salaryUpdateResult.updatedCount} employee(s)!
                    </p>
                  ) : (
                    <p className="text-sm mb-4 text-red-700">{salaryUpdateResult.message || "Update failed"}</p>
                  )}
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-green-200">
                      <div className="text-2xl font-bold text-green-600">{salaryUpdateResult.updatedCount || 0}</div>
                      <div className="text-xs text-green-600 font-medium">✓ Updated</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-amber-200">
                      <div className="text-2xl font-bold text-amber-600">{salaryUpdateResult.skippedCount || 0}</div>
                      <div className="text-xs text-amber-600 font-medium">⏭ Skipped</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-red-200">
                      <div className="text-2xl font-bold text-red-600">{(salaryUpdateResult.errors?.length || 0)}</div>
                      <div className="text-xs text-red-600 font-medium">✗ Errors</div>
                    </div>
                  </div>
                  
                  {/* Errors */}
                  {salaryUpdateResult.errors && salaryUpdateResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-bold text-red-800 mb-2">Errors:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {salaryUpdateResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={closeSalaryUpdateModal}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

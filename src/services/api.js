// ===========================
// Centralized API Service
// Multi-tenant enabled
// ===========================

import { API_BASE } from '../utils/apiConfig';
// Don't use a default orgId - let backend resolve from TenantContext (JWT)
const DEFAULT_ORG_ID = '';

/**
 * Get current tenant ID from:
 * 1. Local storage (set after login)
 * 2. URL subdomain (only for known SaaS domains like *.chandrahr.in)
 * 3. Default fallback
 * Does NOT treat ngrok, localhost, or IP as tenant subdomains.
 */
function getCurrentTenantId() {
  const storedTenant = localStorage.getItem('hrms_tenant_id');
  if (storedTenant) return storedTenant;
  
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return DEFAULT_ORG_ID;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return DEFAULT_ORG_ID;
  if (hostname.includes('ngrok')) return DEFAULT_ORG_ID;
  if (hostname === 'chandrahr.in' || hostname === 'www.chandrahr.in') return DEFAULT_ORG_ID;
  
  // Only extract subdomain for known SaaS domain (*.chandrahr.in, *.hrms.in)
  const parts = hostname.split('.');
  if (parts.length >= 3 && !['www'].includes(parts[0])) {
    const baseDomain = parts.slice(-2).join('.');
    if (baseDomain === 'chandrahr.in' || baseDomain === 'hrms.in') {
      return parts[0].toUpperCase();
    }
  }
  
  return DEFAULT_ORG_ID;
}

/**
 * Set tenant ID (for admin switching between tenants)
 */
export function setTenantId(tenantId) {
  if (tenantId) {
    localStorage.setItem('hrms_tenant_id', tenantId);
  } else {
    localStorage.removeItem('hrms_tenant_id');
  }
}

/**
 * Get tenant ID (exported for use in components)
 */
export function getTenantId() {
  return getCurrentTenantId();
}

/**
 * Get access token from session storage
 */
function getAccessToken() {
  return sessionStorage.getItem('hrms_access_token');
}

/**
 * Export getToken as alias for getAccessToken (for components)
 */
export function getToken() {
  return getAccessToken();
}

/**
 * Handle 401 errors - redirect to login
 */
function handleUnauthorized() {
  sessionStorage.removeItem('hrms_access_token');
  localStorage.removeItem('hrms_user');
  // Redirect to login if not already there
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

// Helper for fetch with error handling, auth, and tenant header
async function fetchApi(url, options = {}) {
  const tenantId = getCurrentTenantId();
  const accessToken = getAccessToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId,
    ...options.headers,
  };
  
  // Add Authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for refresh token
  });
  
  // Handle 401 Unauthorized or 403 Forbidden (invalid/expired token)
  if (response.status === 401 || response.status === 403) {
    console.log(`🔒 Auth error (${response.status}), attempting token refresh...`);
    
    // Try to refresh token
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the request with new token
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryResponse = await fetch(url, { ...options, headers, credentials: 'include' });
      
      // If still getting auth error after refresh, redirect to login
      if (retryResponse.status === 401 || retryResponse.status === 403) {
        console.log('🔒 Still getting auth error after refresh, redirecting to login');
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`API error: ${retryResponse.statusText} - ${errorText}`);
      }
      return retryResponse.json();
    } else {
      console.log('🔒 Token refresh failed, redirecting to login');
      handleUnauthorized();
      throw new Error('Session expired. Please login again.');
    }
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

/**
 * Try to refresh access token
 */
async function tryRefreshToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': getCurrentTenantId(),
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
}

/**
 * Fetch with FormData (for file uploads) - includes auth, tenant header, and token refresh
 */
async function fetchFormData(url, formData, method = 'POST') {
  const tenantId = getCurrentTenantId();
  let accessToken = getAccessToken();
  
  const headers = {
    'X-Tenant-Id': tenantId,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  let response = await fetch(url, {
    method,
    headers,
    body: formData,
    credentials: 'include',
  });
  
  // Handle 401 Unauthorized or 403 Forbidden (expired token)
  if (response.status === 401 || response.status === 403) {
    console.log(`🔒 FormData auth error (${response.status}), attempting token refresh...`);
    
    // Try to refresh token
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Update token and retry
      accessToken = getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
      
      response = await fetch(url, {
        method,
        headers,
        body: formData,
        credentials: 'include',
      });
      
      // If still getting auth error after refresh, redirect to login
      if (response.status === 401 || response.status === 403) {
        console.log('🔒 Still getting auth error after refresh, redirecting to login');
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
    } else {
      console.log('🔒 Token refresh failed, redirecting to login');
      handleUnauthorized();
      throw new Error('Session expired. Please login again.');
    }
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

// =========== EMPLOYEES ===========
export const employeeApi = {
  getAll: () => fetchApi(`${API_BASE}/employees`),
  getById: (id) => fetchApi(`${API_BASE}/employees/${id}`),
  getByCode: (code) => fetchApi(`${API_BASE}/employees/code/${code}`),
  create: (data) => fetchApi(`${API_BASE}/employees`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`${API_BASE}/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateBankDetails: (empCode, data) =>
    fetchApi(`${API_BASE}/employees/${encodeURIComponent(empCode)}/bank-details`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** IFSC lookup: returns { bankName, branch } for auto-fill. */
  ifscLookup: (ifsc) => fetchApi(`${API_BASE}/ifsc-lookup?ifsc=${encodeURIComponent(String(ifsc || '').trim())}`),
  /** Bulk update OT allowed (for attendance admin). Body: { empCodes: string[], otAllowed: boolean } */
  bulkUpdateOtAllowed: (empCodes, otAllowed) =>
    fetchApi(`${API_BASE}/employees/ot-allowed`, { method: 'PATCH', body: JSON.stringify({ empCodes, otAllowed }) }),
  search: (query) => fetchApi(`${API_BASE}/employees/search?q=${encodeURIComponent(query)}`),
};

// =========== LOANS ===========
export const loanApi = {
  // Get all loans with optional filters
  getAll: (orgId = DEFAULT_ORG_ID, status = null) => 
    fetchApi(`${API_BASE}/loans?orgId=${orgId}${status ? `&status=${status}` : ''}`),
  
  getByEmployee: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loans?orgId=${orgId}&empId=${empId}`),
  
  getById: (id) => fetchApi(`${API_BASE}/loans/${id}`),
  
  create: (data) => fetchApi(`${API_BASE}/loans`, { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id, data) => fetchApi(`${API_BASE}/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  cancel: (id) => fetchApi(`${API_BASE}/loans/${id}`, { method: 'DELETE' }),
  
  delete: (id) => fetchApi(`${API_BASE}/loans/${id}/delete`, { method: 'DELETE' }),
  
  getEmiSchedule: (loanId) => fetchApi(`${API_BASE}/loans/${loanId}/schedule`),
  
  getEmployeeEmiTotal: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loans/employee/${empId}/emi-total?orgId=${orgId}`),
  
  getActiveLoans: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loans/employee/${empId}/active?orgId=${orgId}`),
  
  // Pay EMI manually
  payEmi: (loanId, data = {}) => 
    fetchApi(`${API_BASE}/loans/${loanId}/pay-emi`, { method: 'POST', body: JSON.stringify(data) }),
  
  // Partial payment for flexible loans
  partialPayment: (loanId, data) => 
    fetchApi(`${API_BASE}/loans/${loanId}/partial-payment`, { method: 'POST', body: JSON.stringify(data) }),
  
  // Get loan types for dropdown
  getLoanTypes: () => fetchApi(`${API_BASE}/loans/loan-types`),
  
  // EMI Calculator
  calculateEmi: (data) => 
    fetchApi(`${API_BASE}/loans/calculate-emi`, { method: 'POST', body: JSON.stringify(data) }),
  
  // Reports
  getSummary: (orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loan/reports/summary?orgId=${orgId}`),
  
  getActiveLoansReport: (orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loan/reports/active?orgId=${orgId}`),
  
  getEmployeeLoanReport: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loan/reports/employee/${empId}?orgId=${orgId}`),
  
  getMonthlyDeductions: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loan/reports/monthly-deductions?orgId=${orgId}&year=${year}&month=${month}`),
  
  getLoanRepayments: (loanId) => 
    fetchApi(`${API_BASE}/loan/reports/${loanId}/repayments`),
  
  getUpcomingDues: (days = 30, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loan/reports/upcoming-dues?orgId=${orgId}&days=${days}`),
};

// =========== PAYROLL ===========
export const payrollApi = {
  // Pre-check
  checkAttendance: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/check-attendance?orgId=${orgId}&year=${year}&month=${month}`),
  
  // Generation
  generate: async (year, month, orgId = DEFAULT_ORG_ID, deviceCode = null) => {
    const tenantId = getCurrentTenantId();
    const accessToken = getAccessToken();
    
    const headers = { 
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    };
    
    // Add Authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const deviceParam = deviceCode ? `&deviceCode=${encodeURIComponent(deviceCode)}` : '';
    const response = await fetch(`${API_BASE}/payroll/generate?orgId=${orgId}&year=${year}&month=${month}${deviceParam}`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      // Return the error info including attendance check message
      throw { ...data, isAttendanceError: data.available === false };
    }
    return data;
  },

  /** Generate payroll for selected employees only (e.g. after fixing missing punch). Body: { year, month, empCodes } — empCodes as strings. */
  generateBatch: async (year, month, empCodes, orgId = DEFAULT_ORG_ID) => {
    const tenantId = getCurrentTenantId();
    const accessToken = getAccessToken();
    const headers = { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const codes = Array.isArray(empCodes) ? empCodes.map((c) => String(c ?? '').trim()).filter(Boolean) : [];
    const response = await fetch(`${API_BASE}/payroll/generate/batch?orgId=${orgId}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ year, month, empCodes: codes }),
    });
    const data = await response.json();
    if (!response.ok) throw { ...data, isAttendanceError: data.available === false };
    return data;
  },
  
  generateForEmployee: (empId, year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/generate/${empId}?orgId=${orgId}&year=${year}&month=${month}`, { method: 'POST' }),
  
  // Retrieval
  getMonthly: (year, month, orgId = DEFAULT_ORG_ID, deviceCode = null) =>
    fetchApi(`${API_BASE}/payroll?orgId=${orgId}&year=${year}&month=${month}${deviceCode ? `&deviceCode=${encodeURIComponent(deviceCode)}` : ''}`),

  /** Employees who have attendance this month but no payroll yet (for "generate for selected" list) */
  getPendingEmployees: (year, month, orgId = DEFAULT_ORG_ID) =>
    fetchApi(`${API_BASE}/payroll/pending-employees?orgId=${orgId}&year=${year}&month=${month}`),
  
  getById: (id) => fetchApi(`${API_BASE}/payroll/${id}`),
  
  getDetails: (id) => fetchApi(`${API_BASE}/payroll/${id}/details`),
  
  getDetailed: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/detailed?orgId=${orgId}&year=${year}&month=${month}`),
  
  getPaid: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/paid?orgId=${orgId}&year=${year}&month=${month}`),
  
  getEmployeeHistory: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/employee/${empId}?orgId=${orgId}`),
  
  getSummary: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/summary?orgId=${orgId}&year=${year}&month=${month}`),
  
  getSkippedEmployees: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/skipped?orgId=${orgId}&year=${year}&month=${month}`),

  getBankTransferList: (year, month, orgId = DEFAULT_ORG_ID, deviceCode = null) =>
    fetchApi(`${API_BASE}/payroll/bank-transfer-list?orgId=${orgId}&year=${year}&month=${month}${deviceCode ? `&deviceCode=${encodeURIComponent(deviceCode)}` : ''}`),

  generateBankTransferPdf: async (payrollIds, amountType = 'NET', banksOnSeparatePages = []) => {
    const tenantId = getCurrentTenantId();
    const accessToken = getAccessToken();
    const headers = { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const list = Array.isArray(banksOnSeparatePages) ? banksOnSeparatePages : [];
    const response = await fetch(`${API_BASE}/payroll/bank-transfer-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ payrollIds, amountType: amountType.toUpperCase(), banksOnSeparatePages: list }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await response.text() || response.statusText);
    return response.blob();
  },

  // Update
  update: (id, data) => 
    fetchApi(`${API_BASE}/payroll/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  updateAdvance: (id, manualAdvance, remarks = '') => 
    fetchApi(`${API_BASE}/payroll/${id}/advance`, { 
      method: 'PUT', 
      body: JSON.stringify({ manualAdvance, remarks }) 
    }),
  
  updateDue: (id, due, remarks = '') => 
    fetchApi(`${API_BASE}/payroll/${id}/due`, { 
      method: 'PUT', 
      body: JSON.stringify({ due, remarks }) 
    }),
  
  updateFlexibleLoan: (id, amount, remarks = '') => 
    fetchApi(`${API_BASE}/payroll/${id}/flexible-loan`, { 
      method: 'PUT', 
      body: JSON.stringify({ amount, remarks }) 
    }),
  
  adjustLoan: (id, loanAmount, remarks = '') => 
    fetchApi(`${API_BASE}/payroll/${id}/adjust-loan`, { 
      method: 'PUT', 
      body: JSON.stringify({ loanAmount, remarks }) 
    }),
  
  // Approval
  approve: (id, approvedBy = '') => 
    fetchApi(`${API_BASE}/payroll/${id}/approve?approvedBy=${approvedBy}`, { method: 'POST' }),
  
  approveAll: (year, month, approvedBy = '', orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/approve-all?orgId=${orgId}&year=${year}&month=${month}&approvedBy=${approvedBy}`, { method: 'POST' }),
  
  // Payment
  markAsPaid: (id, paymentDetails) => 
    fetchApi(`${API_BASE}/payroll/${id}/pay`, { method: 'POST', body: JSON.stringify(paymentDetails) }),
  
  payAll: (year, month, paymentDetails, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/pay-all?orgId=${orgId}&year=${year}&month=${month}`, { 
      method: 'POST', 
      body: JSON.stringify(paymentDetails) 
    }),
  
  // Delete
  delete: (id) => fetchApi(`${API_BASE}/payroll/${id}`, { method: 'DELETE' }),
  
  deleteMonthly: (year, month, orgId = DEFAULT_ORG_ID, deviceCode = null) => {
    const deviceParam = deviceCode ? `&deviceCode=${encodeURIComponent(deviceCode)}` : '';
    return fetchApi(`${API_BASE}/payroll/month?orgId=${orgId}&year=${year}&month=${month}${deviceParam}`, { method: 'DELETE' });
  },
  
  // Export
  exportExcel: async (year, month, orgId = DEFAULT_ORG_ID) => {
    const tenantId = getCurrentTenantId();
    const accessToken = getAccessToken();
    
    const headers = { 
      'X-Tenant-Id': tenantId,
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${API_BASE}/payroll/export?orgId=${orgId}&year=${year}&month=${month}`, {
      method: 'GET',
      headers: headers,
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return await response.blob();
  },
};

// =========== ALLOWANCES (Dynamic allowance types & employee assignment) ===========
export const allowanceApi = {
  listTypes: (orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/allowances/types?orgId=${orgId}`),
  listAllTypes: (orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/allowances/types/all?orgId=${orgId}`),
  getAssignedEmployeeIds: (allowanceTypeId) =>
    fetchApi(`${API_BASE}/allowances/types/${allowanceTypeId}/assigned-employee-ids`),
  createType: (data) => 
    fetchApi(`${API_BASE}/allowances/types`, { method: 'POST', body: JSON.stringify(data) }),
  updateType: (id, data) => 
    fetchApi(`${API_BASE}/allowances/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteType: (id) => 
    fetchApi(`${API_BASE}/allowances/types/${id}`, { method: 'DELETE' }),
  listEmployeeAllowances: (employeeId) => 
    fetchApi(`${API_BASE}/allowances/employees/${employeeId}`),
  assignToEmployee: (data) => 
    fetchApi(`${API_BASE}/allowances/employees`, { method: 'POST', body: JSON.stringify(data) }),
  removeFromEmployee: (employeeId, allowanceTypeId) => 
    fetchApi(`${API_BASE}/allowances/employees/${employeeId}/allowance/${allowanceTypeId}`, { method: 'DELETE' }),
  bulkAssign: (allowanceTypeId, employeeIds) =>
    fetchApi(`${API_BASE}/allowances/bulk-assign`, { method: 'POST', body: JSON.stringify({ allowanceTypeId, employeeIds }) }),
  bulkRemove: (allowanceTypeId, employeeIds) =>
    fetchApi(`${API_BASE}/allowances/bulk-remove`, { method: 'POST', body: JSON.stringify({ allowanceTypeId, employeeIds }) }),
};

// =========== HOLIDAYS ===========
export const holidayApi = {
  getAll: (orgId = DEFAULT_ORG_ID, year = null) => 
    fetchApi(`${API_BASE}/holidays?orgId=${orgId}${year ? `&year=${year}` : ''}`),
  
  create: (data) => fetchApi(`${API_BASE}/holidays`, { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id, data) => fetchApi(`${API_BASE}/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id) => fetchApi(`${API_BASE}/holidays/${id}`, { method: 'DELETE' }),
  
  // Weekly Off Configuration
  getWeeklyOff: (orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/holidays/weekly-off?orgId=${orgId}`),
  
  saveWeeklyOff: (data) => fetchApi(`${API_BASE}/holidays/weekly-off`, { method: 'POST', body: JSON.stringify(data) }),
  
  checkDate: (date, empType = 'FULL_TIME', orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/holidays/check?orgId=${orgId}&date=${date}&empType=${empType}`),
};

// =========== REPORTS ===========
export const reportApi = {
  // Attendance Reports
  getMonthlyAttendance: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/attendance/monthly?orgId=${orgId}&year=${year}&month=${month}`),
  
  getDailyAttendance: (date, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/attendance/daily?orgId=${orgId}&date=${date}`),
  
  // Payroll Reports
  getSalarySheet: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/payroll/salary-sheet?orgId=${orgId}&year=${year}&month=${month}`),
  
  getEpfReport: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/payroll/epf?orgId=${orgId}&year=${year}&month=${month}`),
  
  getEsicReport: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/payroll/esic?orgId=${orgId}&year=${year}&month=${month}`),
  
  getPayslip: (empId, year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/payroll/payslip?orgId=${orgId}&empId=${empId}&year=${year}&month=${month}`),
  
  // Loan Reports
  getActiveLoans: (orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/loans/active?orgId=${orgId}`),
  
  getLoanDeductions: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/reports/loans/deductions?orgId=${orgId}&year=${year}&month=${month}`),
};

// =========== BIOMETRIC DEVICES ===========
export const devicesApi = {
  /** List all biometric devices for current tenant (for payroll device filter, etc.) */
  getList: (activeOnly = false) =>
    fetchApi(`${API_BASE}/devices?activeOnly=${activeOnly}`),
};

// =========== SHIFTS ===========
export const shiftApi = {
  getAll: () => fetchApi(`${API_BASE}/shifts`),
  getById: (id) => fetchApi(`${API_BASE}/shifts/${id}`),
  create: (data) => fetchApi(`${API_BASE}/shifts`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`${API_BASE}/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// =========== ATTENDANCE ===========
export const attendanceApi = {
  import: (file, month, year) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchFormData(`${API_BASE}/attendance/import?month=${month}&year=${year}`, formData);
  },
  
  getLogs: (year, month, empId = null, empCode = null) => {
    let url = `${API_BASE}/attendance/logs?year=${year}&month=${month}`;
    if (empId) url += `&empId=${empId}`;
    if (empCode) url += `&empCode=${empCode}`;
    return fetchApi(url);
  },
  
  getSummary: (year, month) => 
    fetchApi(`${API_BASE}/attendance/summary?year=${year}&month=${month}`),
  
  getEmployees: () => fetchApi(`${API_BASE}/attendance/employees`),
  
  getBatches: () => fetchApi(`${API_BASE}/attendance/import/batches`),
  
  deleteBatch: (batchId) => 
    fetchApi(`${API_BASE}/attendance/import/batches/${batchId}`, { method: 'DELETE' }),

  /** Returns dashboard data; totalIssues > 0 means unfixed missing punches for the month. Use cacheBust=true to force fresh data after fix. */
  getMissingPunchDashboard: (month, year, cacheBust = false) =>
    fetchApi(`${API_BASE}/attendance/missing-punch-dashboard?month=${month}&year=${year}${cacheBust ? `&_t=${Date.now()}` : ''}`),

  /** Download missing-punch fix template (Excel) for the selected month/year. Returns blob. */
  downloadMissingPunchTemplate: async (month, year) => {
    const tenantId = getCurrentTenantId();
    const token = getAccessToken();
    const r = await fetch(`${API_BASE}/attendance/missing-punch/template/download?month=${month}&year=${year}`, {
      headers: { 'X-Tenant-Id': tenantId, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
    });
    if (!r.ok) throw new Error(await r.text() || 'Download failed');
    return r.blob();
  },

  /** Import Excel to fix all missing punches at once. File must match the downloaded template. */
  importMissingPunchExcel: (file, month, year) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchFormData(`${API_BASE}/attendance/missing-punch/import?month=${month}&year=${year}`, formData);
  },
};

// =========== TENANT MANAGEMENT ===========
export const tenantApi = {
  // Get current tenant info
  getCurrent: () => fetchApi(`${API_BASE}/tenants/current`),
  
  // Get all tenants (admin only)
  getAll: () => fetchApi(`${API_BASE}/tenants`),
  
  // Get tenant by ID
  getById: (id) => fetchApi(`${API_BASE}/tenants/${id}`),
  
  // Create new tenant (super admin)
  create: (data) => fetchApi(`${API_BASE}/tenants`, { method: 'POST', body: JSON.stringify(data) }),
  
  // Update tenant
  update: (id, data) => fetchApi(`${API_BASE}/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  // Activate/Deactivate
  setActive: (id, active) => fetchApi(`${API_BASE}/tenants/${id}/active?active=${active}`, { method: 'PUT' }),
};

export default {
  employee: employeeApi,
  loan: loanApi,
  payroll: payrollApi,
  holiday: holidayApi,
  report: reportApi,
  shift: shiftApi,
  devices: devicesApi,
  attendance: attendanceApi,
  tenant: tenantApi,
  // Utilities
  getTenantId,
  setTenantId,
};

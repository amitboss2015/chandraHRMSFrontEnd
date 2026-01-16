// ===========================
// Centralized API Service
// Multi-tenant enabled
// ===========================

const API_BASE = 'http://localhost:8080/api';
const DEFAULT_ORG_ID = 'ORG001';

/**
 * Get current tenant ID from:
 * 1. Local storage (if set by admin)
 * 2. URL subdomain (for production)
 * 3. Default fallback
 */
function getCurrentTenantId() {
  // Check local storage first (for development/admin override)
  const storedTenant = localStorage.getItem('hrms_tenant_id');
  if (storedTenant) return storedTenant;
  
  // Try to extract from subdomain (production)
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const subdomain = parts[0].toLowerCase();
    // Skip common non-tenant subdomains
    if (!['www', 'api', 'admin', 'app', 'localhost', '127'].includes(subdomain)) {
      return subdomain;
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
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Try to refresh token
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the request with new token
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryResponse = await fetch(url, { ...options, headers, credentials: 'include' });
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`API error: ${retryResponse.statusText} - ${errorText}`);
      }
      return retryResponse.json();
    } else {
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
 * Fetch with FormData (for file uploads) - includes auth and tenant header
 */
async function fetchFormData(url, formData, method = 'POST') {
  const tenantId = getCurrentTenantId();
  const accessToken = getAccessToken();
  
  const headers = {
    'X-Tenant-Id': tenantId,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: formData,
    credentials: 'include',
  });
  
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please login again.');
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
  
  getEmiSchedule: (loanId) => fetchApi(`${API_BASE}/loans/${loanId}/schedule`),
  
  getEmployeeEmiTotal: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loans/employee/${empId}/emi-total?orgId=${orgId}`),
  
  getActiveLoans: (empId, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/loans/employee/${empId}/active?orgId=${orgId}`),
  
  // Pay EMI manually
  payEmi: (loanId, data = {}) => 
    fetchApi(`${API_BASE}/loans/${loanId}/pay-emi`, { method: 'POST', body: JSON.stringify(data) }),
  
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
  generate: async (year, month, orgId = DEFAULT_ORG_ID) => {
    const response = await fetch(`${API_BASE}/payroll/generate?orgId=${orgId}&year=${year}&month=${month}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
      // Return the error info including attendance check message
      throw { ...data, isAttendanceError: data.available === false };
    }
    return data;
  },
  
  generateForEmployee: (empId, year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll/generate/${empId}?orgId=${orgId}&year=${year}&month=${month}`, { method: 'POST' }),
  
  // Retrieval
  getMonthly: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll?orgId=${orgId}&year=${year}&month=${month}`),
  
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
  
  deleteMonthly: (year, month, orgId = DEFAULT_ORG_ID) => 
    fetchApi(`${API_BASE}/payroll?orgId=${orgId}&year=${year}&month=${month}`, { method: 'DELETE' }),
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
  attendance: attendanceApi,
  tenant: tenantApi,
  // Utilities
  getTenantId,
  setTenantId,
};

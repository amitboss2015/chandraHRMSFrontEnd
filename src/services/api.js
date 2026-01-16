// ===========================
// Centralized API Service
// ===========================

const API_BASE = 'http://localhost:8080/api';
const DEFAULT_ORG_ID = 'ORG001';

// Helper for fetch with error handling
async function fetchApi(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
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
    return fetch(`${API_BASE}/attendance/import?month=${month}&year=${year}`, { 
      method: 'POST', 
      body: formData 
    }).then(r => r.json());
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

export default {
  employee: employeeApi,
  loan: loanApi,
  payroll: payrollApi,
  holiday: holidayApi,
  report: reportApi,
  shift: shiftApi,
  attendance: attendanceApi,
};

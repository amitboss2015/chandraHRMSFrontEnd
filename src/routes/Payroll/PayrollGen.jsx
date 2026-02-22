// PayrollGen.jsx - Enhanced Payroll Generation with Attendance Check, Loan/Advance Details
import React, { useState, useEffect } from "react";
import { payrollApi, loanApi, getTenantId, getToken } from "../../services/api";
import { usePeriodSelection } from "../../utils/monthYearState";
import { API_BASE } from "../../utils/apiConfig";

function PayrollGen() {
  // Use shared month/year selection that persists across pages
  const { month, year, setMonth, setYear } = usePeriodSelection();
  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Edit modal removed - loans managed in loan management screen
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [attendanceCheck, setAttendanceCheck] = useState(null);
  const [skippedEmployees, setSkippedEmployees] = useState(null);
  const [showSkippedModal, setShowSkippedModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMode: 'BANK_TRANSFER',
    transactionReference: '',
    bankName: '',
    bankAccount: '',
    upiId: '',
    chequeNumber: '',
    paidBy: ''
  });
  const [pendingDues, setPendingDues] = useState([]);
  const [showAddDueModal, setShowAddDueModal] = useState(false);
  const [showManageDuesModal, setShowManageDuesModal] = useState(false);
  const [selectedPayrollForDues, setSelectedPayrollForDues] = useState(null);
  const [allDues, setAllDues] = useState([]);
  const [selectedPayrollIds, setSelectedPayrollIds] = useState([]);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  const [payslipPdfUrl, setPayslipPdfUrl] = useState(null);
  const [showPayslipViewer, setShowPayslipViewer] = useState(false);
  const [newDue, setNewDue] = useState({
    amount: '',
    description: '',
    period: '',
    remarks: ''
  });
  // Edit modal removed - loans managed in loan management screen

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.getMonthly(year, month);
      setPayrolls(data);
      
      if (data.length > 0) {
        const summaryData = await payrollApi.getSummary(year, month);
        setSummary(summaryData);
        
        // Load skipped employees info
        try {
          const skipped = await payrollApi.getSkippedEmployees(year, month);
          setSkippedEmployees(skipped);
        } catch (e) {
          console.error('Failed to load skipped employees:', e);
        }
      } else {
        setSummary(null);
        setSkippedEmployees(null);
        // Check attendance availability if no payrolls exist
        try {
          const check = await payrollApi.checkAttendance(year, month);
          setAttendanceCheck(check);
        } catch (e) {
          console.error('Failed to check attendance:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load payrolls:', error);
      setMessage({ type: 'error', text: 'Failed to load payroll data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, [year, month]);

  const generatePayroll = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      await payrollApi.generate(year, month);
      setMessage({ type: 'success', text: 'Payroll generated successfully!' });
      setAttendanceCheck(null);
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to generate payroll:', error);
      if (error.isAttendanceError) {
        setMessage({ 
          type: 'error', 
          text: error.message || `Attendance not uploaded for ${getMonthName(month)} ${year}. Please upload attendance before generating payroll.`
        });
        setAttendanceCheck(error);
      } else {
        setMessage({ type: 'error', text: 'Failed to generate payroll. Please try again.' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const approvePayroll = async (id) => {
    try {
      await payrollApi.approve(id);
      setMessage({ type: 'success', text: 'Payroll approved!' });
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to approve payroll:', error);
      setMessage({ type: 'error', text: 'Failed to approve payroll' });
    }
  };

  const approveAll = async () => {
    try {
      await payrollApi.approveAll(year, month);
      setMessage({ type: 'success', text: 'All payrolls approved!' });
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to approve all:', error);
      setMessage({ type: 'error', text: 'Failed to approve all payrolls' });
    }
  };

  const openPaymentModal = async (payroll) => {
    setSelectedPayroll(payroll);
    
    // Fetch employee details to get UPI ID
    let employeeUpiId = '';
    try {
      const employee = await fetch(`${API_BASE}/employees/${payroll.empId}`, {
        headers: {
          'X-Tenant-Id': getTenantId(),
          'Authorization': `Bearer ${getToken()}`
        }
      }).then(res => res.ok ? res.json() : null);
      
      if (employee && employee.upiId) {
        employeeUpiId = employee.upiId;
      }
    } catch (error) {
      console.error('Failed to fetch employee UPI ID:', error);
    }
    
    // Fetch pending dues
    try {
      const dues = await fetch(`${API_BASE}/payroll/due/${payroll.empId}`, {
        headers: {
          'X-Tenant-Id': getTenantId(),
          'Authorization': `Bearer ${getToken()}`
        }
      }).then(res => res.ok ? res.json() : []);
      setPendingDues(dues || []);
    } catch (error) {
      console.error('Failed to fetch pending dues:', error);
      setPendingDues([]);
    }
    
    setPaymentDetails({
      paymentMode: 'UPI',
      transactionReference: '',
      bankName: '',
      bankAccount: '',
      upiId: employeeUpiId,
      chequeNumber: '',
      paidBy: ''
    });
    setShowPaymentModal(true);
  };

  const openManageDuesModal = async (payroll) => {
    console.log('Opening manage dues modal for:', payroll);
    setSelectedPayrollForDues(payroll);
    setShowManageDuesModal(true); // Open modal immediately
    
    // Fetch all dues (pending and paid) for this employee
    try {
      const response = await fetch(`${API_BASE}/payroll/due/${payroll.empId}/all`, {
        headers: {
          'X-Tenant-Id': getTenantId(),
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (response.ok) {
        const dues = await response.json();
        setAllDues(dues || []);
        console.log('Fetched dues:', dues);
      } else {
        console.error('Failed to fetch dues, status:', response.status);
        setAllDues([]);
      }
    } catch (error) {
      console.error('Failed to fetch dues:', error);
      setAllDues([]);
    }
  };

  const handleGeneratePayslip = async () => {
    if (selectedPayrollIds.length === 0) {
      alert('Please select at least one payroll to generate payslip');
      return;
    }
    
    setIsGeneratingPayslip(true);
    try {
      // Call bulk payslip endpoint
      const response = await fetch(`${API_BASE}/payroll/payslips/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': getTenantId(),
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(selectedPayrollIds)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Set PDF URL and show viewer instead of downloading
        setPayslipPdfUrl(url);
        setShowPayslipViewer(true);
        setMessage({ type: 'success', text: `Combined payslip generated for ${selectedPayrollIds.length} employee(s)` });
      } else {
        const errorText = await response.text();
        console.error('Failed to generate payslip:', errorText);
        setMessage({ type: 'error', text: 'Failed to generate payslip. Please try again.' });
      }
    } catch (error) {
      console.error('Failed to generate payslip:', error);
      setMessage({ type: 'error', text: 'Failed to generate payslip. Please try again.' });
    } finally {
      setIsGeneratingPayslip(false);
    }
  };

  const closePayslipViewer = () => {
    if (payslipPdfUrl) {
      window.URL.revokeObjectURL(payslipPdfUrl);
      setPayslipPdfUrl(null);
    }
    setShowPayslipViewer(false);
  };

  const downloadPayslip = () => {
    if (payslipPdfUrl) {
      const a = document.createElement('a');
      a.href = payslipPdfUrl;
      a.download = `Combined_Payslips_${getMonthName(month)}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleAddDue = async () => {
    const payroll = selectedPayrollForDues || selectedPayroll;
    if (!payroll || !newDue.amount || !newDue.description) {
      alert('Please enter amount and description');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/payroll/due`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': getTenantId(),
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          empId: payroll.empId,
          amount: parseFloat(newDue.amount),
          description: newDue.description,
          period: newDue.period || `${getMonthName(month)} ${year}`,
          remarks: newDue.remarks,
          createdBy: 'Admin'
        })
      });
      
      if (!response.ok) throw new Error('Failed to add due');
      
      // Refresh dues list
      const dues = await fetch(`${API_BASE}/payroll/due/${payroll.empId}/all`, {
        headers: {
          'X-Tenant-Id': getTenantId(),
          'Authorization': `Bearer ${getToken()}`
        }
      }).then(res => res.ok ? res.json() : []);
      setAllDues(dues || []);
      
      // Refresh pending dues for payment modal if open
      if (selectedPayroll) {
        const pendingDues = await fetch(`${API_BASE}/payroll/due/${payroll.empId}`, {
          headers: {
            'X-Tenant-Id': getTenantId(),
            'Authorization': `Bearer ${getToken()}`
          }
        }).then(res => res.ok ? res.json() : []);
        setPendingDues(pendingDues || []);
      }
      
      // Recalculate payroll to update DUE column
      try {
        // Get current payroll
        const currentPayroll = await fetch(`${API_BASE}/payroll/${payroll.id}`, {
          headers: {
            'X-Tenant-Id': getTenantId(),
            'Authorization': `Bearer ${getToken()}`
          }
        }).then(res => res.ok ? res.json() : null);
        
        if (currentPayroll && currentPayroll.status === 'DRAFT') {
          // Trigger payroll recalculation by regenerating
          await payrollApi.generateForEmployee(payroll.empId, year, month);
        }
      } catch (error) {
        console.error('Failed to recalculate payroll:', error);
      }
      
      // Reload payrolls to update DUE column
      await loadPayrolls();
      
      // Reset form
      setNewDue({ amount: '', description: '', period: '', remarks: '' });
      setShowAddDueModal(false);
      setMessage({ type: 'success', text: 'Due added successfully! Payroll will be recalculated.' });
    } catch (error) {
      console.error('Failed to add due:', error);
      setMessage({ type: 'error', text: 'Failed to add due' });
    }
  };

  const processPayment = async () => {
    try {
      await payrollApi.markAsPaid(selectedPayroll.id, paymentDetails);
      setMessage({ type: 'success', text: `Payment processed for ${selectedPayroll.empName}!` });
      setShowPaymentModal(false);
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to process payment:', error);
      setMessage({ type: 'error', text: 'Failed to process payment' });
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await payrollApi.exportExcel(year, month);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payroll_${String(month).padStart(2, '0')}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: 'Payroll exported successfully!' });
    } catch (error) {
      console.error('Failed to export payroll:', error);
      setMessage({ type: 'error', text: 'Failed to export payroll: ' + (error.message || 'Unknown error') });
    }
  };

  const processAllPayments = async () => {
    try {
      await payrollApi.payAll(year, month, paymentDetails);
      setMessage({ type: 'success', text: 'All payments processed!' });
      setShowPaymentModal(false);
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to process all payments:', error);
      setMessage({ type: 'error', text: 'Failed to process payments' });
    }
  };

  // Edit modal removed - loans managed in loan management screen

  const viewDetails = async (payroll) => {
    try {
      const details = await payrollApi.getDetails(payroll.id);
      setPayrollDetails(details);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to load details:', error);
      setMessage({ type: 'error', text: 'Failed to load payroll details' });
    }
  };

  // Edit functionality removed - loans managed in loan management screen

  const deletePayroll = async (id) => {
    if (!confirm('Are you sure you want to delete this payroll?')) return;
    try {
      await payrollApi.delete(id);
      setMessage({ type: 'success', text: 'Payroll deleted!' });
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to delete payroll:', error);
      setMessage({ type: 'error', text: 'Cannot delete payroll (must be in DRAFT status)' });
    }
  };

  const deleteAllPayrolls = async () => {
    if (!confirm('Are you sure you want to delete ALL payrolls for this month?')) return;
    try {
      const result = await payrollApi.deleteMonthly(year, month);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'All payrolls deleted!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete payrolls' });
      }
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to delete payrolls:', error);
      const errorMsg = error.error || error.message || 'Cannot delete payrolls (all must be in DRAFT status)';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const getMonthName = (m) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1];
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      GENERATED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.DRAFT}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Month:</label>
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border rounded px-3 py-2 bg-white"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Year:</label>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border rounded px-3 py-2 bg-white"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={generatePayroll}
          disabled={generating}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50 font-medium"
        >
          {generating ? '⏳ Generating...' : '📊 Generate Payroll'}
        </button>
        {payrolls.length > 0 && (
          <>
            <button
              onClick={approveAll}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
            >
              ✓ Approve All
            </button>
            {/* Pay All feature disabled - will be launched later */}
            {/* <button
              onClick={() => { setSelectedPayroll(null); setShowPaymentModal(true); }}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium"
            >
              💳 Pay All
            </button> */}
            <button
              onClick={handleExportExcel}
              disabled={payrolls.length === 0}
              className={`px-4 py-2 rounded font-medium flex items-center gap-2 ${
                payrolls.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title="Export payroll to Excel"
            >
              📥 Export Excel
            </button>
            <button
              onClick={deleteAllPayrolls}
              className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 font-medium"
            >
              🗑️ Delete All
            </button>
          </>
        )}
        <button
          onClick={loadPayrolls}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Attendance Warning */}
      {attendanceCheck && !attendanceCheck.available && payrolls.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold text-yellow-800">Attendance Not Uploaded</h4>
              <p className="text-yellow-700 mt-1">{attendanceCheck.message}</p>
              <div className="mt-2 text-sm text-yellow-600">
                <span>Total Employees: {attendanceCheck.totalEmployees}</span>
                <span className="mx-2">|</span>
                <span>With Attendance: {attendanceCheck.employeesWithAttendance}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 
          'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 uppercase">Employees</p>
            <p className="text-2xl font-bold text-blue-600">{summary.employeeCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-xs text-gray-500 uppercase">Gross Salary</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalGrossSalary)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-xs text-gray-500 uppercase">Deductions</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.totalDeductions)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-xs text-gray-500 uppercase">Net Salary</p>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(summary.totalNetSalary)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500">
            <p className="text-xs text-gray-500 uppercase">PF (Own + Co.)</p>
            <p className="text-lg font-bold text-teal-600">
              {formatCurrency((summary.totalPfEmployee || 0) + (summary.totalPfCompany || 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-pink-500">
            <p className="text-xs text-gray-500 uppercase">ESI</p>
            <p className="text-lg font-bold text-pink-600">{formatCurrency(summary.totalEsi)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-amber-500">
            <p className="text-xs text-gray-500 uppercase">Loan/ADV</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.totalAdvance)}</p>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {summary && (
        <div className="flex gap-4 mb-4 items-center">
          <div className="flex gap-4 text-sm">
            <span className="bg-gray-100 px-3 py-1 rounded">Draft: {summary.draftCount || 0}</span>
            <span className="bg-blue-100 px-3 py-1 rounded">Approved: {summary.approvedCount || 0}</span>
            <span className="bg-green-100 px-3 py-1 rounded">Paid: {summary.paidCount || 0}</span>
          </div>
          {selectedPayrollIds.length > 0 && (
            <button
              onClick={handleGeneratePayslip}
              disabled={isGeneratingPayslip}
              className="ml-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingPayslip ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>Generate Payslip ({selectedPayrollIds.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Skipped Employees Note */}
      {skippedEmployees && skippedEmployees.skippedCount > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">ℹ️</span>
              <span className="text-sm text-gray-700">
                <strong>{skippedEmployees.skippedCount} employee(s)</strong> not included in payroll due to no attendance for this month.
              </span>
            </div>
            <button 
              onClick={() => setShowSkippedModal(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              View List
            </button>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-lg">No payroll data for {getMonthName(month)} {year}</p>
          <p className="text-sm mt-2">Click "Generate Payroll" to create payroll for this month.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-lg">
              Payment Sheet - {getMonthName(month)} {year}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Review and verify payroll details. Click on employee row to view loan/leave details.
            </p>
            
            {/* Bilingual Instructions - Loan Adjustment */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Loan Adjustment Information / ऋण समायोजन जानकारी:
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                    <li>
                      <strong>English:</strong> Loan deduction is automatically adjusted to prevent negative net salary. 
                      If scheduled loan exceeds available balance, only the maximum deductible amount is deducted. 
                      Remaining loan balance stays outstanding and will be adjusted in future payrolls.
                    </li>
                    <li>
                      <strong>Hindi:</strong> नेगेटिव नेट सैलरी को रोकने के लिए ऋण कटौती स्वचालित रूप से समायोजित की जाती है। 
                      यदि निर्धारित ऋण उपलब्ध बैलेंस से अधिक है, तो केवल अधिकतम कटौती योग्य राशि काटी जाती है। 
                      शेष ऋण बैलेंस बकाया रहता है और भविष्य के पेरोल में समायोजित किया जाएगा।
                    </li>
                    <li className="mt-2">
                      <strong>For Non-EMI Loans:</strong> Admin can manually type the loan amount to deduct in the loan management screen.
                      <strong> / गैर-EMI ऋण के लिए:</strong> व्यवस्थापक लोन मैनेजमेंट स्क्रीन में कटौती करने के लिए ऋण राशि मैन्युअल रूप से टाइप कर सकता है।
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={payrolls.length > 0 && selectedPayrollIds.length === payrolls.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayrollIds(payrolls.map(p => p.id));
                        } else {
                          setSelectedPayrollIds([]);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      className="cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="px-2 py-3 text-left">SR.</th>
                  <th className="px-2 py-3 text-left">EMP NAME</th>
                  <th className="px-2 py-3 text-left">EMP ID</th>
                  <th className="px-2 py-3 text-right">BASIC</th>
                  <th className="px-2 py-3 text-right">Allowance</th>
                  <th className="px-2 py-3 text-right">FINAL PAY</th>
                  <th className="px-2 py-3 text-center">W.DAY</th>
                  <th className="px-2 py-3 text-center">PRES.</th>
                  <th className="px-2 py-3 text-center">ABS.</th>
                  <th className="px-2 py-3 text-right">W.DAY AMT</th>
                  <th className="px-2 py-3 text-center" title="OT Days (worked on holiday/weekly off)">OT DAY</th>
                  <th className="px-2 py-3 text-center" title="OT Hours (extra hours worked)">OT HRS</th>
                  <th className="px-2 py-3 text-right" title="OT Day Amount">OT DAY AMT</th>
                  <th className="px-2 py-3 text-right" title="OT Hour Amount">OT HR AMT</th>
                  <th className="px-2 py-3 text-center bg-green-600 text-white" title="Paid Leave Days">PAID LEAVE</th>
                  <th className="px-2 py-3 text-right bg-green-600 text-white" title="Paid Leave Charges">PAID LEAVE CHG</th>
                  <th className="px-2 py-3 text-center bg-orange-600 text-white" title="Late Hours">LATE HRS</th>
                  <th className="px-2 py-3 text-right bg-orange-600 text-white" title="Late Hour Charges (deduction)">LATE CHG</th>
                  <th className="px-2 py-3 text-center bg-orange-500 text-white" title="Early Checkout Hours">EARLY HRS</th>
                  <th className="px-2 py-3 text-right bg-orange-500 text-white" title="Early Checkout Charges (deduction)">EARLY CHG</th>
                  <th className="px-2 py-3 text-right bg-green-700">GROSS</th>
                  <th className="px-2 py-3 text-right" title="ESI 0.75% (if salary ≤ ₹21,000)">ESI</th>
                  <th className="px-2 py-3 text-right" title="PF Employee 6%">PF OWN</th>
                  <th className="px-2 py-3 text-right" title="PF Company 6%">PF CO.</th>
                  <th className="px-2 py-3 text-right bg-amber-600">LOAN EMI</th>
                  <th className="px-2 py-3 text-right bg-orange-600">ADV</th>
                  <th className="px-2 py-3 text-right">DUE</th>
                  <th className="px-2 py-3 text-right bg-blue-700">NET SAL</th>
                  <th className="px-2 py-3 text-left">REMARKS</th>
                  <th className="px-2 py-3 text-center">UPI ID</th>
                  <th className="px-2 py-3 text-center">STATUS</th>
                  <th className="px-2 py-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payrolls.map((p, idx) => (
                  <tr 
                    key={p.id} 
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer`}
                    onClick={() => viewDetails(p)}
                  >
                    <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPayrollIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayrollIds([...selectedPayrollIds, p.id]);
                          } else {
                            setSelectedPayrollIds(selectedPayrollIds.filter(id => id !== p.id));
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-2 font-medium">{idx + 1}</td>
                    <td className="px-2 py-2 font-medium text-gray-900">{p.empName || p.empId}</td>
                    <td className="px-2 py-2 text-gray-600">{p.empId}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(p.basicSalary)}</td>
                    <td className="px-2 py-2 text-right text-purple-600">{formatCurrency(p.increment)}</td>
                    <td className="px-2 py-2 text-right font-medium">{formatCurrency(p.finalPayment)}</td>
                    <td className="px-2 py-2 text-center">{p.totalWorkingDays || 0}</td>
                    <td className="px-2 py-2 text-center font-medium text-green-600">{p.presentDays || 0}</td>
                    <td className="px-2 py-2 text-center text-red-600">{p.absentDays || 0}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(p.workingDayAmount)}</td>
                    <td className="px-2 py-2 text-center">{p.overtimeDays || 0}</td>
                    <td className="px-2 py-2 text-center">{p.overtimeHours ? parseFloat(p.overtimeHours).toFixed(2) : '0.00'}</td>
                    <td className="px-2 py-2 text-right text-indigo-600">{formatCurrency(p.overtimeDayAmount)}</td>
                    <td className="px-2 py-2 text-right text-indigo-600">{formatCurrency(p.overtimeHourAmount)}</td>
                    <td className="px-2 py-2 text-center bg-green-50 text-green-700 font-medium">
                      {p.paidLeaveDays || 0}
                    </td>
                    <td className="px-2 py-2 text-right bg-green-50 text-green-700 font-medium">
                      {formatCurrency(p.paidLeaveCharges || 0)}
                    </td>
                    <td className="px-2 py-2 text-center bg-orange-50 text-orange-700 font-medium">
                      {p.totalLateHours ? parseFloat(p.totalLateHours).toFixed(2) : '0.00'}
                    </td>
                    <td className="px-2 py-2 text-right bg-orange-50 text-orange-700 font-medium">
                      {formatCurrency(p.lateHourCharges)}
                    </td>
                    <td className="px-2 py-2 text-center bg-orange-50 text-orange-700 font-medium">
                      {p.totalEarlyHours ? parseFloat(p.totalEarlyHours).toFixed(2) : '0.00'}
                    </td>
                    <td className="px-2 py-2 text-right bg-orange-50 text-orange-700 font-medium">
                      {formatCurrency(p.earlyHourCharges || 0)}
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-50">
                      {formatCurrency(p.grossSalary)}
                    </td>
                    <td className="px-2 py-2 text-right text-red-600">{formatCurrency(p.esiEmployee)}</td>
                    <td className="px-2 py-2 text-right text-red-600">{formatCurrency(p.pfEmployee)}</td>
                    <td className="px-2 py-2 text-right text-red-600">{formatCurrency(p.pfCompany)}</td>
                    <td className="px-2 py-2 text-right text-amber-700 bg-amber-50 font-medium">
                      {formatCurrency(p.loanDeduction)}
                    </td>
                    <td className="px-2 py-2 text-right text-orange-700 bg-orange-50">
                      {formatCurrency(p.advance)}
                    </td>
                    <td 
                      className={`px-2 py-2 text-right ${p.status === 'DRAFT' ? 'cursor-pointer hover:bg-blue-100 text-blue-700 font-medium relative group' : 'text-red-600'}`}
                      onClick={e => {
                        e.stopPropagation();
                        if (p.status === 'DRAFT') {
                          console.log('DUE column clicked for payroll:', p);
                          openManageDuesModal(p);
                        }
                      }}
                      title={p.status === 'DRAFT' ? 'Click to add/manage pending dues' : ''}
                    >
                      {p.status === 'DRAFT' ? (
                        <span className="flex items-center justify-end gap-1 hover:text-blue-900">
                          {formatCurrency(p.due)}
                          <span className="text-xs opacity-70 group-hover:opacity-100">✏️</span>
                        </span>
                      ) : (
                        formatCurrency(p.due)
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-blue-700 bg-blue-50">
                      {formatCurrency(p.netSalary)}
                    </td>
                    <td className="px-2 py-2 text-left text-xs text-gray-600 max-w-[120px] truncate" title={p.remarks || ''}>
                      {p.remarks || '-'}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-600">
                      {p.upiId ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded" title={p.upiId}>
                          {p.upiId.length > 15 ? p.upiId.substring(0, 15) + '...' : p.upiId}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                        {p.status === 'DRAFT' && (
                          <>
                            {/* Edit button removed - loans managed in loan management screen */}
                            <button 
                              onClick={() => approvePayroll(p.id)}
                              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button 
                              onClick={() => deletePayroll(p.id)}
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {p.status === 'APPROVED' && (
                          <button 
                            onClick={() => openPaymentModal(p)}
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            title="Process Payment"
                          >
                            💳 Pay
                          </button>
                        )}
                        {p.status === 'PAID' && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            ✓ {p.paymentMode || 'Paid'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals Row */}
              <tfoot className="bg-slate-100 font-bold">
                <tr>
                  <td colSpan={9} className="px-2 py-3 text-right">TOTALS:</td>
                  <td className="px-2 py-3 text-right">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.workingDayAmount || 0), 0))}
                  </td>
                  <td></td>{/* OT Days - no sum */}
                  <td className="px-2 py-3 text-center">
                    {payrolls.reduce((s, p) => s + parseFloat(p.overtimeHours || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-right text-indigo-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.overtimeDayAmount || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-indigo-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.overtimeHourAmount || 0), 0))}
                  </td>
                  {/* Paid Leave Totals */}
                  <td className="px-2 py-3 text-center bg-green-100 text-green-700">
                    {payrolls.reduce((s, p) => s + (p.paidLeaveDays || 0), 0)}
                  </td>
                  <td className="px-2 py-3 text-right bg-green-100 text-green-700">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.paidLeaveCharges || 0), 0))}
                  </td>
                  {/* Late Hours Totals */}
                  <td className="px-2 py-3 text-center bg-orange-100 text-orange-700">
                    {payrolls.reduce((s, p) => s + parseFloat(p.totalLateHours || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-right bg-orange-100 text-orange-700">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.lateHourCharges || 0), 0))}
                  </td>
                  {/* Early Hours Totals */}
                  <td className="px-2 py-3 text-center bg-orange-100 text-orange-700">
                    {payrolls.reduce((s, p) => s + parseFloat(p.totalEarlyHours || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-right bg-orange-100 text-orange-700">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.earlyHourCharges || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-green-700 bg-green-100">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-red-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.esiEmployee || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-red-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.pfEmployee || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-red-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.pfCompany || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-amber-700 bg-amber-100">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.loanDeduction || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-orange-700 bg-orange-100">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.advance || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-red-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.due || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-blue-700 bg-blue-100">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.netSalary || 0), 0))}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && payrollDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0">
              <div>
                <h3 className="text-lg font-bold">Payroll Details - {payrollDetails.empName}</h3>
                <p className="text-sm text-gray-500">Emp Code: {payrollDetails.empId} | {getMonthName(payrollDetails.month)} {payrollDetails.year}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Salary Structure */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-3">💰 Salary Structure</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-blue-600">Basic Salary</span>
                    <p className="font-bold">{formatCurrency(payrollDetails.salaryStructure?.basicSalary)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-blue-600">Allowance</span>
                    <p className="font-bold">{formatCurrency(payrollDetails.salaryStructure?.increment)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-blue-600">Final Payment</span>
                    <p className="font-bold text-lg">{formatCurrency(payrollDetails.salaryStructure?.finalPayment)}</p>
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-bold text-green-800 mb-3">📅 Attendance Summary</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-green-600">Working Days</span>
                    <p className="font-bold">{payrollDetails.attendance?.totalWorkingDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Present</span>
                    <p className="font-bold text-green-700">{payrollDetails.attendance?.presentDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Absent</span>
                    <p className="font-bold text-red-600">{payrollDetails.attendance?.absentDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Late Days</span>
                    <p className="font-bold text-yellow-600">{payrollDetails.attendance?.lateDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Half Days</span>
                    <p className="font-bold">{payrollDetails.attendance?.halfDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Weekly Offs</span>
                    <p className="font-bold">{payrollDetails.attendance?.weeklyOffDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">Holidays</span>
                    <p className="font-bold">{payrollDetails.attendance?.holidayDays}</p>
                  </div>
                  <div>
                    <span className="text-sm text-green-600">OT Days/Hours</span>
                    <p className="font-bold">{payrollDetails.attendance?.overtimeDays} / {payrollDetails.attendance?.overtimeHours}h</p>
                  </div>
                </div>
                {/* Late Hours Row */}
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-orange-200">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <span className="text-sm text-orange-600">Late Days</span>
                    <p className="font-bold text-orange-700">{payrollDetails.attendance?.lateDays || 0}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <span className="text-sm text-orange-600">Total Late Hours</span>
                    <p className="font-bold text-orange-700">{payrollDetails.attendance?.totalLateHours || 0}h</p>
                  </div>
                </div>
                {/* Early Checkout Row */}
                {(payrollDetails.attendance?.earlyOutDays > 0 || payrollDetails.attendance?.totalEarlyHours > 0) && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-orange-200">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <span className="text-sm text-orange-600">Early Out Days</span>
                      <p className="font-bold text-orange-700">{payrollDetails.attendance?.earlyOutDays || 0}</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <span className="text-sm text-orange-600">Total Early Hours</span>
                      <p className="font-bold text-orange-700">{payrollDetails.attendance?.totalEarlyHours || 0}h</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loan Info */}
              {payrollDetails.loanInfo && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-bold text-amber-800 mb-3">🏦 Loan Information</h4>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm text-amber-600">Active Loans</span>
                      <p className="font-bold text-lg">{payrollDetails.loanInfo?.activeLoansCount}</p>
                    </div>
                    <div>
                      <span className="text-sm text-amber-600">Monthly EMI Deduction</span>
                      <p className="font-bold text-lg text-amber-700">{formatCurrency(payrollDetails.loanInfo?.monthlyEmi)}</p>
                    </div>
                  </div>
                  {payrollDetails.loanInfo?.activeLoans?.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium text-amber-700 mb-2">Loan Details:</p>
                      <div className="space-y-2">
                        {payrollDetails.loanInfo.activeLoans.map((loan, i) => (
                          <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                            <span>{loan.loanType}</span>
                            <span>EMI: {formatCurrency(loan.emiAmount)}</span>
                            <span>Outstanding: {formatCurrency(loan.outstandingBalance)}</span>
                            <span>{loan.emisPaid}/{loan.tenureMonths} EMIs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advance and Due */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-bold text-orange-800 mb-3">💸 Advance & Due</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-orange-600">Loan EMI (in ADV)</span>
                    <p className="font-bold text-amber-700">{formatCurrency(payrollDetails.advanceAndDue?.loanEmiInAdvance)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-orange-600">Manual Advance</span>
                    <p className="font-bold">{formatCurrency(payrollDetails.advanceAndDue?.manualAdvance)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-orange-600">Total ADV</span>
                    <p className="font-bold text-orange-700">{formatCurrency(payrollDetails.advanceAndDue?.advance)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-orange-600">Due</span>
                    <p className="font-bold text-red-600">{formatCurrency(payrollDetails.advanceAndDue?.due)}</p>
                  </div>
                </div>
              </div>

              {/* Net Calculation */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold text-purple-800 mb-3">📊 Final Calculation</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-purple-600">Gross Salary</span>
                    <p className="font-bold text-green-700 text-xl">{formatCurrency(payrollDetails.netCalculation?.grossSalary)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-purple-600">Total Deductions</span>
                    <p className="font-bold text-red-600 text-xl">{formatCurrency(payrollDetails.netCalculation?.totalDeductions)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-purple-600">Net Salary</span>
                    <p className="font-bold text-blue-700 text-2xl">{formatCurrency(payrollDetails.netCalculation?.netSalary)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Enhanced with Loan/Advance distinction */}
      {/* Edit modal removed - loans managed in loan management screen */}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {selectedPayroll ? `Process Payment - ${selectedPayroll.empName}` : 'Process All Payments'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentDetails.paymentMode}
                  onChange={(e) => setPaymentDetails({...paymentDetails, paymentMode: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="IMPS">IMPS</option>
                </select>
              </div>

              {paymentDetails.paymentMode === 'UPI' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID *</label>
                  <input
                    type="text"
                    value={paymentDetails.upiId}
                    onChange={(e) => setPaymentDetails({...paymentDetails, upiId: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., name@paytm, name@ybl"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Employee UPI ID for payment</p>
                </div>
              )}

              {(paymentDetails.paymentMode === 'BANK_TRANSFER' || paymentDetails.paymentMode === 'NEFT' || paymentDetails.paymentMode === 'RTGS' || paymentDetails.paymentMode === 'IMPS') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={paymentDetails.bankName}
                      onChange={(e) => setPaymentDetails({...paymentDetails, bankName: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                    <input
                      type="text"
                      value={paymentDetails.bankAccount}
                      onChange={(e) => setPaymentDetails({...paymentDetails, bankAccount: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter account number"
                    />
                  </div>
                </>
              )}

              {paymentDetails.paymentMode === 'CHEQUE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cheque Number</label>
                  <input
                    type="text"
                    value={paymentDetails.chequeNumber}
                    onChange={(e) => setPaymentDetails({...paymentDetails, chequeNumber: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter cheque number"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  value={paymentDetails.transactionReference}
                  onChange={(e) => setPaymentDetails({...paymentDetails, transactionReference: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter transaction reference/UPRN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                <input
                  type="text"
                  value={paymentDetails.paidBy}
                  onChange={(e) => setPaymentDetails({...paymentDetails, paidBy: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter name of person processing payment"
                />
              </div>
            </div>

            {/* Pending Dues Section */}
            {selectedPayroll && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-blue-900">Pending Dues from Previous Periods</h4>
                  <button
                    onClick={() => setShowAddDueModal(true)}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + Add Due
                  </button>
                </div>
                {pendingDues.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pendingDues.map((due) => (
                      <div key={due.id} className="text-xs bg-white p-2 rounded border border-blue-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{due.description}</p>
                            {due.period && <p className="text-gray-500 text-[10px]">{due.period}</p>}
                            {due.remarks && <p className="text-gray-500 text-[10px] mt-1">{due.remarks}</p>}
                          </div>
                          <span className="font-bold text-blue-700 ml-2">{formatCurrency(due.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No pending dues</p>
                )}
                {pendingDues.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-blue-900">Total Pending Dues:</span>
                      <span className="text-lg font-bold text-blue-700">
                        {formatCurrency(pendingDues.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedPayroll && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Net Salary to Pay:</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedPayroll.netSalary)}</p>
                {pendingDues.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    (Includes {pendingDues.length} pending due{pendingDues.length > 1 ? 's' : ''} totaling {formatCurrency(pendingDues.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0))})
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={selectedPayroll ? processPayment : processAllPayments}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {selectedPayroll ? 'Process Payment' : 'Pay All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Dues Modal - For DRAFT payrolls */}
      {showManageDuesModal && selectedPayrollForDues && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Manage Pending Dues - {selectedPayrollForDues.empName || selectedPayrollForDues.empId}</h3>
              <button
                onClick={() => {
                  setShowManageDuesModal(false);
                  setSelectedPayrollForDues(null);
                  setAllDues([]);
                }}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            {/* Pending Dues List */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">Pending Dues</h4>
                <button
                  onClick={() => {
                    setNewDue({ amount: '', description: '', period: '', remarks: '' });
                    setShowAddDueModal(true);
                  }}
                  className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Add New Due
                </button>
              </div>
              
              {allDues.filter(d => d.status === 'PENDING').length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                  {allDues.filter(d => d.status === 'PENDING').map((due) => (
                    <div key={due.id} className="flex items-start justify-between p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">{due.description}</p>
                        {due.period && <p className="text-xs text-gray-500">{due.period}</p>}
                        {due.remarks && <p className="text-xs text-gray-500 mt-1">{due.remarks}</p>}
                        <p className="text-xs text-gray-400 mt-1">Created: {due.createdDate}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="font-bold text-blue-700">{formatCurrency(due.amount)}</span>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete due: ${due.description}?`)) {
                              try {
                                const response = await fetch(`${API_BASE}/payroll/due/${due.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'X-Tenant-Id': getTenantId(),
                                    'Authorization': `Bearer ${getToken()}`
                                  }
                                });
                                if (!response.ok) throw new Error('Failed to delete');
                                await loadPayrolls();
                                // Refresh dues list
                                const dues = await fetch(`${API_BASE}/payroll/due/${selectedPayrollForDues.empId}/all`, {
                                  headers: {
                                    'X-Tenant-Id': getTenantId(),
                                    'Authorization': `Bearer ${getToken()}`
                                  }
                                }).then(res => res.ok ? res.json() : []);
                                setAllDues(dues || []);
                                setMessage({ type: 'success', text: 'Due deleted!' });
                              } catch (error) {
                                console.error('Failed to delete due:', error);
                                setMessage({ type: 'error', text: 'Failed to delete due' });
                              }
                            }
                          }}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 p-2 bg-gray-50 rounded">No pending dues</p>
              )}
              
              {allDues.filter(d => d.status === 'PENDING').length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total Pending Dues:</span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatCurrency(allDues.filter(d => d.status === 'PENDING').reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    These dues will be automatically included in the payroll DUE column and deducted from net salary.
                  </p>
                </div>
              )}
            </div>
            
            {/* Paid Dues History */}
            {allDues.filter(d => d.status === 'PAID').length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Paid Dues History</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {allDues.filter(d => d.status === 'PAID').map((due) => (
                    <div key={due.id} className="flex items-start justify-between p-2 bg-green-50 rounded border border-green-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-xs">{due.description}</p>
                        {due.period && <p className="text-xs text-gray-500">{due.period}</p>}
                        {due.paidDate && <p className="text-xs text-gray-400">Paid: {due.paidDate}</p>}
                      </div>
                      <span className="font-bold text-green-700 text-sm ml-4">{formatCurrency(due.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowManageDuesModal(false);
                  setSelectedPayrollForDues(null);
                  setAllDues([]);
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Due Modal */}
      {showAddDueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Add Pending Due - {selectedPayrollForDues ? selectedPayrollForDues.empName : selectedPayroll?.empName}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDue.amount}
                  onChange={(e) => setNewDue({...newDue, amount: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter amount"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={newDue.description}
                  onChange={(e) => setNewDue({...newDue, description: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Pending from December 2024, Bonus adjustment"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="text"
                  value={newDue.period}
                  onChange={(e) => setNewDue({...newDue, period: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder={`e.g., ${getMonthName(month)} ${year}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={newDue.remarks}
                  onChange={(e) => setNewDue({...newDue, remarks: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Additional notes (optional)"
                  rows="2"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDueModal(false);
                  setNewDue({ amount: '', description: '', period: '', remarks: '' });
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDue}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Due
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skipped Employees Modal */}
      {showSkippedModal && skippedEmployees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Employees Not Included in Payroll
              </h3>
              <button onClick={() => setShowSkippedModal(false)} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                <strong>{skippedEmployees.skippedCount}</strong> employee(s) had no attendance record (0 present days) 
                for <strong>{skippedEmployees.monthName} {skippedEmployees.year}</strong> and were not included in payroll.
              </p>
            </div>
            
            {skippedEmployees.skippedEmployees && skippedEmployees.skippedEmployees.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Emp Code</th>
                      <th className="px-3 py-2 text-left">Employee Name</th>
                      <th className="px-3 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {skippedEmployees.skippedEmployees.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium">{emp.empCode}</td>
                        <td className="px-3 py-2">{emp.empName}</td>
                        <td className="px-3 py-2 text-gray-600">{emp.employmentType || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSkippedModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Viewer Modal */}
      {showPayslipViewer && payslipPdfUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Combined Payslips - {getMonthName(month)} {year}</h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadPayslip}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  📥 Download PDF
                </button>
                <button
                  onClick={closePayslipViewer}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={payslipPdfUrl}
                className="w-full h-full border-0"
                title="Combined Payslips"
                style={{ minHeight: '600px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayrollGen;

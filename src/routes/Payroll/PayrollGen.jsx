// PayrollGen.jsx - Enhanced Payroll Generation with Attendance Check, Loan/Advance Details
import React, { useState, useEffect, useRef } from "react";
import { payrollApi, loanApi, attendanceApi, devicesApi, getTenantId, getToken } from "../../services/api";
import { Link } from "react-router-dom";
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
  const [missingPunchInfo, setMissingPunchInfo] = useState(null);
  const [pendingEmployeesFromApi, setPendingEmployeesFromApi] = useState([]); // has attendance, no payroll (from API)
  const [lastGenerateResult, setLastGenerateResult] = useState(null); // { skippedMissingPunch, skippedNoAttendance }
  const [selectedPendingEmpCodes, setSelectedPendingEmpCodes] = useState([]); // empCodes selected for "generate for selected"
  const [generatingBatch, setGeneratingBatch] = useState(false);
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
  const [selectedDeviceCode, setSelectedDeviceCode] = useState("__none__"); // __none__ = no selection yet (defer data fetch)
  const [bankTransferData, setBankTransferData] = useState(null);
  const [allDevices, setAllDevices] = useState([]);
  const payrollCacheByDevice = useRef({}); // { deviceKey: { payrolls, bankTransferData, summary, ... } } - avoids re-fetch when switching devices
  const [newDue, setNewDue] = useState({
    amount: '',
    description: '',
    period: '',
    remarks: ''
  });
  // Edit modal removed - loans managed in loan management screen

  /** Initial load: only devices + missing punch. No payroll data. Always fetch fresh missing punch so fixes reflect instantly when visiting. */
  const loadInitial = async () => {
    try {
      setLoading(true);
      const [devList, dashboard] = await Promise.all([
        devicesApi.getList(true),
        attendanceApi.getMissingPunchDashboard(month, year, true).catch(() => null),
      ]);
      setAllDevices(Array.isArray(devList) ? devList : []);
      setMissingPunchInfo(dashboard);
    } catch (e) {
      console.error('Failed to load initial data:', e);
      setMessage({ type: 'error', text: 'Failed to load devices' });
    } finally {
      setLoading(false);
    }
  };

  const cacheKeyForDevice = (dev) => `${getTenantId()}_${year}_${month}_${dev === '' ? '__all' : dev}`;

  /** Load payroll data for selected device. Uses frontend cache per device — no API call when switching back to a previously selected device. */
  const loadPayrollData = async (bypassCache = false) => {
    if (selectedDeviceCode === '__none__') return;
    const deviceCode = selectedDeviceCode === '' ? null : selectedDeviceCode;
    const cacheKey = cacheKeyForDevice(selectedDeviceCode);
    if (!bypassCache && payrollCacheByDevice.current[cacheKey]) {
      const cached = payrollCacheByDevice.current[cacheKey];
      setPayrolls(cached.payrolls || []);
      setBankTransferData(cached.bankTransferData ?? null);
      setSummary(cached.summary ?? null);
      setSkippedEmployees(cached.skippedEmployees ?? null);
      setAttendanceCheck(cached.attendanceCheck ?? null);
      setPendingEmployeesFromApi(cached.pendingEmployeesFromApi || []);
      attendanceApi.getMissingPunchDashboard(month, year, true).then(d => d && setMissingPunchInfo(d)).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const [data, btl, dashboard] = await Promise.all([
        payrollApi.getMonthly(year, month, undefined, deviceCode),
        payrollApi.getBankTransferList(year, month, undefined, deviceCode).catch(() => null),
        attendanceApi.getMissingPunchDashboard(month, year, true).catch(() => null),
      ]);
      if (dashboard) setMissingPunchInfo(dashboard);
      const payrollsList = Array.isArray(data) ? data : [];
      setPayrolls(payrollsList);
      setBankTransferData(btl);
      let summaryData = null;
      let skipped = null;
      let attCheck = null;
      if (payrollsList.length > 0) {
        summaryData = await payrollApi.getSummary(year, month);
        setSummary(summaryData);
        try {
          skipped = await payrollApi.getSkippedEmployees(year, month);
          setSkippedEmployees(skipped);
        } catch (e) {
          setSkippedEmployees(null);
        }
      } else {
        setSummary(null);
        setSkippedEmployees(null);
        try {
          attCheck = await payrollApi.checkAttendance(year, month);
          setAttendanceCheck(attCheck);
        } catch (e) {
          setAttendanceCheck(null);
        }
      }
      let pending = [];
      try {
        pending = await payrollApi.getPendingEmployees(year, month);
        setPendingEmployeesFromApi(Array.isArray(pending) ? pending : []);
      } catch (e) {
        setPendingEmployeesFromApi([]);
      }
      payrollCacheByDevice.current[cacheKey] = {
        payrolls: payrollsList,
        bankTransferData: btl,
        summary: summaryData,
        skippedEmployees: skipped,
        attendanceCheck: attCheck,
        pendingEmployeesFromApi: Array.isArray(pending) ? pending : [],
      };
    } catch (error) {
      console.error('Failed to load payroll data:', error);
      setMessage({ type: 'error', text: 'Failed to load payroll data' });
    } finally {
      setLoading(false);
    }
  };

  const storageKey = () => `payrollPendingSkip_${getTenantId()}_${year}_${month}`;

  useEffect(() => {
    setLastGenerateResult(null);
    setSelectedPendingEmpCodes([]);
    payrollCacheByDevice.current = {};
    try { sessionStorage.removeItem(storageKey()); } catch (_) {}
    loadInitial();
  }, [year, month]);


  useEffect(() => {
    if (selectedDeviceCode !== '__none__') {
      loadPayrollData();
    } else {
      setPayrolls([]);
      setSummary(null);
      setBankTransferData(null);
      setSkippedEmployees(null);
      setAttendanceCheck(null);
      setPendingEmployeesFromApi([]);
    }
  }, [selectedDeviceCode, year, month]);

  // After loadPayrollData, restore "skipped missing punch" list from storage so list survives page refresh
  useEffect(() => {
    if (!payrolls.length || lastGenerateResult !== null) return;
    try {
      const raw = sessionStorage.getItem(storageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setLastGenerateResult({ skippedMissingPunch: parsed, skippedNoAttendance: [] });
      }
    } catch (_) {}
  }, [payrolls.length, year, month]);

  const generatePayroll = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      setLastGenerateResult(null);
      const deviceCode = selectedDeviceCode === '__none__' || selectedDeviceCode === '' ? null : selectedDeviceCode;
      const data = await payrollApi.generate(year, month, undefined, deviceCode);
      setMessage({ type: 'success', text: data.message || `Payroll generated for ${data.count ?? 0} employee(s).` });
      const skip = { skippedMissingPunch: data.skippedMissingPunch || [], skippedNoAttendance: data.skippedNoAttendance || [] };
      setLastGenerateResult(skip);
      try { sessionStorage.setItem(`payrollPendingSkip_${getTenantId()}_${year}_${month}`, JSON.stringify(skip.skippedMissingPunch)); } catch (_) {}
      setAttendanceCheck(null);
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
    } catch (error) {
      console.error('Failed to generate payroll:', error);
      if (error.isAttendanceError) {
        setMessage({ 
          type: 'error', 
          text: error.message || `Attendance not uploaded for ${getMonthName(month)} ${year}. Please upload attendance before generating payroll.`
        });
        setAttendanceCheck(error);
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to generate payroll. Please try again.' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const approvePayroll = async (id) => {
    try {
      await payrollApi.approve(id);
      setMessage({ type: 'success', text: 'Payroll approved!' });
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
    } catch (error) {
      console.error('Failed to approve payroll:', error);
      setMessage({ type: 'error', text: 'Failed to approve payroll' });
    }
  };

  const approveAll = async () => {
    try {
      await payrollApi.approveAll(year, month);
      setMessage({ type: 'success', text: 'All payrolls approved!' });
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
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
      
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
      
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
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
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
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
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
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
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
      delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
      await loadPayrollData(true);
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
      DRAFT: 'bg-slate-100 text-slate-700 border border-slate-200',
      GENERATED: 'bg-amber-100 text-amber-800 border border-amber-200',
      APPROVED: 'bg-blue-100 text-blue-700 border border-blue-200',
      PAID: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      CANCELLED: 'bg-red-100 text-red-700 border border-red-200'
    };
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${styles[status] || styles.DRAFT}`}>
        {status}
      </span>
    );
  };

  // Device list: always from devices API (ordered by id = first created first) for correct codes/names
  const deviceList = allDevices.map(d => ({
    deviceCode: d.deviceCode,
    deviceName: d.deviceName != null && d.deviceName !== "" ? d.deviceName : d.deviceCode
  }));
  const payrollIdsForDevice = selectedDeviceCode && selectedDeviceCode !== '__none__' && bankTransferData?.devices
    ? (bankTransferData.devices.find(d => d.deviceCode === selectedDeviceCode)?.employees || []).map(e => e.id)
    : null;
  // When __none__ → no data; when "All" (empty) → show all payrolls; when device selected → filter by device
  const displayedPayrolls = selectedDeviceCode === '__none__'
    ? []
    : selectedDeviceCode === ""
    ? payrolls
    : (payrollIdsForDevice != null && payrollIdsForDevice.length > 0
        ? payrolls.filter(p => payrollIdsForDevice.includes(p.id))
        : []);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Biometric device first – then period & actions */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100">
        {/* 1. Biometric device dropdown (first) */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Biometric device:</label>
          <select
            value={selectedDeviceCode}
            onChange={(e) => setSelectedDeviceCode(e.target.value)}
            className="border rounded px-3 py-2 bg-white min-w-[180px]"
          >
            <option value="__none__">Select biometric device...</option>
            <option value="">All biometric devices</option>
            {deviceList.map((d) => (
              <option key={d.deviceCode} value={d.deviceCode}>
                {d.deviceName || d.deviceCode}
              </option>
            ))}
          </select>
        </div>
        {/* 2. Month / Year */}
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
        {/* Generate Payroll: disabled until attendance is available for this month; show requirement message */}
        {selectedDeviceCode === '__none__' && (
          <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded text-slate-700 text-sm">
            Select a biometric device to view or generate payroll.
          </div>
        )}
        {selectedDeviceCode !== '__none__' && payrolls.length === 0 && !loading && attendanceCheck && !attendanceCheck.available && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm font-medium">
            {attendanceCheck.message || "Import attendance for this month before generating payroll."}
          </div>
        )}
        {selectedDeviceCode !== '__none__' && payrolls.length === 0 && !loading && attendanceCheck == null && (
          <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded text-slate-700 text-sm">
            Unable to verify attendance. Click Refresh to try again.
          </div>
        )}
        <button
          onClick={generatePayroll}
          disabled={generating || selectedDeviceCode === '__none__' || (payrolls.length === 0 && !attendanceCheck?.available)}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          title={selectedDeviceCode === '__none__' ? 'Select a biometric device first' : (payrolls.length === 0 && !attendanceCheck?.available ? (attendanceCheck?.message || "Import attendance first") : undefined)}
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
              className={payrolls.length === 0 ? "px-4 py-2 rounded font-medium flex items-center gap-2 bg-gray-300 text-gray-500 cursor-not-allowed" : "px-4 py-2 rounded font-medium flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"}
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
          onClick={() => {
            loadInitial();
            if (selectedDeviceCode !== '__none__') loadPayrollData(true);
          }}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          title="Refresh (bypass cache)"
        >
          🔄 Refresh
        </button>
      </div>

      {/* All clear – compact */}
      {missingPunchInfo && (missingPunchInfo.totalIssues || 0) === 0 && (attendanceCheck?.available || payrolls.length > 0) && (
        <div className="mb-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-2 text-emerald-800 text-sm font-medium">✅ All attendance clear — generate payroll for all employees with attendance.</span>
        </div>
      )}

      {/* Partial payroll – compact (no banner link; list below shows employees) */}
      {missingPunchInfo && (missingPunchInfo.totalIssues || 0) > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-amber-800 text-sm">
            ⚠️ {missingPunchInfo.totalEmployeesWithIssues || 0} employee(s) with unfixed missing punch ({missingPunchInfo.totalIssues} day(s)) — fix to include in payroll.
          </span>
        </div>
      )}

      {/* After generate: skipped (missing punch) – compact */}
      {lastGenerateResult && (lastGenerateResult.skippedMissingPunch?.length || 0) > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
          <span className="text-blue-800 text-sm">
            Skipped (missing punch): {(lastGenerateResult.skippedMissingPunch || []).map(e => e.empCode).join(', ')}. Fix on Missing Punch page, then Refresh and Generate again.
          </span>
          <Link to="/attendance/missing-punch" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap">Fix missing punch →</Link>
        </div>
      )}

      {/* After fix: ready for remaining – compact */}
      {missingPunchInfo && (missingPunchInfo.totalIssues || 0) === 0 && payrolls.length > 0 && lastGenerateResult?.skippedMissingPunch?.length > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <span className="text-green-800 text-sm font-medium">✅ Missing punches fixed. Click Generate Payroll again to add remaining employees.</span>
        </div>
      )}

      {/* Skipped (no attendance) – compact */}
      {lastGenerateResult && (lastGenerateResult.skippedNoAttendance?.length || 0) > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-slate-700 text-sm">Skipped (no attendance): {(lastGenerateResult.skippedNoAttendance || []).map(e => e.empCode).join(', ')}.</span>
        </div>
      )}

      {/* Employees whose payroll not processed – use API list (has attendance, no payroll) so fixed employees appear */}
      {(() => {
        const empCodesWithMissing = new Set((missingPunchInfo?.employees || []).map(e => e.empCode));
        const fromApi = (pendingEmployeesFromApi || []).map(e => ({
          empCode: e.empCode,
          empName: e.empName || e.empCode,
          ready: !empCodesWithMissing.has(e.empCode),
        }));
        const fromSkip = (lastGenerateResult?.skippedMissingPunch || []).map(e => ({ empCode: e.empCode, empName: e.empName, ready: !empCodesWithMissing.has(e.empCode) }));
        const fromDash = (missingPunchInfo?.employees || []).map(e => ({ empCode: e.empCode, empName: e.empName, ready: false }));
        const seen = new Set();
        const pendingForPayroll = [];
        (fromApi.length > 0 ? fromApi : [...fromSkip, ...fromDash]).forEach(e => {
          if (!seen.has(e.empCode)) { seen.add(e.empCode); pendingForPayroll.push(e); }
        });
        if (pendingForPayroll.length === 0) return null;
        const readyCount = pendingForPayroll.filter(e => e.ready).length;
        const readyEmpCodes = pendingForPayroll.filter(e => e.ready).map(e => e.empCode);
        const allReadySelected = readyCount > 0 && readyEmpCodes.every(c => selectedPendingEmpCodes.includes(c));
        const someReadySelected = readyEmpCodes.some(c => selectedPendingEmpCodes.includes(c));
        const toggleSelectAllReady = () => {
          if (allReadySelected) setSelectedPendingEmpCodes(prev => prev.filter(c => !readyEmpCodes.includes(c)));
          else setSelectedPendingEmpCodes(prev => [...new Set([...prev, ...readyEmpCodes])]);
        };
        return (
          <details className="mb-3 bg-amber-50 border border-amber-200 rounded-lg group" open={!!(missingPunchInfo?.employees?.length)}>
            <summary className="px-4 py-2.5 cursor-pointer list-none flex items-center justify-between gap-3 flex-wrap font-medium text-amber-900 text-sm">
              <span>Employees whose payroll is not processed ({pendingForPayroll.length})</span>
              <span className="text-amber-700 font-normal text-xs flex items-center gap-2 flex-wrap">
                <span className="hidden sm:inline">View list: employees whose attendance needs resolution (missing punch).</span>
                Fix missing punch → Refresh list → Select ready → Generate for selected
              </span>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded border border-amber-300 bg-amber-100/80 text-amber-800 shrink-0" aria-hidden>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="px-4 pb-4 pt-0 border-t border-amber-200/80">
            <div className="flex flex-wrap items-center gap-2 mb-2 mt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const [dashboard, pending] = await Promise.all([
                      attendanceApi.getMissingPunchDashboard(month, year, true),
                      payrollApi.getPendingEmployees(year, month),
                    ]);
                    setMissingPunchInfo(dashboard);
                    setPendingEmployeesFromApi(Array.isArray(pending) ? pending : []);
                    const fixedCount = (dashboard?.employees?.length ?? 0) < (missingPunchInfo?.employees?.length ?? 0) ? ' Employees you fixed should now show as Ready.' : '';
                    setMessage({ type: 'success', text: 'List refreshed.' + fixedCount });
                    setTimeout(() => setMessage(null), 4000);
                    delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
                  } catch (e) {
                    setMessage({ type: 'error', text: 'Failed to refresh list. ' + (e?.message || '') });
                  }
                }}
                className="px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium text-xs"
              >
                🔄 Refresh list
              </button>
              {readyCount > 0 && (
                <>
                  <span className="text-green-700 text-xs font-medium">{readyCount} ready</span>
                  <button
                    type="button"
                    onClick={toggleSelectAllReady}
                    className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded hover:bg-amber-100 font-medium text-xs"
                  >
                    {allReadySelected ? 'Deselect all' : 'Select all ready'}
                  </button>
                  <button
                    type="button"
                    disabled={generatingBatch || selectedPendingEmpCodes.length === 0}
                    onClick={async () => {
                      setGeneratingBatch(true);
                      setMessage(null);
                      try {
                        const data = await payrollApi.generateBatch(year, month, selectedPendingEmpCodes);
                        const count = data.count != null ? data.count : 0;
                        const skippedMissing = data.skippedMissingPunch || [];
                        const skippedNoAtt = data.skippedNoAttendance || [];
                        let msg = data.message || "Generated for " + count + " employee(s).";
                        if (count === 0 && (skippedMissing.length > 0 || skippedNoAtt.length > 0)) {
                          if (skippedMissing.length > 0) {
                            msg = "No payroll generated. " + skippedMissing.length + " employee(s) still have unfixed missing punch: " + skippedMissing.map((e) => e.empName || e.empCode).join(", ") + ". Fix on Missing Punch page and try again.";
                            setMessage({ type: 'error', text: msg });
                          } else {
                            msg = "No payroll generated. " + skippedNoAtt.length + " employee(s) have no attendance: " + skippedNoAtt.map((e) => e.empName || e.empCode).join(", ") + ".";
                            setMessage({ type: 'error', text: msg });
                          }
                        } else {
                          setMessage({ type: 'success', text: msg });
                        }
                        const generatedEmpCodes = [...selectedPendingEmpCodes];
                        setSelectedPendingEmpCodes([]);
                        const updated = (lastGenerateResult?.skippedMissingPunch || []).filter(e => !generatedEmpCodes.includes(e.empCode));
                        setLastGenerateResult(prev => ({ ...prev, skippedMissingPunch: updated }));
                        try { sessionStorage.setItem(storageKey(), JSON.stringify(updated)); } catch (_) {}
                        if (count > 0 && Array.isArray(data.payrolls) && data.payrolls.length > 0) {
                          setPayrolls(prev => {
                            const existingIds = new Set(prev.map(p => p.id));
                            const toAdd = data.payrolls.filter(p => !existingIds.has(p.id));
                            return [...prev, ...toAdd].sort((a, b) => (a.empId || '').localeCompare(b.empId || ''));
                          });
                          setBankTransferData(prev => {
                            const toAdd = data.payrolls.map(p => ({ id: p.id, empId: p.empId, empName: p.empName || p.empId, empCode: p.empId, accountNumber: '', ifsc: '', branch: '', netAmount: p.netSalary ?? 0, grossAmount: p.grossSalary ?? 0, amount: p.netSalary ?? 0 }));
                            if (!prev?.devices) return { year, month, devices: [{ deviceCode: selectedDeviceCode, deviceName: selectedDeviceCode, employees: toAdd }] };
                            const dev = prev.devices.find(d => d.deviceCode === selectedDeviceCode);
                            if (!dev) return { ...prev, devices: [...prev.devices, { deviceCode: selectedDeviceCode, deviceName: selectedDeviceCode, employees: toAdd }] };
                            const existingIds = new Set((dev.employees || []).map(e => e.id));
                            const toAddFiltered = toAdd.filter(p => !existingIds.has(p.id));
                            return { ...prev, devices: prev.devices.map(d => d.deviceCode === selectedDeviceCode ? { ...d, employees: [...(d.employees || []), ...toAddFiltered] } : d) };
                          });
                          setSummary(s => {
                            if (!s) return null;
                            const added = data.payrolls;
                            const add = (v, f) => (v || 0) + added.reduce((sum, p) => sum + (f(p) || 0), 0);
                            return { ...s, employeeCount: (s.employeeCount || 0) + added.length, totalGrossSalary: add(s.totalGrossSalary, p => p.grossSalary), totalNetSalary: add(s.totalNetSalary, p => p.netSalary), totalDeductions: add(s.totalDeductions, p => p.totalDeductions) };
                          });
                          setPendingEmployeesFromApi(prev => prev.filter(e => !generatedEmpCodes.includes(e.empCode)));
                          delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
                        } else {
                          delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
                          await loadPayrollData(true);
                        }
                      } catch (err) {
                        setMessage({ type: 'error', text: err.message || 'Failed to generate payroll for selected.' });
                      } finally {
                        setGeneratingBatch(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 font-medium text-xs"
                  >
                    {generatingBatch ? "⏳ Generating..." : "📊 Generate selected (" + selectedPendingEmpCodes.length + ")"}
                  </button>
                  {selectedPendingEmpCodes.length > 0 && (
                    <button type="button" onClick={() => setSelectedPendingEmpCodes([])} className="text-slate-600 hover:text-slate-800 text-xs font-medium">
                      Clear
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-amber-200">
                    <th className="text-left py-1.5 pr-2 w-10">
                      {readyCount > 0 ? (
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allReadySelected}
                            ref={el => el && (el.indeterminate = someReadySelected && !allReadySelected)}
                            onChange={toggleSelectAllReady}
                            className="rounded"
                          />
                          <span className="font-medium text-amber-900">Select all</span>
                        </label>
                      ) : (
                        'Select'
                      )}
                    </th>
                    <th className="text-left py-1.5">Emp Code</th>
                    <th className="text-left py-1.5">Name</th>
                    <th className="text-left py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingForPayroll.map((e) => (
                    <tr key={e.empCode} className="border-b border-amber-100">
                      <td className="py-1 pr-2">
                        {e.ready ? (
                          <input
                            type="checkbox"
                            checked={selectedPendingEmpCodes.includes(e.empCode)}
                            onChange={() => setSelectedPendingEmpCodes(prev => prev.includes(e.empCode) ? prev.filter(c => c !== e.empCode) : [...prev, e.empCode])}
                            className="rounded"
                          />
                        ) : (
                          <span className="text-amber-600">Fix first</span>
                        )}
                      </td>
                      <td className="py-1 font-medium">{e.empCode}</td>
                      <td className="py-1">{e.empName}</td>
                      <td className="py-1">
                        {e.ready ? (
                          <span className="text-green-700 font-medium">Ready</span>
                        ) : (
                          <span className="text-amber-700">Missing punch not fixed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingForPayroll.some(e => !e.ready) && (
              <p className="mt-2 text-amber-700 text-xs">
                <Link to="/attendance/missing-punch" className="underline font-medium">Missing Punch Fix</Link> → then Refresh list above.
              </p>
            )}
            </div>
          </details>
        );
      })()}

      {/* Attendance Warning – compact */}
      {attendanceCheck && !attendanceCheck.available && payrolls.length === 0 && (
        <div className="mb-3 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
          <span className="text-yellow-800 text-sm">⚠️ {attendanceCheck.message} (Employees: {attendanceCheck.totalEmployees}, With attendance: {attendanceCheck.employeesWithAttendance})</span>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={"mb-4 p-4 rounded-lg " + (message.type === "success" ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200")}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-50 to-gray-50">
            <h3 className="font-bold text-lg sm:text-xl text-slate-800">
              Payment Sheet — {getMonthName(month)} {year}
              {selectedDeviceCode && (
                <span className="ml-2 text-base font-normal text-emerald-700">
                  (Device: {deviceList.find(d => d.deviceCode === selectedDeviceCode)?.deviceName || selectedDeviceCode} — {displayedPayrolls.length} of {payrolls.length})
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                👆 Click any row for full details
              </span>
              <span className="text-slate-500">•</span>
              <span>Scroll right → for more columns</span>
            </p>
            
            {/* Bilingual Instructions - Collapsible */}
            <details className="mt-3 group">
              <summary className="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-800 flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Loan Adjustment Info
              </summary>
              <div className="mt-2 p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-800">
                <p>Loan deduction is auto-adjusted to prevent negative net salary. Remaining balance carries to future payrolls.</p>
              </div>
            </details>
          </div>
          <div className="overflow-x-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            <table className="min-w-max text-sm">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-3 py-3.5 text-center sticky left-0 bg-slate-700 z-10">
                    <input
                      type="checkbox"
                      checked={displayedPayrolls.length > 0 && selectedPayrollIds.length === displayedPayrolls.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayrollIds(displayedPayrolls.map(p => p.id));
                        } else {
                          setSelectedPayrollIds([]);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      className="cursor-pointer rounded"
                      title="Select All"
                    />
                  </th>
                  <th className="px-3 py-3.5 text-left sticky left-9 bg-slate-700 z-10 min-w-[40px]">#</th>
                  <th className="px-4 py-3.5 text-left sticky left-[72px] bg-slate-700 z-10 min-w-[140px]">EMP NAME</th>
                  <th className="px-3 py-3.5 text-left min-w-[90px]">EMP ID</th>
                  <th className="px-3 py-3.5 text-center min-w-[60px]">PRES.</th>
                  <th className="px-3 py-3.5 text-center min-w-[55px]" title="Working Days">W.DAY</th>
                  <th className="px-3 py-3.5 text-right min-w-[85px]">BASIC</th>
                  <th className="px-3 py-3.5 text-right min-w-[85px]">ALLOW.</th>
                  <th className="px-3 py-3.5 text-right min-w-[75px]" title="OT Days">OT D</th>
                  <th className="px-3 py-3.5 text-right min-w-[70px]" title="OT Hours">OT H</th>
                  <th className="px-3 py-3.5 text-center min-w-[65px]" title="Paid Leave">LEAVE</th>
                  <th className="px-3 py-3.5 text-center min-w-[65px]" title="Late Hours">LATE H</th>
                  <th className="px-3 py-3.5 text-right min-w-[85px]">GROSS</th>
                  <th className="px-3 py-3.5 text-right min-w-[75px]">PF</th>
                  <th className="px-3 py-3.5 text-right min-w-[80px]" title="Loan EMI">EMI</th>
                  <th className="px-3 py-3.5 text-right min-w-[75px]">DUE</th>
                  <th className="px-3 py-3.5 text-right min-w-[95px] font-semibold bg-slate-600">NET SAL</th>
                  <th className="px-3 py-3.5 text-center min-w-[90px]">STATUS</th>
                  <th className="px-3 py-3.5 text-center min-w-[100px] sticky right-0 bg-slate-700 z-10">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedPayrolls.length === 0 ? (
                  <tr key="empty-device"><td colSpan={20} className="px-4 py-6 text-center text-slate-500">No employees for selected device.</td></tr>
                ) : displayedPayrolls.map((p, idx) => (
                  <tr 
                    key={p.id} 
                    className={`group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/80 cursor-pointer transition-colors`}
                    onClick={() => viewDetails(p)}
                  >
                    <td className={`px-3 py-2.5 text-center sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-blue-50/80`} onClick={e => e.stopPropagation()}>
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
                        className="cursor-pointer rounded"
                      />
                    </td>
                    <td className={`px-3 py-2.5 font-medium text-slate-600 sticky left-9 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-blue-50/80`}>{idx + 1}</td>
                    <td className={`px-4 py-2.5 font-medium text-slate-900 sticky left-[72px] z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-blue-50/80`}>{p.empName || p.empId}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.empId}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-green-600">{p.presentDays || 0}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{p.totalWorkingDays || 0}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(p.basicSalary)}</td>
                    <td className="px-3 py-2.5 text-right text-purple-600">{formatCurrency(p.increment)}</td>
                    <td className="px-3 py-2.5 text-right text-indigo-600">{p.overtimeDays || 0}</td>
                    <td className="px-3 py-2.5 text-right text-indigo-600">{p.overtimeHours ? parseFloat(p.overtimeHours).toFixed(1) : '0'}</td>
                    <td className="px-3 py-2.5 text-center text-green-600">{p.paidLeaveDays || 0}</td>
                    <td className="px-3 py-2.5 text-center text-orange-600">{p.totalLateHours ? parseFloat(p.totalLateHours).toFixed(1) : '0'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-green-700">{formatCurrency(p.grossSalary)}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">{formatCurrency((p.pfEmployee || 0) + (p.esiEmployee || 0))}</td>
                    <td className="px-3 py-2.5 text-right text-amber-700">{formatCurrency(p.loanDeduction)}</td>
                    <td 
                      className={`px-3 py-2.5 text-right ${p.status === 'DRAFT' ? 'cursor-pointer hover:bg-blue-100 text-blue-700 font-medium' : 'text-red-600'}`}
                      onClick={e => {
                        e.stopPropagation();
                        if (p.status === 'DRAFT') openManageDuesModal(p);
                      }}
                      title={p.status === 'DRAFT' ? 'Click to manage dues' : ''}
                    >
                      {p.status === 'DRAFT' ? `${formatCurrency(p.due)} ✏️` : formatCurrency(p.due)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-blue-700 bg-blue-50/80">{formatCurrency(p.netSalary)}</td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      {getStatusBadge(p.status)}
                    </td>
                    <td className={`px-3 py-2.5 sticky right-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-blue-50/80`} onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                        {p.status === 'DRAFT' && (
                          <>
                            <button onClick={() => approvePayroll(p.id)} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="Approve">✓</button>
                            <button onClick={() => deletePayroll(p.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Delete">🗑️</button>
                          </>
                        )}
                        {p.status === 'APPROVED' && (
                          <button onClick={() => openPaymentModal(p)} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600" title="Pay">💳 Pay</button>
                        )}
                        {p.status === 'PAID' && (
                          <span className="text-xs text-green-600">✓ {p.paymentMode || 'Paid'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals Row */}
              <tfoot className="bg-slate-200 font-bold">
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-right sticky left-0 bg-slate-200">TOTALS:</td>
                  <td className="px-2 py-3 text-center">
                    {payrolls.reduce((s, p) => s + (p.presentDays || 0), 0)}
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="px-2 py-3 text-center">{payrolls.reduce((s, p) => s + (p.overtimeDays || 0), 0)}</td>
                  <td className="px-2 py-3 text-right">{payrolls.reduce((s, p) => s + parseFloat(p.overtimeHours || 0), 0).toFixed(1)}</td>
                  <td className="px-2 py-3 text-center">
                    {payrolls.reduce((s, p) => s + (p.paidLeaveDays || 0), 0)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {payrolls.reduce((s, p) => s + parseFloat(p.totalLateHours || 0), 0).toFixed(1)}
                  </td>
                  <td className="px-2 py-3 text-right text-green-700">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-red-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.pfEmployee || 0) + (p.esiEmployee || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-amber-700">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.loanDeduction || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-red-600">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.due || 0), 0))}
                  </td>
                  <td className="px-2 py-3 text-right text-blue-700 bg-blue-100">
                    {formatCurrency(payrolls.reduce((s, p) => s + (p.netSalary || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal - Full in-depth breakdown (scrollable when content is long) */}
      {showDetailsModal && payrollDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header - stays visible at top */}
            <div className="flex-shrink-0 p-5 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold tracking-tight">{payrollDetails.empName}</h3>
                <p className="text-slate-300 text-sm mt-1">Emp: {payrollDetails.empId} • {getMonthName(payrollDetails.month)} {payrollDetails.year}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-2xl text-white/80 hover:text-white p-1 -m-1">×</button>
            </div>
            {/* Scrollable body with visible scrollbar */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto min-h-0 flex-1 overscroll-contain" style={{ scrollbarGutter: 'stable' }}>
              {/* 1. Basic & Allowance */}
              <section className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Basic & Allowance</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Basic Salary</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(payrollDetails.salaryStructure?.basicSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Allowance</p>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(payrollDetails.salaryStructure?.increment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Final Pay (Monthly)</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(payrollDetails.salaryStructure?.finalPayment)}</p>
                  </div>
                </div>
              </section>

              {/* 2. Attendance - Present, OT, Leaves */}
              <section className="bg-green-50/80 rounded-xl p-4 border border-green-100">
                <h4 className="text-sm font-bold text-green-800 uppercase tracking-wider mb-3">Attendance</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Working Days</p>
                    <p className="text-xl font-bold text-slate-700">{payrollDetails.attendance?.totalWorkingDays || 0}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Present Days</p>
                    <p className="text-xl font-bold text-green-600">{payrollDetails.attendance?.presentDays || 0}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Absent</p>
                    <p className="text-xl font-bold text-red-600">{payrollDetails.attendance?.absentDays || 0}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Paid Leaves</p>
                    <p className="text-xl font-bold text-blue-600">{(payrollDetails.attendance?.paidLeaveDays ?? payrollDetails.attendance?.leaveDays) || 0}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-xs text-indigo-600">OT Days</p>
                    <p className="text-lg font-bold text-indigo-700">{payrollDetails.attendance?.overtimeDays || 0}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-xs text-indigo-600">OT Hours</p>
                    <p className="text-lg font-bold text-indigo-700">{payrollDetails.attendance?.overtimeHours ?? '0'} hrs</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg col-span-2 sm:col-span-1">
                    <p className="text-xs text-indigo-600">OT Day Charges</p>
                    <p className="text-lg font-bold text-indigo-700">{formatCurrency(payrollDetails.earnings?.overtimeDayAmount)}</p>
                    <p className="text-[10px] text-indigo-500/80 mt-0.5" title="Per day rate = Final Pay ÷ Working Days">(Final Pay ÷ Working Days) × OT Days × multiplier</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg col-span-2 sm:col-span-1">
                    <p className="text-xs text-indigo-600">OT Hour Charges</p>
                    <p className="text-lg font-bold text-indigo-700">{formatCurrency(payrollDetails.earnings?.overtimeHourAmount)}</p>
                    <p className="text-[10px] text-indigo-500/80 mt-0.5" title="Per hour = Final Pay ÷ Working Days ÷ 8">(Final Pay ÷ Working Days ÷ 8) × OT Hrs × multiplier</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg col-span-2 sm:col-span-1">
                    <p className="text-xs text-orange-600">Late Hours</p>
                    <p className="text-lg font-bold text-orange-700">{payrollDetails.attendance?.totalLateHours || 0} hrs</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <p className="text-xs text-orange-600">Late Charges (Deduction)</p>
                    <p className="text-lg font-bold text-orange-700">{formatCurrency(payrollDetails.attendance?.lateHourCharges)}</p>
                  </div>
                </div>
                {(payrollDetails.attendance?.earlyOutDays > 0 || payrollDetails.attendance?.totalEarlyHours > 0) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-amber-600">Early Out Hours</p>
                      <p className="font-bold text-amber-700">{payrollDetails.attendance?.totalEarlyHours || 0} hrs</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-amber-600">Early Charges (Deduction)</p>
                      <p className="font-bold text-amber-700">{formatCurrency(payrollDetails.attendance?.earlyHourCharges || 0)}</p>
                    </div>
                  </div>
                )}
              </section>

              {/* 3. Loan - Active, EMI Deducted */}
              {(payrollDetails.loanInfo?.activeLoansCount > 0 || payrollDetails.advanceAndDue?.loanEmiInAdvance > 0) && (
                <section className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">Loan & EMI</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-amber-600">Active Loans</p>
                      <p className="text-lg font-bold text-amber-700">{payrollDetails.loanInfo?.activeLoansCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">EMI Deducted This Month</p>
                      <p className="text-lg font-bold text-amber-700">{formatCurrency(payrollDetails.loanInfo?.monthlyEmi ?? payrollDetails.advanceAndDue?.loanEmiInAdvance)}</p>
                    </div>
                  </div>
                  {payrollDetails.loanInfo?.activeLoans?.length > 0 && (
                    <div className="space-y-2">
                      {payrollDetails.loanInfo.activeLoans.map((loan, i) => (
                        <div key={i} className="flex flex-wrap justify-between items-center gap-2 bg-white p-3 rounded-lg border border-amber-200 text-sm">
                          <span className="font-medium">{loan.loanType}</span>
                          <span>EMI: {formatCurrency(loan.emiAmount)}</span>
                          <span className="text-amber-700">Outstanding: {formatCurrency(loan.outstandingBalance)}</span>
                          <span className="text-slate-500">{loan.emisPaid}/{loan.tenureMonths} paid</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 4. Advance & Due */}
              <section className="bg-orange-50/80 rounded-xl p-4 border border-orange-100">
                <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-3">Advance & Due</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-orange-600">Loan EMI (in ADV)</p>
                    <p className="font-bold text-amber-700">{formatCurrency(payrollDetails.advanceAndDue?.loanEmiInAdvance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-600">Manual Advance</p>
                    <p className="font-bold">{formatCurrency(payrollDetails.advanceAndDue?.manualAdvance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-600">Total Advance</p>
                    <p className="font-bold text-orange-700">{formatCurrency(payrollDetails.advanceAndDue?.advance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-600">Pending Due</p>
                    <p className="font-bold text-red-600">{formatCurrency(payrollDetails.advanceAndDue?.due)}</p>
                  </div>
                </div>
              </section>

              {/* 5. Total deduction breakdown – where total deduction went */}
              {(payrollDetails.deductionBreakdown?.length > 0 || payrollDetails.netCalculation?.totalDeductions > 0) && (
                <section className="bg-red-50/80 rounded-xl p-4 border border-red-100">
                  <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-3">Total deduction breakdown</h4>
                  <p className="text-xs text-slate-600 mb-3">Gross Salary − Total Deductions = Net Salary. Below is how total deduction is made up:</p>
                  <ul className="space-y-2 mb-4">
                    {(payrollDetails.deductionBreakdown || []).map((item, i) => (
                      <li key={i} className="flex justify-between items-start gap-2 bg-white/80 p-2 rounded border border-red-100">
                        <div>
                          <span className="font-medium text-slate-800">{item.label}</span>
                          {item.description && <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>}
                        </div>
                        <span className="font-bold text-red-700 whitespace-nowrap">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-red-200 pt-2 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Total deductions</span>
                    <span className="font-bold text-red-700">{formatCurrency(payrollDetails.netCalculation?.totalDeductions)}</span>
                  </div>
                </section>
              )}

              {/* 6. Final Net */}
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-3">Final calculation</h4>
                <div className="space-y-2 text-sm text-slate-600 mb-3">
                  <p>Gross Salary − Total Deductions = Net Salary</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Gross Salary</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(payrollDetails.netCalculation?.grossSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Total Deductions</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(payrollDetails.netCalculation?.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Net Salary</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(payrollDetails.netCalculation?.netSalary)}</p>
                  </div>
                </div>
              </section>
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
                                delete payrollCacheByDevice.current[cacheKeyForDevice(selectedDeviceCode)];
                                await loadPayrollData(true);
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
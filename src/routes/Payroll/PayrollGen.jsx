// PayrollGen.jsx - Enhanced Payroll Generation with Attendance Check, Loan/Advance Details
import React, { useState, useEffect } from "react";
import { payrollApi, loanApi } from "../../services/api";

function PayrollGen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
  const [editData, setEditData] = useState({
    manualAdvance: 0,
    due: 0,
    bonus: 0,
    incentive: 0,
    otherDeduction: 0,
    remarks: ''
  });

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

  const openPaymentModal = (payroll) => {
    setSelectedPayroll(payroll);
    setPaymentDetails({
      paymentMode: 'BANK_TRANSFER',
      transactionReference: '',
      bankName: '',
      bankAccount: '',
      upiId: '',
      chequeNumber: '',
      paidBy: ''
    });
    setShowPaymentModal(true);
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

  const openEditModal = (payroll) => {
    setSelectedPayroll(payroll);
    // Calculate manual advance (total advance - loan EMI - flexible loan deduction)
    const loanEmi = payroll.loanDeduction || 0;
    const flexibleLoanDeduction = payroll.flexibleLoanDeduction || 0;
    const totalAdvance = payroll.advance || 0;
    const manualAdvance = Math.max(0, totalAdvance - loanEmi - flexibleLoanDeduction);
    
    setEditData({
      manualAdvance: manualAdvance,
      loanEmi: loanEmi,
      flexibleLoanDeduction: flexibleLoanDeduction,
      due: payroll.due || 0,
      bonus: payroll.bonus || 0,
      incentive: payroll.incentive || 0,
      otherDeduction: payroll.otherDeduction || 0,
      remarks: payroll.remarks || ''
    });
    setShowEditModal(true);
  };

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

  const saveEdit = async () => {
    try {
      // Update manual advance
      if (editData.manualAdvance > 0) {
        await payrollApi.updateAdvance(selectedPayroll.id, editData.manualAdvance, 'Manual advance given');
      }
      
      // Update flexible loan deduction
      if (editData.flexibleLoanDeduction !== (selectedPayroll.flexibleLoanDeduction || 0)) {
        await payrollApi.updateFlexibleLoan(selectedPayroll.id, editData.flexibleLoanDeduction, 'Flexible loan deduction');
      }
      
      // Update due
      if (editData.due !== (selectedPayroll.due || 0)) {
        await payrollApi.updateDue(selectedPayroll.id, editData.due, 'Due amount updated');
      }
      
      // Update other fields
      await payrollApi.update(selectedPayroll.id, {
        bonus: editData.bonus,
        incentive: editData.incentive,
        otherDeduction: editData.otherDeduction,
        remarks: editData.remarks
      });
      
      setMessage({ type: 'success', text: 'Payroll updated!' });
      setShowEditModal(false);
      await loadPayrolls();
    } catch (error) {
      console.error('Failed to update payroll:', error);
      setMessage({ type: 'error', text: 'Failed to update payroll' });
    }
  };

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
            <button
              onClick={() => { setSelectedPayroll(null); setShowPaymentModal(true); }}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium"
            >
              💳 Pay All
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
        <div className="flex gap-4 mb-4 text-sm">
          <span className="bg-gray-100 px-3 py-1 rounded">Draft: {summary.draftCount || 0}</span>
          <span className="bg-blue-100 px-3 py-1 rounded">Approved: {summary.approvedCount || 0}</span>
          <span className="bg-green-100 px-3 py-1 rounded">Paid: {summary.paidCount || 0}</span>
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
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-2 py-3 text-left">SR.</th>
                  <th className="px-2 py-3 text-left">EMP NAME</th>
                  <th className="px-2 py-3 text-left">EMP ID</th>
                  <th className="px-2 py-3 text-right">BASIC</th>
                  <th className="px-2 py-3 text-right">INCR.</th>
                  <th className="px-2 py-3 text-right">FINAL PAY</th>
                  <th className="px-2 py-3 text-center">W.DAY</th>
                  <th className="px-2 py-3 text-center">PRES.</th>
                  <th className="px-2 py-3 text-center">ABS.</th>
                  <th className="px-2 py-3 text-right">W.DAY AMT</th>
                  <th className="px-2 py-3 text-center" title="OT Days (worked on holiday/weekly off)">OT DAY</th>
                  <th className="px-2 py-3 text-center" title="OT Hours (extra hours worked)">OT HRS</th>
                  <th className="px-2 py-3 text-right" title="OT Day Amount">OT DAY AMT</th>
                  <th className="px-2 py-3 text-right" title="OT Hour Amount">OT HR AMT</th>
                  <th className="px-2 py-3 text-right bg-green-700">GROSS</th>
                  <th className="px-2 py-3 text-right" title="ESI 0.75% (if salary ≤ ₹21,000)">ESI</th>
                  <th className="px-2 py-3 text-right" title="PF Employee 6%">PF OWN</th>
                  <th className="px-2 py-3 text-right" title="PF Company 6%">PF CO.</th>
                  <th className="px-2 py-3 text-right bg-amber-600">LOAN EMI</th>
                  <th className="px-2 py-3 text-right bg-orange-600">ADV</th>
                  <th className="px-2 py-3 text-right">DUE</th>
                  <th className="px-2 py-3 text-right bg-blue-700">NET SAL</th>
                  <th className="px-2 py-3 text-left">REMARKS</th>
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
                    <td className="px-2 py-2 text-right text-red-600">{formatCurrency(p.due)}</td>
                    <td className="px-2 py-2 text-right font-bold text-blue-700 bg-blue-50">
                      {formatCurrency(p.netSalary)}
                    </td>
                    <td className="px-2 py-2 text-left text-xs text-gray-600 max-w-[120px] truncate" title={p.remarks || ''}>
                      {p.remarks || '-'}
                    </td>
                    <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                        {p.status === 'DRAFT' && (
                          <>
                            <button 
                              onClick={() => openEditModal(p)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              title="Edit Advance/Due"
                            >
                              ✏️
                            </button>
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
                    <span className="text-sm text-blue-600">Increment</span>
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
      {showEditModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Edit Payroll - {selectedPayroll.empName}
            </h3>
            
            <div className="space-y-4">
              {/* Loan EMI (read-only) */}
              <div className="bg-amber-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-amber-700 mb-1">Fixed EMI Loans (Auto-calculated)</label>
                <div className="text-lg font-bold text-amber-800">{formatCurrency(editData.loanEmi)}</div>
                <p className="text-xs text-amber-600 mt-1">This is deducted automatically based on active EMI loans</p>
              </div>

              {/* Flexible Loan Deduction - for existing flexible loans */}
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <label className="block text-sm font-medium text-orange-700 mb-1">
                  📋 Recover from Existing Flexible Loans
                </label>
                <input
                  type="number"
                  value={editData.flexibleLoanDeduction}
                  onChange={(e) => setEditData({...editData, flexibleLoanDeduction: parseFloat(e.target.value) || 0})}
                  className="w-full border border-orange-300 rounded px-3 py-2"
                  placeholder="Amount to recover from existing flexible loans"
                />
                <p className="text-xs text-orange-600 mt-1">
                  Deduct from previously given advances/flexible loans
                </p>
              </div>

              {/* New Advance Given */}
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <label className="block text-sm font-medium text-green-700 mb-1">
                  💰 Give New Advance (Deduct from this salary)
                </label>
                <input
                  type="number"
                  value={editData.manualAdvance}
                  onChange={(e) => setEditData({...editData, manualAdvance: parseFloat(e.target.value) || 0})}
                  className="w-full border border-green-300 rounded px-3 py-2"
                  placeholder="New advance amount to give & deduct"
                />
                <p className="text-xs text-green-600 mt-1">
                  This creates a loan entry and deducts from this month's salary
                </p>
              </div>
              
              {/* Total Advance Summary */}
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total ADV (Deduction):</span>
                  <span className="font-bold text-gray-800">
                    {formatCurrency((editData.loanEmi || 0) + (editData.flexibleLoanDeduction || 0) + (editData.manualAdvance || 0))}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  = Fixed EMI ({formatCurrency(editData.loanEmi || 0)}) + Flexible Recovery ({formatCurrency(editData.flexibleLoanDeduction || 0)}) + New Advance ({formatCurrency(editData.manualAdvance || 0)})
                </div>
              </div>

              {/* Due */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due (Previous Outstanding)</label>
                <input
                  type="number"
                  value={editData.due}
                  onChange={(e) => setEditData({...editData, due: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter due amount"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus</label>
                  <input
                    type="number"
                    value={editData.bonus}
                    onChange={(e) => setEditData({...editData, bonus: parseFloat(e.target.value) || 0})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incentive</label>
                  <input
                    type="number"
                    value={editData.incentive}
                    onChange={(e) => setEditData({...editData, incentive: parseFloat(e.target.value) || 0})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Deduction</label>
                <input
                  type="number"
                  value={editData.otherDeduction}
                  onChange={(e) => setEditData({...editData, otherDeduction: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editData.remarks}
                  onChange={(e) => setEditData({...editData, remarks: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Add notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  value={paymentDetails.transactionReference}
                  onChange={(e) => setPaymentDetails({...paymentDetails, transactionReference: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter transaction reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                <input
                  type="text"
                  value={paymentDetails.paidBy}
                  onChange={(e) => setPaymentDetails({...paymentDetails, paidBy: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter name"
                />
              </div>
            </div>

            {selectedPayroll && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Amount to Pay:</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedPayroll.netSalary)}</p>
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
    </div>
  );
}

export default PayrollGen;

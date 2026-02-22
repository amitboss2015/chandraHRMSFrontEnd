// LoanList.jsx - Enhanced Loan List with Edit/Delete and Payment Tracking
import React, { useState, useEffect } from "react";
import { loanApi } from "../../services/api";

function LoanList() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [emiSchedule, setEmiSchedule] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [payEmiModal, setPayEmiModal] = useState(null);
  const [partialPayModal, setPartialPayModal] = useState(null);
  const [partialPayAmount, setPartialPayAmount] = useState('');
  const [partialPayDescription, setPartialPayDescription] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({});
  const [paymentHistoryModal, setPaymentHistoryModal] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadLoans();
  }, [statusFilter]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await loanApi.getAll('', statusFilter || null);
      // Fix status: if outstanding > 0, should be ACTIVE, not CLOSED
      const fixedData = data.map(loan => {
        if (loan.status === 'CLOSED' && loan.outstandingBalance > 0) {
          return { ...loan, status: 'ACTIVE' };
        }
        if (loan.status === 'ACTIVE' && loan.outstandingBalance <= 0) {
          return { ...loan, status: 'CLOSED' };
        }
        return loan;
      });
      setLoans(fixedData);
    } catch (error) {
      console.error('Failed to load loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewEmiSchedule = async (loan) => {
    try {
      const schedule = await loanApi.getEmiSchedule(loan.id);
      setSelectedLoan(loan);
      setEmiSchedule(schedule);
    } catch (error) {
      console.error('Failed to load EMI schedule:', error);
    }
  };

  const viewPaymentHistory = async (loan) => {
    try {
      const schedule = await loanApi.getEmiSchedule(loan.id);
      setPaymentHistoryModal({ ...loan, schedule });
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
  };

  const openEditModal = (loan) => {
    setEditModal(loan);
    setEditData({
      principalAmount: loan.principalAmount,
      emiAmount: loan.emiAmount,
      tenureMonths: loan.tenureMonths,
      interestRate: loan.interestRate || 0,
      remarks: loan.remarks || '',
      isFlexibleDeduction: loan.isFlexibleDeduction || false,
      isOneTimeDeduction: loan.isOneTimeDeduction || false
    });
  };

  const handleEditLoan = async () => {
    if (!editModal) return;
    try {
      await loanApi.update(editModal.id, editData);
      setMessage({ type: 'success', text: 'Loan updated successfully!' });
      setEditModal(null);
      loadLoans();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update loan: ' + (error.message || 'Unknown error') });
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to permanently delete this loan? This action cannot be undone.')) return;
    try {
      await loanApi.delete(loanId);
      setMessage({ type: 'success', text: 'Loan deleted successfully' });
      loadLoans();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete loan: ' + (error.message || 'Cannot delete loan with payment history') });
    }
  };

  const handlePayEmi = async (loan) => {
    try {
      const result = await loanApi.payEmi(loan.id, { repaymentMode: 'CASH' });
      setMessage({ type: 'success', text: `EMI #${result.emiNumber} paid successfully!` });
      loadLoans();
      if (selectedLoan?.id === loan.id) {
        viewEmiSchedule(loan);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to pay EMI: ' + error.message });
    }
    setPayEmiModal(null);
  };

  const handleCancelLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to cancel this loan?')) return;
    try {
      await loanApi.cancel(loanId);
      setMessage({ type: 'success', text: 'Loan cancelled successfully' });
      loadLoans();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel loan' });
    }
  };

  const handlePartialPayment = async () => {
    if (!partialPayModal || !partialPayAmount) return;
    try {
      await loanApi.partialPayment(partialPayModal.id, {
        amount: parseFloat(partialPayAmount),
        description: partialPayDescription || undefined,
        remarks: partialPayDescription || 'Partial payment recorded'
      });
      setMessage({ type: 'success', text: `Payment of ₹${partialPayAmount} recorded successfully!` });
      loadLoans();
      setPartialPayModal(null);
      setPartialPayAmount('');
      setPartialPayDescription('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to record payment: ' + error.message });
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusDisplay = (loan) => {
    if (loan.outstandingBalance <= 0) {
      return { text: 'CLOSED', color: 'bg-gray-100 text-gray-800' };
    }
    if (loan.totalPaid > 0 && loan.outstandingBalance > 0) {
      return { text: 'ACTIVE (Partial)', color: 'bg-blue-100 text-blue-800' };
    }
    if (loan.status === 'ACTIVE') {
      return { text: 'ACTIVE', color: 'bg-green-100 text-green-800' };
    }
    return { text: loan.status, color: 'bg-red-100 text-red-800' };
  };

  const getPaymentType = (loan) => {
    if (loan.isFlexibleDeduction) {
      return 'Partial Payment';
    }
    if (loan.isOneTimeDeduction) {
      return 'One-Time';
    }
    return 'EMI Based';
  };

  const filteredLoans = loans.filter(loan => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      loan.empId?.toLowerCase().includes(q) ||
      loan.empName?.toLowerCase().includes(q) ||
      loan.loanType?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-bold">Loan List</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border rounded text-sm w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button 
            onClick={loadLoans}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Bilingual Instructions - Loan Management */}
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-lg">💡</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              Loan Management Instructions / ऋण प्रबंधन निर्देश:
            </p>
            <div className="text-xs text-amber-800 space-y-2">
              <div>
                <strong>English:</strong>
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>EMI-based loans are automatically deducted from payroll according to schedule.</li>
                  <li>If loan deduction would make net salary negative, the system automatically adjusts the loan amount to only deduct up to available balance (net salary = 0).</li>
                  <li>The remaining loan balance stays outstanding and will be adjusted in future payrolls.</li>
                  <li>For flexible/non-EMI loans, admin can manually type the loan amount to deduct in payroll.</li>
                  <li>All loan payments are tracked and reflected in loan management automatically.</li>
                </ul>
              </div>
              <div>
                <strong>Hindi:</strong>
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>EMI-आधारित ऋण स्वचालित रूप से अनुसूची के अनुसार पेरोल से काटे जाते हैं।</li>
                  <li>यदि ऋण कटौती से नेट सैलरी नेगेटिव हो जाएगी, तो सिस्टम स्वचालित रूप से ऋण राशि को केवल उपलब्ध बैलेंस तक काटने के लिए समायोजित करता है (नेट सैलरी = 0)।</li>
                  <li>शेष ऋण बैलेंस बकाया रहता है और भविष्य के पेरोल में समायोजित किया जाएगा।</li>
                  <li>लचीले/गैर-EMI ऋण के लिए, व्यवस्थापक पेरोल में कटौती करने के लिए ऋण राशि मैन्युअल रूप से टाइप कर सकता है।</li>
                  <li>सभी ऋण भुगतान ट्रैक किए जाते हैं और स्वचालित रूप से ऋण प्रबंधन में परिलक्षित होते हैं।</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right">✕</button>
        </div>
      )}

      {/* Loans Table */}
      {filteredLoans.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No loans found. Add a new loan to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EMI</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan) => {
                const statusDisplay = getStatusDisplay(loan);
                const paymentType = getPaymentType(loan);
                const progressPercent = loan.principalAmount > 0 
                  ? ((loan.totalPaid || 0) / loan.principalAmount) * 100 
                  : 0;
                
                return (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">#{loan.id}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{loan.empName || loan.empId}</div>
                      <div className="text-gray-400 text-xs">{loan.empId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {loan.loanType}
                      </span>
                      {loan.isFlexibleDeduction && (
                        <span className="ml-1 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700" title="Flexible deduction">
                          Flexible
                        </span>
                      )}
                      {loan.isOneTimeDeduction && (
                        <span className="ml-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700" title="One-time deduction">
                          One-Time
                        </span>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{paymentType}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(loan.principalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {loan.isFlexibleDeduction ? (
                        <span className="text-amber-600 italic text-xs">Adjustable</span>
                      ) : (
                        formatCurrency(loan.emiAmount)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      {formatCurrency(loan.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      {formatCurrency(loan.outstandingBalance)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {loan.isFlexibleDeduction ? (
                          <>
                            <span className="text-xs text-gray-500">Paid:</span>
                            <span className="font-medium text-green-600">{formatCurrency(loan.totalPaid)}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{loan.emisPaid || 0}</span>
                            <span className="text-gray-400">/{loan.tenureMonths || 0}</span>
                          </>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            progressPercent >= 100 ? 'bg-green-500' : 
                            progressPercent > 0 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{progressPercent.toFixed(0)}%</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.color}`}>
                        {statusDisplay.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <button 
                          onClick={() => viewPaymentHistory(loan)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                          title="View Payment History"
                        >
                          📊 History
                        </button>
                        <button 
                          onClick={() => viewEmiSchedule(loan)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100"
                          title="View EMI Schedule"
                        >
                          📅 Schedule
                        </button>
                        <button 
                          onClick={() => openEditModal(loan)}
                          className="text-amber-600 hover:text-amber-800 text-xs px-2 py-1 bg-amber-50 rounded hover:bg-amber-100"
                          title="Edit Loan"
                        >
                          ✏️ Edit
                        </button>
                        {loan.status === 'ACTIVE' && (
                          <>
                            {loan.isFlexibleDeduction ? (
                              <button 
                                onClick={() => setPartialPayModal(loan)}
                                className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded hover:bg-green-100"
                                title="Record Payment"
                              >
                                💰 Pay
                              </button>
                            ) : (
                              <button 
                                onClick={() => setPayEmiModal(loan)}
                                className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded hover:bg-green-100"
                                title="Pay EMI"
                              >
                                💵 EMI
                              </button>
                            )}
                            <button 
                              onClick={() => handleCancelLoan(loan.id)}
                              className="text-orange-600 hover:text-orange-800 text-xs px-2 py-1 bg-orange-50 rounded hover:bg-orange-100"
                              title="Cancel Loan"
                            >
                              ⛔ Cancel
                            </button>
                          </>
                        )}
                        {loan.totalPaid === 0 && (
                          <button 
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded hover:bg-red-100"
                            title="Delete Loan"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment History Modal */}
      {paymentHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold">💰 Payment History - Loan #{paymentHistoryModal.id}</h3>
                <p className="text-sm text-gray-500">
                  {paymentHistoryModal.empName || paymentHistoryModal.empId} | {paymentHistoryModal.loanType}
                </p>
              </div>
              <button 
                onClick={() => setPaymentHistoryModal(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 mb-4 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <span className="text-gray-600">Principal:</span>
                  <span className="font-bold ml-2 text-gray-800">{formatCurrency(paymentHistoryModal.principalAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-bold ml-2 text-green-600">{formatCurrency(paymentHistoryModal.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-bold ml-2 text-red-600">{formatCurrency(paymentHistoryModal.outstandingBalance)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Payment Type:</span>
                  <span className="font-bold ml-2 text-indigo-600">{getPaymentType(paymentHistoryModal)}</span>
                </div>
              </div>

              {/* Payment History Table */}
              <div className="overflow-auto max-h-[50vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistoryModal.schedule && paymentHistoryModal.schedule.length > 0 ? (
                      paymentHistoryModal.schedule.map((payment, idx) => (
                        <tr key={idx} className={payment.isPaid ? 'bg-green-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium">{payment.emiNumber || idx + 1}</td>
                          <td className="px-4 py-3 text-sm">{payment.dueDate}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(payment.emiAmount)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {formatCurrency(payment.amountPaid || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(payment.balanceAfterPayment)}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            {payment.isPaid ? (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">✅ Paid</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">⏳ Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {payment.paidDate || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {payment.repaymentMode ? payment.repaymentMode.replace('_', ' ') : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          No payment history available. Payments will appear here once recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">✏️ Edit Loan - #{editModal.id}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount (₹)</label>
                <input
                  type="number"
                  value={editData.principalAmount || ''}
                  onChange={(e) => setEditData({...editData, principalAmount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded"
                  disabled={editModal.totalPaid > 0}
                />
                {editModal.totalPaid > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Cannot modify principal after payments made</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EMI Amount (₹)</label>
                <input
                  type="number"
                  value={editData.emiAmount || ''}
                  onChange={(e) => setEditData({...editData, emiAmount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded"
                  disabled={editModal.emisPaid > 0}
                />
                {editModal.emisPaid > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Cannot modify EMI after payments made</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenure (Months)</label>
                <input
                  type="number"
                  value={editData.tenureMonths || ''}
                  onChange={(e) => setEditData({...editData, tenureMonths: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded"
                  disabled={editModal.emisPaid > 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.interestRate || ''}
                  onChange={(e) => setEditData({...editData, interestRate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded"
                  disabled={editModal.totalPaid > 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editData.remarks || ''}
                  onChange={(e) => setEditData({...editData, remarks: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditLoan}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMI Schedule Modal - keeping existing */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold">EMI Schedule - Loan #{selectedLoan.id}</h3>
                <p className="text-sm text-gray-500">
                  {selectedLoan.empName || selectedLoan.empId} | {selectedLoan.loanType}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLoan(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {/* Loan Summary */}
              <div className="grid grid-cols-4 gap-4 mb-4 text-sm bg-blue-50 p-3 rounded-lg">
                <div>
                  <span className="text-gray-500">Principal:</span>
                  <span className="font-bold ml-2">{formatCurrency(selectedLoan.principalAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">EMI Amount:</span>
                  <span className="font-bold ml-2">{formatCurrency(selectedLoan.emiAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Paid:</span>
                  <span className="font-bold ml-2 text-green-600">{formatCurrency(selectedLoan.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Outstanding:</span>
                  <span className="font-bold ml-2 text-red-600">{formatCurrency(selectedLoan.outstandingBalance)}</span>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-auto max-h-[50vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EMI #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interest</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {emiSchedule.map((emi, idx) => (
                      <tr key={idx} className={emi.isPaid ? 'bg-green-50' : ''}>
                        <td className="px-4 py-3 text-sm font-medium">{emi.emiNumber}</td>
                        <td className="px-4 py-3 text-sm">{emi.dueDate}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.emiAmount)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.principalComponent)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.interestComponent)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.balanceAfterPayment)}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          {emi.isPaid ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Paid</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {emi.paidDate || '-'}
                          {emi.repaymentMode && (
                            <span className="text-gray-400 text-xs ml-1">({emi.repaymentMode})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay EMI Confirmation Modal */}
      {payEmiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">Confirm EMI Payment</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to record EMI payment for:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p><strong>Employee:</strong> {payEmiModal.empName || payEmiModal.empId}</p>
              <p><strong>Loan Type:</strong> {payEmiModal.loanType}</p>
              <p><strong>EMI Amount:</strong> {formatCurrency(payEmiModal.emiAmount)}</p>
              <p><strong>EMI #:</strong> {(payEmiModal.emisPaid || 0) + 1} of {payEmiModal.tenureMonths}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPayEmiModal(null)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayEmi(payEmiModal)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Payment Modal for Flexible Loans */}
      {partialPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">💰 Record Partial Payment</h3>
            <div className="bg-amber-50 p-4 rounded-lg mb-4 border border-amber-200">
              <p><strong>Employee:</strong> {partialPayModal.empName || partialPayModal.empId}</p>
              <p><strong>Loan Type:</strong> {partialPayModal.loanType}</p>
              <p><strong>Outstanding:</strong> <span className="text-red-600 font-bold">{formatCurrency(partialPayModal.outstandingBalance)}</span></p>
              <p><strong>Already Paid:</strong> <span className="text-green-600">{formatCurrency(partialPayModal.totalPaid)}</span></p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                value={partialPayAmount}
                onChange={(e) => setPartialPayAmount(e.target.value)}
                max={partialPayModal.outstandingBalance}
                min="1"
                placeholder="Enter amount to deduct"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: {formatCurrency(partialPayModal.outstandingBalance)}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Description / भुगतान विवरण <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={partialPayDescription}
                onChange={(e) => setPartialPayDescription(e.target.value)}
                placeholder="Enter reason for payment, what it's for, etc. / भुगतान का कारण दर्ज करें..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: "Advance payment for medical expenses" / उदाहरण: "चिकित्सा व्यय के लिए अग्रिम भुगतान"
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setPartialPayModal(null); setPartialPayAmount(''); }}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePartialPayment}
                disabled={!partialPayAmount || parseFloat(partialPayAmount) <= 0}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoanList;

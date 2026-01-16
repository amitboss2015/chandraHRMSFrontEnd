// LoanList.jsx - Enhanced Loan List with Actions
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
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadLoans();
  }, [statusFilter]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await loanApi.getAll('ORG001', statusFilter || null);
      setLoans(data);
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

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
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
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(loan.principalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(loan.emiAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                    {formatCurrency(loan.outstandingBalance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="font-medium">{loan.emisPaid || 0}</span>
                    <span className="text-gray-400">/{loan.tenureMonths}</span>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-green-500 h-1 rounded-full" 
                        style={{ width: `${((loan.emisPaid || 0) / loan.tenureMonths) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      loan.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>{loan.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex space-x-2 justify-center">
                      <button 
                        onClick={() => viewEmiSchedule(loan)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        EMI Schedule
                      </button>
                      {loan.status === 'ACTIVE' && (
                        <>
                          <button 
                            onClick={() => setPayEmiModal(loan)}
                            className="text-green-600 hover:text-green-800 text-xs underline"
                          >
                            Pay EMI
                          </button>
                          <button 
                            onClick={() => handleCancelLoan(loan.id)}
                            className="text-red-600 hover:text-red-800 text-xs underline"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EMI Schedule Modal */}
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
    </div>
  );
}

export default LoanList;

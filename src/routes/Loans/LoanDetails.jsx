// LoanDetails.jsx - View single loan details with repayment history
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loanApi } from '../../services/api';

function LoanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadLoanDetails();
    }
  }, [id]);

  const loadLoanDetails = async () => {
    try {
      setLoading(true);
      const loanData = await loanApi.getById(id);
      setLoan(loanData);
      
      const scheduleData = await loanApi.getEmiSchedule(id);
      setSchedule(scheduleData);
    } catch (err) {
      console.error('Failed to load loan details:', err);
      setError('Failed to load loan details');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Loan not found'}</p>
        <button 
          onClick={() => navigate('/loans')}
          className="mt-4 text-blue-600 hover:underline"
        >
          ← Back to Loans
        </button>
      </div>
    );
  }

  const progressPercent = ((loan.emisPaid || 0) / loan.tenureMonths) * 100;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button 
            onClick={() => navigate('/loans')}
            className="text-blue-600 hover:underline text-sm mb-2"
          >
            ← Back to Loans
          </button>
          <h2 className="text-2xl font-bold">Loan #{loan.id}</h2>
          <p className="text-gray-500">{loan.empName || loan.empId} | {loan.loanType}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
          loan.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {loan.status}
        </span>
      </div>

      {/* Loan Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600">Principal Amount</div>
          <div className="text-xl font-bold text-blue-800">{formatCurrency(loan.principalAmount)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600">Total Paid</div>
          <div className="text-xl font-bold text-green-800">{formatCurrency(loan.totalPaid)}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-600">Outstanding</div>
          <div className="text-xl font-bold text-red-800">{formatCurrency(loan.outstandingBalance)}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600">Monthly EMI</div>
          <div className="text-xl font-bold text-purple-800">{formatCurrency(loan.emiAmount)}</div>
        </div>
      </div>

      {/* Loan Details */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="font-bold mb-4">Loan Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Employee Code:</span>
            <div className="font-medium">{loan.empId}</div>
          </div>
          <div>
            <span className="text-gray-500">Employee Name:</span>
            <div className="font-medium">{loan.empName}</div>
          </div>
          <div>
            <span className="text-gray-500">Loan Type:</span>
            <div className="font-medium">{loan.loanType}</div>
          </div>
          <div>
            <span className="text-gray-500">Interest Rate:</span>
            <div className="font-medium">{loan.interestRate || 0}% p.a.</div>
          </div>
          <div>
            <span className="text-gray-500">Tenure:</span>
            <div className="font-medium">{loan.tenureMonths} months</div>
          </div>
          <div>
            <span className="text-gray-500">Sanction Date:</span>
            <div className="font-medium">{loan.sanctionDate}</div>
          </div>
          <div>
            <span className="text-gray-500">First EMI Date:</span>
            <div className="font-medium">{loan.firstEmiDate}</div>
          </div>
          <div>
            <span className="text-gray-500">Total Repayable:</span>
            <div className="font-medium">{formatCurrency(loan.totalRepayable)}</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>EMI Progress</span>
            <span className="font-medium">{loan.emisPaid || 0} / {loan.tenureMonths} EMIs</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {loan.remarks && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <span className="text-gray-500 text-sm">Remarks:</span>
            <p className="text-sm">{loan.remarks}</p>
          </div>
        )}
      </div>

      {/* Repayment Schedule */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-bold mb-4">Repayment Schedule</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EMI #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EMI Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interest</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedule.map((emi, idx) => (
                <tr key={idx} className={emi.isPaid ? 'bg-green-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-medium">{emi.emiNumber}</td>
                  <td className="px-4 py-3 text-sm">{emi.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.emiAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.principalComponent)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.interestComponent)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(emi.balanceAfterPayment)}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      emi.isPaid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {emi.isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {emi.paidDate || '-'}
                    {emi.repaymentMode && (
                      <span className="text-gray-400 text-xs block">{emi.repaymentMode}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LoanDetails;

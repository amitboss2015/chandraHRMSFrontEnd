// LoanReports.jsx - Comprehensive Loan Reports
import React, { useState, useEffect } from "react";
import { loanApi, employeeApi } from "../../services/api";

function LoanReports() {
  const [activeReport, setActiveReport] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [monthlyDeductions, setMonthlyDeductions] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeReport, setEmployeeReport] = useState(null);
  
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  useEffect(() => {
    loadSummary();
    loadEmployees();
  }, []);

  useEffect(() => {
    if (activeReport === 'active') {
      loadActiveLoans();
    } else if (activeReport === 'deductions') {
      loadMonthlyDeductions();
    } else if (activeReport === 'upcoming') {
      loadUpcomingDues();
    }
  }, [activeReport, year, month]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await loanApi.getSummary();
      setSummaryData(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveLoans = async () => {
    try {
      setLoading(true);
      const data = await loanApi.getActiveLoansReport();
      setActiveLoans(data);
    } catch (error) {
      console.error('Failed to load active loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyDeductions = async () => {
    try {
      setLoading(true);
      const data = await loanApi.getMonthlyDeductions(year, month);
      setMonthlyDeductions(data);
    } catch (error) {
      console.error('Failed to load monthly deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingDues = async () => {
    try {
      setLoading(true);
      const data = await loanApi.getUpcomingDues(30);
      setUpcomingDues(data);
    } catch (error) {
      console.error('Failed to load upcoming dues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await employeeApi.getAll();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadEmployeeReport = async (empId) => {
    if (!empId) return;
    try {
      setLoading(true);
      const data = await loanApi.getEmployeeLoanReport(empId);
      setEmployeeReport(data);
    } catch (error) {
      console.error('Failed to load employee report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const reportTabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'active', label: 'Active Loans' },
    { id: 'deductions', label: 'Monthly Deductions' },
    { id: 'upcoming', label: 'Upcoming EMIs' },
    { id: 'employee', label: 'Employee Report' },
  ];

  return (
    <div>
      {/* Report Tabs */}
      <div className="flex space-x-2 mb-6 border-b pb-2 overflow-x-auto">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium whitespace-nowrap ${
              activeReport === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Report */}
          {activeReport === 'summary' && summaryData && (
            <div>
              <h3 className="text-lg font-bold mb-4">Loan Summary Dashboard</h3>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Loans</div>
                  <div className="text-2xl font-bold text-blue-800">{summaryData.totalLoans}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Active Loans</div>
                  <div className="text-2xl font-bold text-green-800">{summaryData.activeLoans}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">Closed Loans</div>
                  <div className="text-2xl font-bold text-gray-800">{summaryData.closedLoans}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Employees with Loans</div>
                  <div className="text-2xl font-bold text-purple-800">{summaryData.employeesWithActiveLoans}</div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Disbursed</div>
                  <div className="text-xl font-bold text-gray-800">{formatCurrency(summaryData.totalDisbursed)}</div>
                </div>
                <div className="bg-white border p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Outstanding</div>
                  <div className="text-xl font-bold text-red-600">{formatCurrency(summaryData.totalOutstanding)}</div>
                </div>
                <div className="bg-white border p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Recovered</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(summaryData.totalRecovered)}</div>
                </div>
                <div className="bg-white border p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Monthly EMI Burden</div>
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(summaryData.totalMonthlyEmi)}</div>
                </div>
              </div>

              {/* Loan Type Breakdown */}
              {summaryData.byLoanType && Object.keys(summaryData.byLoanType).length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Loans by Type</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {Object.entries(summaryData.byLoanType).map(([type, count]) => (
                      <div key={type} className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">{type}</div>
                        <div className="font-bold">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Loans Report */}
          {activeReport === 'active' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Active Loans</h3>
              
              {activeLoans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No active loans found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EMI</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sanction Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeLoans.map((loan, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{loan.empId}</td>
                          <td className="px-4 py-3 text-sm">{loan.empName}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{loan.loanType}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(loan.principalAmount)}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(loan.emiAmount)}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="font-medium">{loan.emisPaid}</span>
                            <span className="text-gray-400">/{loan.tenureMonths}</span>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-green-500 h-1.5 rounded-full" 
                                style={{ width: `${(loan.emisPaid / loan.tenureMonths) * 100}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                            {formatCurrency(loan.outstandingBalance)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">{loan.sanctionDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Monthly Deductions Report */}
          {activeReport === 'deductions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Monthly EMI Deductions</h3>
                <div className="flex space-x-2">
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {monthlyDeductions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No EMI deductions for this month.</div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <span className="text-blue-600 font-medium">Total Monthly Deductions: </span>
                    <span className="text-xl font-bold text-blue-800">
                      {formatCurrency(monthlyDeductions.reduce((sum, d) => sum + (d.totalMonthlyEmi || 0), 0))}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active Loans</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total EMI</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {monthlyDeductions.map((ded, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{ded.empId}</td>
                            <td className="px-4 py-3 text-sm">{ded.empName}</td>
                            <td className="px-4 py-3 text-sm text-center">{ded.activeLoansCount}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                              {formatCurrency(ded.totalMonthlyEmi)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {ded.loans?.map((loan, i) => (
                                <span key={i} className="inline-block mr-2 px-2 py-1 bg-gray-100 rounded text-xs">
                                  {loan.loanType}: {formatCurrency(loan.emiAmount)}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upcoming EMI Dues */}
          {activeReport === 'upcoming' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Upcoming EMI Dues (Next 30 Days)</h3>
              
              {upcomingDues.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No upcoming EMI dues.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Type</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">EMI #</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Days Until Due</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {upcomingDues.map((due, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${due.daysUntilDue <= 7 ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium">{due.dueDate}</td>
                          <td className="px-4 py-3 text-sm">{due.empId}</td>
                          <td className="px-4 py-3 text-sm">{due.empName}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{due.loanType}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">{due.emiNumber}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(due.emiAmount)}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              due.daysUntilDue <= 7 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {due.daysUntilDue} days
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Employee Report */}
          {activeReport === 'employee' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Employee Loan Report</h3>
              
              <div className="mb-4 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    loadEmployeeReport(e.target.value);
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.empCode}>
                      {emp.empCode} - {emp.firstName} {emp.lastName || ''}
                    </option>
                  ))}
                </select>
              </div>

              {employeeReport && (
                <div className="mt-6">
                  {/* Employee Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-bold text-lg mb-2">{employeeReport.empName} ({employeeReport.empId})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Total Loans</span>
                        <div className="font-bold">{employeeReport.totalLoans}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Active Loans</span>
                        <div className="font-bold text-green-600">{employeeReport.activeLoans}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Total Borrowed</span>
                        <div className="font-bold">{formatCurrency(employeeReport.totalBorrowed)}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Total Repaid</span>
                        <div className="font-bold text-green-600">{formatCurrency(employeeReport.totalPaid)}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Outstanding</span>
                        <div className="font-bold text-red-600">{formatCurrency(employeeReport.totalOutstanding)}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-sm text-gray-500">Current Monthly EMI: </span>
                      <span className="font-bold text-blue-600">{formatCurrency(employeeReport.currentMonthlyEmi)}</span>
                    </div>
                  </div>

                  {/* Loan History */}
                  {employeeReport.loans && employeeReport.loans.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EMI</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employeeReport.loans.map((loan, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium">#{loan.loanId}</td>
                              <td className="px-4 py-3 text-sm">{loan.loanType}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(loan.principalAmount)}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(loan.emiAmount)}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {loan.emisPaid}/{loan.tenureMonths}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(loan.totalPaid)}</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(loan.outstandingBalance)}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                  loan.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>{loan.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default LoanReports;

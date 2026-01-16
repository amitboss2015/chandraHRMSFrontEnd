// LoanReport.jsx - Real API Integration
import React, { useState, useEffect } from "react";
import { reportApi } from "../../services/api";

function LoanReport() {
  const now = new Date();
  const [reportType, setReportType] = useState("active");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      let result;
      if (reportType === 'active') {
        result = await reportApi.getActiveLoans();
      } else {
        result = await reportApi.getLoanDeductions(year, month);
      }
      setData(result || []);
    } catch (error) {
      console.error('Failed to load report:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, year, month]);

  const getMonthName = (m) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1];
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loan_${reportType}_report${reportType === 'deductions' ? `_${year}_${month}` : ''}.csv`;
    link.click();
  };

  // Calculate totals for active loans
  const totals = reportType === 'active' ? {
    totalPrincipal: data.reduce((sum, l) => sum + (l.principal || 0), 0),
    totalOutstanding: data.reduce((sum, l) => sum + (l.outstanding || 0), 0),
    totalEmi: data.reduce((sum, l) => sum + (l.emiAmount || 0), 0),
    activeCount: data.filter(l => l.status === 'ACTIVE').length,
    closedCount: data.filter(l => l.status === 'CLOSED').length,
  } : {
    totalDeductions: data.reduce((sum, d) => sum + (d.loanDeduction || 0), 0),
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="active">All Loans Report</option>
            <option value="deductions">Monthly Deductions</option>
          </select>
        </div>

        {reportType === 'deductions' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={loadReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh
        </button>

        {data.length > 0 && (
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {reportType === 'active' && data.length > 0 && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Total Loans</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{totals.activeCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
            <p className="text-sm text-gray-500">Closed</p>
            <p className="text-2xl font-bold text-gray-600">{totals.closedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-sm text-gray-500">Total Principal</p>
            <p className="text-xl font-bold">{formatCurrency(totals.totalPrincipal)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.totalOutstanding)}</p>
          </div>
        </div>
      )}

      {reportType === 'deductions' && data.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 mb-6 max-w-xs">
          <p className="text-sm text-gray-500">Total Deductions for {getMonthName(month)} {year}</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.totalDeductions)}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p>No data available.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                {reportType === 'active' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EMI</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sanction Date</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Earnings</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Loan Deduction</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                  {reportType === 'active' ? (
                    <>
                      <td className="px-4 py-3 text-sm">{row.loanId}</td>
                      <td className="px-4 py-3 text-sm font-medium">{row.empCode}</td>
                      <td className="px-4 py-3 text-sm">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.loanType}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(row.principal)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(row.emiAmount)}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="text-blue-600 font-medium">{row.emisPaid}</span>
                        <span className="text-gray-400">/{row.tenure || (row.emisPaid + row.emisRemaining)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                        {formatCurrency(row.outstanding)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          row.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          row.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.sanctionDate}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium">{row.empCode}</td>
                      <td className="px-4 py-3 text-sm">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(row.grossEarnings)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                        {formatCurrency(row.loanDeduction)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                        {formatCurrency(row.netPay)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LoanReport;

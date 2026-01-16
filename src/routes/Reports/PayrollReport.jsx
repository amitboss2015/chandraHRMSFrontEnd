// PayrollReport.jsx - Real API Integration with Salary Sheet Format
import React, { useState, useEffect } from "react";
import { reportApi } from "../../services/api";

function PayrollReport() {
  const now = new Date();
  const [reportType, setReportType] = useState("salary-sheet");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [empId, setEmpId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      let result;
      switch (reportType) {
        case 'salary-sheet':
          result = await reportApi.getSalarySheet(year, month);
          break;
        case 'epf':
          result = await reportApi.getEpfReport(year, month);
          break;
        case 'esic':
          result = await reportApi.getEsicReport(year, month);
          break;
        case 'payslip':
          if (empId) {
            result = await reportApi.getPayslip(empId, year, month);
          }
          break;
        default:
          break;
      }
      setData(result);
    } catch (error) {
      console.error('Failed to load report:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType !== 'payslip') {
      loadReport();
    }
  }, [reportType, year, month]);

  const getMonthName = (m) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
    if (!data) return;
    
    let csvData = [];
    if (reportType === 'salary-sheet' && data.data) {
      csvData = data.data;
    } else if (Array.isArray(data)) {
      csvData = data;
    }
    
    if (csvData.length === 0) return;
    
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportType}_report_${year}_${month}.csv`;
    link.click();
  };

  const renderSalarySheet = () => {
    if (!data || !data.data) return null;

    return (
      <div>
        {/* Company Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold text-center">SALARY SHEET</h2>
          <p className="text-center text-blue-100">For the Month of {getMonthName(month)} {year}</p>
        </div>

        {/* Summary */}
        {data.totals && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-xl font-bold">{data.employeeCount}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Gross</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(data.totals.totalGross)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">EPF + ESIC</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency((data.totals.totalEpf || 0) + (data.totals.totalEsic || 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Net Pay</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(data.totals.totalNet)}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp ID</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Att.</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Basic</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allowances</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">EPF</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">ESIC</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">UAN</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-sm font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-sm text-gray-500">{row.empCode}</td>
                  <td className="px-3 py-2 text-sm text-center">{row.presentDays}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatCurrency(row.payableBasic)}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatCurrency(row.payableAllowance)}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatCurrency(row.grossEarnings)}</td>
                  <td className="px-3 py-2 text-sm text-right text-orange-600">{formatCurrency(row.epf)}</td>
                  <td className="px-3 py-2 text-sm text-right text-orange-600">{formatCurrency(row.esic)}</td>
                  <td className="px-3 py-2 text-sm text-right font-bold text-blue-600">{formatCurrency(row.netPay)}</td>
                  <td className="px-3 py-2 text-sm text-gray-400">{row.uanNumber || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEpfEsicReport = (type) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return (
      <div className="overflow-x-auto">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-center">
            {type === 'epf' ? 'EPF CONTRIBUTION REPORT' : 'ESIC CONTRIBUTION REPORT'}
          </h2>
          <p className="text-center text-purple-100">{getMonthName(month)} {year}</p>
        </div>
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {type === 'epf' ? 'UAN Number' : 'ESIC Number'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Wages</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {type === 'epf' ? 'EPF Wages' : 'Employee'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {type === 'epf' ? 'Employee' : 'Employer'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {type === 'epf' ? 'Employer' : 'Total'}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-sm">{type === 'epf' ? row.uanNumber : row.esicNumber}</td>
                <td className="px-4 py-3 text-sm">{row.empCode}</td>
                <td className="px-4 py-3 text-sm">{row.name}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(row.grossWages)}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatCurrency(type === 'epf' ? row.epfWages : row.esicEmployee)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatCurrency(type === 'epf' ? row.epfEmployee : row.esicEmployer)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatCurrency(type === 'epf' ? row.epfEmployer : row.totalContribution)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold">
                  {formatCurrency(row.totalContribution)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPayslip = () => {
    if (!data) return null;

    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-6">
          <h2 className="text-2xl font-bold text-center">PAYSLIP</h2>
          <p className="text-center text-indigo-100">{getMonthName(month)} {year}</p>
        </div>

        {/* Employee Info */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Employee Code</p>
              <p className="font-medium">{data.empCode}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="font-medium">{data.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="font-medium">{data.department || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Designation</p>
              <p className="font-medium">{data.designation || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bank Account</p>
              <p className="font-medium">{data.bankAccount || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">UAN Number</p>
              <p className="font-medium">{data.uanNumber || '-'}</p>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="p-6 border-b">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Attendance Summary</h3>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="bg-green-50 p-3 rounded">
              <p className="text-2xl font-bold text-green-600">{data.presentDays || 0}</p>
              <p className="text-xs text-gray-500">Present</p>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <p className="text-2xl font-bold text-red-600">{data.absentDays || 0}</p>
              <p className="text-xs text-gray-500">Absent</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-2xl font-bold text-blue-600">{data.paidLeaveDays || 0}</p>
              <p className="text-xs text-gray-500">Leaves</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-2xl font-bold text-purple-600">{data.weeklyOffDays || 0}</p>
              <p className="text-xs text-gray-500">Weekly Off</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-2xl font-bold text-yellow-600">{data.holidayDays || 0}</p>
              <p className="text-xs text-gray-500">Holidays</p>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Earnings */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Earnings</h3>
              {data.earnings && Object.entries(data.earnings).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex justify-between py-1">
                    <span className="text-sm text-gray-600">{key}</span>
                    <span className="text-sm">{formatCurrency(value)}</span>
                  </div>
                )
              ))}
              <div className="flex justify-between py-2 border-t mt-2 font-bold">
                <span>Gross Earnings</span>
                <span className="text-green-600">{formatCurrency(data.grossEarnings)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Deductions</h3>
              {data.deductions && Object.entries(data.deductions).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex justify-between py-1">
                    <span className="text-sm text-gray-600">{key}</span>
                    <span className="text-sm">{formatCurrency(value)}</span>
                  </div>
                )
              ))}
              <div className="flex justify-between py-2 border-t mt-2 font-bold">
                <span>Total Deductions</span>
                <span className="text-red-600">{formatCurrency(data.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex justify-between items-center">
            <span className="text-lg">Net Pay</span>
            <span className="text-3xl font-bold">{formatCurrency(data.netPay)}</span>
          </div>
        </div>
      </div>
    );
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
            <option value="salary-sheet">Salary Sheet</option>
            <option value="epf">EPF Contribution</option>
            <option value="esic">ESIC Contribution</option>
            <option value="payslip">Employee Payslip</option>
          </select>
        </div>

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

        {reportType === 'payslip' && (
          <>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="Employee Code"
              className="border rounded px-3 py-2"
            />
            <button
              onClick={loadReport}
              disabled={!empId}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Generate Payslip
            </button>
          </>
        )}

        {(reportType !== 'payslip' && data) && (
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {reportType === 'salary-sheet' && renderSalarySheet()}
          {reportType === 'epf' && renderEpfEsicReport('epf')}
          {reportType === 'esic' && renderEpfEsicReport('esic')}
          {reportType === 'payslip' && renderPayslip()}

          {!data && (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              <p>No data available for the selected period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PayrollReport;

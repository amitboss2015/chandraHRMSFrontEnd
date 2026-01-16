// SalarySheets.jsx - Monthly Salary Sheets Overview
import React, { useState, useEffect } from "react";
import { payrollApi } from "../../services/api";

function SalarySheets() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    try {
      setLoading(true);
      // Load last 12 months of payroll summaries
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      const summaries = [];
      for (let i = 0; i < 12; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        if (month <= 0) {
          month += 12;
          year -= 1;
        }
        
        try {
          const summary = await payrollApi.getSummary(year, month);
          if (summary.employeeCount > 0) {
            summaries.push({
              id: `${year}-${month}`,
              year,
              month,
              ...summary
            });
          }
        } catch (e) {
          // Skip if no data for this month
        }
      }
      
      setSheets(summaries);
    } catch (error) {
      console.error('Failed to load sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (sheet) => {
    setSelectedSheet(sheet);
    try {
      // Only fetch PAID payrolls for salary sheet display
      const data = await payrollApi.getPaid(sheet.year, sheet.month);
      setPayrolls(data);
      setShowDetails(true);
    } catch (error) {
      console.error('Failed to load details:', error);
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
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m - 1];
  };

  const getStatusSummary = (sheet) => {
    const total = sheet.employeeCount || 0;
    const paid = sheet.paidCount || 0;
    const approved = sheet.approvedCount || 0;
    const draft = sheet.draftCount || 0;
    
    if (paid === total && total > 0) return { text: 'All Paid', color: 'bg-green-100 text-green-800' };
    if (approved > 0) return { text: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800' };
    if (draft === total) return { text: 'Draft', color: 'bg-gray-100 text-gray-800' };
    return { text: 'In Progress', color: 'bg-blue-100 text-blue-800' };
  };

  const exportToCSV = (sheet) => {
    // This would export the salary sheet to CSV
    alert('Export functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Monthly Salary Sheets</h2>
        <button 
          onClick={loadSheets}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
        >
          🔄 Refresh
        </button>
      </div>

      {sheets.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-lg">No salary sheets found</p>
          <p className="text-sm mt-2">Generate payroll from the "Payroll Generation" tab to create salary sheets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((sheet) => {
            const status = getStatusSummary(sheet);
            return (
              <div key={sheet.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4">
                  <h3 className="text-lg font-bold">{getMonthName(sheet.month)} {sheet.year}</h3>
                  <p className="text-sm text-slate-300">{sheet.employeeCount} Employees</p>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Salary:</span>
                    <span className="font-medium text-green-600">{formatCurrency(sheet.totalGrossSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deductions:</span>
                    <span className="font-medium text-red-600">{formatCurrency(sheet.totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-800 font-medium">Net Salary:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(sheet.totalNetSalary)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                      {status.text}
                    </span>
                    <div className="text-xs text-gray-500">
                      <span className="text-green-600">{sheet.paidCount || 0} paid</span>
                      <span className="mx-1">|</span>
                      <span className="text-blue-600">{sheet.approvedCount || 0} approved</span>
                      <span className="mx-1">|</span>
                      <span className="text-gray-600">{sheet.draftCount || 0} draft</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 flex gap-2">
                  <button
                    onClick={() => viewDetails(sheet)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => exportToCSV(sheet)}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300"
                  >
                    📥 Export
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal - Shows only PAID payrolls */}
      {showDetails && selectedSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  Salary Sheet - {getMonthName(selectedSheet.month)} {selectedSheet.year}
                </h3>
                <p className="text-sm text-slate-300">Showing only paid salaries ({payrolls.length} employees)</p>
              </div>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-auto max-h-[calc(90vh-100px)]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">SR.</th>
                    <th className="px-3 py-2 text-left">EMP NAME</th>
                    <th className="px-3 py-2 text-left">EMP ID</th>
                    <th className="px-3 py-2 text-right">BASIC</th>
                    <th className="px-3 py-2 text-right">INCREMENT</th>
                    <th className="px-3 py-2 text-right">FINAL PAY</th>
                    <th className="px-3 py-2 text-center">W.DAYS</th>
                    <th className="px-3 py-2 text-center">PRESENT</th>
                    <th className="px-3 py-2 text-right">W.DAY AMT</th>
                    <th className="px-3 py-2 text-right">OT AMT</th>
                    <th className="px-3 py-2 text-right">HRA</th>
                    <th className="px-3 py-2 text-right">GROSS</th>
                    <th className="px-3 py-2 text-right">ESI</th>
                    <th className="px-3 py-2 text-right">PF</th>
                    <th className="px-3 py-2 text-right">ADV</th>
                    <th className="px-3 py-2 text-right">NET</th>
                    <th className="px-3 py-2 text-center">STATUS</th>
                    <th className="px-3 py-2 text-center">PAYMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payrolls.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{p.empName || p.empId}</td>
                      <td className="px-3 py-2">{p.empId}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.basicSalary)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.increment)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.finalPayment)}</td>
                      <td className="px-3 py-2 text-center">{p.totalWorkingDays || 0}</td>
                      <td className="px-3 py-2 text-center text-green-600 font-medium">{p.presentDays || 0}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.workingDayAmount)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency((p.overtimeDayAmount || 0) + (p.overtimeHourAmount || 0))}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.houseRent)}</td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">{formatCurrency(p.grossSalary)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(p.esiEmployee)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(p.pfEmployee)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(p.advance)}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-600">{formatCurrency(p.netSalary)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          p.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        {p.paymentMode && (
                          <span className="text-gray-600">{p.paymentMode}</span>
                        )}
                        {p.paidDate && (
                          <div className="text-gray-400">{p.paidDate}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                  <tr>
                    <td colSpan={8} className="px-3 py-3 text-right">TOTALS:</td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.workingDayAmount || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.overtimeDayAmount || 0) + (p.overtimeHourAmount || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.houseRent || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-green-600">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-red-600">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.esiEmployee || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-red-600">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.pfEmployee || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-red-600">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.advance || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-blue-600">
                      {formatCurrency(payrolls.reduce((s, p) => s + (p.netSalary || 0), 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalarySheets;

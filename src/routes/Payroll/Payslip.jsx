// ===========================
// Payslip.jsx - Comprehensive Payslip with Payment Sheet Format
// ===========================
import React, { useState, useEffect } from "react";
import { reportApi, employeeApi } from "../../services/api";

function Payslip() {
  const now = new Date();
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [empId, setEmpId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeeApi.getAll();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = employees.filter(emp => 
        emp.empCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10);
      setFilteredEmployees(filtered);
      setShowDropdown(true);
    } else {
      setFilteredEmployees([]);
      setShowDropdown(false);
    }
  }, [searchQuery, employees]);

  const selectEmployee = (emp) => {
    setEmpId(emp.empCode);
    setSearchQuery(`${emp.empCode} - ${emp.firstName} ${emp.lastName || ''}`);
    setShowDropdown(false);
  };

  const generatePayslip = async () => {
    if (!empId) {
      setError('Please select an employee');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await reportApi.getPayslip(empId, year, month);
      if (data) {
        setPayslip(data);
      } else {
        setError('No payroll data found for the selected period. Please generate payroll first.');
      }
    } catch (err) {
      console.error('Failed to generate payslip:', err);
      setError('Failed to generate payslip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m - 1];
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 2 
    }).format(amount);
  };

  const printPayslip = () => {
    window.print();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Employee Payslip</h2>
      
      <div className="flex flex-wrap gap-4 mb-6 items-end bg-white p-4 rounded-lg shadow">
        {/* Employee Search */}
        <div className="relative min-w-[300px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {showDropdown && filteredEmployees.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => selectEmployee(emp)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <span className="font-medium">{emp.empCode}</span>
                  <span className="text-gray-600 ml-2">{emp.firstName} {emp.lastName || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Month */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          onClick={generatePayslip}
          disabled={loading}
        >
          {loading ? 'Loading...' : '📄 Generate Payslip'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {payslip && (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none" id="payslip">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6 print:bg-slate-700">
            <h2 className="text-2xl font-bold text-center">SALARY SLIP</h2>
            <p className="text-center text-slate-300">For the month of {getMonthName(month)} {year}</p>
          </div>

          {/* Employee Info */}
          <div className="p-6 border-b bg-gray-50">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Employee Code</p>
                <p className="font-bold text-lg">{payslip.empCode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Name</p>
                <p className="font-bold text-lg">{payslip.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Department</p>
                <p className="font-medium">{payslip.department || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Designation</p>
                <p className="font-medium">{payslip.designation || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Bank Account</p>
                <p className="font-medium">{payslip.bankAccount || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">UAN Number</p>
                <p className="font-medium">{payslip.uanNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">ESIC Number</p>
                <p className="font-medium">{payslip.esicNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <p className={`font-medium ${
                  payslip.status === 'PAID' ? 'text-green-600' : 
                  payslip.status === 'APPROVED' ? 'text-blue-600' : 'text-gray-600'
                }`}>{payslip.status}</p>
              </div>
            </div>
          </div>

          {/* Salary Structure */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase">Salary Structure</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Basic Salary</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(payslip.basicSalary)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Allowance</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(payslip.increment)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Final Payment (Monthly)</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(payslip.finalPayment)}</p>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase">Attendance Summary</h3>
            <div className="grid grid-cols-6 gap-3 text-center">
              <div className="bg-slate-100 p-3 rounded">
                <p className="text-2xl font-bold text-slate-700">{payslip.totalWorkingDays || 0}</p>
                <p className="text-xs text-gray-500">Working Days</p>
              </div>
              <div className="bg-green-100 p-3 rounded">
                <p className="text-2xl font-bold text-green-600">{payslip.presentDays || 0}</p>
                <p className="text-xs text-gray-500">Present</p>
              </div>
              <div className="bg-red-100 p-3 rounded">
                <p className="text-2xl font-bold text-red-600">{payslip.absentDays || 0}</p>
                <p className="text-xs text-gray-500">Absent</p>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <p className="text-2xl font-bold text-blue-600">{payslip.paidLeaveDays || 0}</p>
                <p className="text-xs text-gray-500">Leaves</p>
              </div>
              <div className="bg-orange-100 p-3 rounded">
                <p className="text-2xl font-bold text-orange-600">{payslip.overtimeDays || 0}</p>
                <p className="text-xs text-gray-500">OT Days</p>
              </div>
              <div className="bg-purple-100 p-3 rounded">
                <p className="text-2xl font-bold text-purple-600">{payslip.overtimeHours || '0.00'}</p>
                <p className="text-xs text-gray-500">OT Hours</p>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Earnings */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2 uppercase bg-green-50 p-2 rounded-t">
                  💰 Earnings
                </h3>
                <div className="space-y-2">
                  {payslip.earnings && Object.entries(payslip.earnings).map(([key, value]) => (
                    value && value > 0 && (
                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{key}</span>
                        <span className="text-sm font-medium">{formatCurrency(value)}</span>
                      </div>
                    )
                  ))}
                </div>
                {payslip.dynamicAllowances && payslip.dynamicAllowances.length > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Dynamic Allowance Breakdown</p>
                    {payslip.dynamicAllowances.map((a, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-gray-600">{a.allowanceTypeName}: {a.daysUsed} × {formatCurrency(a.rate)}</span>
                        <span className="font-medium">{formatCurrency(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between py-3 mt-2 bg-green-100 px-2 rounded font-bold">
                  <span>Gross Salary</span>
                  <span className="text-green-700">{formatCurrency(payslip.grossSalary)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2 uppercase bg-red-50 p-2 rounded-t">
                  📉 Deductions
                </h3>
                <div className="space-y-2">
                  {payslip.deductions && Object.entries(payslip.deductions).map(([key, value]) => (
                    value && value > 0 && (
                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{key}</span>
                        <span className="text-sm font-medium text-red-600">{formatCurrency(value)}</span>
                      </div>
                    )
                  ))}
                </div>
                <div className="flex justify-between py-3 mt-2 bg-red-100 px-2 rounded font-bold">
                  <span>Total Deductions</span>
                  <span className="text-red-700">{formatCurrency(payslip.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg">Net Salary Payable</span>
                {payslip.paidDate && (
                  <p className="text-sm text-emerald-100">Paid on: {payslip.paidDate}</p>
                )}
              </div>
              <span className="text-4xl font-bold">{formatCurrency(payslip.netSalary)}</span>
            </div>
          </div>

          {/* Payment Info */}
          {payslip.paymentMode && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Payment Mode:</span>
                  <span className="ml-2 font-medium">{payslip.paymentMode}</span>
                </div>
                {payslip.transactionReference && (
                  <div>
                    <span className="text-gray-500">Transaction Ref:</span>
                    <span className="ml-2 font-medium">{payslip.transactionReference}</span>
                  </div>
                )}
              </div>
              {payslip.remarks && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Remarks:</span>
                  <span className="ml-2">{payslip.remarks}</span>
                </div>
              )}
            </div>
          )}

          {/* Company Contribution Note */}
          <div className="p-4 bg-blue-50 text-sm text-blue-800">
            <p><strong>Note:</strong> Company PF Contribution: {formatCurrency(payslip.pfCompany)} (6% of Final Payment)</p>
          </div>

          {/* Actions */}
          <div className="p-4 bg-gray-100 flex justify-end gap-4 print:hidden">
            <button 
              onClick={printPayslip}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              🖨️ Print Payslip
            </button>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip, #payslip * {
            visibility: visible;
          }
          #payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default Payslip;

// AddLoan.jsx - Real API Integration
import React, { useState, useEffect } from "react";
import { loanApi, employeeApi } from "../../services/api";

function AddLoan({ onSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    orgId: '', // Let backend resolve from TenantContext
    empId: '',
    loanType: 'PERSONAL',
    principalAmount: '',
    interestRate: '0',
    tenureMonths: '',
    sanctionDate: new Date().toISOString().split('T')[0],
    remarks: '',
    isFlexibleDeduction: false, // Admin adjusts deduction each month
  });

  const [calculatedEmi, setCalculatedEmi] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeeApi.getAll();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
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

  const calculateEmi = () => {
    const principal = parseFloat(formData.principalAmount) || 0;
    const rate = parseFloat(formData.interestRate) || 0;
    const months = parseInt(formData.tenureMonths) || 1;

    if (principal > 0 && months > 0) {
      let emi;
      if (rate === 0) {
        emi = principal / months;
      } else {
        // Flat rate calculation
        const totalInterest = (principal * rate / 100) * (months / 12);
        const total = principal + totalInterest;
        emi = total / months;
      }
      setCalculatedEmi(Math.ceil(emi));
    }
  };

  useEffect(() => {
    calculateEmi();
  }, [formData.principalAmount, formData.interestRate, formData.tenureMonths]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectEmployee = (emp) => {
    setFormData({ ...formData, empId: emp.empCode });
    setSearchQuery(`${emp.empCode} - ${emp.firstName} ${emp.lastName || ''}`);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Tenure is not required for flexible loans
    if (!formData.empId || !formData.principalAmount) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }
    
    if (!formData.isFlexibleDeduction && !formData.tenureMonths) {
      setMessage({ type: 'error', text: 'Tenure is required for EMI-based loans' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        ...formData,
        principalAmount: parseFloat(formData.principalAmount),
        interestRate: parseFloat(formData.interestRate) || 0,
        tenureMonths: formData.isFlexibleDeduction ? 0 : parseInt(formData.tenureMonths),
        emiAmount: formData.isFlexibleDeduction ? 0 : calculatedEmi,
        isFlexibleDeduction: formData.isFlexibleDeduction,
      };

      await loanApi.create(payload);
      
      setMessage({ type: 'success', text: 'Loan created successfully!' });
      
      // Reset form
      setFormData({
        orgId: '', // Let backend resolve from TenantContext
        empId: '',
        loanType: 'PERSONAL',
        principalAmount: '',
        interestRate: '0',
        tenureMonths: '',
        sanctionDate: new Date().toISOString().split('T')[0],
        remarks: '',
        isFlexibleDeduction: false,
      });
      setSearchQuery('');
      setCalculatedEmi(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to create loan:', error);
      setMessage({ type: 'error', text: 'Failed to create loan. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-bold mb-6">Add New Loan</h3>

      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <span className="text-gray-400 text-sm ml-2">({emp.department || 'No Dept'})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loan Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
          <select
            name="loanType"
            value={formData.loanType}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="PERSONAL">Personal Loan</option>
            <option value="SALARY_ADVANCE">Salary Advance</option>
            <option value="EMERGENCY">Emergency Loan</option>
            <option value="MEDICAL">Medical Loan</option>
            <option value="EDUCATION">Education Loan</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Flexible Deduction Option */}
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="flexibleDeduction"
            checked={formData.isFlexibleDeduction}
            onChange={(e) => setFormData({ ...formData, isFlexibleDeduction: e.target.checked })}
            className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
          />
          <div>
            <label htmlFor="flexibleDeduction" className="font-medium text-amber-800 cursor-pointer">
              Flexible Deduction (No Fixed EMI)
            </label>
            <p className="text-sm text-amber-600 mt-0.5">
              Admin can adjust deduction amount each month during payroll. Useful when repayment amount varies.
            </p>
          </div>
        </div>

        {/* Amount Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Principal Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="principalAmount"
              value={formData.principalAmount}
              onChange={handleChange}
              placeholder="50000"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interest Rate (% p.a.)
            </label>
            <input
              type="number"
              name="interestRate"
              value={formData.interestRate}
              onChange={handleChange}
              step="0.01"
              placeholder="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tenure and Sanction Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenure (Months) {!formData.isFlexibleDeduction && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              name="tenureMonths"
              value={formData.tenureMonths}
              onChange={handleChange}
              min={formData.isFlexibleDeduction ? "0" : "1"}
              max="60"
              placeholder={formData.isFlexibleDeduction ? "Optional" : "12"}
              disabled={formData.isFlexibleDeduction}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.isFlexibleDeduction ? 'bg-gray-100' : ''}`}
            />
            {formData.isFlexibleDeduction && (
              <p className="text-xs text-gray-500 mt-1">Not required for flexible loans</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sanction Date</label>
            <input
              type="date"
              name="sanctionDate"
              value={formData.sanctionDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* EMI Preview or Flexible Loan Info */}
        {formData.isFlexibleDeduction ? (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-medium text-amber-800 mb-2">📊 Flexible Loan Summary</h4>
            <div className="text-sm text-amber-700">
              <p><strong>Outstanding Amount:</strong> {formatCurrency(parseFloat(formData.principalAmount) || 0)}</p>
              <p className="mt-2 text-amber-600">
                ℹ️ No fixed EMI. You can deduct any amount from payroll each month until the balance is cleared.
              </p>
            </div>
          </div>
        ) : calculatedEmi ? (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">EMI Calculation</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Monthly EMI:</span>
                <span className="font-bold text-blue-800 ml-2">{formatCurrency(calculatedEmi)}</span>
              </div>
              <div>
                <span className="text-blue-600">Total Payable:</span>
                <span className="font-bold text-blue-800 ml-2">{formatCurrency(calculatedEmi * (parseInt(formData.tenureMonths) || 1))}</span>
              </div>
              <div>
                <span className="text-blue-600">Total Interest:</span>
                <span className="font-bold text-blue-800 ml-2">
                  {formatCurrency(calculatedEmi * (parseInt(formData.tenureMonths) || 1) - parseFloat(formData.principalAmount))}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Optional notes..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                orgId: '', // Let backend resolve from TenantContext
                empId: '',
                loanType: 'PERSONAL',
                principalAmount: '',
                interestRate: '0',
                tenureMonths: '',
                sanctionDate: new Date().toISOString().split('T')[0],
                remarks: '',
                isFlexibleDeduction: false,
              });
              setSearchQuery('');
            }}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Loan'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddLoan;

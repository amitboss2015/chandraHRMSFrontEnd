// LeaveList.jsx - List all leaves with filters and approve/reject actions
import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { usePeriodSelection } from "../../utils/monthYearState";
import { request, approveLeave, rejectLeave } from "./api";

const getTenantId = () => localStorage.getItem('hrms_tenant_id') || 'SASA001';

const LeaveList = forwardRef(function LeaveList(props, ref) {
  const { month, year, setMonth, setYear } = usePeriodSelection();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, REVIEW, APPROVED, REJECTED, PENDING

  // Load employees for dropdown
  useEffect(() => {
    loadEmployees();
  }, []);

  // Load leaves when filters change
  useEffect(() => {
    loadLeaves();
  }, [month, year, selectedEmployee, statusFilter]);

  // Auto-refresh when page becomes visible (after login redirect)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadLeaves();
      }
    };
    
    const handleFocus = () => {
      loadLeaves();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [month, year, selectedEmployee, statusFilter]);

  const loadEmployees = async () => {
    try {
      const data = await request('/employees');
      setEmployees(data || []);
    } catch (e) {
      console.error('Error loading employees:', e);
    }
  };

  const loadLeaves = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const orgId = getTenantId();
      // Calculate date range for the selected month/year
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      let url = `/leave/reports/date-range?orgId=${encodeURIComponent(orgId)}&fromDate=${startDate}&toDate=${endDate}`;
      
      const data = await request(url);
      
      // Filter by employee if selected
      let filtered = data || [];
      if (selectedEmployee) {
        filtered = filtered.filter(l => l.empId === selectedEmployee);
      }
      
      // Filter by status
      if (statusFilter !== "ALL") {
        filtered = filtered.filter(l => l.status === statusFilter);
      }
      
      // Sort by start date (newest first)
      filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      
      // Debug: Log statuses to help troubleshoot
      if (filtered.length > 0) {
        console.log('Leave statuses:', filtered.map(l => ({ id: l.id, status: l.status, empId: l.empId })));
      }
      
      setLeaves(filtered);
    } catch (e) {
      console.error('Error loading leaves:', e);
      // Don't show error if it's an auth error (will redirect)
      if (!e.message?.includes('Session expired') && !e.message?.includes('authentication')) {
        setMessage({ type: 'error', text: 'Failed to load leaves: ' + e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Expose loadLeaves to parent component via ref
  useImperativeHandle(ref, () => ({
    loadLeaves
  }));

  const handleApprove = async (leaveId) => {
    if (loading) return; // Prevent double-click
    
    try {
      setLoading(true);
      setMessage(null);
      await approveLeave(leaveId);
      setMessage({ type: 'success', text: 'Leave approved successfully!' });
      // Small delay to show success message, then refresh
      setTimeout(() => {
        loadLeaves();
      }, 500);
    } catch (e) {
      console.error('Approve error:', e);
      setMessage({ type: 'error', text: 'Failed to approve leave: ' + (e.message || 'Unknown error') });
      // Still refresh to get latest data
      setTimeout(() => {
        loadLeaves();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (leaveId) => {
    if (loading) return; // Prevent double-click
    
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      setLoading(true);
      setMessage(null);
      await rejectLeave(leaveId, reason || '');
      setMessage({ type: 'success', text: 'Leave rejected successfully!' });
      // Small delay to show success message, then refresh
      setTimeout(() => {
        loadLeaves();
      }, 500);
    } catch (e) {
      console.error('Reject error:', e);
      setMessage({ type: 'error', text: 'Failed to reject leave: ' + (e.message || 'Unknown error') });
      // Still refresh to get latest data
      setTimeout(() => {
        loadLeaves();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      PENDING: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return badges[status] || 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Leave Filters</h3>
          <button
            onClick={() => loadLeaves()}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Refresh Leave List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Month Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-emerald-500 focus:outline-none"
            >
              <option value={1}>January</option>
              <option value={2}>February</option>
              <option value={3}>March</option>
              <option value={4}>April</option>
              <option value={5}>May</option>
              <option value={6}>June</option>
              <option value={7}>July</option>
              <option value={8}>August</option>
              <option value={9}>September</option>
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-emerald-500 focus:outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id || emp.empCode} value={emp.empCode || emp.id}>
                  {emp.empCode} - {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.empCode}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="REVIEW">Review</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Leaves Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            Leave Records ({leaves.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-slate-600">Loading leaves...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No leaves found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Leave Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-800">{leave.empName || leave.empId}</div>
                        <div className="text-xs text-slate-500">{leave.empId}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {leave.leaveTypeName || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDate(leave.startDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDate(leave.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {leave.totalDays}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={leave.remarks}>
                      {leave.remarks || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = String(leave.status || '').toUpperCase();
                          const isReviewOrPending = status === 'REVIEW' || status === 'PENDING';
                          const isApproved = status === 'APPROVED';
                          const isRejected = status === 'REJECTED';
                          
                          if (isReviewOrPending) {
                            return (
                              <>
                                <button
                                  onClick={() => handleApprove(leave.id)}
                                  disabled={loading}
                                  className={`px-3 py-1 text-white text-xs font-medium rounded-lg transition-colors ${
                                    loading 
                                      ? 'bg-slate-400 cursor-not-allowed opacity-50' 
                                      : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                                  }`}
                                  title="Approve Leave"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => handleReject(leave.id)}
                                  disabled={loading}
                                  className={`px-3 py-1 text-white text-xs font-medium rounded-lg transition-colors ${
                                    loading 
                                      ? 'bg-slate-400 cursor-not-allowed opacity-50' 
                                      : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                                  }`}
                                  title="Reject Leave"
                                >
                                  ✗ Reject
                                </button>
                              </>
                            );
                          }
                          
                          if (isApproved) {
                            return <span className="text-xs text-green-600 font-medium">Approved</span>;
                          }
                          
                          if (isRejected) {
                            return <span className="text-xs text-red-600 font-medium">Rejected</span>;
                          }
                          
                          return <span className="text-xs text-slate-500 font-medium">{leave.status || 'Unknown'}</span>;
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

export default LeaveList;

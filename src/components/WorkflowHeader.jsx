import React, { useState, useEffect, useRef } from 'react';
import { usePeriodSelection } from '../utils/monthYearState';
import MonthYearSelectorModal from './MonthYearSelectorModal';

// Get API base URL (same logic as Dashboard)
const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (localStorage.getItem('baseUrl')) return localStorage.getItem('baseUrl');
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080/api';
  return '/api';
};
const API_BASE = getApiBase();

/**
 * WorkflowHeader Component
 * 
 * Displays workflow progress breadcrumb showing:
 * - Completed steps (green checkmark)
 * - Pending steps (gray)
 * - Current step (highlighted)
 * - Recommended next action
 */
function WorkflowHeader() {
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMonthYearModal, setShowMonthYearModal] = useState(false);
  const { month: selectedMonth, year: selectedYear, setPeriod } = usePeriodSelection();
  const lastFetchedRef = useRef({ month: null, year: null });

  // Always use the shared state from hook (single source of truth)
  // Props are ignored - we use the hook's state which is shared across components
  const currentMonth = selectedMonth;
  const currentYear = selectedYear;

  // Fetch workflow status (prevent duplicate calls)
  useEffect(() => {
    if (currentMonth && currentYear) {
      // Prevent duplicate calls for the same month/year
      if (lastFetchedRef.current.month === currentMonth && 
          lastFetchedRef.current.year === currentYear) {
        return;
      }
      lastFetchedRef.current = { month: currentMonth, year: currentYear };
      fetchWorkflowStatus(currentMonth, currentYear);
    }
  }, [currentMonth, currentYear]);

  const fetchWorkflowStatus = async (selectedMonth, selectedYear) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = sessionStorage.getItem('hrms_access_token') || localStorage.getItem('token');
      
      const response = await fetch(
        `${API_BASE}/workflow/status?month=${selectedMonth}&year=${selectedYear}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-Id': localStorage.getItem('hrms_tenant_id') || '',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please login again');
        }
        throw new Error(`Failed to fetch workflow status: ${response.status}`);
      }

      const data = await response.json();
      setWorkflowStatus(data);
    } catch (err) {
      console.error('Error fetching workflow status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (step) => {
    if (step.url) {
      window.location.href = step.url;
    }
  };

  const handleChangeMonthYear = () => {
    setShowMonthYearModal(true);
  };

  const handleMonthYearSelect = (newMonth, newYear) => {
    setPeriod(newMonth, newYear);
    setShowMonthYearModal(false);
    // Reload workflow status
    fetchWorkflowStatus(newMonth, newYear);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="text-center text-slate-500">Loading workflow status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 border-red-200">
        <div className="text-red-600 text-sm">
          ⚠️ Error loading workflow: {error}
          <button 
            onClick={() => fetchWorkflowStatus(currentMonth, currentYear)} 
            className="ml-2 text-orange-600 hover:text-orange-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!workflowStatus) {
    return null;
  }

  const steps = [
    workflowStatus.step1,
    workflowStatus.step2,
    workflowStatus.step3,
    workflowStatus.step4,
    workflowStatus.step5,
    workflowStatus.step6,
    workflowStatus.step7
  ].filter(Boolean);

  const monthName = workflowStatus.monthName || 
    new Date(workflowStatus.year, workflowStatus.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {monthName} {workflowStatus.year}
              </h3>
              <p className="text-xs text-slate-500">Workflow Progress</p>
            </div>
          </div>
          <button 
            onClick={handleChangeMonthYear}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Change
          </button>
        </div>

        {/* Workflow Steps */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((step, index) => {
              const isCompleted = step.completed;
              const isPending = step.status === 'pending';
              const isCurrent = !isCompleted && index > 0 && steps[index - 1]?.completed;
              
              return (
                <React.Fragment key={step.step}>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      isCompleted 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : isCurrent
                        ? 'bg-orange-50 border border-orange-200 text-orange-700 animate-pulse'
                        : 'bg-slate-50 border border-slate-200 text-slate-500'
                    }`}
                    onClick={() => handleStepClick(step)}
                    title={step.description}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-xs font-medium whitespace-nowrap">
                      {step.name.split(' ')[0]}
                    </span>
                    {isCompleted && <span className="text-emerald-600">✓</span>}
                    {step.warning && <span className="text-orange-600">!</span>}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <span className={`text-slate-400 ${isCompleted ? 'text-emerald-500' : ''}`}>
                      →
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">
              {workflowStatus.completedSteps || 0} / {workflowStatus.totalSteps || 7} Steps Completed
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {workflowStatus.progressPercentage || 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${workflowStatus.progressPercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Recommended Action */}
        {workflowStatus.recommended && (
          <div className={`p-3 rounded-lg border-l-4 ${
            workflowStatus.recommended.priority === 'high' 
              ? 'bg-red-50 border-red-400' 
              : workflowStatus.recommended.priority === 'medium'
              ? 'bg-orange-50 border-orange-400'
              : 'bg-emerald-50 border-emerald-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {workflowStatus.recommended.priority === 'high' ? '⚠️' : '💡'}
              </span>
              <span className="text-sm text-slate-700 flex-1">
                {workflowStatus.recommended.message}
              </span>
              <a
                href={workflowStatus.recommended.url}
                className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
              >
                Go →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Month/Year Selector Modal */}
      <MonthYearSelectorModal
        isOpen={showMonthYearModal}
        onSelect={handleMonthYearSelect}
        onClose={() => setShowMonthYearModal(false)}
      />
    </>
  );
}

export default WorkflowHeader;

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
      <div className="bg-white rounded-xl shadow-sm border p-3">
        <div className="text-center text-slate-500 text-sm">Loading workflow...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-3 border-red-200">
        <div className="text-red-600 text-sm">
          ⚠️ Error loading workflow: {error}
          <button 
            onClick={() => fetchWorkflowStatus(currentMonth, currentYear)} 
            className="ml-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 text-orange-600 hover:text-orange-700 underline"
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
      <div className="bg-white rounded-xl shadow-sm border p-3 h-full flex flex-col min-h-[120px]">
        {/* Header - compact */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {monthName} {workflowStatus.year}
              </h3>
              <p className="text-xs text-slate-500">Workflow</p>
            </div>
          </div>
          <button 
            onClick={handleChangeMonthYear}
            className="min-h-[44px] px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md transition-colors"
          >
            Change
          </button>
        </div>

        {/* Workflow Steps - compact chips */}
        <div className="mb-2">
          <div className="flex items-center gap-1 flex-wrap">
            {steps.map((step, index) => {
              const isCompleted = step.completed;
              const isCurrent = !isCompleted && index > 0 && steps[index - 1]?.completed;
              return (
                <React.Fragment key={step.step}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-1 min-h-[44px] px-2 py-2 rounded-md cursor-pointer transition-all touch-manipulation ${
                      isCompleted 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : isCurrent
                        ? 'bg-orange-50 border border-orange-200 text-orange-700'
                        : 'bg-slate-50 border border-slate-200 text-slate-500'
                    }`}
                    onClick={() => handleStepClick(step)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStepClick(step); } }}
                    title={step.description}
                  >
                    <span className="text-sm">{step.icon}</span>
                    <span className="text-xs font-medium whitespace-nowrap">{step.name.split(' ')[0]}</span>
                    {isCompleted && <span className="text-emerald-600 text-xs">✓</span>}
                  </div>
                  {index < steps.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Progress Bar - slim */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600">
              {workflowStatus.completedSteps || 0}/{workflowStatus.totalSteps || 7} steps
            </span>
            <span className="text-xs font-semibold text-slate-800">{workflowStatus.progressPercentage || 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${workflowStatus.progressPercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Recommended Action - compact */}
        {workflowStatus.recommended && (
          <div className={`p-2 rounded-md border-l-2 text-xs ${
            workflowStatus.recommended.priority === 'high' ? 'bg-red-50 border-red-400' 
              : workflowStatus.recommended.priority === 'medium' ? 'bg-orange-50 border-orange-400'
              : 'bg-emerald-50 border-emerald-400'
          }`}>
            <div className="flex items-center gap-2">
              <span>{workflowStatus.recommended.priority === 'high' ? '⚠️' : '💡'}</span>
              <span className="text-slate-700 flex-1 truncate">{workflowStatus.recommended.message}</span>
              <a href={workflowStatus.recommended.url} className="px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded font-medium flex-shrink-0">
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

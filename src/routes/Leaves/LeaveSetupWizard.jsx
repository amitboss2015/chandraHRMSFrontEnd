// LeaveSetupWizard.jsx - Intelligent navigation for Leave Management setup
import React from "react";

export default function LeaveSetupWizard({ setupStatus, onRefresh, onNavigate }) {
  if (!setupStatus) return null;

  // If setup is complete, show success banner
  if (setupStatus.setupComplete) {
    return (
      <div className="mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✓</span>
          <div>
            <h3 className="font-bold text-lg">Leave Management Setup Complete!</h3>
            <p className="text-emerald-50 text-sm">All steps completed. You can now manage leaves efficiently.</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine which tab to navigate to based on recommended step
  const getTabFromUrl = (url) => {
    if (url.includes('tab=leave-types')) return 'types';
    if (url.includes('tab=calendar')) return 'calendar';
    if (url.includes('tab=mark-leave')) return 'mark';
    return null;
  };

  const handleStepClick = (url) => {
    const tab = getTabFromUrl(url);
    if (tab && onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Complete Leave Management Setup</h2>
        <p className="text-slate-600 text-sm">Follow these steps to set up leave management for your organization</p>
      </div>

      {/* Progress Bar */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Progress: {setupStatus.completedSteps} of {setupStatus.totalSteps} steps
          </span>
          <span className="text-sm font-bold text-emerald-600">
            {setupStatus.progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${setupStatus.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="p-5 space-y-4">
        {/* Step 1: Leave Types */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            setupStatus.step1.completed
              ? "bg-emerald-50 border-emerald-300"
              : setupStatus.recommended?.step === "CREATE_LEAVE_TYPES"
              ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">{setupStatus.step1.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  Step {setupStatus.step1.step}: {setupStatus.step1.name}
                  {setupStatus.step1.completed && (
                    <span className="text-emerald-600 text-xl">✓</span>
                  )}
                </h3>
                {setupStatus.step1.completed && (
                  <span className="bg-emerald-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {setupStatus.step1.count} created
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm mb-3">{setupStatus.step1.description}</p>
              {!setupStatus.step1.completed && (
                <button
                  onClick={() => handleStepClick(setupStatus.step1.url)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Create Leave Types →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Calendar Leaves */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            setupStatus.step2.completed
              ? "bg-emerald-50 border-emerald-300"
              : !setupStatus.step1.completed
              ? "bg-slate-100 border-slate-300 opacity-60"
              : setupStatus.recommended?.step === "CREATE_CALENDAR_LEAVES"
              ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">{setupStatus.step2.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  Step {setupStatus.step2.step}: {setupStatus.step2.name}
                  {setupStatus.step2.completed && (
                    <span className="text-emerald-600 text-xl">✓</span>
                  )}
                </h3>
                {setupStatus.step2.completed && (
                  <span className="bg-emerald-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {setupStatus.step2.count} created
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm mb-3">{setupStatus.step2.description}</p>
              {setupStatus.step1.completed && !setupStatus.step2.completed && (
                <button
                  onClick={() => handleStepClick(setupStatus.step2.url)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Add Calendar Leaves →
                </button>
              )}
              {!setupStatus.step1.completed && (
                <p className="text-slate-500 text-sm italic">Complete Step 1 first</p>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Mark Employee Leaves */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            setupStatus.step3.available
              ? setupStatus.recommended?.step === "MARK_EMPLOYEE_LEAVES"
                ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200"
                : "bg-slate-50 border-slate-300"
              : "bg-slate-100 border-slate-300 opacity-60"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">{setupStatus.step3.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800">
                  Step {setupStatus.step3.step}: {setupStatus.step3.name}
                </h3>
              </div>
              <p className="text-slate-600 text-sm mb-3">{setupStatus.step3.description}</p>
              {setupStatus.step3.available && (
                <button
                  onClick={() => handleStepClick(setupStatus.step3.url)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
                >
                  Mark Employee Leaves →
                </button>
              )}
              {!setupStatus.step3.available && (
                <p className="text-slate-500 text-sm italic">Create leave types first</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Action Banner */}
      {setupStatus.recommended && (
        <div
          className={`p-4 border-t-2 ${
            setupStatus.recommended.priority === "high"
              ? "bg-amber-50 border-amber-400"
              : setupStatus.recommended.priority === "medium"
              ? "bg-blue-50 border-blue-400"
              : "bg-emerald-50 border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <div>
                <strong className="text-slate-800">Next Step:</strong>
                <span className="text-slate-700 ml-2">{setupStatus.recommended.message}</span>
              </div>
            </div>
            <button
              onClick={() => handleStepClick(setupStatus.recommended.url)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors text-sm"
            >
              Go There →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

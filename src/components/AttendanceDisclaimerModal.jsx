import React, { useState } from 'react';

/**
 * Attendance Disclaimer Modal
 * 
 * Displays important information about the attendance management system
 * after successful login. Explains the current manual process and future automation plans.
 */
function AttendanceDisclaimerModal({ isOpen = false, onClose, onAcknowledge }) {
  if (!isOpen) return null;
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleAcknowledge = () => {
    if (dontShowAgain) {
      localStorage.setItem('hrms_disclaimer_acknowledged', 'true');
    }
    if (onAcknowledge) {
      onAcknowledge();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to ChandraHR</h2>
              <p className="text-emerald-50 text-sm">Important Information About Attendance Management</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Goal */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span className="text-xl">🎯</span>
              System Goal
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Our goal is to <strong>automate the entire attendance management system</strong> from data collection 
              to payroll generation. This includes attendance tracking, leave management, overtime calculation, 
              and final payroll processing.
            </p>
          </div>

          {/* Current Process */}
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              Current Process (Manual Steps Required)
            </h3>
            <p className="text-amber-800 text-sm leading-relaxed mb-3">
              Currently, the system requires some manual steps to ensure data accuracy:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-amber-800 text-sm ml-2">
              <li><strong>Download attendance data</strong> from your biometric device in Excel format</li>
              <li><strong>Sanitize and correct</strong> the attendance data (fix missing punches, errors, etc.)</li>
              <li><strong>Perform leave management</strong> (apply leaves, half-days, etc.)</li>
              <li><strong>Manage overtime</strong> calculations and approvals</li>
              <li><strong>Generate final payroll</strong> based on corrected attendance data</li>
            </ol>
          </div>

          {/* Biometric Device Formats */}
          <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <span className="text-xl">🔌</span>
              Biometric Device Formats
            </h3>
            <p className="text-purple-800 text-sm leading-relaxed mb-3">
              Different biometric devices may export attendance data in different formats. 
              We currently support a standard Excel template format.
            </p>
            <div className="bg-white rounded-lg p-3 mt-3 border border-purple-200">
              <p className="text-purple-900 text-sm font-medium mb-2">✅ What We Provide:</p>
              <ul className="list-disc list-inside space-y-1 text-purple-800 text-sm ml-2">
                <li>A downloadable Excel template matching our supported format</li>
                <li>Pre-filled employee codes and names</li>
                <li>Clear instructions for filling punch times</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-3 mt-3 border border-purple-200">
              <p className="text-purple-900 text-sm font-medium mb-2">💡 Need Help?</p>
              <p className="text-purple-800 text-sm">
                If your biometric device produces data in a <strong>different format</strong>, 
                please contact our support team. Share your device's Excel format, and we'll help you 
                convert it or integrate it into our system.
              </p>
            </div>
          </div>

          {/* Future Plans */}
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4">
            <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
              <span className="text-xl">🚀</span>
              Future Automation Plans
            </h3>
            <p className="text-emerald-800 text-sm leading-relaxed mb-3">
              We're working on automating the entire process:
            </p>
            <ul className="list-disc list-inside space-y-2 text-emerald-800 text-sm ml-2">
              <li><strong>Direct Integration:</strong> If your biometric device supports API integration, 
                  we can connect directly for automatic data sync</li>
              <li><strong>Format Automation:</strong> Our software team will automate format conversion 
                  for popular biometric devices</li>
              <li><strong>Fully Automated Workflow:</strong> End-to-end automation from attendance 
                  collection to payroll generation</li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-slate-700 text-sm">
              <strong>Questions or need assistance?</strong> Contact us at{' '}
              <a 
                href="mailto:support@chandrahr.in?subject=Attendance Format Support" 
                className="text-emerald-600 hover:text-emerald-700 underline font-medium"
              >
                support@chandrahr.in
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-600">Don't show this again</span>
          </label>
          <button
            onClick={handleAcknowledge}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            I Understand, Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceDisclaimerModal;

import React, { useState } from 'react';

/**
 * Template Sample Display Component
 * 
 * Displays sample Excel template format on the right side of attendance page
 * Shows format information and allows users to submit custom formats
 */
function TemplateSampleDisplay({ month, year, selectedDeviceCode }) {
  const [showCustomFormatForm, setShowCustomFormatForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [formData, setFormData] = useState({
    deviceCompany: '',
    deviceModel: '',
    deviceNumber: '',
    formatDescription: '',
    sampleFile: null
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, sampleFile: file });
    }
  };

  const handleSubmitCustomFormat = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('deviceCompany', formData.deviceCompany);
      formDataToSend.append('deviceModel', formData.deviceModel);
      formDataToSend.append('deviceNumber', formData.deviceNumber);
      formDataToSend.append('formatDescription', formData.formatDescription);
      if (formData.sampleFile) {
        formDataToSend.append('sampleFile', formData.sampleFile);
      }

      const token = sessionStorage.getItem('hrms_access_token') || '';
      const tenantId = localStorage.getItem('hrms_tenant_id') || '';

      const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8080/api'
        : '/api';

      const response = await fetch(`${API_BASE}/attendance/custom-format/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
        },
        body: formDataToSend
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        setSubmitSuccess(true);
        setSubmitError(null);
        setFormData({
          deviceCompany: '',
          deviceModel: '',
          deviceNumber: '',
          formatDescription: '',
          sampleFile: null
        });
        setTimeout(() => {
          setShowCustomFormatForm(false);
          setSubmitSuccess(false);
        }, 5000);
      } else {
        // Handle email failure or other errors
        const errorMessage = responseData.error || responseData.message || 'Failed to submit format. Email notification could not be sent.';
        setSubmitError(errorMessage);
        console.error('Error submitting custom format:', responseData);
      }
    } catch (error) {
      const errorMessage = 'Failed to submit format. Email notification could not be sent. Please email support@chandrahr.in directly.';
      setSubmitError(errorMessage);
      console.error('Error submitting custom format:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-2xl">📄</span>
          Supported Template Format
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Current format we support for attendance logs
        </p>
      </div>

      {/* Format Information */}
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-medium text-emerald-900 mb-3 flex items-center gap-2">
            <span>✅</span>
            Attendance Logs Format
          </h4>
          <p className="text-sm text-emerald-800 leading-relaxed mb-3">
            Our system supports Excel files (.xlsx) with attendance logs in the following structure:
          </p>
          <div className="bg-white rounded-lg p-3 border border-emerald-300">
            <div className="space-y-2 text-sm text-emerald-900">
              <div><strong>Row 1:</strong> Employee Code/Name</div>
              <div><strong>Row 2:</strong> Day numbers (1, 2, 3, ... up to 31) as column headers</div>
              <div><strong>Row 3:</strong> All punch times for each day in a single cell under that day</div>
              <div className="mt-2 pt-2 border-t border-emerald-200 text-xs text-emerald-700">
                <strong>Note:</strong> All punches for a day (IN, OUT, multiple punches) are shown in one cell separated by "/" (e.g., "09:06 / 17:31" or "08:59 / 17:36 / 18:11")
              </div>
            </div>
          </div>
        </div>

        {/* Actual Template File Download & Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
            <span>📊</span>
            Sample Template File
          </h4>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Download the actual Excel template file to see the exact format:
            </p>
            <a
              href="/attendance_template_sample.xlsx"
              download="attendance_template_sample.xlsx"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg"
            >
              <span>📥</span>
              Download Sample Template
            </a>
            <p className="text-xs text-slate-600 mt-2">
              This is the actual template file. Open it in Excel to see the complete structure with all sheets and columns.
            </p>
          </div>
        </div>

        {/* Template Structure Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
            <span>📋</span>
            Sample Attendance Logs Format
          </h4>
          <div className="bg-white rounded-lg p-3 border border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                {/* Employee Code Row */}
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">No</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">Name</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-green-50">1</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-green-50">2</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-green-50">3</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-green-50">4</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-green-50">5</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-slate-100">...</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold bg-green-50">31</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Employee 1 */}
                  <tr>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold bg-blue-50">1</td>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold bg-blue-50">afzal</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:06 / 17:31</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:05 / 17:32</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:04 / 17:30</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:03 / 17:29</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:02 / 17:28</td>
                    <td className="border border-slate-300 px-2 py-1 text-center text-slate-400">...</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:00 / 17:30</td>
                  </tr>
                  {/* Employee 2 */}
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold bg-blue-50">2</td>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold bg-blue-50">md sarwar</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">08:59 / 17:39</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">08:58 / 17:45</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">08:57 / 17:39</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">08:59 / 17:36 / 18:11</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">08:58 / 17:40</td>
                    <td className="border border-slate-300 px-2 py-1 text-center text-slate-400">...</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">08:55 / 17:38</td>
                  </tr>
                  {/* Employee 3 */}
                  <tr>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold bg-blue-50">3</td>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold bg-blue-50">sujata devi</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:10 / 18:00</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:12 / 18:05</td>
                    <td className="border border-slate-300 px-2 py-1 text-center"></td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:08 / 17:55</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:15 / 18:10</td>
                    <td className="border border-slate-300 px-2 py-1 text-center text-slate-400">...</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">09:05 / 17:50</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              <p><strong>Format Structure:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Row 1:</strong> Employee Code/Number and Name</li>
                <li><strong>Column Headers:</strong> Day numbers 1, 2, 3, ... up to 31</li>
                <li><strong>Cell Content:</strong> All punches for that day in one cell, separated by "/" (e.g., "09:06 / 17:31" or "08:59 / 17:36 / 18:11" for multiple punches)</li>
                <li><strong>Blank Cells:</strong> Days with no attendance data are left empty</li>
              </ul>
            </div>
            <p className="text-xs text-slate-600 mt-3 italic">
              * Download the template file above to see the complete structure with all days.
            </p>
          </div>
        </div>

        {/* Different Format Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
            <span>⚠️</span>
            Different Format?
          </h4>
          <p className="text-sm text-amber-800 leading-relaxed mb-3">
            If your biometric device produces attendance data in a <strong>different format</strong>, 
            we can help! Share your device's format and we'll assist with conversion or integration.
          </p>
          {!showCustomFormatForm ? (
            <button
              onClick={() => setShowCustomFormatForm(true)}
              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📧 Share Your Format
            </button>
          ) : (
            <form onSubmit={handleSubmitCustomFormat} className="space-y-3">
              {submitSuccess && (
                <div className="bg-green-100 border border-green-300 text-green-800 text-sm p-3 rounded mb-3">
                  ✅ Format submitted successfully! Our support team will review it and contact you at your registered email.
                </div>
              )}
              {submitError && (
                <div className="bg-red-100 border border-red-300 text-red-800 text-sm p-3 rounded mb-3">
                  ❌ <strong>Email Notification Failed:</strong> {submitError}
                  <div className="mt-2 text-xs">
                    Your format/template was <strong>not shared</strong> because the email notification could not be sent.
                    Please contact <strong>support@chandrahr.in</strong> directly with your device details.
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Device Company *
                </label>
                <input
                  type="text"
                  required
                  value={formData.deviceCompany}
                  onChange={(e) => setFormData({ ...formData, deviceCompany: e.target.value })}
                  placeholder="e.g., ZKTeco, HID Global"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Device Model *
                </label>
                <input
                  type="text"
                  required
                  value={formData.deviceModel}
                  onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                  placeholder="e.g., ZKTeco F18"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Device Serial/Number
                </label>
                <input
                  type="text"
                  value={formData.deviceNumber}
                  onChange={(e) => setFormData({ ...formData, deviceNumber: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Format Description *
                </label>
                <textarea
                  required
                  value={formData.formatDescription}
                  onChange={(e) => setFormData({ ...formData, formatDescription: e.target.value })}
                  placeholder="Describe your device's Excel format (columns, structure, etc.)"
                  rows="3"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Sample File (Excel/PDF/CSV)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf,.csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomFormatForm(false);
                    setFormData({
                      deviceCompany: '',
                      deviceModel: '',
                      deviceNumber: '',
                      formatDescription: '',
                      sampleFile: null
                    });
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-amber-700 text-center">
                Or email directly to{' '}
                <a 
                  href="mailto:support@chandrahr.in?subject=Biometric Format Support&body=Device Company:%0ADevice Model:%0ADevice Number:%0AFormat Description:%0A%0APlease help me import my attendance data."
                  className="text-emerald-600 hover:text-emerald-700 underline font-medium"
                >
                  support@chandrahr.in
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateSampleDisplay;

import React, { useState, useEffect } from 'react';
import { getStoredPeriod, setStoredPeriod } from '../utils/monthYearState';

/**
 * MonthYearSelectorModal Component
 * 
 * Shows a modal dialog after login asking user to select month/year.
 * Uses the existing monthYearState utility for consistency.
 */
function MonthYearSelectorModal({ isOpen, onSelect, onClose }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Generate month options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    years.push(i);
  }

  // Check if month/year already stored
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPeriod();
      if (stored) {
        setMonth(stored.month);
        setYear(stored.year);
      }
    }
  }, [isOpen]);

  const handleContinue = () => {
    setLoading(true);
    
    // Store using existing utility
    setStoredPeriod(month, year);
    
    // Call onSelect callback
    if (onSelect) {
      onSelect(month, year);
    }
    
    setTimeout(() => setLoading(false), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-3xl">📅</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome to ChandraHR!</h2>
          <p className="text-slate-600 mt-2">Select Month & Year to Continue</p>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Loading...
            </>
          ) : (
            <>
              Continue to Dashboard
              <span>→</span>
            </>
          )}
        </button>
      </div>
      
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default MonthYearSelectorModal;

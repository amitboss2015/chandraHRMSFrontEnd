// Login.jsx - Modern login page with JWT authentication
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStoredPeriod } from '../../utils/monthYearState';
import MonthYearSelectorModal from '../../components/MonthYearSelectorModal';
import AttendanceDisclaimerModal from '../../components/AttendanceDisclaimerModal';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMonthYearModal, setShowMonthYearModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTrialExpired(false);
    setLoading(true);
    
    try {
      const result = await login(email, password);
      if (result.success) {
        // Check if disclaimer has been acknowledged
        const disclaimerAcknowledged = localStorage.getItem('hrms_disclaimer_acknowledged') === 'true';
        
        if (!disclaimerAcknowledged) {
          // Show disclaimer modal first
          setShowDisclaimerModal(true);
        } else {
          // Check if month/year is already stored
          const stored = getStoredPeriod();
          if (stored && stored.month && stored.year) {
            // Already selected, go to dashboard
            navigate('/');
          } else {
            // Show month/year selector modal
            setShowMonthYearModal(true);
          }
        }
      } else {
        setError(result.error || 'Invalid email or password');
        setTrialExpired(result.code === 'TRIAL_EXPIRED');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisclaimerAcknowledge = () => {
    setShowDisclaimerModal(false);
    // After acknowledging disclaimer, check for month/year selection
    const stored = getStoredPeriod();
    if (stored && stored.month && stored.year) {
      navigate('/');
    } else {
      setShowMonthYearModal(true);
    }
  };

  const handleMonthYearSelect = (month, year) => {
    setShowMonthYearModal(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Header - Desi Orange/Saffron Theme */}
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-8 py-10 text-center">
            {/* Workforce Management Logo */}
            <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 relative overflow-hidden">
              {/* Abstract workforce icon */}
              <div className="flex flex-col items-center">
                <div className="flex gap-0.5">
                  <div className="w-3 h-6 bg-orange-500 rounded-t-full"></div>
                  <div className="w-3 h-8 bg-amber-600 rounded-t-full"></div>
                  <div className="w-3 h-5 bg-yellow-500 rounded-t-full"></div>
                </div>
                <div className="w-10 h-1 bg-orange-400 rounded-full mt-1"></div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">ChandraHR</h1>
            <p className="text-orange-100 text-sm mt-1">कर्मचारी प्रबंधन • Workforce Management</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Trial/License Expired Message */}
            {trialExpired && error && (
              <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 px-4 py-4 rounded-xl text-sm space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <span>⏱️</span>
                  Your free trial period has expired
                </p>
                <p className="text-amber-100/90">{error}</p>
                <p className="text-amber-200/80 text-xs mt-2">
                  For further use please contact admin or email support@chandrahr.in
                </p>
              </div>
            )}
            {/* Other Error Message */}
            {error && !trialExpired && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/60 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500" />
                Remember me
              </label>
              <a href="#" className="text-amber-400 hover:text-amber-300 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span>→</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative px-4 text-sm text-white/40 bg-transparent">or continue with</span>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
              >
                <span>🔵</span>
                SSO
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
              >
                <span>📧</span>
                Email OTP
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 py-4 bg-white/5 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              New company?{' '}
              <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                Create your company for free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-white/30 text-xs mt-6">
          © 2026 ChandraHR. Powering Indian Workforce Management.
        </p>
      </div>

      {/* Disclaimer Modal - Shows after successful login (first time only) */}
      <AttendanceDisclaimerModal
        isOpen={showDisclaimerModal}
        onAcknowledge={handleDisclaimerAcknowledge}
        onClose={() => {
          // If user closes modal, still proceed (they can read it later)
          handleDisclaimerAcknowledge();
        }}
      />

      {/* Month/Year Selector Modal - Shows after successful login */}
      <MonthYearSelectorModal
        isOpen={showMonthYearModal}
        onSelect={handleMonthYearSelect}
        onClose={() => {
          // If user closes modal, stay on login page
          setShowMonthYearModal(false);
        }}
      />
    </div>
  );
}

export default Login;

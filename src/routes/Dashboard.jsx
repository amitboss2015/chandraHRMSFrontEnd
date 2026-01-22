// Dashboard.jsx - Comprehensive dashboard with actionable insights
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (localStorage.getItem('baseUrl')) return localStorage.getItem('baseUrl');
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080/api';
  return `http://${hostname}:8080/api`;
};
const API_BASE = getApiBase();

const getToken = () =>
  sessionStorage.getItem('hrms_access_token') ||
  localStorage.getItem('token') || '';

const getTenantId = () =>
  localStorage.getItem('hrms_tenant_id') || 'SASA001';

// Cache key for dashboard data
const DASHBOARD_CACHE_KEY = 'hrms_dashboard_cache';
const DASHBOARD_CACHE_EXPIRY = 'hrms_dashboard_cache_expiry';

const fetchApi = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': getTenantId(),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch {
    return null;
  }
};

// Cache management
const getCachedData = () => {
  const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
  const expiry = sessionStorage.getItem(DASHBOARD_CACHE_EXPIRY);
  if (cached && expiry && Date.now() < parseInt(expiry)) {
    return JSON.parse(cached);
  }
  return null;
};

const setCachedData = (data) => {
  sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
  // Cache for 30 minutes (until logout clears session storage)
  sessionStorage.setItem(DASHBOARD_CACHE_EXPIRY, (Date.now() + 30 * 60 * 1000).toString());
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        setStats(cached);
        setFromCache(true);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setFromCache(false);
    
    try {
      const data = await fetchApi(`${API_BASE}/attendance/dashboard-stats`);
      if (data) {
        setStats(data);
        setCachedData(data);
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Failed to load dashboard data</p>
          <button 
            onClick={() => loadDashboardData(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">{currentDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Cached</span>
          )}
          <button 
            onClick={() => loadDashboardData(true)}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Month Banner */}
      <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wide">Attendance Data For</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">
              {stats.hasAttendanceData ? stats.monthName : 'No Data Available'}
            </h2>
            <div className="flex items-center gap-4 mt-3 text-emerald-100 text-sm">
              <span>👥 {stats.activeEmployees} active employees</span>
              <span>•</span>
              <span>📊 {stats.employeesWithData || 0} with attendance</span>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-4xl font-bold">{stats.attendanceRate || 0}%</div>
            <div className="text-emerald-100 text-sm">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          subtitle={`${stats.totalEmployees} total`}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Shifts Configured"
          value={stats.totalShifts}
          icon="🕐"
          color="purple"
        />
        <StatCard
          title="Payroll Generated"
          value={stats.payrollGenerated ? 'Yes' : 'No'}
          subtitle={stats.payrollGenerated ? `${stats.payrollCount} employees` : 'Not yet'}
          icon="💰"
          color={stats.payrollGenerated ? 'green' : 'amber'}
        />
        <StatCard
          title="Total Payout"
          value={formatCurrency(stats.totalPayrollAmount)}
          subtitle={stats.monthName}
          icon="💵"
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Top Performers & Late Employees */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Top 5 Best Attendance */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🏆 Top 5 Attendance
            </h3>
            {stats.topAttendance?.length > 0 ? (
              <div className="space-y-3">
                {stats.topAttendance.map((emp, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-400 text-yellow-900' : 
                        i === 1 ? 'bg-slate-300 text-slate-700' :
                        i === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.empCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">{emp.rate}%</p>
                      <p className="text-xs text-slate-500">{emp.presentDays} days</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📊" message="No attendance data" />
            )}
          </div>

          {/* Top 5 Late Employees */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              ⏰ Most Late Arrivals
            </h3>
            {stats.topLate?.length > 0 ? (
              <div className="space-y-3">
                {stats.topLate.map((emp, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-900 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.empCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{emp.lateDays} days</p>
                      <p className="text-xs text-slate-500">{Math.round(emp.lateMinutes / 60)}h late</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="✅" message="No late arrivals" positive />
            )}
          </div>

          {/* Top 5 Highest Earners */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              💰 Top 5 Earners
            </h3>
            {stats.topEarners?.length > 0 ? (
              <div className="space-y-3">
                {stats.topEarners.map((emp, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-green-500 text-white' : 'bg-green-200 text-green-800'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-500">ID: {emp.empId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{formatCurrency(emp.netSalary)}</p>
                      <p className="text-xs text-slate-500">Net</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="💵" message="No payroll data" />
            )}
          </div>

          {/* Peak Absent Day */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              📅 Peak Absent Day
            </h3>
            {stats.peakAbsentDay ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-3xl">📆</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.peakAbsentDay.absentCount}</p>
                <p className="text-slate-600 font-medium">{stats.peakAbsentDay.dayName}</p>
                <p className="text-sm text-slate-500">{stats.peakAbsentDay.date}</p>
                <p className="text-xs text-slate-400 mt-2">employees were absent</p>
              </div>
            ) : (
              <EmptyState icon="✅" message="No absences recorded" positive />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Holidays This Month */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🎉 Holidays - {stats.monthName?.split(' ')[0]}
            </h3>
            {stats.holidays?.length > 0 ? (
              <div className="space-y-2">
                {stats.holidays.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-purple-50">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{h.name}</p>
                      <p className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${h.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {h.isPaid ? 'Paid' : 'Optional'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📅" message="No holidays this month" />
            )}
          </div>

          {/* Device-wise Stats */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              📱 Device-wise Punches
            </h3>
            {stats.deviceStats?.length > 0 ? (
              <div className="space-y-3">
                {stats.deviceStats.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-700">{d.deviceCode}</span>
                      <span className="text-xs text-slate-500">
                        {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600">✓ {d.successRows} success</span>
                      {d.errorRows > 0 && <span className="text-red-500">✗ {d.errorRows} errors</span>}
                      <span className="text-slate-400">/ {d.totalRows} total</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📱" message="No device data" />
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">⚡ Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/attendance" icon="📊" label="Attendance" />
              <QuickAction href="/payroll" icon="💰" label="Payroll" />
              <QuickAction href="/employees" icon="👥" label="Employees" />
              <QuickAction href="/reports" icon="📈" label="Reports" />
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

// Components
function StatCard({ title, value, subtitle, icon, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    emerald: 'from-emerald-500 to-teal-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="stat-card bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-lg shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, positive }) {
  return (
    <div className={`text-center py-6 ${positive ? 'text-emerald-600' : 'text-slate-400'}`}>
      <span className="text-3xl">{icon}</span>
      <p className="text-sm mt-2">{message}</p>
    </div>
  );
}

function QuickAction({ href, icon, label }) {
  return (
    <Link
      to={href}
      className="flex flex-col items-center justify-center p-3 border rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs text-slate-600">{label}</span>
    </Link>
  );
}

export default Dashboard;

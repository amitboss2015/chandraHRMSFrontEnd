// Dashboard.jsx - Comprehensive dashboard with actionable insights
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePeriodSelection, getStoredPeriod } from '../utils/monthYearState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import WorkflowHeader from '../components/WorkflowHeader';

const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (localStorage.getItem('baseUrl')) return localStorage.getItem('baseUrl');
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080/api';
  return '/api';
};
const API_BASE = getApiBase();

const getToken = () =>
  sessionStorage.getItem('hrms_access_token') ||
  localStorage.getItem('token') || '';

const getTenantId = () =>
  localStorage.getItem('hrms_tenant_id') || 'SASA001';

// Cache key for dashboard data - TENANT SPECIFIC + MONTH/YEAR SPECIFIC
const getDashboardCacheKey = (month, year) => `hrms_dashboard_cache_${getTenantId()}_${year}_${month}`;
const getDashboardCacheExpiryKey = (month, year) => `hrms_dashboard_cache_expiry_${getTenantId()}_${year}_${month}`;

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

// Cache management - TENANT SPECIFIC + MONTH/YEAR SPECIFIC
const getCachedData = (month, year) => {
  const cacheKey = getDashboardCacheKey(month, year);
  const expiryKey = getDashboardCacheExpiryKey(month, year);
  const cached = sessionStorage.getItem(cacheKey);
  const expiry = sessionStorage.getItem(expiryKey);
  if (cached && expiry && Date.now() < parseInt(expiry)) {
    return JSON.parse(cached);
  }
  return null;
};

const setCachedData = (data, month, year) => {
  const cacheKey = getDashboardCacheKey(month, year);
  const expiryKey = getDashboardCacheExpiryKey(month, year);
  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  // Cache for 30 minutes (until logout clears session storage)
  sessionStorage.setItem(expiryKey, (Date.now() + 30 * 60 * 1000).toString());
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const { month: selectedMonth, year: selectedYear, setMonth: setSelectedMonth, setYear: setSelectedYear, setPeriod } = usePeriodSelection();
  const [availableMonths, setAvailableMonths] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastFetchedRef = useRef({ month: null, year: null });

  // Fetch available months on component mount (only once)
  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  // Load dashboard data when month/year changes (but prevent duplicate calls)
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      // Prevent duplicate calls for the same month/year
      if (lastFetchedRef.current.month === selectedMonth && 
          lastFetchedRef.current.year === selectedYear) {
        return;
      }
      lastFetchedRef.current = { month: selectedMonth, year: selectedYear };
      loadDashboardData(false, selectedMonth, selectedYear);
      setIsInitialLoad(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchAvailableMonths = async () => {
    try {
      const data = await fetchApi(`${API_BASE}/attendance/dashboard-stats/available-months`);
      if (data && data.availableMonths) {
        setAvailableMonths(data.availableMonths);
        // Only auto-select latest month if no stored period exists AND no month/year is currently selected
        // This prevents triggering the dashboard load effect unnecessarily
        const stored = getStoredPeriod();
        if (!stored && !selectedMonth && !selectedYear && data.availableMonths.length > 0) {
          const latest = data.availableMonths[0];
          // Use setPeriod from the hook we already have at component level
          setPeriod(latest.month, latest.year);
        }
      }
    } catch (e) {
      console.error('Error fetching available months:', e);
    }
  };

  const loadDashboardData = async (forceRefresh = false, month = null, year = null) => {
    // Use provided month/year or current selection
    const monthToUse = month || selectedMonth;
    const yearToUse = year || selectedYear;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData(monthToUse, yearToUse);
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
      // Build URL with month/year parameters
      const url = `${API_BASE}/attendance/dashboard-stats?month=${monthToUse}&year=${yearToUse}`;
      const data = await fetchApi(url);
      if (data) {
        setStats(data);
        setCachedData(data, monthToUse, yearToUse);
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
            onClick={() => loadDashboardData(true, selectedMonth, selectedYear)}
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
      {/* Workflow Header - Shows progress and workflow steps (single source of truth for month/year) */}
      <WorkflowHeader />

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
            onClick={() => loadDashboardData(true, selectedMonth, selectedYear)}
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
              {stats.hasAttendanceData && stats.monthName ? stats.monthName : (stats.monthName || 'No Data Available')}
            </h2>
            <div className="flex items-center gap-4 mt-3 text-emerald-100 text-sm">
              <span>👥 {stats.activeEmployees || 0} active employees</span>
              <span>•</span>
              <span>📊 {stats.employeesWithData || 0} with attendance</span>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-4xl font-bold">{stats.hasAttendanceData ? (stats.attendanceRate || 0) : 0}%</div>
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
          subtitle={stats.payrollGenerated ? `${stats.payrollCount} employees` : (!stats.hasAttendanceData ? 'Upload attendance first' : 'Not yet')}
          icon="💰"
          color={stats.payrollGenerated ? 'green' : 'amber'}
        />
        <StatCard
          title="Total Payout"
          value={stats.hasAttendanceData && stats.totalPayrollAmount ? formatCurrency(stats.totalPayrollAmount) : 'N/A'}
          subtitle={!stats.hasAttendanceData ? 'No attendance data' : (stats.payrollGenerated ? stats.monthName : 'Generate payroll')}
          icon="💵"
          color={stats.hasAttendanceData && stats.totalPayrollAmount ? 'emerald' : 'slate'}
        />
      </div>

      {/* No Attendance Data Banner */}
      {!stats.hasAttendanceData && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📤</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-1">
                No Attendance Data Uploaded
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                Attendance data has not been uploaded for {stats.monthName || `${selectedMonth}/${selectedYear}`}. 
                Upload attendance data to see charts, reports, and generate payroll.
              </p>
              <a
                href="/attendance"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Upload Attendance Data →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Charts and Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Top 5 Best Attendance - Animated Chart */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🏆 Top 5 Attendance
            </h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="No attendance data uploaded for this month. Upload attendance data to see top performers." 
              />
            ) : stats.topAttendance?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topAttendance.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    rate: Math.max(emp.rate || 0, 0), // Ensure non-negative
                    fullName: emp.name,
                    empCode: emp.empCode,
                    presentDays: emp.presentDays || 0
                  }))} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      domain={[0, 'dataMax']}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-800">{data.fullName}</p>
                              <p className="text-xs text-slate-500">{data.empCode}</p>
                              <p className="text-emerald-600 font-bold mt-1">{data.rate}% Attendance</p>
                              <p className="text-xs text-slate-500">{data.presentDays} present days</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="rate" radius={[8, 8, 0, 0]} animationDuration={1500}>
                      {stats.topAttendance.map((emp, i) => (
                        <Cell 
                          key={`cell-${i}`} 
                          fill={
                            i === 0 ? '#fbbf24' : 
                            i === 1 ? '#94a3b8' : 
                            i === 2 ? '#d97706' : 
                            '#cbd5e1'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon="📊" message="No attendance data" />
            )}
          </div>

          {/* Top 5 Late Employees - Animated Chart */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              ⏰ Most Late Arrivals
            </h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="No attendance data uploaded. Upload attendance data to see late arrival statistics." 
              />
            ) : stats.topLate?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topLate.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    days: emp.lateDays || 0,
                    minutes: emp.lateMinutes || 0,
                    fullName: emp.name,
                    empCode: emp.empCode
                  }))} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-800">{data.fullName}</p>
                              <p className="text-xs text-slate-500">{data.empCode}</p>
                              <p className="text-amber-600 font-bold mt-1">{data.days} days late</p>
                              <p className="text-xs text-slate-500">{Math.round(data.minutes / 60)}h {data.minutes % 60}m total</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="days" radius={[8, 8, 0, 0]} fill="#f59e0b" animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon="✅" message="No late arrivals" positive />
            )}
          </div>

          {/* Top 5 Missing Punches - Animated Chart */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🔴 Maximum Miss Punches
            </h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="No attendance data uploaded. Upload attendance data to see missing punch statistics." 
              />
            ) : stats.topMissingPunch?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topMissingPunch.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    count: emp.missingPunchCount || 0,
                    fullName: emp.name,
                    empCode: emp.empCode
                  }))} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-800">{data.fullName}</p>
                              <p className="text-xs text-slate-500">{data.empCode}</p>
                              <p className="text-red-600 font-bold mt-1">{data.count} missing punches</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#ef4444" animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon="✅" message="No missing punches" positive />
            )}
          </div>

          {/* Top 5 Early Exits - Animated Chart */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🚪 Maximum Early Exits
            </h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="No attendance data uploaded. Upload attendance data to see early exit statistics." 
              />
            ) : stats.topEarlyExit?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topEarlyExit.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    days: emp.earlyOutDays || 0,
                    minutes: emp.earlyOutMinutes || 0,
                    fullName: emp.name,
                    empCode: emp.empCode
                  }))} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-800">{data.fullName}</p>
                              <p className="text-xs text-slate-500">{data.empCode}</p>
                              <p className="text-orange-600 font-bold mt-1">{data.days} days early exit</p>
                              <p className="text-xs text-slate-500">{Math.round(data.minutes / 60)}h {data.minutes % 60}m total</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="days" radius={[8, 8, 0, 0]} fill="#f97316" animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon="✅" message="No early exits" positive />
            )}
          </div>

          {/* Top 5 Highest Earners */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              💰 Top 5 Earners
            </h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="No payroll data available. Upload attendance data and generate payroll to see top earners." 
              />
            ) : stats.topEarners?.length > 0 ? (
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
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="No attendance data uploaded. Upload attendance data to see peak absent day analysis." 
              />
            ) : stats.peakAbsentDay ? (
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

          {/* Multi-Device Employees (Suspicious Activity) */}
          {stats.multiDeviceEmployees?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-5 border-l-4 border-l-orange-400">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                ⚠️ Multi-Device Punches
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  Review Required
                </span>
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Employees punching at multiple biometric devices
              </p>
              <div className="space-y-2">
                {stats.multiDeviceEmployees.map((emp, i) => (
                  <div key={i} className="p-3 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">{emp.name}</span>
                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                        {emp.deviceCount} devices
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">ID: {emp.empCode}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {emp.devices?.map((device, j) => (
                        <span key={j} className="text-xs bg-white text-slate-600 px-2 py-0.5 rounded border">
                          {device}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
    slate: 'from-slate-400 to-slate-500',
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
    <div className={`text-center py-8 ${positive ? 'text-emerald-600' : 'text-slate-500'}`}>
      <span className="text-4xl mb-3 block">{icon}</span>
      <p className="text-sm font-medium mt-2 leading-relaxed px-4">{message}</p>
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

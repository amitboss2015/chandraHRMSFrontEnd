// Dashboard.jsx - Comprehensive dashboard with actionable insights
import React, { useState, useEffect, useRef } from 'react';
import { usePeriodSelection, getStoredPeriod } from '../utils/monthYearState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
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
            className="mt-4 min-h-[44px] px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const donutData = (() => {
    const withData = stats.employeesWithData || 0;
    const noData = Math.max(0, (stats.activeEmployees || 0) - withData);
    const arr = [
      { name: 'With data', value: withData },
      { name: 'No data', value: noData },
    ].filter((d) => d.value > 0);
    return arr.length ? arr : [{ name: '—', value: 1 }];
  })();
  const donutColors = donutData.length === 1 ? ['#cbd5e1'] : ['#0284c7', '#cbd5e1']; // blue (with data), slate (no data)

  return (
    <div className="min-h-screen bg-slate-50/80">
      <div className="max-w-[1600px] mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Page header */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm">{currentDate}</p>
          </div>
        </header>

        {/* Workflow - primary CTA */}
        <section className="mb-8">
          <WorkflowHeader />
        </section>

        {/* Overview KPIs */}
        <section className="mb-8" aria-label="Overview">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col items-center justify-center shadow-sm hover:border-slate-300/80 transition-colors min-h-[100px] md:min-h-[108px]">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Attendance rate</p>
              <div className="w-14 h-14 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius="60%"
                      outerRadius="100%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={donutColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-lg font-semibold text-slate-800 mt-2">{stats.hasAttendanceData ? (stats.attendanceRate || 0) : 0}%</p>
            </div>
            <StatCard title="Active Employees" value={stats.activeEmployees} subtitle={`${stats.totalEmployees} total`} icon="👥" color="blue" />
            <StatCard title="Shifts Configured" value={stats.totalShifts} icon="🕐" color="purple" />
            <StatCard title="Payroll Generated" value={stats.payrollGenerated ? 'Yes' : 'No'} subtitle={stats.payrollGenerated ? `${stats.payrollCount} employees` : (!stats.hasAttendanceData ? 'Upload attendance first' : 'Not yet')} icon="💰" color={stats.payrollGenerated ? 'green' : 'amber'} />
            <StatCard title="Total Payout" value={stats.hasAttendanceData && stats.totalPayrollAmount ? formatCurrency(stats.totalPayrollAmount) : 'N/A'} subtitle={!stats.hasAttendanceData ? 'No attendance data' : (stats.payrollGenerated ? stats.monthName : 'Generate payroll')} icon="💵" color={stats.hasAttendanceData && stats.totalPayrollAmount ? 'emerald' : 'slate'} />
          </div>
        </section>

        {/* No Attendance Data Banner */}
        {!stats.hasAttendanceData && (
          <div className="mb-8 bg-amber-50 border border-amber-200/80 border-l-4 border-l-amber-500 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden>📤</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-amber-800 mb-1">No attendance data uploaded</h3>
                <p className="text-sm text-amber-700/90 mb-4">
                  Upload attendance for {stats.monthName || `${selectedMonth}/${selectedYear}`} to view charts and generate payroll.
                </p>
                <a
                  href="/attendance"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Upload attendance →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Main content: Attendance insights (left) | Payroll & Alerts (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* Left: Attendance insights */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top 5 Best Attendance */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Top 5 attendance</h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="Upload attendance to see top performers." 
              />
            ) : stats.topAttendance?.length > 0 ? (
              <div className="h-44 min-h-[176px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.topAttendance.map((emp, i) => ({
                        name: emp.name?.split(' ')[0] || emp.empCode || `E${i + 1}`,
                        value: Math.max(emp.rate ?? 0, 0) || 1,
                        fullName: emp.name,
                        empCode: emp.empCode,
                        presentDays: emp.presentDays ?? 0,
                      }))}
                      dataKey="value"
                      innerRadius="40%"
                      outerRadius="85%"
                      paddingAngle={2}
                      stroke="white"
                      strokeWidth={1}
                    >
                      {stats.topAttendance.map((_, i) => (
                        <Cell
                          key={i}
                          fill={['#059669', '#0284c7', '#7c3aed', '#d97706', '#dc2626'][i % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.[0]?.payload) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg text-left">
                              <p className="font-semibold text-slate-800">{d.fullName}</p>
                              <p className="text-xs text-slate-500">{d.empCode}</p>
                              <p className="text-emerald-600 font-bold mt-1">{d.value}% Attendance</p>
                              <p className="text-xs text-slate-500">{d.presentDays} present days</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend layout="horizontal" align="center" wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon="📊" message="No attendance data" />
            )}
          </div>

          {/* Most Late */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Most late</h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="Upload attendance for late stats." 
              />
            ) : stats.topLate?.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topLate.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    days: emp.lateDays || 0,
                    minutes: emp.lateMinutes || 0,
                    fullName: emp.name,
                    empCode: emp.empCode
                  }))} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={52}
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

          {/* Miss Punches */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Miss punches</h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="Upload attendance for punch stats." 
              />
            ) : stats.topMissingPunch?.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topMissingPunch.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    count: emp.missingPunchCount || 0,
                    fullName: emp.name,
                    empCode: emp.empCode
                  }))} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={52}
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

          {/* Early Exits */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Early exits</h3>
            {!stats.hasAttendanceData ? (
              <EmptyState 
                icon="📤" 
                message="Upload attendance for early exit stats." 
              />
            ) : stats.topEarlyExit?.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topEarlyExit.map((emp, i) => ({
                    name: emp.name?.split(' ')[0] || emp.empCode || `Emp ${i + 1}`,
                    days: emp.earlyOutDays || 0,
                    minutes: emp.earlyOutMinutes || 0,
                    fullName: emp.name,
                    empCode: emp.empCode
                  }))} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={52}
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

            </div>
          </div>

        {/* Right: Payroll & alerts */}
        <div className="flex flex-col space-y-6 min-h-0">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Payroll & alerts</h2>
          <div className="space-y-5 flex-1 min-h-0">
            {/* Top 5 Earners */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Top 5 earners</h3>
              {!stats.hasAttendanceData ? (
                <EmptyState icon="📤" message="Upload attendance and generate payroll to see top earners." />
              ) : stats.topEarners?.length > 0 ? (
                <div className="space-y-2">
                  {stats.topEarners.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50/80 border border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{emp.name}</p>
                          <p className="text-xs text-slate-500">ID: {emp.empId}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(emp.netSalary)}</p>
                        <p className="text-xs text-slate-400">Net</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="💵" message="No payroll data" />
              )}
            </div>

            {/* Multi-Device Employees (Suspicious Activity) */}
            {stats.multiDeviceEmployees?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 border-l-4 border-l-amber-500 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Multi-device punches</h3>
              <span className="text-xs text-amber-600 font-medium">Review required</span>
              <p className="text-xs text-slate-500 mt-2 mb-3">Employees punching at multiple biometric devices</p>
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
    <div className="stat-card bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 hover:border-slate-300/80 transition-colors min-h-[100px] md:min-h-[108px] flex flex-col justify-center">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-lg md:text-xl font-semibold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-base flex-shrink-0 shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, positive }) {
  return (
    <div className={`text-center py-4 ${positive ? 'text-emerald-600' : 'text-slate-500'}`}>
      <span className="text-2xl mb-1 block">{icon}</span>
      <p className="text-xs font-medium leading-snug px-2">{message}</p>
    </div>
  );
}

export default Dashboard;

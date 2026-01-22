// Dashboard.jsx - Professional dashboard showing latest attendance month data
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
  localStorage.getItem('token') ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_TOKEN) ||
  '';

const getTenantId = () =>
  localStorage.getItem('hrms_tenant_id') || 'SASA001';

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

function Dashboard() {
  const [stats, setStats] = useState({
    monthName: '',
    month: 0,
    year: 0,
    hasAttendanceData: false,
    totalEmployees: 0,
    activeEmployees: 0,
    totalShifts: 0,
    totalPresentDays: 0,
    totalAbsentDays: 0,
    totalLateDays: 0,
    totalHalfDays: 0,
    totalOtDays: 0,
    attendanceRate: 0,
    avgPresentDays: 0,
    avgAbsentDays: 0,
    avgLateDays: 0,
    employeesWithData: 0,
    totalWorkHours: 0,
    monthlyPayroll: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats from new API
      const dashboardStats = await fetchApi(`${API_BASE}/attendance/dashboard-stats`);
      
      if (dashboardStats) {
        // Fetch payroll for the same month
        const payroll = await fetchApi(
          `${API_BASE}/payroll/summary?year=${dashboardStats.year}&month=${dashboardStats.month}`
        );

        setStats({
          ...dashboardStats,
          monthlyPayroll: payroll?.totalNetSalary || 0,
        });

        // Build recent activity based on status
        const activities = [];
        if (!dashboardStats.hasAttendanceData) {
          activities.push({ 
            type: 'warning', 
            text: 'No attendance data uploaded', 
            time: 'Import attendance to see data', 
            icon: '📋' 
          });
        } else {
          activities.push({ 
            type: 'success', 
            text: `${dashboardStats.monthName} data loaded`, 
            time: `${dashboardStats.employeesWithData} employees`, 
            icon: '✅' 
          });
        }
        if (dashboardStats.activeEmployees === 0) {
          activities.push({ 
            type: 'info', 
            text: 'No employees added yet', 
            time: 'Add employees to get started', 
            icon: '👥' 
          });
        }
        if (dashboardStats.totalShifts === 0) {
          activities.push({ 
            type: 'info', 
            text: 'No shifts configured', 
            time: 'Configure shifts first', 
            icon: '🕐' 
          });
        }
        if (dashboardStats.totalLateDays > 10) {
          activities.push({ 
            type: 'warning', 
            text: `${dashboardStats.totalLateDays} late days recorded`, 
            time: 'Review attendance', 
            icon: '⏰' 
          });
        }
        if (activities.length === 0) {
          activities.push({ 
            type: 'success', 
            text: 'System is ready', 
            time: 'All configurations done', 
            icon: '✅' 
          });
        }
        setRecentActivity(activities);
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">{currentDate}</p>
      </div>

      {/* Month Banner */}
      <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 md:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Showing Data For</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">
              {stats.hasAttendanceData ? stats.monthName : 'No Data Available'}
            </h2>
            {stats.hasAttendanceData && (
              <p className="text-emerald-100 mt-2">
                {stats.employeesWithData} employees • {stats.totalWorkHours} total work hours
              </p>
            )}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center bg-white/20 rounded-xl px-6 py-3 backdrop-blur-sm">
              <p className="text-3xl font-bold">{stats.attendanceRate}%</p>
              <p className="text-sm text-emerald-100">Attendance Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          subtitle={`${stats.activeEmployees} active`}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Present Days"
          value={stats.totalPresentDays}
          subtitle={stats.hasAttendanceData 
            ? `Avg ${stats.avgPresentDays} per employee`
            : 'No data'}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Absent Days"
          value={stats.totalAbsentDays}
          subtitle={stats.hasAttendanceData 
            ? `Avg ${stats.avgAbsentDays} per employee`
            : 'No data'}
          icon="❌"
          color="red"
        />
        <StatCard
          title="Late Days"
          value={stats.totalLateDays}
          subtitle={stats.hasAttendanceData 
            ? `Avg ${stats.avgLateDays} per employee`
            : 'No data'}
          icon="⏰"
          color="amber"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">📊 Monthly Overview</h2>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {stats.monthName || 'N/A'}
            </span>
          </div>
          
          {stats.hasAttendanceData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <OverviewCard 
                label="Present Days" 
                value={stats.totalPresentDays} 
                icon="✅"
                color="emerald"
              />
              <OverviewCard 
                label="Absent Days" 
                value={stats.totalAbsentDays} 
                icon="❌"
                color="red"
              />
              <OverviewCard 
                label="Late Days" 
                value={stats.totalLateDays} 
                icon="⏰"
                color="amber"
              />
              <OverviewCard 
                label="Half Days" 
                value={stats.totalHalfDays} 
                icon="⚡"
                color="purple"
              />
              <OverviewCard 
                label="OT Days" 
                value={stats.totalOtDays} 
                icon="💪"
                color="blue"
              />
              <OverviewCard 
                label="Work Hours" 
                value={stats.totalWorkHours} 
                icon="⏱️"
                color="teal"
              />
              <OverviewCard 
                label="Employees" 
                value={stats.employeesWithData} 
                icon="👥"
                color="indigo"
              />
              <OverviewCard 
                label="Attendance %" 
                value={`${stats.attendanceRate}%`} 
                icon="📈"
                color="green"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Attendance Data</h3>
              <p className="text-slate-500 mb-4">Import attendance data to see monthly statistics</p>
              <Link 
                to="/attendance"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Import Attendance
              </Link>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            📅 {stats.monthName || 'Month'} Summary
          </h2>
          
          {stats.hasAttendanceData ? (
            <>
              <div className="space-y-4">
                <SummaryRow 
                  label="Present Days" 
                  value={stats.totalPresentDays} 
                  total={stats.totalPresentDays + stats.totalAbsentDays}
                  color="emerald"
                />
                <SummaryRow 
                  label="Absent Days" 
                  value={stats.totalAbsentDays} 
                  total={stats.totalPresentDays + stats.totalAbsentDays}
                  color="red"
                />
                <SummaryRow 
                  label="Late Days" 
                  value={stats.totalLateDays} 
                  total={stats.totalPresentDays}
                  color="amber"
                />
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-600">
                    {stats.attendanceRate}%
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Overall Attendance Rate</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-500">No data available</p>
              <p className="text-xs text-slate-400 mt-1">Upload attendance to see summary</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/attendance" icon="📊" label="View Attendance" color="blue" />
            <QuickAction href="/employees/new" icon="➕" label="Add Employee" color="green" />
            <QuickAction href="/leaves" icon="📝" label="Leave Requests" color="purple" />
            <QuickAction href="/payroll" icon="💰" label="Generate Payroll" color="amber" />
            <QuickAction href="/shifts" icon="🕐" label="Manage Shifts" color="teal" />
            <QuickAction href="/reports" icon="📈" label="View Reports" color="rose" />
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            📅 {stats.monthName || 'This Month'}
          </h2>
          <div className="space-y-3">
            <MonthStat icon="👥" label="Active Employees" value={stats.activeEmployees} />
            <MonthStat icon="🕐" label="Working Shifts" value={stats.totalShifts} />
            <MonthStat icon="⏰" label="Late Days" value={stats.totalLateDays} badge />
            <MonthStat 
              icon="💰" 
              label="Payroll Amount" 
              value={formatCurrency(stats.monthlyPayroll)} 
              isText 
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">🔔 Status</h2>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                activity.type === 'warning' ? 'bg-amber-50' : 
                activity.type === 'success' ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                <span className="text-xl">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 font-medium">{activity.text}</p>
                  <p className="text-xs text-slate-400">{activity.time}</p>
                </div>
              </div>
            ))}
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
        .stat-card:nth-child(1) { animation-delay: 0s; }
        .stat-card:nth-child(2) { animation-delay: 0.05s; }
        .stat-card:nth-child(3) { animation-delay: 0.1s; }
        .stat-card:nth-child(4) { animation-delay: 0.15s; }
      `}</style>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="stat-card opacity-0 bg-white rounded-2xl shadow-sm border p-4 md:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-xl md:text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Overview Card Component
function OverviewCard({ label, value, icon, color }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]} transition-transform hover:scale-105`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Summary Row Component
function SummaryRow({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colors = {
    emerald: 'bg-emerald-500',
    red: 'bg-red-400',
    amber: 'bg-amber-400',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

// Quick Action Button
function QuickAction({ href, icon, label, color }) {
  const colors = {
    blue: 'hover:bg-blue-50 hover:border-blue-200',
    green: 'hover:bg-emerald-50 hover:border-emerald-200',
    purple: 'hover:bg-purple-50 hover:border-purple-200',
    amber: 'hover:bg-amber-50 hover:border-amber-200',
    teal: 'hover:bg-teal-50 hover:border-teal-200',
    rose: 'hover:bg-rose-50 hover:border-rose-200',
  };

  return (
    <Link
      to={href}
      className={`flex flex-col items-center justify-center p-3 md:p-4 border rounded-xl transition-all ${colors[color]} active:scale-95`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs text-slate-600 text-center">{label}</span>
    </Link>
  );
}

// Month Stat Row
function MonthStat({ icon, label, value, badge, isText }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      {badge ? (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
          {value}
        </span>
      ) : (
        <span className={`font-semibold ${isText ? 'text-emerald-600' : 'text-slate-800'}`}>
          {value}
        </span>
      )}
    </div>
  );
}

export default Dashboard;

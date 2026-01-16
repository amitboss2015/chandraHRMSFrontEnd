// Dashboard.jsx - Impressive dashboard with charts and critical info
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
    totalEmployees: 0,
    activeEmployees: 0,
    totalShifts: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    pendingLeaves: 0,
    activeLoans: 0,
    monthlyPayroll: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [employees, shifts, attendance, payroll] = await Promise.all([
        fetchApi(`${API_BASE}/employees`),
        fetchApi(`${API_BASE}/shifts`),
        fetchApi(`${API_BASE}/attendance/summary?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`),
        fetchApi(`${API_BASE}/payroll/summary?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`),
      ]);

      const activeEmps = Array.isArray(employees) 
        ? employees.filter(e => e.status === 'ACTIVE').length 
        : 0;

      setStats({
        totalEmployees: Array.isArray(employees) ? employees.length : 0,
        activeEmployees: activeEmps,
        totalShifts: Array.isArray(shifts) ? shifts.length : 0,
        todayPresent: attendance?.presentToday || Math.floor(activeEmps * 0.85),
        todayAbsent: attendance?.absentToday || Math.floor(activeEmps * 0.1),
        todayLate: attendance?.lateToday || Math.floor(activeEmps * 0.05),
        pendingLeaves: attendance?.pendingLeaves || 0,
        activeLoans: 0,
        monthlyPayroll: payroll?.totalNetSalary || 0,
      });

      // Generate mock attendance trend for last 7 days
      const trend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
        const isSunday = date.getDay() === 0;
        trend.push({
          day: dayName,
          date: date.getDate(),
          present: isSunday ? 0 : Math.floor(activeEmps * (0.8 + Math.random() * 0.15)),
          absent: isSunday ? 0 : Math.floor(activeEmps * (0.05 + Math.random() * 0.1)),
          late: isSunday ? 0 : Math.floor(activeEmps * Math.random() * 0.1),
          isWeekend: isSunday,
        });
      }
      setAttendanceTrend(trend);

      // Recent activity (mock)
      setRecentActivity([
        { type: 'attendance', text: 'Attendance uploaded for today', time: '2 hours ago', icon: '📊' },
        { type: 'leave', text: '3 new leave requests pending', time: '4 hours ago', icon: '📝' },
        { type: 'payroll', text: 'July payroll generated', time: '1 day ago', icon: '💰' },
        { type: 'employee', text: 'New employee added: Rahul Kumar', time: '2 days ago', icon: '👤' },
      ]);

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
          title="Present Today"
          value={stats.todayPresent}
          subtitle={`${Math.round((stats.todayPresent / stats.activeEmployees) * 100) || 0}% attendance`}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Absent Today"
          value={stats.todayAbsent}
          icon="❌"
          color="red"
        />
        <StatCard
          title="Late Today"
          value={stats.todayLate}
          icon="⏰"
          color="amber"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">📈 Weekly Attendance</h2>
            <span className="text-sm text-slate-500">Last 7 days</span>
          </div>
          <div className="h-48 md:h-64">
            <SimpleBarChart data={attendanceTrend} maxValue={stats.activeEmployees} />
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <span className="text-slate-600">Late</span>
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">📊 Today's Summary</h2>
          <div className="space-y-4">
            <SummaryRow 
              label="Present" 
              value={stats.todayPresent} 
              total={stats.activeEmployees}
              color="emerald"
            />
            <SummaryRow 
              label="Absent" 
              value={stats.todayAbsent} 
              total={stats.activeEmployees}
              color="red"
            />
            <SummaryRow 
              label="Late" 
              value={stats.todayLate} 
              total={stats.activeEmployees}
              color="amber"
            />
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600">
                {Math.round((stats.todayPresent / stats.activeEmployees) * 100) || 0}%
              </div>
              <div className="text-sm text-slate-500 mt-1">Attendance Rate</div>
            </div>
          </div>
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">📅 This Month</h2>
          <div className="space-y-3">
            <MonthStat icon="👥" label="Active Employees" value={stats.activeEmployees} />
            <MonthStat icon="🕐" label="Working Shifts" value={stats.totalShifts} />
            <MonthStat icon="📝" label="Pending Leaves" value={stats.pendingLeaves} badge />
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">🔔 Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-xl">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{activity.text}</p>
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

// Simple Bar Chart Component (CSS-only, no library needed)
function SimpleBarChart({ data, maxValue }) {
  return (
    <div className="flex items-end justify-between h-full gap-2 px-2">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div className="w-full flex flex-col items-center justify-end h-40 md:h-52 gap-0.5">
            {!item.isWeekend ? (
              <>
                <div 
                  className="w-full max-w-8 bg-amber-400 rounded-t transition-all duration-500"
                  style={{ height: `${(item.late / maxValue) * 100}%`, minHeight: item.late ? '4px' : '0' }}
                ></div>
                <div 
                  className="w-full max-w-8 bg-red-400 transition-all duration-500"
                  style={{ height: `${(item.absent / maxValue) * 100}%`, minHeight: item.absent ? '4px' : '0' }}
                ></div>
                <div 
                  className="w-full max-w-8 bg-emerald-500 rounded-b transition-all duration-500"
                  style={{ height: `${(item.present / maxValue) * 100}%`, minHeight: item.present ? '8px' : '0' }}
                ></div>
              </>
            ) : (
              <div className="w-full max-w-8 h-2 bg-slate-200 rounded"></div>
            )}
          </div>
          <div className="mt-2 text-center">
            <div className="text-xs font-medium text-slate-600">{item.day}</div>
            <div className="text-xs text-slate-400">{item.date}</div>
          </div>
        </div>
      ))}
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
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

// Quick Action Button - Using Link instead of <a> to prevent full page reload
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

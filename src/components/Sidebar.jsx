// Sidebar.jsx - Modern responsive sidebar
import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/employees", label: "Employees", icon: "👥" },
  { 
    label: "Shifts", 
    icon: "🕐", 
    children: [
      { path: "/shifts", label: "Manage Shifts" },
      { path: "/shifts/assign", label: "Assign Shifts" },
    ]
  },
  { 
    label: "Attendance", 
    icon: "✅", 
    children: [
      { path: "/attendance", label: "Records" },
      { path: "/attendance/missing-punch", label: "Missing Punch Fix" },
    ]
  },
  { path: "/leaves", label: "Leaves", icon: "📝" },
  { path: "/payroll", label: "Payroll", icon: "💰" },
  { path: "/loans", label: "Loans", icon: "💳" },
  { path: "/reports", label: "Reports", icon: "📈" },
  { 
    label: "Settings", 
    icon: "⚙️", 
    children: [
      { path: "/holidays", label: "Holidays" },
      { path: "/settings/salary-overtime", label: "Salary & OT Rules" },
      { path: "/settings/devices", label: "Biometric Devices" },
      { path: "/settings/data-management", label: "Data Management" },
    ]
  },
];

// Super Admin only menu items
const superAdminMenuItems = [
  { path: "/admin/dashboard", label: "Admin Dashboard", icon: "🛡️" },
];

function Sidebar({ isOpen, onClose }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (label) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActiveParent = (children) => {
    return children?.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        ></div>
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 lg:w-64 bg-gradient-to-b from-slate-800 to-slate-900 
        text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">C</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">ChandraHR</h2>
              <p className="text-xs text-slate-400">Workforce Management</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || 'Admin User'}</p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-auto p-3">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all
                        ${isActiveParent(item.children) 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'hover:bg-white/5 text-slate-300'
                        }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <span className={`text-xs transition-transform ${expandedMenus[item.label] || isActiveParent(item.children) ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                    </button>
                    {(expandedMenus[item.label] || isActiveParent(item.children)) && (
                      <ul className="mt-1 ml-6 pl-4 border-l border-white/10 space-y-1">
                        {item.children.map(child => (
                          <li key={child.path}>
                            <NavLink
                              to={child.path}
                              end={true}
                              onClick={onClose}
                              className={({ isActive }) =>
                                `block px-3 py-2 rounded-lg text-sm transition-all ${
                                  isActive 
                                    ? 'bg-emerald-500 text-white font-medium' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                              }
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' 
                          : 'hover:bg-white/5 text-slate-300'
                      }`
                    }
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                )}
              </li>
            ))}
            
            {/* Super Admin Menu - Only for SUPER_ADMIN role */}
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <li className="pt-4 mt-4 border-t border-white/10">
                  <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Super Admin</p>
                </li>
                {superAdminMenuItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                          isActive 
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25' 
                            : 'hover:bg-white/5 text-slate-300'
                        }`
                      }
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </>
            )}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              logout();
              onClose?.();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-sm font-medium"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;

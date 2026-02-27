// Sidebar.jsx - Modern responsive sidebar
import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Regular user menu items with bilingual tooltips (for ADMIN, HR_MANAGER, etc.)
const regularMenuItems = [
  { 
    path: "/", 
    label: "Dashboard", 
    icon: "📊",
    tooltip: "View summary of attendance, employees & payroll | उपस्थिति, कर्मचारी और पेरोल का सारांश देखें"
  },
  { 
    path: "/employees", 
    label: "Employees", 
    icon: "👥",
    tooltip: "Add/Import/Manage employee data | कर्मचारी डेटा जोड़ें/आयात करें/प्रबंधित करें"
  },
  { 
    label: "Shifts", 
    icon: "🕐",
    tooltip: "Define work timings & assign to employees | कार्य समय निर्धारित करें और कर्मचारियों को असाइन करें",
    children: [
      { path: "/shifts", label: "Manage Shifts", tooltip: "Create/Edit shift timings (9AM-6PM, Night, etc.) | शिफ्ट समय बनाएं/संपादित करें" },
      { path: "/shifts/assign", label: "Assign Shifts", tooltip: "Link employees to their work shifts | कर्मचारियों को उनकी शिफ्ट से जोड़ें" },
    ]
  },
  { 
    label: "Attendance", 
    icon: "✅",
    tooltip: "Import biometric data & view attendance records | बायोमेट्रिक डेटा आयात करें और उपस्थिति रिकॉर्ड देखें",
    children: [
      { path: "/attendance", label: "Records", tooltip: "View/Import monthly attendance from biometric device | बायोमेट्रिक से मासिक उपस्थिति देखें/आयात करें" },
      { path: "/attendance/missing-punch", label: "Missing Punch Fix", tooltip: "Add manual punch for missed entries | छूटी हुई एंट्री के लिए मैन्युअल पंच जोड़ें" },
    ]
  },
  { 
    path: "/leaves", 
    label: "Leaves", 
    icon: "📝",
    tooltip: "Manage leave types & employee leave requests | छुट्टी प्रकार और कर्मचारी छुट्टी अनुरोध प्रबंधित करें"
  },
  { 
    path: "/payroll", 
    label: "Payroll", 
    icon: "💰",
    tooltip: "Generate & manage monthly salary calculations | मासिक वेतन गणना बनाएं और प्रबंधित करें"
  },
  { 
    path: "/loans", 
    label: "Loans", 
    icon: "💳",
    tooltip: "Manage employee salary advances & loans | कर्मचारी वेतन अग्रिम और ऋण प्रबंधित करें"
  },
  // { path: "/reports", label: "Reports", icon: "📈" },  // HIDDEN - Coming Soon
  { 
    label: "Settings", 
    icon: "⚙️",
    tooltip: "Configure system settings | सिस्टम सेटिंग्स कॉन्फ़िगर करें",
    children: [
      { path: "/holidays", label: "Holidays", tooltip: "Define company holidays calendar | कंपनी छुट्टियों का कैलेंडर निर्धारित करें" },
      { path: "/settings/salary-overtime", label: "Salary & OT Rules", tooltip: "Set overtime rates, late deductions, etc. | ओवरटाइम दर, लेट कटौती आदि सेट करें" },
      { path: "/settings/devices", label: "Biometric Devices", tooltip: "Manage fingerprint/face recognition devices | फिंगरप्रिंट/फेस रिकग्निशन डिवाइस प्रबंधित करें" },
      // { path: "/settings/data-management", label: "Data Management" },  // HIDDEN - Coming Soon
    ]
  },
];

// Super Admin ONLY menu items (no employee/attendance/payroll access)
const superAdminMenuItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/admin/companies", label: "Companies", icon: "🏢" },
  { path: "/admin/trials", label: "Trials & Subscriptions", icon: "⏱️" },
  { path: "/admin/devices", label: "All Devices", icon: "📱" },
  { path: "/admin/fraud", label: "Fraud Detection", icon: "🚨" },
  { path: "/admin/maintenance", label: "System Maintenance", icon: "🔧" },
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
        ></div>
      )}
      
      {/* Sidebar - visible on md+ (768px), slide-in on smaller screens */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 flex-shrink-0
        w-72 md:w-64 bg-gradient-to-b from-slate-800 to-slate-900 
        text-white flex flex-col overflow-x-hidden
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
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
            {/* SUPER_ADMIN gets admin-only menu */}
            {user?.role === 'SUPER_ADMIN' ? (
              <>
                <li className="pb-2 mb-2 border-b border-white/10">
                  <p className="px-4 py-2 text-xs font-semibold text-purple-400 uppercase">Super Admin Console</p>
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
            ) : (
              /* Regular users get standard menu */
              regularMenuItems.map((item) => (
                <li key={item.label}>
                  {item.children ? (
                    <div className="group relative">
                      <button
                        onClick={() => toggleMenu(item.label)}
                        title={item.tooltip}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all
                          ${isActiveParent(item.children) 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'hover:bg-white/5 text-slate-300'
                          }`}
                      >
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        <span className={`text-xs flex-shrink-0 transition-transform ${expandedMenus[item.label] || isActiveParent(item.children) ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                      </button>
                      {/* Tooltip on hover */}
                      {item.tooltip && (
                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-slate-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 whitespace-normal hidden lg:block">
                          {item.tooltip}
                        </div>
                      )}
                      {(expandedMenus[item.label] || isActiveParent(item.children)) && (
                        <ul className="mt-1 ml-6 pl-4 border-l border-white/10 space-y-1">
                          {item.children.map(child => (
                            <li key={child.path} className="group/child relative">
                              <NavLink
                                to={child.path}
                                end={true}
                                onClick={onClose}
                                title={child.tooltip}
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
                              {/* Child tooltip */}
                              {child.tooltip && (
                                <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-slate-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/child:opacity-100 transition-opacity pointer-events-none z-50 w-56 whitespace-normal hidden lg:block">
                                  {child.tooltip}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="group relative">
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        title={item.tooltip}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                            isActive 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' 
                              : 'hover:bg-white/5 text-slate-300'
                          }`
                        }
                      >
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        <span className="text-sm font-medium ">{item.label}</span>
                      </NavLink>
                      {/* Tooltip on hover */}
                      {item.tooltip && (
                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-slate-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 whitespace-normal hidden lg:block">
                          {item.tooltip}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))
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

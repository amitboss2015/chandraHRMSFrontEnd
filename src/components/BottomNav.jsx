// BottomNav.jsx - Mobile-only bottom navigation for app-like feel
import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/employees", label: "Employees", icon: "👥" },
  { path: "/attendance", label: "Attendance", icon: "✅" },
  { path: "/payroll", label: "Payroll", icon: "💰" },
  { path: null, label: "More", icon: "☰", isMenu: true },
];

function BottomNav({ onOpenMenu }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-pb"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <div className="flex items-stretch justify-around h-14">
        {navItems.map((item) => {
          if (item.isMenu) {
            return (
              <button
                key="more"
                type="button"
                onClick={onOpenMenu}
                className="flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] text-slate-500 active:bg-slate-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <span className="text-lg" aria-hidden>{item.icon}</span>
                <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: active }) =>
                `flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
                  active ? "text-emerald-600 bg-emerald-50" : "text-slate-500 active:bg-slate-100"
                }`
              }
              aria-label={item.label}
            >
              <span className="text-lg" aria-hidden>{item.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;

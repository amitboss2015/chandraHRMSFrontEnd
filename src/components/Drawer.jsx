import React from "react";

export default function Drawer({ title, children, onClose, width = 520 }) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close drawer"
      />
      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

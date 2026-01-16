// Modal.jsx - Modern reusable modal component
import React from "react";

function Modal({ title, children, onClose, size = "md" }) {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-6xl"
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div 
        className={`bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col overflow-hidden animate-slideUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default Modal;

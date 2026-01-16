// Card.jsx - Modern card component
import React from 'react';

function Card({ title, value, subtitle, icon, color = "blue", onClick }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    teal: 'from-teal-500 to-teal-600',
  };

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-2xl shadow-lg`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default Card;

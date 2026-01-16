// Table.jsx - Modern responsive table component
import React from "react";

export default function Table({ headers = [], rows = [], emptyMessage = "No data available" }) {
  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td 
                colSpan={headers.length} 
                className="px-4 py-12 text-center text-slate-500"
              >
                <div className="text-4xl mb-2">📭</div>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr 
                key={i} 
                className="hover:bg-slate-50/50 transition-colors"
              >
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-3 text-sm text-slate-700 align-middle"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

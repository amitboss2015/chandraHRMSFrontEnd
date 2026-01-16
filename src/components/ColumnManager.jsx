import React from "react";

export default function ColumnManager({ all, visible, onChange }) {
  const toggle = (key) => {
    const set = new Set(visible);
    set.has(key) ? set.delete(key) : set.add(key);
    onChange(Array.from(set));
  };
  const selectAll = () => onChange(all.map(c => c.key));
  const clearAll = () => onChange([]);

  return (
    <div className="relative inline-block">
      <details>
        <summary className="cursor-pointer px-3 py-2 bg-slate-200 rounded">
          Columns
        </summary>
        <div className="absolute z-50 mt-2 bg-white shadow p-3 rounded w-72 max-h-80 overflow-auto">
          <div className="flex justify-between mb-2">
            <button className="text-xs underline" onClick={selectAll} type="button">Select all</button>
            <button className="text-xs underline" onClick={clearAll} type="button">Clear</button>
          </div>
          <ul className="space-y-1">
            {all.map(({ key, label }) => (
              <li key={key} className="flex items-center gap-2">
                <input
                  id={`col-${key}`}
                  type="checkbox"
                  checked={visible.includes(key)}
                  onChange={() => toggle(key)}
                />
                <label htmlFor={`col-${key}`} className="text-sm">{label}</label>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

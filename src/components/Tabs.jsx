import React, { useState } from "react";

export default function Tabs({ tabs = [], initial = 0 }) {
  const [active, setActive] = useState(initial);
  return (
    <div className="w-full">
      <div className="flex gap-2 border-b">
        {tabs.map((t, i) => (
          <button
            key={t.label || i}
            onClick={() => setActive(i)}
            className={`px-3 py-2 text-sm border-b-2 -mb-[1px] ${
              active === i
                ? "border-blue-600 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-3">{tabs[active]?.content}</div>
    </div>
  );
}

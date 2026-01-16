import React from "react";

export default function Field({ label, required, children }) {
  return (
    <label className="flex flex-col gap-1 w-full">
      <span className="text-sm text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

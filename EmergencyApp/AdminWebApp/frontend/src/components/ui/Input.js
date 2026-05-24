import React from "react";

export function Input({
  label,
  error,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2 border rounded-lg font-medium text-base transition-colors 
          ${error ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"}
          ${disabled ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${className}`}
        disabled={disabled}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

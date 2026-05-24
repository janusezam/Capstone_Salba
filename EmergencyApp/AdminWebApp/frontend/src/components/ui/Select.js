import React from "react";
import { ChevronDown } from "lucide-react";

export function Select({
  label,
  options = [],
  value,
  onChange,
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
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg font-medium text-base bg-white text-slate-900 transition-colors 
            ${disabled ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none
            ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

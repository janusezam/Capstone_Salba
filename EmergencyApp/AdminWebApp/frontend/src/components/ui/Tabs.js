import React from "react";

export function Tabs({ value, onValueChange, className = "" }) {
  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  );
}

export function TabsList({ children, className = "" }) {
  return (
    <div
      className={`flex gap-1 border-b border-slate-200 bg-white rounded-t-lg ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  onValueChange,
  activeValue,
  children,
  className = "",
}) {
  const isActive = value === activeValue;

  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
        isActive
          ? "text-blue-600 border-blue-600"
          : "text-slate-600 border-transparent hover:text-slate-900"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, activeValue, children, className = "" }) {
  if (value !== activeValue) return null;

  return <div className={`w-full ${className}`}>{children}</div>;
}

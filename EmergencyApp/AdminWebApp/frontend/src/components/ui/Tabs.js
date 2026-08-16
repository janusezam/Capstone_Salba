import React from "react";

export function Tabs({ value, onValueChange, children, className = "" }) {
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
      className={`flex gap-1 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-lg ${className}`}
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
          ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
          : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
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


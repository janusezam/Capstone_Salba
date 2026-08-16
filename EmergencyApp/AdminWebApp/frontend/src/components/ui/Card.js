import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }) {
  return <h3 className={`text-base font-bold text-slate-900 dark:text-white tracking-tight ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }) {
  return <p className={`text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 ${className}`}>{children}</p>;
}



import React from "react";

export function Spinner({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 ${sizes[size] || sizes.md} ${className}`} />
  );
}

export function Loading({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <Spinner size="lg" />
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );
}

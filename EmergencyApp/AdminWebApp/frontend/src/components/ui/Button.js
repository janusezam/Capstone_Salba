import React from "react";

const variants = {
  primary: "bg-salba-blue-primary text-white hover:bg-salba-blue-accent shadow-soft hover:shadow-card",
  secondary: "bg-salba-bg border border-salba-border text-salba-navy hover:bg-white",
  danger: "bg-salba-critical text-white hover:bg-red-700 shadow-soft hover:shadow-card",
  warning: "bg-salba-high text-white hover:bg-orange-600 shadow-soft hover:shadow-card",
  success: "bg-salba-success text-white hover:bg-green-700 shadow-soft hover:shadow-card",
  ghost: "text-salba-navy hover:bg-salba-bg",
  outline: "border border-salba-border text-salba-navy hover:bg-salba-bg",
};

const sizes = {
  sm: "px-3 py-2 text-sm gap-1",
  md: "px-4 py-2.5 text-base gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-button transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salba-blue-accent ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

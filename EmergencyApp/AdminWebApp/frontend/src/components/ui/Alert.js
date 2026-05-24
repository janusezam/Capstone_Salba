import React from "react";
import { AlertCircle, CheckCircle, InfoIcon, AlertTriangle, X } from "lucide-react";

const variants = {
  default: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "text-blue-600" },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "text-green-600" },
  warning: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "text-yellow-600" },
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "text-red-600" },
};

const icons = {
  default: InfoIcon,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function Alert({
  variant = "default",
  title,
  children,
  onClose,
  icon: CustomIcon,
  className = "",
}) {
  const style = variants[variant] || variants.default;
  const IconComponent = CustomIcon || icons[variant];

  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border ${style.bg} ${style.border} ${className}`}
    >
      <IconComponent className={`w-5 h-5 flex-shrink-0 ${style.icon} mt-0.5`} />
      <div className="flex-1">
        {title && <h3 className={`font-semibold ${style.text}`}>{title}</h3>}
        {children && <p className={`text-sm mt-1 ${style.text}`}>{children}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${style.text} hover:opacity-75 transition-opacity`}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

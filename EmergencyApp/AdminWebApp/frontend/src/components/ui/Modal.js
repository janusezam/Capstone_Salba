import React from "react";
import { X } from "lucide-react";

export function Modal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className={`relative bg-white rounded-lg shadow-lg ${sizes[size] || sizes.md} w-full`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ModalHeader({ children, className = "" }) {
  return <div className={`p-6 border-b border-slate-200 ${className}`}>{children}</div>;
}

export function ModalContent({ children, className = "" }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }) {
  return <div className={`p-6 border-t border-slate-200 flex gap-3 justify-end ${className}`}>{children}</div>;
}

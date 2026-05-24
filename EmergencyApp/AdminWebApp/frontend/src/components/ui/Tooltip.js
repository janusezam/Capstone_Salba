import React from "react";

/**
 * Custom hook for Tooltip component
 * Provides title and content
 */
export function Tooltip({ children, title, content, side = "top" }) {
  const [isVisible, setIsVisible] = React.useState(false);

  const positions = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  };

  const arrowPositions = {
    top: "bottom-[-4px] left-1/2 transform -translate-x-1/2 border-t-slate-900",
    bottom: "top-[-4px] left-1/2 transform -translate-x-1/2 border-b-slate-900",
    left: "right-[-4px] top-1/2 transform -translate-y-1/2 border-l-slate-900",
    right: "left-[-4px] top-1/2 transform -translate-y-1/2 border-r-slate-900",
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && (
        <div
          className={`absolute z-50 bg-slate-900 text-white px-3 py-2 rounded-md text-sm whitespace-nowrap ${positions[side]}`}
        >
          {title && <p className="font-semibold">{title}</p>}
          {content && <p className="text-slate-200">{content}</p>}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowPositions[side]}`}
          />
        </div>
      )}
    </div>
  );
}

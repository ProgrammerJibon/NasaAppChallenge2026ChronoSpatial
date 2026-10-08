import React from "react";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 px-2 py-1 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded shadow-md whitespace-nowrap pointer-events-none">
        {content}
      </div>
    </div>
  );
}

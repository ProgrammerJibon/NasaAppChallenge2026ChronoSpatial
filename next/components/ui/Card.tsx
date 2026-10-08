import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  active?: boolean;
  glass?: boolean;
}

export function Card({
  children,
  hover = false,
  active = false,
  glass = true,
  className = "",
  ...props
}: CardProps) {
  const bgClass = glass
    ? "bg-slate-900/70 backdrop-blur-md border border-slate-800/80"
    : "bg-slate-900 border border-slate-800";

  const hoverClass = hover
    ? "hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-950/20 transition-all duration-200"
    : "";

  const activeClass = active ? "ring-2 ring-sky-500 border-transparent" : "";

  return (
    <div
      className={`rounded-xl p-4 text-slate-200 ${bgClass} ${hoverClass} ${activeClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

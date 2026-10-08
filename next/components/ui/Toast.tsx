"use client";

import React from "react";
import { RiInformationLine, RiCheckboxCircleLine, RiErrorWarningLine } from "react-icons/ri";

export interface ToastProps {
  message: string;
  type?: "info" | "success" | "error";
  onClose?: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  const icon = {
    info: <RiInformationLine className="w-5 h-5 text-sky-400" />,
    success: <RiCheckboxCircleLine className="w-5 h-5 text-emerald-400" />,
    error: <RiErrorWarningLine className="w-5 h-5 text-rose-400" />,
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl text-slate-100 text-sm animate-fade-in">
      {icon}
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-white"
        >
          ×
        </button>
      )}
    </div>
  );
}

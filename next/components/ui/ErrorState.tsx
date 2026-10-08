"use client";

import React from "react";
import { RiAlertLine, RiRefreshLine } from "react-icons/ri";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  secondaryAction?: React.ReactNode;
}

export function ErrorState({
  title = "Unable to load data",
  message,
  code,
  onRetry,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 border border-rose-900/50 rounded-2xl text-slate-200">
      <div className="mb-4 p-3 rounded-full bg-rose-900/30 text-rose-400">
        <RiAlertLine className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-semibold text-rose-200 mb-1">{title}</h4>
      <p className="text-sm text-slate-300 max-w-md mb-2">{message}</p>
      {code && (
        <span className="text-xs font-mono text-rose-400/80 mb-6 bg-rose-950/40 px-2 py-0.5 rounded">
          Code: {code}
        </span>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            icon={<RiRefreshLine />}
          >
            Retry
          </Button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}

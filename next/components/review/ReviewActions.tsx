"use client";

import React, { useState } from "react";
import { REVIEW_CLASSIFICATIONS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n";
import { RiCheckLine, RiArrowRightLine } from "react-icons/ri";

export interface ReviewActionsProps {
  onSubmit: (classification: string, confidence: number) => Promise<void>;
  onNext: () => void;
  submitting?: boolean;
}

export function ReviewActions({
  onSubmit,
  onNext,
  submitting = false,
}: ReviewActionsProps) {
  const { t } = useLanguage();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0.9);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const getClassLabel = (c: string) => {
    switch (c) {
      case "Moving object":
        return t("movingObject");
      case "Brightness changed":
        return t("variableStar");
      case "Appeared/disappeared":
        return t("transient");
      case "Likely artefact/noise":
        return t("artifact");
      default:
        return c;
    }
  };

  const handleSubmit = async () => {
    if (!selectedClass) return;
    await onSubmit(selectedClass, confidence);
    setSubmitted(true);
  };

  const handleNextClick = () => {
    setSelectedClass(null);
    setSubmitted(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-5 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
      <div>
        <h4 className="text-sm font-semibold text-white mb-1">
          {t("classifyAs")}
        </h4>
        <p className="text-xs text-slate-400">
          Does this candidate appear to move, change flux, or look like detector noise?
        </p>
      </div>

      {/* Classification Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {REVIEW_CLASSIFICATIONS.map((c) => {
          const isSelected = selectedClass === c;
          return (
            <button
              key={c}
              type="button"
              disabled={submitted}
              onClick={() => setSelectedClass(c)}
              className={`p-3 rounded-xl text-xs font-medium text-left transition border cursor-pointer ${
                isSelected
                  ? "bg-sky-500/20 text-sky-300 border-sky-500 shadow-md ring-1 ring-sky-500"
                  : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850"
              }`}
            >
              {getClassLabel(c)}
            </button>
          );
        })}
      </div>

      {/* Confidence Slider */}
      <div className="space-y-1.5 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">{t("confidenceLabel")}:</span>
          <span className="font-mono text-sky-400 font-semibold">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          disabled={submitted}
          value={confidence}
          onChange={(e) => setConfidence(parseFloat(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedClass || submitting}
            loading={submitting}
            icon={<RiCheckLine />}
            className="w-full sm:w-auto"
          >
            {submitting ? t("submittingReview") : t("submitReview")}
          </Button>
        ) : (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <RiCheckLine className="w-4 h-4" /> Vote Recorded!
            </span>
            <Button
              onClick={handleNextClick}
              variant="secondary"
              icon={<RiArrowRightLine />}
            >
              {t("nextCandidate")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

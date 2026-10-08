"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  RiLightbulbLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCompass3Line,
  RiTimeLine,
  RiContrast2Line,
  RiEyeLine,
  RiInformationLine,
  RiSparklingLine,
} from "react-icons/ri";

export interface ExplainerItem {
  icon?: React.ReactNode;
  term: string;
  definition: string;
}

export interface BeginnerExplainerProps {
  pageTitle: string;
  pagePurpose: string;
  items?: ExplainerItem[];
  defaultOpen?: boolean;
}

export function BeginnerExplainer({
  pageTitle,
  pagePurpose,
  items,
  defaultOpen = false,
}: BeginnerExplainerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { t } = useLanguage();

  const standardConcepts: ExplainerItem[] = [
    {
      icon: <RiCompass3Line className="w-4 h-4 text-cyan-400" />,
      term: t("raDecTitle"),
      definition: t("raDecDesc"),
    },
    {
      icon: <RiTimeLine className="w-4 h-4 text-sky-400" />,
      term: t("epochTitle"),
      definition: t("epochDesc"),
    },
    {
      icon: <RiSparklingLine className="w-4 h-4 text-amber-400" />,
      term: t("bandTitle"),
      definition: t("bandDesc"),
    },
    {
      icon: <RiContrast2Line className="w-4 h-4 text-purple-400" />,
      term: t("differenceTitle"),
      definition: t("differenceDesc"),
    },
    {
      icon: <RiEyeLine className="w-4 h-4 text-emerald-400" />,
      term: t("citizenReviewTitle"),
      definition: t("citizenReviewDesc"),
    },
  ];

  const displayItems = items && items.length > 0 ? items : standardConcepts;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-purple-950/40 border border-sky-800/40 overflow-hidden shadow-lg transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-900/40 transition cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <RiLightbulbLine className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono text-sky-400 uppercase tracking-widest font-bold block">
              {t("beginnerGuideTitle")}
            </span>
            <span className="text-sm font-semibold text-white tracking-tight">
              {pageTitle} — {t("whatIsThis")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 shrink-0">
          <span className="hidden sm:inline">
            {isOpen ? t("hideExplanation") : t("readBeginnerExplanation")}
          </span>
          {isOpen ? (
            <RiArrowUpSLine className="w-5 h-5 text-sky-400" />
          ) : (
            <RiArrowDownSLine className="w-5 h-5 text-sky-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-sky-900/40 space-y-4 animate-fade-in text-xs">
          {/* Main purpose explanation */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 leading-relaxed">
            <strong className="text-white block mb-1">💡 {t("inPlainLanguage")}</strong>
            {pagePurpose}
          </div>

          {/* Key terms grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {displayItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1"
              >
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  {item.icon}
                  <span>{item.term}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

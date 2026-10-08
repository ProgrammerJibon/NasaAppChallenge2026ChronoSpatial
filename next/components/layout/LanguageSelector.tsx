"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage, LANGUAGES, type Language } from "@/lib/i18n";
import { RiTranslate2, RiArrowDownSLine, RiCheckLine } from "react-icons/ri";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 hover:text-white transition cursor-pointer font-mono shadow-sm"
        title="Select Language / ভাষা পরিবর্তন / भाषा चुनें"
        aria-label="Language Selector"
      >
        <RiTranslate2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="text-xs">{currentLang.flag}</span>
        <span className="hidden md:inline font-medium text-xs">{currentLang.nativeName}</span>
        <RiArrowDownSLine className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-fade-in space-y-0.5 max-h-[85vh] overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1 flex items-center gap-1.5">
            <RiTranslate2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Select Language / ভাষা</span>
          </div>

          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  isSelected
                    ? "bg-sky-950/80 text-sky-300 font-bold border border-sky-800/60"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <div>
                    <span className="block font-medium leading-tight text-xs">{lang.nativeName}</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">{lang.name}</span>
                  </div>
                </div>
                {isSelected && <RiCheckLine className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Navigation } from "./Navigation";
import { MobileMenu } from "./MobileMenu";
import { LanguageSelector } from "./LanguageSelector";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/lib/i18n";
import { RiSunLine, RiMoonLine } from "react-icons/ri";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
            <span className="text-white font-black text-xs tracking-wider">SPX</span>
          </div>
          <div className="hidden min-[380px]:block">
            <span className="font-bold text-slate-100 tracking-tight block text-sm sm:text-base group-hover:text-sky-400 transition-colors leading-tight">
              Chrono & Spatial
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-slate-400 uppercase block">
              NASA SPHEREx Explorer
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <Navigation />

        {/* Actions / Language / Theme */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Selector with language icon */}
          <LanguageSelector />

          {/* Day / Night Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition cursor-pointer flex items-center justify-center shadow-sm"
            title={theme === "dark" ? t("themeDay") : t("themeNight")}
            aria-label={t("toggleTheme")}
          >
            {theme === "dark" ? (
              <RiSunLine className="w-4 h-4 text-amber-400" />
            ) : (
              <RiMoonLine className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* Mobile Menu */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { Navigation } from "./Navigation";
import { MobileMenu } from "./MobileMenu";
import { useTheme } from "@/hooks/useTheme";
import { RiSunLine, RiMoonLine, RiShieldUserLine } from "react-icons/ri";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
            <span className="text-white font-black text-sm tracking-wider">SPX</span>
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight block text-base group-hover:text-sky-400 transition-colors">
              Chrono & Spatial
            </span>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block -mt-0.5">
              NASA SPHEREx Explorer
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <Navigation />

        {/* Actions / Theme / Admin */}
        <div className="flex items-center gap-2">
          {/* Real data badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>NASA/IPAC IRSA Data</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <RiSunLine className="w-4 h-4 text-amber-400" />
            ) : (
              <RiMoonLine className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* Admin link */}
          <Link
            href="/admin"
            className="hidden sm:inline-flex p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
            title="Admin Dashboard"
            aria-label="Admin Dashboard"
          >
            <RiShieldUserLine className="w-4 h-4" />
          </Link>

          {/* Mobile Menu */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

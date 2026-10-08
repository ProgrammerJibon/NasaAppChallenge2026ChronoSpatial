"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import {
  RiMenuLine,
  RiCloseLine,
  RiHome4Line,
  RiCompass3Line,
  RiTimeLine,
  RiContrast2Line,
  RiEyeLine,
  RiInformationLine,
  RiTeamLine,
  RiShieldUserLine,
} from "react-icons/ri";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t("home"), icon: <RiHome4Line /> },
    { href: "/explore", label: t("explore"), icon: <RiCompass3Line /> },
    { href: "/timeline", label: t("timeline"), icon: <RiTimeLine /> },
    { href: "/compare", label: t("compare"), icon: <RiContrast2Line /> },
    { href: "/review", label: t("review"), icon: <RiEyeLine /> },
    { href: "/about", label: t("about"), icon: <RiInformationLine /> },
    { href: "/team", label: t("team"), icon: <RiTeamLine /> },
    { href: "/admin", label: t("admin"), icon: <RiShieldUserLine /> },
  ];

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
        aria-label="Toggle mobile menu"
      >
        {open ? <RiCloseLine className="w-5 h-5" /> : <RiMenuLine className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-16 z-50 p-4 bg-slate-950/95 border-b border-slate-800/90 backdrop-blur-xl shadow-2xl animate-fade-in">
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

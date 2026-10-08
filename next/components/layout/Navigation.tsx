"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import {
  RiHome4Line,
  RiCompass3Line,
  RiTimeLine,
  RiContrast2Line,
  RiEyeLine,
  RiInformationLine,
  RiTeamLine,
} from "react-icons/ri";

export function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t("home"), icon: <RiHome4Line className="w-4 h-4" /> },
    { href: "/explore", label: t("explore"), icon: <RiCompass3Line className="w-4 h-4" /> },
    { href: "/timeline", label: t("timeline"), icon: <RiTimeLine className="w-4 h-4" /> },
    { href: "/compare", label: t("compare"), icon: <RiContrast2Line className="w-4 h-4" /> },
    { href: "/review", label: t("review"), icon: <RiEyeLine className="w-4 h-4" /> },
    { href: "/about", label: t("about"), icon: <RiInformationLine className="w-4 h-4" /> },
    { href: "/team", label: t("team"), icon: <RiTeamLine className="w-4 h-4" /> },
  ];

  return (
    <nav className="hidden lg:flex items-center gap-0.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 backdrop-blur-md">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

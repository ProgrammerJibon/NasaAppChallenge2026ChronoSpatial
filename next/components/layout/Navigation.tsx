"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiHome4Line,
  RiCompass3Line,
  RiTimeLine,
  RiContrast2Line,
  RiEyeLine,
  RiInformationLine,
  RiTeamLine,
} from "react-icons/ri";

const navItems = [
  { href: "/", label: "Home", icon: <RiHome4Line /> },
  { href: "/explore", label: "Explore", icon: <RiCompass3Line /> },
  { href: "/timeline", label: "Timeline", icon: <RiTimeLine /> },
  { href: "/compare", label: "Compare", icon: <RiContrast2Line /> },
  { href: "/review", label: "Review", icon: <RiEyeLine /> },
  { href: "/about", label: "About", icon: <RiInformationLine /> },
  { href: "/team", label: "Team", icon: <RiTeamLine /> },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 backdrop-blur-md">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

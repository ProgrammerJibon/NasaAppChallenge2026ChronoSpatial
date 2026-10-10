"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
export function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = [{href:"/",key:"home"},{href:"/explore",key:"explore"},{href:"/timeline",key:"timeline"},{href:"/compare",key:"compare"},{href:"/review",key:"review"},{href:"/about",key:"about"},{href:"/team",key:"team"}];
  return <nav className="main-navigation" aria-label="Main navigation">{items.map(({href,key}) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "nav-link active" : "nav-link"}>{t(key)}</Link>)}</nav>;
}

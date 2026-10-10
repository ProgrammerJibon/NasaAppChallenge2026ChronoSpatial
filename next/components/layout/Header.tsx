"use client";
import Link from "next/link";
import { Navigation } from "./Navigation";
import { MobileMenu } from "./MobileMenu";
import { LanguageSelector } from "./LanguageSelector";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/lib/i18n";
import { RiSunLine, RiMoonLine, RiPlanetLine } from "react-icons/ri";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  return (
    <header className="observatory-header">
      <div className="header-inner">
        <Link href="/" className="brand-link" aria-label="Chrono & Spatial home">
          <span className="brand-mark"><RiPlanetLine /></span>
          <span className="brand-name">Chrono<span className="brand-amp"> & </span>Spatial<span className="brand-subtitle">A SPHEREx exploration project</span></span>
        </Link>
        <Navigation />
        <div className="header-actions">
          <LanguageSelector />
          <button type="button" onClick={toggleTheme} className="theme-switch" aria-label={t("toggleTheme")} title={theme === "dark" ? t("themeDay") : t("themeNight")}>
            {theme === "dark" ? <RiSunLine /> : <RiMoonLine />}
          </button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

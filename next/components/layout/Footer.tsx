"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { RiArrowRightUpLine, RiPlanetLine } from "react-icons/ri";
export function Footer() {
  const { t } = useLanguage();
  return <footer className="observatory-footer"><div className="footer-inner">
    <div className="footer-top"><div><Link href="/" className="footer-brand"><RiPlanetLine /> Chrono & Spatial</Link><p>A different perspective on the same universe.</p></div><div className="footer-links"><Link href="/about">{t("about")}</Link><Link href="/team">Team A-JINX</Link><a href="https://irsa.ipac.caltech.edu" target="_blank" rel="noreferrer">NASA/IPAC IRSA <RiArrowRightUpLine /></a></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Team A-JINX · NASA Space Apps Challenge project</span><span>Observation imagery: NASA / JPL-Caltech / IPAC <Link href="/admin">{t("admin")}</Link></span></div>
  </div></footer>;
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { BootstrapData, SkyRegion, Observation } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { Reveal } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useLanguage } from "@/lib/i18n";
import { formatShortDate, formatWavelength } from "@/lib/format";
import { findEpochPair } from "@/lib/observationPairs";
import { RiArrowRightLine, RiArrowRightUpLine, RiCompass3Line, RiTimeLine, RiContrast2Line, RiShieldCheckLine, RiEyeLine } from "react-icons/ri";

export default function HomePage() {
  const { t } = useLanguage();
  const [bootstrap,setBootstrap] = useState<BootstrapData | null>(null);
  const [regions,setRegions] = useState<SkyRegion[]>([]);
  const [observations,setObservations] = useState<Observation[]>([]);
  const [total,setTotal] = useState<number | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([api.getBootstrap(),api.getRegions(),api.listObservations({limit:100})]).then(([bs,reg,obs]) => {
      if (!active) return;
      setBootstrap(bs); setRegions(reg); setObservations(obs.observations); setTotal(obs.total);
    }).catch(err => { if(active) setError(err.message); }).finally(() => { if(active) setLoading(false); });
    return () => {active = false;};
  },[]);
  const featured = bootstrap?.featuredRegion;
  const featuredObservations = observations.filter(o => o.region_id === featured?.id);
  const observation = featuredObservations[0] ?? bootstrap?.demoObservations[0];
  const pair = findEpochPair(featuredObservations);
  const compareHref = pair ? `/compare?a=${pair[0].id}&b=${pair[1].id}` : "/compare";
  const regionHref = `/explore?region=${featured?.slug ?? "m31"}`;
  const steps = [
    {number:"01",icon:RiCompass3Line,title:t("step1Title"),text:t("step1Desc"),href:"/explore",link:t("heroExploreBtn")},
    {number:"02",icon:RiTimeLine,title:t("step2Title"),text:t("step2Desc"),href:"/timeline",link:t("openTimeline")},
    {number:"03",icon:RiContrast2Line,title:t("step3Title"),text:t("step3Desc"),href:compareHref,link:t("launchCompare")},
  ];
  return <div className="observatory-home">
    <section className="hero-section illustrated-hero">
      <div className="hero-copy">
        <Reveal><div className="eyebrow"><span className="status-dot" />{t("heroBadge")}</div></Reveal>
        <Reveal delay={.08}><h1 className="hero-title">{t("heroTitlePrefix")}<br /><span>{t("heroTitleHighlight")}</span></h1></Reveal>
        <Reveal delay={.16}><p className="hero-description">{t("heroDesc")}</p></Reveal>
        <Reveal delay={.24}><div className="hero-actions"><Link href="/explore" className="primary-link">{t("heroExploreBtn")}<RiArrowRightLine /></Link><Link href={compareHref} className="secondary-link"><RiTimeLine />{t("heroCompareBtn")}</Link></div><div className="hero-trust"><RiShieldCheckLine />{t("realData")}</div></Reveal>
      </div>
      <span className="illustration-caption">Decorative illustration · scientific imagery below</span>
    </section>
    {error && <ErrorState title="Observations are unavailable" message={error} onRetry={() => window.location.reload()} />}
    <section className="archive-feature">
      <Reveal className="archive-image"><div className="archive-image-tag">SPHEREx / ARCHIVE PREVIEW</div>{loading ? <Skeleton className="w-full h-full" /> : observation ? <SkyImage key={observation.id} observationId={observation.id} alt={`SPHEREx observation ${observation.archive_id}`} className="w-full h-full" /> : <span>Observation unavailable</span>}</Reveal>
      <div className="archive-copy"><span className="eyebrow">{t("realData")}</span><h2>{featured?.name ?? t("loadingObservation")}</h2><p>Go beyond the illustration. Inspect the actual infrared observation, its dates, wavelengths, and archive provenance.</p>{observation && <div className="archive-metadata"><span>{formatShortDate(observation.observation_date)}</span><span>Band {observation.band_number} · {formatWavelength(observation.wavelength_min_um,observation.wavelength_max_um)}</span><span>RA {observation.ra.toFixed(4)}° · DEC {observation.dec.toFixed(4)}°</span></div>}<Link className="text-link" href={regionHref}>{t("openInViewer")}<RiArrowRightUpLine /></Link></div>
    </section>
    <section className="data-strip" aria-label="Mission and archive overview">
      <div className="data-stat"><strong>102</strong><span>{t("missionWavelengths")}</span></div><div className="data-stat"><strong>~6 <small>{t("monthsWord")}</small></strong><span>{t("statCadence")}</span></div><div className="data-stat"><strong>{total ?? "—"}</strong><span>{t("loadedObservations")}</span></div><div className="data-stat"><strong>{loading ? "—" : regions.length.toString().padStart(2,"0")}</strong><span>{t("curatedRegions")}</span></div>
    </section>
    <section className="journey-section"><Reveal><div className="section-heading"><div><span className="eyebrow">{t("startJourney")}</span><h2>{t("workflowTitle")}</h2><p>{t("workflowSub")}</p></div><Link href="/about" className="text-link">{t("howItWorks")}<RiArrowRightUpLine /></Link></div></Reveal><div className="workflow-grid">{steps.map((step,i) => <Reveal key={step.number} delay={i*.08}><Link href={step.href} className="workflow-card block h-full"><div className="workflow-card-top"><step.icon /><span>{step.number} / 03</span></div><h3>{step.title}</h3><p>{step.text}</p><span className="text-link">{step.link}<RiArrowRightLine /></span></Link></Reveal>)}</div></section>
    <section className="destinations-section"><div className="section-heading"><div><span className="eyebrow">{t("chooseDestination")}</span><h2>{t("curatedRegions")}</h2><p>{t("curatedRegionsSub")}</p></div><Link href="/explore" className="text-link">{t("allRegions")}<RiArrowRightLine /></Link></div><div className="region-grid">{loading ? [0,1,2].map(i => <Skeleton key={i} className="h-56 rounded-xl" />) : regions.map((region,i) => <Reveal key={region.id} delay={i*.04}><Link href={`/explore?region=${region.slug}`} className="region-card block h-full"><div className="region-card-top"><span>{region.slug.toUpperCase().replaceAll("-"," / ")}</span><RiArrowRightUpLine /></div><h3>{region.name}</h3><p>{region.description}</p><div className="region-card-coords"><span>RA {region.ra.toFixed(3)}°</span><span>DEC {region.dec.toFixed(3)}°</span><span>{observations.filter(o => o.region_id === region.id).length} {t("observationsWord")}</span></div></Link></Reveal>)}</div></section>
    <Reveal><section className="review-banner constellation-banner"><svg viewBox="0 0 500 300" className="constellation-art" aria-hidden="true"><path d="M30 230L110 110L215 150L285 55L415 110L475 30M110 110L165 25M215 150L310 250L415 110" fill="none" stroke="currentColor" strokeWidth="1" />{[[30,230],[110,110],[215,150],[285,55],[415,110],[475,30],[165,25],[310,250]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i===2 ? 5 : 3} fill="currentColor" />)}</svg><div><span className="eyebrow"><RiEyeLine />{t("publicCitizenScience")}</span><h2>{t("helpVerifyChanges")}</h2><p>{t("reviewHonestDescription")}</p></div><Link href="/review" className="primary-link">{t("startReviewing")}<RiArrowRightLine /></Link></section></Reveal>
  </div>;
}

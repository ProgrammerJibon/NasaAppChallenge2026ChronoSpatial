"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useLanguage, type Language } from "@/lib/i18n";

const stops = ["Welcome", "Galaxies", "Milky Way sky", "Time changes the sky", "Explore for yourself"];
const stars = Array.from({ length: 96 }, (_, index) => ({
  left: `${((index * 73 + (index % 7) * 19) % 500) / 5}%`,
  top: `${(index * 47 + (index % 9) * 11) % 100}%`,
  opacity: .22 + (index % 5) * .14,
}));
const journeyDetails: Record<Language, { light: string; measureTitle: string; measure: string; compare: string; end: string }> = {
  en: { light: "Our Solar System is a tiny part of the Milky Way. Across the universe, infrared light reveals stars, dust, and galaxies in a different way.", measureTitle: "A galaxy comes into focus.", measure: "Spitzer's infrared view reveals stars and dust near the Milky Way's center. SPHEREx measures the sky in 102 infrared wavelengths.", compare: "Hubble photographed the same field in 2007 and 2015. A bright star had vanished. Every difference is a clue that needs careful checking.", end: "The visual story ends here. Open the real archive to inspect observations, compare dates, and investigate possible changes." },
  bn: { light: "ইনফ্রারেড আলোতে তারা, ধুলো ও ছায়াপথকে অন্যভাবে দেখা যায়। এই দৃশ্যটি ধারণা বোঝাতে আঁকা; এটি বাস্তব পর্যবেক্ষণ নয়।", measureTitle: "আলো হয়ে ওঠে পরিমাপ।", measure: "SPHEREx আকাশকে ১০২টি ইনফ্রারেড তরঙ্গদৈর্ঘ্যে পর্যবেক্ষণ করে এবং স্থান ও সময় নথিবদ্ধ করে।", compare: "একই আকাশে ফিরে গেলে দুটি সময় তুলনা করা যায়। পার্থক্য একটি সূত্র; অবস্থান, শব্দ ও ছবির ত্রুটি যাচাই করতে হয়।", end: "চিত্রিত গল্প এখানেই শেষ। বাস্তব আর্কাইভ খুলে পর্যবেক্ষণ দেখুন, তারিখ তুলনা করুন এবং সম্ভাব্য পরিবর্তন খুঁজুন।" },
  hi: { light: "अवरक्त प्रकाश तारों, धूल और आकाशगंगाओं का अलग दृश्य दिखाता है। यह दृश्य समझाने के लिए बनाया गया है; यह वास्तविक अवलोकन नहीं है।", measureTitle: "प्रकाश एक माप बन जाता है।", measure: "SPHEREx आकाश को 102 अवरक्त तरंगदैर्घ्यों में देखता है और स्थान व समय दर्ज करता है।", compare: "एक ही क्षेत्र को फिर देखने पर दो समयों की तुलना होती है। अंतर एक संकेत है; संरेखण, शोर और छवि दोष भी जाँचने होंगे।", end: "चित्रित कहानी यहाँ समाप्त होती है। असली संग्रह में अवलोकन देखें, तारीखें मिलाएँ और संभावित बदलाव खोजें।" },
  de: { light: "Infrarotlicht zeigt Sterne, Staub und Galaxien aus einer anderen Perspektive. Diese Szene erklärt das Prinzip; sie ist keine Beobachtung.", measureTitle: "Licht wird zur Messung.", measure: "SPHEREx beobachtet den Himmel in 102 Infrarot-Wellenlängen und erfasst Ort und Zeitpunkt.", compare: "Ein erneuter Blick auf dasselbe Himmelsfeld ermöglicht den Vergleich. Ein Unterschied ist ein Hinweis; Ausrichtung, Rauschen und Bildfehler müssen geprüft werden.", end: "Die illustrierte Reise endet hier. Öffne das echte Archiv, untersuche Aufnahmen, vergleiche Zeitpunkte und prüfe mögliche Veränderungen." },
  ja: { light: "赤外線では星や塵、銀河を違った姿で見られます。この場面は概念図であり、実際の観測データではありません。", measureTitle: "光が測定値になる。", measure: "SPHERExは102の赤外線波長で空を観測し、場所と時刻を記録します。", compare: "同じ空を再び観測すると、二つの時点を比べられます。差は手がかりです。位置合わせ、ノイズ、画像の乱れも確認します。", end: "イラストの旅はここまで。実際のアーカイブで観測画像を調べ、日付を比べ、変化の可能性を探しましょう。" },
  es: { light: "La luz infrarroja muestra estrellas, polvo y galaxias de otra manera. Esta escena ilustra la idea; no es una observación real.", measureTitle: "La luz se convierte en una medición.", measure: "SPHEREx observa el cielo en 102 longitudes de onda infrarrojas y registra dónde y cuándo miró.", compare: "Volver al mismo campo permite comparar dos momentos. Una diferencia es una pista; hay que comprobar la alineación, el ruido y los defectos de imagen.", end: "Aquí termina el viaje ilustrado. Abre el archivo real para examinar observaciones, comparar fechas e investigar posibles cambios." },
  fr: { light: "La lumière infrarouge révèle autrement les étoiles, la poussière et les galaxies. Cette scène illustre le principe ; ce n’est pas une observation réelle.", measureTitle: "La lumière devient une mesure.", measure: "SPHEREx observe le ciel dans 102 longueurs d’onde infrarouges et enregistre où et quand il a regardé.", compare: "Revenir au même champ permet de comparer deux moments. Une différence est un indice ; il faut vérifier l’alignement, le bruit et les défauts de l’image.", end: "Le voyage illustré se termine ici. Ouvrez les vraies archives pour examiner les observations, comparer les dates et étudier les changements possibles." },
  ar: { light: "يكشف ضوء الأشعة تحت الحمراء النجوم والغبار والمجرات من منظور مختلف. هذا المشهد توضيحي وليس بيانات رصد حقيقية.", measureTitle: "يتحول الضوء إلى قياس.", measure: "يرصد SPHEREx السماء في 102 طول موجي بالأشعة تحت الحمراء، ويسجل مكان الرصد ووقته.", compare: "تتيح العودة إلى المنطقة نفسها مقارنة لحظتين. الاختلاف دليل أولي؛ ويجب فحص المحاذاة والضوضاء وعيوب الصورة.", end: "تنتهي الرحلة المصورة هنا. افتح الأرشيف الحقيقي لفحص الرصد ومقارنة التواريخ والتحقق من التغيرات المحتملة." },
};

function ConceptSky({ later = false }: { later?: boolean }) {
  return <div className={`camera-sky-map ${later ? "is-later" : ""}`} aria-hidden="true">
    <div className="camera-epoch-photo" />
    <span className="camera-epoch-year">{later ? "2015" : "2007"}</span>
    <span className="camera-epoch-label">{later ? "AFTER · STAR VANISHED" : "BEFORE · STAR VISIBLE"}</span>
  </div>;
}

const fragments = Array.from({ length: 18 }, (_, index) => ({
  left: `${Math.round(50 + (8 + index % 6 * 7) * Math.cos(index * 2.399))}%`,
  top: `${Math.round(50 + (8 + index % 6 * 7) * Math.sin(index * 2.399))}%`,
  rotate: `${index * 47}deg`,
}));

const solarPlanets = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"] as const;
const STORY_END = .87;

function SolarSystem() {
  return <div className="camera-solar-system" aria-hidden="true">
    <div className="solar-sun" />
    {solarPlanets.map(name => <div className={`solar-orbit solar-${name}`} key={name}>
      <div className="solar-runner"><div className="solar-planet"><i className="solar-planet-surface" /></div></div>
    </div>)}
  </div>;
}

const galaxyNames = ["milky-way", "andromeda", "whirlpool", "sombrero", "distant-one", "distant-two"] as const;
const galaxyArt = ["/images/concept-galaxy-face.png", "/images/concept-galaxy-tilted.png"] as const;

function UniverseGalaxies() {
  return <div className="camera-universe" aria-hidden="true">
    <div className="camera-universe-dust" />
    {galaxyNames.map((name, index) => <div className={`universe-galaxy universe-${name}`} key={name}>
      <div className="universe-galaxy-disc"><Image src={galaxyArt[index % 2]} alt="" fill sizes="(max-width: 600px) 155px, 330px" /></div>
    </div>)}
    <span className="camera-visual-caption">ONE SOLAR SYSTEM · A UNIVERSE OF GALAXIES</span>
  </div>;
}

function MilkyWaySky() {
  return <div className="camera-milky-way-sky" aria-hidden="true">
    <div className="camera-milky-way-photo"><Image src="/images/nasa-spitzer-galactic-center.jpg" alt="" fill sizes="(max-width: 900px) 90vw, 48vw" /></div>
    <div className="camera-milky-way-haze" />
    <div className="camera-sky-scan" />
    <div className="camera-sky-spectrum"><i /><i /><i /><i /><i /><i /><i /></div>
    <span className="camera-visual-caption">NASA / SPITZER · INFRARED GALACTIC CENTER</span>
  </div>;
}

function JourneyChapter({ progress, index, active, children }: { progress: MotionValue<number>; index: number; active: boolean; children: React.ReactNode }) {
  const center = index / 4;
  // Hand off the copy at a shared boundary so adjacent headings do not overlap.
  const points = index === 0 ? [0, .105, .125] : index === 4 ? [.875, .895, 1] : [center - .125, center - .105, center + .105, center + .125];
  const opacity = useTransform(progress, points, index === 0 ? [1, 1, 0] : index === 4 ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(progress, points, index === 0 ? [0, 0, -32] : index === 4 ? [32, 0, 0] : [32, 0, 0, -32]);
  return <motion.div className="camera-chapter" style={{ opacity, y }} aria-hidden={!active} inert={!active}>{children}</motion.div>;
}

export function HomeJourney() {
  const { t, language } = useLanguage();
  const details = journeyDetails[language];
  const reduced = useReducedMotionSafe();
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start 80px", "end end"] });
  const storyProgress = useTransform(scrollYProgress, [0, STORY_END], [0, 1]);
  const camera = useSpring(storyProgress, { stiffness: 140, damping: 24, mass: .6 });
  const worldX = useTransform(camera, [0, 1], ["0%", "-80%"]);
  const farX = useTransform(camera, [0, 1], ["0%", "-32%"]);
  const solarScale = useTransform(camera, [0, .055, .14, .24], [1, 1, 1.5, 2.4]);
  const solarOpacity = useTransform(camera, [0, .09, .15, .19], [1, 1, .55, 0]);
  const burstScale = useTransform(camera, [.06, .13, .2], [.25, 1.1, 2.3]);
  const burstOpacity = useTransform(camera, [.06, .13, .2], [0, .95, 0]);
  const universeScale = useTransform(camera, [.12, .25, .36, .45], [.65, 1, 1.08, 1.6]);
  const universeOpacity = useTransform(camera, [.12, .2, .36, .44], [0, 1, 1, 0]);
  const skyScale = useTransform(camera, [.36, .5, .6, .68], [.5, 1, 1.4, 2.5]);
  const skyOpacity = useTransform(camera, [.36, .44, .58, .67], [0, 1, 1, 0]);
  const pairScale = useTransform(camera, [.54, .64, .75, .86], [.5, 1, 1, .55]);
  const pairOpacity = useTransform(camera, [.58, .65, .79, .88], [0, 1, 1, 0]);
  const pairX = useTransform(camera, [.54, .63, .75], ["-65vw", "-45vw", "0vw"]);
  const firstPageRotate = useTransform(camera, [.62, .69, .76], [86, 34, 0]);
  const firstPageOpacity = useTransform(camera, [.62, .67, .73], [0, 1, 1]);
  const debrisScale = useTransform(camera, [.77, .84, .92], [.35, 1.15, 2.4]);
  const debrisOpacity = useTransform(camera, [.77, .84, .92], [0, 1, 0]);
  const debrisX = useTransform(camera, [.77, .84, .92], ["0vw", "26vw", "75vw"]);
  const debrisRotate = useTransform(camera, [.77, .84, .92], [0, 18, 90]);
  const blackholeScale = useTransform(camera, [.78, .91, 1], [.58, .9, 1]);
  const blackholeOpacity = useTransform(camera, [.78, .89, 1], [0, 1, 1]);
  useMotionValueEvent(camera, "change", value => {
    const chapter = Math.max(0, Math.min(4, Math.round(value * 4)));
    setActive(current => current === chapter ? current : chapter);
  });

  function goToStop(index: number) {
    if (!root.current) return;
    const top = root.current.getBoundingClientRect().top + window.scrollY;
    const stickyTop = window.innerWidth <= 600 ? 72 : 80;
    const start = top - stickyTop;
    const travel = root.current.offsetHeight - window.innerHeight + stickyTop;
    window.scrollTo({ top: start + travel * STORY_END * index / 4, behavior: reduced ? "instant" : "smooth" });
  }

  const chapters = [
    { kicker: t("homeEyebrow"), title: <>{t("homeTitleOne")}<br /><em>{t("homeTitleTwo")}</em></>, copy: t("homeIntro") },
    { kicker: "01 / BEYOND OUR EYES", title: <>{t("homeBeyond")}</>, copy: details.light },
    { kicker: "02 / OUR MILKY WAY SKY", title: <>{details.measureTitle}</>, copy: details.measure },
    { kicker: "03 / THE SAME SKY, LATER", title: <>{t("homeCompareOne")}<br /><em>{t("homeCompareTwo")}</em></>, copy: details.compare },
    { kicker: "04 / YOUR TURN", title: <>{t("homeNext")}</>, copy: details.end },
  ];

  if (reduced) return <section className="camera-static" aria-label="Journey through the SPHEREx concept">
    {chapters.map((chapter, index) => <div className="camera-static-chapter" key={index}><span>{chapter.kicker}</span><h1>{chapter.title}</h1><p>{chapter.copy}</p>{index === 4 && <div className="camera-static-links"><Link href="/explore">{t("explore")} ↗</Link><Link href="/timeline">{t("timeline")} ↗</Link><Link href="/compare">{t("compare")} ↗</Link><Link href="/review">{t("review")} ↗</Link><Link href="/about">{t("about")} ↗</Link><Link href="/team">{t("team")} ↗</Link></div>}</div>)}
  </section>;

  return <section ref={root} className="camera-journey" aria-label="Scroll through one continuous illustrated space journey">
    <div className="camera-viewport">
      <motion.div className="camera-far-stars" style={{ x: farX }} aria-hidden="true" />
      <motion.div className="camera-world" style={{ x: worldX }} aria-hidden="true">
        <div className="camera-starfield">{stars.map((style, index) => <i key={index} style={style} />)}</div>
        <div className="camera-landmark camera-landmark-home"><Image src="/images/observatory-night-v2.png" alt="" fill sizes="100vw" priority /><div className="camera-home-shade" /><motion.div className="camera-solar-transition" style={{ scale: solarScale, opacity: solarOpacity }}><SolarSystem /></motion.div><motion.div className="camera-solar-burst" style={{ scale: burstScale, opacity: burstOpacity }}>{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ rotate: `${index * 20}deg` }} />)}</motion.div></div>
        <div className="camera-landmark camera-landmark-light"><motion.div className="camera-universe-transition" style={{ scale: universeScale, opacity: universeOpacity }}><UniverseGalaxies /></motion.div></div>
        <div className="camera-landmark camera-landmark-telescope"><motion.div className="camera-sky-transition" style={{ scale: skyScale, opacity: skyOpacity }}><MilkyWaySky /></motion.div></div>
        <div className="camera-landmark camera-landmark-epochs"><motion.div className="camera-epoch-pair camera-epoch-book" style={{ x: pairX, scale: pairScale, opacity: pairOpacity }}><motion.div className="camera-epoch-page camera-page-before" style={{ rotateY: firstPageRotate, opacity: firstPageOpacity }}><ConceptSky /></motion.div><div className="camera-time-arrow">→</div><div className="camera-epoch-page camera-page-after"><ConceptSky later /></div></motion.div><motion.div className="camera-epoch-debris" style={{ x: debrisX, rotate: debrisRotate, scale: debrisScale, opacity: debrisOpacity }}>{fragments.map((style, index) => <i key={index} style={style} />)}</motion.div></div>
        <div className="camera-landmark camera-landmark-destination"><motion.div className="camera-blackhole-transition" style={{ scale: blackholeScale, opacity: blackholeOpacity }}>{active >= 3 && <video className="camera-blackhole-video" muted loop autoPlay playsInline preload="metadata"><source src="/videos/black-hole-stationary-hd.mp4" type="video/mp4" /><source src="https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013326/BH_AccretionDisk_Sim_Stationary_WebSize.webm" type="video/webm" /></video>}</motion.div></div>
      </motion.div>
      <div className="camera-scrim" aria-hidden="true" />
      <div className="camera-topline"><span>CHRONO &amp; SPATIAL · AN ILLUSTRATED JOURNEY</span></div>
      <div className={`camera-copy ${active === 0 ? "is-home" : ""} ${active === 4 ? "is-final" : ""}`}>{chapters.map((chapter, index) => <JourneyChapter key={index} progress={camera} index={index} active={active === index}><span className="camera-kicker">{chapter.kicker}</span><h1>{chapter.title}</h1><p>{chapter.copy}</p>{index === 0 && <button type="button" className="camera-primary" onClick={() => goToStop(1)}>{t("homeBegin")} <span>↓</span></button>}{index === 2 && <a className="camera-source-link" href="https://science.nasa.gov/asset/webb/the-galactic-center-in-infrared-light-spitzer/" target="_blank" rel="noreferrer">NASA / Spitzer image · not SPHEREx data ↗</a>}{index === 3 && <a className="camera-source-link" href="https://science.nasa.gov/photojournal/massive-star-goes-out-with-a-whimper-instead-of-a-bang/" target="_blank" rel="noreferrer">NASA / Hubble image pair · N6946-BH1 ↗</a>}{index === 4 && <><div className="camera-destinations"><Link className="camera-primary" href="/explore">{t("homeExplore")} ↗</Link><Link href="/timeline">{t("timeline")} ↗</Link><Link href="/compare">{t("compare")} ↗</Link><Link href="/review">{t("review")} ↗</Link><Link href="/about">{t("about")} ↗</Link><Link href="/team">{t("team")} ↗</Link></div><a className="camera-source-link" href="https://svs.gsfc.nasa.gov/13326" target="_blank" rel="noreferrer">Illustrative scene · NASA black hole simulation ↗</a></>}</JourneyChapter>)}</div>
      <div className="camera-progress" role="group" aria-label="Journey chapters">{stops.map((name, index) => <button type="button" key={name} onClick={() => goToStop(index)} aria-current={active === index ? "step" : undefined} aria-label={`Go to ${name}`}><i /><span>{name}</span></button>)}</div>
      <div className="camera-bottomline"><span>SCROLL TO FOLLOW THE CAMERA</span><span>{String(active + 1).padStart(2, "0")} / 05</span><span>{active === 0 ? "ILLUSTRATED SOLAR SYSTEM · SIZES AND SPEEDS NOT TO SCALE" : active === 2 || active === 3 ? "NASA TELESCOPE IMAGERY · NOT SPHEREX DATA" : "CONCEPT ART · NOT OBSERVATION IMAGERY"}</span></div>
    </div>
  </section>;
}

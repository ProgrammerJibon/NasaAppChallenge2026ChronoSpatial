import Image from "next/image";

const stars = Array.from({ length: 32 }, (_, i) => ({
  left: `${(i * 47 + 3) % 100}%`,
  top: `${(i * 31 + 5) % 75}%`,
  animationDelay: `${i * .27}s`,
}));

export function ObservatoryScene() {
  return <div className="home-scenery" aria-hidden="true">
    <Image className="home-artwork" src="/images/observatory-night-v2.png" alt="" fill sizes="100vw" loading="eager" fetchPriority="high" />
    <div className="home-nebula" />
    <div className="home-star-layer">{stars.map((style, i) => <i key={i} style={style} />)}</div>
    <div className="home-telescope-beam" />
    <svg className="home-mountain-layer" viewBox="0 0 1440 220" preserveAspectRatio="none"><path d="M0 180L160 72L280 150L410 90L530 178L710 125L850 200L1040 90L1190 155L1310 55L1440 170V220H0Z" fill="#161936"/><path d="M0 210L190 150L330 210L510 170L730 216L970 175L1160 210L1380 156L1440 195V220H0Z" fill="#080b23"/></svg>
  </div>;
}

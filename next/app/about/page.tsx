import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the SPHEREx Mission — Chrono & Spatial",
  description: "See real SPHEREx all-sky imagery and NASA mission animations while learning how its 102-color infrared survey maps the universe.",
};

const missionSource = "https://science.nasa.gov/mission/spherex/";
const scienceSource = "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/";
const spacecraftSource = "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/spacecraft/";
const instrumentSource = "https://science.jpl.nasa.gov/projects/spherex/";
const skyMapSource = "https://svs.gsfc.nasa.gov/31376/";
const animationSource = "https://svs.gsfc.nasa.gov/14966/";
const scanSource = "https://www.jpl.nasa.gov/images/pia26351-spherex-scans-the-sky/";
const spectrumMovieSource = "https://spherex.caltech.edu/video/spherex-first-all-sky-map-spectrum";
const eyesSource = "https://eyes.nasa.gov/apps/solar-system/";

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="about-source-link">{children} <span aria-hidden="true">↗</span></a>;
}

export default function AboutPage() {
  return (
    <article className="about-mission-page">
      <header className="about-hero">
        <div className="about-hero-copy">
          <span className="about-kicker">CHRONO &amp; SPATIAL / THE MISSION</span>
          <h1>A new color for every place in the sky.</h1>
          <p>SPHEREx surveys the entire sky in infrared light. Its spectrum at each sky position helps astronomers trace galaxies, the universe’s combined glow, and ingredients for life in our own galaxy.</p>
          <div className="about-hero-actions">
            <a href="#how-it-works" className="about-primary-link">See how it works <span aria-hidden="true">↓</span></a>
            <SourceLink href={missionSource}>NASA mission overview</SourceLink>
          </div>
          <span className="about-hero-note">Launched March 11, 2025 · NASA astrophysics mission</span>
        </div>
        <figure className="about-hero-map">
          <img src="/images/nasa-spherex-all-sky-poster.png" alt="Two false-color views of the real SPHEREx all-sky survey, one emphasizing stars and galaxies and the other dust and gas" />
          <figcaption><span>ACTUAL SPHEREx OBSERVATIONS · MAY–DEC 2025</span><SourceLink href={skyMapSource}>Image and color key: NASA SVS</SourceLink></figcaption>
        </figure>
      </header>

      <section className="about-measurements" aria-label="Mission at a glance">
        <div><strong>102</strong><span>infrared spectral channels</span></div>
        <div><strong>0.75–5 μm</strong><span>observed wavelength range</span></div>
        <div><strong>6 × 17</strong><span>detectors × colors per detector</span></div>
        <div><strong>4</strong><span>planned all-sky maps in the prime mission</span></div>
      </section>

      <section className="about-section-intro" id="how-it-works">
        <span className="about-kicker">01 / HOW THE SURVEY WORKS</span>
        <h2>One sky. Thousands of views. A spectrum everywhere.</h2>
        <p>SPHEREx builds the map field by field as it circles Earth. Six detector arrays use filters that vary across each detector, collecting 17 wavelength bands each. As the sky moves through those filters, the mission assembles 102 spectral channels for every sky position.</p>
        <SourceLink href={spacecraftSource}>NASA/JPL instrument details</SourceLink>
      </section>

      <div className="about-process-grid">
        <figure className="about-media-card about-media-card-wide">
          <div className="about-video-wrap"><video controls playsInline preload="none" poster="/images/nasa-spherex-survey-poster.jpg" aria-label="NASA animation of SPHEREx scanning and building an all-sky survey"><source src="/videos/nasa-spherex-survey-map.mp4" type="video/mp4" />Your browser does not support this video.</video></div>
          <figcaption><div><span>NASA / JPL-CALTECH ANIMATION</span><h3>Painting the sky, orbit by orbit</h3><p>This simplified animation shows SPHEREx adding sky tiles across successive orbits. The map is built from observations, rather than a single wide-angle photograph.</p></div><SourceLink href={animationSource}>Animation source</SourceLink></figcaption>
        </figure>
        <div className="about-process-side">
          <div className="about-orbit-card"><span className="about-kicker">THE ORBIT</span><div className="about-orbit-visual" aria-hidden="true"><span className="about-earth">EARTH</span><span className="about-orbit-path" /><span className="about-satellite">SPHEREx</span></div><h3>Keep the instrument cold. Keep surveying.</h3><p>In a low-Earth, Sun-synchronous terminator orbit, the telescope’s shields block warmth from the Sun and Earth. Passive cooling keeps its detectors near −210 °C.</p><SourceLink href={spacecraftSource}>NASA/JPL spacecraft</SourceLink></div>
          <div className="about-mini-fact"><strong>~600</strong><span>exposures per day in the planned survey cadence</span><SourceLink href={scienceSource}>NASA/JPL science</SourceLink></div>
        </div>
      </div>

      <section className="about-experiences" aria-label="Explore the survey and orbit">
        <figure className="about-media-card about-scan-card">
          <div className="about-video-wrap"><video controls playsInline preload="none" poster="/images/nasa-spherex-scan-poster.jpg" aria-label="Real SPHEREx observations changing across infrared wavelengths as it scans a field near the Large Magellanic Cloud"><source src="/videos/nasa-spherex-scans-sky.mp4" type="video/mp4" />Your browser does not support this video.</video></div>
          <figcaption><div><span>ACTUAL SPHEREx OBSERVATIONS · APRIL 2025</span><h3>The same field, seen in different infrared colors</h3><p>Watch a field near the Large Magellanic Cloud change as SPHEREx observes it at different wavelengths. The video displays measured images; its visible colors represent infrared light.</p></div><SourceLink href={scanSource}>NASA/JPL image notes</SourceLink></figcaption>
        </figure>
        <div className="about-eyes-card">
          <span className="about-kicker">EXPLORE THE ORBIT IN 3D</span>
          <div className="about-eyes-visual" aria-hidden="true"><span className="about-eyes-orbit" /><span className="about-eyes-earth" /><span className="about-eyes-satellite">SPHEREx</span></div>
          <h3>Follow the spacecraft around Earth.</h3>
          <p>Open NASA Eyes to rotate, zoom, and inspect a 3D simulation of SPHEREx in its surveying orbit.</p>
          <a className="about-eyes-link" href={eyesSource} target="_blank" rel="noopener noreferrer">Launch NASA Eyes <span aria-hidden="true">↗</span></a>
          <small>Interactive simulation opens on NASA&apos;s site. This preview is a diagram, not mission telemetry.</small>
        </div>
      </section>

      <section className="about-spectrum-section">
        <div className="about-spectrum-copy"><span className="about-kicker">02 / WHY 102 COLORS?</span><h2>Light carries more than a picture.</h2><p>Split infrared light into a spectrum and patterns of brightness can identify materials. A galaxy’s spectral features also help estimate its distance. The colored map above is a display composite: its visible hues represent selected measured infrared wavelengths, not colors a human eye would see.</p><div className="about-spectrum-bars" aria-label="Schematic of six detectors, each measuring 17 spectral channels">{Array.from({ length: 6 }, (_, index) => <span key={index} style={{ opacity: 0.55 + index * 0.08 }}><b>D{index + 1}</b><i>17 bands</i></span>)}</div><small>Schematic only · six detector arrays × 17 channels = 102 spectral channels</small><SourceLink href={spacecraftSource}>How the filters work</SourceLink></div>
        <figure className="about-media-card about-pointing-card"><div className="about-video-wrap"><video controls playsInline preload="none" poster="/images/nasa-spherex-pointing-poster.jpg" aria-label="NASA animation illustrating SPHEREx pointing and its detector filters"><source src="/videos/nasa-spherex-pointing.mp4" type="video/mp4" />Your browser does not support this video.</video></div><figcaption><div><span>NASA / JPL-CALTECH ANIMATION</span><h3>How the instrument sees color</h3><p>The animation simplifies the filter pattern to explain the observing method; it is not a live image from the spacecraft.</p></div><SourceLink href={animationSource}>Animation source</SourceLink></figcaption></figure>
      </section>

      <section className="about-spectrum-movie">
        <div className="about-spectrum-movie-copy"><span className="about-kicker">THE MEASURED SPECTRUM</span><h2>Watch the sky change wavelength by wavelength.</h2><p>Each frame shows the entire sky in a different infrared wavelength from SPHEREx&apos;s first survey, collected from May to December 2025. The wavelength bar identifies the band being displayed. Bright dust clouds in one band can become faint in another.</p><SourceLink href={spectrumMovieSource}>SPHEREx spectrum movie and explanation</SourceLink></div>
        <figure className="about-spectrum-movie-figure"><video controls playsInline preload="none" poster="/images/nasa-spherex-all-sky-poster.png" aria-label="Real SPHEREx first all-sky survey shown wavelength by wavelength"><source src="/videos/nasa-spherex-spectrum-map.mp4" type="video/mp4" />Your browser does not support this video.</video><figcaption>NASA/JPL-Caltech · actual infrared observations, mapped to visible colors for display</figcaption></figure>
      </section>

      <section className="about-science-section"><div className="about-science-heading"><span className="about-kicker">03 / THE QUESTIONS</span><h2>Three questions, one all-sky survey.</h2><p>NASA’s mission science connects the same infrared survey to three very different scales.</p></div><div className="about-science-grid"><div className="about-science-card"><span>01 / THE EARLY UNIVERSE</span><strong>How did the universe begin to take shape?</strong><p>A three-dimensional map of hundreds of millions of galaxies will help test ideas about cosmic inflation.</p></div><div className="about-science-card"><span>02 / GALAXY HISTORY</span><strong>How much light has every galaxy made?</strong><p>The diffuse infrared glow includes light from galaxies too faint or distant to resolve individually.</p></div><div className="about-science-card"><span>03 / OUR MILKY WAY</span><strong>Where are the ingredients for life?</strong><p>Spectra can reveal water ice, carbon dioxide ice, and other molecules in interstellar clouds and young planetary systems.</p></div></div><SourceLink href={scienceSource}>NASA/JPL: the three science goals</SourceLink></section>

      <section className="about-map-section"><div><span className="about-kicker">04 / THE MAP WE HAVE TODAY</span><h2>Look at the real infrared sky.</h2><p>NASA’s first all-sky map combines observations from May through December 2025. The left view emphasizes stars and galaxies; the right emphasizes gas and dust. This is a reduced-resolution, false-color presentation of measured SPHEREx data.</p><SourceLink href={skyMapSource}>Read the NASA image notes</SourceLink></div><figure><video controls playsInline preload="none" poster="/images/nasa-spherex-all-sky-poster.png" aria-label="NASA video moving between two visualizations of the first real SPHEREx all-sky map"><source src="/videos/nasa-spherex-all-sky-2025.webm" type="video/webm" />Your browser does not support this video.</video><figcaption>NASA/JPL-Caltech · actual sky data, with infrared wavelengths mapped to visible colors</figcaption></figure></section>

      <section className="about-data-section"><div><span className="about-kicker">05 / FROM MISSION TO THIS EXPLORER</span><h2>See the evidence, then test an idea.</h2><p>The observatory in this site uses public SPHEREx image cutouts from NASA/IPAC IRSA. A cutout is a small, actual observation—not the full-sky display composite above. When comparing dates, a meaningful change requires overlapping sky coverage, compatible wavelengths, alignment, and noise checks. The 3D galaxy view is explanatory context, not a measured reconstruction of object distances.</p><div className="about-data-actions"><Link href="/explore">Explore real observations ↗</Link><Link href="/compare">Compare two dates ↗</Link><SourceLink href="https://irsa.ipac.caltech.edu/Missions/spherex.html">NASA/IPAC data archive</SourceLink></div></div><ol><li><span>01</span><strong>Observe</strong><small>Choose an archived SPHEREx image and inspect its metadata.</small></li><li><span>02</span><strong>Revisit</strong><small>Find another date covering the same patch of sky and band.</small></li><li><span>03</span><strong>Verify</strong><small>Check registration, image artifacts, and uncertainty before interpreting a difference.</small></li></ol></section>

      <footer className="about-sources"><span className="about-kicker">PRIMARY SOURCES &amp; IMAGE CREDITS</span><div><SourceLink href={missionSource}>NASA mission profile</SourceLink><SourceLink href={scienceSource}>NASA/JPL science</SourceLink><SourceLink href={spacecraftSource}>NASA/JPL spacecraft</SourceLink><SourceLink href={instrumentSource}>NASA/JPL wavelength range</SourceLink><SourceLink href={skyMapSource}>NASA SVS real sky map</SourceLink><SourceLink href={animationSource}>NASA SVS animations</SourceLink><SourceLink href={scanSource}>NASA SPHEREx scan</SourceLink><SourceLink href={spectrumMovieSource}>SPHEREx spectrum movie</SourceLink><SourceLink href={eyesSource}>NASA Eyes 3D simulation</SourceLink></div><p>Mission animations and the orbit diagram are illustrative. The scan and 2025 sky-map movies visualize actual SPHEREx observations. Mission targets and planned survey counts are labeled as plans.</p></footer>
    </article>
  );
}

import React from "react";
import { RiExternalLinkLine, RiShieldCheckLine, RiAlertLine } from "react-icons/ri";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4">
      {/* Page Title */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-mono">
          <span>Mission · Scientific Methodology · Archive Details</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          About SPHEREx & Chrono-Spatial
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">
          Understanding NASA&apos;s all-sky spectroscopic explorer, survey cadences, and how we compare cosmic epochs scientifically.
        </p>
      </div>

      {/* 1. Challenge & Mission Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight border-b border-slate-800 pb-2">
          The SPHEREx Mission
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          The <strong>Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer (SPHEREx)</strong> is
          a NASA Medium-Class Explorer (MIDEX) mission designed to survey the entire sky four times over a nominal two-year mission.
          Every six months, SPHEREx covers 99%+ of the sky, delivering comprehensive spectral data across near-infrared wavelengths from 0.75 µm to 5.0 µm.
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Because SPHEREx repeats its all-sky survey every six months, astronomical objects that change brightness (such as pulsating variable stars, protostellar flares, or novae)
          or move across the sky (such as Near-Earth Asteroids, Main-Belt Asteroids, Comets, and High Proper Motion Brown Dwarfs)
          reveal themselves when two observation epochs are compared.
        </p>
      </section>

      {/* 2. The 102 Spectral Channels Rule */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight border-b border-slate-800 pb-2">
          The 102 Spectral Channels vs Detector Bands
        </h2>
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 space-y-3 text-sm text-slate-300">
          <p className="leading-relaxed">
            <strong className="text-white">Scientific Rule:</strong> It is crucial not to pretend that every archived image product is one of 102 fixed image files.
          </p>
          <p className="leading-relaxed text-xs text-slate-400">
            SPHEREx utilizes six detector arrays (numbered 1 through 6), each topped with Linear Variable Filters (LVFs).
            In an LVF, the wavelength transmitted varies continuously across the physical detector array.
            As the satellite slews across the sky, different parts of the detector observe astronomical targets at slightly different wavelengths.
          </p>
          <p className="leading-relaxed text-xs text-slate-400">
            The mission concept yields 102 spectral channels across the 0.75 – 5.0 µm range when multiple exposures are reconstructed.
            Each Level-2 single-exposure FITS product represents an image slice from one of the six detector bands with an accompanying WCS-WAVE calibration lookup table.
            Our explorer accurately retains and reflects this real archive structure.
          </p>
        </div>
      </section>

      {/* 3. Scientific Difference & Significance Maps */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight border-b border-slate-800 pb-2">
          Scientific Difference Imaging vs Visual Blending
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          In casual web apps, &ldquo;change comparison&rdquo; is often mocked up using CSS opacity transitions or color blending.
          In <strong>Chrono & Spatial</strong>, difference maps are computed on the backend science worker using Astropy and SciPy:
        </p>
        <ul className="list-disc list-inside space-y-2 text-xs text-slate-300 pl-2">
          <li>
            <strong>Celestial WCS Alignment:</strong> Observation B is interpolated onto the astrometric World Coordinate System (WCS) grid of Observation A using bilinear reprojection.
          </li>
          <li>
            <strong>Wavelength Compatibility:</strong> Pixels are only compared when their calibrated central wavelength matches within 2%.
          </li>
          <li>
            <strong>Additive Background Matching:</strong> The local zodiacal and instrumental background is estimated via sigma-clipped statistics and subtracted, preserving true calibrated surface brightness deltas in MJy/sr.
          </li>
          <li>
            <strong>Significance Mapping (\(\sigma\)):</strong> The flux difference is divided by the quadrature sum of pixel variances to produce a statistical significance map in units of standard deviations.
          </li>
        </ul>
      </section>

      {/* 4. Candidate vs Confirmation Disclaimer */}
      <section className="space-y-3 p-5 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
          <RiAlertLine className="w-5 h-5 text-amber-400" />
          <span>Important Notice: A Candidate is Not Confirmation</span>
        </div>
        <p>
          Automated point-source detection algorithms (such as photutils DAOStarFinder) isolate statistical anomalies.
          However, detector cosmic rays, unmasked bad pixels, satellite jitter, and point-spread function (PSF) variations between filter bands can create spurious artifacts.
          No automated detection in this tool claims to be a confirmed discovery without independent astronomical verification and spectroscopic confirmation.
        </p>
      </section>

      {/* 5. Provenance & Official Resources */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight border-b border-slate-800 pb-2">
          Data Provenance & Links
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          All FITS images and spatial metadata are provided courtesy of the NASA/IPAC Infrared Science Archive (IRSA),
          funded by the National Aeronautics and Space Administration.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            href="https://irsa.ipac.caltech.edu"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 hover:text-white transition"
          >
            <span>NASA/IPAC IRSA Archive</span>
            <RiExternalLinkLine className="text-slate-400" />
          </a>
          <a
            href="https://spherex.caltech.edu"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 hover:text-white transition"
          >
            <span>SPHEREx Caltech Mission Site</span>
            <RiExternalLinkLine className="text-slate-400" />
          </a>
          <a
            href="https://www.spaceappschallenge.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 hover:text-white transition"
          >
            <span>NASA Space Apps Challenge</span>
            <RiExternalLinkLine className="text-slate-400" />
          </a>
          <a
            href="https://heasarc.gsfc.nasa.gov/docs/fcg/standard_dict.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 hover:text-white transition"
          >
            <span>FITS Standard Definition</span>
            <RiExternalLinkLine className="text-slate-400" />
          </a>
        </div>
      </section>
    </div>
  );
}

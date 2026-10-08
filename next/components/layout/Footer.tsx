import Link from "next/link";
import { RiExternalLinkLine } from "react-icons/ri";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 text-slate-400 text-sm py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Mission Overview */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-slate-100 text-base">
                Chrono & Spatial
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-mono">
                SPHEREx
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md mb-4">
              A specialized public exploration tool for NASA&apos;s SPHEREx mission.
              Search real all-sky observations across 6-month survey epochs and detect
              motion, transients, and variable sources across 102 near-infrared channels.
            </p>
            <div className="text-[11px] text-slate-400">
              Data sourced directly from NASA/IPAC Infrared Science Archive (IRSA) Level-2 products.
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
              Explorer Pages
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/explore" className="hover:text-sky-400 transition">
                  Sky Explorer (Spatial)
                </Link>
              </li>
              <li>
                <Link href="/timeline" className="hover:text-sky-400 transition">
                  Temporal Sky Viewer
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-sky-400 transition">
                  Epoch Change Comparison
                </Link>
              </li>
              <li>
                <Link href="/review" className="hover:text-sky-400 transition">
                  Citizen Science Review
                </Link>
              </li>
            </ul>
          </div>

          {/* Challenge & Team */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
              Event & Context
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/team" className="hover:text-sky-400 transition">
                  Team A-JINX (Bangladesh)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-sky-400 transition">
                  Scientific Methodology
                </Link>
              </li>
              <li>
                <a
                  href="https://irsa.ipac.caltech.edu"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-sky-400 transition"
                >
                  NASA/IPAC IRSA Archive <RiExternalLinkLine className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://spherex.caltech.edu"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-sky-400 transition"
                >
                  SPHEREx Mission Official <RiExternalLinkLine className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} Team A-JINX · NASA Space Apps Challenge Project
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="hover:text-slate-300 transition">
              Admin Ops
            </Link>
            <span>·</span>
            <span>All FITS data courtesy of NASA / JPL-Caltech / IPAC</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

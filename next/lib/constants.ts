export const APP_NAME = "Chrono & Spatial";
export const APP_SUBTITLE = "SPHEREx Sky Change Explorer";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

export const SPHEREX_DETECTORS = [
  { id: 1, name: "Band 1", range: "0.75 – 1.11 µm", color: "#38bdf8" },
  { id: 2, name: "Band 2", range: "1.11 – 1.64 µm", color: "#818cf8" },
  { id: 3, name: "Band 3", range: "1.64 – 2.42 µm", color: "#c084fc" },
  { id: 4, name: "Band 4", range: "2.42 – 3.82 µm", color: "#f472b6" },
  { id: 5, name: "Band 5", range: "3.82 – 4.42 µm", color: "#fb923c" },
  { id: 6, name: "Band 6", range: "4.42 – 5.00 µm", color: "#f87171" },
];

export const COMPARISON_MODES = [
  { id: "side-by-side", label: "Side-by-Side", icon: "RiSplitCellsHorizontalLine" },
  { id: "swipe", label: "Interactive Swipe", icon: "RiDragMoveLine" },
  { id: "blink", label: "Epoch Blink", icon: "RiEye2Line" },
  { id: "fade", label: "Crossfade", icon: "RiContrast2Line" },
  { id: "difference", label: "Scientific Difference", icon: "RiSubtractLine" },
  { id: "significance", label: "Significance Map", icon: "RiRadarLine" },
] as const;

export type ComparisonMode = (typeof COMPARISON_MODES)[number]["id"];

export const REVIEW_CLASSIFICATIONS = [
  "Moving object",
  "Brightness changed",
  "Appeared/disappeared",
  "Likely artefact/noise",
  "Unsure",
] as const;

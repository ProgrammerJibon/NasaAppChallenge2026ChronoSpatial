import type { Observation } from "@/lib/types";
import { formatDate, formatCoords, formatWavelength } from "@/lib/format";

/**
 * Provenance for one observation. Rows that come from the NASA/IPAC IRSA SIA2
 * record are only shown when that record is present, so observations ingested
 * before the archive integration still render cleanly.
 */
export function MetadataPanel({ observation }: { observation: Observation | null }) {
  if (!observation) return null;

  const meta = (observation.metadata_json ?? {}) as Record<string, any>;
  const cutout = meta.cutout as { size_deg?: number; service?: string } | undefined;

  const values: Array<[string, string]> = [
    ["Observed", formatDate(observation.observation_date)],
    ["Detector band", `Band ${observation.band_number}`],
    ["Wavelength", formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um)],
    ["Coordinates", formatCoords(observation.ra, observation.dec)],
    [
      "Image size",
      observation.width && observation.height
        ? `${observation.width} × ${observation.height} pixels`
        : "Not provided",
    ],
    ["Brightness unit", String(meta.image?.unit ?? meta.unit ?? "Not provided")],
    ["Archive ID", observation.archive_id],
  ];

  if (meta.archive) values.push(["Archive", `${meta.archive}${meta.service ? ` · ${meta.service}` : ""}`]);
  if (meta.collection) values.push(["Collection", String(meta.collection)]);
  if (meta.instrument) {
    values.push(["Instrument", `${meta.instrument}${meta.bandpass ? ` (${meta.bandpass})` : ""}`]);
  }
  if (meta.calib_level != null) values.push(["Calibration level", `Level ${meta.calib_level}`]);
  if (meta.exposure_time_s != null) {
    values.push(["Exposure", `${Number(meta.exposure_time_s).toFixed(1)} s`]);
  }
  if (meta.pixel_scale_arcsec != null) {
    values.push(["Pixel scale", `${Number(meta.pixel_scale_arcsec).toFixed(2)}″ / pixel`]);
  }
  if (cutout?.size_deg != null) {
    values.push([
      "Cutout",
      `${Number(cutout.size_deg).toFixed(3)}° via ${cutout.service ?? "IRSA IBE"}`,
    ]);
  }

  return (
    <div className="metadata-readout">
      <dl>
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {observation.archive_url && (
        <a href={observation.archive_url} target="_blank" rel="noreferrer" className="text-link">
          Open archive source ↗
        </a>
      )}
    </div>
  );
}

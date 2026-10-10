import type { Observation } from "@/lib/types";
import { formatDate, formatCoords, formatWavelength } from "@/lib/format";
export function MetadataPanel({observation}:{observation:Observation|null}) {
  if(!observation) return null;
  const values=[['Observed',formatDate(observation.observation_date)],['Detector band',`Band ${observation.band_number}`],['Wavelength',formatWavelength(observation.wavelength_min_um,observation.wavelength_max_um)],['Coordinates',formatCoords(observation.ra,observation.dec)],['Image size',observation.width && observation.height ? `${observation.width} × ${observation.height} pixels` : 'Not provided'],['Brightness unit',String(observation.metadata_json?.unit??'Not provided')],['Archive ID',observation.archive_id]];
  return <div className="metadata-readout"><dl>{values.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{observation.archive_url && <a href={observation.archive_url} target="_blank" rel="noreferrer" className="text-link">Open archive source ↗</a>}</div>;
}

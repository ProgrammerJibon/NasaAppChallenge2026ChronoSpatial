export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "Unknown Date";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function formatShortDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function formatCoords(ra: number, dec: number): string {
  const raStr = ra.toFixed(4);
  const decStr = dec >= 0 ? `+${dec.toFixed(4)}` : dec.toFixed(4);
  return `RA ${raStr}° / Dec ${decStr}°`;
}

export function formatWavelength(minUm: number, maxUm: number): string {
  return `${minUm.toFixed(2)} – ${maxUm.toFixed(2)} µm`;
}

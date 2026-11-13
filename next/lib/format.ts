function archiveDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  // IRSA manifest timestamps are UTC but omit the trailing Z.
  const utcText = /^\d{4}-\d{2}-\d{2}T/.test(dateStr) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr)
    ? `${dateStr}Z`
    : dateStr;
  return new Date(utcText);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "Unknown Date";
  try {
    const d = archiveDate(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
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
    const d = archiveDate(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
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

export interface CoordinateResult {
  ra: number;
  dec: number;
  isValid: boolean;
  error?: string;
}

const KNOWN_TARGETS: Record<string, { ra: number; dec: number }> = {
  m31: { ra: 10.098, dec: 39.143 },
  andromeda: { ra: 10.098, dec: 39.143 },
  m42: { ra: 82.821, dec: -3.99 },
  orion: { ra: 82.821, dec: -3.99 },
  m45: { ra: 56.655, dec: 24.84 },
  pleiades: { ra: 56.655, dec: 24.84 },
  galacticcenter: { ra: 266.185, dec: -28.153 },
  sgr_a: { ra: 266.185, dec: -28.153 },
  lmc: { ra: 90.015, dec: -66.621 },
};

export function parseCoordinates(input: string): CoordinateResult {
  const clean = input.trim();
  if (!clean) {
    return { ra: 0, dec: 0, isValid: false, error: "Coordinates or object name cannot be empty." };
  }

  // Check known astronomical name
  const lookupKey = clean.toLowerCase().replace(/[\s\-_]/g, "");
  if (KNOWN_TARGETS[lookupKey]) {
    return { ...KNOWN_TARGETS[lookupKey], isValid: true };
  }

  // Check comma or space separated numbers (e.g. "10.098, 39.143" or "10.098 39.143")
  const parts = clean.split(/[,\s]+/).map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const ra = parts[0];
    const dec = parts[1];
    if (ra < 0 || ra >= 360) {
      return { ra, dec, isValid: false, error: "Right Ascension (RA) must be between 0° and 360°." };
    }
    if (dec < -90 || dec > 90) {
      return { ra, dec, isValid: false, error: "Declination (Dec) must be between -90° and +90°." };
    }
    return { ra, dec, isValid: true };
  }

  return {
    ra: 0,
    dec: 0,
    isValid: false,
    error: "Enter valid coordinates (e.g. '10.098, 39.143') or an object name (e.g. 'M31', 'Orion').",
  };
}

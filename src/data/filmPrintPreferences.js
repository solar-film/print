const storagePrefix = 'filmPrint.';
const logoSize = { min: 50, max: 150, step: 5, defaultValue: 100 };
const watermarkSize = { min: 20, max: 100, step: 5, defaultValue: 70 };
const watermarkOpacity = { min: 0, max: 100, step: 1, defaultValue: 12 };
const verticalPadding = { min: 0, step: 0.5, defaultValue: 1.5 };
const horizontalPadding = { ...verticalPadding, defaultValue: 2 };

export const filmPrintRanges = {
  seriesSize: { min: 6, max: 24, step: 0.5, defaultValue: 10 },
  modelSize: { min: 6, max: 24, step: 0.5, defaultValue: 12 },
  specSize: { min: 6, max: 12, step: 0.5, defaultValue: 8 },
  brandLogoSize: logoSize,
  warrantyLogoSize: logoSize,
  gfsSize: watermarkSize,
  gfsOpacity: watermarkOpacity,
  mhlSize: watermarkSize,
  mhlOpacity: watermarkOpacity,
  quantity: { min: 1, max: 1200, step: 1, defaultValue: 32 },
  startPos: { min: 1, max: 200, step: 1, defaultValue: 1 },
  gridCols: { min: 1, max: 10, step: 1, defaultValue: 4 },
  gridRows: { min: 1, max: 20, step: 1, defaultValue: 8 },
  piecePaddingTop: verticalPadding,
  piecePaddingBottom: verticalPadding,
  piecePaddingLeft: horizontalPadding,
  piecePaddingRight: horizontalPadding,
};

export function readFilmPrintPreferences() {
  const preferences = { watermark: 'none' };
  for (const [name, range] of Object.entries(filmPrintRanges)) {
    preferences[name] = range.defaultValue;
  }

  try {
    const watermark = localStorage.getItem(`${storagePrefix}watermark`);
    if (watermark === 'gfs' || watermark === 'mhl') preferences.watermark = watermark;

    for (const [name, { min, max, step }] of Object.entries(filmPrintRanges)) {
      const saved = localStorage.getItem(`${storagePrefix}${name}`);
      if (!saved?.trim()) continue;

      const value = Number(saved);
      if (Number.isFinite(value) && value >= min && value <= (max ?? Infinity) && (value - min) % step === 0) {
        preferences[name] = value;
      }
    }
  } catch {
    // The print controls still work for this visit when browser storage is unavailable.
  }

  return preferences;
}

export function saveFilmPrintPreference(name, value) {
  try {
    localStorage.setItem(`${storagePrefix}${name}`, String(value));
  } catch {
    // Keep the current session usable if the browser blocks storage.
  }
}

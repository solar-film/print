const storagePrefix = 'filmPrint.';
const legacyGridColsKey = `${storagePrefix}gridCols`;
const gridColsKey = `${legacyGridColsKey}.v2`;
const logoSize = { min: 50, max: 150, step: 5, defaultValue: 110 };
const companyLogoSize = { min: 20, max: 100, step: 5, defaultValue: 100 };
const verticalPadding = { min: 0, step: 0.5, defaultValue: 1.5 };
const horizontalPadding = { ...verticalPadding, defaultValue: 2 };

export const filmPrintRanges = {
  seriesSize: { min: 6, max: 24, step: 0.5, defaultValue: 13.5 },
  modelSize: { min: 6, max: 24, step: 0.5, defaultValue: 16 },
  specSize: { min: 6, max: 12, step: 0.5, defaultValue: 11.5 },
  brandLogoSize: logoSize,
  warrantyLogoSize: logoSize,
  gfsLogoSize: companyLogoSize,
  mhlLogoSize: companyLogoSize,
  borneoLogoSize: companyLogoSize,
  designSquareLogoSize: companyLogoSize,
  quantity: { min: 1, max: 1200, step: 1, defaultValue: 21 },
  startPos: { min: 1, max: 200, step: 1, defaultValue: 1 },
  gridCols: { min: 1, max: 10, step: 1, defaultValue: 2 },
  gridRows: { min: 1, max: 20, step: 1, defaultValue: 7 },
  piecePaddingTop: verticalPadding,
  piecePaddingBottom: verticalPadding,
  piecePaddingLeft: horizontalPadding,
  piecePaddingRight: horizontalPadding,
};

function preferenceKey(name) {
  return name === 'gridCols' ? gridColsKey : `${storagePrefix}${name}`;
}

export function readFilmPrintPreferences() {
  const preferences = { watermark: 'none' };
  for (const [name, range] of Object.entries(filmPrintRanges)) {
    preferences[name] = range.defaultValue;
  }

  try {
    const watermark = localStorage.getItem(`${storagePrefix}watermark`);
    if (['gfs', 'mhl', 'borneo', 'designSquare'].includes(watermark)) preferences.watermark = watermark;

    for (const [name, { min, max, step }] of Object.entries(filmPrintRanges)) {
      let saved = localStorage.getItem(preferenceKey(name));
      if (name === 'gridCols' && saved === null) {
        // Use the new default for the old 3-column layout. Choices made
        // after the update are saved separately so users can select 3 again.
        const legacy = localStorage.getItem(legacyGridColsKey);
        if (Number(legacy) !== 3) saved = legacy;
      }
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
    localStorage.setItem(preferenceKey(name), String(value));
  } catch {
    // Keep the current session usable if the browser blocks storage.
  }
}

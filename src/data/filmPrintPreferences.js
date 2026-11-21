const storagePrefix = 'filmPrint.';
// Apply the new starting layout once to browsers with older saved layouts.
const defaultLayoutPreferences = new Set(['gridCols', 'gridRows', 'quantity', 'startPos', 'watermark', 'specSize']);
const logoSize = { min: 50, max: 150, step: 5, defaultValue: 110 };
const companyLogoSize = { min: 20, max: 100, step: 5, defaultValue: 100 };
const verticalPadding = { min: 0, step: 0.5, defaultValue: 1.5 };
const horizontalPadding = { ...verticalPadding, defaultValue: 2 };

export const filmPrintRanges = {
  seriesSize: { min: 6, max: 24, step: 0.5, defaultValue: 13.5 },
  modelSize: { min: 6, max: 24, step: 0.5, defaultValue: 16 },
  specSize: { min: 6, max: 12, step: 0.5, defaultValue: 9.5 },
  brandLogoSize: logoSize,
  warrantyLogoSize: logoSize,
  gfsLogoSize: companyLogoSize,
  mhlLogoSize: companyLogoSize,
  borneoLogoSize: companyLogoSize,
  designSquareLogoSize: companyLogoSize,
  quantity: { min: 1, max: 1200, step: 1, defaultValue: 21 },
  startPos: { min: 1, max: 200, step: 1, defaultValue: 1 },
  gridCols: { min: 1, max: 10, step: 1, defaultValue: 3 },
  gridRows: { min: 1, max: 20, step: 1, defaultValue: 7 },
  piecePaddingTop: verticalPadding,
  piecePaddingBottom: verticalPadding,
  piecePaddingLeft: horizontalPadding,
  piecePaddingRight: horizontalPadding,
};

function preferenceKey(name) {
  const version = defaultLayoutPreferences.has(name) ? '.v3' : '';
  return `${storagePrefix}${name}${version}`;
}

export function readFilmPrintPreferences() {
  const preferences = { watermark: 'mhl', designSquarePlacement: 'side', language: 'en' };
  for (const [name, range] of Object.entries(filmPrintRanges)) {
    preferences[name] = range.defaultValue;
  }

  try {
    const watermark = localStorage.getItem(preferenceKey('watermark'));
    if (['none', 'gfs', 'mhl', 'borneo', 'designSquare'].includes(watermark)) preferences.watermark = watermark;
    const language = localStorage.getItem(preferenceKey('language'));
    if (language === 'th' || language === 'en') preferences.language = language;
    if (localStorage.getItem(preferenceKey('designSquarePlacement')) === 'header') {
      preferences.designSquarePlacement = 'header';
    }

    for (const [name, { min, max, step }] of Object.entries(filmPrintRanges)) {
      const saved = localStorage.getItem(preferenceKey(name));
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

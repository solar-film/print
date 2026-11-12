// Source: user-provided 3M Ceramic-X brochure, specifications on 6 mm clear glass.
// Thickness is not stated in the brochure and is intentionally omitted.
export const catalogAdditionsVersion = 'ceramic-x-ca-2026-11-12';
export const catalogAdditionsStorageKey = 'filmDatabaseCatalogAdditions';

const ceramicX = [
  ['5', '82.0%', '99.9%', '8.7%', '4.6%', '61.8%', '90.2%'],
  ['15', '74.0%', '99.7%', '17.3%', '4.7%', '57.7%', '80.5%'],
  ['35', '73.0%', '98.6%', '32.2%', '4.9%', '53.4%', '63.8%'],
].map(([model, irr, uvr, vlt, reflection, tser, glare]) => ({
  brand: '3M',
  series: 'Ceramic-X',
  model: `Ceramic-X ${model}`,
  warranty: '7',
  specs: {
    'Infrared Rejected (IRR)': irr,
    'UV Rejection (UVR)': uvr,
    'Visible Light Transmittance (VLT)': vlt,
    'Visible Light Reflected (EXT)': reflection,
    'Total Solar Energy Rejected (TSER)': tser,
    'Visible Light Reflected (INT)': reflection,
    'Glare Reduction': glare,
  },
}));

// Source: user-provided 3M Ceramic Series (CA), July 2024 brochure.
// IRR and film thickness are not specified. All values use 6 mm clear glass.
const ceramicCA = [
  ['15', '0.41', '19%', '5%', '59%', '99.8%', 'Dark Bluish Black'],
  ['25', '0.43', '31%', '5%', '57%', '99.7%', 'Dark Bluish Black'],
  ['35', '0.45', '37%', '6%', '55%', '99.8%', 'Light Bluish Black'],
  ['45', '0.48', '45%', '6%', '52%', '99.8%', 'Light Bluish Black'],
  ['60', '0.53', '62%', '7%', '48%', '99.7%', 'Light Bluish Black'],
  ['80', '0.57', '77%', '8%', '43%', '99.6%', 'Light Bluish Black'],
].map(([model, shgc, vlt, reflection, tser, uvr, color]) => ({
  brand: '3M',
  series: 'Ceramic Series (CA)',
  model: `CA ${model}`,
  warranty: '8',
  specs: {
    'Solar Heat Gain Coefficient (SHGC)': shgc,
    'UV Rejection (UVR)': uvr,
    'Visible Light Transmittance (VLT)': vlt,
    'Visible Light Reflected (EXT)': reflection,
    'Total Solar Energy Rejected (TSER)': tser,
    'Visible Light Reflected (INT)': reflection,
    'Color': color,
  },
}));

export const catalogAdditions = [...ceramicX, ...ceramicCA];

const identity = film => [film.brand, film.model]
  .map(value => String(value ?? '').replace(/\s+/g, '').toLowerCase()).join('\u0000');

export function withCatalogAdditions(database) {
  const existing = new Set(database.map(identity));
  // Older bundled records have names only; enrich those without replacing edited specs.
  const enriched = database.map(film => {
    const addition = catalogAdditions.find(item => identity(item) === identity(film));
    return addition && !Object.keys(film.specs || {}).length
      ? { ...addition, ...film, warranty: film.warranty || addition.warranty, specs: { ...addition.specs } }
      : film;
  });
  return [...enriched, ...catalogAdditions
    .filter(film => !existing.has(identity(film)))
    .map(film => ({ ...film, specs: { ...film.specs } }))];
}

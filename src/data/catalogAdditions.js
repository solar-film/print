// Source: user-provided 3M Ceramic-X brochure, specifications on 6 mm clear glass.
// Thickness is not stated in the brochure and is intentionally omitted.
export const catalogAdditionsVersion = '3m-catalog-24-models-2026-11-12';
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

// Source: user-provided 3M-Ceramic (CM IR).jpg, values on 6 mm clear glass.
const ceramicIR = [
  ['5', '0.36', '6.4%', '4.8%', '4.8%', '95%', '63.9%', '99.9%', 'Dark Bluish Black'],
  ['15', '0.40', '19.5%', '4.9%', '5.1%', '90%', '59.6%', '99.8%', 'Dark Bluish Black'],
  ['25', '0.42', '30.8%', '5.3%', '5.4%', '90%', '57.5%', '99.7%', 'Dark Bluish Black'],
  ['35', '0.47', '45.3%', '5.9%', '6%', '85%', '52.2%', '99.6%', 'Light Bluish Black'],
  ['50', '0.52', '63.9%', '7.1%', '7%', '84%', '47.5%', '99.5%', 'Light Bluish Black'],
  ['70', '0.58', '78.2%', '8.2%', '8%', '78%', '41.6%', '99.2%', 'Light Bluish Black'],
].map(([model, shgc, vlt, ext, int, irr, tser, uvr, color]) => ({
  brand: '3M', series: 'Ceramic IR', model: `CM-IR ${model}`, warranty: '8',
  specs: {
    'Solar Heat Gain Coefficient (SHGC)': shgc,
    'Infrared Rejected (IRR)': irr,
    'UV Rejection (UVR)': uvr,
    'Visible Light Transmittance (VLT)': vlt,
    'Visible Light Reflected (EXT)': ext,
    'Total Solar Energy Rejected (TSER)': tser,
    'Visible Light Reflected (INT)': int,
    'Color': color,
  },
}));

// Source: user-provided 3M-BC.jpg. No IRR or film thickness is given.
const reflective = [
  ['P18ARL', '0.23', '17%', '56%', '58%', '77%', 'Silver'],
  ['BC 10', '0.28', '10%', '22%', '18%', '72%', 'Dark Reflective'],
  ['BC 20', '0.32', '17%', '20%', '25%', '68%', 'Dark Reflective'],
  ['BC 35', '0.47', '36%', '13%', '11%', '53%', 'Light Reflective'],
  ['BC 40', '0.53', '42%', '8%', '9%', '47%', 'Light Reflective'],
].map(([model, shgc, vlt, ext, int, tser, color]) => ({
  brand: '3M', series: 'Reflective', model, warranty: '7',
  specs: {
    'Solar Heat Gain Coefficient (SHGC)': shgc,
    'UV Rejection (UVR)': '99%',
    'Visible Light Transmittance (VLT)': vlt,
    'Visible Light Reflected (EXT)': ext,
    'Total Solar Energy Rejected (TSER)': tser,
    'Visible Light Reflected (INT)': int,
    'Color': color,
  },
}));

// Source: user-provided 3M-PR.jpg. Keep the 60-degree TSER separate from TSER.
const prestige = [
  ['70', '0.51', '69%', '8%', '8%', '49%', '59%', 'Bluish'],
  ['50', '0.44', '51%', '8%', '7%', '56%', '63%', 'Dark Smoke'],
  ['40', '0.41', '40%', '7%', '7%', '60%', '66%', 'Dark Smoke'],
  ['20', '0.38', '21%', '6%', '5%', '62%', '65%', 'Dark Smoke'],
].map(([model, shgc, vlt, ext, int, tser, tser60, color]) => ({
  brand: '3M', series: 'Prestige', model: `PR ${model}`, warranty: '10',
  specs: {
    'Solar Heat Gain Coefficient (SHGC)': shgc,
    'Infrared Rejected (IRR)': '97%',
    'UV Rejection (UVR)': '99.9%',
    'Visible Light Transmittance (VLT)': vlt,
    'Visible Light Reflected (EXT)': ext,
    'Total Solar Energy Rejected (TSER)': tser,
    'Visible Light Reflected (INT)': int,
    'Total Solar Energy Rejected at 60°': tser60,
    'Color': color,
  },
}));

export const catalogAdditions = [...ceramicX, ...ceramicCA, ...ceramicIR, ...reflective, ...prestige];

const identity = film => [film.brand, film.model]
  .map(value => String(value ?? '').replace(/[\s-]+/g, '').toLowerCase()).join('\u0000');

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

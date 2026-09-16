// Keep source headings (including capitalization) and column order for display.
export function filmFromRow(row) {
  const film = { brand: '', series: '', model: '', specs: {} };
  for (const [heading, rawValue] of Object.entries(row)) {
    const value = String(rawValue ?? '').trim();
    const field = heading.trim().toLowerCase();
    if (['brand', 'series', 'model'].includes(field)) {
      film[field] = value;
    } else if (heading.trim() && value) {
      film.specs[heading] = value;
    }
  }
  return film;
}

export function displaySpecs(specs = {}) {
  return Object.entries(specs)
    .filter(([, value]) => String(value ?? '').trim() && String(value).trim() !== '00')
    .map(([label, value]) => ({ label, value: String(value).trim() }));
}

export function specSuffix({ label, value }) {
  return /shgc|thickness|construction/i.test(label) || /[a-zA-Z%]$/.test(value.trim()) ? '' : '%';
}

export function metricKey(specs, metric) {
  return Object.keys(specs || {}).find(key => {
    const normalized = key.trim().toLowerCase();
    return normalized === metric || normalized.includes(`(${metric})`);
  }) || metric;
}

export function hasFilmIdentity(film) {
  return [film.brand, film.series, film.model].some(value => String(value ?? "").trim());
}

export function filmLabel(film) {
  return [film.brand, film.series, film.model].filter(value => String(value ?? "").trim()).join(" - ");
}

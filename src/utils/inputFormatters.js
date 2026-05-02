export function normalizeInputDateValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const toIso = (year, month, day) => {
    const y = String(year || '').padStart(4, '0');
    const m = Number(month);
    const d = Number(day);
    if (!Number.isFinite(m) || !Number.isFinite(d)) return '';
    if (m < 1 || m > 12 || d < 1 || d > 31) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = iso[1];
    const a = Number(iso[2]);
    const b = Number(iso[3]);
    if (a >= 1 && a <= 12) return toIso(year, a, b);
    if (b >= 1 && b <= 12) return toIso(year, b, a);
    return '';
  }

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    if (first > 12 && second <= 12) return toIso(year, second, first);
    if (second > 12 && first <= 12) return toIso(year, first, second);
    return toIso(year, first, second);
  }

  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dash) {
    const year = dash[3].length === 2 ? `20${dash[3]}` : dash[3];
    const first = Number(dash[1]);
    const second = Number(dash[2]);
    if (first > 12 && second <= 12) return toIso(year, second, first);
    if (second > 12 && first <= 12) return toIso(year, first, second);
    return toIso(year, first, second);
  }

  const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const named = text.match(/^(\d{1,2})[\/-\s]([A-Za-z]{3,})[\/-\s](\d{2,4})$/);
  if (named) {
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    const month = monthNames[named[2].slice(0, 3).toLowerCase()];
    if (month) return toIso(year, Number(month), named[1]);
  }
  return '';
}

export function normalizeInputNumberValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : '';
}

export function getSafeInputValue(type, value) {
  if (type === 'date') return normalizeInputDateValue(value);
  if (type === 'number') return normalizeInputNumberValue(value);
  return value || '';
}

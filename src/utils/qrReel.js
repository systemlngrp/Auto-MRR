export function extractReelNumberFromQr(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  // 1) Plain reel number only (fast path)
  // Allow common reel id chars while rejecting obvious structured payloads.
  const looksLikePlain =
    !/[{}[\]\n\r]/.test(text) &&
    !/https?:\/\//i.test(text) &&
    !/[=&]/.test(text) &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]{0,118}$/.test(text);
  if (looksLikePlain) return text;

  const pickFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    const candidates = [
      obj.our_reel_no,
      obj.our_reel_number,
      obj.ourReelNo,
      obj.ourReelNumber,
      obj.reel_no,
      obj.reelNo,
      obj.reel,
      obj.reel_number,
      obj.reelNumber
    ];
    const found = candidates.find((v) => String(v ?? '').trim());
    return found ? String(found).trim() : '';
  };

  // 2) JSON payload
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const got = pickFromObject(item);
          if (got) return got;
        }
      } else {
        const got = pickFromObject(parsed);
        if (got) return got;
      }
    } catch {
      // ignore
    }
  }

  // 3) URL query params (e.g. https://.../?reel_no=ABC)
  try {
    const url = new URL(text);
    const keys = ['our_reel_no', 'our_reel_number', 'ourReelNo', 'reel_no', 'reelNo', 'reel'];
    for (const k of keys) {
      const v = url.searchParams.get(k);
      if (v && String(v).trim()) return String(v).trim();
    }
  } catch {
    // ignore
  }

  // 4) Query-string like payload (not a full URL)
  if (/[=&]/.test(text)) {
    const parts = text.split(/[&;]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      const key = part.slice(0, eq).trim();
      const val = part.slice(eq + 1).trim();
      if (!val) continue;
      if (/^(our_?reel(_?no|_?number)?|reel(_?no|_?number)?)$/i.test(key)) return val;
    }
  }

  // 5) Human-readable label formats
  const labelMatch =
    text.match(/our\s*reel\s*(?:no\.?|number)?\s*[:=\-]\s*([A-Za-z0-9][A-Za-z0-9._/-]{0,118})/i) ||
    text.match(/\breel\s*(?:no\.?|number)?\s*[:=\-]\s*([A-Za-z0-9][A-Za-z0-9._/-]{0,118})/i);
  if (labelMatch?.[1]) return labelMatch[1].trim();

  // 6) Multi-line / mixed payload: pick the first reel-like token
  const tokens = text
    .split(/[\s,|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const token = tokens.find((t) => /^[A-Za-z0-9][A-Za-z0-9._/-]{2,118}$/.test(t));
  return token ? token : '';
}


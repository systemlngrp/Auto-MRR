export function parseCsv(text) {
  const input = String(text ?? '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Skip fully empty trailing rows.
    if (row.length === 1 && row[0] === '') return;
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = input[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      pushField();
      continue;
    }

    if (ch === '\r') {
      // Ignore, handled by \n.
      continue;
    }

    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  // Final field/row.
  pushField();
  pushRow();

  if (!rows.length) return { headers: [], rows: [] };
  const rawHeaders = rows[0] || [];
  const headers = rawHeaders.map((h, idx) => {
    const trimmed = String(h ?? '').trim();
    return trimmed || `Column ${idx + 1}`;
  });
  const dataRows = rows.slice(1);
  const objects = dataRows
    .filter((r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() !== ''))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = String(r?.[idx] ?? '').trim();
      });
      return obj;
    });
  return { headers, rows: objects };
}


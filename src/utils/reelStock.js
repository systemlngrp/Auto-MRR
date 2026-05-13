function toNum(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!text) return 0;
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

function norm(value) {
  return String(value ?? '').trim();
}

export function buildReelStock({ mrrRows = [], issueRows = [], returnRows = [] } = {}) {
  // Stock is keyed by unique Our Reel Number.
  const stock = new Map();

  const addBase = (ourReelNo, base) => {
    const key = norm(ourReelNo);
    if (!key) return;
    if (!stock.has(key)) {
      stock.set(key, {
        our_reel_no: key,
        erp: '',
        supplier: '',
        size: '',
        gsm: '',
        bf: '',
        weight: 0,
        rate: 0,
        issued_weight: 0,
        return_weight: 0
      });
    }
    const row = stock.get(key);
    Object.assign(row, {
      erp: base.erp || row.erp,
      supplier: base.supplier || row.supplier,
      size: base.size || row.size,
      gsm: base.gsm || row.gsm,
      bf: base.bf || row.bf,
      rate: base.rate || row.rate
    });
    row.weight += base.weight || 0;
  };

  // 1) MRR rows: try both normalized keys (backend normalized) and sheet header keys.
  (mrrRows || []).forEach((r) => {
    const our = norm(r?.our_reel_no || r?.our_reel_number || r?.ourreelno || r?.['Our Reel Number']);
    const erp = norm(r?.erp_code || r?.erp || r?.['ERP Code'] || r?.['ERP']);
    const supplier = norm(r?.supplier || r?.supplier_name || r?.['SUPPLIER']);
    const size = norm(r?.size || r?.size_value || r?.['Size']);
    const gsm = norm(r?.gsm || r?.gsm_value || r?.['GSM']);
    const bf = norm(r?.bf || r?.bf_value || r?.['BF']);
    const weight = toNum(r?.weight || r?.net_wt || r?.net_wt_kgs || r?.['Weight']);
    const rate = toNum(r?.rate || r?.po_rate || r?.['Rate']);
    addBase(our, { erp, supplier, size, gsm, bf, weight, rate });
  });

  // 2) Issue rows: sum issued weight by Our Reel Number (preferred) or QR Scan if it matches.
  (issueRows || []).forEach((r) => {
    const our = norm(r?.our_reel_number || r?.our_reel_no || r?.['Our Reel Number'] || r?.['Our Reel No.'] || r?.['Our Reel No'] || r?.['QR Scan']);
    const w = toNum(r?.issue_weight || r?.weight || r?.['Weight']);
    if (!our) return;
    if (!stock.has(our)) {
      stock.set(our, { our_reel_no: our, erp: '', supplier: '', size: '', gsm: '', bf: '', weight: 0, rate: 0, issued_weight: 0, return_weight: 0 });
    }
    stock.get(our).issued_weight += w;
  });

  // 3) Return rows: attempt match by QR Scan or Our Reel Number if present.
  (returnRows || []).forEach((r) => {
    const our = norm(r?.our_reel_number || r?.our_reel_no || r?.['Our Reel Number'] || r?.['QR Scan']);
    const w = toNum(r?.return_weight || r?.weight || r?.['Weight']);
    if (!our) return;
    if (!stock.has(our)) {
      stock.set(our, { our_reel_no: our, erp: '', supplier: '', size: '', gsm: '', bf: '', weight: 0, rate: 0, issued_weight: 0, return_weight: 0 });
    }
    stock.get(our).return_weight += w;
  });

  const rows = Array.from(stock.values()).map((r) => {
    const available_weight = Math.max(0, (r.weight || 0) - (r.issued_weight || 0) + (r.return_weight || 0));
    return {
      ...r,
      available_weight
    };
  });

  rows.sort((a, b) => a.our_reel_no.localeCompare(b.our_reel_no, undefined, { sensitivity: 'base' }));
  return rows;
}

export function getAvailableReelOptions(stockRows = []) {
  return (stockRows || [])
    .filter((r) => Number(r?.available_weight || 0) > 0)
    .map((r) => ({
      value: r.our_reel_no,
      label: `${r.our_reel_no} (Avail: ${Number(r.available_weight).toFixed(2)} kg)`
    }));
}


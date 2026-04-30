export const SCRIPT_URL = import.meta.env.VITE_PO_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwiyz-CktQyrxFP2U-LPHYm8zcECnPWQsK6NRYtt83w2Hzm24xZLL70PjD6yTHDiEhQOw/exec';
export const PO_SHEET_NAME = import.meta.env.VITE_PO_SHEET_NAME || 'PO DETAILS';
export const MRR_FORM_SHEET_NAME = import.meta.env.VITE_MRR_FORM_SHEET_NAME || 'MRR FORM';
export const HELPER_SHEET_NAME = import.meta.env.VITE_HELPER_SHEET_NAME || 'HELPER SHEET';
export const SHEET_WRITE_API_KEY = import.meta.env.VITE_SHEET_WRITE_API_KEY || '';

const n = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};
const round2 = (value) => Number(n(value).toFixed(2));
const firstFilled = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const normalizeOtherMrrEntryType = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text === 'rejection') return 'Rejection';
  if (text === 'purchase' || text === 'purchases') return 'Purchases';
  return String(value || '').trim();
};
const rowHasData = (row = {}) => {
  const skipValues = ['CM', 'KGS', '0', '0.00'];
  const keyFields = ['helper_id', 'other_child_id', 's_no', 'sort_no', 'reel_no', 'supplier_reel_no', 'po_no', 'party_order', 'po_details', 'erp_code', 'reel_details', 'item_name', 'description'];
  for (const key of keyFields) {
    if (String(row?.[key] ?? '').trim() !== '') return true;
  }
  return Object.entries(row).some(([key, value]) => {
    // Skip internal/meta fields and unit fields with default values
    if (['sno', 's_no', 'unit', 'size_unit', 'weight_unit', 'mrr_no', 'ge_no', 'helper_id', 'other_child_id', 'mrr_form_id', 'other_id'].includes(key)) return false;
    const val = String(value ?? '').trim();
    return val !== '' && !skipValues.includes(val);
  });
};
const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VERIFY_TIMEOUT_MS = 45000;
const VERIFY_INTERVAL_MS = 2000;
const SHEET_FETCH_TIMEOUT_MS = 45000;
const STRICT_MRR_FORM_HEADERS = [
  'Mrr form Id',
  'Date',
  'Dt. of Receipt',
  'GE Entry',
  'MRR No',
  'Sup Doc No',
  'Truck Number',
  'Invoice Ttl Weight (Kgs)',
  'Actual MRR Ttl Weight (Kgs)',
  'Required Reel',
  'Rows Added',
  'SUPPLIER',
  'INVOICE BASIC VALUE',
  'MRR BASIC VALUE',
  'E-Way Bill No',
  'E-Way Date',
  'L.R No',
  'Plant Head Approval',
  'Plant Head Approval Timestamp',
  'Accounts Approval Timestamp',
  'Accounts Approval Useremail',
  'MD Approval Timestamp',
  'MD Approval Useremail',
  'Pending Tally Posting Timesyamp',
  'Pending Tally Posting Useremail',
  'Plant Head Approval User Email',
  'Accounts Approval',
  'MD Approval',
  'S.No',
  'Description',
  'HSN',
  'Sort',
  'Party Order',
  'GSM',
  'Size',
  'Unit',
  'Reels',
  'Weight',
  'Unit',
  'Rate',
  'Amount',
  'Insurance',
  'Round Off'
];

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = SHEET_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please check Apps Script URL/deployment and internet.`);
    }
    if (error instanceof TypeError) {
      const target = String(url || '');
      let host = target;
      try {
        host = new URL(target).host || target;
      } catch {
        // Keep original text when URL parsing fails.
      }
      throw new Error(`Could not reach ${host}. Please check your internet/DNS connection and confirm the Google Apps Script web app URL is valid and deployed.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeStrictHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function formatHeaderList(values = [], limit = 12) {
  return values.slice(0, limit).map((v) => `"${v}"`).join(', ');
}

async function validateStrictMrrFormHeaders(spreadsheetId, scriptUrl, mrrSheetName) {
  const payload = await fetchSheetRange(mrrSheetName, spreadsheetId, scriptUrl);
  const rows = Array.isArray(payload?.values) ? payload.values : [];
  const headers = Array.isArray(rows[0]) ? rows[0].map((h) => String(h || '').trim()) : [];
  if (!headers.length) {
    throw new Error(`MRR FORM header validation failed: sheet "${mrrSheetName}" is empty or has no header row.`);
  }

  const actualNorm = headers.map(normalizeStrictHeader);
  const requiredNorm = STRICT_MRR_FORM_HEADERS.map(normalizeStrictHeader);
  const actualCount = actualNorm.reduce((map, h) => {
    map[h] = (map[h] || 0) + 1;
    return map;
  }, {});
  const requiredCount = requiredNorm.reduce((map, h) => {
    map[h] = (map[h] || 0) + 1;
    return map;
  }, {});

  const missingHeaders = [];
  for (const required of STRICT_MRR_FORM_HEADERS) {
    const key = normalizeStrictHeader(required);
    if ((actualCount[key] || 0) >= (requiredCount[key] || 0)) continue;
    if (!missingHeaders.includes(required)) missingHeaders.push(required);
  }
  if (missingHeaders.length) {
    throw new Error(
      `MRR FORM header validation failed. Missing required columns: ${missingHeaders.join(', ')}. ` +
      `Please update "${mrrSheetName}" headers exactly and retry save.`
    );
  }

}

function findMatchingPoRow(row = {}, poRows = []) {
  const poNo = String(row.po_no || row.party_order || '').trim();
  const details = String(row.po_details || '').trim();
  const erpCode = String(row.erp_code || '').trim();
  const reelDetails = String(row.reel_details || row.item_name || row.description || '').trim();
  const gsm = String(row.gsm || '').trim();
  const size = String(row.size || '').trim();
  const bf = String(row.bf || '').trim();

  let matches = poRows;
  [
    poNo ? (po) => po.po_no === poNo : null,
    details ? (po) => po.po_details === details : null,
    erpCode ? (po) => po.erp_code === erpCode : null,
    reelDetails ? (po) => po.reel_details === reelDetails : null,
    gsm ? (po) => po.gsm === gsm : null,
    size ? (po) => po.size === size : null,
    bf ? (po) => po.bf === bf : null
  ].forEach((matcher) => {
    if (!matcher) return;
    const next = matches.filter(matcher);
    if (next.length) matches = next;
  });

  return matches[0] || null;
}

export function buildHelperRows(invoice, packing, poRows = []) {
  const baseDate = firstFilled(packing.date, invoice.date);
  const receiptDate = firstFilled(packing.receipt_date, invoice.receipt_date);
  const supplierDocNo = firstFilled(invoice.invoice_no, packing.challan_no);
  const mrrNumber = firstFilled(packing.mrr_no, invoice.mrr_no);
  const geNumber = firstFilled(packing.ge_no, invoice.ge_no);
  const supplierName = firstFilled(packing.distributor, packing.buyer?.name_address, invoice.bill_to?.name_address);
  const normalizeDocKey = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const normalizedTargetMrr = normalizeDocKey(mrrNumber);
  const normalizedTargetGe = normalizeDocKey(geNumber);
  const isParentSummaryRow = (row = {}) => {
    const desc = String(firstFilled(row.description, row.item_name, row.reel_details) || '').trim().toUpperCase();
    return desc === 'PARENT SUMMARY';
  };
  const rowBelongsToCurrentDoc = (row = {}) => {
    const rowMrr = normalizeDocKey(firstFilled(row.mrr_no, row.mrr_number));
    const rowGe = normalizeDocKey(firstFilled(row.ge_no, row.ge_entry));
    if (rowMrr && normalizedTargetMrr && rowMrr !== normalizedTargetMrr) return false;
    if (rowGe && normalizedTargetGe && rowGe !== normalizedTargetGe) return false;
    return true;
  };
  const buildRowIdentity = (row = {}) => [
    normalizeDocKey(firstFilled(row.s_no, row.sort_no)),
    normalizeDocKey(firstFilled(row.po_no, row.party_order)),
    normalizeDocKey(firstFilled(row.reel_no, row.our_reel_number)),
    normalizeDocKey(row.supplier_reel_no),
    normalizeDocKey(firstFilled(row.reel_details, row.item_name, row.description)),
    normalizeDocKey(row.erp_code),
    normalizeDocKey(row.gsm),
    normalizeDocKey(row.size),
    normalizeDocKey(firstFilled(row.net_wt, row.weight)),
    normalizeDocKey(row.rate)
  ].join('|');

  // Heuristic: Use packing.items if it has meaningful data, otherwise invoice.goods
  const packingRows = Array.isArray(packing.items) ? packing.items.filter((row) =>
    rowHasData(row) && rowBelongsToCurrentDoc(row) && !isParentSummaryRow(row)
  ) : [];
  const invoiceRows = Array.isArray(invoice.goods) ? invoice.goods.filter((row) =>
    rowHasData(row) && rowBelongsToCurrentDoc(row) && !isParentSummaryRow(row)
  ) : [];
  
  const sourceItems = packingRows.length > 0 ? packingRows : invoiceRows;
  const seenIdentity = new Set();
  const dedupedItems = sourceItems.filter((row) => {
    const identity = buildRowIdentity(row);
    if (identity && seenIdentity.has(identity)) return false;
    if (identity) seenIdentity.add(identity);
    return true;
  });

  return dedupedItems.map((row, index) => {
      const poNo = row.po_no || row.party_order;
      const po = findMatchingPoRow({ ...row, po_no: poNo }, poRows);
      const weight = round2(row.net_wt || row.weight);
      const rate = round2(row.rate);
      return {
        helper_id: firstFilled(row.helper_id, row.other_child_id),
        mrr_form_id: firstFilled(row.mrr_form_id, invoice.mrr_form_id, packing.mrr_form_id),
        s_no: firstFilled(row.s_no, row.sort_no, index + 1),
        mrr_number: firstFilled(row.mrr_no, mrrNumber),
        po_details: firstFilled(row.po_details, po?.po_details),
        po_no: firstFilled(poNo, po?.po_no),
        party_order: firstFilled(row.party_order, row.po_no, poNo, po?.po_no),
        po_date: firstFilled(po?.date, packing.order_date, invoice.date),
        supplier: firstFilled(supplierName, row.supplier, po?.supplier),
        our_reel_number: firstFilled(row.reel_no, row.reels),
        supplier_reel_no: firstFilled(row.supplier_reel_no),
        reel_details: firstFilled(row.reel_details, row.item_name, row.description, po?.reel_details),
        erp_code: firstFilled(row.erp_code, po?.erp_code),
        size: firstFilled(row.size, po?.size),
        gsm: firstFilled(row.gsm, po?.gsm),
        bf: firstFilled(row.bf, po?.bf),
        weight,
        rate,
        value: round2(weight * rate),
        po_rate: round2(firstFilled(row.po_rate, po?.rate)),
        date: baseDate,
        dt_of_receipts: receiptDate,
        sup_doc_no: supplierDocNo
      };
    });
}

export function buildMrrFormRecord(invoice, packing, poRows = []) {
  const helperRows = buildHelperRows(invoice, packing, poRows);
  const grossAmount = round2(invoice.totals?.gross_amount || invoice.goods?.reduce((sum, row) => sum + (n(row.amount) || n(row.weight) * n(row.rate)), 0));
  const taxableAmount = round2(invoice.totals?.taxable_gst || (grossAmount + n(invoice.totals?.insurance)));
  const insurance = firstFilled(invoice.totals?.insurance, '');
  const roundOff = firstFilled(invoice.totals?.round_off, '');
  const invoiceWeight = round2(invoice.goods?.reduce((sum, row) => sum + n(row.weight), 0));
  const invoiceReels = round2(invoice.goods?.reduce((sum, row) => sum + n(row.reels), 0));
  const helperValue = round2(helperRows.reduce((sum, row) => sum + n(row.value), 0));
  const helperWeight = round2(helperRows.reduce((sum, row) => sum + n(row.weight), 0));
  const supplierName = firstFilled(
    invoice.bill_to?.name_address,
    packing.buyer?.name_address,
    packing.distributor,
    poRows.find((row) => String(row.po_no || '').trim())?.supplier
  );

  return {
    ge_no: firstFilled(invoice.ge_no, packing.ge_no),
    date: firstFilled(invoice.date, packing.date),
    mrr_number: firstFilled(invoice.mrr_no, packing.mrr_no),
    mrr_entry_type: normalizeOtherMrrEntryType(firstFilled(invoice.mrr_entry_type)),
    dt_of_receipt: firstFilled(invoice.receipt_date, packing.receipt_date),
    sup_doc_no: firstFilled(invoice.invoice_no, packing.challan_no),
    truck_number: firstFilled(invoice.vehicle_no, packing.truck_no),
    invoice_ttl_weight_kgs: invoiceWeight,
    actual_mrr_ttl_weight_kgs: round2(firstFilled(invoice.actual_mrr_weight, packing.actual_total, packing.total_weight, helperWeight)),
    required_reel: firstFilled(packing.total_reels, helperRows.length, invoiceReels || ''),
    rows_added: helperRows.length,
    supplier: supplierName,
    invoice_basic_value: taxableAmount,
    mrr_basic_value: helperValue,
    insurance: insurance === '' ? '' : round2(insurance),
    round_off: roundOff === '' ? '' : round2(roundOff)
  };
}

export async function fetchSheetRange(sheetName, spreadsheetId, scriptUrl) {
  const targetScriptUrl = scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL. Set VITE_PO_SCRIPT_URL in .env or provide a firm-specific URL.');
  }
  const urlParams = new URLSearchParams({
    sheet: sheetName || PO_SHEET_NAME,
    action: 'get_rows'
  });
  if (spreadsheetId) urlParams.set('spreadsheetId', spreadsheetId);

  const url = `${targetScriptUrl}?${urlParams.toString()}`;
  const { response, payload } = await fetchJsonWithTimeout(url);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || payload?.message || 'Could not load PO details from Google Apps Script.');
  }
  return payload;
}

export async function fetchSheetRangeWithParams(params = {}, scriptUrl) {
  const targetScriptUrl = scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL. Set VITE_PO_SCRIPT_URL in .env or provide a firm-specific URL.');
  }

  const url = new URL(targetScriptUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const { response, payload } = await fetchJsonWithTimeout(url.toString());
  if (!response.ok || payload?.ok === false) {
    if (params.action === 'verify' || params.action === 'verify_ge') return null;
    throw new Error(payload?.error || payload?.message || 'Error: Could not verify Google Sheets write.');
  }
  return payload;
}

export async function fetchLatestMrrGe(sheetName, spreadsheetId, scriptUrl, prefix, geSheetName = 'GE ENTRY') {
  const targetScriptUrl = scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL. Set VITE_PO_SCRIPT_URL in .env or provide a firm-specific URL.');
  }

  const urlParams = new URLSearchParams({
    action: 'get_latest_ids',
    sheet: sheetName,
    mrrSheet: sheetName,
    geSheet: geSheetName
  });
  if (spreadsheetId) urlParams.set('spreadsheetId', spreadsheetId);
  if (prefix) urlParams.set('prefix', prefix);

  const url = `${targetScriptUrl}?${urlParams.toString()}`;
  const { response, payload } = await fetchJsonWithTimeout(url);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || payload?.message || 'Could not fetch latest MRR/GE IDs.');
  }
  return {
    mrr: Number(payload.mrr || 0),
    ge: Number(payload.ge || 0)
  };
}

export async function fetchPendingGeEntries(mrrSheetName, spreadsheetId, scriptUrl, helperSheetName) {
  const targetScriptUrl = scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL.');
  }

  const urlParams = new URLSearchParams({
    action: 'get_pending_ge',
    mrrSheet: mrrSheetName
  });
  if (helperSheetName) urlParams.set('helperSheet', helperSheetName);
  if (spreadsheetId) urlParams.set('spreadsheetId', spreadsheetId);

  const url = `${targetScriptUrl}?${urlParams.toString()}`;
  const { response, payload } = await fetchJsonWithTimeout(url);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || payload?.message || 'Could not fetch pending Gate Entries.');
  }
  return payload.values || [];
}

export async function authenticateUser(loginId, password, options = {}) {
  const targetScriptUrl = options.scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL.');
  }
  const payload = await fetchSheetRangeWithParams({
    action: 'authenticate_user',
    login_id: loginId,
    password,
    spreadsheetId: options.spreadsheetId
  }, targetScriptUrl);
  if (!payload?.ok || !payload?.user) {
    throw new Error(payload?.error || 'Invalid user ID or password.');
  }
  return payload.user;
}

export async function approvePendingStage(params = {}) {
  const targetScriptUrl = params.scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL.');
  }
  const payload = await fetchSheetRangeWithParams({
    action: 'approve_pending_stage',
    decision: params.decision,
    stage: params.stage,
    mrr_number: params.mrrNumber,
    user_email: params.userEmail,
    plant_head_remark: params.plantHeadRemark,
    accounts_remark: params.accountsRemark,
    md_approval_remark: params.mdApprovalRemark,
    debit_note: params.debitNote,
    debit_note_date: params.debitNoteDate,
    debit_note_amount: params.debitNoteAmount,
    mrrSheet: params.mrrSheetName,
    helperSheet: params.helperSheetName,
    spreadsheetId: params.spreadsheetId
  }, targetScriptUrl);
  if (!payload?.ok) {
    throw new Error(payload?.error || 'Could not approve pending stage.');
  }
  return payload;
}

/**
 * Fetch a list of unique suppliers from a PO sheet.
 * Defaults to `PO DETAILS` for backward compatibility.
 */
export async function fetchUniqueSuppliers(firm, sheetName = 'PO DETAILS') {
  if (!firm?.scriptUrl) throw new Error(`Script URL missing for firm ${firm?.name}`);
  const targetSheet = String(sheetName || 'PO DETAILS').trim() || 'PO DETAILS';
  const url = `${firm.scriptUrl}?action=get_suppliers&sheet=${encodeURIComponent(targetSheet)}&spreadsheetId=${firm.spreadsheetId || ''}`;
  const { response: res, payload: data } = await fetchJsonWithTimeout(url);
  if (!data?.ok) throw new Error(data?.error || `Failed to fetch suppliers for ${firm.name}.`);
  return data.values || [];
}


function submitPayloadWithForm(payload) {
  return new Promise((resolve, reject) => {
    try {
      const iframeName = `sheet-save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payload.scriptUrl || SCRIPT_URL;
      form.target = iframeName;
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);
      form.appendChild(input);
      const transport = document.createElement('input');
      transport.type = 'hidden';
      transport.name = 'transport';
      transport.value = 'iframe_form';
      form.appendChild(transport);

      const cleanup = () => {
        setTimeout(() => {
          iframe.remove();
          form.remove();
        }, 500);
      };
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };

      iframe.addEventListener('load', () => {
        finish(resolve);
      }, { once: true });

      iframe.addEventListener('error', () => {
        finish(reject, new Error('Could not submit data to Google Sheets.'));
      }, { once: true });

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
      // Give Apps Script enough time to acquire lock and finish writes.
      setTimeout(() => {
        finish(reject, new Error('Save request timed out. Please retry.'));
      }, 45000);
    } catch (error) {
      reject(error);
    }
  });
}

async function submitPayloadNoCors(payload) {
  const targetScriptUrl = payload.scriptUrl || SCRIPT_URL;
  const formBody = new URLSearchParams();
  formBody.set('payload', JSON.stringify(payload));
  formBody.set('transport', 'fetch_no_cors');

  await fetch(targetScriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formBody.toString()
  });

  return { ok: true, transport: 'fetch_no_cors' };
}

function isGoogleAppsScriptUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'script.google.com' || host.endsWith('.script.google.com');
  } catch {
    return false;
  }
}

async function submitPayload(payload) {
  const targetScriptUrl = payload.scriptUrl || SCRIPT_URL;
  if (isGoogleAppsScriptUrl(targetScriptUrl)) {
    try {
      return await submitPayloadNoCors(payload);
    } catch (noCorsError) {
      await submitPayloadWithForm(payload);
      return { ok: true, transport: 'form_fallback' };
    }
  }
  try {
    const { response, payload: resPayload } = await fetchJsonWithTimeout(targetScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, SHEET_FETCH_TIMEOUT_MS);
    if (!response.ok || resPayload?.ok === false) {
      const backendError = new Error(resPayload?.error || resPayload?.message || `Backend save failed (${response.status}).`);
      backendError.isBackendError = true;
      throw backendError;
    }
    return resPayload || { ok: true };
  } catch (error) {
    if (error?.isBackendError) throw error;
    // Fallback for environments where direct POST response is blocked.
    await submitPayloadWithForm(payload);
    return { ok: true, transport: 'form_fallback' };
  }
}

function getMrrNumber(invoice, packing) {
  return firstFilled(invoice?.mrr_no, packing?.mrr_no);
}

async function verifyWrite(action, invoice, packing, spreadsheetId, scriptUrl, options = {}) {
  const mrrSheetName = options.mrrSheetName || MRR_FORM_SHEET_NAME;
  const helperSheetName = options.helperSheetName || HELPER_SHEET_NAME;
  const mrrNumber = getMrrNumber(invoice, packing);
  const helperSheetCandidates = [helperSheetName].filter(Boolean);
  const expectedHelperRowsCount = Number(options.expectedHelperRowsCount || 0);
  if (action === 'save_ge_entry') {
    const geEntry = options.geEntry || {};
    const startedAt = Date.now();
    while (Date.now() - startedAt < VERIFY_TIMEOUT_MS) {
      const payload = await fetchSheetRangeWithParams({
        action: 'verify_ge',
        invoice_no: geEntry.invoice_no,
        supplier: geEntry.supplier,
        spreadsheetId
      }, scriptUrl);
      
      if (payload?.ge_no) {
        return { ok: true, ge_no: payload.ge_no, mrr_no: payload.mrr_no || geEntry.mrr_no || '' };
      }

      const pendingPayload = await fetchSheetRangeWithParams({
        action: 'get_pending_ge',
        mrrSheet: options.mrrSheetName || MRR_FORM_SHEET_NAME,
        spreadsheetId
      }, scriptUrl);

      const pendingMatch = (pendingPayload?.values || []).find((item) => {
        if (item?.pending_stage !== 'pending_mrr') return false;
        const sameInvoice = normalizeText(item.invoice_no) === normalizeText(geEntry.invoice_no);
        const sameSupplier = !normalizeText(geEntry.supplier) || normalizeText(item.supplier).includes(normalizeText(geEntry.supplier)) || normalizeText(geEntry.supplier).includes(normalizeText(item.supplier));
        const sameTruck = !normalizeText(geEntry.truck_no) || normalizeText(item.truck_no) === normalizeText(geEntry.truck_no);
        return sameInvoice && sameSupplier && sameTruck;
      });

      if (pendingMatch) {
        return {
          ok: true,
          ge_no: pendingMatch.ge_no || geEntry.ge_no || '',
          mrr_no: pendingMatch.mrr_no || pendingMatch.mrr_number || geEntry.mrr_no || ''
        };
      }
      await wait(VERIFY_INTERVAL_MS);
    }
    return {
      ok: true,
      ge_no: geEntry.ge_no || '',
      mrr_no: geEntry.mrr_no || '',
      pendingVerification: true,
      message: 'Gate Entry save request was sent, but verification timed out. Please confirm it in the Pending MRR list.'
    };
  }

  if (!mrrNumber) {
    return {
      ok: true,
      message: 'Saved request sent. Verification skipped because MRR Number is blank.'
    };
  }

  const startedAt = Date.now();
  let latestMrrCount = 0;
  let latestHelperCount = 0;
  let latestHelperSheet = helperSheetName;
  while (Date.now() - startedAt < VERIFY_TIMEOUT_MS) {
    if (action === 'save_invoice') {
      const payload = await fetchSheetRangeWithParams({
        sheet: mrrSheetName,
        mrr_number: mrrNumber,
        spreadsheetId
      }, scriptUrl);

      if (Number(payload?.count || 0) > 0) {
        return {
          ok: true,
          mrrForm: {
            updatedRows: Number(payload.count || 0),
            insertedRows: 0
          }
        };
      }
    } else {
      const helperPayloads = await Promise.all(helperSheetCandidates.map((sheet) => fetchSheetRangeWithParams({
        sheet,
        mrr_number: mrrNumber,
        spreadsheetId
      }, scriptUrl).catch(() => null)));
      const matchedHelper = helperPayloads.find((payload) => Number(payload?.count || 0) > 0);
      if (matchedHelper) {
        latestHelperCount = Number(matchedHelper?.count || 0);
        const idx = helperPayloads.indexOf(matchedHelper);
        latestHelperSheet = helperSheetCandidates[idx] || helperSheetName;
      }

      const mrrPayload = await fetchSheetRangeWithParams({
        sheet: mrrSheetName,
        mrr_number: mrrNumber,
        spreadsheetId
      }, scriptUrl).catch(() => null);
      latestMrrCount = Math.max(latestMrrCount, Number(mrrPayload?.count || 0));

      const hasMrrRow = latestMrrCount > 0;
      const helperRequirementMet = expectedHelperRowsCount > 0
        ? latestHelperCount > 0
        : true;

      if (hasMrrRow && helperRequirementMet) {
        return {
          ok: true,
          helperSheet: {
            deletedRows: 0,
            insertedRows: latestHelperCount,
            sheet: latestHelperSheet
          },
          mrrForm: {
            updatedRows: latestMrrCount,
            insertedRows: 0
          }
        };
      }
    }

    await wait(VERIFY_INTERVAL_MS);
  }

  if (action === 'save_invoice') {
    throw new Error(`Save request was sent, but no MRR FORM row was found for MRR Number ${mrrNumber}. Check the Apps Script deployment, web app permissions, and sheet headers.`);
  }

  // Strict final fallback: allow zero helper rows only when payload had no helper rows to write.
  if (action === 'save_packing' && expectedHelperRowsCount === 0 && latestMrrCount > 0) {
    return {
      ok: true,
      helperSheet: {
        deletedRows: 0,
        insertedRows: 0,
        sheet: latestHelperSheet
      },
      mrrForm: {
        updatedRows: latestMrrCount,
        insertedRows: 0
      }
    };
  }

  throw new Error(
    `Verification failed for MRR ${mrrNumber}. ` +
    `${mrrSheetName} rows found: ${latestMrrCount}. ` +
    `Helper rows found: ${latestHelperCount} in ${helperSheetCandidates.join(' / ')}. ` +
    `Expected helper rows: ${expectedHelperRowsCount}. ` +
    `Check Apps Script deployment, write permissions, and sheet header names.`
  );
}

async function fetchSaveDiagnostics(spreadsheetId, scriptUrl, options = {}, mrrNumber = '') {
  try {
    const payload = await fetchSheetRangeWithParams({
      action: 'diagnose_save',
      spreadsheetId,
      mrrSheet: options.mrrSheetName || MRR_FORM_SHEET_NAME,
      helperSheet: options.helperSheetName || HELPER_SHEET_NAME,
      mrr_number: mrrNumber || ''
    }, scriptUrl);
    return payload || null;
  } catch (error) {
    return {
      ok: false,
      error: error?.message || String(error)
    };
  }
}

function canAcceptSaveFromDiagnostics(action, diagnostics, expectedHelperRowsCount = 0) {
  const mrrCount = Number(diagnostics?.countsForMrr?.mrr || 0);
  const helperCount = Number(diagnostics?.countsForMrr?.helper || 0);
  if (action === 'save_invoice') {
    return mrrCount > 0;
  }
  if (action === 'save_packing') {
    if (mrrCount <= 0) return false;
    if (expectedHelperRowsCount > 0) return helperCount > 0;
    return true;
  }
  return false;
}

async function postSheetAction(action, invoice, packing, poRows = [], options = {}) {
  if (!SCRIPT_URL) {
    throw new Error('Missing PO script URL. Set VITE_PO_SCRIPT_URL in .env.');
  }

  const requestId = `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mrrSheetName = options.mrrSheetName || MRR_FORM_SHEET_NAME;
  const helperSheetName = options.helperSheetName || HELPER_SHEET_NAME;
  const targetScriptUrl = options.scriptUrl || SCRIPT_URL;
  const expectedHelperRowsCount = action === 'save_packing'
    ? buildHelperRows(invoice, packing, poRows).length
    : 0;
  const shouldVerify = options.verifyWrite !== false;
  const shouldValidateMrrHeaders = options.enforceStrictMrrHeaders !== false;

  if (shouldValidateMrrHeaders && action !== 'save_ge_entry') {
    await validateStrictMrrFormHeaders(options.spreadsheetId, targetScriptUrl, mrrSheetName);
  }

  console.log('[SheetSync] Save request start', {
    requestId,
    action,
    mrrNumber: getMrrNumber(invoice, packing),
    geNo: firstFilled(invoice?.ge_no, packing?.ge_no, options?.geEntry?.ge_no),
    spreadsheetId: options.spreadsheetId || '',
    mrrSheetName,
    helperSheetName,
    expectedHelperRowsCount,
    scriptUrl: targetScriptUrl
  });

  const submitResult = await submitPayload({
    action,
    apiKey: SHEET_WRITE_API_KEY || undefined,
    spreadsheetId: options.spreadsheetId,
    scriptUrl: options.scriptUrl,
    invoice,
    packing,
    poRows,
    geEntry: options.geEntry,
    requestId,
    options: {
      poSheetName: options.poSheetName || PO_SHEET_NAME,
      mrrSheetName,
      helperSheetName,
      mode: options.mode || ''
    }
  });

  console.log('[SheetSync] Save submit ack', {
    requestId,
    action,
    transport: submitResult?.transport || 'fetch',
    backendRequestId: submitResult?.requestId || ''
  });

  if (!shouldVerify) {
    return {
      ...(submitResult || {}),
      ok: true,
      requestId,
      verificationSkipped: true
    };
  }

  let verificationResult;
  try {
    verificationResult = await verifyWrite(
      action,
      invoice,
      packing,
      options.spreadsheetId,
      targetScriptUrl,
      {
        mrrSheetName,
        helperSheetName,
        geEntry: options.geEntry,
        expectedHelperRowsCount
      }
    );
  } catch (verifyError) {
    const diagnostics = await fetchSaveDiagnostics(
      options.spreadsheetId,
      targetScriptUrl,
      { mrrSheetName, helperSheetName },
      getMrrNumber(invoice, packing)
    );
    console.error('[SheetSync] Verification failed diagnostics', {
      requestId,
      action,
      error: verifyError?.message || String(verifyError),
      diagnostics
    });
    if (canAcceptSaveFromDiagnostics(action, diagnostics, expectedHelperRowsCount)) {
      const warning = `Save completed, but verification timed out. (Detected mrrCount=${Number(diagnostics?.countsForMrr?.mrr || 0)}, helperCount=${Number(diagnostics?.countsForMrr?.helper || 0)})`;
      return {
        ...(submitResult || {}),
        ok: true,
        requestId,
        verificationSkipped: false,
        verificationRecovered: true,
        warning,
        mrrForm: {
          updatedRows: Number(diagnostics?.countsForMrr?.mrr || 0),
          insertedRows: 0
        },
        helperSheet: {
          insertedRows: Number(diagnostics?.countsForMrr?.helper || 0),
          deletedRows: 0,
          sheet: helperSheetName
        }
      };
    }
    const compactDiag = diagnostics
      ? ` | Diagnose -> mrrExists:${!!diagnostics?.mrrSheet?.exists}, helperExists:${!!diagnostics?.helperSheet?.exists}, mrrKey:${!!diagnostics?.mrrSheet?.keyColumnFound}, helperKey:${!!diagnostics?.helperSheet?.keyColumnFound}, mrrCount:${Number(diagnostics?.countsForMrr?.mrr || 0)}, helperCount:${Number(diagnostics?.countsForMrr?.helper || 0)}, missingMRR:[${(diagnostics?.missing?.mrrRequired || []).join(', ')}], missingHELPER:[${(diagnostics?.missing?.helperRequired || []).join(', ')}]`
      : '';
    throw new Error(`${verifyError?.message || 'Verification failed.'}${compactDiag}`);
  }

  console.log('[SheetSync] Save verification complete', {
    requestId,
    action,
    mrrVerifiedRows: Number(verificationResult?.mrrForm?.updatedRows || 0),
    helperVerifiedRows: Number(verificationResult?.helperSheet?.insertedRows || 0),
    verificationPending: !!verificationResult?.pendingVerification
  });

  return {
    ...(submitResult || {}),
    ...(verificationResult || {}),
    ok: true,
    requestId,
    verificationSkipped: false
  };
}

export function saveInvoiceToSheets(invoice, packing, poRows = [], options = {}) {
  return postSheetAction('save_invoice', invoice, packing, poRows, options);
}

export function savePackingToSheets(invoice, packing, poRows = [], options = {}) {
  return postSheetAction('save_packing', invoice, packing, poRows, options);
}

export async function saveGeEntryToSheets(geEntry, options = {}) {
  const result = await postSheetAction('save_ge_entry', {}, {}, [], {
    ...options,
    geEntry
  });
  return result;
}

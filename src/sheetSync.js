export const SCRIPT_URL = import.meta.env.VITE_PO_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwiyz-CktQyrxFP2U-LPHYm8zcECnPWQsK6NRYtt83w2Hzm24xZLL70PjD6yTHDiEhQOw/exec';
export const PO_SHEET_NAME = import.meta.env.VITE_PO_SHEET_NAME || 'PO DETAILS';
export const MRR_FORM_SHEET_NAME = import.meta.env.VITE_MRR_FORM_SHEET_NAME || 'MRR FORM';
export const HELPER_SHEET_NAME = import.meta.env.VITE_HELPER_SHEET_NAME || 'HELPER SHEET';
export const SHEET_WRITE_API_KEY = import.meta.env.VITE_SHEET_WRITE_API_KEY || '';

const n = (value) => Number(value) || 0;
const round2 = (value) => Number(n(value).toFixed(2));
const firstFilled = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const rowHasData = (row = {}) => {
  const skipValues = ['CM', 'KGS', '0', '0.00'];
  return Object.entries(row).some(([key, value]) => {
    // Skip internal/meta fields and unit fields with default values
    if (['sno', 's_no', 'unit', 'size_unit', 'weight_unit', 'mrr_no', 'ge_no'].includes(key)) return false;
    const val = String(value ?? '').trim();
    return val !== '' && !skipValues.includes(val);
  });
};
const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VERIFY_TIMEOUT_MS = 45000;
const VERIFY_INTERVAL_MS = 2000;
const SHEET_FETCH_TIMEOUT_MS = 20000;

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
    throw error;
  } finally {
    clearTimeout(timer);
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
  const supplierName = firstFilled(packing.distributor, packing.buyer?.name_address, invoice.bill_to?.name_address);

  // Heuristic: Use packing.items if it has meaningful data, otherwise invoice.goods
  const packingRows = Array.isArray(packing.items) ? packing.items.filter(rowHasData) : [];
  const invoiceRows = Array.isArray(invoice.goods) ? invoice.goods.filter(rowHasData) : [];
  
  const sourceItems = packingRows.length > 0 ? packingRows : invoiceRows;

  return sourceItems.map((row, index) => {
      const poNo = row.po_no || row.party_order;
      const po = findMatchingPoRow({ ...row, po_no: poNo }, poRows);
      const weight = round2(row.net_wt || row.weight);
      const rate = round2(row.rate);
      return {
        s_no: index + 1,
        mrr_number: firstFilled(row.mrr_no, mrrNumber),
        po_details: firstFilled(row.po_details, po?.po_details),
        po_no: firstFilled(poNo, po?.po_no),
        po_date: firstFilled(po?.date, packing.order_date, invoice.date),
        supplier: firstFilled(row.supplier, po?.supplier, supplierName),
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
  const invoiceWeight = round2(invoice.goods?.reduce((sum, row) => sum + n(row.weight), 0));
  const invoiceReels = round2(invoice.goods?.reduce((sum, row) => sum + n(row.reels), 0));
  const helperValue = round2(helperRows.reduce((sum, row) => sum + n(row.value), 0));
  const helperWeight = round2(helperRows.reduce((sum, row) => sum + n(row.weight), 0));
  const supplierName = firstFilled(
    poRows.find((row) => String(row.po_no || '').trim())?.supplier,
    packing.distributor,
    packing.buyer?.name_address,
    invoice.bill_to?.name_address
  );

  return {
    ge_no: firstFilled(invoice.ge_no, packing.ge_no),
    date: firstFilled(invoice.date, packing.date),
    mrr_number: firstFilled(invoice.mrr_no, packing.mrr_no),
    dt_of_receipt: firstFilled(invoice.receipt_date, packing.receipt_date),
    sup_doc_no: firstFilled(invoice.invoice_no, packing.challan_no),
    truck_number: firstFilled(invoice.vehicle_no, packing.truck_no),
    invoice_ttl_weight_kgs: invoiceWeight,
    actual_mrr_ttl_weight_kgs: round2(firstFilled(invoice.actual_weight, packing.actual_total, packing.total_weight, helperWeight)),
    required_reel: firstFilled(invoiceReels || '', packing.total_reels, helperRows.length),
    rows_added: helperRows.length,
    supplier: supplierName,
    invoice_basic_value: taxableAmount,
    mrr_basic_value: helperValue
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

export async function fetchPendingGeEntries(mrrSheetName, spreadsheetId, scriptUrl) {
  const targetScriptUrl = scriptUrl || SCRIPT_URL;
  if (!targetScriptUrl) {
    throw new Error('Missing script URL.');
  }

  const urlParams = new URLSearchParams({
    action: 'get_pending_ge',
    mrrSheet: mrrSheetName
  });
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
    stage: params.stage,
    mrr_number: params.mrrNumber,
    user_email: params.userEmail,
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
 * Fetch a list of unique suppliers from the PO DETAILS sheet.
 */
export async function fetchUniqueSuppliers(firm) {
  if (!firm?.scriptUrl) throw new Error(`Script URL missing for firm ${firm?.name}`);
  const url = `${firm.scriptUrl}?action=get_suppliers&sheet=PO DETAILS&spreadsheetId=${firm.spreadsheetId || ''}`;
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

      const cleanup = () => {
        setTimeout(() => {
          iframe.remove();
          form.remove();
        }, 500);
      };

      iframe.addEventListener('load', () => {
        cleanup();
        resolve();
      }, { once: true });

      iframe.addEventListener('error', () => {
        cleanup();
        reject(new Error('Could not submit data to Google Sheets.'));
      }, { once: true });

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        cleanup();
        resolve();
      }, 2500);
    } catch (error) {
      reject(error);
    }
  });
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
    await submitPayloadWithForm(payload);
    return { ok: true, transport: 'form' };
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
  const helperSheetCandidates = Array.from(new Set([
    helperSheetName,
    helperSheetName === 'HELPER SHEET' ? 'OTHER ITEMS' : 'HELPER SHEET'
  ].filter(Boolean)));
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

      if (payload?.count) {
        return {
          ok: true,
          mrrForm: {
            updatedRows: payload.count,
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

      if (matchedHelper || !Array.isArray(packing?.items) || !packing.items.length) {
        return {
          ok: true,
          helperSheet: {
            deletedRows: 0,
            insertedRows: Number(matchedHelper?.count || 0),
            sheet: latestHelperSheet
          },
          mrrForm: {
            updatedRows: latestMrrCount || 1,
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
    `MRR FORM rows found: ${latestMrrCount}. ` +
    `Helper rows found: ${latestHelperCount} in ${helperSheetCandidates.join(' / ')}. ` +
    `Expected helper rows: ${expectedHelperRowsCount}. ` +
    `Check Apps Script deployment, write permissions, and sheet header names.`
  );
}

async function postSheetAction(action, invoice, packing, poRows = [], options = {}) {
  if (!SCRIPT_URL) {
    throw new Error('Missing PO script URL. Set VITE_PO_SCRIPT_URL in .env.');
  }

  const submitResult = await submitPayload({
    action,
    apiKey: SHEET_WRITE_API_KEY || undefined,
    spreadsheetId: options.spreadsheetId,
    scriptUrl: options.scriptUrl,
    invoice,
    packing,
    poRows,
    geEntry: options.geEntry,
    options: {
      poSheetName: options.poSheetName || PO_SHEET_NAME,
      mrrSheetName: options.mrrSheetName || MRR_FORM_SHEET_NAME,
      helperSheetName: options.helperSheetName || HELPER_SHEET_NAME
    }
  });

  // Write-only flow: no post-save verification.
  return {
    ...(submitResult || {}),
    ok: true,
    verificationSkipped: true
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

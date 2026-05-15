const REQUEST_TIMEOUT_MS = Math.max(15000, Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 120000));
const DEFAULT_CACHE_TTL_MS = Math.max(5000, Number(import.meta.env.VITE_DATA_CACHE_TTL_MS || 25000));
const getCache = new Map();

function cacheNow() {
  return Date.now();
}

function cacheGet(key) {
  const entry = getCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= cacheNow()) {
    getCache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key, entry) {
  getCache.set(key, entry);
}

function invalidateCacheWhere(predicate) {
  Array.from(getCache.keys()).forEach((key) => {
    try {
      if (predicate(key)) getCache.delete(key);
    } catch {
      // ignore
    }
  });
}

export const HELPER_SHEET_NAME = 'HELPER SHEET';
export const PO_SHEET_NAME = 'PO DETAILS';
export const MRR_FORM_SHEET_NAME = 'MRR FORM';
export const GE_SHEET_NAME = 'GE ENTRY';

const DEFAULT_BACKEND_URL = String(import.meta.env.VITE_HOSTINGER_API_URL || '').trim();

function normalizeBackendUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const resolved = typeof window !== 'undefined'
      ? new URL(raw, window.location.origin)
      : new URL(raw);
    resolved.pathname = resolved.pathname.replace(/\/{2,}/g, '/');
    return resolved.toString();
  } catch {
    return raw.replace(/([^:]\/)\/+/g, '$1');
  }
}

function getBackendUrl(source) {
  if (typeof source === 'string') {
    const candidate = String(source || '').trim() || DEFAULT_BACKEND_URL;
    if (candidate) return normalizeBackendUrl(candidate);
    if (typeof window !== 'undefined' && window.location?.origin) {
      return normalizeBackendUrl(`${window.location.origin}/api/index.php`);
    }
    return '';
  }
  const resolved = String(
    source?.backendUrl ||
    source?.scriptUrl ||
    source?.apiUrl ||
    DEFAULT_BACKEND_URL
  ).trim();
  if (resolved) return normalizeBackendUrl(resolved);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBackendUrl(`${window.location.origin}/api/index.php`);
  }
  return '';
}

function getFirmKey(source) {
  if (typeof source === 'string') {
    return String(source || '').trim();
  }
  return String(
    source?.firmKey ||
    source?.spreadsheetId ||
    source?.firm_id ||
    source?.id ||
    'lnki'
  ).trim() || 'lnki';
}

function ensureBackendUrl(source) {
  const backendUrl = getBackendUrl(source);
  if (!backendUrl) {
    throw new Error('Missing backend URL. Set VITE_HOSTINGER_API_URL or deploy /api/index.php on the same domain.');
  }
  return backendUrl;
}

function withTimeout(ms = REQUEST_TIMEOUT_MS) {
  const timeoutMs = Number(ms);
  const effectiveMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveMs);
  return {
    signal: controller.signal,
    timeoutMs: effectiveMs,
    clear: () => clearTimeout(timer)
  };
}

async function fetchJson(url, options = {}) {
  const { signal, clear, timeoutMs } = withTimeout(options.timeoutMs);
  try {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        signal,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(options.headers || {})
        }
      });
    } catch (err) {
      if (err && (err.name === 'AbortError' || /aborted/i.test(String(err.message || '')))) {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`);
      }
      throw err;
    }
    const text = await response.text();
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Request failed with status ${response.status}.`);
    }
    if (!payload || typeof payload !== 'object') {
      const preview = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
      const hint = contentType.includes('text/html')
        ? ' (HTML response - backend URL wrong, forbidden, or not deployed)'
        : '';
      throw new Error(
        preview
          ? `Backend returned invalid JSON (status ${response.status}${hint}). Response preview: ${preview}`
          : `Backend returned an empty or invalid JSON response (status ${response.status}${hint}).`
      );
    }
    if (payload?.ok === false) {
      throw new Error(payload?.error || payload?.message || 'Backend request failed.');
    }
    return payload;
  } finally {
    clear();
  }
}

async function fetchJsonCached(url, options = {}) {
  const ttlMs = Number.isFinite(Number(options.ttlMs)) ? Number(options.ttlMs) : DEFAULT_CACHE_TTL_MS;
  const key = `GET:${url}`;
  const cached = cacheGet(key);
  if (cached?.value) return cached.value;
  if (cached?.promise) return cached.promise;

  const promise = fetchJson(url, options)
    .then((value) => {
      cacheSet(key, { value, expiresAt: cacheNow() + ttlMs });
      return value;
    })
    .catch((err) => {
      getCache.delete(key);
      throw err;
    });

  cacheSet(key, { promise, expiresAt: cacheNow() + ttlMs });
  return promise;
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    query.set(key, text);
  });
  return query.toString();
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '_');
}

function rowsToObjects(values = []) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return [];
  const headers = values[0].map(normalizeHeader);
  return values.slice(1).map((row = []) => {
    const obj = {};
    headers.forEach((header, index) => {
      if (!header) return;
      obj[header] = row[index] ?? '';
    });
    return obj;
  });
}

function toNumericText(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const num = Number(text);
  return Number.isFinite(num) ? String(num) : text;
}

function getSupplierName(invoice = {}, packing = {}) {
  return String(
    invoice?.bill_to?.name_address ||
    packing?.buyer?.name_address ||
    invoice?.supplier ||
    packing?.supplier ||
    ''
  ).trim();
}

function buildMrrFormRecord(invoice = {}, packing = {}, options = {}) {
  const goods = Array.isArray(invoice?.goods) ? invoice.goods : [];
  const packingItems = Array.isArray(packing?.items) ? packing.items : [];
  const supplier = getSupplierName(invoice, packing);
  return {
    sheet_name: options.mrrSheetName || MRR_FORM_SHEET_NAME,
    mrr_form_id: String(invoice?.mrr_form_id || `MRR-${invoice?.mrr_no || packing?.mrr_no || ''}`).trim(),
    ge_no: String(invoice?.ge_no || packing?.ge_no || '').trim(),
    date: String(invoice?.date || packing?.date || '').trim(),
    mrr_number: String(invoice?.mrr_no || packing?.mrr_no || '').trim(),
    dt_of_receipt: String(invoice?.receipt_date || packing?.receipt_date || '').trim(),
    sup_doc_no: String(invoice?.invoice_no || packing?.challan_no || '').trim(),
    truck_number: String(invoice?.vehicle_no || packing?.truck_no || '').trim(),
    invoice_ttl_weight_kgs: toNumericText(invoice?.actual_weight || invoice?.invoice_ttl_weight_kgs),
    actual_mrr_ttl_weight_kgs: toNumericText(
      invoice?.actual_mrr_weight ||
      packing?.actual_total ||
      packing?.total_weight ||
      invoice?.actual_weight
    ),
    required_reel: String(packing?.total_reels || goods.length || packingItems.length || '').trim(),
    rows_added: String(packingItems.length || '').trim(),
    supplier,
    mrr_entry_type: String(invoice?.mrr_entry_type || '').trim(),
    invoice_basic_value: toNumericText(invoice?.invoice_basic_value || invoice?.totals?.taxable_gst),
    mrr_basic_value: toNumericText(invoice?.mrr_basic_value || invoice?.totals?.taxable_gst),
    e_way_bill_no: String(invoice?.eway_no || '').trim(),
    e_way_date: String(invoice?.eway_date || '').trim(),
    l_r_no: String(invoice?.lr_no || '').trim(),
    insurance: toNumericText(invoice?.totals?.insurance || invoice?.insurance),
    round_off: toNumericText(invoice?.totals?.round_off || invoice?.round_off)
  };
}

function buildHelperRows(invoice = {}, packing = {}) {
  const mrrNumber = String(invoice?.mrr_no || packing?.mrr_no || '').trim();
  const geNo = String(invoice?.ge_no || packing?.ge_no || '').trim();
  const supplier = getSupplierName(invoice, packing);
  const invoiceNo = String(invoice?.invoice_no || '').trim();
  const docDate = String(invoice?.date || packing?.date || '').trim();
  const receiptDate = String(invoice?.receipt_date || packing?.receipt_date || '').trim();
  const items = Array.isArray(packing?.items) ? packing.items : [];

  return items
    .filter((row) => row && Object.values(row).some((value) => String(value ?? '').trim()))
    .map((row, index) => {
      const weight = toNumericText(row?.net_wt || row?.weight);
      const rate = toNumericText(row?.rate);
      const qty = Number(weight || 0);
      const rateNum = Number(rate || 0);
      return {
        helper_id: `${mrrNumber || geNo || 'ROW'}-${index + 1}`,
        mrr_form_id: String(invoice?.mrr_form_id || `MRR-${mrrNumber}`).trim(),
        s_no: String(row?.sort_no || index + 1).trim(),
        mrr_number: mrrNumber,
        ge_no: geNo,
        po_details: String(row?.po_details || '').trim(),
        po_no: String(row?.po_no || '').trim(),
        party_order: String(row?.party_order || '').trim(),
        po_date: String(row?.po_date || '').trim(),
        supplier,
        supplier_reel_no: String(row?.supplier_reel_no || '').trim(),
        reel_details: String(row?.reel_details || row?.item_name || '').trim(),
        item_name: String(row?.item_name || row?.reel_details || '').trim(),
        erp_code: String(row?.erp_code || '').trim(),
        size: String(row?.size || '').trim(),
        gsm: String(row?.gsm || '').trim(),
        bf: String(row?.bf || '').trim(),
        weight,
        rate,
        value: Number.isFinite(qty * rateNum) ? String((qty * rateNum).toFixed(2)) : '',
        po_rate: toNumericText(row?.po_rate),
        date: docDate,
        dt_of_receipt: receiptDate,
        sup_doc_no: invoiceNo,
        our_reel_number: String(row?.reel_no || '').trim(),
        reel_no: String(row?.reel_no || '').trim(),
        unit: String(row?.unit || 'CM').trim()
      };
    });
}

function buildSavePayload(action, invoice, packing, options = {}) {
  return {
    action,
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    invoice,
    packing,
    options: {
      mrrSheetName: options.mrrSheetName || MRR_FORM_SHEET_NAME,
      helperSheetName: options.helperSheetName || HELPER_SHEET_NAME,
      mode: options.mode || 'reel'
    },
    derived: {
      mrrFormRecord: buildMrrFormRecord(invoice, packing, options),
      helperRows: buildHelperRows(invoice, packing)
    }
  };
}

export async function fetchSheetRange(sheetName, firmSource, backendSource) {
  const backendUrl = ensureBackendUrl(backendSource || firmSource);
  const firmId = getFirmKey(firmSource);
  const query = toQuery({
    action: 'get_rows',
    sheet: sheetName,
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return {
    ...payload,
    data: rowsToObjects(payload?.values || [])
  };
}

export async function fetchSheetRangeWithParams(params = {}, backendSource) {
  const backendUrl = ensureBackendUrl(backendSource || params);
  const firmId = getFirmKey(params);
  const query = toQuery({
    action: 'get_rows',
    firm_id: firmId,
    spreadsheetId: firmId,
    ...params
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return {
    ...payload,
    data: rowsToObjects(payload?.values || [])
  };
}

export async function fetchReelStock(firmSource, backendSource) {
  const backendUrl = ensureBackendUrl(backendSource || firmSource);
  const firmId = getFirmKey(firmSource);
  const query = toQuery({
    action: 'get_reel_stock',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function fetchReelIssueEntries(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_reel_issue_entries',
    firm_id: firmId,
    spreadsheetId: firmId,
    job_no: options.jobNo
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function fetchReelReturnEntries(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_reel_return_entries',
    firm_id: firmId,
    spreadsheetId: firmId,
    job_no: options.jobNo
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function saveReelIssueEntry(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'save_reel_issue_entry',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  return fetchJson(`${backendUrl}?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_no: options.jobNo,
      our_reel_no: options.ourReelNo,
      issue_weight: options.issueWeight,
      issue_date: options.issueDate,
      corrugation: options.corrugation,
      created_by: options.createdBy || options.userEmail || ''
    })
  });
}

export async function saveReelReturnEntry(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'save_reel_return_entry',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  return fetchJson(`${backendUrl}?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_no: options.jobNo,
      our_reel_no: options.ourReelNo,
      return_weight: options.returnWeight,
      return_date: options.returnDate,
      corrugation: options.corrugation,
      created_by: options.createdBy || options.userEmail || ''
    })
  });
}

export async function fetchLatestMrrGe(mrrSheetName, firmSource, backendSource, prefix = '', geSheetName = GE_SHEET_NAME) {
  const backendUrl = ensureBackendUrl(backendSource || firmSource);
  const firmId = getFirmKey(firmSource);
  const query = toQuery({
    action: 'get_latest_ids',
    mrrSheet: mrrSheetName,
    geSheet: geSheetName,
    prefix,
    firm_id: firmId,
    spreadsheetId: firmId
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function fetchPendingGeEntries(mrrSheetName, firmSource, backendSource, helperSheetName = HELPER_SHEET_NAME) {
  const backendUrl = ensureBackendUrl(backendSource || firmSource);
  const firmId = getFirmKey(firmSource);
  const query = toQuery({
    action: 'get_pending_ge',
    mrrSheet: mrrSheetName,
    helperSheet: helperSheetName,
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return Array.isArray(payload?.values) ? payload.values : [];
}

export async function fetchUniqueSuppliers(firmSource, sheetName = PO_SHEET_NAME) {
  const backendUrl = ensureBackendUrl(firmSource);
  const firmId = getFirmKey(firmSource);
  const query = toQuery({
    action: 'get_suppliers',
    sheet: sheetName,
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return Array.isArray(payload?.values) ? payload.values : [];
}

export async function authenticateUser(loginId, password, firmSource, backendSource) {
  const backendUrl = ensureBackendUrl(backendSource || firmSource);
  const firmId = getFirmKey(firmSource);
  const query = toQuery({
    action: 'authenticate_user',
    login_id: loginId,
    password,
    firm_id: firmId,
    spreadsheetId: firmId
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function approvePendingStage(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'approve_pending_stage',
    firm_id: firmId,
    spreadsheetId: firmId,
    mrr_number: options.mrrNumber,
    ge_no: options.geNo,
    stage: options.stage,
    decision: options.decision,
    user_email: options.userEmail,
    plant_head_remark: options.plantHeadRemark,
    accounts_remark: options.accountsRemark,
    md_approval_remark: options.mdApprovalRemark,
    debit_note: options.debitNote,
    debit_note_date: options.debitNoteDate,
    debit_note_amount: options.debitNoteAmount
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function savePoRowsToSheets(rows = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_po_rows',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    sheetName: options.sheetName || PO_SHEET_NAME,
    rows
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchUsers(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_users',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return Array.isArray(payload?.users) ? payload.users : [];
}

export async function fetchSuppliers(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_suppliers',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return Array.isArray(payload?.values) ? payload.values : [];
}

export async function fetchSupplierMaster(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_supplier_master',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return Array.isArray(payload?.suppliers) ? payload.suppliers : [];
}

export async function saveSupplierMaster(supplier = {}, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_supplier_master',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    supplier
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchStateMaster(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const query = toQuery({
    action: 'get_state_master',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
  });
  const payload = await fetchJson(`${backendUrl}?${query}`);
  return Array.isArray(payload?.states) ? payload.states : [];
}

export async function saveStateMaster(state = {}, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_state_master',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    state,
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchItemGroups(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_item_groups',
    firm_id: firmId,
    spreadsheetId: firmId,
  });
  const payload = await fetchJsonCached(`${backendUrl}?${query}`);
  return Array.isArray(payload?.groups) ? payload.groups : [];
}

export async function saveItemGroup(group = {}, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_item_group',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    group,
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchItems(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_items',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJsonCached(`${backendUrl}?${query}`);
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function saveUsers(users = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_users',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    users
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteUser(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'delete_user',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    login_id: options.login_id,
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function saveItems(items = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_items',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    items
  };
  const resp = await fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const firmId = getFirmKey(options);
  invalidateCacheWhere((key) => key.includes(`firm_id=${encodeURIComponent(firmId)}`) && (key.includes('action=get_items') || key.includes('action=get_item_groups')));
  return resp;
}

export async function deleteItem(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'delete_item',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    item_id: options.item_id,
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteSupplierMaster(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'delete_supplier_master',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    supplier_id: options.supplier_id,
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchPurchaseRequests(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_purchase_requests',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJsonCached(`${backendUrl}?${query}`);
  return Array.isArray(payload?.purchase_requests) ? payload.purchase_requests : [];
}

export async function fetchPurchaseRequestDetails(prNo, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_purchase_request_details',
    firm_id: firmId,
    spreadsheetId: firmId,
    pr_no: prNo
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function savePurchaseRequest(pr = {}, items = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_purchase_request',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    item_type: String(options.item_type || '').trim(),
    purchase_request: pr,
    items
  };
  const resp = await fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const firmId = getFirmKey(options);
  invalidateCacheWhere((key) => key.includes(`firm_id=${encodeURIComponent(firmId)}`) && (key.includes('action=get_purchase_requests') || key.includes('action=get_purchase_orders')));
  return resp;
}

export async function approvePurchaseRequest(prNo, decision = 'approve', remark = '', options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'approve_purchase_request',
    firm_id: firmId,
    spreadsheetId: firmId,
    pr_no: prNo,
    decision,
    remark,
    user_email: options.userEmail
  });
  const resp = await fetchJson(`${backendUrl}?${query}`);
  invalidateCacheWhere((key) => key.includes(`firm_id=${encodeURIComponent(firmId)}`) && (key.includes('action=get_purchase_requests') || key.includes('action=get_purchase_orders')));
  return resp;
}

export async function fetchPurchaseOrders(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_purchase_orders',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJsonCached(`${backendUrl}?${query}`);
  return Array.isArray(payload?.purchase_orders) ? payload.purchase_orders : [];
}

export async function fetchMasterCounts(options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_master_counts',
    firm_id: firmId,
    spreadsheetId: firmId
  });
  const payload = await fetchJsonCached(`${backendUrl}?${query}`);
  return (payload && payload.counts && typeof payload.counts === 'object') ? payload.counts : {};
}

export async function fetchPurchaseOrderDetails(poNo, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'get_purchase_order_details',
    firm_id: firmId,
    spreadsheetId: firmId,
    po_no: poNo
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function savePurchaseOrder(po = {}, items = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_purchase_order',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    item_type: String(options.item_type || '').trim(),
    purchase_order: po,
    items
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function approvePurchaseOrder(poNo, decision = 'approve', remark = '', options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const firmId = getFirmKey(options);
  const query = toQuery({
    action: 'approve_purchase_order',
    firm_id: firmId,
    spreadsheetId: firmId,
    po_no: poNo,
    decision,
    remark,
    user_email: options.userEmail
  });
  return fetchJson(`${backendUrl}?${query}`);
}

export async function fetchLastPurchaseInfo(keys = [], itemType = 'reel', options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'get_last_purchase_info',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    item_type: itemType,
    keys
  };
  const resp = await fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return Array.isArray(resp?.items) ? resp.items : [];
}

export async function saveGeEntryToSheets(geEntry = {}, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_ge_entry',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    geEntry
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function saveReelIssue(record = {}, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_reel_issue',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    sheetName: options.sheetName || 'ALL IN ONE - REEL ISSUE',
    record
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function saveReelReturn(record = {}, options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = {
    action: 'save_reel_return',
    firm_id: getFirmKey(options),
    spreadsheetId: getFirmKey(options),
    sheetName: options.sheetName || 'ALL IN ONE - REEL RETURN',
    record
  };
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function saveInvoiceToSheets(invoice = {}, packing = {}, _poRows = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = buildSavePayload('save_invoice', invoice, packing, options);
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function savePackingToSheets(invoice = {}, packing = {}, _poRows = [], options = {}) {
  const backendUrl = ensureBackendUrl(options);
  const payload = buildSavePayload('save_packing', invoice, packing, options);
  return fetchJson(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

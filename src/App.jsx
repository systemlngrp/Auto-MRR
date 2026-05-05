import React, { useEffect, useMemo, useRef, useState } from 'react';
import { savePackingToSheets, saveInvoiceToSheets, saveGeEntryToSheets, fetchSheetRangeWithParams, fetchLatestMrrGe, fetchSheetRange, fetchPendingGeEntries, fetchUniqueSuppliers, authenticateUser, approvePendingStage, savePoRowsToSheets, fetchUsers, saveUsers, HELPER_SHEET_NAME, PO_SHEET_NAME } from './sheetSync';
import ReelLabelPrintArea from './components/print/ReelLabelPrintArea';
import { Header, MetaTable, PartyCard, SimplePartyCard } from './components/document/DocumentPrimitives';
import PendingGeModal from './components/modals/PendingGeModal';
import ProfileMenu from './components/layout/ProfileMenu';
import { directLabelPrintStyles, labelStyles, printGridStyles, styles } from './styles/appStyles';
import { getSafeInputValue, normalizeInputDateValue } from './utils/inputFormatters';
import GateEntryPage from './pages/GateEntryPage';
import PoDetailsPage from './pages/PoDetailsPage';
import ReelLabelsPage from './pages/ReelLabelsPage';
import UsersPage from './pages/UsersPage';
import GateEntriesPage from './pages/GateEntriesPage';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_PRIMARY_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = String(import.meta.env.VITE_GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_MODEL_ALIASES = {
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash-latest': 'gemini-2.5-flash'
};

function normalizeGeminiModelName(name) {
  const model = String(name || '').trim();
  if (!model) return '';
  const normalized = model.toLowerCase();
  return GEMINI_MODEL_ALIASES[normalized] || normalized;
}

const GEMINI_MODELS = Array.from(new Set([
  GEMINI_PRIMARY_MODEL,
  ...GEMINI_FALLBACK_MODELS
].map(normalizeGeminiModelName).filter(Boolean)));
const GEMINI_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const GEMINI_API_BASES = ['https://generativelanguage.googleapis.com/v1beta', 'https://generativelanguage.googleapis.com/v1'];
const GEMINI_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_GEMINI_TIMEOUT_MS || 120000);
const GEMINI_IMAGE_MAX_DIM = Math.max(1400, Number(import.meta.env.VITE_GEMINI_IMAGE_MAX_DIM || 2600));
const GEMINI_IMAGE_MIN_DIM = Math.max(1000, Math.min(GEMINI_IMAGE_MAX_DIM, Number(import.meta.env.VITE_GEMINI_IMAGE_MIN_DIM || 1600)));
const GEMINI_IMAGE_START_QUALITY = Math.min(0.98, Math.max(0.5, Number(import.meta.env.VITE_GEMINI_IMAGE_START_QUALITY || 0.88)));
const GEMINI_IMAGE_MIN_QUALITY = Math.min(GEMINI_IMAGE_START_QUALITY, Math.max(0.35, Number(import.meta.env.VITE_GEMINI_IMAGE_MIN_QUALITY || 0.55)));
const GEMINI_IMAGE_MAX_BYTES = Math.max(5 * 1024 * 1024, Number(import.meta.env.VITE_GEMINI_IMAGE_MAX_BYTES || (20 * 1024 * 1024)));
const GEMINI_MAX_OUTPUT_TOKENS = Math.max(2048, Number(import.meta.env.VITE_GEMINI_MAX_OUTPUT_TOKENS || 12288));

const APP_ROUTES = {
  login: '/login',
  firms: '/firms',
  dashboard: '/dashboard',
  geentry: '/geentry',
  mrr: '/mrr',
  labels: '/labels',
  approvals: '/approvals',
  reports: '/reports'
};

function getCurrentPathname() {
  if (typeof window === 'undefined') return APP_ROUTES.login;
  const rawPath = String(window.location.pathname || '').trim();
  return rawPath || '/';
}

function normalizeAppPath(pathname) {
  const path = String(pathname || '').trim().toLowerCase();
  const known = new Set(Object.values(APP_ROUTES));
  if (known.has(path)) return path;
  return '/';
}

function syncBrowserPath(nextPath, { replace = false } = {}) {
  if (typeof window === 'undefined') return;
  const normalizedTarget = normalizeAppPath(nextPath);
  const currentPath = normalizeAppPath(getCurrentPathname());
  if (!normalizedTarget || normalizedTarget === currentPath) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', normalizedTarget);
}
let GEMINI_COOLDOWN_UNTIL = 0;
const HOSTINGER_API_URL = String(import.meta.env.VITE_HOSTINGER_API_URL || '').trim();

const FIRMS = [
  { 
    id: 'lnki', 
    name: 'LNKI', 
    backendUrl: HOSTINGER_API_URL,
    firmKey: 'lnki',
    get scriptUrl() { return this.backendUrl; },
    get spreadsheetId() { return this.firmKey; },
    po: { reel: 'PO DETAILS', sheet: 'PO DETAILS', other: 'OTHER PO' }, 
    mrr: { reel: 'MRR FORM', sheet: 'MRR FORM', other: 'OTHER MRR' }, 
    helper: { reel: 'HELPER SHEET', sheet: 'HELPER SHEET', other: 'OTHER ITEMS' },
    header: {
      brand_box: '',
      title: 'LAXMI NARAYAN KRAFT INDUSTRIES',
      works: '1COM 2, 3RD FLOOR ADMAS PLAZA G.S ROAD, CHRISTIAN BASTI, GUWAHATI Pin 781101',
      meta: 'State :ASSAM Pin:781101 Code :18',
      contact: 'Contact - / M:- T:-',
      gstin: 'GSTIN : 18AADFL5037B1ZO PAN : AADFL5037B',
      extra_lines: [],
      note: ''
    }
  },
  { 
    id: 'unit_1', 
    name: 'UNIT-1', 
    backendUrl: HOSTINGER_API_URL,
    firmKey: 'unit_1',
    get scriptUrl() { return this.backendUrl; },
    get spreadsheetId() { return this.firmKey; },
    po: { reel: 'PO DETAILS', sheet: 'PO DETAILS', other: 'OTHER PO' }, 
    mrr: { reel: 'MRR FORM', sheet: 'MRR FORM', other: 'OTHER MRR' }, 
    helper: { reel: 'HELPER SHEET', sheet: 'HELPER SHEET', other: 'OTHER ITEMS' },
    header: {
      brand_box: '',
      title: 'LAXMI NARAYAN CORRUGATED BOARDS LLP UNIT I (DR)',
      works: '3RD FLOOR, ADAMS PLAZA, CHRISTIANBASTI, G.S. ROAD, GUWAHATI, PIN NO-781005',
      meta: 'State :ASSAM Pin:781005 Code :18',
      contact: 'Contact - / M:- T:-',
      gstin: 'GSTIN :18AAIFL7383D2Z1 PAN : AAIFL7383D',
      extra_lines: [],
      note: ''
    }
  },
  { 
    id: 'unit_2', 
    name: 'UNIT-2', 
    backendUrl: HOSTINGER_API_URL, 
    firmKey: 'unit_2',
    get scriptUrl() { return this.backendUrl; }, 
    get spreadsheetId() { return this.firmKey; },
    po: { reel: 'PO DETAILS', sheet: 'PO DETAILS', other: 'OTHER PO' }, 
    mrr: { reel: 'MRR FORM', sheet: 'MRR FORM', other: 'OTHER MRR' }, 
    helper: { reel: 'HELPER SHEET', sheet: 'HELPER SHEET', other: 'OTHER ITEMS' },
    header: {
      brand_box: '',
      title: 'LAXMI NARAYAN CORRUGATED BOARDS LLP UNIT II (DR)',
      works: 'INDUSTRIAL GROWTH CENTER, CHOWKIGATE, CHANGSARI, KAMRUP Pin 781101',
      meta: 'State :ASSAM Pin:781101 Code :18',
      contact: 'Contact - / M:- T:-',
      gstin: 'GSTIN :18AAIFL7383D1Z2 PAN : AAIFL7383D',
      extra_lines: [],
      note: ''
    }
  }
];
const AUTH_STORAGE_KEY = 'mrr_auth_user';

const getSheetName = (base, type) => {
  if (typeof base === 'object' && base !== null) {
    return base[type] || base['reel'] || '';
  }
  if (type === 'sheet') return `${base} (SHEETS)`;
  return base;
};

const getApprovalRemarkText = (row = {}) => {
  const candidates = [
    row?.plant_head_remark,
    row?.accounts_remark,
    row?.md_approval_remark,
    row?.plantheadremark,
    row?.accountsremark,
    row?.mdapprovalremark,
    row?.remark,
    row?.remarks
  ];
  const value = candidates.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
  return value ? String(value).trim() : '-';
};

const defaultHeader = () => ({
  brand_box: '',
  title: '',
  works: '',
  meta: '',
  contact: '',
  gstin: '',
  extra_lines: [],
  note: ''
});

const blankInvoiceRow = () => ({ 
  description: '', 
  hsn: '48043100', 
  sort_no: '', 
  party_order: '', 
  po_no: '', 
  po_details: '', 
  po_date: '', 
  supplier: '', 
  po_rate: '', 
  gsm: '', 
  size: '', 
  size_unit: 'CM', 
  reels: '', 
  weight: '', 
  weight_unit: 'KGS', 
  rate: '', 
  amount: '',
  quantity: '',
  po_quantity: ''
});
const blankPackingRow = () => ({ mrr_no: '', ge_no: '', po_no: '', po_details: '', supplier_reel_no: '', erp_code: '', reel_details: '', item_name: '', reel_no: '', sort_no: '', party_order: '', bf: '', gsm: '', size: '', unit: 'CM', rate: '', po_rate: '', net_wt: '' });
const blankPoRow = () => ({ sno: '', po_no: '', date: '', supplier: '', po_details: '', erp_code: '', size: '', gsm: '', bf: '', reel_details: '', unit: '', rate: '', quantity: '', status: '', quantity_received: '', pending: '', closed: '', rapc: '' });

const blankInvoice = {
  header: { ...defaultHeader(), note: '' },
  doc_title: 'MRR',
  mrr_entry_type: '',
  invoice_no: '',
  date: '',
  eway_no: '',
  eway_date: '',
  lr_no: '',
  vehicle_no: '',
  ge_no: '',
  mrr_no: '',
  receipt_date: '',
  actual_weight: '',
  actual_mrr_weight: '',
  due_days: '',
  freight_type: '',
  bill_to: { name_address: '', gstin: '', contact: '', state: '', state_code: '' },
  consignee: { name_address: '', gstin: '', contact: '', state: '', state_code: '' },
  delivery: { name_address: '', gstin: '', contact: '', state: '', state_code: '' },
  transporter: '',
  pin: '',
  irn: '',
  ack_no: '',
  ack_date: '',
  goods: [],
  totals: { gross_amount: '', insurance: 0, taxable_gst: '', cgst_pct: 9, cgst_value: '', sgst_pct: 9, sgst_value: '', round_off: 0, net_amount: '' },
  bank: { name: '', account_no: '', ifsc: '' },
  declaration: '',
  total_label: 'Total Invoice Value',
  total_words: '',
  terms: '',
  certification: '',
  signer_name: '',
  signatory_label: '',
  extra_details: ''
};

const blankPacking = {
  header: { ...defaultHeader(), note: '' },
  doc_title: 'Packing Slip',
  challan_no: '',
  date: '',
  order_date: '',
  lr_no: '',
  lr_date: '',
  ge_no: '',
  mrr_no: '',
  receipt_date: '',
  truck_no: '',
  actual_total: '',
  carrier: '',
  distributor: '',
  consignee: { name_address: '', gstin: '', state: '' },
  buyer: { name_address: '', gstin: '', state: '' },
  items: [],
  intro_line: '',
  total_reels: '',
  total_weight: '',
  receiver_label: '',
  signer_name: '',
  approval_text: '',
  signatory_label: '',
  extra_details: ''
};

const n = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const text = String(v ?? '').trim();
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (v) => n(v).toFixed(2);
const firstFilled = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const sanitizeNumericInput = (value) => String(value ?? '').replace(/[^0-9.]/g, '');
const formatToleranceValue = (value) => {
  if (!Number.isFinite(value)) return '';
  return String(Number(value.toFixed(2)));
};
const getPercentageToleranceBounds = (value, tolerancePercent = 15) => {
  const base = n(value);
  if (!Number.isFinite(base) || base <= 0) return null;
  const tolerance = base * (Number(tolerancePercent || 0) / 100);
  return {
    min: Math.max(0, base - tolerance),
    target: base,
    max: base + tolerance
  };
};
const getQuantityToleranceOptions = (value, tolerance = 15) => {
  const base = n(value);
  if (!Number.isFinite(base) || base <= 0) return [];
  const min = Math.max(0, base - tolerance);
  return uniqueText([
    formatToleranceValue(min),
    formatToleranceValue(base),
    formatToleranceValue(base + tolerance)
  ]).filter(Boolean);
};
const getTodayInputDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const merge = (base, patch) => Array.isArray(base) ? (Array.isArray(patch) && patch.length ? patch : base) : (base && typeof base === 'object' ? Object.keys({ ...base, ...(patch || {}) }).reduce((out, key) => ({ ...out, [key]: merge(base[key], patch?.[key]) }), {}) : (patch === undefined || patch === null || patch === '' ? base : patch));

function words(value) {
  const num = Math.floor(n(value));
  if (!num) return 'Zero Only';
  const o = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => x < 20 ? o[x] : `${t[Math.floor(x / 10)]}${x % 10 ? ` ${o[x % 10]}` : ''}`;
  const three = (x) => `${Math.floor(x / 100) ? `${o[Math.floor(x / 100)]} Hundred ` : ''}${x % 100 ? two(x % 100) : ''}`;
  const c = Math.floor(num / 10000000), l = Math.floor((num % 10000000) / 100000), th = Math.floor((num % 100000) / 1000), h = num % 1000;
  return `${c ? `${three(c)} Crore ` : ''}${l ? `${three(l)} Lakh ` : ''}${th ? `${three(th)} Thousand ` : ''}${h ? three(h) : ''}`.trim() + ' Only';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const useFallback = () => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };
    
    if (!file.type || !file.type.match(/image\/(jpeg|png|webp|gif|bmp)/i)) {
      return useFallback();
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        useFallback();
        return;
      }

      const originalWidth = img.naturalWidth || img.width || 1;
      const originalHeight = img.naturalHeight || img.height || 1;
      const initialScale = Math.min(1, GEMINI_IMAGE_MAX_DIM / Math.max(originalWidth, originalHeight));
      let width = Math.max(1, Math.round(originalWidth * initialScale));
      let height = Math.max(1, Math.round(originalHeight * initialScale));

      const render = (quality) => {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', quality);
      };

      let quality = GEMINI_IMAGE_START_QUALITY;
      let dataUrl = render(quality);
      let size = getDataUrlBase64Size(dataUrl);

      while (size > GEMINI_IMAGE_MAX_BYTES && quality > GEMINI_IMAGE_MIN_QUALITY) {
        quality = Math.max(GEMINI_IMAGE_MIN_QUALITY, Number((quality - 0.08).toFixed(2)));
        dataUrl = render(quality);
        size = getDataUrlBase64Size(dataUrl);
      }

      while (size > GEMINI_IMAGE_MAX_BYTES && Math.max(width, height) > GEMINI_IMAGE_MIN_DIM) {
        const shrinkScale = Math.max(
          GEMINI_IMAGE_MIN_DIM / Math.max(width, height),
          Math.sqrt(GEMINI_IMAGE_MAX_BYTES / size) * 0.98
        );
        width = Math.max(1, Math.round(width * Math.min(0.92, shrinkScale)));
        height = Math.max(1, Math.round(height * Math.min(0.92, shrinkScale)));
        dataUrl = render(quality);
        size = getDataUrlBase64Size(dataUrl);
      }

      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      useFallback();
    };
    img.src = url;
  });
}

function getDataUrlMimeType(dataUrl, fallback = 'image/jpeg') {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,/i);
  return match ? match[1] : fallback;
}

function getDataUrlBase64(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  return parts.length > 1 ? parts[1] : String(dataUrl || '');
}

function getDataUrlBase64Size(dataUrl) {
  const base64 = getDataUrlBase64(dataUrl);
  return Math.ceil((base64.length * 3) / 4);
}

function inferJsonSchema(sample) {
  if (Array.isArray(sample)) return { type: 'array', items: inferJsonSchema(sample[0] ?? '') };
  if (typeof sample === 'number') return { type: 'number' };
  if (typeof sample === 'boolean') return { type: 'boolean' };
  if (sample && typeof sample === 'object') return { type: 'object', properties: Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, inferJsonSchema(value)])) };
  return { type: 'string' };
}

function extractCandidateText(data) {
  const promptBlock = data?.promptFeedback?.blockReason;
  if (promptBlock) throw new Error(`Gemini blocked the request: ${promptBlock}`);
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error(data?.error?.message || 'Gemini returned no candidates');
  const finishReason = candidate.finishReason;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    const finishMessage = candidate.finishMessage ? ` ${candidate.finishMessage}` : '';
    throw new Error(`Gemini stopped with ${finishReason}.${finishMessage}`.trim());
  }
  return candidate?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function parseModelJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
  if (!cleaned) throw new Error('Gemini returned an empty response');
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sliced);
      } catch {
        // Basic repair: remove trailing commas before } or ]
        const repaired = sliced.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(repaired);
      }
    }
    throw new Error(`Gemini did not return valid JSON: ${cleaned.slice(0, 180)}`);
  }
}
function isMeaningful(value) {
  if (Array.isArray(value)) return value.some(isMeaningful);
  if (value && typeof value === 'object') return Object.values(value).some(isMeaningful);
  return String(value ?? '').trim() !== '';
}

function ensureRows(rows) {
  return Array.isArray(rows) ? rows.filter(isMeaningful) : [];
}

function rowFieldCount(row, fields) {
  return fields.reduce((count, field) => count + (isMeaningful(row?.[field]) ? 1 : 0), 0);
}

function isTotalLikeText(value) {
  return /^(sub\s*total|grand\s*total|total)\b/i.test(String(value || '').replace(/[.:_-]+/g, ' ').trim());
}

function isTotalLikeInvoiceRow(row = {}) {
  return isTotalLikeText(row.description) || isTotalLikeText(row.party_order) || isTotalLikeText(row.sort_no);
}

function isTotalLikePackingRow(row = {}) {
  return isTotalLikeText(row.reel_details) || isTotalLikeText(row.item_name) || isTotalLikeText(row.po_details) || isTotalLikeText(row.po_no) || isTotalLikeText(row.party_order) || isTotalLikeText(row.sort_no);
}

function needsInvoiceRowRetry(rows = []) {
  const normalized = ensureRows(rows);
  if (!normalized.length) return true;
  const score = normalized.reduce((sum, row) => sum + rowFieldCount(row, ['description', 'sort_no', 'party_order', 'gsm', 'size', 'reels', 'weight', 'rate', 'amount']), 0);
  return score < Math.max(3, normalized.length * 2);
}

function needsPackingRowRetry(rows = []) {
  const normalized = ensureRows(rows);
  if (!normalized.length) return true;
  const score = normalized.reduce((sum, row) => sum + rowFieldCount(row, ['mrr_no', 'ge_no', 'po_no', 'po_details', 'item_name', 'supplier_reel_no', 'erp_code', 'reel_no', 'sort_no', 'party_order', 'bf', 'gsm', 'size', 'rate', 'po_rate', 'net_wt']), 0);
  return score < Math.max(4, normalized.length * 3);
}

function hasCustomHeader(header = {}, fallbackNote = '') {
  const base = { ...defaultHeader(), note: fallbackNote };
  return Object.keys(base).some((key) => String(header?.[key] ?? '').trim() !== String(base[key] ?? '').trim());
}

function splitHeaderText(value) {
  return String(value || '')
    .split(/\r?\n|\|/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function uniqueText(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanSingleLineText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractSupplierName(value) {
  const text = String(value || '').replace(/\r/g, '\n');
  if (!text.trim()) return '';
  const lines = text.split('\n').map(cleanSingleLineText).filter(Boolean);
  const source = lines[0] || cleanSingleLineText(text);
  const trimmed = source
    .replace(/^(supplier|name|party)\s*[:\-]\s*/i, '')
    .split(/\b(works?\s*:|address\s*:|village\s*:|dist(?:rict)?\s*:|state\s*:|pin\s*:|gstin\s*:|pan\s*:|contact\s*:)\b/i)[0]
    .replace(/[,;:\-]+$/g, '')
    .trim();
  return trimmed || source;
}

function extractStateName(value) {
  const text = cleanSingleLineText(value);
  if (!text) return '';
  const stateLabelMatch = text.match(/state\s*[:\-]?\s*([A-Za-z ]+)/i);
  const base = stateLabelMatch?.[1] || text;
  return base
    .replace(/\b(code|gstin|pan|contact|pin)\b.*$/i, '')
    .replace(/[0-9]/g, '')
    .replace(/[-,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCompanyKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isInternalFirmName(name, selectedFirm) {
  const candidate = normalizeCompanyKey(name);
  if (!candidate) return false;
  const known = [
    selectedFirm?.name,
    selectedFirm?.header?.title,
    ...FIRMS.map((firm) => firm?.name),
    ...FIRMS.map((firm) => firm?.header?.title)
  ]
    .map(normalizeCompanyKey)
    .filter(Boolean);

  return known.some((item) => item && (candidate.includes(item) || item.includes(candidate)));
}

function resolveScannedSupplierName({ scannedBillToName = '', focusedSupplierName = '', headerSupplierName = '', selectedFirm = null }) {
  const focused = extractSupplierName(focusedSupplierName);
  const header = extractSupplierName(headerSupplierName);
  const billTo = extractSupplierName(scannedBillToName);

  // Prefer explicit supplier extraction, then top header company name.
  if (focused && !isInternalFirmName(focused, selectedFirm)) return focused;
  if (header && !isInternalFirmName(header, selectedFirm)) return header;

  // Use bill_to only when it is not our own/party internal firm name.
  if (billTo && !isInternalFirmName(billTo, selectedFirm)) return billTo;
  return focused || header || billTo || '';
}

function normalizeScannedParty(party = {}) {
  const name = extractSupplierName(party.name_address || '');
  const state = extractStateName(party.state || party.state_code || '');
  return {
    ...party,
    name_address: name || '',
    state: state || '',
    state_code: String(party.state_code || '').match(/\b\d{2}\b/)?.[0] || ''
  };
}

function normalizeHeaderText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isRedundantHeaderLine(line, knownParts) {
  const normalizedLine = normalizeHeaderText(line);
  if (!normalizedLine) return true;
  return knownParts.some((part) => {
    const normalizedPart = normalizeHeaderText(part);
    return normalizedPart && (normalizedLine === normalizedPart || normalizedLine.includes(normalizedPart) || normalizedPart.includes(normalizedLine));
  });
}

function wrapBrandText(text, maxLen, maxLines) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLen || !current) current = next;
    else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  const remaining = lines.length === maxLines - 1 ? words.slice(lines.join(' ').split(' ').filter(Boolean).length).join(' ') : current;
  if (remaining) lines.push(remaining);
  return lines.slice(0, maxLines);
}

function compactBrandBox(rawBrandBox, title, kind) {
  const raw = String(rawBrandBox || '').replace(/\s+/g, ' ').trim();
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
  if (kind === 'invoice') {
    const invoiceBody = raw && !/kraft\s*o\s*pack/i.test(raw) ? raw : cleanTitle;
    const wrapped = wrapBrandText(invoiceBody, 17, 2);
    return ['KRAFT O PACK', ...wrapped].filter(Boolean).join('\n').trim();
  }
  return wrapBrandText(raw || cleanTitle, 17, 3).join('\n').trim();
}

function pickHeaderLine(lines, patterns) {
  return lines.find((line) => patterns.some((pattern) => pattern.test(line))) || '';
}

function removeLine(lines, target) {
  return target ? lines.filter((line) => line !== target) : lines;
}

function normalizeHeaderStructure(header = {}, kind) {
  const source = merge(defaultHeader(), header || {});
  let lines = uniqueText([
    ...splitHeaderText(source.brand_box),
    ...splitHeaderText(source.title),
    ...splitHeaderText(source.works),
    ...splitHeaderText(source.meta),
    ...splitHeaderText(source.contact),
    ...splitHeaderText(source.gstin),
    ...(Array.isArray(source.extra_lines) ? source.extra_lines.flatMap(splitHeaderText) : [])
  ]);

  const title = source.title || pickHeaderLine(lines, [/(llp|kraft|paper|mills)/i, /shree/i]);
  lines = removeLine(lines, title);

  const gstin = source.gstin || pickHeaderLine(lines, [/gstin/i, /[0-9]{2}[A-Z0-9]{10,}/i]);
  lines = removeLine(lines, gstin);

  const contact = source.contact || pickHeaderLine(lines, [/phone|email|e-mail|phoneno|mobile/i]);
  lines = removeLine(lines, contact);

  const meta = source.meta || pickHeaderLine(lines, [/pan|state code|cin/i]);
  lines = removeLine(lines, meta);

  const works = source.works || pickHeaderLine(lines, [/works|village|district|kamrup|guwahati|office/i]);
  lines = removeLine(lines, works);

  const computedBrandBox = compactBrandBox(source.brand_box, title, kind);
  const brand_box = (kind === 'invoice' || kind === 'packing') ? '' : computedBrandBox;
  const note = (kind === 'invoice' || kind === 'packing')
    ? ''
    : (source.note || (title || works || meta || contact || gstin ? 'Dispatch Copy' : ''));
  const extra_lines = uniqueText(lines).filter((line) => !isRedundantHeaderLine(line, [
    title,
    works,
    meta,
    contact,
    gstin,
    note,
    brand_box,
    ...splitHeaderText(brand_box)
  ]));

  return {
    brand_box,
    title,
    works,
    meta,
    contact,
    gstin,
    extra_lines,
    note
  };
}

function mapInvoicePartyToPacking(party = {}) {
  return {
    name_address: party.name_address || '',
    gstin: party.gstin || '',
    state: [party.state, party.state_code].filter(Boolean).join(' - ')
  };
}

function mapPackingPartyToInvoice(party = {}) {
  const stateText = party.state || '';
  const codeMatch = stateText.match(/(\d{2})\s*$/);
  const state = stateText.replace(/\s*-?\s*\d{2}\s*$/, '').trim() || stateText;
  return {
    name_address: party.name_address || '',
    gstin: party.gstin || '',
    contact: '',
    state,
    state_code: codeMatch?.[1] || ''
  };
}

function invoiceRowsToPackingItems(goods = []) {
  return ensureRows(goods).filter((row) => !isTotalLikeInvoiceRow(row)).map((row) => ({
    mrr_no: '',
    ge_no: '',
    po_no: row.party_order || '',
    po_details: '',
    supplier_reel_no: '',
    erp_code: '',
    reel_details: row.description || '',
    item_name: row.description || '',
    reel_no: '',
    sort_no: row.sort_no || '',
    party_order: row.party_order || '',
    bf: '',
    gsm: row.gsm || '',
    size: row.size || '',
    unit: row.size_unit || 'CM',
    rate: row.rate || '',
    net_wt: row.weight || ''
  }));
}

function packingItemsToInvoiceRows(items = []) {
  return ensureRows(items).filter((row) => !isTotalLikePackingRow(row)).map((row) => ({
    description: row.reel_details || row.item_name || '',
    hsn: '48043100',
    sort_no: row.sort_no ?? '',
    party_order: row.po_no || row.party_order || '',
    gsm: row.gsm ?? '',
    size: row.size ?? '',
    size_unit: row.unit ?? 'CM',
    reels: '',
    weight: row.net_wt ?? '',
    weight_unit: 'KGS',
    rate: row.rate ?? '',
    amount: ''
  }));
}

function isMeaningfulInvoiceRowForSync(row = {}) {
  const meaningfulFields = [
    row.description,
    row.sort_no,
    row.party_order,
    row.po_no,
    row.po_details,
    row.gsm,
    row.size,
    row.reels,
    row.weight,
    row.rate,
    row.amount
  ];
  return meaningfulFields.some((value) => isMeaningful(value));
}

function isMeaningfulPackingRowForSync(row = {}) {
  const meaningfulFields = [
    row.item_name,
    row.reel_details,
    row.supplier_reel_no,
    row.reel_no,
    row.sort_no,
    row.party_order,
    row.po_no,
    row.po_details,
    row.bf,
    row.gsm,
    row.size,
    row.rate,
    row.po_rate,
    row.net_wt
  ];
  return meaningfulFields.some((value) => isMeaningful(value));
}

const PACKING_MANDATORY_COLUMNS = [
  { key: 'mrr_no', label: 'MRR No.' },
  { key: 'ge_no', label: 'GE No.' },
  { key: 'po_no', label: 'PO No.' },
  { key: 'po_details', label: 'PO Details' },
  { key: 'item_name', label: 'Description' },
  { key: 'supplier_reel_no', label: 'Supplier Reel No.' },
  { key: 'erp_code', label: 'ERP Code' },
  { key: 'reel_no', label: 'Our Reel No.' },
  { key: 'bf', label: 'BF' },
  { key: 'gsm', label: 'GSM' },
  { key: 'size', label: 'Size' },
  { key: 'unit', label: 'Unit' },
  { key: 'rate', label: 'Rate' },
  { key: 'po_rate', label: 'PO Rate' },
  { key: 'net_wt', label: 'Weight' }
];

const INVOICE_MANDATORY_COLUMNS = [
  { key: 'description', label: 'Description' },
  { key: 'hsn', label: 'HSN' },
  { key: 'gsm', label: 'GSM' },
  { key: 'size', label: 'Size' },
  { key: 'size_unit', label: 'Size Unit' },
  { key: 'reels', label: 'Reels' },
  { key: 'weight', label: 'Weight' },
  { key: 'weight_unit', label: 'Weight Unit' },
  { key: 'rate', label: 'Rate' },
  { key: 'amount', label: 'Amount' }
];

const OTHER_MRR_INVOICE_MANDATORY_COLUMNS = [
  { key: 'po_no', label: 'PO NO.' },
  { key: 'po_date', label: 'PO DATE' },
  { key: 'supplier', label: 'SUPPLIER' },
  { key: 'po_details', label: 'PO DETAILS' },
  { key: 'po_rate', label: 'PO RATE' },
  { key: 'po_quantity', label: 'PO QUANTITY' },
  { key: 'hsn', label: 'HSN' },
  { key: 'size_unit', label: 'Unit' },
  { key: 'quantity', label: 'Qunatity' },
  { key: 'rate', label: 'Invoice Rate' },
  { key: 'amount', label: 'Invoice Basic Amount' }
];

const OTHER_MRR_UNIT_OPTIONS = ['Kgs', 'GM', 'Pcs', 'Ltr'];
const OTHER_MRR_ENTRY_TYPE_OPTIONS = ['Purchases', 'Rejection'];

function normalizeOtherMrrEntryType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text === 'rejection') return 'Rejection';
  if (text === 'purchase' || text === 'purchases') return 'Purchases';
  return String(value || '').trim();
}

function getInvoiceMandatoryError(invoiceDoc = {}, mrrType = 'reel') {
  const rows = ensureRows(invoiceDoc.goods || []).filter(isMeaningfulInvoiceRowForSync);
  if (!rows.length) return 'MRR Entry requires at least 1 row.';
  const isOtherMrr = String(mrrType || '').trim().toLowerCase() === 'other';
  const mandatoryColumns = isOtherMrr
    ? OTHER_MRR_INVOICE_MANDATORY_COLUMNS
    : INVOICE_MANDATORY_COLUMNS;

  const issues = rows
    .map((row, index) => {
      const missing = mandatoryColumns
        .filter((col) => {
          if (isOtherMrr && col.key === 'amount') {
            const hasComputedAmount = n(row?.quantity) > 0 && n(row?.rate) > 0;
            return String(row?.amount ?? '').trim() === '' && !hasComputedAmount;
          }
          return String(row?.[col.key] ?? '').trim() === '';
        })
        .map((col) => col.label);
      if (!missing.length) return '';
      return `Row ${index + 1}: ${missing.join(', ')}`;
    })
    .filter(Boolean);

  if (!issues.length) return '';
  return `MRR Entry mandatory fields missing. ${issues.join(' | ')}`;
}

function getPackingMandatoryError(packingDoc = {}) {
  const rows = ensureRows(packingDoc.items || []).filter(isMeaningfulPackingRowForSync);
  if (!rows.length) return 'Packing Slip requires at least 1 row.';

  const issues = rows
    .map((row, index) => {
      const missing = PACKING_MANDATORY_COLUMNS
        .filter((col) => String(row?.[col.key] ?? '').trim() === '')
        .map((col) => col.label);
      if (!missing.length) return '';
      return `Row ${index + 1}: ${missing.join(', ')}`;
    })
    .filter(Boolean);

  if (!issues.length) return '';
  return `Packing Slip mandatory fields missing. ${issues.join(' | ')}`;
}

function sanitizeScannedPackingRows(rows = [], totalReelsHint = '') {
  return ensureRows(rows).filter(isMeaningfulPackingRowForSync);
}

function extractTrailingInteger(value) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const match = text.match(/(\d+)\s*$/);
  return match ? Number(match[1]) || 0 : 0;
}

function getMaxOurReelNo(rows = []) {
  return ensureRows(rows).reduce((max, row) => {
    const num = extractTrailingInteger(row?.reel_no);
    return num > max ? num : max;
  }, 0);
}

function getMaxOurReelNoFromSheetPayload(payload = {}) {
  const rowsFromData = Array.isArray(payload?.data) ? payload.data : [];
  const maxFromData = rowsFromData.reduce((max, row) => {
    const num = extractTrailingInteger(
      row?.our_reel_number || row?.reel_no || row?.['Our Reel Number'] || row?.['reel_no']
    );
    return num > max ? num : max;
  }, 0);

  const values = Array.isArray(payload?.values) ? payload.values : [];
  if (!values.length) return maxFromData;

  const first = values[0];
  if (!Array.isArray(first)) {
    const maxFromObjectValues = values.reduce((max, row) => {
      const num = extractTrailingInteger(
        row?.our_reel_number || row?.reel_no || row?.['Our Reel Number'] || row?.['reel_no']
      );
      return num > max ? num : max;
    }, 0);
    return Math.max(maxFromData, maxFromObjectValues);
  }

  const headers = first.map((h) => String(h || '').trim().toLowerCase());
  const reelIdx = headers.findIndex((h) => ['our reel number', 'our_reel_number', 'reel no.', 'reel no', 'reel_no'].includes(h));
  if (reelIdx < 0) return maxFromData;

  const maxFromArrayValues = values.slice(1).reduce((max, row) => {
    const num = extractTrailingInteger(row?.[reelIdx]);
    return num > max ? num : max;
  }, 0);
  return Math.max(maxFromData, maxFromArrayValues);
}

function toNonEmptyText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function withSequentialOurReelNumbers(rows = [], startFrom = 0) {
  let counter = Number(startFrom) || 0;
  return ensureRows(rows).map((row) => {
    const supplierReelNo = toNonEmptyText(row?.supplier_reel_no, row?.reel_no);
    counter += 1;
    return {
      ...row,
      supplier_reel_no: supplierReelNo,
      reel_no: String(counter)
    };
  });
}

function mergeInvoiceGoodsIntoPackingItems(packingItems = [], invoiceGoods = []) {
  const packingRows = ensureRows(packingItems).filter(isMeaningfulPackingRowForSync);
  const invoiceRows = ensureRows(invoiceGoods).filter(isMeaningfulInvoiceRowForSync);
  if (!packingRows.length) return invoiceRows.flatMap(row => invoiceRowsToPackingItems([row]));
  
  return packingRows.map(pRow => {
    const pGsm = String(pRow.gsm || '').trim();
    const pSize = String(pRow.size || '').trim();
    
    // Find matching invoice row by GSM and Size
    const match = invoiceRows.find(iRow => 
      pGsm && pSize && String(iRow.gsm || '').trim() === pGsm && String(iRow.size || '').trim() === pSize
    ) || invoiceRows[0]; // fallback to first if no exact match but we need some data? actually let's only use exact match if possible, or fallback if only 1 invoice row.
    
    const bestMatch = match || (invoiceRows.length === 1 ? invoiceRows[0] : null);

    if (bestMatch) {
      return {
        ...pRow,
        rate: pRow.rate || bestMatch.rate || '',
        party_order: pRow.party_order || pRow.po_no || bestMatch.party_order || '',
        sort_no: pRow.sort_no || bestMatch.sort_no || '',
        item_name: pRow.item_name || bestMatch.description || '',
        reel_details: pRow.reel_details || bestMatch.description || ''
      };
    }
    return pRow;
  });
}

function mergePackingItemsIntoInvoiceGoods(invoiceGoods = [], packingItems = []) {
  const invoiceRows = ensureRows(invoiceGoods).filter(isMeaningfulInvoiceRowForSync);
  const packingRows = ensureRows(packingItems).filter(isMeaningfulPackingRowForSync);
  if (!invoiceRows.length) return packingRows.flatMap(row => packingItemsToInvoiceRows([row]));
  
  // We don't want to overwrite a grouped invoice with individual packing rows.
  // We just want to enrich the invoice rows with missing party_order, sort_no, etc.
  return invoiceRows.map(iRow => {
    const iGsm = String(iRow.gsm || '').trim();
    const iSize = String(iRow.size || '').trim();
    
    const match = packingRows.find(pRow => 
      iGsm && iSize && String(pRow.gsm || '').trim() === iGsm && String(pRow.size || '').trim() === iSize
    );
    
    const bestMatch = match || (packingRows.length === 1 ? packingRows[0] : null);

    if (bestMatch) {
      return {
        ...iRow,
        party_order: iRow.party_order || bestMatch.party_order || bestMatch.po_no || '',
        sort_no: iRow.sort_no || bestMatch.sort_no || ''
      };
    }
    return iRow;
  });
}

function normalizeInvoice(data = {}) {
  const invoice = merge(blankInvoice, data);
  invoice.header = normalizeHeaderStructure(data.header || {}, 'invoice');
  invoice.bill_to = normalizeScannedParty(invoice.bill_to || {});
  invoice.consignee = normalizeScannedParty(invoice.consignee || {});
  invoice.delivery = normalizeScannedParty(invoice.delivery || {});
  const docTitle = String(invoice.doc_title || '').trim().toLowerCase();
  if (!docTitle || docTitle === 'tax invoice' || docTitle === 'tax invoice against gst') {
    invoice.doc_title = 'MRR';
  }
  invoice.goods = ensureRows(invoice.goods)
    .filter((row) => !isTotalLikeInvoiceRow(row))
    .map((row) => {
      const mergedRow = merge(blankInvoiceRow(), row);
      if (!mergedRow.amount && n(mergedRow.weight) && n(mergedRow.rate)) mergedRow.amount = String(n(mergedRow.weight) * n(mergedRow.rate));
      if (!mergedRow.amount && n(mergedRow.quantity) && n(mergedRow.rate)) mergedRow.amount = String(n(mergedRow.quantity) * n(mergedRow.rate));
      return mergedRow;
    })
    .filter((row) => isMeaningfulInvoiceRowForSync(row));
  const grossAmount = invoice.goods.reduce((sum, row) => sum + (n(row.amount) || n(row.weight) * n(row.rate)), 0);
  const totalWeight = invoice.goods.reduce((sum, row) => sum + n(row.weight), 0);
  const insurance = n(invoice.totals.insurance);
  const taxable = grossAmount + insurance;
  const cgstPct = n(invoice.totals.cgst_pct || 9);
  const sgstPct = n(invoice.totals.sgst_pct || 9);
  const cgstValue = taxable * cgstPct / 100;
  const sgstValue = taxable * sgstPct / 100;
  const netAmount = taxable + cgstValue + sgstValue + n(invoice.totals.round_off);
  invoice.totals = {
    gross_amount: invoice.totals.gross_amount || String(grossAmount),
    insurance: invoice.totals.insurance,
    taxable_gst: invoice.totals.taxable_gst || String(taxable),
    cgst_pct: invoice.totals.cgst_pct || 9,
    cgst_value: invoice.totals.cgst_value || String(cgstValue),
    sgst_pct: invoice.totals.sgst_pct || 9,
    sgst_value: invoice.totals.sgst_value || String(sgstValue),
    round_off: invoice.totals.round_off,
    net_amount: invoice.totals.net_amount || String(netAmount)
  };
  invoice.actual_weight = invoice.actual_weight || String(totalWeight || 0);
  invoice.total_label = invoice.total_label || 'Total Invoice Value';
  invoice.total_words = invoice.total_words || words(invoice.totals.net_amount);
  return invoice;
}

function normalizePacking(data = {}) {
  const packing = merge(blankPacking, data);
  packing.header = normalizeHeaderStructure(data.header || {}, 'packing');
  packing.items = ensureRows(packing.items).filter((row) => !isTotalLikePackingRow(row)).map((row) => {
    const mergedRow = merge(blankPackingRow(), row);
    return {
      ...mergedRow,
      mrr_no: mergedRow.mrr_no || packing.mrr_no || '',
      ge_no: mergedRow.ge_no || packing.ge_no || '',
      po_no: mergedRow.po_no || mergedRow.party_order || '',
      po_details: mergedRow.po_details || '',
      supplier_reel_no: mergedRow.supplier_reel_no || mergedRow.reel_no || '',
      erp_code: mergedRow.erp_code || '',
      reel_details: mergedRow.reel_details || mergedRow.item_name || '',
      item_name: mergedRow.item_name || mergedRow.reel_details || '',
      reel_no: mergedRow.reel_no || mergedRow.supplier_reel_no || '',
      party_order: mergedRow.party_order || mergedRow.po_no || '',
      rate: sanitizeSheetErrorText(mergedRow.rate),
      po_rate: sanitizeSheetErrorText(mergedRow.po_rate),
      net_wt: sanitizeSheetErrorText(mergedRow.net_wt)
    };
  });
  packing.items = sanitizeScannedPackingRows(packing.items, packing.total_reels);
  packing.total_reels = packing.total_reels || String(packing.items.filter(isMeaningful).length || 0);
  packing.total_weight = packing.total_weight || String(packing.items.reduce((sum, row) => sum + n(row.net_wt), 0));
  packing.approval_text = packing.approval_text || '';
  return packing;
}

function syncPackingFromInvoice(invoice, packing) {
  const keepPackingHeader = hasCustomHeader(packing.header, '');
  return normalizePacking({
    ...packing,
    header: keepPackingHeader ? packing.header : normalizeHeaderStructure({ ...invoice.header, note: packing.header?.note || invoice.header?.note || '' }, 'packing'),
    challan_no: packing.challan_no || invoice.invoice_no,
    date: packing.date || invoice.date,
    lr_no: packing.lr_no || invoice.lr_no,
    lr_date: packing.lr_date || invoice.date,
    ge_no: packing.ge_no || invoice.ge_no,
    mrr_no: packing.mrr_no || invoice.mrr_no,
    receipt_date: packing.receipt_date || invoice.receipt_date,
    truck_no: packing.truck_no || invoice.vehicle_no,
    actual_total: packing.actual_total || invoice.actual_weight,
    carrier: packing.carrier || invoice.transporter,
    distributor: packing.distributor || invoice.delivery.name_address || invoice.bill_to.name_address,
    consignee: isMeaningful(packing.consignee) ? packing.consignee : mapInvoicePartyToPacking(invoice.consignee),
    buyer: isMeaningful(packing.buyer) ? packing.buyer : mapInvoicePartyToPacking(invoice.bill_to),
    items: mergeInvoiceGoodsIntoPackingItems(packing.items, invoice.goods)
  });
}

function syncInvoiceFromPacking(invoice, packing) {
  const keepInvoiceHeader = hasCustomHeader(invoice.header, '');
  return normalizeInvoice({
    ...invoice,
    header: keepInvoiceHeader ? invoice.header : normalizeHeaderStructure({ ...packing.header, note: invoice.header?.note || packing.header?.note || '' }, 'invoice'),
    invoice_no: invoice.invoice_no || packing.challan_no,
    date: invoice.date || packing.date,
    lr_no: invoice.lr_no || packing.lr_no,
    vehicle_no: invoice.vehicle_no || packing.truck_no,
    ge_no: invoice.ge_no || packing.ge_no,
    mrr_no: invoice.mrr_no || packing.mrr_no,
    receipt_date: invoice.receipt_date || packing.receipt_date,
    actual_weight: invoice.actual_weight || packing.actual_total || packing.total_weight,
    transporter: invoice.transporter || packing.carrier,
    bill_to: isMeaningful(invoice.bill_to) ? invoice.bill_to : mapPackingPartyToInvoice(packing.buyer),
    consignee: isMeaningful(invoice.consignee) ? invoice.consignee : mapPackingPartyToInvoice(packing.consignee),
    delivery: isMeaningful(invoice.delivery) ? invoice.delivery : mapPackingPartyToInvoice(packing.consignee),
    goods: mergePackingItemsIntoInvoiceGoods(invoice.goods, packing.items)
  });
}

function poRowsToPackingItems(poRows = [], packing = blankPacking) {
  return poRows.map((row) => merge(blankPackingRow(), {
    mrr_no: packing.mrr_no || '',
    ge_no: packing.ge_no || '',
    po_no: row.po_no || '',
    po_details: row.po_details || '',
    supplier_reel_no: '',
    erp_code: row.erp_code || '',
    reel_details: row.reel_details || row.po_details || '',
    item_name: row.reel_details || row.po_details || '',
    reel_no: '',
    sort_no: '',
    party_order: row.po_no || '',
    bf: row.bf || '',
    gsm: row.gsm || '',
    size: row.size || '',
    unit: packing.items?.[0]?.unit || 'CM',
    rate: '',
    po_rate: row.rate || '',
    net_wt: row.quantity_received || row.quantity || ''
  }));
}

function applyPoRowsToPacking(packing, poRows = []) {
  if (!poRows.length) return normalizePacking(packing);
  const first = poRows[0];
  const items = poRowsToPackingItems(poRows, packing);
  const totalWeight = items.reduce((sum, row) => sum + n(row.net_wt), 0);
  return normalizePacking({
    ...packing,
    date: packing.date || first.date,
    order_date: packing.order_date || first.date,
    distributor: packing.distributor || first.supplier,
    buyer: isMeaningful(packing.buyer) ? packing.buyer : { ...packing.buyer, name_address: first.supplier || '' },
    intro_line: packing.intro_line || `PO ${first.po_no}`,
    actual_total: packing.actual_total || String(totalWeight || 0),
    total_weight: packing.total_weight || String(totalWeight || 0),
    items
  });
}

function normalizeSheetDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  }
  return text;
}

function sanitizeSheetErrorText(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^#(value|ref|name\?|n\/a|div\/0|null|num)!?$/i.test(text)) return '';
  return text;
}

function pickPoValue(data = {}, ...keys) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function normalizePoRow(data = {}) {
  return {
    ...blankPoRow(),
    sno: String(pickPoValue(data, 'sno', 's_no', 'S NO.', 'S NO')).trim(),
    po_no: String(pickPoValue(data, 'po_no', 'poNo', 'PO NO.', 'PO NO', 'PO Number', 'po_number', 'party_order_no', 'Party Order No.', 'Party Order No', 'party_order', 'Party Order')).trim(),
    date: normalizeSheetDate(pickPoValue(data, 'date', 'DATE')),
    supplier: String(pickPoValue(data, 'supplier', 'SUPPLIER')).trim(),
    po_details: String(pickPoValue(data, 'po_details', 'poDetails', 'PO DETAILS')).trim(),
    erp_code: String(pickPoValue(data, 'erp_code', 'erpCode', 'ERP Code', 'ERP CODE')).trim(),
    size: String(pickPoValue(data, 'size', 'SIZE')).trim(),
    gsm: String(pickPoValue(data, 'gsm', 'GSM')).trim(),
    bf: String(pickPoValue(data, 'bf', 'BF')).trim(),
    reel_details: String(pickPoValue(data, 'reel_details', 'reelDetails', 'REEL DETAILS')).trim(),
    unit: String(pickPoValue(data, 'unit', 'Unit', 'UNIT')).trim(),
    rate: sanitizeSheetErrorText(pickPoValue(data, 'po_rate', 'poRate', 'PO RATE', 'rate', 'RATE')),
    quantity: sanitizeSheetErrorText(pickPoValue(data, 'quantity', 'QUANTITY')),
    status: String(pickPoValue(data, 'status', 'STATUS')).trim(),
    quantity_received: sanitizeSheetErrorText(pickPoValue(data, 'quantity_received', 'quantityReceived', 'QUANTITY RECEIVED')),
    pending: sanitizeSheetErrorText(pickPoValue(data, 'pending', 'PENDING')),
    closed: String(pickPoValue(data, 'closed', 'Closed', 'Closed ')).trim(),
    rapc: String(pickPoValue(data, 'rapc', 'RAPC')).trim()
  };
}

function isPoOpenRow(row = {}) {
  const closedText = String(row.closed || '').trim().toLowerCase();
  const statusText = String(row.status || '').trim().toLowerCase();
  if (!closedText && !statusText) return true;
  const closedTokens = new Set(['yes', 'y', 'true', '1', 'closed', 'done']);
  if (closedTokens.has(closedText)) return false;
  if (statusText.includes('closed')) return false;
  return true;
}

function sheetValuesToPoRows(values = []) {
  if (!values || values.length === 0) return [];
  
  const headers = values[0].map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const findIdx = (aliases) => {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxMap = {
    sno: findIdx(['S.No.', 'S No', 's_no', 'serial_no', 'sno']),
    po_no: findIdx(['PO No.', 'PO No', 'PO NO', 'PO NO.', 'po_no', 'PO Number', 'po_number', 'party_order_no', 'Party Order No.', 'Party Order No', 'party_order', 'Party Order']),
    date: findIdx(['Date', 'date', 'po_date', 'order_date']),
    supplier: findIdx(['SUPPLIER', 'supplier', 'party_name', 'vendor']),
    po_details: findIdx(['PO DETAILS', 'po_details', 'item_description']),
    erp_code: findIdx(['ERP Code', 'erp_code', 'item_code']),
    size: findIdx(['Size', 'size']),
    gsm: findIdx(['GSM', 'gsm']),
    bf: findIdx(['BF', 'bf']),
    reel_details: findIdx(['REEL DETAILS', 'reel_details', 'item_name', 'reel_info']),
    unit: findIdx(['Unit', 'unit', 'UNIT']),
    rate: findIdx(['PO RATE', 'po_rate', 'Rate', 'rate']),
    quantity: findIdx(['Total Qty', 'quantity', 'qty', 'total_qty']),
    status: findIdx(['Status', 'status', 'order_status']),
    quantity_received: findIdx(['Recd Qty', 'recd_qty', 'quantity_received', 'received_qty']),
    pending: findIdx(['Pending', 'pending', 'pending_qty']),
    closed: findIdx(['Closed', 'closed', 'is_closed']),
    rapc: findIdx(['RAPC', 'rapc'])
  };

  const rows = values.slice(1);
  return rows
    .map((row = []) => normalizePoRow({
      sno: row[idxMap.sno],
      po_no: row[idxMap.po_no],
      date: row[idxMap.date],
      supplier: row[idxMap.supplier],
      po_details: row[idxMap.po_details],
      erp_code: row[idxMap.erp_code],
      size: row[idxMap.size],
      gsm: row[idxMap.gsm],
      bf: row[idxMap.bf],
      reel_details: row[idxMap.reel_details],
      unit: row[idxMap.unit],
      rate: row[idxMap.rate],
      quantity: row[idxMap.quantity],
      status: row[idxMap.status],
      quantity_received: row[idxMap.quantity_received],
      pending: row[idxMap.pending],
      closed: row[idxMap.closed],
      rapc: row[idxMap.rapc]
    }))
    .filter((row) => [row.po_no, row.supplier, row.po_details, row.erp_code, row.reel_details].some((value) => String(value || '').trim()));
}


function formatGeminiHttpError(status, payload, fallbackText) {
  const detailsText = JSON.stringify(payload?.error?.details || '');
  const apiMessage = String(payload?.error?.message || fallbackText || '').trim();
  const retryMatch = detailsText.match(/"retryDelay":"(\d+)s"/i);
  const retryText = retryMatch ? ` Try again in ${retryMatch[1]} seconds.` : '';

  if (status === 429 || /RESOURCE_EXHAUSTED|quota|free tier/i.test(`${apiMessage} ${detailsText}`)) {
    return `Gemini quota exceeded.${retryText} Add billing in Google AI Studio or use another quota-enabled API key.`.trim();
  }
  if (status === 403 || /API key not valid|permission|forbidden/i.test(apiMessage)) {
    return 'Gemini API key is invalid or restricted. Check the key and Gemini API permissions.';
  }
  if (status === 400) {
    if (/API key not valid|invalid API key|API_KEY_INVALID/i.test(`${apiMessage} ${detailsText}`)) {
      return 'Gemini API key is invalid for this endpoint. Use a valid Google AI Studio Gemini API key and restart the app.';
    }
    if (/referer|HTTP referrer|API_KEY_HTTP_REFERRER_BLOCKED|ip.*not.*allowed/i.test(`${apiMessage} ${detailsText}`)) {
      return 'Gemini API key restrictions are blocking this app (localhost). Update key restrictions in Google Cloud/AI Studio.';
    }
    return `Gemini could not process this image request. ${apiMessage || 'Try a clearer image under 18 MB.'}`.trim();
  }
  if (status === 503) {
    return `Gemini is temporarily unavailable.${retryText} Please retry in a few seconds.`.trim();
  }
  return `Gemini request failed (${status}). ${apiMessage || 'Please try again.'}`.trim();
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiRetryDelayMs(payload, fallbackText) {
  const detailsText = JSON.stringify(payload?.error?.details || '');
  const combined = `${detailsText} ${fallbackText || ''}`;

  const quotedMatch = combined.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (quotedMatch) return Number(quotedMatch[1]) * 1000;

  const plainMatch = combined.match(/retry(?:\s+again)?\s+in\s+(\d+)\s*s/i);
  if (plainMatch) return Number(plainMatch[1]) * 1000;

  return 0;
}

function getCooldownRemainingMs() {
  return Math.max(0, GEMINI_COOLDOWN_UNTIL - Date.now());
}

function isRetryableGeminiError(status, payload, fallbackText) {
  const detail = `${payload?.error?.status || ''} ${payload?.error?.message || ''} ${fallbackText || ''}`;
  return GEMINI_RETRYABLE_STATUS.has(status) || /UNAVAILABLE|RESOURCE_EXHAUSTED|temporar|overloaded|backend|internal/i.test(detail);
}

function canTryNextGeminiModel(error) {
  if (!error) return false;
  const status = Number(error.status || 0);
  if (!status || status === 404 || status === 429 || status >= 500) return true;
  if (status === 400) {
    const detail = `${error?.payload?.error?.status || ''} ${error?.payload?.error?.message || ''} ${error?.message || ''}`;
    return /(model|not\s*found|unsupported|responsejsonschema|responseschema|invalid\s*argument)/i.test(detail);
  }
  return false;
}

function isLikelyGeminiApiKey(value) {
  const key = String(value || '').trim();
  // Accept non-empty keys and let Gemini API validate exact format.
  return key.length >= 16;
}

async function postGeminiGenerateContent(model, requestBody, maxAttempts = 2) {
  let lastError;
  const cooldownMs = getCooldownRemainingMs();
  if (cooldownMs > 0) {
    const waitSeconds = Math.ceil(cooldownMs / 1000);
    throw new Error(`Gemini is rate-limited right now. Please retry in about ${waitSeconds} seconds.`);
  }

  for (let baseIndex = 0; baseIndex < GEMINI_API_BASES.length; baseIndex += 1) {
    const baseUrl = GEMINI_API_BASES[baseIndex];
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let timeoutId = null;
      try {
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
        const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(API_KEY || '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        window.clearTimeout(timeoutId);

        if (response.ok) return response.json();

        const errorText = await response.text();
        let payload = null;
        try {
          payload = JSON.parse(errorText);
        } catch {
          payload = null;
        }

        const err = new Error(formatGeminiHttpError(response.status, payload, errorText));
        err.status = response.status;
        err.payload = payload;
        err.retryable = isRetryableGeminiError(response.status, payload, errorText);
        err.baseUrl = baseUrl;
        lastError = err;
        if (response.status === 429 || response.status === 503) {
          const retryDelayMs = getGeminiRetryDelayMs(payload, errorText) || (response.status === 429 ? 30000 : 10000);
          GEMINI_COOLDOWN_UNTIL = Math.max(GEMINI_COOLDOWN_UNTIL, Date.now() + retryDelayMs);
        }

        const shouldSwitchBase = response.status === 404 || response.status === 400;
        if (shouldSwitchBase || (!err.retryable && baseIndex < GEMINI_API_BASES.length - 1)) {
          break;
        }
        if (!err.retryable || attempt === maxAttempts) throw err;
        await waitMs(1000 * attempt);
        continue;
      } catch (networkErr) {
        if (timeoutId) window.clearTimeout(timeoutId);
        const err = networkErr instanceof Error ? networkErr : new Error('Gemini network request failed.');
        if (err.name === 'AbortError') {
          const timeoutErr = new Error('Gemini request timed out while reading the image. Please retry with a clearer or smaller image.');
          timeoutErr.status = 408;
          timeoutErr.retryable = true;
          throw timeoutErr;
        }
        if (err.status) throw err;
        err.retryable = true;
        err.baseUrl = baseUrl;
        lastError = err;
        if (attempt === maxAttempts) break;
        await waitMs(1000 * attempt);
      }
    }
  }

  throw lastError || new Error('Gemini request failed.');
}

async function fetchGeminiStructured(mediaItems, prompt, shape) {
  const schema = inferJsonSchema(shape);
  const contents = [
    {
      parts: [
        { text: prompt },
        ...mediaItems.map((item) => ({
          inline_data: { mime_type: item.mimeType, data: item.base64 }
        }))
      ]
    }
  ];

  const mainRequest = {
    contents,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.1,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS
    }
  };

  let lastError = null;
  for (let i = 0; i < GEMINI_MODELS.length; i += 1) {
    const model = GEMINI_MODELS[i];
    try {
      const data = await postGeminiGenerateContent(model, mainRequest, 3);
      const candidateText = extractCandidateText(data);
      try {
        return parseModelJson(candidateText);
      } catch (parseErr) {
        // Retry once by asking Gemini to repair invalid JSON into the exact schema.
        const repairRequest = {
          contents: [{
            parts: [{
              text: `Fix this invalid JSON and return ONLY valid JSON matching the schema. Do not add explanation.\n\n${candidateText}`
            }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS
          }
        };
        const repairedData = await postGeminiGenerateContent(model, repairRequest, 3);
        return parseModelJson(extractCandidateText(repairedData));
      }
    } catch (err) {
      lastError = err;
      if (i < GEMINI_MODELS.length - 1 && canTryNextGeminiModel(err)) {
        continue;
      }
      throw err;
    }
  }

  const modelsTried = GEMINI_MODELS.join(', ');
  const baseHint = lastError?.baseUrl ? ` Last endpoint: ${lastError.baseUrl}` : '';
  throw new Error(`${lastError?.message || 'Gemini request failed.'} Tried models: ${modelsTried}.${baseHint}`);
}

function mergeScanRows(baseRows = [], focusedRows = [], makeBlankRow) {
  const base = ensureRows(baseRows);
  const focused = ensureRows(focusedRows);
  if (!focused.length) return base;
  const maxLength = Math.max(base.length, focused.length);
  return Array.from({ length: maxLength }, (_, index) => merge(
    typeof makeBlankRow === 'function' ? makeBlankRow() : {},
    merge(base[index] || {}, focused[index] || {})
  ));
}

function mergeFocusedInvoiceData(data, focused = {}) {
  return {
    ...data,
    invoice_no: data.invoice_no || focused.invoice_no || '',
    date: data.date || focused.date || '',
    eway_no: data.eway_no || focused.eway_no || '',
    eway_date: data.eway_date || focused.eway_date || '',
    lr_no: data.lr_no || focused.lr_no || '',
    vehicle_no: data.vehicle_no || focused.vehicle_no || '',
    pin: data.pin || focused.pin || '',
    ge_no: data.ge_no || focused.ge_no || '',
    mrr_no: data.mrr_no || focused.mrr_no || '',
    receipt_date: data.receipt_date || focused.receipt_date || '',
    actual_weight: data.actual_weight || focused.actual_weight || '',
    irn: data.irn || focused.irn || '',
    ack_no: data.ack_no || focused.ack_no || '',
    ack_date: data.ack_date || focused.ack_date || '',
    totals: {
      ...(data?.totals || {}),
      gross_amount: data.totals?.gross_amount || focused.totals?.gross_amount || '',
      insurance: data.totals?.insurance || focused.totals?.insurance || 0,
      taxable_gst: data.totals?.taxable_gst || focused.totals?.taxable_gst || '',
      cgst_pct: data.totals?.cgst_pct || focused.totals?.cgst_pct || 9,
      sgst_pct: data.totals?.sgst_pct || focused.totals?.sgst_pct || 9,
      round_off: data.totals?.round_off || focused.totals?.round_off || 0
    },
    goods: mergeScanRows(data.goods, focused.goods, blankInvoiceRow)
  };
}

function mergeFocusedInvoiceSupplierData(data, focused = {}) {
  const focusedParty = focused?.bill_to || {};
  return {
    ...data,
    bill_to: {
      ...(data?.bill_to || {}),
      name_address: extractSupplierName(focusedParty.name_address || data?.bill_to?.name_address || ''),
      state: extractStateName(focusedParty.state || data?.bill_to?.state || ''),
      state_code: focusedParty.state_code || data?.bill_to?.state_code || String(focusedParty.state || data?.bill_to?.state || '').match(/\b\d{2}\b/)?.[0] || '',
      gstin: cleanSingleLineText(focusedParty.gstin || data?.bill_to?.gstin || '')
    }
  };
}

function mergeFocusedPackingData(data, focused = {}) {
  return {
    ...data,
    header: {
      ...(data?.header || {}),
      ...(focused?.header || {})
    },
    doc_title: data.doc_title || focused.doc_title || '',
    challan_no: data.challan_no || focused.challan_no || '',
    date: data.date || focused.date || '',
    order_date: data.order_date || focused.order_date || '',
    lr_no: data.lr_no || focused.lr_no || '',
    lr_date: data.lr_date || focused.lr_date || '',
    intro_line: data.intro_line || focused.intro_line || '',
    ge_no: data.ge_no || focused.ge_no || '',
    mrr_no: data.mrr_no || focused.mrr_no || '',
    receipt_date: data.receipt_date || focused.receipt_date || '',
    truck_no: data.truck_no || focused.truck_no || '',
    actual_total: data.actual_total || focused.actual_total || '',
    carrier: data.carrier || focused.carrier || '',
    distributor: data.distributor || focused.distributor || '',
    consignee: {
      ...(data?.consignee || {}),
      ...(focused?.consignee || {})
    },
    buyer: {
      ...(data?.buyer || {}),
      ...(focused?.buyer || {})
    },
    total_reels: data.total_reels || focused.total_reels || '',
    total_weight: data.total_weight || focused.total_weight || '',
    receiver_label: data.receiver_label || focused.receiver_label || '',
    signer_name: data.signer_name || focused.signer_name || '',
    approval_text: data.approval_text || focused.approval_text || '',
    signatory_label: data.signatory_label || focused.signatory_label || '',
    extra_details: data.extra_details || focused.extra_details || '',
    items: mergeScanRows(data.items, focused.items, blankPackingRow)
  };
}

async function fetchGeminiJson(filesInput, kind) {
  if (!API_KEY) throw new Error('Missing Gemini API key');
  if (!isLikelyGeminiApiKey(API_KEY)) {
    throw new Error('Gemini API key looks too short. Please check your .env key value.');
  }

  const files = Array.isArray(filesInput) ? filesInput : [filesInput];
  const mediaItems = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await fileToBase64(file);
      const base64 = getDataUrlBase64(dataUrl);
      const mimeType = getDataUrlMimeType(dataUrl, file.type || 'image/jpeg');
      const processedSize = getDataUrlBase64Size(dataUrl);
      if (processedSize > GEMINI_IMAGE_MAX_BYTES) {
        throw new Error('One of the images is still too large for Gemini after optimization. Please crop or use a clearer photo.');
      }
      return { base64, mimeType };
    })
  );

  const shape = kind === 'invoice' ? blankInvoice : blankPacking;
  const pageText = mediaItems.length > 1 ? `these ${mediaItems.length} images as pages of the same document` : `this ${kind === 'invoice' ? 'invoice/mrr document' : 'packing slip'} image`;
  const prompt = `Read ${pageText} and extract visible dynamic values into JSON. Include company/header block, document title, party details, transport fields, totals, and all table rows. For each table row, strictly extract description, gsm, size, reels/quantity, weight, rate, and amount. Return only schema fields, keep dates in YYYY-MM-DD where possible, preserve row order, and use empty strings or 0 when unreadable.`;
  
  let data = await fetchGeminiStructured(mediaItems, prompt, shape);

  if (kind === 'invoice') {
    try {
      const focused = await fetchGeminiStructured(
        mediaItems,
        'Extract MRR entry metadata and goods table from all pages: GE No, Date, MRR No, Dt. of Receipt, Sup Doc No, Truck Number, Invoice Total Weight (Kgs), Actual MRR Total Weight (Kgs), E-Way Bill No, E-Way Date, L.R No, Supplier/Bill To name and state, Gross Amount, Invoice Basic Value, MRR Basic Value, Insurance, Taxable GST, CGST %, SGST %, Round Off. Also extract the goods table: Description, HSN, Sort, Party Order, GSM, Size, Unit, Reels, Weight, Unit, Rate, Amount. Ensure every row includes the Rate and Amount if visible. Read row-by-row in order across all pages. Return only rows that contain at least one real item value. Skip blank separator/total/empty lines. Do not invent values; leave unreadable cells empty.',
        { 
          invoice_no: '', date: '', eway_no: '', eway_date: '', lr_no: '', vehicle_no: '', ge_no: '', mrr_no: '', receipt_date: '', actual_weight: '', irn: '', ack_no: '', ack_date: '', 
          bill_to: { name_address: '', state: '', gstin: '', state_code: '' },
          totals: { gross_amount: '', insurance: 0, taxable_gst: '', cgst_pct: 9, sgst_pct: 9, round_off: 0 },
          goods: [blankInvoiceRow()] 
        }
      );
      data = mergeFocusedInvoiceData(data, focused);
    } catch {
    }

    try {
      const focusedSupplier = await fetchGeminiStructured(
        mediaItems,
        'Extract only seller/supplier party details from this document. Supplier means the company issuing the invoice (usually top header company name), not buyer/consignee/delivery party. Return supplier_name, supplier_state, supplier_state_code, supplier_gstin. If unsure, leave empty.',
        { supplier_name: '', supplier_state: '', supplier_state_code: '', supplier_gstin: '' }
      );
      data = {
        ...data,
        supplier_name: focusedSupplier?.supplier_name || data?.supplier_name || '',
        supplier_state: focusedSupplier?.supplier_state || data?.supplier_state || '',
        supplier_state_code: focusedSupplier?.supplier_state_code || data?.supplier_state_code || '',
        supplier_gstin: focusedSupplier?.supplier_gstin || data?.supplier_gstin || ''
      };
    } catch {
    }
  }

  if (kind === 'packing') {
    try {
      const focusedMeta = await fetchGeminiStructured(
        mediaItems,
        'Focus on the full packing slip context outside the main item table across all pages. Extract header/company block, document title, challan number, challan date, order date, L.R. No, L.R. date, GE No, MRR No, date of receipt, truck/vehicle number, actual total, total reels, total weight, carrier, distributor, consignee block, buyer block, intro line, received-by/footer labels, approval text, signatory label, and any useful extra context text. Read exactly what is visible and do not invent values. Keep dates in YYYY-MM-DD where possible.',
        {
          header: { brand_box: '', title: '', works: '', meta: '', contact: '', gstin: '', extra_lines: [], note: '' },
          doc_title: '',
          challan_no: '',
          date: '',
          order_date: '',
          lr_no: '',
          lr_date: '',
          ge_no: '',
          mrr_no: '',
          receipt_date: '',
          truck_no: '',
          actual_total: '',
          carrier: '',
          distributor: '',
          consignee: { name_address: '', gstin: '', state: '' },
          buyer: { name_address: '', gstin: '', state: '' },
          intro_line: '',
          total_reels: '',
          total_weight: '',
          receiver_label: '',
          signer_name: '',
          approval_text: '',
          signatory_label: '',
          extra_details: ''
        }
      );
      data = mergeFocusedPackingData(data, focusedMeta);
    } catch {
    }

    if (needsPackingRowRetry(data.items) || !ensureRows(data.items).length) {
      try {
        const focused = await fetchGeminiStructured(
          mediaItems,
          'Focus only on the packing slip item table across all pages. Read every visible row cell-by-cell in row order and extract item_name, supplier_reel_no, reel_no, sort_no, party_order, bf, gsm, size, unit, net_wt, mrr_no, ge_no, po_no, po_details, and rate for each row. Supplier reel number must come from the image. Preserve row order. Return only real item rows; skip blank lines, total/subtotal rows, signature/footer lines, and rows that have only repeated MRR/GE values with no item data. Do not invent values. Leave unreadable cells empty.',
          { items: [blankPackingRow()] }
        );
        data = mergeFocusedPackingData(data, focused);
      } catch {
      }
    }
  }

  if (kind === 'packing') {
    try {
      const focusedInvoiceData = await fetchGeminiStructured(
        mediaItems,
        'If this packing slip has an embedded invoice or MRR reference section with supplier/seller details, extract: supplier name (bill_to.name_address), state name (bill_to.state), GSTIN (bill_to.gstin), gross amount, invoice/MRR basic value, and any tax or total information. If no invoice section is visible on this packing slip, return empty fields.',
        { 
          bill_to: { name_address: '', state: '', gstin: '', state_code: '' },
          totals: { gross_amount: '', insurance: 0, taxable_gst: '', cgst_pct: 9, sgst_pct: 9, round_off: 0 }
        }
      );
      data = mergeFocusedPackingInvoiceData(data, focusedInvoiceData);
    } catch {
    }
  }

  return data;
}

function mergeFocusedPackingInvoiceData(data, focused = {}) {
  const focusedParty = focused?.bill_to || {};
  const focusedTotals = focused?.totals || {};
  return {
    ...data,
    bill_to: {
      ...(data?.bill_to || {}),
      name_address: extractSupplierName(focusedParty.name_address || data?.bill_to?.name_address || ''),
      state: extractStateName(focusedParty.state || data?.bill_to?.state || ''),
      state_code: focusedParty.state_code || data?.bill_to?.state_code || String(focusedParty.state || data?.bill_to?.state || '').match(/\b\d{2}\b/)?.[0] || '',
      gstin: cleanSingleLineText(focusedParty.gstin || data?.bill_to?.gstin || '')
    },
    totals: {
      ...(data?.totals || {}),
      gross_amount: data.totals?.gross_amount || focusedTotals.gross_amount || '',
      insurance: data.totals?.insurance || focusedTotals.insurance || 0,
      taxable_gst: data.totals?.taxable_gst || focusedTotals.taxable_gst || '',
      cgst_pct: data.totals?.cgst_pct || focusedTotals.cgst_pct || 9,
      sgst_pct: data.totals?.sgst_pct || focusedTotals.sgst_pct || 9,
      round_off: data.totals?.round_off || focusedTotals.round_off || 0
    }
  };
}

function getFirmCode(firm) {
  return String(firm?.name || firm?.id || 'GE').trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '');
}

function parseDisplayDate(value) {
  const text = String(value || '').trim();
  if (!text) return new Date();
  const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    return new Date(year, month, day);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getFinancialYearLabel(value) {
  const date = parseDisplayDate(value);
  const fyStart = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
}

function formatGateEntryNumber(firm, dateValue, sequence) {
  const safeSequence = String(Number(sequence) || 0).padStart(4, '0');
  return `${getFirmCode(firm)}/${getFinancialYearLabel(dateValue)}/${safeSequence}`;
}

function shouldAutoNumber(value) {
  const text = String(value || '').trim();
  return !text || text === '0' || text === '1' || /^\d+$/.test(text);
}

function getGateEntryNo(data) {
  const source = data && typeof data === 'object' ? data : {};
  return String(source.ge_no || source.ge_entry || source.ge_entry_no || '').trim();
}

function getMrrNo(data) {
  const source = data && typeof data === 'object' ? data : {};
  return String(source.mrr_no || source.mrr_number || '').trim();
}

function normalizeGeRow(data = {}) {
  if (Array.isArray(data)) {
    return {
      timestamp: String(data[0] || '').trim(),
      date: String(data[1] || '').trim(),
      ge_no: String(data[2] || '').trim(),
      ge_entry: String(data[2] || '').trim(),
      supplier: String(data[3] || '').trim(),
      supplier_name: String(data[3] || '').trim(),
      invoice_no: String(data[4] || '').trim(),
      total_value: String(data[5] || '').trim(),
      truck_no: String(data[6] || '').trim(),
      pic1: String(data[7] || '').trim(),
      pic2: String(data[8] || '').trim(),
      pic3: String(data[9] || '').trim(),
      pic4: String(data[10] || '').trim(),
      pic5: String(data[11] || '').trim(),
      pic6: String(data[12] || '').trim(),
      pic7: String(data[13] || '').trim(),
      pic8: String(data[14] || '').trim(),
      mrr: String(data[15] || '').trim(),
      mrr_complete: String(data[16] || '').trim()
    };
  }

  const source = data && typeof data === 'object' ? data : {};
  const geNo = String(
    source.ge_no ||
    source.ge_entry ||
    source.ge_entry_no ||
    source['GE Entry'] ||
    ''
  ).trim();
  const supplier = String(
    source.supplier ||
    source.supplier_name ||
    source['Supplier Name'] ||
    ''
  ).trim();

  return {
    ...source,
    timestamp: String(source.timestamp || source.Timestamp || '').trim(),
    date: String(source.date || source.Date || '').trim(),
    ge_no: geNo,
    ge_entry: geNo,
    supplier,
    supplier_name: supplier,
    invoice_no: String(source.invoice_no || source['Invoice No'] || '').trim(),
    total_value: String(source.total_value || source.total_invocie_value || source['Total Invocie Value'] || '').trim(),
    truck_no: String(source.truck_no || source['Truck No'] || '').trim(),
    pic1: String(source.pic1 || source.pic_1 || source['Pic 1'] || '').trim(),
    pic2: String(source.pic2 || source.pic_2 || source['Pic 2'] || '').trim(),
    pic3: String(source.pic3 || source.pic_3 || source['Pic 3'] || '').trim(),
    pic4: String(source.pic4 || source.pic_4 || source['Pic 4'] || '').trim(),
    pic5: String(source.pic5 || source.pic_5 || source['Pic 5'] || '').trim(),
    pic6: String(source.pic6 || source.pic_6 || source['Pic 6'] || '').trim(),
    pic7: String(source.pic7 || source.pic_7 || source['Pic 7'] || '').trim(),
    pic8: String(source.pic8 || source.pic_8 || source['Pic 8'] || '').trim(),
    mrr: String(source.mrr || source.MRR || '').trim(),
    mrr_complete: String(source.mrr_complete || source['MRR COMPLETE'] || '').trim()
  };
}

function normalizeGateEntryInitialData(initialData, geNo, defaultDate) {
  const source = initialData || {};
  return {
    supplier: source.supplier || source.supplier_name || '',
    po_no: source.po_no || source.poNo || source.po_number || '',
    invoice_no: source.invoice_no || '',
    total_value: source.total_value || source.total_invocie_value || '',
    truck_no: source.truck_no || source.vehicle_no || '',
    ge_no: getGateEntryNo(source) || geNo || '',
    mrr_no: getMrrNo(source) || '',
    date: source.date || defaultDate
  };
}

function combineUniqueRows(rows = [], makeBlankRow) {
  const seen = new Set();
  return ensureRows(rows)
    .map((row) => merge(typeof makeBlankRow === 'function' ? makeBlankRow() : {}, row || {}))
    .filter((row) => Object.values(row || {}).some((value) => isMeaningful(value)))
    .filter((row) => {
      // Create a more robust key using only meaningful, identifying fields
      // to allow merging rows that are slightly different but represent the same physical item
      const identifyingValues = [
        String(row.description || row.item_name || '').trim().toLowerCase(),
        String(row.reel_no || row.supplier_reel_no || '').trim().toLowerCase(),
        String(row.sort_no || '').trim().toLowerCase(),
        String(row.party_order || '').trim().toLowerCase(),
        String(row.gsm || '').trim().toLowerCase(),
        String(row.size || '').trim().toLowerCase(),
        String(row.weight || row.net_wt || '').trim().toLowerCase()
      ];
      const key = identifyingValues.join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function combineInvoiceScanResults(results = []) {
  const normalized = results.map((entry) => normalizeInvoice(entry || {})).filter(Boolean);
  if (!normalized.length) return normalizeInvoice({});
  const base = normalized.reduce((acc, item) => ({
    ...acc,
    ...item,
    invoice_no: acc.invoice_no || item.invoice_no || '',
    date: acc.date || item.date || '',
    eway_no: acc.eway_no || item.eway_no || '',
    eway_date: acc.eway_date || item.eway_date || '',
    lr_no: acc.lr_no || item.lr_no || '',
    vehicle_no: acc.vehicle_no || item.vehicle_no || '',
    ge_no: acc.ge_no || item.ge_no || '',
    mrr_no: acc.mrr_no || item.mrr_no || '',
    receipt_date: acc.receipt_date || item.receipt_date || '',
    actual_weight: acc.actual_weight || item.actual_weight || '',
    actual_mrr_weight: acc.actual_mrr_weight || item.actual_mrr_weight || '',
    supplier_name: acc.supplier_name || item.supplier_name || '',
    supplier_state: acc.supplier_state || item.supplier_state || '',
    supplier_state_code: acc.supplier_state_code || item.supplier_state_code || '',
    supplier_gstin: acc.supplier_gstin || item.supplier_gstin || '',
    bill_to: merge(acc.bill_to || {}, item.bill_to || {}),
    totals: {
      ...(acc.totals || {}),
      ...(item.totals || {}),
      gross_amount: acc.totals?.gross_amount || item.totals?.gross_amount || '',
      insurance: acc.totals?.insurance || item.totals?.insurance || 0,
      taxable_gst: acc.totals?.taxable_gst || item.totals?.taxable_gst || '',
      cgst_pct: acc.totals?.cgst_pct || item.totals?.cgst_pct || 9,
      sgst_pct: acc.totals?.sgst_pct || item.totals?.sgst_pct || 9,
      round_off: acc.totals?.round_off || item.totals?.round_off || 0
    }
  }), normalizeInvoice({}));
  return normalizeInvoice({
    ...base,
    goods: combineUniqueRows(normalized.flatMap((item) => item.goods || []), blankInvoiceRow)
  });
}

function combinePackingScanResults(results = []) {
  const normalized = results.map((entry) => normalizePacking(entry || {})).filter(Boolean);
  if (!normalized.length) return normalizePacking({});
  const base = normalized.reduce((acc, item) => ({
    ...acc,
    ...item,
    intro_line: acc.intro_line || item.intro_line || '',
    ge_no: acc.ge_no || item.ge_no || '',
    mrr_no: acc.mrr_no || item.mrr_no || '',
    receipt_date: acc.receipt_date || item.receipt_date || '',
    truck_no: acc.truck_no || item.truck_no || '',
    actual_total: acc.actual_total || item.actual_total || '',
    total_reels: acc.total_reels || item.total_reels || '',
    total_weight: acc.total_weight || item.total_weight || '',
    receiver_label: acc.receiver_label || item.receiver_label || '',
    signer_name: acc.signer_name || item.signer_name || '',
    approval_text: acc.approval_text || item.approval_text || '',
    signatory_label: acc.signatory_label || item.signatory_label || '',
    buyer: merge(acc.buyer || {}, item.buyer || {}),
    totals: merge(acc.totals || {}, item.totals || {})
  }), normalizePacking({}));
  return normalizePacking({
    ...base,
    items: combineUniqueRows(normalized.flatMap((item) => item.items || []), blankPackingRow)
  });
}

function formatDecimal2(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const num = Number(text.replace(/,/g, ''));
  return Number.isFinite(num) ? num.toFixed(2) : text;
}

let jsPdfLoaderPromise = null;

function ensureJsPdfLoaded_() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPdfLoaderPromise) return jsPdfLoaderPromise;

  jsPdfLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF loaded but not available on window.'));
    };
    script.onerror = () => reject(new Error('Could not load jsPDF library.'));
    document.head.appendChild(script);
  });

  return jsPdfLoaderPromise;
}

function fileSafeName_(value) {
  return String(value || 'gate-entry').replace(/[^\w.-]+/g, '_');
}

async function toDataUrlIfPossible_(url) {
  const text = String(url || '').trim();
  if (!text) return '';
  if (/^data:/i.test(text)) return text;
  try {
    const res = await fetch(text, { mode: 'cors' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

async function downloadGateEntryPdfDirect(firm, entry, previewPics = []) {
  try {
    const jsPDFClass = await ensureJsPdfLoaded_();
    const pdf = new jsPDFClass({ orientation: 'p', unit: 'pt', format: 'a4' });

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 36;
    let y = margin;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('GATE ENTRY', pageWidth / 2, y, { align: 'center' });
    y += 22;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(firm?.name || ''), pageWidth / 2, y, { align: 'center' });
    y += 24;

    pdf.setDrawColor(180);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 18;

    const fields = [
      ['GE Entry No', entry?.ge_no || ''],
      ['MRR No', entry?.mrr_no || entry?.mrr_number || ''],
      ['Date', entry?.date || ''],
      ['Supplier Name', entry?.supplier || ''],
      ['Invoice No', entry?.invoice_no || ''],
      ['Invoice Value', formatDecimal2(entry?.total_value || '')],
      ['Truck', entry?.truck_no || '']
    ];

    fields.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(`${label}:`, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(value || ''), margin + 110, y);
      y += 18;
    });

    const pictures = (previewPics || []).filter(Boolean);
    if (pictures.length) {
      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('ATTACHED PHOTOS', margin, y);
      y += 12;
      pdf.line(margin, y, pageWidth - margin, y);
      y += 12;

      const colGap = 12;
      const boxW = (pageWidth - margin * 2 - colGap) / 2;
      const boxH = 140;
      let col = 0;

      for (let i = 0; i < pictures.length; i += 1) {
        const dataUrl = await toDataUrlIfPossible_(pictures[i]);
        if (!dataUrl) continue;

        const x = margin + col * (boxW + colGap);
        if (y + boxH > pageHeight - margin - 26) {
          pdf.addPage();
          y = margin;
        }

        try {
          const format = /data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG';
          pdf.addImage(dataUrl, format, x, y, boxW, boxH, undefined, 'FAST');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(`Pic ${i + 1}`, x, y + boxH + 10);
        } catch {
          // Skip invalid image content silently
        }

        col = col ? 0 : 1;
        if (col === 0) y += boxH + 18;
      }
    }

    const fileName = `${fileSafeName_(entry?.ge_no || 'gate-entry')}.pdf`;
    pdf.save(fileName);
  } catch (err) {
    alert((err && err.message) ? err.message : 'Could not download PDF.');
  }
}

function getOverlayBootStep(menuBootConfig, isAuthenticated, initialFirm = null) {
  const currentPath = normalizeAppPath(getCurrentPathname());
  if (!menuBootConfig?.token) {
    if (currentPath === APP_ROUTES.geentry) return 4;
    if (currentPath === APP_ROUTES.labels) return 5;
    if (currentPath === APP_ROUTES.approvals) return 6;
    if (currentPath === APP_ROUTES.reports) return 7;
    if (currentPath === APP_ROUTES.dashboard || currentPath === APP_ROUTES.mrr) return isAuthenticated ? 3 : 1;
    if (currentPath === APP_ROUTES.firms) return isAuthenticated ? 2 : 1;
    if (currentPath === APP_ROUTES.login) return 1;
  }
  if (menuBootConfig?.token && isAuthenticated) {
    if (menuBootConfig.view === 'label') return 5;
    if (menuBootConfig.view === 'all_approvals') return 6;
    if (menuBootConfig.view === 'pending_list') return 6;
    if (menuBootConfig.view === 'review_mrr') return 7;
    return 3;
  }
  if (isAuthenticated && initialFirm) return 3;
  return isAuthenticated ? 2 : 1;
}

const DEFAULT_MASTER_LOGIN_IDS = new Set(['system', 'system@lngrp', 'system@lngrp.in']);
const DEFAULT_MASTER_PASSWORD = 'abcd';

function isDefaultMasterLogin(loginId, password) {
  return DEFAULT_MASTER_LOGIN_IDS.has(String(loginId || '').trim().toLowerCase())
    && String(password || '') === DEFAULT_MASTER_PASSWORD;
}

function StartupOverlay({ onSelect, onGeSubmit, onLogin, onLogout, onRememberSelection, currentUser, firms, menuBootConfig, isAuthenticated, initialFirm = null, initialType = 'reel', onRouteChange }) {
  const [step, setStep] = useState(() => getOverlayBootStep(menuBootConfig, isAuthenticated, initialFirm));
  const [tempFirm, setTempFirm] = useState(initialFirm);
  const [tempType, setTempType] = useState(initialType || 'reel');
  const [pendingGEs, setPendingGEs] = useState([]);  const [editMrrRows, setEditMrrRows] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingEditMrr, setIsLoadingEditMrr] = useState(false);
  const [approvingPendingKey, setApprovingPendingKey] = useState('');
  const [isBulkApprovingPending, setIsBulkApprovingPending] = useState(false);
  const [editData, setEditData] = useState(null);
  const [pendingFilter, setPendingFilter] = useState('pending_mrr');
  const [reportFilter, setReportFilter] = useState('all'); // 'all' or 'pending'
  const [reportSearch, setReportSearch] = useState('');
  const [allApprovalsStage, setAllApprovalsStage] = useState('pending_plant_head_approval');  const [allApprovalsFirmFilter, setAllApprovalsFirmFilter] = useState('all');
  const [selectedGroupedApprovalKeys, setSelectedGroupedApprovalKeys] = useState({});
  const [groupedAccountsApprovalDrafts, setGroupedAccountsApprovalDrafts] = useState({});
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [validatedUsersByFirm, setValidatedUsersByFirm] = useState({});
  const [previewAllRows, setPreviewAllRows] = useState([]);
  const [isLoadingPreviewAll, setIsLoadingPreviewAll] = useState(false);
  const [isPreparingLabels, setIsPreparingLabels] = useState(false);
  const [directLabelPrintJob, setDirectLabelPrintJob] = useState(null);
  const [labelInitialMrr, setLabelInitialMrr] = useState('');
  const [allApprovalRows, setAllApprovalRows] = useState([]);
  const [isLoadingAllApprovals, setIsLoadingAllApprovals] = useState(false);
  const [, setApprovalPrefetchTick] = useState(0);
  const approvalPrefetchCacheRef = useRef(new Map());
  const approvalPrefetchRunRef = useRef(0);
  const pendingListCacheRef = useRef(new Map());
  const editMrrCacheRef = useRef(new Map());
  const allApprovalsCacheRef = useRef({ key: '', rows: [] });
  const safeEditData = editData && typeof editData === 'object' ? editData : null;

  const pendingCounts = useMemo(() => ({
    pending_mrr: pendingGEs.filter((item) => item.pending_stage === 'pending_mrr').length,
    edit_mrr: editMrrRows.length,
    pending_plant_head_approval: pendingGEs.filter((item) => item.pending_stage === 'pending_plant_head_approval').length,
    pending_accounts_approval: pendingGEs.filter((item) => item.pending_stage === 'pending_accounts_approval').length,
    pending_md_approval: pendingGEs.filter((item) => item.pending_stage === 'pending_md_approval').length,
    pending_tally_posting: pendingGEs.filter((item) => item.pending_stage === 'pending_tally_posting').length,
    edit_ge_entry: pendingGEs.filter((item) => item.pending_stage === 'pending_mrr').length,
    all_approvals: allApprovalRows.length
  }), [pendingGEs, editMrrRows, allApprovalRows]);

  const filteredPendingGEs = useMemo(
    () => pendingFilter === 'edit_ge_entry' || pendingFilter === 'edit_mrr'
      ? pendingGEs.filter((item) => item.pending_stage === 'pending_mrr')
      : pendingGEs.filter((item) => item.pending_stage === pendingFilter),
    [pendingGEs, pendingFilter]
  );
  const displayedRows = pendingFilter === 'all_approvals'
    ? allApprovalRows
    : pendingFilter === 'edit_mrr'
      ? editMrrRows
      : filteredPendingGEs;
  const filteredAllApprovalRows = useMemo(
    () => allApprovalsFirmFilter === 'all'
      ? allApprovalRows
      : allApprovalRows.filter((row) => String(row.firm_id || '').trim() === String(allApprovalsFirmFilter || '').trim()),
    [allApprovalRows, allApprovalsFirmFilter]
  );
  const groupedApprovalFirmOptions = useMemo(() => {
    const seen = new Map();
    allApprovalRows.forEach((row) => {
      const id = String(row.firm_id || '').trim();
      const name = String(row.firm_name || '').trim();
      if (!id || !name || seen.has(id)) return;
      seen.set(id, { id, name });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [allApprovalRows]);
  const pendingTableStyle = { width: '100%', tableLayout: 'fixed' };
  const pendingHeaderCellStyle = { fontSize: '15px', background: '#d1d5db', color: '#111', fontWeight: 700, padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' };
  const pendingBodyCellStyle = { fontSize: '12px', color: '#111', padding: '10px 10px', verticalAlign: 'top' };
  const groupedCheckboxHeaderStyle = { ...pendingHeaderCellStyle, width: '3%', minWidth: '36px' };
  const groupedCheckboxCellStyle = { ...pendingBodyCellStyle, width: '3%', textAlign: 'center', verticalAlign: 'middle' };
  const groupedIdHeaderStyle = { ...pendingHeaderCellStyle, width: '5.5%', minWidth: '72px' };
  const groupedIdCellStyle = { ...pendingBodyCellStyle, width: '5.5%', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.35 };
  const groupedFirmCellStyle = { ...pendingBodyCellStyle, width: '7%', maxWidth: '120px', wordBreak: 'break-word' };
  const groupedFirmHeaderStyle = { ...pendingHeaderCellStyle, width: '7%' };
  const groupedSupplierCellStyle = { ...pendingBodyCellStyle, width: '10%', maxWidth: '170px', wordBreak: 'break-word' };
  const groupedSupplierHeaderStyle = { ...pendingHeaderCellStyle, width: '10%' };
  const groupedQtyHeaderStyle = { ...pendingHeaderCellStyle, width: '4%', minWidth: '52px' };
  const groupedQtyCellStyle = { ...pendingBodyCellStyle, width: '4%', textAlign: 'center' };
  const groupedItemsCellStyle = { ...pendingBodyCellStyle, width: '17%', minWidth: '220px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedItemsHeaderStyle = { ...pendingHeaderCellStyle, width: '17%' };
  const groupedWeightCellStyle = { ...pendingBodyCellStyle, width: '6%', minWidth: '72px', whiteSpace: 'normal', verticalAlign: 'top', lineHeight: 1.35, textAlign: 'right', wordBreak: 'break-word' };
  const groupedWeightHeaderStyle = { ...pendingHeaderCellStyle, width: '6%', minWidth: '72px' };
  const groupedDiffCellStyle = { ...pendingBodyCellStyle, width: '6%', minWidth: '72px', whiteSpace: 'normal', verticalAlign: 'top', lineHeight: 1.35, textAlign: 'right', wordBreak: 'break-word' };
  const groupedDiffHeaderStyle = { ...pendingHeaderCellStyle, width: '6%', minWidth: '72px' };
  const groupedPoRateCellStyle = { ...pendingBodyCellStyle, width: '6%', minWidth: '72px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedPoRateHeaderStyle = { ...pendingHeaderCellStyle, width: '6%', minWidth: '72px' };
  const groupedInvoiceRateCellStyle = { ...pendingBodyCellStyle, width: '6%', minWidth: '72px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedInvoiceRateHeaderStyle = { ...pendingHeaderCellStyle, width: '6%', minWidth: '72px' };
  const groupedBasicValueCellStyle = { ...pendingBodyCellStyle, width: '7%', minWidth: '78px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedBasicValueHeaderStyle = { ...pendingHeaderCellStyle, width: '7%', minWidth: '78px' };
  const groupedRemarkCellStyle = { ...pendingBodyCellStyle, width: '8%', minWidth: '120px', whiteSpace: 'pre-line', lineHeight: 1.35, wordBreak: 'break-word' };
  const groupedRemarkHeaderStyle = { ...pendingHeaderCellStyle, width: '8%', minWidth: '120px' };
  const groupedActionHeaderStyle = { ...pendingHeaderCellStyle, width: '11%', minWidth: '180px' };
  const groupedActionCellStyle = { ...pendingBodyCellStyle, width: '11%', minWidth: '180px' };
  const groupedActionHeaderWideStyle = { ...pendingHeaderCellStyle, width: '16%', minWidth: '220px' };
  const groupedActionCellWideStyle = { ...pendingBodyCellStyle, width: '16%', minWidth: '220px' };

  const getGroupedApprovalRowKey = (row) => [
    String(row?.firm_id || '').trim(),
    String(row?.mrr_type || '').trim(),
    String(row?.pending_stage || '').trim(),
    String(row?.mrr_number || row?.mrr_no || '').trim(),
    String(row?.ge_no || row?.ge_entry || '').trim()
  ].join('|');
  const isAnyPendingApproval = isBulkApprovingPending || !!approvingPendingKey;
  const getGroupedApprovalInvoiceWeight = (row) => firstFilled(
    row?.actual_weight,
    row?.invoice_ttl_weight_kgs,
    row?.invoice_weight,
    row?.inv_weight,
    ''
  );
  const getGroupedApprovalActualWeight = (row) => firstFilled(
    row?.actual_mrr_weight,
    row?.actual_mrr_ttl_weight_kgs,
    row?.packing_weight,
    row?.actual_total,
    ''
  );
  const getGroupedApprovalWeightDifference = (row) => Math.abs(n(getGroupedApprovalInvoiceWeight(row)) - n(getGroupedApprovalActualWeight(row)));
  const formatGroupedApprovalWeight = (value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return '-';
    return formatDecimal2(normalized) || normalized;
  };
  const isReelMrrType = (value) => String(value || '').trim().toLowerCase() === 'reel';
  const isOtherMrrEntryTypeRejection = (value) => String(value || '').trim().toLowerCase() === 'rejection';
  const isGroupedApprovalDebitNoteRequired = (row) => (
    String(row?.pending_stage || '').trim() === 'pending_accounts_approval' &&
    (
      (isReelMrrType(row?.mrr_type) && getGroupedApprovalWeightDifference(row) > 40) ||
      (String(row?.mrr_type || '').trim().toLowerCase() === 'other' && isOtherMrrEntryTypeRejection(row?.mrr_entry_type))
    )
  );
  const getGroupedApprovalDraft = (row) => {
    const rowKey = getGroupedApprovalRowKey(row);
    const existing = groupedAccountsApprovalDrafts[rowKey] || {};
    return {
      plant_head_remark: existing.plant_head_remark ?? String(row?.plant_head_remark || '').trim(),
      accounts_remark: existing.accounts_remark ?? String(row?.accounts_remark || '').trim(),
      debit_note: existing.debit_note ?? String(row?.debit_note || '').trim(),
      debit_note_date: existing.debit_note_date ?? String(row?.debit_note_date || '').trim(),
      debit_note_amount: existing.debit_note_amount ?? String(row?.debit_note_amount || '').trim(),
      md_approval_remark: existing.md_approval_remark ?? String(row?.md_approval_remark || '').trim()
    };
  };
  const setGroupedApprovalDraftField = (row, field, value) => {
    const rowKey = getGroupedApprovalRowKey(row);
    setGroupedAccountsApprovalDrafts((prev) => {
      const current = prev[rowKey] || {};
      return {
        ...prev,
        [rowKey]: {
          plant_head_remark: current.plant_head_remark ?? String(row?.plant_head_remark || '').trim(),
          accounts_remark: current.accounts_remark ?? String(row?.accounts_remark || '').trim(),
          debit_note: current.debit_note ?? String(row?.debit_note || '').trim(),
          debit_note_date: current.debit_note_date ?? String(row?.debit_note_date || '').trim(),
          debit_note_amount: current.debit_note_amount ?? String(row?.debit_note_amount || '').trim(),
          md_approval_remark: current.md_approval_remark ?? String(row?.md_approval_remark || '').trim(),
          [field]: value
        }
      };
    });
  };

  const getGroupedApprovalTotalQty = (row) => firstFilled(
    row?.required_reel,
    row?.quantity,
    row?.po_quantity,
    row?.reels,
    row?.rows_added,
    ''
  );

  const getGroupedApprovalItems = (row) => {
    const rowType = String(row?.mrr_type || '').trim().toLowerCase();
    const mrrNumber = String(row?.mrr_number || row?.mrr_no || '').trim().toUpperCase();
    const cacheKey = buildApprovalPrefetchKey(row, row?.firm_id || '', rowType || 'reel');
    const cached = approvalPrefetchCacheRef.current.get(cacheKey)?.data;
    const helperRows = Array.isArray(cached?.helperRows) ? cached.helperRows : [];
    const helperItems = rowType === 'reel'
      ? uniqueText(
          helperRows
            .filter((helperRow) => {
              const helperMrr = String(
                helperRow?.mrr_number ||
                helperRow?.mrr_no ||
                helperRow?.['MRR No'] ||
                helperRow?.['mrr_no.'] ||
                ''
              ).trim().toUpperCase();
              if (mrrNumber && helperMrr && helperMrr !== mrrNumber) return false;
              const itemText = firstFilled(
                helperRow?.item_name,
                helperRow?.reel_details,
                helperRow?.po_details,
                helperRow?.description,
                ''
              );
              return itemText && !isTotalLikeText(itemText);
            })
            .map((helperRow) => firstFilled(
              helperRow?.item_name,
              helperRow?.reel_details,
              helperRow?.po_details,
              helperRow?.description,
              ''
            ))
            .filter(Boolean)
        )
      : [];

    if (helperItems.length) return helperItems.map((item, index) => `${index + 1}. ${item}`).join('\n');

    return firstFilled(
      rowType === 'reel' ? row?.helper_item_name : '',
      row?.po_details,
      row?.helper_po_details,
      row?.description,
      row?.reel_details,
      row?.item_name,
      row?.rows_added,
      ''
    );
  };

  const getGroupedApprovalPoRate = (row) => {
    const rowType = String(row?.mrr_type || '').trim().toLowerCase();
    const mrrNumber = String(row?.mrr_number || row?.mrr_no || '').trim().toUpperCase();
    const cacheKey = buildApprovalPrefetchKey(row, row?.firm_id || '', rowType || 'reel');
    const cached = approvalPrefetchCacheRef.current.get(cacheKey)?.data;
    const helperRows = Array.isArray(cached?.helperRows) ? cached.helperRows : [];
    const helperRates = rowType === 'reel'
      ? helperRows
          .filter((helperRow) => {
            const helperMrr = String(
              helperRow?.mrr_number ||
              helperRow?.mrr_no ||
              helperRow?.['MRR No'] ||
              helperRow?.['mrr_no.'] ||
              ''
            ).trim().toUpperCase();
            if (mrrNumber && helperMrr && helperMrr !== mrrNumber) return false;
            const itemText = firstFilled(
              helperRow?.item_name,
              helperRow?.reel_details,
              helperRow?.po_details,
              helperRow?.description,
              ''
            );
            return itemText && !isTotalLikeText(itemText);
          })
          .map((helperRow, index) => {
            const rateText = String(firstFilled(
              helperRow?.po_rate,
              helperRow?.['PO RATE'],
              helperRow?.rate,
              helperRow?.['Rate'],
              row?.helper_po_rate,
              ''
            )).trim();
            return rateText ? `${index + 1}. ${formatDecimal2(rateText) || rateText}` : '';
          })
          .filter(Boolean)
      : [];

    if (helperRates.length) return helperRates.join('\n');

    const resolvedRate = firstFilled(
      row?.helper_po_rate,
      row?.po_rate,
      ''
    );

    return formatDecimal2(resolvedRate);
  };
  const getGroupedApprovalInvoiceRate = (row) => {
    const rowType = String(row?.mrr_type || '').trim().toLowerCase();
    const mrrNumber = String(row?.mrr_number || row?.mrr_no || '').trim().toUpperCase();
    const cacheKey = buildApprovalPrefetchKey(row, row?.firm_id || '', rowType || 'reel');
    const cached = approvalPrefetchCacheRef.current.get(cacheKey)?.data;
    const helperRows = Array.isArray(cached?.helperRows) ? cached.helperRows : [];
    const helperRates = rowType === 'reel'
      ? helperRows
          .filter((helperRow) => {
            const helperMrr = String(
              helperRow?.mrr_number ||
              helperRow?.mrr_no ||
              helperRow?.['MRR No'] ||
              helperRow?.['mrr_no.'] ||
              ''
            ).trim().toUpperCase();
            if (mrrNumber && helperMrr && helperMrr !== mrrNumber) return false;
            const itemText = firstFilled(
              helperRow?.item_name,
              helperRow?.reel_details,
              helperRow?.po_details,
              helperRow?.description,
              ''
            );
            return itemText && !isTotalLikeText(itemText);
          })
          .map((helperRow, index) => {
            const rateText = String(firstFilled(
              helperRow?.rate,
              helperRow?.['Rate'],
              helperRow?.invoice_rate,
              row?.rate,
              row?.invoice_rate,
              ''
            )).trim();
            return rateText ? `${index + 1}. ${formatDecimal2(rateText) || rateText}` : '';
          })
          .filter(Boolean)
      : [];

    if (helperRates.length) return helperRates.join('\n');

    return formatDecimal2(firstFilled(row?.rate, row?.invoice_rate, ''));
  };
  const getGroupedApprovalBasicValue = (row) => {
    const rowType = String(row?.mrr_type || '').trim().toLowerCase();
    const mrrNumber = String(row?.mrr_number || row?.mrr_no || '').trim().toUpperCase();
    const cacheKey = buildApprovalPrefetchKey(row, row?.firm_id || '', rowType || 'reel');
    const cached = approvalPrefetchCacheRef.current.get(cacheKey)?.data;
    const helperRows = Array.isArray(cached?.helperRows) ? cached.helperRows : [];
    const helperValues = rowType === 'reel'
      ? helperRows
          .filter((helperRow) => {
            const helperMrr = String(
              helperRow?.mrr_number ||
              helperRow?.mrr_no ||
              helperRow?.['MRR No'] ||
              helperRow?.['mrr_no.'] ||
              ''
            ).trim().toUpperCase();
            if (mrrNumber && helperMrr && helperMrr !== mrrNumber) return false;
            const itemText = firstFilled(
              helperRow?.item_name,
              helperRow?.reel_details,
              helperRow?.po_details,
              helperRow?.description,
              ''
            );
            return itemText && !isTotalLikeText(itemText);
          })
          .map((helperRow, index) => {
            const valueText = String(firstFilled(
              helperRow?.value,
              helperRow?.Value,
              helperRow?.amount,
              row?.amount,
              ''
            )).trim();
            return valueText ? `${index + 1}. ${formatDecimal2(valueText) || valueText}` : '';
          })
          .filter(Boolean)
      : [];

    if (helperValues.length) return helperValues.join('\n');

    return formatDecimal2(firstFilled(
      row?.invoice_basic_value,
      row?.total_value,
      row?.total_invocie_value,
      row?.mrr_basic_value,
      ''
    ));
  };

  const buildApprovalPrefetchKey = (item, firmId, type) => {
    return [
      firmId || item?.firm_id || '',
      type || item?.mrr_type || '',
      String(item?.mrr_number || item?.mrr_no || '').trim(),
      String(item?.ge_no || item?.ge_entry || '').trim()
    ].join('|');
  };

  const prefetchApprovalDataForItem = async (item, firmOverride = null, typeOverride = null) => {
    const targetFirm = firmOverride || firms.find((firm) => firm.id === item?.firm_id);
    const targetType = typeOverride || item?.mrr_type || 'reel';
    const mrrNumber = String(item?.mrr_number || item?.mrr_no || '').trim();
    if (!targetFirm || !mrrNumber) return null;

    const cacheKey = buildApprovalPrefetchKey(item, targetFirm.id, targetType);
    const existing = approvalPrefetchCacheRef.current.get(cacheKey);
    if (existing?.status === 'resolved') return existing.data;
    if (existing?.promise) return existing.promise;

    const entry = { status: 'pending', data: null, promise: null };
    const task = Promise.all([
      fetchSheetRangeWithParams({
        sheet: getSheetName(targetFirm.mrr, targetType),
        mrr_number: mrrNumber,
        ge_no: String(item?.ge_no || item?.ge_entry || '').trim(),
        spreadsheetId: targetFirm.spreadsheetId
      }, targetFirm.scriptUrl),
      fetchSheetRangeWithParams({
        sheet: getSheetName(targetFirm.helper, targetType),
        mrr_number: mrrNumber,
        ge_no: String(item?.ge_no || item?.ge_entry || '').trim(),
        spreadsheetId: targetFirm.spreadsheetId
      }, targetFirm.scriptUrl).catch(() => null)
    ]).then(([parentPayload, helperPayload]) => {
      entry.status = 'resolved';
      entry.data = {
        parentRows: Array.isArray(parentPayload?.data) ? parentPayload.data : [],
        helperRows: Array.isArray(helperPayload?.data) ? helperPayload.data : []
      };
      setApprovalPrefetchTick((prev) => prev + 1);
      return entry.data;
    }).catch((error) => {
      approvalPrefetchCacheRef.current.delete(cacheKey);
      throw error;
    });

    entry.promise = task;
    approvalPrefetchCacheRef.current.set(cacheKey, entry);
    return task;
  };

  const prefetchApprovalDataForRows = async (rows = [], limit = 4) => {
    const queue = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (!queue.length) return;
    const runId = Date.now();
    approvalPrefetchRunRef.current = runId;
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length && approvalPrefetchRunRef.current === runId) {
        const row = queue[cursor];
        cursor += 1;
        try {
          await prefetchApprovalDataForItem(row);
        } catch {
        }
      }
    };
    const workers = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, () => worker());
    await Promise.all(workers);
  };

  const loadPendingList = async (options = {}) => {
    if (!tempFirm) return;
    const cacheKey = [String(tempFirm.id || '').trim(), String(tempType || '').trim()].join('|');
    const useCache = options.force !== true;
    const cached = pendingListCacheRef.current.get(cacheKey);
    if (useCache && cached) {
      setPendingGEs(cached);
      return cached;
    }
    setIsLoadingPending(true);
    try {
      const mrrSheet = getSheetName(tempFirm.mrr, tempType);
      const helperSheet = getSheetName(tempFirm.helper, tempType);
      const list = await fetchPendingGeEntries(mrrSheet, tempFirm.spreadsheetId, tempFirm.scriptUrl, helperSheet);
      const next = list || [];
      pendingListCacheRef.current.set(cacheKey, next);
      setPendingGEs(next);
      return next;
    } catch (err) {
      console.error('Failed to load pending list:', err);
      return [];
    } finally {
      setIsLoadingPending(false);
    }
  };

  const loadAllApprovalsList = async (options = {}) => {
    if (!firms?.length) return;
    const cacheKey = firms
      .filter((firm) => String(firm?.spreadsheetId || '').trim() && String(firm?.scriptUrl || '').trim())
      .map((firm) => `${firm.id}:${firm.spreadsheetId}`)
      .sort()
      .join('|');
    const useCache = options.force !== true;
    if (useCache && allApprovalsCacheRef.current.key === cacheKey && Array.isArray(allApprovalsCacheRef.current.rows) && allApprovalsCacheRef.current.rows.length) {
      setAllApprovalRows(allApprovalsCacheRef.current.rows);
      return allApprovalsCacheRef.current.rows;
    }
    setIsLoadingAllApprovals(true);
    try {
      const stages = new Set(['pending_plant_head_approval', 'pending_accounts_approval', 'pending_md_approval']);
      const stageOrder = {
        pending_plant_head_approval: 1,
        pending_accounts_approval: 2,
        pending_md_approval: 3
      };
      const eligibleFirms = firms.filter((firm) => String(firm?.spreadsheetId || '').trim() && String(firm?.scriptUrl || '').trim());
      const tasks = eligibleFirms.flatMap((firm) => ['reel', 'other'].map(async (type) => {
        try {
          const mrrSheet = getSheetName(firm.mrr, type);
          const helperSheet = getSheetName(firm.helper, type);
          const list = await fetchPendingGeEntries(mrrSheet, firm.spreadsheetId, firm.scriptUrl, helperSheet);
          return (list || [])
            .filter((item) => stages.has(String(item.pending_stage || '').trim()))
            .map((item) => ({
              ...item,
              firm_id: firm.id,
              firm_name: firm.name,
              mrr_type: type,
              mrr_type_label: type === 'other' ? 'OTHER MRR' : 'REEL MRR'
            }));
        } catch {
          return [];
        }
      }));
      const merged = (await Promise.all(tasks)).flat();
      merged.sort((a, b) => {
        const orderA = Number(stageOrder[String(a.pending_stage || '').trim()] || 99);
        const orderB = Number(stageOrder[String(b.pending_stage || '').trim()] || 99);
        if (orderA !== orderB) return orderA - orderB;
        const firmCmp = String(a.firm_name || '').localeCompare(String(b.firm_name || ''), undefined, { sensitivity: 'base' });
        if (firmCmp !== 0) return firmCmp;
        return String(b.date || '').localeCompare(String(a.date || ''));
      });
      allApprovalsCacheRef.current = { key: cacheKey, rows: merged };
      setAllApprovalRows(merged);
      return merged;
    } finally {
      setIsLoadingAllApprovals(false);
    }
  };

  const loadEditMrrList = async (options = {}) => {
    if (!tempFirm) return;
    const cacheKey = [String(tempFirm.id || '').trim(), String(tempType || '').trim()].join('|');
    const useCache = options.force !== true;
    const cached = editMrrCacheRef.current.get(cacheKey);
    if (useCache && cached) {
      setEditMrrRows(cached);
      return cached;
    }
    setIsLoadingEditMrr(true);
    try {
      const mrrSheet = getSheetName(tempFirm.mrr, tempType);
      const payload = await fetchSheetRange(mrrSheet, tempFirm.spreadsheetId, tempFirm.scriptUrl);
      const values = Array.isArray(payload?.values) ? payload.values : [];
      if (!values.length) {
        setEditMrrRows([]);
        return;
      }

      const headers = Array.isArray(values[0]) ? values[0].map((h) => String(h || '').trim()) : [];
      const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      const readValue = (rowObj, candidates = []) => {
        const keys = Object.keys(rowObj || {});
        for (const candidate of candidates) {
          const direct = rowObj?.[candidate];
          if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
          const found = keys.find((key) => normalizeKey(key) === normalizeKey(candidate));
          if (!found) continue;
          const value = rowObj[found];
          if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
        }
        return '';
      };

      const rows = values.slice(1).map((cells) => {
        const rowObj = {};
        headers.forEach((header, idx) => {
          rowObj[header] = Array.isArray(cells) ? cells[idx] : '';
        });
        return rowObj;
      });

      const byMrr = new Map();
      rows.forEach((rowObj) => {
        const mrrNo = readValue(rowObj, ['MRR No', 'MRR Number', 'mrr_no', 'mrr_number']);
        const geNo = readValue(rowObj, ['GE Entry', 'GE No', 'ge_no', 'ge_entry']);
        if (!mrrNo) return;
        const recordKey = [String(geNo).trim(), String(mrrNo).trim()].join('|');
        byMrr.set(recordKey, {
          pending_stage: 'completed_mrr',
          force_load_saved: true,
          mrr_no: mrrNo,
          mrr_number: mrrNo,
          ge_no: geNo,
          ge_entry: geNo,
          date: readValue(rowObj, ['Date', 'date']),
          supplier: readValue(rowObj, ['SUPPLIER', 'supplier']),
          invoice_no: readValue(rowObj, ['Sup Doc No', 'Supplier Document No', 'sup_doc_no', 'invoice_no']),
          total_value: readValue(rowObj, ['INVOICE BASIC VALUE', 'invoice_basic_value']),
          truck_no: readValue(rowObj, ['Truck Number', 'truck_no', 'truck_number'])
        });
      });

      const uniqueRows = [...byMrr.values()].sort((a, b) =>
        String(b.mrr_number || '').localeCompare(String(a.mrr_number || ''), undefined, { numeric: true, sensitivity: 'base' })
      );
      editMrrCacheRef.current.set(cacheKey, uniqueRows);
      setEditMrrRows(uniqueRows);
      return uniqueRows;
    } catch (err) {
      console.error('Failed to load edit MRR list:', err);
      setEditMrrRows([]);
      return [];
    } finally {
      setIsLoadingEditMrr(false);
    }
  };

  const loadPreviewAllMrr = async () => {
    if (!firms?.length) return;
    setIsLoadingPreviewAll(true);
    try {
      const eligibleFirms = firms.filter((firm) => String(firm?.spreadsheetId || '').trim() && String(firm?.scriptUrl || '').trim());
      const payloads = await Promise.all(eligibleFirms.flatMap((firm) => ['reel', 'other'].map(async (type) => {
        try {
          const mrrSheet = getSheetName(firm.mrr, type);
          const payload = await fetchSheetRange(mrrSheet, firm.spreadsheetId, firm.scriptUrl);
          const values = Array.isArray(payload?.values) ? payload.values : [];
          return { firm, type, values };
        } catch {
          return { firm, type, values: [] };
        }
      })));

      let baseHeaders = [];
      const mergedRows = [];
      payloads.forEach(({ firm, type, values }) => {
        if (!Array.isArray(values) || !values.length) return;
        const headers = Array.isArray(values[0]) ? values[0].map((value) => String(value || '').trim()) : [];
        if (!headers.length) return;
        if (!baseHeaders.length) {
          baseHeaders = [...headers];
        } else {
          headers.forEach((header) => {
            if (!baseHeaders.includes(header)) baseHeaders.push(header);
          });
        }
        values.slice(1).forEach((row) => {
          const rowMap = new Map(headers.map((header, index) => [header, Array.isArray(row) ? (row[index] ?? '') : '']));
          mergedRows.push([
            firm.name,
            firm.id,
            type === 'other' ? 'OTHER MRR' : 'REEL MRR',
            ...baseHeaders.map((header) => rowMap.get(header) ?? '')
          ]);
        });
      });

      if (!baseHeaders.length) {
        setPreviewAllRows([]);
        return;
      }

      const dateHeaderIndex = baseHeaders.findIndex((header) => {
        const normalized = String(header || '').trim().toLowerCase();
        return normalized === 'date' || normalized === 'po date' || normalized === 'po_date';
      });
      mergedRows.sort((a, b) => {
        const dateA = String(a[(dateHeaderIndex >= 0 ? dateHeaderIndex : 0) + 3] || '');
        const dateB = String(b[(dateHeaderIndex >= 0 ? dateHeaderIndex : 0) + 3] || '');
        const dateCmp = dateB.localeCompare(dateA, undefined, { numeric: true, sensitivity: 'base' });
        if (dateCmp !== 0) return dateCmp;
        return String(a[0] || '').localeCompare(String(b[0] || ''), undefined, { sensitivity: 'base' });
      });

      setPreviewAllRows([['Firm Name', 'Firm Id', 'MRR Mode', ...baseHeaders], ...mergedRows]);
    } catch (err) {
      setPreviewAllRows([]);
      alert(err?.message || 'Could not load MRR rows.');
    } finally {
      setIsLoadingPreviewAll(false);
    }
  };

  const refreshApprovalViews = async () => {
    await Promise.all([
      loadPendingList({ force: true }),
      loadAllApprovalsList({ force: true })
    ]);
  };

  useEffect(() => {
    if (step === 3 && tempFirm) {
      loadPendingList();
      loadEditMrrList();
    }
  }, [step, tempFirm, tempType]);

  useEffect(() => {
    if (step === 3 && firms?.length) {
      loadAllApprovalsList();
    }
  }, [step, firms]);

  useEffect(() => {
    if (step !== 6) return;
    if (pendingFilter === 'all_approvals') {
      if (firms?.length) loadAllApprovalsList({ force: true });
      return;
    }
    if (!tempFirm) return;
    if (pendingFilter === 'edit_mrr') {
      loadEditMrrList({ force: true });
      return;
    }
    loadPendingList({ force: true });
  }, [step, pendingFilter, tempFirm, tempType, firms]);

  useEffect(() => {
    setSelectedGroupedApprovalKeys({});
  }, [allApprovalsStage, allApprovalsFirmFilter, pendingFilter, step]);

  useEffect(() => {
    if (step !== 6 || pendingFilter !== 'all_approvals' || !allApprovalRows.length) return;
    prefetchApprovalDataForRows(allApprovalRows, 5).catch(() => null);
    return () => {
      approvalPrefetchRunRef.current = 0;
    };
  }, [step, pendingFilter, allApprovalRows]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!menuBootConfig?.token) return;
    const bootFirm = firms.find((firm) => firm.id === menuBootConfig.firmId);
    if (!bootFirm) return;
    setTempFirm(bootFirm);
    setTempType(menuBootConfig.type || 'reel');
    setLabelInitialMrr(String(menuBootConfig.labelMrr || '').trim());
    if (menuBootConfig.view === 'label') {
      setStep(5);
      return;
    }
    if (menuBootConfig.view === 'all_approvals') {
      setPendingFilter('all_approvals');
      setStep(6);
      return;
    }
    if (menuBootConfig.view === 'pending_list') {
      setPendingFilter(menuBootConfig.pendingFilter || 'pending_mrr');
      setStep(6);
      return;
    }
    if (menuBootConfig.view === 'review_mrr') {
      setReportFilter(menuBootConfig.reportFilter || 'all');
      setStep(7);
      return;
    }
    setStep(3);
  }, [menuBootConfig?.token, firms, isAuthenticated]);

  useEffect(() => {
    setStep(getOverlayBootStep(menuBootConfig, isAuthenticated, initialFirm));
  }, [menuBootConfig?.token, menuBootConfig?.view, isAuthenticated, initialFirm]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (menuBootConfig?.token) return;
    if (!initialFirm) return;
    setTempFirm((prev) => prev || initialFirm);
    setTempType((prev) => prev || initialType || 'reel');
    setStep(3);
  }, [isAuthenticated, initialFirm, initialType, menuBootConfig?.token]);

  useEffect(() => {
    if (isAuthenticated) return;
    const currentPath = normalizeAppPath(getCurrentPathname());
    if (currentPath === APP_ROUTES.geentry) {
      setStep(4);
      setTempFirm((prev) => prev || initialFirm || firms[0] || null);
      setTempType((prev) => prev || initialType || 'reel');
      return;
    }
    setStep(1);
    setTempFirm(null);
    setPendingGEs([]);
    setEditMrrRows([]);
    setAllApprovalRows([]);
    setLabelInitialMrr('');
    setPendingFilter('pending_mrr');
    setValidatedUsersByFirm({});
  }, [firms, initialFirm, initialType, isAuthenticated]);

  useEffect(() => {
    if (step !== 4) return;
    if (tempFirm) return;
    setTempFirm(initialFirm || firms[0] || null);
    setTempType((prev) => prev || initialType || 'reel');
  }, [firms, initialFirm, initialType, step, tempFirm]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (step === 1) setStep(2);
  }, [isAuthenticated, step]);

  useEffect(() => {
    if (!onRouteChange) return;
    const nextPath = step === 1
      ? APP_ROUTES.login
      : step === 2
        ? APP_ROUTES.firms
        : step === 3
          ? APP_ROUTES.dashboard
          : step === 4
            ? APP_ROUTES.geentry
            : step === 5
              ? APP_ROUTES.labels
              : step === 6
                ? APP_ROUTES.approvals
                : step === 7
                  ? APP_ROUTES.reports
                  : step === 11
                    ? '/gate-entries'
                    : step === 12
                      ? '/mrr-modes'
                      : APP_ROUTES.login;    onRouteChange(nextPath);
  }, [onRouteChange, step]);

  const userBadge = <ProfileMenu currentUser={currentUser} onLogout={onLogout} zIndex={10001} />;
  const loginSpinnerOverlay = isLoggingIn ? (
    <div className="loading-overlay">
      <div className="spinner" />
    </div>
  ) : null;

  if (step === 1) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {userBadge}
        {loginSpinnerOverlay}
        <div style={{ margin: 'auto', background: '#fff', padding: '34px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '520px', width: '90%' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '72px' }} alt="Logo" />
          </div>
          <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Login</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="User ID or Email" style={{ border: '1px solid #aaa', padding: '10px' }} />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" style={{ border: '1px solid #aaa', padding: '10px' }} />
          </div>
          {loginError ? <div style={{ marginTop: '10px', color: '#9b1c1c', fontSize: '12px', fontWeight: 700 }}>{loginError}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px', gap: '8px' }}>
            <button
              className="btn main"
              disabled={isLoggingIn}
              style={{ minWidth: '120px' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.borderColor = '#2563eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; e.currentTarget.style.borderColor = '#111'; }}
              onClick={async () => {
                setLoginError('');
                if (!loginId.trim() || !loginPassword.trim()) {
                  setLoginError('User ID and Password are required.');
                  return;
                }
                setIsLoggingIn(true);
                try {
                  if (isDefaultMasterLogin(loginId, loginPassword)) {
                    const masterUser = {
                      login_id: 'system',
                      user_email: 'system@lngrp',
                      display_name: 'System Master',
                      role: 'admin',
                      master_login: true
                    };
                    const map = {};
                    firms.forEach((firm) => {
                      map[firm.id] = { ...masterUser, firmId: firm.id };
                    });
                    setValidatedUsersByFirm(map);
                    setStep(2);
                    return;
                  }
                  
                  // Authenticate against the first firm (Master) as users are now common
                  const masterFirm = firms[0];
                  const user = await authenticateUser(loginId, loginPassword, {
                    spreadsheetId: masterFirm?.spreadsheetId,
                    scriptUrl: masterFirm?.scriptUrl
                  });

                  if (!user) {
                    setValidatedUsersByFirm({});
                    setLoginError('Invalid user ID or password.');
                    return;
                  }

                  const map = {};
                  firms.forEach((firm) => {
                    map[firm.id] = { ...user, firmId: firm.id };
                  });
                  setValidatedUsersByFirm(map);
                  setStep(2);
                } catch (err) {
                  setValidatedUsersByFirm({});
                  setLoginError(err?.message || 'Invalid user ID or password.');
                } finally {
                  setIsLoggingIn(false);
                }
              }}
            >
              {isLoggingIn ? 'Logging In...' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {userBadge}
        {loginSpinnerOverlay}
        <div style={{ margin: 'auto', background: '#fff', padding: '40px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '600px', width: '90%', textAlign: 'center' }}>
          <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '80px', marginBottom: '20px' }} alt="Logo" />
          <h2 style={{ color: 'var(--ink)', fontSize: '24px', marginBottom: '12px', letterSpacing: '0.02em' }}>SELECT FIRM</h2>
          {loginError ? <div style={{ marginTop: '10px', color: '#9b1c1c', fontSize: '12px', fontWeight: 700 }}>{loginError}</div> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {firms.map((firm) => (
              <button
                key={firm.id}
                className="btn main"
                disabled={isLoggingIn}
                style={{ padding: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onClick={() => {
                  setLoginError('');
                  const sessionUser = currentUser
                    ? { ...currentUser, firmId: firm?.id || currentUser?.firmId || '' }
                    : null;
                  const user = validatedUsersByFirm[firm.id] || sessionUser;
                  if (!user) {
                    setLoginError('This login is not available for selected firm.');
                    return;
                  }
                  setTempFirm(firm);
                  setTempType('reel');
                  onRememberSelection?.(firm, 'reel');
                  onLogin?.({
                    ...user,
                    firmId: firm?.id || ''
                  });
                  setStep(3);
                }}
              >
                {firm.name}
              </button>
            ))}
            <button className="btn" onClick={() => setStep(1)} disabled={isLoggingIn}>Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const isMenuCountsLoading = isLoadingPending || isLoadingEditMrr || isLoadingAllApprovals;
    const menuCountText = (value) => (isMenuCountsLoading ? '(Loading...)' : `(${value})`);
    const shellStyle = {
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      background: 'rgba(216, 209, 196, 0.98)',
      backdropFilter: 'blur(12px)'
    };

    const headerStyle = {
      height: '64px',
      background: '#fff',
      borderBottom: '1px solid var(--line)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 18px',
      gap: '12px'
    };

    const pillStyle = {
      padding: '7px 10px',
      border: '1px solid #d1d5db',
      background: '#f9fafb',
      fontSize: '11px',
      fontWeight: 800,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      borderRadius: '999px',
      whiteSpace: 'nowrap'
    };

    const bodyStyle = { display: 'flex', flex: 1, minHeight: 0 };

    const sidebarStyle = {
      width: '260px',
      background: '#fff',
      borderRight: '1px solid var(--line)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      overflowY: 'auto'
    };

    const sideButtonStyle = {
      width: '100%',
      padding: '12px 12px',
      fontSize: '12px',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      border: '1px solid #d1d5db',
      background: '#fff',
      textAlign: 'left',
      cursor: 'pointer'
    };

    const mainStyle = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '22px',
      overflowY: 'auto'
    };

    const cardStyle = {
      width: 'min(920px, 100%)',
      background: '#fff',
      border: '1px solid var(--line)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
      padding: '22px'
    };

    return (
      <div style={shellStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.06em', color: 'var(--muted)' }}>MRR &amp; REEL MANAGEMENT SYSTEM</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '40px' }} alt="Logo" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={pillStyle}>{tempFirm?.name || 'FIRM'}</div>
          </div>
        </div>

        <div style={bodyStyle}>
          <div style={sidebarStyle}>
            <button
              type="button"
              style={sideButtonStyle}
              onClick={() => {
                setEditData(null);
                setStep(4);
              }}
            >
              NEW GE ENTRY
            </button>
            <button type="button" style={sideButtonStyle} onClick={() => { setStep(11); }}>
              GE ENTRY DATA
            </button>
            <button
              type="button"
              disabled={isLoadingPending}
              style={{ ...sideButtonStyle, opacity: isLoadingPending ? 0.6 : 1 }}
              onClick={() => {
                setPendingFilter('pending_mrr');
                setStep(6);
              }}
            >
              PENDING MRR {menuCountText(pendingCounts.pending_mrr)}
            </button>
            <button
              type="button"
              disabled={isLoadingEditMrr}
              style={{ ...sideButtonStyle, opacity: isLoadingEditMrr ? 0.6 : 1 }}
              onClick={() => {
                setPendingFilter('edit_mrr');
                setStep(6);
              }}
            >
              EDIT MRR {menuCountText(pendingCounts.edit_mrr)}
            </button>
            <button
              type="button"
              disabled={isLoadingAllApprovals}
              style={{ ...sideButtonStyle, opacity: isLoadingAllApprovals ? 0.6 : 1 }}
              onClick={() => {
                setPendingFilter('all_approvals');
                setStep(6);
              }}
            >
              APPROVALS {menuCountText(pendingCounts.all_approvals)}
            </button>
            <button
              type="button"
              style={sideButtonStyle}
              onClick={async () => {
                setReportFilter('all');
                await loadPreviewAllMrr();
                setStep(7);
              }}
            >
              REVIEW
            </button>
            <button type="button" style={sideButtonStyle} onClick={() => { setStep(8); }}>
              PO DETAILS
            </button>
            <button type="button" style={sideButtonStyle} onClick={() => { setStep(9); }}>
              USERS
            </button>

            <div style={{ marginTop: '6px', height: 1, background: '#e5e7eb' }} />

            <button type="button" style={sideButtonStyle} onClick={() => { setLabelInitialMrr(''); setStep(5); }}>
              DOWNLOAD LABEL
            </button>

            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e5e7eb' }}>
              <ProfileMenu currentUser={currentUser} onLogout={onLogout} fixed={false} variant="pill" shortChars={6} zIndex={10002} />
            </div>
            <button
              type="button"
              style={{ ...sideButtonStyle, color: '#111827', background: '#f9fafb' }}
              onClick={() => { setStep(2); }}
            >
              ← BACK TO FIRMS
            </button>
          </div>

          {/* Intentionally no main dashboard panel (sidebar-only layout). */}
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <>
        {userBadge}
        <GateEntryPage
          firm={tempFirm} 
          mrrType={tempType} 
          initialData={safeEditData}
          geNo={getGateEntryNo(safeEditData)}
          deps={{
            normalizeGateEntryInitialData,
            getGateEntryNo,
            getSheetName,
            fetchUniqueSuppliers,
            fetchSheetRange,
            normalizePoRow,
            sheetValuesToPoRows,
            fetchLatestMrrGe,
            getFirmCode,
            getFinancialYearLabel,
            formatGateEntryNumber,
            fileToBase64,
            formatDecimal2,
            saveGeEntryToSheets,
            downloadGateEntryPdfDirect
          }}
          onBack={() => { setEditData(null); setStep(2); }} 
          onSave={(geNo, geData) => {
            setEditData(null);
            onGeSubmit(geNo, geData);
            setStep(2);
          }} 
        />
      </>
    );
  }

  if (step === 5) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {userBadge}
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <ReelLabelsPage
            initialMrr={labelInitialMrr}
            helperSheetName={getSheetName(tempFirm?.helper, tempType)}
            selectedFirm={tempFirm}
            deps={{
              fetchSheetRange,
              fetchSheetRangeWithParams,
              helperSheetNameFallback: HELPER_SHEET_NAME
            }}
            onBack={() => setStep(3)}
          />
        </div>
      </div>
    );
  }

  if (step === 8) {
    return (
      <>
        {userBadge}
        <PoDetailsPage
          selectedFirm={tempFirm}
          initialType={tempType}
          deps={{
            getSheetName,
            fetchSheetRange,
            fetchUniqueSuppliers,
            normalizePoRow,
            sheetValuesToPoRows,
            savePoRowsToSheets
          }}
          onBack={() => setStep(3)}
        />
      </>
    );
  }

  if (step === 9) {
    return (
      <>
        {userBadge}
        <UsersPage
          selectedFirm={firms[0]}
          deps={{
            fetchUsers,
            saveUsers
          }}
          onBack={() => setStep(3)}
        />
      </>
    );
  }

  if (step === 6) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px', marginBottom: '20px', width: '100%' }}>
             <h2 style={{ margin: 0, fontSize: '36px', letterSpacing: '0.03em' }}>
               {pendingFilter === 'pending_mrr' ? 'Pending MRR' :
                pendingFilter === 'all_approvals' ? 'All Approvals (Grouped)' :
                pendingFilter === 'edit_ge_entry' ? 'Edit GE Entry' :
                pendingFilter === 'edit_mrr' ? 'Edit MRR' :
                pendingFilter === 'pending_plant_head_approval' ? 'Pending Plant Head Approval' :
               pendingFilter === 'pending_accounts_approval' ? 'Pending Accounts Approval' :
               pendingFilter === 'pending_md_approval' ? 'Pending MD Approval' :
                'Pending Invoice Posting'}
             </h2>
             <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '20px', marginLeft: 'auto', marginRight: '50px' }}>
               {pendingFilter === 'all_approvals' ? (
                 <select
                   value={allApprovalsFirmFilter}
                   onChange={(e) => setAllApprovalsFirmFilter(e.target.value)}
                   style={{ border: '1px solid #a8a8a8', padding: '4px 8px', fontSize: '11px', fontWeight: 700, background: '#fff', minWidth: '140px' }}
                 >
                   <option value="all">All Firms</option>
                   {groupedApprovalFirmOptions.map((firm) => (
                     <option key={firm.id} value={firm.id}>{firm.name}</option>
                   ))}
                 </select>
               ) : null}
               <button
                 className="btn"
                 style={{ whiteSpace: 'nowrap', padding: '4px 8px', fontSize: '11px', fontWeight: 700, height: '26px', lineHeight: 1 }}
                 onClick={() => setStep(3)}
               >
                 {'< Back'}
               </button>
               <ProfileMenu currentUser={currentUser} onLogout={onLogout} fixed={false} zIndex={10002} />
             </div>
          </div>
          {pendingFilter === 'all_approvals' ? (
            (() => {
              const stageGroups = [
                { key: 'pending_plant_head_approval', label: 'Plant Head' },
                { key: 'pending_accounts_approval', label: 'Accounts' },
                { key: 'pending_md_approval', label: 'MD' }
              ]
                .map((stage) => ({ ...stage, rows: filteredAllApprovalRows.filter((row) => String(row.pending_stage || '').trim() === stage.key) }));

              const hasAnyStages = stageGroups.some((stage) => stage.rows.length > 0);
              if (!hasAnyStages) return <p>No pending approval entries found.</p>;

              const resolvedStageKey = (
                stageGroups.some((stage) => stage.key === allApprovalsStage && stage.rows.length > 0)
                  ? allApprovalsStage
                  : (stageGroups.find((stage) => stage.rows.length > 0)?.key || stageGroups[0]?.key)
              );
              const activeStage = stageGroups.find((stage) => stage.key === resolvedStageKey) || stageGroups[0];
              const activeRows = activeStage?.rows || [];
              const activeRowKeys = activeRows.map(getGroupedApprovalRowKey);
              const selectedActiveCount = activeRowKeys.filter((key) => !!selectedGroupedApprovalKeys[key]).length;
              const allActiveSelected = activeRowKeys.length > 0 && selectedActiveCount === activeRowKeys.length;

              return (
                <div style={{ paddingBottom: '82px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginBottom: '14px'
                    }}
                  >
                    {stageGroups.map((stage) => (
                      <button
                        key={stage.key}
                        className={stage.key === resolvedStageKey ? 'btn main small' : 'btn small'}
                        style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}
                        disabled={stage.rows.length === 0}
                        onClick={() => setAllApprovalsStage(stage.key)}
                      >
                        {stage.label} ({stage.rows.length})
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#1f2937', marginBottom: '10px' }}>
                    {activeStage.label} ({activeRows.length})
                  </div>
                  <table className="table" style={pendingTableStyle}>
                    <thead>
                      <tr>
                        <th style={groupedCheckboxHeaderStyle}>
                          <input
                            type="checkbox"
                            checked={allActiveSelected}
                            onChange={(e) => {
                              const checked = !!e.target.checked;
                              setSelectedGroupedApprovalKeys((prev) => {
                                const next = { ...prev };
                                activeRowKeys.forEach((key) => {
                                  if (checked) next[key] = true;
                                  else delete next[key];
                                });
                                return next;
                              });
                            }}
                          />
                        </th>
                        <th style={groupedIdHeaderStyle}>GE No</th>
                        <th style={groupedIdHeaderStyle}>MRR No</th>
                        <th style={groupedFirmHeaderStyle}>Firm</th>
                        <th style={groupedSupplierHeaderStyle}>Supplier</th>
                        <th style={groupedQtyHeaderStyle}>Total Qty</th>
                        <th style={groupedItemsHeaderStyle}>Items</th>
                        <th style={groupedWeightHeaderStyle}>MRR Weight</th>
                        <th style={groupedWeightHeaderStyle}>Invoice Weight</th>
                        <th style={groupedDiffHeaderStyle}>Difference</th>
                        <th style={groupedPoRateHeaderStyle}>PO Rate</th>
                        <th style={groupedInvoiceRateHeaderStyle}>Invoice Rate</th>
                        <th style={groupedBasicValueHeaderStyle}>Basic Value</th>
                        {activeStage.key !== 'pending_plant_head_approval' ? (
                          <th style={groupedRemarkHeaderStyle}>Remark</th>
                        ) : null}
                        <th style={activeStage.key === 'pending_plant_head_approval' ? groupedActionHeaderWideStyle : groupedActionHeaderStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRows.map((ge, idx) => {
                        const rowKey = getGroupedApprovalRowKey(ge);
                        const isRowApproving = approvingPendingKey === rowKey;
                        return (
                        <tr key={`${activeStage.key}-${idx}`}>
                          <td className="c" style={groupedCheckboxCellStyle}>
                            <input
                              type="checkbox"
                              checked={!!selectedGroupedApprovalKeys[rowKey]}
                              onChange={(e) => {
                                const checked = !!e.target.checked;
                                setSelectedGroupedApprovalKeys((prev) => {
                                  const next = { ...prev };
                                  if (checked) next[rowKey] = true;
                                  else delete next[rowKey];
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td className="c" style={groupedIdCellStyle}>{ge.ge_no || ge.ge_entry}</td>
                          <td className="c" style={groupedIdCellStyle}>{ge.mrr_number || ge.mrr_no || ''}</td>
                          <td style={groupedFirmCellStyle}>{ge.firm_name || firms.find((firm) => firm.id === ge.firm_id)?.name || '-'}</td>
                          <td style={groupedSupplierCellStyle}>{ge.supplier || ge.supplier_name}</td>
                          <td className="c" style={groupedQtyCellStyle}>{getGroupedApprovalTotalQty(ge) || '-'}</td>
                          <td style={groupedItemsCellStyle}>{getGroupedApprovalItems(ge) || '-'}</td>
                          <td className="r" style={groupedWeightCellStyle}>{formatGroupedApprovalWeight(getGroupedApprovalActualWeight(ge))}</td>
                          <td className="r" style={groupedWeightCellStyle}>{formatGroupedApprovalWeight(getGroupedApprovalInvoiceWeight(ge))}</td>
                          <td className="r" style={groupedDiffCellStyle}>{formatGroupedApprovalWeight(getGroupedApprovalWeightDifference(ge))}</td>
                          <td className="r" style={groupedPoRateCellStyle}>{getGroupedApprovalPoRate(ge) || '-'}</td>
                          <td className="r" style={groupedInvoiceRateCellStyle}>{getGroupedApprovalInvoiceRate(ge) || '-'}</td>
                          <td className="r" style={groupedBasicValueCellStyle}>{getGroupedApprovalBasicValue(ge) || '-'}</td>
                          {activeStage.key !== 'pending_plant_head_approval' ? (
                            <td style={groupedRemarkCellStyle}>{getApprovalRemarkText(ge)}</td>
                          ) : null}
                          <td className="c" style={activeStage.key === 'pending_plant_head_approval' ? groupedActionCellWideStyle : groupedActionCellStyle}>
                            <div style={{ display: 'grid', gap: '8px', justifyItems: 'stretch' }}>
                              <div style={{ display: 'grid', gap: '8px', justifyContent: 'stretch', alignItems: 'stretch' }}>
                              <button
                                className="btn small"
                                style={{ width: '100%', fontSize: '12px', padding: '9px 10px' }}
                                disabled={isAnyPendingApproval}
                                onClick={() => {
                                  const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                                  const targetType = ge.mrr_type || tempType;
                                  if (!targetFirm) return;
                                  const prefetched = approvalPrefetchCacheRef.current.get(
                                    buildApprovalPrefetchKey(ge, targetFirm.id, targetType)
                                  )?.data;
                                  onSelect(targetFirm, targetType, false, {
                                    ...ge,
                                    return_menu_firm_id: tempFirm?.id || '',
                                    return_menu_type: tempType || 'reel',
                                    return_menu_view: 'all_approvals',
                                    prefetched_parent_rows: prefetched?.parentRows || undefined,
                                    prefetched_helper_rows: prefetched?.helperRows || undefined
                                  });
                                }}
                              >
                                OPEN
                              </button>
                              <button
                                className="btn main small"
                                style={{ width: '100%', fontSize: '13px', padding: '9px 12px', background: '#111', color: '#fff', transition: 'background-color 0.2s ease, color 0.2s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; e.currentTarget.style.color = '#fff'; }}
                                disabled={isAnyPendingApproval}
                                onClick={async () => {
                                  try {
                                    const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                                    const targetType = ge.mrr_type || tempType;
                                    if (!targetFirm) throw new Error('Firm context missing for approval.');
                                    const approvalDraft = getGroupedApprovalDraft(ge);
                                    if (String(ge.pending_stage || activeStage.key).trim() === 'pending_plant_head_approval' && !String(approvalDraft.plant_head_remark || '').trim()) {
                                      throw new Error(`Plant Head Remark is required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                    }
                                    if (isGroupedApprovalDebitNoteRequired(ge)) {
                                      if (!approvalDraft.debit_note || !approvalDraft.debit_note_date || !approvalDraft.debit_note_amount) {
                                        throw new Error(`Debit Note, Debit Note Date, and Debit Note Amount are required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                      }
                                    }
                                    if (String(ge.pending_stage || activeStage.key).trim() === 'pending_md_approval' && !String(approvalDraft.md_approval_remark || '').trim()) {
                                      throw new Error(`MD Approval Remark is required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                    }
                                    setApprovingPendingKey(rowKey);
                                    await approvePendingStage({
                                      decision: 'approve',
                                      stage: ge.pending_stage || activeStage.key,
                                      mrrNumber: ge.mrr_number || ge.mrr_no || '',
                                      geNo: ge.ge_no || ge.ge_entry || '',
                                      userEmail: currentUser?.email || '',
                                      plantHeadRemark: String(approvalDraft.plant_head_remark || '').trim(),
                                      accountsRemark: String(approvalDraft.accounts_remark || '').trim(),
                                      mdApprovalRemark: String(approvalDraft.md_approval_remark || '').trim(),
                                      debitNote: String(approvalDraft.debit_note || '').trim(),
                                      debitNoteDate: String(approvalDraft.debit_note_date || '').trim(),
                                      debitNoteAmount: String(approvalDraft.debit_note_amount || '').trim(),
                                      mrrSheetName: getSheetName(targetFirm.mrr, targetType),
                                      helperSheetName: getSheetName(targetFirm.helper, targetType),
                                      spreadsheetId: targetFirm?.spreadsheetId,
                                      scriptUrl: targetFirm?.scriptUrl
                                    });
                                    await refreshApprovalViews();
                                  } catch (err) {
                                    alert(err?.message || 'Approval failed.');
                                  } finally {
                                    setApprovingPendingKey('');
                                  }
                                }}
                              >
                                {isRowApproving ? <span className="approving-bubble">Approving<span className="approving-dots"><span></span><span></span><span></span></span></span> : 'APPROVE'}
                              </button>
                              {String(ge.pending_stage || activeStage.key).trim() !== 'pending_tally_posting' ? (
                                <button
                                  className="btn small"
                                  style={{ width: '100%', fontSize: '12px', padding: '9px 10px', background: '#b91c1c', color: '#fff', borderColor: '#b91c1c' }}
                                  disabled={isAnyPendingApproval}
                                  onClick={async () => {
                                    try {
                                      const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                                      const targetType = ge.mrr_type || tempType;
                                      if (!targetFirm) throw new Error('Firm context missing for rejection.');
                                      const approvalDraft = getGroupedApprovalDraft(ge);
                                      if (String(ge.pending_stage || activeStage.key).trim() === 'pending_plant_head_approval' && !String(approvalDraft.plant_head_remark || '').trim()) {
                                        throw new Error(`Plant Head Remark is required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                      }
                                      if (String(ge.pending_stage || activeStage.key).trim() === 'pending_accounts_approval' && !String(approvalDraft.accounts_remark || '').trim()) {
                                        throw new Error(`Accounts Remark is required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                      }
                                      if (String(ge.pending_stage || activeStage.key).trim() === 'pending_md_approval' && !String(approvalDraft.md_approval_remark || '').trim()) {
                                        throw new Error(`MD Approval Remark is required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                      }
                                      setApprovingPendingKey(rowKey);
                                      await approvePendingStage({
                                        decision: 'reject',
                                        stage: ge.pending_stage || activeStage.key,
                                        mrrNumber: ge.mrr_number || ge.mrr_no || '',
                                        geNo: ge.ge_no || ge.ge_entry || '',
                                        userEmail: currentUser?.email || '',
                                        plantHeadRemark: String(approvalDraft.plant_head_remark || '').trim(),
                                        accountsRemark: String(approvalDraft.accounts_remark || '').trim(),
                                        mdApprovalRemark: String(approvalDraft.md_approval_remark || '').trim(),
                                        debitNote: String(approvalDraft.debit_note || '').trim(),
                                        debitNoteDate: String(approvalDraft.debit_note_date || '').trim(),
                                        debitNoteAmount: String(approvalDraft.debit_note_amount || '').trim(),
                                        mrrSheetName: getSheetName(targetFirm.mrr, targetType),
                                        helperSheetName: getSheetName(targetFirm.helper, targetType),
                                        spreadsheetId: targetFirm?.spreadsheetId,
                                        scriptUrl: targetFirm?.scriptUrl
                                      });
                                      await refreshApprovalViews();
                                    } catch (err) {
                                      alert(err?.message || 'Rejection failed.');
                                    } finally {
                                      setApprovingPendingKey('');
                                    }
                                  }}
                                >
                                  {isRowApproving ? <span className="approving-bubble">Applying<span className="approving-dots"><span></span><span></span><span></span></span></span> : 'REJECT'}
                                </button>
                              ) : null}
                              </div>
                            {String(ge.pending_stage || activeStage.key).trim() === 'pending_plant_head_approval' ? (
                              <div style={{ padding: '10px', border: '1px solid #d6c7ae', background: '#f8fafc', borderRadius: '8px', display: 'grid', gap: '8px', textAlign: 'left' }}>
                                <input
                                  value={getGroupedApprovalDraft(ge).plant_head_remark}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'plant_head_remark', e.target.value)}
                                  placeholder="Plant Head Remark *"
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                              </div>
                            ) : null}
                            {String(ge.pending_stage || activeStage.key).trim() === 'pending_accounts_approval' && isGroupedApprovalDebitNoteRequired(ge) ? (
                              <div style={{ padding: '10px', border: '1px solid #d6c7ae', background: '#f8fafc', borderRadius: '8px', display: 'grid', gap: '8px', textAlign: 'left' }}>
                                <input
                                  value={getGroupedApprovalDraft(ge).debit_note}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'debit_note', e.target.value)}
                                  placeholder="Debit Note *"
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                                <input
                                  type="date"
                                  value={getGroupedApprovalDraft(ge).debit_note_date}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'debit_note_date', e.target.value)}
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={getGroupedApprovalDraft(ge).debit_note_amount}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'debit_note_amount', e.target.value)}
                                  placeholder="Debit Note Amount *"
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                              </div>
                            ) : null}
                            {String(ge.pending_stage || activeStage.key).trim() === 'pending_accounts_approval' ? (
                              <div style={{ padding: '10px', border: '1px solid #d6c7ae', background: '#f8fafc', borderRadius: '8px', display: 'grid', gap: '8px', textAlign: 'left' }}>
                                <input
                                  value={getGroupedApprovalDraft(ge).accounts_remark}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'accounts_remark', e.target.value)}
                                  placeholder="Accounts Remark"
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                              </div>
                            ) : null}
                            {String(ge.pending_stage || activeStage.key).trim() === 'pending_md_approval' ? (
                              <div style={{ padding: '10px', border: '1px solid #d6c7ae', background: '#f8fafc', borderRadius: '8px', display: 'grid', gap: '8px', textAlign: 'left' }}>
                                <input
                                  value={getGroupedApprovalDraft(ge).md_approval_remark}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'md_approval_remark', e.target.value)}
                                  placeholder="MD Approval Remark *"
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                              </div>
                            ) : null}
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                  <div
                    style={{
                      position: 'fixed',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: '#fff',
                      borderTop: '1px solid #d1d5db',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '12px',
                      zIndex: 20
                    }}
                  >
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={allActiveSelected}
                        onChange={(e) => {
                          const checked = !!e.target.checked;
                          setSelectedGroupedApprovalKeys((prev) => {
                            const next = { ...prev };
                            activeRowKeys.forEach((key) => {
                              if (checked) next[key] = true;
                              else delete next[key];
                            });
                            return next;
                          });
                        }}
                      />
                      Select All Visible
                    </label>
                    <button
                      className="btn main"
                      disabled={isAnyPendingApproval || selectedActiveCount === 0}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={async () => {
                        try {
                          setIsBulkApprovingPending(true);
                          const selectedRows = activeRows.filter((row) => !!selectedGroupedApprovalKeys[getGroupedApprovalRowKey(row)]);
                          for (const ge of selectedRows) {
                            const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                            const targetType = ge.mrr_type || tempType;
                            if (!targetFirm) continue;
                            const approvalDraft = getGroupedApprovalDraft(ge);
                            if (String(ge.pending_stage || activeStage.key).trim() === 'pending_plant_head_approval' && !String(approvalDraft.plant_head_remark || '').trim()) {
                              throw new Error(`Fill Plant Head Remark for ${ge.mrr_number || ge.mrr_no || 'selected MRR'} before bulk approve.`);
                            }
                            if (isGroupedApprovalDebitNoteRequired(ge)) {
                              if (!approvalDraft.debit_note || !approvalDraft.debit_note_date || !approvalDraft.debit_note_amount) {
                                throw new Error(`Fill Debit Note, Debit Note Date, and Debit Note Amount for ${ge.mrr_number || ge.mrr_no || 'selected MRR'} before bulk approve.`);
                              }
                            }
                            if (String(ge.pending_stage || activeStage.key).trim() === 'pending_md_approval' && !String(approvalDraft.md_approval_remark || '').trim()) {
                              throw new Error(`Fill MD Approval Remark for ${ge.mrr_number || ge.mrr_no || 'selected MRR'} before bulk approve.`);
                            }
                            await approvePendingStage({
                              decision: 'approve',
                              stage: ge.pending_stage || activeStage.key,
                              mrrNumber: ge.mrr_number || ge.mrr_no || '',
                              geNo: ge.ge_no || ge.ge_entry || '',
                              userEmail: currentUser?.email || '',
                              plantHeadRemark: String(approvalDraft.plant_head_remark || '').trim(),
                              accountsRemark: String(approvalDraft.accounts_remark || '').trim(),
                              mdApprovalRemark: String(approvalDraft.md_approval_remark || '').trim(),
                              debitNote: String(approvalDraft.debit_note || '').trim(),
                              debitNoteDate: String(approvalDraft.debit_note_date || '').trim(),
                              debitNoteAmount: String(approvalDraft.debit_note_amount || '').trim(),
                              mrrSheetName: getSheetName(targetFirm.mrr, targetType),
                              helperSheetName: getSheetName(targetFirm.helper, targetType),
                              spreadsheetId: targetFirm?.spreadsheetId,
                              scriptUrl: targetFirm?.scriptUrl
                            });
                          }
                          setSelectedGroupedApprovalKeys({});
                          await refreshApprovalViews();
                        } catch (err) {
                          alert(err?.message || 'Bulk approval failed.');
                        } finally {
                          setIsBulkApprovingPending(false);
                        }
                      }}
                    >
                      {isBulkApprovingPending ? <span className="spinner" /> : null}
                      {isBulkApprovingPending ? 'Approving...' : `Approve Selected (${selectedActiveCount})`}
                    </button>
                  </div>

                </div>
              );
            })()
          ) : !displayedRows.length ? <p>No entries found.</p> : (
            <table className="table" style={pendingTableStyle}>
              <thead>
                <tr>
                  <th style={pendingHeaderCellStyle}>S No</th>
                  <th style={pendingHeaderCellStyle}>Date</th>
                  <th style={pendingHeaderCellStyle}>GE No</th>
                  <th style={pendingHeaderCellStyle}>MRR No</th>
                  <th style={pendingHeaderCellStyle}>Supplier</th>
                  <th style={pendingHeaderCellStyle}>Invoice</th>
                  <th style={pendingHeaderCellStyle}>Invoice Value</th>
                  <th style={pendingHeaderCellStyle}>Truck No</th>
                  <th style={pendingHeaderCellStyle}>Remark</th>
                  <th style={pendingHeaderCellStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((ge, idx) => {
                  const rowKey = [
                    String(tempFirm?.id || ge?.firm_id || '').trim(),
                    String(tempType || ge?.mrr_type || '').trim(),
                    String(pendingFilter || ge?.pending_stage || '').trim(),
                    String(ge?.mrr_number || ge?.mrr_no || '').trim(),
                    String(ge?.ge_no || ge?.ge_entry || '').trim()
                  ].join('|');
                  const isRowApproving = approvingPendingKey === rowKey;
                  return (
                  <tr key={idx}>
                    <td className="c" style={pendingBodyCellStyle}>{idx + 1}</td>
                    <td style={pendingBodyCellStyle}>{ge.date}</td>
                    <td className="c" style={pendingBodyCellStyle}>{ge.ge_no || ge.ge_entry}</td>
                    <td className="c" style={pendingBodyCellStyle}>{ge.mrr_number || ge.mrr_no || ''}</td>
                    <td style={pendingBodyCellStyle}>{ge.supplier || ge.supplier_name}</td>
                    <td style={pendingBodyCellStyle}>{ge.invoice_no}</td>
                    <td style={pendingBodyCellStyle}>{formatDecimal2(ge.total_value || ge.total_invocie_value || ge.invoice_basic_value || '')}</td>
                    <td style={pendingBodyCellStyle}>{ge.truck_no}</td>
                    <td style={pendingBodyCellStyle}>{getApprovalRemarkText(ge)}</td>
                    <td className="c" style={{ ...pendingBodyCellStyle }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          className="btn small"
                          style={{ fontSize: '12px', padding: '8px 10px' }}
                          disabled={isAnyPendingApproval}
                          onClick={() => {
                            if (pendingFilter === 'edit_ge_entry') {
                              setEditData(ge);
                              setStep(4);
                              return;
                            }
                            const selectedPending = {
                              ...ge,
                              return_menu_firm_id: tempFirm?.id || '',
                              return_menu_type: tempType || 'reel',
                              return_menu_view: 'pending_list',
                              return_menu_pending_filter: pendingFilter || 'pending_mrr'
                            };
                            if (pendingFilter === 'edit_mrr') {
                              selectedPending.pending_stage = 'completed_mrr';
                              selectedPending.force_load_saved = true;
                            }
                            onSelect(tempFirm, tempType, false, selectedPending);
                          }}
                        >
                          {pendingFilter === 'edit_ge_entry' || pendingFilter === 'edit_mrr' ? 'EDIT' : 'OPEN'}
                        </button>
                        {pendingFilter !== 'pending_mrr' && pendingFilter !== 'edit_ge_entry' && pendingFilter !== 'edit_mrr' && (
                          <>
                            <button
                              className="btn main small"
                              style={{ fontSize: '13px', padding: '8px 12px', background: '#111', color: '#fff', transition: 'background-color 0.2s ease, color 0.2s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; e.currentTarget.style.color = '#fff'; }}
                              disabled={isAnyPendingApproval}
                              onClick={async () => {
                                try {
                                  setApprovingPendingKey(rowKey);
                                  const approvalResult = await approvePendingStage({
                                    decision: 'approve',
                                    stage: pendingFilter,
                                    mrrNumber: ge.mrr_number || ge.mrr_no || '',
                                    geNo: ge.ge_no || ge.ge_entry || '',
                                    userEmail: currentUser?.email || '',
                                    mrrSheetName: getSheetName(tempFirm.mrr, tempType),
                                    helperSheetName: getSheetName(tempFirm.helper, tempType),
                                    spreadsheetId: tempFirm?.spreadsheetId,
                                    scriptUrl: tempFirm?.scriptUrl
                                  });
                                  if (approvalResult?.next_stage && approvalResult.next_stage !== 'completed') {
                                    setPendingFilter(approvalResult.next_stage);
                                  }
                                  await loadPendingList({ force: true });
                                } catch (err) {
                                  alert(err?.message || 'Approval failed.');
                                } finally {
                                  setApprovingPendingKey('');
                                }
                              }}
                            >
                              {isRowApproving ? <span className="approving-bubble">Approving<span className="approving-dots"><span></span><span></span><span></span></span></span> : 'APPROVE'}
                            </button>
                            {pendingFilter !== 'pending_tally_posting' && (
                              <button
                                className="btn small"
                                style={{ fontSize: '12px', padding: '8px 12px', background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }}
                                disabled={isAnyPendingApproval}
                                onClick={async () => {
                                  try {
                                    let plantHeadRemarkInput = '';
                                    let accountsRemarkInput = '';
                                    let mdRemarkInput = '';
                                    if (pendingFilter === 'pending_plant_head_approval') {
                                      plantHeadRemarkInput = window.prompt('Enter Plant Head Reject Remark') || '';
                                      if (!String(plantHeadRemarkInput).trim()) throw new Error('Plant Head Remark is required for rejection.');
                                    }
                                    if (pendingFilter === 'pending_accounts_approval') {
                                      accountsRemarkInput = window.prompt('Enter Accounts Reject Remark') || '';
                                      if (!String(accountsRemarkInput).trim()) throw new Error('Accounts Remark is required for rejection.');
                                    }
                                    if (pendingFilter === 'pending_md_approval') {
                                      mdRemarkInput = window.prompt('Enter MD Reject Remark') || '';
                                      if (!String(mdRemarkInput).trim()) throw new Error('MD Approval Remark is required for rejection.');
                                    }
                                    setApprovingPendingKey(rowKey);
                                    await approvePendingStage({
                                      decision: 'reject',
                                      stage: pendingFilter,
                                      mrrNumber: ge.mrr_number || ge.mrr_no || '',
                                      geNo: ge.ge_no || ge.ge_entry || '',
                                      userEmail: currentUser?.email || '',
                                      plantHeadRemark: plantHeadRemarkInput,
                                      accountsRemark: accountsRemarkInput,
                                      mdApprovalRemark: mdRemarkInput,
                                      mrrSheetName: getSheetName(tempFirm.mrr, tempType),
                                      helperSheetName: getSheetName(tempFirm.helper, tempType),
                                      spreadsheetId: tempFirm?.spreadsheetId,
                                      scriptUrl: tempFirm?.scriptUrl
                                    });
                                    await loadPendingList({ force: true });
                                  } catch (err) {
                                    alert(err?.message || 'Rejection failed.');
                                  } finally {
                                    setApprovingPendingKey('');
                                  }
                                }}
                              >
                                {isRowApproving ? <span className="approving-bubble">Applying<span className="approving-dots"><span></span><span></span><span></span></span></span> : 'REJECT'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (step === 7) {
    const headers = previewAllRows[0] || [];
    const bodyRows = previewAllRows.slice(1);
    const lowerHeaders = headers.map(h => String(h || '').toLowerCase());
    const readReportCell = (row, ...aliases) => {
      for (const alias of aliases) {
        const idx = lowerHeaders.indexOf(String(alias || '').trim().toLowerCase());
        if (idx >= 0) {
          const value = String(row?.[idx] ?? '').trim();
          if (value) return value;
        }
      }
      return '';
    };
    const phIdx = lowerHeaders.indexOf('plant head approval timestamp');
    const accIdx = lowerHeaders.indexOf('accounts approval timestamp');
    const mdIdx = lowerHeaders.indexOf('md approval timestamp');
    const rowGroups = bodyRows.reduce((map, row) => {
      const mrrNo = readReportCell(row, 'mrr number', 'mrr no');
      const geNo = readReportCell(row, 'ge entry', 'ge no');
      const key = `${mrrNo || ''}|${geNo || ''}`;
      if (!key.trim()) return map;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
      return map;
    }, new Map());
    const summaryRows = Array.from(rowGroups.values()).map((rows) => {
      const firstRow = rows[0] || [];
      const supplierValue = rows
        .map((row) => readReportCell(row, 'supplier', 'supplier_name', 'bill_to', 'buyer'))
        .find((value) => String(value || '').trim()) || '';
      const qtyValues = rows
        .map((row) => n(readReportCell(row, 'required reel', 'reels', 'rows added')))
        .filter((value) => value > 0);
      const itemLines = rows.filter((row) => {
        const description = readReportCell(row, 'description', 'po details', 'reel details', 'item_name');
        return description && !isTotalLikeText(description);
      });
      const invoiceRates = [...new Set(rows
        .map((row) => formatDecimal2(readReportCell(row, 'invoice rate', 'rate', 'invoice_rate')))
        .filter(Boolean))];
      return {
        key: `${readReportCell(firstRow, 'mrr number', 'mrr no')}|${readReportCell(firstRow, 'ge entry', 'ge no')}`,
        row: firstRow,
        geNo: readReportCell(firstRow, 'ge entry', 'ge no'),
        mrrNo: readReportCell(firstRow, 'mrr number', 'mrr no'),
        firm: readReportCell(firstRow, 'firm name') || tempFirm?.name || '',
        firmId: readReportCell(firstRow, 'firm id') || tempFirm?.id || '',
        mrrType: String(readReportCell(firstRow, 'mrr mode') || tempType || 'reel').toLowerCase().includes('other') ? 'other' : 'reel',
        mrrTypeLabel: readReportCell(firstRow, 'mrr mode') || (String(readReportCell(firstRow, 'mrr mode') || '').toLowerCase().includes('other') ? 'OTHER MRR' : 'REEL MRR'),
        entryType: normalizeOtherMrrEntryType(readReportCell(firstRow, 'mrr type')),
        supplier: supplierValue,
        totalQty: qtyValues.length ? String(qtyValues.reduce((sum, value) => sum + value, 0)) : readReportCell(firstRow, 'required reel', 'rows added'),
        items: String(itemLines.length || rows.length || 0),
        mrrWeight: formatDecimal2(readReportCell(firstRow, 'actual mrr ttl weight (kgs)', 'actual_mrr_ttl_weight_kgs', 'mrr weight')),
        invoiceWeight: formatDecimal2(readReportCell(firstRow, 'invoice ttl weight (kgs)', 'invoice_ttl_weight_kgs', 'invoice weight')),
        invoiceRate: invoiceRates.join(', '),
        basicValue: formatDecimal2(readReportCell(firstRow, 'mrr basic value', 'invoice basic value', 'invoice basic amount', 'amount'))
      };
    });

    const downloadRowLabel = async (summary) => {
      const mrrNumber = String(summary?.mrrNo || '').trim();
      const targetFirm = firms.find((firm) => String(firm.id || '').trim() === String(summary?.firmId || '').trim()) || tempFirm;
      if (!targetFirm || !mrrNumber) {
        alert('MRR No. missing for label print.');
        return;
      }
      try {
        setIsPreparingLabels(true);
        const targetType = summary?.mrrType || tempType;
        const helperSheetName = getSheetName(targetFirm.helper, targetType);
        const payload = await fetchSheetRangeWithParams({
          sheet: helperSheetName,
          mrr_number: mrrNumber,
          spreadsheetId: targetFirm.spreadsheetId
        }, targetFirm.scriptUrl);
        const reels = Array.isArray(payload?.values) ? payload.values : [];
        if (!reels.length) {
          throw new Error(`No label rows found for MRR ${mrrNumber}.`);
        }
        setDirectLabelPrintJob({ reels, mrrNumber, firm: targetFirm, mode: 'a4' });
        const previousTitle = document.title;
        document.body.classList.add('print-labels-only');
        document.title = `MRR_${mrrNumber}_Labels`;
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            document.title = previousTitle;
            document.body.classList.remove('print-labels-only');
            setDirectLabelPrintJob(null);
          }, 1000);
        }, 150);
      } catch (err) {
        document.body.classList.remove('print-labels-only');
        setDirectLabelPrintJob(null);
        alert(err?.message || 'Could not prepare labels.');
      } finally {
        setIsPreparingLabels(false);
      }
    };

    const openReviewRow = (summary) => {
      const mrrNumber = String(summary?.mrrNo || '').trim();
      if (!mrrNumber) return;
      const targetFirm = firms.find((firm) => String(firm.id || '').trim() === String(summary?.firmId || '').trim()) || tempFirm;
      const targetType = summary?.mrrType || tempType;
      const targetItem = { 
        mrr_number: mrrNumber, 
        ge_no: String(summary?.geNo || '').trim(),
        pending_stage: 'completed_mrr', 
        force_load_saved: true,
        return_menu_firm_id: tempFirm?.id || '',
        return_menu_type: tempType || 'reel',
        return_menu_view: 'review_mrr',
        return_menu_report_filter: reportFilter || 'all'
      };
      onGeSubmit(targetItem.ge_no, targetItem);
      if (targetFirm) onSelect(targetFirm, targetType);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 800);
    };
    const printRowPdf = (summary) => {
      openReviewRow(summary);
      setTimeout(() => {
        window.print();
      }, 1400);
    };

    const filteredRows = summaryRows.filter((summary) => {
      const searchable = [
        summary.geNo,
        summary.mrrNo,
        summary.firm,
        summary.mrrTypeLabel,
        summary.entryType,
        summary.supplier,
        summary.invoiceRate,
        summary.basicValue
      ].join(' ').toLowerCase();
      const matchesSearch = !reportSearch || searchable.includes(reportSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (reportFilter === 'pending') {
        const row = summary.row || [];
        const isCompleted = (phIdx >= 0 && row[phIdx]) && (accIdx >= 0 && row[accIdx]) && (mdIdx >= 0 && row[mdIdx]);
        return !isCompleted;
      }
      return true;
    });

    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {isPreparingLabels && (
          <div className="loading-overlay" style={{ zIndex: 10005 }}>
            <div className="spinner" />
            <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>Preparing labels...</p>
          </div>
        )}
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px', marginBottom: '20px', width: '100%' }}>
            <h2 style={{ margin: 0, fontSize: '36px', letterSpacing: '0.03em' }}>Review MRR</h2>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '20px', marginLeft: 'auto', marginRight: '50px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  placeholder="Search rows..." 
                  value={reportSearch} 
                  onChange={e => setReportSearch(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #ccc', width: '200px' }}
                />
                <select 
                  value={reportFilter} 
                  onChange={e => setReportFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #ccc' }}
                >
                  <option value="all">All Records</option>
                  <option value="pending">Only Pending Approval</option>
                </select>
              </div>
              <button
                className="btn"
                style={{ whiteSpace: 'nowrap', padding: '4px 8px', fontSize: '11px', fontWeight: 700, height: '26px', lineHeight: 1 }}
                onClick={() => setStep(3)}
              >
                {'< Back'}
              </button>
              <ProfileMenu currentUser={currentUser} onLogout={onLogout} fixed={false} zIndex={10002} />
            </div>
          </div>
          {isLoadingPreviewAll ? <p>Loading...</p> : null}
          {!isLoadingPreviewAll && !previewAllRows.length ? <p>No MRR rows found.</p> : null}
          {!isLoadingPreviewAll && previewAllRows.length > 0 ? (
            <div className="wrap">
              <table className="table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>GE No</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>MRR No</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Firm</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Mode</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Entry Type</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Supplier</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Total Qty</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Items</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>MRR Weight</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Invoice Weight</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Invoice Rate</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Basic Value</th>
                    <th style={{ fontSize: '11px', whiteSpace: 'nowrap', background: '#d1d5db' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((summary, rIdx) => (
                    <tr key={`r-${rIdx}`}>
                      <td style={{ fontSize: '10px' }}>{summary.geNo || '-'}</td>
                      <td style={{ fontSize: '10px' }}>{summary.mrrNo || '-'}</td>
                      <td style={{ fontSize: '10px' }}>{summary.firm || '-'}</td>
                      <td style={{ fontSize: '10px' }}>{summary.mrrTypeLabel || '-'}</td>
                      <td style={{ fontSize: '10px' }}>{summary.entryType || '-'}</td>
                      <td style={{ fontSize: '10px' }}>{summary.supplier || '-'}</td>
                      <td className="r" style={{ fontSize: '10px' }}>{summary.totalQty || '-'}</td>
                      <td className="r" style={{ fontSize: '10px' }}>{summary.items || '-'}</td>
                      <td className="r" style={{ fontSize: '10px' }}>{summary.mrrWeight || '-'}</td>
                      <td className="r" style={{ fontSize: '10px' }}>{summary.invoiceWeight || '-'}</td>
                      <td className="r" style={{ fontSize: '10px', whiteSpace: 'pre-line' }}>{summary.invoiceRate || '-'}</td>
                      <td className="r" style={{ fontSize: '10px' }}>{summary.basicValue || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: '4px' }}>
                        <button className="btn small" onClick={() => openReviewRow(summary)}>Open to Review</button>
                        <button className="btn small" onClick={() => printRowPdf(summary)}>Print</button>
                        <button className="btn small" onClick={() => downloadRowLabel(summary)}>Download Label</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
        {directLabelPrintJob?.reels?.length ? (
          <section className="direct-label-print-sheet">
            <ReelLabelPrintArea reels={directLabelPrintJob.reels} selectedFirm={directLabelPrintJob.firm} printMode={directLabelPrintJob.mode} />
          </section>
        ) : null}
      </div>
    );
  }

  if (step === 11) {
    return (
      <>
        {userBadge}
        <GateEntriesPage
          selectedFirm={tempFirm}
          deps={{
            fetchSheetRange,
            normalizeGeRow,
            formatDecimal2,
            downloadGateEntryPdfDirect
          }}
          onBack={() => setStep(3)}
          onAdd={() => {
            setEditData(null);
            setStep(4);
          }}
          onEdit={(row) => {
            setEditData(row);
            setStep(4);
          }}
        />
      </>
    );
  }

  if (step === 12) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {userBadge}
        <div style={{ margin: 'auto', background: '#fff', padding: '40px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Select MRR Mode</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="btn main"
              style={{ padding: '16px', background: '#27ae60' }}
              onClick={() => {
                setTempType('reel');
                setPendingFilter('pending_mrr');
                setStep(6);
              }}
            >
              REEL MRR
            </button>
            <button
              className="btn main"
              style={{ padding: '16px', background: '#27ae60' }}
              onClick={() => {
                setTempType('other');
                setPendingFilter('pending_mrr');
                setStep(6);
              }}
            >
              OTHER MRR
            </button>
            <button className="btn" onClick={() => setStep(3)}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function App() {
  const [browserPath, setBrowserPath] = useState(() => normalizeAppPath(getCurrentPathname()));
  const [activeTab, setActiveTab] = useState('invoice');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [invoice, setInvoice] = useState(blankInvoice);
  const [packing, setPacking] = useState(blankPacking);
  const invoiceStateRef = useRef(blankInvoice);
  const packingStateRef = useRef(blankPacking);
  const [geData, setGeData] = useState(null);
  const [pendingGEs, setPendingGEs] = useState([]);
  const [showGeModal, setShowGeModal] = useState(false);
  const [isFetchingGEs, setIsFetchingGEs] = useState(false);
  const [poRows, setPoRows] = useState([]);
  const [poFilter, setPoFilter] = useState('');
  const [status, setStatus] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupTone, setPopupTone] = useState('success');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingPo, setIsLoadingPo] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSavingPacking, setIsSavingPacking] = useState(false);
  const [isApprovingFromForm, setIsApprovingFromForm] = useState(false);
  const [isPreparingLabels, setIsPreparingLabels] = useState(false);
  const [directLabelPrintJob, setDirectLabelPrintJob] = useState(null);
  const [invoicePhotoScanned, setInvoicePhotoScanned] = useState(false);
  const [packingPhotoScanned, setPackingPhotoScanned] = useState(false);
  const [mrrSupplierOptions, setMrrSupplierOptions] = useState([]);
  const [accountsDebitNote, setAccountsDebitNote] = useState('');
  const [accountsDebitNoteDate, setAccountsDebitNoteDate] = useState('');
  const [accountsDebitNoteAmount, setAccountsDebitNoteAmount] = useState('');
  const [plantHeadRemark, setPlantHeadRemark] = useState('');
  const [accountsRemark, setAccountsRemark] = useState('');
  const [mdApprovalRemark, setMdApprovalRemark] = useState('');
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [mrrType, setMrrType] = useState('reel');
  const [isFirmSelected, setIsFirmSelected] = useState(false);
  const [menuBootConfig, setMenuBootConfig] = useState(null);
  const [triggerPendingModal, setTriggerPendingModal] = useState(false);
  const [helperSheetReelSeed, setHelperSheetReelSeed] = useState(0);
  const [manualFields, setManualFields] = useState({}); // { [rowIdx]: { fieldName: true } }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => setBrowserPath(normalizeAppPath(getCurrentPathname()));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleRouteChange = (nextPath, options = {}) => {
    const normalizedTarget = normalizeAppPath(nextPath);
    syncBrowserPath(normalizedTarget, options);
    setBrowserPath(normalizedTarget);
  };

  useEffect(() => {
    invoiceStateRef.current = invoice;
  }, [invoice]);

  useEffect(() => {
    packingStateRef.current = packing;
  }, [packing]);
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [isMrrSavedLocked, setIsMrrSavedLocked] = useState(false);
  const approvalLoadKeyRef = useRef('');
  const approvalSnapshotRef = useRef('');
  const invoiceRef = useRef(null);
  const packingRef = useRef(null);
  const popupTimerRef = useRef(null);
  const scanLockRef = useRef(false);

  const syncInvoiceFieldToPacking = {
    vehicle_no: 'truck_no',
    ge_no: 'ge_no',
    mrr_no: 'mrr_no',
    receipt_date: 'receipt_date',
    actual_mrr_weight: 'actual_total'
  };
  const syncPackingFieldToInvoice = {
    truck_no: 'vehicle_no',
    ge_no: 'ge_no',
    mrr_no: 'mrr_no',
    receipt_date: 'receipt_date',
    actual_total: 'actual_mrr_weight'
  };
  const syncPackingHeaderRows = {
    ge_no: 'ge_no',
    mrr_no: 'mrr_no'
  };
  const accountsInvoiceWeight = firstFilled(
    geData?.actual_weight,
    geData?.invoice_ttl_weight_kgs,
    invoice?.totals?.weight,
    invoice?.goods?.reduce((sum, row) => sum + n(row?.weight), 0),
    ''
  );
  const accountsActualWeight = firstFilled(
    geData?.actual_mrr_weight,
    geData?.actual_mrr_ttl_weight_kgs,
    packing?.actual_total,
    ''
  );
  const accountsWeightDifference = Math.abs(n(accountsInvoiceWeight) - n(accountsActualWeight));

  const setInv = (field, value) => {
    if (isDataEntryLocked) return;
    setInvoice((p) => ({ ...p, [field]: value }));
    const linkedField = syncInvoiceFieldToPacking[field];
    if (linkedField) {
      setPacking((p) => ({
        ...p,
        [linkedField]: value,
        items: syncPackingHeaderRows[linkedField] ? p.items.map((row) => ({ ...row, [syncPackingHeaderRows[linkedField]]: value })) : p.items
      }));
    }
  };

  const setInvNest = (group, field, value) => {
    if (isDataEntryLocked) return;
    setInvoice((p) => {
      const next = { ...p, [group]: { ...p[group], [field]: value } };
      if (isOtherMrr && group === 'bill_to' && field === 'name_address') {
        next.goods = (p.goods || []).map((row) => ({ ...row, supplier: value }));
      }
      return next;
    });
    if (group === 'bill_to' && field === 'name_address') {
      setPacking((p) => ({
        ...p,
        distributor: value,
        buyer: {
          ...(p.buyer || {}),
          name_address: value
        }
      }));
    }
  };
  const invoiceNumericFields = new Set(['sort_no', 'gsm', 'size', 'reels', 'weight', 'rate', 'amount', 'po_rate', 'quantity', 'po_quantity']);
  const setInvRow = (i, field, value) => setInvoice((p) => {
    if (isDataEntryLocked) return p;
    return {
      ...p,
      goods: p.goods.map((row, idx) => {
        if (idx !== i) return row;
        if (field === 'amount') return row;
        const nextValue = invoiceNumericFields.has(field) ? sanitizeNumericInput(value) : value;
        const updated = { ...row, [field]: nextValue };
        if (isOtherMrr && (field === 'quantity' || field === 'rate')) {
          updated.amount = money(n(updated.quantity) * n(updated.rate));
        } else if (field === 'weight' || field === 'rate') {
          updated.amount = money(n(updated.weight) * n(updated.rate));
        }
        return updated;
      })
    };
  });
  const setPack = (field, value) => {
    if (isDataEntryLocked) return;
    setPacking((p) => ({
      ...p,
      [field]: value,
      items: syncPackingHeaderRows[field] ? p.items.map((row) => ({ ...row, [syncPackingHeaderRows[field]]: value })) : p.items
    }));
    const linkedField = syncPackingFieldToInvoice[field];
    if (linkedField) {
      setInvoice((p) => ({ ...p, [linkedField]: value }));
    }
  };
  const setPackNest = (group, field, value) => {
    if (isDataEntryLocked) return;
    setPacking((p) => ({ ...p, [group]: { ...p[group], [field]: value } }));
  };
  const packingNumericFields = new Set(['reel_no', 'sort_no', 'bf', 'gsm', 'size', 'rate', 'po_rate', 'net_wt']);
  const getParentRateForPackingRow = (row) => {
    const normalizeKey = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const itemName = normalizeKey(row?.item_name || row?.reel_details || '');
    const gsm = normalizeKey(row?.gsm || '');
    const size = normalizeKey(row?.size || '');
    const match = (invoice.goods || []).find((g) => {
      const invDesc = normalizeKey(g.description || '');
      const invGsm = normalizeKey(g.gsm || '');
      const invSize = normalizeKey(g.size || '');
      return itemName && gsm && size && invDesc === itemName && invGsm === gsm && invSize === size;
    });
    if (match) return String(match.rate || '').trim();
    const fallback = (invoice.goods || []).find((g) => {
      const invDesc = normalizeKey(g.description || '');
      const invGsm = normalizeKey(g.gsm || '');
      const invSize = normalizeKey(g.size || '');
      const descMatch = itemName ? invDesc === itemName : true;
      return descMatch && ((gsm && invGsm === gsm) || (size && invSize === size));
    });
    if (fallback) return String(fallback.rate || '').trim();
    return '';
  };
  const setPackRow = (i, field, value) => setPacking((p) => {
    if (isDataEntryLocked) return p;
    return {
      ...p,
      items: p.items.map((row, idx) => {
        if (idx !== i) return row;
        if (field === 'mrr_no' || field === 'ge_no') return row;
        if (field === 'po_rate') return row;
        if (field === 'rate') {
          const sanitizedRate = sanitizeSheetErrorText(sanitizeNumericInput(value));
          return { ...row, rate: sanitizedRate };
        }
        const rawValue = packingNumericFields.has(field) ? sanitizeNumericInput(value) : value;
        const nextValue = ['rate', 'po_rate', 'net_wt'].includes(field) ? sanitizeSheetErrorText(rawValue) : rawValue;
        return { ...row, [field]: nextValue };
      })
    };
  });
  const addPackingRow = () => setPacking((p) => {
    if (isDataEntryLocked) return p;
    const targetMrr = String(p.mrr_no || invoice.mrr_no || '').trim();
    const targetGe = String(p.ge_no || invoice.ge_no || '').trim();
    const nextReelNo = String(Math.max(getMaxOurReelNo(p.items), helperSheetReelSeed) + 1);
    return {
      ...p,
      items: [...p.items, { ...blankPackingRow(), mrr_no: targetMrr, ge_no: targetGe, reel_no: nextReelNo }]
    };
  });
  const addInvoiceRow = () => {
    if (isDataEntryLocked) return;
    setInvoice((p) => ({
      ...p,
      goods: [
        ...p.goods,
        {
          ...blankInvoiceRow(),
          ...(isOtherMrr ? { size_unit: 'Kgs', supplier: String(geData?.supplier || geData?.supplier_name || invoice.bill_to?.name_address || '').trim() } : {})
        }
      ]
    }));
  };
  const removeInvoiceRow = (rowIndex) => setInvoice((p) => (isDataEntryLocked ? p : { ...p, goods: p.goods.filter((_, idx) => idx !== rowIndex) }));
  const removePackingRow = (rowIndex) => setPacking((p) => (isDataEntryLocked ? p : { ...p, items: p.items.filter((_, idx) => idx !== rowIndex) }));

  const gross = invoice.goods.reduce((sum, row) => sum + (n(row.amount) || n(row.weight) * n(row.rate)), 0);
  const reels = invoice.goods.reduce((sum, row) => sum + n(row.reels), 0);
  const weight = invoice.goods.reduce((sum, row) => sum + n(row.weight), 0);
  const taxable = gross + n(invoice.totals.insurance);
  const cg = taxable * n(invoice.totals.cgst_pct) / 100;
  const sg = taxable * n(invoice.totals.sgst_pct) / 100;
  const net = taxable + cg + sg + n(invoice.totals.round_off);
  const packingWeight = packing.items.reduce((sum, row) => sum + n(row.net_wt), 0);
  const computedPackingWeight = Number(packing.items.reduce((sum, row) => sum + n(row.net_wt), 0).toFixed(2));
  const computedPackingWeightText = String(computedPackingWeight);
  const isOtherMrr = String(mrrType || '').trim().toLowerCase() === 'other';
  const currentModeLabel = isOtherMrr ? 'OTHER MRR' : 'REEL MRR';
  const invoiceBasicValue = Number(invoice.goods.reduce((sum, row) => sum + (n(row.amount) || (n(row.weight) * n(row.rate))), 0).toFixed(2));
  const mrrBasicValue = isOtherMrr
    ? Number(invoice.goods.reduce((sum, row) => sum + (n(row.rate) * n(row.weight)), 0).toFixed(2))
    : Number(packing.items.reduce((sum, row) => sum + (n(row.rate) * n(row.net_wt)), 0).toFixed(2));
  const invoiceRowCount = invoice.goods.filter(isMeaningful).length;
  const packingRowCount = packing.items.filter(isMeaningful).length;
  const packingReels = packing.items.filter(isMeaningful).length;
  const approvalStage = String(geData?.pending_stage || '').trim();
  const isApprovalMode = ['pending_plant_head_approval', 'pending_accounts_approval', 'pending_md_approval', 'pending_tally_posting'].includes(approvalStage);
  const approvalMrrType = String(geData?.mrr_type || mrrType || '').trim().toLowerCase();
  const approvalEntryType = normalizeOtherMrrEntryType(geData?.mrr_entry_type || invoice.mrr_entry_type || '').toLowerCase();
  const shouldRequireAccountsDebitNote = approvalStage === 'pending_accounts_approval' && (
    (approvalMrrType === 'reel' && accountsWeightDifference > 40) ||
    (approvalMrrType === 'other' && approvalEntryType === 'rejection')
  );
  const isDataEntryLocked = isApprovalMode || isMrrSavedLocked;
  const canChangePageMode = !!selectedFirm && !isApprovalMode && !isMrrSavedLocked && !geData;
  const hasDraftContent = Boolean(
    invoicePhotoScanned ||
    packingPhotoScanned ||
    ensureRows(invoice.goods).length ||
    ensureRows(packing.items).length ||
    isMeaningful(invoice.invoice_no) ||
    isMeaningful(invoice.vehicle_no) ||
    isMeaningful(invoice.bill_to?.name_address) ||
    isMeaningful(packing.challan_no) ||
    isMeaningful(packing.truck_no) ||
    isMeaningful(invoice.ge_no) ||
    isMeaningful(invoice.mrr_no)
  );
  const handlePageModeChange = async (nextType) => {
    if (!selectedFirm || nextType === mrrType || !canChangePageMode) return;
    if (hasDraftContent && !window.confirm('Switching mode will clear the current unsaved MRR draft. Continue?')) {
      return;
    }
    const preservedGeNo = String(firstFilled(invoice.ge_no, packing.ge_no, '')).trim();
    const preservedMrrNo = String(firstFilled(invoice.mrr_no, packing.mrr_no, '')).trim();
    let geEntryDetails = null;
    if (preservedGeNo || preservedMrrNo) {
      try {
        geEntryDetails = await fetchSheetRangeWithParams({
          action: 'get_ge_entry_details',
          ge_no: preservedGeNo,
          mrr_no: preservedMrrNo,
          spreadsheetId: selectedFirm?.spreadsheetId || ''
        }, selectedFirm?.scriptUrl || '');
      } catch {
        geEntryDetails = null;
      }
    }
    const firmHeader = selectedFirm?.header ? { ...selectedFirm.header, note: '' } : defaultHeader();
    const preservedSupplierName = String(firstFilled(
      geEntryDetails?.supplier,
      geData?.supplier_name,
      geData?.supplier,
      invoice.bill_to?.name_address,
      packing.buyer?.name_address,
      packing.distributor,
      ''
    )).trim();
    const preservedInvoiceNo = String(firstFilled(
      geEntryDetails?.invoice_no,
      invoice.invoice_no,
      packing.challan_no,
      ''
    )).trim();
    const preservedTruckNo = String(firstFilled(
      geEntryDetails?.truck_no,
      invoice.vehicle_no,
      packing.truck_no,
      ''
    )).trim();
    const preservedDate = String(firstFilled(
      geEntryDetails?.date,
      invoice.date,
      packing.date,
      ''
    )).trim();
    const nextInvoice = normalizeInvoice({
      ...blankInvoice,
      header: firmHeader,
      ge_no: preservedGeNo,
      mrr_no: preservedMrrNo,
      date: preservedDate,
      receipt_date: invoice.receipt_date || '',
      vehicle_no: preservedTruckNo,
      invoice_no: preservedInvoiceNo,
      actual_weight: invoice.actual_weight || '',
      actual_mrr_weight: invoice.actual_mrr_weight || '',
      signatory_label: selectedFirm?.name || blankInvoice.signatory_label || '',
      bill_to: {
        ...blankInvoice.bill_to,
        name_address: preservedSupplierName
      }
    });
    const nextPacking = normalizePacking({
      ...blankPacking,
      header: firmHeader,
      ge_no: preservedGeNo,
      mrr_no: preservedMrrNo,
      date: preservedDate,
      receipt_date: packing.receipt_date || invoice.receipt_date || '',
      truck_no: preservedTruckNo,
      challan_no: preservedInvoiceNo,
      actual_total: packing.actual_total || invoice.actual_mrr_weight || '',
      distributor: preservedSupplierName,
      receiver_label: selectedFirm?.name || '',
      signatory_label: selectedFirm?.name || blankPacking.signatory_label || '',
      buyer: {
        ...blankPacking.buyer,
        name_address: preservedSupplierName
      }
    });
    setHelperSheetReelSeed(0);
    setIsMrrSavedLocked(false);
    setLastSavedRecord(null);
    setInvoicePhotoScanned(false);
    setPackingPhotoScanned(false);
    setAccountsDebitNote('');
    setAccountsDebitNoteDate('');
    setAccountsDebitNoteAmount('');
    setPlantHeadRemark('');
    setAccountsRemark('');
    setMdApprovalRemark('');
    setGeData(null);
    setMrrType(nextType);
    setInvoice(nextInvoice);
    setPacking(nextPacking);
    approvalLoadKeyRef.current = '';
    approvalSnapshotRef.current = '';
  };
  const isGateEntryLocked = false;
  const approvalStageTitle = approvalStage === 'pending_plant_head_approval'
    ? 'Plant Head Approval View'
    : approvalStage === 'pending_accounts_approval'
    ? 'Accounts Approval View'
    : approvalStage === 'pending_md_approval'
      ? 'MD Approval View'
      : approvalStage === 'pending_tally_posting'
        ? 'Invoice Posting View'
        : '';
  const approvalStatusRows = [
    {
      key: 'plant_head',
      label: 'Plant Head Approval',
      timestamp: String(geData?.plant_head_approval === 'Rejected' ? geData?.plant_head_reject_timestamp : geData?.plant_head_approval_timestamp || '').trim(),
      userEmail: String(geData?.plant_head_approval === 'Rejected' ? geData?.plant_head_reject_usermail : geData?.plant_head_approval_useremail || '').trim(),
      remark: String(geData?.plant_head_remark || '').trim()
    },
    {
      key: 'accounts',
      label: 'Accounts Approval',
      timestamp: String(geData?.accounts_approval === 'Rejected' ? geData?.accounts_reject_timestamp : geData?.accounts_approval_timestamp || '').trim(),
      userEmail: String(geData?.accounts_approval === 'Rejected' ? geData?.accounts_reject_usermail : geData?.accounts_approval_useremail || '').trim(),
      remark: String(geData?.accounts_remark || '').trim()
    },
    {
      key: 'md',
      label: 'MD Approval',
      timestamp: String(geData?.md_approval === 'Rejected' ? geData?.md_reject_timestamp : geData?.md_approval_timestamp || '').trim(),
      userEmail: String(geData?.md_approval === 'Rejected' ? geData?.md_reject_usermail : geData?.md_approval_useremail || '').trim(),
      remark: String(geData?.md_approval_remark || '').trim()
    },
    {
      key: 'tally',
      label: 'Tally Posting',
      timestamp: String(geData?.pending_tally_posting_timestamp || '').trim(),
      userEmail: String(geData?.pending_tally_posting_useremail || '').trim()
    }
  ];
  const requiredLabel = (label) => (
    <>
      {label}
      <span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span>
    </>
  );
  useEffect(() => {
    setAccountsDebitNote(String(geData?.debit_note || '').trim());
    setAccountsDebitNoteDate(String(geData?.debit_note_date || '').trim());
    setAccountsDebitNoteAmount(String(geData?.debit_note_amount || '').trim());
    setPlantHeadRemark(String(geData?.plant_head_remark || '').trim());
    setAccountsRemark(String(geData?.accounts_remark || '').trim());
    setMdApprovalRemark(String(geData?.md_approval_remark || '').trim());
  }, [geData?.debit_note, geData?.debit_note_date, geData?.debit_note_amount, geData?.plant_head_remark, geData?.accounts_remark, geData?.md_approval_remark]);
  const otherMrrLeftMetaRows = [
    ['G. E. No.', invoice.ge_no, undefined, 'text'],
    ['Date', invoice.date, undefined, 'date'],
    ['MRR No', invoice.mrr_no, undefined],
    ['Dt. of Receipt', invoice.receipt_date, undefined, 'date'],
    [requiredLabel('Supplier Document No'), invoice.invoice_no, (v) => setInv('invoice_no', v), 'text', isDataEntryLocked],
    [requiredLabel('Truck Number'), invoice.vehicle_no, (v) => setInv('vehicle_no', v), 'text', isDataEntryLocked],
    ['Invoice Total Weight (kg)', invoice.actual_weight, undefined]
  ];
  const otherMrrRightMetaRows = [
    [requiredLabel('SUPPLIER'), invoice.bill_to?.name_address, (v) => setInvNest('bill_to', 'name_address', v), 'supplier_datalist', isDataEntryLocked, mrrSupplierOptions],
    [requiredLabel('MRR TYPE'), invoice.mrr_entry_type, (v) => setInvoice((p) => ({ ...p, mrr_entry_type: normalizeOtherMrrEntryType(v) })), 'select', isDataEntryLocked, OTHER_MRR_ENTRY_TYPE_OPTIONS],
    ['INVOICE BASIC VALUE', invoiceBasicValue, undefined],
    ['Insurance', invoice.totals.insurance, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, insurance: v } })), 'text', isDataEntryLocked],
    ['Round Off', invoice.totals.round_off, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, round_off: v } })), 'text', isDataEntryLocked],
    ['E-Way Bill No', invoice.eway_no, (v) => setInv('eway_no', v), 'text', isDataEntryLocked],
    ['E-Way Bill Date', invoice.eway_date, (v) => setInv('eway_date', v), 'date', isDataEntryLocked],
    ['', '', undefined, 'text', true]
  ];

  useEffect(() => {
    if (isOtherMrr) {
      const computedInvoiceWeightText = String(Number(weight.toFixed(2)));
      setInvoice((prev) => {
        const currentActualMrr = String(prev.actual_mrr_weight || '').trim();
        if (currentActualMrr === computedInvoiceWeightText) return prev;
        return { ...prev, actual_mrr_weight: computedInvoiceWeightText };
      });
      return;
    }
    setPacking((prev) => {
      const currentActual = String(prev.actual_total || '').trim();
      const currentTotal = String(prev.total_weight || '').trim();
      const currentReels = String(prev.total_reels || '').trim();
      const targetReels = String(packingReels);
      if (currentActual === computedPackingWeightText && currentTotal === computedPackingWeightText && currentReels === targetReels) return prev;
      return {
        ...prev,
        actual_total: computedPackingWeightText,
        total_weight: computedPackingWeightText,
        total_reels: targetReels
      };
    });
    setInvoice((prev) => {
      const currentActualMrr = String(prev.actual_mrr_weight || '').trim();
      if (currentActualMrr === computedPackingWeightText) return prev;
      return { ...prev, actual_mrr_weight: computedPackingWeightText };
    });
  }, [isOtherMrr, computedPackingWeightText, packingReels, weight]);
  useEffect(() => {
    const computedInvoiceWeightText = String(Number(weight.toFixed(2)));
    setInvoice((prev) => {
      const currentInvoiceWeight = String(prev.actual_weight || '').trim();
      if (currentInvoiceWeight === computedInvoiceWeightText) return prev;
      return { ...prev, actual_weight: computedInvoiceWeightText };
    });
  }, [weight]);
  useEffect(() => {
    if (!isOtherMrr) return;
    const supplierFromGe = String(geData?.supplier || geData?.supplier_name || invoice.bill_to?.name_address || '').trim();
    if (!supplierFromGe) return;
    setInvoice((prev) => {
      const hasBlankSupplier = (prev.goods || []).some((row) => !String(row?.supplier || '').trim());
      if (!hasBlankSupplier) return prev;
      return {
        ...prev,
        goods: (prev.goods || []).map((row) => String(row?.supplier || '').trim() ? row : { ...row, supplier: supplierFromGe })
      };
    });
  }, [isOtherMrr, geData?.supplier, geData?.supplier_name, invoice.bill_to?.name_address]);
  const getApprovalSnapshot = (invDoc = invoice, packDoc = packing) => JSON.stringify({
    invoice: {
      ge_no: invDoc.ge_no || '',
      mrr_no: invDoc.mrr_no || '',
      mrr_entry_type: normalizeOtherMrrEntryType(invDoc.mrr_entry_type || ''),
      date: invDoc.date || '',
      receipt_date: invDoc.receipt_date || '',
      invoice_no: invDoc.invoice_no || '',
      vehicle_no: invDoc.vehicle_no || '',
      supplier: invDoc.bill_to?.name_address || '',
      goods: (invDoc.goods || []).map((row) => ({
        po_no: row.po_no || '',
        po_details: row.po_details || '',
        po_date: row.po_date || '',
        supplier: row.supplier || '',
        description: row.description || '',
        gsm: row.gsm || '',
        size: row.size || '',
        weight: row.weight || '',
        rate: row.rate || '',
        amount: row.amount || '',
        po_rate: row.po_rate || '',
        quantity: row.quantity || '',
        po_quantity: row.po_quantity || ''
      })),
      totals: {
        gross_amount: invDoc.totals?.gross_amount || '',
        taxable_gst: invDoc.totals?.taxable_gst || '',
        net_amount: invDoc.totals?.net_amount || ''
      }
    },
    packing: {
      ge_no: packDoc.ge_no || '',
      mrr_no: packDoc.mrr_no || '',
      date: packDoc.date || '',
      receipt_date: packDoc.receipt_date || '',
      challan_no: packDoc.challan_no || '',
      truck_no: packDoc.truck_no || '',
      items: (packDoc.items || []).map((row) => ({
        mrr_no: row.mrr_no || '',
        ge_no: row.ge_no || '',
        po_no: row.po_no || '',
        po_details: row.po_details || '',
        item_name: row.item_name || '',
        reel_details: row.reel_details || '',
        supplier_reel_no: row.supplier_reel_no || '',
        erp_code: row.erp_code || '',
        reel_no: row.reel_no || '',
        sort_no: row.sort_no || '',
        party_order: row.party_order || '',
        bf: row.bf || '',
        gsm: row.gsm || '',
        size: row.size || '',
        unit: row.unit || '',
        rate: row.rate || '',
        po_rate: row.po_rate || '',
        net_wt: row.net_wt || ''
      }))
    }
  });
  const poFilterText = poFilter.trim().toLowerCase();
  const filteredPoRows = poFilterText ? poRows.filter((row) => [row.po_no, row.date, row.supplier, row.po_details, row.erp_code, row.reel_details, row.status].some((value) => String(value || '').toLowerCase().includes(poFilterText))) : poRows;
  const withCurrentOption = (options, current) => current && !options.includes(current) ? [current, ...options] : options;
  const getSelectValue = (options, current) => options.includes(current) ? current : '';
  const normalizeSupplierKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const selectedGateSupplier = String(geData?.supplier || geData?.supplier_name || invoice.bill_to?.name_address || '').trim();
  const poNoOptions = uniqueText(poRows.map((row) => row.po_no).filter(Boolean));
  const getPoRowsForPo = (poNo) => poRows.filter((row) => !poNo || row.po_no === poNo);
  const getPoRowsForRow = (row) => {
    const baseRows = getPoRowsForPo(row.po_no);
    if (!selectedGateSupplier) return baseRows;
    const target = normalizeSupplierKey(selectedGateSupplier);
    const filtered = baseRows.filter((po) => normalizeSupplierKey(po.supplier) === target);
    return filtered.length ? filtered : baseRows;
  };
  const findBestPoRecordForRow = (row, sourceRows = poRows) => {
    if (!sourceRows.length) return null;
    const rowPoNo = String(row.po_no || '').trim();
    const partyOrder = String(row.party_order || '').trim();
    const supplierCode = String(row.erp_code || '').trim();
    const description = String(row.item_name || row.reel_details || '').trim();
    const rowPoDetails = String(row.po_details || '').trim();
    const bf = String(row.bf || '').trim();
    const gsm = String(row.gsm || '').trim();
    const size = String(row.size || '').trim();

    let matches = sourceRows;
    [
      rowPoNo ? (po) => po.po_no === rowPoNo : null,
      partyOrder ? (po) => po.po_no === partyOrder : null,
      rowPoDetails ? (po) => po.po_details === rowPoDetails : null,
      supplierCode ? (po) => po.erp_code === supplierCode : null,
      description ? (po) => po.reel_details === description : null,
      bf ? (po) => po.bf === bf : null,
      gsm ? (po) => po.gsm === gsm : null,
      size ? (po) => po.size === size : null
    ].forEach((matcher) => {
      if (!matcher) return;
      const next = matches.filter(matcher);
      if (next.length) matches = next;
    });

    const exactSheetPo = rowPoNo ? matches.find((po) => po.po_no === rowPoNo) : null;
    if (exactSheetPo) return exactSheetPo;

    const exactByRowData = matches.find((po) => (!supplierCode || po.erp_code === supplierCode) && (!description || po.reel_details === description));
    if (exactByRowData) return exactByRowData;

    return matches.length === 1 ? matches[0] : null;
  };
  const getPoDetailOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => po.po_details).filter(Boolean)), row.po_details);
  const getPoDateOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => po.date).filter(Boolean)), row.po_date);
  const getPoSupplierOptions = (row) => uniqueText([
    ...(selectedGateSupplier ? [selectedGateSupplier] : []),
    ...getPoRowsForRow(row).map((po) => po.supplier).filter(Boolean),
    row.supplier || ''
  ].filter(Boolean));
  const getPoNoOptionsForRow = (row) => {
    const supplierFilteredPoRows = selectedGateSupplier
      ? poRows.filter((po) => normalizeSupplierKey(po.supplier) === normalizeSupplierKey(selectedGateSupplier))
      : poRows;
    const effectivePoRows = supplierFilteredPoRows.length ? supplierFilteredPoRows : poRows;
    const options = row.po_no
      ? uniqueText(getPoRowsForRow(row).map((po) => po.po_no).filter(Boolean))
      : uniqueText(effectivePoRows.map((po) => po.po_no).filter(Boolean));
    return withCurrentOption(options, row.po_no);
  };
  const getPackingAllocationKey = (row, record = null) => {
    const source = record || findBestPoRecordForRow(row, getPoRowsForRow(row)) || row;
    return [
      String(source?.po_no || row?.po_no || '').trim(),
      String(source?.po_details || row?.po_details || '').trim(),
      String(source?.erp_code || row?.erp_code || '').trim(),
      String(source?.reel_details || row?.item_name || row?.reel_details || '').trim()
    ].join('|').toLowerCase();
  };
  const getPackingPoBaseQuantity = (row, record = null) => {
    const source = record || findBestPoRecordForRow(row, getPoRowsForRow(row));
    return n(firstFilled(source?.quantity, source?.quantity_received, 0));
  };
  const getAllocatedPackingWeight = (row, excludeIndex = -1) => {
    const record = findBestPoRecordForRow(row, getPoRowsForRow(row));
    const targetKey = getPackingAllocationKey(row, record);
    return ensureRows(packing.items).reduce((sum, item, idx) => {
      if (idx === excludeIndex) return sum;
      if (getPackingAllocationKey(item) !== targetKey) return sum;
      return sum + n(item?.net_wt);
    }, 0);
  };
  const getPackingRemainingQuantityInfo = (row, excludeIndex = -1) => {
    const record = findBestPoRecordForRow(row, getPoRowsForRow(row));
    const baseQty = getPackingPoBaseQuantity(row, record);
    if (!(baseQty > 0)) return null;
    const allocated = getAllocatedPackingWeight(row, excludeIndex);
    const bounds = getPercentageToleranceBounds(baseQty, 15);
    if (!bounds) return null;
    return {
      baseQty,
      allocated,
      remainingTarget: Math.max(0, bounds.target - allocated),
      remainingMin: Math.max(0, bounds.min - allocated),
      remainingMax: Math.max(0, bounds.max - allocated)
    };
  };
  const getPoRateOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => String(po.rate || '').trim()).filter(Boolean)), row.po_rate);
  const getPoQtyOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).flatMap((po) => {
    const exactQty = String(firstFilled(po.quantity, po.quantity_received, '')).trim();
    return [
      exactQty,
      ...getQuantityToleranceOptions(exactQty)
    ];
  }).filter(Boolean)), row.po_quantity);
  const getDescriptionOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => po.reel_details).filter(Boolean)), row.item_name || row.reel_details);
  const getErpCodeOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).filter((po) => !(row.item_name || row.reel_details) || po.reel_details === (row.item_name || row.reel_details)).map((po) => po.erp_code).filter(Boolean)), row.erp_code);
  const getPackingWeightOptions = (row, rowIndex = -1) => {
    const remainingInfo = getPackingRemainingQuantityInfo(row, rowIndex);
    if (remainingInfo) {
      return withCurrentOption(uniqueText([
        formatToleranceValue(remainingInfo.remainingMin),
        formatToleranceValue(remainingInfo.remainingTarget),
        formatToleranceValue(remainingInfo.remainingMax)
      ].filter(Boolean)), row.net_wt);
    }
    return withCurrentOption(uniqueText(getPoRowsForRow(row).flatMap((po) => {
      const exactQty = String(firstFilled(po.quantity_received, po.quantity, '')).trim();
      return [
        exactQty,
        ...getQuantityToleranceOptions(exactQty)
      ];
    }).filter(Boolean)), row.net_wt);
  };
  const fillPackRowFromPoRecord = (row, record, overrides = {}) => ({
    ...row,
    ...overrides,
    mrr_no: overrides.mrr_no ?? row.mrr_no,
    ge_no: overrides.ge_no ?? row.ge_no,
    po_no: overrides.po_no ?? record?.po_no ?? row.po_no,
    po_details: overrides.po_details ?? record?.po_details ?? row.po_details,
    item_name: overrides.item_name ?? overrides.reel_details ?? record?.reel_details ?? row.item_name,
    reel_details: overrides.reel_details ?? overrides.item_name ?? record?.reel_details ?? row.reel_details,
    supplier_reel_no: overrides.supplier_reel_no ?? row.supplier_reel_no,
    erp_code: overrides.erp_code ?? record?.erp_code ?? row.erp_code,
    bf: overrides.bf ?? record?.bf ?? row.bf,
    gsm: overrides.gsm ?? record?.gsm ?? row.gsm,
    size: overrides.size ?? record?.size ?? row.size,
    rate: overrides.rate ?? row.rate,
    po_rate: overrides.po_rate ?? record?.rate ?? row.po_rate,
    net_wt: overrides.net_wt ?? (record?.quantity_received || record?.quantity || row.net_wt)
  });
  const enrichPackingWithPoRows = (packingDoc, sourceRows = poRows) => {
    if (!sourceRows.length) return packingDoc;
    return normalizePacking({
      ...packingDoc,
      items: ensureRows(packingDoc.items).map((row) => {
        const match = findBestPoRecordForRow(row, sourceRows);
        if (!match) return row;
        return {
          ...fillPackRowFromPoRecord(row, match, {
            mrr_no: row.mrr_no,
            ge_no: row.ge_no,
            po_no: match.po_no || row.po_no,
            po_details: row.po_details || match.po_details,
            supplier_reel_no: row.supplier_reel_no,
            erp_code: row.erp_code || match.erp_code,
            item_name: row.item_name || row.reel_details || match.reel_details,
            reel_details: row.reel_details || row.item_name || match.reel_details,
            bf: row.bf || match.bf,
            gsm: row.gsm || match.gsm,
            size: row.size || match.size,
            rate: row.rate,
            po_rate: row.po_rate || match.rate,
            net_wt: row.net_wt || match.quantity_received || match.quantity
          }),
          reel_no: row.reel_no || '',
          party_order: row.party_order || row.po_no || match.po_no
        };
      })
    });
  };
  const updatePackRowFromSource = (index, updater) => setPacking((p) => ({ ...p, items: p.items.map((row, idx) => idx === index ? updater(row) : row) }));
  const handlePoNoSelect = (index, poNo) => updatePackRowFromSource(index, (row) => {
    const lockedRate = String((row.rate ?? getParentRateForPackingRow(row)) ?? '').trim();
    const matches = getPoRowsForPo(poNo);
    if (matches.length === 1) return fillPackRowFromPoRecord(row, matches[0], { po_no: poNo, rate: lockedRate });
    const keepDescription = matches.some((po) => po.reel_details === (row.item_name || row.reel_details)) ? (row.item_name || row.reel_details) : '';
    const keepErpCode = matches.some((po) => po.erp_code === row.erp_code) ? row.erp_code : '';
    return {
      ...row,
      po_no: poNo,
      po_details: matches[0]?.po_details || row.po_details,
      item_name: keepDescription,
      reel_details: keepDescription,
      supplier_reel_no: row.supplier_reel_no,
      erp_code: keepErpCode,
      rate: lockedRate
    };
  });
  const handlePoDetailsSelect = (index, poDetails) => updatePackRowFromSource(index, (row) => {
    const lockedRate = String((row.rate ?? getParentRateForPackingRow(row)) ?? '').trim();
    const matches = getPoRowsForPo(row.po_no).filter((po) => po.po_details === poDetails);
    const match = matches.find((po) => (!row.item_name || po.reel_details === (row.item_name || row.reel_details)) && (!row.erp_code || po.erp_code === row.erp_code)) || matches[0];
    return fillPackRowFromPoRecord(row, match, { po_details: poDetails, po_no: match?.po_no || row.po_no, rate: lockedRate });
  });
  const handleDescriptionSelect = (index, description) => updatePackRowFromSource(index, (row) => {
    const lockedRate = String((row.rate ?? getParentRateForPackingRow(row)) ?? '').trim();
    const matches = getPoRowsForPo(row.po_no).filter((po) => po.reel_details === description);
    const match = matches.find((po) => po.erp_code === row.erp_code) || matches[0];
    return fillPackRowFromPoRecord(row, match, { item_name: description, reel_details: description, po_no: match?.po_no || row.po_no, rate: lockedRate });
  });
  const handlePoNoSelectInvoice = (index, poNo) => setInvoice((p) => ({
    ...p,
    goods: p.goods.map((row, idx) => {
      if (idx !== index) return row;
      const matches = getPoRowsForPo(poNo);
      if (!matches.length) return { ...row, po_no: poNo };
      const targetSupplier = normalizeSupplierKey(selectedGateSupplier || row.supplier);
      const match = matches.find((m) => normalizeSupplierKey(m.supplier) === targetSupplier) || matches[0];
      const nextUnit = String(match.unit || '').trim() || row.size_unit || row.unit || '';
      const nextRate = String(row.rate ?? '').trim() !== '' ? row.rate : match.rate;
      const nextPoQty = firstFilled(match.quantity, match.quantity_received);
      const nextQty = String(row.quantity || '').trim() ? row.quantity : nextPoQty;
      const nextAmount = isOtherMrr ? money(n(nextQty) * n(nextRate)) : row.amount;
      return {
        ...row,
        po_no: poNo,
        po_details: match.po_details,
        po_date: match.date,
        supplier: match.supplier,
        po_rate: match.rate,
        po_quantity: firstFilled(match.quantity, match.quantity_received),
        size_unit: nextUnit || row.size_unit,
        rate: nextRate,
        quantity: nextQty,
        amount: nextAmount,
        description: match.reel_details || row.description,
        gsm: match.gsm || row.gsm,
        size: match.size || row.size
      };
    })
  }));
  const handlePoDetailsSelectInvoice = (index, poDetails) => setInvoice((p) => ({
    ...p,
    goods: p.goods.map((row, idx) => {
      if (idx !== index) return row;
      const matches = getPoRowsForPo(row.po_no).filter(m => m.po_details === poDetails);
      if (!matches.length) return { ...row, po_details: poDetails };
      const match = matches[0];
      const nextUnit = String(match.unit || '').trim() || row.size_unit || row.unit || '';
      const nextRate = String(row.rate || '').trim() ? row.rate : match.rate;
      const nextPoQty = firstFilled(match.quantity, match.quantity_received);
      const nextQty = String(row.quantity || '').trim() ? row.quantity : nextPoQty;
      const nextAmount = isOtherMrr ? money(n(nextQty) * n(nextRate)) : row.amount;
      return {
        ...row,
        po_details: poDetails,
        po_date: match.date,
        supplier: match.supplier,
        po_rate: match.rate,
        po_quantity: firstFilled(match.quantity, match.quantity_received),
        size_unit: nextUnit || row.size_unit,
        rate: nextRate,
        quantity: nextQty,
        amount: nextAmount,
        description: match.reel_details || row.description,
        gsm: match.gsm || row.gsm,
        size: match.size || row.size
      };
    })
  }));

  const toggleManual = (i, field) => {
    setManualFields(prev => ({
      ...prev,
      [i]: {
        ...(prev[i] || {}),
        [field]: !prev[i]?.[field]
      }
    }));
  };
  const isSaving = isSavingInvoice || isSavingPacking;
  const statusTone = isScanning || isLoadingPo || isSaving ? 'working' : !status ? 'idle' : /failed|could not|error|blocked/i.test(status) ? 'error' : /reading|loading|saving/i.test(status) ? 'working' : 'success';
  const statusText = status || 'Ready to load PO details, scan invoice, and scan packing slip photos';
  const showPopup = (message, tone = 'success') => {
    setPopupMessage(message);
    setPopupTone(tone);
    if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
    popupTimerRef.current = window.setTimeout(() => {
      setPopupMessage('');
      popupTimerRef.current = null;
    }, 4000);
  };

  const loadPoDetails = async () => {
    if (!selectedFirm) return;
    setIsLoadingPo(true);
    const poSheet = getSheetName(selectedFirm.po, mrrType);
    setStatus(`Loading PO details for ${selectedFirm.name} (${mrrType.toUpperCase()})...`);
    try {
      const payload = await fetchSheetRange(poSheet, selectedFirm.spreadsheetId, selectedFirm.scriptUrl);
      const allRows = Array.isArray(payload?.data)
        ? payload.data.map((row) => normalizePoRow(row))
        : sheetValuesToPoRows(payload?.values || []);
      const rows = allRows.filter((row) => isPoOpenRow(row));
      const enrichedPacking = enrichPackingWithPoRows(packing, rows);
      setPoRows(rows);
      setPacking(enrichedPacking);
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load PO details.');
    } finally {
      setIsLoadingPo(false);
    }
  };

  const fetchLastIds = async () => {
    if (!selectedFirm) return;
    const mrrSheet = getSheetName(selectedFirm.mrr, mrrType);
    console.log(`Fetching latest IDs for ${selectedFirm.name} (${mrrType})...`);
    setStatus(`Syncing ${selectedFirm.name} IDs (Next Number + 1)...`);
    
    try {
      const baseDate = invoice.date || packing.date || new Date().toLocaleDateString('en-GB');
      const prefix = `${getFirmCode(selectedFirm)}/${getFinancialYearLabel(baseDate)}/`;
      const data = await fetchLatestMrrGe(mrrSheet, selectedFirm.spreadsheetId, selectedFirm.scriptUrl, prefix, 'GE ENTRY');
      const lastMrr = Number(data.mrr) || 0;
      const lastGe = Number(data.ge) || 0;
      
      console.log(`${selectedFirm.name} Latest IDs:`, { mrr: lastMrr, ge: lastGe });
      const nextMrr = formatGateEntryNumber(selectedFirm, baseDate, lastMrr + 1);
      const nextGe = formatGateEntryNumber(selectedFirm, baseDate, lastGe + 1);
      
      setInvoice(prev => ({ 
        ...prev, 
        mrr_no: shouldAutoNumber(prev.mrr_no) ? nextMrr : prev.mrr_no, 
        ge_no: shouldAutoNumber(prev.ge_no) ? nextGe : prev.ge_no 
      }));
      setPacking(prev => {
        const targetMrr = shouldAutoNumber(prev.mrr_no) ? nextMrr : prev.mrr_no;
        const targetGe = shouldAutoNumber(prev.ge_no) ? nextGe : prev.ge_no;
        return { 
          ...prev, 
          mrr_no: targetMrr, 
          ge_no: targetGe,
          items: (prev.items || []).map(row => ({ ...row, mrr_no: targetMrr, ge_no: targetGe }))
        };
      });
      setStatus(`Ready. ${selectedFirm.name} Next MRR: ${nextMrr}, GE: ${nextGe}`);
    } catch (err) {
      console.error(`Could not fetch IDs for ${selectedFirm.id}:`, err);
      setStatus(`Alert: Could not sync ${selectedFirm.name} IDs. Manual entry required.`);
    }
  };

  const fetchHelperSheetReelSeed = async () => {
    if (!selectedFirm) return;
    try {
      const helperSheet = getSheetName(selectedFirm.helper, mrrType);
      const payload = await fetchSheetRange(helperSheet, selectedFirm.spreadsheetId, selectedFirm.scriptUrl);
      const maxReel = getMaxOurReelNoFromSheetPayload(payload);
      setHelperSheetReelSeed(maxReel);
    } catch (err) {
      console.warn('Could not load last reel number from item records:', err?.message || err);
      setHelperSheetReelSeed(0);
    }
  };

  const loadMrrSupplierOptions = async (firmCtx = selectedFirm) => {
    if (!firmCtx) {
      setMrrSupplierOptions([]);
      return;
    }
    try {
      const [baseList, otherList] = await Promise.all([
        fetchUniqueSuppliers(firmCtx, getSheetName(firmCtx?.po, 'reel') || 'PO DETAILS').catch(() => []),
        fetchUniqueSuppliers(firmCtx, getSheetName(firmCtx?.po, 'other') || 'OTHER PO').catch(() => [])
      ]);
      const merged = [...new Set([...(baseList || []), ...(otherList || [])].map((v) => String(v || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setMrrSupplierOptions(merged);
    } catch {
      setMrrSupplierOptions([]);
    }
  };

  const handleFirmSelection = (firm, type = 'reel', openPending = false, pendingItem = null) => {
    const firmHeader = firm?.header ? { ...firm.header, note: '' } : defaultHeader();
    const nextInvoice = normalizeInvoice({
      ...blankInvoice,
      header: firmHeader,
      signatory_label: firm?.name || blankInvoice.signatory_label || ''
    });
    const nextPacking = normalizePacking({
      ...blankPacking,
      header: firmHeader,
      receiver_label: firm?.name || '',
      signatory_label: firm?.name || blankPacking.signatory_label || ''
    });
    setMenuBootConfig(null);
    setHelperSheetReelSeed(0);
    setIsMrrSavedLocked(false);
    setLastSavedRecord(null);
    setInvoicePhotoScanned(false);
    setPackingPhotoScanned(false);
    setAccountsDebitNote('');
    setAccountsDebitNoteDate('');
    setAccountsDebitNoteAmount('');
    setPlantHeadRemark('');
    setAccountsRemark('');
    setMdApprovalRemark('');
    setSelectedFirm(firm);
    setMrrType(type);
    setIsFirmSelected(true);
    setTriggerPendingModal(openPending);
    if (pendingItem) {
      const geNo = pendingItem.ge_entry || pendingItem.ge_no || pendingItem.ge_entry_no || '';
      const supplier = pendingItem.supplier_name || pendingItem.supplier || '';
      const truck = pendingItem.truck_no || '';
      const invNo = pendingItem.invoice_no || '';
      const mrrNo = pendingItem.mrr_number || pendingItem.mrr_no || '';
      const docDate = pendingItem.date || '';
      const receiptDate = getTodayInputDate();
      setGeData(pendingItem);
      setInvoice(normalizeInvoice({
        ...blankInvoice,
        header: firmHeader,
        ge_no: String(geNo),
        mrr_no: String(mrrNo),
        date: docDate || blankInvoice.date,
        receipt_date: receiptDate,
        vehicle_no: truck,
        invoice_no: invNo,
        signatory_label: firm?.name || blankInvoice.signatory_label || '',
        bill_to: {
          ...blankInvoice.bill_to,
          name_address: supplier
        },
        goods: []
      }));
      setPacking(normalizePacking({
        ...blankPacking,
        header: firmHeader,
        ge_no: String(geNo),
        mrr_no: String(mrrNo),
        date: docDate || blankPacking.date,
        receipt_date: receiptDate,
        truck_no: truck,
        challan_no: invNo,
        signatory_label: firm?.name || blankPacking.signatory_label || '',
        buyer: {
          ...blankPacking.buyer,
          name_address: supplier
        },
        items: []
      }));
    } else {
      setGeData(null);
      setInvoice(nextInvoice);
      setPacking(nextPacking);
    }
    approvalLoadKeyRef.current = '';
    approvalSnapshotRef.current = '';
  };

  const rememberOverlaySelection = (firm, type = 'reel') => {
    if (!firm) return;
    setSelectedFirm(firm);
    setMrrType(type || 'reel');
  };

  const handleUserLogin = (user) => {
    setCurrentUser(user || null);
    try {
      if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
    }
  };

  const handleUserLogout = () => {
    handleUserLogin(null);
    setIsFirmSelected(false);
    setSelectedFirm(null);
    setMenuBootConfig(null);
    setIsMrrSavedLocked(false);
    setLastSavedRecord(null);
  };

  useEffect(() => {
    if (currentUser) return;
    setIsFirmSelected(false);
    setSelectedFirm(null);
    setGeData(null);
    setShowGeModal(false);
    setPendingGEs([]);
    setMenuBootConfig(null);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isFirmSelected) return;
    handleRouteChange(APP_ROUTES.mrr, { replace: browserPath === '/' });
  }, [browserPath, currentUser, isFirmSelected]);

  const openStageMenuView = (typeOverride = mrrType, view = 'dashboard', overrides = {}) => {
    const targetFirmId = overrides.firmId || selectedFirm?.id;
    if (!targetFirmId) return;
    setShowGeModal(false);
    setGeData(null);
    setTriggerPendingModal(false);
    setMenuBootConfig({
      token: Date.now(),
      firmId: targetFirmId,
      type: overrides.type || typeOverride || 'reel',
      view,
      pendingFilter: overrides.pendingFilter || '',
      reportFilter: overrides.reportFilter || '',
      labelMrr: overrides.labelMrr || ''
    });
    setIsFirmSelected(false);
  };

  const goBackFromFormView = () => {
    const returnView = String(geData?.return_menu_view || '').trim();
    const returnPendingFilter = String(geData?.return_menu_pending_filter || '').trim();
    const returnReportFilter = String(geData?.return_menu_report_filter || '').trim();
    openStageMenuView(
      mrrType,
      returnView || (isApprovalMode ? 'all_approvals' : 'dashboard'),
      {
        firmId: geData?.return_menu_firm_id || selectedFirm?.id,
        type: geData?.return_menu_type || mrrType,
        pendingFilter: returnPendingFilter,
        reportFilter: returnReportFilter
      }
    );
  };

  const approveFromMainForm = async (decision = 'approve') => {
    if (!isApprovalMode) return;
    const mrrNumber = String(geData?.mrr_number || geData?.mrr_no || invoice.mrr_no || packing.mrr_no || '').trim();
    if (!mrrNumber) {
      showPopup('MRR No. missing for approval.', 'error');
      return;
    }
    if (decision === 'approve' && shouldRequireAccountsDebitNote) {
      if (!String(accountsDebitNote || '').trim() || !String(accountsDebitNoteDate || '').trim() || !String(accountsDebitNoteAmount || '').trim()) {
        showPopup(
          approvalMrrType === 'other'
            ? 'Debit Note, Debit Note Date, and Debit Note Amount are required for OTHER MRR Rejection.'
            : 'Debit Note, Debit Note Date, and Debit Note Amount are required when weight difference is more than 40 kg.',
          'error'
        );
        return;
      }
    }
    if (approvalStage === 'pending_plant_head_approval' && decision === 'reject' && !String(plantHeadRemark || '').trim()) {
      showPopup('Plant Head Remark is required for rejection.', 'error');
      return;
    }
    if (approvalStage === 'pending_accounts_approval' && decision === 'reject' && !String(accountsRemark || '').trim()) {
      showPopup('Accounts Remark is required for rejection.', 'error');
      return;
    }
    if (approvalStage === 'pending_md_approval' && decision === 'reject' && !String(mdApprovalRemark || '').trim()) {
      showPopup('MD Approval Remark is required for rejection.', 'error');
      return;
    }
    try {
      setIsApprovingFromForm(true);
      const result = await approvePendingStage({
        decision,
        stage: approvalStage,
        mrrNumber,
        geNo: geData?.ge_no || geData?.ge_entry || invoice.ge_no || packing.ge_no || '',
        userEmail: currentUser?.email || '',
        plantHeadRemark: approvalStage === 'pending_plant_head_approval' ? plantHeadRemark : '',
        accountsRemark: approvalStage === 'pending_accounts_approval' ? accountsRemark : '',
        mdApprovalRemark: approvalStage === 'pending_md_approval' ? mdApprovalRemark : '',
        debitNote: approvalStage === 'pending_accounts_approval' ? accountsDebitNote : '',
        debitNoteDate: approvalStage === 'pending_accounts_approval' ? accountsDebitNoteDate : '',
        debitNoteAmount: approvalStage === 'pending_accounts_approval' ? accountsDebitNoteAmount : '',
        mrrSheetName: getSheetName(selectedFirm.mrr, mrrType),
        helperSheetName: getSheetName(selectedFirm.helper, mrrType),
        spreadsheetId: selectedFirm?.spreadsheetId,
        scriptUrl: selectedFirm?.scriptUrl
      });
      const next = result?.next_stage || 'completed';
      if (next === 'rejected') {
        showPopup(`Rejected ${mrrNumber}.`, 'success');
        setGeData((prev) => {
          if (!prev) return prev;
          const nextState = { ...prev, pending_stage: 'rejected' };
          if (approvalStage === 'pending_plant_head_approval') {
            nextState.plant_head_approval = 'Rejected';
            nextState.plant_head_reject_timestamp = result?.timestamp || nextState.plant_head_reject_timestamp || '';
            nextState.plant_head_reject_usermail = result?.user_email || nextState.plant_head_reject_usermail || '';
            nextState.plant_head_remark = result?.plant_head_remark ?? plantHeadRemark;
          }
          if (approvalStage === 'pending_accounts_approval') {
            nextState.accounts_approval = 'Rejected';
            nextState.accounts_reject_timestamp = result?.timestamp || nextState.accounts_reject_timestamp || '';
            nextState.accounts_reject_usermail = result?.user_email || nextState.accounts_reject_usermail || '';
            nextState.accounts_remark = result?.accounts_remark ?? accountsRemark;
          }
          if (approvalStage === 'pending_md_approval') {
            nextState.md_approval = 'Rejected';
            nextState.md_reject_timestamp = result?.timestamp || nextState.md_reject_timestamp || '';
            nextState.md_reject_usermail = result?.user_email || nextState.md_reject_usermail || '';
            nextState.md_approval_remark = result?.md_approval_remark ?? mdApprovalRemark;
          }
          return nextState;
        });
      } else if (next === 'completed') {
        showPopup(`Approved and completed for ${mrrNumber}.`, 'success');
        setGeData((prev) => {
          if (!prev) return prev;
          const nextState = { ...prev, pending_stage: 'completed' };
          if (approvalStage === 'pending_tally_posting') {
            nextState.pending_tally_posting_timestamp = result?.timestamp || nextState.pending_tally_posting_timestamp || '';
            nextState.pending_tally_posting_useremail = result?.user_email || nextState.pending_tally_posting_useremail || '';
          }
          return nextState;
        });
      } else {
        const label = next === 'pending_accounts_approval'
          ? 'Pending Accounts Approval'
          : next === 'pending_md_approval'
            ? 'Pending MD Approval'
          : next === 'pending_tally_posting'
            ? 'Pending Invoice Posting'
            : next;
        showPopup(`Approved. Moved to ${label}.`, 'success');
        setGeData((prev) => {
          if (!prev) return prev;
          const nextState = { ...prev, pending_stage: next };
          if (approvalStage === 'pending_plant_head_approval') {
            nextState.plant_head_approval_timestamp = result?.timestamp || nextState.plant_head_approval_timestamp || '';
            nextState.plant_head_approval_useremail = result?.user_email || nextState.plant_head_approval_useremail || '';
            nextState.plant_head_remark = result?.plant_head_remark ?? plantHeadRemark;
          }
          if (approvalStage === 'pending_accounts_approval') {
            nextState.accounts_approval = result?.decision === 'reject' ? 'Rejected' : (nextState.accounts_approval || 'Approved');
            nextState.accounts_approval_timestamp = result?.timestamp || nextState.accounts_approval_timestamp || '';
            nextState.accounts_approval_useremail = result?.user_email || nextState.accounts_approval_useremail || '';
            nextState.accounts_remark = result?.accounts_remark ?? accountsRemark;
            nextState.debit_note = result?.debit_note ?? accountsDebitNote;
            nextState.debit_note_date = result?.debit_note_date ?? accountsDebitNoteDate;
            nextState.debit_note_amount = result?.debit_note_amount ?? accountsDebitNoteAmount;
          }
          if (approvalStage === 'pending_md_approval') {
            nextState.md_approval_timestamp = result?.timestamp || nextState.md_approval_timestamp || '';
            nextState.md_approval_useremail = result?.user_email || nextState.md_approval_useremail || '';
            nextState.md_approval_remark = result?.md_approval_remark ?? mdApprovalRemark;
          }
          return nextState;
        });
      }
      // After approving from the form, return to grouped approvals so the user can continue approvals quickly.
      openStageMenuView(
        mrrType,
        'all_approvals',
        {
          firmId: geData?.return_menu_firm_id || selectedFirm?.id,
          type: geData?.return_menu_type || mrrType
        }
      );
      approvalSnapshotRef.current = getApprovalSnapshot();
    } catch (err) {
      showPopup(err?.message || 'Approval failed.', 'error');
    } finally {
      setIsApprovingFromForm(false);
    }
  };

  const saveAllData = async (options = {}) => {
    if (isApprovalMode) {
      showPopup('Save is disabled in Approval view. Use Approve only.', 'error');
      return false;
    }
    if (isMrrSavedLocked) {
      showPopup('This MRR is locked after save. Open another MRR to edit.', 'error');
      return false;
    }
    const goToMenuAfterSuccess = options.goToMenuAfterSuccess !== false;
    const mrrNumber = String(invoice.mrr_no || packing.mrr_no || '').trim();
    if (!mrrNumber) {
      const errorMessage = 'MRR No. is required before saving.';
      setStatus(errorMessage);
      showPopup(errorMessage, 'error');
      return false;
    }
    const invoiceMandatoryError = getInvoiceMandatoryError(invoice, mrrType);
    if (invoiceMandatoryError) {
      setStatus(invoiceMandatoryError);
      showPopup(invoiceMandatoryError, 'error');
      return false;
    }
    if (isOtherMrr && !String(invoice.mrr_entry_type || '').trim()) {
      const errorMessage = 'MRR TYPE is required for OTHER MRR.';
      setStatus(errorMessage);
      showPopup(errorMessage, 'error');
      return false;
    }
    const resolvedPackingForSave = !isOtherMrr
      ? {
          ...packing,
          items: (packing.items || []).map((row) => ({
            ...row,
            rate: String((row.rate ?? getParentRateForPackingRow(row)) ?? '').trim()
          }))
        }
      : packing;

    if (!isOtherMrr) {
      const packingMandatoryError = getPackingMandatoryError(resolvedPackingForSave);
      if (packingMandatoryError) {
        setStatus(packingMandatoryError);
        showPopup(packingMandatoryError, 'error');
        return false;
      }
      const exceededPackingRow = ensureRows(resolvedPackingForSave.items).find((row, index) => {
        const remainingInfo = getPackingRemainingQuantityInfo(row, index);
        if (!remainingInfo) return false;
        return n(row?.net_wt) > remainingInfo.remainingMax;
      });
      if (exceededPackingRow) {
        const remainingInfo = getPackingRemainingQuantityInfo(exceededPackingRow, resolvedPackingForSave.items.indexOf(exceededPackingRow));
        const errorMessage = `Net weight exceeds PO allowed limit for ${exceededPackingRow.po_details || exceededPackingRow.po_no || 'selected PO'}. Allowed max is ${formatToleranceValue(remainingInfo?.remainingMax || 0)} after attached rows.`;
        setStatus(errorMessage);
        showPopup(errorMessage, 'error');
        return false;
      }
    }

    setIsSavingInvoice(true);
    setIsSavingPacking(true);
    const mrrSheet = getSheetName(selectedFirm.mrr, mrrType);
    const helperSheet = getSheetName(selectedFirm.helper, mrrType);
    const saveTraceId = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log('[UI SAVE START]', {
      saveTraceId,
      firm: selectedFirm?.name || '',
      mode: mrrType,
      mrrNumber,
      geNo: invoice.ge_no || packing.ge_no || '',
      mrrSheet,
      helperSheet,
      spreadsheetId: selectedFirm?.spreadsheetId || '',
      scriptUrl: selectedFirm?.scriptUrl || '',
      goodsRows: Array.isArray(invoice.goods) ? invoice.goods.length : 0,
      packingRows: Array.isArray(packing.items) ? packing.items.length : 0
    });
    
    const syncedInvoiceForSave = {
      ...invoice,
      actual_weight: String(Number(weight.toFixed(2))),
      totals: {
        ...invoice.totals,
        gross_amount: String(Number(gross.toFixed(2))),
        taxable_gst: String(Number(taxable.toFixed(2))),
        net_amount: String(Number(net.toFixed(2)))
      }
    };
    const syncedPackingForSave = {
      ...resolvedPackingForSave,
      total_reels: String(packingReels),
      total_weight: String(Number(packingWeight.toFixed(2))),
      actual_total: String(Number(packingWeight.toFixed(2)))
    };

    if (isOtherMrr) {
      setStatus(`Saving data to ${mrrSheet}...`);
      try {
        const result = await saveInvoiceToSheets(syncedInvoiceForSave, syncedPackingForSave, poRows, {
          mrrSheetName: mrrSheet,
          helperSheetName: helperSheet,
          mode: mrrType,
          spreadsheetId: selectedFirm.spreadsheetId,
          scriptUrl: selectedFirm.scriptUrl,
          enforceStrictMrrHeaders: false
        });
        const successMessage = result?.verificationSkipped
          ? `Saved for ${mrrNumber}.`
          : `Saved for ${mrrNumber}. ${mrrSheet} rows found: ${Number(result?.mrrForm?.updatedRows || 0)}.`;
        const finalMessage = result?.warning ? `${successMessage} ${result.warning}` : successMessage;
        setStatus(finalMessage);
        showPopup(finalMessage, 'success');
        setLastSavedRecord({
          savedAt: new Date().toLocaleString(),
          mode: mrrType,
          firm: selectedFirm?.name || '',
          mrrNumber,
          geNo: invoice.ge_no || packing.ge_no || '',
          mrrSheet,
          helperSheet
        });
        setGeData((prev) => ({
          ...(prev || {}),
          ge_no: syncedInvoiceForSave.ge_no || syncedPackingForSave.ge_no || prev?.ge_no || '',
          mrr_no: syncedInvoiceForSave.mrr_no || syncedPackingForSave.mrr_no || prev?.mrr_no || '',
          mrr_number: syncedInvoiceForSave.mrr_no || syncedPackingForSave.mrr_no || prev?.mrr_number || '',
          mrr_entry_type: syncedInvoiceForSave.mrr_entry_type || prev?.mrr_entry_type || '',
          date: syncedInvoiceForSave.date || syncedPackingForSave.date || prev?.date || '',
          supplier: syncedInvoiceForSave.bill_to?.name_address || syncedPackingForSave.buyer?.name_address || prev?.supplier || '',
          supplier_name: syncedInvoiceForSave.bill_to?.name_address || syncedPackingForSave.buyer?.name_address || prev?.supplier_name || '',
          invoice_no: syncedInvoiceForSave.invoice_no || syncedPackingForSave.challan_no || prev?.invoice_no || '',
          truck_no: syncedInvoiceForSave.vehicle_no || syncedPackingForSave.truck_no || prev?.truck_no || '',
          total_value: invoiceBasicValue || prev?.total_value || ''
        }));
        setIsMrrSavedLocked(true);
        console.log('[SAVE OK]', {
          saveTraceId,
          firm: selectedFirm?.name || '',
          mode: mrrType,
          mrrNumber,
          geNo: invoice.ge_no || packing.ge_no || '',
          mrrSheet,
          helperSheet,
          result
        });
        if (goToMenuAfterSuccess) openStageMenuView(mrrType);
        else setTimeout(() => fetchLastIds(), 500);
      } catch (err) {
        console.error('[SAVE FAILED]', {
          saveTraceId,
          firm: selectedFirm?.name || '',
          mode: mrrType,
          mrrNumber,
          geNo: invoice.ge_no || packing.ge_no || '',
          mrrSheet,
          helperSheet,
          scriptUrl: selectedFirm?.scriptUrl || '',
          spreadsheetId: selectedFirm?.spreadsheetId || '',
          error: err?.message || String(err),
          stack: err?.stack || ''
        });
        setStatus(err?.message || 'Could not save data to the database.');
        showPopup(err?.message || 'Error saving invoice', 'error');
        return false;
      } finally {
        setIsSavingInvoice(false);
        setIsSavingPacking(false);
      }
      return true;
    }

    setStatus(`Saving data to ${mrrSheet} and ${helperSheet}...`);
    try {
      const todayReceiptDate = getTodayInputDate();
      const firmHeader = selectedFirm?.header ? { ...selectedFirm.header, note: '' } : invoice.header;
      const preparedInvoice = {
        ...syncedInvoiceForSave,
        header: firmHeader,
        receipt_date: todayReceiptDate,
        signatory_label: selectedFirm?.name || invoice.signatory_label || ''
      };
      const preparedPacking = {
        ...syncedPackingForSave,
        header: firmHeader,
        receipt_date: todayReceiptDate,
        signatory_label: selectedFirm?.name || packing.signatory_label || ''
      };

      const result = await savePackingToSheets(preparedInvoice, preparedPacking, poRows, {
        mrrSheetName: mrrSheet,
        helperSheetName: helperSheet,
        spreadsheetId: selectedFirm.spreadsheetId,
        scriptUrl: selectedFirm.scriptUrl
      });
      const successMessage = result?.verificationSkipped
        ? `Saved for ${mrrNumber}.`
        : `Saved for ${mrrNumber}. Item rows found: ${Number(result?.helperSheet?.insertedRows || 0)}. MRR rows found: ${Number(result?.mrrForm?.updatedRows || 0)}.`;
      const finalMessage = result?.warning ? `${successMessage} ${result.warning}` : successMessage;
      setStatus(finalMessage);
      showPopup(finalMessage, 'success');
      setLastSavedRecord({
        savedAt: new Date().toLocaleString(),
        mode: mrrType,
        firm: selectedFirm?.name || '',
        mrrNumber,
        geNo: preparedInvoice.ge_no || preparedPacking.ge_no || '',
        mrrSheet,
        helperSheet
      });
      setGeData((prev) => ({
        ...(prev || {}),
        ge_no: preparedInvoice.ge_no || preparedPacking.ge_no || prev?.ge_no || '',
        mrr_no: preparedInvoice.mrr_no || preparedPacking.mrr_no || prev?.mrr_no || '',
        mrr_number: preparedInvoice.mrr_no || preparedPacking.mrr_no || prev?.mrr_number || '',
        mrr_entry_type: preparedInvoice.mrr_entry_type || prev?.mrr_entry_type || '',
        date: preparedInvoice.date || preparedPacking.date || prev?.date || '',
        supplier: preparedInvoice.bill_to?.name_address || preparedPacking.buyer?.name_address || prev?.supplier || '',
        supplier_name: preparedInvoice.bill_to?.name_address || preparedPacking.buyer?.name_address || prev?.supplier_name || '',
        invoice_no: preparedInvoice.invoice_no || preparedPacking.challan_no || prev?.invoice_no || '',
        truck_no: preparedInvoice.vehicle_no || preparedPacking.truck_no || prev?.truck_no || '',
        total_value: invoiceBasicValue || prev?.total_value || ''
      }));
      setIsMrrSavedLocked(true);
      setHelperSheetReelSeed((prev) => Math.max(prev, getMaxOurReelNo(preparedPacking.items || [])));
      console.log('[SAVE OK]', {
        saveTraceId,
        firm: selectedFirm?.name || '',
        mode: mrrType,
        mrrNumber,
        geNo: preparedInvoice.ge_no || preparedPacking.ge_no || '',
        mrrSheet,
        helperSheet,
        result
      });
      if (goToMenuAfterSuccess) openStageMenuView(mrrType);
      else setTimeout(() => fetchLastIds(), 500);
    } catch (err) {
      console.error('[SAVE FAILED]', {
        saveTraceId,
        firm: selectedFirm?.name || '',
        mode: mrrType,
        mrrNumber,
        geNo: invoice.ge_no || packing.ge_no || '',
        mrrSheet,
        helperSheet,
        scriptUrl: selectedFirm?.scriptUrl || '',
        spreadsheetId: selectedFirm?.spreadsheetId || '',
        error: err?.message || String(err),
        stack: err?.stack || ''
      });
      const errorMessage = err?.message || 'Could not save data to the database.';
      setStatus(errorMessage);
      showPopup(errorMessage, 'error');
      return false;
    } finally {
      setIsSavingInvoice(false);
      setIsSavingPacking(false);
    }
    return true;
  };

  const downloadLabelFromCurrentScreen = async () => {
    if (isOtherMrr) {
      showPopup('Labels are not available for OTHER MRR.', 'error');
      return;
    }
    const mrrNumber = String(lastSavedRecord?.mrrNumber || invoice.mrr_no || packing.mrr_no || '').trim();
    if (!selectedFirm || !mrrNumber) {
      showPopup('MRR No. missing for label print.', 'error');
      return;
    }
    openStageMenuView(mrrType, 'label', {
      firmId: selectedFirm.id,
      type: mrrType,
      labelMrr: mrrNumber
    });
  };

  const loadPendingGEs = async () => {
    if (!selectedFirm) return;
    setIsFetchingGEs(true);
    try {
      const data = await fetchPendingGeEntries(
        getSheetName(selectedFirm.mrr, mrrType),
        selectedFirm.spreadsheetId,
        selectedFirm.scriptUrl,
        getSheetName(selectedFirm.helper, mrrType)
      );
      setPendingGEs(data);
      setShowGeModal(true);
    } catch (err) {
      showPopup(err.message, 'error');
    } finally {
      setIsFetchingGEs(false);
    }
  };

  const applyPendingItem = (ge) => {
    if (!ge) return;
    setIsMrrSavedLocked(false);
    setLastSavedRecord(null);
    setInvoicePhotoScanned(false);
    setPackingPhotoScanned(false);
    const geNo = ge.ge_entry || ge.ge_no || ge.ge_entry_no || '';
    const supplier = ge.supplier_name || ge.supplier || '';
    const truck = ge.truck_no || '';
    const invNo = ge.invoice_no || '';
    const mrrNo = ge.mrr_number || ge.mrr_no || '';
    const docDate = ge.date || '';
    const receiptDate = getTodayInputDate();
    const firmHeader = selectedFirm?.header ? { ...selectedFirm.header, note: '' } : defaultHeader();

    // Reset docs to avoid carrying rows/data from previously opened MRR.
    const nextInvoice = normalizeInvoice({
      ...blankInvoice,
      header: firmHeader,
      ge_no: String(geNo),
      mrr_no: String(mrrNo),
      date: docDate || blankInvoice.date,
      receipt_date: receiptDate,
      vehicle_no: truck,
      invoice_no: invNo,
      signatory_label: selectedFirm?.name || blankInvoice.signatory_label || '',
      bill_to: {
        ...blankInvoice.bill_to,
        name_address: supplier
      },
      goods: []
    });

    const nextPacking = normalizePacking({
      ...blankPacking,
      header: firmHeader,
      ge_no: String(geNo),
      mrr_no: String(mrrNo),
      date: docDate || blankPacking.date,
      receipt_date: receiptDate,
      truck_no: truck,
      challan_no: invNo,
      signatory_label: selectedFirm?.name || blankPacking.signatory_label || '',
      buyer: {
        ...blankPacking.buyer,
        name_address: supplier
      },
      items: []
    });

    setGeData(ge);
    setInvoice(nextInvoice);
    setPacking(nextPacking);
    approvalLoadKeyRef.current = '';
    approvalSnapshotRef.current = '';
  };

  const loadSavedDataForApproval = async (pendingItem, firmCtx, typeCtx) => {
    const mrrNumber = String(pendingItem?.mrr_number || pendingItem?.mrr_no || '').trim();
    const geNo = String(pendingItem?.ge_no || pendingItem?.ge_entry || '').trim();
    if (!mrrNumber) return;
    const mrrSheetName = getSheetName(firmCtx.mrr, typeCtx);
    const helperSheetName = getSheetName(firmCtx.helper, typeCtx);
    const scriptUrl = firmCtx.scriptUrl;
    const spreadsheetId = firmCtx.spreadsheetId;
    const prefetchedParentRows = Array.isArray(pendingItem?.prefetched_parent_rows) ? pendingItem.prefetched_parent_rows : null;
    const prefetchedHelperRows = Array.isArray(pendingItem?.prefetched_helper_rows) ? pendingItem.prefetched_helper_rows : null;
    const normalizeFetchedRows = (rows = []) => {
      if (!Array.isArray(rows) || !rows.length) return [];
      if (!Array.isArray(rows[0])) return rows;
      const [headerRow, ...bodyRows] = rows;
      const headers = Array.isArray(headerRow) ? headerRow.map((cell) => String(cell || '').trim()) : [];
      return bodyRows.map((cells = []) => {
        const rowObj = {};
        headers.forEach((header, index) => {
          if (!header) return;
          rowObj[header] = cells[index] ?? '';
        });
        return rowObj;
      });
    };

    try {
      let parentRows = normalizeFetchedRows(prefetchedParentRows || []);
      let helperRows = normalizeFetchedRows(prefetchedHelperRows || []);
      if (!prefetchedParentRows && !prefetchedHelperRows) {
        const [parentPayload, helperPayload] = await Promise.all([
          fetchSheetRangeWithParams({
            sheet: mrrSheetName,
            mrr_number: mrrNumber,
            ge_no: geNo,
            spreadsheetId
          }, scriptUrl),
          fetchSheetRangeWithParams({
            sheet: helperSheetName,
            mrr_number: mrrNumber,
            ge_no: geNo,
            spreadsheetId
          }, scriptUrl).catch(() => null)
        ]);

        parentRows = normalizeFetchedRows(Array.isArray(parentPayload?.data) ? parentPayload.data : []);
        helperRows = normalizeFetchedRows(Array.isArray(helperPayload?.data) ? helperPayload.data : []);
      }
      const readRowValue = (row, ...keys) => {
        for (const key of keys) {
          const value = row?.[key];
          if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
        }
        return '';
      };
      const normalizeMrrKey = (value) => String(value || '').trim().toUpperCase();
      const targetMrrKey = normalizeMrrKey(mrrNumber);
      const rowBelongsToMrr = (row) => {
        const rowMrrKey = normalizeMrrKey(readRowValue(row, 'mrr_number', 'mrr_no', 'MRR No', 'mrr_no.'));
        return !targetMrrKey || !rowMrrKey || rowMrrKey === targetMrrKey;
      };
      const parentRowsForMrr = parentRows.filter(rowBelongsToMrr);
      const helperRowsForMrr = helperRows.filter(rowBelongsToMrr);
      if (!parentRowsForMrr.length && !helperRowsForMrr.length) {
        throw new Error(`No saved rows found in backend records for MRR ${mrrNumber}.`);
      }
      const parent = parentRowsForMrr.find((row) => {
        const sno = String(row?.s_no || row?.sno || '').trim();
        const desc = String(row?.description || '').trim().toUpperCase();
        return !sno || desc === 'PARENT SUMMARY';
      }) || (parentRowsForMrr.length ? parentRowsForMrr[parentRowsForMrr.length - 1] : {});

      const parentDate = readRowValue(parent, 'date', 'Date');
      const parentReceipt = readRowValue(parent, 'dt_of_receipt', 'dt_of_receipts', 'Dt. of Receipt', 'Dt of Receipts');
      const parentGe = readRowValue(parent, 'ge_no', 'ge_entry', 'GE Entry', 'GE No');
      const parentMrr = readRowValue(parent, 'mrr_number', 'mrr_no', 'MRR No');
      const parentId = readRowValue(parent, 'mrr_form_id', 'Mrr form Id', 'other_id');
      const parentDoc = readRowValue(parent, 'sup_doc_no', 'Sup Doc No');
      const parentTruck = readRowValue(parent, 'truck_number', 'truck_no', 'Truck Number');
      const parentSupplier = readRowValue(parent, 'supplier', 'SUPPLIER');
      const parentEntryType = readRowValue(parent, 'mrr_entry_type', 'MRR TYPE');
      const resolvedSupplier = parentSupplier || String(pendingItem?.supplier || pendingItem?.supplier_name || '').trim();

      const parentValue = (...keys) => {
        return readRowValue(parent, ...keys);
      };
      const parentInvoiceWeight = parentValue('invoice_ttl_weight_kgs');
      const parentInvoiceValue = parentValue('invoice_basic_value', 'INVOICE BASIC VALUE', 'Invoice Basic Value', 'Invoice Basic Amount', 'Invocie Basic Amount', 'amount', 'Amount');
      const parentRequiredReel = parentValue('required_reel');
      const parentGoodsRow = {
        ...blankInvoiceRow(),
        mrr_form_id: parentId,
        mrr_no: parentMrr || mrrNumber,
        ge_no: parentGe,
        po_no: parentValue('po_no'),
        party_order: parentValue('party_order', 'party_order_no'),
        po_details: parentValue('po_details'),
        po_date: parentValue('po_date'),
        supplier: resolvedSupplier,
        description: parentValue('description', 'reel_details', 'item_name'),
        reel_details: parentValue('reel_details', 'item_name'),
        sort_no: parentValue('s_no', 'sort_no'),
        gsm: parentValue('gsm'),
        size: parentValue('size'),
        reels: parentRequiredReel,
        weight: parentInvoiceWeight,
        rate: parentValue('rate', 'Rate', 'Invoice Rate'),
        amount: parentInvoiceValue,
        po_rate: parentValue('po_rate'),
        po_quantity: parentValue('po_quantity', 'PO QUANTITY')
      };
      const mapMrrRowToInvoiceGoods = (row) => ({
        ...blankInvoiceRow(),
        mrr_form_id: readRowValue(row, 'mrr_form_id', 'Mrr form Id', 'other_id') || parentId,
        mrr_no: readRowValue(row, 'mrr_number', 'mrr_no', 'MRR No') || parentMrr || mrrNumber,
        ge_no: readRowValue(row, 'ge_no', 'ge_entry', 'GE Entry', 'GE No') || parentGe,
        po_no: readRowValue(row, 'po_no', 'PO NO'),
        party_order: readRowValue(row, 'party_order', 'party_order_no', 'Party Order', 'Party Order No', 'po_no', 'PO NO'),
        po_details: readRowValue(row, 'po_details', 'PO DETAILS'),
        po_date: readRowValue(row, 'po_date', 'PO DATE'),
        supplier: readRowValue(row, 'supplier', 'SUPPLIER') || resolvedSupplier,
        description: readRowValue(row, 'description', 'Description', 'reel_details', 'REEL DETAILS', 'item_name'),
        hsn: readRowValue(row, 'hsn', 'HSN') || '48043100',
        reel_details: readRowValue(row, 'reel_details', 'REEL DETAILS', 'item_name', 'description', 'Description'),
        s_no: readRowValue(row, 's_no', 'S.No', 'S NO', 'S NO.'),
        sort_no: readRowValue(row, 's_no', 'sort_no', 'S.No', 'S NO', 'S NO.'),
        gsm: readRowValue(row, 'gsm', 'GSM'),
        size: readRowValue(row, 'size', 'Size'),
        size_unit: readRowValue(row, 'unit', 'Unit') || 'CM',
        reels: readRowValue(row, 'required_reel', 'Required Reel', 'reels', 'Reels'),
        weight: readRowValue(row, 'weight', 'Weight', 'invoice_ttl_weight_kgs', 'Invoice Ttl Weight (Kgs)'),
        rate: readRowValue(row, 'rate', 'Rate', 'Invoice Rate', 'invoice_rate'),
        amount: readRowValue(row, 'value', 'VALUE', 'amount', 'Amount', 'invoice_basic_value', 'INVOICE BASIC VALUE', 'Invoice Basic Amount', 'Invocie Basic Amount'),
        po_rate: readRowValue(row, 'po_rate', 'PO RATE', 'rate', 'RATE'),
        quantity: readRowValue(row, 'quantity', 'QUANTITY', 'Qunatity', 'quantity_received', 'QUANTITY RECEIVED'),
        po_quantity: readRowValue(row, 'po_quantity', 'PO QUANTITY', 'PO Qunatity', 'po_qty', 'PO QTY')
      });
      const goodsForInvoice = parentRowsForMrr.length
        ? parentRowsForMrr.map(mapMrrRowToInvoiceGoods)
        : (Object.values(parentGoodsRow).some((value) => isMeaningful(value)) ? [parentGoodsRow] : []);
      const itemsFromHelper = helperRowsForMrr.map((row) => ({
        ...blankPackingRow(),
        helper_id: readRowValue(row, 'helper_id', 'Helper Id', 'other_child_id'),
        mrr_form_id: readRowValue(row, 'mrr_form_id', 'Mrr form Id', 'other_id') || parentId,
        s_no: readRowValue(row, 's_no', 'S NO', 'S NO.', 'S.No'),
        mrr_no: readRowValue(row, 'mrr_number', 'mrr_no', 'MRR No') || parentMrr || mrrNumber,
        ge_no: parentGe,
        po_no: readRowValue(row, 'po_no', 'PO NO'),
        po_details: readRowValue(row, 'po_details', 'PO DETAILS'),
        supplier_reel_no: readRowValue(row, 'supplier_reel_no', 'Supplier Reel No.'),
        erp_code: readRowValue(row, 'erp_code', 'ERP Code'),
        item_name: readRowValue(row, 'reel_details', 'REEL DETAILS', 'item_name'),
        reel_details: readRowValue(row, 'reel_details', 'REEL DETAILS', 'item_name'),
        reel_no: readRowValue(row, 'our_reel_number', 'Our Reel Number', 'reel_no'),
        sort_no: readRowValue(row, 's_no', 'S NO', 'S NO.', 'S.No'),
        party_order: readRowValue(row, 'party_order', 'party_order_no', 'Party Order No', 'Party Order', 'po_no', 'PO NO'),
        bf: readRowValue(row, 'bf', 'BF'),
        gsm: readRowValue(row, 'gsm', 'GSM'),
        size: readRowValue(row, 'size', 'Size'),
        unit: readRowValue(row, 'unit', 'Unit') || 'CM',
        rate: readRowValue(row, 'rate', 'Rate'),
        po_rate: readRowValue(row, 'po_rate', 'PO RATE'),
        net_wt: readRowValue(row, 'weight', 'Weight')
      }));
      const packingRowsForApproval = itemsFromHelper;

      const firmHeader = firmCtx?.header ? { ...firmCtx.header, note: '' } : defaultHeader();
      const nextInvoice = {
        ...blankInvoice,
        header: firmHeader,
        mrr_form_id: parentId,
        ge_no: parentGe,
        mrr_no: parentMrr || mrrNumber,
        date: parentDate,
        receipt_date: parentReceipt || getTodayInputDate(),
        invoice_no: parentDoc,
        vehicle_no: parentTruck,
        eway_no: readRowValue(parent, 'e_way_bill_no', 'eway_no', 'E-Way Bill No'),
        eway_date: readRowValue(parent, 'e_way_date', 'eway_date', 'E-Way Date'),
        lr_no: readRowValue(parent, 'l_r_no', 'lr_no', 'L.R No'),
        actual_weight: readRowValue(parent, 'invoice_ttl_weight_kgs', 'Invoice Ttl Weight (Kgs)'),
        actual_mrr_weight: readRowValue(parent, 'actual_mrr_ttl_weight_kgs', 'Actual MRR Ttl Weight (Kgs)'),
        mrr_entry_type: parentEntryType,
        bill_to: {
          ...blankInvoice.bill_to,
          name_address: resolvedSupplier
        },
        totals: {
          ...blankInvoice.totals,
          insurance: readRowValue(parent, 'insurance') || 0,
          round_off: readRowValue(parent, 'round_off', 'Round Off', 'roundoff', 'ROUND OFF') || 0,
          gross_amount: '',
          taxable_gst: readRowValue(parent, 'mrr_basic_value', 'MRR BASIC VALUE')
        },
        goods: goodsForInvoice
      };

      const nextPacking = {
        ...blankPacking,
        header: firmHeader,
        mrr_form_id: parentId,
        ge_no: parentGe,
        mrr_no: parentMrr || mrrNumber,
        date: parentDate,
        receipt_date: parentReceipt || getTodayInputDate(),
        challan_no: parentDoc,
        truck_no: parentTruck,
        actual_total: readRowValue(parent, 'actual_mrr_ttl_weight_kgs', 'Actual MRR Ttl Weight (Kgs)'),
        buyer: {
          ...blankPacking.buyer,
          name_address: resolvedSupplier
        },
        items: packingRowsForApproval
      };

      setInvoice(nextInvoice);
      setPacking(nextPacking);
      setGeData((prev) => prev ? ({
        ...prev,
        date: parentDate,
        ge_no: parentGe,
        mrr_no: parentMrr || prev.mrr_no,
        mrr_number: parentMrr || prev.mrr_number,
        supplier: resolvedSupplier,
        mrr_entry_type: parentEntryType,
        invoice_no: parentDoc,
        truck_no: parentTruck,
        plant_head_remark: readRowValue(parent, 'plant_head_remark', 'Plant Head Remark'),
        plant_head_reject_timestamp: readRowValue(parent, 'plant_head_reject_timestamp', 'Plant Head Reject Timestamp'),
        plant_head_reject_usermail: readRowValue(parent, 'plant_head_reject_usermail', 'Plant Head Reject usermail', 'Plant Head Reject Usermail'),
        plant_head_approval_timestamp: readRowValue(parent, 'plant_head_approval_timestamp', 'Plant Head Approval Timestamp'),
        plant_head_approval_useremail: readRowValue(parent, 'plant_head_approval_useremail', 'Plant Head Approval User Email', 'Plant Head Approval Useremail'),
        accounts_remark: readRowValue(parent, 'accounts_remark', 'Accounts Remark'),
        accounts_reject_timestamp: readRowValue(parent, 'accounts_reject_timestamp', 'Accounts Reject Timestamp'),
        accounts_reject_usermail: readRowValue(parent, 'accounts_reject_usermail', 'Acounts Reject usermail', 'Accounts Reject usermail'),
        accounts_approval_timestamp: readRowValue(parent, 'accounts_approval_timestamp', 'Accounts Approval Timestamp'),
        accounts_approval_useremail: readRowValue(parent, 'accounts_approval_useremail', 'Accounts Approval User Email', 'Accounts Approval Useremail'),
        debit_note: readRowValue(parent, 'debit_note', 'Debit Note'),
        debit_note_date: readRowValue(parent, 'debit_note_date', 'Debit Note Date'),
        debit_note_amount: readRowValue(parent, 'debit_note_amount', 'Debit Note Amount'),
        md_reject_usermail: readRowValue(parent, 'md_reject_usermail', 'Md Reject Usermail', 'MD Reject Usermail'),
        md_reject_timestamp: readRowValue(parent, 'md_reject_timestamp', 'Md Reject Timestamp', 'MD Reject Timestamp'),
        md_approval_remark: readRowValue(parent, 'md_approval_remark', 'MD Approval Remark'),
        md_approval_timestamp: readRowValue(parent, 'md_approval_timestamp', 'MD Approval Timestamp'),
        md_approval_useremail: readRowValue(parent, 'md_approval_useremail', 'MD Approval User Email', 'MD Approval Useremail'),
        pending_tally_posting_timestamp: readRowValue(parent, 'pending_tally_posting_timestamp', 'Pending Tally Posting Timesyamp'),
        pending_tally_posting_useremail: readRowValue(parent, 'pending_tally_posting_useremail', 'Pending Tally Posting Useremail')
      }) : prev);

      approvalSnapshotRef.current = getApprovalSnapshot(nextInvoice, nextPacking);
    } catch (err) {
      showPopup(err?.message || 'Could not load saved approval data.', 'error');
    }
  };

  const handleSelectPendingGE = (ge) => {
    applyPendingItem(ge);
    const geNo = ge.ge_entry || ge.ge_no || ge.ge_entry_no || '';
    const supplier = ge.supplier_name || ge.supplier || '';
    setShowGeModal(false);
    showPopup(`Selected GE #${geNo} from ${supplier}`);
  };

  useEffect(() => {
    if (isFirmSelected) {
      loadPoDetails();
      loadMrrSupplierOptions();
      fetchHelperSheetReelSeed();
      const hasExistingEntryIds = Boolean(
        isMeaningful(invoice.ge_no) ||
        isMeaningful(invoice.mrr_no) ||
        isMeaningful(packing.ge_no) ||
        isMeaningful(packing.mrr_no)
      );
      if (!geData && !hasExistingEntryIds) {
        fetchLastIds();
      }
      if (triggerPendingModal) {
        setTriggerPendingModal(false);
        loadPendingGEs();
      }
    }
  }, [isFirmSelected, selectedFirm, mrrType, geData, triggerPendingModal, invoice.ge_no, invoice.mrr_no, packing.ge_no, packing.mrr_no]);

  useEffect(() => {
    if (!isFirmSelected || !selectedFirm || !geData) return;
    const shouldLoadSavedRows = isApprovalMode || !!geData?.force_load_saved;
    if (!shouldLoadSavedRows) return;
    const mrrKey = String(geData?.mrr_number || geData?.mrr_no || '').trim();
    const geKey = String(geData?.ge_no || geData?.ge_entry || '').trim();
    const stageKey = isApprovalMode ? approvalStage : String(geData?.pending_stage || 'edit_mrr');
    const key = [selectedFirm.id, mrrType, stageKey, mrrKey, geKey].join('|');
    if (!mrrKey || approvalLoadKeyRef.current === key) return;
    approvalLoadKeyRef.current = key;
    loadSavedDataForApproval(geData, selectedFirm, mrrType);
  }, [isFirmSelected, selectedFirm, mrrType, isApprovalMode, approvalStage, geData]);

  useEffect(() => () => {
    if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
  }, []);

  const scan = async (kind, filesInput) => {
    if (scanLockRef.current || isScanning) {
      return;
    }
    const files = Array.from(filesInput || []).filter(Boolean);
    if (!files.length) return;
    scanLockRef.current = true;
    setIsScanning(true);
    setStatus(`Reading ${kind} photo${files.length > 1 ? 's' : ''} with Gemini...`);
    try {
      const scanResults = [];
      const applyScannedData = (data, progressIndex) => {
        const currentInvoice = normalizeInvoice(invoiceStateRef.current);
        const currentPacking = normalizePacking(packingStateRef.current);
        const shouldMergeWithExistingInvoice = ensureRows(currentInvoice.goods).length > 0;
        const shouldMergeWithExistingPacking = ensureRows(currentPacking.items).length > 0;
        const lockedSupplierName = isGateEntryLocked
          ? String(geData?.supplier_name || geData?.supplier || currentInvoice.bill_to?.name_address || currentPacking.buyer?.name_address || '').trim()
          : '';
        if (kind === 'invoice') {
          const normalizedInvoice = shouldMergeWithExistingInvoice
            ? combineInvoiceScanResults([currentInvoice, data])
            : normalizeInvoice(data);
          const todayReceiptDate = getTodayInputDate();
          const scannedBillTo = normalizeScannedParty(normalizedInvoice.bill_to || {});
          const scannedHeaderSupplier = extractSupplierName(data?.header?.title || normalizedInvoice?.header?.title || '');
          const resolvedSupplierName = resolveScannedSupplierName({
            scannedBillToName: scannedBillTo.name_address,
            focusedSupplierName: data?.supplier_name,
            headerSupplierName: scannedHeaderSupplier,
            selectedFirm
          });
          normalizedInvoice.bill_to = {
            ...scannedBillTo,
            name_address: resolvedSupplierName || scannedBillTo.name_address || scannedHeaderSupplier || '',
            state: extractStateName(data?.supplier_state || scannedBillTo.state || ''),
            state_code: String(data?.supplier_state_code || scannedBillTo.state_code || '').match(/\b\d{2}\b/)?.[0] || '',
            gstin: cleanSingleLineText(data?.supplier_gstin || scannedBillTo.gstin || '')
          };
          if (lockedSupplierName) {
            normalizedInvoice.bill_to = {
              ...normalizedInvoice.bill_to,
              name_address: lockedSupplierName
            };
          }
          const nextInvoice = normalizeInvoice({
            ...blankInvoice,
            ...normalizedInvoice,
            header: selectedFirm?.header ? { ...selectedFirm.header, note: '' } : blankInvoice.header,
            mrr_no: currentInvoice.mrr_no || normalizedInvoice.mrr_no || '',
            ge_no: currentInvoice.ge_no || normalizedInvoice.ge_no || '',
            receipt_date: todayReceiptDate,
            goods: normalizedInvoice.goods || []
          });
          invoiceStateRef.current = nextInvoice;
          setInvoice(nextInvoice);
          const nextPackingState = { ...currentPacking, receipt_date: todayReceiptDate };
          packingStateRef.current = nextPackingState;
          setPacking(nextPackingState);
          setInvoicePhotoScanned(true);
          setStatus(`Processed ${kind} photo ${progressIndex} of ${files.length}. Invoice section updated progressively.`);
          return;
        }

        let normalizedPacking = shouldMergeWithExistingPacking
          ? combinePackingScanResults([currentPacking, data])
          : normalizePacking(data);
        normalizedPacking.mrr_no = currentPacking.mrr_no || normalizedPacking.mrr_no || '';
        normalizedPacking.ge_no = currentPacking.ge_no || normalizedPacking.ge_no || '';
        const baseOurReelNo = Math.max(getMaxOurReelNo(currentPacking.items), helperSheetReelSeed);
        const scannedRowsWithOurReel = withSequentialOurReelNumbers(normalizedPacking.items, baseOurReelNo);

        normalizedPacking = normalizePacking({
          ...blankPacking,
          ...normalizedPacking,
          header: selectedFirm?.header ? { ...selectedFirm.header, note: '' } : currentPacking.header,
          distributor: lockedSupplierName || normalizedPacking.distributor,
          buyer: lockedSupplierName
            ? { ...normalizedPacking.buyer, name_address: lockedSupplierName }
            : normalizedPacking.buyer,
          receipt_date: currentPacking.receipt_date || normalizedPacking.receipt_date || '',
          items: scannedRowsWithOurReel.map((row) => ({
            ...row,
            mrr_no: normalizedPacking.mrr_no,
            ge_no: normalizedPacking.ge_no
          }))
        });
        packingStateRef.current = normalizedPacking;
        setPacking(normalizedPacking);
        setPackingPhotoScanned(true);
        setStatus(`Processed ${kind} photo ${progressIndex} of ${files.length}. Packing section updated progressively.`);
      };

      for (let index = 0; index < files.length; index += 1) {
        setStatus(`Reading ${kind} photo ${index + 1} of ${files.length} with Gemini...`);
        scanResults.push(await fetchGeminiJson(files[index], kind));
        const progressiveData = kind === 'invoice'
          ? combineInvoiceScanResults(scanResults)
          : combinePackingScanResults(scanResults);
        applyScannedData(progressiveData, index + 1);
      }
      setStatus(`${kind === 'invoice' ? 'Invoice' : 'Packing'} photo${files.length > 1 ? 's' : ''} scanned with Gemini. Processed one by one and merged into a larger context.`);
    } catch (err) {
      const message = err?.message || 'Gemini scan failed.';
      setStatus(message);
      showPopup(message, 'error');
    } finally {
      setIsScanning(false);
      scanLockRef.current = false;
    }
  };

  if (!currentUser || !isFirmSelected) return (
    <>
      <style>{styles}</style>
      <style>{labelStyles}</style>
      <style>{directLabelPrintStyles}</style>
      <style>{printGridStyles}</style>
      <StartupOverlay firms={FIRMS} isAuthenticated={!!currentUser} menuBootConfig={menuBootConfig} initialFirm={selectedFirm} initialType={mrrType} onSelect={handleFirmSelection} onRememberSelection={rememberOverlaySelection} onGeSubmit={(geNo, data) => { 
        applyPendingItem({ ...data, ge_no: geNo });
      }} onLogin={handleUserLogin} onLogout={handleUserLogout} currentUser={currentUser} onRouteChange={handleRouteChange} />
    </>
  );

  return (
    <div className="app">
      <style>{styles}</style>
      <style>{labelStyles}</style>
      <style>{printGridStyles}</style>
      <ProfileMenu currentUser={currentUser} onLogout={handleUserLogout} zIndex={10002} />
      {popupMessage ? <div className={`toast ${popupTone}`}>{popupMessage}</div> : null}

      {(isScanning || isSaving || isApprovingFromForm || isPreparingLabels) && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
            {isScanning ? 'Scanning photo...' : isApprovingFromForm ? 'Applying approval...' : isPreparingLabels ? 'Preparing labels...' : 'Saving data...'}
          </p>
        </div>
      )}

      <div className="pageHeader no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>{`MRR Management (${currentModeLabel})`}</h1>
          <div className="toolbar" style={{ marginTop: 0 }}>
            <button
              className="btn"
              onClick={() => {
                goBackFromFormView();
              }}
            >
              {'< Back'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>Mode:</span>
              <select
                value={mrrType}
                onChange={(e) => handlePageModeChange(e.target.value)}
                disabled={!canChangePageMode}
                title={canChangePageMode ? 'Change current MRR mode' : 'Mode can only be changed for a fresh editable MRR draft'}
                style={{ border: '1px solid #a8a8a8', padding: '4px 8px', fontSize: '11px', fontWeight: 700, background: canChangePageMode ? '#fff' : '#f5f5f5', minWidth: '92px' }}
              >
                <option value="reel">REEL MRR</option>
                <option value="other">OTHER MRR</option>
              </select>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>Firm:</span>
              <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, border: '1px solid #a8a8a8', background: '#f5f5f5', minWidth: '68px', textAlign: 'center' }}>
                {selectedFirm?.name || '-'}
              </div>
            </div>
          </div>
        </div>
        {isApprovalMode && (
          <div style={{ marginTop: '10px', padding: '8px 10px', border: '1px solid #b6ad9e', background: '#fff7e6', fontSize: '11px', fontWeight: 800, color: '#8a5a10' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>{approvalStageTitle}</span>
              <button className="btn small" onClick={goBackFromFormView}>Back</button>
            </div>
            <div style={{ marginTop: '8px', display: 'grid', gap: '4px', color: '#333', fontWeight: 700 }}>
              {approvalStatusRows.map((row) => (
                <div key={row.key}>
                  {row.label}: {row.timestamp ? `${row.timestamp}${row.userEmail ? ` | ${row.userEmail}` : ''}${row.remark ? ` | Remark: ${row.remark}` : ''}` : 'Pending'}
                </div>
              ))}
            </div>
            {approvalStage === 'pending_plant_head_approval' ? (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}>Plant Head Remark (Required For Reject)</div>
                <input
                  value={plantHeadRemark}
                  onChange={(e) => setPlantHeadRemark(e.target.value)}
                  placeholder="Enter Plant Head Remark"
                  style={{ width: '100%', border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                />
              </div>
            ) : null}
            {approvalStage === 'pending_accounts_approval' ? (
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}>Accounts Remark (Required For Reject)</div>
                  <input
                    value={accountsRemark}
                    onChange={(e) => setAccountsRemark(e.target.value)}
                    placeholder="Enter Accounts Remark"
                    style={{ width: '100%', border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                  />
                </div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: shouldRequireAccountsDebitNote ? '#b45309' : '#374151' }}>
                  {approvalMrrType === 'other'
                    ? `MRR TYPE: ${invoice.mrr_entry_type || geData?.mrr_entry_type || '-'}`
                    : `Invoice Weight: ${formatDecimal2(accountsInvoiceWeight) || '0.00'} KG | Actual Weight: ${formatDecimal2(accountsActualWeight) || '0.00'} KG | Difference: ${formatDecimal2(accountsWeightDifference) || '0.00'} KG`}
                </div>
                {shouldRequireAccountsDebitNote ? (
                  <div style={{ marginTop: '2px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}>Debit Note *</div>
                      <input
                        value={accountsDebitNote}
                        onChange={(e) => setAccountsDebitNote(e.target.value)}
                        placeholder="Enter Debit Note"
                        style={{ width: '100%', border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}>Debit Note Date *</div>
                      <input
                        type="date"
                        value={accountsDebitNoteDate}
                        onChange={(e) => setAccountsDebitNoteDate(e.target.value)}
                        style={{ width: '100%', border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}>Debit Note Amount *</div>
                      <input
                        type="number"
                        step="0.01"
                        value={accountsDebitNoteAmount}
                        onChange={(e) => setAccountsDebitNoteAmount(e.target.value)}
                        placeholder="Enter Debit Note Amount"
                        style={{ width: '100%', border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {approvalStage === 'pending_md_approval' ? (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}>MD Approval Remark (Required For Reject)</div>
                <input
                  value={mdApprovalRemark}
                  onChange={(e) => setMdApprovalRemark(e.target.value)}
                  placeholder="Enter MD Approval Remark"
                  style={{ width: '100%', border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                />
              </div>
            ) : null}
          </div>
        )}

      <PendingGeModal 
        isOpen={showGeModal} 
        onClose={() => setShowGeModal(false)} 
        pendingGEs={pendingGEs} 
        formatAmount={formatDecimal2}
        onSelect={handleSelectPendingGE} 
      />

        {activeTab === 'invoice' && (
          <div className="help">
            <table className="stats">
              <thead>
                <tr>
                  <th>Invoice Rows</th>
                  <th>Invoice Total</th>
                  <th>Inv Weight</th>
                  {!isOtherMrr && <th>Packing Rows</th>}
                  {!isOtherMrr && <th>Invoice Reels</th>}
                  {!isOtherMrr && <th>Packing Reels</th>}
                  {!isOtherMrr && <th>Packing Weight</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{invoiceRowCount}</td>
                  <td>Rs. {money(net)}</td>
                  <td>{money(weight)} KGS</td>
                  {!isOtherMrr && <td>{packingRowCount}</td>}
                  {!isOtherMrr && <td>{reels}</td>}
                  {!isOtherMrr && <td>{packing.total_reels || packingReels}</td>}
                  {!isOtherMrr && <td>{money(packing.total_weight || packingWeight)} KGS</td>}
                </tr>
              </tbody>
            </table>
            <div style={{ borderTop: '1px dashed #b6ad9e', padding: '8px 10px', fontSize: '11px', fontWeight: 700, background: '#fffdf7' }}>
              GE ENTRY Details:
              {' '}| Mode: <span style={{ color: 'var(--primary)' }}>{currentModeLabel}</span>
              {' '}GE No: <span style={{ color: 'var(--primary)' }}>{geData?.ge_no || invoice.ge_no || packing.ge_no || '-'}</span>
              {' '}| MRR No: <span style={{ color: 'var(--primary)' }}>{geData?.mrr_no || geData?.mrr_number || invoice.mrr_no || packing.mrr_no || '-'}</span>
              {' '}| Supplier: <span>{geData?.supplier || invoice.bill_to?.name_address || packing.buyer?.name_address || '-'}</span>
              {' '}| Invoice: <span>{geData?.invoice_no || invoice.invoice_no || packing.challan_no || '-'}</span>
              {' '}| Truck: <span>{geData?.truck_no || invoice.vehicle_no || packing.truck_no || '-'}</span>
            </div>
          </div>
        )}
      </div>

        {activeTab === 'invoice' && (
          <div className="toolbar no-print" style={{ marginTop: 14 }}>
            {!isOtherMrr && (
              <>
                <button className="btn main" disabled={isScanning || isSaving || isDataEntryLocked || invoicePhotoScanned} onClick={() => invoiceRef.current?.click()}>{invoicePhotoScanned ? 'Invoice Photo Scanned' : isScanning ? 'Reading Photos...' : 'Click Invoice Photos'}</button>
                <input ref={invoiceRef} className="hidden" type="file" accept="image/*" multiple onChange={async (e) => { const files = Array.from(e.target.files || []); if (files.length) try { await scan('invoice', files); } catch (err) { setStatus(err?.message || 'Could not read invoice photos with Gemini'); } e.target.value = ''; }} />
                <button className="btn" disabled={isScanning || isSaving || isDataEntryLocked || packingPhotoScanned} onClick={() => packingRef.current?.click()}>{packingPhotoScanned ? 'Packing Slip Scanned' : 'Click Packing Photos'}</button>
                <input ref={packingRef} className="hidden" type="file" accept="image/*" multiple onChange={async (e) => { const files = Array.from(e.target.files || []); if (files.length) try { await scan('packing', files); } catch (err) { setStatus(err?.message || 'Could not read packing photos with Gemini'); } e.target.value = ''; }} />
              </>
            )}
            {isOtherMrr && <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--warn)', border: '1px solid currentColor', padding: '6px 12px', background: '#fff' }}>MANUAL ENTRY</div>}
            {isMrrSavedLocked && (
              <button
                className="btn"
                disabled={isScanning || isSaving}
                onClick={() => {
                  const mrrForFile = String(invoice.mrr_no || packing.mrr_no || geData?.mrr_no || geData?.mrr_number || '').trim();
                  const prevTitle = document.title;
                  document.title = mrrForFile || 'MRR';
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => { document.title = prevTitle; }, 1000);
                  }, 100);
                }}
              >
                Print All
              </button>
            )}
          </div>
        )}


      {activeTab === 'invoice' && (
        <>
          <section className="doc">
            <div className="sectionHead">
              <div>
                  <h2>MRR Entry{isOtherMrr ? ' (OTHER MRR)' : ''}</h2>
              </div>
            </div>
            <div className="sheet">
              <Header header={invoice.header} />
              <div className="title">{invoice.doc_title}</div>
              
              {isOtherMrr ? (
                <table className="meta other-mrr-meta" style={{ borderBottom: '1px solid var(--line)' }}>
                  <tbody>
                    {Array.from({ length: Math.max(otherMrrLeftMetaRows.length, otherMrrRightMetaRows.length) }).map((_, idx) => {
                      const [lLabel, lValue, lOnChange, lType, lReadOnly] = otherMrrLeftMetaRows[idx] || ['', '', undefined, 'text', true];
                      const [rLabel, rValue, rOnChange, rType, rReadOnly] = otherMrrRightMetaRows[idx] || ['', '', undefined, 'text', true];
                      const leftLocked = !!lReadOnly || !lOnChange;
                      const rightLocked = !!rReadOnly || !rOnChange;
                      return (
                        <tr key={`other-meta-${idx}`}>
                          <td style={{ width: '18%', fontWeight: 700, background: '#f8f8f8' }}>{lLabel}</td>
                          <td style={{ width: '32%' }}>
                            <input
                              type={lType || 'text'}
                              value={getSafeInputValue(lType, lValue)}
                              onChange={(e) => lOnChange && lOnChange(e.target.value)}
                              readOnly={!!lReadOnly}
                              disabled={!lOnChange}
                              style={leftLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
                            />
                          </td>
                          <td style={{ width: '18%', fontWeight: 700, background: '#f8f8f8' }}>{rLabel}</td>
                          <td style={{ width: '32%' }}>
                            {rType === 'supplier_datalist' ? (
                              <>
                                <input
                                  list={`other-mrr-meta-supplier-list-${idx}`}
                                  value={getSafeInputValue('text', rValue)}
                                  onChange={(e) => rOnChange && rOnChange(e.target.value)}
                                  readOnly={!!rReadOnly}
                                  disabled={!rOnChange}
                                  style={rightLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
                                />
                                <datalist id={`other-mrr-meta-supplier-list-${idx}`}>
                                  {(mrrSupplierOptions || []).map((option) => <option key={option} value={option}>{option}</option>)}
                                </datalist>
                              </>
                            ) : rType === 'select' ? (
                              <select
                                value={getSafeInputValue('text', rValue)}
                                onChange={(e) => rOnChange && rOnChange(e.target.value)}
                                disabled={rightLocked}
                                style={rightLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
                              >
                                <option value="">Select...</option>
                                {((otherMrrRightMetaRows[idx] || [])[5] || []).map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={rType || 'text'}
                                value={getSafeInputValue(rType, rValue)}
                                onChange={(e) => rOnChange && rOnChange(e.target.value)}
                                readOnly={!!rReadOnly}
                                disabled={!rOnChange}
                                style={rightLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="grid2">
                  <MetaTable rows={[
                    ['G. E. No.', invoice.ge_no, undefined, 'text'],
                    ['Date', invoice.date, undefined, 'date'],
                    ['MRR No', invoice.mrr_no, undefined],
                    ['Dt. of Receipt', invoice.receipt_date, undefined, 'date'],
                    [requiredLabel('Supplier Document No'), invoice.invoice_no, (v) => setInv('invoice_no', v), 'text', isDataEntryLocked],
                    [requiredLabel('Truck Number'), invoice.vehicle_no, (v) => setInv('vehicle_no', v), 'text', isDataEntryLocked],
                    ['Invoice Total Weight (kg)', invoice.actual_weight, undefined],
                    ['Actual MRR Total Weight (kg)', invoice.actual_mrr_weight, undefined]
                  ]} />
                  <MetaTable rows={[
                    [requiredLabel('SUPPLIER'), invoice.bill_to?.name_address, (v) => setInvNest('bill_to', 'name_address', v), 'supplier_datalist', isDataEntryLocked, mrrSupplierOptions],
                    ['INVOICE BASIC VALUE', invoiceBasicValue, undefined],
                    ['MRR BASIC VALUE', mrrBasicValue, undefined],
                    ['Insurance', invoice.totals.insurance, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, insurance: v } })), 'text', isDataEntryLocked],
                    ['Round Off', invoice.totals.round_off, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, round_off: v } })), 'text', isDataEntryLocked],
                    ['E-Way Bill No', invoice.eway_no, (v) => setInv('eway_no', v), 'text', isDataEntryLocked],
                    ['E-Way Bill Date', invoice.eway_date, (v) => setInv('eway_date', v), 'date', isDataEntryLocked],
                    ['L.R. No', invoice.lr_no, (v) => setInv('lr_no', v), 'text', isDataEntryLocked]
                  ]} />
                </div>
              )}

              {isOtherMrr ? (
                <div className="wrap">
                  <table className="table invoiceTable other-mrr-table" style={{ minWidth: "1700px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "70px" }}>S.No</th>
                        <th style={{ width: "120px" }}>PO NO.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "120px" }}>PO DATE<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "200px" }}>SUPPLIER<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "260px" }}>PO DETAILS<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "120px" }}>PO RATE<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "130px" }}>PO QUANTITY<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "90px" }}>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "220px" }}>Description</th>
                        <th style={{ width: "100px" }}>HSN<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "110px" }}>Qunatity<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "120px" }}>Invoice Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "140px" }}>Invoice Basic Amount<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th className="no-print" style={{ width: "80px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!invoice.goods.length ? (
                        <tr>
                          <td colSpan={13} className="c" style={{ padding: '14px 8px', color: 'var(--muted)', fontWeight: 700 }}>
                            No rows yet. Click "+ Add Row" to start.
                          </td>
                        </tr>
                      ) : null}
                      {invoice.goods.map((row, i) => {
                        const rowPoNoOptions = getPoNoOptionsForRow(row);
                        return (
                        <tr key={i}>
                          <td className="c">{i + 1}</td>
                          <td>
                            <input
                              list={`other-po-no-options-${i}`}
                              disabled={isDataEntryLocked}
                              value={row.po_no || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (rowPoNoOptions.includes(value) || poRows.some((po) => po.po_no === value)) handlePoNoSelectInvoice(i, value);
                                else setInvRow(i, 'po_no', value);
                              }}
                              placeholder="Select or type PO NO"
                            />
                            <datalist id={`other-po-no-options-${i}`}>
                              {rowPoNoOptions.map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </td>
                          <td>
                            <input
                              type="date"
                              disabled={isDataEntryLocked}
                              value={normalizeInputDateValue(row.po_date)}
                              onChange={(e) => setInvRow(i, 'po_date', e.target.value)}
                              onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                              onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                            />
                          </td>
                          <td>
                            <input
                              list={`other-po-supplier-options-${i}`}
                              disabled={isDataEntryLocked}
                              value={row.supplier || ''}
                              onChange={(e) => setInvRow(i, 'supplier', e.target.value)}
                              placeholder="Select or type Supplier"
                            />
                            <datalist id={`other-po-supplier-options-${i}`}>
                              {getPoSupplierOptions(row).map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </td>
                          <td>
                            <input
                              list={`other-po-details-options-${i}`}
                              disabled={isDataEntryLocked}
                              value={row.po_details || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                const options = getPoDetailOptions({ po_no: row.po_no, po_details: row.po_details });
                                if (options.includes(value)) handlePoDetailsSelectInvoice(i, value);
                                else setInvRow(i, 'po_details', value);
                              }}
                              placeholder="Select or type PO Details"
                            />
                            <datalist id={`other-po-details-options-${i}`}>
                              {getPoDetailOptions({ po_no: row.po_no, po_details: row.po_details }).map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </td>
                          <td>
                            <input
                              list={`other-po-rate-options-${i}`}
                              disabled={isDataEntryLocked}
                              value={row.po_rate || ''}
                              onChange={(e) => setInvRow(i, 'po_rate', e.target.value)}
                              placeholder="Select or type PO Rate"
                            />
                            <datalist id={`other-po-rate-options-${i}`}>
                              {getPoRateOptions(row).map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </td>
                          <td>
                            <input
                              list={`other-po-qty-options-${i}`}
                              disabled={isDataEntryLocked}
                              value={row.po_quantity || ''}
                              onChange={(e) => setInvRow(i, 'po_quantity', e.target.value)}
                              placeholder="Select or type PO Quantity"
                            />
                            <datalist id={`other-po-qty-options-${i}`}>
                              {getPoQtyOptions(row).map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </td>
                          <td>
                            <select
                              disabled={isDataEntryLocked}
                              value={row.size_unit || row.unit || 'Kgs'}
                              onChange={(e) => setInvRow(i, 'size_unit', e.target.value)}
                            >
                              {Array.from(new Set([row.size_unit || row.unit || 'Kgs', ...OTHER_MRR_UNIT_OPTIONS])).filter(Boolean).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                          <td><input value={row.description || ''} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'description', e.target.value)} /></td>
                          <td><input value={row.hsn || '48043100'} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'hsn', e.target.value)} /></td>
                          <td><input value={row.quantity || ''} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'quantity', e.target.value)} /></td>
                          <td><input value={row.rate || ''} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'rate', e.target.value)} /></td>
                          <td><input value={money(n(row.quantity) * n(row.rate))} readOnly style={{ background: '#f5f5f5', fontWeight: 700 }} /></td>
                          <td className="c no-print"><button className="btn small" disabled={isDataEntryLocked} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => removeInvoiceRow(i)}>Del</button></td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="no-print">
                        <td colSpan={13} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}>
                          <button 
                            className="btn main" 
                            onClick={addInvoiceRow}
                            style={{ 
                              borderRadius: '50%', 
                              width: '30px', 
                              height: '30px', 
                              padding: 0, 
                              fontSize: '20px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              border: '2px solid #111',
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Add New Row"
                          >
                            +
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="wrap">
                  <table className="table invoiceTable">
                    <colgroup>
                      <col style={{ width: "4.5%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "7.5%" }} /><col style={{ width: "7.5%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "5.5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "4.5%" }} /><col style={{ width: "5.5%" }} /><col style={{ width: "8%" }} /><col style={{ width: "4.5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "8.5%" }} /><col style={{ width: "4%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>S.No</th><th>Description<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>HSN<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Sord</th><th>Party Order</th><th>GSM<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Size<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Reels<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Weight<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Invoice Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Amount<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.goods.map((row, i) => (
                        <tr key={i}>
                          <td className="c">{i + 1}</td>
                          <td><input value={row.description} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'description', e.target.value)} /></td>
                          <td><input value={row.hsn} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'hsn', e.target.value)} /></td>
                          <td><input value={row.sort_no} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'sort_no', e.target.value)} /></td>
                          <td><input value={row.party_order} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'party_order', e.target.value)} /></td>
                          <td><input value={row.gsm} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'gsm', e.target.value)} /></td>
                          <td><input value={row.size} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'size', e.target.value)} /></td>
                          <td><input value={row.size_unit} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'size_unit', e.target.value)} /></td>
                          <td><input value={row.reels} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'reels', e.target.value)} /></td>
                          <td><input value={row.weight} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'weight', e.target.value)} /></td>
                          <td><input value={row.weight_unit} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'weight_unit', e.target.value)} /></td>
                          <td><input value={row.rate} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'rate', e.target.value)} /></td>
                          <td><input value={row.amount} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                          <td className="c"><button className="btn small" disabled={isDataEntryLocked} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => removeInvoiceRow(i)}>Del</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="no-print">
                        <td colSpan={14} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}>
                          {!isDataEntryLocked && <button className="btn main" onClick={addInvoiceRow} style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0, fontSize: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #111', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="Add New Row">+</button>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

            </div>

            <div className="actions">
              {isOtherMrr && (
                isApprovalMode
                  ? <>
                      <button className="btn main" disabled={isSaving || isApprovingFromForm} onClick={() => approveFromMainForm('approve')}>{isApprovingFromForm ? <span className="spinner" /> : 'Approve'}</button>
                      {approvalStage !== 'pending_tally_posting' ? <button className="btn" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} disabled={isSaving || isApprovingFromForm} onClick={() => approveFromMainForm('reject')}>{isApprovingFromForm ? <span className="spinner" /> : 'Reject'}</button> : null}
                    </>
                  : <>
                      <button className="btn" disabled={isSaving || isDataEntryLocked} onClick={addInvoiceRow}>+ Add Row</button>
                      <button className="btn main" disabled={isSaving || isDataEntryLocked} onClick={() => saveAllData({ goToMenuAfterSuccess: false })}>{isSavingInvoice ? 'Saving...' : 'Save OTHER MRR'}</button>
                    </>
              )}
            </div>
          </section>

          {!isOtherMrr && (
            <section className="doc">
              <div className="sectionHead">
                <div>
                  <h2>Packing Slip</h2>
                </div>
              </div>
              <div className="sheet">
                <Header header={packing.header} />
                <div className="title">{packing.doc_title}</div>
                <div className="grid2">
                  <MetaTable rows={[
                    ['Challan No.', packing.challan_no, (v) => setPack('challan_no', v), 'text', isDataEntryLocked],
                    ['Date', packing.date, undefined, 'date'],
                    ['GE No.', packing.ge_no, undefined],
                    ['MRR No.', packing.mrr_no, undefined],
                    ['Dt of Receipt', packing.receipt_date, undefined, 'date']
                  ]} />
                  <MetaTable rows={[
                    ['Truck No.', packing.truck_no, (v) => setPack('truck_no', v), 'text', isDataEntryLocked],
                    ['Actual Total', packing.actual_total, undefined],
                    ['Total Reel', packing.total_reels || packingReels, undefined],
                    ['Total Weight', packing.total_weight || packingWeight, undefined]
                  ]} />
                </div>
                <div className="wrap">
                  <table className="table packingTable">
                    <colgroup>
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "6%" }} />
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "5%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Sr.</th>
                        <th>MRR No.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>GE No.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Party Order No.</th>
                        <th>PO No.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>PO Details<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Description<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Supplier Reel No.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>ERP Code<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Our Reel No.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Sord No.</th>
                        <th>BF<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>GSM<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Size<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Invoice Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>PO Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Net Wt(Kgs.)<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packing.items.map((row, i) => (
                        <tr key={i}>
                          <td className="c">{i + 1}</td>
                          <td><input value={row.mrr_no} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                          <td><input value={row.ge_no} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                          <td><input value={row.party_order} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'party_order', e.target.value)} /></td>
                          <td><select disabled={isDataEntryLocked} value={getSelectValue(poNoOptions, row.po_no)} onChange={(e) => handlePoNoSelect(i, e.target.value)}><option value="">Select PO</option>{poNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td><select disabled={isDataEntryLocked} value={getSelectValue(getPoDetailOptions(row), row.po_details)} onChange={(e) => handlePoDetailsSelect(i, e.target.value)}><option value="">Select PO Details</option>{getPoDetailOptions(row).map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td style={{ minWidth: '260px', maxWidth: '320px', whiteSpace: 'nowrap' }}>
                            <select disabled={isDataEntryLocked} style={{ width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} value={getSelectValue(getDescriptionOptions(row), row.item_name || row.reel_details)} onChange={(e) => handleDescriptionSelect(i, e.target.value)}>
                              <option value="">Select Description</option>
                              {getDescriptionOptions(row).map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </td>
                          <td><input value={row.supplier_reel_no} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'supplier_reel_no', e.target.value)} /></td>
                          <td><select disabled={isDataEntryLocked} value={getSelectValue(getErpCodeOptions(row), row.erp_code)} onChange={(e) => handleErpCodeSelect(i, e.target.value)}><option value="">Select ERP Code</option>{getErpCodeOptions(row).map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td><input value={row.reel_no} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'reel_no', e.target.value)} /></td>
                          <td><input value={row.sort_no} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'sort_no', e.target.value)} /></td>
                          <td><input value={row.bf} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'bf', e.target.value)} /></td>
                          <td><input value={row.gsm} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'gsm', e.target.value)} /></td>
                          <td><input value={row.size} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'size', e.target.value)} /></td>
                          <td><input value={row.unit} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'unit', e.target.value)} /></td>
                          <td><input value={row.rate || getParentRateForPackingRow(row) || ''} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'rate', e.target.value)} /></td>
                          <td><input value={row.po_rate} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                          <td>
                            <input
                              list={`packing-weight-options-${i}`}
                              value={row.net_wt}
                              readOnly={isDataEntryLocked}
                              onChange={(e) => setPackRow(i, 'net_wt', e.target.value)}
                              placeholder="Remaining qty +/-15%"
                              title={(() => {
                                const info = getPackingRemainingQuantityInfo(row, i);
                                if (!info) return 'Enter scanned net weight';
                                return `Remaining target ${formatToleranceValue(info.remainingTarget)} kg. Allowed range ${formatToleranceValue(info.remainingMin)} to ${formatToleranceValue(info.remainingMax)} kg.`;
                              })()}
                            />
                            <datalist id={`packing-weight-options-${i}`}>
                              {getPackingWeightOptions(row, i).map((option) => <option key={option} value={option} />)}
                            </datalist>
                          </td>
                          <td className="c"><button className="btn small" disabled={isDataEntryLocked} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => removePackingRow(i)}>Del</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="15" className="r"><b>Grand Total</b></td>
                        <td className="c">{packing.total_reels || packingReels} Reels</td>
                        <td></td>
                        <td className="r">{money(packing.total_weight || packingWeight)}</td>
                        <td></td>
                      </tr>
                      {!isDataEntryLocked && <tr className="no-print">
                        <td colSpan={19} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}>
                          <button className="btn main" onClick={addPackingRow} style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0, fontSize: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #111', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="Add New Row">+</button>
                        </td>
                      </tr>}
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="actions">
                {!isApprovalMode && <button className="btn" disabled={isSavingInvoice || isSavingPacking || isDataEntryLocked} onClick={addPackingRow}>Add Packing Row</button>}
                {isApprovalMode
                  ? <>
                      <button className="btn main" disabled={isSavingInvoice || isSavingPacking || isApprovingFromForm} onClick={() => approveFromMainForm('approve')}>{isApprovingFromForm ? <span className="spinner" /> : 'Approve'}</button>
                      {approvalStage !== 'pending_tally_posting' ? <button className="btn" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} disabled={isSavingInvoice || isSavingPacking || isApprovingFromForm} onClick={() => approveFromMainForm('reject')}>{isApprovingFromForm ? <span className="spinner" /> : 'Reject'}</button> : null}
                    </>
                  : <button className="btn main" disabled={isSavingInvoice || isSavingPacking || isDataEntryLocked} onClick={() => saveAllData({ goToMenuAfterSuccess: false })}>{isSaving ? 'Saving...' : 'Save All Data'}</button>}
              </div>
            </section>
          )}
          {lastSavedRecord && (
            <section className="doc no-print">
              <div className="sheet" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>Saved Record</div>
                <div style={{ fontSize: '12px', color: '#333', marginBottom: '10px' }}>
                  {lastSavedRecord.savedAt} | Firm: {lastSavedRecord.firm} | MRR: {lastSavedRecord.mrrNumber} | GE: {lastSavedRecord.geNo || '-'}
                </div>
                {isMrrSavedLocked && (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8a5a10', marginBottom: '10px' }}>
                    Edit is disabled for this saved MRR.
                  </div>
                )}
                <div className="actions" style={{ maxWidth: '100%', margin: 0, justifyContent: 'flex-start' }}>
                  <button className="btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Review</button>
                  <button
                    className="btn main"
                    onClick={() => {
                      const prev = document.title;
                      document.title = `MRR_${lastSavedRecord.mrrNumber || 'Export'}`;
                      setTimeout(() => {
                        window.print();
                        setTimeout(() => { document.title = prev; }, 1000);
                      }, 100);
                    }}
                  >
                    Print
                  </button>
                  {!isOtherMrr && (
                    <button
                      className="btn"
                      onClick={downloadLabelFromCurrentScreen}
                    >
                      Download Label
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
          {directLabelPrintJob?.reels?.length ? (
            <section className="direct-label-print-sheet">
              <ReelLabelPrintArea reels={directLabelPrintJob.reels} selectedFirm={directLabelPrintJob.firm} printMode={directLabelPrintJob.mode} />
            </section>
          ) : null}
        </>
      )}

    </div>
  );
}

export default App;



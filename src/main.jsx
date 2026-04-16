import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { savePackingToSheets, saveInvoiceToSheets, saveGeEntryToSheets, fetchSheetRangeWithParams, fetchLatestMrrGe, fetchSheetRange, fetchPendingGeEntries, fetchUniqueSuppliers, HELPER_SHEET_NAME, SCRIPT_URL, PO_SHEET_NAME } from './sheetSync';
import QRCodePackage from 'react-qr-code';
const QRCode = typeof QRCodePackage === 'function' ? QRCodePackage : (QRCodePackage.default || QRCodePackage.QRCode || QRCodePackage);

const labelStyles = `
.labels-grid { display: flex; flex-direction: column; align-items: center; gap: 24px; padding-top: 10px; }
.print-label { border: 1px solid #111; padding: 12px; background: #fff; color: #111; font-family: Arial, sans-serif; text-align: center; margin: 0 auto; display: flex; flex-direction: column; box-sizing: border-box; }
.mode-label .print-label { width: 380px; height: 550px; }
.mode-a4 .print-label { width: 100%; height: 100%; padding: 30px; font-size: 1.5em; max-width: 800px; }
.print-label .brand-logo { margin: 0 auto; display: block; object-fit: contain; }
.mode-a4 .print-label .brand-logo { height: 160px; max-width: 100%; margin-bottom: 20px; }
.mode-label .print-label .brand-logo { height: 80px; max-width: 100%; margin-bottom: 12px; }

.mode-a4 .print-label .sub-info { font-size: 14px; margin-bottom: 8px; }
.mode-label .print-label .sub-info { font-size: 10px; margin-bottom: 4px; }
.print-label .sub-info { display: flex; justify-content: space-between; padding: 0 10px; }

.mode-a4 .print-label h3 { font-size: 20px; margin: 0 0 10px; }
.mode-label .print-label h3 { font-size: 14px; margin: 0 0 6px; }
.print-label h3 { font-weight: 900; }

.mode-a4 .print-label .specs { font-size: 16px; margin-bottom: 12px; }
.mode-label .print-label .specs { font-size: 11px; margin-bottom: 8px; }
.print-label .specs { font-weight: 700; }

.mode-a4 .print-label .grid-2 { font-size: 16px; padding: 0 30px; padding-top: 14px; row-gap: 10px; }
.mode-label .print-label .grid-2 { font-size: 11px; padding: 0 20px; padding-top: 8px; row-gap: 6px; }
.print-label .grid-2 { display: grid; grid-template-columns: 1fr 1fr; text-align: left; margin-bottom: 16px; column-gap: 10px; border-top: 1px solid #ccc; }
.print-label .grid-2 span { font-weight: 900; }

.print-label .qr-container { border-top: 1px solid #111; padding-top: 20px; margin-top: auto; display: flex; flex-direction: column; align-items: center; flex-grow: 1; justify-content: center; }

.mode-a4 .print-label .qr-hint { font-size: 24px; margin-top: 30px; }
.mode-label .print-label .qr-hint { font-size: 9px; margin-top: 12px; }
.print-label .qr-hint { color: #555; font-weight: 700; }

@media print {
  .no-print { display: none !important; }
  
  .labels-grid.mode-a4 { display: block !important; gap: 0; margin: 0; padding: 0; }
  .mode-a4 .print-label { page-break-inside: avoid !important; page-break-after: always !important; border: none; margin: 0; padding: 40px; width: 100vw; height: 100vh; max-width: none; max-height: none; justify-content: center; }

  .labels-grid.mode-label { display: flex !important; flex-wrap: wrap; justify-content: center; gap: 20px; padding: 0; }
  .mode-label .print-label { page-break-inside: avoid !important; margin-bottom: 20px; }

  body, .app { background: #fff !important; padding: 0; margin: 0; max-width: 100%; height: auto; }
  .sheet { border: 0 !important; box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
  @page { margin: 0; size: A4 portrait; }
}
`;

const styles = `
:root{--ink:#111;--paper:#fff;--bg:#d8d1c4;--line:#1e1e1e;--line-soft:#b9b9b9;--primary:#0f4f93;--ok:#166534;--warn:#8a5a10;--bad:#9b1c1c;--muted:#595959;--sheet-width:1140px}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif}.app{max-width:1180px;margin:0 auto;padding:16px 12px 28px}.pageHeader{max-width:var(--sheet-width);margin:0 auto 14px;background:#f8f5ee;border:1px solid #a79f92;padding:12px 14px}.pageHeader h1{margin:0 0 4px;font-size:20px;font-weight:700}.pageHeader p{margin:0;color:#444;font-size:12px;line-height:1.45}.toolbar,.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar{margin-top:10px}.status{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 12px;border:1px solid #bfb7aa;background:#fff;font-size:11px;font-weight:700;color:var(--muted)}.status.success{color:var(--ok)}.status.error{color:var(--bad)}.status.working{color:var(--warn)}.spinner{width:14px;height:14px;border:2px solid #cfc5b7;border-top-color:currentColor;border-radius:50%;animation:spin .8s linear infinite;flex:0 0 auto}@keyframes spin{to{transform:rotate(360deg)}}.loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(216,209,196,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:var(--primary);text-align:center;width:100%;height:100%}.loading-overlay .spinner{width:64px;height:64px;border-width:6px;margin-bottom:20px;border-top-color:var(--primary)}.loading-overlay h2{margin:0 0 8px;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em}.loading-overlay p{margin:0;font-size:14px;font-weight:700;color:var(--ink)} .toast{position:fixed;top:16px;right:16px;z-index:1000;max-width:430px;padding:12px 14px;border:1px solid #bfb7aa;background:#fff;box-shadow:0 10px 24px rgba(0,0,0,.12);font-size:12px;font-weight:700;line-height:1.45}.toast.success{border-color:#9cc7a6;color:var(--ok)}.toast.error{border-color:#d9a2a2;color:var(--bad)}.help{margin-top:8px;border:1px dashed #938a7a;background:#fffdf7}.stats{width:100%;border-collapse:collapse;table-layout:fixed}.stats th,.stats td{border-right:1px dashed #b6ad9e;padding:8px 10px;font-size:11px}.stats th:last-child,.stats td:last-child{border-right:0}.stats th{background:#f7f1e5;text-align:left;font-weight:700;color:#4a4438}.stats td{background:#fffdf7;font-weight:700}.btn{border:1px solid #4a4a4a;background:#fff;color:#111;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer}.btn:hover{background:#f1f1f1}.btn:disabled{opacity:.65;cursor:wait;background:#f5f5f5}.btn.main{background:#111;color:#fff;border-color:#111}.btn.main:hover{background:#222}.btn.main:disabled{background:#111}.btn.small{padding:2px 5px;font-size:9px}.hidden{display:none}.sectionHead{max-width:var(--sheet-width);margin:16px auto 6px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.sectionHead h2{margin:0;font-size:15px;font-weight:700}.sectionHead p{margin:2px 0 0;color:var(--muted);font-size:11px}.doc{margin-bottom:18px}.sheet{max-width:var(--sheet-width);margin:0 auto;background:var(--paper);border:1px solid var(--line);overflow:hidden;box-shadow:none}.hdr{display:grid;grid-template-columns:128px 1fr 92px;border-bottom:1px solid var(--line)}.logo{background:#585858;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;font-weight:700;padding:6px;line-height:1.35;border-right:1px solid var(--line);white-space:pre-line}.co{text-align:center;padding:6px 8px}.co h1{margin:0 0 3px;font-size:13px;letter-spacing:.02em}.co p{margin:1px 0;font-size:9px;line-height:1.2}.note{padding:6px 4px;border-left:1px solid var(--line);font-size:8px;text-align:center;white-space:pre-line}.title{text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid var(--line);padding:6px 8px}.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-bottom:1px solid var(--line)}.card{min-width:0;border-right:1px solid var(--line)}.grid2>.card:last-child,.grid2>.meta:last-child{border-right:0}.cardTitle{font-size:10px;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--line);background:#f5f5f5}.card textarea,.foot textarea{width:100%;min-height:68px;border:0;border-bottom:1px solid var(--line);padding:5px 6px;font:inherit;font-size:10px;line-height:1.35;resize:vertical}.pairs{display:grid;grid-template-columns:1fr 1fr}.row{display:flex;align-items:center;gap:4px;padding:3px 5px;border-top:1px solid var(--line-soft);font-size:9px}.row span{white-space:nowrap;font-weight:700}.row.full{grid-column:1/-1}.row input,.row select,.meta input,.meta select,.line input,.line select,.table input,.table select{width:100%;border:1px solid #a8a8a8;padding:3px 4px;font:inherit;font-size:10px;background:#fff;min-width:0}.supplier-search-wrap{position:relative;width:100%}.supplier-search{padding-right:28px !important}.supplier-search::-webkit-calendar-picker-indicator{opacity:0;position:absolute;right:0}.supplier-search-wrap::after{content:"▼";position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#444;font-size:12px;line-height:1}.table input,.table select{padding:2px 3px;font-size:8px}.row input:focus,.row select:focus,.meta input:focus,.meta select:focus,.line input:focus,.line select:focus,.table input:focus,.table select:focus,.card textarea:focus,.foot textarea:focus{outline:none;border-color:#2d6fb3;box-shadow:none}.meta{width:100%;border-collapse:collapse;table-layout:fixed}.meta td{border:1px solid var(--line);padding:4px 5px;font-size:9px}.meta td:first-child{width:43%;font-weight:700;background:#f8f8f8}.line{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 6px;border-bottom:1px solid var(--line);font-size:9px}.wrap{overflow-x:auto;border-bottom:1px solid var(--line);background:#fff}.table{width:100%;border-collapse:collapse;table-layout:fixed}.invoiceTable{min-width:1140px}.packingTable{min-width:1800px}.poTable{min-width:2200px}.toolbar input,.actions input{border:1px solid #a8a8a8;padding:7px 10px;font:inherit;font-size:12px;background:#fff;min-width:180px}.table th,.table td{border:1px solid var(--line);padding:2px 3px;font-size:8px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}.table th{background:#f5f5f5;text-align:center;font-weight:700}.c{text-align:center}.r{text-align:right}.summary{display:grid;grid-template-columns:minmax(0,1fr) 250px;border-bottom:1px solid var(--line)}.panel{border-right:1px solid var(--line)}.summary>.panel:last-child{border-right:0}.panelBody{padding:6px;font-size:10px;line-height:1.35}.valueLine{padding:7px 8px;border-bottom:1px solid var(--line);font-size:12px;font-weight:700}.foot{display:grid;grid-template-columns:minmax(0,1fr) 220px;border-bottom:1px solid var(--line)}.sign{min-height:84px;padding:8px;border-right:1px solid var(--line);position:relative;text-align:center;font-size:10px}.sign:last-child{border-right:0}.sign.left{text-align:left}.sigLine{position:absolute;left:8px;right:8px;bottom:8px;border-top:1px solid var(--line);padding-top:3px;font-size:9px;font-weight:700}.actions{max-width:var(--sheet-width);margin:8px auto 0;justify-content:flex-end;padding-top:0}.muted{font-size:11px;color:var(--muted)}@media(max-width:900px){.app{padding:10px}.pageHeader,.sectionHead,.sheet,.actions{max-width:none}.hdr,.grid2,.summary,.foot{grid-template-columns:1fr}.logo,.note,.card,.panel,.sign{border-right:0;border-bottom:1px solid var(--line)}.pairs{grid-template-columns:1fr}.toolbar,.actions{align-items:stretch}.toolbar .btn,.actions .btn{flex:1 1 180px}.sectionHead{align-items:flex-start;flex-direction:column}.wrap{overflow-x:auto}.invoiceTable,.packingTable{min-width:980px}.toast{left:12px;right:12px;max-width:none}}@media print{body{background:#fff}.app{max-width:100%;padding:0}.pageHeader,.actions,.muted,.toast{display:none}.sheet{box-shadow:none;border:1px solid #111}.doc{margin-bottom:8px}.wrap{overflow:visible}.invoiceTable,.packingTable{min-width:0}}

`;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_PRIMARY_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = String(import.meta.env.VITE_GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash,gemini-1.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_MODELS = Array.from(new Set([GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS]));
const GEMINI_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const GEMINI_API_BASES = ['https://generativelanguage.googleapis.com/v1beta', 'https://generativelanguage.googleapis.com/v1'];
const GEMINI_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_GEMINI_TIMEOUT_MS || 45000);
let GEMINI_COOLDOWN_UNTIL = 0;


const FIRMS = [
  { 
    id: 'lnki', 
    name: 'LNKI', 
    scriptUrl: 'https://script.google.com/macros/s/AKfycbyMNk5ixvpIiK6ln-m-rT8aW2EdbTlaWF9As5EhMDg0h3u5gPrFosx4d22MLoKPWCVovg/exec', 
    spreadsheetId: import.meta.env.VITE_LNKI_SPREADSHEET_ID || '114qzPknHLYtQnMAH3URakk9djBjDL3zpd59fd3OWau0',
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
    scriptUrl: 'https://script.google.com/macros/s/AKfycbwiyz-CktQyrxFP2U-LPHYm8zcECnPWQsK6NRYtt83w2Hzm24xZLL70PjD6yTHDiEhQOw/exec', 
    spreadsheetId: import.meta.env.VITE_UNIT_1_SPREADSHEET_ID || '',
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
    scriptUrl: 'https://script.google.com/macros/s/AKfycbzJD4sZCrUFu6N_w-VH60NOucs4us_artwt6h6trB1mpLBnn43OWynpxWa9pIts9xYcFA/exec', 
    spreadsheetId: import.meta.env.VITE_UNIT_2_SPREADSHEET_ID || '',
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

const getSheetName = (base, type) => {
  if (typeof base === 'object' && base !== null) {
    return base[type] || base['reel'] || '';
  }
  if (type === 'sheet') return `${base} (SHEETS)`;
  return base;
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
  amount: '' 
});
const blankPackingRow = () => ({ mrr_no: '', ge_no: '', po_no: '', po_details: '', supplier_reel_no: '', erp_code: '', reel_details: '', item_name: '', reel_no: '', sort_no: '', party_order: '', bf: '', gsm: '', size: '', unit: 'CM', rate: '', po_rate: '', net_wt: '' });
const blankPoRow = () => ({ sno: '', po_no: '', date: '', supplier: '', po_details: '', erp_code: '', size: '', gsm: '', bf: '', reel_details: '', rate: '', quantity: '', status: '', quantity_received: '', pending: '', closed: '', rapc: '' });

const blankInvoice = {
  header: { ...defaultHeader(), note: '' },
  doc_title: 'MRR',
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

const n = (v) => Number(v) || 0;
const money = (v) => n(v).toFixed(2);
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
      const MAX_DIM = 1200;
      let { width, height } = img;
      if (width > height && width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      } else if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
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
  return String(value ?? '').trim() !== '' && String(value ?? '').trim() !== '0';
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

  const brand_box = compactBrandBox(source.brand_box, title, kind);
  const note = source.note || (title || works || meta || contact || gstin ? (kind === 'invoice' ? 'Original For Buyer' : 'Dispatch Copy') : '');
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
    sort_no: row.sort_no || '',
    party_order: row.po_no || row.party_order || '',
    gsm: row.gsm || '',
    size: row.size || '',
    size_unit: row.unit || 'CM',
    reels: '',
    weight: row.net_wt || '',
    weight_unit: 'KGS',
    rate: row.rate || '',
    amount: ''
  }));
}

function mergeInvoiceGoodsIntoPackingItems(packingItems = [], invoiceGoods = []) {
  const packingRows = ensureRows(packingItems);
  const invoiceRows = ensureRows(invoiceGoods);
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
  const invoiceRows = ensureRows(invoiceGoods);
  const packingRows = ensureRows(packingItems);
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
  const docTitle = String(invoice.doc_title || '').trim().toLowerCase();
  if (!docTitle || docTitle === 'tax invoice' || docTitle === 'tax invoice against gst') {
    invoice.doc_title = 'MRR';
  }
  invoice.goods = ensureRows(invoice.goods).filter((row) => !isTotalLikeInvoiceRow(row)).map((row) => {
    const mergedRow = merge(blankInvoiceRow(), row);
    if (!mergedRow.amount && n(mergedRow.weight) && n(mergedRow.rate)) mergedRow.amount = String(n(mergedRow.weight) * n(mergedRow.rate));
    return mergedRow;
  });
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
      rate: mergedRow.rate || '',
      po_rate: mergedRow.po_rate || ''
    };
  });
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
    po_no: String(pickPoValue(data, 'po_no', 'poNo', 'PO NO.', 'PO NO')).trim(),
    date: normalizeSheetDate(pickPoValue(data, 'date', 'DATE')),
    supplier: String(pickPoValue(data, 'supplier', 'SUPPLIER')).trim(),
    po_details: String(pickPoValue(data, 'po_details', 'poDetails', 'PO DETAILS')).trim(),
    erp_code: String(pickPoValue(data, 'erp_code', 'erpCode', 'ERP Code', 'ERP CODE')).trim(),
    size: String(pickPoValue(data, 'size', 'SIZE')).trim(),
    gsm: String(pickPoValue(data, 'gsm', 'GSM')).trim(),
    bf: String(pickPoValue(data, 'bf', 'BF')).trim(),
    reel_details: String(pickPoValue(data, 'reel_details', 'reelDetails', 'REEL DETAILS')).trim(),
    rate: String(pickPoValue(data, 'rate', 'RATE')).trim(),
    quantity: String(pickPoValue(data, 'quantity', 'QUANTITY')).trim(),
    status: String(pickPoValue(data, 'status', 'STATUS')).trim(),
    quantity_received: String(pickPoValue(data, 'quantity_received', 'quantityReceived', 'QUANTITY RECEIVED')).trim(),
    pending: String(pickPoValue(data, 'pending', 'PENDING')).trim(),
    closed: String(pickPoValue(data, 'closed', 'Closed', 'Closed ')).trim(),
    rapc: String(pickPoValue(data, 'rapc', 'RAPC')).trim()
  };
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
    po_no: findIdx(['PO No.', 'PO No', 'po_no', 'party_order_no', 'party_order']),
    date: findIdx(['Date', 'date', 'po_date', 'order_date']),
    supplier: findIdx(['SUPPLIER', 'supplier', 'party_name', 'vendor']),
    po_details: findIdx(['PO DETAILS', 'po_details', 'item_description']),
    erp_code: findIdx(['ERP Code', 'erp_code', 'item_code']),
    size: findIdx(['Size', 'size']),
    gsm: findIdx(['GSM', 'gsm']),
    bf: findIdx(['BF', 'bf']),
    reel_details: findIdx(['REEL DETAILS', 'reel_details', 'item_name', 'reel_info']),
    rate: findIdx(['Rate', 'rate']),
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
      return 'Gemini API key is invalid. Create a new Google AI Studio key (starts with "AIza") and restart the app.';
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
  return !status || status === 404 || status === 429 || status >= 500;
}

function isLikelyGoogleApiKey(value) {
  const key = String(value || '').trim();
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(key);
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
          err.message = 'Gemini request timed out while reading the image. Please retry with a clearer or smaller image.';
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

async function fetchGeminiStructured(base64, mimeType, prompt, shape) {
  const schema = inferJsonSchema(shape);
  const mainRequest = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      temperature: 0.1
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
            responseJsonSchema: schema,
            temperature: 0
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
  const focused = ensureRows(focusedRows);
  if (!focused.length) return baseRows;
  const base = ensureRows(baseRows);
  return focused.map((row, index) => merge(
    typeof makeBlankRow === 'function' ? makeBlankRow() : {},
    merge(base[index] || {}, row)
  ));
}

function mergeFocusedInvoiceData(data, focused = {}) {
  return {
    ...data,
    pin: data.pin || focused.pin || '',
    ge_no: data.ge_no || focused.ge_no || '',
    mrr_no: data.mrr_no || focused.mrr_no || '',
    receipt_date: data.receipt_date || focused.receipt_date || '',
    actual_weight: data.actual_weight || focused.actual_weight || '',
    irn: data.irn || focused.irn || '',
    ack_no: data.ack_no || focused.ack_no || '',
    ack_date: data.ack_date || focused.ack_date || '',
    goods: mergeScanRows(data.goods, focused.goods, blankInvoiceRow)
  };
}

function mergeFocusedPackingData(data, focused = {}) {
  return {
    ...data,
    intro_line: data.intro_line || focused.intro_line || '',
    ge_no: data.ge_no || focused.ge_no || '',
    mrr_no: data.mrr_no || focused.mrr_no || '',
    receipt_date: data.receipt_date || focused.receipt_date || '',
    truck_no: data.truck_no || focused.truck_no || '',
    actual_total: data.actual_total || focused.actual_total || '',
    total_reels: data.total_reels || focused.total_reels || '',
    total_weight: data.total_weight || focused.total_weight || '',
    receiver_label: data.receiver_label || focused.receiver_label || '',
    signer_name: data.signer_name || focused.signer_name || '',
    approval_text: data.approval_text || focused.approval_text || '',
    signatory_label: data.signatory_label || focused.signatory_label || '',
    items: mergeScanRows(data.items, focused.items, blankPackingRow)
  };
}

async function fetchGeminiJson(file, kind) {
  if (!API_KEY) throw new Error('Missing Gemini API key');
  if (!isLikelyGoogleApiKey(API_KEY)) {
    throw new Error('Invalid Gemini API key format. Use a Google AI Studio key that starts with "AIza".');
  }
  const shape = kind === 'invoice' ? blankInvoice : blankPacking;
  const dataUrl = await fileToBase64(file);
  const mimeType = getDataUrlMimeType(dataUrl, file.type || 'image/jpeg');
  const processedSize = getDataUrlBase64Size(dataUrl);
  if (processedSize > 18 * 1024 * 1024) {
    throw new Error('Processed image is still too large for Gemini. Please use a clearer crop or a smaller photo.');
  }
  const base64 = getDataUrlBase64(dataUrl);
  const prompt = `Read this ${kind === 'invoice' ? 'invoice/mrr document' : 'packing slip'} image and extract visible dynamic values into JSON. Include company/header block, document title, party details, transport fields, totals, and all table rows. Return only schema fields, keep dates in YYYY-MM-DD where possible, preserve row order, and use empty strings or 0 when unreadable.`;
  let data = await fetchGeminiStructured(base64, mimeType, prompt, shape);

  if (kind === 'invoice' && needsInvoiceRowRetry(data.goods)) {
    try {
      const focused = await fetchGeminiStructured(
        base64,
        mimeType,
        'Focus on the invoice goods table and nearby PIN, GE No, MRR No, date of receipt, truck number, actual weight, IRN, and Ack sections. Read each visible row cell by cell in order. Extract description, HSN, sort_no, party_order, gsm, size, size_unit, reels, weight, weight_unit, rate, and amount for every row. Do not invent values. Leave unreadable cells empty.',
        { pin: '', ge_no: '', mrr_no: '', receipt_date: '', actual_weight: '', irn: '', ack_no: '', ack_date: '', goods: [blankInvoiceRow()] }
      );
      data = mergeFocusedInvoiceData(data, focused);
    } catch {
    }
  }

  if (kind === 'packing' && needsPackingRowRetry(data.items)) {
    try {
      const focused = await fetchGeminiStructured(
        base64,
        mimeType,
        'Focus on the packing slip item table and the nearby intro line, GE No, MRR No, date of receipt, truck number, actual total, totals, received by, approval text, and signatory sections. Read each visible row cell by cell in order. Extract item_name, supplier_reel_no, reel_no, sort_no, party_order, bf, gsm, size, unit, net_wt, mrr_no, ge_no, po_no, po_details, and rate for every row. Supplier reel number should come from the photo. Leave erp_code empty unless clearly visible. Do not invent values. Leave unreadable cells empty.',
        { intro_line: '', ge_no: '', mrr_no: '', receipt_date: '', truck_no: '', actual_total: '', total_reels: '', total_weight: '', receiver_label: '', signer_name: '', approval_text: '', signatory_label: '', items: [blankPackingRow()] }
      );
      data = mergeFocusedPackingData(data, focused);
    } catch {
    }
  }

  return data;
}

function Header({ header }) {
  return (
    <div className="hdr">
      <div className="logo">{header.brand_box}</div>
      <div className="co">
        <h1>{header.title}</h1>
        <p>{header.works}</p>
        <p>{header.meta}</p>
        <p>{header.contact}</p>
        {header.extra_lines?.map((line, index) => <p key={index}>{line}</p>)}
      </div>
      <div className="note">{header.note}</div>
    </div>
  );
}

function normalizeInputDateValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  }
  const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const named = text.match(/^(\d{1,2})[\/-\s]([A-Za-z]{3,})[\/-\s](\d{2,4})$/);
  if (named) {
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    const month = monthNames[named[2].slice(0, 3).toLowerCase()];
    if (month) return `${year}-${month}-${named[1].padStart(2, '0')}`;
  }
  return '';
}

function normalizeInputNumberValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : '';
}

function getSafeInputValue(type, value) {
  if (type === 'date') return normalizeInputDateValue(value);
  if (type === 'number') return normalizeInputNumberValue(value);
  return value || '';
}

function MetaTable({ rows }) {
  return <table className="meta"><tbody>{rows.map(([label, value, onChange, type, readOnly]) => <tr key={label}><td>{label}</td><td><input type={type || 'text'} value={getSafeInputValue(type, value)} onChange={(e) => onChange && onChange(e.target.value)} readOnly={!!readOnly} disabled={!onChange} style={readOnly ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined} /></td></tr>)}</tbody></table>;
}

function Field({ label, value, onChange, full }) {
  return <div className={full ? 'row full' : 'row'}><span>{label}</span><input value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>;
}

function PartyCard({ label, data, onText, onField, contact, code, hideGstin = false, extras = [] }) {
  return (
    <div className="card">
      <div className="cardTitle">{label}</div>
      <textarea value={data.name_address || ''} onChange={(e) => onText(e.target.value)} />
      <div className="pairs">
        {!hideGstin ? <Field label="GSTIN" value={data.gstin || ''} onChange={(v) => onField('gstin', v)} /> : null}
        {contact ? <Field label="Contact" value={data.contact || ''} onChange={(v) => onField('contact', v)} /> : <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />}
        {contact ? <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} /> : (!hideGstin ? <Field label="GSTIN" value={data.gstin || ''} onChange={(v) => onField('gstin', v)} /> : <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />)}
        {code ? <Field label="Code" value={data.state_code || ''} onChange={(v) => onField('state_code', v)} /> : <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />}
        {extras.map(([lab, val, fn]) => <Field key={lab} label={lab} value={val} onChange={fn} full />)}
      </div>
    </div>
  );
}

function SimplePartyCard({ label, data, onText, onField }) {
  return (
    <div className="card">
      <div className="cardTitle">{label}</div>
      <textarea value={data.name_address || ''} onChange={(e) => onText(e.target.value)} />
      <div className="pairs">
        <Field label="GSTIN" value={data.gstin || ''} onChange={(v) => onField('gstin', v)} />
        <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />
      </div>
    </div>
  );
}
function ReelLabelsTab({ initialMrr, helperSheetName }) {
  const [searchMrr, setSearchMrr] = useState(initialMrr || '');
  const [status, setStatus] = useState('');
  const [reels, setReels] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [printMode, setPrintMode] = useState('a4');

  useEffect(() => {
    if (initialMrr && !searchMrr) {
      setSearchMrr(initialMrr);
    }
  }, [initialMrr]);

  const handleSearch = async () => {
    if (!searchMrr.trim()) return;
    setIsSearching(true);
    setStatus('Searching...');
    try {
      const payload = await fetchSheetRangeWithParams({
        sheet: helperSheetName || HELPER_SHEET_NAME,
        mrr_number: searchMrr.trim(),
        spreadsheetId: selectedFirm.spreadsheetId
      }, selectedFirm.scriptUrl);
      const data = payload?.values || [];
      if (data.length) {
        setReels(data);
        setStatus(`Found ${data.length} reels for MRR ${searchMrr}.`);
      } else {
        setReels([]);
        setStatus(`No reels found for MRR ${searchMrr}.`);
      }
    } catch (err) {
      setReels([]);
      setStatus(err.message || 'Error fetching MRR.');
    } finally {
      setIsSearching(false);
    }
  };

  const getVal = (r, key) => r[key] || r[key.toLowerCase()] || r[key.replace(/ /g, '_').toLowerCase()] || '';

  return (
    <div className="sheet" style={{ padding: 20 }}>
      <div className="sectionHead no-print" style={{ marginTop: 0 }}>
        <h2>Print Reel Labels</h2>
        <p>Scan MRR to Generate QR code labels</p>
      </div>
      <div className="toolbar no-print" style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchMrr}
          onChange={e => setSearchMrr(e.target.value)}
          placeholder="Enter MRR Number..."
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{ width: '250px' }}
        />
        <button className="btn main" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? <span className="spinner" /> : 'Search MRR'}
        </button>
        {reels.length > 0 && (
          <>
            <button className="btn" onClick={() => {
              setPrintMode('a4');
              const prev = document.title;
              document.title = `MRR_${searchMrr.trim()}_A4`;
              setTimeout(() => { window.print(); setTimeout(() => { document.title = prev; }, 1000); }, 100);
            }}>
              Print A4 (1 Per Page)
            </button>
            <button className="btn" onClick={() => {
              setPrintMode('label');
              const prev = document.title;
              document.title = `MRR_${searchMrr.trim()}`;
              setTimeout(() => { window.print(); setTimeout(() => { document.title = prev; }, 1000); }, 100);
            }}>
              Print Small Labels
            </button>
          </>
        )}
        {status && <span className={`status ${reels.length ? 'success' : 'error'}`}>{status}</span>}
      </div>

      {reels.length > 0 && (
        <div className={`print-area labels-grid mode-${printMode}`}>
          {reels.map((reel, idx) => {
            const reelNo = getVal(reel, 'Our_Reel_Number') || getVal(reel, 'Our Reel Number') || getVal(reel, 'our_reel_number') || getVal(reel, 'reel_number') || reel['our_reel_no'] || '';
            return (
              <div key={idx} className="print-label">
                <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" className="brand-logo" alt="Laxmi Narayan Group" />
                <h2 style={{ margin: '4px 0 8px', fontSize: '14px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{selectedFirm?.name}</h2>
                <div className="sub-info">
                  <span>Doc: <b>{getVal(reel, 'Sup Doc No.') || getVal(reel, 'sup_doc_no')}</b></span>
                  <span>Date: <b>{getVal(reel, 'Date') || getVal(reel, 'date')}</b></span>
                  <span>Code: <b>{getVal(reel, 'ERP Code') || getVal(reel, 'erp_code')}</b></span>
                </div>
                <h3 style={{ fontSize: '11px' }}>{selectedFirm?.name}</h3>
                <div className="specs">
                  Size: {getVal(reel, 'Size')} CM X GSM: {getVal(reel, 'GSM')} X BF: {getVal(reel, 'BF')}
                </div>
                <div className="grid-2">
                  <div>GSM <span>{getVal(reel, 'GSM')}</span></div>
                  <div>R/No. <span>{reelNo}</span></div>
                  <div>Weight <span>{getVal(reel, 'Weight')}</span></div>
                  <div>Supp Reel <span>{getVal(reel, 'Supplier Reel No.') || getVal(reel, 'supplier_reel_no')}</span></div>
                </div>
                <div className="qr-container">
                  {reelNo ? (
                    <QRCode value={String(reelNo)} size={printMode === 'a4' ? 550 : 180} level="H" />
                  ) : (
                    <div style={{ width: printMode === 'a4' ? 550 : 180, height: printMode === 'a4' ? 550 : 180, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc' }}>No Reel No</div>
                  )}
                  <div className="qr-hint">Scan for Reel</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
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

function normalizeGateEntryInitialData(initialData, geNo, defaultDate) {
  const source = initialData || {};
  return {
    supplier: source.supplier || source.supplier_name || '',
    invoice_no: source.invoice_no || '',
    total_value: source.total_value || source.total_invocie_value || '',
    truck_no: source.truck_no || source.vehicle_no || '',
    ge_no: getGateEntryNo(source) || geNo || '',
    mrr_no: getMrrNo(source) || '',
    date: source.date || defaultDate
  };
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
    pdf.text('GATE ENTRY PASS', pageWidth / 2, y, { align: 'center' });
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
      ['Date', entry?.date || ''],
      ['Supplier Name', entry?.supplier || ''],
      ['Invoice No', entry?.invoice_no || ''],
      ['Invoice Value', entry?.total_value || ''],
      ['Truck / Vehicle No', entry?.truck_no || '']
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

function GateEntrySavedModal({ isOpen, firm, entry, previewPics, onClose }) {
  if (!isOpen || !entry) return null;

  const previewPhotos = previewPics.filter(Boolean);

  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 10001 }}>
      <div style={{ background: '#fff', width: '95%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '2px solid #111', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Gate Entry Registered</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666', fontWeight: 700 }}>Record saved successfully to Google Sheets</p>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '8px 24px' }}>Close</button>
        </div>
        
        <div style={{ border: '2px solid #111', padding: '32px', background: '#fff', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid #ddd', paddingBottom: '20px' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '60px' }} alt="Logo" />
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#444', marginTop: '8px', textTransform: 'uppercase' }}>{firm?.name || ''}</div>
            <h3 style={{ margin: '12px 0 0', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '3px', fontSize: '20px' }}>Gate Entry Pass</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px 40px', fontSize: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>GE Entry No</span>
              <span style={{ fontWeight: 900, fontSize: '18px', color: 'var(--primary)' }}>{entry.ge_no || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Date</span>
              <span style={{ fontWeight: 700 }}>{entry.date || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Supplier</span>
              <span style={{ fontWeight: 700 }}>{entry.supplier || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Invoice No</span>
              <span style={{ fontWeight: 700 }}>{entry.invoice_no || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Invoice Value</span>
              <span style={{ fontWeight: 700 }}>{entry.total_value || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Truck / Vehicle No</span>
              <span style={{ fontWeight: 700 }}>{entry.truck_no || ''}</span>
            </div>
          </div>
          
          {previewPhotos.length > 0 && (
            <div style={{ marginTop: '30px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
              <strong style={{ display: 'block', marginBottom: '16px', fontSize: '11px', textTransform: 'uppercase', color: '#888' }}>Attached Photos</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {previewPhotos.map((pic, index) => (
                  <div key={index} style={{ border: '1px solid #eee', padding: '6px', background: '#f9f9f9' }}>
                    <img src={pic} alt={`Pic ${index + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '2px' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', opacity: 0.6 }}>
             <div style={{ borderTop: '1px solid #111', width: '120px', textAlign: 'center', paddingTop: '6px', fontSize: '9px', fontWeight: 700 }}>Guard Sig.</div>
             <div style={{ borderTop: '1px solid #111', width: '120px', textAlign: 'center', paddingTop: '6px', fontSize: '9px', fontWeight: 700 }}>Receiver Sig.</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
          <button className="btn main" style={{ padding: '12px 32px', fontSize: '14px' }} onClick={() => downloadGateEntryPdfDirect(firm, entry, previewPics)}>
            Download PDF
          </button>
          <button className="btn" style={{ padding: '12px 32px', fontSize: '14px' }} onClick={onClose}>
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function GateEntryForm({ onSave, onBack, firm, mrrType, geNo, initialData }) {
  const [pics, setPics] = useState(Array(8).fill(null));
  const defaultDate = new Date().toLocaleDateString('en-GB');
  const [data, setData] = useState(() => normalizeGateEntryInitialData(initialData, geNo, defaultDate));
  const [status, setStatus] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const visibleSuppliers = [...new Set(
    suppliers
      .map((supplier) => String(supplier || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  useEffect(() => {
    if (initialData) {
      const newPics = Array(8).fill(null);
      for (let i = 1; i <= 8; i++) {
        const pic = initialData[`pic${i}`];
        if (pic) newPics[i-1] = pic;
      }
      setPics(newPics);
    }
  }, [initialData]);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      date: prev.date || defaultDate,
      ge_no: prev.ge_no || geNo || getGateEntryNo(initialData) || '',
      mrr_no: prev.mrr_no || getMrrNo(initialData) || ''
    }));
  }, [defaultDate, geNo, initialData]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const list = await fetchUniqueSuppliers(firm);
        setSuppliers(list);
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      }
    }
    loadSuppliers();
  }, [firm]);

  useEffect(() => {
    async function loadNextGeNo() {
      if (!firm?.scriptUrl) return;
      if (getGateEntryNo(initialData) || geNo || data.ge_no) return;
      try {
        const prefix = `${getFirmCode(firm)}/${getFinancialYearLabel(data.date || defaultDate)}/`;
        const latest = await fetchLatestMrrGe('GE ENTRY', firm.spreadsheetId, firm.scriptUrl, prefix);
        const nextGeNo = formatGateEntryNumber(firm, data.date || defaultDate, Number(latest?.ge || 0) + 1);
        setData((prev) => prev.ge_no ? prev : { ...prev, ge_no: nextGeNo });
      } catch (err) {
        console.error('Failed to load next GE No:', err);
      }
    }
    loadNextGeNo();
  }, [firm, geNo, initialData, data.ge_no, data.date, defaultDate]);

  const handleFileChange = async (index, file) => {
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const newPics = [...pics];
      newPics[index] = base64;
      setPics(newPics);
    } catch (err) {
      alert('Error reading file');
    }
  };

  const handleSubmit = async () => {
    if (!data.supplier || !data.invoice_no) {
      alert('Supplier and Invoice No are required');
      return;
    }
    setIsSaving(true);
    setStatus('Uploading Gate Entry...');
    try {
      const payload = {
        ...data,
        ge_no: data.ge_no || getGateEntryNo(initialData) || geNo || '',
        mrr_no: data.mrr_no || getMrrNo(initialData) || '',
        original_ge_no: getGateEntryNo(initialData) || '',
        firm_code: getFirmCode(firm)
      };
      pics.forEach((pic, i) => {
        if (pic) payload[`pic${i + 1}`] = pic;
      });

      const res = await saveGeEntryToSheets(payload, {
        scriptUrl: firm.scriptUrl,
        spreadsheetId: firm.spreadsheetId
      });
      const finalEntry = { ...payload, ge_no: res.ge_no || data.ge_no, mrr_no: res.mrr_no || data.mrr_no || '' };
      setData(finalEntry);
      setSavedEntry(finalEntry);
      setStatus('Gate Entry saved successfully.');
    } catch (err) {
      setStatus(err.message || 'Error saving gate entry');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="loading-overlay" style={{ background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)', overflowY: 'auto' }}>
      <div style={{ background: '#fff', padding: '30px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '800px', width: '95%', margin: '40px auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '50px' }} alt="Logo" />
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{firm?.name || ''}</div>
          </div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>GATE ENTRY FORM</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
            <span>Supplier Name</span>
            <div className="supplier-search-wrap">
              <input
                className="supplier-search"
                list="gate-entry-suppliers"
                value={data.supplier}
                onChange={e => setData({...data, supplier: e.target.value})}
                placeholder="Search or Select Supplier Name"
              />
              <datalist id="gate-entry-suppliers">
                {visibleSuppliers.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </datalist>
            </div>
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
            <span>Date</span>
            <input value={data.date || defaultDate} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
            <span>GE No</span>
            <input value={data.ge_no || geNo || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}><span>Invoice No</span><input value={data.invoice_no} onChange={e => setData({...data, invoice_no: e.target.value})} placeholder="Enter Invoice No" /></div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}><span>Invoice Value</span><input type="number" value={data.total_value} onChange={e => setData({...data, total_value: e.target.value})} placeholder="Enter Total Value" /></div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}><span>Truck No</span><input value={data.truck_no} onChange={e => setData({...data, truck_no: e.target.value})} placeholder="Enter Truck No" /></div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Upload Photos (Up to 8)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {pics.map((pic, i) => (
              <div key={i} style={{ border: '1px dashed #ccc', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#f9f9f9' }}>
                {pic ? (
                  <img src={pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Pic ${i+1}`} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#888' }}>Pic {i + 1}</span>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={e => handleFileChange(i, e.target.files[0])}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onBack} disabled={isSaving}>← Back</button>
          <button className="btn main" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
        {status && <p style={{ color: status.includes('Error') ? 'red' : 'green', fontSize: '12px', marginTop: '10px', fontWeight: 'bold' }}>{status}</p>}
      </div>
      <GateEntrySavedModal
        isOpen={Boolean(savedEntry)}
        firm={firm}
        entry={savedEntry}
        previewPics={pics}
        onClose={() => {
          const finalGeNo = savedEntry?.ge_no || data.ge_no;
          const finalEntry = savedEntry || data;
          setSavedEntry(null);
          onSave(finalGeNo, finalEntry);
        }}
      />
    </div>
  );
}

function PendingGeModal({ isOpen, onClose, pendingGEs, onSelect }) {
  if (!isOpen) return null;
  const pendingTableStyle = { width: '100%', tableLayout: 'auto' };
  const pendingHeaderCellStyle = { fontSize: '15px', background: '#d1d5db', color: '#111', fontWeight: 700, padding: '8px 10px' };
  const pendingBodyCellStyle = { fontSize: '12px', color: '#111', padding: '8px 10px' };
  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 10000 }}>
      <div style={{ background: '#fff', padding: '24px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Select Pending Item</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        {!pendingGEs.length ? <p>No pending entries found.</p> : (
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
                <th style={pendingHeaderCellStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingGEs.map((ge, idx) => (
                <tr key={idx}>
                  <td className="c" style={pendingBodyCellStyle}>{idx + 1}</td>
                  <td style={pendingBodyCellStyle}>{ge.date}</td>
                  <td className="c" style={pendingBodyCellStyle}>{ge.ge_entry || ge.ge_no}</td>
                  <td className="c" style={pendingBodyCellStyle}>{ge.mrr_number || ge.mrr_no || ''}</td>
                  <td style={pendingBodyCellStyle}>{ge.supplier_name || ge.supplier}</td>
                  <td style={pendingBodyCellStyle}>{ge.invoice_no}</td>
                  <td style={pendingBodyCellStyle}>{ge.total_value || ge.total_invocie_value || ge.invoice_basic_value || ''}</td>
                  <td style={pendingBodyCellStyle}>{ge.truck_no}</td>
                  <td className="c" style={pendingBodyCellStyle}>
                    <button
                      className="btn main small"
                      style={{ fontSize: '12px', padding: '7px 12px', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1f2937'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}
                      onClick={() => onSelect(ge)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StartupOverlay({ onSelect, onGeSubmit, firms }) {
  const [step, setStep] = useState(1);
  const [tempFirm, setTempFirm] = useState(null);
  const tempType = 'reel';
  const [pendingGEs, setPendingGEs] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [editData, setEditData] = useState(null);
  const [pendingFilter, setPendingFilter] = useState('pending_mrr');
  const safeEditData = editData && typeof editData === 'object' ? editData : null;

  const pendingCounts = useMemo(() => ({
    pending_mrr: pendingGEs.filter((item) => item.pending_stage === 'pending_mrr').length,
    pending_accounts_approval: pendingGEs.filter((item) => item.pending_stage === 'pending_accounts_approval').length,
    pending_md_approval: pendingGEs.filter((item) => item.pending_stage === 'pending_md_approval').length,
    pending_tally_posting: pendingGEs.filter((item) => item.pending_stage === 'pending_tally_posting').length
  }), [pendingGEs]);

  const filteredPendingGEs = useMemo(
    () => pendingGEs.filter((item) => item.pending_stage === pendingFilter),
    [pendingGEs, pendingFilter]
  );
  const pendingTableStyle = { width: '100%', tableLayout: 'auto' };
  const pendingHeaderCellStyle = { fontSize: '15px', background: '#d1d5db', color: '#111', fontWeight: 700, padding: '8px 10px' };
  const pendingBodyCellStyle = { fontSize: '12px', color: '#111', padding: '8px 10px' };

  useEffect(() => {
    if (step === 3 && tempFirm) {
      async function loadCount() {
        setIsLoadingPending(true);
        try {
          const mrrSheet = getSheetName(tempFirm.mrr, tempType);
          const list = await fetchPendingGeEntries(mrrSheet, tempFirm.spreadsheetId, tempFirm.scriptUrl);
          setPendingGEs(list || []);
        } catch (err) {
          console.error('Failed to load pending count:', err);
        } finally {
          setIsLoadingPending(false);
        }
      }
      loadCount();
    }
  }, [step, tempFirm, tempType]);

  if (step === 1) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        <div style={{ margin: 'auto', background: '#fff', padding: '40px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '600px', width: '90%', textAlign: 'center' }}>
          <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '80px', marginBottom: '20px' }} alt="Logo" />
          <h2 style={{ color: 'var(--ink)', fontSize: '24px', marginBottom: '30px', letterSpacing: '0.02em' }}>SELECT FIRM</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {firms.map((firm) => (
              <button 
                key={firm.id} 
                className="btn main" 
                style={{ padding: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onClick={() => { setTempFirm(firm); setStep(3); }}
              >
                {firm.name}
              </button>
            ))}
          </div>
          <p style={{ marginTop: '30px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>MRR Management v4.0</p>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        <div style={{ margin: 'auto', background: '#fff', padding: '40px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '600px', width: '90%', textAlign: 'center' }}>
          <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '60px', marginBottom: '10px' }} alt="Logo" />
          <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, marginBottom: '20px' }}>{tempFirm.name}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn main" 
              style={{ padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#2c3e50', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setStep(4); }}
            >
              1. NEW GATE ENTRY
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending}
              style={{ padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('pending_mrr'); setStep(6); }}
            >
              2. PENDING MRR {isLoadingPending ? '...' : `(${pendingCounts.pending_mrr})`}
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending}
              style={{ padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#1f7a8c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('pending_accounts_approval'); setStep(6); }}
            >
              3. PENDING ACCOUNT APPROVAL {isLoadingPending ? '...' : `(${pendingCounts.pending_accounts_approval})`}
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending}
              style={{ padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#8a5a10', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('pending_md_approval'); setStep(6); }}
            >
              4. PENDING MD APPROVAL {isLoadingPending ? '...' : `(${pendingCounts.pending_md_approval})`}
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending}
              style={{ padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('pending_tally_posting'); setStep(6); }}
            >
              5. PENDING TALLY POSTING {isLoadingPending ? '...' : `(${pendingCounts.pending_tally_posting})`}
            </button>
            <button 
              className="btn" 
              style={{ padding: '10px', marginTop: '10px', fontSize: '11px', fontWeight: 700 }}
              onClick={() => { setStep(1); }}
            >
              ← Back to Firms
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <GateEntryForm 
        firm={tempFirm} 
        mrrType={tempType} 
        initialData={safeEditData}
        geNo={getGateEntryNo(safeEditData)}
        onBack={() => { setEditData(null); setStep(3); }} 
        onSave={(geNo, geData) => {
          setEditData(null);
          onGeSubmit(geNo, geData);
          setStep(3);
        }} 
      />
    );
  }

  if (step === 6) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h2 style={{ margin: 0, fontSize: '36px', letterSpacing: '0.03em' }}>
               {pendingFilter === 'pending_mrr' ? 'Pending MRR' :
                pendingFilter === 'pending_accounts_approval' ? 'Pending Account Approval' :
                pendingFilter === 'pending_md_approval' ? 'Pending MD Approval' :
                'Pending Tally Posting'}
             </h2>
             <button className="btn" onClick={() => setStep(3)}>← Back</button>
          </div>
          {!filteredPendingGEs.length ? <p>No pending entries found.</p> : (
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
                  <th style={pendingHeaderCellStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingGEs.map((ge, idx) => (
                  <tr key={idx}>
                    <td className="c" style={pendingBodyCellStyle}>{idx + 1}</td>
                    <td style={pendingBodyCellStyle}>{ge.date}</td>
                    <td className="c" style={pendingBodyCellStyle}>{ge.ge_no || ge.ge_entry}</td>
                    <td className="c" style={pendingBodyCellStyle}>{ge.mrr_number || ge.mrr_no || ''}</td>
                    <td style={pendingBodyCellStyle}>{ge.supplier || ge.supplier_name}</td>
                    <td style={pendingBodyCellStyle}>{ge.invoice_no}</td>
                    <td style={pendingBodyCellStyle}>{ge.total_value || ge.total_invocie_value || ge.invoice_basic_value || ''}</td>
                    <td style={pendingBodyCellStyle}>{ge.truck_no}</td>
                    <td className="c" style={{ ...pendingBodyCellStyle, display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button 
                        className="btn main small" 
                        style={{ fontSize: '13px', padding: '8px 12px', background: '#111', color: '#fff', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; e.currentTarget.style.color = '#fff'; }}
                        onClick={() => {
                          onGeSubmit(ge.ge_no || ge.ge_entry, ge);
                          onSelect(tempFirm, tempType);
                        }}
                      >
                        PROCEED
                      </button>
                      <button 
                        className="btn small" 
                        style={{ background: '#7f8c8d', color: '#111', fontSize: '13px', padding: '8px 12px', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#9ca3af'; e.currentTarget.style.color = '#111'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7f8c8d'; e.currentTarget.style.color = '#111'; }}
                        onClick={() => {
                          setEditData(ge);
                          setStep(4);
                        }}
                      >
                        EDIT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function App() {
  const [activeTab, setActiveTab] = useState('invoice');
  const [invoice, setInvoice] = useState(blankInvoice);
  const [packing, setPacking] = useState(blankPacking);
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
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [mrrType, setMrrType] = useState('reel');
  const [isFirmSelected, setIsFirmSelected] = useState(false);
  const [triggerPendingModal, setTriggerPendingModal] = useState(false);
  const [manualFields, setManualFields] = useState({}); // { [rowIdx]: { fieldName: true } }
  const invoiceRef = useRef(null);
  const packingRef = useRef(null);
  const popupTimerRef = useRef(null);
  const scanLockRef = useRef(false);

  const syncInvoiceFieldToPacking = {
    vehicle_no: 'truck_no',
    ge_no: 'ge_no',
    mrr_no: 'mrr_no',
    receipt_date: 'receipt_date',
    actual_weight: 'actual_total'
  };
  const syncPackingFieldToInvoice = {
    truck_no: 'vehicle_no',
    ge_no: 'ge_no',
    mrr_no: 'mrr_no',
    receipt_date: 'receipt_date',
    actual_total: 'actual_weight'
  };
  const syncPackingHeaderRows = {
    ge_no: 'ge_no',
    mrr_no: 'mrr_no'
  };

  const setInv = (field, value) => {
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
  const setInvNest = (group, field, value) => setInvoice((p) => ({ ...p, [group]: { ...p[group], [field]: value } }));
  const setInvRow = (i, field, value) => setInvoice((p) => ({ 
    ...p, 
    goods: p.goods.map((row, idx) => {
      if (idx !== i) return row;
      const updated = { ...row, [field]: value };
      if (field === 'weight' || field === 'rate') {
        updated.amount = money(n(updated.weight) * n(updated.rate));
      }
      return updated;
    }) 
  }));
  const setPack = (field, value) => {
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
  const setPackNest = (group, field, value) => setPacking((p) => ({ ...p, [group]: { ...p[group], [field]: value } }));
  const setPackRow = (i, field, value) => setPacking((p) => ({
    ...p,
    items: p.items.map((row, idx) => {
      if (idx !== i) return row;
      const updated = { ...row, [field]: value };
      if (field === 'reel_no') updated.supplier_reel_no = value;
      if (field === 'supplier_reel_no') updated.reel_no = value;
      return updated;
    })
  }));

  const gross = invoice.goods.reduce((sum, row) => sum + (n(row.amount) || n(row.weight) * n(row.rate)), 0);
  const reels = invoice.goods.reduce((sum, row) => sum + n(row.reels), 0);
  const weight = invoice.goods.reduce((sum, row) => sum + n(row.weight), 0);
  const taxable = gross + n(invoice.totals.insurance);
  const cg = taxable * n(invoice.totals.cgst_pct) / 100;
  const sg = taxable * n(invoice.totals.sgst_pct) / 100;
  const net = taxable + cg + sg + n(invoice.totals.round_off);
  const packingWeight = packing.items.reduce((sum, row) => sum + n(row.net_wt), 0);
  const invoiceRowCount = invoice.goods.filter(isMeaningful).length;
  const packingRowCount = packing.items.filter(isMeaningful).length;
  const packingReels = packing.items.filter(isMeaningful).length;
  const isGateEntryLocked = Boolean(geData && (geData.ge_no || geData.ge_entry || geData.invoice_no || geData.supplier));
  const poFilterText = poFilter.trim().toLowerCase();
  const filteredPoRows = poFilterText ? poRows.filter((row) => [row.po_no, row.date, row.supplier, row.po_details, row.erp_code, row.reel_details, row.status].some((value) => String(value || '').toLowerCase().includes(poFilterText))) : poRows;
  const withCurrentOption = (options, current) => current && !options.includes(current) ? [current, ...options] : options;
  const getSelectValue = (options, current) => options.includes(current) ? current : '';
  const poNoOptions = uniqueText(poRows.map((row) => row.po_no).filter(Boolean));
  const getPoRowsForPo = (poNo) => poRows.filter((row) => !poNo || row.po_no === poNo);
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
  const getPoDetailOptions = (row) => withCurrentOption(uniqueText(getPoRowsForPo(row.po_no).map((po) => po.po_details).filter(Boolean)), row.po_details);
  const getDescriptionOptions = (row) => withCurrentOption(uniqueText(getPoRowsForPo(row.po_no).map((po) => po.reel_details).filter(Boolean)), row.item_name || row.reel_details);
  const getErpCodeOptions = (row) => withCurrentOption(uniqueText(getPoRowsForPo(row.po_no).filter((po) => !(row.item_name || row.reel_details) || po.reel_details === (row.item_name || row.reel_details)).map((po) => po.erp_code).filter(Boolean)), row.erp_code);
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
    const matches = getPoRowsForPo(poNo);
    if (matches.length === 1) return fillPackRowFromPoRecord(row, matches[0], { po_no: poNo });
    const keepDescription = matches.some((po) => po.reel_details === (row.item_name || row.reel_details)) ? (row.item_name || row.reel_details) : '';
    const keepErpCode = matches.some((po) => po.erp_code === row.erp_code) ? row.erp_code : '';
    return {
      ...row,
      po_no: poNo,
      po_details: matches[0]?.po_details || row.po_details,
      item_name: keepDescription,
      reel_details: keepDescription,
      supplier_reel_no: row.supplier_reel_no,
      erp_code: keepErpCode
    };
  });
  const handlePoDetailsSelect = (index, poDetails) => updatePackRowFromSource(index, (row) => {
    const matches = getPoRowsForPo(row.po_no).filter((po) => po.po_details === poDetails);
    const match = matches.find((po) => (!row.item_name || po.reel_details === (row.item_name || row.reel_details)) && (!row.erp_code || po.erp_code === row.erp_code)) || matches[0];
    return fillPackRowFromPoRecord(row, match, { po_details: poDetails, po_no: match?.po_no || row.po_no });
  });
  const handleDescriptionSelect = (index, description) => updatePackRowFromSource(index, (row) => {
    const matches = getPoRowsForPo(row.po_no).filter((po) => po.reel_details === description);
    const match = matches.find((po) => po.erp_code === row.erp_code) || matches[0];
    return fillPackRowFromPoRecord(row, match, { item_name: description, reel_details: description, po_no: match?.po_no || row.po_no });
  });
  const handlePoNoSelectInvoice = (index, poNo) => setInvoice((p) => ({
    ...p,
    goods: p.goods.map((row, idx) => {
      if (idx !== index) return row;
      const matches = getPoRowsForPo(poNo);
      if (!matches.length) return { ...row, po_no: poNo };
      const match = matches[0];
      return {
        ...row,
        po_no: poNo,
        po_details: match.po_details,
        po_date: match.date,
        supplier: match.supplier,
        po_rate: match.rate,
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
      return {
        ...row,
        po_details: poDetails,
        po_date: match.date,
        supplier: match.supplier,
        po_rate: match.rate,
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
      const rows = Array.isArray(payload?.data)
        ? payload.data.map((row) => normalizePoRow(row))
        : sheetValuesToPoRows(payload?.values || []);
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
      const data = await fetchLatestMrrGe(mrrSheet, selectedFirm.spreadsheetId, selectedFirm.scriptUrl);
      const lastMrr = Number(data.mrr) || 0;
      const lastGe = Number(data.ge) || 0;
      
      console.log(`${selectedFirm.name} Latest IDs:`, { mrr: lastMrr, ge: lastGe });
      const baseDate = invoice.date || packing.date || new Date().toLocaleDateString('en-GB');
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

  const handleFirmSelection = (firm, type = 'reel', openPending = false) => {
    setSelectedFirm(firm);
    setMrrType(type);
    setIsFirmSelected(true);
    setTriggerPendingModal(openPending);
    if (firm.header) {
      setInvoice(prev => ({ ...prev, header: firm.header }));
      setPacking(prev => ({ ...prev, header: firm.header }));
    }
  };

  const saveAllData = async () => {
    const mrrNumber = String(invoice.mrr_no || packing.mrr_no || '').trim();
    if (!mrrNumber) {
      const errorMessage = 'MRR No. is required before saving to Google Sheets.';
      setStatus(errorMessage);
      showPopup(errorMessage, 'error');
      return;
    }

    setIsSavingInvoice(true);
    setIsSavingPacking(true);
    const mrrSheet = getSheetName(selectedFirm.mrr, mrrType);
    const helperSheet = getSheetName(selectedFirm.helper, mrrType);
    
    if (mrrType === 'other') {
      setStatus(`Saving data to ${mrrSheet} and ${helperSheet}...`);
      try {
        const result = await savePackingToSheets(invoice, packing, poRows, {
          mrrSheetName: mrrSheet,
          helperSheetName: helperSheet,
          spreadsheetId: selectedFirm.spreadsheetId,
          scriptUrl: selectedFirm.scriptUrl
        });
        const helperDeleted = Number(result?.helperSheet?.deletedRows || 0);
        const helperInserted = Number(result?.helperSheet?.insertedRows || 0);
        const mrrUpdated = Number(result?.mrrForm?.updatedRows || 0);
        const mrrInserted = Number(result?.mrrForm?.insertedRows || 0);
        const successMessage = `Saved both sheets successfully. ${helperSheet} replaced ${helperDeleted} old row(s), inserted ${helperInserted} new row(s). ${mrrSheet} updated ${mrrUpdated} row(s), inserted ${mrrInserted} row(s).`;
        setStatus(successMessage);
        showPopup(successMessage, 'success');
        setTimeout(() => fetchLastIds(), 500);
      } catch (err) {
        setStatus(err?.message || 'Could not save data to Google Sheets.');
        showPopup(err?.message || 'Error saving invoice', 'error');
      } finally {
        setIsSavingInvoice(false);
        setIsSavingPacking(false);
      }
      return;
    }

    setStatus(`Saving data to ${mrrSheet} and ${helperSheet}...`);
    try {
      const result = await savePackingToSheets(invoice, packing, poRows, {
        mrrSheetName: mrrSheet,
        helperSheetName: helperSheet,
        spreadsheetId: selectedFirm.spreadsheetId,
        scriptUrl: selectedFirm.scriptUrl
      });
      const helperDeleted = Number(result?.helperSheet?.deletedRows || 0);
      const helperInserted = Number(result?.helperSheet?.insertedRows || 0);
      const mrrUpdated = Number(result?.mrrForm?.updatedRows || 0);
      const mrrInserted = Number(result?.mrrForm?.insertedRows || 0);
      const successMessage = `Saved both sheets successfully. HELPER SHEET replaced ${helperDeleted} old row(s), inserted ${helperInserted} new row(s). MRR FORM updated ${mrrUpdated} row(s), inserted ${mrrInserted} row(s).`;
      setStatus(successMessage);
      showPopup(successMessage, 'success');
      
      setTimeout(() => fetchLastIds(), 500);
    } catch (err) {
      const errorMessage = err?.message || 'Could not save data to Google Sheets.';
      setStatus(errorMessage);
      showPopup(errorMessage, 'error');
    } finally {
      setIsSavingInvoice(false);
      setIsSavingPacking(false);
    }
  };

  const loadPendingGEs = async () => {
    if (!selectedFirm) return;
    setIsFetchingGEs(true);
    try {
      const data = await fetchPendingGeEntries(getSheetName(selectedFirm.mrr, mrrType), selectedFirm.spreadsheetId, selectedFirm.scriptUrl);
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
    const geNo = ge.ge_entry || ge.ge_no || ge.ge_entry_no || '';
    const supplier = ge.supplier_name || ge.supplier || '';
    const truck = ge.truck_no || '';
    const invNo = ge.invoice_no || '';
    const mrrNo = ge.mrr_number || ge.mrr_no || '';
    const docDate = ge.date || '';
    const receiptDate = ge.dt_of_receipt || ge.dt_of_receipts || ge.receipt_date || '';

    setGeData(ge);
    setInv('ge_no', String(geNo));
    if (docDate) setInv('date', docDate);
    if (mrrNo) setInv('mrr_no', String(mrrNo));
    if (receiptDate) setInv('receipt_date', receiptDate);
    setInv('vehicle_no', truck);
    setInv('invoice_no', invNo);
    setInvNest('bill_to', 'name_address', supplier);

    setPack('ge_no', String(geNo));
    if (docDate) setPack('date', docDate);
    if (mrrNo) setPack('mrr_no', String(mrrNo));
    if (receiptDate) setPack('receipt_date', receiptDate);
    setPack('truck_no', truck);
    setPack('challan_no', invNo);
    setPack('distributor', supplier);
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
      if (!geData) {
        fetchLastIds();
      }
      if (triggerPendingModal) {
        setTriggerPendingModal(false);
        loadPendingGEs();
      }
    }
  }, [isFirmSelected, selectedFirm, mrrType, geData, triggerPendingModal]);

  useEffect(() => () => {
    if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
  }, []);

  const scan = async (kind, file) => {
    if (scanLockRef.current || isScanning) {
      return;
    }
    scanLockRef.current = true;
    setIsScanning(true);
    setStatus(`Reading ${kind} with Gemini...`);
    try {
      const data = await fetchGeminiJson(file, kind);
      if (kind === 'invoice') {
        const normalizedInvoice = normalizeInvoice(data);
        
        // Fix: Preserve the currently selected firm's header
        // and move the scanned supplier info into bill_to (Supplier details)
        const scannedSupplier = normalizedInvoice.header;
        normalizedInvoice.bill_to = {
          ...normalizedInvoice.bill_to,
          name_address: (scannedSupplier.title || '') + (scannedSupplier.works ? '\n' + scannedSupplier.works : ''),
          gstin: scannedSupplier.gstin || '',
          state: scannedSupplier.meta || ''
        };
        normalizedInvoice.header = invoice.header; 

        if (invoice.mrr_no) normalizedInvoice.mrr_no = invoice.mrr_no;
        if (invoice.ge_no) normalizedInvoice.ge_no = invoice.ge_no;
        
        const syncedPacking = enrichPackingWithPoRows(syncPackingFromInvoice(normalizedInvoice, packing));
        setInvoice(normalizedInvoice);
        setPacking(syncedPacking);
        setStatus('Invoice scanned with Gemini. Firm header preserved; supplier details updated.');
      } else {
        let normalizedPacking = enrichPackingWithPoRows(normalizePacking(data));
        if (packing.mrr_no) normalizedPacking.mrr_no = packing.mrr_no;
        if (packing.ge_no) normalizedPacking.ge_no = packing.ge_no;
        
        normalizedPacking = {
          ...normalizedPacking,
          items: mergeInvoiceGoodsIntoPackingItems(normalizedPacking.items, invoice.goods).map(row => ({
            ...row,
            mrr_no: normalizedPacking.mrr_no,
            ge_no: normalizedPacking.ge_no
          }))
        };
        const syncedInvoice = syncInvoiceFromPacking(invoice, normalizedPacking);
        setPacking(normalizedPacking);
        setInvoice(syncedInvoice);
        setStatus('Packing slip scanned with Gemini. Synced MRR/GE numbers preserved.');
      }
    } catch (err) {
      const message = err?.message || 'Gemini scan failed.';
      setStatus(message);
      showPopup(message, 'error');
    } finally {
      setIsScanning(false);
      scanLockRef.current = false;
    }
  };

  if (!isFirmSelected) return (
    <>
      <style>{styles}</style>
      <style>{labelStyles}</style>
      <StartupOverlay firms={FIRMS} onSelect={handleFirmSelection} onGeSubmit={(geNo, data) => { 
        applyPendingItem({ ...data, ge_no: geNo });
      }} />
    </>
  );

  return (
    <div className="app">
      <style>{styles}</style>
      <style>{labelStyles}</style>
      {popupMessage ? <div className={`toast ${popupTone}`}>{popupMessage}</div> : null}

      {(isScanning || isSaving) && (
        <div className="loading-overlay">
          <div className="spinner" />
          <h2>{isScanning ? 'Reading document...' : 'Saving to sheets...'}</h2>
          <p>{statusText}</p>
        </div>
      )}

      <div className="pageHeader no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>MRR Management</h1>
          <div className="toolbar" style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>Firm:</span>
              <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, border: '1px solid #a8a8a8', background: '#f5f5f5', minWidth: '68px', textAlign: 'center' }}>
                {selectedFirm?.name || '-'}
              </div>
            </div>
            <button className={`btn ${activeTab === 'invoice' ? 'main' : ''}`} onClick={() => setActiveTab('invoice')}>Invoice{mrrType !== 'other' ? ' & Packing' : ''}</button>
            <div style={{ marginLeft: '12px', padding: '4px 8px', background: '#eee', borderRadius: '4px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ opacity: 0.6 }}>MODE:</span>
              <select 
                value={mrrType} 
                onChange={(e) => setMrrType(e.target.value)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: 0, 
                  fontWeight: 900, 
                  fontSize: '10px', 
                  textTransform: 'uppercase', 
                  cursor: 'pointer',
                  color: 'var(--ink)'
                }}
              >
                <option value="reel">Reel MRR</option>
                <option value="other">Other MRR</option>
              </select>
            </div>
          </div>
        </div>

      <PendingGeModal 
        isOpen={showGeModal} 
        onClose={() => setShowGeModal(false)} 
        pendingGEs={pendingGEs} 
        onSelect={handleSelectPendingGE} 
      />

        {activeTab === 'invoice' && (
          <div className="help">
            <table className="stats">
              <thead>
                <tr>
                  <th>Invoice Rows</th>
                  <th>Packing Rows</th>
                  <th>Invoice Total</th>
                  <th>Invoice Reels</th>
                  <th>Inv Weight</th>
                  <th>Packing Reels</th>
                  <th>Packing Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{invoiceRowCount}</td>
                  <td>{packingRowCount}</td>
                  <td>Rs. {money(net)}</td>
                  <td>{reels}</td>
                  <td>{money(weight)} KGS</td>
                  <td>{packing.total_reels || packingReels}</td>
                  <td>{money(packing.total_weight || packingWeight)} KGS</td>
                </tr>
              </tbody>
            </table>
            <div style={{ borderTop: '1px dashed #b6ad9e', padding: '8px 10px', fontSize: '11px', fontWeight: 700, background: '#fffdf7' }}>
              GE ENTRY Details:
              {' '}GE No: <span style={{ color: 'var(--primary)' }}>{geData?.ge_no || invoice.ge_no || packing.ge_no || '-'}</span>
              {' '}| MRR No: <span style={{ color: 'var(--primary)' }}>{geData?.mrr_no || geData?.mrr_number || invoice.mrr_no || packing.mrr_no || '-'}</span>
              {' '}| Supplier: <span>{geData?.supplier || invoice.bill_to?.name_address || packing.distributor || '-'}</span>
              {' '}| Invoice: <span>{geData?.invoice_no || invoice.invoice_no || packing.challan_no || '-'}</span>
              {' '}| Truck: <span>{geData?.truck_no || invoice.vehicle_no || packing.truck_no || '-'}</span>
            </div>
          </div>
        )}
      </div>

        {activeTab === 'invoice' && (
          <div className="toolbar" style={{ marginTop: 14 }}>
            {mrrType !== 'other' && (
              <>
                <button className="btn main" disabled={isScanning || isSaving} onClick={() => invoiceRef.current?.click()}>{isScanning ? 'Reading Photo...' : 'Upload Invoice Photo'}</button>
                <input ref={invoiceRef} className="hidden" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) try { await scan('invoice', file); } catch (err) { setStatus(err?.message || 'Could not read invoice photo with Gemini'); } e.target.value = ''; }} />
                <button className="btn" disabled={isScanning || isSaving} onClick={() => packingRef.current?.click()}>Upload Packing Photo</button>
                <input ref={packingRef} className="hidden" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) try { await scan('packing', file); } catch (err) { setStatus(err?.message || 'Could not read packing photo with Gemini'); } e.target.value = ''; }} />
              </>
            )}
            {mrrType === 'other' && <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--warn)', border: '1px solid currentColor', padding: '6px 12px', background: '#fff' }}>MANUAL ENTRY MODE ACTIVE</div>}
            <button className="btn" disabled={isScanning || isSaving} onClick={() => window.print()}>Print All</button>
          </div>
        )}


      {activeTab === 'invoice' && (
        <>
          <section className="doc">
            <div className="sectionHead">
              <div>
                <h2>MRR Entry{mrrType === 'other' ? ' (OTHER MRR)' : ''}</h2>
              </div>
            </div>
            <div className="sheet">
              <Header header={invoice.header} />
              <div className="title">{invoice.doc_title}</div>
              
              <div className="grid2">
                {mrrType === 'other' ? (
                  <MetaTable rows={[
                    ['G. E. No.', invoice.ge_no, (v) => setInv('ge_no', v), 'text', isGateEntryLocked],
                    ['Date', invoice.date, (v) => setInv('date', v), 'date', isGateEntryLocked],
                    ['MRR Number', invoice.mrr_no, (v) => setInv('mrr_no', v)],
                    ['Dt. of Receipt', invoice.receipt_date, (v) => setInv('receipt_date', v), 'date'],
                    ['Sup Doc No.', invoice.invoice_no, (v) => setInv('invoice_no', v), 'text', isGateEntryLocked],
                    ['Truck Number', invoice.vehicle_no, (v) => setInv('vehicle_no', v), 'text', isGateEntryLocked],
                    ['Invoice Ttl Weight (Kgs)', invoice.actual_weight, (v) => setInv('actual_weight', v)],
                    ['Actual MRR Ttl Weight (Kgs)', invoice.actual_mrr_weight, (v) => setInv('actual_mrr_weight', v)],
                    ['SUPPLIER', invoice.bill_to?.name_address, (v) => setInvNest('bill_to', 'name_address', v), 'text', isGateEntryLocked],
                    ['INVOICE BASIC VALUE', invoice.totals.insurance, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, insurance: v } }))],
                    ['MRR BASIC VALUE', invoice.totals.taxable_gst, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, taxable_gst: v } }))]
                  ]} />
                ) : (
                  <>
                    <PartyCard label="MRR Entry Details" data={invoice.bill_to} onText={(v) => setInvNest('bill_to', 'name_address', v)} onField={(f, v) => setInvNest('bill_to', f, v)} contact code hideGstin />
                    <MetaTable rows={[
                      ['Invoice No.', invoice.invoice_no, (v) => setInv('invoice_no', v)], 
                      ['Date', invoice.date, (v) => setInv('date', v), 'date'], 
                      ['E-Way Bill No.', invoice.eway_no, (v) => setInv('eway_no', v)], 
                      ['E-Way Date', invoice.eway_date, (v) => setInv('eway_date', v), 'date'], 
                      ['L.R No.', invoice.lr_no, (v) => setInv('lr_no', v)], 
                      ['Truck No.', invoice.vehicle_no, (v) => setInv('vehicle_no', v)], 
                      ['GE No.', invoice.ge_no, (v) => setInv('ge_no', v)], 
                      ['MRR No.', invoice.mrr_no, (v) => setInv('mrr_no', v)], 
                      ['Dt Of Receipt', invoice.receipt_date, (v) => setInv('receipt_date', v), 'date'], 
                      ['Actual Total', invoice.actual_weight, (v) => setInv('actual_weight', v)], 
                      ['Due Days', invoice.due_days, (v) => setInv('due_days', v), 'number'], 
                      ['Freight Type', invoice.freight_type, (v) => setInv('freight_type', v)]
                    ]} />
                  </>
                )}
              </div>

              {mrrType === 'other' ? (
                <div className="wrap">
                  <table className="table invoiceTable" style={{ minWidth: "1600px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>S NO.</th>
                        <th style={{ width: "100px" }}>MRR Number</th>
                        <th style={{ width: "250px" }}>PO DETAILS</th>
                        <th style={{ width: "120px" }}>PO NO.</th>
                        <th style={{ width: "100px" }}>PO DATE</th>
                        <th style={{ width: "200px" }}>SUPPLIER</th>
                        <th style={{ width: "100px" }}>Weight</th>
                        <th style={{ width: "100px" }}>Rate</th>
                        <th style={{ width: "120px" }}>VALUE</th>
                        <th style={{ width: "100px" }}>PO RATE</th>
                        <th style={{ width: "100px" }}>Date</th>
                        <th style={{ width: "100px" }}>Dt of Receipts</th>
                        <th style={{ width: "120px" }}>Sup Doc No</th>
                        <th style={{ width: "80px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.goods.map((row, i) => (
                        <tr key={i}>
                          <td className="c">{i + 1}</td>
                          <td className="c">{invoice.mrr_no}</td>
                          <td style={{ verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              {manualFields[i]?.po_details ? (
                                <input 
                                  value={row.po_details || ''} 
                                  onChange={(e) => setInvRow(i, 'po_details', e.target.value)} 
                                  placeholder="Manual PO details"
                                />
                              ) : (
                                <select 
                                  style={{ flex: 1 }}
                                  value={getSelectValue(getPoDetailOptions({ po_no: row.po_no, po_details: row.po_details }), row.po_details)} 
                                  onChange={(e) => handlePoDetailsSelectInvoice(i, e.target.value)}
                                >
                                  <option value="">Select PO Details</option>
                                  {getPoDetailOptions({ po_no: row.po_no, po_details: row.po_details }).map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              )}
                              <button className="btn small" onClick={() => toggleManual(i, 'po_details')} title="Toggle Manual Entry" style={{ padding: '2px 4px' }}>{manualFields[i]?.po_details ? '📖' : '✍️'}</button>
                            </div>
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              {manualFields[i]?.po_no ? (
                                <input 
                                  value={row.po_no || ''} 
                                  onChange={(e) => setInvRow(i, 'po_no', e.target.value)} 
                                  placeholder="Manual PO No."
                                />
                              ) : (
                                <select 
                                  style={{ flex: 1 }}
                                  value={getSelectValue(poNoOptions, row.po_no)} 
                                  onChange={(e) => handlePoNoSelectInvoice(i, e.target.value)}
                                >
                                  <option value="">Select PO NO</option>
                                  {poNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              )}
                              <button className="btn small" onClick={() => toggleManual(i, 'po_no')} title="Toggle Manual Entry" style={{ padding: '2px 4px' }}>{manualFields[i]?.po_no ? '📖' : '✍️'}</button>
                            </div>
                          </td>
                          <td><input type="date" value={getSafeInputValue('date', row.po_date)} onChange={(e) => setInvRow(i, 'po_date', e.target.value)} /></td>
                          <td><input value={row.supplier} onChange={(e) => setInvRow(i, 'supplier', e.target.value)} /></td>
                          <td><input value={row.weight} onChange={(e) => setInvRow(i, 'weight', e.target.value)} /></td>
                          <td><input value={row.rate} onChange={(e) => setInvRow(i, 'rate', e.target.value)} /></td>
                          <td className="r" style={{ fontWeight: 700 }}>{money(row.amount)}</td>
                          <td><input value={row.po_rate} onChange={(e) => setInvRow(i, 'po_rate', e.target.value)} /></td>
                          <td className="c">{invoice.date}</td>
                          <td className="c">{invoice.receipt_date}</td>
                          <td className="c">{invoice.invoice_no}</td>
                          <td className="c"><button className="btn small" onClick={() => setInvoice((p) => ({ ...p, goods: p.goods.filter((_, idx) => idx !== i) }))}>Del</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={14} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}>
                          <button 
                            className="btn main" 
                            onClick={() => setInvoice((p) => ({ ...p, goods: [...p.goods, blankInvoiceRow()] }))}
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
                <div className="wrap"><table className="table invoiceTable"><colgroup><col style={{ width: "4.5%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "7.5%" }} /><col style={{ width: "7.5%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "5.5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "4.5%" }} /><col style={{ width: "5.5%" }} /><col style={{ width: "8%" }} /><col style={{ width: "4.5%" }} /><col style={{ width: "7%" }} /><col style={{ width: "8.5%" }} /><col style={{ width: "4%" }} /></colgroup><thead><tr><th>S.No</th><th>Description</th><th>HSN</th><th>Sort</th><th>Party Order</th><th>GSM</th><th>Size</th><th>Unit</th><th>Reels</th><th>Weight</th><th>Unit</th><th>Rate</th><th>Amount</th><th>Action</th></tr></thead><tbody>{invoice.goods.map((row, i) => <tr key={i}><td className="c">{i + 1}</td><td><input value={row.description} onChange={(e) => setInvRow(i, 'description', e.target.value)} /></td><td><input value={row.hsn} onChange={(e) => setInvRow(i, 'hsn', e.target.value)} /></td><td><input value={row.sort_no} onChange={(e) => setInvRow(i, 'sort_no', e.target.value)} /></td><td><input value={row.party_order} onChange={(e) => setInvRow(i, 'party_order', e.target.value)} /></td><td><input value={row.gsm} onChange={(e) => setInvRow(i, 'gsm', e.target.value)} /></td><td><input value={row.size} onChange={(e) => setInvRow(i, 'size', e.target.value)} /></td><td><input value={row.size_unit} onChange={(e) => setInvRow(i, 'size_unit', e.target.value)} /></td><td><input value={row.reels} onChange={(e) => setInvRow(i, 'reels', e.target.value)} /></td><td><input value={row.weight} onChange={(e) => setInvRow(i, 'weight', e.target.value)} /></td><td><input value={row.weight_unit} onChange={(e) => setInvRow(i, 'weight_unit', e.target.value)} /></td><td><input value={row.rate} onChange={(e) => setInvRow(i, 'rate', e.target.value)} /></td><td><input value={row.amount} onChange={(e) => setInvRow(i, 'amount', e.target.value)} /></td><td className="c"><button className="btn small" onClick={() => setInvoice((p) => ({ ...p, goods: p.goods.filter((_, idx) => idx !== i) }))}>Del</button></td></tr>)}</tbody><tfoot><tr><td colSpan={14} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}><button className="btn main" onClick={() => setInvoice((p) => ({ ...p, goods: [...p.goods, blankInvoiceRow()] }))} style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0, fontSize: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #111', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="Add New Row">+</button></td></tr></tfoot></table></div>
              )}

              <div className="summary">
                <div className="panel" style={{ borderRight: 0, gridColumn: '1 / -1' }}>
                  <MetaTable rows={[
                    ['Gross Amount', money(invoice.totals.gross_amount || gross), () => { }],
                    ['INVOICE BASIC VALUE', invoice.totals.insurance, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, insurance: v } }))],
                    ['MRR BASIC VALUE', money(invoice.totals.taxable_gst || taxable), () => { }],
                    ['Round Off', invoice.totals.round_off, (v) => setInvoice((p) => ({ ...p, totals: { ...p.totals, round_off: v } }))],
                    ['Net Amount', money(invoice.totals.net_amount || net), () => { }]
                  ]} />
                </div>
              </div>
              
              <div className="valueLine"><span>{invoice.total_label}:</span> <input value={invoice.total_words || words(invoice.totals.net_amount || net)} onChange={(e) => setInv('total_words', e.target.value)} /></div>
              
              <div className="foot">
                <div>
                  <div className="cardTitle">Terms & Condition</div>
                  <textarea value={invoice.terms} onChange={(e) => setInv('terms', e.target.value)} />
                </div>
                <div className="sign">
                  <textarea value={invoice.certification} onChange={(e) => setInv('certification', e.target.value)} />
                  <div><input value={invoice.signer_name} onChange={(e) => setInv('signer_name', e.target.value)} /></div>
                  <div className="sigLine"><input value={invoice.signatory_label} onChange={(e) => setInv('signatory_label', e.target.value)} /></div>
                </div>
              </div>
            </div>

            <div className="actions">
              <button className="btn" disabled={isSavingInvoice || isSavingPacking} onClick={() => setInvoice((p) => ({ ...p, goods: [...p.goods, blankInvoiceRow()] }))}>Add Goods Row</button>
              {mrrType === 'other' && <button className="btn main" disabled={isSaving} onClick={saveAllData}>{isSavingInvoice ? 'Saving...' : 'Save OTHER MRR'}</button>}
            </div>
          </section>

          {mrrType !== 'other' && (
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
                  <div className="card"><SimplePartyCard label="Name & Address of Buyer" data={packing.buyer} onText={(v) => setPackNest('buyer', 'name_address', v)} onField={(f, v) => setPackNest('buyer', f, v)} /></div>
                  <MetaTable rows={[['Challan No.', packing.challan_no, (v) => setPack('challan_no', v)], ['Date', packing.date, (v) => setPack('date', v), 'date'], ['Order Date', packing.order_date, (v) => setPack('order_date', v), 'date'], ['L.R. No.', packing.lr_no, (v) => setPack('lr_no', v)], ['L.R. Dt', packing.lr_date, (v) => setPack('lr_date', v), 'date'], ['GE No.', packing.ge_no, (v) => setPack('ge_no', v)], ['MRR No.', packing.mrr_no, (v) => setPack('mrr_no', v)], ['Dt of Receipt', packing.receipt_date, (v) => setPack('receipt_date', v), 'date'], ['Truck No.', packing.truck_no, (v) => setPack('truck_no', v)], ['Actual Total', packing.actual_total, (v) => setPack('actual_total', v)], ['Carrier', packing.carrier, (v) => setPack('carrier', v)], ['Distributor', packing.distributor, (v) => setPack('distributor', v)], ['Total Reel', packing.total_reels || packingReels, (v) => setPack('total_reels', v)], ['Total Weight', packing.total_weight || packingWeight, (v) => setPack('total_weight', v)]]} />
                </div>
                <div className="line"><input value={packing.intro_line} onChange={(e) => setPack('intro_line', e.target.value)} /></div>
                <div className="wrap">
                  <table className="table packingTable">
                    <colgroup>
                      <col style={{ width: "4%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "16%" }} />
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
                        <th>MRR No.</th>
                        <th>GE No.</th>
                        <th>Party Order No.</th>
                        <th>PO No.</th>
                        <th>PO Details</th>
                        <th>Description</th>
                        <th>Supplier Reel No.</th>
                        <th>ERP Code</th>
                        <th>Reel No.</th>
                        <th>Sort No.</th>
                        <th>BF</th>
                        <th>GSM</th>
                        <th>Size</th>
                        <th>Unit</th>
                        <th>Rate</th>
                        <th>PO Rate</th>
                        <th>Net Wt(Kgs.)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packing.items.map((row, i) => (
                        <tr key={i}>
                          <td className="c">{i + 1}</td>
                          <td><input value={row.mrr_no} onChange={(e) => setPackRow(i, 'mrr_no', e.target.value)} /></td>
                          <td><input value={row.ge_no} onChange={(e) => setPackRow(i, 'ge_no', e.target.value)} /></td>
                          <td><input value={row.party_order} onChange={(e) => setPackRow(i, 'party_order', e.target.value)} /></td>
                          <td><select value={getSelectValue(poNoOptions, row.po_no)} onChange={(e) => handlePoNoSelect(i, e.target.value)}><option value="">Select PO</option>{poNoOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td><select value={getSelectValue(getPoDetailOptions(row), row.po_details)} onChange={(e) => handlePoDetailsSelect(i, e.target.value)}><option value="">Select PO Details</option>{getPoDetailOptions(row).map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td><select value={getSelectValue(getDescriptionOptions(row), row.item_name || row.reel_details)} onChange={(e) => handleDescriptionSelect(i, e.target.value)}><option value="">Select Description</option>{getDescriptionOptions(row).map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td><input value={row.supplier_reel_no} onChange={(e) => setPackRow(i, 'supplier_reel_no', e.target.value)} /></td>
                          <td><select value={getSelectValue(getErpCodeOptions(row), row.erp_code)} onChange={(e) => handleErpCodeSelect(i, e.target.value)}><option value="">Select ERP Code</option>{getErpCodeOptions(row).map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                          <td><input value={row.reel_no} onChange={(e) => setPackRow(i, 'reel_no', e.target.value)} /></td>
                          <td><input value={row.sort_no} onChange={(e) => setPackRow(i, 'sort_no', e.target.value)} /></td>
                          <td><input value={row.bf} onChange={(e) => setPackRow(i, 'bf', e.target.value)} /></td>
                          <td><input value={row.gsm} onChange={(e) => setPackRow(i, 'gsm', e.target.value)} /></td>
                          <td><input value={row.size} onChange={(e) => setPackRow(i, 'size', e.target.value)} /></td>
                          <td><input value={row.unit} onChange={(e) => setPackRow(i, 'unit', e.target.value)} /></td>
                          <td><input value={row.rate} onChange={(e) => setPackRow(i, 'rate', e.target.value)} /></td>
                          <td><input value={row.po_rate} onChange={(e) => setPackRow(i, 'po_rate', e.target.value)} /></td>
                          <td><input value={row.net_wt} onChange={(e) => setPackRow(i, 'net_wt', e.target.value)} /></td>
                          <td className="c"><button className="btn small" onClick={() => setPacking((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}>Del</button></td>
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
                      <tr>
                        <td colSpan={19} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}>
                          <button className="btn main" onClick={() => setPacking((p) => ({ ...p, items: [...p.items, blankPackingRow()] }))} style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0, fontSize: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #111', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="Add New Row">+</button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="foot"><div><div className="cardTitle">Received By</div><input value={packing.receiver_label} onChange={(e) => setPack('receiver_label', e.target.value)} /></div><div className="sign"><div><input value={packing.signer_name} onChange={(e) => setPack('signer_name', e.target.value)} /></div><textarea value={packing.approval_text} onChange={(e) => setPack('approval_text', e.target.value)} /><div className="sigLine"><input value={packing.signatory_label} onChange={(e) => setPack('signatory_label', e.target.value)} /></div></div></div>
              </div>
              <div className="actions"><button className="btn" disabled={isSavingInvoice || isSavingPacking} onClick={() => setPacking((p) => ({ ...p, items: [...p.items, blankPackingRow()] }))}>Add Packing Row</button><button className="btn main" disabled={isSavingInvoice || isSavingPacking} onClick={saveAllData}>{isSaving ? 'Saving...' : 'Save All Data'}</button></div>
            </section>
          )}
        </>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);






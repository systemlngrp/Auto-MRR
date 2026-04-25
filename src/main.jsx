import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { savePackingToSheets, saveInvoiceToSheets, saveGeEntryToSheets, fetchSheetRangeWithParams, fetchLatestMrrGe, fetchSheetRange, fetchPendingGeEntries, fetchUniqueSuppliers, authenticateUser, approvePendingStage, HELPER_SHEET_NAME, SCRIPT_URL, PO_SHEET_NAME } from './sheetSync';
import QRCodePackage from 'react-qr-code';
const QRCode = typeof QRCodePackage === 'function' ? QRCodePackage : (QRCodePackage.default || QRCodePackage.QRCode || QRCodePackage);

function getLabelValue(row, key) {
  return row?.[key] || row?.[String(key).toLowerCase()] || row?.[String(key).replace(/ /g, '_').toLowerCase()] || '';
}

function ReelLabelPrintArea({ reels, selectedFirm, printMode = 'label' }) {
  return (
    <div className={`print-area labels-grid mode-${printMode}`}>
      {reels.map((reel, idx) => {
        const reelNo = getLabelValue(reel, 'Our_Reel_Number') || getLabelValue(reel, 'Our Reel Number') || getLabelValue(reel, 'our_reel_number') || getLabelValue(reel, 'reel_number') || reel?.our_reel_no || '';
        return (
          <div key={idx} className="print-label">
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" className="brand-logo" alt="Laxmi Narayan Group" />
            <h2 style={{ margin: '4px 0 8px', fontSize: '14px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{selectedFirm?.name}</h2>
            <div className="sub-info">
              <span>Doc: <b>{getLabelValue(reel, 'Sup Doc No.') || getLabelValue(reel, 'sup_doc_no')}</b></span>
              <span>Date: <b>{getLabelValue(reel, 'Date') || getLabelValue(reel, 'date')}</b></span>
              <span>Code: <b>{getLabelValue(reel, 'ERP Code') || getLabelValue(reel, 'erp_code')}</b></span>
            </div>
            <h3 style={{ fontSize: '11px' }}>{selectedFirm?.name}</h3>
            <div className="specs">
              Size: {getLabelValue(reel, 'Size')} CM X GSM: {getLabelValue(reel, 'GSM')} X BF: {getLabelValue(reel, 'BF')}
            </div>
            <div className="grid-2">
              <div><span>MRR:</span> {getLabelValue(reel, 'MRR No') || getLabelValue(reel, 'mrr_number') || getLabelValue(reel, 'mrr_no')}</div>
              <div><span>GE:</span> {getLabelValue(reel, 'GE Entry') || getLabelValue(reel, 'ge_no') || getLabelValue(reel, 'ge_entry')}</div>
              <div><span>Reel:</span> {reelNo}</div>
              <div><span>Weight:</span> {getLabelValue(reel, 'Weight') || getLabelValue(reel, 'net_wt')}</div>
            </div>
            <div className="qr-container">
              <QRCode value={String(reelNo || getLabelValue(reel, 'ERP Code') || getLabelValue(reel, 'erp_code') || idx + 1)} size={printMode === 'a4' ? 220 : 110} />
              <div className="qr-hint">{reelNo}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  @page { margin: 10px; size: A4 landscape; }
}
`;

const styles = `
:root{--ink:#111;--paper:#fff;--bg:#d8d1c4;--line:#1e1e1e;--line-soft:#b9b9b9;--primary:#0f4f93;--ok:#166534;--warn:#8a5a10;--bad:#9b1c1c;--muted:#595959;--sheet-width:1140px}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif}.app{max-width:1180px;margin:0 auto;padding:16px 12px 28px}.pageHeader{max-width:var(--sheet-width);margin:0 auto 14px;background:#f8f5ee;border:1px solid #a79f92;padding:12px 14px}.pageHeader h1{margin:0 0 4px;font-size:20px;font-weight:700}.pageHeader p{margin:0;color:#444;font-size:12px;line-height:1.45}.toolbar,.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar{margin-top:10px}.status{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 12px;border:1px solid #bfb7aa;background:#fff;font-size:11px;font-weight:700;color:var(--muted)}.status.success{color:var(--ok)}.status.error{color:var(--bad)}.status.working{color:var(--warn)}.spinner{width:14px;height:14px;border:2px solid #cfc5b7;border-top-color:currentColor;border-radius:50%;animation:spin .8s linear infinite;flex:0 0 auto}@keyframes spin{to{transform:rotate(360deg)}}.loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(216,209,196,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:var(--primary);text-align:center;width:100%;height:100%}.loading-overlay .spinner{width:64px;height:64px;border-width:6px;margin-bottom:20px;border-top-color:var(--primary)}.loading-overlay h2{margin:0 0 8px;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em}.loading-overlay p{margin:0;font-size:14px;font-weight:700;color:var(--ink)} .toast{position:fixed;top:16px;right:16px;z-index:1000;max-width:430px;padding:12px 14px;border:1px solid #bfb7aa;background:#fff;box-shadow:0 10px 24px rgba(0,0,0,.12);font-size:12px;font-weight:700;line-height:1.45}.toast.success{border-color:#9cc7a6;color:var(--ok)}.toast.error{border-color:#d9a2a2;color:var(--bad)}.help{margin-top:8px;border:1px dashed #938a7a;background:#fffdf7}.stats{width:100%;border-collapse:collapse;table-layout:fixed}.stats th,.stats td{border-right:1px dashed #b6ad9e;padding:8px 10px;font-size:11px}.stats th:last-child,.stats td:last-child{border-right:0}.stats th{background:#f7f1e5;text-align:left;font-weight:700;color:#4a4438}.stats td{background:#fffdf7;font-weight:700}.btn{border:1px solid #4a4a4a;background:#fff;color:#111;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer}.btn:hover{background:#f1f1f1}.btn:disabled{opacity:.65;cursor:wait;background:#f5f5f5}.btn.main{background:#111;color:#fff;border-color:#111}.btn.main:hover{background:#222}.btn.main:disabled{background:#111}.btn.small{padding:2px 5px;font-size:9px}.hidden{display:none}.sectionHead{max-width:var(--sheet-width);margin:16px auto 6px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.sectionHead h2{margin:0;font-size:15px;font-weight:700}.sectionHead p{margin:2px 0 0;color:var(--muted);font-size:11px}.doc{margin-bottom:18px}.sheet{max-width:var(--sheet-width);margin:0 auto;background:var(--paper);border:1px solid var(--line);overflow:hidden;box-shadow:none}.hdr{display:grid;grid-template-columns:128px 1fr 92px;border-bottom:1px solid var(--line)}.logo{background:#585858;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;font-weight:700;padding:6px;line-height:1.35;border-right:1px solid var(--line);white-space:pre-line}.co{text-align:center;padding:6px 8px}.co h1{margin:0 0 3px;font-size:13px;letter-spacing:.02em}.co p{margin:1px 0;font-size:9px;line-height:1.2}.note{padding:6px 4px;border-left:1px solid var(--line);font-size:8px;text-align:center;white-space:pre-line;background:#585858;color:#fff}.title{text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid var(--line);padding:6px 8px}.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-bottom:1px solid var(--line)}.card{min-width:0;border-right:1px solid var(--line)}.grid2>.card:last-child,.grid2>.meta:last-child{border-right:0}.cardTitle{font-size:10px;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--line);background:#f5f5f5}.card textarea,.foot textarea{width:100%;min-height:68px;border:0;border-bottom:1px solid var(--line);padding:5px 6px;font:inherit;font-size:10px;line-height:1.35;resize:vertical}.pairs{display:grid;grid-template-columns:1fr 1fr}.row{display:flex;align-items:center;gap:4px;padding:3px 5px;border-top:1px solid var(--line-soft);font-size:9px}.row span{white-space:nowrap;font-weight:700}.row.full{grid-column:1/-1}.row input,.row select,.meta input,.meta select,.line input,.line select,.table input,.table select{width:100%;border:1px solid #a8a8a8;padding:3px 4px;font:inherit;font-size:10px;background:#fff;min-width:0}.supplier-search-wrap{position:relative;width:100%}.supplier-search{padding-right:28px !important}.supplier-search::-webkit-calendar-picker-indicator{opacity:0;position:absolute;right:0}.supplier-search-wrap::after{content:"▼";position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#444;font-size:12px;line-height:1}.table input,.table select{padding:2px 3px;font-size:8px}.row input:focus,.row select:focus,.meta input:focus,.meta select:focus,.line input:focus,.line select:focus,.table input:focus,.table select:focus,.card textarea:focus,.foot textarea:focus{outline:none;border-color:#2d6fb3;box-shadow:none}.meta{width:100%;border-collapse:collapse;table-layout:fixed}.meta td{border:1px solid var(--line);padding:4px 5px;font-size:9px}.meta td:first-child{width:43%;font-weight:700;background:#f8f8f8}.line{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 6px;border-bottom:1px solid var(--line);font-size:9px}.wrap{overflow-x:auto;border-bottom:1px solid var(--line);background:#fff}.table{width:100%;border-collapse:collapse;table-layout:fixed}.invoiceTable{min-width:1140px}.packingTable{min-width:1800px}.poTable{min-width:2200px}.toolbar input,.actions input{border:1px solid #a8a8a8;padding:7px 10px;font:inherit;font-size:12px;background:#fff;min-width:180px}.table th,.table td{border:1px solid var(--line);padding:2px 3px;font-size:8px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}.table th{background:#f5f5f5;text-align:center;font-weight:700}.c{text-align:center}.r{text-align:right}.summary{display:grid;grid-template-columns:minmax(0,1fr) 250px;border-bottom:1px solid var(--line)}.panel{border-right:1px solid var(--line)}.summary>.panel:last-child{border-right:0}.panelBody{padding:6px;font-size:10px;line-height:1.35}.valueLine{padding:7px 8px;border-bottom:1px solid var(--line);font-size:12px;font-weight:700}.foot{display:grid;grid-template-columns:minmax(0,1fr) 220px;border-bottom:1px solid var(--line)}.sign{min-height:84px;padding:8px;border-right:1px solid var(--line);position:relative;text-align:center;font-size:10px}.sign:last-child{border-right:0}.sign.left{text-align:left}.sigLine{position:absolute;left:8px;right:8px;bottom:8px;border-top:1px solid var(--line);padding-top:3px;font-size:9px;font-weight:700}.actions{max-width:var(--sheet-width);margin:8px auto 0;justify-content:flex-end;padding-top:0}.muted{font-size:11px;color:var(--muted)}@media(max-width:900px){.app{padding:10px}.pageHeader,.sectionHead,.sheet,.actions{max-width:none}.hdr,.grid2,.summary,.foot{grid-template-columns:1fr}.logo,.note,.card,.panel,.sign{border-right:0;border-bottom:1px solid var(--line)}.pairs{grid-template-columns:1fr}.toolbar,.actions{align-items:stretch}.toolbar .btn,.actions .btn{flex:1 1 180px}.sectionHead{align-items:flex-start;flex-direction:column}.wrap{overflow-x:auto}.invoiceTable,.packingTable{min-width:980px}.toast{left:12px;right:12px;max-width:none}}@media print{body{background:#fff}.app{max-width:100%;padding:0}.pageHeader,.actions,.muted,.toast,.toolbar,.no-print{display:none!important}.sheet{box-shadow:none;border:1px solid #111}.doc{margin-bottom:8px;break-inside:avoid;page-break-inside:avoid}.wrap{overflow:visible}.invoiceTable,.packingTable{min-width:0}.table th:last-child,.table td:last-child{display:none!important}input,select,textarea{border:0!important;background:transparent!important;padding:0!important;outline:0!important;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important}.btn,button{display:none!important}@page{size:A4 landscape;margin:10px}}

`;

const directLabelPrintStyles = `
.direct-label-print-sheet { display: none; }
@media print {
  body.print-labels-only .app > * { display: none !important; }
  body.print-labels-only .direct-label-print-sheet { display: block !important; }
}
`;

const printGridStyles = `
@media print {
  .sheet .grid2 {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
    border-bottom: 1px solid #111 !important;
  }

  .sheet .grid2 > .meta,
  .sheet .grid2 > .card {
    border-right: 1px solid #111 !important;
    border-bottom: 0 !important;
  }

  .sheet .grid2 > .meta:last-child,
  .sheet .grid2 > .card:last-child {
    border-right: 0 !important;
  }

  .sheet .meta td,
  .sheet .table th,
  .sheet .table td {
    border: 1px solid #111 !important;
  }

  .sheet .meta input,
  .sheet .meta select,
  .sheet .table input,
  .sheet .table select,
  .sheet textarea {
    border: 1px solid #111 !important;
    background: #fff !important;
    color: #111 !important;
    opacity: 1 !important;
    padding: 2px 3px !important;
    -webkit-appearance: none !important;
    appearance: none !important;
  }

  .sheet .meta td:first-child,
  .sheet .table th {
    background: #f5f5f5 !important;
    font-weight: 700 !important;
  }
}
`;


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
const GEMINI_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_GEMINI_TIMEOUT_MS || 45000);
let GEMINI_COOLDOWN_UNTIL = 0;

const APPS_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbysFVxjcEORHOSsVV54GBaCny1dIqgiUcPGI4tIlTVJHp-PujausTXXTWRt9AUDToladA/exec';

const FIRMS = [
  { 
    id: 'lnki', 
    name: 'LNKI', 
    scriptUrl: APPS_SCRIPT_WEBAPP_URL, 
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
    scriptUrl: import.meta.env.VITE_UNIT_1_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzVrmOY-Av3ipONSmLwhyHbJkPeSAYj8uC6emIVKQ1IMOY2OALhcrE2r_g8OYFaqcxoTA/exec',
    spreadsheetId: import.meta.env.VITE_UNIT_1_SPREADSHEET_ID || '1kQ8DI2Y_aPHkoCdQMcsDOJYsgXshOIVr2D4K0145VkE',
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
    scriptUrl: APPS_SCRIPT_WEBAPP_URL, 
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
const AUTH_STORAGE_KEY = 'mrr_auth_user';

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
  amount: '',
  quantity: '',
  po_quantity: ''
});
const blankPackingRow = () => ({ mrr_no: '', ge_no: '', po_no: '', po_details: '', supplier_reel_no: '', erp_code: '', reel_details: '', item_name: '', reel_no: '', sort_no: '', party_order: '', bf: '', gsm: '', size: '', unit: 'CM', rate: '', po_rate: '', net_wt: '' });
const blankPoRow = () => ({ sno: '', po_no: '', date: '', supplier: '', po_details: '', erp_code: '', size: '', gsm: '', bf: '', reel_details: '', unit: '', rate: '', quantity: '', status: '', quantity_received: '', pending: '', closed: '', rapc: '' });

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
    po_no: String(pickPoValue(data, 'po_no', 'poNo', 'PO NO.', 'PO NO')).trim(),
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
    po_no: findIdx(['PO No.', 'PO No', 'po_no', 'party_order_no', 'party_order']),
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
      responseSchema: schema,
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
            responseSchema: schema,
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
  if (!isLikelyGeminiApiKey(API_KEY)) {
    throw new Error('Gemini API key looks too short. Please check your .env key value.');
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

  if (kind === 'invoice') {
    try {
      const focused = await fetchGeminiStructured(
        base64,
        mimeType,
        'Extract MRR entry metadata and goods table: GE No, Date, MRR No, Dt. of Receipt, Sup Doc No, Truck Number, Invoice Total Weight (Kgs), Actual MRR Total Weight (Kgs), E-Way Bill No, E-Way Date, L.R No, Supplier/Bill To name and state, Gross Amount, Invoice Basic Value, MRR Basic Value, Insurance, Taxable GST, CGST %, SGST %, Round Off. Also extract the goods table: Description, HSN, Sort, Party Order, GSM, Size, Unit, Reels, Weight, Unit, Rate, Amount. Read row-by-row in order. Return only rows that contain at least one real item value (for example description, party order, gsm, size, reels, weight, rate, amount). Skip blank separator/total/empty lines. Do not invent values; leave unreadable cells empty.',
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
        base64,
        mimeType,
        'Extract only seller/supplier party details from this invoice. Supplier means the company issuing the invoice (usually top header company name), not buyer/consignee/delivery party. Return supplier_name, supplier_state, supplier_state_code, supplier_gstin. If unsure, leave empty.',
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

  if (kind === 'packing' && needsPackingRowRetry(data.items)) {
    try {
      const focused = await fetchGeminiStructured(
        base64,
        mimeType,
        'Focus on the packing slip item table and the nearby intro line, GE No, MRR No, date of receipt, truck number, actual total, totals, received by, approval text, and signatory sections. Read each visible row cell by cell in order. Extract item_name, supplier_reel_no, reel_no, sort_no, party_order, bf, gsm, size, unit, net_wt, mrr_no, ge_no, po_no, po_details, and rate for every row. Supplier reel number should come from the photo. Leave erp_code empty unless clearly visible. Return only real item rows; skip blank lines, total/subtotal rows, signature/footer lines, and rows with only MRR/GE values but no item data. Do not invent values. Leave unreadable cells empty.',
        { intro_line: '', ge_no: '', mrr_no: '', receipt_date: '', truck_no: '', actual_total: '', total_reels: '', total_weight: '', receiver_label: '', signer_name: '', approval_text: '', signatory_label: '', items: [blankPackingRow()] }
      );
      data = mergeFocusedPackingData(data, focused);
    } catch {
    }
  }

  if (kind === 'packing') {
    try {
      const focusedInvoiceData = await fetchGeminiStructured(
        base64,
        mimeType,
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

function Header({ header }) {
  return (
    <div className="hdr">
      <div className="logo">{header.brand_box}</div>
      <div className="co">
        <h1>{header.title}</h1>
        <p>{header.works}</p>
        <p>{header.meta}</p>
        <p>{header.contact}</p>
      </div>
      <div className="note">{header.note}</div>
    </div>
  );
}

function normalizeInputDateValue(value) {
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
    if (first > 12 && second <= 12) return toIso(year, second, first); // dd/mm/yyyy
    if (second > 12 && first <= 12) return toIso(year, first, second); // mm/dd/yyyy
    return toIso(year, first, second);
  }

  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dash) {
    const year = dash[3].length === 2 ? `20${dash[3]}` : dash[3];
    const first = Number(dash[1]);
    const second = Number(dash[2]);
    if (first > 12 && second <= 12) return toIso(year, second, first); // dd-mm-yyyy
    if (second > 12 && first <= 12) return toIso(year, first, second); // mm-dd-yyyy
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
  return <table className="meta"><tbody>{rows.map(([label, value, onChange, type, readOnly, options], idx) => {
    const isLocked = !!readOnly || !onChange;
    const rowKey = typeof label === 'string' ? `${label}-${idx}` : `meta-row-${idx}`;
    if (type === 'supplier_datalist') {
      const listId = `meta-supplier-list-${idx}`;
      return (
        <tr key={rowKey}>
          <td>{label}</td>
          <td>
            <input
              list={listId}
              value={getSafeInputValue('text', value)}
              onChange={(e) => onChange && onChange(e.target.value)}
              readOnly={!!readOnly}
              disabled={!onChange}
              style={isLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
            />
            <datalist id={listId}>
              {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </datalist>
          </td>
        </tr>
      );
    }
    return <tr key={rowKey}><td>{label}</td><td><input type={type || 'text'} value={getSafeInputValue(type, value)} onChange={(e) => onChange && onChange(e.target.value)} readOnly={!!readOnly} disabled={!onChange} style={isLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined} /></td></tr>;
  })}</tbody></table>;
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
function ReelLabelsTab({ initialMrr, helperSheetName, selectedFirm, onBack }) {
  const [searchMrr, setSearchMrr] = useState(initialMrr || '');
  const [status, setStatus] = useState('');
  const [reels, setReels] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mrrOptions, setMrrOptions] = useState([]);
  const [isLoadingMrrOptions, setIsLoadingMrrOptions] = useState(false);
  const [printMode, setPrintMode] = useState('a4');

  useEffect(() => {
    if (initialMrr && !searchMrr) {
      setSearchMrr(initialMrr);
    }
  }, [initialMrr]);

  useEffect(() => {
    const loadAllUniqueMrr = async () => {
      if (!selectedFirm) return;
      setIsLoadingMrrOptions(true);
      try {
        const payload = await fetchSheetRange(
          helperSheetName || HELPER_SHEET_NAME,
          selectedFirm.spreadsheetId,
          selectedFirm.scriptUrl
        );
        const rows = Array.isArray(payload?.values) ? payload.values : [];
        const unique = new Set();
        const headerRow = Array.isArray(rows[0]) ? rows[0].map((h) => String(h || '').trim().toLowerCase()) : [];
        const mrrIndex = headerRow.findIndex((h) => ['mrr no', 'mrr number', 'mrr_no', 'mrr_number'].includes(h));

        if (mrrIndex >= 0) {
          rows.slice(1).forEach((row) => {
            const value = String(Array.isArray(row) ? (row[mrrIndex] || '') : '').trim();
            if (value) unique.add(value);
          });
        } else {
          rows.forEach((row) => {
            const value = String(
              row?.mrr_number || row?.mrr_no || row?.['MRR No'] || row?.['MRR Number'] || ''
            ).trim();
            if (value) unique.add(value);
          });
        }
        const sorted = [...unique].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        setMrrOptions(sorted);
        if (!searchMrr && sorted.length) setSearchMrr(sorted[0]);
      } catch {
        setMrrOptions([]);
      } finally {
        setIsLoadingMrrOptions(false);
      }
    };
    loadAllUniqueMrr();
  }, [selectedFirm, helperSheetName]);

  const handleSearch = async () => {
    if (!searchMrr.trim()) return;
    if (!selectedFirm) {
      setStatus('Select a firm first.');
      return;
    }
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

  return (
    <div className="sheet" style={{ padding: 20, position: 'relative' }}>
      {isSearching && (
        <div className="loading-overlay" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(216, 209, 196, 0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div className="spinner" />
          <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>Searching MRR data...</p>
        </div>
      )}
      <div className="sectionHead no-print" style={{ marginTop: 0 }}>
        <h2>Print Reel Labels</h2>
        <p>Scan MRR to Generate QR code labels</p>
      </div>
      <div className="toolbar no-print" style={{ marginBottom: 16 }}>
        {onBack ? <button className="btn" onClick={onBack}>Back</button> : null}
        <select
          value={searchMrr}
          onChange={(e) => setSearchMrr(e.target.value)}
          disabled={isLoadingMrrOptions}
          style={{ width: '250px' }}
        >
          <option value="">{isLoadingMrrOptions ? 'Loading MRR...' : 'Select MRR Number...'}</option>
          {mrrOptions.map((mrr) => <option key={mrr} value={mrr}>{mrr}</option>)}
        </select>
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

      {reels.length > 0 && <ReelLabelPrintArea reels={reels} selectedFirm={selectedFirm} printMode={printMode} />}
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
    po_no: source.po_no || source.poNo || source.po_number || '',
    invoice_no: source.invoice_no || '',
    total_value: source.total_value || source.total_invocie_value || '',
    truck_no: source.truck_no || source.vehicle_no || '',
    ge_no: getGateEntryNo(source) || geNo || '',
    mrr_no: getMrrNo(source) || '',
    date: source.date || defaultDate
  };
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

function GateEntrySavedModal({ isOpen, firm, entry, previewPics, onClose }) {
  if (!isOpen || !entry) return null;

  const previewPhotos = previewPics.filter(Boolean);

  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 10001 }}>
      <div style={{ background: '#fff', width: '95%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '2px solid #111', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Gate Entry</h2>
          </div>
        </div>
        
        <div style={{ border: '2px solid #111', padding: '32px', background: '#fff', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid #ddd', paddingBottom: '20px' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '60px' }} alt="Logo" />
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#444', marginTop: '8px', textTransform: 'uppercase' }}>{firm?.name || ''}</div>
            <h3 style={{ margin: '12px 0 0', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '3px', fontSize: '12px' }}>Gate Entry</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px 40px', fontSize: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>GE Entry No</span>
              <span style={{ fontWeight: 900, fontSize: '12px', color: 'var(--primary)' }}>{entry.ge_no || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>MRR No</span>
              <span style={{ fontWeight: 700 }}>{entry.mrr_no || entry.mrr_number || ''}</span>
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
              <span style={{ fontWeight: 700 }}>{formatDecimal2(entry.total_value || '')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Truck</span>
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
  const [otherPoRows, setOtherPoRows] = useState([]);
  const [isLoadingOtherPo, setIsLoadingOtherPo] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 760 : false));
  const normalizePoNoKey = (value) => String(value ?? '').trim().replace(/\s+/g, '').replace(/\.0+$/g, '');
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
        if (pic) newPics[i - 1] = pic;
      }
      setPics(newPics);
    }
  }, [initialData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      date: prev.date || defaultDate,
      ge_no: prev.ge_no || geNo || getGateEntryNo(initialData) || '',
      mrr_no: (prev.ge_no || geNo || getGateEntryNo(initialData) || '')
    }));
  }, [defaultDate, geNo, initialData]);

  useEffect(() => {
    setData((prev) => {
      const resolvedGeNo = prev.ge_no || geNo || getGateEntryNo(initialData) || '';
      if ((prev.mrr_no || '') === resolvedGeNo) return prev;
      return {
        ...prev,
        mrr_no: resolvedGeNo
      };
    });
  }, [data.ge_no, geNo, initialData]);

  useEffect(() => {
    async function loadSuppliers() {
      setIsLoadingSuppliers(true);
      try {
        // In Gate Entry, always offer suppliers from BOTH PO sheets (PO DETAILS + OTHER PO),
        // regardless of selected mode or whether a PO number is selected.
        const baseListPromise = fetchUniqueSuppliers(firm, getSheetName(firm?.po, 'reel') || 'PO DETAILS').catch(() => []);
        const otherListPromise = fetchUniqueSuppliers(firm, getSheetName(firm?.po, 'other') || 'OTHER PO').catch(() => []);
        const [baseList, otherList] = await Promise.all([baseListPromise, otherListPromise]);
        const merged = [...new Set([...(baseList || []), ...(otherList || [])].map((v) => String(v || '').trim()).filter(Boolean))];
        setSuppliers(merged);
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      } finally {
        setIsLoadingSuppliers(false);
      }
    }
    loadSuppliers();
  }, [firm]);

  useEffect(() => {
    async function loadOtherPoRows() {
      const isOther = String(mrrType || '').trim().toLowerCase() === 'other';
      if (!firm || !isOther) {
        setOtherPoRows([]);
        return;
      }
      setIsLoadingOtherPo(true);
      try {
        const poSheet = getSheetName(firm?.po, 'other') || 'OTHER PO';
        const payload = await fetchSheetRange(poSheet, firm.spreadsheetId, firm.scriptUrl);
        const allRows = Array.isArray(payload?.data)
          ? payload.data.map((row) => normalizePoRow(row))
          : sheetValuesToPoRows(payload?.values || []);
        // Keep all PO rows here so supplier lookup works even if status/closed flags vary by firm sheet.
        setOtherPoRows(allRows || []);
      } catch (err) {
        console.warn('Failed to load OTHER PO rows:', err?.message || err);
        setOtherPoRows([]);
      } finally {
        setIsLoadingOtherPo(false);
      }
    }
    loadOtherPoRows();
  }, [firm, mrrType]);

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

  useEffect(() => {
    const isOther = String(mrrType || '').trim().toLowerCase() === 'other';
    if (!isOther) return;
    const poNo = String(data.po_no || '').trim();
    if (!poNo) return;
    const poKey = normalizePoNoKey(poNo);
    const match = otherPoRows.find((row) => normalizePoNoKey(row.po_no) === poKey);
    if (!match) return;
    // When PO changes, we always refresh supplier from the PO row.
    setData((prev) => {
      if (String(prev.po_no || '').trim() !== poNo) return prev;
      const nextSupplier = String(match.supplier || '').trim();
      if (!nextSupplier) return prev;
      if (String(prev.supplier || '').trim() === nextSupplier) return prev;
      return { ...prev, supplier: nextSupplier };
    });
  }, [mrrType, data.po_no, otherPoRows]);

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
    if (!data.supplier || !data.invoice_no || !String(data.total_value || '').trim() || !String(data.truck_no || '').trim()) {
      alert('Supplier Name, Invoice No, Invoice Value and Truck No are required');
      return;
    }
    setIsSaving(true);
      setStatus('Uploading Gate Entry...');
      try {
        const { po_no: poNoForUiOnly, ...gateEntryData } = data || {};
        const payload = {
          ...gateEntryData,
          total_value: formatDecimal2(data.total_value || ''),
          ge_no: data.ge_no || getGateEntryNo(initialData) || geNo || '',
          mrr_no: data.ge_no || getGateEntryNo(initialData) || geNo || '',
          original_ge_no: getGateEntryNo(initialData) || '',
          firm_code: getFirmCode(firm)
      };
      pics.forEach((pic, i) => {
        if (pic) payload[`pic${i + 1}`] = pic;
      });

      const res = await saveGeEntryToSheets(payload, {
        scriptUrl: firm.scriptUrl,
        spreadsheetId: firm.spreadsheetId,
        mrrSheetName: getSheetName(firm?.mrr, mrrType),
        mode: mrrType
      });
      const finalGeNo = res.ge_no || data.ge_no || '';
      const finalEntry = { ...payload, ge_no: finalGeNo, mrr_no: finalGeNo };
      setData(finalEntry);
      setStatus('Gate Entry saved successfully.');
      onSave(finalGeNo, finalEntry);
    } catch (err) {
      setStatus(err.message || 'Error saving gate entry');
    } finally {
      setIsSaving(false);
    }
  };

  const showFullPageLoader = isSaving || isLoadingSuppliers || isLoadingOtherPo;
  const requiredLabel = (text) => (
    <span>
      {text}
      <span style={{ color: '#b91c1c', marginLeft: '3px', fontWeight: 700 }}>*</span>
    </span>
  );
  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', overflowY: 'auto', position: 'relative' }}>
      <div style={{ background: '#fff', padding: '30px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '800px', width: '95%', margin: '40px auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '50px' }} alt="Logo" />
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{firm?.name || ''}</div>
          </div>
          <h2 style={{ margin: 0, fontSize: '12px' }}>GATE ENTRY FORM</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '12px' }}>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('Supplier Name')}
            <div className="supplier-search-wrap">
              <input
                className="supplier-search"
                list="gate-entry-suppliers"
                value={data.supplier}
                onChange={e => setData({ ...data, supplier: e.target.value })}
                placeholder="Search or Select Supplier Name"
                style={{ fontSize: '12px' }}
              />
              <datalist id="gate-entry-suppliers">
                {visibleSuppliers.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </datalist>
            </div>
          </div>
          {String(mrrType || '').trim().toLowerCase() === 'other' && (
            <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
              <span>Other PO No</span>
              <div>
                <input
                  list="gate-entry-other-po-nos"
                  value={data.po_no || ''}
                  onChange={(e) => {
                    const nextPo = e.target.value;
                    setData((prev) => ({
                      ...prev,
                      po_no: nextPo,
                      supplier: (() => {
                        const match = otherPoRows.find((row) => normalizePoNoKey(row.po_no) === normalizePoNoKey(nextPo));
                        return match?.supplier ? String(match.supplier).trim() : prev.supplier;
                      })()
                    }));
                  }}
                  placeholder="Select or type Other PO No"
                  style={{ fontSize: '12px' }}
                />
                <datalist id="gate-entry-other-po-nos">
                  {[...new Set(otherPoRows.map((row) => String(row.po_no || '').trim()).filter(Boolean))].map((poNo) => (
                    <option key={poNo} value={poNo}>{poNo}</option>
                  ))}
                </datalist>
              </div>
            </div>
          )}
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('Date')}
            <input value={data.date || defaultDate} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed', fontSize: '12px' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('GE No')}
            <input value={data.ge_no || geNo || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed', fontSize: '12px' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('MRR No')}
            <input value={data.ge_no || geNo || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed', fontSize: '12px' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>{requiredLabel('Invoice No')}<input value={data.invoice_no} onChange={e => setData({ ...data, invoice_no: e.target.value })} placeholder="Enter Invoice No" style={{ fontSize: '12px' }} /></div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>{requiredLabel('Invoice Value')}<input type="number" step="0.01" value={data.total_value} onBlur={e => setData({ ...data, total_value: formatDecimal2(e.target.value) })} onChange={e => setData({ ...data, total_value: e.target.value })} placeholder="Enter Total Value" style={{ fontSize: '12px' }} /></div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>{requiredLabel('Truck No')}<input value={data.truck_no} onChange={e => setData({ ...data, truck_no: e.target.value })} placeholder="Enter Truck No" style={{ fontSize: '12px' }} /></div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '12px', marginBottom: '10px' }}>Upload Photos (Up to 8)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
            {pics.map((pic, i) => (
              <div key={i} style={{ border: '1px dashed #ccc', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#f9f9f9' }}>
                {pic ? (
                  <img src={pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Pic ${i + 1}`} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#888' }}>Pic {i + 1}</span>
                )}
                <span style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#333', background: 'rgba(255,255,255,0.75)' }}>
                  Click to {pic ? 'Rename/Replace' : 'Upload'}
                </span>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button className="btn" onClick={onBack} disabled={isSaving}>{'< Back'}</button>
          <button className="btn main" onClick={handleSubmit} disabled={isSaving}>
            Save
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
      {showFullPageLoader ? (
        <div className="loading-overlay" style={{ background: 'rgba(216, 209, 196, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="spinner" />
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
            {isSaving ? 'Saving Gate Entry...' : 'Loading supplier list...'}
          </p>
        </div>
      ) : null}
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
                  <td style={pendingBodyCellStyle}>{formatDecimal2(ge.total_value || ge.total_invocie_value || ge.invoice_basic_value || '')}</td>
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

function ProfileMenu({ currentUser, onLogout, top = '12px', right = '14px', zIndex = 10002, fixed = true }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (!currentUser) return null;

  return (
    <div className="no-print" ref={wrapperRef} style={fixed ? { position: 'fixed', top, right, zIndex } : { position: 'relative', zIndex }}>
      <button
        className="btn small"
        style={{ padding: '4px 8px', background: '#111', color: '#fff', border: '1px solid #333', fontSize: '11px', fontWeight: 700 }}
        onClick={() => setOpen((v) => !v)}
      >
        {currentUser.name || currentUser.email}
      </button>
      {open ? (
        <div style={{ marginTop: '4px', background: '#fff', border: '1px solid #333', boxShadow: '0 8px 20px rgba(0,0,0,0.16)', minWidth: '120px', padding: '6px' }}>
          <button
            className="btn small"
            style={{ width: '100%', fontSize: '11px', padding: '6px 8px' }}
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getOverlayBootStep(menuBootConfig, isAuthenticated) {
  if (menuBootConfig?.token && isAuthenticated) {
    if (menuBootConfig.view === 'label') return 5;
    if (menuBootConfig.view === 'all_approvals') return 6;
    return 3;
  }
  return isAuthenticated ? 2 : 1;
}

function StartupOverlay({ onSelect, onGeSubmit, onLogin, onLogout, currentUser, firms, menuBootConfig, isAuthenticated }) {
  const [step, setStep] = useState(() => getOverlayBootStep(menuBootConfig, isAuthenticated));
  const [tempFirm, setTempFirm] = useState(null);
  const [tempType, setTempType] = useState('reel');
  const [pendingGEs, setPendingGEs] = useState([]);
  const [editMrrRows, setEditMrrRows] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingEditMrr, setIsLoadingEditMrr] = useState(false);
  const [isApprovingPending, setIsApprovingPending] = useState(false);
  const [editData, setEditData] = useState(null);
  const [pendingFilter, setPendingFilter] = useState('pending_mrr');
  const [allApprovalsStage, setAllApprovalsStage] = useState('pending_plant_head_approval');
  const [allApprovalsFirmFilter, setAllApprovalsFirmFilter] = useState('all');
  const [selectedGroupedApprovalKeys, setSelectedGroupedApprovalKeys] = useState({});
  const [groupedAccountsApprovalDrafts, setGroupedAccountsApprovalDrafts] = useState({});
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [validatedUsersByFirm, setValidatedUsersByFirm] = useState({});
  const [previewAllRows, setPreviewAllRows] = useState([]);
  const [isLoadingPreviewAll, setIsLoadingPreviewAll] = useState(false);
  const [labelInitialMrr, setLabelInitialMrr] = useState('');
  const [allApprovalRows, setAllApprovalRows] = useState([]);
  const [isLoadingAllApprovals, setIsLoadingAllApprovals] = useState(false);
  const [, setApprovalPrefetchTick] = useState(0);
  const approvalPrefetchCacheRef = useRef(new Map());
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
  const groupedCheckboxHeaderStyle = { ...pendingHeaderCellStyle, width: '3.2%', minWidth: '38px' };
  const groupedCheckboxCellStyle = { ...pendingBodyCellStyle, width: '3.2%', textAlign: 'center', verticalAlign: 'middle' };
  const groupedIdHeaderStyle = { ...pendingHeaderCellStyle, width: '6.5%', minWidth: '78px' };
  const groupedIdCellStyle = { ...pendingBodyCellStyle, width: '6.5%', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.35 };
  const groupedSupplierCellStyle = { ...pendingBodyCellStyle, width: '18%', maxWidth: '240px', wordBreak: 'break-word' };
  const groupedSupplierHeaderStyle = { ...pendingHeaderCellStyle, width: '18%' };
  const groupedQtyHeaderStyle = { ...pendingHeaderCellStyle, width: '4.8%', minWidth: '58px' };
  const groupedQtyCellStyle = { ...pendingBodyCellStyle, width: '4.8%', textAlign: 'center' };
  const groupedItemsCellStyle = { ...pendingBodyCellStyle, width: '31%', minWidth: '320px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedItemsHeaderStyle = { ...pendingHeaderCellStyle, width: '31%' };
  const groupedPoRateCellStyle = { ...pendingBodyCellStyle, width: '10%', minWidth: '90px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedPoRateHeaderStyle = { ...pendingHeaderCellStyle, width: '10%', minWidth: '90px' };
  const groupedInvoiceRateCellStyle = { ...pendingBodyCellStyle, width: '9%', minWidth: '80px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedInvoiceRateHeaderStyle = { ...pendingHeaderCellStyle, width: '9%', minWidth: '80px' };
  const groupedBasicValueCellStyle = { ...pendingBodyCellStyle, width: '10%', minWidth: '90px', whiteSpace: 'pre-line', verticalAlign: 'top', lineHeight: 1.35 };
  const groupedBasicValueHeaderStyle = { ...pendingHeaderCellStyle, width: '10%', minWidth: '90px' };
  const groupedActionHeaderStyle = { ...pendingHeaderCellStyle, width: '20%', minWidth: '250px' };
  const groupedActionCellStyle = { ...pendingBodyCellStyle, width: '20%', minWidth: '250px' };

  const getGroupedApprovalRowKey = (row) => [
    String(row?.firm_id || '').trim(),
    String(row?.mrr_type || '').trim(),
    String(row?.pending_stage || '').trim(),
    String(row?.mrr_number || row?.mrr_no || '').trim(),
    String(row?.ge_no || row?.ge_entry || '').trim()
  ].join('|');
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
  const isGroupedApprovalDebitNoteRequired = (row) => String(row?.pending_stage || '').trim() === 'pending_accounts_approval' && getGroupedApprovalWeightDifference(row) > 40;
  const getGroupedApprovalDraft = (row) => {
    const rowKey = getGroupedApprovalRowKey(row);
    const existing = groupedAccountsApprovalDrafts[rowKey] || {};
    return {
      debit_note: existing.debit_note ?? String(row?.debit_note || '').trim(),
      debit_note_date: existing.debit_note_date ?? String(row?.debit_note_date || '').trim(),
      debit_note_amount: existing.debit_note_amount ?? String(row?.debit_note_amount || '').trim()
    };
  };
  const setGroupedApprovalDraftField = (row, field, value) => {
    const rowKey = getGroupedApprovalRowKey(row);
    setGroupedAccountsApprovalDrafts((prev) => {
      const current = prev[rowKey] || {};
      return {
        ...prev,
        [rowKey]: {
          debit_note: current.debit_note ?? String(row?.debit_note || '').trim(),
          debit_note_date: current.debit_note_date ?? String(row?.debit_note_date || '').trim(),
          debit_note_amount: current.debit_note_amount ?? String(row?.debit_note_amount || '').trim(),
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
      String(item?.mrr_number || item?.mrr_no || '').trim()
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
        spreadsheetId: targetFirm.spreadsheetId
      }, targetFirm.scriptUrl),
      fetchSheetRangeWithParams({
        sheet: getSheetName(targetFirm.helper, targetType),
        mrr_number: mrrNumber,
        spreadsheetId: targetFirm.spreadsheetId
      }, targetFirm.scriptUrl).catch(() => null)
    ]).then(([parentPayload, helperPayload]) => {
      entry.status = 'resolved';
      entry.data = {
        parentRows: Array.isArray(parentPayload?.values) ? parentPayload.values : [],
        helperRows: Array.isArray(helperPayload?.values) ? helperPayload.values : []
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

  const loadPendingList = async () => {
    if (!tempFirm) return;
    setIsLoadingPending(true);
    try {
      const mrrSheet = getSheetName(tempFirm.mrr, tempType);
      const helperSheet = getSheetName(tempFirm.helper, tempType);
      const list = await fetchPendingGeEntries(mrrSheet, tempFirm.spreadsheetId, tempFirm.scriptUrl, helperSheet);
      setPendingGEs(list || []);
    } catch (err) {
      console.error('Failed to load pending list:', err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const loadAllApprovalsList = async () => {
    if (!firms?.length) return;
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
      setAllApprovalRows(merged);
    } finally {
      setIsLoadingAllApprovals(false);
    }
  };

  const loadEditMrrList = async () => {
    if (!tempFirm) return;
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
        if (!mrrNo) return;
        byMrr.set(mrrNo, {
          pending_stage: 'completed_mrr',
          force_load_saved: true,
          mrr_no: mrrNo,
          mrr_number: mrrNo,
          ge_no: readValue(rowObj, ['GE Entry', 'GE No', 'ge_no', 'ge_entry']),
          ge_entry: readValue(rowObj, ['GE Entry', 'GE No', 'ge_no', 'ge_entry']),
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
      setEditMrrRows(uniqueRows);
    } catch (err) {
      console.error('Failed to load edit MRR list:', err);
      setEditMrrRows([]);
    } finally {
      setIsLoadingEditMrr(false);
    }
  };

  const loadPreviewAllMrr = async () => {
    if (!tempFirm) return;
    setIsLoadingPreviewAll(true);
    try {
      const mrrSheet = getSheetName(tempFirm.mrr, tempType);
      const payload = await fetchSheetRange(mrrSheet, tempFirm.spreadsheetId, tempFirm.scriptUrl);
      setPreviewAllRows(Array.isArray(payload?.values) ? payload.values : []);
    } catch (err) {
      setPreviewAllRows([]);
      alert(err?.message || 'Could not load MRR rows.');
    } finally {
      setIsLoadingPreviewAll(false);
    }
  };

  useEffect(() => {
    if (step === 3 && tempFirm) {
      loadPendingList();
      loadEditMrrList();
      loadAllApprovalsList();
    }
  }, [step, tempFirm, tempType]);

  useEffect(() => {
    setSelectedGroupedApprovalKeys({});
  }, [allApprovalsStage, allApprovalsFirmFilter, pendingFilter, step]);

  useEffect(() => {
    if (step !== 6 || pendingFilter !== 'all_approvals' || !allApprovalRows.length) return;
    const stageGroups = [
      { key: 'pending_plant_head_approval' },
      { key: 'pending_accounts_approval' },
      { key: 'pending_md_approval' }
    ].map((stage) => ({ ...stage, rows: allApprovalRows.filter((row) => String(row.pending_stage || '').trim() === stage.key) }));
    const resolvedStageKey = (
      stageGroups.some((stage) => stage.key === allApprovalsStage && stage.rows.length > 0)
        ? allApprovalsStage
        : (stageGroups.find((stage) => stage.rows.length > 0)?.key || stageGroups[0]?.key)
    );
    const activeStage = stageGroups.find((stage) => stage.key === resolvedStageKey) || stageGroups[0];
    (activeStage?.rows || []).slice(0, 8).forEach((item) => {
      prefetchApprovalDataForItem(item).catch(() => null);
    });
  }, [step, pendingFilter, allApprovalRows, allApprovalsStage, firms]);

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
    setStep(3);
  }, [menuBootConfig?.token, firms, isAuthenticated]);

  useEffect(() => {
    setStep(getOverlayBootStep(menuBootConfig, isAuthenticated));
  }, [menuBootConfig?.token, menuBootConfig?.view, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    setStep(1);
    setTempFirm(null);
    setPendingGEs([]);
    setEditMrrRows([]);
    setAllApprovalRows([]);
    setLabelInitialMrr('');
    setPendingFilter('pending_mrr');
    setValidatedUsersByFirm({});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (step === 1) setStep(2);
  }, [isAuthenticated, step]);

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
                  const authResults = await Promise.all(
                    firms.map(async (firm) => {
                      try {
                        const user = await authenticateUser(loginId, loginPassword, {
                          spreadsheetId: firm?.spreadsheetId,
                          scriptUrl: firm?.scriptUrl
                        });
                        return { firmId: firm.id, user };
                      } catch {
                        return null;
                      }
                    })
                  );
                  const valid = authResults.filter(Boolean);
                  if (!valid.length) {
                    setValidatedUsersByFirm({});
                    setLoginError('Invalid user ID or password.');
                    return;
                  }
                  const map = {};
                  valid.forEach((entry) => {
                    map[entry.firmId] = entry.user;
                  });
                  setValidatedUsersByFirm(map);
                  setStep(2);
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
    const useGridMenu = String(tempFirm?.id || '').toLowerCase() === 'lnki';
    const isMenuCountsLoading = isLoadingPending || isLoadingEditMrr || isLoadingAllApprovals;
    const menuCountText = (value) => (isMenuCountsLoading ? '(Loading...)' : `(${value})`);
    const menuContainerStyle = useGridMenu
      ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', alignItems: 'stretch' }
      : { display: 'flex', flexDirection: 'column', gap: '12px' };
    const menuButtonBaseStyle = useGridMenu ? { minHeight: '72px' } : {};
    const backButtonStyle = useGridMenu
      ? { gridColumn: '1 / -1', padding: '10px', marginTop: '10px', fontSize: '11px', fontWeight: 700 }
      : { padding: '10px', marginTop: '10px', fontSize: '11px', fontWeight: 700 };

    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {userBadge}
        <div style={{ margin: 'auto', background: '#fff', padding: '40px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '600px', width: '90%', textAlign: 'center' }}>
          <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '60px', marginBottom: '10px' }} alt="Logo" />
          <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, marginBottom: '20px' }}>{tempFirm.name}</p>
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>MODE:</span>
            <select
              value={tempType}
              onChange={(e) => setTempType(e.target.value)}
              style={{ border: '1px solid #a8a8a8', padding: '6px 8px', fontSize: '11px', fontWeight: 700, background: '#fff' }}
            >
              <option value="reel">REEL MRR</option>
              <option value="other">OTHER MRR</option>
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            {isMenuCountsLoading ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 8,
                  background: 'rgba(255,255,255,0.42)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.78)', border: '1px solid #d1d5db', padding: '14px', minWidth: '88px', minHeight: '88px' }}>
                  <span className="spinner" />
                </div>
              </div>
            ) : null}
            <div style={menuContainerStyle}>
            <button 
              className="btn main" 
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#2c3e50', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setStep(4); }}
            >
              1. NEW GATE ENTRY
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending}
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#4a4f57', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('edit_ge_entry'); setStep(6); }}
            >
              2. EDIT GE ENTRY {menuCountText(pendingCounts.edit_ge_entry)}
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending}
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('pending_mrr'); setStep(6); }}
            >
              3. PENDING MRR {menuCountText(pendingCounts.pending_mrr)}
            </button>
            <button 
              className="btn main" 
              disabled={isLoadingPending || isLoadingEditMrr}
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#2f5a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('edit_mrr'); setStep(6); }}
            >
              4. EDIT MRR {menuCountText(pendingCounts.edit_mrr)}
            </button>
            <button
              className="btn main"
              disabled={isLoadingAllApprovals}
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#384152', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setPendingFilter('all_approvals'); setStep(6); }}
            >
              5. ALL APPROVALS (GROUPED) {menuCountText(pendingCounts.all_approvals)}
            </button>
            <button
              className="btn main"
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#1e4f74', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={async () => {
                await loadPreviewAllMrr();
                setStep(7);
              }}
            >
              6. PREVIEW ALL MRR
            </button>
            <button
              className="btn main"
              style={{ ...menuButtonBaseStyle, padding: '18px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#5f2a7c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              onClick={() => { setLabelInitialMrr(''); setStep(5); }}
            >
              7. DOWNLOAD LABEL
            </button>
            <button 
              className="btn" 
              style={backButtonStyle}
              onClick={() => { setStep(2); }}
            >
              ← Back to Firms
            </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <>
        {userBadge}
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
      </>
    );
  }

  if (step === 5) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        {userBadge}
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <ReelLabelsTab
            initialMrr={labelInitialMrr}
            helperSheetName={getSheetName(tempFirm?.helper, tempType)}
            selectedFirm={tempFirm}
            onBack={() => setStep(3)}
          />
        </div>
      </div>
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
                        <th style={groupedSupplierHeaderStyle}>Supplier</th>
                        <th style={groupedQtyHeaderStyle}>Total Qty</th>
                        <th style={groupedItemsHeaderStyle}>Items</th>
                        <th style={groupedPoRateHeaderStyle}>PO Rate</th>
                        <th style={groupedInvoiceRateHeaderStyle}>Invoice Rate</th>
                        <th style={groupedBasicValueHeaderStyle}>Basic Value</th>
                        <th style={groupedActionHeaderStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRows.map((ge, idx) => (
                        <tr key={`${activeStage.key}-${idx}`}>
                          <td className="c" style={groupedCheckboxCellStyle}>
                            <input
                              type="checkbox"
                              checked={!!selectedGroupedApprovalKeys[getGroupedApprovalRowKey(ge)]}
                              onChange={(e) => {
                                const checked = !!e.target.checked;
                                const rowKey = getGroupedApprovalRowKey(ge);
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
                          <td style={groupedSupplierCellStyle}>{ge.supplier || ge.supplier_name}</td>
                          <td className="c" style={groupedQtyCellStyle}>{getGroupedApprovalTotalQty(ge) || '-'}</td>
                          <td style={groupedItemsCellStyle}>{getGroupedApprovalItems(ge) || '-'}</td>
                          <td className="r" style={groupedPoRateCellStyle}>{getGroupedApprovalPoRate(ge) || '-'}</td>
                          <td className="r" style={groupedInvoiceRateCellStyle}>{getGroupedApprovalInvoiceRate(ge) || '-'}</td>
                          <td className="r" style={groupedBasicValueCellStyle}>{getGroupedApprovalBasicValue(ge) || '-'}</td>
                          <td className="c" style={groupedActionCellStyle}>
                            <div style={{ display: 'grid', gap: '8px', justifyItems: 'stretch' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                className="btn small"
                                style={{ flex: 1, minWidth: '84px', fontSize: '12px', padding: '9px 10px' }}
                                disabled={isApprovingPending}
                                onClick={() => {
                                  const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                                  const targetType = ge.mrr_type || tempType;
                                  if (!targetFirm) return;
                                  const prefetched = approvalPrefetchCacheRef.current.get(
                                    buildApprovalPrefetchKey(ge, targetFirm.id, targetType)
                                  )?.data;
                                  onGeSubmit(ge.ge_no || ge.ge_entry, {
                                    ...ge,
                                    return_menu_firm_id: tempFirm?.id || '',
                                    return_menu_type: tempType || 'reel',
                                    return_menu_view: 'all_approvals',
                                    prefetched_parent_rows: prefetched?.parentRows || undefined,
                                    prefetched_helper_rows: prefetched?.helperRows || undefined
                                  });
                                  onSelect(targetFirm, targetType);
                                }}
                              >
                                OPEN
                              </button>
                              <button
                                className="btn main small"
                                style={{ flex: 1, minWidth: '96px', fontSize: '13px', padding: '9px 12px', background: '#111', color: '#fff', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; e.currentTarget.style.color = '#fff'; }}
                                disabled={isApprovingPending}
                                onClick={async () => {
                                  try {
                                    const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                                    const targetType = ge.mrr_type || tempType;
                                    if (!targetFirm) throw new Error('Firm context missing for approval.');
                                    const approvalDraft = getGroupedApprovalDraft(ge);
                                    if (isGroupedApprovalDebitNoteRequired(ge)) {
                                      if (!approvalDraft.debit_note || !approvalDraft.debit_note_date || !approvalDraft.debit_note_amount) {
                                        throw new Error(`Debit Note, Debit Note Date, and Debit Note Amount are required for ${ge.mrr_number || ge.mrr_no || 'this MRR'}.`);
                                      }
                                    }
                                    setIsApprovingPending(true);
                                    await approvePendingStage({
                                      stage: ge.pending_stage || activeStage.key,
                                      mrrNumber: ge.mrr_number || ge.mrr_no || '',
                                      userEmail: currentUser?.email || '',
                                      debitNote: String(approvalDraft.debit_note || '').trim(),
                                      debitNoteDate: String(approvalDraft.debit_note_date || '').trim(),
                                      debitNoteAmount: String(approvalDraft.debit_note_amount || '').trim(),
                                      mrrSheetName: getSheetName(targetFirm.mrr, targetType),
                                      helperSheetName: getSheetName(targetFirm.helper, targetType),
                                      spreadsheetId: targetFirm?.spreadsheetId,
                                      scriptUrl: targetFirm?.scriptUrl
                                    });
                                    await loadPendingList();
                                    await loadAllApprovalsList();
                                  } catch (err) {
                                    alert(err?.message || 'Approval failed.');
                                  } finally {
                                    setIsApprovingPending(false);
                                  }
                                }}
                              >
                                {isApprovingPending ? 'APPROVING...' : 'APPROVE'}
                              </button>
                              </div>
                            {String(ge.pending_stage || activeStage.key).trim() === 'pending_accounts_approval' ? (
                              <div style={{ padding: '10px', border: '1px solid #d6c7ae', background: isGroupedApprovalDebitNoteRequired(ge) ? '#fff7e6' : '#f8fafc', borderRadius: '8px', display: 'grid', gap: '8px', textAlign: 'left' }}>
                                <div style={{ display: 'grid', gap: '2px' }}>
                                  <div style={{ fontSize: '10px', fontWeight: 900, color: isGroupedApprovalDebitNoteRequired(ge) ? '#b45309' : '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Accounts Note
                                  </div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: isGroupedApprovalDebitNoteRequired(ge) ? '#b45309' : '#374151' }}>
                                    Diff: {formatDecimal2(getGroupedApprovalWeightDifference(ge)) || '0.00'} KG
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#6b7280' }}>
                                    {isGroupedApprovalDebitNoteRequired(ge) ? 'Debit note fields are required for this row.' : 'Debit note fields are optional for this row.'}
                                  </div>
                                </div>
                                <input
                                  value={getGroupedApprovalDraft(ge).debit_note}
                                  onChange={(e) => setGroupedApprovalDraftField(ge, 'debit_note', e.target.value)}
                                  placeholder={isGroupedApprovalDebitNoteRequired(ge) ? 'Debit Note *' : 'Debit Note'}
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
                                  placeholder={isGroupedApprovalDebitNoteRequired(ge) ? 'Debit Note Amount *' : 'Debit Note Amount'}
                                  style={{ width: '100%', border: '1px solid #c7c9d1', borderRadius: '6px', padding: '7px 8px', fontSize: '11px', background: '#fff' }}
                                />
                              </div>
                            ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
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
                      disabled={isApprovingPending || selectedActiveCount === 0}
                      onClick={async () => {
                        try {
                          setIsApprovingPending(true);
                          const selectedRows = activeRows.filter((row) => !!selectedGroupedApprovalKeys[getGroupedApprovalRowKey(row)]);
                          for (const ge of selectedRows) {
                            const targetFirm = firms.find((firm) => firm.id === ge.firm_id) || tempFirm;
                            const targetType = ge.mrr_type || tempType;
                            if (!targetFirm) continue;
                            const approvalDraft = getGroupedApprovalDraft(ge);
                            if (isGroupedApprovalDebitNoteRequired(ge)) {
                              if (!approvalDraft.debit_note || !approvalDraft.debit_note_date || !approvalDraft.debit_note_amount) {
                                throw new Error(`Fill Debit Note, Debit Note Date, and Debit Note Amount for ${ge.mrr_number || ge.mrr_no || 'selected MRR'} before bulk approve.`);
                              }
                            }
                            await approvePendingStage({
                              stage: ge.pending_stage || activeStage.key,
                              mrrNumber: ge.mrr_number || ge.mrr_no || '',
                              userEmail: currentUser?.email || '',
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
                          await loadPendingList();
                          await loadAllApprovalsList();
                        } catch (err) {
                          alert(err?.message || 'Bulk approval failed.');
                        } finally {
                          setIsApprovingPending(false);
                        }
                      }}
                    >
                      {isApprovingPending ? 'APPROVING...' : `Approve Selected (${selectedActiveCount})`}
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
                  <th style={pendingHeaderCellStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((ge, idx) => (
                  <tr key={idx}>
                    <td className="c" style={pendingBodyCellStyle}>{idx + 1}</td>
                    <td style={pendingBodyCellStyle}>{ge.date}</td>
                    <td className="c" style={pendingBodyCellStyle}>{ge.ge_no || ge.ge_entry}</td>
                    <td className="c" style={pendingBodyCellStyle}>{ge.mrr_number || ge.mrr_no || ''}</td>
                    <td style={pendingBodyCellStyle}>{ge.supplier || ge.supplier_name}</td>
                    <td style={pendingBodyCellStyle}>{ge.invoice_no}</td>
                    <td style={pendingBodyCellStyle}>{formatDecimal2(ge.total_value || ge.total_invocie_value || ge.invoice_basic_value || '')}</td>
                    <td style={pendingBodyCellStyle}>{ge.truck_no}</td>
                    <td className="c" style={{ ...pendingBodyCellStyle }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          className="btn small"
                          style={{ fontSize: '12px', padding: '8px 10px' }}
                          disabled={isApprovingPending}
                          onClick={() => {
                            if (pendingFilter === 'edit_ge_entry') {
                              setEditData(ge);
                              setStep(4);
                              return;
                            }
                            const selectedPending = pendingFilter === 'edit_mrr'
                              ? { ...ge, pending_stage: 'completed_mrr', force_load_saved: true }
                              : ge;
                            onGeSubmit(ge.ge_no || ge.ge_entry, selectedPending);
                            onSelect(tempFirm, tempType);
                          }}
                        >
                          {pendingFilter === 'edit_ge_entry' || pendingFilter === 'edit_mrr' ? 'EDIT' : 'OPEN'}
                        </button>
                        {pendingFilter !== 'pending_mrr' && pendingFilter !== 'edit_ge_entry' && pendingFilter !== 'edit_mrr' && (
                          <button
                            className="btn main small"
                            style={{ fontSize: '13px', padding: '8px 12px', background: '#111', color: '#fff', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#111'; e.currentTarget.style.color = '#fff'; }}
                            disabled={isApprovingPending}
                            onClick={async () => {
                              try {
                                setIsApprovingPending(true);
                                const approvalResult = await approvePendingStage({
                                  stage: pendingFilter,
                                  mrrNumber: ge.mrr_number || ge.mrr_no || '',
                                  userEmail: currentUser?.email || '',
                                  mrrSheetName: getSheetName(tempFirm.mrr, tempType),
                                  helperSheetName: getSheetName(tempFirm.helper, tempType),
                                  spreadsheetId: tempFirm?.spreadsheetId,
                                  scriptUrl: tempFirm?.scriptUrl
                                });
                                if (approvalResult?.next_stage && approvalResult.next_stage !== 'completed') {
                                  setPendingFilter(approvalResult.next_stage);
                                }
                                await loadPendingList();
                              } catch (err) {
                                alert(err?.message || 'Approval failed.');
                              } finally {
                                setIsApprovingPending(false);
                              }
                            }}
                          >
                            {isApprovingPending ? 'APPROVING...' : 'APPROVE'}
                          </button>
                        )}
                      </div>
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

  if (step === 7) {
    const headers = previewAllRows[0] || [];
    const bodyRows = previewAllRows.slice(1);
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'rgba(216, 209, 196, 0.98)', backdropFilter: 'blur(12px)' }}>
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px', marginBottom: '20px', width: '100%' }}>
            <h2 style={{ margin: 0, fontSize: '36px', letterSpacing: '0.03em' }}>Preview All MRR</h2>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '20px', marginLeft: 'auto', marginRight: '50px' }}>
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
            <table className="table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  {headers.map((header, idx) => <th key={`h-${idx}`} style={{ fontSize: '12px' }}>{String(header || '')}</th>)}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={`r-${rIdx}`}>
                    {headers.map((_, cIdx) => <td key={`c-${rIdx}-${cIdx}`} style={{ fontSize: '11px' }}>{String(row?.[cIdx] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

function App() {
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
  const [mrrSupplierOptions, setMrrSupplierOptions] = useState([]);
  const [accountsDebitNote, setAccountsDebitNote] = useState('');
  const [accountsDebitNoteDate, setAccountsDebitNoteDate] = useState('');
  const [accountsDebitNoteAmount, setAccountsDebitNoteAmount] = useState('');
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [mrrType, setMrrType] = useState('reel');
  const [isFirmSelected, setIsFirmSelected] = useState(false);
  const [menuBootConfig, setMenuBootConfig] = useState(null);
  const [triggerPendingModal, setTriggerPendingModal] = useState(false);
  const [helperSheetReelSeed, setHelperSheetReelSeed] = useState(0);
  const [manualFields, setManualFields] = useState({}); // { [rowIdx]: { fieldName: true } }
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
          return { ...row, rate: getParentRateForPackingRow(row) || row.rate || '' };
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
  const invoiceBasicValue = Number(invoice.goods.reduce((sum, row) => sum + (n(row.amount) || (n(row.weight) * n(row.rate))), 0).toFixed(2));
  const mrrBasicValue = isOtherMrr
    ? Number(invoice.goods.reduce((sum, row) => sum + (n(row.rate) * n(row.weight)), 0).toFixed(2))
    : Number(packing.items.reduce((sum, row) => sum + (n(row.rate) * n(row.net_wt)), 0).toFixed(2));
  const invoiceRowCount = invoice.goods.filter(isMeaningful).length;
  const packingRowCount = packing.items.filter(isMeaningful).length;
  const packingReels = packing.items.filter(isMeaningful).length;
  const approvalStage = String(geData?.pending_stage || '').trim();
  const isApprovalMode = ['pending_plant_head_approval', 'pending_accounts_approval', 'pending_md_approval', 'pending_tally_posting'].includes(approvalStage);
  const shouldRequireAccountsDebitNote = approvalStage === 'pending_accounts_approval' && accountsWeightDifference > 40;
  const isDataEntryLocked = isApprovalMode || isMrrSavedLocked;
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
      timestamp: String(geData?.plant_head_approval_timestamp || '').trim(),
      userEmail: String(geData?.plant_head_approval_useremail || '').trim()
    },
    {
      key: 'accounts',
      label: 'Accounts Approval',
      timestamp: String(geData?.accounts_approval_timestamp || '').trim(),
      userEmail: String(geData?.accounts_approval_useremail || '').trim()
    },
    {
      key: 'md',
      label: 'MD Approval',
      timestamp: String(geData?.md_approval_timestamp || '').trim(),
      userEmail: String(geData?.md_approval_useremail || '').trim()
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
  }, [geData?.debit_note, geData?.debit_note_date, geData?.debit_note_amount]);
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
  const getPoRateOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => String(po.rate || '').trim()).filter(Boolean)), row.po_rate);
  const getPoQtyOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => String(firstFilled(po.quantity, po.quantity_received, '')).trim()).filter(Boolean)), row.po_quantity);
  const getDescriptionOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).map((po) => po.reel_details).filter(Boolean)), row.item_name || row.reel_details);
  const getErpCodeOptions = (row) => withCurrentOption(uniqueText(getPoRowsForRow(row).filter((po) => !(row.item_name || row.reel_details) || po.reel_details === (row.item_name || row.reel_details)).map((po) => po.erp_code).filter(Boolean)), row.erp_code);
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
    const lockedRate = String(getParentRateForPackingRow(row) || row.rate || '').trim();
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
    const lockedRate = String(getParentRateForPackingRow(row) || row.rate || '').trim();
    const matches = getPoRowsForPo(row.po_no).filter((po) => po.po_details === poDetails);
    const match = matches.find((po) => (!row.item_name || po.reel_details === (row.item_name || row.reel_details)) && (!row.erp_code || po.erp_code === row.erp_code)) || matches[0];
    return fillPackRowFromPoRecord(row, match, { po_details: poDetails, po_no: match?.po_no || row.po_no, rate: lockedRate });
  });
  const handleDescriptionSelect = (index, description) => updatePackRowFromSource(index, (row) => {
    const lockedRate = String(getParentRateForPackingRow(row) || row.rate || '').trim();
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
      const nextRate = String(row.rate || '').trim() ? row.rate : match.rate;
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
      const data = await fetchLatestMrrGe(mrrSheet, selectedFirm.spreadsheetId, selectedFirm.scriptUrl, getFirmCode(selectedFirm), 'GE ENTRY');
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

  const fetchHelperSheetReelSeed = async () => {
    if (!selectedFirm) return;
    try {
      const helperSheet = getSheetName(selectedFirm.helper, mrrType);
      const payload = await fetchSheetRange(helperSheet, selectedFirm.spreadsheetId, selectedFirm.scriptUrl);
      const maxReel = getMaxOurReelNoFromSheetPayload(payload);
      setHelperSheetReelSeed(maxReel);
    } catch (err) {
      console.warn('Could not load last reel number from helper sheet:', err?.message || err);
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

  const handleFirmSelection = (firm, type = 'reel', openPending = false) => {
    setMenuBootConfig(null);
    setHelperSheetReelSeed(0);
    setIsMrrSavedLocked(false);
    setLastSavedRecord(null);
    setSelectedFirm(firm);
    setMrrType(type);
    setIsFirmSelected(true);
    setTriggerPendingModal(openPending);
    if (firm.header) {
      setInvoice(prev => ({ ...prev, header: firm.header }));
      setPacking(prev => ({ ...prev, header: firm.header, receiver_label: firm.name }));
    } else {
      setPacking(prev => ({ ...prev, receiver_label: firm.name }));
    }
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
      view
    });
    setIsFirmSelected(false);
  };

  const goBackFromFormView = () => {
    openStageMenuView(
      mrrType,
      isApprovalMode ? 'all_approvals' : 'dashboard',
      isApprovalMode
        ? {
            firmId: geData?.return_menu_firm_id || selectedFirm?.id,
            type: geData?.return_menu_type || mrrType
          }
        : {}
    );
  };

  const approveFromMainForm = async () => {
    if (!isApprovalMode) return;
    const mrrNumber = String(geData?.mrr_number || geData?.mrr_no || invoice.mrr_no || packing.mrr_no || '').trim();
    if (!mrrNumber) {
      showPopup('MRR No. missing for approval.', 'error');
      return;
    }
    if (shouldRequireAccountsDebitNote) {
      if (!String(accountsDebitNote || '').trim() || !String(accountsDebitNoteDate || '').trim() || !String(accountsDebitNoteAmount || '').trim()) {
        showPopup('Debit Note, Debit Note Date, and Debit Note Amount are required when weight difference is more than 40 kg.', 'error');
        return;
      }
    }
    try {
      setIsApprovingFromForm(true);
      const result = await approvePendingStage({
        stage: approvalStage,
        mrrNumber,
        userEmail: currentUser?.email || '',
        debitNote: approvalStage === 'pending_accounts_approval' ? accountsDebitNote : '',
        debitNoteDate: approvalStage === 'pending_accounts_approval' ? accountsDebitNoteDate : '',
        debitNoteAmount: approvalStage === 'pending_accounts_approval' ? accountsDebitNoteAmount : '',
        mrrSheetName: getSheetName(selectedFirm.mrr, mrrType),
        helperSheetName: getSheetName(selectedFirm.helper, mrrType),
        spreadsheetId: selectedFirm?.spreadsheetId,
        scriptUrl: selectedFirm?.scriptUrl
      });
      const next = result?.next_stage || 'completed';
      if (next === 'completed') {
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
          }
          if (approvalStage === 'pending_accounts_approval') {
            nextState.accounts_approval_timestamp = result?.timestamp || nextState.accounts_approval_timestamp || '';
            nextState.accounts_approval_useremail = result?.user_email || nextState.accounts_approval_useremail || '';
            nextState.debit_note = result?.debit_note ?? accountsDebitNote;
            nextState.debit_note_date = result?.debit_note_date ?? accountsDebitNoteDate;
            nextState.debit_note_amount = result?.debit_note_amount ?? accountsDebitNoteAmount;
          }
          if (approvalStage === 'pending_md_approval') {
            nextState.md_approval_timestamp = result?.timestamp || nextState.md_approval_timestamp || '';
            nextState.md_approval_useremail = result?.user_email || nextState.md_approval_useremail || '';
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
      const errorMessage = 'MRR No. is required before saving to Google Sheets.';
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
    if (!isOtherMrr) {
      const packingMandatoryError = getPackingMandatoryError(packing);
      if (packingMandatoryError) {
        setStatus(packingMandatoryError);
        showPopup(packingMandatoryError, 'error');
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
      ...packing,
      items: (packing.items || []).map((row) => ({
        ...row,
        rate: String(getParentRateForPackingRow(row) || row.rate || '').trim()
      })),
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
        setStatus(err?.message || 'Could not save data to Google Sheets.');
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
        : `Saved for ${mrrNumber}. HELPER SHEET rows found: ${Number(result?.helperSheet?.insertedRows || 0)}. MRR FORM rows found: ${Number(result?.mrrForm?.updatedRows || 0)}.`;
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
      const errorMessage = err?.message || 'Could not save data to Google Sheets.';
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
    const mrrNumber = String(lastSavedRecord?.mrrNumber || invoice.mrr_no || packing.mrr_no || '').trim();
    if (!selectedFirm || !mrrNumber) {
      showPopup('MRR No. missing for label print.', 'error');
      return;
    }
    try {
      setIsPreparingLabels(true);
      const helperSheetName = getSheetName(selectedFirm.helper, mrrType);
      const payload = await fetchSheetRangeWithParams({
        sheet: helperSheetName,
        mrr_number: mrrNumber,
        spreadsheetId: selectedFirm.spreadsheetId
      }, selectedFirm.scriptUrl);
      const reels = Array.isArray(payload?.values) ? payload.values : [];
      if (!reels.length) {
        throw new Error(`No label rows found for MRR ${mrrNumber}.`);
      }
      setDirectLabelPrintJob({ reels, mrrNumber, firm: selectedFirm, mode: 'label' });
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
      showPopup(err?.message || 'Could not prepare labels.', 'error');
    } finally {
      setIsPreparingLabels(false);
    }
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
    if (!mrrNumber) return;
    const mrrSheetName = getSheetName(firmCtx.mrr, typeCtx);
    const helperSheetName = getSheetName(firmCtx.helper, typeCtx);
    const scriptUrl = firmCtx.scriptUrl;
    const spreadsheetId = firmCtx.spreadsheetId;
    const prefetchedParentRows = Array.isArray(pendingItem?.prefetched_parent_rows) ? pendingItem.prefetched_parent_rows : null;
    const prefetchedHelperRows = Array.isArray(pendingItem?.prefetched_helper_rows) ? pendingItem.prefetched_helper_rows : null;

    try {
      let parentRows = prefetchedParentRows || [];
      let helperRows = prefetchedHelperRows || [];
      if (!prefetchedParentRows && !prefetchedHelperRows) {
        const [parentPayload, helperPayload] = await Promise.all([
          fetchSheetRangeWithParams({
            sheet: mrrSheetName,
            mrr_number: mrrNumber,
            spreadsheetId
          }, scriptUrl),
          fetchSheetRangeWithParams({
            sheet: helperSheetName,
            mrr_number: mrrNumber,
            spreadsheetId
          }, scriptUrl).catch(() => null)
        ]);

        parentRows = Array.isArray(parentPayload?.values) ? parentPayload.values : [];
        helperRows = Array.isArray(helperPayload?.values) ? helperPayload.values : [];
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
        throw new Error(`No saved rows found in backend sheets for MRR ${mrrNumber}.`);
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
        invoice_no: parentDoc,
        truck_no: parentTruck,
        plant_head_approval_timestamp: readRowValue(parent, 'plant_head_approval_timestamp', 'Plant Head Approval Timestamp'),
        plant_head_approval_useremail: readRowValue(parent, 'plant_head_approval_useremail', 'Plant Head Approval User Email', 'Plant Head Approval Useremail'),
        accounts_approval_timestamp: readRowValue(parent, 'accounts_approval_timestamp', 'Accounts Approval Timestamp'),
        accounts_approval_useremail: readRowValue(parent, 'accounts_approval_useremail', 'Accounts Approval User Email', 'Accounts Approval Useremail'),
        debit_note: readRowValue(parent, 'debit_note', 'Debit Note'),
        debit_note_date: readRowValue(parent, 'debit_note_date', 'Debit Note Date'),
        debit_note_amount: readRowValue(parent, 'debit_note_amount', 'Debit Note Amount'),
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
      if (!geData) {
        fetchLastIds();
      }
      if (triggerPendingModal) {
        setTriggerPendingModal(false);
        loadPendingGEs();
      }
    }
  }, [isFirmSelected, selectedFirm, mrrType, geData, triggerPendingModal]);

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

  const scan = async (kind, file) => {
    if (scanLockRef.current || isScanning) {
      return;
    }
    scanLockRef.current = true;
    setIsScanning(true);
    setStatus(`Reading ${kind} with Gemini...`);
    try {
      const data = await fetchGeminiJson(file, kind);
      const lockedSupplierName = isGateEntryLocked
        ? String(geData?.supplier_name || geData?.supplier || invoice.bill_to?.name_address || packing.buyer?.name_address || '').trim()
        : '';
      if (kind === 'invoice') {
        const normalizedInvoice = normalizeInvoice(data);
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
        normalizedInvoice.header = invoice.header; 

        if (invoice.mrr_no) normalizedInvoice.mrr_no = invoice.mrr_no;
        if (invoice.ge_no) normalizedInvoice.ge_no = invoice.ge_no;
        normalizedInvoice.receipt_date = todayReceiptDate;

        setInvoice(normalizedInvoice);
        setPacking((prev) => ({ ...prev, receipt_date: todayReceiptDate }));
        setStatus('Invoice scanned with Gemini. Updated invoice section only.');
      } else {
        let normalizedPacking = normalizePacking(data);
        if (packing.mrr_no) normalizedPacking.mrr_no = packing.mrr_no;
        if (packing.ge_no) normalizedPacking.ge_no = packing.ge_no;
        const baseOurReelNo = Math.max(getMaxOurReelNo(packing.items), helperSheetReelSeed);
        const scannedRowsWithOurReel = withSequentialOurReelNumbers(normalizedPacking.items, baseOurReelNo);
        
        normalizedPacking = {
          ...normalizedPacking,
          header: selectedFirm?.header ? { ...selectedFirm.header, note: '' } : packing.header,
          distributor: lockedSupplierName || normalizedPacking.distributor,
          buyer: lockedSupplierName
            ? { ...normalizedPacking.buyer, name_address: lockedSupplierName }
            : normalizedPacking.buyer,
          items: scannedRowsWithOurReel.map(row => ({
            ...row,
            mrr_no: normalizedPacking.mrr_no,
            ge_no: normalizedPacking.ge_no
          }))
        };
        setPacking(normalizedPacking);
        setStatus('Packing slip scanned with Gemini. Updated packing section only.');
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

  if (!currentUser || !isFirmSelected) return (
    <>
      <style>{styles}</style>
      <style>{labelStyles}</style>
      <style>{directLabelPrintStyles}</style>
      <style>{printGridStyles}</style>
      <StartupOverlay firms={FIRMS} isAuthenticated={!!currentUser} menuBootConfig={menuBootConfig} onSelect={handleFirmSelection} onGeSubmit={(geNo, data) => { 
        applyPendingItem({ ...data, ge_no: geNo });
      }} onLogin={handleUserLogin} onLogout={handleUserLogout} currentUser={currentUser} />
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
            {isScanning ? 'Loading data...' : isApprovingFromForm ? 'Applying approval...' : isPreparingLabels ? 'Preparing labels...' : 'Saving data...'}
          </p>
        </div>
      )}

      <div className="pageHeader no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>MRR Management</h1>
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
                  {row.label}: {row.timestamp ? `${row.timestamp}${row.userEmail ? ` | ${row.userEmail}` : ''}` : 'Pending'}
                </div>
              ))}
            </div>
            {approvalStage === 'pending_accounts_approval' ? (
              <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: shouldRequireAccountsDebitNote ? '#b45309' : '#374151' }}>
                  Invoice Weight: {formatDecimal2(accountsInvoiceWeight) || '0.00'} KG | Actual Weight: {formatDecimal2(accountsActualWeight) || '0.00'} KG | Difference: {formatDecimal2(accountsWeightDifference) || '0.00'} KG
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
          </div>
        )}

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
                <button className="btn main" disabled={isScanning || isSaving || isDataEntryLocked} onClick={() => invoiceRef.current?.click()}>{isScanning ? 'Reading Photo...' : 'Click Invoice Photo'}</button>
                <input ref={invoiceRef} className="hidden" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) try { await scan('invoice', file); } catch (err) { setStatus(err?.message || 'Could not read invoice photo with Gemini'); } e.target.value = ''; }} />
                <button className="btn" disabled={isScanning || isSaving || isDataEntryLocked} onClick={() => packingRef.current?.click()}>Click Packing Photo</button>
                <input ref={packingRef} className="hidden" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) try { await scan('packing', file); } catch (err) { setStatus(err?.message || 'Could not read packing photo with Gemini'); } e.target.value = ''; }} />
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
                <table className="meta" style={{ borderBottom: '1px solid var(--line)' }}>
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
                            <input
                              type={rType || 'text'}
                              value={getSafeInputValue(rType, rValue)}
                              onChange={(e) => rOnChange && rOnChange(e.target.value)}
                              readOnly={!!rReadOnly}
                              disabled={!rOnChange}
                              style={rightLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
                            />
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
                  <table className="table invoiceTable" style={{ minWidth: "3600px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "70px" }}>S.No</th>
                        <th style={{ width: "120px" }}>PO NO.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "120px" }}>PO DATE<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "200px" }}>SUPPLIER<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "260px" }}>PO DETAILS<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "120px" }}>PO RATE<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "130px" }}>PO QUANTITY<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "220px" }}>Description</th>
                        <th style={{ width: "100px" }}>HSN<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "90px" }}>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "110px" }}>Qunatity<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "120px" }}>Invoice Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th style={{ width: "140px" }}>Invoice Basic Amount<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th className="no-print" style={{ width: "80px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!invoice.goods.length ? (
                        <tr>
                          <td colSpan={14} className="c" style={{ padding: '14px 8px', color: 'var(--muted)', fontWeight: 700 }}>
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
                          <td><input value={row.description || ''} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'description', e.target.value)} /></td>
                          <td><input value={row.hsn || '48043100'} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'hsn', e.target.value)} /></td>
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
                          <td><input value={row.quantity || ''} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'quantity', e.target.value)} /></td>
                          <td><input value={row.rate || ''} readOnly={isDataEntryLocked} onChange={(e) => setInvRow(i, 'rate', e.target.value)} /></td>
                          <td><input value={money(n(row.quantity) * n(row.rate))} readOnly /></td>
                          <td className="c no-print"><button className="btn small" disabled={isDataEntryLocked} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => removeInvoiceRow(i)}>Del</button></td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="no-print">
                        <td colSpan={14} style={{ padding: '8px', textAlign: 'center', background: '#fcfcfc', border: '1px solid var(--line)' }}>
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
                        <th>S.No</th><th>Description<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>HSN<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Sord</th><th>Party Order</th><th>GSM<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Size<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Reels<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Weight<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Amount<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th><th>Action</th>
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
                  ? <button className="btn main" disabled={isSaving || isApprovingFromForm} onClick={approveFromMainForm}>{isApprovingFromForm ? <span className="spinner" /> : 'Approve'}</button>
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
                        <th>Reel No.<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Sord No.</th>
                        <th>BF<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>GSM<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Size<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Unit<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
                        <th>Rate<span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span></th>
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
                          <td><input value={getParentRateForPackingRow(row) || row.rate} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                          <td><input value={row.po_rate} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} /></td>
                          <td><input value={row.net_wt} readOnly={isDataEntryLocked} onChange={(e) => setPackRow(i, 'net_wt', e.target.value)} /></td>
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
                  ? <button className="btn main" disabled={isSavingInvoice || isSavingPacking || isApprovingFromForm} onClick={approveFromMainForm}>{isApprovingFromForm ? <span className="spinner" /> : 'Approve'}</button>
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
                  <button
                    className="btn"
                    onClick={downloadLabelFromCurrentScreen}
                  >
                    Download Label
                  </button>
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

















export const SCRIPT_URL = import.meta.env.VITE_PO_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwiyz-CktQyrxFP2U-LPHYm8zcECnPWQsK6NRYtt83w2Hzm24xZLL70PjD6yTHDiEhQOw/exec';
export const PO_SHEET_NAME = import.meta.env.VITE_PO_SHEET_NAME || 'PO DETAILS';
export const MRR_FORM_SHEET_NAME = import.meta.env.VITE_MRR_FORM_SHEET_NAME || 'MRR FORM';
export const HELPER_SHEET_NAME = import.meta.env.VITE_HELPER_SHEET_NAME || 'HELPER SHEET';
export const SHEET_WRITE_API_KEY = import.meta.env.VITE_SHEET_WRITE_API_KEY || '';

const n = (value) => Number(value) || 0;
const round2 = (value) => Number(n(value).toFixed(2));
const firstFilled = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const rowHasData = (row = {}) => Object.values(row).some((value) => String(value ?? '').trim() !== '');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VERIFY_TIMEOUT_MS = 15000;
const VERIFY_INTERVAL_MS = 1200;

function findMatchingPoRow(row = {}, poRows = []) {
  const poNo = String(row.po_no || row.party_order || '').trim();
  const details = String(row.po_details || '').trim();
  const erpCode = String(row.erp_code || '').trim();
  const reelDetails = String(row.reel_details || row.item_name || '').trim();
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

  return (Array.isArray(packing.items) ? packing.items : [])
    .filter(rowHasData)
    .map((row, index) => {
      const po = findMatchingPoRow(row, poRows);
      const weight = round2(row.net_wt);
      const rate = round2(row.rate);
      return {
        s_no: index + 1,
        mrr_number: firstFilled(row.mrr_no, mrrNumber),
        po_details: firstFilled(row.po_details, po?.po_details),
        po_no: firstFilled(row.po_no, row.party_order, po?.po_no),
        po_date: firstFilled(po?.date, packing.order_date, invoice.date),
        supplier: firstFilled(po?.supplier, supplierName),
        our_reel_number: firstFilled(row.reel_no),
        supplier_reel_no: firstFilled(row.supplier_reel_no),
        reel_details: firstFilled(row.reel_details, row.item_name, po?.reel_details),
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

export async function fetchSheetRange(sheetName) {
  if (!SCRIPT_URL) {
    throw new Error('Missing PO script URL. Set VITE_PO_SCRIPT_URL in .env.');
  }
  const url = `${SCRIPT_URL}?sheet=${encodeURIComponent(sheetName || PO_SHEET_NAME)}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || payload?.message || 'Could not load PO details from Google Apps Script.');
  }
  return payload;
}

export async function fetchSheetRangeWithParams(params = {}) {
  if (!SCRIPT_URL) {
    throw new Error('Missing PO script URL. Set VITE_PO_SCRIPT_URL in .env.');
  }

  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || payload?.message || 'Could not verify Google Sheets write.');
  }
  return payload;
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
      form.action = SCRIPT_URL;
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

async function submitPayload(payload) {
  const body = new URLSearchParams({
    payload: JSON.stringify(payload)
  });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const sent = navigator.sendBeacon(SCRIPT_URL, body);
    if (sent) {
      await wait(400);
      return;
    }
  }

  return submitPayloadWithForm(payload);
}

function getMrrNumber(invoice, packing) {
  return firstFilled(invoice?.mrr_no, packing?.mrr_no);
}

async function verifyWrite(action, invoice, packing) {
  const mrrNumber = getMrrNumber(invoice, packing);
  if (!mrrNumber) {
    return {
      ok: true,
      message: 'Saved request sent. Verification skipped because MRR Number is blank.'
    };
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < VERIFY_TIMEOUT_MS) {
    if (action === 'save_invoice') {
      const payload = await fetchSheetRangeWithParams({
        sheet: MRR_FORM_SHEET_NAME,
        mrr_number: mrrNumber
      });

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
      const payload = await fetchSheetRangeWithParams({
        sheet: HELPER_SHEET_NAME,
        mrr_number: mrrNumber
      });

      if (payload?.count || !Array.isArray(packing?.items) || !packing.items.length) {
        return {
          ok: true,
          helperSheet: {
            deletedRows: 0,
            insertedRows: payload?.count || 0
          },
          mrrForm: {
            updatedRows: 1,
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

  throw new Error(`Save request was sent, but no HELPER SHEET rows were found for MRR Number ${mrrNumber}. Check the Apps Script deployment, web app permissions, and sheet headers.`);
}

async function postSheetAction(action, invoice, packing, poRows = []) {
  if (!SCRIPT_URL) {
    throw new Error('Missing PO script URL. Set VITE_PO_SCRIPT_URL in .env.');
  }

  await submitPayload({
    action,
    apiKey: SHEET_WRITE_API_KEY || undefined,
    invoice,
    packing,
    // poRows deliberately entirely removed to prevent Google Apps script POST size limit truncation!
    options: {
      poSheetName: PO_SHEET_NAME,
      mrrSheetName: MRR_FORM_SHEET_NAME,
      helperSheetName: HELPER_SHEET_NAME
    }
  });

  return verifyWrite(action, invoice, packing);
}

export function saveInvoiceToSheets(invoice, packing, poRows = []) {
  return postSheetAction('save_invoice', invoice, packing, poRows);
}

export function savePackingToSheets(invoice, packing, poRows = []) {
  return postSheetAction('save_packing', invoice, packing, poRows);
}
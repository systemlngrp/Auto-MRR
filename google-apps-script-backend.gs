/**
 * Configuration for Sheet Names
 */
const DEFAULT_SHEETS = {
  poDetails: 'PO DETAILS',
  mrrForm: 'MRR FORM',
  helper: 'HELPER SHEET'
};

/**
 * Field Aliases for mapping JSON payload keys to Sheet Headers
 */
const MRR_FORM_ALIASES = {
  ge_no: ['G. E. No.', 'g_e_no', 'ge_no'],
  date: ['Date', 'date'],
  mrr_number: ['MRR Number', 'mrr_number', 'mrr_no'],
  dt_of_receipt: ['Dt. of Receipt', 'dt_of_receipt', 'dt_of_receipts', 'receipt_date'],
  sup_doc_no: ['Sup Doc No.', 'sup_doc_no', 'supplier_doc_no'],
  truck_number: ['Truck Number', 'truck_number', 'vehicle_number', 'truck_no'],
  invoice_ttl_weight_kgs: ['Invoice Ttl Weight (Kgs)', 'invoice_ttl_weight_kgs', 'invoice_total_weight_kgs', 'invoice_weight'],
  actual_mrr_ttl_weight_kgs: ['Actual MRR Ttl Weight (Kgs)', 'actual_mrr_ttl_weight_kgs', 'actual_total_weight_kgs', 'actual_weight'],
  required_reel: ['Required Reel', 'required_reel', 'required_reels'],
  rows_added: ['Rows Added', 'rows_added'],
  supplier: ['SUPPLIER', 'supplier'],
  invoice_basic_value: ['INVOICE BASIC VALUE', 'invoice_basic_value'],
  mrr_basic_value: ['MRR BASIC VALUE', 'mrr_basic_value']
};

const HELPER_SHEET_ALIASES = {
  s_no: ['S NO.', 's_no', 'sno'],
  mrr_number: ['MRR Number', 'mrr_number', 'mrr_no'],
  po_details: ['PO DETAILS', 'po_details'],
  po_no: ['PO NO.', 'po_no'],
  po_date: ['PO DATE', 'po_date'],
  supplier: ['SUPPLIER', 'supplier'],
  our_reel_number: ['Our Reel Number', 'our_reel_number', 'our_reel_no', 'reel_number', 'reel_no'],
  supplier_reel_no: ['Supplier Reel No.', 'supplier_reel_no', 'supplier_reel_number'],
  reel_details: ['REEL DETAILS', 'reel_details'],
  erp_code: ['ERP Code', 'erp_code'],
  size: ['Size', 'size'],
  gsm: ['GSM', 'gsm'],
  bf: ['BF', 'bf'],
  weight: ['Weight', 'weight', 'net_wt', 'net_weight'],
  rate: ['Rate', 'rate'],
  value: ['VALUE', 'value'],
  po_rate: ['PO RATE', 'po_rate'],
  date: ['Date', 'date'],
  dt_of_receipts: ['Dt of Receipts', 'dt_of_receipts', 'dt_of_receipt', 'receipt_date'],
  sup_doc_no: ['Sup Doc No.', 'sup_doc_no', 'supplier_doc_no']
};

/* -------------------------------------------------------------------------- */
/*                                GET Requests (Handles CORS and Queries)     */
/* -------------------------------------------------------------------------- */

function doGet(e) {
  try {
    const sheetName = String(e.parameter.sheet || '').trim();
    if (!sheetName) throw new Error('Sheet name is required for GET requests.');

    let ss;
    if (e.parameter.spreadsheetId) {
      ss = SpreadsheetApp.openById(e.parameter.spreadsheetId);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) throw new Error('Spreadsheet not bound. Provide "spreadsheetId" or use container-bound script.');

    const sheet = getSheetOrThrow_(ss, sheetName);
    
    // If frontend is verifying a write (checking MRR Number count)
    const mrrNumber = String(e.parameter.mrr_number || '').trim();
    if (mrrNumber) {
      let count = 0;
      let matchedRows = [];
      const headers = getHeaders_(sheet);
      const lastRow = sheet.getLastRow();
      
      if (lastRow >= 2 && headers.length > 0) {
        let keyIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_number);
        if (keyIndex === -1) keyIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.mrr_number);
        
        if (keyIndex !== -1) {
          const fullData = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
          const target = normalizeKey_(mrrNumber);
          for (let i = 0; i < fullData.length; i++) {
            if (normalizeKey_(fullData[i][keyIndex]) === target) {
              count++;
              const rowObj = {};
              headers.forEach((h, colIndex) => {
                 // Include both exact header name and normalized name for easy frontend access
                 rowObj[h] = fullData[i][colIndex];
                 rowObj[normalizeHeader_(h)] = fullData[i][colIndex];
              });
              matchedRows.push(rowObj);
            }
          }
        }
      }
      return jsonOutput_({ ok: true, count: count, values: matchedRows });
    }
    
    // Default GET behavior: Return the entire sheet data as a 2D array
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    let values = [];
    
    if (lastRow > 0 && lastCol > 0) {
      values = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
    }
    
    // We return it under the `values` property to match React frontend processing
    return jsonOutput_({ ok: true, values: values });

  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

/* -------------------------------------------------------------------------- */
/*                                POST Requests                               */
/* -------------------------------------------------------------------------- */

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const action = normalizeAction_(payload.action || 'save_packing');
    
    let ss;
    if (payload.spreadsheetId) {
      ss = SpreadsheetApp.openById(payload.spreadsheetId);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) {
      throw new Error('Spreadsheet not bound. Provide "spreadsheetId" in payload or deploy as container-bound script.');
    }

    const options = payload.options || {};
    const invoice = payload.invoice || {};
    const packing = payload.packing || {};
    const poRows = Array.isArray(payload.poRows) ? payload.poRows : [];

    const mrrSheet = getSheetOrThrow_(ss, String(options.mrrSheetName || DEFAULT_SHEETS.mrrForm).trim());
    const helperSheet = getSheetOrThrow_(ss, String(options.helperSheetName || DEFAULT_SHEETS.helper).trim());

    // Use LockService to prevent concurrent executions from overwriting each other
    const lock = LockService.getDocumentLock();
    // Wait for up to 20 seconds for other processes to finish
    lock.waitLock(20000);
    
    try {
      if (action === 'save_invoice') {
        const mrrRecord = buildMrrFormRecord_(invoice, packing, poRows, []);
        const mrrResult = upsertMrrFormRow_(mrrSheet, mrrRecord);
        return jsonOutput_({ ok: true, action: action, mrrForm: mrrResult });
      }

      // Default or "save_packing" action
      const helperRows = buildHelperRows_(invoice, packing, poRows);
      const mrrRecord = buildMrrFormRecord_(invoice, packing, poRows, helperRows);

      const helperResult = replaceHelperRows_(helperSheet, mrrRecord.mrr_number, helperRows);
      // Ensure we include updated helper info (like rows with serials) for MRR calculation if needed
      const mrrResult = upsertMrrFormRow_(mrrSheet, buildMrrFormRecord_(invoice, packing, poRows, helperResult.rowsWithSerial));

      return jsonOutput_({
        ok: true,
        action: action,
        helperSheet: helperResult,
        mrrForm: mrrResult
      });
    } finally {
      // Always release the lock!
      lock.releaseLock();
    }
  } catch (error) {
    return jsonOutput_({ ok: false, error: String(error) });
  }
}

/**
 * Builds the record object for the MRR Form.
 */
function buildMrrFormRecord_(invoice, packing, poRows, helperRows) {
  const rows = Array.isArray(helperRows) ? helperRows : [];
  const invoiceGoods = Array.isArray(invoice.goods) ? invoice.goods : [];
  
  const invoiceWeight = round2_(invoiceGoods.reduce((sum, row) => sum + n_(row.weight), 0));
  const invoiceReels = round2_(invoiceGoods.reduce((sum, row) => sum + n_(row.reels), 0));
  const grossAmount = round2_(invoiceGoods.reduce((sum, row) => sum + (n_(row.amount) || (n_(row.weight) * n_(row.rate))), 0));
  const taxableAmount = round2_(grossAmount + n_(invoice.totals && invoice.totals.insurance));
  const helperWeight = round2_(rows.reduce((sum, row) => sum + n_(row.weight), 0));
  const helperValue = round2_(rows.reduce((sum, row) => sum + n_(row.value), 0));

  const record = {};
  assignIfPresent_(record, 'ge_no', firstFilled_(invoice.ge_no, packing.ge_no));
  assignIfPresent_(record, 'date', firstFilled_(invoice.date, packing.date));
  assignIfPresent_(record, 'mrr_number', firstFilled_(invoice.mrr_no, packing.mrr_no));
  assignIfPresent_(record, 'dt_of_receipt', firstFilled_(invoice.receipt_date, packing.receipt_date));
  assignIfPresent_(record, 'sup_doc_no', firstFilled_(invoice.invoice_no, packing.challan_no));
  assignIfPresent_(record, 'truck_number', firstFilled_(invoice.vehicle_no, packing.truck_no));
  assignIfPresent_(record, 'invoice_ttl_weight_kgs', invoiceWeight, true);
  
  // Choose actual weight from available sources
  assignIfPresent_(record, 'actual_mrr_ttl_weight_kgs', round2_(firstFilled_(invoice.actual_weight, packing.actual_total, packing.total_weight, helperWeight)), true);
  assignIfPresent_(record, 'required_reel', firstFilled_(invoiceReels ? String(invoiceReels) : '', packing.total_reels, String(rows.length)));
  assignIfPresent_(record, 'rows_added', rows.length, true);
  assignIfPresent_(record, 'supplier', firstFilled_(packing.distributor, packing.buyer && packing.buyer.name_address, invoice.bill_to && invoice.bill_to.name_address));
  assignIfPresent_(record, 'invoice_basic_value', taxableAmount, true);
  assignIfPresent_(record, 'mrr_basic_value', helperValue, true);
  
  return record;
}

/**
 * Maps incoming items to helper sheet row data.
 */
function buildHelperRows_(invoice, packing, poRows) {
  const items = Array.isArray(packing.items) ? packing.items : [];
  const baseDate = firstFilled_(packing.date, invoice.date);
  const receiptDate = firstFilled_(packing.receipt_date, invoice.receipt_date);
  const supplierDocNo = firstFilled_(invoice.invoice_no, packing.challan_no);
  const mrrNumber = firstFilled_(packing.mrr_no, invoice.mrr_no);

  return items.filter(rowHasData_).map(function(row) {
    return {
      s_no: '',
      mrr_number: firstFilled_(row.mrr_no, mrrNumber),
      po_details: firstFilled_(row.po_details),
      po_no: firstFilled_(row.po_no, row.party_order),
      po_date: firstFilled_(packing.order_date, invoice.date),
      supplier: firstFilled_(packing.distributor, packing.buyer && packing.buyer.name_address),
      our_reel_number: firstFilled_(row.reel_no),
      supplier_reel_no: firstFilled_(row.supplier_reel_no),
      reel_details: firstFilled_(row.reel_details, row.item_name),
      erp_code: firstFilled_(row.erp_code),
      size: firstFilled_(row.size),
      gsm: firstFilled_(row.gsm),
      bf: firstFilled_(row.bf),
      weight: round2_(row.net_wt),
      rate: round2_(row.rate),
      value: round2_(n_(row.net_wt) * n_(row.rate)),
      po_rate: round2_(row.po_rate),
      date: baseDate,
      dt_of_receipts: receiptDate,
      sup_doc_no: supplierDocNo
    };
  });
}

/**
 * Efficiently deletes old rows for the given MRR, generates new serial numbers, and appends new rows.
 */
function replaceHelperRows_(sheet, mrrNumber, helperRows) {
  const headers = getHeaders_(sheet);
  if (!headers.length) throw new Error('HELPER SHEET is completely empty or missing headers.');
  
  const keyIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.mrr_number);
  if (keyIndex === -1) throw new Error('HELPER SHEET is missing MRR Number column.');

  const normalizedKey = normalizeKey_(mrrNumber);
  const lastRow = sheet.getLastRow();
  let deletedCount = 0;

  // Mass deletion logic for efficiency
  if (lastRow >= 2 && normalizedKey) {
    // Fetches entire column efficiently at once
    const values = sheet.getRange(2, keyIndex + 1, lastRow - 1, 1).getDisplayValues();
    
    // Process backwards to delete accurately without messing up row loop iteration numbers
    for (let i = values.length - 1; i >= 0; i--) {
      if (normalizeKey_(values[i][0]) === normalizedKey) {
        sheet.deleteRow(i + 2); // i is 0-indexed relative to row 2
        deletedCount++;
      }
    }
  }

  const nextSerial = getNextSerialNumber_(sheet, headers);
  const rowsWithSerial = helperRows.map(function(row, index) {
    return Object.assign({}, row, { s_no: nextSerial + index });
  });

  if (!rowsWithSerial.length) {
    return { deletedRows: deletedCount, insertedRows: 0, rowsWithSerial: [] };
  }

  // Precompile reverse map for highly optimized header mapping
  const aliasReverseMap = buildReverseAliasMap_(HELPER_SHEET_ALIASES);
  const headerKeys = headers.map(h => aliasReverseMap[normalizeHeader_(h)]);

  const values = rowsWithSerial.map(function(row) {
    return buildNewRowValuesOptimized_(headerKeys, row);
  });

  // Append everything efficiently in a single bulk operation
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  
  return { deletedRows: deletedCount, insertedRows: values.length, rowsWithSerial: rowsWithSerial };
}

/**
 * Searches and updates, or inserts if not found.
 */
function upsertMrrFormRow_(sheet, record) {
  const mrrNumber = record.mrr_number;
  if (!String(mrrNumber || '').trim()) throw new Error('MRR Number is required to upsert form.');

  const headers = getHeaders_(sheet);
  if (!headers.length) throw new Error('MRR FORM is completely empty or missing headers.');
  
  const keyIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_number);
  if (keyIndex === -1) throw new Error('MRR FORM is missing MRR Number column.');

  const existingRowNumber = findRowNumberByKey_(sheet, keyIndex, mrrNumber);
  const aliasReverseMap = buildReverseAliasMap_(MRR_FORM_ALIASES);
  const headerKeys = headers.map(h => aliasReverseMap[normalizeHeader_(h)]);

  if (existingRowNumber > 0) {
    const existingValues = sheet.getRange(existingRowNumber, 1, 1, headers.length).getValues()[0];
    const merged = mergeExistingRowValuesOptimized_(headerKeys, existingValues, record);
    sheet.getRange(existingRowNumber, 1, 1, headers.length).setValues([merged]);
    return { updatedRows: 1, insertedRows: 0, rowNumber: existingRowNumber };
  }

  const newRow = buildNewRowValuesOptimized_(headerKeys, record);
  const rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([newRow]);
  return { updatedRows: 0, insertedRows: 1, rowNumber: rowNumber };
}

/* -------------------------------------------------------------------------- */
/*                               Data Retrievals                              */
/* -------------------------------------------------------------------------- */

function parseRequestBody_(e) {
  if (!e) return {};

  // Support for `application/x-www-form-urlencoded` payloads where Apps Script correctly maps it to e.parameter
  // (Crucial for `sendBeacon` & hidden iframe form submissions)
  if (e.parameter && e.parameter.payload) {
    try {
      return JSON.parse(e.parameter.payload);
    } catch (err) { }
  }

  // Support for raw JSON body injections or other unparsed formats 
  if (e.postData && e.postData.contents) {
    const text = e.postData.contents;
    try {
      return JSON.parse(text);
    } catch (error) {
      if (/^payload=/.test(text)) {
        try {
            return JSON.parse(decodeURIComponent(String(text).replace(/^payload=/, '').replace(/\+/g, '%20')));
        } catch (err) { }
      }
    }
  }

  return {};
}

function getSheetOrThrow_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  return sheet;
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return []; // Guard against completely blank sheet
  return sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
}

/* -------------------------------------------------------------------------- */
/*                         Optimization & Data Mapping                        */
/* -------------------------------------------------------------------------- */

function buildReverseAliasMap_(aliases) {
  const map = {};
  for (const field in aliases) {
    if (Object.prototype.hasOwnProperty.call(aliases, field)) {
      aliases[field].forEach(alias => {
        map[normalizeHeader_(alias)] = field;
      });
    }
  }
  return map;
}

function findColumnIndex_(headers, aliasList) {
  const normalizedAliases = (aliasList || []).map(normalizeHeader_);
  for (let i = 0; i < headers.length; i += 1) {
    if (normalizedAliases.indexOf(normalizeHeader_(headers[i])) !== -1) return i;
  }
  return -1;
}

function buildNewRowValuesOptimized_(headerKeys, record) {
  return headerKeys.map(key => key ? safeSheetValue_(record[key]) : '');
}

function mergeExistingRowValuesOptimized_(headerKeys, existingValues, record) {
  return headerKeys.map((key, index) => {
    return key && record[key] !== undefined ? record[key] : existingValues[index];
  });
}

function getNextSerialNumber_(sheet, headers) {
  const serialIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.s_no);
  const lastRow = sheet.getLastRow();
  if (serialIndex === -1 || lastRow < 2) return 1;
  
  // Fetch values in a single batch API call
  const values = sheet.getRange(2, serialIndex + 1, lastRow - 1, 1).getDisplayValues();
  let maxValue = 0;
  for (let i = 0; i < values.length; i++) {
    const num = Number(values[i][0]);
    if (!isNaN(num) && num > maxValue) maxValue = num;
  }
  return maxValue + 1;
}

function findRowNumberByKey_(sheet, keyIndex, targetValue) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  
  const values = sheet.getRange(2, keyIndex + 1, lastRow - 1, 1).getDisplayValues();
  const target = normalizeKey_(targetValue);
  for (let i = 0; i < values.length; i += 1) {
    if (normalizeKey_(values[i][0]) === target) return i + 2;
  }
  return -1;
}

/* -------------------------------------------------------------------------- */
/*                              Helper Utilities                              */
/* -------------------------------------------------------------------------- */

function normalizeAction_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeKey_(value) {
  return String(value || '').trim().toLowerCase();
}

function firstFilled_() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function assignIfPresent_(target, key, value, allowZero) {
  if (value === undefined || value === null) return;
  if (!allowZero && String(value).trim() === '') return;
  target[key] = value;
}

function rowHasData_(row) {
  return Object.keys(row || {}).some(function(key) {
    return String(row[key] || '').trim() !== '';
  });
}

function n_(value) {
  return Number(value) || 0;
}

function round2_(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function safeSheetValue_(value) {
  return value === undefined || value === null ? '' : value;
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

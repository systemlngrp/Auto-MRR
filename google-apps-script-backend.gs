/**
 * Configuration for Sheet Names
 */
const DEFAULT_SHEETS = {
  poDetails: 'PO DETAILS',
  mrrForm: 'MRR FORM',
  helper: 'HELPER SHEET',
  users: 'Users'
};

/**
 * Field Aliases for mapping JSON payload keys to Sheet Headers
 */
const MRR_FORM_ALIASES = {
  ge_no: ['G. E. No.', 'GE No', 'g_e_no', 'ge_no'],
  date: ['Date', 'date'],
  mrr_number: ['MRR Number', 'MRR No', 'mrr_number', 'mrr_no'],
  dt_of_receipt: ['Dt. of Receipt', 'Dt of Receipt', 'dt_of_receipt', 'dt_of_receipts', 'receipt_date'],
  sup_doc_no: ['Sup Doc No.', 'Sup Doc No', 'sup_doc_no', 'supplier_doc_no'],
  truck_number: ['Truck Number', 'Truck No', 'truck_number', 'vehicle_number', 'truck_no'],
  invoice_ttl_weight_kgs: ['Invoice Ttl Weight (Kgs)', 'Invoice Total Weight', 'invoice_ttl_weight_kgs', 'invoice_total_weight_kgs', 'invoice_weight'],
  actual_mrr_ttl_weight_kgs: ['Actual MRR Ttl Weight (Kgs)', 'Actual Total Weight', 'actual_mrr_ttl_weight_kgs', 'actual_total_weight_kgs', 'actual_weight', 'actual_mrr_weight'],
  required_reel: ['Required Reel', 'Required Reels', 'required_reel', 'required_reels'],
  rows_added: ['Rows Added', 'rows_added'],
  supplier: ['SUPPLIER', 'supplier'],
  invoice_basic_value: ['INVOICE BASIC VALUE', 'Invoice Basic Value', 'invoice_basic_value'],
  mrr_basic_value: ['MRR BASIC VALUE', 'MRR Basic Value', 'mrr_basic_value'],
  e_way_bill_no: ['E-Way Bill No.', 'Eway Bill No.', 'eway_bill_no', 'e_way_bill_no', 'eway_no'],
  e_way_date: ['E-Way Date', 'Eway Date', 'eway_date', 'e_way_date'],
  l_r_no: ['L.R No.', 'LR No.', 'L R No.', 'l_r_no', 'lr_no'],
  accounts_approval_timestamp: ['Accounts Approval Timestamp', 'accounts_approval_timestamp'],
  accounts_approval_useremail: ['Accounts Approval Useremail', 'accounts_approval_useremail'],
  md_approval_timestamp: ['MD Approval Timestamp', 'md_approval_timestamp'],
  md_approval_useremail: ['MD Approval Useremail', 'md_approval_useremail'],
  pending_tally_posting_timestamp: ['Pending Tally Posting Timestamp', 'Pending Tally Posting Timesyamp', 'pending_tally_posting_timestamp'],
  pending_tally_posting_useremail: ['Pending Tally Posting Useremail', 'pending_tally_posting_useremail']
};

const HELPER_SHEET_ALIASES = {
  's_no': ['S NO.', 'S.No.', 'S No', 'Serial No', 'S No.', 'S. No.', 's_no'],
  'mrr_number': ['MRR Number', 'MRR No', 'MRR No.', 'mrr_number', 'MRR_NO', 'MRR NO.'],
  'po_details': ['PO DETAILS', 'PO Details', 'po_details'],
  'po_no': ['PO NO.', 'PO No', 'po_no', 'PO Number'],
  'po_date': ['PO DATE', 'PO Date', 'Date', 'po_date'],
  'supplier': ['SUPPLIER', 'Supplier', 'supplier'],
  'our_reel_number': ['Our Reel Number', 'Reel No', 'Our Reel No.', 'reel_no'],
  'supplier_reel_no': ['Supplier Reel No.', 'Supplier Reel No', 'supplier_reel_no'],
  'reel_details': ['Reel Details', 'reel_details', 'Item Description'],
  'erp_code': ['ERP Code', 'erp_code'],
  'size': ['Size', 'size'],
  'gsm': ['GSM', 'gsm'],
  'bf': ['BF', 'bf'],
  'weight': ['Weight', 'Weight(Kgs.)', 'weight'],
  'rate': ['Rate', 'rate'],
  'value': ['VALUE', 'Value', 'value'],
  'po_rate': ['PO RATE', 'PO Rate', 'po_rate'],
  'date': ['Date', 'date'],
  'dt_of_receipts': ['Dt of Receipts', 'DT OF RECEIPTS', 'Dt of Receipt', 'dt_of_receipts'],
  'sup_doc_no': ['Sup Doc No.', 'SUP DOC NO.', 'Sup Doc No', 'Invoice No', 'sup_doc_no', ' Sup Doc No.'],
  'accounts_approval_timestamp': ['Accounts Approval Timestamp', 'accounts_approval_timestamp'],
  'accounts_approval_useremail': ['Accounts Approval Useremail', 'accounts_approval_useremail'],
  'md_approval_timestamp': ['MD Approval Timestamp', 'md_approval_timestamp'],
  'md_approval_useremail': ['MD Approval Useremail', 'md_approval_useremail'],
  'pending_tally_posting_timestamp': ['Pending Tally Posting Timestamp', 'Pending Tally Posting Timesyamp', 'pending_tally_posting_timestamp'],
  'pending_tally_posting_useremail': ['Pending Tally Posting Useremail', 'pending_tally_posting_useremail']
};

const GE_ENTRY_ALIASES = {
  timestamp: ['Timestamp', 'timestamp'],
  date: ['Date', 'date'],
  ge_no: ['GE Entry', 'GE No', 'ge_no'],
  supplier: ['Supplier Name', 'Supplier', 'supplier'],
  invoice_no: ['Invoice No', 'Invoice No.', 'invoice_no'],
  total_value: ['Total Invocie Value', 'Total Value', 'total_value'],
  truck_no: ['Truck No', 'Truck No.', 'Vehicle No', 'truck_no'],
  pic1: ['Pic 1', 'pic1'],
  pic2: ['Pic 2', 'pic2'],
  pic3: ['Pic 3', 'pic3'],
  pic4: ['Pic 4', 'pic4'],
  pic5: ['Pic 5', 'pic5'],
  pic6: ['Pic 6', 'pic6'],
  pic7: ['Pic 7', 'pic7'],
  pic8: ['Pic 8', 'pic8'],
  mrr_no: ['MRR', 'mrr_no', 'MRR No']
};

/* -------------------------------------------------------------------------- */
/*                                GET Requests (Handles CORS and Queries)     */
/* -------------------------------------------------------------------------- */

function doGet(e) {
  try {
    const action = String(e.parameter.action || '').toLowerCase();
    let ss;
    if (e.parameter.spreadsheetId) {
      ss = SpreadsheetApp.openById(String(e.parameter.spreadsheetId).trim());
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) throw new Error('Spreadsheet not bound. Provide "spreadsheetId" or use container-bound script.');

    if (action === 'authenticate_user') {
      const loginId = String(e.parameter.login_id || e.parameter.email || e.parameter.user || '').trim();
      const password = String(e.parameter.password || '').trim();
      const user = authenticateUser_(ss, loginId, password);
      if (!user) return jsonOutput_({ ok: false, error: 'Invalid user ID or password.' });
      return jsonOutput_({ ok: true, user: user });
    }

    if (action === 'approve_pending_stage') {
      const stage = String(e.parameter.stage || '').trim().toLowerCase();
      const mrrNumber = String(e.parameter.mrr_number || '').trim();
      const userEmail = String(e.parameter.user_email || '').trim();
      const mrrSheetName = String(e.parameter.mrrSheet || DEFAULT_SHEETS.mrrForm).trim();
      const helperSheetName = String(e.parameter.helperSheet || DEFAULT_SHEETS.helper).trim();
      const result = approvePendingStage_(ss, {
        stage: stage,
        mrrNumber: mrrNumber,
        userEmail: userEmail,
        mrrSheetName: mrrSheetName,
        helperSheetName: helperSheetName
      });
      return jsonOutput_(Object.assign({ ok: true }, result));
    }

    // Custom action to get the last MRR and GE numbers for auto-incrementing
    if (action === 'get_latest_ids') {
      const mrrSheetName = String(e.parameter.mrrSheet || e.parameter.sheet || DEFAULT_SHEETS.mrrForm).trim();
      const geSheetName = String(e.parameter.geSheet || 'GE ENTRY').trim();
      const prefix = String(e.parameter.prefix || '').trim().toUpperCase();
      const mrrSheet = getSheetOrThrow_(ss, mrrSheetName);
      const geSheet = getSheetOrThrow_(ss, geSheetName);
      const mrrHeaders = getHeaders_(mrrSheet);
      const geHeaders = getHeaders_(geSheet);
      const mrrLastRow = mrrSheet.getLastRow();
      const geLastRow = geSheet.getLastRow();
      
      let lastMrr = 0;
      let lastGe = 0;
      let lastGeText = '';
      
      if (mrrLastRow >= 2) {
        const mrrIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.mrr_number);
        if (mrrIndex !== -1) {
          const mrrValues = mrrSheet.getRange(2, mrrIndex + 1, mrrLastRow - 1, 1).getDisplayValues().flat();
          for (let i = mrrValues.length - 1; i >= 0; i--) {
            const val = String(mrrValues[i]).trim().toUpperCase();
            if (!val) continue;
            if (prefix && val.indexOf(prefix + '/') !== 0 && val.indexOf(prefix) !== 0) continue;
            const seq = extractSequenceNumber_(val);
            if (seq > lastMrr) lastMrr = seq;
          }
        } else {
          // Fallback: infer from formatted IDs if header alias doesn't match exactly.
          const values = mrrSheet.getRange(2, 1, mrrLastRow - 1, mrrHeaders.length).getDisplayValues();
          for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values[i].length; j++) {
              const text = String(values[i][j] || '').trim().toUpperCase();
              if (text.split('/').length < 3) continue;
              if (prefix && text.indexOf(prefix + '/') !== 0 && text.indexOf(prefix) !== 0) continue;
              const seq = extractSequenceNumber_(text);
              if (seq > lastMrr) lastMrr = seq;
            }
          }
        }
      }

      // Extra fallback: if MRR FORM has no usable MRR yet, inspect GE ENTRY MRR column.
      if (lastMrr === 0 && geLastRow >= 2) {
        const geMrrIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.mrr_no);
        if (geMrrIndex !== -1) {
          const geMrrValues = geSheet.getRange(2, geMrrIndex + 1, geLastRow - 1, 1).getDisplayValues().flat();
          for (let i = 0; i < geMrrValues.length; i++) {
            const val = String(geMrrValues[i] || '').trim().toUpperCase();
            if (!val) continue;
            if (prefix && val.indexOf(prefix + '/') !== 0 && val.indexOf(prefix) !== 0) continue;
            const seq = extractSequenceNumber_(val);
            if (seq > lastMrr) lastMrr = seq;
          }
        }
      }

      if (geLastRow >= 2) {
        let geIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.ge_no);
        if (geIndex === -1) geIndex = findColumnIndex_(geHeaders, MRR_FORM_ALIASES.ge_no);
        if (geIndex !== -1) {
          const geValues = geSheet.getRange(2, geIndex + 1, geLastRow - 1, 1).getDisplayValues().flat();
          if (prefix) {
            // Find max sequence specifically for this prefix.
            let maxInPrefix = 0;
            for (let i = 0; i < geValues.length; i++) {
              const val = String(geValues[i]).trim().toUpperCase();
              if (val.indexOf(prefix) === 0) {
                const seq = extractSequenceNumber_(val);
                if (seq > maxInPrefix) maxInPrefix = seq;
              }
            }
            lastGe = maxInPrefix;
            lastGeText = lastGe > 0 ? prefix + Utilities.formatString('%04d', lastGe) : '';
          } else {
            for (let i = geValues.length - 1; i >= 0; i--) {
              const val = String(geValues[i]).trim();
              if (val) {
                lastGeText = val;
                lastGe = extractSequenceNumber_(val);
                if (lastGe > 0) break;
              }
            }
          }
        } else {
          // Fallback: infer from formatted IDs if GE header alias doesn't match exactly.
          const values = geSheet.getRange(2, 1, geLastRow - 1, geHeaders.length).getDisplayValues();
          for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values[i].length; j++) {
              const text = String(values[i][j] || '').trim().toUpperCase();
              if (text.split('/').length < 3) continue;
              if (prefix && text.indexOf(prefix) !== 0) continue;
              const seq = extractSequenceNumber_(text);
              if (seq > lastGe) {
                lastGe = seq;
                lastGeText = text;
              }
            }
          }
        }
      }
      
      return jsonOutput_({ ok: true, mrr: lastMrr, ge: lastGe, ge_text: lastGeText });
    }

    // If frontend is verifying a write (checking MRR Number count)
    const mrrNumber = String(e.parameter.mrr_number || '').trim();
    if (mrrNumber) {
      const sheetName = String(e.parameter.sheet || '').trim();
      const sheet = getSheetOrThrow_(ss, sheetName);
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

    // Custom action to get unique suppliers from PO DETAILS
    if (action === 'get_suppliers') {
      const poSheet = getSheetOrThrow_(ss, DEFAULT_SHEETS.poDetails);
      const headers = getHeaders_(poSheet);
      const lastRow = poSheet.getLastRow();
      
      if (lastRow < 2) return jsonOutput_({ ok: true, values: [] });
      
      const supplierIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.supplier);
      if (supplierIndex === -1) return jsonOutput_({ ok: true, values: [] });
      
      const values = poSheet.getRange(2, supplierIndex + 1, lastRow - 1, 1).getDisplayValues().flat();
      const uniqueSuppliers = [...new Set(values.map(v => String(v).trim()).filter(v => v !== ''))].sort();
      
      return jsonOutput_({ ok: true, values: uniqueSuppliers });
    }
    
    // Custom action to get pending MRR / approval / tally items
    if (action === 'get_pending_ge') {
      const result = [];
      const geSheetName = 'GE ENTRY';
      const geSheet = getSheetOrThrow_(ss, geSheetName);
      const geHeaders = getHeaders_(geSheet);
      const lastGeRow = geSheet.getLastRow();
      const mrrSheetName = String(e.parameter.mrrSheet || DEFAULT_SHEETS.mrrForm).trim();
      const mrrSheet = mrrSheetName ? getSheetOrThrow_(ss, mrrSheetName) : null;
      const mrrHeaders = mrrSheet ? getHeaders_(mrrSheet) : [];
      const lastMrrRow = mrrSheet ? mrrSheet.getLastRow() : 0;
      const existingMrrSet = {};
      const existingGeSet = {};

      if (mrrSheet && lastMrrRow >= 2 && mrrHeaders.length > 0) {
        const mrrDataAll = mrrSheet.getRange(2, 1, lastMrrRow - 1, mrrHeaders.length).getDisplayValues();
        const mrrKeyIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.mrr_number);
        const mrrGeIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.ge_no);

        for (let i = 0; i < mrrDataAll.length; i++) {
          if (mrrKeyIndex !== -1) {
            const mrrVal = normalizeKey_(mrrDataAll[i][mrrKeyIndex]);
            if (mrrVal) existingMrrSet[mrrVal] = true;
          }
          if (mrrGeIndex !== -1) {
            const geVal = normalizeKey_(mrrDataAll[i][mrrGeIndex]);
            if (geVal) existingGeSet[geVal] = true;
          }
        }
      }

      if (lastGeRow >= 2) {
        const geData = geSheet.getRange(2, 1, lastGeRow - 1, geHeaders.length).getDisplayValues();
        const mrrColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.mrr_no);
        const geColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.ge_no);

        geData.forEach(function(row) {
          const mrrVal = mrrColIndex === -1 ? '' : String(row[mrrColIndex]).trim();
          const geVal = geColIndex === -1 ? '' : String(row[geColIndex]).trim();
          if (!mrrVal && !geVal) return;
          const mrrExistsInMrrForm = !!existingMrrSet[normalizeKey_(mrrVal)];
          const geExistsInMrrForm = !!existingGeSet[normalizeKey_(geVal)];
          // Pending MRR should include only GE rows not yet reflected in MRR FORM
          if (mrrExistsInMrrForm || geExistsInMrrForm) return;

          const obj = {
            pending_stage: 'pending_mrr',
            pending_label: 'Pending MRR',
            sort_order: 1
          };

          for (const key in GE_ENTRY_ALIASES) {
            const idx = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES[key]);
            if (idx !== -1) obj[key] = row[idx];
          }
          geHeaders.forEach((h, i) => {
            const normalized = normalizeHeader_(h);
            if (!(normalized in obj)) obj[normalized] = row[i];
          });
          result.push(obj);
        });
      }

      if (mrrSheet && lastMrrRow >= 2 && mrrHeaders.length > 0) {
          const mrrData = mrrSheet.getRange(2, 1, lastMrrRow - 1, mrrHeaders.length).getDisplayValues();
          const mrrIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.mrr_number);
          const geIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.ge_no);
          const dateIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.date);
          const supplierIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.supplier);
          const docIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.sup_doc_no);
          const truckIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.truck_number);
          const accountsApprovalIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.accounts_approval_timestamp);
          const mdApprovalIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.md_approval_timestamp);
          const tallyIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.pending_tally_posting_timestamp);

          mrrData.forEach(function(row) {
            const mrrNumber = mrrIndex === -1 ? '' : String(row[mrrIndex]).trim();
            if (!mrrNumber) return;

            const accountsApproval = accountsApprovalIndex === -1 ? '' : String(row[accountsApprovalIndex]).trim();
            const mdApproval = mdApprovalIndex === -1 ? '' : String(row[mdApprovalIndex]).trim();
            const tallyPosting = tallyIndex === -1 ? '' : String(row[tallyIndex]).trim();

            let pendingStage = '';
            let pendingLabel = '';
            let sortOrder = 99;

            if (!accountsApproval) {
              pendingStage = 'pending_accounts_approval';
              pendingLabel = 'Pending Accounts Approval';
              sortOrder = 2;
            } else if (!mdApproval) {
              pendingStage = 'pending_md_approval';
              pendingLabel = 'Pending MD Approval';
              sortOrder = 3;
            } else if (!tallyPosting) {
              pendingStage = 'pending_tally_posting';
              pendingLabel = 'Pending Tally Posting';
              sortOrder = 4;
            } else {
              return;
            }

            const obj = {
              pending_stage: pendingStage,
              pending_label: pendingLabel,
              sort_order: sortOrder,
              ge_no: geIndex === -1 ? '' : row[geIndex],
              date: dateIndex === -1 ? '' : row[dateIndex],
              mrr_number: mrrNumber,
              supplier: supplierIndex === -1 ? '' : row[supplierIndex],
              invoice_no: docIndex === -1 ? '' : row[docIndex],
              truck_no: truckIndex === -1 ? '' : row[truckIndex],
              accounts_approval_timestamp: accountsApproval,
              md_approval_timestamp: mdApproval,
              pending_tally_posting_timestamp: tallyPosting
            };

            mrrHeaders.forEach((h, i) => {
              const normalized = normalizeHeader_(h);
              if (!(normalized in obj)) obj[normalized] = row[i];
            });
            result.push(obj);
          });
      }

      result.sort(function(a, b) {
        const orderA = Number(a.sort_order || 99);
        const orderB = Number(b.sort_order || 99);
        if (orderA !== orderB) return orderA - orderB;
        return String(b.date || '').localeCompare(String(a.date || ''));
      });

      return jsonOutput_({ ok: true, values: result });
    }

    if (action === 'verify_ge') {
      const geSheetName = 'GE ENTRY';
      const geSheet = getSheetOrThrow_(ss, geSheetName);
      const geHeaders = getHeaders_(geSheet);
      const lastGeRow = geSheet.getLastRow();
      const invoiceNo = String(e.parameter.invoice_no || '').trim().toLowerCase();
      const supplier = String(e.parameter.supplier || '').trim().toLowerCase();

      if (lastGeRow >= 2 && invoiceNo) {
        const invColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.invoice_no);
        const supColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.supplier);
        const geColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.ge_no);
        const mrrColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.mrr_no);

        if (invColIndex !== -1 && geColIndex !== -1) {
          const geData = geSheet.getRange(2, 1, lastGeRow - 1, geHeaders.length).getDisplayValues();
          for (let i = geData.length - 1; i >= 0; i--) {
            const rowInv = String(geData[i][invColIndex]).trim().toLowerCase();
            const rowSup = supColIndex !== -1 ? String(geData[i][supColIndex]).trim().toLowerCase() : '';
            if (rowInv === invoiceNo && (!supplier || rowSup.includes(supplier) || supplier.includes(rowSup))) {
              return jsonOutput_({
                ok: true,
                ge_no: geData[i][geColIndex],
                mrr_no: mrrColIndex === -1 ? '' : geData[i][mrrColIndex]
              });
            }
          }
        }
      }
      return jsonOutput_({ ok: false });
    }

    // Default GET behavior: Return the entire sheet data as a 2D array
    const sheetName = String(e.parameter.sheet || '').trim();
    if (!sheetName) throw new Error('Sheet name is required for default GET requests.');
    const sheet = getSheetOrThrow_(ss, sheetName);
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
      ss = SpreadsheetApp.openById(String(payload.spreadsheetId).trim());
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

    let mrrSheet = null;
    let helperSheet = null;
    if (action !== 'save_ge_entry') {
      mrrSheet = getSheetOrThrow_(ss, String(options.mrrSheetName || DEFAULT_SHEETS.mrrForm).trim());
      helperSheet = getSheetOrThrow_(ss, String(options.helperSheetName || DEFAULT_SHEETS.helper).trim());
    }

    // Use LockService to prevent concurrent executions from overwriting each other
    const lock = LockService.getDocumentLock();
    // Wait for up to 20 seconds for other processes to finish
    lock.waitLock(20000);
    
    try {
      if (action === 'save_ge_entry') {
        const geResult = saveGeEntryRow_(ss, payload.geEntry || {});
        return jsonOutput_({ ok: true, action: action, geEntry: geResult });
      }

      if (action === 'save_invoice') {
        const mrrRecord = buildMrrFormRecord_(invoice, packing, poRows, []);
        const mrrResult = upsertMrrFormRow_(mrrSheet, mrrRecord);
        updateGeEntryWithMrr_(ss, mrrRecord.ge_no, mrrRecord.mrr_number);
        return jsonOutput_({ ok: true, action: action, mrrForm: mrrResult });
      }

      // Default or "save_packing" action
      const helperRows = buildHelperRows_(invoice, packing, poRows);
      const mrrRecord = buildMrrFormRecord_(invoice, packing, poRows, helperRows);

      // 1) Upsert parent first so we never end with child-only rows.
      const initialMrrResult = upsertMrrFormRow_(mrrSheet, mrrRecord);

      // 2) Replace child/helper rows.
      const helperResult = replaceHelperRows_(helperSheet, mrrRecord.mrr_number, helperRows);

      // 3) Refresh parent once more using final helper rows (serials/derived values), if available.
      let mrrResult = initialMrrResult;
      try {
        mrrResult = upsertMrrFormRow_(mrrSheet, buildMrrFormRecord_(invoice, packing, poRows, helperResult.rowsWithSerial));
      } catch (mrrRefreshError) {
        // Parent already exists from step 1; keep flow successful to avoid child-only state.
      }

      updateGeEntryWithMrr_(ss, mrrRecord.ge_no, mrrRecord.mrr_number);

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
  const packingItems = Array.isArray(packing.items) ? packing.items : [];
  const todayReceiptDate = formatDateForSheet_(new Date());
  
  const invoiceWeight = round2_(invoiceGoods.reduce((sum, row) => sum + n_(row.weight), 0));
  const invoiceReels = round2_(invoiceGoods.reduce((sum, row) => sum + n_(row.reels), 0));
  const grossAmount = round2_(invoiceGoods.reduce((sum, row) => sum + (n_(row.amount) || (n_(row.weight) * n_(row.rate))), 0));
  const helperWeight = round2_(rows.reduce((sum, row) => sum + n_(row.weight), 0));
  const helperValue = round2_(rows.reduce((sum, row) => sum + n_(row.value), 0));
  const packingBasicValue = round2_(packingItems.reduce((sum, row) => sum + (n_(row.rate) * n_(row.net_wt || row.weight)), 0));

  const record = {};
  assignIfPresent_(record, 'ge_no', firstFilled_(invoice.ge_no, packing.ge_no));
  assignIfPresent_(record, 'date', firstFilled_(invoice.date, packing.date));
  assignIfPresent_(record, 'mrr_number', firstFilled_(invoice.mrr_no, packing.mrr_no));
  assignIfPresent_(record, 'dt_of_receipt', todayReceiptDate);
  assignIfPresent_(record, 'sup_doc_no', firstFilled_(invoice.invoice_no, packing.challan_no));
  assignIfPresent_(record, 'truck_number', firstFilled_(invoice.vehicle_no, packing.truck_no));
  assignIfPresent_(record, 'invoice_ttl_weight_kgs', invoiceWeight, true);
  
  // Choose actual weight from available sources
  assignIfPresent_(record, 'actual_mrr_ttl_weight_kgs', round2_(firstFilled_(invoice.actual_weight, packing.actual_total, packing.total_weight, helperWeight)), true);
  assignIfPresent_(record, 'required_reel', firstFilled_(invoiceReels ? String(invoiceReels) : '', packing.total_reels, String(rows.length)));
  assignIfPresent_(record, 'rows_added', rows.length, true);
  assignIfPresent_(record, 'supplier', firstFilled_(packing.buyer && packing.buyer.name_address, invoice.bill_to && invoice.bill_to.name_address));
  // INVOICE BASIC VALUE = sum of amount of MRR reels (invoice goods amount)
  assignIfPresent_(record, 'invoice_basic_value', grossAmount, true);
  // MRR BASIC VALUE = sum of rate * net weight from packing slip rows
  assignIfPresent_(record, 'mrr_basic_value', packingBasicValue, true);
  assignIfPresent_(record, 'e_way_bill_no', firstFilled_(invoice.eway_no));
  assignIfPresent_(record, 'e_way_date', firstFilled_(invoice.eway_date));
  assignIfPresent_(record, 'l_r_no', firstFilled_(invoice.lr_no, packing.lr_no));
  
  return record;
}

/**
 * Maps incoming items to helper sheet row data.
 */
function buildHelperRows_(invoice, packing, poRows) {
  const baseDate = firstFilled_(packing.date, invoice.date);
  const receiptDate = formatDateForSheet_(new Date());
  const supplierDocNo = firstFilled_(invoice.invoice_no, packing.challan_no);
  const mrrNumber = firstFilled_(packing.mrr_no, invoice.mrr_no);
  const supplierName = firstFilled_(packing.buyer && packing.buyer.name_address, invoice.bill_to && invoice.bill_to.name_address);

  // Heuristic: Use packing.items if it has meaningful data, otherwise invoice.goods
  const packingItems = Array.isArray(packing.items) ? packing.items.filter(rowHasData_) : [];
  const invoiceGoods = Array.isArray(invoice.goods) ? invoice.goods.filter(rowHasData_) : [];
  
  const items = (packingItems.length > 0) ? packingItems : invoiceGoods;

  return items.map(function(row, index) {
    const poNo = firstFilled_(row.po_no, row.party_order);
    return {
      s_no: '',
      mrr_number: firstFilled_(row.mrr_no, mrrNumber),
      po_details: firstFilled_(row.po_details),
      po_no: poNo,
      po_date: firstFilled_(packing.order_date, invoice.date),
      supplier: firstFilled_(row.supplier, supplierName),
      our_reel_number: firstFilled_(row.reel_no, row.reels),
      supplier_reel_no: firstFilled_(row.supplier_reel_no),
      reel_details: firstFilled_(row.reel_details, row.item_name, row.description),
      erp_code: firstFilled_(row.erp_code),
      size: firstFilled_(row.size),
      gsm: firstFilled_(row.gsm),
      bf: firstFilled_(row.bf),
      weight: round2_(row.net_wt || row.weight),
      rate: round2_(row.rate),
      value: round2_(n_(row.net_wt || row.weight) * n_(row.rate)),
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
  const existingRows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];

  const keptRows = [];
  let deletedCount = 0;
  for (let i = 0; i < existingRows.length; i++) {
    if (normalizeKey_(existingRows[i][keyIndex]) === normalizedKey) {
      deletedCount++;
    } else {
      keptRows.push(existingRows[i]);
    }
  }

  const serialIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.s_no);
  let maxSerial = 0;
  if (serialIndex !== -1) {
    for (let i = 0; i < keptRows.length; i++) {
      const n = Number(keptRows[i][serialIndex]);
      if (!isNaN(n) && n > maxSerial) maxSerial = n;
    }
  }
  const nextSerial = maxSerial + 1;

  const rowsWithSerial = helperRows.map(function(row, index) {
    return Object.assign({}, row, { s_no: nextSerial + index });
  });

  // Precompile reverse map for highly optimized header mapping
  const aliasReverseMap = buildReverseAliasMap_(HELPER_SHEET_ALIASES);
  const headerKeys = headers.map(h => aliasReverseMap[normalizeHeader_(h)]);
  const insertedRows = rowsWithSerial.map(function(row) {
    return buildRowValuesFromHeaderKeys_(headerKeys, row);
  });

  const finalRows = keptRows.concat(insertedRows);

  // Clear existing body once, then rewrite in one batch.
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  if (finalRows.length) {
    sheet.getRange(2, 1, finalRows.length, headers.length).setValues(finalRows);
  }

  return { deletedRows: deletedCount, insertedRows: insertedRows.length, rowsWithSerial: rowsWithSerial };
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

  const newRow = buildRowValuesFromHeaderKeys_(headerKeys, record);
  const rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([newRow]);
  return { updatedRows: 0, insertedRows: 1, rowNumber: rowNumber };
}

/**
 * Saves a new Gate Entry row or updates an existing one.
 */
function saveGeEntryRow_(ss, data) {
  const geSheetName = 'GE ENTRY';
  const sheet = getSheetOrThrow_(ss, geSheetName);
  const headers = getHeaders_(sheet);
  
  if (!headers.length) throw new Error('GE ENTRY sheet is empty or missing headers.');
  
  const record = Object.assign({}, data);
  if (!record.timestamp) record.timestamp = new Date().toLocaleString();
  if (!record.date) record.date = new Date().toLocaleDateString();
  const firmCode = normalizeFirmCode_(record.firm_code || ss.getName());
  
  // Save photos to Drive and replace base64 with URLs
  const folderName = "GateEntry_Photos_" + ss.getName().replace(/[^a-zA-Z0-9]/g, '_');
  for (let i = 1; i <= 8; i++) {
    const key = 'pic' + i;
    if (record[key] && record[key].indexOf('data:') === 0) {
      const fileName = 'GE_' + (record.ge_no || 'pending') + '_Pic' + i + '_' + (new Date().getTime()) + '.jpg';
      record[key] = saveBase64ToDrive_(record[key], fileName, folderName);
    }
  }
  
  const geIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.ge_no);
  const mrrIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_no);
  const requestedGeNo = String(record.ge_no || '').trim();
  const originalGeNo = String(record.original_ge_no || '').trim();
  if (!requestedGeNo && originalGeNo) {
    record.ge_no = originalGeNo;
  }
  
  // Generate only when GE is missing/placeholder. Existing GE should update in place.
  if (geIndex !== -1) {
    const isAuto = shouldAutoGenerateGeNo_(record.ge_no);
    if (isAuto) {
      record.ge_no = getNextFormattedGeNo_(sheet, geIndex, firmCode, record.date);
    }
  }

  // Auto-generate formatted MRR No when MRR is blank/placeholder.
  if (mrrIndex !== -1 && shouldAutoGenerateMrrNo_(record.mrr_no)) {
    record.mrr_no = getNextMrrNo_(ss, sheet, mrrIndex, firmCode, record.date);
  }

  // Check if we should update an existing row (if ge_no exists)
  let existingRow = -1;
  if (record.ge_no && geIndex !== -1) {
    existingRow = findRowNumberByKey_(sheet, geIndex, record.ge_no);
  }
  if (existingRow < 0 && originalGeNo && geIndex !== -1) {
    existingRow = findRowNumberByKey_(sheet, geIndex, originalGeNo);
  }

  const newRow = buildRowValuesFromAliases_(headers, record, GE_ENTRY_ALIASES);
  
  if (existingRow > 0) {
    // Update existing row
    sheet.getRange(existingRow, 1, 1, newRow.length).setValues([newRow]);
    return { ok: true, ge_no: record.ge_no, mrr_no: record.mrr_no || '', row: existingRow, updated: true };
  } else {
    // Append new row
    sheet.appendRow(newRow);
    return { ok: true, ge_no: record.ge_no, mrr_no: record.mrr_no || '', row: sheet.getLastRow(), updated: false };
  }
}

/**
 * Builds an array of values for a new row based on aliases and a record object.
 */
function buildRowValuesFromAliases_(headers, record, aliasMap) {
  const rowValues = new Array(headers.length).fill('');
  for (const key in record) {
    const aliases = aliasMap[key];
    if (aliases) {
      const colIndex = findColumnIndex_(headers, aliases);
      if (colIndex !== -1) {
        rowValues[colIndex] = record[key];
      }
    }
  }
  return rowValues;
}

/**
 * Updates a Gate Entry row with the MRR number.
 */
function updateGeEntryWithMrr_(ss, geNo, mrrNo) {
  if (!geNo || !mrrNo) return;
  const geSheetName = 'GE ENTRY';
  let sheet;
  try {
    sheet = ss.getSheetByName(geSheetName);
    if (!sheet) return;
  } catch (e) {
    return;
  }

  const headers = getHeaders_(sheet);
  const geIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.ge_no);
  const mrrIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_no);
  
  if (geIndex === -1 || mrrIndex === -1) return;
  
  const rowNumber = findRowNumberByKey_(sheet, geIndex, geNo);
  if (rowNumber > 0) {
    sheet.getRange(rowNumber, mrrIndex + 1).setValue(mrrNo);
  }
}

/**
 * Saves a base64 image to Google Drive and returns the viewing URL.
 */
function saveBase64ToDrive_(base64Data, fileName, folderName) {
  try {
    const folderSearch = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folderSearch.hasNext()) {
      folder = folderSearch.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    
    // Attempt to set public sharing. Note: organization policies might block this.
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingError) {
      // Fallback: If organization blocks ANYONE_WITH_LINK, it just stays private but saved.
    }
    
    return file.getUrl();
  } catch (e) {
    return "Error saving image: " + e.message;
  }
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

function getSheetOrThrow_(ss, name) {
  const target = name.trim().toLowerCase();
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === target) {
      return sheets[i];
    }
  }
  throw new Error(`Sheet "${name}" not found in spreadsheet "${ss.getName()}". Available: ${sheets.map(s => s.getName()).join(', ')}`);
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return []; // Guard against completely blank sheet
  return sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
}

function authenticateUser_(ss, loginId, password) {
  const normalizedLogin = normalizeKey_(loginId);
  if (!normalizedLogin || !String(password || '').trim()) return null;

  const usersSheet = getSheetOrThrow_(ss, DEFAULT_SHEETS.users);
  const headers = getHeaders_(usersSheet);
  const lastRow = usersSheet.getLastRow();
  if (lastRow < 2 || !headers.length) return null;

  const findUserCol = function(name) {
    return headers.findIndex(function(h) {
      return normalizeHeader_(h) === normalizeHeader_(name);
    });
  };

  const userIndex = findUserCol('User');
  const emailIndex = findUserCol('Email');
  const passwordIndex = findUserCol('Password');
  if (passwordIndex === -1 || (userIndex === -1 && emailIndex === -1)) {
    throw new Error('Users sheet must have User/Email/Password columns.');
  }

  const data = usersSheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowUser = userIndex === -1 ? '' : String(row[userIndex] || '').trim();
    var rowEmail = emailIndex === -1 ? '' : String(row[emailIndex] || '').trim();
    var rowPassword = String(row[passwordIndex] || '').trim();
    var loginMatch = normalizeKey_(rowUser) === normalizedLogin || normalizeKey_(rowEmail) === normalizedLogin;
    if (!loginMatch) continue;
    if (rowPassword !== String(password || '').trim()) continue;
    return {
      name: rowUser || rowEmail,
      email: rowEmail || loginId,
      role: rowUser || ''
    };
  }
  return null;
}

function approvePendingStage_(ss, params) {
  const stage = normalizePendingStage_(params.stage);
  const mrrNumber = String(params.mrrNumber || '').trim();
  const userEmail = String(params.userEmail || '').trim();
  const mrrSheetName = String(params.mrrSheetName || DEFAULT_SHEETS.mrrForm).trim();
  const helperSheetName = String(params.helperSheetName || DEFAULT_SHEETS.helper).trim();

  if (!mrrNumber) throw new Error('MRR Number is required.');
  if (!userEmail) throw new Error('User email is required for approval.');

  var timestampField = '';
  var userField = '';
  if (stage === 'pending_accounts_approval') {
    timestampField = 'accounts_approval_timestamp';
    userField = 'accounts_approval_useremail';
  } else if (stage === 'pending_md_approval') {
    timestampField = 'md_approval_timestamp';
    userField = 'md_approval_useremail';
  } else if (stage === 'pending_tally_posting') {
    timestampField = 'pending_tally_posting_timestamp';
    userField = 'pending_tally_posting_useremail';
  } else {
    throw new Error('Unsupported approval stage: ' + stage);
  }

  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm:ss');
  const updates = {};
  updates[timestampField] = stamp;
  updates[userField] = userEmail;

  const mrrSheet = getSheetOrThrow_(ss, mrrSheetName);
  const helperSheet = getSheetOrThrow_(ss, helperSheetName);
  const mrrUpdatedRows = updateApprovalColumnsByMrr_(mrrSheet, mrrNumber, MRR_FORM_ALIASES, updates);
  const helperUpdatedRows = updateApprovalColumnsByMrr_(helperSheet, mrrNumber, HELPER_SHEET_ALIASES, updates);

  return {
    stage: stage,
    mrr_number: mrrNumber,
    timestamp: stamp,
    user_email: userEmail,
    mrr_updated_rows: mrrUpdatedRows,
    helper_updated_rows: helperUpdatedRows
  };
}

function updateApprovalColumnsByMrr_(sheet, mrrNumber, aliasMap, updates) {
  const headers = getHeaders_(sheet);
  if (!headers.length) return 0;
  const mrrIndex = findColumnIndex_(headers, aliasMap.mrr_number);
  if (mrrIndex === -1) return 0;

  const updateIndices = {};
  Object.keys(updates || {}).forEach(function(field) {
    if (!aliasMap[field]) return;
    const idx = findColumnIndex_(headers, aliasMap[field]);
    if (idx !== -1) updateIndices[field] = idx;
  });

  if (!Object.keys(updateIndices).length) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const target = normalizeKey_(mrrNumber);
  let updated = 0;

  for (var i = 0; i < data.length; i++) {
    if (normalizeKey_(data[i][mrrIndex]) !== target) continue;
    const rowNumber = i + 2;
    Object.keys(updateIndices).forEach(function(field) {
      sheet.getRange(rowNumber, updateIndices[field] + 1).setValue(safeSheetValue_(updates[field]));
    });
    updated++;
  }
  return updated;
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

function buildRowValuesFromHeaderKeys_(headerKeys, record) {
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

function normalizePendingStage_(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  const key = raw.replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
  const compact = raw.replace(/[^a-z]+/g, '');

  const map = {
    pending_accounts_approval: 'pending_accounts_approval',
    pending_account_approval: 'pending_accounts_approval',
    pending_accounts: 'pending_accounts_approval',
    pending_account: 'pending_accounts_approval',
    pending_accounds_approval: 'pending_accounts_approval',
    pending_accound_approval: 'pending_accounts_approval',
    pending_md_approval: 'pending_md_approval',
    pending_md: 'pending_md_approval',
    pending_tally_posting: 'pending_tally_posting',
    pending_tally: 'pending_tally_posting'
  };

  if (map[key]) return map[key];
  if (compact.indexOf('tally') !== -1) return 'pending_tally_posting';
  if (compact.indexOf('md') !== -1) return 'pending_md_approval';
  if (compact.indexOf('account') !== -1 || compact.indexOf('accound') !== -1) return 'pending_accounts_approval';

  return raw;
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
  const skipValues = ['CM', 'KGS', '0', '0.00'];
  return Object.keys(row || {}).some(function(key) {
    if (['sno', 's_no', 'unit', 'size_unit', 'weight_unit', 'mrr_no', 'ge_no'].indexOf(key) !== -1) return false;
    const val = String(row[key] || '').trim();
    return val !== '' && skipValues.indexOf(val) === -1;
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

function extractSequenceNumber_(value) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const tailMatch = text.match(/(\d+)\s*$/);
  if (tailMatch) return Number(tailMatch[1]) || 0;
  return Number(text.replace(/\D/g, '')) || 0;
}

function normalizeFirmCode_(value) {
  const code = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '');
  return code || 'GE';
}

function parseDateValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  const text = String(value || '').trim();
  if (!text) return new Date();

  const parts = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const year = Number(parts[3].length === 2 ? '20' + parts[3] : parts[3]);
    return new Date(year, month, day);
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateForSheet_(value) {
  try {
    return Utilities.formatDate(parseDateValue_(value), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  } catch (e) {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  }
}

function getFinancialYearLabel_(value) {
  const date = parseDateValue_(value);
  const year = date.getFullYear();
  const fyStart = date.getMonth() >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;
  return String(fyStart).slice(-2) + '-' + String(fyEnd).slice(-2);
}

function formatGeNo_(firmCode, dateValue, sequence) {
  return normalizeFirmCode_(firmCode) + '/' + getFinancialYearLabel_(dateValue) + '/' + Utilities.formatString('%04d', Number(sequence) || 0);
}

function formatMrrNo_(firmCode, dateValue, sequence) {
  return normalizeFirmCode_(firmCode) + '/' + getFinancialYearLabel_(dateValue) + '/' + Utilities.formatString('%04d', Number(sequence) || 0);
}

function shouldAutoGenerateGeNo_(value) {
  const text = String(value || '').trim();
  return !text || text === '0' || /^\d+$/.test(text);
}

function shouldAutoGenerateMrrNo_(value) {
  const text = String(value || '').trim();
  return !text || text === '0' || /^\d+$/.test(text);
}

function getNextMrrNo_(ss, geSheet, geMrrIndex, firmCode, dateValue) {
  let maxMrr = 0;

  // 1) Check MRR FORM (authoritative)
  try {
    const mrrSheet = getSheetOrThrow_(ss, DEFAULT_SHEETS.mrrForm);
    const mrrHeaders = getHeaders_(mrrSheet);
    const mrrIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.mrr_number);
    const lastMrrRow = mrrSheet.getLastRow();
    if (mrrIndex !== -1 && lastMrrRow >= 2) {
      const values = mrrSheet.getRange(2, mrrIndex + 1, lastMrrRow - 1, 1).getDisplayValues();
      for (let i = 0; i < values.length; i++) {
        const seq = extractSequenceNumber_(values[i][0]);
        if (seq > maxMrr) maxMrr = seq;
      }
    }
  } catch (e) {
    // ignore and continue with GE ENTRY-based fallback
  }

  // 2) Check GE ENTRY MRR column too (avoid duplicate pending numbers)
  const lastGeRow = geSheet.getLastRow();
  if (geMrrIndex !== -1 && lastGeRow >= 2) {
    const geMrrValues = geSheet.getRange(2, geMrrIndex + 1, lastGeRow - 1, 1).getDisplayValues();
    for (let i = 0; i < geMrrValues.length; i++) {
      const seq = extractSequenceNumber_(geMrrValues[i][0]);
      if (seq > maxMrr) maxMrr = seq;
    }
  }

  return formatMrrNo_(firmCode, dateValue, maxMrr + 1);
}

function getNextFormattedGeNo_(sheet, geIndex, dateValueOrFirmCode, maybeDateValue) {
  const firmCode = maybeDateValue === undefined ? normalizeFirmCode_(sheet.getParent().getName()) : normalizeFirmCode_(dateValueOrFirmCode);
  const dateValue = maybeDateValue === undefined ? dateValueOrFirmCode : maybeDateValue;
  const fy = getFinancialYearLabel_(dateValue);
  const prefix = firmCode + '/' + fy + '/';
  const lastRow = sheet.getLastRow();
  let maxSequence = 0;

  if (lastRow >= 2) {
    const values = sheet.getRange(2, geIndex + 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < values.length; i++) {
      const text = String(values[i][0] || '').trim().toUpperCase();
      if (!text || text.indexOf(prefix) !== 0) continue;
      const sequence = extractSequenceNumber_(text);
      if (sequence > maxSequence) maxSequence = sequence;
    }
  }

  return formatGeNo_(firmCode, dateValue, maxSequence + 1);
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

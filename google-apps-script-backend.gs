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
  mrr_form_id: ['Mrr form Id', 'MRR Form Id', 'mrr_form_id', 'Other Id', 'other_id'],
  ge_no: ['G. E. No.', 'GE Entry', 'GE No', 'g_e_no', 'ge_no'],
  date: ['Date', 'date'],
  mrr_number: ['MRR Number', 'MRR No', 'MRR No.', 'Other MRR Number', 'Other MRR No', 'Other MRR No.', 'mrr_number', 'mrr_no'],
  dt_of_receipt: ['Dt. of Receipt', 'Dt of Receipt', 'dt_of_receipt', 'dt_of_receipts', 'receipt_date'],
  sup_doc_no: ['Supplier Document No', 'Sup Doc No.', 'Sup Doc No', 'sup_doc_no', 'supplier_doc_no'],
  truck_number: ['Truck Number', 'Truck No', 'truck_number', 'vehicle_number', 'truck_no'],
  invoice_ttl_weight_kgs: ['Invoice Total Weight (kg)', 'Invoice Ttl Weight (Kgs)', 'Invoice Total Weight', 'invoice_ttl_weight_kgs', 'invoice_total_weight_kgs', 'invoice_weight'],
  actual_mrr_ttl_weight_kgs: ['Actual MRR Total Weight (kg)', 'Actual MRR Ttl Weight (Kgs)', 'Actual Total Weight', 'actual_mrr_ttl_weight_kgs', 'actual_total_weight_kgs', 'actual_weight', 'actual_mrr_weight'],
  required_reel: ['Required Reel', 'Required Reels', 'required_reel', 'required_reels'],
  rows_added: ['Rows Added', 'rows_added'],
  supplier: ['SUPPLIER', 'supplier'],
  invoice_basic_value: ['INVOICE BASIC VALUE', 'Invoice Basic Value', 'invoice_basic_value'],
  mrr_basic_value: ['MRR BASIC VALUE', 'MRR Basic Value', 'mrr_basic_value'],
  e_way_bill_no: ['E-Way Bill No', 'E-Way Bill No.', 'Eway Bill No.', 'eway_bill_no', 'e_way_bill_no', 'eway_no'],
  e_way_date: ['E-Way Bill Date', 'E-Way Date', 'Eway Date', 'eway_date', 'e_way_date'],
  l_r_no: ['L.R. No', 'L.R No.', 'LR No.', 'L R No.', 'l_r_no', 'lr_no'],
  plant_head_approval: ['Plant Head Approval', 'plant_head_approval'],
  plant_head_approval_timestamp: ['Plant Head Approval Timestamp', 'plant_head_approval_timestamp'],
  plant_head_approval_useremail: ['Plant Head Approval User Email', 'Plant Head Approval Useremail', 'plant_head_approval_useremail'],
  accounts_approval: ['Accounts Approval', 'accounts_approval'],
  accounts_approval_timestamp: ['Accounts Approval Timestamp', 'accounts_approval_timestamp'],
  accounts_approval_useremail: ['Accounts Approval User Email', 'Accounts Approval Useremail', 'accounts_approval_useremail'],
  debit_note: ['Debit Note', 'debit_note'],
  debit_note_date: ['Debit Note Date', 'debit_note_date'],
  debit_note_amount: ['Debit Note Amount', 'debit_note_amount'],
  md_approval: ['MD Approval', 'md_approval'],
  md_approval_timestamp: ['MD Approval Timestamp', 'md_approval_timestamp'],
  md_approval_useremail: ['MD Approval User Email', 'MD Approval Useremail', 'md_approval_useremail'],
  pending_tally_posting_timestamp: ['Pending Tally Posting Timestamp', 'Pending Tally Posting Timesyamp', 'pending_tally_posting_timestamp'],
  pending_tally_posting_useremail: ['Pending Tally Posting User Email', 'Pending Tally Posting Useremail', 'pending_tally_posting_useremail'],
  s_no: ['S.No', 'S NO.', 'S No', 's_no', 'sno'],
  description: ['Description', 'description', 'reel_details', 'item_name'],
  hsn: ['HSN', 'hsn'],
  sort: ['Sort', 'sort', 'sort_no'],
  party_order: ['Party Order', 'Party Order No.', 'party_order', 'po_no'],
  po_no: ['PO NO.', 'PO No', 'po_no', 'PO Number'],
  po_date: ['PO DATE', 'PO Date', 'po_date'],
  po_details: ['PO DETAILS', 'PO Details', 'po_details'],
  gsm: ['GSM', 'gsm'],
  size: ['Size', 'size'],
  unit: ['Unit', 'unit', 'size_unit'],
  reels: ['Reels', 'reels', 'our_reel_number', 'reel_no'],
  weight: ['Weight', 'weight', 'net_wt'],
  rate: ['Rate', 'rate', 'Invoice Rate', 'invoice_rate'],
  amount: ['Amount', 'amount', 'value', 'VALUE', 'Invoice Basic Amount', 'Invocie Basic Amount', 'invoice_basic_amount', 'invocie_basic_amount'],
  quantity: ['QUANTITY', 'Qunatity', 'Quantity', 'quantity', 'QUANTITY RECEIVED', 'quantity_received'],
  po_quantity: ['PO QUANTITY', 'PO Qunatity', 'PO Quantity', 'po_quantity', 'po_qty', 'PO QTY']
  ,
  insurance: ['Insurance', 'insurance'],
  round_off: ['Round Off', 'Round Off.', 'round_off', 'roundoff']
};

const HELPER_SHEET_ALIASES = {
  'helper_id': ['Helper Id', 'Other Child Id', 'helper_id', 'other_child_id'],
  'mrr_form_id': ['Mrr form Id', 'MRR Form Id', 'mrr_form_id', 'Other Id', 'other_id'],
  's_no': ['S NO.', 'S NO', 'S.No.', 'S No', 'Serial No', 'S No.', 'S. No.', 's_no'],
  'mrr_number': ['MRR Number', 'MRR No', 'MRR No.', 'Other MRR Number', 'Other MRR No', 'Other MRR No.', 'mrr_number', 'MRR_NO', 'MRR NO.'],
  'po_details': ['PO DETAILS', 'PO Details', 'po_details'],
  'po_no': ['PO NO.', 'PO No', 'po_no', 'PO Number', 'Party Order No.', 'Party Order No', 'Party Order', 'party_order', 'party_order_no'],
  'party_order': ['Party Order No.', 'Party Order No', 'Party Order', 'party_order', 'party_order_no'],
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
  'sup_doc_no': ['Sup Doc No.', 'SUP DOC NO.', 'Sup Doc No', 'Invoice No', 'sup_doc_no', ' Sup Doc No.', ' Sup Doc No'],
  'plant_head_approval': ['Plant Head Approval', 'plant_head_approval'],
  'plant_head_approval_timestamp': ['Plant Head Approval Timestamp', 'plant_head_approval_timestamp'],
  'plant_head_approval_useremail': ['Plant Head Approval User Email', 'Plant Head Approval Useremail', 'plant_head_approval_useremail'],
  'accounts_approval': ['Accounts Approval', 'accounts_approval'],
  'accounts_approval_timestamp': ['Accounts Approval Timestamp', 'accounts_approval_timestamp'],
  'accounts_approval_useremail': ['Accounts Approval User Email', 'Accounts Approval Useremail', 'accounts_approval_useremail'],
  'debit_note': ['Debit Note', 'debit_note'],
  'debit_note_date': ['Debit Note Date', 'debit_note_date'],
  'debit_note_amount': ['Debit Note Amount', 'debit_note_amount'],
  'md_approval': ['MD Approval', 'md_approval'],
  'md_approval_timestamp': ['MD Approval Timestamp', 'md_approval_timestamp'],
  'md_approval_useremail': ['MD Approval User Email', 'MD Approval Useremail', 'md_approval_useremail'],
  'pending_tally_posting_timestamp': ['Pending Tally Posting Timestamp', 'Pending Tally Posting Timesyamp', 'pending_tally_posting_timestamp'],
  'pending_tally_posting_useremail': ['Pending Tally Posting User Email', 'Pending Tally Posting Useremail', 'pending_tally_posting_useremail']
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
  mrr_no: ['MRR', 'mrr_no', 'MRR No'],
  mrr_complete: ['MRR COMPLETE', 'mrr_complete', 'MRR Complete']
};

const MRR_FORM_CANONICAL_HEADERS = {
  mrr_form_id: 'MRR Form ID',
  ge_no: 'GE Entry',
  date: 'Date',
  mrr_number: 'MRR No',
  dt_of_receipt: 'Dt. of Receipt',
  sup_doc_no: 'Supplier Document No',
  truck_number: 'Truck Number',
  invoice_ttl_weight_kgs: 'Invoice Total Weight (kg)',
  actual_mrr_ttl_weight_kgs: 'Actual MRR Total Weight (kg)',
  required_reel: 'Required Reels',
  rows_added: 'Rows Added',
  supplier: 'SUPPLIER',
  invoice_basic_value: 'INVOICE BASIC VALUE',
  mrr_basic_value: 'MRR BASIC VALUE',
  e_way_bill_no: 'E-Way Bill No',
  e_way_date: 'E-Way Bill Date',
  l_r_no: 'L.R. No',
  plant_head_approval: 'Plant Head Approval',
  plant_head_approval_timestamp: 'Plant Head Approval Timestamp',
  plant_head_approval_useremail: 'Plant Head Approval User Email',
  accounts_approval: 'Accounts Approval',
  accounts_approval_timestamp: 'Accounts Approval Timestamp',
  accounts_approval_useremail: 'Accounts Approval User Email',
  debit_note: 'Debit Note',
  debit_note_date: 'Debit Note Date',
  debit_note_amount: 'Debit Note Amount',
  md_approval: 'MD Approval',
  md_approval_timestamp: 'MD Approval Timestamp',
  md_approval_useremail: 'MD Approval User Email',
  pending_tally_posting_timestamp: 'Pending Tally Posting Timestamp',
  pending_tally_posting_useremail: 'Pending Tally Posting User Email',
  s_no: 'S.No',
  description: 'Description',
  hsn: 'HSN',
  sort: 'Sort',
  party_order: 'Party Order',
  po_no: 'PO NO.',
  po_date: 'PO DATE',
  po_details: 'PO DETAILS',
  gsm: 'GSM',
  size: 'Size',
  unit: 'Unit',
  reels: 'Reels',
  weight: 'Weight',
  rate: 'Rate',
  amount: 'Amount',
  quantity: 'QUANTITY',
  po_quantity: 'PO QUANTITY'
  ,
  insurance: 'Insurance',
  round_off: 'Round Off'
};

const HELPER_SHEET_CANONICAL_HEADERS = {
  helper_id: 'Helper Id',
  mrr_form_id: 'Mrr form Id',
  s_no: 'S NO.',
  mrr_number: 'MRR Number',
  po_details: 'PO DETAILS',
  po_no: 'PO NO.',
  party_order: 'Party Order No.',
  po_date: 'PO DATE',
  supplier: 'SUPPLIER',
  our_reel_number: 'Our Reel Number',
  supplier_reel_no: 'Supplier Reel No.',
  reel_details: 'Reel Details',
  erp_code: 'ERP Code',
  size: 'Size',
  gsm: 'GSM',
  bf: 'BF',
  weight: 'Weight',
  rate: 'Rate',
  value: 'VALUE',
  po_rate: 'PO RATE',
  date: 'Date',
  dt_of_receipts: 'Dt of Receipts',
  sup_doc_no: 'Sup Doc No.',
  plant_head_approval: 'Plant Head Approval',
  plant_head_approval_timestamp: 'Plant Head Approval Timestamp',
  plant_head_approval_useremail: 'Plant Head Approval User Email',
  accounts_approval: 'Accounts Approval',
  accounts_approval_timestamp: 'Accounts Approval Timestamp',
  accounts_approval_useremail: 'Accounts Approval User Email',
  debit_note: 'Debit Note',
  debit_note_date: 'Debit Note Date',
  debit_note_amount: 'Debit Note Amount',
  md_approval: 'MD Approval',
  md_approval_timestamp: 'MD Approval Timestamp',
  md_approval_useremail: 'MD Approval User Email',
  pending_tally_posting_timestamp: 'Pending Tally Posting Timestamp',
  pending_tally_posting_useremail: 'Pending Tally Posting User Email'
};

const GE_ENTRY_CANONICAL_HEADERS = {
  timestamp: 'Timestamp',
  date: 'Date',
  ge_no: 'GE Entry',
  supplier: 'Supplier Name',
  invoice_no: 'Invoice No',
  total_value: 'Total Invocie Value',
  truck_no: 'Truck No',
  mrr_no: 'MRR',
  mrr_complete: 'MRR COMPLETE'
};

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
  'Debit Note',
  'Debit Note Date',
  'Debit Note Amount',
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
      const debitNote = String(e.parameter.debit_note || '').trim();
      const debitNoteDate = String(e.parameter.debit_note_date || '').trim();
      const debitNoteAmount = String(e.parameter.debit_note_amount || '').trim();
      const mrrSheetName = String(e.parameter.mrrSheet || DEFAULT_SHEETS.mrrForm).trim();
      const helperSheetName = String(e.parameter.helperSheet || DEFAULT_SHEETS.helper).trim();
      const result = approvePendingStage_(ss, {
        stage: stage,
        mrrNumber: mrrNumber,
        userEmail: userEmail,
        debitNote: debitNote,
        debitNoteDate: debitNoteDate,
        debitNoteAmount: debitNoteAmount,
        mrrSheetName: mrrSheetName,
        helperSheetName: helperSheetName
      });
      return jsonOutput_(Object.assign({ ok: true }, result));
    }

    if (action === 'diagnose_save') {
      const mrrSheetName = String(e.parameter.mrrSheet || DEFAULT_SHEETS.mrrForm).trim();
      const helperSheetName = String(e.parameter.helperSheet || DEFAULT_SHEETS.helper).trim();
      const mrrNumber = String(e.parameter.mrr_number || '').trim();
      const diag = diagnoseSave_(ss, mrrSheetName, helperSheetName, mrrNumber);
      return jsonOutput_(Object.assign({ ok: true }, diag));
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

    // Custom action to get unique suppliers from the requested PO sheet
    if (action === 'get_suppliers') {
      const requestedSheetName = String(e.parameter.sheet || DEFAULT_SHEETS.poDetails).trim() || DEFAULT_SHEETS.poDetails;
      const poSheet = getSheetOrThrow_(ss, requestedSheetName);
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
      const helperSheetName = String(e.parameter.helperSheet || DEFAULT_SHEETS.helper).trim();
      const mrrSheet = mrrSheetName ? getSheetOrThrow_(ss, mrrSheetName) : null;
      const helperSheet = helperSheetName ? getSheetOrThrow_(ss, helperSheetName) : null;
      const mrrHeaders = mrrSheet ? getHeaders_(mrrSheet) : [];
      const helperHeaders = helperSheet ? getHeaders_(helperSheet) : [];
      const lastMrrRow = mrrSheet ? mrrSheet.getLastRow() : 0;
      const lastHelperRow = helperSheet ? helperSheet.getLastRow() : 0;
      const existingMrrSet = {};
      const existingGeSet = {};
      const helperByMrr = {};

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

      if (helperSheet && lastHelperRow >= 2 && helperHeaders.length > 0) {
        const helperData = helperSheet.getRange(2, 1, lastHelperRow - 1, helperHeaders.length).getDisplayValues();
        const helperMrrIndex = findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES.mrr_number);
        const helperReelDetailsIndex = findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES.reel_details);
        const helperPoDetailsIndex = findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES.po_details);
        const helperPoRateIndex = findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES.po_rate);

        if (helperMrrIndex !== -1) {
          helperData.forEach(function(row) {
            const mrrKey = normalizeKey_(row[helperMrrIndex]);
            if (!mrrKey || helperByMrr[mrrKey]) return;
            helperByMrr[mrrKey] = {
              helper_item_name: helperReelDetailsIndex === -1 ? '' : String(row[helperReelDetailsIndex] || '').trim(),
              helper_po_details: helperPoDetailsIndex === -1 ? '' : String(row[helperPoDetailsIndex] || '').trim(),
              helper_po_rate: helperPoRateIndex === -1 ? '' : String(row[helperPoRateIndex] || '').trim()
            };
          });
        }
      }

      if (lastGeRow >= 2) {
        const geData = geSheet.getRange(2, 1, lastGeRow - 1, geHeaders.length).getDisplayValues();
        const mrrColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.mrr_no);
        const geColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.ge_no);
        const mrrCompleteColIndex = findColumnIndex_(geHeaders, GE_ENTRY_ALIASES.mrr_complete);

        geData.forEach(function(row) {
          const mrrVal = mrrColIndex === -1 ? '' : String(row[mrrColIndex]).trim();
          const geVal = geColIndex === -1 ? '' : String(row[geColIndex]).trim();
          const mrrCompleteVal = mrrCompleteColIndex === -1 ? '' : String(row[mrrCompleteColIndex]).trim();
          if (!mrrVal && !geVal) return;
          // If GE row is marked complete, never show it in Pending MRR.
          if (mrrCompleteVal) return;
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
          const plantHeadApprovalIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.plant_head_approval_timestamp);
          const accountsApprovalIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.accounts_approval_timestamp);
          const mdApprovalIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.md_approval_timestamp);
          const tallyIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.pending_tally_posting_timestamp);

          mrrData.forEach(function(row) {
            const mrrNumber = mrrIndex === -1 ? '' : String(row[mrrIndex]).trim();
            if (!mrrNumber) return;

            const plantHeadApproval = plantHeadApprovalIndex === -1 ? '' : String(row[plantHeadApprovalIndex]).trim();
            const accountsApproval = accountsApprovalIndex === -1 ? '' : String(row[accountsApprovalIndex]).trim();
            const mdApproval = mdApprovalIndex === -1 ? '' : String(row[mdApprovalIndex]).trim();
            const tallyPosting = tallyIndex === -1 ? '' : String(row[tallyIndex]).trim();

            let pendingStage = '';
            let pendingLabel = '';
            let sortOrder = 99;

            if (!plantHeadApproval) {
              pendingStage = 'pending_plant_head_approval';
              pendingLabel = 'Pending Plant Head Approval';
              sortOrder = 2;
            } else if (!accountsApproval) {
              pendingStage = 'pending_accounts_approval';
              pendingLabel = 'Pending Accounts Approval';
              sortOrder = 3;
            } else if (!mdApproval) {
              pendingStage = 'pending_md_approval';
              pendingLabel = 'Pending MD Approval';
              sortOrder = 4;
            } else if (!tallyPosting) {
              pendingStage = 'pending_tally_posting';
              pendingLabel = 'Pending Tally Posting';
              sortOrder = 5;
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
              plant_head_approval_timestamp: plantHeadApproval,
              accounts_approval_timestamp: accountsApproval,
              md_approval_timestamp: mdApproval,
              pending_tally_posting_timestamp: tallyPosting
            };
            const helperInfo = helperByMrr[normalizeKey_(mrrNumber)] || null;
            if (helperInfo) {
              obj.helper_item_name = helperInfo.helper_item_name || '';
              obj.helper_po_details = helperInfo.helper_po_details || '';
              obj.helper_po_rate = helperInfo.helper_po_rate || '';
            }

            mrrHeaders.forEach((h, i) => {
              const normalized = normalizeHeader_(h);
              if (!(normalized in obj)) obj[normalized] = row[i];
            });
            result.push(obj);
          });
      }

      // De-duplicate by stage + MRR to avoid repeated approval rows.
      const dedupMap = {};
      const dedupedResult = [];
      for (let i = 0; i < result.length; i++) {
        const item = result[i] || {};
        const stage = String(item.pending_stage || '').trim();
        const mrr = normalizeKey_(item.mrr_number || item.mrr_no || '');
        const ge = normalizeKey_(item.ge_no || '');
        const key = stage + '|' + (mrr || ge);
        if (!key || dedupMap[key]) continue;
        dedupMap[key] = true;
        dedupedResult.push(item);
      }

      dedupedResult.sort(function(a, b) {
        const orderA = Number(a.sort_order || 99);
        const orderB = Number(b.sort_order || 99);
        if (orderA !== orderB) return orderA - orderB;
        return String(b.date || '').localeCompare(String(a.date || ''));
      });

      return jsonOutput_({ ok: true, values: dedupedResult });
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
  var requestId = '';
  try {
    const payload = parseRequestBody_(e);
    const action = normalizeAction_(payload.action || 'save_packing');
    requestId = String(payload.requestId || Utilities.getUuid());
    
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
    logDebug_('[doPost] Request received', {
      requestId: requestId,
      action: action,
      spreadsheetId: payload.spreadsheetId || '',
      mrrSheetName: options.mrrSheetName || DEFAULT_SHEETS.mrrForm,
      helperSheetName: options.helperSheetName || DEFAULT_SHEETS.helper,
      mrrNo: firstFilled_(invoice.mrr_no, packing.mrr_no, payload.geEntry && payload.geEntry.mrr_no),
      geNo: firstFilled_(invoice.ge_no, packing.ge_no, payload.geEntry && payload.geEntry.ge_no),
      poRowsCount: poRows.length
    });

    let mrrSheet = null;
    let helperSheet = null;
    if (action !== 'save_ge_entry') {
      const mrrSheetName = String(options.mrrSheetName || DEFAULT_SHEETS.mrrForm).trim();
      const helperSheetName = String(options.helperSheetName || DEFAULT_SHEETS.helper).trim();
      const mode = String(options.mode || '').trim().toLowerCase();
      const isOtherMode = mode === 'other' || /other\s*mrr/i.test(mrrSheetName);

      mrrSheet = getSheetOrThrow_(ss, mrrSheetName);
      if (!isOtherMode) {
        validateStrictMrrFormHeaders_(mrrSheet, mrrSheetName);
      }
      ensureColumnsByAliases_(mrrSheet, MRR_FORM_ALIASES, MRR_FORM_CANONICAL_HEADERS, ['mrr_form_id', 'mrr_number', 'ge_no'], requestId);

      if (action === 'save_packing') {
        helperSheet = getSheetOrThrow_(ss, helperSheetName);
        ensureColumnsByAliases_(helperSheet, HELPER_SHEET_ALIASES, HELPER_SHEET_CANONICAL_HEADERS, ['helper_id', 'mrr_form_id', 's_no', 'mrr_number'], requestId);
      }
    }

    // Use lock to prevent concurrent executions from overwriting each other.
    // In web apps / standalone scripts, DocumentLock may be unavailable.
    var lock = null;
    try {
      lock = LockService.getDocumentLock();
    } catch (lockErr) {
      lock = null;
    }
    if (!lock) {
      lock = LockService.getScriptLock();
    }
    if (!lock) {
      throw new Error('Could not acquire lock for save operation.');
    }
    // Wait for up to 20 seconds for other processes to finish
    lock.waitLock(20000);
    
    try {
      if (action === 'save_ge_entry') {
        const geResult = saveGeEntryRow_(ss, payload.geEntry || {});
        const geSyncPayload = Object.assign({}, payload.geEntry || {}, {
          ge_no: firstFilled_(geResult && geResult.ge_no, payload && payload.geEntry && payload.geEntry.ge_no),
          mrr_no: firstFilled_(geResult && geResult.mrr_no, payload && payload.geEntry && payload.geEntry.mrr_no)
        });
        const mrrSync = syncMrrSheetsFromGeEntry_(ss, geSyncPayload, {
          mrrSheetName: options && options.mrrSheetName,
          requestId: requestId
        });
        logDebug_('[doPost] save_ge_entry complete', {
          requestId: requestId,
          ge_no: geResult && geResult.ge_no,
          mrr_no: geResult && geResult.mrr_no,
          row: geResult && geResult.row,
          updated: geResult && geResult.updated,
          mrrSync: mrrSync
        });
        return jsonOutput_({ ok: true, action: action, geEntry: geResult, mrrSync: mrrSync, requestId: requestId });
      }

      if (action === 'save_invoice') {
        const baseMrrRecord = buildMrrFormRecord_(invoice, packing, poRows, []);
        const latestMrrRecord = getLatestMrrRecordByMrr_(mrrSheet, baseMrrRecord.mrr_number);
        const mrrRowRecords = buildMrrFormRowRecordsFromHelperRows_(invoice, packing, poRows, []);
        const mergedMrrRows = (mrrRowRecords && mrrRowRecords.length ? mrrRowRecords : [Object.assign({}, baseMrrRecord)]).map(function(row) {
          return mergeApprovalStateIntoMrrRecord_(row, latestMrrRecord);
        });
        const mrrResult = replaceMrrRowsForMrr_(mrrSheet, baseMrrRecord.mrr_number, mergedMrrRows);
        updateGeEntryWithMrr_(ss, baseMrrRecord.ge_no, baseMrrRecord.mrr_number, {
          markComplete: true,
          requestId: requestId,
          geEntryUpdate: buildGeEntryUpdateFromMrr_(invoice, packing, baseMrrRecord)
        });
        logDebug_('[doPost] save_invoice complete', {
          requestId: requestId,
          mrr_number: baseMrrRecord && baseMrrRecord.mrr_number,
          ge_no: baseMrrRecord && baseMrrRecord.ge_no,
          mrrForm: mrrResult
        });
        return jsonOutput_({ ok: true, action: action, mrrForm: mrrResult, requestId: requestId });
      }

      // Default or "save_packing" action
      const helperRows = buildHelperRows_(invoice, packing, poRows);
      const baseMrrRecord = buildMrrFormRecord_(invoice, packing, poRows, helperRows);

      // Upsert child/helper rows (update by keys, append only for truly new rows).
      const helperResult = replaceHelperRows_(helperSheet, baseMrrRecord.mrr_number, helperRows);
      if (!helperResult.rowsWithSerial || !helperResult.rowsWithSerial.length) {
        throw new Error('Packing Slip requires at least 1 row before saving.');
      }

      // Keep prior approval columns when rows are regenerated.
      const latestMrrRecord = getLatestMrrRecordByMrr_(mrrSheet, baseMrrRecord.mrr_number);
      const mrrRowRecords = buildMrrFormRowRecordsFromHelperRows_(invoice, packing, poRows, helperResult.rowsWithSerial);
      const mergedMrrRows = mrrRowRecords.map(function(row) {
        return mergeApprovalStateIntoMrrRecord_(row, latestMrrRecord);
      });
      const mrrResult = replaceMrrRowsForMrr_(mrrSheet, baseMrrRecord.mrr_number, mergedMrrRows);

      updateGeEntryWithMrr_(ss, baseMrrRecord.ge_no, baseMrrRecord.mrr_number, {
        markComplete: true,
        requestId: requestId,
        geEntryUpdate: buildGeEntryUpdateFromMrr_(invoice, packing, baseMrrRecord)
      });
      logDebug_('[doPost] save_packing complete', {
        requestId: requestId,
        mrr_number: baseMrrRecord && baseMrrRecord.mrr_number,
        ge_no: baseMrrRecord && baseMrrRecord.ge_no,
        helperInsertedRows: Number(helperResult && helperResult.insertedRows || 0),
        helperDeletedRows: Number(helperResult && helperResult.deletedRows || 0),
        mrrForm: mrrResult
      });

      return jsonOutput_({
        ok: true,
        action: action,
        helperSheet: helperResult,
        mrrForm: mrrResult,
        requestId: requestId
      });
    } finally {
      // Always release the lock!
      try {
        lock.releaseLock();
      } catch (releaseErr) {
      }
    }
  } catch (error) {
    logDebug_('[doPost] Request failed', {
      requestId: requestId || '',
      error: String(error),
      stack: error && error.stack ? String(error.stack) : ''
    });
    return jsonOutput_({ ok: false, error: String(error), requestId: requestId || '' });
  }
}

function normalizeStrictHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function formatHeaderList_(values, limit) {
  var max = Number(limit || 12);
  return (values || []).slice(0, max).map(function(v) { return '"' + String(v || '').trim() + '"'; }).join(', ');
}

function validateStrictMrrFormHeaders_(sheet, sheetName) {
  var headers = getHeaders_(sheet);
  if (!headers || !headers.length) {
    throw new Error('MRR FORM header validation failed: sheet "' + sheetName + '" is empty or has no header row.');
  }

  var actualNorm = headers.map(normalizeStrictHeader_);
  var requiredNorm = STRICT_MRR_FORM_HEADERS.map(normalizeStrictHeader_);
  var actualCount = {};
  var requiredCount = {};
  var i;

  for (i = 0; i < actualNorm.length; i++) {
    actualCount[actualNorm[i]] = Number(actualCount[actualNorm[i]] || 0) + 1;
  }
  for (i = 0; i < requiredNorm.length; i++) {
    requiredCount[requiredNorm[i]] = Number(requiredCount[requiredNorm[i]] || 0) + 1;
  }

  var missingHeaders = [];
  for (i = 0; i < STRICT_MRR_FORM_HEADERS.length; i++) {
    var required = STRICT_MRR_FORM_HEADERS[i];
    var key = normalizeStrictHeader_(required);
    if (Number(actualCount[key] || 0) >= Number(requiredCount[key] || 0)) continue;
    if (missingHeaders.indexOf(required) === -1) missingHeaders.push(required);
  }
  if (missingHeaders.length) {
    throw new Error(
      'MRR FORM header validation failed. Missing required columns: ' + missingHeaders.join(', ') + '. ' +
      'Please update "' + sheetName + '" headers exactly and retry save.'
    );
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
  const packingBasicValueRaw = round2_(packingItems.reduce((sum, row) => sum + (n_(row.rate) * n_(row.net_wt || row.weight)), 0));
  const invoiceBasicValueRaw = round2_(invoiceGoods.reduce((sum, row) => sum + (n_(row.rate) * n_(row.weight || row.net_wt)), 0));
  const packingBasicValue = packingBasicValueRaw > 0 ? packingBasicValueRaw : invoiceBasicValueRaw;
  const insurance = firstFilled_(invoice && invoice.totals && invoice.totals.insurance, '');
  const roundOff = firstFilled_(invoice && invoice.totals && invoice.totals.round_off, '');

  const record = {};
  assignIfPresent_(record, 'mrr_form_id', firstFilled_(invoice.mrr_form_id, packing.mrr_form_id));
  assignIfPresent_(record, 'ge_no', firstFilled_(invoice.ge_no, packing.ge_no));
  assignIfPresent_(record, 'date', firstFilled_(invoice.date, packing.date));
  assignIfPresent_(record, 'mrr_number', firstFilled_(invoice.mrr_no, packing.mrr_no));
  assignIfPresent_(record, 'dt_of_receipt', todayReceiptDate);
  assignIfPresent_(record, 'sup_doc_no', firstFilled_(invoice.invoice_no, packing.challan_no));
  assignIfPresent_(record, 'truck_number', firstFilled_(invoice.vehicle_no, packing.truck_no));
  assignIfPresent_(record, 'invoice_ttl_weight_kgs', invoiceWeight, true);
  
  // Choose actual MRR weight from available sources
  assignIfPresent_(record, 'actual_mrr_ttl_weight_kgs', round2_(firstFilled_(invoice.actual_mrr_weight, packing.actual_total, packing.total_weight, helperWeight)), true);
  assignIfPresent_(record, 'required_reel', firstFilled_(packing.total_reels, String(rows.length), invoiceReels ? String(invoiceReels) : ''));
  assignIfPresent_(record, 'rows_added', rows.length, true);
  assignIfPresent_(record, 'supplier', firstFilled_(packing.buyer && packing.buyer.name_address, invoice.bill_to && invoice.bill_to.name_address));
  // INVOICE BASIC VALUE = sum of amount of MRR reels (invoice goods amount)
  assignIfPresent_(record, 'invoice_basic_value', grossAmount, true);
  // MRR BASIC VALUE = sum of rate * net weight from packing slip rows
  assignIfPresent_(record, 'mrr_basic_value', packingBasicValue, true);
  assignIfPresent_(record, 'insurance', insurance === '' ? '' : round2_(insurance), true);
  assignIfPresent_(record, 'round_off', roundOff === '' ? '' : round2_(roundOff), true);
  assignIfPresent_(record, 'e_way_bill_no', firstFilled_(invoice.eway_no));
  assignIfPresent_(record, 'e_way_date', firstFilled_(invoice.eway_date));
  assignIfPresent_(record, 'l_r_no', firstFilled_(invoice.lr_no, packing.lr_no));
  
  return record;
}

function findInvoiceHsnForHelperRow_(helperRow, invoiceGoods) {
  const goods = Array.isArray(invoiceGoods) ? invoiceGoods : [];
  const poNo = normalizeDocKey_(firstFilled_(helperRow.po_no, helperRow.party_order));
  const gsm = normalizeDocKey_(helperRow.gsm);
  const size = normalizeDocKey_(helperRow.size);
  const desc = normalizeDocKey_(firstFilled_(helperRow.reel_details, helperRow.item_name));
  for (var i = 0; i < goods.length; i++) {
    const g = goods[i] || {};
    const samePo = !poNo || normalizeDocKey_(firstFilled_(g.po_no, g.party_order)) === poNo;
    const sameGsm = !gsm || normalizeDocKey_(g.gsm) === gsm;
    const sameSize = !size || normalizeDocKey_(g.size) === size;
    const sameDesc = !desc || normalizeDocKey_(firstFilled_(g.description, g.reel_details, g.item_name)) === desc;
    if (samePo && sameGsm && sameSize && sameDesc) {
      const hsn = String(g.hsn || '').trim();
      if (hsn) return hsn;
    }
  }
  return firstFilled_(goods[0] && goods[0].hsn, '48043100');
}

function buildMrrFormRowRecordsFromHelperRows_(invoice, packing, poRows, helperRows) {
  const rows = Array.isArray(helperRows) ? helperRows : [];
  const base = buildMrrFormRecord_(invoice, packing, poRows, rows);
  const invoiceGoodsRaw = Array.isArray(invoice && invoice.goods) ? invoice.goods : [];
  const normalizedTargetMrr = normalizeDocKey_(firstFilled_(base.mrr_number, packing && packing.mrr_no, invoice && invoice.mrr_no));
  const normalizedTargetGe = normalizeDocKey_(firstFilled_(base.ge_no, packing && packing.ge_no, invoice && invoice.ge_no));
  const isParentSummaryRow = function(row) {
    const desc = String(firstFilled_(row && row.description, row && row.item_name, row && row.reel_details) || '').trim().toUpperCase();
    return desc === 'PARENT SUMMARY';
  };
  const rowBelongsToCurrentDoc = function(row) {
    const rowMrr = normalizeDocKey_(firstFilled_(row && row.mrr_no, row && row.mrr_number));
    const rowGe = normalizeDocKey_(firstFilled_(row && row.ge_no, row && row.ge_entry));
    if (rowMrr && normalizedTargetMrr && rowMrr !== normalizedTargetMrr) return false;
    if (rowGe && normalizedTargetGe && rowGe !== normalizedTargetGe) return false;
    return true;
  };
  const invoiceGoods = invoiceGoodsRaw.filter(function(row) {
    return rowHasData_(row) && rowBelongsToCurrentDoc(row) && !isParentSummaryRow(row);
  });

  if (invoiceGoods.length) {
    return invoiceGoods.map(function(row, index) {
      const record = Object.assign({}, base);
      assignIfPresent_(record, 'mrr_form_id', firstFilled_(row && row.mrr_form_id, row && row.other_id, base.mrr_form_id));
      assignIfPresent_(record, 's_no', firstFilled_(row && row.s_no, row && row.sort_no, row && row.sort, index + 1));
      assignIfPresent_(record, 'supplier', firstFilled_(base.supplier, row && row.supplier));
      assignIfPresent_(record, 'description', firstFilled_(row && row.description, row && row.reel_details, row && row.item_name));
      assignIfPresent_(record, 'hsn', firstFilled_(row && row.hsn, '48043100'));
      assignIfPresent_(record, 'sort', firstFilled_(row && row.sort_no, row && row.sort, index + 1));
      assignIfPresent_(record, 'party_order', firstFilled_(row && row.party_order, row && row.po_no));
      assignIfPresent_(record, 'po_no', firstFilled_(row && row.po_no, row && row.party_order));
      assignIfPresent_(record, 'po_date', firstFilled_(row && row.po_date, base.date));
      assignIfPresent_(record, 'po_details', firstFilled_(row && row.po_details));
      assignIfPresent_(record, 'gsm', firstFilled_(row && row.gsm));
      assignIfPresent_(record, 'size', firstFilled_(row && row.size));
      assignIfPresent_(record, 'unit', firstFilled_(row && row.unit, row && row.size_unit, 'CM'));
      assignIfPresent_(record, 'reels', firstFilled_(row && row.reels, row && row.reel_no, ''));
      assignIfPresent_(record, 'weight', round2_(firstFilled_(row && row.weight, row && row.net_wt)), true);
      assignIfPresent_(record, 'rate', round2_(row && row.rate), true);
      assignIfPresent_(record, 'amount', round2_(firstFilled_(row && row.amount, n_(firstFilled_(row && row.weight, row && row.net_wt)) * n_(row && row.rate))), true);
      assignIfPresent_(record, 'quantity', firstFilled_(row && row.quantity, row && row.weight, row && row.net_wt, row && row.reels));
      assignIfPresent_(record, 'po_quantity', firstFilled_(row && row.po_quantity, row && row.quantity));
      return record;
    });
  }

  const childRows = rows.map(function(row, index) {
    const record = Object.assign({}, base);
    const mrrRowId = firstFilled_(row && row.mrr_form_id, row && row.helper_id);
    assignIfPresent_(record, 'mrr_form_id', mrrRowId);
    assignIfPresent_(record, 's_no', firstFilled_(row && row.s_no, row && row.sort_no, index + 1));
    assignIfPresent_(record, 'supplier', firstFilled_(base.supplier, row && row.supplier));
    assignIfPresent_(record, 'description', firstFilled_(row && row.reel_details, row && row.item_name));
    assignIfPresent_(record, 'hsn', findInvoiceHsnForHelperRow_(row || {}, invoiceGoods));
    assignIfPresent_(record, 'sort', firstFilled_(row && row.s_no, row && row.sort_no, index + 1));
    assignIfPresent_(record, 'party_order', firstFilled_(row && row.party_order, row && row.po_no));
    assignIfPresent_(record, 'po_no', firstFilled_(row && row.po_no, row && row.party_order));
    assignIfPresent_(record, 'po_date', firstFilled_(row && row.po_date, base.date));
    assignIfPresent_(record, 'po_details', firstFilled_(row && row.po_details));
    assignIfPresent_(record, 'gsm', firstFilled_(row && row.gsm));
    assignIfPresent_(record, 'size', firstFilled_(row && row.size));
    assignIfPresent_(record, 'unit', firstFilled_(row && row.unit, row && row.size_unit, 'CM'));
    assignIfPresent_(record, 'reels', firstFilled_(row && row.our_reel_number, row && row.reel_no, 1));
    assignIfPresent_(record, 'weight', round2_(firstFilled_(row && row.weight, row && row.net_wt)), true);
    assignIfPresent_(record, 'rate', round2_(row && row.rate), true);
    assignIfPresent_(record, 'amount', round2_(firstFilled_(row && row.value, n_(row && row.weight) * n_(row && row.rate))), true);
    assignIfPresent_(record, 'quantity', firstFilled_(row && row.quantity, row && row.weight, row && row.net_wt, row && row.our_reel_number));
    assignIfPresent_(record, 'po_quantity', firstFilled_(row && row.po_quantity, row && row.quantity));
    return record;
  });
  if (childRows.length) return childRows;
  return [Object.assign({}, base)];
}

function getLatestMrrRecordByMrr_(sheet, mrrNumber) {
  const headers = getHeaders_(sheet);
  if (!headers.length) return null;
  const keyIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_number);
  if (keyIndex === -1) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const target = normalizeKey_(mrrNumber);
  var latest = null;
  for (var i = 0; i < data.length; i++) {
    if (normalizeKey_(data[i][keyIndex]) !== target) continue;
    latest = mapRowToAliasRecord_(headers, data[i], MRR_FORM_ALIASES);
  }
  return latest;
}

function mergeApprovalStateIntoMrrRecord_(record, latest) {
  if (!latest) return record;
  const out = Object.assign({}, record);
  const fields = [
    'plant_head_approval',
    'plant_head_approval_timestamp',
    'plant_head_approval_useremail',
    'accounts_approval',
    'accounts_approval_timestamp',
    'accounts_approval_useremail',
    'md_approval',
    'md_approval_timestamp',
    'md_approval_useremail',
    'pending_tally_posting_timestamp',
    'pending_tally_posting_useremail'
  ];
  for (var i = 0; i < fields.length; i++) {
    var key = fields[i];
    if (String(out[key] || '').trim()) continue;
    if (String(latest[key] || '').trim()) out[key] = latest[key];
  }
  return out;
}

/**
 * Maps incoming items to helper sheet row data.
 */
function buildHelperRows_(invoice, packing, poRows) {
  const baseDate = firstFilled_(packing.date, invoice.date);
  const receiptDate = formatDateForSheet_(new Date());
  const supplierDocNo = firstFilled_(invoice.invoice_no, packing.challan_no);
  const mrrNumber = firstFilled_(packing.mrr_no, invoice.mrr_no);
  const geNumber = firstFilled_(packing.ge_no, invoice.ge_no);
  const supplierName = firstFilled_(packing.buyer && packing.buyer.name_address, invoice.bill_to && invoice.bill_to.name_address);
  const normalizedTargetMrr = normalizeDocKey_(mrrNumber);
  const normalizedTargetGe = normalizeDocKey_(geNumber);
  const isParentSummaryRow = function(row) {
    const desc = String(firstFilled_(row && row.description, row && row.item_name, row && row.reel_details) || '').trim().toUpperCase();
    return desc === 'PARENT SUMMARY';
  };
  const rowBelongsToCurrentDoc = function(row) {
    const rowMrr = normalizeDocKey_(firstFilled_(row && row.mrr_no, row && row.mrr_number));
    const rowGe = normalizeDocKey_(firstFilled_(row && row.ge_no, row && row.ge_entry));
    if (rowMrr && normalizedTargetMrr && rowMrr !== normalizedTargetMrr) return false;
    if (rowGe && normalizedTargetGe && rowGe !== normalizedTargetGe) return false;
    return true;
  };
  const buildRowIdentity = function(row) {
    return [
      normalizeDocKey_(firstFilled_(row && row.s_no, row && row.sort_no)),
      normalizeDocKey_(firstFilled_(row && row.po_no, row && row.party_order)),
      normalizeDocKey_(firstFilled_(row && row.reel_no, row && row.our_reel_number)),
      normalizeDocKey_(row && row.supplier_reel_no),
      normalizeDocKey_(firstFilled_(row && row.reel_details, row && row.item_name, row && row.description)),
      normalizeDocKey_(row && row.erp_code),
      normalizeDocKey_(row && row.gsm),
      normalizeDocKey_(row && row.size),
      normalizeDocKey_(firstFilled_(row && row.net_wt, row && row.weight)),
      normalizeDocKey_(row && row.rate)
    ].join('|');
  };

  // Heuristic: Use packing.items if it has meaningful data, otherwise invoice.goods
  const packingItems = Array.isArray(packing.items) ? packing.items.filter(function(row) {
    return rowHasData_(row) && rowBelongsToCurrentDoc(row) && !isParentSummaryRow(row);
  }) : [];
  const invoiceGoods = Array.isArray(invoice.goods) ? invoice.goods.filter(function(row) {
    return rowHasData_(row) && rowBelongsToCurrentDoc(row) && !isParentSummaryRow(row);
  }) : [];
  
  const baseItems = (packingItems.length > 0) ? packingItems : invoiceGoods;
  const identitySeen = {};
  const items = [];
  for (let i = 0; i < baseItems.length; i++) {
    const row = baseItems[i];
    const identity = buildRowIdentity(row);
    if (identity && identitySeen[identity]) continue;
    if (identity) identitySeen[identity] = true;
    items.push(row);
  }

  return items.map(function(row, index) {
    const poNo = firstFilled_(row.po_no, row.party_order);
    return {
      helper_id: firstFilled_(row.helper_id, row.other_child_id),
      mrr_form_id: firstFilled_(row.mrr_form_id, invoice.mrr_form_id, packing.mrr_form_id),
      s_no: firstFilled_(row.s_no, row.sort_no, index + 1),
      mrr_number: firstFilled_(row.mrr_no, mrrNumber),
      po_details: firstFilled_(row.po_details),
      po_no: poNo,
      party_order: firstFilled_(row.party_order, row.po_no, poNo),
      po_date: firstFilled_(packing.order_date, invoice.date),
      supplier: firstFilled_(supplierName, row.supplier),
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
 * Upsert helper rows by row identity per MRR.
 * If same row is edited and saved again, update existing row.
 * If truly new row is added, append a new row.
 */
function replaceHelperRows_(sheet, mrrNumber, helperRows) {
  ensureColumnsByAliases_(sheet, HELPER_SHEET_ALIASES, HELPER_SHEET_CANONICAL_HEADERS, ['helper_id', 'mrr_form_id', 's_no', 'mrr_number'], 'replaceHelperRows');
  const headers = getHeaders_(sheet);
  if (!headers.length) throw new Error('HELPER SHEET is completely empty or missing headers.');
  
  const keyIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.mrr_number);
  if (keyIndex === -1) throw new Error('HELPER SHEET is missing MRR Number column.');
  const helperIdIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.helper_id);
  const parentIdIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.mrr_form_id);
  const normalizedKey = normalizeDocKey_(mrrNumber);
  if (!normalizedKey) throw new Error('MRR Number is required to replace HELPER SHEET rows.');
  const lastRow = sheet.getLastRow();
  const existingRows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
  const existingHelperIdSet = {};
  if (helperIdIndex !== -1) {
    for (let i = 0; i < existingRows.length; i++) {
      const rawId = String(existingRows[i][helperIdIndex] || '').trim();
      if (!rawId) continue;
      existingHelperIdSet[normalizeKey_(rawId)] = true;
    }
  }

  const serialIndex = findColumnIndex_(headers, HELPER_SHEET_ALIASES.s_no);
  let maxSerial = 0;
  if (serialIndex !== -1) {
    for (let i = 0; i < existingRows.length; i++) {
      const n = Number(existingRows[i][serialIndex]);
      if (!isNaN(n) && n > maxSerial) maxSerial = n;
    }
  }
  const nextSerial = maxSerial + 1;

  const helperIdentityKey = function(row, fallbackMrr) {
    const helperId = normalizeDocKey_(firstFilled_(row && row.helper_id, row && row.other_child_id));
    if (helperId) {
      return 'helper_id:' + helperId;
    }
    const keyMrr = normalizeDocKey_(firstFilled_(row && row.mrr_number, fallbackMrr));
    const parentId = normalizeDocKey_(row && row.mrr_form_id);
    const sNo = normalizeDocKey_(firstFilled_(row && row.s_no, row && row.sort_no));
    if (sNo) {
      return (parentId ? ('parent_id:' + parentId + '|') : '') + keyMrr + '|s_no:' + sNo;
    }
    const poNo = normalizeDocKey_(row && row.po_no);
    const ourReel = normalizeDocKey_(row && row.our_reel_number);
    const supReel = normalizeDocKey_(row && row.supplier_reel_no);
    const erp = normalizeDocKey_(row && row.erp_code);
    const poDetails = normalizeDocKey_(row && row.po_details);
    const reelDetails = normalizeDocKey_(row && row.reel_details);
    const size = normalizeDocKey_(row && row.size);
    const gsm = normalizeDocKey_(row && row.gsm);
    const bf = normalizeDocKey_(row && row.bf);

    // Stable identity for an editable line.
    const primary = [keyMrr, poNo, ourReel, supReel, erp].join('|');
    if (primary.replace(/\|/g, '') !== '') return primary;

    // Fallback for sparse/manual rows.
    return [keyMrr, poNo, poDetails, reelDetails, size, gsm, bf].join('|');
  };

  // Map existing rows by helper_id globally for strict id-based updates.
  const existingByHelperId = {};
  for (let i = 0; i < existingRows.length; i++) {
    const existingRecord = mapRowToAliasRecord_(headers, existingRows[i], HELPER_SHEET_ALIASES);
    const hid = normalizeDocKey_(firstFilled_(existingRecord.helper_id, existingRecord.other_child_id));
    if (!hid) continue;
    if (!existingByHelperId[hid]) existingByHelperId[hid] = [];
    existingByHelperId[hid].push(i + 2);
  }

  // Map existing rows for this MRR by identity so edits update in-place.
  const existingByIdentity = {};
  for (let i = 0; i < existingRows.length; i++) {
    if (normalizeDocKey_(existingRows[i][keyIndex]) !== normalizedKey) continue;
    const existingRecord = mapRowToAliasRecord_(headers, existingRows[i], HELPER_SHEET_ALIASES);
    const identity = helperIdentityKey(existingRecord, mrrNumber);
    if (!existingByIdentity[identity]) existingByIdentity[identity] = [];
    existingByIdentity[identity].push(i + 2); // sheet row number
  }

  // Precompile reverse map for highly optimized header mapping
  const aliasReverseMap = buildReverseAliasMap_(HELPER_SHEET_ALIASES);
  const headerKeys = headers.map(h => aliasReverseMap[normalizeHeader_(h)]);
  const rowsWithSerial = [];
  const rowsToAppend = [];
  let updatedRows = 0;
  let deletedRows = 0;
  let serialCounter = nextSerial;
  const touchedExistingRows = {};
  const existingRowsForMrr = [];
  for (let i = 0; i < existingRows.length; i++) {
    if (normalizeDocKey_(existingRows[i][keyIndex]) !== normalizedKey) continue;
    existingRowsForMrr.push(i + 2); // sheet row number
  }

  for (let i = 0; i < helperRows.length; i++) {
    const incoming = Object.assign({}, helperRows[i] || {});
    const identity = helperIdentityKey(incoming, mrrNumber);
    const incomingHelperId = normalizeDocKey_(firstFilled_(incoming.helper_id, incoming.other_child_id));
    const matchedRows = incomingHelperId
      ? (existingByHelperId[incomingHelperId] || [])
      : (existingByIdentity[identity] || []);
    if (incomingHelperId && !matchedRows.length) {
      throw new Error('HELPER row not found for Helper Id: ' + firstFilled_(incoming.helper_id, incoming.other_child_id));
    }

    if (matchedRows.length) {
      // Update the first matching existing row in-place.
      const targetRow = matchedRows.shift();
      touchedExistingRows[targetRow] = true;
      const existingRowValues = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
      const existingRecord = mapRowToAliasRecord_(headers, existingRowValues, HELPER_SHEET_ALIASES);
      const serialValue = firstFilled_(existingRecord.s_no, incoming.s_no, '');
      const merged = Object.assign({}, existingRecord, incoming, { s_no: serialValue });
      const finalValues = buildRowValuesFromHeaderKeys_(headerKeys, merged);
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([finalValues]);
      rowsWithSerial.push(merged);
      updatedRows++;
      continue;
    }

    const recordWithSerial = Object.assign({}, incoming, { s_no: serialCounter++ });
    if (!recordWithSerial.mrr_form_id && parentIdIndex !== -1) {
      // Attach parent id if available in incoming data or existing mapped rows.
      recordWithSerial.mrr_form_id = firstFilled_(incoming.mrr_form_id, '');
    }
    if (!recordWithSerial.helper_id && helperIdIndex !== -1) {
      recordWithSerial.helper_id = generateUniqueAlphaNumId_(existingHelperIdSet, 6);
    }
    if (recordWithSerial.helper_id) {
      existingHelperIdSet[normalizeKey_(String(recordWithSerial.helper_id))] = true;
    }
    rowsWithSerial.push(recordWithSerial);
    rowsToAppend.push(buildRowValuesFromHeaderKeys_(headerKeys, recordWithSerial));
  }

  if (rowsToAppend.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }

  // Strict replace semantics: remove stale helper rows for this MRR
  // that were not part of current incoming payload.
  const staleRows = [];
  for (let i = 0; i < existingRowsForMrr.length; i++) {
    const rowNum = existingRowsForMrr[i];
    if (!touchedExistingRows[rowNum]) staleRows.push(rowNum);
  }
  for (let i = staleRows.length - 1; i >= 0; i--) {
    sheet.deleteRow(staleRows[i]);
    deletedRows++;
  }

  return { deletedRows: deletedRows, insertedRows: rowsToAppend.length, updatedRows: updatedRows, rowsWithSerial: rowsWithSerial };
}

/**
 * Upsert MRR row by unique keys so parent GE/MRR are not duplicated.
 */
function replaceMrrRowsForMrr_(sheet, mrrNumber, rowRecords) {
  const rows = Array.isArray(rowRecords) ? rowRecords : [];
  if (!String(mrrNumber || '').trim()) throw new Error('MRR Number is required to replace MRR FORM rows.');
  if (!rows.length) throw new Error('MRR FORM requires at least 1 row record.');

  ensureColumnsByAliases_(sheet, MRR_FORM_ALIASES, MRR_FORM_CANONICAL_HEADERS, ['mrr_form_id', 'mrr_number', 'ge_no'], 'replaceMrrRowsForMrr');
  const headers = getHeaders_(sheet);
  if (!headers.length) throw new Error('MRR FORM is completely empty or missing headers.');
  const keyIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_number);
  const idIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_form_id);
  if (keyIndex === -1) throw new Error('MRR FORM is missing MRR Number column.');

  const normalizedKey = normalizeDocKey_(mrrNumber);
  const lastRow = sheet.getLastRow();
  const existingRows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
  const rowsToDelete = [];
  for (var i = 0; i < existingRows.length; i++) {
    if (normalizeDocKey_(existingRows[i][keyIndex]) === normalizedKey) rowsToDelete.push(i + 2);
  }
  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  const aliasReverseMap = buildReverseAliasMap_(MRR_FORM_ALIASES);
  const headerKeys = headers.map(function(h) { return aliasReverseMap[normalizeHeader_(h)]; });
  const existingIdSet = {};
  if (idIndex !== -1) {
    const afterDeleteLastRow = sheet.getLastRow();
    const afterDeleteRows = afterDeleteLastRow >= 2 ? sheet.getRange(2, 1, afterDeleteLastRow - 1, headers.length).getValues() : [];
    for (var e = 0; e < afterDeleteRows.length; e++) {
      const raw = String(afterDeleteRows[e][idIndex] || '').trim();
      if (!raw) continue;
      existingIdSet[normalizeKey_(raw)] = true;
    }
  }
  const rowsToInsert = [];
  for (var r = 0; r < rows.length; r++) {
    var record = Object.assign({}, rows[r] || {});
    record.mrr_number = firstFilled_(record.mrr_number, mrrNumber);
    if (idIndex !== -1) {
      var existingId = String(record.mrr_form_id || '').trim();
      if (!existingId) {
        record.mrr_form_id = generateUniqueAlphaNumId_(existingIdSet, 8);
        existingIdSet[normalizeKey_(record.mrr_form_id)] = true;
      } else {
        const idKey = normalizeKey_(existingId);
        if (existingIdSet[idKey]) {
          record.mrr_form_id = generateUniqueAlphaNumId_(existingIdSet, 8);
          existingIdSet[normalizeKey_(record.mrr_form_id)] = true;
        } else {
          existingIdSet[idKey] = true;
        }
      }
    }
    rowsToInsert.push(buildRowValuesFromHeaderKeys_(headerKeys, record));
  }
  if (rowsToInsert.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
  }
  return {
    updatedRows: 0,
    insertedRows: rowsToInsert.length,
    deletedRows: rowsToDelete.length
  };
}

/**
 * Upsert MRR row by unique keys so parent GE/MRR are not duplicated.
 */
function upsertMrrFormRow_(sheet, record) {
  const mrrNumber = record.mrr_number;
  if (!String(mrrNumber || '').trim()) throw new Error('MRR Number is required to upsert form.');

  ensureColumnsByAliases_(sheet, MRR_FORM_ALIASES, MRR_FORM_CANONICAL_HEADERS, ['mrr_form_id', 'mrr_number', 'ge_no'], 'upsertMrrFormRow');
  const headers = getHeaders_(sheet);
  if (!headers.length) throw new Error('MRR FORM is completely empty or missing headers.');
  
  const keyIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_number);
  if (keyIndex === -1) throw new Error('MRR FORM is missing MRR Number column.');
  const idIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_form_id);
  const geIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.ge_no);

  const aliasReverseMap = buildReverseAliasMap_(MRR_FORM_ALIASES);
  const headerKeys = headers.map(h => aliasReverseMap[normalizeHeader_(h)]);
  const geNo = String(record.ge_no || '').trim();
  const mrrFormId = String(record.mrr_form_id || '').trim();

  // Dedupe rule:
  // If parent id is provided, update ONLY that id row.
  // If parent id is not provided, fallback to MRR No / GE No matching.
  let existingRowNumber = -1;
  if (mrrFormId && idIndex !== -1) {
    existingRowNumber = findRowNumberByKey_(sheet, idIndex, mrrFormId);
    if (existingRowNumber < 0) {
      throw new Error('MRR FORM row not found for Mrr form Id: ' + mrrFormId);
    }
  } else if (!mrrFormId) {
    existingRowNumber = findRowNumberByKey_(sheet, keyIndex, mrrNumber);
    if (existingRowNumber < 0 && geNo && geIndex !== -1) {
      existingRowNumber = findRowNumberByKey_(sheet, geIndex, geNo);
    }
  }

  if (existingRowNumber > 0) {
    const existingValues = sheet.getRange(existingRowNumber, 1, 1, headers.length).getValues()[0];
    const merged = mergeExistingRowValuesOptimized_(headerKeys, existingValues, record);
    const mergedRecord = mapRowToAliasRecord_(headers, merged, MRR_FORM_ALIASES);
    sheet.getRange(existingRowNumber, 1, 1, headers.length).setValues([merged]);
    return {
      updatedRows: 1,
      insertedRows: 0,
      rowNumber: existingRowNumber,
      dedupedBy: 'mrr_or_ge',
      mrr_form_id: firstFilled_(mergedRecord.mrr_form_id, record.mrr_form_id)
    };
  }

  if (!mrrFormId && idIndex !== -1) {
    record.mrr_form_id = getNextNumericIdForColumn_(sheet, idIndex);
  }
  const newRow = buildRowValuesFromHeaderKeys_(headerKeys, record);
  const rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([newRow]);
  return {
    updatedRows: 0,
    insertedRows: 1,
    rowNumber: rowNumber,
    dedupedBy: 'none_inserted',
    mrr_form_id: firstFilled_(record.mrr_form_id)
  };
}

/**
 * Saves a new Gate Entry row or updates an existing one.
 */
function saveGeEntryRow_(ss, data) {
  const geSheetName = 'GE ENTRY';
  const sheet = getSheetOrThrow_(ss, geSheetName);
  ensureColumnsByAliases_(sheet, GE_ENTRY_ALIASES, GE_ENTRY_CANONICAL_HEADERS, ['timestamp', 'date', 'ge_no', 'supplier', 'invoice_no', 'mrr_no', 'mrr_complete'], 'saveGeEntryRow');
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
function updateGeEntryWithMrr_(ss, geNo, mrrNo, options) {
  if (!geNo || !mrrNo) return;
  const geSheetName = 'GE ENTRY';
  const markComplete = !!(options && options.markComplete);
  const requestId = options && options.requestId ? String(options.requestId) : '';
  const geEntryUpdate = options && options.geEntryUpdate ? options.geEntryUpdate : {};
  let sheet;
  try {
    sheet = ss.getSheetByName(geSheetName);
    if (!sheet) return;
  } catch (e) {
    return;
  }

  ensureColumnsByAliases_(sheet, GE_ENTRY_ALIASES, GE_ENTRY_CANONICAL_HEADERS, ['ge_no', 'mrr_no', 'mrr_complete'], requestId || 'updateGeEntryWithMrr');
  const headers = getHeaders_(sheet);
  const geIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.ge_no);
  const mrrIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_no);
  const completeIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_complete);
  const dateIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.date);
  const supplierIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.supplier);
  const invoiceIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.invoice_no);
  const totalValueIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.total_value);
  const truckIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.truck_no);
  
  if (geIndex === -1 || mrrIndex === -1) return;
  
  const rowNumber = findRowNumberByKey_(sheet, geIndex, geNo);
  if (rowNumber > 0) {
    const rowValues = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

    const setIndexValueIfPresent = function(colIndex, value, allowBlank) {
      if (colIndex === -1) return;
      if (value === undefined || value === null) return;
      const text = String(value).trim();
      if (!allowBlank && text === '') return;
      rowValues[colIndex] = value;
    };

    // Always keep GE->MRR mapping up-to-date.
    setIndexValueIfPresent(mrrIndex, mrrNo, false);
    // Keep GE ENTRY data in sync with latest MRR form edits.
    setIndexValueIfPresent(dateIndex, geEntryUpdate.date, false);
    setIndexValueIfPresent(supplierIndex, geEntryUpdate.supplier, false);
    setIndexValueIfPresent(invoiceIndex, geEntryUpdate.invoice_no, false);
    setIndexValueIfPresent(totalValueIndex, geEntryUpdate.total_value, false);
    setIndexValueIfPresent(truckIndex, geEntryUpdate.truck_no, false);

    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([rowValues]);
    logDebug_('[updateGeEntryWithMrr_] MRR linked in GE ENTRY', {
      requestId: requestId,
      ge_no: geNo,
      mrr_no: mrrNo,
      rowNumber: rowNumber,
      syncedFields: {
        date: dateIndex !== -1,
        supplier: supplierIndex !== -1,
        invoice_no: invoiceIndex !== -1,
        total_value: totalValueIndex !== -1,
        truck_no: truckIndex !== -1
      }
    });
    if (markComplete && completeIndex !== -1) {
      const existingComplete = String(rowValues[completeIndex] || '').trim();
      if (!existingComplete) {
        const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm:ss');
        sheet.getRange(rowNumber, completeIndex + 1).setValue(stamp);
        logDebug_('[updateGeEntryWithMrr_] MRR COMPLETE timestamp updated', {
          requestId: requestId,
          ge_no: geNo,
          mrr_no: mrrNo,
          rowNumber: rowNumber,
          timestamp: stamp
        });
      }
    }
  } else {
    logDebug_('[updateGeEntryWithMrr_] GE row not found for mapping', {
      requestId: requestId,
      ge_no: geNo,
      mrr_no: mrrNo
    });
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

function buildGeEntryUpdateFromMrr_(invoice, packing, baseMrrRecord) {
  const inv = invoice || {};
  const pack = packing || {};
  const base = baseMrrRecord || {};

  const billTo = inv.bill_to || {};
  const buyer = pack.buyer || {};
  const totals = inv.totals || {};

  return {
    date: firstFilled_(inv.date, pack.date, base.date),
    supplier: firstFilled_(billTo.name_address, buyer.name_address, base.supplier),
    invoice_no: firstFilled_(inv.invoice_no, pack.challan_no, base.sup_doc_no),
    truck_no: firstFilled_(inv.vehicle_no, pack.truck_no, base.truck_number),
    total_value: firstFilled_(base.invoice_basic_value, totals.gross_amount, totals.taxable_gst)
  };
}

function syncMrrSheetsFromGeEntry_(ss, geData, options) {
  const requestId = options && options.requestId ? String(options.requestId) : '';
  const candidateSheets = [];
  const pushName = function(name) {
    const text = String(name || '').trim();
    if (!text) return;
    if (candidateSheets.indexOf(text) === -1) candidateSheets.push(text);
  };

  pushName(options && options.mrrSheetName);
  pushName(DEFAULT_SHEETS.mrrForm);
  pushName('OTHER MRR');

  const results = [];
  for (var i = 0; i < candidateSheets.length; i++) {
    var name = candidateSheets[i];
    var sheet = null;
    try {
      sheet = ss.getSheetByName(name);
    } catch (e) {
      sheet = null;
    }
    if (!sheet) continue;
    var updatedRows = syncSingleMrrSheetFromGeEntry_(sheet, geData, requestId);
    results.push({
      sheet: name,
      updatedRows: Number(updatedRows || 0)
    });
  }
  return results;
}

function syncSingleMrrSheetFromGeEntry_(sheet, geData, requestId) {
  if (!sheet) return 0;
  const geNo = String(firstFilled_(geData && geData.ge_no, geData && geData.ge_entry, '')).trim();
  const mrrNo = String(firstFilled_(geData && geData.mrr_no, geData && geData.mrr_number, '')).trim();
  if (!geNo && !mrrNo) return 0;

  ensureColumnsByAliases_(sheet, MRR_FORM_ALIASES, MRR_FORM_CANONICAL_HEADERS, ['mrr_number', 'ge_no'], requestId || 'syncSingleMrrSheetFromGeEntry');
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (!headers.length || lastRow < 2) return 0;

  const mrrIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.mrr_number);
  const geIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.ge_no);
  const dateIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.date);
  const supplierIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.supplier);
  const supplierIndexes = findColumnIndexes_(headers, MRR_FORM_ALIASES.supplier);
  const supDocIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.sup_doc_no);
  const truckIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.truck_number);
  const invoiceBasicIndex = findColumnIndex_(headers, MRR_FORM_ALIASES.invoice_basic_value);

  const targetMrr = normalizeKey_(mrrNo);
  const targetGe = normalizeKey_(geNo);
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let touched = 0;

  const updatedDate = firstFilled_(geData && geData.date, '');
  const updatedSupplier = firstFilled_(geData && geData.supplier, geData && geData.supplier_name, '');
  const updatedInvoice = firstFilled_(geData && geData.invoice_no, '');
  const updatedTruck = firstFilled_(geData && geData.truck_no, '');
  const updatedValue = firstFilled_(geData && geData.total_value, '');

  const applyIfPresent = function(row, idx, value) {
    if (idx === -1) return false;
    if (value === undefined || value === null) return false;
    if (String(value).trim() === '') return false;
    if (String(row[idx] || '') === String(value)) return false;
    row[idx] = value;
    return true;
  };

  for (var i = 0; i < data.length; i++) {
    const row = data[i];
    const rowMrr = mrrIndex === -1 ? '' : normalizeKey_(row[mrrIndex]);
    const rowGe = geIndex === -1 ? '' : normalizeKey_(row[geIndex]);
    const mrrMatch = !!(targetMrr && rowMrr && rowMrr === targetMrr);
    const geMatch = !!(targetGe && rowGe && rowGe === targetGe);
    if (!mrrMatch && !geMatch) continue;

    let changed = false;
    changed = applyIfPresent(row, geIndex, geNo) || changed;
    changed = applyIfPresent(row, mrrIndex, mrrNo) || changed;
    changed = applyIfPresent(row, dateIndex, updatedDate) || changed;
    if (supplierIndexes && supplierIndexes.length) {
      for (var s = 0; s < supplierIndexes.length; s++) {
        changed = applyIfPresent(row, supplierIndexes[s], updatedSupplier) || changed;
      }
    } else {
      changed = applyIfPresent(row, supplierIndex, updatedSupplier) || changed;
    }
    changed = applyIfPresent(row, supDocIndex, updatedInvoice) || changed;
    changed = applyIfPresent(row, truckIndex, updatedTruck) || changed;
    changed = applyIfPresent(row, invoiceBasicIndex, updatedValue) || changed;
    if (changed) touched += 1;
  }

  if (touched > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
  return touched;
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
  const debitNote = String(params.debitNote || '').trim();
  const debitNoteDate = String(params.debitNoteDate || '').trim();
  const debitNoteAmount = String(params.debitNoteAmount || '').trim();

  if (!mrrNumber) throw new Error('MRR Number is required.');
  if (!userEmail) throw new Error('User email is required for approval.');

  var statusField = '';
  var timestampField = '';
  var userField = '';
  if (stage === 'pending_plant_head_approval') {
    statusField = 'plant_head_approval';
    timestampField = 'plant_head_approval_timestamp';
    userField = 'plant_head_approval_useremail';
  } else if (stage === 'pending_accounts_approval') {
    statusField = 'accounts_approval';
    timestampField = 'accounts_approval_timestamp';
    userField = 'accounts_approval_useremail';
  } else if (stage === 'pending_md_approval') {
    statusField = 'md_approval';
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
  if (statusField) updates[statusField] = 'Approved';
  updates[timestampField] = stamp;
  updates[userField] = userEmail;
  if (stage === 'pending_accounts_approval') {
    updates.debit_note = debitNote;
    updates.debit_note_date = debitNoteDate;
    updates.debit_note_amount = debitNoteAmount;
  }

  const mrrSheet = getSheetOrThrow_(ss, mrrSheetName);
  const requiredApprovalFields = ['mrr_number', timestampField, userField];
  if (statusField) requiredApprovalFields.push(statusField);
  if (stage === 'pending_accounts_approval') {
    requiredApprovalFields.push('debit_note', 'debit_note_date', 'debit_note_amount');
  }
  ensureColumnsByAliases_(mrrSheet, MRR_FORM_ALIASES, MRR_FORM_CANONICAL_HEADERS, requiredApprovalFields, 'approvePendingStage');
  if (!isMrrCompleteInGeEntry_(ss, mrrNumber)) {
    throw new Error('MRR must be completed before approval.');
  }
  const currentState = getLatestApprovalStateByMrr_(mrrSheet, mrrNumber, MRR_FORM_ALIASES);

  if (!currentState.found) {
    throw new Error('MRR not found in ' + mrrSheetName + ': ' + mrrNumber);
  }
  if (stage === 'pending_accounts_approval' && !currentState.plantHeadApproval) {
    throw new Error('Plant Head approval is required before Accounts approval.');
  }
  if (stage === 'pending_md_approval' && !currentState.accountsApproval) {
    throw new Error('Accounts approval is required before MD approval.');
  }
  if (stage === 'pending_tally_posting' && (!currentState.accountsApproval || !currentState.mdApproval)) {
    throw new Error('Accounts and MD approvals are required before Tally posting.');
  }

  // Update approval on parent-level MRR row.
  const mrrUpdatedRows = updateApprovalColumnsByMrr_(mrrSheet, mrrNumber, MRR_FORM_ALIASES, updates);
  // Mirror the same approval state on child/helper rows for the same MRR.
  const helperSheet = getSheetOrThrow_(ss, helperSheetName);
  const requiredHelperApprovalFields = ['mrr_number', timestampField, userField];
  if (statusField) requiredHelperApprovalFields.push(statusField);
  if (stage === 'pending_accounts_approval') {
    requiredHelperApprovalFields.push('debit_note', 'debit_note_date', 'debit_note_amount');
  }
  ensureColumnsByAliases_(helperSheet, HELPER_SHEET_ALIASES, HELPER_SHEET_CANONICAL_HEADERS, requiredHelperApprovalFields, 'approvePendingStageHelper');
  const helperUpdatedRows = updateApprovalColumnsByMrr_(helperSheet, mrrNumber, HELPER_SHEET_ALIASES, updates);
  let geCompletedRows = 0;
  if (stage === 'pending_tally_posting') {
    geCompletedRows = markGeEntryCompleteByMrr_(ss, mrrNumber, stamp);
  }

  const nextStage = stage === 'pending_plant_head_approval'
    ? 'pending_accounts_approval'
    : stage === 'pending_accounts_approval'
      ? 'pending_md_approval'
      : stage === 'pending_md_approval'
      ? 'pending_tally_posting'
      : 'completed';

  return {
    stage: stage,
    next_stage: nextStage,
    completed: nextStage === 'completed',
    mrr_number: mrrNumber,
    timestamp: stamp,
    user_email: userEmail,
    debit_note: debitNote,
    debit_note_date: debitNoteDate,
    debit_note_amount: debitNoteAmount,
    mrr_updated_rows: mrrUpdatedRows,
    helper_updated_rows: helperUpdatedRows,
    ge_completed_rows: geCompletedRows
  };
}

function isMrrCompleteInGeEntry_(ss, mrrNumber) {
  try {
    const geSheet = getSheetOrThrow_(ss, 'GE ENTRY');
    const headers = getHeaders_(geSheet);
    const mrrIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_no);
    const completeIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_complete);
    const lastRow = geSheet.getLastRow();
    if (mrrIndex === -1 || completeIndex === -1 || lastRow < 2) return true;

    const data = geSheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
    const target = normalizeKey_(mrrNumber);
    var matched = false;

    for (var i = 0; i < data.length; i++) {
      if (normalizeKey_(data[i][mrrIndex]) !== target) continue;
      matched = true;
      if (String(data[i][completeIndex] || '').trim()) return true;
    }
    return !matched;
  } catch (e) {
    return true;
  }
}

function getLatestApprovalStateByMrr_(sheet, mrrNumber, aliasMap) {
  const headers = getHeaders_(sheet);
  if (!headers.length) return { found: false, plantHeadApproval: false, accountsApproval: false, mdApproval: false, tallyPosting: false };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { found: false, plantHeadApproval: false, accountsApproval: false, mdApproval: false, tallyPosting: false };

  const mrrIndex = findColumnIndex_(headers, aliasMap.mrr_number);
  if (mrrIndex === -1) return { found: false, plantHeadApproval: false, accountsApproval: false, mdApproval: false, tallyPosting: false };
  const plantHeadIndex = findColumnIndex_(headers, aliasMap.plant_head_approval_timestamp);
  const accountsIndex = findColumnIndex_(headers, aliasMap.accounts_approval_timestamp);
  const mdIndex = findColumnIndex_(headers, aliasMap.md_approval_timestamp);
  const tallyIndex = findColumnIndex_(headers, aliasMap.pending_tally_posting_timestamp);

  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const target = normalizeKey_(mrrNumber);
  let latest = null;
  for (var i = 0; i < data.length; i++) {
    if (normalizeKey_(data[i][mrrIndex]) !== target) continue;
    latest = data[i];
  }
  if (!latest) return { found: false, plantHeadApproval: false, accountsApproval: false, mdApproval: false, tallyPosting: false };

  return {
    found: true,
    plantHeadApproval: plantHeadIndex !== -1 ? String(latest[plantHeadIndex] || '').trim() !== '' : false,
    accountsApproval: accountsIndex !== -1 ? String(latest[accountsIndex] || '').trim() !== '' : false,
    mdApproval: mdIndex !== -1 ? String(latest[mdIndex] || '').trim() !== '' : false,
    tallyPosting: tallyIndex !== -1 ? String(latest[tallyIndex] || '').trim() !== '' : false
  };
}

function markGeEntryCompleteByMrr_(ss, mrrNumber, stamp) {
  if (!mrrNumber) return 0;
  const geSheet = getSheetOrThrow_(ss, 'GE ENTRY');
  ensureColumnsByAliases_(geSheet, GE_ENTRY_ALIASES, GE_ENTRY_CANONICAL_HEADERS, ['mrr_no', 'mrr_complete'], 'markGeEntryCompleteByMrr');

  const headers = getHeaders_(geSheet);
  const mrrIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_no);
  const completeIndex = findColumnIndex_(headers, GE_ENTRY_ALIASES.mrr_complete);
  if (mrrIndex === -1 || completeIndex === -1) return 0;

  const lastRow = geSheet.getLastRow();
  if (lastRow < 2) return 0;
  const data = geSheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const target = normalizeKey_(mrrNumber);
  let updated = 0;

  for (var i = 0; i < data.length; i++) {
    if (normalizeKey_(data[i][mrrIndex]) !== target) continue;
    const rowNumber = i + 2;
    const existing = String(data[i][completeIndex] || '').trim();
    if (existing) continue;
    geSheet.getRange(rowNumber, completeIndex + 1).setValue(stamp);
    updated++;
  }
  return updated;
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

function mapRowToAliasRecord_(headers, rowValues, aliasMap) {
  const reverse = buildReverseAliasMap_(aliasMap || {});
  const record = {};
  for (var i = 0; i < headers.length; i++) {
    var key = reverse[normalizeHeader_(headers[i])];
    if (!key) continue;
    record[key] = rowValues[i];
  }
  return record;
}

function findColumnIndex_(headers, aliasList) {
  const normalizedAliases = (aliasList || []).map(normalizeHeader_);
  for (let i = 0; i < headers.length; i += 1) {
    if (normalizedAliases.indexOf(normalizeHeader_(headers[i])) !== -1) return i;
  }
  return -1;
}

function findColumnIndexes_(headers, aliasList) {
  const normalizedAliases = (aliasList || []).map(normalizeHeader_);
  const indexes = [];
  for (let i = 0; i < headers.length; i += 1) {
    if (normalizedAliases.indexOf(normalizeHeader_(headers[i])) !== -1) indexes.push(i);
  }
  return indexes;
}

function ensureColumnsByAliases_(sheet, aliasMap, canonicalMap, requiredFields, traceId) {
  const fields = Array.isArray(requiredFields) ? requiredFields : [];
  if (!fields.length) return;
  let headers = getHeaders_(sheet);
  let appended = [];

  if (!headers.length && sheet.getLastColumn() === 0) {
    const bootstrapHeaders = fields.map(function(field) {
      return (canonicalMap && canonicalMap[field]) || field;
    });
    if (bootstrapHeaders.length) {
      sheet.getRange(1, 1, 1, bootstrapHeaders.length).setValues([bootstrapHeaders]);
      headers = getHeaders_(sheet);
      appended = appended.concat(bootstrapHeaders);
    }
  }

  const missingHeaders = [];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var aliases = aliasMap && aliasMap[field] ? aliasMap[field] : [];
    var colIndex = findColumnIndex_(headers, aliases);
    if (colIndex === -1) {
      missingHeaders.push((canonicalMap && canonicalMap[field]) || field);
    }
  }

  if (missingHeaders.length) {
    const startCol = Math.max(1, sheet.getLastColumn() + 1);
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    appended = appended.concat(missingHeaders);
  }

  if (appended.length) {
    logDebug_('[ensureColumnsByAliases_] Added missing headers', {
      traceId: String(traceId || ''),
      sheetName: sheet.getName(),
      addedHeaders: appended
    });
  }
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

function getNextNumericIdForColumn_(sheet, colIndex) {
  const lastRow = sheet.getLastRow();
  if (colIndex < 0 || lastRow < 2) return 1;
  const values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getDisplayValues();
  let maxValue = 0;
  for (let i = 0; i < values.length; i++) {
    const num = Number(String(values[i][0] || '').replace(/[^\d]/g, ''));
    if (!isNaN(num) && num > maxValue) maxValue = num;
  }
  return maxValue + 1;
}

function generateUniqueAlphaNumId_(existingSet, length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const targetLen = Math.max(4, Number(length) || 6);
  for (let attempt = 0; attempt < 5000; attempt++) {
    let id = '';
    for (let i = 0; i < targetLen; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const key = normalizeKey_(id);
    if (!existingSet || !existingSet[key]) return id;
  }
  throw new Error('Could not generate unique alphanumeric id.');
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
    pending_plant_head_approval: 'pending_plant_head_approval',
    pending_planthead_approval: 'pending_plant_head_approval',
    pending_plant_head: 'pending_plant_head_approval',
    pending_planthead: 'pending_plant_head_approval',
    pending_plant_approval: 'pending_plant_head_approval',
    pending_plant: 'pending_plant_head_approval',
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
  if (compact.indexOf('plant') !== -1 || compact.indexOf('head') !== -1) return 'pending_plant_head_approval';
  if (compact.indexOf('account') !== -1 || compact.indexOf('accound') !== -1) return 'pending_accounts_approval';

  return raw;
}

function normalizeHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeKey_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDocKey_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^'+/, '')
    .replace(/\s+/g, '');
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
  const keyFields = ['helper_id', 'other_child_id', 's_no', 'sort_no', 'reel_no', 'supplier_reel_no', 'po_no', 'party_order', 'po_details', 'erp_code', 'reel_details', 'item_name', 'description'];
  for (let i = 0; i < keyFields.length; i++) {
    const key = keyFields[i];
    if (String((row || {})[key] || '').trim() !== '') return true;
  }
  return Object.keys(row || {}).some(function(key) {
    if (['sno', 's_no', 'unit', 'size_unit', 'weight_unit', 'mrr_no', 'ge_no', 'helper_id', 'other_child_id', 'mrr_form_id', 'other_id'].indexOf(key) !== -1) return false;
    const val = String(row[key] || '').trim();
    return val !== '' && skipValues.indexOf(val) === -1;
  });
}

function n_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const text = String(value || '').trim();
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').replace(/[^\d.\-]/g, '');
  const parsed = Number(cleaned);
  return isFinite(parsed) ? parsed : 0;
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

function logDebug_(label, payload) {
  try {
    Logger.log('%s %s', label, JSON.stringify(payload || {}));
  } catch (e) {
    Logger.log('%s (payload not serializable)', label);
  }
}

function diagnoseSave_(ss, mrrSheetName, helperSheetName, mrrNumber) {
  const out = {
    spreadsheet: {
      id: ss.getId(),
      name: ss.getName()
    },
    mrrSheet: {
      name: mrrSheetName,
      exists: false,
      lastRow: 0,
      lastCol: 0,
      keyColumnFound: false
    },
    helperSheet: {
      name: helperSheetName,
      exists: false,
      lastRow: 0,
      lastCol: 0,
      keyColumnFound: false
    },
    countsForMrr: {
      mrr: 0,
      helper: 0
    },
    missing: {
      mrrRequired: [],
      helperRequired: []
    }
  };

  try {
    const mrrSheet = getSheetOrThrow_(ss, mrrSheetName);
    const mrrHeaders = getHeaders_(mrrSheet);
    out.mrrSheet.exists = true;
    out.mrrSheet.lastRow = mrrSheet.getLastRow();
    out.mrrSheet.lastCol = mrrSheet.getLastColumn();
    out.mrrSheet.keyColumnFound = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.mrr_number) !== -1;

    const requiredMrrFields = ['mrr_number', 'ge_no'];
    for (var i = 0; i < requiredMrrFields.length; i++) {
      var field = requiredMrrFields[i];
      if (findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES[field]) === -1) {
        out.missing.mrrRequired.push((MRR_FORM_CANONICAL_HEADERS[field] || field));
      }
    }

    if (mrrNumber && out.mrrSheet.keyColumnFound && out.mrrSheet.lastRow >= 2) {
      var mrrKeyIndex = findColumnIndex_(mrrHeaders, MRR_FORM_ALIASES.mrr_number);
      var rows = mrrSheet.getRange(2, mrrKeyIndex + 1, out.mrrSheet.lastRow - 1, 1).getDisplayValues();
      var target = normalizeKey_(mrrNumber);
      for (var r = 0; r < rows.length; r++) {
        if (normalizeKey_(rows[r][0]) === target) out.countsForMrr.mrr++;
      }
    }
  } catch (mrrErr) {
    out.mrrSheet.error = String(mrrErr);
  }

  try {
    const helperSheet = getSheetOrThrow_(ss, helperSheetName);
    const helperHeaders = getHeaders_(helperSheet);
    out.helperSheet.exists = true;
    out.helperSheet.lastRow = helperSheet.getLastRow();
    out.helperSheet.lastCol = helperSheet.getLastColumn();
    out.helperSheet.keyColumnFound = findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES.mrr_number) !== -1;

    const requiredHelperFields = ['s_no', 'mrr_number'];
    for (var j = 0; j < requiredHelperFields.length; j++) {
      var hfield = requiredHelperFields[j];
      if (findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES[hfield]) === -1) {
        out.missing.helperRequired.push((HELPER_SHEET_CANONICAL_HEADERS[hfield] || hfield));
      }
    }

    if (mrrNumber && out.helperSheet.keyColumnFound && out.helperSheet.lastRow >= 2) {
      var helperKeyIndex = findColumnIndex_(helperHeaders, HELPER_SHEET_ALIASES.mrr_number);
      var hrows = helperSheet.getRange(2, helperKeyIndex + 1, out.helperSheet.lastRow - 1, 1).getDisplayValues();
      var htarget = normalizeKey_(mrrNumber);
      for (var hr = 0; hr < hrows.length; hr++) {
        if (normalizeKey_(hrows[hr][0]) === htarget) out.countsForMrr.helper++;
      }
    }
  } catch (helperErr) {
    out.helperSheet.error = String(helperErr);
  }

  return out;
}

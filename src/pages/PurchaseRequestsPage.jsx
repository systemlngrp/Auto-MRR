import React, { useEffect, useMemo, useState } from 'react';

const blankItemRow = () => ({
  item_id: '',
  pr_item_id: '',
  erp_code: '',
  item_name: '',
  description: '',
  unit: 'PCS',
  qty: '',
  rate: '',
  amount: '',
  last_po_date: '',
  last_po_rate: '',
  remark: ''
});

const blankPr = () => ({
  pr_no: '',
  requested_by: '',
  requisition_date: '',
  required_date: '',
  remark: '',
  status: 'pending'
});

function toNumber(value) {
  const num = Number(String(value ?? '').trim());
  return Number.isFinite(num) ? num : 0;
}

function formatAmount(value) {
  const num = toNumber(value);
  if (!num) return '';
  return String(Number(num.toFixed(2)));
}

function ddmmyyyyToIso(value) {
  const t = String(value || '').trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return '';
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDdmmyyyy(value) {
  const t = String(value || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function getRowDepartment(row) {
  return String(
    row?.department ??
    row?.dept ??
    row?.dept_name ??
    row?.department_name ??
    row?.requested_dept ??
    ''
  ).trim();
}

function inferPrNoFromPoNo(poNo) {
  const text = String(poNo || '').trim();
  if (!text) return '';
  // Common patterns:
  // - "PO-26-27/00003" -> "PR-26-27/00003"
  // - "PO 26-27/00003" -> "PR 26-27/00003"
  // - "PO26-27/00003"  -> "PR26-27/00003"
  if (/^PO\s*-/i.test(text)) return text.replace(/^PO\s*-/i, 'PR-');
  if (/^PO\s+/i.test(text)) return text.replace(/^PO\s+/i, 'PR ');
  if (/^PO/i.test(text)) return text.replace(/^PO/i, 'PR');
  return '';
}

export default function PurchaseRequestsPage({
  selectedFirm,
  deps,
  onBack,
  onOpenNewItem,
  createdItem,
  createdItemContext,
  onCreatedItemConsumed,
  onMakePoFromPr,
  onOpenPoFromPr,
  mode = 'manage', // 'manage' | 'approve'
  currentUser
}) {
  const {
    fetchItems,
    fetchLastPurchaseInfo,
    fetchPurchaseRequests,
    fetchPurchaseRequestDetails,
    fetchPurchaseOrders,
    savePurchaseRequest,
    approvePurchaseRequest
  } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('pending'); // all | pending | approved | rejected
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(''); // YYYY-MM-DD
  const [toDate, setToDate] = useState(''); // YYYY-MM-DD

  const [view, setView] = useState('list'); // list | form
  const [formData, setFormData] = useState(blankPr());
  const [items, setItems] = useState([blankItemRow()]);
  const [itemMasterType, setItemMasterType] = useState('reel'); // reel | other (for dropdown)
  const [itemMaster, setItemMaster] = useState([]);
  const [lastPurchaseByKey, setLastPurchaseByKey] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPrNo, setSelectedPrNo] = useState('');
  const [poByPrNo, setPoByPrNo] = useState({});

  const userEmail = String(currentUser?.user_email || currentUser?.user?.user_email || '').trim();
  const isApproveMode = mode === 'approve';

  const load = async () => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading purchase requests...');
    try {
      const data = await fetchPurchaseRequests({ spreadsheetId: selectedFirm.spreadsheetId });
      const rawRows = Array.isArray(data) ? data : [];
      let map = {};
      if (fetchPurchaseOrders) {
        const pos = await fetchPurchaseOrders({ spreadsheetId: selectedFirm.spreadsheetId });
        map = {};
        (Array.isArray(pos) ? pos : []).forEach((row) => {
          const poNo = String(row?.po_no || '').trim();
          const prNo = String(row?.pr_no || '').trim() || inferPrNoFromPoNo(poNo);
          if (prNo && poNo && !map[prNo]) map[prNo] = poNo;
        });
      }
      setPoByPrNo(map);
      setRows(
        rawRows.map((row) => {
          const prNo = String(row?.pr_no || '').trim();
          const statusText = String(row?.status || '').toLowerCase();
          if (statusText === 'approved' && prNo && map[prNo]) {
            return { ...row, status: 'complete' };
          }
          return row;
        })
      );
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load purchase requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm]);

  useEffect(() => {
    if (!createdItem || !createdItemContext) return;
    const ctx = createdItemContext || {};
    if (ctx?.source !== 'purchase_request_item') return;
    const rowIndex = Number(ctx?.rowIndex);
    if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
    const savedType = String(createdItem?.item_type || '').trim().toLowerCase() === 'other' ? 'other' : 'mrr';
    const type = savedType;

    setItemMasterType(type);
    setItems((prev) => {
      const next = [...prev];
      const row = { ...(next[rowIndex] || blankItemRow()) };
      row.item_id = String(createdItem?.id || '').trim();
      if (type === 'mrr') {
        row.erp_code = String(createdItem?.erp_code || '').trim();
        row.item_name = String(createdItem?.item_name || '').trim();
        if (!String(row.description || '').trim()) row.description = String(createdItem?.item_name || '').trim();
        if (!String(row.unit || '').trim()) row.unit = String(createdItem?.unit || 'PCS').trim();
      } else {
        row.item_name = String(createdItem?.item_name || '').trim();
        if (!String(row.description || '').trim()) row.description = String(createdItem?.item_name || '').trim();
        if (!String(row.unit || '').trim()) row.unit = String(createdItem?.unit || 'PCS').trim();
      }
      next[rowIndex] = row;
      return next;
    });
    hydrateLastPurchase(rowIndex, type === 'mrr' ? String(createdItem?.erp_code || '').trim() : String(createdItem?.item_name || '').trim());

    // refresh item master list so the new item appears in dropdowns/datalist
    (async () => {
      if (!selectedFirm || !fetchItems) return;
      try {
        const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
        setItemMaster(Array.isArray(data) ? data : []);
      } catch {
        setItemMaster([]);
      }
    })();

    if (typeof onCreatedItemConsumed === 'function') onCreatedItemConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdItem, createdItemContext]);

  useEffect(() => {
    async function loadItems() {
      if (!selectedFirm || !fetchItems) return;
      try {
        const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
        setItemMaster(Array.isArray(data) ? data : []);
      } catch {
        setItemMaster([]);
      }
    }
    loadItems();
  }, [fetchItems, selectedFirm]);

  const filteredRows = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = tab === 'all' ? true : String(row?.status || '').toLowerCase() === tab;
      if (!statusOk) return false;
      if (fromDate || toDate) {
        const rowIso = ddmmyyyyToIso(row?.requisition_date || '');
        if (rowIso) {
          if (fromDate && rowIso < fromDate) return false;
          if (toDate && rowIso > toDate) return false;
        }
      }
      if (!q) return true;
      return [
        row?.pr_no,
        row?.requested_by,
        row?.requisition_date,
        row?.required_date,
        row?.status
      ].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, tab, search, fromDate, toDate]);

  const selectedRow = useMemo(() => {
    const key = String(selectedPrNo || '').trim();
    if (!key) return null;
    return rows.find((r) => String(r?.pr_no || '').trim() === key) || null;
  }, [rows, selectedPrNo]);

  const openNew = () => {
    const displayName = String(currentUser?.display_name || currentUser?.user?.display_name || '').trim();
    setFormData({ ...blankPr(), requested_by: displayName });
    setItems([blankItemRow()]);
    setErrors({});
    setSelectedPrNo('');
    setView('form');
  };

  const openEdit = async (prNo) => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading PR...');
    try {
      const payload = await fetchPurchaseRequestDetails(prNo, { spreadsheetId: selectedFirm.spreadsheetId });
      const pr = payload?.purchase_request || {};
      const loadedItems = Array.isArray(payload?.items) ? payload.items : [];
      setFormData({
        ...blankPr(),
        ...pr,
        status: String(pr?.status || 'pending')
      });
      setItems(loadedItems.length ? loadedItems.map((item) => ({
        ...blankItemRow(),
        ...item,
        item_id: String(item?.item_id || '').trim(),
        pr_item_id: String(item?.pr_item_id || '').trim(),
        amount: item?.amount || formatAmount(toNumber(item?.qty) * toNumber(item?.rate))
      })) : [blankItemRow()]);
      setErrors({});
      setSelectedPrNo(String(prNo || '').trim());
      setView('form');
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load PR.');
    } finally {
      setIsLoading(false);
    }
  };

  const setItem = (index, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...(next[index] || blankItemRow()), [key]: value };
      if (key === 'qty' || key === 'rate') {
        row.amount = formatAmount(toNumber(row.qty) * toNumber(row.rate));
      }
      if (key === 'erp_code') {
        const match = itemMaster.find((it) => String(it?.item_type || 'mrr') === itemMasterType && String(it?.erp_code || '').trim() === String(value || '').trim());
        if (match) {
          row.item_id = String(match.id || '').trim();
          if (!String(row.item_name || '').trim()) row.item_name = String(match.item_name || '').trim();
          if (!String(row.description || '').trim()) row.description = String(match.item_name || '').trim();
          if (!String(row.unit || '').trim()) row.unit = String(match.unit || 'PCS').trim();
        }
      }
      if (key === 'item_name') {
        const shouldShowErp = itemMasterType === 'reel' || itemMasterType === 'mrr';
        const match = itemMaster.find((it) => String(it?.item_type || 'mrr') === itemMasterType && String(it?.item_name || '').trim() === String(value || '').trim());
        if (match) {
          row.item_id = String(match.id || '').trim();
          if (shouldShowErp && String(match.erp_code || '').trim()) row.erp_code = String(match.erp_code || '').trim();
          if (!String(row.description || '').trim()) row.description = String(match.item_name || '').trim();
          if (!String(row.unit || '').trim()) row.unit = String(match.unit || 'PCS').trim();
        } else {
          row.item_id = '';
        }
      }
      next[index] = row;
      return next;
    });
  };

  const hydrateLastPurchase = async (rowIndex, selectedKey) => {
    if (!selectedFirm || !fetchLastPurchaseInfo) return;
    const keyText = String(selectedKey || '').trim();
    if (!keyText) return;
    const cacheKey = `${itemMasterType}:${keyText}`;
    let info = lastPurchaseByKey[cacheKey];
    if (!info) {
      try {
        const fetched = await fetchLastPurchaseInfo([keyText], itemMasterType, { spreadsheetId: selectedFirm.spreadsheetId });
        const first = Array.isArray(fetched) ? fetched[0] : null;
        info = first || { key: keyText, po_date: '', last_rate: '' };
        setLastPurchaseByKey((prev) => ({ ...prev, [cacheKey]: info }));
      } catch {
        info = { key: keyText, po_date: '', last_rate: '' };
        setLastPurchaseByKey((prev) => ({ ...prev, [cacheKey]: info }));
      }
    }

    if (info) {
      setItems((prev) => {
        const next = [...prev];
        const row = { ...(next[rowIndex] || blankItemRow()) };
        row.last_po_date = String(info.po_date || '');
        row.last_po_rate = String(info.last_rate || '');
        next[rowIndex] = row;
        return next;
      });
    }
  };

  const validate = () => {
    const next = {};
    if (!String(formData.requested_by || '').trim()) next.requested_by = 'Requested by required';
    if (!String(formData.requisition_date || '').trim()) next.requisition_date = 'Requisition date required';
    if (!String(formData.required_date || '').trim()) next.required_date = 'Required date required';

    const meaningfulItems = items.filter((it) => Object.values(it).some((v) => String(v ?? '').trim() !== ''));
    if (!meaningfulItems.length) next.items = 'At least 1 item required';
    meaningfulItems.forEach((it, idx) => {
      if (!String(it.item_id || '').trim()) {
        next[`item_${idx}`] = 'Select item from Item Master';
      }
      if (!String(it.description || it.item_name || it.erp_code || '').trim()) {
        next[`item_${idx}`] = 'Item description required';
      }
      if (!String(it.qty || '').trim()) {
        next[`qty_${idx}`] = 'Qty required';
      }
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!selectedFirm) return;
    if (!validate()) return;
    setIsSaving(true);
    setStatus('Saving PR...');
    try {
      const meaningfulItems = items
        .filter((it) => Object.values(it).some((v) => String(v ?? '').trim() !== ''))
        .map((it) => ({
          item_id: String(it.item_id || '').trim(),
          pr_item_id: String(it.pr_item_id || '').trim(),
          item_type: String(itemMasterType || 'mrr'),
          erp_code: String(it.erp_code || '').trim(),
          item_name: String(it.item_name || '').trim(),
          description: String(it.description || '').trim(),
          unit: String(it.unit || '').trim(),
          qty: String(it.qty || '').trim(),
          rate: String(it.rate || '').trim(),
          amount: String(it.amount || '').trim(),
          remark: String(it.remark || '').trim()
        }));

      const prPayload = {
        pr_no: String(formData.pr_no || '').trim(),
        requested_by: String(formData.requested_by || '').trim(),
        requisition_date: String(formData.requisition_date || '').trim(),
        required_date: String(formData.required_date || '').trim(),
        remark: String(formData.remark || '').trim(),
        created_by: userEmail
      };

      const resp = await savePurchaseRequest(prPayload, meaningfulItems, { spreadsheetId: selectedFirm.spreadsheetId, userEmail, item_type: itemMasterType });
      const prNo = String(resp?.pr_no || prPayload.pr_no || '').trim();
      setStatus(prNo ? `Saved ${prNo}` : 'Saved.');
      setView('list');
      await load();
    } catch (err) {
      setStatus(err?.message || 'Could not save PR.');
    } finally {
      setIsSaving(false);
    }
  };

  const approve = async (prNo, decision) => {
    if (!selectedFirm) return;
    const remark = decision === 'reject' ? window.prompt('Reject remark (optional):', '') : '';
    setIsSaving(true);
    try {
      await approvePurchaseRequest(prNo, decision, String(remark || ''), { spreadsheetId: selectedFirm.spreadsheetId, userEmail });
      await load();
      setSelectedPrNo('');
    } catch (err) {
      alert(err?.message || 'Could not update PR.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    padding: '10px 12px',
    border: `1.5px solid ${errors[field] ? '#b91c1c' : '#d1d5db'}`,
    borderRadius: '10px',
    outline: 'none',
    background: '#fff',
    color: '#111'
  });

  if (view === 'form') {
    const locked = String(formData.status || 'pending') !== 'pending' && !isApproveMode;
    const itemOptions = itemMaster.filter((it) => (String(it?.item_type || 'reel') === itemMasterType || (itemMasterType === 'reel' && String(it?.item_type) === 'mrr')) && String(it?.active || '1') !== '0');
    const showErp = itemMasterType === 'reel' || itemMasterType === 'mrr';
    const itemNameOptions = Array.from(new Set(itemOptions.map((it) => String(it?.item_name || '').trim()).filter(Boolean)));
    const itemNameListId = `pr-item-names-${itemMasterType}`;
    const busy = isSaving || isLoading;
    const requiredMark = <span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span>;

    const handleItemMasterTypeChange = (nextTypeRaw) => {
      const nextType = String(nextTypeRaw || 'reel');
      setItemMasterType(nextType);
      if (nextType !== 'reel' && nextType !== 'mrr') {
        setItems((prev) => prev.map((row) => ({ ...row, erp_code: '' })));
      }
    };
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '18px', overflowY: 'auto' }}>
        {busy ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
          </div>
        ) : null}
        <div style={{ width: '100%', maxWidth: 'none', margin: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 1000, color: '#1d4ed8' }}>{formData.pr_no ? `Indent - ${formData.pr_no}` : 'New Indent'}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              disabled={locked}
              value={itemMasterType}
              onChange={(e) => handleItemMasterTypeChange(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '12px', fontWeight: 900, background: '#fff', color: '#111', height: '38px' }}
              title="Item type"
            >
              <option value="reel">Reel</option>
              <option value="other">Other</option>
            </select>
            <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
          </div>
        </div>

          {errors.items ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 800 }}>{errors.items}</div> : null}
          {status ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Requested By{requiredMark}</div>
              <input disabled value={formData.requested_by} style={{ ...inputStyle('requested_by'), background: '#f9fafb' }} />
            </div>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Requisition Date{requiredMark}</div>
              <input
                type="date"
                disabled={locked}
                value={ddmmyyyyToIso(formData.requisition_date)}
                onChange={(e) => setFormData((p) => ({ ...p, requisition_date: isoToDdmmyyyy(e.target.value) }))}
                style={inputStyle('requisition_date')}
              />
            </div>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Required Date{requiredMark}</div>
              <input
                type="date"
                disabled={locked}
                value={ddmmyyyyToIso(formData.required_date)}
                onChange={(e) => setFormData((p) => ({ ...p, required_date: isoToDdmmyyyy(e.target.value) }))}
                style={inputStyle('required_date')}
              />
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Remark</div>
              <input disabled={locked} value={formData.remark} onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))} style={inputStyle('remark')} />
            </div>
          </div>

          <div style={{ marginTop: '14px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: '#1d4ed8', color: '#fff', borderBottom: '1px solid #1d4ed8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 1000, color: '#fff' }}>Items</div>
              <div />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                    {showErp ? <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>ERP{requiredMark}</th> : null}
                    {!locked ? <th style={{ width: '46px', padding: '6px 6px', borderBottom: '1px solid #000' }} /> : null}
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Item{requiredMark}</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Qty{requiredMark}</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Last PO Date</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Last PO Rate</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #000', color: '#fff', fontSize: '11px', letterSpacing: '0.02em' }}>Remark</th>
                    {!locked ? <th style={{ padding: '6px 10px', borderBottom: '1px solid #000' }} /> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      {showErp ? (
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                          <select
                            disabled={locked}
                            value={row.erp_code}
                            onChange={(e) => {
                              const value = e.target.value;
                              setItem(idx, 'erp_code', value);
                              const match = itemOptions.find((it) => String(it?.erp_code || '').trim() === String(value || '').trim());
                              if (match) {
                                setItems((prev) => {
                                  const next = [...prev];
                                  const nextRow = { ...(next[idx] || blankItemRow()) };
                                  nextRow.erp_code = String(match.erp_code || '').trim();
                                  nextRow.item_name = String(match.item_name || '').trim();
                                  if (!String(nextRow.description || '').trim()) nextRow.description = String(match.item_name || '').trim();
                                  nextRow.unit = String(match.unit || nextRow.unit || 'PCS').trim();
                                  next[idx] = nextRow;
                                  return next;
                                });
                              }
                              hydrateLastPurchase(idx, value);
                            }}
                            style={{ width: '140px' }}
                          >
                            <option value="">Select ERP</option>
                            {itemOptions.map((it) => (
                              <option key={`${it.item_type}-${it.erp_code}`} value={it.erp_code}>{it.erp_code}</option>
                            ))}
                          </select>
                        </td>
                      ) : null}
                      {!locked ? (
                        <td style={{ padding: '6px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn small"
                            title="New Item"
                            aria-label="New Item"
                            onClick={() => {
                              if (typeof onOpenNewItem === 'function') onOpenNewItem({ source: 'purchase_request_item', rowIndex: idx, itemType: itemMasterType });
                            }}
                            style={{ width: '28px', height: '28px', borderRadius: '999px', fontWeight: 1000, padding: 0, lineHeight: '28px' }}
                          >
                            +
                          </button>
                        </td>
                      ) : null}
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          disabled={locked}
                          list={itemNameListId}
                          value={row.item_name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setItem(idx, 'item_name', value);
                            const match = itemOptions.find((it) => String(it?.item_name || '').trim() === String(value || '').trim());
                            if (match) {
                              setItems((prev) => {
                                const next = [...prev];
                                const nextRow = { ...(next[idx] || blankItemRow()) };
                                nextRow.item_name = String(match.item_name || '').trim();
                                if (showErp && String(match.erp_code || '').trim()) nextRow.erp_code = String(match.erp_code || '').trim();
                                if (!String(nextRow.description || '').trim()) nextRow.description = String(match.item_name || '').trim();
                                nextRow.unit = String(match.unit || nextRow.unit || 'PCS').trim();
                                next[idx] = nextRow;
                                return next;
                              });
                            }
                            hydrateLastPurchase(idx, showErp ? row.erp_code : value);
                          }}
                          style={{ width: '220px' }}
                          placeholder="Select / search item"
                        />
                        {errors[`item_${idx}`] ? <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>{errors[`item_${idx}`]}</div> : null}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled={locked} value={row.description} onChange={(e) => setItem(idx, 'description', e.target.value)} style={{ width: '240px' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled value={row.unit} style={{ width: '80px', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input disabled={locked} value={row.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} style={{ width: '80px', textAlign: 'right' }} />
                        {errors[`qty_${idx}`] ? <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>{errors[`qty_${idx}`]}</div> : null}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input disabled={locked} value={row.rate} onChange={(e) => setItem(idx, 'rate', e.target.value)} style={{ width: '80px', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input disabled value={row.amount} style={{ width: '90px', textAlign: 'right', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled value={row.last_po_date} style={{ width: '120px', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input disabled value={row.last_po_rate} style={{ width: '90px', textAlign: 'right', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled={locked} value={row.remark} onChange={(e) => setItem(idx, 'remark', e.target.value)} style={{ width: '160px' }} />
                      </td>
                      {!locked ? (
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                          <button type="button" className="btn small" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>X</button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <datalist id={itemNameListId}>
              {itemNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
            {!locked ? (
              <div style={{ background: '#fff', padding: '10px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => setItems((p) => [...p, blankItemRow()])} disabled={busy} style={{ padding: '9px 14px', fontWeight: 1000, borderRadius: '12px' }}>+ Item</button>
                <button type="button" className="btn main" disabled={busy} onClick={save} style={{ padding: '9px 16px', fontWeight: 1100, background: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff', borderRadius: '12px' }}>
                  {busy ? 'Saving...' : 'Save PR'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const tabButton = (key, label) => (
    <button
      type="button"
      className="btn small"
      onClick={() => setTab(key)}
      style={{
        padding: '8px 10px',
        fontWeight: 900,
        background: tab === key ? '#1d4ed8' : '#fff',
        borderColor: tab === key ? '#1d4ed8' : '#d1d5db',
        color: tab === key ? '#fff' : '#1d4ed8'
      }}
    >
      {label}
    </button>
  );

  const listBusy = isLoading || isSaving;

  return (
    <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: '#f5f7fb' }}>
      <div style={{ margin: 0, background: 'transparent', padding: '18px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
        {listBusy ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
          </div>
        ) : null}
        <div style={{ width: '100%', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 1000, color: '#1d4ed8' }}>{isApproveMode ? 'Approval of Purchase Requests' : 'Purchase Requests'}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PR / user" style={{ ...inputStyle('search'), width: '260px', borderRadius: '999px' }} />
            <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
            {!isApproveMode ? (
              <button type="button" className="btn main" onClick={openNew} style={{ padding: '10px 14px', fontWeight: 900 }}>+ Purchase Request</button>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {tabButton('all', 'All')}
          {tabButton('pending', 'Pending')}
          {tabButton('approved', 'Approved')}
          {tabButton('complete', 'Completed')}
          {tabButton('rejected', 'Rejected')}
          <button type="button" className="btn small" onClick={load} disabled={isLoading} style={{ padding: '8px 10px', fontWeight: 900 }}>Refresh</button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', fontWeight: 1000, color: '#1d4ed8' }}>DATE RANGE</div>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputStyle('search'), width: '160px', borderRadius: '10px' }} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...inputStyle('search'), width: '160px', borderRadius: '10px' }} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn small" onClick={() => { setFromDate(''); setToDate(''); }} style={{ padding: '10px 14px', fontWeight: 900 }}>Clear Filters</button>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(17, 24, 39, 0.06)' }}>
          {status ? (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
              {status}
            </div>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderRight: '1px solid #ffffff33', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px' }}>PR</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderRight: '1px solid #ffffff33', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px' }}>Requested By</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderRight: '1px solid #ffffff33', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px' }}>Requisition Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderRight: '1px solid #ffffff33', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px' }}>Required Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderRight: '1px solid #ffffff33', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const prNo = String(row?.pr_no || '').trim();
                  const statusText = String(row?.status || 'pending').toLowerCase();
                  const isSelected = selectedPrNo && prNo === selectedPrNo;
                  const statusPill = {
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 900,
                    border: '1px solid #e5e7eb',
                    background: statusText === 'approved'
                      ? '#e0f2fe'
                      : statusText === 'complete'
                        ? '#dcfce7'
                        : statusText === 'rejected'
                          ? '#fee2e2'
                          : '#f3f4f6',
                    color: '#1d4ed8'
                  };
                  return (
                      <tr
                        key={prNo}
                        onClick={() => setSelectedPrNo(prNo)}
                        style={{ background: isSelected ? '#fee2e2' : '#fff', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontWeight: 1000, color: '#000' }}>{prNo}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>{row.requested_by || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>{row.requisition_date || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>{row.required_date || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}><span style={statusPill}>{statusText.toUpperCase()}</span></td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #000', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" className="btn small" onClick={(e) => { e.stopPropagation(); openEdit(prNo); }} disabled={isSaving}>Open</button>{' '}
                          {!isApproveMode && (statusText === 'approved' || statusText === 'complete') && poByPrNo[prNo] && typeof onOpenPoFromPr === 'function' ? (
                            <>
                              <button
                                type="button"
                                className="btn small"
                                onClick={(e) => { e.stopPropagation(); onOpenPoFromPr(poByPrNo[prNo], prNo); }}
                                disabled={isSaving}
                                style={{ background: '#7c3aed', borderColor: '#7c3aed', color: '#fff' }}
                              >
                                Open PO
                              </button>{' '}
                            </>
                          ) : null}
                          {!isApproveMode && statusText === 'approved' && !poByPrNo[prNo] && typeof onMakePoFromPr === 'function' ? (
                            <>
                              <button
                                type="button"
                                className="btn small"
                                onClick={(e) => { e.stopPropagation(); onMakePoFromPr(prNo); }}
                                disabled={isSaving}
                                style={{ background: '#f97316', borderColor: '#f97316', color: '#fff' }}
                              >
                                Make PO
                              </button>{' '}
                            </>
                          ) : null}
                          {statusText === 'pending' ? (
                            <>
                              <button type="button" className="btn small" onClick={(e) => { e.stopPropagation(); approve(prNo, 'approve'); }} disabled={isSaving} style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}>Approve</button>{' '}
                              <button type="button" className="btn small" onClick={(e) => { e.stopPropagation(); approve(prNo, 'reject'); }} disabled={isSaving} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }}>Reject</button>
                            </>
                          ) : null}
                        </td>
                    </tr>
                  );
                })}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px 12px', color: '#6b7280' }}>No entries found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid #1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {filteredRows.length ? `Showing 1 to ${filteredRows.length} of ${filteredRows.length} entries` : 'Showing 0 entries'}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="btn small" disabled style={{ padding: '6px 10px', fontWeight: 900, opacity: 0.55 }}>{'<'}</button>
              <button type="button" className="btn small" style={{ padding: '6px 10px', fontWeight: 1000, background: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff' }}>1</button>
              <button type="button" className="btn small" disabled style={{ padding: '6px 10px', fontWeight: 900, opacity: 0.55 }}>{'>'}</button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {selectedPrNo ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: '#1d4ed8',
            backdropFilter: 'blur(6px)',
            borderTop: '1px solid #1d4ed8',
            padding: '10px 18px',
            zIndex: 10010
          }}
        >
          <div style={{ maxWidth: 'none', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: '#fff' }}>Selected: <span style={{ color: '#fff', fontWeight: 800 }}>{selectedPrNo}</span></div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn small" onClick={() => setSelectedPrNo('')} disabled={isSaving} style={{ padding: '10px 14px', fontWeight: 800, background: '#fff', color: '#1d4ed8' }}>Clear</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

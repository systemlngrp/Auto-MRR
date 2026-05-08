import React, { useEffect, useMemo, useState } from 'react';

const blankItemRow = () => ({
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

export default function PurchaseRequestsPage({
  selectedFirm,
  deps,
  onBack,
  onOpenNewItem,
  mode = 'manage', // 'manage' | 'approve'
  currentUser
}) {
  const {
    fetchItems,
    fetchLastPurchaseInfo,
    fetchPurchaseRequests,
    fetchPurchaseRequestDetails,
    savePurchaseRequest,
    approvePurchaseRequest
  } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('all'); // all | pending | approved | rejected
  const [search, setSearch] = useState('');

  const [view, setView] = useState('list'); // list | form
  const [formData, setFormData] = useState(blankPr());
  const [items, setItems] = useState([blankItemRow()]);
  const [itemMasterType, setItemMasterType] = useState('mrr'); // mrr | other (for dropdown)
  const [itemMaster, setItemMaster] = useState([]);
  const [lastPurchaseByKey, setLastPurchaseByKey] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPrNo, setSelectedPrNo] = useState('');

  const userEmail = String(currentUser?.user_email || currentUser?.user?.user_email || '').trim();
  const isApproveMode = mode === 'approve';

  const load = async () => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading purchase requests...');
    try {
      const data = await fetchPurchaseRequests({ spreadsheetId: selectedFirm.spreadsheetId });
      setRows(Array.isArray(data) ? data : []);
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
      if (!q) return true;
      return [
        row?.pr_no,
        row?.requested_by,
        row?.requisition_date,
        row?.required_date,
        row?.status
      ].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, tab, search]);

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
          if (!String(row.item_name || '').trim()) row.item_name = String(match.item_name || '').trim();
          if (!String(row.description || '').trim()) row.description = String(match.item_name || '').trim();
          if (!String(row.unit || '').trim()) row.unit = String(match.unit || 'PCS').trim();
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

      const resp = await savePurchaseRequest(prPayload, meaningfulItems, { spreadsheetId: selectedFirm.spreadsheetId, userEmail });
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
    const itemOptions = itemMaster.filter((it) => String(it?.item_type || 'mrr') === itemMasterType && String(it?.active || '1') !== '0');
    const showErp = itemMasterType === 'mrr';
    const itemNameOptions = Array.from(new Set(itemOptions.map((it) => String(it?.item_name || '').trim()).filter(Boolean)));
    const itemNameListId = `pr-item-names-${itemMasterType}`;
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '18px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 'none', margin: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 1000, color: '#111827' }}>{formData.pr_no ? `Purchase Requisition - ${formData.pr_no}` : 'New Purchase Requisition'}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
              {!locked ? (
                <button type="button" className="btn main" disabled={isSaving} onClick={save} style={{ padding: '10px 14px', fontWeight: 900 }}>
                  {isSaving ? 'Saving...' : 'Save PR'}
                </button>
              ) : null}
            </div>
          </div>

          {errors.items ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 800 }}>{errors.items}</div> : null}
          {status ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Requested By</div>
              <input disabled={locked} value={formData.requested_by} onChange={(e) => setFormData((p) => ({ ...p, requested_by: e.target.value }))} style={inputStyle('requested_by')} />
            </div>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Requisition Date</div>
              <input
                type="date"
                disabled={locked}
                value={ddmmyyyyToIso(formData.requisition_date)}
                onChange={(e) => setFormData((p) => ({ ...p, requisition_date: isoToDdmmyyyy(e.target.value) }))}
                style={inputStyle('requisition_date')}
              />
            </div>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Required Date</div>
              <input
                type="date"
                disabled={locked}
                value={ddmmyyyyToIso(formData.required_date)}
                onChange={(e) => setFormData((p) => ({ ...p, required_date: isoToDdmmyyyy(e.target.value) }))}
                style={inputStyle('required_date')}
              />
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Remark</div>
              <input disabled={locked} value={formData.remark} onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))} style={inputStyle('remark')} />
            </div>
          </div>

          <div style={{ marginTop: '14px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 1000, color: '#111827' }}>Items</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  disabled={locked}
                  value={itemMasterType}
                  onChange={(e) => {
                    const nextType = String(e.target.value || 'mrr');
                    setItemMasterType(nextType);
                    if (nextType !== 'mrr') {
                      setItems((prev) => prev.map((row) => ({ ...row, erp_code: '' })));
                    }
                  }}
                  style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '12px', fontWeight: 900, background: '#fff' }}
                >
                  <option value="mrr">MRR</option>
                  <option value="other">Other MRR</option>
                </select>
                {!locked ? (
                  <button
                    type="button"
                    className="btn small"
                    title="Add item row"
                    aria-label="Add item row"
                    onClick={() => setItems((p) => [...p, blankItemRow()])}
                    style={{ width: '34px', height: '34px', borderRadius: '999px', fontWeight: 1000, padding: 0 }}
                  >
                    +
                  </button>
                ) : null}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {showErp ? <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>ERP</th> : null}
                    {!locked ? <th style={{ width: '46px', padding: '8px 6px', borderBottom: '1px solid #e5e7eb' }} /> : null}
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Item</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Last PO Date</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Last PO Rate</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Remark</th>
                    {!locked ? <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }} /> : null}
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
                              if (typeof onOpenNewItem === 'function') onOpenNewItem();
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
                                if (!String(nextRow.description || '').trim()) nextRow.description = String(match.item_name || '').trim();
                                if (!String(nextRow.unit || '').trim()) nextRow.unit = String(match.unit || 'PCS').trim();
                                next[idx] = nextRow;
                                return next;
                              });
                            }
                            hydrateLastPurchase(idx, showErp ? row.erp_code : value);
                          }}
                          style={{ width: '220px' }}
                          placeholder="Select / search item"
                        />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled={locked} value={row.description} onChange={(e) => setItem(idx, 'description', e.target.value)} style={{ width: '240px' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled={locked} value={row.unit} onChange={(e) => setItem(idx, 'unit', e.target.value)} style={{ width: '80px' }} />
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
        color: tab === key ? '#fff' : '#111827'
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: '#f5f7fb' }}>
      <div style={{ margin: 0, background: 'transparent', padding: '18px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 1000, color: '#111827' }}>{isApproveMode ? 'Approval of Purchase Requests' : 'Purchase Requests'}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PR / dept / user" style={{ ...inputStyle('search'), width: '260px', borderRadius: '999px' }} />
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
          {tabButton('rejected', 'Rejected')}
          <button type="button" className="btn small" onClick={load} disabled={isLoading} style={{ padding: '8px 10px', fontWeight: 900 }}>Refresh</button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{isLoading ? 'Loading...' : `Showing ${filteredRows.length} entries`}</div>
            {status ? <div style={{ fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>PR</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Requested By</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Requisition Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Required Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Action</th>
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
                    background: statusText === 'approved' ? '#e0f2fe' : statusText === 'rejected' ? '#fee2e2' : '#f3f4f6',
                    color: '#111827'
                  };
                  return (
                      <tr
                        key={prNo}
                        onClick={() => setSelectedPrNo(prNo)}
                        style={{ background: isSelected ? '#eff6ff' : '#fff', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 1000, color: '#1d4ed8' }}>{prNo}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.requested_by || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.requisition_date || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.required_date || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}><span style={statusPill}>{statusText.toUpperCase()}</span></td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" className="btn small" onClick={(e) => { e.stopPropagation(); openEdit(prNo); }} disabled={isSaving}>Open</button>{' '}
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
        </div>
      </div>

      {selectedPrNo ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(245, 247, 251, 0.92)',
            backdropFilter: 'blur(6px)',
            borderTop: '1px solid #e5e7eb',
            padding: '10px 18px',
            zIndex: 10010
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Selected: <span style={{ color: '#111827', fontWeight: 800 }}>{selectedPrNo}</span></div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn small" onClick={() => setSelectedPrNo('')} disabled={isSaving} style={{ padding: '10px 14px', fontWeight: 800 }}>Clear</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

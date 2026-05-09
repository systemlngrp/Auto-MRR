import React, { useEffect, useMemo, useRef, useState } from 'react';

const blankItemRow = () => ({
  supplier: '',
  erp_code: '',
  item_name: '',
  description: '',
  unit: 'PCS',
  qty: '',
  rate: '',
  amount: '',
  remark: ''
});

const blankPo = () => ({
  po_no: '',
  pr_no: '',
  po_type: 'mrr',
  supplier: '',
  po_date: '',
  po_details: '',
  remark: '',
  status: 'draft'
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

function inferPrNoFromPoNo(poNo) {
  const text = String(poNo || '').trim();
  if (!text) return '';
  if (/^PO\b/i.test(text)) return text.replace(/^PO\b/i, 'PR');
  if (/^PO-/i.test(text)) return text.replace(/^PO-/i, 'PR-');
  return '';
}

export default function PurchaseOrdersPage({
  selectedFirm,
  deps,
  onBack,
  initialPrNo,
  initialPoNo,
  onInitialPrConsumed,
  onInitialPoConsumed,
  mode = 'make_po', // make_po | approve_po
  currentUser
}) {
  const {
    fetchItems,
    fetchSuppliers,
    saveSupplierMaster,
    fetchPurchaseOrders,
    fetchPurchaseOrderDetails,
    savePurchaseOrder,
    approvePurchaseOrder,
    fetchPurchaseRequests,
    fetchPurchaseRequestDetails
  } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const [pos, setPos] = useState([]);
  const [approvedPrs, setApprovedPrs] = useState([]);
  const [itemMaster, setItemMaster] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  const [view, setView] = useState('list'); // list | form
  const [formData, setFormData] = useState(blankPo());
  const [items, setItems] = useState([blankItemRow()]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const initialPrHandledRef = useRef('');
  const initialPoHandledRef = useRef('');

  const userEmail = String(currentUser?.user_email || currentUser?.user?.user_email || '').trim();
  const isApproveMode = mode === 'approve_po';

  const load = async () => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading purchase orders...');
    try {
      const data = await fetchPurchaseOrders({ spreadsheetId: selectedFirm.spreadsheetId });
      const nextPos = Array.isArray(data) ? data : [];
      setPos(nextPos);
      if (!isApproveMode) {
        const prs = await fetchPurchaseRequests({ spreadsheetId: selectedFirm.spreadsheetId });
        const poPrNoSet = new Set(
          nextPos
            .map((row) => {
              const poNo = String(row?.po_no || '').trim();
              return String(row?.pr_no || '').trim() || inferPrNoFromPoNo(poNo);
            })
            .filter(Boolean)
        );
        const approved = (Array.isArray(prs) ? prs : [])
          .filter((row) => String(row?.status || '').toLowerCase() === 'approved')
          .filter((row) => !poPrNoSet.has(String(row?.pr_no || '').trim()));
        setApprovedPrs(approved);
      }
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load purchase orders.');
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

  useEffect(() => {
    async function loadSuppliers() {
      if (!selectedFirm || !fetchSuppliers) return;
      try {
        const data = await fetchSuppliers({ spreadsheetId: selectedFirm.spreadsheetId });
        setSupplierOptions(Array.isArray(data) ? data : []);
      } catch {
        setSupplierOptions([]);
      }
    }
    loadSuppliers();
  }, [fetchSuppliers, selectedFirm]);

  useEffect(() => {
    const prNo = String(initialPrNo || '').trim();
    if (!prNo || !selectedFirm) return;
    if (initialPrHandledRef.current === prNo) return;
    initialPrHandledRef.current = prNo;
    (async () => {
      await openNewFromPr(prNo);
      if (typeof onInitialPrConsumed === 'function') onInitialPrConsumed();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrNo, selectedFirm]);

  useEffect(() => {
    const poNo = String(initialPoNo || '').trim();
    if (!poNo || !selectedFirm) return;
    if (initialPoHandledRef.current === poNo) return;
    initialPoHandledRef.current = poNo;
    (async () => {
      await openEdit(poNo);
      if (typeof onInitialPoConsumed === 'function') onInitialPoConsumed();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoNo, selectedFirm]);

  const addSupplierQuick = async () => {
    if (!selectedFirm || !saveSupplierMaster) return;
    const name = window.prompt('Supplier name:', '');
    const supplierName = String(name || '').trim();
    if (!supplierName) return;
    try {
      await saveSupplierMaster({ supplier_name: supplierName, active: '1' }, { spreadsheetId: selectedFirm.spreadsheetId });
      const data = await fetchSuppliers({ spreadsheetId: selectedFirm.spreadsheetId });
      setSupplierOptions(Array.isArray(data) ? data : []);
      setFormData((p) => ({ ...p, supplier: supplierName }));
    } catch (err) {
      alert(err?.message || 'Could not save supplier.');
    }
  };

  useEffect(() => {
    const supplierText = String(formData.supplier || '').trim();
    const dateText = String(formData.po_date || '').trim();
    const poNoText = String(formData.po_no || '').trim();
    const auto = [poNoText, dateText, supplierText].filter(Boolean).join(' - ');
    if (!String(formData.po_details || '').trim() && auto) {
      setFormData((p) => ({ ...p, po_details: auto }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.po_no, formData.po_date, formData.supplier]);

  const filteredPos = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return pos.filter((row) => {
      const statusOk = tab === 'all' ? true : String(row?.status || '').toLowerCase() === tab;
      if (!statusOk) return false;
      if (!q) return true;
      return [row?.po_no, row?.supplier, row?.po_date, row?.status].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [pos, tab, search]);

  const setItem = (index, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...(next[index] || blankItemRow()), [key]: value };
      if (key === 'qty' || key === 'rate') {
        row.amount = formatAmount(toNumber(row.qty) * toNumber(row.rate));
      }
      if (key === 'erp_code') {
        const type = String(formData.po_type || 'mrr') === 'other' ? 'other' : 'mrr';
        const match = itemMaster.find((it) => String(it?.item_type || 'mrr') === type && String(it?.erp_code || '').trim() === String(value || '').trim());
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

  const validate = () => {
    const next = {};
    if (!String(formData.po_date || '').trim()) next.po_date = 'PO date required';
    if (!String(formData.po_details || '').trim()) next.po_details = 'PO details required';
    const meaningfulItems = items.filter((it) => Object.values(it).some((v) => String(v ?? '').trim() !== ''));
    if (!meaningfulItems.length) next.items = 'At least 1 item required';
    if (meaningfulItems.length && meaningfulItems.some((it) => !String(it?.supplier || '').trim())) {
      next.items = 'Supplier required for each item';
    }
    meaningfulItems.forEach((it, idx) => {
      if (!String(it.description || it.item_name || it.erp_code || '').trim()) next[`item_${idx}`] = 'Item description required';
      if (!String(it.qty || '').trim()) next[`qty_${idx}`] = 'Qty required';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openNewFromPr = async (prNo) => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading PR items...');
    try {
      const payload = await fetchPurchaseRequestDetails(prNo, { spreadsheetId: selectedFirm.spreadsheetId });
      const prItems = Array.isArray(payload?.items) ? payload.items : [];
      setFormData({
        ...blankPo(),
        pr_no: prNo,
        po_type: 'mrr',
        po_date: new Date().toLocaleDateString('en-GB') // DD/MM/YYYY
      });
      setItems(prItems.length ? prItems.map((it) => ({
        ...blankItemRow(),
        ...it,
        supplier: String(it?.supplier || '').trim(),
        amount: it?.amount || formatAmount(toNumber(it?.qty) * toNumber(it?.rate))
      })) : [blankItemRow()]);
      setErrors({});
      setView('form');
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load PR.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = async (poNo) => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading PO...');
    try {
      const payload = await fetchPurchaseOrderDetails(poNo, { spreadsheetId: selectedFirm.spreadsheetId });
      const po = payload?.purchase_order || {};
      const loadedItems = Array.isArray(payload?.items) ? payload.items : [];
      setFormData({
        ...blankPo(),
        ...po,
        po_type: String(po?.po_type || 'mrr') === 'other' ? 'other' : 'mrr',
        status: String(po?.status || 'draft')
      });
      setItems(loadedItems.length ? loadedItems.map((item) => ({
        ...blankItemRow(),
        ...item,
        supplier: String(item?.supplier || '').trim(),
        amount: item?.amount || formatAmount(toNumber(item?.qty) * toNumber(item?.rate))
      })) : [blankItemRow()]);
      setErrors({});
      setView('form');
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load PO.');
    } finally {
      setIsLoading(false);
    }
  };

  const save = async (nextStatus = 'draft') => {
    if (!selectedFirm) return;
    if (!validate()) return;
    setIsSaving(true);
    setStatus('Saving PO...');
    try {
      const meaningfulItems = items
        .filter((it) => Object.values(it).some((v) => String(v ?? '').trim() !== ''))
        .map((it) => ({
          supplier: String(it.supplier || '').trim(),
          erp_code: String(it.erp_code || '').trim(),
          item_name: String(it.item_name || '').trim(),
          description: String(it.description || '').trim(),
          unit: String(it.unit || '').trim(),
          qty: String(it.qty || '').trim(),
          rate: String(it.rate || '').trim(),
          amount: String(it.amount || '').trim(),
          remark: String(it.remark || '').trim()
        }));

      const poPayload = {
        po_no: String(formData.po_no || '').trim(),
        pr_no: String(formData.pr_no || '').trim(),
        po_type: String(formData.po_type || 'mrr') === 'other' ? 'other' : 'mrr',
        supplier: (() => {
          const fromHeader = String(formData.supplier || '').trim();
          if (fromHeader) return fromHeader;
          const unique = Array.from(new Set(meaningfulItems.map((it) => String(it.supplier || '').trim()).filter(Boolean)));
          return unique.length === 1 ? unique[0] : '';
        })(),
        po_date: String(formData.po_date || '').trim(),
        po_details: String(formData.po_details || '').trim(),
        remark: String(formData.remark || '').trim(),
        status: nextStatus,
        created_by: userEmail
      };

      const resp = await savePurchaseOrder(poPayload, meaningfulItems, { spreadsheetId: selectedFirm.spreadsheetId, userEmail });
      const poNo = String(resp?.po_no || poPayload.po_no || '').trim();
      setStatus(poNo ? `Saved ${poNo}` : 'Saved.');
      setView('list');
      await load();
    } catch (err) {
      setStatus(err?.message || 'Could not save PO.');
    } finally {
      setIsSaving(false);
    }
  };

  const approve = async (poNo, decision) => {
    if (!selectedFirm) return;
    const remark = decision === 'reject' ? window.prompt('Reject remark (optional):', '') : '';
    setIsSaving(true);
    try {
      await approvePurchaseOrder(poNo, decision, String(remark || ''), { spreadsheetId: selectedFirm.spreadsheetId, userEmail });
      await load();
    } catch (err) {
      alert(err?.message || 'Could not update PO.');
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
    const locked = isApproveMode || String(formData.status || 'draft') === 'approved';
    const itemType = String(formData.po_type || 'mrr') === 'other' ? 'other' : 'mrr';
    const itemOptions = itemMaster.filter((it) => String(it?.item_type || 'mrr') === itemType && String(it?.active || '1') !== '0');
    const showErp = itemType === 'mrr';
    const itemNameOptions = Array.from(new Set(itemOptions.map((it) => String(it?.item_name || '').trim()).filter(Boolean)));
    const itemNameListId = `po-item-names-${itemType}`;
    const supplierListId = 'po-suppliers';
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '18px', overflowY: 'auto' }}>
        <div style={{ width: 'min(1100px, 100%)', margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 1000, color: '#111827' }}>{formData.po_no ? `Purchase Order - ${formData.po_no}` : 'New Purchase Order'}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}{formData.pr_no ? ` | From PR: ${formData.pr_no}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
              {!locked ? (
                <>
                  <button type="button" className="btn" disabled={isSaving} onClick={() => save('draft')} style={{ padding: '10px 14px', fontWeight: 900 }}>Save Draft</button>
                  <button type="button" className="btn main" disabled={isSaving} onClick={() => save('pending')} style={{ padding: '10px 14px', fontWeight: 900 }}>Submit for Approval</button>
                </>
              ) : null}
            </div>
          </div>

          {errors.items ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 800 }}>{errors.items}</div> : null}
          {status ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Type</div>
              <select
                disabled={locked}
                value={formData.po_type || 'mrr'}
                onChange={(e) => {
                  const nextType = String(e.target.value || 'mrr');
                  setFormData((p) => ({ ...p, po_type: nextType }));
                  if (nextType !== 'mrr') {
                    setItems((prev) => prev.map((row) => ({ ...row, erp_code: '' })));
                  }
                }}
                style={inputStyle('po_type')}
              >
                <option value="mrr">MRR</option>
                <option value="other">Other MRR</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>PO Date</div>
              <input
                type="date"
                disabled={locked}
                value={ddmmyyyyToIso(formData.po_date)}
                onChange={(e) => setFormData((p) => ({ ...p, po_date: isoToDdmmyyyy(e.target.value) }))}
                style={inputStyle('po_date')}
              />
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>PO Details</div>
              <input
                disabled={locked}
                value={formData.po_details}
                onChange={(e) => setFormData((p) => ({ ...p, po_details: e.target.value }))}
                style={inputStyle('po_details')}
                placeholder="Auto: PO No - Date"
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
              {!locked ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button type="button" className="btn small" onClick={addSupplierQuick}>+ Supplier</button>
                  <button type="button" className="btn small" onClick={() => setItems((p) => [...p, blankItemRow()])}>+ Add Row</button>
                </div>
              ) : null}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {showErp ? <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>ERP</th> : null}
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Supplier</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Item</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Remark</th>
                    {!locked ? <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }} /> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      {showErp ? (
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                          <select disabled={locked} value={row.erp_code} onChange={(e) => setItem(idx, 'erp_code', e.target.value)} style={{ width: '140px' }}>
                            <option value="">Select ERP</option>
                            {itemOptions.map((it) => (
                              <option key={`${it.item_type}-${it.erp_code}`} value={it.erp_code}>{it.erp_code}</option>
                            ))}
                          </select>
                        </td>
                      ) : null}
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          disabled={locked}
                          list={supplierListId}
                          value={row.supplier}
                          onChange={(e) => setItem(idx, 'supplier', e.target.value)}
                          style={{ width: '200px' }}
                          placeholder="Select / search supplier"
                        />
                      </td>
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
            <datalist id={supplierListId}>
              {supplierOptions.map((name) => <option key={name} value={name} />)}
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
            <div style={{ fontSize: '26px', fontWeight: 1000, color: '#111827' }}>{isApproveMode ? 'Approve PO' : 'PO'}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO / supplier" style={{ ...inputStyle('search'), width: '260px', borderRadius: '999px' }} />
            <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
            <button type="button" className="btn small" onClick={load} disabled={isLoading} style={{ padding: '10px 14px', fontWeight: 900 }}>Refresh</button>
          </div>
        </div>

        {!isApproveMode ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 1000, color: '#111827' }}>Approved Purchase Requests (PO)</div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {approvedPrs.length ? approvedPrs.map((pr) => (
                <button key={pr.pr_no} type="button" className="btn small" onClick={() => openNewFromPr(pr.pr_no)}>
                  {pr.pr_no}
                </button>
              )) : <div style={{ fontSize: '12px', color: '#6b7280' }}>No approved PR found.</div>}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {tabButton('all', 'All')}
          {tabButton(isApproveMode ? 'pending' : 'draft', isApproveMode ? 'Pending' : 'Draft')}
          {tabButton('approved', 'Approved')}
          {tabButton('rejected', 'Rejected')}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{isLoading ? 'Loading...' : `Showing ${filteredPos.length} entries`}</div>
            {status ? <div style={{ fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>PO</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Supplier</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>PO Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos
                  .filter((row) => {
                    if (tab === 'all') return true;
                    const statusText = String(row?.status || '').toLowerCase();
                    if (!isApproveMode && tab === 'draft') return statusText === 'draft' || statusText === 'pending';
                    return statusText === tab;
                  })
                  .map((row) => {
                    const poNo = String(row?.po_no || '').trim();
                    const statusText = String(row?.status || 'draft').toLowerCase();
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
                      <tr key={poNo}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 1000, color: '#1d4ed8' }}>{poNo}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.supplier || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.po_date || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}><span style={statusPill}>{statusText.toUpperCase()}</span></td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" className="btn small" onClick={() => openEdit(poNo)} disabled={isSaving}>Open</button>{' '}
                          {isApproveMode && statusText === 'pending' ? (
                            <>
                              <button type="button" className="btn small" onClick={() => approve(poNo, 'approve')} disabled={isSaving} style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}>Approve</button>{' '}
                              <button type="button" className="btn small" onClick={() => approve(poNo, 'reject')} disabled={isSaving} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }}>Reject</button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                {!filteredPos.length ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px 12px', color: '#6b7280' }}>No entries found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

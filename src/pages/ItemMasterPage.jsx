import React, { useEffect, useMemo, useRef, useState } from 'react';

function buildMrrItemName(erp, size, unit, gsm, bf) {
  const erpText = String(erp || '').trim();
  const sizeText = String(size || '').trim();
  const unitText = String(unit || '').trim();
  const gsmText = String(gsm || '').trim();
  const bfText = String(bf || '').trim();
  const parts = [];
  if (sizeText) parts.push(`Size: ${sizeText}${unitText ? ` ${unitText}` : ''}`);
  if (gsmText) parts.push(`GSM: ${gsmText}`);
  if (bfText) parts.push(`BF: ${bfText}`);
  const rhs = parts.join(' X ');
  return `${erpText}${rhs ? ` - ${rhs}` : ''}`.trim();
}

export default function ItemMasterPage({ selectedFirm, deps, onBack, initialItemType = '', onSaved }) {
  const { fetchItems, saveItems } = deps;
  const autoOpenNew = Boolean(String(initialItemType || '').trim());
  const requestedItemType = String(initialItemType || '').trim().toLowerCase() === 'other' ? 'other' : String(initialItemType || '').trim() ? 'mrr' : '';
  const autoOpenedRef = useRef(false);

  const digitsOnly = (value) => String(value || '').replace(/[^\d]/g, '');
  const decimalOnly = (value) => {
    const text = String(value || '').replace(/[^\d.]/g, '');
    const [head, ...rest] = text.split('.');
    if (!rest.length) return head;
    return `${head}.${rest.join('')}`;
  };

  const blankItem = () => ({
    item_type: String(initialItemType || '').trim().toLowerCase() === 'other' ? 'other' : 'mrr', // 'mrr' | 'other'
    erp_code: '',
    item_name: '',
    size: '',
    gsm: '',
    bf: '',
    unit: 'KG',
    active: '1'
  });

  const [items, setItems] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingIndex, setEditingIndex] = useState(-1);
  const [formData, setFormData] = useState(blankItem());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  const normalizedExistingUniqueKeys = useMemo(() => {
    const set = new Set();
    items.forEach((item, index) => {
      if (index === editingIndex) return;
      const type = String(item?.item_type || 'mrr').trim().toLowerCase() || 'mrr';
      const code = String(item?.erp_code || '').trim().toLowerCase();
      const name = String(item?.item_name || '').trim().toLowerCase();
      if (code) set.add(`${type}:erp:${code}`);
      if (name) set.add(`${type}:name:${name}`);
    });
    return set;
  }, [items, editingIndex]);

  const filteredItems = useMemo(() => {
    const query = String(search || '').trim().toLowerCase();
    const typeFiltered = requestedItemType
      ? items.filter((item) => String(item?.item_type || 'mrr').trim().toLowerCase() === requestedItemType)
      : items;
    if (!query) return typeFiltered;
    return typeFiltered.filter((item) => {
      const code = String(item?.erp_code || '').toLowerCase();
      const name = String(item?.item_name || '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [items, search, requestedItemType]);

  useEffect(() => {
    async function loadItems() {
      if (!selectedFirm) return;
      setIsLoading(true);
      setStatus('Loading items...');
      try {
        const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
        setItems(Array.isArray(data) ? data : []);
        setStatus('');
      } catch (err) {
        setStatus(err?.message || 'Could not load items.');
      } finally {
        setIsLoading(false);
      }
    }
    loadItems();
  }, [fetchItems, selectedFirm]);

  const validate = () => {
    const nextErrors = {};
    const type = String(formData.item_type || 'mrr').trim().toLowerCase() || 'mrr';
    const erp = String(formData.erp_code || '').trim();
    const name = String(formData.item_name || '').trim();
    const size = String(formData.size || '').trim();
    const gsm = String(formData.gsm || '').trim();
    const bf = String(formData.bf || '').trim();

    if (type === 'mrr') {
      if (!erp) nextErrors.erp_code = 'ERP Code is required for MRR';
      if (!size) nextErrors.size = 'Size is required for MRR';
      if (!gsm) nextErrors.gsm = 'GSM is required for MRR';
      if (!bf) nextErrors.bf = 'BF is required for MRR';
      if (erp && normalizedExistingUniqueKeys.has(`mrr:erp:${erp.toLowerCase()}`)) {
        nextErrors.erp_code = 'ERP Code already exists (MRR)';
      }
    } else {
      if (!name) nextErrors.item_name = 'Item Name is required for Other';
      if (name && normalizedExistingUniqueKeys.has(`other:name:${name.toLowerCase()}`)) {
        nextErrors.item_name = 'Item Name already exists (Other)';
      }
      if (erp && normalizedExistingUniqueKeys.has(`other:erp:${erp.toLowerCase()}`)) {
        nextErrors.erp_code = 'ERP Code already exists (Other)';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openNew = () => {
    setEditingIndex(-1);
    setFormData(blankItem());
    setErrors({});
    setStatus('');
    setView('form');
  };

  useEffect(() => {
    if (!autoOpenNew) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    openNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenNew]);

  const openEdit = (index) => {
    const row = items[index] || {};
    setEditingIndex(index);
    setFormData({
      ...blankItem(),
      ...row,
      item_type: String(row?.item_type || 'mrr') === 'other' ? 'other' : 'mrr',
      size: String(row?.size || '').trim(),
      gsm: String(row?.gsm || '').trim(),
      bf: String(row?.bf || '').trim(),
      active: String(row?.active ?? '1') === '0' ? '0' : '1'
    });
    setErrors({});
    setStatus('');
    setView('form');
  };

  const doSave = async () => {
    if (!selectedFirm) return;
    if (!validate()) return;

    setIsSaving(true);
    setStatus('Saving item...');
    try {
      const type = String(formData.item_type || 'mrr').trim().toLowerCase() === 'other' ? 'other' : 'mrr';
      const payload = {
        item_type: type,
        erp_code: String(formData.erp_code || '').trim(),
        item_name: String(formData.item_name || '').trim(),
        size: String(formData.size || '').trim(),
        gsm: String(formData.gsm || '').trim(),
        bf: String(formData.bf || '').trim(),
        unit: String(formData.unit || '').trim() || 'KG',
        active: String(formData.active || '1') === '0' ? '0' : '1'
      };

      if (type === 'mrr') {
        payload.item_name = buildMrrItemName(payload.erp_code, payload.size, payload.unit, payload.gsm, payload.bf) || payload.erp_code || 'MRR ITEM';
      } else {
        // Other items: ERP/size/gsm/bf are optional.
        if (!payload.erp_code) payload.erp_code = '';
        if (!payload.size) payload.size = '';
        if (!payload.gsm) payload.gsm = '';
        if (!payload.bf) payload.bf = '';
      }

      await saveItems([payload], { spreadsheetId: selectedFirm.spreadsheetId });
      const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
      setItems(Array.isArray(data) ? data : []);
      setStatus('Saved.');
      if (typeof onSaved === 'function') {
        try {
          onSaved(payload);
        } catch {
          // ignore
        }
        onBack?.();
      } else {
        setView('list');
      }
    } catch (err) {
      setStatus(err?.message || 'Could not save item.');
    } finally {
      setIsSaving(false);
    }
  };

  const doDeactivate = async (index) => {
    const row = items[index];
    if (!row) return;
    if (!window.confirm('Deactivate this item?')) return;
    setIsSaving(true);
    setStatus('Deactivating item...');
    try {
      await saveItems([{ ...row, active: '0' }], { spreadsheetId: selectedFirm.spreadsheetId });
      const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
      setItems(Array.isArray(data) ? data : []);
      setStatus('Deactivated.');
    } catch (err) {
      setStatus(err?.message || 'Could not deactivate item.');
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
    borderRadius: '8px',
    outline: 'none',
    background: '#fff',
    color: '#111'
  });

  const smallNumericStyle = (field) => ({
    ...inputStyle(field),
    maxWidth: '170px'
  });

  if (view === 'form') {
    const isMrrType = String(formData.item_type || 'mrr').trim().toLowerCase() !== 'other';
    const mrrItemNamePreview = isMrrType
      ? buildMrrItemName(formData.erp_code, formData.size, formData.unit, formData.gsm, formData.bf)
      : '';
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '28px 18px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 'min(720px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '22px', fontWeight: 1000, color: '#111827' }}>{editingIndex >= 0 ? 'Edit Item' : 'New Item'}</div>
            <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Type</div>
              <select value={formData.item_type} onChange={(e) => {
                const nextType = String(e.target.value || 'mrr');
                setFormData((p) => ({
                  ...p,
                  item_type: nextType,
                  // Clear type-specific fields to reduce mistakes.
                  ...(nextType === 'other' ? { erp_code: '', size: '', gsm: '', bf: '' } : {})
                }));
              }} style={inputStyle('item_type')}>
                <option value="mrr">MRR (Reel)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {isMrrType ? (
              <div style={{ gridColumn: 'span 1' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>ERP Code</div>
                <input
                  value={formData.erp_code}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setFormData((p) => ({ ...p, erp_code: digitsOnly(e.target.value) }))}
                  style={smallNumericStyle('erp_code')}
                  placeholder="Required for MRR"
                />
                {errors.erp_code ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.erp_code}</div> : null}
              </div>
            ) : (
              <div style={{ gridColumn: 'span 1' }} />
            )}
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Unit</div>
              <select value={formData.unit} onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))} style={inputStyle('unit')}>
                <option value="KG">KG</option>
                <option value="PCS">PCS</option>
                <option value="CM">CM</option>
                <option value="MTR">MTR</option>
              </select>
            </div>
            {isMrrType ? (
              <>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Size</div>
                  <input
                    value={formData.size}
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    onChange={(e) => setFormData((p) => ({ ...p, size: decimalOnly(e.target.value) }))}
                    style={smallNumericStyle('size')}
                    placeholder="Required for MRR"
                  />
                  {errors.size ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.size}</div> : null}
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>GSM</div>
                  <input
                    value={formData.gsm}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setFormData((p) => ({ ...p, gsm: digitsOnly(e.target.value) }))}
                    style={smallNumericStyle('gsm')}
                    placeholder="Required for MRR"
                  />
                  {errors.gsm ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.gsm}</div> : null}
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>BF</div>
                  <input
                    value={formData.bf}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setFormData((p) => ({ ...p, bf: digitsOnly(e.target.value) }))}
                    style={smallNumericStyle('bf')}
                    placeholder="Required for MRR"
                  />
                  {errors.bf ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.bf}</div> : null}
                </div>
                <div style={{ gridColumn: 'span 1' }} />
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Item Name</div>
                  <input value={mrrItemNamePreview} readOnly style={{ ...inputStyle('item_name'), background: '#f9fafb' }} />
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                    Auto: <code>ERP- SIZE UNIT * GSM * BF</code>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Item Name</div>
                <input value={formData.item_name} onChange={(e) => setFormData((p) => ({ ...p, item_name: e.target.value }))} style={inputStyle('item_name')} placeholder="Required for Other" />
                {errors.item_name ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.item_name}</div> : null}
              </div>
            )}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#374151', marginBottom: '6px' }}>Active</div>
              <select value={formData.active} onChange={(e) => setFormData((p) => ({ ...p, active: e.target.value }))} style={inputStyle('active')}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {status ? <div style={{ marginRight: 'auto', fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}
            <button type="button" className="btn main" disabled={isSaving} onClick={doSave} style={{ padding: '10px 16px', fontWeight: 900 }}>
              {isSaving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: '#f5f7fb' }}>
      <div style={{ margin: 0, background: 'transparent', padding: '18px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ margin: 0, fontSize: '26px', fontWeight: 1000, color: '#111827' }}>Item Master</div>
            <div style={{ marginTop: '4px', fontSize: '14px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ERP / name" style={{ ...inputStyle('search'), width: '240px', borderRadius: '999px' }} />
            <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
            <button type="button" className="btn main" onClick={openNew} style={{ padding: '10px 14px', fontWeight: 900 }}>+ New Item</button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {isLoading ? 'Loading...' : `Items: ${filteredItems.length}`}
            </div>
            {status ? <div style={{ fontSize: '14px', color: '#6b7280' }}>{status}</div> : null}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>ERP Code</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>Item Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>Size</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>GSM</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>BF</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>Unit</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>Active</th>
                  <th style={{ textAlign: 'right', padding: '12px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={`${item?.erp_code || ''}-${index}`}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.item_type || 'mrr') === 'other' ? 'Other' : 'MRR'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 900 }}>{String(item?.erp_code || '').trim()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.item_name || '').trim()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.size || '').trim()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.gsm || '').trim()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.bf || '').trim()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.unit || '').trim()}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.active || '1') === '0' ? 'No' : 'Yes'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn small" onClick={() => openEdit(index)} disabled={isSaving}>Edit</button>{' '}
                      <button type="button" className="btn small" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => doDeactivate(index)} disabled={isSaving}>Deactivate</button>
                    </td>
                  </tr>
                ))}
                {!filteredItems.length ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '16px 12px', color: '#6b7280' }}>No items found.</td>
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

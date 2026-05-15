import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import SearchableSelect from '../components/layout/SearchableSelect';
import ConfirmModal from '../components/modals/ConfirmModal';
import TextPromptModal from '../components/modals/TextPromptModal';

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
  const { fetchItems, saveItems, deleteItem, fetchItemGroups, saveItemGroup } = deps;
  const autoOpenNew = Boolean(String(initialItemType || '').trim());
  const requestedItemType = (() => {
    const t = String(initialItemType || '').trim().toLowerCase();
    if (t === 'other') return 'other';
    if (t === 'reel' || t === 'mrr') return 'reel';
    return '';
  })();
  const autoOpenedRef = useRef(false);
  const DEFAULT_REEL_GROUP = 'Reel';

  const digitsOnly = (value) => String(value || '').replace(/[^\d]/g, '');
  const decimalOnly = (value) => {
    const text = String(value || '').replace(/[^\d.]/g, '');
    const [head, ...rest] = text.split('.');
    if (!rest.length) return head;
    return `${head}.${rest.join('')}`;
  };

  const downloadCsv = (filename, headers, rows) => {
    const esc = (v) => {
      const s = String(v ?? '');
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.map(esc).join(','),
      ...rows.map((r) => headers.map((h) => esc(r?.[h])).join(','))
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const blankItem = () => ({
    id: '',
    item_type: requestedItemType || 'reel', // 'reel' | 'other'
    item_group: (requestedItemType || 'reel') === 'reel' ? DEFAULT_REEL_GROUP : '',
    erp_code: '',
    item_name: '',
    size: '',
    gsm: '',
    bf: '',
    unit: 'CM',
    active: '1'
  });

  const [items, setItems] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingIndex, setEditingIndex] = useState(-1);
  const [formData, setFormData] = useState(blankItem());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [typeFilter, setTypeFilter] = useState(requestedItemType || 'all'); // all | reel | other
  const [sizeFilter, setSizeFilter] = useState('all');
  const [gsmFilter, setGsmFilter] = useState('all');
  const openedAsQuickCreate = autoOpenNew;
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, confirmLabel: 'OK' });
  const [groupPrompt, setGroupPrompt] = useState({ open: false });

  const uiToInternalAll = (value) => {
    const t = String(value || '').trim();
    return t.toLowerCase() === 'all' ? 'all' : t;
  };
  const internalToUiAll = (value) => (String(value || '').trim().toLowerCase() === 'all' ? 'All' : String(value || '').trim());

  const normalizedExistingUniqueKeys = useMemo(() => {
    const set = new Set();
    items.forEach((item, index) => {
      if (index === editingIndex) return;
      const type = String(item?.item_type || 'reel').trim().toLowerCase() === 'other' ? 'other' : 'reel';
      const code = String(item?.erp_code || '').trim().toLowerCase();
      const name = String(item?.item_name || '').trim().toLowerCase();
      if (code) set.add(`${type}:erp:${code}`);
      if (name) set.add(`${type}:name:${name}`);
    });
    return set;
  }, [items, editingIndex]);

  const filteredItems = useMemo(() => {
    const query = String(deferredSearch || '').trim().toLowerCase();
    const effectiveTypeFilter = requestedItemType || (typeFilter === 'all' ? '' : typeFilter);
    const typeFiltered = effectiveTypeFilter
      ? items.filter((item) => String(item?.item_type || 'reel').trim().toLowerCase() === effectiveTypeFilter)
      : items;
    if (!query) return typeFiltered;
    return typeFiltered.filter((item) => {
      const code = String(item?.erp_code || '').toLowerCase();
      const name = String(item?.item_name || '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [items, deferredSearch, requestedItemType, typeFilter]);

  const visibleItems = useMemo(() => {
    let next = filteredItems;
    if (String(sizeFilter || '').toLowerCase() !== 'all') {
      next = next.filter((it) => String(it?.size || '').trim() === sizeFilter);
    }
    if (String(gsmFilter || '').toLowerCase() !== 'all') {
      next = next.filter((it) => String(it?.gsm || '').trim() === gsmFilter);
    }
    return next;
  }, [filteredItems, sizeFilter, gsmFilter]);

  const sortedVisibleItems = useMemo(() => {
    const toNum = (value) => {
      const digits = String(value ?? '').replace(/[^\d]/g, '');
      if (!digits) return null;
      const n = Number(digits);
      return Number.isFinite(n) ? n : null;
    };
    const copy = [...visibleItems];
    copy.sort((a, b) => {
      const aId = toNum(a?.id);
      const bId = toNum(b?.id);
      if (aId != null && bId != null) return bId - aId; // latest first

      const aErp = toNum(a?.erp_code);
      const bErp = toNum(b?.erp_code);
      if (aErp != null && bErp != null) return bErp - aErp; // numeric desc

      const aName = String(a?.item_name || '').trim();
      const bName = String(b?.item_name || '').trim();
      return aName.localeCompare(bName);
    });
    return copy;
  }, [visibleItems]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const t = String(it?.item_type || 'reel').trim().toLowerCase();
      const okType = requestedItemType ? t === requestedItemType : (typeFilter === 'all' ? true : t === typeFilter);
      if (!okType) return;
      const v = String(it?.size || '').trim();
      if (v) set.add(v);
    });
    const sorted = Array.from(set).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      const aNum = Number.isFinite(na) && String(a).trim() !== '';
      const bNum = Number.isFinite(nb) && String(b).trim() !== '';
      if (aNum && bNum) return na - nb;
      return a.localeCompare(b);
    });
    return ['All', ...sorted];
  }, [items, requestedItemType, typeFilter]);

  const gsmOptions = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const t = String(it?.item_type || 'reel').trim().toLowerCase();
      const okType = requestedItemType ? t === requestedItemType : (typeFilter === 'all' ? true : t === typeFilter);
      if (!okType) return;
      const v = String(it?.gsm || '').trim();
      if (v) set.add(v);
    });
    const sorted = Array.from(set).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      const aNum = Number.isFinite(na) && String(a).trim() !== '';
      const bNum = Number.isFinite(nb) && String(b).trim() !== '';
      if (aNum && bNum) return na - nb;
      return a.localeCompare(b);
    });
    return ['All', ...sorted];
  }, [items, requestedItemType, typeFilter]);

  useEffect(() => {
    async function loadItems() {
      if (!selectedFirm) return;
      setIsLoading(true);
      setStatus('');
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

  useEffect(() => {
    async function loadGroups() {
      if (!selectedFirm) return;
      if (!fetchItemGroups) return;
      setIsLoadingGroups(true);
      try {
        const data = await fetchItemGroups({ spreadsheetId: selectedFirm.spreadsheetId });
        setItemGroups(Array.isArray(data) ? data : []);
      } catch {
        setItemGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    }
    loadGroups();
  }, [fetchItemGroups, selectedFirm]);

  const groupOptionsOther = useMemo(() => {
    const groups = (Array.isArray(itemGroups) ? itemGroups : [])
      .filter((g) => String(g?.active ?? '1') !== '0')
      .map((g) => String(g?.group_name || '').trim())
      .filter(Boolean)
      .filter((name) => name.toLowerCase() !== DEFAULT_REEL_GROUP.toLowerCase());
    const uniq = Array.from(new Set(groups));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  }, [itemGroups]);

  const validate = () => {
    const nextErrors = {};
    const type = String(formData.item_type || 'mrr').trim().toLowerCase() || 'mrr';
    const erp = String(formData.erp_code || '').trim();
    const name = String(formData.item_name || '').trim();
    const group = String(formData.item_group || '').trim();
    const size = String(formData.size || '').trim();
    const gsm = String(formData.gsm || '').trim();
    const bf = String(formData.bf || '').trim();

    if (type === 'mrr' || type === 'reel') {
      if (!size) nextErrors.size = 'Size is required for Reel';
      if (!gsm) nextErrors.gsm = 'GSM is required for Reel';
      if (!bf) nextErrors.bf = 'BF is required for Reel';
      // ERP is generated by backend for new reel items. Only validate uniqueness for existing edits.
      if (erp && editingIndex >= 0 && normalizedExistingUniqueKeys.has(`reel:erp:${erp.toLowerCase()}`)) {
        nextErrors.erp_code = 'ERP Code already exists (Reel)';
      }
    } else {
      if (!group) nextErrors.item_group = 'Item Group is required for Other';
      if (!name) nextErrors.item_name = 'Item Name is required for Other';
      if (name && normalizedExistingUniqueKeys.has(`other:name:${name.toLowerCase()}`)) {
        nextErrors.item_name = 'Item Name already exists (Other)';
      }
      if (erp && editingIndex >= 0 && normalizedExistingUniqueKeys.has(`other:erp:${erp.toLowerCase()}`)) {
        nextErrors.erp_code = 'ERP Code already exists (Other)';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openNew = () => {
    setEditingIndex(-1);
    setFormData({
      ...blankItem(),
      item_group: (requestedItemType || 'reel') === 'reel' ? DEFAULT_REEL_GROUP : '',
      erp_code: '',
      item_name: ''
    });
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
    const itemType = String(row?.item_type || 'reel') === 'other' ? 'other' : 'reel';
    setFormData({
      ...blankItem(),
      ...row,
      item_type: itemType,
      item_group: itemType === 'reel' ? DEFAULT_REEL_GROUP : String(row?.item_group || '').trim(),
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
    if (!selectedFirm) {
      setStatus('Please select firm first.');
      return;
    }
    if (!validate()) return;

    setIsSaving(true);
    setStatus('Saving item...');
    try {
      const type = String(formData.item_type || 'reel').trim().toLowerCase() === 'other' ? 'other' : 'reel';
      const wasNew = editingIndex < 0;
      const payload = {
        id: String(formData.id || '').trim(),
        item_type: type,
        item_group: type === 'reel' ? DEFAULT_REEL_GROUP : String(formData.item_group || '').trim(),
        erp_code: String(formData.erp_code || '').trim(),
        item_name: String(formData.item_name || '').trim(),
        size: String(formData.size || '').trim(),
        gsm: String(formData.gsm || '').trim(),
        bf: String(formData.bf || '').trim(),
        unit: String(formData.unit || '').trim() || 'CM',
        active: String(formData.active || '1') === '0' ? '0' : '1'
      };

      if (type === 'reel') {
        // Backend generates ERP + name for new Reel items when missing.
        if (editingIndex >= 0) {
          payload.item_name = buildMrrItemName(payload.erp_code, payload.size, payload.unit, payload.gsm, payload.bf) || payload.item_name || payload.erp_code || 'REEL ITEM';
        } else {
          payload.erp_code = '';
          payload.item_name = '';
        }
      } else {
        // Other items: ERP/size/gsm/bf are optional.
        if (!payload.erp_code) payload.erp_code = '';
        if (!payload.size) payload.size = '';
        if (!payload.gsm) payload.gsm = '';
        if (!payload.bf) payload.bf = '';
      }

      await saveItems([payload], { spreadsheetId: selectedFirm.spreadsheetId });
      const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);

      const findSavedItem = () => {
        if (!wasNew && payload.id) {
          const byId = nextItems.find((it) => String(it?.id || '').trim() === String(payload.id || '').trim());
          if (byId) return byId;
        }
        const targetType = type === 'other' ? 'other' : 'reel';
        const matches = nextItems.filter((it) => {
          const itType = String(it?.item_type || 'reel') === 'other' ? 'other' : 'reel';
          if (itType !== targetType) return false;
          if (String(it?.size || '').trim() !== payload.size) return false;
          if (String(it?.gsm || '').trim() !== payload.gsm) return false;
          if (String(it?.bf || '').trim() !== payload.bf) return false;
          if (String(it?.unit || '').trim() !== payload.unit) return false;
          return true;
        });
        if (!matches.length) return null;
        // Prefer highest numeric ERP (latest generated).
        const scored = matches
          .map((it) => ({ it, erp: parseInt(String(it?.erp_code || '').trim(), 10) }))
          .sort((a, b) => (isNaN(b.erp) ? -1 : b.erp) - (isNaN(a.erp) ? -1 : a.erp));
        return scored[0]?.it || null;
      };

      const savedItem = findSavedItem();
      if (savedItem) {
        const nextType = String(savedItem?.item_type || 'reel') === 'other' ? 'other' : 'reel';
        setFormData({
          ...blankItem(),
          ...savedItem,
          item_type: nextType,
          item_group: nextType === 'reel' ? DEFAULT_REEL_GROUP : String(savedItem?.item_group || '').trim(),
          size: String(savedItem?.size || '').trim(),
          gsm: String(savedItem?.gsm || '').trim(),
          bf: String(savedItem?.bf || '').trim(),
          active: String(savedItem?.active ?? '1') === '0' ? '0' : '1'
        });
        setEditingIndex(nextItems.indexOf(savedItem));
      }

      setStatus('Saved.');
      setView('list');
      if (typeof onSaved === 'function') {
        try {
          onSaved(savedItem || payload);
        } catch {
          // ignore
        }
        if (openedAsQuickCreate) {
          onBack?.();
        }
      }
    } catch (err) {
      setStatus(err?.message || 'Could not save item.');
    } finally {
      setIsSaving(false);
    }
  };

  const doDelete = async (index) => {
    if (!selectedFirm || !deleteItem) return;
    const row = items[index];
    if (!row) return;
    if (String(row?.can_delete ?? '1') !== '1') return;
    const itemId = String(row?.id || '').trim();
    const label = String(row?.erp_code || row?.item_name || '').trim() || 'this item';
    if (!itemId) return;
    setConfirm({
      open: true,
      title: 'Confirm Delete',
      message: `Delete ${label}? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setIsSaving(true);
        setStatus('Deleting item...');
        try {
          await deleteItem({ spreadsheetId: selectedFirm.spreadsheetId, item_id: itemId });
          const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
          setItems(Array.isArray(data) ? data : []);
          setStatus('Deleted.');
        } catch (err) {
          setStatus(err?.message || 'Could not delete item.');
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const doDeactivate = async (index) => {
    const row = items[index];
    if (!row) return;
    setConfirm({
      open: true,
      title: 'Confirm Deactivate',
      message: 'Deactivate this item?',
      confirmLabel: 'Deactivate',
      onConfirm: async () => {
        setConfirm((p) => ({ ...p, open: false }));
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
      }
    });
    return;
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
    const isReelType = String(formData.item_type || 'reel').trim().toLowerCase() !== 'other';
    const isNewItem = editingIndex < 0;
    const itemNamePreview = isReelType
      ? (String(formData.erp_code || '').trim()
        ? buildMrrItemName(formData.erp_code, formData.size, formData.unit, formData.gsm, formData.bf)
        : (isNewItem ? 'Generated after save' : buildMrrItemName(formData.erp_code, formData.size, formData.unit, formData.gsm, formData.bf)))
      : '';
    const requiredMark = <span className="req-star" style={{ marginLeft: 2 }}>*</span>;

    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '28px 18px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <ConfirmModal
          isOpen={!!confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'OK'}
          onConfirm={confirm.onConfirm || (() => setConfirm((p) => ({ ...p, open: false })))}
          onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
        />
        <TextPromptModal
          isOpen={!!groupPrompt.open}
          title="Add Item Group"
          label="Group Name"
          placeholder="Enter group name"
          confirmLabel="Add"
          onCancel={() => setGroupPrompt({ open: false })}
          onConfirm={async (name) => {
            const groupName = String(name || '').trim();
            if (!groupName) return;
            if (!saveItemGroup || !fetchItemGroups || !selectedFirm) {
              setGroupPrompt({ open: false });
              return;
            }
            setGroupPrompt({ open: false });
            setIsLoadingGroups(true);
            try {
              await saveItemGroup({ group_name: groupName, active: '1' }, { spreadsheetId: selectedFirm.spreadsheetId });
              const data = await fetchItemGroups({ spreadsheetId: selectedFirm.spreadsheetId });
              setItemGroups(Array.isArray(data) ? data : []);
              setFormData((p) => ({ ...p, item_group: groupName }));
              setErrors((p) => {
                const next = { ...(p || {}) };
                delete next.item_group;
                return next;
              });
            } catch (err) {
              setStatus(err?.message || 'Could not add group.');
            } finally {
              setIsLoadingGroups(false);
            }
          }}
        />
        {(isSaving || isLoadingGroups) ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
            {status ? <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>{status}</div> : null}
          </div>
        ) : null}
        <div style={{ width: 'min(720px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '22px', fontWeight: 1000, color: '#111827' }}>{editingIndex >= 0 ? 'Edit Item' : 'New Item'}</div>
            <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Type{requiredMark}</div>
              <select value={formData.item_type} onChange={(e) => {
                const nextType = String(e.target.value || 'reel');
                setFormData((p) => ({
                  ...p,
                  item_type: nextType,
                  item_group: nextType === 'other' ? '' : DEFAULT_REEL_GROUP,
                  unit: nextType === 'reel' ? 'CM' : p.unit,
                  // Clear type-specific fields to reduce mistakes.
                  ...(nextType === 'other'
                    ? { erp_code: '', item_name: '', size: '', gsm: '', bf: '' }
                    : (isNewItem ? { erp_code: '', item_name: '' } : {}))
                }));
              }} style={inputStyle('item_type')}>
                <option value="reel">Reel</option>
                <option value="other">Other</option>
              </select>
            </div>
            {isReelType ? null : (
              <div style={{ gridColumn: 'span 1' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>ERP Code</div>
                <input
                  value={formData.erp_code}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={{ ...smallNumericStyle('erp_code'), background: '#f3f4f6', color: '#6b7280' }}
                  disabled
                  readOnly
                />
                {errors.erp_code ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.erp_code}</div> : null}
              </div>
            )}
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Unit</div>
              {isReelType ? (
                <input value="CM" readOnly disabled style={{ ...inputStyle('unit'), background: '#f3f4f6', color: '#6b7280' }} />
              ) : (
                <select value={formData.unit} onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))} style={inputStyle('unit')}>
                  <option value="KG">KG</option>
                  <option value="PCS">PCS</option>
                  <option value="CM">CM</option>
                  <option value="MTR">MTR</option>
                </select>
              )}
            </div>
            <div style={{ gridColumn: 'span 1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Item Group{isReelType ? '' : requiredMark}</div>
              {isReelType ? (
                <input value={DEFAULT_REEL_GROUP} readOnly disabled style={{ ...inputStyle('item_group'), background: '#f3f4f6', color: '#6b7280' }} />
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SearchableSelect
                      value={String(formData.item_group || '').trim()}
                      onChange={(v) => setFormData((p) => ({ ...p, item_group: String(v || '').trim() }))}
                      options={groupOptionsOther}
                      allowCustom={false}
                      placeholder="Select group"
                      inputStyle={inputStyle('item_group')}
                    />
                  </div>
                  <button type="button" className="btn" onClick={() => setGroupPrompt({ open: true })} title="Add Item Group" style={{ padding: '10px 12px', fontWeight: 1000 }}>+</button>
                </div>
              )}
              {errors.item_group ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.item_group}</div> : null}
            </div>
            {isReelType ? (
              <>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Size{requiredMark}</div>
                  <input
                    value={formData.size}
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    onChange={(e) => setFormData((p) => ({ ...p, size: decimalOnly(e.target.value) }))}
                    style={smallNumericStyle('size')}
                  />
                  {errors.size ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.size}</div> : null}
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>GSM{requiredMark}</div>
                  <input
                    value={formData.gsm}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setFormData((p) => ({ ...p, gsm: digitsOnly(e.target.value) }))}
                    style={smallNumericStyle('gsm')}
                  />
                  {errors.gsm ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.gsm}</div> : null}
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>BF{requiredMark}</div>
                  <input
                    value={formData.bf}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => setFormData((p) => ({ ...p, bf: digitsOnly(e.target.value) }))}
                    style={smallNumericStyle('bf')}
                  />
                  {errors.bf ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.bf}</div> : null}
                </div>
                <div style={{ gridColumn: 'span 1' }} />
                {/* Item Name hidden for Reel type as requested */}
              </>
            ) : (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Item Name{requiredMark}</div>
                <input value={formData.item_name} onChange={(e) => setFormData((p) => ({ ...p, item_name: e.target.value }))} style={inputStyle('item_name')} />
                {errors.item_name ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{errors.item_name}</div> : null}
              </div>
            )}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Active</div>
              <select value={formData.active} onChange={(e) => setFormData((p) => ({ ...p, active: e.target.value }))} style={inputStyle('active')}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {status ? <div style={{ marginRight: 'auto', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>{status}</div> : null}
            <button
              type="button"
              className="btn main"
              disabled={isSaving || !selectedFirm}
              title={!selectedFirm ? 'Select firm first' : ''}
              onClick={doSave}
              style={{ padding: '10px 16px', fontWeight: 900 }}
            >
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
        <ConfirmModal
          isOpen={!!confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'OK'}
          onConfirm={confirm.onConfirm || (() => setConfirm((p) => ({ ...p, open: false })))}
          onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
        />
        {(isLoading || isSaving || isLoadingGroups) ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
            {status ? <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>{status}</div> : null}
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ margin: 0, fontSize: '26px', fontWeight: 1000, color: '#111827' }}>Item Master</div>
              <div style={{ marginTop: '4px', fontSize: '14px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
            </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ERP / name" style={{ ...inputStyle('search'), width: '240px', borderRadius: '999px' }} />
            {!requestedItemType ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#1d4ed8', paddingLeft: 10 }}>Type</div>
                <SearchableSelect
                  value={String(typeFilter || '').trim().toLowerCase() === 'all' ? 'All' : String(typeFilter || '')}
                  onChange={(v) => setTypeFilter(String(v || 'All').trim().toLowerCase())}
                  options={['All', 'Reel', 'Other']}
                  allowCustom={false}
                  placeholder="Type: All"
                  inputStyle={{ ...inputStyle('typeFilter'), width: '140px', borderRadius: '999px' }}
                />
              </div>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#1d4ed8', paddingLeft: 10 }}>Size</div>
                <SearchableSelect
                  value={internalToUiAll(sizeFilter)}
                  onChange={(v) => setSizeFilter(uiToInternalAll(v))}
                  options={sizeOptions}
                  allowCustom={false}
                  placeholder="Size: All"
                  maxVisible={1000}
                  inputStyle={{ ...inputStyle('sizeFilter'), width: '140px', borderRadius: '999px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#1d4ed8', paddingLeft: 10 }}>GSM</div>
                <SearchableSelect
                  value={internalToUiAll(gsmFilter)}
                  onChange={(v) => setGsmFilter(uiToInternalAll(v))}
                  options={gsmOptions}
                  allowCustom={false}
                  placeholder="GSM: All"
                  maxVisible={1000}
                  inputStyle={{ ...inputStyle('gsmFilter'), width: '140px', borderRadius: '999px' }}
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSearch('');
                  setTypeFilter(requestedItemType || 'all');
                  setSizeFilter('all');
                  setGsmFilter('all');
                }}
                style={{ padding: '10px 14px', fontWeight: 900 }}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const headers = ['item_type', 'erp_code', 'item_name', 'size', 'gsm', 'bf', 'unit', 'active'];
                  const rows = visibleItems.map((it) => ({
                    item_type: String(it?.item_type || 'reel') === 'other' ? 'Other' : 'Reel',
                    erp_code: String(it?.erp_code || '').trim(),
                    item_name: String(it?.item_name || '').trim(),
                    size: String(it?.size || '').trim(),
                    gsm: String(it?.gsm || '').trim(),
                    bf: String(it?.bf || '').trim(),
                    unit: String(it?.unit || '').trim(),
                    active: String(it?.active || '1') === '0' ? 'No' : 'Yes',
                  }));
                  downloadCsv('item-master.csv', headers, rows);
                }}
                style={{ padding: '10px 14px', fontWeight: 900 }}
              >
                Download Excel
              </button>
              <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
              <button type="button" className="btn main" onClick={openNew} style={{ padding: '10px 14px', fontWeight: 900 }}>+ New Item</button>
            </div>
          </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {`Items: ${visibleItems.length}`}
            </div>
            {!isLoading && status ? <div style={{ fontSize: '14px', color: '#6b7280' }}>{status}</div> : null}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
              <thead>
                <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>ERP Code</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>Item Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>Size</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>GSM</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>BF</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>Unit</th>
                  <th style={{ textAlign: 'left', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>Active</th>
                  <th style={{ textAlign: 'right', padding: '12px 12px', borderBottom: '1px solid #1d4ed8', fontSize: '14px', color: '#fff' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisibleItems.map((item, index) => {
                  const originalIndex = items.indexOf(item);
                  return (
                    <tr key={`${item?.id || item?.erp_code || ''}-${index}`}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 900 }}>{index + 1}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.item_type || 'reel') === 'other' ? 'Other' : 'Reel'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 900 }}>{String(item?.erp_code || '').trim()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.item_name || '').trim()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.size || '').trim()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.gsm || '').trim()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.bf || '').trim()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.unit || '').trim()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(item?.active || '1') === '0' ? 'No' : 'Yes'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn small" onClick={() => openEdit(originalIndex)} disabled={isSaving}>Edit</button>{' '}
                        <button type="button" className="btn small" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => doDeactivate(originalIndex)} disabled={isSaving}>Deactivate</button>{' '}
                        <button
                          type="button"
                          className="btn small"
                          style={String(item?.can_delete ?? '1') === '1'
                            ? { background: '#111827', borderColor: '#111827', color: '#fff' }
                            : { background: '#9ca3af', borderColor: '#9ca3af', color: '#fff', cursor: 'not-allowed', opacity: 0.75 }}
                          onClick={() => doDelete(originalIndex)}
                          disabled={isSaving || String(item?.can_delete ?? '1') !== '1'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!sortedVisibleItems.length ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '16px 12px', color: '#6b7280' }}>No items found.</td>
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

import React, { useEffect, useMemo, useState } from 'react';

const blankSupplier = () => ({
  id: '',
  supplier_name: '',
  phone_no: '',
  gstin: '',
  active: '1'
});

export default function SuppliersPage({ selectedFirm, deps, onBack }) {
  const { fetchSupplierMaster, saveSupplierMaster } = deps;
  const [rows, setRows] = useState([]);
  const [view, setView] = useState('list'); // list | form
  const [formData, setFormData] = useState(blankSupplier());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const load = async () => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading suppliers...');
    try {
      const data = await fetchSupplierMaster({ spreadsheetId: selectedFirm.spreadsheetId });
      setRows(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load suppliers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm]);

  const filteredRows = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r?.supplier_name, r?.phone_no, r?.gstin]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

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

  const openNew = () => {
    setFormData(blankSupplier());
    setErrors({});
    setView('form');
  };

  const openEdit = (row) => {
    setFormData({
      ...blankSupplier(),
      ...row,
      id: String(row?.id || ''),
      active: String(row?.active ?? '1') === '0' ? '0' : '1'
    });
    setErrors({});
    setView('form');
  };

  const validate = () => {
    const next = {};
    if (!String(formData.supplier_name || '').trim()) next.supplier_name = 'Supplier name required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!selectedFirm) return;
    if (!validate()) return;
    setIsSaving(true);
    setStatus('Saving supplier...');
    try {
      await saveSupplierMaster(
        {
          id: String(formData.id || '').trim(),
          supplier_name: String(formData.supplier_name || '').trim(),
          supplier_code: '',
          phone_no: String(formData.phone_no || '').trim(),
          gstin: String(formData.gstin || '').trim(),
          active: String(formData.active || '1') === '0' ? '0' : '1'
        },
        { spreadsheetId: selectedFirm.spreadsheetId }
      );
      setView('list');
      await load();
      setStatus('Saved.');
    } catch (err) {
      setStatus(err?.message || 'Could not save supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '18px', overflowY: 'auto' }}>
        <div style={{ width: 'min(1100px, 100%)', margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1d4ed8' }}>{formData.id ? 'Edit Supplier' : 'New Supplier'}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 600 }}>Back</button>
              <button type="button" className="btn main" disabled={isSaving} onClick={save} style={{ padding: '10px 14px', fontWeight: 700 }}>
                {isSaving ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </div>

          {status ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Supplier Name *</div>
              <input value={formData.supplier_name} onChange={(e) => setFormData((p) => ({ ...p, supplier_name: e.target.value }))} style={inputStyle('supplier_name')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Phone</div>
              <input value={formData.phone_no} onChange={(e) => setFormData((p) => ({ ...p, phone_no: e.target.value }))} style={inputStyle('phone_no')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>GSTIN</div>
              <input value={formData.gstin} onChange={(e) => setFormData((p) => ({ ...p, gstin: e.target.value }))} style={inputStyle('gstin')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Active</div>
              <select value={formData.active} onChange={(e) => setFormData((p) => ({ ...p, active: e.target.value }))} style={inputStyle('active')}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: '#f5f7fb' }}>
      <div style={{ margin: 0, background: 'transparent', padding: '18px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#1d4ed8' }}>Suppliers</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier" style={{ ...inputStyle('search'), width: '260px', borderRadius: '999px' }} />
            <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 600 }}>Back</button>
            <button type="button" className="btn main" onClick={openNew} style={{ padding: '10px 14px', fontWeight: 700 }}>+ Supplier</button>
          </div>
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
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>GSTIN</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Active</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={String(row?.id || row?.supplier_name || '')}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{row?.supplier_name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.phone_no || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.gstin || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(row?.active ?? '1') === '0' ? 'No' : 'Yes'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn small" onClick={() => openEdit(row)} disabled={isSaving}>Open</button>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
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

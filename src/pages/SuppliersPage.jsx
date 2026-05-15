import React, { useEffect, useMemo, useState } from 'react';
import SearchableSelect from '../components/layout/SearchableSelect';
import ConfirmModal from '../components/modals/ConfirmModal';

const blankSupplier = () => ({
  id: '',
  supplier_name: '',
  address_text: '',
  district: '',
  state_name: '',
  pin_code: '',
  email: '',
  contact_person: '',
  phone_no: '',
  gstin: '',
  active: '1'
});

export default function SuppliersPage({ selectedFirm, deps, onBack, initialView = 'list', onSaved }) {
  const { fetchSupplierMaster, saveSupplierMaster, deleteSupplierMaster, fetchStateMaster } = deps;
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(initialView); // list | form
  const [formData, setFormData] = useState(blankSupplier());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [states, setStates] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });

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

  useEffect(() => {
    async function loadStates() {
      if (!fetchStateMaster) return;
      try {
        const data = await fetchStateMaster({ spreadsheetId: selectedFirm?.spreadsheetId });
        const options = (Array.isArray(data) ? data : [])
          .filter((r) => String(r?.active ?? '1') !== '0')
          .map((r) => String(r?.state_name || '').trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setStates(options);
      } catch {
        setStates([]);
      }
    }
    loadStates();
  }, [fetchStateMaster, selectedFirm]);

  const filteredRows = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r?.supplier_name, r?.phone_no, r?.gstin, r?.email, r?.contact_person, r?.address_text, r?.district, r?.state_name, r?.pin_code]
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
          address_text: String(formData.address_text || '').trim(),
          district: String(formData.district || '').trim(),
          state_name: String(formData.state_name || '').trim(),
          pin_code: String(formData.pin_code || '').trim(),
          gstin: String(formData.gstin || '').trim(),
          email: String(formData.email || '').trim(),
          contact_person: String(formData.contact_person || '').trim(),
          phone_no: String(formData.phone_no || '').trim(),
          active: String(formData.active || '1') === '0' ? '0' : '1'
        },
        { spreadsheetId: selectedFirm.spreadsheetId }
      );
      await load();
      setStatus('Saved.');
      if (typeof onSaved === 'function') {
        try {
          onSaved({ ...formData, supplier_name: String(formData.supplier_name || '').trim() });
        } catch {
          // ignore
        }
        onBack?.();
      } else {
        setView('list');
      }
    } catch (err) {
      setStatus(err?.message || 'Could not save supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const doDelete = async (row) => {
    if (!selectedFirm || !deleteSupplierMaster) return;
    if (String(row?.can_delete ?? '1') !== '1') return;
    const supplierId = String(row?.id || '').trim();
    const name = String(row?.supplier_name || '').trim() || 'this supplier';
    if (!supplierId) return;
    setConfirm({
      open: true,
      title: 'Confirm Delete',
      message: `Delete ${name}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setIsSaving(true);
        setStatus('Deleting supplier...');
        try {
          await deleteSupplierMaster({ spreadsheetId: selectedFirm.spreadsheetId, supplier_id: supplierId });
          await load();
          setStatus('Deleted.');
        } catch (err) {
          setStatus(err?.message || 'Could not delete supplier.');
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  if (view === 'form') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '18px', overflowY: 'auto' }}>
        <ConfirmModal
          isOpen={!!confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Delete"
          onConfirm={confirm.onConfirm || (() => setConfirm((p) => ({ ...p, open: false })))}
          onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
        />
        {isLoading ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
          </div>
        ) : null}
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
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Supplier Name <span className="req-star">*</span></div>
              <input value={formData.supplier_name} onChange={(e) => setFormData((p) => ({ ...p, supplier_name: e.target.value }))} style={inputStyle('supplier_name')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Contact Person</div>
              <input value={formData.contact_person} onChange={(e) => setFormData((p) => ({ ...p, contact_person: e.target.value }))} style={inputStyle('contact_person')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Contact Number</div>
              <input type="number" inputMode="numeric" value={formData.phone_no} onChange={(e) => setFormData((p) => ({ ...p, phone_no: e.target.value }))} style={inputStyle('phone_no')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Email</div>
              <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} style={inputStyle('email')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>GST No.</div>
              <input value={formData.gstin} onChange={(e) => setFormData((p) => ({ ...p, gstin: e.target.value }))} style={inputStyle('gstin')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>State</div>
              <SearchableSelect
                value={formData.state_name}
                onChange={(v) => setFormData((p) => ({ ...p, state_name: v }))}
                options={states}
                placeholder="Select state"
                inputStyle={inputStyle('state_name')}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>District</div>
              <input value={formData.district} onChange={(e) => setFormData((p) => ({ ...p, district: e.target.value }))} style={inputStyle('district')} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>PIN Code</div>
              <input type="number" inputMode="numeric" value={formData.pin_code} onChange={(e) => setFormData((p) => ({ ...p, pin_code: e.target.value }))} style={inputStyle('pin_code')} />
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>Address</div>
              <textarea value={formData.address_text} onChange={(e) => setFormData((p) => ({ ...p, address_text: e.target.value }))} style={{ ...inputStyle('address_text'), minHeight: '90px', resize: 'vertical' }} />
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
        <ConfirmModal
          isOpen={!!confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Delete"
          onConfirm={confirm.onConfirm || (() => setConfirm((p) => ({ ...p, open: false })))}
          onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
        />
        {isLoading ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
          </div>
        ) : null}
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
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Contact</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>GST</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>State</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>District</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>PIN</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Active</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={String(row?.id || row?.supplier_name || '')}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{row?.supplier_name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      {[row?.contact_person, row?.phone_no].map((v) => String(v || '').trim()).filter(Boolean).join(' | ') || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.email || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.gstin || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.state_name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.district || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row?.pin_code || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{String(row?.active ?? '1') === '0' ? 'No' : 'Yes'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn small" onClick={() => openEdit(row)} disabled={isSaving}>Open</button>{' '}
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => doDelete(row)}
                        disabled={isSaving || String(row?.can_delete ?? '1') !== '1'}
                        style={String(row?.can_delete ?? '1') === '1'
                          ? { background: '#111827', borderColor: '#111827', color: '#fff' }
                          : { background: '#9ca3af', borderColor: '#9ca3af', color: '#fff', cursor: 'not-allowed', opacity: 0.75 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '16px 12px', color: '#6b7280' }}>No entries found.</td>
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

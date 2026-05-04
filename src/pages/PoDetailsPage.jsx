import React, { useEffect, useMemo, useState } from 'react';

export default function PoDetailsPage({
  selectedFirm,
  initialType = 'reel',
  deps,
  onBack,
  initialView = 'list'
}) {
  const {
    getSheetName,
    fetchSheetRange,
    fetchUniqueSuppliers,
    normalizePoRow,
    sheetValuesToPoRows,
    savePoRowsToSheets
  } = deps;

  const blankPoRow = () => ({
    sno: '',
    po_no: '',
    date: '',
    supplier: '',
    po_details: '',
    erp_code: '',
    size: '',
    gsm: '',
    bf: '',
    reel_details: '',
    description: '',
    hsn: '',
    unit: '',
    rate: '',
    quantity: '',
    status: '',
    quantity_received: '',
    pending: '',
    closed: '',
    rapc: ''
  });

  const [poMode, setPoMode] = useState(initialType === 'other' ? 'other' : 'reel');
  const [rows, setRows] = useState([blankPoRow()]);
  const [filterText, setFilterText] = useState('');
  const [view, setView] = useState(initialView); // respects prop
  const [formData, setFormData] = useState(blankPoRow());
  const [errors, setErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [manualFields, setManualFields] = useState({ po_details: false, reel_details: false });

  const formatDisplayDate = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleDateString('en-US');
  };

  const buildPoDetailsText = (row = {}) => {
    const poNo = String(row.po_no || '').trim();
    const supplier = String(row.supplier || '').trim();
    const dateText = formatDisplayDate(row.date);
    const parts = [poNo];
    if (dateText) parts.push(`Date: ${dateText}`);
    if (supplier) parts.push(supplier);
    return parts.filter(Boolean).join(' - ');
  };

  const buildReelDetailsText = (row = {}) => {
    const erpCode = String(row.erp_code || '').trim();
    const size = String(row.size || '').trim();
    const gsm = String(row.gsm || '').trim();
    const bf = String(row.bf || '').trim();
    const unit = String(row.unit || 'CM').trim() || 'CM';
    const specParts = [];
    if (size) specParts.push(`Size: ${size} ${unit}`);
    if (gsm) specParts.push(`GSM: ${gsm}`);
    if (bf) specParts.push(`BF: ${bf}`);
    if (!erpCode && !specParts.length) return '';
    if (!erpCode) return specParts.join(' X ');
    if (!specParts.length) return erpCode;
    return `${erpCode} - ${specParts.join(' X ')}`;
  };

  const isSameGeneratedValue = (value, generatedValue) => {
    return String(value || '').trim() === String(generatedValue || '').trim();
  };

  useEffect(() => {
    if (initialView === 'form') {
      setEditingIndex(-1);
      setFormData(blankPoRow());
      setManualFields({ po_details: false, reel_details: false });
    }
  }, [initialView]);

  const activeSheetName = getSheetName(selectedFirm?.po, poMode);

  // Dynamic Column Definitions
  const reelColumns = [
    ['sno', 'S.No', '70px'],
    ['po_no', 'PO No', '130px'],
    ['date', 'Date', '110px'],
    ['supplier', 'Supplier', '220px'],
    ['po_details', 'PO Details', '240px'],
    ['erp_code', 'ERP Code', '130px'],
    ['size', 'Size', '90px'],
    ['gsm', 'GSM', '80px'],
    ['bf', 'BF', '80px'],
    ['reel_details', 'Reel Details', '200px'],
    ['unit', 'Unit', '80px'],
    ['rate', 'Rate', '100px'],
    ['quantity', 'Qty', '100px'],
    ['status', 'Status', '110px']
  ];

  const otherColumns = [
    ['sno', 'S.No', '70px'],
    ['po_no', 'PO No', '130px'],
    ['date', 'Date', '110px'],
    ['supplier', 'Supplier', '220px'],
    ['po_details', 'PO Details', '240px'],
    ['description', 'Description', '240px'],
    ['hsn', 'HSN', '110px'],
    ['unit', 'Unit', '80px'],
    ['rate', 'Rate', '100px'],
    ['quantity', 'Qty', '100px'],
    ['status', 'Status', '110px']
  ];

  const activeColumns = poMode === 'reel' ? reelColumns : otherColumns;

  const filteredRows = useMemo(() => {
    const query = String(filterText || '').trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [
      row.sno,
      row.po_no,
      row.date,
      row.supplier,
      row.po_details,
      row.erp_code,
      row.reel_details,
      row.description,
      row.status
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [filterText, rows]);

  useEffect(() => {
    async function loadRows() {
      if (!selectedFirm || !activeSheetName) return;
      setIsLoading(true);
      setStatus(`Loading ${activeSheetName}...`);
      try {
        const payload = await fetchSheetRange(activeSheetName, selectedFirm);
        const allRows = Array.isArray(payload?.data)
          ? payload.data.map((row) => normalizePoRow(row))
          : sheetValuesToPoRows(payload?.values || []);
        setRows(allRows.length ? allRows : [blankPoRow()]);
        setStatus('');
      } catch (err) {
        setRows([blankPoRow()]);
        setStatus(err?.message || 'Could not load PO details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadRows();
  }, [activeSheetName, fetchSheetRange, normalizePoRow, selectedFirm, sheetValuesToPoRows]);

  useEffect(() => {
    async function loadSuppliers() {
      if (!selectedFirm || !fetchUniqueSuppliers) return;
      try {
        const reelSheet = getSheetName(selectedFirm?.po, 'reel') || 'PO DETAILS';
        const otherSheet = getSheetName(selectedFirm?.po, 'other') || 'OTHER PO';
        const [reelSuppliers, otherSuppliers] = await Promise.all([
          fetchUniqueSuppliers(selectedFirm, reelSheet).catch(() => []),
          fetchUniqueSuppliers(selectedFirm, otherSheet).catch(() => [])
        ]);
        const merged = [...new Set([...(reelSuppliers || []), ...(otherSuppliers || [])].map((item) => String(item || '').trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        setSuppliers(merged);
      } catch (err) {
        console.error('Could not load supplier options:', err);
      }
    }
    loadSuppliers();
  }, [fetchUniqueSuppliers, getSheetName, selectedFirm]);

  useEffect(() => {
    if (view !== 'form') return;
    const nextPoDetails = buildPoDetailsText(formData);
    const nextReelDetails = poMode === 'reel' ? buildReelDetailsText(formData) : '';
    setFormData((prev) => {
      const updates = {};
      if ((!manualFields.po_details || !String(prev.po_details || '').trim()) && nextPoDetails && !isSameGeneratedValue(prev.po_details, nextPoDetails)) {
        updates.po_details = nextPoDetails;
      }
      if (poMode === 'reel' && (!manualFields.reel_details || !String(prev.reel_details || '').trim()) && nextReelDetails && !isSameGeneratedValue(prev.reel_details, nextReelDetails)) {
        updates.reel_details = nextReelDetails;
      }
      return Object.keys(updates).length ? { ...prev, ...updates } : prev;
    });
  }, [formData.po_no, formData.date, formData.supplier, formData.erp_code, formData.size, formData.gsm, formData.bf, formData.unit, manualFields, poMode, view]);

  const handleAddNew = () => {
    setEditingIndex(-1);
    setFormData({ ...blankPoRow(), sno: String(rows.length + 1) });
    setManualFields({ po_details: false, reel_details: false });
    setErrors({});
    setView('form');
  };

  const handleEdit = (indexInFiltered) => {
    const row = filteredRows[indexInFiltered];
    const realIndex = rows.indexOf(row);
    setEditingIndex(realIndex);
    setFormData({ ...row });
    setManualFields({
      po_details: !!String(row.po_details || '').trim() && !isSameGeneratedValue(row.po_details, buildPoDetailsText(row)),
      reel_details: !!String(row.reel_details || '').trim() && !isSameGeneratedValue(row.reel_details, buildReelDetailsText(row))
    });
    setErrors({});
    setView('form');
  };

  const validate = () => {
    const newErrors = {};
    if (!String(formData.po_no).trim()) newErrors.po_no = 'PO No is required';
    if (!String(formData.date).trim()) newErrors.date = 'Date is required';
    if (!String(formData.supplier).trim()) newErrors.supplier = 'Supplier is required';
    
    if (poMode === 'reel') {
      if (!String(formData.gsm).trim()) newErrors.gsm = 'Required';
      if (!String(formData.bf).trim()) newErrors.bf = 'Required';
      if (!String(formData.size).trim()) newErrors.size = 'Required';
    } else {
      if (!String(formData.description).trim()) newErrors.description = 'Description is required';
    }

    if (!String(formData.rate).trim()) newErrors.rate = 'Rate is required';
    if (!String(formData.quantity).trim()) newErrors.quantity = 'Quantity is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveForm = async () => {
    if (!selectedFirm || !activeSheetName) return;
    if (!validate()) return;

    setIsSaving(true);
    setStatus(`Saving to ${activeSheetName}...`);
    try {
      let nextRows = [...rows];
      const cleanRow = {
        ...formData,
        po_details: String(formData.po_details || '').trim() || buildPoDetailsText(formData),
        reel_details: poMode === 'reel'
          ? (String(formData.reel_details || '').trim() || buildReelDetailsText(formData))
          : String(formData.reel_details || '').trim()
      };
      
      if (editingIndex >= 0) {
        nextRows[editingIndex] = cleanRow;
      } else {
        nextRows.push(cleanRow);
      }

      const rowsToPost = nextRows
        .map((row, idx) => ({
          ...blankPoRow(),
          ...row,
          sno: String(row.sno || idx + 1).trim()
        }))
        .filter((row) => [row.po_no, row.supplier, row.po_details, row.erp_code, row.reel_details, row.description].some((value) => String(value || '').trim()));

      await savePoRowsToSheets(rowsToPost, {
        sheetName: activeSheetName,
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      
      setRows(rowsToPost);
      setStatus(`${activeSheetName} updated successfully.`);
      setView('list');
    } catch (err) {
      setStatus(err?.message || 'Could not save PO details.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeRow = async (indexInFiltered) => {
    if (!window.confirm('Are you sure you want to delete this PO row?')) return;
    
    const rowToRemove = filteredRows[indexInFiltered];
    const realIndex = rows.indexOf(rowToRemove);
    const nextRows = rows.filter((_, idx) => idx !== realIndex);
    const rowsToPost = nextRows.length ? nextRows : [blankPoRow()];

    setIsSaving(true);
    setStatus('Deleting row...');
    try {
      await savePoRowsToSheets(rowsToPost.filter(r => r.po_no), {
        sheetName: activeSheetName,
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      setRows(rowsToPost);
      setStatus('Row deleted.');
    } catch (err) {
      setStatus(err?.message || 'Could not delete row.');
    } finally {
      setIsSaving(false);
    }
  };

  // Shared UI Primitives
  const inputStyle = (fieldName) => ({
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    padding: '10px 12px',
    border: `1.5px solid ${errors[fieldName] ? '#b91c1c' : '#d1d5db'}`,
    borderRadius: '4px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: '#fff',
    color: '#111',
    ':focus': { borderColor: '#111', boxShadow: '0 0 0 2px rgba(0,0,0,0.05)' }
  });

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '6px',
    display: 'block',
    letterSpacing: '0.01em'
  };

  const sectionHeaderStyle = {
    fontSize: '11px',
    fontWeight: '800',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px',
    marginBottom: '20px',
    marginTop: '10px'
  };

  const errorMsg = (msg) => msg ? (
    <div style={{ color: '#b91c1c', fontSize: '11px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
       <span style={{ fontSize: '14px' }}>⚠️</span> {msg}
    </div>
  ) : null;

  if (view === 'form') {
    return (
      <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '40px 24px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', borderRadius: '8px', width: '100%', maxWidth: '840px', padding: '40px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-block', padding: '12px 20px', background: '#f9fafb', borderRadius: '50px', marginBottom: '16px', border: '1px solid #f3f4f6' }}>
               <span style={{ fontSize: '28px' }}>📝</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.01em', color: '#111827', textTransform: 'uppercase' }}>
              {editingIndex >= 0 ? 'Edit PO' : 'Add PO'}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <div style={sectionHeaderStyle}>General Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>PO Number <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input value={formData.po_no} onChange={(e) => { setFormData({ ...formData, po_no: e.target.value }); setErrors({ ...errors, po_no: '' }); }} style={inputStyle('po_no')} placeholder="e.g. PO/24/001" />
                    {errorMsg(errors.po_no)}
                  </div>
                  <div>
                    <label style={labelStyle}>PO Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="date" value={formData.date} onChange={(e) => { setFormData({ ...formData, date: e.target.value }); setErrors({ ...errors, date: '' }); }} style={inputStyle('date')} />
                    {errorMsg(errors.date)}
                  </div>
                  <div>
                    <label style={labelStyle}>Supplier Name <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input list="po-supplier-options" value={formData.supplier} onChange={(e) => { setFormData({ ...formData, supplier: e.target.value }); setErrors({ ...errors, supplier: '' }); }} style={inputStyle('supplier')} placeholder="Search or select supplier name" />
                    <datalist id="po-supplier-options">
                      {suppliers.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
                    </datalist>
                    {errorMsg(errors.supplier)}
                  </div>
                  <div>
                    <label style={labelStyle}>PO Remarks / Details</label>
                    <input value={formData.po_details} onChange={(e) => { const value = e.target.value; setManualFields((prev) => ({ ...prev, po_details: String(value || '').trim() !== '' })); setFormData({ ...formData, po_details: value }); }} style={inputStyle('po_details')} placeholder="Auto: PO No - Date - Supplier" />
                  </div>
                </div>
              </div>

              {poMode === 'reel' ? (
                <div>
                  <div style={sectionHeaderStyle}>Reel Identification</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>ERP Code</label>
                      <input value={formData.erp_code} onChange={(e) => setFormData({ ...formData, erp_code: e.target.value })} style={inputStyle('erp_code')} placeholder="ERP System Code" />
                    </div>
                    <div>
                      <label style={labelStyle}>Reel Specification Details</label>
                      <input value={formData.reel_details} onChange={(e) => { const value = e.target.value; setManualFields((prev) => ({ ...prev, reel_details: String(value || '').trim() !== '' })); setFormData({ ...formData, reel_details: value }); }} style={inputStyle('reel_details')} placeholder="Auto: ERP - Size X GSM X BF" />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={sectionHeaderStyle}>Item Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Description <span style={{ color: '#b91c1c' }}>*</span></label>
                      <input value={formData.description} onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setErrors({ ...errors, description: '' }); }} style={inputStyle('description')} placeholder="Item name or description" />
                      {errorMsg(errors.description)}
                    </div>
                    <div>
                      <label style={labelStyle}>HSN / SAC Code</label>
                      <input value={formData.hsn} onChange={(e) => setFormData({ ...formData, hsn: e.target.value })} style={inputStyle('hsn')} placeholder="8-digit HSN" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
               
               {poMode === 'reel' && (
                 <div>
                    <div style={sectionHeaderStyle}>Technical Specs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                       <div>
                          <label style={labelStyle}>Size <span style={{ color: '#b91c1c' }}>*</span></label>
                          <input value={formData.size} onChange={(e) => { setFormData({ ...formData, size: e.target.value }); setErrors({ ...errors, size: '' }); }} style={inputStyle('size')} placeholder="CM" />
                          {errorMsg(errors.size)}
                       </div>
                       <div>
                          <label style={labelStyle}>GSM <span style={{ color: '#b91c1c' }}>*</span></label>
                          <input value={formData.gsm} onChange={(e) => { setFormData({ ...formData, gsm: e.target.value }); setErrors({ ...errors, gsm: '' }); }} style={inputStyle('gsm')} placeholder="150" />
                          {errorMsg(errors.gsm)}
                       </div>
                       <div>
                          <label style={labelStyle}>BF <span style={{ color: '#b91c1c' }}>*</span></label>
                          <input value={formData.bf} onChange={(e) => { setFormData({ ...formData, bf: e.target.value }); setErrors({ ...errors, bf: '' }); }} style={inputStyle('bf')} placeholder="18" />
                          {errorMsg(errors.bf)}
                       </div>
                    </div>
                 </div>
               )}

               <div>
                 <div style={sectionHeaderStyle}>Pricing & Quantity</div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                       <div>
                          <label style={labelStyle}>Unit</label>
                          <input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} style={inputStyle('unit')} placeholder="KGS / NOS" />
                       </div>
                       <div>
                          <label style={labelStyle}>Rate <span style={{ color: '#b91c1c' }}>*</span></label>
                          <input type="number" step="0.01" value={formData.rate} onChange={(e) => { setFormData({ ...formData, rate: e.target.value }); setErrors({ ...errors, rate: '' }); }} style={inputStyle('rate')} placeholder="0.00" />
                          {errorMsg(errors.rate)}
                       </div>
                    </div>
                    <div>
                       <label style={labelStyle}>Total Quantity <span style={{ color: '#b91c1c' }}>*</span></label>
                       <input type="number" step="0.01" value={formData.quantity} onChange={(e) => { setFormData({ ...formData, quantity: e.target.value }); setErrors({ ...errors, quantity: '' }); }} style={inputStyle('quantity')} placeholder="0.00" />
                       {errorMsg(errors.quantity)}
                    </div>
                 </div>
               </div>

               <div>
                  <div style={sectionHeaderStyle}>Fulfillment</div>
                  <div>
                    <label style={labelStyle}>PO Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle('status')}>
                       <option value="">Pending / New</option>
                       <option value="Open">Open</option>
                       <option value="Partial">Partial</option>
                       <option value="Closed">Closed</option>
                    </select>
                  </div>
               </div>

            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '48px', gap: '16px' }}>
            <button 
              className="btn" 
              onClick={() => setView('list')} 
              disabled={isSaving}
              style={{ padding: '12px 24px', fontWeight: '600' }}
            >
              Cancel
            </button>
            <button 
              className="btn main" 
              onClick={handleSaveForm} 
              disabled={isSaving}
              style={{ padding: '12px 32px', fontWeight: '700', minWidth: '180px' }}
            >
              {isSaving ? 'Processing...' : 'Save PO Record'}
            </button>
          </div>

          {status && <div className="status" style={{ marginTop: '24px', textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '6px', fontSize: '13px', border: '1px solid #f3f4f6' }}>{status}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '24px' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.03em', fontWeight: '900' }}>PO DETAILS</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              {selectedFirm?.name || ''} | {activeSheetName}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={onBack} disabled={isLoading || isSaving} style={{ padding: '10px 20px' }}>{'← Back'}</button>
            <div style={{ display: 'flex', border: '2px solid #111', borderRadius: '6px', padding: '2px', background: '#fff', overflow: 'hidden' }}>
               <button 
                className="btn" 
                style={{ border: '0', background: poMode === 'reel' ? '#111' : 'transparent', color: poMode === 'reel' ? '#fff' : '#111', borderRadius: '4px', padding: '8px 16px', fontWeight: '700' }} 
                onClick={() => setPoMode('reel')} 
                disabled={isLoading || isSaving}
               >
                 MRR PO
               </button>
               <button 
                className="btn" 
                style={{ border: '0', background: poMode === 'other' ? '#111' : 'transparent', color: poMode === 'other' ? '#fff' : '#111', borderRadius: '4px', padding: '8px 16px', fontWeight: '700' }} 
                onClick={() => setPoMode('other')} 
                disabled={isLoading || isSaving}
               >
                 OTHER PO
               </button>
            </div>
            <button className="btn main" onClick={handleAddNew} disabled={isLoading || isSaving} style={{ padding: '10px 24px', fontWeight: '700' }}>+ Add New PO</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search by PO No, Supplier or Details..."
              style={{ border: '1px solid #d1d5db', padding: '10px 12px 10px 36px', width: '100%', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }}>🔍</span>
          </div>
          {status ? (
            <span className="status" style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>{status}</span>
          ) : null}
        </div>

        <div className="wrap" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '4px' }}>
          <table className="table" style={{ minWidth: poMode === 'reel' ? '1800px' : '1500px' }}>
            <thead>
              <tr>
                {activeColumns.map(([key, label, width]) => (
                  <th key={key} style={{ width }}>{label}</th>
                ))}
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>📦</div>
                    <div style={{ fontWeight: '700' }}>No PO records found.</div>
                    <div style={{ fontSize: '12px' }}>Try changing the mode or search filters.</div>
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((row, index) => {
                return (
                  <tr key={index}>
                    {activeColumns.map(([key]) => (
                      <td key={key} style={key === 'po_no' || key === 'supplier' ? { fontWeight: '700' } : {}}>
                        {row[key] || '-'}
                      </td>
                    ))}
                    <td className="c">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn small" onClick={() => handleEdit(index)} disabled={isLoading || isSaving} style={{ padding: '6px 12px' }}>Edit</button>
                        <button
                          className="btn small"
                          style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', padding: '6px 12px' }}
                          onClick={() => removeRow(index)}
                          disabled={isLoading || isSaving}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

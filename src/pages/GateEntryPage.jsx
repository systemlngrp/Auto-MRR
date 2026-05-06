import React, { useEffect, useRef, useState } from 'react';
export default function GateEntryPage({
  onSave,
  onBack,
  firm,
  mrrType,
  geNo,
  initialData,
  deps
}) {
  const {
    normalizeGateEntryInitialData,
    getGateEntryNo,
    getSheetName,
    fetchUniqueSuppliers,
    fetchSheetRange,
    normalizePoRow,
    sheetValuesToPoRows,
    fetchLatestMrrGe,
    getFirmCode,
    getFinancialYearLabel,
    formatGateEntryNumber,
    fileToBase64,
    formatDecimal2,
    saveGeEntryToSheets
  } = deps;

  const [pics, setPics] = useState(Array(8).fill(null));
  const defaultDate = new Date().toLocaleDateString('en-GB');
  const [data, setData] = useState(() => normalizeGateEntryInitialData(initialData, geNo, defaultDate));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    if (initialData) {
      const newPics = Array(8).fill(null);
      for (let i = 1; i <= 8; i++) {
        const pic = initialData[`pic${i}`];
        if (pic) newPics[i - 1] = pic;
      }
      setPics(newPics);
    }
  }, [initialData]);

  useEffect(() => {
    async function loadSuppliers() {
      setIsLoadingSuppliers(true);
      try {
        const baseListPromise = fetchUniqueSuppliers(firm, getSheetName(firm?.po, 'reel') || 'PO DETAILS').catch(() => []);
        const otherListPromise = fetchUniqueSuppliers(firm, getSheetName(firm?.po, 'other') || 'OTHER PO').catch(() => []);
        const [baseList, otherList] = await Promise.all([baseListPromise, otherListPromise]);
        const merged = [...new Set([...(baseList || []), ...(otherList || [])].map((v) => String(v || '').trim()).filter(Boolean))];
        setSuppliers(merged);
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      } finally {
        setIsLoadingSuppliers(false);
      }
    }
    loadSuppliers();
  }, [fetchUniqueSuppliers, firm, getSheetName]);

  useEffect(() => {
    async function loadNextGeNo() {
      if (!firm || (getGateEntryNo(initialData) || geNo || data.ge_no) && data.mrr_no) return;
      try {
        const prefix = `${getFirmCode(firm)}/${getFinancialYearLabel(data.date || defaultDate)}/`;
        const mrrSheet = getSheetName(firm?.mrr, mrrType) || 'MRR FORM';
        const latest = await fetchLatestMrrGe(mrrSheet, firm, null, prefix, 'GE ENTRY');
        const nextGeNo = formatGateEntryNumber(firm, data.date || defaultDate, Number(latest?.ge || 0) + 1);
        setData((prev) => ({
          ...prev,
          ge_no: prev.ge_no || geNo || getGateEntryNo(initialData) || nextGeNo,
          mrr_no: prev.mrr_no || geNo || getGateEntryNo(initialData) || nextGeNo
        }));
      } catch (err) {
        console.error('Failed to load next GE/MRR No:', err);
      }
    }
    loadNextGeNo();
  }, [data.date, data.ge_no, data.mrr_no, defaultDate, fetchLatestMrrGe, firm, formatGateEntryNumber, geNo, getFinancialYearLabel, getFirmCode, getGateEntryNo, getSheetName, initialData, mrrType]);

  const handleFileChange = async (index, file) => {
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const newPics = [...pics];
      newPics[index] = base64;
      setPics(newPics);
    } catch (err) {
      alert('Error reading file');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!String(data.supplier || '').trim()) newErrors.supplier = 'Supplier Name is required';
    if (!String(data.invoice_no || '').trim()) newErrors.invoice_no = 'Invoice No is required';
    if (!String(data.total_value || '').trim()) newErrors.total_value = 'Total Value is required';
    if (!String(data.truck_no || '').trim()) newErrors.truck_no = 'Truck No is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setStatus('Uploading Gate Entry...');
    try {
      const payload = {
        ...data,
        total_value: formatDecimal2(data.total_value || ''),
        ge_no: data.ge_no || geNo || '',
        mrr_no: data.mrr_no || '',
        original_ge_no: getGateEntryNo(initialData) || '',
        firm_code: getFirmCode(firm)
      };
      pics.forEach((pic, i) => {
        if (pic) payload[`pic${i + 1}`] = pic;
      });

      const res = await saveGeEntryToSheets(payload, {
        backendUrl: firm.backendUrl,
        firmKey: firm.firmKey,
        mrrSheetName: getSheetName(firm?.mrr, mrrType),
        mode: mrrType
      });
      const finalGeNo = String(res?.ge_no || data?.ge_no || geNo || '').trim();
      const finalEntry = { ...payload, ge_no: finalGeNo, mrr_no: String(res?.mrr_no || payload?.mrr_no || '').trim() };
      if (isMountedRef.current) setStatus('Gate Entry saved successfully.');
      onSave(finalGeNo, finalEntry);
    } catch (err) {
      if (isMountedRef.current) setStatus(err.message || 'Error saving gate entry');
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  const inputStyle = (fieldName) => ({
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    padding: '10px 12px',
    border: `1.5px solid ${errors[fieldName] ? '#b91c1c' : '#d1d5db'}`,
    borderRadius: '4px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: '#fff'
  });

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '6px',
    display: 'block'
  };

  const errorMsg = (msg) => msg ? (
    <div style={{ color: '#b91c1c', fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>⚠️ {msg}</div>
  ) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', overflowY: 'auto', padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', borderRadius: '8px', width: '100%', maxWidth: '700px', padding: '40px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', padding: '12px 20px', background: '#f9fafb', borderRadius: '50px', marginBottom: '16px', border: '1px solid #f3f4f6' }}>
             <span style={{ fontSize: '28px' }}>🚛</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.01em', color: '#111827' }}>
            {initialData ? 'Edit Gate Entry' : 'Add Gate Entry'}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>{firm?.name || ''}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>GE No (Auto-Increment)</label>
              <input value={data.ge_no || ''} readOnly style={{ ...inputStyle('ge_no'), background: '#f3f4f6', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={labelStyle}>MRR No (Auto-Increment)</label>
              <input value={data.mrr_no || ''} readOnly style={{ ...inputStyle('mrr_no'), background: '#f3f4f6', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input value={data.date || defaultDate} readOnly style={{ ...inputStyle('date'), background: '#f3f4f6', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Supplier Name <span style={{ color: '#b91c1c' }}>*</span></label>
              <input 
                list="ge-suppliers" 
                value={data.supplier} 
                onChange={(e) => { setData({ ...data, supplier: e.target.value }); setErrors({ ...errors, supplier: '' }); }} 
                style={inputStyle('supplier')} 
                placeholder="Search supplier..." 
              />
              <datalist id="ge-suppliers">
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </datalist>
              {errorMsg(errors.supplier)}
            </div>
            <div>
              <label style={labelStyle}>Invoice No <span style={{ color: '#b91c1c' }}>*</span></label>
              <input value={data.invoice_no} onChange={(e) => { setData({ ...data, invoice_no: e.target.value }); setErrors({ ...errors, invoice_no: '' }); }} style={inputStyle('invoice_no')} placeholder="INV-001" />
              {errorMsg(errors.invoice_no)}
            </div>
            <div>
              <label style={labelStyle}>Invoice Value <span style={{ color: '#b91c1c' }}>*</span></label>
              <input type="number" step="0.01" value={data.total_value} onChange={(e) => { setData({ ...data, total_value: e.target.value }); setErrors({ ...errors, total_value: '' }); }} style={inputStyle('total_value')} placeholder="0.00" />
              {errorMsg(errors.total_value)}
            </div>
            <div>
              <label style={labelStyle}>Truck No <span style={{ color: '#b91c1c' }}>*</span></label>
              <input value={data.truck_no} onChange={(e) => { setData({ ...data, truck_no: e.target.value }); setErrors({ ...errors, truck_no: '' }); }} style={inputStyle('truck_no')} placeholder="AS-01-XXXX" />
              {errorMsg(errors.truck_no)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <label style={labelStyle}>Upload Photos (Up to 8)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {pics.map((pic, i) => (
              <div key={i} style={{ border: '1.5px dashed #d1d5db', borderRadius: '4px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#f9fafb', overflow: 'hidden' }}>
                {pic ? <img src={pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: '10px', color: '#9ca3af' }}>Pic {i + 1}</span>}
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(i, e.target.files[0])} style={{ position: 'absolute', opacity: 0, cursor: 'pointer', inset: 0 }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', gap: '16px' }}>
          <button className="btn" onClick={onBack} disabled={isSaving}>Cancel</button>
          <button className="btn main" onClick={handleSubmit} disabled={isSaving} style={{ minWidth: '140px' }}>
            {isSaving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>

        {status && <div className="status" style={{ marginTop: '20px', textAlign: 'center' }}>{status}</div>}
      </div>

    </div>
  );
}

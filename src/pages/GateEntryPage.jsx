import React, { useEffect, useState } from 'react';
import GateEntrySavedModal from '../components/modals/GateEntrySavedModal';

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
    saveGeEntryToSheets,
    downloadGateEntryPdfDirect
  } = deps;
  const [pics, setPics] = useState(Array(8).fill(null));
  const defaultDate = new Date().toLocaleDateString('en-GB');
  const [data, setData] = useState(() => normalizeGateEntryInitialData(initialData, geNo, defaultDate));
  const [status, setStatus] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [otherPoRows, setOtherPoRows] = useState([]);
  const [isLoadingOtherPo, setIsLoadingOtherPo] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 760 : false));
  const normalizePoNoKey = (value) => String(value ?? '').trim().replace(/\s+/g, '').replace(/\.0+$/g, '');
  const visibleSuppliers = [...new Set(
    suppliers
      .map((supplier) => String(supplier || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

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
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      date: prev.date || defaultDate,
      ge_no: prev.ge_no || geNo || getGateEntryNo(initialData) || '',
      mrr_no: (prev.ge_no || geNo || getGateEntryNo(initialData) || '')
    }));
  }, [defaultDate, geNo, getGateEntryNo, initialData]);

  useEffect(() => {
    setData((prev) => {
      const resolvedGeNo = prev.ge_no || geNo || getGateEntryNo(initialData) || '';
      if ((prev.mrr_no || '') === resolvedGeNo) return prev;
      return {
        ...prev,
        mrr_no: resolvedGeNo
      };
    });
  }, [data.ge_no, geNo, getGateEntryNo, initialData]);

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
    async function loadOtherPoRows() {
      const isOther = String(mrrType || '').trim().toLowerCase() === 'other';
      if (!firm || !isOther) {
        setOtherPoRows([]);
        return;
      }
      setIsLoadingOtherPo(true);
      try {
        const poSheet = getSheetName(firm?.po, 'other') || 'OTHER PO';
        const payload = await fetchSheetRange(poSheet, firm);
        const allRows = Array.isArray(payload?.data)
          ? payload.data.map((row) => normalizePoRow(row))
          : sheetValuesToPoRows(payload?.values || []);
        setOtherPoRows(allRows || []);
      } catch (err) {
        console.warn('Failed to load OTHER PO rows:', err?.message || err);
        setOtherPoRows([]);
      } finally {
        setIsLoadingOtherPo(false);
      }
    }
    loadOtherPoRows();
  }, [fetchSheetRange, firm, getSheetName, mrrType, normalizePoRow, sheetValuesToPoRows]);

  useEffect(() => {
    async function loadNextGeNo() {
      if (!firm?.backendUrl && !firm?.scriptUrl) return;
      if (getGateEntryNo(initialData) || geNo || data.ge_no) return;
      try {
        const prefix = `${getFirmCode(firm)}/${getFinancialYearLabel(data.date || defaultDate)}/`;
        const latest = await fetchLatestMrrGe('GE ENTRY', firm, null, prefix);
        const nextGeNo = formatGateEntryNumber(firm, data.date || defaultDate, Number(latest?.ge || 0) + 1);
        setData((prev) => prev.ge_no ? prev : { ...prev, ge_no: nextGeNo });
      } catch (err) {
        console.error('Failed to load next GE No:', err);
      }
    }
    loadNextGeNo();
  }, [data.date, data.ge_no, defaultDate, fetchLatestMrrGe, firm, formatGateEntryNumber, geNo, getFinancialYearLabel, getFirmCode, getGateEntryNo, initialData]);

  useEffect(() => {
    const isOther = String(mrrType || '').trim().toLowerCase() === 'other';
    if (!isOther) return;
    const poNo = String(data.po_no || '').trim();
    if (!poNo) return;
    const poKey = normalizePoNoKey(poNo);
    const match = otherPoRows.find((row) => normalizePoNoKey(row.po_no) === poKey);
    if (!match) return;
    setData((prev) => {
      if (String(prev.po_no || '').trim() !== poNo) return prev;
      const nextSupplier = String(match.supplier || '').trim();
      if (!nextSupplier) return prev;
      if (String(prev.supplier || '').trim() === nextSupplier) return prev;
      return { ...prev, supplier: nextSupplier };
    });
  }, [data.po_no, mrrType, otherPoRows]);

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

  const handleSubmit = async () => {
    if (!data.supplier || !data.invoice_no || !String(data.total_value || '').trim() || !String(data.truck_no || '').trim()) {
      alert('Supplier Name, Invoice No, Invoice Value and Truck No are required');
      return;
    }
    setIsSaving(true);
    setStatus('Uploading Gate Entry...');
    try {
      const { po_no: poNoForUiOnly, ...gateEntryData } = data || {};
      const payload = {
        ...gateEntryData,
        total_value: formatDecimal2(data.total_value || ''),
        ge_no: data.ge_no || getGateEntryNo(initialData) || geNo || '',
        mrr_no: data.ge_no || getGateEntryNo(initialData) || geNo || '',
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
      const finalGeNo = res.ge_no || data.ge_no || '';
      const finalEntry = { ...payload, ge_no: finalGeNo, mrr_no: finalGeNo };
      setData(finalEntry);
      setStatus('Gate Entry saved successfully.');
      onSave(finalGeNo, finalEntry);
    } catch (err) {
      setStatus(err.message || 'Error saving gate entry');
    } finally {
      setIsSaving(false);
    }
  };

  const showFullPageLoader = isSaving || isLoadingSuppliers || isLoadingOtherPo;
  const requiredLabel = (text) => (
    <span>
      {text}
      <span style={{ color: '#b91c1c', marginLeft: '3px', fontWeight: 700 }}>*</span>
    </span>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', overflowY: 'auto', position: 'relative' }}>
      <div style={{ background: '#fff', padding: '30px', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxWidth: '800px', width: '95%', margin: '40px auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" style={{ height: '50px' }} alt="Logo" />
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{firm?.name || ''}</div>
          </div>
          <h2 style={{ margin: 0, fontSize: '12px' }}>GATE ENTRY FORM</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '12px' }}>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('Supplier Name')}
            <div className="supplier-search-wrap">
              <input
                className="supplier-search"
                list="gate-entry-suppliers"
                value={data.supplier}
                onChange={(e) => setData({ ...data, supplier: e.target.value })}
                placeholder="Search or Select Supplier Name"
                style={{ fontSize: '12px' }}
              />
              <datalist id="gate-entry-suppliers">
                {visibleSuppliers.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </datalist>
            </div>
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('Date')}
            <input value={data.date || defaultDate} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed', fontSize: '12px' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('GE No')}
            <input value={data.ge_no || geNo || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed', fontSize: '12px' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>
            {requiredLabel('MRR No')}
            <input value={data.ge_no || geNo || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed', fontSize: '12px' }} />
          </div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>{requiredLabel('Invoice No')}<input value={data.invoice_no} onChange={(e) => setData({ ...data, invoice_no: e.target.value })} placeholder="Enter Invoice No" style={{ fontSize: '12px' }} /></div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>{requiredLabel('Invoice Value')}<input type="number" step="0.01" value={data.total_value} onBlur={(e) => setData({ ...data, total_value: formatDecimal2(e.target.value) })} onChange={(e) => setData({ ...data, total_value: e.target.value })} placeholder="Enter Total Value" style={{ fontSize: '12px' }} /></div>
          <div className="row full" style={{ borderTop: 'none', padding: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', alignItems: 'center' }}>{requiredLabel('Truck No')}<input value={data.truck_no} onChange={(e) => setData({ ...data, truck_no: e.target.value })} placeholder="Enter Truck No" style={{ fontSize: '12px' }} /></div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '12px', marginBottom: '10px' }}>Click Photos (Up to 8)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
            {pics.map((pic, i) => (
              <div key={i} style={{ border: '1px dashed #ccc', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#f9f9f9' }}>
                {pic ? (
                  <img src={pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Pic ${i + 1}`} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#888' }}>Pic {i + 1}</span>
                )}
                <span style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#333', background: 'rgba(255,255,255,0.75)' }}>
                  Click to {pic ? 'Rename/Replace' : 'Click'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(i, e.target.files[0])}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button className="btn" onClick={onBack} disabled={isSaving}>{'< Back'}</button>
          <button className="btn main" onClick={handleSubmit} disabled={isSaving}>
            Save
          </button>
        </div>

        {status && <p style={{ color: status.includes('Error') ? 'red' : 'green', fontSize: '12px', marginTop: '10px', fontWeight: 'bold' }}>{status}</p>}
      </div>
      <GateEntrySavedModal
        isOpen={Boolean(savedEntry)}
        firm={firm}
        entry={savedEntry}
        previewPics={pics}
        formatAmount={formatDecimal2}
        onDownload={downloadGateEntryPdfDirect}
        onClose={() => {
          const finalGeNo = savedEntry?.ge_no || data.ge_no;
          const finalEntry = savedEntry || data;
          setSavedEntry(null);
          onSave(finalGeNo, finalEntry);
        }}
      />
      {showFullPageLoader ? (
        <div className="loading-overlay" style={{ background: 'rgba(216, 209, 196, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="spinner" />
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
            {isSaving ? 'Saving Gate Entry...' : 'Loading supplier list...'}
          </p>
        </div>
      ) : null}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';

export default function PoDetailsPage({
  selectedFirm,
  initialType = 'reel',
  deps,
  onBack
}) {
  const {
    getSheetName,
    fetchSheetRange,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  const activeSheetName = getSheetName(selectedFirm?.po, poMode);

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

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((row, idx) => idx === index ? { ...row, [key]: value } : row));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...blankPoRow(), sno: String(prev.length + 1) }]);
  };

  const removeRow = (index) => {
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (!next.length) return [blankPoRow()];
      return next.map((row, idx) => ({ ...row, sno: row.sno || String(idx + 1) }));
    });
  };

  const handleSave = async () => {
    if (!selectedFirm || !activeSheetName) return;
    const cleanRows = rows
      .map((row, idx) => ({
        ...blankPoRow(),
        ...row,
        sno: String(row.sno || idx + 1).trim()
      }))
      .filter((row) => [row.po_no, row.supplier, row.po_details, row.erp_code, row.reel_details].some((value) => String(value || '').trim()));

    if (!cleanRows.length) {
      setStatus('Add at least one PO row before saving.');
      return;
    }

    setIsSaving(true);
    setStatus(`Saving ${activeSheetName}...`);
    try {
      await savePoRowsToSheets(cleanRows, {
        sheetName: activeSheetName,
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      setRows(cleanRows);
      setStatus(`${activeSheetName} saved successfully.`);
    } catch (err) {
      setStatus(err?.message || 'Could not save PO details.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    ['sno', 'S.No', '70px'],
    ['po_no', 'PO No', '130px'],
    ['date', 'Date', '120px'],
    ['supplier', 'Supplier', '220px'],
    ['po_details', 'PO Details', '260px'],
    ['erp_code', 'ERP Code', '130px'],
    ['size', 'Size', '100px'],
    ['gsm', 'GSM', '90px'],
    ['bf', 'BF', '90px'],
    ['reel_details', 'Reel Details', '220px'],
    ['unit', 'Unit', '90px'],
    ['rate', 'PO Rate', '110px'],
    ['quantity', 'Quantity', '110px'],
    ['status', 'Status', '120px'],
    ['quantity_received', 'Qty Received', '120px'],
    ['pending', 'Pending', '110px'],
    ['closed', 'Closed', '100px'],
    ['rapc', 'RAPC', '100px']
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '24px' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.03em' }}>PO DETAILS</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
              {selectedFirm?.name || ''} | {activeSheetName}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={onBack} disabled={isLoading || isSaving}>{'< Back'}</button>
            <button className="btn" style={{ background: poMode === 'reel' ? '#111' : '#fff', color: poMode === 'reel' ? '#fff' : '#111' }} onClick={() => setPoMode('reel')} disabled={isLoading || isSaving}>MRR PO</button>
            <button className="btn" style={{ background: poMode === 'other' ? '#111' : '#fff', color: poMode === 'other' ? '#fff' : '#111' }} onClick={() => setPoMode('other')} disabled={isLoading || isSaving}>OTHER PO</button>
            <button className="btn" onClick={addRow} disabled={isLoading || isSaving}>+ Add Row</button>
            <button className="btn main" onClick={handleSave} disabled={isLoading || isSaving}>{isSaving ? 'Saving...' : 'Save PO Details'}</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search PO rows"
            style={{ border: '1px solid #a8a8a8', padding: '8px 10px', minWidth: '260px', fontSize: '12px' }}
          />
          {status ? (
            <span className="status" style={{ minHeight: '36px' }}>{status}</span>
          ) : null}
        </div>

        <div className="wrap" style={{ overflowX: 'auto', border: '1px solid var(--line)' }}>
          <table className="table" style={{ minWidth: '2400px' }}>
            <thead>
              <tr>
                {columns.map(([key, label, width]) => (
                  <th key={key} style={{ width }}>{label}</th>
                ))}
                <th style={{ width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const realIndex = rows.indexOf(row);
                return (
                  <tr key={`${activeSheetName}-${realIndex}`}>
                    {columns.map(([key]) => (
                      <td key={key}>
                        <input
                          value={row[key] || ''}
                          onChange={(e) => updateRow(realIndex, key, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                    ))}
                    <td className="c">
                      <button
                        className="btn small"
                        style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }}
                        onClick={() => removeRow(realIndex)}
                        disabled={isLoading || isSaving}
                      >
                        Del
                      </button>
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

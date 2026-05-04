import React, { useEffect, useState } from 'react';

export default function GateEntriesPage({ selectedFirm, deps, onBack, onAdd, onEdit }) {
  const { fetchSheetRange, normalizeGeRow, getSheetName } = deps;

  const [rows, setRows] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const activeSheetName = 'GE ENTRY';

  useEffect(() => {
    async function loadRows() {
      if (!selectedFirm) return;
      setIsLoading(true);
      setStatus('Loading Gate Entries...');
      try {
        const payload = await fetchSheetRange(activeSheetName, selectedFirm);
        const allRows = Array.isArray(payload?.data)
          ? payload.data.map(r => normalizeGeRow(r))
          : (payload?.values || []).slice(1).map(v => normalizeGeRow(v));
        setRows(allRows.filter(r => r.ge_no));
        setStatus('');
      } catch (err) {
        setStatus(err?.message || 'Could not load gate entries.');
      } finally {
        setIsLoading(false);
      }
    }
    loadRows();
  }, [selectedFirm, fetchSheetRange, normalizeGeRow]);

  const filteredRows = rows.filter(r => 
    [r.ge_no, r.supplier, r.truck_no, r.invoice_no].some(v => 
      String(v || '').toLowerCase().includes(filterText.toLowerCase())
    )
  );

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '24px' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.03em', fontWeight: '900' }}>GATE ENTRIES</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{selectedFirm?.name || ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn" onClick={onBack} disabled={isLoading} style={{ padding: '10px 20px' }}>{'← Back'}</button>
            <button 
              className="btn main" 
              onClick={onAdd} 
              disabled={isLoading} 
              style={{ width: '42px', height: '42px', padding: 0, fontSize: '24px', fontWeight: '900', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="New Gate Entry"
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search by GE No, Supplier or Truck..."
              style={{ border: '1px solid #d1d5db', padding: '10px 12px 10px 36px', width: '100%', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }}>🔍</span>
          </div>
          {status ? (
            <span className="status" style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>{status}</span>
          ) : null}
        </div>

        <div className="wrap" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '4px' }}>
          <table className="table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th style={{ width: '180px' }}>GE No</th>
                <th style={{ width: '120px' }}>Date</th>
                <th style={{ width: '220px' }}>Supplier</th>
                <th style={{ width: '150px' }}>Truck No</th>
                <th style={{ width: '150px' }}>Invoice No</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚛</div>
                    <div style={{ fontWeight: '700' }}>No gate entries found.</div>
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((row, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: '700' }}>{row.ge_no}</td>
                  <td>{row.date}</td>
                  <td>{row.supplier}</td>
                  <td>{row.truck_no}</td>
                  <td>{row.invoice_no}</td>
                  <td className="c">
                    <button className="btn small" onClick={() => onEdit(row)} style={{ padding: '6px 12px' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

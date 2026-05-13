import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchReelStock } from '../sheetSync';

export default function ReelStockPage({ selectedFirm, currentUser, onBack }) {
  const [stockRows, setStockRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const loadRunRef = useRef(0);
  const [q, setQ] = useState('');

  const loadStock = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const payload = await fetchReelStock(selectedFirm);
      if (loadRunRef.current !== runId) return;
      setStockRows(Array.isArray(payload?.rows) ? payload.rows : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setLoadError(err?.message || 'Could not load stock data.');
      setStockRows([]);
    } finally {
      if (loadRunRef.current === runId) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm?.spreadsheetId || selectedFirm?.id]);

  const filtered = useMemo(() => {
    const query = String(q || '').trim().toLowerCase();
    if (!query) return stockRows;
    return stockRows.filter((r) => (
      [r.our_reel_no, r.erp, r.supplier, r.size, r.gsm, r.bf]
        .some((v) => String(v || '').toLowerCase().includes(query))
    ));
  }, [q, stockRows]);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Reel Stock</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Reel-wise Stock</div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
              Unique `Our Reel Number` from MRR, with issued/returned/available weights.
            </div>
            {loadError ? <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>{loadError}</div> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reel / ERP / supplier..." style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', minWidth: '240px' }} />
            <button type="button" className="btn main" disabled={isLoading} onClick={loadStock}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Our Reel No', 'ERP', 'Supplier', 'Size', 'GSM', 'BF', 'Weight', 'Rate', 'Issued Wt', 'Return Wt', 'Available Wt'].map((h) => (
                  <th key={h} style={{ position: 'sticky', top: 0, background: '#1d4ed8', color: '#fff', fontSize: '12px', fontWeight: 1000, padding: '10px 10px', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.18)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={11} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>-</td></tr>
              ) : null}
              {filtered.map((r) => (
                <tr key={r.our_reel_no}>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', fontWeight: 900, color: '#dc2626', whiteSpace: 'nowrap' }}>{r.our_reel_no}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{r.erp}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{r.supplier}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{r.size}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{r.gsm}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{r.bf}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{Number(r.weight || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{Number(r.rate || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{Number(r.issued_weight || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{Number(r.return_weight || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap', fontWeight: 900, color: Number(r.available_weight || 0) > 0 ? '#16a34a' : '#b91c1c' }}>{Number(r.available_weight || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

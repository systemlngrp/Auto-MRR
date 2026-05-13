import React, { useEffect, useRef, useState } from 'react';
import ReelLabelPrintArea from '../components/print/ReelLabelPrintArea';

export default function ReelLabelsPage({
  initialMrr,
  helperSheetName,
  selectedFirm,
  onBack,
  deps
}) {
  const { fetchSheetRange, fetchSheetRangeWithParams, helperSheetNameFallback } = deps;
  const [searchMrr, setSearchMrr] = useState(initialMrr || '');
  const [status, setStatus] = useState('');
  const [reels, setReels] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mrrOptions, setMrrOptions] = useState([]);
  const [isLoadingMrrOptions, setIsLoadingMrrOptions] = useState(false);
  const [printMode, setPrintMode] = useState('a4');
  const autoLoadedInitialMrrRef = useRef('');

  const withPrintPageOverride = (cssText, runPrint) => {
    const existing = document.getElementById('print-page-size-override');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'print-page-size-override';
    style.type = 'text/css';
    style.textContent = cssText || '';
    document.head.appendChild(style);

    const cleanup = () => {
      try { style.remove(); } catch (_) {}
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    runPrint?.();
    // Fallback cleanup in case afterprint does not fire (some browsers).
    setTimeout(cleanup, 5000);
  };

  useEffect(() => {
    if (initialMrr && !searchMrr) {
      setSearchMrr(initialMrr);
    }
  }, [initialMrr, searchMrr]);

  useEffect(() => {
    const loadAllUniqueMrr = async () => {
      if (!selectedFirm) return;
      setIsLoadingMrrOptions(true);
      try {
        const payload = await fetchSheetRange(
          helperSheetName || helperSheetNameFallback,
          selectedFirm
        );
        const rows = Array.isArray(payload?.values) ? payload.values : [];
        const unique = new Set();
        const headerRow = Array.isArray(rows[0]) ? rows[0].map((h) => String(h || '').trim().toLowerCase()) : [];
        const mrrIndex = headerRow.findIndex((h) => ['mrr no', 'mrr number', 'mrr_no', 'mrr_number'].includes(h));

        if (mrrIndex >= 0) {
          rows.slice(1).forEach((row) => {
            const value = String(Array.isArray(row) ? (row[mrrIndex] || '') : '').trim();
            if (value) unique.add(value);
          });
        } else {
          rows.forEach((row) => {
            const value = String(
              row?.mrr_number || row?.mrr_no || row?.['MRR No'] || row?.['MRR Number'] || ''
            ).trim();
            if (value) unique.add(value);
          });
        }
        const sorted = [...unique].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        setMrrOptions(sorted);
        if (!searchMrr && sorted.length) setSearchMrr(sorted[0]);
      } catch {
        setMrrOptions([]);
      } finally {
        setIsLoadingMrrOptions(false);
      }
    };
    loadAllUniqueMrr();
  }, [fetchSheetRange, helperSheetName, helperSheetNameFallback, searchMrr, selectedFirm]);

  const handleSearch = async (mrrOverride = '') => {
    const targetMrr = String(mrrOverride || searchMrr || '').trim();
    if (!targetMrr) return;
    if (!selectedFirm) {
      setStatus('Select a firm first.');
      return;
    }
    setIsSearching(true);
    setStatus('Searching...');
    try {
      const payload = await fetchSheetRangeWithParams({
        sheet: helperSheetName || helperSheetNameFallback,
        mrr_number: targetMrr,
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      if (rows.length) {
        setReels(rows);
        setSearchMrr(targetMrr);
        setStatus(`Found ${rows.length} reels for MRR ${targetMrr}.`);
      } else {
        setReels([]);
        setSearchMrr(targetMrr);
        setStatus(`No reels found for MRR ${targetMrr}.`);
      }
    } catch (err) {
      setReels([]);
      setStatus(err.message || 'Error fetching MRR.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const targetMrr = String(initialMrr || '').trim();
    if (!selectedFirm || !targetMrr || isSearching) return;
    if (autoLoadedInitialMrrRef.current === targetMrr) return;
    autoLoadedInitialMrrRef.current = targetMrr;
    handleSearch(targetMrr);
  }, [helperSheetName, initialMrr, isSearching, selectedFirm]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '22px', position: 'relative' }}>
      {isSearching && (
        <div className="loading-overlay" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(216, 209, 196, 0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div className="spinner" />
          <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>Searching MRR data...</p>
        </div>
      )}
      <div style={{ width: 'min(1250px, 100%)', margin: '0 auto' }}>
        <div className="sheet" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <div className="no-print" style={{ padding: '18px 18px 14px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 1000, color: '#1d4ed8', letterSpacing: '0.01em' }}>Print Reel Labels</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                  Scan or select an MRR number to generate QR-code reel labels.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {selectedFirm?.name ? (
                  <div style={{ padding: '7px 10px', borderRadius: '999px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '11px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {selectedFirm.name}
                  </div>
                ) : null}
                {onBack ? <button className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 900 }}>Back</button> : null}
              </div>
            </div>
          </div>

          <div className="no-print" style={{ padding: '14px 18px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>MRR Number</div>
                <select
                  value={searchMrr}
                  onChange={(e) => setSearchMrr(e.target.value)}
                  disabled={isLoadingMrrOptions}
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    background: '#fff',
                    fontSize: '13px',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                >
                  <option value="">{isLoadingMrrOptions ? 'Loading MRR...' : 'Select MRR Number...'}</option>
                  {mrrOptions.map((mrr) => <option key={mrr} value={mrr}>{mrr}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn main" onClick={() => handleSearch()} disabled={isSearching || !String(searchMrr || '').trim()} style={{ padding: '10px 16px', fontWeight: 1000 }}>
                  {isSearching ? <span className="spinner" /> : 'Search MRR'}
                </button>
              </div>
            </div>

            {status ? (
              <div style={{ marginTop: '12px' }}>
                <span
                  className="status"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 900,
                    border: `1px solid ${reels.length ? '#bbf7d0' : '#fecaca'}`,
                    background: reels.length ? '#ecfdf5' : '#fff1f2',
                    color: reels.length ? '#166534' : '#9f1239'
                  }}
                >
                  {status}
                </span>
              </div>
            ) : null}

            {reels.length > 0 ? (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e5e7eb', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', marginRight: '6px' }}>Print</div>
                <button className="btn" onClick={() => {
                  setPrintMode('a4');
                  const prev = document.title;
                  document.title = `MRR_${searchMrr.trim()}_A4`;
                  withPrintPageOverride('@page { size: A4; margin: 10mm; }', () => {
                    setTimeout(() => { window.print(); setTimeout(() => { document.title = prev; }, 1000); }, 100);
                  });
                }}>
                  A4 (1 / page)
                </button>
                <button className="btn" onClick={() => {
                  setPrintMode('label');
                  const prev = document.title;
                  document.title = `MRR_${searchMrr.trim()}`;
                  withPrintPageOverride('@page { size: 250px 255px; margin: 11px; }', () => {
                    setTimeout(() => {
                      window.print();
                      setTimeout(() => { document.title = prev; }, 1000);
                    }, 100);
                  });
                }}>
                  Small labels
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '18px', border: '1px dashed #cbd5e1', background: '#f8fafc', borderRadius: '14px', padding: '14px 14px' }}>
                <div style={{ fontWeight: 1000, color: '#0f172a' }}>No labels yet</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontWeight: 700, lineHeight: 1.5 }}>
                  Select an MRR number and click <span style={{ fontWeight: 900 }}>Search MRR</span>. After reels load, you can print A4 or small labels.
                </div>
              </div>
            )}
          </div>

          {reels.length > 0 ? (
            <div style={{ padding: '0 18px 18px' }}>
              <ReelLabelPrintArea reels={reels} selectedFirm={selectedFirm} printMode={printMode} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

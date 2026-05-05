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
    <div className="sheet" style={{ padding: 20, position: 'relative' }}>
      {isSearching && (
        <div className="loading-overlay" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(216, 209, 196, 0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div className="spinner" />
          <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>Searching MRR data...</p>
        </div>
      )}
      <div className="sectionHead no-print" style={{ marginTop: 0 }}>
        <h2>Print Reel Labels</h2>
        <p>Scan MRR to Generate QR code labels</p>
      </div>
      <div className="toolbar no-print" style={{ marginBottom: 16 }}>
        {onBack ? <button className="btn" onClick={onBack}>Back</button> : null}
        <select
          value={searchMrr}
          onChange={(e) => setSearchMrr(e.target.value)}
          disabled={isLoadingMrrOptions}
          style={{ width: '250px' }}
        >
          <option value="">{isLoadingMrrOptions ? 'Loading MRR...' : 'Select MRR Number...'}</option>
          {mrrOptions.map((mrr) => <option key={mrr} value={mrr}>{mrr}</option>)}
        </select>
        <button className="btn main" onClick={() => handleSearch()} disabled={isSearching}>
          {isSearching ? <span className="spinner" /> : 'Search MRR'}
        </button>
        {reels.length > 0 && (
          <>
            <button className="btn" onClick={() => {
              setPrintMode('a4');
              const prev = document.title;
              document.title = `MRR_${searchMrr.trim()}_A4`;
              setTimeout(() => { window.print(); setTimeout(() => { document.title = prev; }, 1000); }, 100);
            }}>
              Print A4 (1 Per Page)
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
              Print Small Labels
            </button>
          </>
        )}
        {status && <span className={`status ${reels.length ? 'success' : 'error'}`}>{status}</span>}
      </div>

      {reels.length > 0 && <ReelLabelPrintArea reels={reels} selectedFirm={selectedFirm} printMode={printMode} />}
    </div>
  );
}

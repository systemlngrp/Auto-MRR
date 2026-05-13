import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange } from '../sheetSync';
import { loadDpmJobs, updateDpmJobStage } from '../utils/dpmJobs';

export default function SheetPlantPage({ selectedFirm, currentUser, onBack }) {
  const [pendingRows, setPendingRows] = useState([]);
  const [issueRows, setIssueRows] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [dpmJobs, setDpmJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const loadRunRef = useRef(0);

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const pending = await fetchSheetRange(REEL_SCHEMAS.sheet_plant_pending.sheetName, selectedFirm);
      const issue = await fetchSheetRange(REEL_SCHEMAS.reel_issue.sheetName, selectedFirm);
      if (loadRunRef.current !== runId) return;
      setPendingRows(Array.isArray(pending?.data) ? pending.data : []);
      setIssueRows(Array.isArray(issue?.data) ? issue.data : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setLoadError(err?.message || 'Could not load data from Sheets.');
      setPendingRows([]);
      setIssueRows([]);
    } finally {
      if (loadRunRef.current === runId) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFromSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm?.spreadsheetId || selectedFirm?.id]);

  useEffect(() => {
    setDpmJobs(loadDpmJobs(selectedFirm));
  }, [selectedFirm?.spreadsheetId || selectedFirm?.id]);

  const issueAgg = useMemo(() => {
    const normalizeJob = (raw) => String(raw || '').trim();
    const byJob = new Map();
    (issueRows || []).forEach((row) => {
      const job = normalizeJob(row?.['JOB NO.'] || row?.['JOB No.'] || row?.JOB);
      if (!job) return;
      const reelKey = String(row?.['QR Scan'] || row?.['Our Reel Number'] || row?.['Supplier Reel No.'] || '').trim();
      if (!byJob.has(job)) byJob.set(job, { reels: new Set() });
      if (reelKey) byJob.get(job).reels.add(reelKey);
    });
    return byJob;
  }, [issueRows]);

  const displayRows = useMemo(() => {
    const normalizeJob = (raw) => String(raw || '').trim();
    const sheetRows = (pendingRows || [])
      .filter((r) => r && typeof r === 'object')
      .map((row) => {
        const job = normalizeJob(row?.['JOB No.'] || row?.['JOB NO.'] || row?.JOB);
        const reelsIssued = job ? (issueAgg.get(job)?.reels.size || 0) : 0;
        return {
          job,
          date: String(row?.DATE || row?.Date || '').trim(),
          erp: String(row?.ERP || '').trim(),
          item: String(row?.ITEM || '').trim(),
          planQty: String(row?.['PLAN QUANTITY'] ?? '').trim(),
          requiredReel: String(row?.['REQUIRED REEL (Kgs)'] ?? row?.['REQUIRED REEL (Kgs)'] ?? row?.['REQUIRED REEL'] ?? '').trim(),
          actualUsed: String(row?.['ACTUAL PAPER USED (Kgs)'] ?? row?.['ACTUAL PAPER USED (Kgs)'] ?? row?.['ACTUAL PAPER USED'] ?? '').trim(),
          totalReelIssued: reelsIssued ? String(reelsIssued) : '',
          _dpm_id: ''
        };
      });

    const dpmRows = (dpmJobs || [])
      .filter((j) => String(j?.stage || '') === 'sheet_plant_pending')
      .map((j) => ({
        job: String(j?.job_no || '').trim(),
        date: String(j?.date || '').trim(),
        erp: String(j?.erp || '').trim(),
        item: String(j?.item || '').trim(),
        planQty: String(j?.plan_quantity || '').trim(),
        requiredReel: String(j?.required_reel || '').trim(),
        actualUsed: '',
        totalReelIssued: '',
        _dpm_id: j.id
      }));

    return [...dpmRows, ...sheetRows];
  }, [pendingRows, issueAgg, dpmJobs]);

  const groupedRows = useMemo(() => {
    const normalizeDateLabel = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return 'Invalid date';
      return raw;
    };
    const byDate = new Map();
    displayRows.forEach((row) => {
      const key = normalizeDateLabel(row.date);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(row);
    });
    const entries = Array.from(byDate.entries());
    // Keep original order roughly: sort by date string, but "Invalid date" first like AppSheet.
    entries.sort((a, b) => {
      if (a[0] === 'Invalid date' && b[0] !== 'Invalid date') return -1;
      if (b[0] === 'Invalid date' && a[0] !== 'Invalid date') return 1;
      return a[0].localeCompare(b[0]);
    });
    const out = [];
    entries.forEach(([date, rows]) => {
      out.push({ type: 'group', date, count: rows.length });
      rows.forEach((r) => out.push({ type: 'row', row: r }));
    });
    return out;
  }, [displayRows]);

  const activeDetail = useMemo(() => {
    if (!activeJob) return null;
    const job = String(activeJob || '').trim();
    if (!job) return null;
    const row = displayRows.find((r) => String(r?.job || '').trim() === job) || null;
    const issued = issueAgg.get(job)?.reels.size || 0;
    return { job, row, issued };
  }, [activeJob, displayRows, issueAgg]);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Sheet Plant</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pending Jobs For Sheet Plant</div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Auto-loaded from Sheets. Total Reel Issued is calculated from Reel Issue sheet.
          </div>
          {loadError ? (
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>
              {loadError}
            </div>
          ) : null}
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn main" disabled={isLoading} onClick={loadFromSheets}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['JOB No.', 'ERP', 'ITEM', 'PLAN QUANTITY', 'REQUIRED REEL (Kgs)', 'ACTUAL PAPER USED (Kgs)', 'Total Reel Issued', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: '#1d4ed8',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 1000,
                        padding: '10px 10px',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        borderRight: '1px solid rgba(255,255,255,0.18)'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!groupedRows.length ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                      Upload Pending Sheet Plant CSV to show jobs.
                    </td>
                  </tr>
                ) : null}
                {groupedRows.map((entry, idx) => {
                  if (entry.type === 'group') {
                    return (
                      <tr key={`g-${idx}`}>
                        <td colSpan={8} style={{ padding: '10px 10px', background: '#f8fafc', borderTop: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 900, color: '#111' }}>
                          <span style={{ marginRight: 10 }}>{entry.date}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 6px', borderRadius: 999, background: '#e5e7eb', color: '#111', fontSize: '11px', fontWeight: 900 }}>
                            {entry.count}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  const r = entry.row;
                  return (
                    <tr
                      key={`r-${idx}`}
                      onClick={() => r.job && setActiveJob(r.job)}
                      style={{ cursor: r.job ? 'pointer' : 'default' }}
                      title={r.job ? `Open Job ${r.job}` : ''}
                    >
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#dc2626' }}>{r.job}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.erp}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.item}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.planQty}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.requiredReel}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.actualUsed}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.totalReelIssued}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', textAlign: 'right', color: '#6b7280', fontWeight: 900 }}>
                        {'>'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {activeDetail ? (
          <div
            className="no-print"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(6px)',
              zIndex: 10050,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
            onClick={() => setActiveJob(null)}
          >
            <div
              style={{
                width: 'min(520px, 96vw)',
                height: '100%',
                background: '#fff',
                borderLeft: '1px solid #e5e7eb',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
                padding: '16px',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 1000, letterSpacing: '0.08em', color: '#6b7280' }}>PENDING JOB</div>
                  <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 1100, color: '#dc2626' }}>
                    {activeDetail.job}
                  </div>
                </div>
                <button type="button" className="btn" onClick={() => setActiveJob(null)} style={{ padding: '8px 12px', fontWeight: 900 }}>
                  Close
                </button>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="btn main" onClick={() => {}} title="Update Sheet Plant (to be connected)">
                  Update Sheet Plant
                </button>
                {activeDetail.row?._dpm_id ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      updateDpmJobStage(selectedFirm, activeDetail.row._dpm_id, 'printing_pending');
                      setDpmJobs(loadDpmJobs(selectedFirm));
                      setActiveJob(null);
                    }}
                  >
                    Send to Printing
                  </button>
                ) : null}
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid #eef2f7', paddingTop: '14px' }}>
                {(() => {
                  const r = activeDetail.row || {};
                  const get = (k, fallbacks = []) => {
                    const primary = String(r?.[k] ?? '').trim();
                    if (primary) return primary;
                    for (const alt of fallbacks) {
                      const v = String(r?.[alt] ?? '').trim();
                      if (v) return v;
                    }
                    return '';
                  };
                  const fields = [
                    ['JOB No.', activeDetail.job],
                    ['ERP', get('ERP')],
                    ['ITEM', get('ITEM')],
                    ['PLAN QUANTITY', get('PLAN QUANTITY')],
                    ['REQUIRED REEL (Kgs)', get('REQUIRED REEL (Kgs)', ['REQUIRED REEL'])],
                    ['ACTUAL PAPER USED (Kgs)', get('ACTUAL PAPER USED (Kgs)', ['ACTUAL PAPER USED'])],
                    ['WARPAGE (Boxes)', get('WARPAGE (Boxes) ', ['WARPAGE (Boxes)', 'WARPAGE'])],
                    ['DELAMINATION (Boxes)', get('DELAMINATION (Boxes)', ['DELAMINATION'])],
                    ['MISALIGNMENT (Boxes)', get('MISALIGNMENT (Boxes)', ['MISALIGNMENT'])],
                    ['2PLY & PAPER (Kgs)', get('2PLY & PAPER (Kgs)', ['2PLY & PAPER (Kgs) ', '2PLY & PAPER Kg', '2PLY & PAPER'])],
                    ['Total Reel Issued', String(activeDetail.issued || 0)]
                  ];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {fields.map(([label, value]) => (
                        <div key={label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '10px', alignItems: 'baseline' }}>
                          <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>{label}</div>
                          <div style={{ fontSize: '13px', fontWeight: 900, color: '#111', wordBreak: 'break-word' }}>{value || '-'}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {/* CSV upload removed: auto-loads from Sheets */}
      </div>
    </div>
  );
}

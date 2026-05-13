import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange } from '../sheetSync';
import { loadDpmJobs } from '../utils/dpmJobs';

export default function ReelIssueReturnPage({ selectedFirm, currentUser, onBack }) {
  const [issueRows, setIssueRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);
  const [activePendingJob, setActivePendingJob] = useState(null);
  const [pendingSearch, setPendingSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const loadRunRef = useRef(0);
  const [dpmJobs, setDpmJobs] = useState([]);

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const pending = await fetchSheetRange(REEL_SCHEMAS.reel_issue_pending.sheetName, selectedFirm);
      const issue = await fetchSheetRange(REEL_SCHEMAS.reel_issue.sheetName, selectedFirm);
      const ret = await fetchSheetRange(REEL_SCHEMAS.reel_return.sheetName, selectedFirm);
      if (loadRunRef.current !== runId) return;
      setPendingRows(Array.isArray(pending?.data) ? pending.data : []);
      setIssueRows(Array.isArray(issue?.data) ? issue.data : []);
      setReturnRows(Array.isArray(ret?.data) ? ret.data : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setLoadError(err?.message || 'Could not load data from Sheets.');
      setPendingRows([]);
      setIssueRows([]);
      setReturnRows([]);
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

  const jobSummary = useMemo(() => {
    // ... rest of jobSummary useMemo remains the same
    const byJob = new Map();
    (issueRows || []).forEach((row) => {
      const job = String(row?.['JOB NO.'] || row?.['JOB No.'] || row?.['JOB'] || '').trim();
      if (!job) return;
      const reelKey = String(row?.['QR Scan'] || row?.['Supplier Reel No.'] || row?.['Our Reel Number'] || '').trim();
      if (!byJob.has(job)) {
        byJob.set(job, { job, rows: 0, reels: new Set(), weight: 0 });
      }
      const entry = byJob.get(job);
      entry.rows += 1;
      if (reelKey) entry.reels.add(reelKey);
      const w = Number(String(row?.Weight ?? '').trim());
      if (Number.isFinite(w)) entry.weight += w;
    });
    return Array.from(byJob.values())
      .map((j) => ({ ...j, reelsCount: j.reels.size }))
      .sort((a, b) => a.job.localeCompare(b.job, undefined, { sensitivity: 'base' }));
  }, [issueRows]);

  const jobAggregates = useMemo(() => {
    const normalizeJob = (raw) => String(raw || '').trim();
    const issueAgg = new Map();
    (issueRows || []).forEach((row) => {
      const job = normalizeJob(row?.['JOB NO.'] || row?.['JOB No.'] || row?.JOB);
      if (!job) return;
      const reelKey = String(row?.['QR Scan'] || row?.['Our Reel Number'] || row?.['Supplier Reel No.'] || '').trim();
      const w = Number(String(row?.Weight ?? '').trim());
      if (!issueAgg.has(job)) issueAgg.set(job, { reels: new Set(), weight: 0 });
      const entry = issueAgg.get(job);
      if (reelKey) entry.reels.add(reelKey);
      if (Number.isFinite(w)) entry.weight += w;
    });

    const returnAgg = new Map();
    (returnRows || []).forEach((row) => {
      const job = normalizeJob(row?.JOB || row?.['JOB NO.'] || row?.['JOB No.']);
      if (!job) return;
      const reelKey = String(row?.['QR Scan'] || row?.['Supplier Reel No.'] || '').trim();
      const w = Number(String(row?.Weight ?? '').trim());
      if (!returnAgg.has(job)) returnAgg.set(job, { reels: new Set(), weight: 0 });
      const entry = returnAgg.get(job);
      if (reelKey) entry.reels.add(reelKey);
      if (Number.isFinite(w)) entry.weight += w;
    });

    return { issueAgg, returnAgg };
  }, [issueRows, returnRows]);

  const activePendingJobDetail = useMemo(() => {
    if (!activePendingJob) return null;
    const job = String(activePendingJob || '').trim();
    if (!job) return null;

    const pendingRow = (pendingRows || []).find((r) => String(r?.['JOB No.'] || r?.['JOB NO.'] || r?.JOB || '').trim() === job) || null;
    const issue = jobAggregates.issueAgg.get(job);
    const ret = jobAggregates.returnAgg.get(job);
    const issuedReels = issue ? issue.reels.size : 0;
    const returnedReels = ret ? ret.reels.size : 0;
    const issuedWeight = issue ? issue.weight : 0;
    const returnedWeight = ret ? ret.weight : 0;
    const actualPaperUsed = Math.max(0, issuedWeight - returnedWeight);

    const issuedRowsForJob = (issueRows || []).filter((r) => String(r?.['JOB NO.'] || r?.['JOB No.'] || r?.JOB || '').trim() === job);
    const returnRowsForJob = (returnRows || []).filter((r) => String(r?.JOB || r?.['JOB NO.'] || r?.['JOB No.'] || '').trim() === job);

    return {
      job,
      pendingRow,
      issuedReels,
      returnedReels,
      issuedWeight,
      returnedWeight,
      actualPaperUsed,
      issuedRowsForJob,
      returnRowsForJob
    };
  }, [activePendingJob, pendingRows, issueRows, returnRows, jobAggregates.issueAgg, jobAggregates.returnAgg]);

  const pendingDisplayRows = useMemo(() => {
    const normalizeJob = (raw) => String(raw || '').trim();
    const headers = REEL_SCHEMAS.reel_issue_pending.headers;
    return (pendingRows || [])
      .filter((r) => r && typeof r === 'object')
      .map((row) => {
        const job = normalizeJob(row?.['JOB No.'] || row?.['JOB NO.'] || row?.JOB);
        const issue = job ? jobAggregates.issueAgg.get(job) : null;
        const ret = job ? jobAggregates.returnAgg.get(job) : null;
        const issuedReels = issue ? issue.reels.size : 0;
        const returnedReels = ret ? ret.reels.size : 0;
        const issuedWeight = issue ? issue.weight : 0;
        const returnedWeight = ret ? ret.weight : 0;
        const actualPaperUsed = Math.max(0, issuedWeight - returnedWeight);

        const next = {};
        headers.forEach((h) => {
          next[h] = row?.[h] ?? '';
        });
        // Override with computed totals per Job No.
        next['TOTAL REEL ISSUED'] = issuedReels ? String(issuedReels) : (next['TOTAL REEL ISSUED'] ?? '');
        next['TOTAL REEL RETURNED'] = returnedReels ? String(returnedReels) : (next['TOTAL REEL RETURNED'] ?? '');
        next['ACTUAL PAPER USED'] = (issuedWeight || returnedWeight) ? actualPaperUsed.toFixed(2) : (next['ACTUAL PAPER USED'] ?? '');
        return next;
      });
  }, [pendingRows, jobAggregates.issueAgg, jobAggregates.returnAgg]);

  const pendingListRows = useMemo(() => {
    const rows = pendingDisplayRows.map((row) => ({
      job: String(row?.['JOB No.'] || row?.['JOB NO.'] || row?.JOB || '').trim(),
      date: String(row?.DATE || '').trim(),
      erp: String(row?.ERP || '').trim(),
      item: String(row?.ITEM || '').trim(),
      planQty: String(row?.['PLAN QUANTITY'] || '').trim(),
      requiredReel: String(row?.['REQUIRED REEL'] || '').trim(),
      issued: String(row?.['TOTAL REEL ISSUED'] || '').trim(),
      returned: String(row?.['TOTAL REEL RETURNED'] || '').trim(),
      actualUsed: String(row?.['ACTUAL PAPER USED'] || '').trim(),
      corrugation: String(row?.['Pending Corrugation'] || row?.CORRUGATION || '').trim()
    }));

    const q = String(pendingSearch || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => 
      Object.values(r).some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [pendingDisplayRows, pendingSearch]);

  const dpmPendingRows = useMemo(() => {
    const rows = (dpmJobs || [])
      .filter((j) => String(j?.stage || '') === 'reel_issue_pending')
      .map((j) => ({
        job: String(j?.job_no || '').trim(),
        erp: String(j?.erp || '').trim(),
        item: String(j?.item || '').trim(),
        planQty: String(j?.plan_quantity || '').trim(),
        requiredReel: String(j?.required_reel || '').trim(),
        issued: '',
        returned: '',
        actualUsed: '',
        corrugation: '',
        _dpm_id: j.id
      }));
    return [...rows, ...pendingListRows];
  }, [dpmJobs, pendingListRows]);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Reel Issue</h2>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pending Jobs For Reel Issue</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
                Auto-loaded from Sheets. For each Job No, TOTAL REEL ISSUED / RETURNED and ACTUAL PAPER USED are auto-calculated.
              </div>
              {loadError ? (
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>
                  {loadError}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Search pending jobs..."
                style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', minWidth: '220px' }}
              />
              <button type="button" className="btn main" disabled={isLoading} onClick={loadFromSheets}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['JOB No.', 'ERP', 'ITEM', 'PLAN QUANTITY', 'REQUIRED REEL', 'TOTAL REEL ISSUED', 'TOTAL REEL RETURNED', 'ACTUAL PAPER USED', 'Pending Corrugation'].map((h) => (
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
                {!dpmPendingRows.length ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                      
                    </td>
                  </tr>
                ) : null}
                {dpmPendingRows.map((row, idx) => {
                  const job = String(row?.job || '').trim();
                  return (
                  <tr
                    key={idx}
                    onClick={() => job && setActivePendingJob(job)}
                    title={job ? `Open Job ${job}` : ''}
                    style={{ cursor: job ? 'pointer' : 'default' }}
                  >
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#dc2626' }}>{row.job}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.erp}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.item}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.planQty}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.requiredReel}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.issued}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.returned}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.actualUsed}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.corrugation}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {activePendingJobDetail ? (
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
            onClick={() => setActivePendingJob(null)}
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
                    {activePendingJobDetail.job}
                  </div>
                </div>
                <button type="button" className="btn" onClick={() => setActivePendingJob(null)} style={{ padding: '8px 12px', fontWeight: 900 }}>
                  Close
                </button>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="btn main" onClick={() => setActivePendingJob(null)} title="Go to Reel Issue">
                  + Reel Issue
                </button>
                <button type="button" className="btn" onClick={() => setActivePendingJob(null)} title="Go to Reel Return">
                  - Reel Return
                </button>
                <button type="button" className="btn" onClick={() => setActivePendingJob(null)} title="Reel Transfer">
                  Reel Transfer
                </button>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid #eef2f7', paddingTop: '14px' }}>
                {(() => {
                  const r = activePendingJobDetail.pendingRow || {};
                  const get = (k) => String(r?.[k] ?? '').trim();
                  const summary = [
                    ['JOB No.', activePendingJobDetail.job],
                    ['ERP', get('ERP')],
                    ['ITEM', get('ITEM')],
                    ['PLAN QUANTITY', get('PLAN QUANTITY')],
                    ['REQUIRED REEL', get('REQUIRED REEL')],
                    ['TOTAL REEL ISSUED', String(activePendingJobDetail.issuedReels || 0)],
                    ['TOTAL REEL RETURNED', String(activePendingJobDetail.returnedReels || 0)],
                    ['ACTUAL PAPER USED', activePendingJobDetail.actualPaperUsed.toFixed(2)],
                    ['CORRUGATION', get('CORRUGATION')]
                  ];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {summary.map(([label, value]) => (
                        <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px', alignItems: 'baseline' }}>
                          <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>{label}</div>
                          <div style={{ fontSize: '13px', fontWeight: 900, color: '#111', wordBreak: 'break-word' }}>{value || '-'}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid #eef2f7', paddingTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 1000, color: '#1d4ed8' }}>Issued / Returned Details</div>
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 1000, color: '#111' }}>Issued Rows</div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 800 }}>
                      {activePendingJobDetail.issuedRowsForJob.length} rows
                    </div>
                    <div style={{ marginTop: '10px', maxHeight: '220px', overflowY: 'auto', border: '1px solid #eef2f7', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {['QR Scan', 'Our Reel Number', 'Supplier Reel No.', 'Weight'].map((h) => (
                              <th key={h} style={{ background: '#f1f5f9', fontSize: '11px', fontWeight: 1000, padding: '8px 10px', textAlign: 'left', position: 'sticky', top: 0 }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {!activePendingJobDetail.issuedRowsForJob.length ? (
                            <tr><td colSpan={4} style={{ padding: '10px', color: '#6b7280', fontWeight: 800 }}>No issue rows loaded.</td></tr>
                          ) : null}
                          {activePendingJobDetail.issuedRowsForJob.slice(0, 200).map((r, i) => (
                            <tr key={i}>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['QR Scan'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['Our Reel Number'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['Supplier Reel No.'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.Weight ?? '')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 1000, color: '#111' }}>Returned Rows</div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 800 }}>
                      {activePendingJobDetail.returnRowsForJob.length} rows
                    </div>
                    <div style={{ marginTop: '10px', maxHeight: '220px', overflowY: 'auto', border: '1px solid #eef2f7', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {['QR Scan', 'Supplier Reel No.', 'ERP Code', 'Weight'].map((h) => (
                              <th key={h} style={{ background: '#f1f5f9', fontSize: '11px', fontWeight: 1000, padding: '8px 10px', textAlign: 'left', position: 'sticky', top: 0 }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {!activePendingJobDetail.returnRowsForJob.length ? (
                            <tr><td colSpan={4} style={{ padding: '10px', color: '#6b7280', fontWeight: 800 }}>No return rows loaded.</td></tr>
                          ) : null}
                          {activePendingJobDetail.returnRowsForJob.slice(0, 200).map((r, i) => (
                            <tr key={i}>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['QR Scan'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['Supplier Reel No.'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['ERP Code'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.Weight ?? '')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* All-in-one detailed viewers removed from this screen */}
      </div>
    </div>
  );
}

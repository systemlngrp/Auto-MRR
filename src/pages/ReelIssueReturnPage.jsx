import React, { useMemo, useState } from 'react';
import CsvTableViewer from '../components/layout/CsvTableViewer';
import { REEL_SCHEMAS } from '../utils/reelSchemas';

export default function ReelIssueReturnPage({ selectedFirm, currentUser, onBack }) {
  const [issueRows, setIssueRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);

  const jobSummary = useMemo(() => {
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
          <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pending Jobs For Reel Issue</div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Upload Pending + Issue + Return CSV. For each Job No, TOTAL REEL ISSUED / RETURNED and ACTUAL PAPER USED are auto-calculated.
          </div>
          <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {REEL_SCHEMAS.reel_issue_pending.headers.map((h) => (
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
                {!pendingDisplayRows.length ? (
                  <tr>
                    <td colSpan={REEL_SCHEMAS.reel_issue_pending.headers.length} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                      Upload Pending Reel Issue CSV to show pending jobs.
                    </td>
                  </tr>
                ) : null}
                {pendingDisplayRows.map((row, idx) => (
                  <tr key={idx}>
                    {REEL_SCHEMAS.reel_issue_pending.headers.map((h) => (
                      <td
                        key={`${idx}-${h}`}
                        style={{
                          fontSize: '12px',
                          padding: '8px 10px',
                          borderTop: '1px solid #e5e7eb',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {String(row?.[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CsvTableViewer
          title="ALL IN ONE - PENDING FOR REEL ISSUE"
          helpText="Upload the pending reel issue CSV export to view and search the full data."
          expectedHeaders={REEL_SCHEMAS.reel_issue_pending.headers}
          onDataLoaded={(data) => setPendingRows(Array.isArray(data?.rows) ? data.rows : [])}
        />

        <CsvTableViewer
          title="ALL IN ONE - REEL RETURN (For Totals)"
          helpText="Optional: upload Reel Return CSV here to auto-calculate TOTAL REEL RETURNED and ACTUAL PAPER USED in pending jobs."
          expectedHeaders={REEL_SCHEMAS.reel_return.headers}
          onDataLoaded={(data) => setReturnRows(Array.isArray(data?.rows) ? data.rows : [])}
        />

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Jobs (Reel Issue)</div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Upload the CSV below. This table shows reels issued per Job.
          </div>
          <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['JOB NO.', 'Rows', 'Reels', 'Total Weight'].map((h) => (
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
                {!jobSummary.length ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                      Upload Reel Issue CSV to see jobs.
                    </td>
                  </tr>
                ) : null}
                {jobSummary.map((j) => (
                  <tr key={j.job}>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900 }}>{j.job}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{j.rows}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{j.reelsCount}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{Number.isFinite(j.weight) ? j.weight.toFixed(2) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CsvTableViewer
          title="ALL IN ONE - REEL ISSUE"
          helpText="Upload the CSV export for Reel Issue to view and search the full data."
          expectedHeaders={REEL_SCHEMAS.reel_issue.headers}
          onDataLoaded={(data) => setIssueRows(Array.isArray(data?.rows) ? data.rows : [])}
        />
      </div>
    </div>
  );
}

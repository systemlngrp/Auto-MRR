import React, { useMemo, useState } from 'react';
import CsvTableViewer from '../components/layout/CsvTableViewer';
import { REEL_SCHEMAS } from '../utils/reelSchemas';

export default function ReelIssueDataPage({ selectedFirm, currentUser, onBack }) {
  const [issueRows, setIssueRows] = useState([]);

  const jobSummary = useMemo(() => {
    const byJob = new Map();
    (issueRows || []).forEach((row) => {
      const job = String(row?.['JOB NO.'] || row?.['JOB No.'] || row?.JOB || '').trim();
      if (!job) return;
      const reelKey = String(row?.['QR Scan'] || row?.['Our Reel Number'] || row?.['Supplier Reel No.'] || '').trim();
      const w = Number(String(row?.Weight ?? '').trim());
      if (!byJob.has(job)) byJob.set(job, { job, rows: 0, reels: new Set(), weight: 0 });
      const entry = byJob.get(job);
      entry.rows += 1;
      if (reelKey) entry.reels.add(reelKey);
      if (Number.isFinite(w)) entry.weight += w;
    });
    return Array.from(byJob.values())
      .map((j) => ({ ...j, reelsCount: j.reels.size }))
      .sort((a, b) => a.job.localeCompare(b.job, undefined, { sensitivity: 'base' }));
  }, [issueRows]);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Reels Issue Data</h2>
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
          <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Jobs Summary (Issue)</div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Upload Issue CSV below to see reels count by Job.
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
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{j.weight.toFixed(2)}</td>
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


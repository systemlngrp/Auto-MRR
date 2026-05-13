import React, { useMemo, useState } from 'react';
import CsvTableViewer from '../components/layout/CsvTableViewer';
import { REEL_SCHEMAS } from '../utils/reelSchemas';

export default function ReelReturnPage({ selectedFirm, currentUser, onBack }) {
  const [returnRows, setReturnRows] = useState([]);

  const jobSummary = useMemo(() => {
    const byJob = new Map();
    (returnRows || []).forEach((row) => {
      const job = String(row?.JOB || row?.['JOB NO.'] || row?.['JOB No.'] || '').trim();
      if (!job) return;
      const reelKey = String(row?.['QR Scan'] || row?.['Supplier Reel No.'] || '').trim();
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
  }, [returnRows]);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Reel Return</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Jobs (Reel Return)</div>
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
          Upload the CSV below. This table shows reels returned per Job.
        </div>
        <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['JOB', 'Rows', 'Reels', 'Total Weight'].map((h) => (
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
                    Upload Reel Return CSV to see jobs.
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
        title="ALL IN ONE - REEL RETURN"
        helpText="Upload the CSV export for Reel Return to view and search the full data."
        expectedHeaders={REEL_SCHEMAS.reel_return.headers}
        onDataLoaded={(data) => setReturnRows(Array.isArray(data?.rows) ? data.rows : [])}
      />
    </div>
  );
}

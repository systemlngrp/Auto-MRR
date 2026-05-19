import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchReelIssueEntries, fetchReelReturnEntries, fetchReelStock, saveReelReturnEntry } from '../sheetSync';

export default function ReelReturnPage({ selectedFirm, currentUser, onBack }) {
  const [returnRows, setReturnRows] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [issueRows, setIssueRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const loadRunRef = useRef(0);

  const [jobNo, setJobNo] = useState('');
  const [ourReelNo, setOurReelNo] = useState('');
  const [returnWeight, setReturnWeight] = useState('');

  const jobSummary = useMemo(() => {
    const byJob = new Map();
    (returnRows || []).forEach((row) => {
      const job = String(row?.job_no || '').trim();
      if (!job) return;
      const reelKey = String(row?.our_reel_no || '').trim();
      if (!byJob.has(job)) {
        byJob.set(job, { job, rows: 0, reels: new Set(), weight: 0 });
      }
      const entry = byJob.get(job);
      entry.rows += 1;
      if (reelKey) entry.reels.add(reelKey);
      const w = Number(row?.return_weight || 0);
      if (Number.isFinite(w)) entry.weight += w;
    });
    return Array.from(byJob.values())
      .map((j) => ({ ...j, reelsCount: j.reels.size }))
      .sort((a, b) => a.job.localeCompare(b.job, undefined, { sensitivity: 'base' }));
  }, [returnRows]);

  const reelOptions = useMemo(() => {
    return (stockRows || [])
      .map((r) => ({
        value: r.our_reel_no,
        label: `${r.our_reel_no} (Avail: ${Number(r.available_weight || 0).toFixed(2)} kg)`
      }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));
  }, [stockRows]);

  const loadAll = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setErrorText('');
    try {
      const [stock, returns, issues] = await Promise.all([
        fetchReelStock(selectedFirm),
        fetchReelReturnEntries(selectedFirm),
        fetchReelIssueEntries(selectedFirm)
      ]);
      if (loadRunRef.current !== runId) return;
      setStockRows(Array.isArray(stock?.rows) ? stock.rows : []);
      setReturnRows(Array.isArray(returns?.rows) ? returns.rows : []);
      setIssueRows(Array.isArray(issues?.rows) ? issues.rows : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setErrorText(err?.message || 'Could not load reel return data.');
      setStockRows([]);
      setReturnRows([]);
      setIssueRows([]);
    } finally {
      if (loadRunRef.current === runId) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm?.spreadsheetId || selectedFirm?.id]);

  const issuedJobs = useMemo(() => {
    const s = new Set();
    (issueRows || []).forEach((r) => {
      const job = String(r?.job_no || '').trim();
      if (job) s.add(job);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [issueRows]);

  const issuedJobsSet = useMemo(() => new Set(issuedJobs), [issuedJobs]);

  const onSave = async () => {
    if (!selectedFirm) return;
    const job = String(jobNo || '').trim();
    if (job && issuedJobs.length && !issuedJobsSet.has(job)) {
      setErrorText('This Job has no Reel Issue entry yet. Please issue a reel first, then return.');
      return;
    }
    setIsLoading(true);
    setErrorText('');
    try {
      await saveReelReturnEntry({
        ...selectedFirm,
        jobNo: job,
        ourReelNo,
        returnWeight: Number(returnWeight || 0),
        createdBy: currentUser?.login_id || currentUser?.name || '',
        userEmail: currentUser?.user_email || ''
      });
      setReturnWeight('');
      await loadAll();
    } catch (err) {
      setErrorText(err?.message || 'Could not save reel return.');
    } finally {
      setIsLoading(false);
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>New Reel Return</div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
              Save returns by Job No and Our Reel No. (Job No must have Reel Issue.)
            </div>
            {errorText ? <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>{errorText}</div> : null}
          </div>
          <button type="button" className="btn" onClick={loadAll} disabled={isLoading} style={{ padding: '10px 16px', fontWeight: 900 }}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 180px 140px', gap: '10px', marginTop: '12px', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#374151' }}>JOB NO.</div>
            <input
              list="issued-job-list"
              value={jobNo}
              onChange={(e) => setJobNo(e.target.value)}
              placeholder="Job No"
              style={{ width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '10px' }}
            />
            <datalist id="issued-job-list">
              {issuedJobs.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#374151' }}>OUR REEL NO.</div>
            <select value={ourReelNo} onChange={(e) => setOurReelNo(e.target.value)} style={{ width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '10px' }}>
              <option value="">Select Our Reel No</option>
              {reelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: '#374151' }}>RETURN WEIGHT (KG)</div>
            <input value={returnWeight} onChange={(e) => setReturnWeight(e.target.value)} placeholder="0" inputMode="decimal" style={{ width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '10px' }} />
          </div>
          <button type="button" className="btn main" onClick={onSave} disabled={isLoading || !jobNo.trim() || !ourReelNo || Number(returnWeight || 0) <= 0} style={{ padding: '10px 14px', fontWeight: 1000 }}>
            Save
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Jobs Summary (Return)</div>
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
          Shows reels returned per Job.
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
                    -
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

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Return Entries</div>
        <div style={{ marginTop: '10px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['ID', 'JOB NO.', 'OUR REEL NO.', 'RETURN WT', 'DATE'].map((h) => (
                  <th key={h} style={{ position: 'sticky', top: 0, background: '#1d4ed8', color: '#fff', fontSize: '12px', fontWeight: 1000, padding: '10px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!returnRows.length ? (
                <tr><td colSpan={5} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>-</td></tr>
              ) : null}
              {returnRows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.id}</td>
                  <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#dc2626' }}>{r.job_no}</td>
                  <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.our_reel_no}</td>
                  <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{Number(r.return_weight || 0).toFixed(3)}</td>
                  <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.return_date || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

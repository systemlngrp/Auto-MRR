import React, { useMemo, useState, useEffect, useRef } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange } from '../sheetSync';
import { loadDpmJobs, updateDpmJob } from '../utils/dpmJobs';

export default function ReelCloserPage({ selectedFirm, currentUser, onBack }) {
  const [issueRows, setIssueRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [dpmJobs, setDpmJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadRunRef = useRef(0);

  const [form, setForm] = useState({
    remarks: ''
  });

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    try {
      const pending = await fetchSheetRange(REEL_SCHEMAS.closer_pending.sheetName, selectedFirm);
      const issue = await fetchSheetRange(REEL_SCHEMAS.reel_issue.sheetName, selectedFirm);
      const ret = await fetchSheetRange(REEL_SCHEMAS.reel_return.sheetName, selectedFirm);
      if (loadRunRef.current !== runId) return;
      setPendingRows(Array.isArray(pending?.data) ? pending.data : []);
      setIssueRows(Array.isArray(issue?.data) ? issue.data : []);
      setReturnRows(Array.isArray(ret?.data) ? ret.data : []);
    } catch (err) {
      console.error('Closer load error:', err);
    } finally {
      if (loadRunRef.current === runId) setIsLoading(false);
    }
  };

  const refreshDpm = () => setDpmJobs(loadDpmJobs(selectedFirm));

  useEffect(() => {
    loadFromSheets();
    refreshDpm();
  }, [selectedFirm?.spreadsheetId || selectedFirm?.id]);

  const jobAggregates = useMemo(() => {
    const normalizeJob = (raw) => String(raw || '').trim();
    const issueAgg = new Map();
    (issueRows || []).forEach((row) => {
      const job = normalizeJob(row?.['JOB NO.'] || row?.['JOB No.'] || row?.JOB);
      if (!job) return;
      const w = Number(String(row?.Weight ?? '').trim());
      if (!issueAgg.has(job)) issueAgg.set(job, { weight: 0 });
      const entry = issueAgg.get(job);
      if (Number.isFinite(w)) entry.weight += w;
    });

    const returnAgg = new Map();
    (returnRows || []).forEach((row) => {
      const job = normalizeJob(row?.JOB || row?.['JOB NO.'] || row?.['JOB No.']);
      if (!job) return;
      const w = Number(String(row?.Weight ?? '').trim());
      if (!returnAgg.has(job)) returnAgg.set(job, { weight: 0 });
      const entry = returnAgg.get(job);
      if (Number.isFinite(w)) entry.weight += w;
    });

    return { issueAgg, returnAgg };
  }, [issueRows, returnRows]);

  const combinedPendingList = useMemo(() => {
    const fromDpm = (dpmJobs || [])
      .filter((j) => String(j?.stage || '') === 'closer_pending')
      .map((j) => {
        const job = String(j.job_no || '').trim();
        const issue = jobAggregates.issueAgg.get(job);
        const ret = jobAggregates.returnAgg.get(job);
        return {
          job,
          date: String(j.date || '').trim(),
          erp: String(j.erp || '').trim(),
          item: String(j.item || '').trim(),
          planQty: String(j.plan_quantity || '').trim(),
          requiredReel: String(j.required_reel || '').trim(),
          totalIssued: issue ? issue.weight.toFixed(2) : '0.00',
          totalReturned: ret ? ret.weight.toFixed(2) : '0.00',
          actualUsed: Math.max(0, (issue?.weight || 0) - (ret?.weight || 0)).toFixed(2),
          _dpm_id: j.id,
          _raw: j
        };
      });

    const seenJobs = new Set(fromDpm.map(r => r.job));
    const fromSheets = (pendingRows || [])
      .map(row => {
        const job = String(row?.['JOB No.'] || row?.['JOB NO.'] || row?.JOB || '').trim();
        if (!job || seenJobs.has(job)) return null;
        seenJobs.add(job);
        const issue = jobAggregates.issueAgg.get(job);
        const ret = jobAggregates.returnAgg.get(job);
        return {
          job,
          date: String(row?.DATE || '').trim(),
          erp: String(row?.ERP || '').trim(),
          item: String(row?.ITEM || '').trim(),
          planQty: String(row?.['PLAN QUANTITY'] || '').trim(),
          requiredReel: String(row?.['REQUIRED REEL'] || '').trim(),
          totalIssued: issue ? issue.weight.toFixed(2) : '0.00',
          totalReturned: ret ? ret.weight.toFixed(2) : '0.00',
          actualUsed: Math.max(0, (issue?.weight || 0) - (ret?.weight || 0)).toFixed(2),
          _raw: row
        };
      })
      .filter(Boolean);

    const all = [...fromDpm, ...fromSheets];
    const groups = new Map();
    all.forEach(r => {
      const d = r.date || 'Unknown Date';
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(r);
    });

    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => ({ date, rows }));
  }, [dpmJobs, pendingRows, jobAggregates]);

  const activeDetail = useMemo(() => {
    if (!activeJob) return null;
    const job = String(activeJob || '').trim();
    for (const g of combinedPendingList) {
      const found = g.rows.find(r => r.job === job);
      if (found) return found;
    }
    return null;
  }, [activeJob, combinedPendingList]);

  const onSaveAndClose = () => {
    if (!activeDetail?._dpm_id) {
      alert('Only DPM Jobs can be closed automatically.');
      return;
    }
    const remarks = String(form.remarks || '').trim();
    if (!remarks) {
      alert('Remarks are required to close the job.');
      return;
    }
    updateDpmJob(selectedFirm, activeDetail._dpm_id, {
      remarks,
      stage: 'closed'
    });
    setActiveJob(null);
    refreshDpm();
  };

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Closer</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pending Jobs For Closer</div>
        <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['JOB No.', 'ERP', 'ITEM', 'PLAN QTY', 'REQ REEL', 'ISSUED', 'RETURNED', 'ACTUAL'].map((h) => (
                  <th key={h} style={{ position: 'sticky', top: 0, background: '#1d4ed8', color: '#fff', fontSize: '12px', fontWeight: 1000, padding: '10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {combinedPendingList.map(group => (
                <React.Fragment key={group.date}>
                  <tr>
                    <td colSpan={8} style={{ background: '#f8fafc', padding: '8px 10px', fontSize: '11px', fontWeight: 1000, color: '#475569', borderTop: '1px solid #e5e7eb' }}>
                      📅 {group.date}
                    </td>
                  </tr>
                  {group.rows.map(r => (
                    <tr key={r.job} onClick={() => setActiveJob(r.job)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', fontWeight: 900, color: '#dc2626' }}>{r.job}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>{r.erp}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>{r.item}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>{r.planQty}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb' }}>{r.requiredReel}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', fontWeight: 700 }}>{r.totalIssued}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', fontWeight: 700 }}>{r.totalReturned}</td>
                      <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', fontWeight: 800, color: '#1d4ed8' }}>{r.actualUsed}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeDetail && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', zIndex: 10050, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setActiveJob(null)}>
          <div style={{ width: 'min(520px, 96vw)', height: '100%', background: '#fff', padding: '20px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>PENDING JOB (CLOSER)</div>
                <div style={{ fontSize: '22px', fontWeight: 1100, color: '#dc2626' }}>{activeDetail.job}</div>
              </div>
              <button className="btn" onClick={() => setActiveJob(null)}>Close</button>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 1000, color: '#1d4ed8', borderBottom: '1px solid #eef2f7', paddingBottom: '6px' }}>Final Review</div>
              
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280', marginBottom: '8px' }}>JOB SUMMARY</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div><div style={{ fontSize: '9px', fontWeight: 1000, color: '#94a3b8' }}>PLAN QTY</div><div style={{ fontSize: '14px', fontWeight: 900 }}>{activeDetail.planQty}</div></div>
                  <div><div style={{ fontSize: '9px', fontWeight: 1000, color: '#94a3b8' }}>ACTUAL USED</div><div style={{ fontSize: '14px', fontWeight: 900, color: '#1d4ed8' }}>{activeDetail.actualUsed}</div></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>REMARKS (Required)</div>
                <textarea
                  value={form.remarks}
                  onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Enter final remarks to close the job..."
                  style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', minHeight: '100px', width: '100%' }}
                />
              </div>

              <button type="button" className="btn main" style={{ marginTop: '10px' }} onClick={onSaveAndClose}>
                Confirm & Close Job ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

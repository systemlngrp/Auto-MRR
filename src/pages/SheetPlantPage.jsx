import React, { useMemo, useState, useEffect, useRef } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange } from '../sheetSync';
import { loadDpmJobs, loadDpmJobsLocal, updateDpmJob } from '../utils/dpmJobs';

export default function SheetPlantPage({ selectedFirm, currentUser, onBack }) {
  const [issueRows, setIssueRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [dpmJobs, setDpmJobs] = useState(() => loadDpmJobsLocal(selectedFirm));
  const [activeJob, setActiveJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadRunRef = useRef(0);

  const [form, setForm] = useState({
    part_prod: '',
    full_corr: '',
    prod_at_sheet: '',
    warpage_boxes: '',
    delamination_boxes: '',
    misalignment_boxes: '',
    two_ply_paper: ''
  });

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    try {
      const pendingPromise = fetchSheetRange(REEL_SCHEMAS.sheet_plant_pending.sheetName, selectedFirm);
      const issuePromise = fetchSheetRange(REEL_SCHEMAS.reel_issue.sheetName, selectedFirm);
      const retPromise = fetchSheetRange(REEL_SCHEMAS.reel_return.sheetName, selectedFirm);
      const dpmPromise = loadDpmJobs(selectedFirm);

      const [pending, issue, ret, dpm] = await Promise.all([
        pendingPromise,
        issuePromise,
        retPromise,
        dpmPromise
      ]);

      if (loadRunRef.current !== runId) return;
      setPendingRows(Array.isArray(pending?.data) ? pending.data : []);
      setIssueRows(Array.isArray(issue?.data) ? issue.data : []);
      setReturnRows(Array.isArray(ret?.data) ? ret.data : []);
      setDpmJobs(Array.isArray(dpm) ? dpm : []);
    } catch (err) {
      console.error('SheetPlant load error:', err);
    } finally {
      if (loadRunRef.current === runId) setIsLoading(false);
    }
  };

  const refreshDpm = async () => {
    try {
      const res = await loadDpmJobs(selectedFirm);
      setDpmJobs(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFromSheets();
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
      .filter((j) => {
        const s = String(j?.stage || '').toLowerCase();
        return s === 'sheet_plant_pending' || s === 'sheetplant';
      })
      .map((j) => {
        const job = String(j.job_no || '').trim();
        const issue = jobAggregates.issueAgg.get(job);
        const ret = jobAggregates.returnAgg.get(job);
        const issuedWeight = issue ? issue.weight : 0;
        const returnedWeight = ret ? ret.weight : 0;
        return {
          job,
          date: String(j.date || '').trim(),
          erp: String(j.erp || '').trim(),
          item: String(j.item || '').trim(),
          planQty: String(j.plan_quantity || '').trim(),
          requiredReel: String(j.required_reel || '').trim(),
          totalIssued: issuedWeight.toFixed(2),
          totalReturned: returnedWeight.toFixed(2),
          actualUsed: Math.max(0, issuedWeight - returnedWeight).toFixed(2),
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
        const issuedWeight = issue ? issue.weight : 0;
        const returnedWeight = ret ? ret.weight : 0;
        return {
          job,
          date: String(row?.DATE || '').trim(),
          erp: String(row?.ERP || '').trim(),
          item: String(row?.ITEM || '').trim(),
          planQty: String(row?.['PLAN QUANTITY'] || row?.['PLAN QUANTITY'] || '').trim(),
          requiredReel: String(row?.['REQUIRED REEL (Kgs)'] || row?.['REQUIRED REEL'] || '').trim(),
          totalIssued: issuedWeight.toFixed(2),
          totalReturned: returnedWeight.toFixed(2),
          actualUsed: Math.max(0, issuedWeight - returnedWeight).toFixed(2),
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

  useEffect(() => {
    if (activeDetail?._raw) {
      const r = activeDetail._raw;
      setForm({
        part_prod: String(r.part_production || r['PART PRODUCTION (Boxes)'] || ''),
        full_corr: String(r.full_corrugation || r['FULL CORRUGATION QNT. (Boxes)'] || ''),
        prod_at_sheet: String(r.prod_at_sheet || r['PROD. AT SHEET PLANT (Boxes)'] || ''),
        warpage_boxes: String(r.warpage_boxes || r['WARPAGE (Boxes) '] || r['WARPAGE (Boxes)'] || ''),
        delamination_boxes: String(r.delamination_boxes || r['DELAMINATION (Boxes)'] || ''),
        misalignment_boxes: String(r.misalignment_boxes || r['MISALIGNMENT (Boxes)'] || ''),
        two_ply_paper: String(r.two_ply_paper || r['2PLY & PAPER (Kgs)'] || '')
      });
    } else {
      setForm({ part_prod: '', full_corr: '', prod_at_sheet: '', warpage_boxes: '', delamination_boxes: '', misalignment_boxes: '', two_ply_paper: '' });
    }
  }, [activeDetail]);

  const onSaveAndMove = async () => {
    if (!activeDetail?._dpm_id) {
      alert('Only DPM Jobs can be moved through stages automatically.');
      return;
    }

    const numericPayload = {
      part_prod: Number.parseFloat(form.part_prod) || 0,
      full_corr: Number.parseFloat(form.full_corr) || 0,
      prod_at_sheet: Number.parseFloat(form.prod_at_sheet) || 0,
      warpage_boxes: Number.parseFloat(form.warpage_boxes) || 0,
      delamination_boxes: Number.parseFloat(form.delamination_boxes) || 0,
      misalignment_boxes: Number.parseFloat(form.misalignment_boxes) || 0,
      two_ply_paper: Number.parseFloat(form.two_ply_paper) || 0
    };

    await updateDpmJob(selectedFirm, activeDetail._dpm_id, {
      ...numericPayload,
      stage: 'printing_pending'
    });
    setActiveJob(null);
    await refreshDpm();
  };

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

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pending Jobs For Sheet Plant</div>
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
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(6px)',
            zIndex: 10050,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px'
          }}
          onClick={() => setActiveJob(null)}
        >
          <div
            style={{
              width: 'min(720px, 96vw)',
              maxHeight: 'min(760px, 92vh)',
              background: '#fff',
              padding: '20px',
              overflowY: 'auto',
              borderRadius: '16px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>PENDING JOB (SHEET PLANT)</div>
                <div style={{ fontSize: '22px', fontWeight: 1100, color: '#dc2626' }}>{activeDetail.job}</div>
              </div>
              <button className="btn" onClick={() => setActiveJob(null)}>Close</button>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 1000, color: '#1d4ed8', borderBottom: '1px solid #eef2f7', paddingBottom: '6px' }}>Corrugation Updates</div>
              
              {[
                { label: 'PART PRODUCTION (Boxes)', key: 'part_prod', step: '1', inputMode: 'numeric' },
                { label: 'FULL CORRUGATION QNT. (Boxes)', key: 'full_corr', step: '1', inputMode: 'numeric' },
                { label: 'PROD. AT SHEET PLANT (Boxes)', key: 'prod_at_sheet', step: '1', inputMode: 'numeric' },
                { label: 'WARPAGE (Boxes)', key: 'warpage_boxes', step: '1', inputMode: 'numeric' },
                { label: 'DELAMINATION (Boxes)', key: 'delamination_boxes', step: '1', inputMode: 'numeric' },
                { label: 'MISALIGNMENT (Boxes)', key: 'misalignment_boxes', step: '1', inputMode: 'numeric' },
                { label: '2PLY & PAPER (Kgs)', key: 'two_ply_paper', step: '0.001', inputMode: 'decimal' }
              ].map(({ label, key, step, inputMode }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>{label}</div>
                  <input
                    type="number"
                    step={step}
                    inputMode={inputMode}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              ))}

              <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280', marginBottom: '8px' }}>JOB TOTALS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div><div style={{ fontSize: '9px', fontWeight: 1000, color: '#94a3b8' }}>TOTAL ISSUED</div><div style={{ fontSize: '14px', fontWeight: 900 }}>{activeDetail.totalIssued}</div></div>
                  <div><div style={{ fontSize: '9px', fontWeight: 1000, color: '#94a3b8' }}>TOTAL RETURNED</div><div style={{ fontSize: '14px', fontWeight: 900 }}>{activeDetail.totalReturned}</div></div>
                  <div><div style={{ fontSize: '9px', fontWeight: 1000, color: '#94a3b8' }}>ACTUAL USED</div><div style={{ fontSize: '14px', fontWeight: 900, color: '#1d4ed8' }}>{activeDetail.actualUsed}</div></div>
                </div>
              </div>

              <button type="button" className="btn main" style={{ marginTop: '10px' }} onClick={onSaveAndMove}>
                Save & Move to Printing →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

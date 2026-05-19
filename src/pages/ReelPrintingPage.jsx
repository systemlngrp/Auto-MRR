import React, { useMemo, useState, useEffect, useRef } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange } from '../sheetSync';
import { loadDpmJobs, loadDpmJobsLocal, updateDpmJob } from '../utils/dpmJobs';

export default function ReelPrintingPage({ selectedFirm, currentUser, deps = {}, onBack }) {
  const { fetchDpmItems, saveDpmItems } = deps;
  const [issueRows, setIssueRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [dpmJobs, setDpmJobs] = useState(() => loadDpmJobsLocal(selectedFirm));
  const [activeJob, setActiveJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadRunRef = useRef(0);

  const [form, setForm] = useState({
    prod_at_printing: '',
    fg: '',
    slotting: '',
    delamination: '',
    misalignment: '',
    dry_sheets: '',
    warp: '',
    misprinting: '',
    job_setting: '',
    helper: ''
  });

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    try {
      const pendingPromise = fetchSheetRange(REEL_SCHEMAS.printing_pending.sheetName, selectedFirm);
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
      console.error('Printing load error:', err);
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
        return s === 'printing_pending' || s === 'printing';
      })
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

  useEffect(() => {
    if (activeDetail?._raw) {
      const r = activeDetail._raw;
      setForm({
        prod_at_printing: String(r.prod_at_printing || r['PROD. AT PRINTING'] || ''),
        fg: String(r.fg || r['FG'] || ''),
        slotting: String(r.slotting || r['SLOTTING'] || ''),
        delamination: String(r.delamination || r['DELAMINATION'] || ''),
        misalignment: String(r.misalignment || r['MISPRINTING'] || ''),
        dry_sheets: String(r.dry_sheets || r['DRY SHEETS'] || ''),
        warp: String(r.warp || r['WARP'] || ''),
        misprinting: String(r.misprinting || r['MISPRINTING'] || ''),
        job_setting: String(r.job_setting || r['JOB SETTING'] || ''),
        helper: String(r.helper || r['HELPER'] || '')
      });
    } else {
      setForm({ prod_at_printing: '', fg: '', slotting: '', delamination: '', misalignment: '', dry_sheets: '', warp: '', misprinting: '', job_setting: '', helper: '' });
    }
  }, [activeDetail]);

  const onSaveAndMove = async () => {
    if (!activeDetail?._dpm_id) {
      alert('Only DPM Jobs can be moved through stages automatically.');
      return;
    }

    const fgValue = parseFloat(form.fg) || 0;
    const erpCode = activeDetail.erp;

    try {
      const requiredFields = [
        ['PROD. AT PRINTING', 'prod_at_printing'],
        ['FG', 'fg'],
        ['SLOTTING', 'slotting'],
        ['DELAMINATION', 'delamination'],
        ['MISALIGNMENT', 'misalignment'],
        ['DRY SHEETS', 'dry_sheets'],
        ['WARP', 'warp'],
        ['MISPRINTING', 'misprinting'],
        ['JOB SETTING', 'job_setting'],
        ['HELPER', 'helper']
      ];
      const missing = requiredFields
        .filter(([, key]) => String(form?.[key] ?? '').trim() === '')
        .map(([label]) => label);
      if (missing.length) {
        alert('Please fill all mandatory fields:\n- ' + missing.join('\n- '));
        return;
      }

      // 1. Update DPM Job (this also updates the production column for the job)
      await updateDpmJob(selectedFirm, activeDetail._dpm_id, {
        prod_at_printing: Number.parseFloat(form.prod_at_printing) || 0,
        fg: fgValue,
        slotting: Number.parseFloat(form.slotting) || 0,
        delamination: Number.parseFloat(form.delamination) || 0,
        misalignment: Number.parseFloat(form.misalignment) || 0,
        dry_sheets: Number.parseFloat(form.dry_sheets) || 0,
        warp: Number.parseFloat(form.warp) || 0,
        misprinting: Number.parseFloat(form.misprinting) || 0,
        job_setting: Number.parseFloat(form.job_setting) || 0,
        helper: String(form.helper || ''),
        production: fgValue,
        stage: 'completed' // Moving to completed instead of closer as requested
      });

      // 2. Update DPM Item Master Production
      if (erpCode && typeof fetchDpmItems === 'function' && typeof saveDpmItems === 'function') {
        const items = await fetchDpmItems(selectedFirm);
        const item = items.find(it => (it.erp || it['ERP CODE']) === erpCode);
        if (item) {
          const currentProduction = parseFloat(item.production || item['Production'] || 0) || 0;
          const oldJobFg = parseFloat(activeDetail._raw.production || activeDetail._raw.fg || 0) || 0;
          const newProduction = currentProduction - oldJobFg + fgValue;
          
          await saveDpmItems(selectedFirm, {
            ...item,
            'Production': newProduction,
            'production': newProduction
          });
        }
      }

      setActiveJob(null);
      await refreshDpm();
      await loadFromSheets();
      alert('Job updated and Production synced to Item Master.');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const isPrintingFormComplete = useMemo(() => {
    const keys = ['prod_at_printing', 'fg', 'slotting', 'delamination', 'misalignment', 'dry_sheets', 'warp', 'misprinting', 'job_setting', 'helper'];
    return keys.every((k) => String(form?.[k] ?? '').trim() !== '');
  }, [form]);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Printing</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pending Jobs For Printing</div>
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
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>PENDING JOB (PRINTING)</div>
                <div style={{ fontSize: '22px', fontWeight: 1100, color: '#dc2626' }}>{activeDetail.job}</div>
              </div>
              <button className="btn" onClick={() => setActiveJob(null)}>Close</button>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 1000, color: '#1d4ed8', borderBottom: '1px solid #eef2f7', paddingBottom: '6px' }}>Printing Updates</div>
              
              {[
                { label: 'PROD. AT PRINTING', key: 'prod_at_printing', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'FG', key: 'fg', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'SLOTTING', key: 'slotting', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'DELAMINATION', key: 'delamination', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'MISALIGNMENT', key: 'misalignment', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'DRY SHEETS', key: 'dry_sheets', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'WARP', key: 'warp', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'MISPRINTING', key: 'misprinting', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'JOB SETTING', key: 'job_setting', type: 'number', step: '0.001', inputMode: 'decimal' },
                { label: 'HELPER', key: 'helper', type: 'text' }
              ].map(({ label, key, type, step, inputMode }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>{label}</div>
                  <input
                    type={type}
                    step={type === 'number' ? step : undefined}
                    inputMode={type === 'number' ? inputMode : undefined}
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

              <button type="button" className="btn main" style={{ marginTop: '10px' }} onClick={onSaveAndMove} disabled={!isPrintingFormComplete}>
                Save & Complete Job ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

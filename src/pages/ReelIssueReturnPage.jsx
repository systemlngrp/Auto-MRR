import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange, saveReelIssue, saveReelReturn } from '../sheetSync';
import { loadDpmJobs, updateDpmJobStage } from '../utils/dpmJobs';

export default function ReelIssueReturnPage({ selectedFirm, currentUser, onBack }) {
  const [issueRows, setIssueRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);
  const [helperRows, setHelperRows] = useState([]);
  const [activePendingJob, setActivePendingJob] = useState(null);
  const [pendingSearch, setPendingSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const loadRunRef = useRef(0);
  const [dpmJobs, setDpmJobs] = useState([]);

  // Manual entry states
  const [manualIssueRows, setManualIssueRows] = useState([{ our_reel: '', weight: '' }]);
  const [manualReturnRows, setManualReturnRows] = useState([{ our_reel: '', weight: '' }]);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const manualIssueActive = manualIssueRows.some((r) => String(r?.our_reel || '').trim() || String(r?.weight || '').trim());
  const manualReturnActive = manualReturnRows.some((r) => String(r?.our_reel || '').trim() || String(r?.weight || '').trim());
  const disableManualIssue = manualReturnActive;
  const disableManualReturn = manualIssueActive;

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const pending = await fetchSheetRange(REEL_SCHEMAS.reel_issue_pending.sheetName, selectedFirm);
      const issue = await fetchSheetRange(REEL_SCHEMAS.reel_issue.sheetName, selectedFirm);
      const ret = await fetchSheetRange(REEL_SCHEMAS.reel_return.sheetName, selectedFirm);
      const helper = await fetchSheetRange('HELPER SHEET', selectedFirm);
      if (loadRunRef.current !== runId) return;
      setPendingRows(Array.isArray(pending?.data) ? pending.data : []);
      setIssueRows(Array.isArray(issue?.data) ? issue.data : []);
      setReturnRows(Array.isArray(ret?.data) ? ret.data : []);
      setHelperRows(Array.isArray(helper?.data) ? helper.data : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setLoadError(err?.message || 'Could not load data from Sheets.');
      setPendingRows([]);
      setIssueRows([]);
      setReturnRows([]);
      setHelperRows([]);
    } finally {
      if (loadRunRef.current === runId) setIsLoading(false);
    }
  };

  const refreshDpm = () => setDpmJobs(loadDpmJobs(selectedFirm));

  useEffect(() => {
    loadFromSheets();
    refreshDpm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm?.spreadsheetId || selectedFirm?.id]);

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

  const combinedPendingList = useMemo(() => {
    const normalizeJob = (raw) => String(raw || '').trim();
    
    // 1. Process DPM Jobs in 'reel_issue_pending' stage
    const fromDpm = (dpmJobs || [])
      .filter((j) => String(j?.stage || '') === 'reel_issue_pending')
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
          issued: issue ? String(issue.reels.size) : '0',
          returned: ret ? String(ret.reels.size) : '0',
          issuedWeight: issue ? issue.weight : 0,
          returnedWeight: ret ? ret.weight : 0,
          actualUsed: (issue || ret) ? Math.max(0, (issue?.weight || 0) - (ret?.weight || 0)).toFixed(2) : '0',
          corrugation: '',
          _dpm_id: j.id,
          _raw: j
        };
      });

    // 2. Process CSV/Sheets Jobs, excluding those already in DPM
    const seenJobs = new Set(fromDpm.map(r => r.job));
    const fromSheets = (pendingRows || [])
      .filter(r => r && typeof r === 'object')
      .map(row => {
        const job = normalizeJob(row?.['JOB No.'] || row?.['JOB NO.'] || row?.JOB);
        if (!job || seenJobs.has(job)) return null;
        seenJobs.add(job);

        const issue = jobAggregates.issueAgg.get(job);
        const ret = jobAggregates.returnAgg.get(job);
        const issuedReels = issue ? issue.reels.size : 0;
        const returnedReels = ret ? ret.reels.size : 0;
        const issuedWeight = issue ? issue.weight : 0;
        const returnedWeight = ret ? ret.weight : 0;
        const actualPaperUsed = Math.max(0, issuedWeight - returnedWeight);

        return {
          job,
          date: String(row?.DATE || row?.Date || '').trim(),
          erp: String(row?.ERP || '').trim(),
          item: String(row?.ITEM || '').trim(),
          planQty: String(row?.['PLAN QUANTITY'] || '').trim(),
          requiredReel: String(row?.['REQUIRED REEL'] || '').trim(),
          issued: issuedReels ? String(issuedReels) : (row?.['TOTAL REEL ISSUED'] ?? '0'),
          returned: returnedReels ? String(returnedReels) : (row?.['TOTAL REEL RETURNED'] ?? '0'),
          issuedWeight,
          returnedWeight,
          actualUsed: (issuedWeight || returnedWeight) ? actualPaperUsed.toFixed(2) : (row?.['ACTUAL PAPER USED'] ?? '0'),
          corrugation: String(row?.['Pending Corrugation'] || row?.CORRUGATION || '').trim(),
          _raw: row
        };
      })
      .filter(Boolean);

    const all = [...fromDpm, ...fromSheets];
    const q = String(pendingSearch || '').trim().toLowerCase();
    const filtered = q ? all.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q))) : all;

    // Group by Date
    const groupsMap = new Map();
    filtered.forEach(r => {
      const d = r.date || 'Unknown Date';
      if (!groupsMap.has(d)) groupsMap.set(d, []);
      groupsMap.get(d).push(r);
    });

    return Array.from(groupsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => ({ date, rows }));
  }, [dpmJobs, pendingRows, jobAggregates, pendingSearch]);

  const activeDetail = useMemo(() => {
    if (!activePendingJob) return null;
    const job = String(activePendingJob || '').trim();
    if (!job) return null;

    let pendingRow = null;
    for (const g of combinedPendingList) {
      pendingRow = g.rows.find(r => r.job === job);
      if (pendingRow) break;
    }
    if (!pendingRow) return null;

    const issue = jobAggregates.issueAgg.get(job);
    const ret = jobAggregates.returnAgg.get(job);
    const issuedRowsForJob = (issueRows || []).filter((r) => String(r?.['JOB NO.'] || r?.['JOB No.'] || r?.JOB || '').trim() === job);
    const returnRowsForJob = (returnRows || []).filter((r) => String(r?.JOB || r?.['JOB NO.'] || r?.['JOB No.'] || '').trim() === job);

    return {
      job,
      pendingRow,
      issuedReels: issue ? issue.reels.size : 0,
      returnedReels: ret ? ret.reels.size : 0,
      issuedWeight: issue ? issue.weight : 0,
      returnedWeight: ret ? ret.weight : 0,
      actualPaperUsed: Number(pendingRow.actualUsed),
      issuedRowsForJob,
      returnRowsForJob
    };
  }, [activePendingJob, combinedPendingList, issueRows, returnRows, jobAggregates]);

  const availableReels = useMemo(() => {
    const stockMap = new Map();

    // 1. Initial weight from MRR (Helper Sheet)
    (helperRows || []).forEach(r => {
      const reel = String(r?.our_reel_number || r?.['Our Reel Number'] || '').trim();
      if (!reel) return;
      const w = Number(String(r?.weight || '0').trim()) || 0;
      if (!stockMap.has(reel)) stockMap.set(reel, { weight: w });
    });

    // 2. Subtract all issued weights
    (issueRows || []).forEach(r => {
      const reel = String(r?.['Our Reel Number'] || r?.['QR Scan'] || '').trim();
      if (!reel) return;
      const w = Number(String(r?.Weight || '0').trim()) || 0;
      if (stockMap.has(reel)) {
        stockMap.get(reel).weight -= w;
      }
    });

    // 3. Add all returned weights
    (returnRows || []).forEach(r => {
      const reel = String(r?.['Our Reel Number'] || r?.['QR Scan'] || '').trim();
      if (!reel) return;
      const w = Number(String(r?.Weight || '0').trim()) || 0;
      if (stockMap.has(reel)) {
        stockMap.get(reel).weight += w;
      }
    });

    // Filter reels with available weight > 0
    return Array.from(stockMap.entries())
      .filter(([_, data]) => data.weight > 0)
      .map(([reel]) => reel)
      .sort();
  }, [helperRows, issueRows, returnRows]);

  const onManualIssue = async () => {
    if (!activeDetail || isSavingManual) return;
    const entries = manualIssueRows
      .map((r) => ({ ourReel: String(r?.our_reel || '').trim(), weight: Number(r?.weight) }))
      .filter((r) => r.ourReel !== '' || (Number.isFinite(r.weight) && r.weight > 0));
    if (!entries.length) {
      alert('Enter at least 1 Our Reel No and Weight.');
      return;
    }
    const invalid = entries.find((e) => !e.ourReel || !Number.isFinite(e.weight) || e.weight <= 0);
    if (invalid) {
      alert('Each Issue row needs Our Reel No and valid Weight.');
      return;
    }
    setIsSavingManual(true);
    try {
      for (const entry of entries) {
        // eslint-disable-next-line no-await-in-loop
        await saveReelIssue({
          'JOB NO.': activeDetail.job,
          'Date': new Date().toLocaleDateString('en-GB'),
          'Our Reel Number': entry.ourReel,
          'Weight': String(entry.weight)
        }, selectedFirm);
      }
      setManualIssueRows([{ our_reel: '', weight: '' }]);
      await loadFromSheets();
    } catch (err) {
      alert(err?.message || 'Failed to save manual issue.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const onManualReturn = async () => {
    if (!activeDetail || isSavingManual) return;
    const entries = manualReturnRows
      .map((r) => ({ ourReel: String(r?.our_reel || '').trim(), weight: Number(r?.weight) }))
      .filter((r) => r.ourReel !== '' || (Number.isFinite(r.weight) && r.weight > 0));
    if (!entries.length) {
      alert('Select at least 1 Issued Reel and Return Weight.');
      return;
    }
    const invalid = entries.find((e) => !e.ourReel || !Number.isFinite(e.weight) || e.weight <= 0);
    if (invalid) {
      alert('Each Return row needs Issued Reel and valid Weight.');
      return;
    }
    setIsSavingManual(true);
    try {
      for (const entry of entries) {
        // eslint-disable-next-line no-await-in-loop
        await saveReelReturn({
          'JOB': activeDetail.job,
          'Date': new Date().toLocaleDateString('en-GB'),
          'Our Reel Number': entry.ourReel,
          'Weight': String(entry.weight)
        }, selectedFirm);
      }
      setManualReturnRows([{ our_reel: '', weight: '' }]);
      await loadFromSheets();
    } catch (err) {
      alert(err?.message || 'Failed to save manual return.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const onMoveToSheetPlant = () => {
    if (!activeDetail?.pendingRow?._dpm_id) {
      alert('Only DPM Jobs can be moved through stages automatically.');
      return;
    }
    updateDpmJobStage(selectedFirm, activeDetail.pendingRow._dpm_id, 'sheet_plant_pending');
    setActivePendingJob(null);
    refreshDpm();
  };

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
                Grouping by Date. Live totals from Reel Issue/Return data.
              </div>
              {loadError ? <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>{loadError}</div> : null}
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
                  {['JOB No.', 'ERP', 'ITEM', 'PLAN QUANTITY', 'REQUIRED REEL', 'TOTAL ISSUED', 'TOTAL RETURNED', 'ACTUAL USED', 'Pending Corrugation'].map((h) => (
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
                {!combinedPendingList.length ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                      {isLoading ? 'Loading data...' : 'No pending jobs found.'}
                    </td>
                  </tr>
                ) : null}
                {combinedPendingList.map((group) => (
                  <React.Fragment key={group.date}>
                    <tr>
                      <td colSpan={9} style={{ background: '#f8fafc', padding: '8px 10px', fontSize: '11px', fontWeight: 1000, color: '#475569', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                        📅 {group.date}
                      </td>
                    </tr>
                    {group.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => row.job && setActivePendingJob(row.job)}
                        style={{ cursor: row.job ? 'pointer' : 'default' }}
                        title={row.job ? `Open Job ${row.job}` : ''}
                      >
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#dc2626' }}>{row.job}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.erp}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.item}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.planQty}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.requiredReel}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 700 }}>{row.issued}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 700 }}>{row.returned}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 800, color: '#1d4ed8' }}>{row.actualUsed}</td>
                        <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.corrugation}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
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
                  <div style={{ fontSize: '11px', fontWeight: 1000, letterSpacing: '0.08em', color: '#6b7280' }}>PENDING JOB (REEL ISSUE)</div>
                  <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 1100, color: '#dc2626' }}>
                    {activeDetail.job}
                  </div>
                </div>
                <button type="button" className="btn" onClick={() => setActivePendingJob(null)} style={{ padding: '8px 12px', fontWeight: 900 }}>
                  Close
                </button>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {activeDetail.pendingRow?._dpm_id && (
                  <button type="button" className="btn main" onClick={onMoveToSheetPlant} title="Save and Move to Sheet Plant">
                    Save & Move to Sheet Plant →
                  </button>
                )}
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid #eef2f7', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 1000, color: '#1d4ed8', marginBottom: '12px' }}>Manual Reel Operations</div>
                
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #eef2f7', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280', marginBottom: '8px' }}>+ MANUAL REEL ISSUE</div>
                  {manualIssueRows.map((r, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '8px', marginBottom: rowIdx === manualIssueRows.length - 1 ? 0 : 8, alignItems: 'center' }}>
                      <div>
                        <input
                          list="available-reels"
                          disabled={disableManualIssue || isSavingManual}
                          value={r.our_reel}
                          onChange={(e) => {
                            const next = e.target.value;
                            setManualIssueRows((prev) => {
                              const copy = [...prev];
                              copy[rowIdx] = { ...(copy[rowIdx] || { our_reel: '', weight: '' }), our_reel: next };
                              return copy;
                            });
                            if (manualReturnActive) setManualReturnRows([{ our_reel: '', weight: '' }]);
                          }}
                          placeholder="Type / select Our Reel No"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '12px',
                            background: (disableManualIssue || isSavingManual) ? '#f3f4f6' : '#fff',
                            color: (disableManualIssue || isSavingManual) ? '#6b7280' : '#111'
                          }}
                        />
                        {rowIdx === 0 ? (
                          <datalist id="available-reels">
                            {availableReels.map((reel, idx) => (
                              <option key={idx} value={reel} />
                            ))}
                          </datalist>
                        ) : null}
                      </div>
                      <input
                        inputMode="decimal"
                        disabled={disableManualIssue || isSavingManual}
                        placeholder="Issue Weight"
                        value={r.weight}
                        onChange={(e) => {
                          const next = e.target.value;
                          setManualIssueRows((prev) => {
                            const copy = [...prev];
                            copy[rowIdx] = { ...(copy[rowIdx] || { our_reel: '', weight: '' }), weight: next };
                            return copy;
                          });
                          if (manualReturnActive) setManualReturnRows([{ our_reel: '', weight: '' }]);
                        }}
                        style={{
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '12px',
                          background: (disableManualIssue || isSavingManual) ? '#f3f4f6' : '#fff',
                          color: (disableManualIssue || isSavingManual) ? '#6b7280' : '#111'
                        }}
                      />
                      <button
                        type="button"
                        className="btn small"
                        title="Remove row"
                        disabled={disableManualIssue || isSavingManual || manualIssueRows.length <= 1}
                        onClick={() => setManualIssueRows((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== rowIdx))}
                        style={{ padding: '6px 0', background: '#111827', borderColor: '#111827', color: '#fff', opacity: (disableManualIssue || isSavingManual || manualIssueRows.length <= 1) ? 0.4 : 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn small"
                      title="Add row"
                      disabled={disableManualIssue || isSavingManual}
                      onClick={() => setManualIssueRows((prev) => [...prev, { our_reel: '', weight: '' }])}
                      style={{ padding: '8px 12px', fontWeight: 1000 }}
                    >
                      +
                    </button>
                  </div>
                  {disableManualIssue ? (
                    <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 900, color: '#6b7280' }}>
                      Clear Return fields to Issue a reel.
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="btn main small"
                    style={{ width: '100%', marginTop: '8px', opacity: (disableManualIssue || isSavingManual) ? 0.6 : 1 }}
                    disabled={isSavingManual || disableManualIssue}
                    onClick={onManualIssue}
                  >
                    {isSavingManual ? 'Saving...' : 'Issue Reel'}
                  </button>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #eef2f7' }}>
                  <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280', marginBottom: '8px' }}>- MANUAL REEL RETURN</div>
                  {manualReturnRows.map((r, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '8px', marginBottom: rowIdx === manualReturnRows.length - 1 ? 0 : 8, alignItems: 'center' }}>
                      <div>
                        <input
                          list="issued-reels"
                          disabled={disableManualReturn || isSavingManual}
                          value={r.our_reel}
                          onChange={(e) => {
                            const next = e.target.value;
                            setManualReturnRows((prev) => {
                              const copy = [...prev];
                              copy[rowIdx] = { ...(copy[rowIdx] || { our_reel: '', weight: '' }), our_reel: next };
                              return copy;
                            });
                            if (manualIssueActive) setManualIssueRows([{ our_reel: '', weight: '' }]);
                          }}
                          placeholder="Type / select Issued Reel"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '12px',
                            background: (disableManualReturn || isSavingManual) ? '#f3f4f6' : '#fff',
                            color: (disableManualReturn || isSavingManual) ? '#6b7280' : '#111'
                          }}
                        />
                        {rowIdx === 0 ? (
                          <datalist id="issued-reels">
                            {activeDetail.issuedRowsForJob.map((row, idx) => {
                              const reel = String(row?.['Our Reel Number'] || row?.['QR Scan'] || row?.['Supplier Reel No.'] || '').trim();
                              return reel ? <option key={idx} value={reel} /> : null;
                            })}
                          </datalist>
                        ) : null}
                      </div>
                      <input
                        inputMode="decimal"
                        disabled={disableManualReturn || isSavingManual}
                        placeholder="Return Weight"
                        value={r.weight}
                        onChange={(e) => {
                          const next = e.target.value;
                          setManualReturnRows((prev) => {
                            const copy = [...prev];
                            copy[rowIdx] = { ...(copy[rowIdx] || { our_reel: '', weight: '' }), weight: next };
                            return copy;
                          });
                          if (manualIssueActive) setManualIssueRows([{ our_reel: '', weight: '' }]);
                        }}
                        style={{
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '12px',
                          background: (disableManualReturn || isSavingManual) ? '#f3f4f6' : '#fff',
                          color: (disableManualReturn || isSavingManual) ? '#6b7280' : '#111'
                        }}
                      />
                      <button
                        type="button"
                        className="btn small"
                        title="Remove row"
                        disabled={disableManualReturn || isSavingManual || manualReturnRows.length <= 1}
                        onClick={() => setManualReturnRows((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== rowIdx))}
                        style={{ padding: '6px 0', background: '#111827', borderColor: '#111827', color: '#fff', opacity: (disableManualReturn || isSavingManual || manualReturnRows.length <= 1) ? 0.4 : 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn small"
                      title="Add row"
                      disabled={disableManualReturn || isSavingManual}
                      onClick={() => setManualReturnRows((prev) => [...prev, { our_reel: '', weight: '' }])}
                      style={{ padding: '8px 12px', fontWeight: 1000 }}
                    >
                      +
                    </button>
                  </div>
                  {disableManualReturn ? (
                    <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 900, color: '#6b7280' }}>
                      Clear Issue fields to Return a reel.
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="btn main small"
                    style={{ width: '100%', marginTop: '8px', background: '#dc2626', opacity: (disableManualReturn || isSavingManual) ? 0.6 : 1 }}
                    disabled={isSavingManual || disableManualReturn}
                    onClick={onManualReturn}
                  >
                    {isSavingManual ? 'Saving...' : 'Return Reel'}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid #eef2f7', paddingTop: '14px' }}>
                {(() => {
                  const r = activeDetail.pendingRow || {};
                  const summary = [
                    ['JOB No.', activeDetail.job],
                    ['DATE', r.date],
                    ['ERP', r.erp],
                    ['ITEM', r.item],
                    ['PLAN QUANTITY', r.planQty],
                    ['REQUIRED REEL', r.requiredReel],
                    ['No of Reels Issued', String(activeDetail.issuedReels || 0)],
                    ['Total Issued Weight/Qty', activeDetail.issuedWeight.toFixed(2)],
                    ['No of Reels Returned', String(activeDetail.returnedReels || 0)],
                    ['Total Returned Weight/Qty', activeDetail.returnedWeight.toFixed(2)],
                    ['Actual (Issued - Returned)', activeDetail.actualPaperUsed.toFixed(2)]
                  ];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      {summary.map(([label, value]) => (
                        <div key={label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '10px', alignItems: 'baseline' }}>
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
                    <div style={{ fontSize: '12px', fontWeight: 1000, color: '#111' }}>Issued Rows ({activeDetail.issuedRowsForJob.length})</div>
                    <div style={{ marginTop: '10px', maxHeight: '220px', overflowY: 'auto', border: '1px solid #eef2f7', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {['QR Scan', 'Supplier Reel No.', 'Weight'].map((h) => (
                              <th key={h} style={{ background: '#f1f5f9', fontSize: '11px', fontWeight: 1000, padding: '8px 10px', textAlign: 'left', position: 'sticky', top: 0 }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {!activeDetail.issuedRowsForJob.length ? (
                            <tr><td colSpan={3} style={{ padding: '10px', color: '#6b7280', fontWeight: 800 }}>No issue rows found.</td></tr>
                          ) : null}
                          {activeDetail.issuedRowsForJob.map((r, i) => (
                            <tr key={i}>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['QR Scan'] ?? '')}</td>
                              <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7' }}>{String(r?.['Supplier Reel No.'] ?? '')}</td>
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
      </div>
    </div>
  );
}

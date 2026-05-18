import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange, saveReelIssue, saveReelReturn } from '../sheetSync';
import { loadDpmJobs, loadDpmJobsLocal, updateDpmJobStage } from '../utils/dpmJobs';
import QrScanModal from '../components/QrScanModal';
import { extractReelNumberFromQr } from '../utils/qrReel';

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
  const [dpmJobs, setDpmJobs] = useState(() => loadDpmJobsLocal(selectedFirm));

  // Manual entry states
  const [manualIssueRows, setManualIssueRows] = useState([{ our_reel: '', weight: '' }]);
  const [manualReturnRows, setManualReturnRows] = useState([{ our_reel: '', weight: '' }]);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [qrScanRowIdx, setQrScanRowIdx] = useState(null);
  const [qrPasteText, setQrPasteText] = useState('');
  const manualIssueWeightRefs = useRef([]);
  const manualIssueActive = manualIssueRows.some((r) => String(r?.our_reel || '').trim() || String(r?.weight || '').trim());
  const manualReturnActive = manualReturnRows.some((r) => String(r?.our_reel || '').trim() || String(r?.weight || '').trim());
  const disableManualIssue = manualReturnActive;
  const disableManualReturn = manualIssueActive;

  const applyQrToManualIssue = (raw, preferredRowIdx = null) => {
    const reel = extractReelNumberFromQr(raw);
    if (!reel) {
      alert('Could not find Reel Number in the scanned QR.');
      return;
    }

    let focusRow = preferredRowIdx;
    setManualIssueRows((prev) => {
      const rows = Array.isArray(prev) ? [...prev] : [{ our_reel: '', weight: '' }];
      const pickRow = () => {
        if (Number.isInteger(preferredRowIdx) && preferredRowIdx >= 0 && preferredRowIdx < rows.length) return preferredRowIdx;
        const emptyIdx = rows.findIndex((r) => !String(r?.our_reel || '').trim());
        if (emptyIdx !== -1) return emptyIdx;
        rows.push({ our_reel: '', weight: '' });
        return rows.length - 1;
      };
      const idx = pickRow();
      focusRow = idx;
      rows[idx] = { ...(rows[idx] || { our_reel: '', weight: '' }), our_reel: reel };
      return rows;
    });

    setQrPasteText('');
    setTimeout(() => {
      const el = manualIssueWeightRefs.current?.[focusRow];
      if (el && typeof el.focus === 'function') el.focus();
    }, 50);
  };

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const pendingPromise = fetchSheetRange(REEL_SCHEMAS.reel_issue_pending.sheetName, selectedFirm);
      const issuePromise = fetchSheetRange(REEL_SCHEMAS.reel_issue.sheetName, selectedFirm);
      const retPromise = fetchSheetRange(REEL_SCHEMAS.reel_return.sheetName, selectedFirm);
      const helperPromise = fetchSheetRange('HELPER SHEET', selectedFirm);
      const dpmPromise = loadDpmJobs(selectedFirm);

      const [pending, issue, ret, helper, dpm] = await Promise.all([
        pendingPromise,
        issuePromise,
        retPromise,
        helperPromise,
        dpmPromise
      ]);

      if (loadRunRef.current !== runId) return;
      setPendingRows(Array.isArray(pending?.data) ? pending.data : []);
      setIssueRows(Array.isArray(issue?.data) ? issue.data : []);
      setReturnRows(Array.isArray(ret?.data) ? ret.data : []);
      setHelperRows(Array.isArray(helper?.data) ? helper.data : []);
      setDpmJobs(Array.isArray(dpm) ? dpm : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setLoadError(err?.message || 'Could not load data.');
      setPendingRows([]);
      setIssueRows([]);
      setReturnRows([]);
      setHelperRows([]);
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
      .filter((j) => {
        const s = String(j?.stage || '').toLowerCase();
        return s === 'reel_issue_pending' || s === 'issue';
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

  const onMoveToSheetPlant = async () => {
    if (!activeDetail?.pendingRow?._dpm_id) {
      alert('Only DPM Jobs can be moved through stages automatically.');
      return;
    }
    await updateDpmJobStage(selectedFirm, activeDetail.pendingRow._dpm_id, 'sheet_plant_pending');
    setActivePendingJob(null);
    await refreshDpm();
  };

  const groupedPendingList = useMemo(() => {
    const groups = new Map();
    (combinedPendingList || []).forEach(g => {
      if (!groups.has(g.date)) groups.set(g.date, []);
      groups.get(g.date).push(...g.rows);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [combinedPendingList]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', letterSpacing: '0.02em', fontWeight: 1100 }}>Reel Issue</h2>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            {selectedFirm?.name || '-'} | {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: isMobile ? '12px' : '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Search Pending Jobs..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingLeft: '40px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: '#f8fafc'
                  }}
                />
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn main" disabled={isLoading} onClick={loadFromSheets} style={{ borderRadius: '12px', padding: '10px 20px' }}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {isMobile ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {!groupedPendingList.length ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontWeight: 600 }}>
                  {isLoading ? 'Loading data...' : 'No pending jobs found.'}
                </div>
              ) : null}
              {groupedPendingList.map(([date, rows]) => (
                <React.Fragment key={date}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 1000, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📅 {date}</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>
                  {rows.map((row, idx) => {
                    const actualUsedVal = parseFloat(row.actualUsed || '0');
                    const planQtyVal = parseFloat(row.planQty || '0');
                    const isOver = planQtyVal > 0 && actualUsedVal > planQtyVal * 1.05;

                    return (
                      <div
                        key={idx}
                        onClick={() => row.job && setActivePendingJob(row.job)}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: '15px', fontWeight: 1100, color: '#dc2626' }}>{row.job}</div>
                          <div style={{ fontSize: '11px', fontWeight: 900, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#475569' }}>
                            {row.erp}
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{row.item}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                          <div style={{ color: '#64748b' }}>
                            <span style={{ fontWeight: 500 }}>Plan:</span> <span style={{ fontWeight: 800, color: '#1e293b' }}>{row.planQty}</span>
                          </div>
                          <div style={{ color: '#64748b' }}>
                            <span style={{ fontWeight: 500 }}>Actual:</span> <span style={{ fontWeight: 800, color: isOver ? '#dc2626' : '#1d4ed8' }}>{row.actualUsed}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
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
                          padding: '12px 10px',
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
                      <td colSpan={9} style={{ padding: '24px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 800 }}>
                        {isLoading ? 'Loading data from Sheets...' : 'No pending jobs found.'}
                      </td>
                    </tr>
                  ) : null}
                  {combinedPendingList.map((group) => (
                    <React.Fragment key={group.date}>
                      <tr>
                        <td colSpan={9} style={{ background: '#f8fafc', padding: '10px 10px', fontSize: '11px', fontWeight: 1000, color: '#475569', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                          📅 {group.date}
                        </td>
                      </tr>
                      {group.rows.map((row, idx) => {
                         const actualUsedVal = parseFloat(row.actualUsed || '0');
                         const planQtyVal = parseFloat(row.planQty || '0');
                         const isOver = planQtyVal > 0 && actualUsedVal > planQtyVal * 1.05;

                         return (
                          <tr
                            key={idx}
                            onClick={() => row.job && setActivePendingJob(row.job)}
                            style={{ cursor: row.job ? 'pointer' : 'default' }}
                          >
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#dc2626' }}>{row.job}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.erp}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.item}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 800 }}>{row.planQty}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.requiredReel}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 700 }}>{row.issued}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 700 }}>{row.returned}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: isOver ? '#dc2626' : '#1d4ed8' }}>{row.actualUsed}</td>
                            <td style={{ fontSize: '13px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{row.corrugation}</td>
                          </tr>
                         );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeDetail ? (
          <div
            className="no-print"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 10050,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
            onClick={() => setActivePendingJob(null)}
          >
            <div
              style={{
                width: 'min(580px, 98vw)',
                height: '100%',
                background: '#fff',
                borderLeft: '1px solid #e5e7eb',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.25)',
                padding: isMobile ? '12px' : '20px',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 1000, letterSpacing: '0.1em', color: '#64748b' }}>PENDING JOB (REEL ISSUE)</div>
                  <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: 1100, color: '#dc2626' }}>
                    {activeDetail.job}
                  </div>
                </div>
                <button type="button" className="btn" onClick={() => setActivePendingJob(null)} style={{ padding: '8px 16px', borderRadius: '10px', fontWeight: 900 }}>
                  ✕ Close
                </button>
              </div>

              {activeDetail.pendingRow?._dpm_id && (
                <div style={{ marginBottom: '20px' }}>
                  <button type="button" className="btn main" onClick={onMoveToSheetPlant} title="Save and Move to Sheet Plant" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px' }}>
                    Save & Move to Sheet Plant →
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '16px', background: '#1d4ed8', borderRadius: '2px' }} />
                  Manual Reel Operations
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 1000, color: '#1d4ed8', marginBottom: '12px', textTransform: 'uppercase' }}>+ MANUAL REEL ISSUE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px', marginBottom: '14px' }}>
                    <input
                      disabled={disableManualIssue || isSavingManual}
                      placeholder="QR Scan or Paste..."
                      value={qrPasteText}
                      onChange={(e) => setQrPasteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyQrToManualIssue(qrPasteText, null);
                      }}
                      style={{ width: '100%', padding: '10px 12px', border: '1px dashed #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      className="btn main small"
                      disabled={disableManualIssue || isSavingManual}
                      onClick={() => {
                        const t = String(qrPasteText || '').trim();
                        if (t) applyQrToManualIssue(t, null);
                        else setQrScanRowIdx(-1);
                      }}
                      style={{ borderRadius: '10px', fontWeight: 900 }}
                    >
                      Apply
                    </button>
                  </div>
                  {manualIssueRows.map((r, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', marginBottom: rowIdx === manualIssueRows.length - 1 ? 0 : 10, alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
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
                          }}
                          placeholder="Reel No"
                          style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                        />
                        <button 
                          type="button" 
                          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => setQrScanRowIdx(rowIdx)}
                        >📷</button>
                      </div>
                      <input
                        inputMode="decimal"
                        disabled={disableManualIssue || isSavingManual}
                        placeholder="Weight"
                        value={r.weight}
                        ref={(el) => { manualIssueWeightRefs.current[rowIdx] = el; }}
                        onChange={(e) => {
                          const next = e.target.value;
                          setManualIssueRows((prev) => {
                            const copy = [...prev];
                            copy[rowIdx] = { ...(copy[rowIdx] || { our_reel: '', weight: '' }), weight: next };
                            return copy;
                          });
                        }}
                        style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px' }}
                      />
                      <button
                        type="button"
                        className="btn small"
                        disabled={disableManualIssue || isSavingManual || manualIssueRows.length <= 1}
                        onClick={() => setManualIssueRows((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== rowIdx))}
                        style={{ background: '#fee2e2', borderColor: '#fee2e2', color: '#dc2626' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn small"
                      disabled={disableManualIssue || isSavingManual}
                      onClick={() => setManualIssueRows((prev) => [...prev, { our_reel: '', weight: '' }])}
                      style={{ padding: '8px 14px', borderRadius: '10px', fontWeight: 900 }}
                    >
                      + Add Reel
                    </button>
                    <button
                      type="button"
                      className="btn main small"
                      style={{ padding: '8px 20px', borderRadius: '10px' }}
                      disabled={isSavingManual || disableManualIssue}
                      onClick={onManualIssue}
                    >
                      {isSavingManual ? 'Saving...' : 'Issue Now'}
                    </button>
                  </div>
                </div>

                <div style={{ background: '#fff1f2', padding: '16px', borderRadius: '16px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', fontWeight: 1000, color: '#dc2626', marginBottom: '12px', textTransform: 'uppercase' }}>- MANUAL REEL RETURN</div>
                  {manualReturnRows.map((r, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', marginBottom: rowIdx === manualReturnRows.length - 1 ? 0 : 10, alignItems: 'center' }}>
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
                        }}
                        placeholder="Issued Reel"
                        style={{ width: '100%', padding: '10px', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '13px' }}
                      />
                      <input
                        inputMode="decimal"
                        disabled={disableManualReturn || isSavingManual}
                        placeholder="Weight"
                        value={r.weight}
                        onChange={(e) => {
                          const next = e.target.value;
                          setManualReturnRows((prev) => {
                            const copy = [...prev];
                            copy[rowIdx] = { ...(copy[rowIdx] || { our_reel: '', weight: '' }), weight: next };
                            return copy;
                          });
                        }}
                        style={{ padding: '10px', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '13px' }}
                      />
                      <button
                        type="button"
                        className="btn small"
                        disabled={disableManualReturn || isSavingManual || manualReturnRows.length <= 1}
                        onClick={() => setManualReturnRows((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== rowIdx))}
                        style={{ background: '#111827', borderColor: '#111827', color: '#fff' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn small"
                      disabled={disableManualReturn || isSavingManual}
                      onClick={() => setManualReturnRows((prev) => [...prev, { our_reel: '', weight: '' }])}
                      style={{ padding: '8px 14px', borderRadius: '10px', fontWeight: 900 }}
                    >
                      + Add Reel
                    </button>
                    <button
                      type="button"
                      className="btn main small"
                      style={{ padding: '8px 20px', background: '#dc2626', borderColor: '#dc2626', borderRadius: '10px' }}
                      disabled={isSavingManual || disableManualReturn}
                      onClick={onManualReturn}
                    >
                      {isSavingManual ? 'Saving...' : 'Return Now'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '16px', background: '#1d4ed8', borderRadius: '2px' }} />
                  Job Summary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  {[
                    ['ERP', activeDetail.erp],
                    ['ITEM', activeDetail.item],
                    ['PLAN QTY', activeDetail.planQty],
                    ['REQ REEL', activeDetail.requiredReel],
                    ['ISSUED WT', activeDetail.issuedWeight.toFixed(2)],
                    ['RETURNED WT', activeDetail.returnedWeight.toFixed(2)],
                    ['ACTUAL USED', activeDetail.actualPaperUsed.toFixed(2)]
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 1000, color: '#64748b' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e293b', textAlign: 'right' }}>{value || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '16px', background: '#1d4ed8', borderRadius: '2px' }} />
                  Issued Reels ({activeDetail.issuedRowsForJob.length})
                </div>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        {['Reel No', 'Supplier Reel', 'Weight'].map((h) => (
                          <th key={h} style={{ background: '#f1f5f9', fontSize: '11px', fontWeight: 1000, padding: '10px', textAlign: 'left', color: '#475569' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!activeDetail.issuedRowsForJob.length ? (
                        <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>No reels issued yet.</td></tr>
                      ) : null}
                      {activeDetail.issuedRowsForJob.map((r, i) => (
                        <tr key={i}>
                          <td style={{ padding: '10px', fontSize: '12px', borderTop: '1px solid #e2e8f0', fontWeight: 800 }}>{String(r?.['QR Scan'] ?? r?.['Our Reel Number'] ?? '')}</td>
                          <td style={{ padding: '10px', fontSize: '12px', borderTop: '1px solid #e2e8f0' }}>{String(r?.['Supplier Reel No.'] ?? '')}</td>
                          <td style={{ padding: '10px', fontSize: '12px', borderTop: '1px solid #e2e8f0', fontWeight: 700 }}>{String(r?.Weight ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <QrScanModal
        open={!!activeDetail && qrScanRowIdx !== null}
        title="Scan Reel QR"
        onClose={() => setQrScanRowIdx(null)}
        onScan={(raw) => applyQrToManualIssue(raw, qrScanRowIdx >= 0 ? qrScanRowIdx : null)}
      />
    </div>
  );}

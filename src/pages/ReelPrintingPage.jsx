import React, { useEffect, useMemo, useRef, useState } from 'react';
import { REEL_SCHEMAS } from '../utils/reelSchemas';
import { fetchSheetRange } from '../sheetSync';
import { loadDpmJobs, updateDpmJobStage } from '../utils/dpmJobs';

function n(value) {
  const num = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : 0;
}

function fmtInt(value) {
  try {
    return Math.round(Number(value) || 0).toLocaleString('en-IN');
  } catch {
    return String(value ?? '');
  }
}

export default function ReelPrintingPage({ selectedFirm, currentUser, onBack }) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const loadRunRef = useRef(0);
  const [activeJob, setActiveJob] = useState(null);
  const [dpmJobs, setDpmJobs] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateDraft, setUpdateDraft] = useState({ part_printing: '0', prod_at_printing: '0' });

  const loadFromSheets = async () => {
    if (!selectedFirm) return;
    const runId = ++loadRunRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const payload = await fetchSheetRange(REEL_SCHEMAS.printing_pending.sheetName, selectedFirm);
      if (loadRunRef.current !== runId) return;
      setRows(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      if (loadRunRef.current !== runId) return;
      setLoadError(err?.message || 'Could not load data from Sheets.');
      setRows([]);
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

  const listRows = useMemo(() => {
    const sheetRows = (rows || [])
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        date: String(r?.DATE || r?.Date || '').trim(),
        job: String(r?.['JOB No.'] || r?.['JOB NO.'] || r?.JOB || '').trim(),
        erp: String(r?.ERP || '').trim(),
        item: String(r?.ITEM || '').trim(),
        planQty: String(r?.['PLAN QUANTITY'] ?? '').trim(),
        psp: String(r?.['PROD. AT SHEET PLANT'] ?? '').trim(),
        raw: r,
        _dpm_id: ''
      }))
      .filter((r) => r.job);

    const dpmRows = (dpmJobs || [])
      .filter((j) => String(j?.stage || '') === 'printing_pending')
      .map((j) => ({
        date: String(j?.date || '').trim(),
        job: String(j?.job_no || '').trim(),
        erp: String(j?.erp || '').trim(),
        item: String(j?.item || '').trim(),
        planQty: String(j?.plan_quantity || '').trim(),
        psp: '',
        raw: j,
        _dpm_id: j.id
      }))
      .filter((r) => r.job);

    return [...dpmRows, ...sheetRows];
  }, [rows, dpmJobs]);

  const grouped = useMemo(() => {
    const normalizeDate = (value) => {
      const raw = String(value || '').trim();
      return raw || 'Invalid date';
    };
    const byDate = new Map();
    listRows.forEach((r) => {
      const key = normalizeDate(r.date);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(r);
    });
    const entries = Array.from(byDate.entries());
    entries.sort((a, b) => {
      if (a[0] === 'Invalid date' && b[0] !== 'Invalid date') return -1;
      if (b[0] === 'Invalid date' && a[0] !== 'Invalid date') return 1;
      return a[0].localeCompare(b[0]);
    });
    const out = [];
    entries.forEach(([date, items]) => {
      const pspTotal = items.reduce((sum, it) => sum + n(it.psp), 0);
      out.push({ type: 'group', date, count: items.length, pspTotal });
      items.forEach((it) => out.push({ type: 'row', row: it }));
    });
    return out;
  }, [listRows]);

  const activeDetail = useMemo(() => {
    if (!activeJob) return null;
    const job = String(activeJob || '').trim();
    if (!job) return null;
    const found = listRows.find((r) => r.job === job) || null;
    return found ? { ...found } : null;
  }, [activeJob, listRows]);

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
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
          Auto-loaded from Sheets ({REEL_SCHEMAS.printing_pending.sheetName}).
        </div>
        {loadError ? (
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>
            {loadError}
          </div>
        ) : null}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn main" disabled={isLoading} onClick={loadFromSheets}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['JOB No.', 'ERP', 'ITEM', 'PLAN QUANTITY', 'PROD. AT SHEET PLANT', ''].map((h) => (
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
              {!grouped.length ? (
                <tr>
                  <td colSpan={6} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                    -
                  </td>
                </tr>
              ) : null}
              {grouped.map((entry, idx) => {
                if (entry.type === 'group') {
                  return (
                    <tr key={`g-${idx}`}>
                      <td colSpan={6} style={{ padding: '10px 10px', background: '#f8fafc', borderTop: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>
                        <span style={{ marginRight: 10 }}>{entry.date}</span>
                        <span style={{ color: '#111' }}>|</span>
                        <span style={{ marginLeft: 10, color: '#111', fontWeight: 1000 }}>PSP : {fmtInt(entry.pspTotal)}</span>
                      </td>
                    </tr>
                  );
                }
                const r = entry.row;
                return (
                  <tr
                    key={`r-${idx}`}
                    onClick={() => r.job && setActiveJob(r.job)}
                    style={{ cursor: r.job ? 'pointer' : 'default' }}
                    title={r.job ? `Open Job ${r.job}` : ''}
                  >
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#dc2626' }}>{r.job}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.erp}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.item}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.planQty}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{r.psp}</td>
                    <td style={{ fontSize: '12px', padding: '8px 10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', textAlign: 'right', color: '#6b7280', fontWeight: 900 }}>
                      {'>'}
                    </td>
                  </tr>
                );
              })}
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
          onClick={() => setActiveJob(null)}
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
                  {activeDetail.job}
                </div>
              </div>
              <button type="button" className="btn" onClick={() => setActiveJob(null)} style={{ padding: '8px 12px', fontWeight: 900 }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn main"
                onClick={() => {
                  setUpdateDraft({
                    part_printing: String(activeDetail.raw?.['PART PRINTING'] ?? '0'),
                    prod_at_printing: String(activeDetail.raw?.['PROD. AT PRINTING'] ?? '0')
                  });
                  setShowUpdateModal(true);
                }}
              >
                Update Printing Data
              </button>
              {activeDetail._dpm_id ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    updateDpmJobStage(selectedFirm, activeDetail._dpm_id, 'closer_pending');
                    setDpmJobs(loadDpmJobs(selectedFirm));
                    setShowUpdateModal(false);
                    setActiveJob(null);
                  }}
                >
                  Send to Closer
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid #eef2f7', paddingTop: '14px' }}>
              {(() => {
                const r = activeDetail.raw || {};
                const get = (k) => String(r?.[k] ?? '').trim();
                const fields = [
                  ['JOB No.', activeDetail.job],
                  ['ERP', get('ERP')],
                  ['ITEM', get('ITEM')],
                  ['PLAN QUANTITY', get('PLAN QUANTITY')],
                  ['REQUIRED REEL', get('REQUIRED REEL')],
                  ['ACTUAL PAPER USED', get('ACTUAL PAPER USED')],
                  ['PROD. AT SHEET PLANT', get('PROD. AT SHEET PLANT')],
                  ['C WASTAGE', get('C WASTAGE')],
                  ['TOTAL WASTAGE %', get('TOTAL WASTAGE %')]
                ];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {fields.map(([label, value]) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '10px', alignItems: 'baseline' }}>
                        <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#111', wordBreak: 'break-word' }}>{value || '-'}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}

      {showUpdateModal ? (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            zIndex: 10100,
            display: 'grid',
            placeItems: 'center',
            padding: '16px'
          }}
          onClick={() => setShowUpdateModal(false)}
        >
          <div
            style={{
              width: 'min(520px, 96vw)',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '18px', fontWeight: 1100, color: '#111' }}>Update Printing Data</div>
            <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280', marginBottom: '6px' }}>PART PRINTING *</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center' }}>
                  <input value={updateDraft.part_printing} onChange={(e) => setUpdateDraft((p) => ({ ...p, part_printing: e.target.value }))} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px' }} />
                  <button type="button" className="btn small" onClick={() => setUpdateDraft((p) => ({ ...p, part_printing: String(Math.max(0, n(p.part_printing) - 1)) }))}>-</button>
                  <button type="button" className="btn small" onClick={() => setUpdateDraft((p) => ({ ...p, part_printing: String(n(p.part_printing) + 1) }))}>+</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 1000, color: '#6b7280', marginBottom: '6px' }}>PROD. AT PRINTING *</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center' }}>
                  <input value={updateDraft.prod_at_printing} onChange={(e) => setUpdateDraft((p) => ({ ...p, prod_at_printing: e.target.value }))} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px' }} />
                  <button type="button" className="btn small" onClick={() => setUpdateDraft((p) => ({ ...p, prod_at_printing: String(Math.max(0, n(p.prod_at_printing) - 1)) }))}>-</button>
                  <button type="button" className="btn small" onClick={() => setUpdateDraft((p) => ({ ...p, prod_at_printing: String(n(p.prod_at_printing) + 1) }))}>+</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', fontSize: '12px', fontWeight: 900, color: '#b45309' }}>
              Save is UI-only for now (no Sheets update API connected).
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn" onClick={() => setShowUpdateModal(false)}>Cancel</button>
              <button type="button" className="btn main" onClick={() => setShowUpdateModal(false)}>Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

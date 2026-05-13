import React, { useMemo, useState } from 'react';
import { addDpmJob, loadDpmJobs, saveDpmJobs, updateDpmJobStage } from '../utils/dpmJobs';
import { REEL_SCHEMAS } from '../utils/reelSchemas';

const STAGE_LABELS = {
  reel_issue_pending: 'Pending Reel Issue',
  sheet_plant_pending: 'Pending Sheet Plant',
  printing_pending: 'Pending Printing',
  closer_pending: 'Pending Closer',
  closed: 'Closed'
};

export default function DpmJobsPage({ selectedFirm, currentUser, onBack }) {
  const [jobs, setJobs] = useState(() => loadDpmJobs(selectedFirm));
  const [form, setForm] = useState({ sno: '', date: '', job_no: '', erp: '', item: '', plan_quantity: '', required_reel: '' });
  const [error, setError] = useState('');

  const stageCounts = useMemo(() => {
    const counts = { reel_issue_pending: 0, sheet_plant_pending: 0, printing_pending: 0, closer_pending: 0, closed: 0 };
    (jobs || []).forEach((j) => {
      const stage = String(j?.stage || '');
      if (counts[stage] !== undefined) counts[stage] += 1;
    });
    return counts;
  }, [jobs]);

  const refresh = () => setJobs(loadDpmJobs(selectedFirm));

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>DPM Jobs</h2>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>New DPM Job</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
                Schema: {REEL_SCHEMAS.dpm_jobs.headers.join(', ')}
              </div>
              {error ? <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b91c1c' }}>{error}</div> : null}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="btn" onClick={() => { saveDpmJobs(selectedFirm, []); refresh(); }}>
                Clear
              </button>
              <button type="button" className="btn" onClick={refresh}>
                Refresh
              </button>
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: '8px' }}>
            {['sno', 'date', 'job_no', 'erp', 'item', 'plan_quantity', 'required_reel'].map((k) => (
              <input
                key={k}
                value={form[k]}
                onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                placeholder={k.replace(/_/g, ' ').toUpperCase()}
                style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px' }}
              />
            ))}
          </div>
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn main"
              onClick={() => {
                const jobNo = String(form.job_no || '').trim();
                if (!jobNo) {
                  setError('JOB No. is required.');
                  return;
                }
                setError('');
                addDpmJob(selectedFirm, {
                  sno: String(form.sno || '').trim(),
                  date: String(form.date || '').trim(),
                  job_no: jobNo,
                  erp: String(form.erp || '').trim(),
                  item: String(form.item || '').trim(),
                  plan_quantity: String(form.plan_quantity || '').trim(),
                  required_reel: String(form.required_reel || '').trim()
                });
                setForm({ sno: '', date: '', job_no: '', erp: '', item: '', plan_quantity: '', required_reel: '' });
                refresh();
              }}
            >
              Add DPM Job
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Pipeline</div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#6b7280' }}>
              Issue: {stageCounts.reel_issue_pending} | Sheet Plant: {stageCounts.sheet_plant_pending} | Printing: {stageCounts.printing_pending} | Closer: {stageCounts.closer_pending} | Closed: {stageCounts.closed}
            </div>
          </div>

          <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['JOB No.', 'ERP', 'ITEM', 'PLAN QUANTITY', 'REQUIRED REEL', 'Stage', 'Next'].map((h) => (
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
                {!jobs.length ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                      -
                    </td>
                  </tr>
                ) : null}
                {jobs.map((j) => {
                  const stage = String(j?.stage || 'reel_issue_pending');
                  const nextStage = stage === 'reel_issue_pending'
                    ? 'sheet_plant_pending'
                    : stage === 'sheet_plant_pending'
                      ? 'printing_pending'
                      : stage === 'printing_pending'
                        ? 'closer_pending'
                        : stage === 'closer_pending'
                          ? 'closed'
                          : '';
                  return (
                    <tr key={j.id}>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', fontWeight: 900, color: '#dc2626', whiteSpace: 'nowrap' }}>{String(j.job_no || '')}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{String(j.erp || '')}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{String(j.item || '')}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{String(j.plan_quantity || '')}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{String(j.required_reel || '')}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>{STAGE_LABELS[stage] || stage}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', borderTop: '1px solid #eef2f7', whiteSpace: 'nowrap' }}>
                        {nextStage ? (
                          <button
                            type="button"
                            className="btn small main"
                            onClick={() => {
                              updateDpmJobStage(selectedFirm, j.id, nextStage);
                              refresh();
                            }}
                          >
                            {STAGE_LABELS[nextStage] || 'Next'}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

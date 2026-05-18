import React, { useMemo, useState, useEffect } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function DpmJobsPage({ selectedFirm, deps = {}, initialPlanningData, onBack }) {
  const { fetchDpmJobs, saveDpmJobFromPlanning, saveDpmJob, currentUser } = deps;
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-GB'),
    plan_quantity: initialPlanningData?.scheduled_qty || '',
    required_reel: ''
  });

  const [editingOpeningJobId, setEditingOpeningJobId] = useState(null);
  const [openingBalanceDraft, setOpeningBalanceDraft] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDpmJobs(selectedFirm);
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load DPM jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [selectedFirm?.firmKey]);

  const handleUpdateOpeningBalance = async (job) => {
    if (openingBalanceDraft === String(job.opening_balance || 0)) {
      setEditingOpeningJobId(null);
      return;
    }

    try {
      const nextVal = parseFloat(openingBalanceDraft) || 0;
      await saveDpmJob(selectedFirm, { ...job, opening_balance: nextVal });
      setEditingOpeningJobId(null);
      loadJobs();
    } catch (err) {
      alert('Failed to update opening balance: ' + err.message);
    }
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!initialPlanningData) return;
    setIsSaving(true);
    try {
      await saveDpmJobFromPlanning(
        selectedFirm,
        initialPlanningData.id,
        formData.plan_quantity,
        formData.required_reel,
        currentUser?.user_email || ''
      );
      loadJobs();
      setFormData({ ...formData, required_reel: '' });
      alert('DPM Job created successfully.');
    } catch (err) {
      console.error('Failed to save DPM job:', err);
      alert('Failed to save DPM job: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const styles = {
    container: { padding: '24px', background: '#f5f7fb', minHeight: '100vh' },
    card: { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' },
    title: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#374151' },
    input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#f9fafb' },
    editableInput: { width: '100%', padding: '10px', border: '1px solid #2563eb', borderRadius: '8px', outline: 'none', background: '#fff' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { background: '#1d4ed8', color: '#fff', textAlign: 'left', padding: '12px', fontWeight: '600' },
    td: { padding: '12px', borderBottom: '1px solid #f1f5f9' },
    btnPrimary: { background: '#1d4ed8', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    btn: { background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }
  };

  const pendingReelIssue = useMemo(() => jobs.filter(j => j.stage === 'reel_issue_pending'), [jobs]);
  const pendingSheetPlant = useMemo(() => jobs.filter(j => j.stage === 'sheet_plant_pending'), [jobs]);
  const pendingPrinting = useMemo(() => jobs.filter(j => j.stage === 'printing_pending'), [jobs]);

  const renderJobTable = (title, data, color) => (
    <div style={{ ...styles.card, marginTop: '20px' }}>
      <h2 style={{ ...styles.title, color }}>{title} ({data.length})</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Job No</th>
              <th style={styles.th}>ERP</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Plan Qty</th>
              <th style={styles.th}>Req Reel</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((job) => (
              <tr key={job.id}>
                <td style={{ ...styles.td, fontWeight: 'bold' }}>{job.job_no}</td>
                <td style={styles.td}>{job.erp}</td>
                <td style={styles.td}>{job.item}</td>
                <td style={styles.td}>{Number(job.plan_quantity).toLocaleString()}</td>
                <td style={styles.td}>{job.required_reel}</td>
                <td style={styles.td}>{job.date}</td>
                <td style={styles.td}>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                    PENDING
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>No jobs pending in this stage.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold' }}>DPM Jobs Management</h1>
        <button onClick={onBack} style={styles.btn}>Back</button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Create New Job</h2>
        <form onSubmit={handleSaveJob}>
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Date</label>
              <input type="date" value={formData.date} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Job No</label>
              <input type="text" value="AUTO-GENERATED" readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Order ID</label>
              <input type="text" value={initialPlanningData?.order_id || ''} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Company</label>
              <input type="text" value={initialPlanningData?.company_name || ''} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>ERP</label>
              <input type="text" value={initialPlanningData?.erp_code || ''} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Item</label>
              <input type="text" value={initialPlanningData?.item_name || ''} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Scheduled Qty</label>
              <input type="text" value={initialPlanningData?.scheduled_qty || ''} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Plan Quantity</label>
              <input 
                type="number" 
                step="0.001"
                value={formData.plan_quantity} 
                onChange={e => setFormData({ ...formData, plan_quantity: e.target.value })}
                style={styles.editableInput}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Required Reel</label>
              <input 
                type="number" 
                step="1"
                value={formData.required_reel} 
                onChange={e => setFormData({ ...formData, required_reel: e.target.value })}
                style={styles.editableInput}
                required
              />
            </div>
          </div>
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={styles.btnPrimary} disabled={isSaving || !initialPlanningData}>
              {isSaving ? 'Saving...' : 'Create DPM Job'}
            </button>
          </div>
        </form>
      </div>

      {renderJobTable("Pending Jobs for Reel Issue & Return", pendingReelIssue, "#dc2626")}
      {renderJobTable("Pending Jobs for Sheet Plant", pendingSheetPlant, "#1d4ed8")}
      {renderJobTable("Pending Jobs for Printing", pendingPrinting, "#16a34a")}

      <div style={styles.card}>
        <h2 style={styles.title}>All Jobs (Pipeline Status)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Job No</th>
                <th style={styles.th}>ERP</th>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Plan Qty</th>
                <th style={styles.th}>Opening Bal</th>
                <th style={styles.th}>Receipt</th>
                <th style={styles.th}>Production</th>
                <th style={styles.th}>Dispatch</th>
                <th style={styles.th}>Balance</th>
                <th style={styles.th}>Stage</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td style={styles.td}>{job.job_no}</td>
                  <td style={styles.td}>{job.erp}</td>
                  <td style={styles.td}>{job.item}</td>
                  <td style={styles.td}>{Number(job.plan_quantity).toLocaleString()}</td>
                  <td style={styles.td}>
                    {editingOpeningJobId === job.id ? (
                      <input
                        type="number"
                        step="0.001"
                        autoFocus
                        value={openingBalanceDraft}
                        onChange={(e) => setOpeningBalanceDraft(e.target.value)}
                        onBlur={() => handleUpdateOpeningBalance(job)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateOpeningBalance(job);
                          if (e.key === 'Escape') setEditingOpeningJobId(null);
                        }}
                        style={{ width: '90px', padding: '6px', border: '2px solid #1d4ed8', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}
                      />
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingOpeningJobId(job.id);
                          setOpeningBalanceDraft(String(job.opening_balance || 0));
                        }}
                        style={{ 
                          cursor: 'pointer', 
                          padding: '6px 10px', 
                          borderRadius: '6px', 
                          background: '#f8fafc', 
                          border: '1px dashed #cbd5e1',
                          minWidth: '60px',
                          textAlign: 'right'
                        }}
                        title="Click to edit Opening Balance"
                      >
                        {Number(job.opening_balance || 0).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>{Number(job.receipt || 0).toLocaleString()}</td>
                  <td style={styles.td}>{Number(job.production || 0).toLocaleString()}</td>
                  <td style={styles.td}>{Number(job.dispatch || 0).toLocaleString()}</td>
                  <td style={styles.td}>{Number(job.balance || 0).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{ 
                      background: job.stage === 'reel_issue_pending' ? '#fee2e2' : 
                                 job.stage === 'sheet_plant_pending' ? '#dbeafe' : 
                                 job.stage === 'printing_pending' ? '#dcfce7' : '#f3f4f6', 
                      color: job.stage === 'reel_issue_pending' ? '#991b1b' : 
                             job.stage === 'sheet_plant_pending' ? '#1e40af' : 
                             job.stage === 'printing_pending' ? '#166534' : '#374151',
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' 
                    }}>
                      {job.stage?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ background: job.status === 'PENDING' ? '#f3f4f6' : '#fef3c7', color: job.status === 'PENDING' ? '#374151' : '#92400e', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {job.status || 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No jobs in pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

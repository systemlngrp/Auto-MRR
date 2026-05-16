import React, { useMemo, useState, useEffect } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function DpmJobsPage({ selectedFirm, deps = {}, initialPlanningData, onBack }) {
  const { fetchDpmJobs, saveDpmJobFromPlanning, currentUser } = deps;
  
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    plan_quantity: '',
    required_reel: ''
  });

  const loadJobs = async () => {
    if (!selectedFirm) return;
    setIsLoading(true);
    try {
      const data = await fetchDpmJobs(selectedFirm);
      setJobs(data || []);
    } catch (err) {
      console.error('Failed to load DPM jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [selectedFirm]);

  useEffect(() => {
    if (initialPlanningData) {
      setFormData(prev => ({
        ...prev,
        plan_quantity: String(initialPlanningData.scheduled_qty || ''),
        required_reel: ''
      }));
    }
  }, [initialPlanningData]);

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!initialPlanningData) {
      alert('Please select a planning record first from Pending Planning page.');
      return;
    }

    const planQty = Number(formData.plan_quantity);
    const reqReel = Number(formData.required_reel);

    if (isNaN(planQty) || planQty <= 0 || isNaN(reqReel) || reqReel <= 0) {
      alert('Plan Quantity and Required Reel are required and must be positive.');
      return;
    }

    if (planQty > Number(initialPlanningData.scheduled_qty) + 0.0001) {
      alert('Plan Quantity cannot be greater than Scheduled Qty.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveDpmJobFromPlanning(
        selectedFirm, 
        initialPlanningData.id, 
        planQty, 
        reqReel, 
        currentUser?.email || ''
      );
      if (res.ok) {
        alert('DPM Job created successfully.');
        setFormData({
          date: new Date().toISOString().split('T')[0],
          plan_quantity: '',
          required_reel: ''
        });
        loadJobs();
        if (onBack) onBack(); // Go back to Planning list as requested "Refresh Pending Planning list so that the completed row is removed."
      }
    } catch (err) {
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
    btnPrimary: { background: '#1d4ed8', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold' }}>DPM Jobs Management</h1>
        <button onClick={onBack} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
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

      <div style={styles.card}>
        <h2 style={styles.title}>Pipeline Status</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Job No</th>
                <th style={styles.th}>ERP</th>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Plan Qty</th>
                <th style={styles.th}>Req Reel</th>
                <th style={styles.th}>Stage</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td style={styles.td}>{job.job_no}</td>
                  <td style={styles.td}>{job.erp}</td>
                  <td style={styles.td}>{job.item}</td>
                  <td style={styles.td}>{Number(job.plan_quantity).toLocaleString()}</td>
                  <td style={styles.td}>{job.required_reel}</td>
                  <td style={styles.td}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {job.stage}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ background: job.status === 'PENDING' ? '#f3f4f6' : '#fef3c7', color: job.status === 'PENDING' ? '#374151' : '#92400e', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {job.status || 'PENDING'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {/* Actions if any */}
                    -
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No jobs in pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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

  const [searchTerm, setSearchBar] = useState('');

  const filteredJobs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return jobs;
    return jobs.filter(j => 
      (j.job_no || '').toString().toLowerCase().includes(q) ||
      (j.erp || '').toString().toLowerCase().includes(q) ||
      (j.item || '').toString().toLowerCase().includes(q)
    );
  }, [jobs, searchTerm]);

  const styles = {
    container: { padding: '24px', background: '#f5f7fb', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' },
    card: { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    title: { fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' },
    label: { display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', background: '#f9fafb', fontSize: '13px' },
    editableInput: { width: '100%', padding: '8px 12px', border: '1.5px solid #2563eb', borderRadius: '6px', outline: 'none', background: '#fff', fontSize: '13px', fontWeight: '600' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    th: { background: '#f8fafc', color: '#475569', textAlign: 'left', padding: '8px 12px', fontWeight: '800', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
    td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' },
    btnPrimary: { background: '#1d4ed8', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' },
    btn: { background: '#fff', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    badge: (bg, fg) => ({ background: bg, color: fg, padding: '4px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', display: 'inline-block' })
  };

  const pendingReelIssue = useMemo(() => jobs.filter(j => {
    const s = String(j.stage || '').toLowerCase();
    return s === 'reel_issue_pending' || s === 'issue';
  }), [jobs]);
  const pendingSheetPlant = useMemo(() => jobs.filter(j => {
    const s = String(j.stage || '').toLowerCase();
    return s === 'sheet_plant_pending' || s === 'sheetplant';
  }), [jobs]);
  const pendingPrinting = useMemo(() => jobs.filter(j => {
    const s = String(j.stage || '').toLowerCase();
    return s === 'printing_pending' || s === 'printing';
  }), [jobs]);

  const renderJobTable = (title, data, color, icon) => (
    <div style={styles.card}>
      <h2 style={{ ...styles.title, color }}>
        <span>{icon}</span> {title}
        <span style={{ marginLeft: 'auto', background: color + '15', color: color, padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>{data.length}</span>
      </h2>
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
                <td style={{ ...styles.td, fontWeight: '800', color: '#1e293b' }}>{job.job_no}</td>
                <td style={styles.td}>{job.erp}</td>
                <td style={styles.td}>{job.item}</td>
                <td style={{ ...styles.td, fontWeight: '700' }}>{Number(job.plan_quantity).toLocaleString()}</td>
                <td style={styles.td}>{job.required_reel}</td>
                <td style={styles.td}>{job.date}</td>
                <td style={styles.td}>
                  <span style={styles.badge('#fef3c7', '#92400e')}>PENDING</span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>No jobs pending in this stage.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: 0 }}>🏭 DPM Jobs Management</h1>
        <button onClick={onBack} style={styles.btn}>← Back to Dashboard</button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>➕ Create New Production Job</h2>
        <form onSubmit={handleSaveJob}>
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Job Date</label>
              <input type="text" value={formData.date} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Company</label>
              <input type="text" value={initialPlanningData?.company_name || 'Select from Planning'} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Item & ERP</label>
              <input type="text" value={initialPlanningData ? `${initialPlanningData.item_name} (${initialPlanningData.erp_code})` : '-'} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Scheduled Qty</label>
              <input type="text" value={initialPlanningData?.scheduled_qty || '0'} readOnly style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Plan Quantity *</label>
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
              <label style={styles.label}>Required Reel *</label>
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
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={styles.btnPrimary} disabled={isSaving || !initialPlanningData}>
              {isSaving ? 'Processing...' : 'Confirm & Create Job'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {renderJobTable("Reel Issue & Return", pendingReelIssue, "#dc2626", "📜")}
        {renderJobTable("Sheet Plant", pendingSheetPlant, "#2563eb", "📑")}
        {renderJobTable("Printing", pendingPrinting, "#059669", "🎨")}
      </div>

      <div style={{ ...styles.card, marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ ...styles.title, margin: 0 }}>📊 Production Pipeline Status</h2>
          <input 
            type="text" 
            placeholder="🔍 Search Job No, ERP, or Item..." 
            value={searchTerm}
            onChange={(e) => setSearchBar(e.target.value)}
            style={{ ...styles.input, width: '300px', background: '#fff' }}
          />
        </div>
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
                <th style={styles.th}>Current Stage</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map(job => (
                <tr key={job.id} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...styles.td, fontWeight: '800', color: '#1e293b' }}>{job.job_no}</td>
                  <td style={styles.td}>{job.erp}</td>
                  <td style={styles.td}>{job.item}</td>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{Number(job.plan_quantity).toLocaleString()}</td>
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
                        style={{ width: '80px', padding: '4px 8px', border: '2px solid #2563eb', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}
                      />
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingOpeningJobId(job.id);
                          setOpeningBalanceDraft(String(job.opening_balance || 0));
                        }}
                        style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: '#f8fafc', border: '1px dashed #cbd5e1', minWidth: '50px', textAlign: 'right', fontWeight: '600' }}
                        title="Click to edit Opening Balance"
                      >
                        {Number(job.opening_balance || 0).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>{Number(job.receipt || 0).toLocaleString()}</td>
                  <td style={{ ...styles.td, color: '#059669', fontWeight: '700' }}>{Number(job.production || 0).toLocaleString()}</td>
                  <td style={{ ...styles.td, color: '#dc2626', fontWeight: '700' }}>{Number(job.dispatch || 0).toLocaleString()}</td>
                  <td style={{ ...styles.td, fontWeight: '900', color: 'var(--primary)' }}>{Number(job.balance || 0).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(
                      job.stage?.includes('reel') ? '#fee2e2' : 
                      job.stage?.includes('sheet') ? '#dbeafe' : 
                      job.stage?.includes('printing') ? '#dcfce7' : '#f3f4f6',
                      job.stage?.includes('reel') ? '#991b1b' : 
                      job.stage?.includes('sheet') ? '#1e40af' : 
                      job.stage?.includes('printing') ? '#166534' : '#374151'
                    )}>
                      {job.stage?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge(job.status === 'PENDING' ? '#f3f4f6' : '#fef3c7', job.status === 'PENDING' ? '#374151' : '#92400e')}>
                      {job.status || 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', fontSize: '14px' }}>No jobs found in the pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

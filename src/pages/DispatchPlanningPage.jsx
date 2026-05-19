import React, { useState, useEffect, useMemo } from 'react';
import * as sheetSync from '../sheetSync';
import { pageStyles } from '../styles/pageStyles';
import SearchableSelect from '../components/layout/SearchableSelect';

export default function DispatchPlanningPage({ firm, currentUser, onBack, onMakeLoadingSlip }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'saved'
  const [pendingJobs, setPendingJobs] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [planningJob, setPlanningJob] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [formData, setFormData] = useState({
    dispatch_plan_qty: '',
    truck_number: ''
  });

  useEffect(() => {
    loadData();
  }, [firm]);

  async function loadData() {
    setIsLoading(true);
    setError('');
    try {
      const [jobs, plans, trucksData] = await Promise.all([
        sheetSync.fetchPendingDispatchJobs(firm),
        sheetSync.fetchDispatchPlanning(firm),
        sheetSync.fetchTruckMaster(firm)
      ]);
      setPendingJobs(jobs);
      setSavedPlans(plans);
      setTrucks(trucksData.filter(t => t.status === 'Active'));
    } catch (err) {
      setError(err.message || 'Failed to load dispatch planning data');
    } finally {
      setIsLoading(false);
    }
  }

  const truckOptions = useMemo(() => {
    return trucks.map(t => ({
      value: String(t.id),
      label: `${t.truck_number} (${t.transporter_name || 'No Transporter'})`
    }));
  }, [trucks]);

  function getTruckDisplay(truckVal) {
    if (!truckVal) return '-';
    const truck = trucks.find(t => String(t.id) === String(truckVal) || String(t.truck_number) === String(truckVal));
    return truck ? truck.truck_number : truckVal;
  }

  function handleStartPlanning(job) {
    setPlanningJob(job);
    setFormData({
      dispatch_plan_qty: job.pending_dispatch_qty || '',
      truck_number: ''
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!planningJob) return;

    const qty = parseFloat(formData.dispatch_plan_qty);
    if (isNaN(qty) || qty <= 0) {
      alert('Valid Dispatch Plan Quantity is required');
      return;
    }
    if (qty > planningJob.pending_dispatch_qty + 0.0001) {
      alert(`Dispatch Plan Quantity (${qty}) cannot be greater than Pending Quantity (${planningJob.pending_dispatch_qty})`);
      return;
    }
    if (!formData.truck_number) {
      alert('Truck Number is required');
      return;
    }

    setIsLoading(true);
    try {
      await sheetSync.saveDispatchPlanning(firm, {
        job_no: planningJob.job_no,
        dispatch_plan_qty: qty,
        truck_number: formData.truck_number
      }, currentUser?.email);
      
      setPlanningJob(null);
      await loadData();
      setSuccessModal(true);
    } catch (err) {
      alert(err.message || 'Failed to save dispatch plan');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={pageStyles.pageContainer}>
      <div style={pageStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} className="inv-back-btn">←</button>
          <h2 style={pageStyles.pageTitle}>📦 Dispatch Planning</h2>
        </div>
        <div className="inv-tab-group" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button 
            className={`inv-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Pending Jobs
          </button>
          <button 
            className={`inv-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
            style={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Saved Plans
          </button>
        </div>
      </div>

      {error && <div style={pageStyles.errorBanner}>{error}</div>}

      {activeTab === 'pending' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100%, 1fr))', gap: '20px' }}>
          {isLoading && pendingJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>Fetching pending DPM jobs...</div>
            </div>
          ) : pendingJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>All jobs are planned! No pending jobs found.</div>
            </div>
          ) : (
            pendingJobs.map(job => (
              <div key={job.job_no} className="inv-card" style={{ 
                margin: 0, 
                padding: '0', 
                display: 'flex', 
                flexDirection: 'row',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                background: '#fff',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}>
                <div style={{ width: '8px', background: 'var(--primary)' }} />
                
                <div style={{ flex: 1, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b' }}>{job.job_no}</span>
                      <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>Order: {job.order_id}</span>
                      <span className={`inv-badge ${job.status === 'PARTIAL DISPATCH PLANNED' ? 'orange' : 'gray'}`} style={{ fontSize: '11px', borderRadius: '20px', padding: '4px 12px' }}>
                        {job.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>{job.company_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{job.item}</span>
                      <span style={{ width: '4px', height: '4px', background: '#cbd5e1', borderRadius: '50%' }} />
                      <span>{job.erp}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '40px', background: '#f8fafc', padding: '16px 24px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Plan Qty</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{job.plan_quantity}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Req Reel</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{job.required_reel}</div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Pending</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary)' }}>{job.pending_dispatch_qty}</div>
                    </div>
                  </div>

                  <div style={{ minWidth: '160px' }}>
                    <button onClick={() => handleStartPlanning(job)} style={{ 
                      width: '100%',
                      padding: '14px 24px', 
                      borderRadius: '12px',
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(29, 78, 216, 0.2)',
                      transition: 'all 0.2s'
                    }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-dark)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                       onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                      Plan Dispatch ➔
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="inv-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table className="inv-table" style={{ margin: 0, fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Dispatch Schedule</th>
                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Reference</th>
                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Customer & Product</th>
                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap' }}>Planned Qty</th>
                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Vehicle Info</th>
                <th style={{ padding: '8px 10px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Planned By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && savedPlans.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: '#64748b', fontWeight: '600' }}>Loading saved plans...</div>
                </td></tr>
              ) : savedPlans.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '30px', marginBottom: '8px' }}>📅</div>
                  <div style={{ color: '#64748b', fontWeight: '600' }}>No dispatch plans saved yet.</div>
                </td></tr>
              ) : (
                savedPlans.map((plan, idx) => (
                  <tr key={idx} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{new Date(plan.dispatch_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>{new Date(plan.dispatch_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '12px' }}>{plan.job_no}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', fontWeight: '600' }}>Order: {plan.order_id}</div>
                    </td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '700', color: '#334155' }}>{plan.company_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{plan.item}</div>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)' }}>{plan.dispatch_plan_qty}</div>
                    </td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ 
                        fontWeight: '800', 
                        background: '#eff6ff', 
                        color: '#1d4ed8', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #dbeafe',
                        fontSize: '11px'
                      }}>
                        <span>🚚</span> {getTruckDisplay(plan.truck_number)}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '22px', height: '22px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>
                          {plan.created_by?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>{plan.created_by?.split('@')[0]}</div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {planningJob && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '650px', borderRadius: '24px' }}>
            <div className="inv-modal-header" style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800' }}>📦 New Dispatch Plan</h3>
              <button onClick={() => setPlanningJob(null)} className="inv-modal-close" style={{ fontSize: '24px' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', border: '1px solid #e2e8f0' }}>
                <div className="info-item" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Target Customer</label>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>{planningJob.company_name}</div>
                </div>
                <div className="info-item" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Manufacturing Item</label>
                  <div style={{ fontSize: '15px', fontWeight: '700' }}>{planningJob.item} <span style={{ color: '#6b7280', fontWeight: '500' }}>({planningJob.erp})</span></div>
                </div>
                <div className="info-item">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Job Number</label>
                  <div style={{ fontWeight: '800', color: 'var(--primary)' }}>{planningJob.job_no}</div>
                </div>
                <div className="info-item">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Pending For Dispatch</label>
                  <div style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '18px' }}>{planningJob.pending_dispatch_qty}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ ...pageStyles.label, color: '#111827' }}>Dispatch Plan Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    max={planningJob.pending_dispatch_qty}
                    placeholder="Enter Quantity"
                    value={formData.dispatch_plan_qty}
                    onChange={(e) => setFormData({ ...formData, dispatch_plan_qty: e.target.value })}
                    style={{ ...pageStyles.input, fontSize: '18px', fontWeight: '800', color: 'var(--primary)', height: '50px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Cannot exceed {planningJob.pending_dispatch_qty}</div>
                </div>
                <div>
                  <label style={{ ...pageStyles.label, color: '#111827' }}>Select Truck *</label>
                  <div style={{ height: '50px' }}>
                    <SearchableSelect
                      options={truckOptions}
                      value={formData.truck_number}
                      onChange={(val) => setFormData({ ...formData, truck_number: val })}
                      placeholder="Search Truck..."
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <button type="button" onClick={() => setPlanningJob(null)} className="inv-btn-secondary" style={{ padding: '12px 24px' }}>Cancel</button>
                <button type="submit" disabled={isLoading} className="inv-btn-primary" style={{ padding: '12px 30px', borderRadius: '12px' }}>
                  {isLoading ? 'Processing...' : 'Confirm Dispatch Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successModal && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '450px', borderRadius: '24px', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Plan Saved!</h3>
            <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.5' }}>Your dispatch plan has been recorded successfully. What would you like to do next?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => {
                  setSuccessModal(false);
                  if (typeof onMakeLoadingSlip === 'function') onMakeLoadingSlip();
                }}
                className="inv-btn-primary" 
                style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px' }}
              >
                📄 Make Loading Slip Now
              </button>
              <button 
                onClick={() => setSuccessModal(false)}
                className="inv-btn-secondary" 
                style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px' }}
              >
                ➕ Create Another Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .info-item label { color: #666; font-size: 0.85rem; margin-bottom: 2px; }
        .inv-tab-group { display: flex; gap: 5px; margin-left: auto; }
        .inv-tab-btn { padding: 10px 20px; border: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .inv-tab-btn.active { background: white; color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .small { padding: 4px 8px; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}

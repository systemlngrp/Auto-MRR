import React, { useState, useEffect, useMemo } from 'react';
import * as sheetSync from '../sheetSync';
import { pageStyles } from '../styles/pageStyles';
import SearchableSelect from '../components/layout/SearchableSelect';

export default function DispatchPlanningPage({ firm, currentUser, onBack }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'saved'
  const [pendingJobs, setPendingJobs] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [planningJob, setPlanningJob] = useState(null);
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
      value: t.truck_number,
      label: `${t.truck_number} (${t.transporter_name || 'No Transporter'})`
    }));
  }, [trucks]);

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
      alert('Dispatch Plan saved successfully');
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
          <h2 style={pageStyles.pageTitle}>Dispatch Planning</h2>
        </div>
        <div className="inv-tab-group">
          <button 
            className={`inv-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Jobs
          </button>
          <button 
            className={`inv-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved Plans
          </button>
        </div>
      </div>

      {error && <div style={pageStyles.errorBanner}>{error}</div>}

      {activeTab === 'pending' ? (
        <div className="inv-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Job No</th>
                <th>Order ID</th>
                <th>Company</th>
                <th>ERP</th>
                <th>Item</th>
                <th>Plan Qty</th>
                <th>Req Reel</th>
                <th>Pending Dispatch</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && pendingJobs.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
              ) : pendingJobs.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>No pending dispatch jobs found.</td></tr>
              ) : (
                pendingJobs.map(job => (
                  <tr key={job.job_no}>
                    <td style={{ fontWeight: 'bold' }}>{job.job_no}</td>
                    <td>{job.order_id}</td>
                    <td>{job.company_name}</td>
                    <td>{job.erp}</td>
                    <td>{job.item}</td>
                    <td>{job.plan_quantity}</td>
                    <td>{job.required_reel}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{job.pending_dispatch_qty}</td>
                    <td>
                      <span className={`inv-badge ${job.status === 'PARTIAL DISPATCH PLANNED' ? 'orange' : 'gray'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleStartPlanning(job)} className="inv-btn-primary small">Plan Dispatch</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="inv-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Dispatch Date</th>
                <th>Job No</th>
                <th>Order ID</th>
                <th>Company</th>
                <th>Item</th>
                <th>Dispatch Qty</th>
                <th>Truck Number</th>
                <th>Planned By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && savedPlans.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
              ) : savedPlans.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No dispatch plans found.</td></tr>
              ) : (
                savedPlans.map((plan, idx) => (
                  <tr key={idx}>
                    <td>{new Date(plan.dispatch_date).toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>{plan.job_no}</td>
                    <td>{plan.order_id}</td>
                    <td>{plan.company_name}</td>
                    <td>{plan.item}</td>
                    <td style={{ fontWeight: 'bold' }}>{plan.dispatch_plan_qty}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{plan.truck_number}</td>
                    <td>{plan.created_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {planningJob && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '600px' }}>
            <div className="inv-modal-header">
              <h3>Dispatch Planning - {planningJob.job_no}</h3>
              <button onClick={() => setPlanningJob(null)} className="inv-modal-close">×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="info-item">
                  <label style={pageStyles.label}>Company</label>
                  <div style={{ fontWeight: 'bold' }}>{planningJob.company_name}</div>
                </div>
                <div className="info-item">
                  <label style={pageStyles.label}>Item</label>
                  <div style={{ fontWeight: 'bold' }}>{planningJob.item} ({planningJob.erp})</div>
                </div>
                <div className="info-item">
                  <label style={pageStyles.label}>Order ID</label>
                  <div>{planningJob.order_id}</div>
                </div>
                <div className="info-item">
                  <label style={pageStyles.label}>Plan Quantity</label>
                  <div>{planningJob.plan_quantity}</div>
                </div>
                <div className="info-item">
                  <label style={pageStyles.label}>Required Reels</label>
                  <div>{planningJob.required_reel}</div>
                </div>
                <div className="info-item">
                  <label style={pageStyles.label}>Pending For Dispatch</label>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{planningJob.pending_dispatch_qty}</div>
                </div>
              </div>

              <hr style={{ margin: '20px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={pageStyles.label}>Dispatch Plan Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    max={planningJob.pending_dispatch_qty}
                    value={formData.dispatch_plan_qty}
                    onChange={(e) => setFormData({ ...formData, dispatch_plan_qty: e.target.value })}
                    style={pageStyles.input}
                  />
                </div>
                <div>
                  <label style={pageStyles.label}>Truck Number *</label>
                  <SearchableSelect
                    options={truckOptions}
                    value={formData.truck_number}
                    onChange={(val) => setFormData({ ...formData, truck_number: val })}
                    placeholder="Select Truck"
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setPlanningJob(null)} className="inv-btn-secondary">Cancel</button>
                <button type="submit" disabled={isLoading} className="inv-btn-primary">
                  {isLoading ? 'Saving...' : 'Save Dispatch Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .info-item label { color: #666; font-size: 0.85rem; margin-bottom: 2px; }
        .inv-tab-group { display: flex; gap: 10px; margin-left: auto; }
        .inv-tab-btn { padding: 8px 16px; border: none; background: #eee; border-radius: 4px; cursor: pointer; }
        .inv-tab-btn.active { background: var(--primary); color: white; }
        .small { padding: 4px 8px; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}

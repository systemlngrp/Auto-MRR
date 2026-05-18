import React, { useState, useEffect } from 'react';
import * as sheetSync from '../sheetSync';
import { pageStyles } from '../styles/pageStyles';

export default function PendingLoadingSlipPage({ firm, currentUser, onBack, onSuccess }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'completed'
  const [allPlans, setAllPlans] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [firm.firmKey]);

  async function loadData() {
    setIsLoading(true);
    setError('');
    try {
      const [plans, trucksData] = await Promise.all([
        sheetSync.fetchDispatchPlanning(firm),
        sheetSync.fetchTruckMaster(firm)
      ]);
      setAllPlans(plans || []);
      setTrucks(trucksData);
    } catch (err) {
      setError(err.message || 'Failed to load loading slips');
    } finally {
      setIsLoading(false);
    }
  }

  function getTruckDisplay(truckVal) {
    if (!truckVal) return '-';
    const truck = trucks.find(t => String(t.id) === String(truckVal) || String(t.truck_number) === String(truckVal));
    return truck ? truck.truck_number : truckVal;
  }

  const handleGenerateSlip = async (plan) => {
    if (!window.confirm(`Generate Loading Slip for Job ${plan.job_no}?`)) return;
    
    setIsGenerating(true);
    setError('');
    try {
      const result = await sheetSync.saveDispatchMaster(firm, {
        dispatch_plan_id: plan.id,
        dispatch_qty: plan.dispatch_plan_qty
      }, currentUser?.email);
      
      alert(`Loading Slip Generated: ${result.loading_slip_no}`);
      loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to generate loading slip:', err);
      setError('Failed to generate loading slip: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredPlans = allPlans.filter(p => {
    if (activeTab === 'pending') return p.status === 'Pending';
    return p.status === 'Dispatched';
  });

  return (
    <div style={pageStyles.pageContainer}>
      <div style={pageStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} className="inv-back-btn">←</button>
          <h2 style={pageStyles.pageTitle}>📄 Loading Slips</h2>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="inv-tab-group" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button 
              className={`inv-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
              style={{ borderRadius: '8px', fontWeight: 'bold' }}
            >
              Pending ({allPlans.filter(p => p.status === 'Pending').length})
            </button>
            <button 
              className={`inv-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
              style={{ borderRadius: '8px', fontWeight: 'bold' }}
            >
              Completed ({allPlans.filter(p => p.status === 'Dispatched').length})
            </button>
          </div>
          <button onClick={loadData} className="inv-btn-secondary" disabled={isLoading}>
            {isLoading ? 'Refreshing...' : '🔄'}
          </button>
        </div>
      </div>

      {error && <div style={pageStyles.errorBanner}>{error}</div>}

      <div className="inv-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table className="inv-table" style={{ margin: 0 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Job & Order</th>
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Customer</th>
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Qty</th>
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Truck</th>
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>{activeTab === 'pending' ? 'Action' : 'Slip No'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && filteredPlans.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>Loading...</td></tr>
            ) : filteredPlans.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>No {activeTab} loading slips found.</td></tr>
            ) : (
              filteredPlans.map((plan, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '16px 20px' }}>{new Date(plan.dispatch_date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 'bold' }}>{plan.job_no}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{plan.order_id}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>{plan.company_name}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{plan.dispatch_plan_qty}</td>
                  <td style={{ padding: '16px 20px' }}>{getTruckDisplay(plan.truck_number)}</td>
                  <td style={{ padding: '16px 20px' }}>
                    {activeTab === 'pending' ? (
                      <button 
                        className="inv-btn-primary small" 
                        disabled={isGenerating}
                        onClick={() => handleGenerateSlip(plan)}
                      >
                        {isGenerating ? 'Generating...' : 'Generate Slip'}
                      </button>
                    ) : (
                      <div style={{ fontWeight: 'bold', color: '#16a34a' }}>{plan.loading_slip_no}</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        .inv-tab-group { display: flex; gap: 5px; }
        .inv-tab-btn { padding: 8px 16px; border: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .inv-tab-btn.active { background: white; color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import * as sheetSync from '../sheetSync';
import { pageStyles } from '../styles/pageStyles';

export default function PendingLoadingSlipPage({ firm, currentUser, onBack, onSuccess }) {
  const [pendingPlans, setPendingPlans] = useState([]);
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
      const plans = await sheetSync.fetchDispatchPlanning(firm);
      // Filter for Pending plans
      setPendingPlans((plans || []).filter(p => p.status === 'Pending'));
    } catch (err) {
      setError(err.message || 'Failed to load pending loading slips');
    } finally {
      setIsLoading(false);
    }
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
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to generate loading slip:', err);
      setError('Failed to generate loading slip: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={pageStyles.pageContainer}>
      <div style={pageStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} className="inv-back-btn">←</button>
          <h2 style={pageStyles.pageTitle}>📄 Pending Loading Slips</h2>
        </div>
        <button onClick={loadData} className="inv-btn-secondary" disabled={isLoading}>
          {isLoading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
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
              <th style={{ padding: '20px', color: '#475569', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && pendingPlans.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>Loading...</td></tr>
            ) : pendingPlans.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>No pending loading slips found.</td></tr>
            ) : (
              pendingPlans.map((plan, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '16px 20px' }}>{new Date(plan.dispatch_date).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 'bold' }}>{plan.job_no}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{plan.order_id}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>{plan.company_name}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{plan.dispatch_plan_qty}</td>
                  <td style={{ padding: '16px 20px' }}>{plan.truck_number}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <button 
                      className="inv-btn-primary small" 
                      disabled={isGenerating}
                      onClick={() => handleGenerateSlip(plan)}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Slip'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

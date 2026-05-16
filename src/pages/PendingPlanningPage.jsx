import React, { useEffect, useState } from 'react';

export default function PendingPlanningPage({ deps = {}, onBack }) {
  const { fetchPendingPlanning, firm = {} } = deps;
  const [planning, setPlanning] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPlanning = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPendingPlanning(firm);
      setPlanning(data || []);
    } catch (err) {
      alert('Error loading planning data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlanning();
  }, [firm.firmKey]);

  const styles = {
    container: { padding: '24px', background: '#f9fafb', minHeight: '100vh' },
    title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' },
    card: { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { background: '#1d4ed8', color: '#fff', textAlign: 'left', padding: '12px', fontSize: '14px' },
    td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    btnBack: { background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={styles.title}>Pending Planning</h1>
        <button onClick={onBack} style={styles.btnBack}>Back</button>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order ID</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Sched Date</th>
              <th style={styles.th}>Sched Qty</th>
              <th style={styles.th}>Sched No</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Sales Person</th>
              <th style={styles.th}>Created At</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
              </tr>
              </thead>
              <tbody>
              {planning.map((p, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{p.order_id}</td>
                <td style={styles.td}>{p.company_name}</td>
                <td style={styles.td}>{p.erp_code}</td>
                <td style={styles.td}>{p.item_name}</td>
                <td style={styles.td}>{p.scheduled_date}</td>
                <td style={styles.td}>{Number(p.scheduled_qty).toLocaleString()}</td>
                <td style={styles.td}>{p.schedule_no} / 10</td>
                <td style={styles.td}>{Number(p.rate).toFixed(2)}</td>
                <td style={styles.td}>{p.sales_person}</td>
                <td style={styles.td}>{new Date(p.created_at).toLocaleString()}</td>
                <td style={styles.td}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                    {p.status_text.toUpperCase()}
                  </span>
                </td>
                <td style={styles.td}>
                  {p.status_text === 'pending' && (
                    <button 
                      onClick={() => deps.onMakeJob && deps.onMakeJob(p)}
                      style={{ background: '#1d4ed8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                    >
                      Make Job
                    </button>
                  )}
                </td>
              </tr>
              ))}

            {planning.length === 0 && !isLoading && (
              <tr><td colSpan="12" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#6b7280' }}>No pending planning entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

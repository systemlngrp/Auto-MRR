import React, { useEffect, useState } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function PendingApprovalPage({ deps = {}, onBack }) {
  const { fetchOrders, approveOrder, firm = {}, currentUser = {} } = deps;
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrders(firm, 'pending_approval');
      setOrders(data || []);
    } catch (err) {
      alert('Error loading orders: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [firm.firmKey]);

  const handleApprove = async () => {
    if (!approvingId) return;
    try {
      await approveOrder(firm, approvingId, currentUser.email);
      setApprovingId(null);
      loadOrders();
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  };

  const styles = {
    container: { padding: '24px', background: '#f9fafb', minHeight: '100vh' },
    title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' },
    card: { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { background: '#1d4ed8', color: '#fff', textAlign: 'left', padding: '12px', fontSize: '14px' },
    td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    btnPrimary: { background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    btnBack: { background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={styles.title}>Orders Pending Approval</h1>
        <button onClick={onBack} style={styles.btnBack}>Back</button>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order ID</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Sales Person</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.order_id}>
                <td style={styles.td}>{o.order_id}</td>
                <td style={styles.td}>{o.order_date}</td>
                <td style={styles.td}>{o.company_name}</td>
                <td style={styles.td}>{o.item_name}</td>
                <td style={styles.td}>{Number(o.qty).toLocaleString()}</td>
                <td style={styles.td}>{Number(o.rate).toFixed(2)}</td>
                <td style={styles.td}>{o.sales_person}</td>
                <td style={styles.td}>
                  <button onClick={() => setApprovingId(o.order_id)} style={styles.btnPrimary}>Approve</button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && !isLoading && (
              <tr><td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#6b7280' }}>No orders pending approval.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={!!approvingId}
        title="Approve Order"
        message={`Are you sure you want to approve Order ${approvingId}? It will move to Scheduling.`}
        onConfirm={handleApprove}
        onCancel={() => setApprovingId(null)}
      />
    </div>
  );
}

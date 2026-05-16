import React, { useEffect, useState } from 'react';

export default function PendingSchedulingPage({ deps = {}, onBack }) {
  const { fetchOrders, saveOrderSchedule, firm = {} } = deps;
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [schedulingOrder, setSchedulingOrder] = useState(null);
  const [scheduleData, setScheduleData] = useState({ date: new Date().toISOString().split('T')[0], qty: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrders(firm, 'pending_scheduling');
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

  const handleOpenSchedule = (order) => {
    setSchedulingOrder(order);
    setScheduleData({ date: new Date().toISOString().split('T')[0], qty: String(order.pending_scheduling_qty || 0) });
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingOrder) return;

    const qty = Number(scheduleData.qty);
    if (!scheduleData.date || isNaN(qty) || qty <= 0) {
      alert('Valid Date and Quantity are required.');
      return;
    }

    if (qty > Number(schedulingOrder.pending_scheduling_qty) + 0.0001) {
      alert('Scheduled Qty cannot exceed Pending Scheduling Qty.');
      return;
    }

    if (Number(schedulingOrder.schedule_count) >= 10) {
      alert('Maximum 10 schedules reached.');
      return;
    }

    setIsSaving(true);
    try {
      await saveOrderSchedule(firm, schedulingOrder.order_id, scheduleData.date, qty);
      setSchedulingOrder(null);
      loadOrders();
    } catch (err) {
      alert('Failed to save schedule: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const styles = {
    container: { padding: '24px', background: '#f9fafb', minHeight: '100vh' },
    title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' },
    card: { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { background: '#1d4ed8', color: '#fff', textAlign: 'left', padding: '12px', fontSize: '14px' },
    td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    btnBack: { background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' },
    input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={styles.title}>Orders Pending Scheduling</h1>
        <button onClick={onBack} style={styles.btnBack}>Back</button>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Order ID</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Total Qty</th>
              <th style={styles.th}>Scheduled</th>
              <th style={styles.th}>Pending</th>
              <th style={styles.th}>Schedules</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.order_id}>
                <td style={styles.td}>{o.order_id}</td>
                <td style={styles.td}>{o.company_name}</td>
                <td style={styles.td}>{o.item_name}</td>
                <td style={styles.td}>{Number(o.qty).toLocaleString()}</td>
                <td style={styles.td}>{Number(o.total_scheduled).toLocaleString()}</td>
                <td style={styles.td}>{Number(o.pending_scheduling_qty).toLocaleString()}</td>
                <td style={styles.td}>{o.schedule_count} / 10</td>
                <td style={styles.td}>
                  <button onClick={() => handleOpenSchedule(o)} style={styles.btnPrimary}>Schedule</button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && !isLoading && (
              <tr><td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#6b7280' }}>No orders pending scheduling.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {schedulingOrder && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Schedule Order: {schedulingOrder.order_id}</h2>
            <form onSubmit={handleSaveSchedule}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Scheduled Date</label>
                <input 
                  type="date" 
                  value={scheduleData.date} 
                  onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity (Max: {schedulingOrder.pending_scheduling_qty})</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={scheduleData.qty} 
                  onChange={e => setScheduleData({ ...scheduleData, qty: e.target.value })}
                  style={styles.input}
                  placeholder="Enter quantity"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setSchedulingOrder(null)} style={{ ...styles.btnBack, flex: 1 }} disabled={isSaving}>Cancel</button>
                <button type="submit" style={{ ...styles.btnPrimary, flex: 1, padding: '10px' }} disabled={isSaving}>
                  {isSaving ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

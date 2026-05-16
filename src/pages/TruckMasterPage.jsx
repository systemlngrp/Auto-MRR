import React, { useState, useEffect, useMemo } from 'react';
import * as sheetSync from '../sheetSync';
import { pageStyles } from '../styles/pageStyles';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function TruckMasterPage({ firm, currentUser, onBack }) {
  const [trucks, setTrucks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTruck, setEditingTruck] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [truckToDelete, setTruckToDelete] = useState(null);

  const [formData, setFormData] = useState({
    truck_number: '',
    driver_name: '',
    driver_mobile: '',
    transporter_name: '',
    vehicle_type: '',
    capacity: '',
    status: 'Active'
  });

  useEffect(() => {
    loadTrucks();
  }, [firm]);

  async function loadTrucks() {
    setIsLoading(true);
    setError('');
    try {
      const data = await sheetSync.fetchTruckMaster(firm);
      setTrucks(data);
    } catch (err) {
      setError(err.message || 'Failed to load trucks');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredTrucks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return trucks;
    return trucks.filter(t => 
      String(t.truck_number || '').toLowerCase().includes(term) ||
      String(t.driver_name || '').toLowerCase().includes(term) ||
      String(t.transporter_name || '').toLowerCase().includes(term)
    );
  }, [trucks, searchTerm]);

  function handleAdd() {
    setEditingTruck(null);
    setFormData({
      truck_number: '',
      driver_name: '',
      driver_mobile: '',
      transporter_name: '',
      vehicle_type: '',
      capacity: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  }

  function handleEdit(truck) {
    setEditingTruck(truck);
    setFormData({
      truck_number: truck.truck_number || '',
      driver_name: truck.driver_name || '',
      driver_mobile: truck.driver_mobile || '',
      transporter_name: truck.transporter_name || '',
      vehicle_type: truck.vehicle_type || '',
      capacity: truck.capacity || '',
      status: truck.status || 'Active'
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.truck_number.trim()) {
      alert('Truck Number is required');
      return;
    }
    setIsLoading(true);
    try {
      const payload = { ...formData };
      if (editingTruck) payload.id = editingTruck.id;
      await sheetSync.saveTruckMaster(firm, payload);
      setIsModalOpen(false);
      loadTrucks();
    } catch (err) {
      alert(err.message || 'Failed to save truck');
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDelete(truck) {
    setTruckToDelete(truck);
    setIsDeleting(true);
  }

  async function handleDelete() {
    if (!truckToDelete) return;
    setIsLoading(true);
    try {
      await sheetSync.deleteTruckMaster(firm, truckToDelete.id);
      setIsDeleting(false);
      setTruckToDelete(null);
      loadTrucks();
    } catch (err) {
      alert(err.message || 'Failed to delete truck');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={pageStyles.pageContainer}>
      <div style={pageStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} className="inv-back-btn">←</button>
          <h2 style={pageStyles.pageTitle}>🚛 Truck Master</h2>
        </div>
        <button onClick={handleAdd} className="inv-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>+</span> Add New Truck
        </button>
      </div>

      {error && <div style={pageStyles.errorBanner}>{error}</div>}

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by Number, Driver or Transporter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...pageStyles.input, paddingLeft: '35px' }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
        </div>
        <button onClick={loadTrucks} className="inv-btn-secondary" disabled={isLoading}>
          {isLoading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {isLoading && trucks.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚚</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading trucks data...</div>
          </div>
        ) : filteredTrucks.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>No trucks found matching "{searchTerm}"</div>
            <button onClick={() => setSearchTerm('')} style={{ marginTop: '12px', color: 'var(--primary)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Clear Search</button>
          </div>
        ) : (
          filteredTrucks.map(truck => (
            <div key={truck.id} className="inv-card" style={{ 
              margin: 0, 
              padding: '0', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              background: '#fff',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderColor = 'var(--primary)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}>
              <div style={{ 
                padding: '16px 20px', 
                background: truck.status === 'Active' ? '#f0fdf4' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>#{truck.id}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', letterSpacing: '0.5px' }}>{truck.truck_number}</div>
                </div>
                <span className={`inv-badge ${truck.status === 'Active' ? 'green' : 'gray'}`} style={{ 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {truck.status === 'Active' ? '● Active' : '○ Inactive'}
                </span>
              </div>

              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span>🏢</span> Transporter
                  </label>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>{truck.transporter_name || 'Not Assigned'}</div>
                </div>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span>👨‍✈️</span> Driver
                  </label>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>{truck.driver_name || '-'}</div>
                </div>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span>📱</span> Contact
                  </label>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>{truck.driver_mobile || '-'}</div>
                </div>

                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Vehicle Type</label>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>{truck.vehicle_type || 'Unknown'}</div>
                </div>
                
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Capacity</label>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>{truck.capacity} <span style={{ fontSize: '12px', fontWeight: '600' }}>KG</span></div>
                </div>
              </div>

              <div style={{ 
                padding: '12px 20px', 
                background: '#f8fafc', 
                display: 'flex', 
                gap: '12px', 
                borderTop: '1px solid #e2e8f0' 
              }}>
                <button onClick={() => handleEdit(truck)} style={{ 
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: '10px', 
                  background: '#fff', 
                  border: '1px solid #e2e8f0',
                  color: '#2563eb',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }} onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <span>✏️</span> Edit
                </button>
                <button onClick={() => confirmDelete(truck)} style={{ 
                  padding: '10px 16px', 
                  borderRadius: '10px', 
                  background: '#fff', 
                  border: '1px solid #fee2e2',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}>
                  <span>🗑️</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '550px', borderRadius: '20px' }}>
            <div className="inv-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{editingTruck ? '✏️ Edit Truck Info' : '🚛 Add New Truck'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="inv-modal-close" style={{ fontSize: '24px' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={pageStyles.label}>Truck Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.G. MH-01-AB-1234"
                    value={formData.truck_number}
                    onChange={(e) => setFormData({ ...formData, truck_number: e.target.value.toUpperCase() })}
                    style={{ ...pageStyles.input, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}
                  />
                </div>
                <div>
                  <label style={pageStyles.label}>Driver Name</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    style={pageStyles.input}
                  />
                </div>
                <div>
                  <label style={pageStyles.label}>Driver Mobile</label>
                  <input
                    type="tel"
                    placeholder="10 Digit Number"
                    value={formData.driver_mobile}
                    onChange={(e) => setFormData({ ...formData, driver_mobile: e.target.value })}
                    style={pageStyles.input}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={pageStyles.label}>Transporter Name</label>
                  <input
                    type="text"
                    placeholder="Company or Person Name"
                    value={formData.transporter_name}
                    onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                    style={pageStyles.input}
                  />
                </div>
                <div>
                  <label style={pageStyles.label}>Vehicle Type</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    style={pageStyles.input}
                  >
                    <option value="">Select Type</option>
                    <option value="Open Truck">Open Truck</option>
                    <option value="Container">Container</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Tempo">Tempo</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={pageStyles.label}>Capacity (KG)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    style={pageStyles.input}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={pageStyles.label}>Status</label>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" checked={formData.status === 'Active'} onChange={() => setFormData({...formData, status: 'Active'})} /> 
                      <span style={{ fontWeight: '600', color: '#16a34a' }}>Active</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" checked={formData.status === 'Inactive'} onChange={() => setFormData({...formData, status: 'Inactive'})} /> 
                      <span style={{ fontWeight: '600', color: '#dc2626' }}>Inactive</span>
                    </label>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="inv-btn-secondary" style={{ padding: '12px 24px' }}>Cancel</button>
                <button type="submit" disabled={isLoading} className="inv-btn-primary" style={{ padding: '12px 30px', borderRadius: '12px' }}>
                  {isLoading ? 'Processing...' : (editingTruck ? 'Update Truck' : 'Save Truck')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleting && (
        <ConfirmModal
          title="Delete Truck"
          message={`Are you sure you want to permanently delete truck ${truckToDelete?.truck_number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleting(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

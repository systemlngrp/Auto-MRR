import React, { useState, useEffect, useMemo } from 'react';
import * as sheetSync from '../sheetSync';
import { appStyles } from '../styles/appStyles';
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
    <div style={appStyles.pageContainer}>
      <div style={appStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} className="inv-back-btn">←</button>
          <h2 style={appStyles.pageTitle}>Truck Master</h2>
        </div>
        <button onClick={handleAdd} className="inv-btn-primary">Add Truck</button>
      </div>

      {error && <div style={appStyles.errorBanner}>{error}</div>}

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by Truck Number, Driver or Transporter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...appStyles.input, width: '100%', maxWidth: '400px' }}
        />
      </div>

      <div className="inv-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="inv-table">
          <thead>
            <tr>
              <th>Truck ID</th>
              <th>Truck Number</th>
              <th>Driver Name</th>
              <th>Driver Mobile</th>
              <th>Transporter</th>
              <th>Vehicle Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && trucks.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
            ) : filteredTrucks.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No trucks found.</td></tr>
            ) : (
              filteredTrucks.map(truck => (
                <tr key={truck.id}>
                  <td>{truck.id}</td>
                  <td style={{ fontWeight: 'bold' }}>{truck.truck_number}</td>
                  <td>{truck.driver_name}</td>
                  <td>{truck.driver_mobile}</td>
                  <td>{truck.transporter_name}</td>
                  <td>{truck.vehicle_type}</td>
                  <td>{truck.capacity}</td>
                  <td>
                    <span className={`inv-badge ${truck.status === 'Active' ? 'green' : 'gray'}`}>
                      {truck.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleEdit(truck)} className="inv-btn-text blue">Edit</button>
                      <button onClick={() => confirmDelete(truck)} className="inv-btn-text red">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '500px' }}>
            <div className="inv-modal-header">
              <h3>{editingTruck ? 'Edit Truck' : 'Add New Truck'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="inv-modal-close">×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={appStyles.label}>Truck Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.truck_number}
                    onChange={(e) => setFormData({ ...formData, truck_number: e.target.value.toUpperCase() })}
                    style={appStyles.input}
                  />
                </div>
                <div>
                  <label style={appStyles.label}>Driver Name</label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    style={appStyles.input}
                  />
                </div>
                <div>
                  <label style={appStyles.label}>Driver Mobile</label>
                  <input
                    type="text"
                    value={formData.driver_mobile}
                    onChange={(e) => setFormData({ ...formData, driver_mobile: e.target.value })}
                    style={appStyles.input}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={appStyles.label}>Transporter Name</label>
                  <input
                    type="text"
                    value={formData.transporter_name}
                    onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                    style={appStyles.input}
                  />
                </div>
                <div>
                  <label style={appStyles.label}>Vehicle Type</label>
                  <input
                    type="text"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    style={appStyles.input}
                  />
                </div>
                <div>
                  <label style={appStyles.label}>Capacity</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    style={appStyles.input}
                  />
                </div>
                <div>
                  <label style={appStyles.label}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={appStyles.input}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="inv-btn-secondary">Cancel</button>
                <button type="submit" disabled={isLoading} className="inv-btn-primary">
                  {isLoading ? 'Saving...' : 'Save Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleting && (
        <ConfirmModal
          title="Delete Truck"
          message={`Are you sure you want to delete truck ${truckToDelete?.truck_number}?`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleting(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

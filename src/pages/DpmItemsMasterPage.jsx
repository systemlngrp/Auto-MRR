import React, { useEffect, useMemo, useState, useDeferredValue } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';
import { pageStyles } from '../styles/pageStyles';

const ALL_FIELDS = [
  'ERP', 'Item Name', 'BOX TYPE', 'Company Id', 'Customer Name', 'Rate', 'Flute Type', 'Ply', 
  'No Of Parts', 'No Of Ups', 'Id to Od 2', 'Length (ID)', 'Breadth (ID)', 'Height (ID)', 
  'Length (OD)', 'Breadth (OD)', 'Height (OD)', 'PS-L1', 'PS L1-BF', 'PS F1', 'PS F1-BF', 
  'PS L2', 'PS L2-BF', 'PS F2', 'PS F2-BF', 'PS L3', 'PS L3-BF', 'Material Weight inside in One Box', 
  'Stack Height', 'Safety Factor', 'CS (Kg) Std', 'CS (Kg) Target', 'BS (kg/cm2) Std', 
  'BS (kg/cm2) Calculated', 'Take up Factor', 'UPS', 'RAPC', 'Cutting with Trimming', 
  'Standard Weight(gms)', 'Calculated Weight per Box', 'Standard B GSM', 'Calculated B GSM', 
  'Stitching/Gluing', 'RSL1', 'RSL1-BF', 'RSF2', 'RSF2-BF', 'RSL3', 'RSL3-BF', 'RSF4', 
  'RSF4-BF', 'RSL5', 'RSF5-BF', 'Flap Size', 'Color Id 1', 'Printing Colour 1', 'Color Id 2', 
  'Printing Colour 2', 'PLAIN BOX', 'Whether Plate Applicable', 'Whether PHP Applicable', 
  'No. of Boxes per Sheet in case of Die Cut Box', 'Reel Size', 'Cutting Size', 
  'Rapc for single box', 'No Of Die Cut Ups(No Of Boxes In One Die Sheet)', 'NPD ID', 
  'Source Timestamp', 'Last Sync Timestamp', 'Sync Status'
];

const SUMMARY_FIELDS = ['ERP', 'Item Name', 'Customer Name', 'BOX TYPE', 'Ply', 'Rate'];

export default function DpmItemsMasterPage({ deps = {}, onBack }) {
  const { fetchDpmItems, saveDpmItems, deleteDpmItem, firm = {} } = deps;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDpmItems(firm);
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load DPM items:', err);
      alert('Error loading items: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [firm.firmKey]);

  const filteredItems = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    if (!q) return items;
    return items.filter(it => 
      (it.erp || '').toLowerCase().includes(q) || 
      (it.item_name || '').toLowerCase().includes(q) ||
      (it.customer_name || '').toLowerCase().includes(q)
    );
  }, [items, deferredSearch]);

  const handleEdit = (item) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    const newItem = {};
    ALL_FIELDS.forEach(f => { newItem[f] = ''; });
    setEditingItem(newItem);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingItem.ERP) {
      alert('ERP code is required.');
      return;
    }
    
    setIsSaving(true);
    try {
      await saveDpmItems(firm, editingItem);
      setIsModalOpen(false);
      loadItems();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDpmItem(firm, confirmDelete.erp);
      setConfirmDelete(null);
      loadItems();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setEditingItem(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ ...pageStyles.pageContainer, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={pageStyles.pageTitle}>DPM Items Master (Production)</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Search ERP, Name, Customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...pageStyles.input, width: '300px' }}
          />
          <button onClick={handleAddNew} style={pageStyles.primaryButton}>+ Add Item</button>
          <button onClick={loadItems} style={pageStyles.secondaryButton}>Refresh</button>
          <button onClick={onBack} style={pageStyles.secondaryButton}>Back</button>
        </div>
      </div>

      <div style={pageStyles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={pageStyles.table}>
            <thead>
              <tr style={pageStyles.tableHeaderRow}>
                {SUMMARY_FIELDS.map(f => (
                  <th key={f} style={pageStyles.tableHeaderCell}>{f}</th>
                ))}
                <th style={pageStyles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr key={item.erp || idx} style={idx % 2 === 0 ? {} : { backgroundColor: '#f9fafb' }}>
                  {SUMMARY_FIELDS.map(f => (
                    <td key={f} style={pageStyles.tableCell}>{item[f] || item[f.toLowerCase()] || '-'}</td>
                  ))}
                  <td style={{ ...pageStyles.tableCell, whiteSpace: 'nowrap' }}>
                    <button onClick={() => handleEdit(item)} style={{ ...pageStyles.secondaryButton, padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}>Edit</button>
                    <button onClick={() => setConfirmDelete(item)} style={{ ...pageStyles.secondaryButton, padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={SUMMARY_FIELDS.length + 1} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        <button onClick={onBack} style={{ ...pageStyles.secondaryButton, minWidth: '120px' }}>Back</button>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '24px', borderRadius: '8px',
            width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>
              {editingItem.id ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {ALL_FIELDS.map(f => (
                  <div key={f}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>{f}</label>
                    <input 
                      type="text"
                      value={editingItem[f] || ''}
                      onChange={(e) => handleInputChange(f, e.target.value)}
                      style={pageStyles.input}
                      required={f === 'ERP'}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={pageStyles.secondaryButton} disabled={isSaving}>Cancel</button>
                <button type="submit" style={pageStyles.primaryButton} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal 
          isOpen={!!confirmDelete}
          title="Delete Item"
          message={`Are you sure you want to delete item ${confirmDelete.erp}?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

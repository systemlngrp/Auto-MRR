import React, { useEffect, useMemo, useState, useDeferredValue } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';
import { pageStyles } from '../styles/pageStyles';

const ALL_FIELDS = [
  'ERP CODE',
  'Item Name',
  'Company Name',
  'No. of Parts',
  'Length',
  'Bredth',
  'Height',
  'PLY',
  'FLUTE',
  'L1',
  'F1',
  'L2',
  'F2',
  'L3',
  'PLATE/PHP WEIGHT',
  'RATE',
  'Opening Balance',
  'Receipt',
  'Production',
  'Dispatch',
  'Balance',
  'RAPC',
  'UPS',
  'New RAPC',
  'CUTTING with TRIMMING',
  'ID to OD 2',
  'Take Up Factor',
  'Deviation',
  'Flap',
  'No. of Ups for RAPC',
  'Cutting Size',
  'Category',
  'Open Length',
  'Open Width',
  'No. of Die Cut Ups (Cutting)',
  'No. of Die Cut Ups (Reel)',
];

const SUMMARY_FIELDS = ALL_FIELDS;

const FIELD_ALIASES = {
  'ERP CODE': ['ERP CODE', 'erp', 'ERP'],
  'Item Name': ['Item Name', 'item_name'],
  'Company Name': ['Company Name', 'customer_name', 'Customer Name'],
  'PLATE/PHP WEIGHT': ['PLATE/PHP WEIGHT', 'plate_php_weight', 'plate/php weight'],
  'No. of Parts': ['No. of Parts', 'no_of_parts', 'no. of parts'],
  'Bredth': ['Bredth', 'breadth'],
  'CUTTING with TRIMMING': ['CUTTING with TRIMMING', 'cutting_with_trimming'],
  'ID to OD 2': ['ID to OD 2', 'id_to_od_2'],
  'Take Up Factor': ['Take Up Factor', 'take_up_factor'],
  'No. of Ups for RAPC': ['No. of Ups for RAPC', 'ups_for_rapc', 'no. of ups for rapc'],
  'No. of Die Cut Ups (Cutting)': ['No. of Die Cut Ups (Cutting)', 'die_cut_ups_cutting', 'no. of die cut ups (cutting)'],
  'No. of Die Cut Ups (Reel)': ['No. of Die Cut Ups (Reel)', 'die_cut_ups_reel', 'no. of die cut ups (reel)'],
};

function getFieldValue(item, field) {
  const candidates = FIELD_ALIASES[field] || [field, field.toLowerCase(), field.replace(/\s/g, '_').toLowerCase()];
  for (const key of candidates) {
    if (key in item && item[key] !== null && String(item[key]).trim() !== '') return item[key];
  }
  return '';
}

export default function DpmItemsMasterPage({ deps = {}, onBack }) {
  const { fetchDpmItems, saveDpmItems, deleteDpmItem, syncDpmItemsFromSheets, firm = {} } = deps;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isSyncing, setIsSyncing] = useState(false);
  
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

  const handleRefresh = async () => {
    if (typeof syncDpmItemsFromSheets !== 'function') {
      await loadItems();
      return;
    }

    setIsSyncing(true);
    try {
      await syncDpmItemsFromSheets(firm);
    } catch (err) {
      console.error('Failed to sync DPM items from Sheets:', err);
      alert('Sync failed: ' + (err?.message || String(err)));
    } finally {
      setIsSyncing(false);
    }

    await loadItems();
  };

  const filteredItems = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    if (!q) return items;
    return items.filter(it => 
      (it.erp || it['ERP CODE'] || '').toString().toLowerCase().includes(q) || 
      (it.item_name || it['Item Name'] || '').toString().toLowerCase().includes(q) ||
      (it.customer_name || it['Company Name'] || '').toString().toLowerCase().includes(q) ||
      (it.category || it['Category'] || '').toString().toLowerCase().includes(q)
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
    if (!editingItem['ERP CODE'] && !editingItem.erp) {
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
    const erp = confirmDelete.erp || confirmDelete['ERP CODE'];
    try {
      await deleteDpmItem(firm, erp);
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
            placeholder="Search ERP, Name, Company, Category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...pageStyles.input, width: '300px' }}
          />
          <button onClick={handleAddNew} style={pageStyles.primaryButton}>+ Add Item</button>
          <button onClick={handleRefresh} style={pageStyles.secondaryButton} disabled={isLoading || isSyncing}>
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </button>
          <button onClick={onBack} style={pageStyles.secondaryButton}>Back</button>
        </div>
      </div>

      <div style={pageStyles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...pageStyles.table, fontSize: '11px' }}>
            <thead>
              <tr style={pageStyles.tableHeaderRow}>
                {SUMMARY_FIELDS.map(f => (
                  <th key={f} style={{ ...pageStyles.tableHeaderCell, whiteSpace: 'nowrap', padding: '6px 8px' }}>{f}</th>
                ))}
                <th style={{ ...pageStyles.tableHeaderCell, padding: '6px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr key={(item.erp || item['ERP CODE']) + '-' + idx} style={idx % 2 === 0 ? {} : { backgroundColor: '#f9fafb' }}>
                  {SUMMARY_FIELDS.map(f => (
                    <td key={f} style={{ ...pageStyles.tableCell, whiteSpace: 'nowrap', padding: '4px 8px' }}>
                      {getFieldValue(item, f) || '-'}
                    </td>
                  ))}
                  <td style={{ ...pageStyles.tableCell, whiteSpace: 'nowrap', padding: '4px 8px' }}>
                    <button onClick={() => handleEdit(item)} style={{ ...pageStyles.secondaryButton, padding: '2px 6px', fontSize: '10px', marginRight: '4px' }}>Edit</button>
                    <button onClick={() => setConfirmDelete(item)} style={{ ...pageStyles.secondaryButton, padding: '2px 6px', fontSize: '10px', color: '#dc2626' }}>Del</button>
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
                      value={getFieldValue(editingItem, f)}
                      onChange={(e) => handleInputChange(f, e.target.value)}
                      style={pageStyles.input}
                      required={f === 'ERP CODE'}
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
          message={`Are you sure you want to delete item ${confirmDelete.erp || confirmDelete['ERP CODE']}?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

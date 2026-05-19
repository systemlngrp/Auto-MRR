import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from '../components/layout/SearchableSelect';

export default function OrderFormPage({ selectedFirm, deps, onBack, onSaved }) {
  const { fetchCompanyMaster, fetchDpmItems, saveOrder, fetchOrders } = deps;

  const [companies, setCompanies] = useState([]);
  const [items, setItems] = useState([]);
  const [existingOrders, setExistingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const getFinancialYearString = () => {
    const d = new Date();
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear();
    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;
    return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  };

  const [formData, setFormData] = useState({
    order_date: today,
    company_name: '',
    po_type: 'Verbal', // 'Verbal' | 'Ref No.'
    po_number: '',
    item: '',
    qty: '0.00',
    rate: '0.00',
    remarks: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function loadData() {
      if (!selectedFirm) return;
      setIsLoading(true);
      try {
        const [companyData, itemData, orderData] = await Promise.all([
          fetchCompanyMaster({ spreadsheetId: selectedFirm.spreadsheetId }),
          fetchDpmItems(selectedFirm),
          fetchOrders ? fetchOrders(selectedFirm) : Promise.resolve([])
        ]);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setItems(Array.isArray(itemData) ? itemData : []);
        setExistingOrders(Array.isArray(orderData) ? orderData : []);
      } catch (err) {
        console.error(err);
        setStatus('Error loading data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedFirm]);

  // Handle Verbal PO Auto-suggestion
  useEffect(() => {
    if (formData.po_type === 'Verbal' && !formData.po_number && existingOrders.length > 0) {
      const fy = getFinancialYearString();
      const prefix = `${fy}/`;
      
      const verbalOrders = existingOrders.filter(o => 
        String(o.po_number || '').startsWith(prefix)
      );
      
      let maxSeq = 0;
      verbalOrders.forEach(o => {
        const part = String(o.po_number).split('/')[1];
        const seq = parseInt(part);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      });
      
      const nextSeq = String(maxSeq + 1).padStart(3, '0');
      setFormData(prev => ({ ...prev, po_number: `${prefix}${nextSeq}` }));
    }
  }, [formData.po_type, existingOrders]);

  const companyOptions = useMemo(() => {
    return companies
      .map(c => String(c.company_name || c.name || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [companies]);

  const itemOptions = useMemo(() => {
    return items
      .map(it => String(it.item_name || it['Item Name'] || it.erp || it.ERP || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [items]);

  const validate = () => {
    const nextErrors = {};
    if (!formData.order_date) nextErrors.order_date = true;
    if (!formData.company_name) nextErrors.company_name = true;
    if (!formData.po_number) nextErrors.po_number = true;
    if (!formData.item) nextErrors.item = true;
    
    const qtyNum = parseFloat(formData.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) nextErrors.qty = true;

    const rateNum = parseFloat(formData.rate);
    if (isNaN(rateNum) || rateNum <= 0) nextErrors.rate = true;

    // Uniqueness check: po_number + item
    const isDuplicate = existingOrders.some(o => 
      String(o.po_number).toLowerCase().trim() === String(formData.po_number).toLowerCase().trim() &&
      String(o.item_name || o.item).toLowerCase().trim() === String(formData.item).toLowerCase().trim() &&
      String(o.company_name).toLowerCase().trim() === String(formData.company_name).toLowerCase().trim()
    );

    if (isDuplicate) {
      alert(`PO Number "${formData.po_number}" already exists for this item and company.`);
      nextErrors.po_number = true;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      setIsLoading(true);
      setStatus('Saving order...');
      try {
        const orderData = {
          ...formData,
          erp_code: items.find(it => (it.item_name || it['Item Name'] || it.erp || it.ERP) === formData.item)?.erp || '',
          item_name: formData.item
        };
        const res = await saveOrder(selectedFirm, orderData);
        if (res?.ok) {
          setStatus('Order saved successfully!');
          if (onSaved) onSaved(res);
        } else {
          throw new Error(res?.error || 'Failed to save order.');
        }
      } catch (err) {
        setStatus('Error: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setStatus('Please fill all required fields correctly.');
    }
  };

  const updateNumeric = (field, delta) => {
    setFormData(prev => {
      const val = parseFloat(prev[field]) || 0;
      const next = Math.max(0, val + delta);
      return { ...prev, [field]: next.toFixed(2) };
    });
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#f0ebf8',
      padding: '24px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Roboto, Arial, sans-serif'
    },
    headerCard: {
      width: '100%',
      maxWidth: '640px',
      background: '#fff',
      borderRadius: '8px',
      borderTop: '10px solid #673ab7',
      padding: '24px',
      marginBottom: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
    },
    title: {
      fontSize: '32px',
      margin: '0 0 12px 0',
      color: '#202124'
    },
    description: {
      fontSize: '14px',
      color: '#202124'
    },
    questionCard: (hasError) => ({
      width: '100%',
      maxWidth: '640px',
      background: '#fff',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      border: hasError ? '1px solid #d93025' : '1px solid transparent'
    }),
    label: {
      display: 'block',
      fontSize: '16px',
      fontWeight: '500',
      color: '#202124',
      marginBottom: '16px'
    },
    input: {
      width: '100%',
      border: 'none',
      borderBottom: '1px solid #d1d5db',
      padding: '8px 0',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-bottom 0.2s',
      ':focus': {
        borderBottom: '2px solid #673ab7'
      }
    },
    select: {
      width: '100%',
      padding: '8px 0',
      border: 'none',
      borderBottom: '1px solid #d1d5db',
      outline: 'none',
      fontSize: '14px'
    },
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    radioItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    footer: {
      width: '100%',
      maxWidth: '640px',
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '12px'
    },
    btnSubmit: {
      background: '#673ab7',
      color: '#fff',
      border: 'none',
      padding: '10px 24px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    btnCancel: {
      background: 'transparent',
      color: '#673ab7',
      border: 'none',
      padding: '10px 24px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    errorText: {
      color: '#d93025',
      fontSize: '12px',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }
  };

  return (
    <div style={styles.page}>
      
      {/* Form Header */}
      <div style={styles.headerCard}>
        <h1 style={styles.title}>Sales Order Form</h1>
        <p style={styles.description}>Please fill in the details to create a new sales order. Required fields are marked *</p>
      </div>

      {/* Order Date */}
      <div style={styles.questionCard(errors.order_date)}>
        <label style={styles.label}>Order Date *</label>
        <input 
          type="date" 
          value={formData.order_date} 
          onChange={e => setFormData({ ...formData, order_date: e.target.value })}
          style={styles.input}
        />
        {errors.order_date && <div style={styles.errorText}>! This is a required question</div>}
      </div>

      {/* Company Name */}
      <div style={styles.questionCard(errors.company_name)}>
        <label style={styles.label}>Company Name *</label>
        <SearchableSelect
          value={formData.company_name}
          onChange={v => setFormData({ ...formData, company_name: v })}
          options={companyOptions}
          placeholder="Choose"
          inputStyle={{ ...styles.input, borderBottom: '1px solid #d1d5db' }}
        />
        {errors.company_name && <div style={styles.errorText}>! This is a required question</div>}
      </div>

      {/* PO Type */}
      <div style={styles.questionCard(false)}>
        <label style={styles.label}>PO Type *</label>
        <div style={styles.radioGroup}>
          {['Verbal', 'Ref No.'].map(type => (
            <label key={type} style={styles.radioItem}>
              <input 
                type="radio" 
                checked={formData.po_type === type}
                onChange={() => setFormData({ ...formData, po_type: type, po_number: type === 'Ref No.' ? '' : formData.po_number })}
              />
              <span style={{ fontSize: '14px' }}>{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* PO Number */}
      <div style={styles.questionCard(errors.po_number)}>
        <label style={styles.label}>PO Number *</label>
        <input
          type="text"
          value={formData.po_number}
          onChange={e => setFormData({ ...formData, po_number: e.target.value })}
          placeholder="Your answer"
          style={styles.input}
        />
        {errors.po_number && <div style={styles.errorText}>! Must be unique for the selected item</div>}
      </div>

      {/* Item */}
      <div style={styles.questionCard(errors.item)}>
        <label style={styles.label}>Item *</label>
        <SearchableSelect
          value={formData.item}
          onChange={v => setFormData({ ...formData, item: v })}
          options={itemOptions}
          placeholder="Choose"
          inputStyle={{ ...styles.input, borderBottom: '1px solid #d1d5db' }}
        />
        {errors.item && <div style={styles.errorText}>! This is a required question</div>}
      </div>

      {/* Qty */}
      <div style={styles.questionCard(errors.qty)}>
        <label style={styles.label}>Quantity *</label>
        <input
          type="text"
          inputMode="decimal"
          value={formData.qty}
          onChange={e => setFormData({ ...formData, qty: e.target.value.replace(/[^\d.]/g, '') })}
          placeholder="Your answer"
          style={styles.input}
        />
        {errors.qty && <div style={styles.errorText}>! Must be a positive number</div>}
      </div>

      {/* PO Rate */}
      <div style={styles.questionCard(errors.rate)}>
        <label style={styles.label}>PO Rate *</label>
        <input
          type="text"
          inputMode="decimal"
          value={formData.rate}
          onChange={e => setFormData({ ...formData, rate: e.target.value.replace(/[^\d.]/g, '') })}
          placeholder="Your answer"
          style={styles.input}
        />
        {errors.rate && <div style={styles.errorText}>! Must be a positive number</div>}
      </div>

      {/* Remarks */}
      <div style={styles.questionCard(false)}>
        <label style={styles.label}>Remarks</label>
        <input
          type="text"
          value={formData.remarks}
          onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="Your answer"
          style={styles.input}
        />
      </div>

      {status && (
        <div style={{ ...styles.questionCard(false), background: '#fff' }}>
          <p style={{ margin: 0, color: status.includes('Error') ? '#d93025' : '#1e8e3e', fontWeight: '500' }}>
            {status}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={styles.footer}>
        <button type="button" onClick={onBack} style={styles.btnCancel}>Clear form</button>
        <button 
          type="button" 
          onClick={handleSave} 
          style={{ ...styles.btnSubmit, opacity: isLoading ? 0.7 : 1 }}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Submit'}
        </button>
      </div>

      <p style={{ fontSize: '12px', color: '#70757a', marginTop: '24px', textAlign: 'center' }}>
        Never submit passwords through Google Forms.
      </p>

    </div>
  );
}

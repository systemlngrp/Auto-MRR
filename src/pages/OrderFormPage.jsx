import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from '../components/layout/SearchableSelect';

export default function OrderFormPage({ selectedFirm, deps, onBack, onSaved }) {
  const { fetchCompanyMaster, fetchDpmItems, saveOrder } = deps;

  const [companies, setCompanies] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const today = new Date().toISOString().split('T')[0];

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
        const [companyData, itemData] = await Promise.all([
          fetchCompanyMaster({ spreadsheetId: selectedFirm.spreadsheetId }),
          fetchDpmItems(selectedFirm)
        ]);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setItems(Array.isArray(itemData) ? itemData : []);
      } catch (err) {
        setStatus('Error loading data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedFirm, fetchCompanyMaster, fetchDpmItems]);

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
    if (formData.po_type === 'Ref No.' && !formData.po_number) nextErrors.po_number = true;
    if (!formData.item) nextErrors.item = true;
    
    const qtyNum = parseFloat(formData.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) nextErrors.qty = true;

    const rateNum = parseFloat(formData.rate);
    if (isNaN(rateNum) || rateNum <= 0) nextErrors.rate = true;

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

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '3px'
  };

  const inputContainerStyle = {
    marginBottom: '10px'
  };

  const inputBaseStyle = (hasError) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: `1px solid ${hasError ? '#ef4444' : '#d1d5db'}`,
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    background: '#fff'
  });

  const star = <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', position: 'relative', paddingBottom: '80px' }}>
      <div style={{ background: '#fff', padding: '14px', minHeight: 'calc(100vh - 80px)' }}>
        
        {/* Order Date */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>Order Date{star}</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="date" 
              value={formData.order_date} 
              onChange={e => setFormData({ ...formData, order_date: e.target.value })}
              style={inputBaseStyle(errors.order_date)}
            />
          </div>
        </div>

        {/* Company Name */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>Company Name{star}</label>
          <SearchableSelect
            value={formData.company_name}
            onChange={v => setFormData({ ...formData, company_name: v })}
            options={companyOptions}
            placeholder="Select Company"
            inputStyle={inputBaseStyle(errors.company_name)}
          />
        </div>

        {/* PO Type */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>PO Type{star}</label>
          <div style={{ display: 'flex', gap: '0', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, po_type: 'Verbal' })}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                background: formData.po_type === 'Verbal' ? '#1d4ed8' : '#fff',
                color: formData.po_type === 'Verbal' ? '#fff' : '#4b5563',
                cursor: 'pointer'
              }}
            >
              Verbal
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, po_type: 'Ref No.' })}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                background: formData.po_type === 'Ref No.' ? '#1d4ed8' : '#fff',
                color: formData.po_type === 'Ref No.' ? '#fff' : '#4b5563',
                cursor: 'pointer',
                borderLeft: '1px solid #d1d5db'
              }}
            >
              Ref No.
            </button>
          </div>
        </div>

        {/* PO Number */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>PO Number{formData.po_type === 'Ref No.' ? star : ''}</label>
          <input
            type="text"
            value={formData.po_number}
            onChange={e => setFormData({ ...formData, po_number: e.target.value })}
            placeholder="Enter PO Number"
            style={inputBaseStyle(errors.po_number)}
          />
        </div>

        {/* Item */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>Item{star}</label>
          <SearchableSelect
            value={formData.item}
            onChange={v => setFormData({ ...formData, item: v })}
            options={itemOptions}
            placeholder="Select Item"
            inputStyle={inputBaseStyle(errors.item)}
          />
        </div>

        {/* Qty */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>Qty{star}</label>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <input
              type="text"
              inputMode="decimal"
              value={formData.qty}
              onChange={e => {
                const val = e.target.value.replace(/[^\d.]/g, '');
                setFormData({ ...formData, qty: val });
              }}
              style={{ ...inputBaseStyle(errors.qty), paddingRight: '80px' }}
            />
            <div style={{ position: 'absolute', right: '4px', display: 'flex', gap: '4px' }}>
              <button 
                type="button" 
                onClick={() => updateNumeric('qty', -1)}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb', fontWeight: 'bold' }}
              >-</button>
              <button 
                type="button" 
                onClick={() => updateNumeric('qty', 1)}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb', fontWeight: 'bold' }}
              >+</button>
            </div>
          </div>
        </div>

        {/* PO Rate */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>PO Rate{star}</label>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <input
              type="text"
              inputMode="decimal"
              value={formData.rate}
              onChange={e => {
                const val = e.target.value.replace(/[^\d.]/g, '');
                setFormData({ ...formData, rate: val });
              }}
              style={{ ...inputBaseStyle(errors.rate), paddingRight: '80px' }}
            />
            <div style={{ position: 'absolute', right: '4px', display: 'flex', gap: '4px' }}>
              <button 
                type="button" 
                onClick={() => updateNumeric('rate', -1)}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb', fontWeight: 'bold' }}
              >-</button>
              <button 
                type="button" 
                onClick={() => updateNumeric('rate', 1)}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb', fontWeight: 'bold' }}
              >+</button>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div style={inputContainerStyle}>
          <label style={labelStyle}>Remarks</label>
          <input
            type="text"
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="Enter Remarks"
            style={inputBaseStyle(false)}
          />
        </div>

        {status && (
          <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '10px', fontWeight: '600' }}>
            {status}
          </div>
        )}

      </div>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: '12px',
        zIndex: 1000
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: '#1d4ed8',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

import React from 'react';

export default function PendingGeModal({ isOpen, onClose, pendingGEs, onSelect, formatAmount }) {
  if (!isOpen) return null;
  const pendingTableStyle = { width: '100%', tableLayout: 'auto' };
  const pendingHeaderCellStyle = { fontSize: '15px', background: '#d1d5db', color: '#111', fontWeight: 700, padding: '8px 10px' };
  const pendingBodyCellStyle = { fontSize: '12px', color: '#111', padding: '8px 10px' };
  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 10000 }}>
      <div style={{ background: '#fff', padding: '24px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Select Pending Item</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        {!pendingGEs.length ? <p>No pending entries found.</p> : (
          <table className="table" style={pendingTableStyle}>
            <thead>
              <tr>
                <th style={pendingHeaderCellStyle}>S No</th>
                <th style={pendingHeaderCellStyle}>Date</th>
                <th style={pendingHeaderCellStyle}>GE No</th>
                <th style={pendingHeaderCellStyle}>MRR No</th>
                <th style={pendingHeaderCellStyle}>Supplier</th>
                <th style={pendingHeaderCellStyle}>Invoice</th>
                <th style={pendingHeaderCellStyle}>Invoice Value</th>
                <th style={pendingHeaderCellStyle}>Truck No</th>
                <th style={pendingHeaderCellStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingGEs.map((ge, idx) => (
                <tr key={idx}>
                  <td className="c" style={pendingBodyCellStyle}>{idx + 1}</td>
                  <td style={pendingBodyCellStyle}>{ge.date}</td>
                  <td className="c" style={pendingBodyCellStyle}>{ge.ge_entry || ge.ge_no}</td>
                  <td className="c" style={pendingBodyCellStyle}>{ge.mrr_number || ge.mrr_no || ''}</td>
                  <td style={pendingBodyCellStyle}>{ge.supplier_name || ge.supplier}</td>
                  <td style={pendingBodyCellStyle}>{ge.invoice_no}</td>
                  <td style={pendingBodyCellStyle}>{formatAmount(ge.total_value || ge.total_invocie_value || ge.invoice_basic_value || '')}</td>
                  <td style={pendingBodyCellStyle}>{ge.truck_no}</td>
                  <td className="c" style={pendingBodyCellStyle}>
                    <button
                      className="btn main small"
                      style={{ fontSize: '12px', padding: '7px 12px', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1f2937'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}
                      onClick={() => onSelect(ge)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

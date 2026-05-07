import React, { useState } from 'react';

export default function GateEntrySavedModal({ isOpen, firm, entry, previewPics, onClose, formatAmount, onDownload }) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  if (!isOpen || !entry) return null;

  const previewPhotos = previewPics.filter(Boolean);

  const handlePrev = (e) => {
    e.stopPropagation();
    setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : previewPhotos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setSelectedPhotoIndex((prev) => (prev < previewPhotos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 10001 }}>
      <div style={{ background: '#fff', width: '95%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '2px solid #111', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Gate Entry</h2>
          </div>
        </div>

        <div style={{ border: '2px solid #111', padding: '32px', background: '#fff', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid #ddd', paddingBottom: '20px' }}>
            <img src={firm?.logo || 'https://i.ibb.co/Dgv0KwQ4/lnkilogo.png'} style={{ height: '60px' }} alt="Logo" />
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#444', marginTop: '8px', textTransform: 'uppercase' }}>{firm?.name || ''}</div>
            <h3 style={{ margin: '12px 0 0', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '3px', fontSize: '12px' }}>Gate Entry</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px 40px', fontSize: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>GE Entry No</span>
              <span style={{ fontWeight: 900, fontSize: '12px', color: 'var(--primary)' }}>{entry.ge_no || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>MRR No</span>
              <span style={{ fontWeight: 700 }}>{entry.mrr_no || entry.mrr_number || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Date</span>
              <span style={{ fontWeight: 700 }}>{entry.date || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Supplier</span>
              <span style={{ fontWeight: 700 }}>{entry.supplier || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Invoice No</span>
              <span style={{ fontWeight: 700 }}>{entry.invoice_no || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Invoice Value</span>
              <span style={{ fontWeight: 700 }}>{formatAmount(entry.total_value || '')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 900, textTransform: 'uppercase' }}>Truck</span>
              <span style={{ fontWeight: 700 }}>{entry.truck_no || ''}</span>
            </div>
          </div>

          {previewPhotos.length > 0 && (
            <div style={{ marginTop: '30px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
              <strong style={{ display: 'block', marginBottom: '16px', fontSize: '11px', textTransform: 'uppercase', color: '#888' }}>Attached Photos</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {previewPhotos.map((pic, index) => (
                  <div 
                    key={index} 
                    style={{ border: '1px solid #eee', padding: '6px', background: '#f9f9f9', cursor: 'pointer' }}
                    onClick={() => setSelectedPhotoIndex(index)}
                  >
                    <img src={pic} alt={`Pic ${index + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '2px' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', opacity: 0.6 }}>
            <div style={{ borderTop: '1px solid #111', width: '120px', textAlign: 'center', paddingTop: '6px', fontSize: '9px', fontWeight: 700 }}>Guard Sig.</div>
            <div style={{ borderTop: '1px solid #111', width: '120px', textAlign: 'center', paddingTop: '6px', fontSize: '9px', fontWeight: 700 }}>Receiver Sig.</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
          <button className="btn main" style={{ padding: '12px 32px', fontSize: '14px' }} onClick={() => onDownload(firm, entry, previewPics)}>
            Download PDF
          </button>
          <button className="btn" style={{ padding: '12px 32px', fontSize: '14px' }} onClick={onClose}>
            Close & Continue
          </button>
        </div>
      </div>

      {selectedPhotoIndex !== null && (
        <div 
          className="loading-overlay" 
          style={{ background: 'rgba(0,0,0,0.9)', zIndex: 10002, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <div style={{ position: 'absolute', top: '20px', right: '20px', color: '#fff', fontSize: '30px', cursor: 'pointer', fontWeight: '900' }} onClick={() => setSelectedPhotoIndex(null)}>
            ×
          </div>
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={handlePrev}
            >
              ‹
            </button>
            <img 
              src={previewPhotos[selectedPhotoIndex]} 
              alt="Large view" 
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', boxShadow: '0 0 40px rgba(0,0,0,0.5)', border: '2px solid #fff' }} 
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={handleNext}
            >
              ›
            </button>
          </div>
          <div style={{ color: '#fff', marginTop: '10px', fontSize: '14px', fontWeight: '700' }}>
            Photo {selectedPhotoIndex + 1} of {previewPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

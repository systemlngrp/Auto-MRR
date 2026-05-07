import React, { useEffect } from 'react';

export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 10002 }}>
      <div style={{ background: '#fff', padding: '22px', maxWidth: '520px', width: '92%', border: '2px solid #111', boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}>
        {title ? <h3 style={{ margin: 0, marginBottom: '10px' }}>{title}</h3> : null}
        {message ? <div style={{ fontSize: '13px', lineHeight: 1.35, color: '#111' }}>{message}</div> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn main" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}


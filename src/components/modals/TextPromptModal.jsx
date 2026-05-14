import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function TextPromptModal({
  isOpen,
  title,
  label = '',
  placeholder = '',
  initialValue = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) {
  const [value, setValue] = useState(String(initialValue || ''));
  const inputRef = useRef(null);

  const trimmed = useMemo(() => String(value || '').trim(), [value]);

  useEffect(() => {
    if (!isOpen) return;
    setValue(String(initialValue || ''));
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus?.(), 50);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.(trimmed);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel, onConfirm, trimmed]);

  if (!isOpen) return null;

  return (
    <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 10003 }}>
      <div style={{ background: '#fff', padding: '22px', maxWidth: '520px', width: '92%', border: '2px solid #111', boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}>
        {title ? <h3 style={{ margin: 0, marginBottom: '12px' }}>{title}</h3> : null}
        {label ? <div style={{ fontSize: 12, fontWeight: 900, color: '#111827', marginBottom: 6 }}>{label}</div> : null}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', border: '2px solid #111', borderRadius: 8, padding: '10px 12px', fontSize: 14 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn main" disabled={!trimmed} onClick={() => onConfirm?.(trimmed)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}


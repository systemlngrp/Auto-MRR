import React, { useEffect, useRef, useState } from 'react';

export default function ProfileMenu({ currentUser, onLogout, top = '12px', right = '14px', zIndex = 10002, fixed = true }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const displayName = currentUser?.name || currentUser?.email || 'User';
  const initials = String(displayName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (!currentUser) return null;

  return (
    <div className="no-print" ref={wrapperRef} style={fixed ? { position: 'fixed', top, right, zIndex } : { position: 'relative', zIndex }}>
      <button
        type="button"
        className="btn"
        aria-label="Open profile menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '46px',
          height: '46px',
          padding: '0',
          borderRadius: '999px',
          background: '#ffffff',
          border: '1px solid #b8b0a3',
          boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
          overflow: 'hidden'
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1f2937 0%, #475569 100%)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            flexShrink: 0
          }}
        >
          {initials}
        </span>
      </button>
      {open ? (
        <div
          style={{
            marginTop: '8px',
            marginLeft: 'auto',
            background: '#fff',
            border: '1px solid #c9c2b6',
            borderRadius: '14px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
            minWidth: '180px',
            padding: '12px'
          }}
        >
          <div style={{ padding: '0 2px 10px', borderBottom: '1px solid #ece7de', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Logged In
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#111', marginTop: '4px' }}>
              {displayName}
            </div>
          </div>
          <button
            type="button"
            className="btn"
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: '#111',
              color: '#fff',
              borderColor: '#111'
            }}
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

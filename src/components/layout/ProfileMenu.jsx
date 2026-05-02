import React, { useEffect, useRef, useState } from 'react';

export default function ProfileMenu({ currentUser, onLogout, top = '12px', right = '14px', zIndex = 10002, fixed = true }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

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
        className="btn small"
        style={{ padding: '4px 8px', background: '#111', color: '#fff', border: '1px solid #333', fontSize: '11px', fontWeight: 700 }}
        onClick={() => setOpen((v) => !v)}
      >
        {currentUser.name || currentUser.email}
      </button>
      {open ? (
        <div style={{ marginTop: '4px', background: '#fff', border: '1px solid #333', boxShadow: '0 8px 20px rgba(0,0,0,0.16)', minWidth: '120px', padding: '6px' }}>
          <button
            className="btn small"
            style={{ width: '100%', fontSize: '11px', padding: '6px 8px' }}
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

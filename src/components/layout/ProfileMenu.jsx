import React, { useEffect, useRef, useState } from 'react';

export default function ProfileMenu({
  currentUser,
  onLogout,
  onGeminiKeyUpdated,
  top = '12px',
  right = '14px',
  zIndex = 10002,
  fixed = true,
  variant = 'circle',
  shortChars = 0,
  placement = 'auto' // 'auto' | 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const wrapperRef = useRef(null);
  const displayName = currentUser?.display_name || currentUser?.displayName || currentUser?.name || currentUser?.email || 'User';
  const loginHandle = currentUser?.login_id || currentUser?.loginId || '';
  const finalDisplay = loginHandle && loginHandle !== displayName ? `${displayName} (${loginHandle})` : displayName;
  const shortLabel = shortChars > 0 ? String(loginHandle || displayName).trim().slice(0, shortChars) : String(loginHandle || displayName).trim();
  const initials = String(displayName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || (loginHandle ? loginHandle.charAt(0).toUpperCase() : 'U');

  useEffect(() => {
    if (!open) return;
    // Decide whether the menu should open upward when space below is limited.
    const decideDirection = () => {
      if (placement === 'top') return setOpenUp(true);
      if (placement === 'bottom') return setOpenUp(false);
      const wrapper = wrapperRef.current;
      if (!wrapper) return setOpenUp(false);
      const rect = wrapper.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Approx dropdown height with padding; open upwards if cramped.
      setOpenUp(spaceBelow < 220);
    };
    const updateMenuPos = () => {
      if (fixed) return setMenuPos(null);
      const wrapper = wrapperRef.current;
      if (!wrapper) return setMenuPos(null);
      const rect = wrapper.getBoundingClientRect();
      const offset = 8;
      const left = variant === 'pill' ? rect.left : rect.left + rect.width / 2;
      const top = rect.bottom + offset;
      const bottom = window.innerHeight - rect.top + offset;
      setMenuPos({
        left,
        top,
        bottom,
        width: rect.width
      });
    };
    decideDirection();
    updateMenuPos();
    const onPointerDown = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('resize', decideDirection);
    window.addEventListener('resize', updateMenuPos);
    window.addEventListener('scroll', updateMenuPos, true);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', decideDirection);
      window.removeEventListener('resize', updateMenuPos);
      window.removeEventListener('scroll', updateMenuPos, true);
    };
  }, [open, fixed, placement, variant]);

  if (!currentUser) return null;

  const setGeminiKey = () => {
    const existing = (() => {
      try {
        return String(localStorage.getItem('gemini_api_key') || '').trim();
      } catch {
        return '';
      }
    })();
    const next = window.prompt('Enter Gemini API Key (Google AI Studio). This is saved in this browser only.', existing || '');
    if (next === null) return;
    const trimmed = String(next || '').trim();
    try {
      if (!trimmed) localStorage.removeItem('gemini_api_key');
      else localStorage.setItem('gemini_api_key', trimmed);
    } catch {
    }
    onGeminiKeyUpdated?.(trimmed);
  };

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
          width: variant === 'pill' ? '100%' : '46px',
          height: variant === 'pill' ? '38px' : '46px',
          padding: variant === 'pill' ? '2px 10px' : '0',
          borderRadius: '999px',
          background: '#ffffff',
          border: '1px solid #b8b0a3',
          boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
          overflow: 'hidden',
          gap: variant === 'pill' ? '8px' : 0,
          justifyContent: variant === 'pill' ? 'flex-start' : 'center'
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          style={{
            width: variant === 'pill' ? '28px' : '36px',
            height: variant === 'pill' ? '28px' : '36px',
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
        {variant === 'pill' ? (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
            title={displayName}
          >
            {shortLabel || 'USER'}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          style={{
            position: fixed ? 'absolute' : 'fixed',
            ...(fixed
              ? (openUp ? { bottom: '54px' } : { top: '54px' })
              : (openUp ? { bottom: `${menuPos?.bottom ?? 60}px` } : { top: `${menuPos?.top ?? 60}px` })),
            ...(fixed
              ? (variant === 'pill'
                ? { left: 0, transform: 'none' }
                : { left: '50%', transform: 'translateX(-50%)' })
              : (variant === 'pill'
                ? { left: `${menuPos?.left ?? 16}px`, transform: 'none' }
                : { left: `${menuPos?.left ?? 16}px`, transform: 'translateX(-50%)' })),
            background: '#fff',
            border: '1px solid #c9c2b6',
            borderRadius: '14px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
            minWidth: variant === 'pill' && menuPos?.width ? `${Math.max(180, Math.round(menuPos.width))}px` : '180px',
            maxWidth: '260px',
            padding: '12px',
            zIndex
          }}
        >
          <div style={{ padding: '0 2px 10px', borderBottom: '1px solid #ece7de', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Logged In
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#111', marginTop: '4px' }}>
              {finalDisplay}
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
          <button
            type="button"
            className="btn"
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '10px 12px',
              borderRadius: '10px',
              marginTop: '8px',
              background: '#f9fafb',
              color: '#111827',
              borderColor: '#d1d5db',
              fontWeight: 800
            }}
            onClick={() => {
              setOpen(false);
              setGeminiKey();
            }}
          >
            Gemini API Key
          </button>
        </div>
      ) : null}
    </div>
  );
}

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  allowCustom = true,
  inputStyle = {},
  listId,
  maxVisible = 120
}) {
  const id = useMemo(() => listId || `ss-${Math.random().toString(36).slice(2)}`, [listId]);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [menuRect, setMenuRect] = useState(null);

  const normalizedOptions = useMemo(() => {
    const uniq = new Map();
    (Array.isArray(options) ? options : []).forEach((opt) => {
      const text = String(opt ?? '').trim();
      if (!text) return;
      if (!uniq.has(text.toLowerCase())) uniq.set(text.toLowerCase(), text);
    });
    // Preserve caller ordering (they may already provide numeric-sorted lists with "All" first).
    return Array.from(uniq.values());
  }, [options]);

  const filteredOptions = useMemo(() => {
    const q = String(draft || '').trim().toLowerCase();
    if (!q) return normalizedOptions.slice(0, Math.max(0, Number(maxVisible) || 0) || 120);
    const matches = normalizedOptions.filter((o) => String(o).toLowerCase().includes(q));
    return matches.slice(0, Math.max(0, Number(maxVisible) || 0) || 120);
  }, [normalizedOptions, draft, maxVisible]);

  useEffect(() => {
    if (open) return;
    setDraft(String(value ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;
      setOpen(false);
      setHighlightIndex(-1);

      if (!allowCustom) {
        const current = String(value ?? '').trim();
        if (!current) return;
        const match = normalizedOptions.find((o) => o.toLowerCase() === current.toLowerCase());
        if (!match) onChange('');
        else if (match !== value) onChange(match);
      }
    };
    document.addEventListener('mousedown', onDocDown, true);
    return () => document.removeEventListener('mousedown', onDocDown, true);
  }, [open, allowCustom, value, normalizedOptions, onChange]);

  useLayoutEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    if (!inputRef.current) return;

    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuRect({
        left: r.left,
        top: r.bottom + 6,
        width: r.width
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const applyValue = (next) => {
    onChange(next);
    setDraft(String(next ?? ''));
    setOpen(false);
    setHighlightIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  return (
    <>
      <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
        <input
          ref={inputRef}
          id={id}
          disabled={disabled}
          value={draft}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setDraft('');
          }}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            setDraft('');
          }}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (allowCustom) onChange(next);
            if (!disabled) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Escape') {
              setOpen(false);
              setHighlightIndex(-1);
              setDraft(String(value ?? ''));
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!open) setOpen(true);
              setHighlightIndex((prev) => Math.min((prev < 0 ? -1 : prev) + 1, filteredOptions.length - 1));
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIndex((prev) => Math.max(prev - 1, 0));
              return;
            }
            if (e.key === 'Enter') {
              if (!open) return;
              e.preventDefault();
              if (highlightIndex >= 0 && filteredOptions[highlightIndex]) {
                applyValue(filteredOptions[highlightIndex]);
                return;
              }
              if (!allowCustom) {
                const current = String(draft ?? '').trim();
                const match = normalizedOptions.find((o) => o.toLowerCase() === current.toLowerCase());
                applyValue(match || '');
              } else {
                setOpen(false);
              }
            }
          }}
          placeholder={placeholder}
          style={inputStyle}
          autoComplete="off"
          role="combobox"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={`${id}-listbox`}
        />
      </div>

      {open && !disabled && menuRect && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={`${id}-listbox`}
          role="listbox"
          style={{
            position: 'fixed',
            left: menuRect.left,
            top: menuRect.top,
            width: menuRect.width,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 2147483000,
            padding: 6
          }}
        >
          {!filteredOptions.length ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: '#6b7280' }}>No matches</div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isActive = idx === highlightIndex;
              return (
                <div
                  key={`${opt}-${idx}`}
                  role="option"
                  aria-selected={isActive ? 'true' : 'false'}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    // Prevent input blur before click selection.
                    e.preventDefault();
                    applyValue(opt);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isActive ? '#eff6ff' : '#fff',
                    color: '#111827',
                    fontSize: 13,
                    fontWeight: isActive ? 900 : 600
                  }}
                >
                  {opt}
                </div>
              );
            })
          )}
        </div>,
        document.body
      ) : null}
    </>
  );
}

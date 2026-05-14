import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

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
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const deferredValue = useDeferredValue(value);

  const normalizedOptions = useMemo(() => {
    const uniq = new Map();
    (Array.isArray(options) ? options : []).forEach((opt) => {
      const text = String(opt ?? '').trim();
      if (!text) return;
      uniq.set(text.toLowerCase(), text);
    });
    const compare = (a, b) => {
      const na = Number(a);
      const nb = Number(b);
      const aNum = Number.isFinite(na) && String(a).trim() !== '';
      const bNum = Number.isFinite(nb) && String(b).trim() !== '';
      if (aNum && bNum) return na - nb;
      return String(a).localeCompare(String(b));
    };
    return Array.from(uniq.values()).sort(compare);
  }, [options]);

  const filteredOptions = useMemo(() => {
    const q = String(deferredValue || '').trim().toLowerCase();
    if (!q) return normalizedOptions.slice(0, Math.max(0, Number(maxVisible) || 0) || 120);
    const matches = normalizedOptions.filter((o) => String(o).toLowerCase().includes(q));
    return matches.slice(0, Math.max(0, Number(maxVisible) || 0) || 120);
  }, [normalizedOptions, deferredValue, maxVisible]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
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

  const applyValue = (next) => {
    onChange(next);
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
          value={value}
          onFocus={() => { if (!disabled) setOpen(true); }}
          onClick={() => { if (!disabled) setOpen(true); }}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next);
            if (!disabled) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Escape') {
              setOpen(false);
              setHighlightIndex(-1);
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
                const current = String(value ?? '').trim();
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

        {open && !disabled ? (
          <div
            id={`${id}-listbox`}
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
              maxHeight: 280,
              overflowY: 'auto',
              zIndex: 10050,
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
          </div>
        ) : null}
      </div>
    </>
  );
}

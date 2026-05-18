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
  const [draft, setDraft] = useState('');
  const [menuRect, setMenuRect] = useState(null);

  const normalizedOptions = useMemo(() => {
    return (Array.isArray(options) ? options : []).map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value ?? '',
          label: String(opt.label ?? opt.value ?? '').trim()
        };
      }
      return {
        value: opt ?? '',
        label: String(opt ?? '').trim()
      };
    }).filter(o => o.label !== '');
  }, [options]);

  // When value changes from outside, update the draft text to match the label
  useEffect(() => {
    if (open) return;
    const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value ?? ''));
    if (selectedOpt) {
      setDraft(selectedOpt.label);
    } else {
      setDraft(allowCustom ? String(value ?? '') : '');
    }
  }, [value, open, normalizedOptions, allowCustom]);

  const filteredOptions = useMemo(() => {
    const q = String(draft || '').trim().toLowerCase();
    if (!q) return normalizedOptions.slice(0, Math.max(0, Number(maxVisible) || 0) || 120);
    const matches = normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
    return matches.slice(0, Math.max(0, Number(maxVisible) || 0) || 120);
  }, [normalizedOptions, draft, maxVisible]);

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
        const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value ?? ''));
        if (selectedOpt) {
          setDraft(selectedOpt.label);
        } else {
          setDraft('');
          if (value) onChange('');
        }
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

  const applyOption = (opt) => {
    onChange(opt.value);
    setDraft(opt.label);
    setOpen(false);
    setHighlightIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  return (
    <>
      <div ref={rootRef} style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
        <input
          ref={inputRef}
          id={id}
          disabled={disabled}
          value={draft}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setDraft(''); // Clear on focus to allow fresh search
          }}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              setOpen(true);
              setDraft('');
            }
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
              const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value ?? ''));
              setDraft(selectedOpt ? selectedOpt.label : (allowCustom ? String(value ?? '') : ''));
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
                applyOption(filteredOptions[highlightIndex]);
                return;
              }
              if (!allowCustom) {
                const current = String(draft ?? '').trim().toLowerCase();
                const match = normalizedOptions.find((o) => o.label.toLowerCase() === current);
                if (match) applyOption(match);
                else {
                  const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value ?? ''));
                  setDraft(selectedOpt ? selectedOpt.label : '');
                  setOpen(false);
                }
              } else {
                setOpen(false);
              }
            }
          }}
          placeholder={placeholder}
          style={{ ...inputStyle, width: '100%' }}
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
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isActive ? 'true' : 'false'}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyOption(opt);
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
                  {opt.label}
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

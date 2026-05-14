import React, { useMemo } from 'react';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  allowCustom = true,
  inputStyle = {},
  listId
}) {
  const id = useMemo(() => listId || `ss-${Math.random().toString(36).slice(2)}`, [listId]);
  const normalizedOptions = useMemo(() => {
    const uniq = new Map();
    (Array.isArray(options) ? options : []).forEach((opt) => {
      const text = String(opt ?? '').trim();
      if (!text) return;
      uniq.set(text.toLowerCase(), text);
    });
    return Array.from(uniq.values()).sort((a, b) => a.localeCompare(b));
  }, [options]);

  return (
    <>
      <input
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (!allowCustom) {
            // Only allow values from list (case-insensitive).
            const match = normalizedOptions.find((o) => o.toLowerCase() === String(next || '').trim().toLowerCase());
            onChange(match || '');
            return;
          }
          onChange(next);
        }}
        list={id}
        placeholder={placeholder}
        style={inputStyle}
      />
      <datalist id={id}>
        {normalizedOptions.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  );
}


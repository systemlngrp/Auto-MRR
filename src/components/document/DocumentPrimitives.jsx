import React from 'react';

function normalizeInputDateValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const toIso = (year, month, day) => {
    const y = String(year || '').padStart(4, '0');
    const m = Number(month);
    const d = Number(day);
    if (!Number.isFinite(m) || !Number.isFinite(d)) return '';
    if (m < 1 || m > 12 || d < 1 || d > 31) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = iso[1];
    const a = Number(iso[2]);
    const b = Number(iso[3]);
    if (a >= 1 && a <= 12) return toIso(year, a, b);
    if (b >= 1 && b <= 12) return toIso(year, b, a);
    return '';
  }

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    if (first > 12 && second <= 12) return toIso(year, second, first);
    if (second > 12 && first <= 12) return toIso(year, first, second);
    return toIso(year, first, second);
  }

  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dash) {
    const year = dash[3].length === 2 ? `20${dash[3]}` : dash[3];
    const first = Number(dash[1]);
    const second = Number(dash[2]);
    if (first > 12 && second <= 12) return toIso(year, second, first);
    if (second > 12 && first <= 12) return toIso(year, first, second);
    return toIso(year, first, second);
  }

  const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const named = text.match(/^(\d{1,2})[\/-\s]([A-Za-z]{3,})[\/-\s](\d{2,4})$/);
  if (named) {
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    const month = monthNames[named[2].slice(0, 3).toLowerCase()];
    if (month) return toIso(year, Number(month), named[1]);
  }
  return '';
}

function normalizeInputNumberValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : '';
}

function getSafeInputValue(type, value) {
  if (type === 'date') return normalizeInputDateValue(value);
  if (type === 'number') return normalizeInputNumberValue(value);
  return value || '';
}

export function Header({ header }) {
  return (
    <div className="hdr">
      <div className="logo">{header.brand_box}</div>
      <div className="co">
        <h1>{header.title}</h1>
        <p>{header.works}</p>
        <p>{header.meta}</p>
        <p>{header.contact}</p>
      </div>
      <div className="note">{header.note}</div>
    </div>
  );
}

export function MetaTable({ rows }) {
  return <table className="meta"><tbody>{rows.map(([label, value, onChange, type, readOnly, options], idx) => {
    const isLocked = !!readOnly || !onChange;
    const rowKey = typeof label === 'string' ? `${label}-${idx}` : `meta-row-${idx}`;
    if (type === 'supplier_datalist') {
      const listId = `meta-supplier-list-${idx}`;
      return (
        <tr key={rowKey}>
          <td>{label}</td>
          <td>
            <input
              list={listId}
              value={getSafeInputValue('text', value)}
              onChange={(e) => onChange && onChange(e.target.value)}
              readOnly={!!readOnly}
              disabled={!onChange}
              style={isLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
            />
            <datalist id={listId}>
              {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </datalist>
          </td>
        </tr>
      );
    }
    if (type === 'select') {
      return (
        <tr key={rowKey}>
          <td>{label}</td>
          <td>
            <select
              value={getSafeInputValue('text', value)}
              onChange={(e) => onChange && onChange(e.target.value)}
              disabled={isLocked}
              style={isLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined}
            >
              <option value="">Select...</option>
              {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </td>
        </tr>
      );
    }
    return <tr key={rowKey}><td>{label}</td><td><input type={type || 'text'} value={getSafeInputValue(type, value)} onChange={(e) => onChange && onChange(e.target.value)} readOnly={!!readOnly} disabled={!onChange} style={isLocked ? { background: '#f3f3f3', cursor: 'not-allowed' } : undefined} /></td></tr>;
  })}</tbody></table>;
}

function Field({ label, value, onChange, full }) {
  return <div className={full ? 'row full' : 'row'}><span>{label}</span><input value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>;
}

export function PartyCard({ label, data, onText, onField, contact, code, hideGstin = false, extras = [] }) {
  return (
    <div className="card">
      <div className="cardTitle">{label}</div>
      <textarea value={data.name_address || ''} onChange={(e) => onText(e.target.value)} />
      <div className="pairs">
        {!hideGstin ? <Field label="GSTIN" value={data.gstin || ''} onChange={(v) => onField('gstin', v)} /> : null}
        {contact ? <Field label="Contact" value={data.contact || ''} onChange={(v) => onField('contact', v)} /> : <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />}
        {contact ? <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} /> : (!hideGstin ? <Field label="GSTIN" value={data.gstin || ''} onChange={(v) => onField('gstin', v)} /> : <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />)}
        {code ? <Field label="Code" value={data.state_code || ''} onChange={(v) => onField('state_code', v)} /> : <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />}
        {extras.map(([lab, val, fn]) => <Field key={lab} label={lab} value={val} onChange={fn} full />)}
      </div>
    </div>
  );
}

export function SimplePartyCard({ label, data, onText, onField }) {
  return (
    <div className="card">
      <div className="cardTitle">{label}</div>
      <textarea value={data.name_address || ''} onChange={(e) => onText(e.target.value)} />
      <div className="pairs">
        <Field label="GSTIN" value={data.gstin || ''} onChange={(v) => onField('gstin', v)} />
        <Field label="State" value={data.state || ''} onChange={(v) => onField('state', v)} />
      </div>
    </div>
  );
}

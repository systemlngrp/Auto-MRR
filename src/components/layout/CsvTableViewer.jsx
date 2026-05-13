import React, { useMemo, useRef, useState } from 'react';
import { parseCsv } from '../../utils/csv';

const baseCard = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px'
};

export default function CsvTableViewer({ title, helpText, expectedHeaders }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [schemaReport, setSchemaReport] = useState({ missing: [], extra: [] });

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => headers.some((h) => String(r?.[h] ?? '').toLowerCase().includes(q)));
  }, [rows, query, headers]);

  const onPickFile = async (file) => {
    if (!file) return;
    setStatus('Reading CSV...');
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setHeaders(parsed.headers || []);
      setRows(parsed.rows || []);
      if (Array.isArray(expectedHeaders) && expectedHeaders.length) {
        const expectedSet = new Set(expectedHeaders.map((h) => String(h || '').trim()).filter(Boolean));
        const actualSet = new Set((parsed.headers || []).map((h) => String(h || '').trim()).filter(Boolean));
        const missing = expectedHeaders.filter((h) => !actualSet.has(String(h || '').trim()));
        const extra = (parsed.headers || []).filter((h) => !expectedSet.has(String(h || '').trim()));
        setSchemaReport({ missing, extra });
      } else {
        setSchemaReport({ missing: [], extra: [] });
      }
      setStatus(parsed.rows?.length ? '' : 'No rows found in CSV.');
    } catch (err) {
      setStatus(err?.message || 'Could not read CSV.');
      setHeaders([]);
      setRows([]);
      setSchemaReport({ missing: [], extra: [] });
    }
  };

  const schemaSummary = (() => {
    if (!Array.isArray(expectedHeaders) || expectedHeaders.length === 0) return '';
    const missingCount = schemaReport.missing.length;
    const extraCount = schemaReport.extra.length;
    if (!headers.length) return `Schema columns: ${expectedHeaders.length}`;
    if (missingCount === 0 && extraCount === 0) return 'Schema match: OK';
    return `Schema mismatch: missing ${missingCount}, extra ${extraCount}`;
  })();

  return (
    <div style={baseCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>{title}</div>
          {helpText ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>{helpText}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', minWidth: '220px' }}
          />
          <button type="button" className="btn main" onClick={() => inputRef.current?.click()}>
            Upload CSV
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onPickFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 800, color: status ? '#b45309' : '#6b7280' }}>
        {status || schemaSummary || `Rows: ${filtered.length}${rows.length !== filtered.length ? ` (filtered from ${rows.length})` : ''}`}
      </div>

      {Array.isArray(expectedHeaders) && expectedHeaders.length ? (
        <div style={{ marginTop: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', background: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 1000, color: '#111' }}>Sheets Schema Columns</div>
            <button
              type="button"
              className="btn small"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(expectedHeaders.join(','));
                  setStatus('Schema copied to clipboard.');
                  setTimeout(() => setStatus(''), 1200);
                } catch {
                  setStatus('Could not copy schema.');
                  setTimeout(() => setStatus(''), 1200);
                }
              }}
            >
              Copy Schema
            </button>
          </div>
          {(schemaReport.missing.length || schemaReport.extra.length) && headers.length ? (
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 900, color: '#b45309' }}>
              {schemaReport.missing.length ? `Missing: ${schemaReport.missing.join(', ')}` : null}
              {schemaReport.missing.length && schemaReport.extra.length ? ' | ' : null}
              {schemaReport.extra.length ? `Extra: ${schemaReport.extra.join(', ')}` : null}
            </div>
          ) : null}
          <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            {expectedHeaders.map((h) => {
              const isMissing = headers.length ? schemaReport.missing.includes(h) : false;
              return (
                <div
                  key={h}
                  style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: `1px solid ${isMissing ? '#f59e0b' : '#e5e7eb'}`,
                    background: isMissing ? '#fffbeb' : '#fff',
                    color: '#111'
                  }}
                  title={isMissing ? 'Missing in uploaded CSV' : ''}
                >
                  {h}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: '12px', width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: '#1d4ed8',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 1000,
                    padding: '10px 10px',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid rgba(255,255,255,0.18)'
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan={Math.max(headers.length, 1)} style={{ padding: '14px 10px', color: '#6b7280', fontWeight: 800 }}>
                  {rows.length ? 'No matching rows.' : 'Upload a CSV to view data.'}
                </td>
              </tr>
            ) : null}
            {filtered.map((r, idx) => (
              <tr key={idx}>
                {headers.map((h) => (
                  <td
                    key={`${idx}-${h}`}
                    style={{
                      fontSize: '12px',
                      padding: '8px 10px',
                      borderTop: '1px solid #e5e7eb',
                      borderRight: '1px solid #f1f5f9',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {String(r?.[h] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

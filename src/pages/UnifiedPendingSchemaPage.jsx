import React, { useMemo } from 'react';
import { UNIFIED_PENDING_JOB_SCHEMA } from '../utils/reelSchemas';

export default function UnifiedPendingSchemaPage({ onBack }) {
  const headers = useMemo(() => {
    const raw = UNIFIED_PENDING_JOB_SCHEMA?.headers || [];
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  }, []);

  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Unified Pending Schema</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Single schema table (no duplicates) for Pending Reel Issue / Sheet Plant / Printing.
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>Columns ({headers.length})</div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['#', 'COLUMN NAME'].map((h) => (
                  <th
                    key={h}
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: '#1d4ed8',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 1000,
                      padding: '12px 10px',
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
              {!headers.length ? (
                <tr>
                  <td colSpan={2} style={{ padding: '18px 10px', color: '#6b7280', fontWeight: 800 }}>
                    No schema headers found.
                  </td>
                </tr>
              ) : null}
              {headers.map((name, idx) => (
                <tr key={`${idx}-${name}`}>
                  <td style={{ fontSize: '12px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#475569' }}>
                    {idx + 1}
                  </td>
                  <td style={{ fontSize: '12px', padding: '10px', borderTop: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: 900, color: '#111827' }}>
                    {name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


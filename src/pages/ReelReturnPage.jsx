import React from 'react';
import CsvTableViewer from '../components/layout/CsvTableViewer';

export default function ReelReturnPage({ selectedFirm, currentUser, onBack }) {
  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Reel Return</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <CsvTableViewer
        title="ALL IN ONE - REEL RETURN"
        helpText="Upload the CSV export for Reel Return to view and search the full data."
      />
    </div>
  );
}


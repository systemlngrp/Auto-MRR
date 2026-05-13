import React from 'react';
import CsvTableViewer from '../components/layout/CsvTableViewer';
import { REEL_SCHEMAS } from '../utils/reelSchemas';

export default function SheetPlantPage({ selectedFirm, currentUser, onBack }) {
  return (
    <div style={{ padding: '24px', width: '100%', minHeight: '100vh', background: '#f5f7fb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.02em' }}>Sheet Plant</h2>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
            Firm: {selectedFirm?.name || '-'} | User: {currentUser?.name || currentUser?.login_id || '-'}
          </div>
        </div>
        <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px', fontWeight: 800 }}>
          Back
        </button>
      </div>

      <CsvTableViewer
        title="ALL IN ONE - PENDING SHEET PLANT"
        helpText="Upload the pending sheet plant CSV to view all columns with horizontal scroll."
        expectedHeaders={REEL_SCHEMAS.sheet_plant_pending.headers}
      />
    </div>
  );
}

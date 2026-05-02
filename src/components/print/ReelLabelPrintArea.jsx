import React from 'react';
import QRCodePackage from 'react-qr-code';

const QRCode = typeof QRCodePackage === 'function'
  ? QRCodePackage
  : (QRCodePackage.default || QRCodePackage.QRCode || QRCodePackage);

function getLabelValue(row, key) {
  return row?.[key] || row?.[String(key).toLowerCase()] || row?.[String(key).replace(/ /g, '_').toLowerCase()] || '';
}

export default function ReelLabelPrintArea({ reels, selectedFirm, printMode = 'label' }) {
  return (
    <div className={`print-area labels-grid mode-${printMode}`}>
      {reels.map((reel, idx) => {
        const reelNo = getLabelValue(reel, 'Our_Reel_Number') || getLabelValue(reel, 'Our Reel Number') || getLabelValue(reel, 'our_reel_number') || getLabelValue(reel, 'reel_number') || reel?.our_reel_no || '';
        return (
          <div key={idx} className="print-label">
            <img src="https://i.ibb.co/Dgv0KwQ4/lnkilogo.png" className="brand-logo" alt="Laxmi Narayan Group" />
            <h2 style={{ margin: '4px 0 8px', fontSize: '14px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{selectedFirm?.name}</h2>
            <div className="sub-info">
              <span>Doc: <b>{getLabelValue(reel, 'Sup Doc No.') || getLabelValue(reel, 'sup_doc_no')}</b></span>
              <span>Date: <b>{getLabelValue(reel, 'Date') || getLabelValue(reel, 'date')}</b></span>
              <span>Code: <b>{getLabelValue(reel, 'ERP Code') || getLabelValue(reel, 'erp_code')}</b></span>
            </div>
            <h3 style={{ fontSize: '11px' }}>{selectedFirm?.name}</h3>
            <div className="specs">
              Size: {getLabelValue(reel, 'Size')} CM X GSM: {getLabelValue(reel, 'GSM')} X BF: {getLabelValue(reel, 'BF')}
            </div>
            <div className="grid-2">
              <div><span>MRR:</span> {getLabelValue(reel, 'MRR No') || getLabelValue(reel, 'mrr_number') || getLabelValue(reel, 'mrr_no')}</div>
              <div><span>GE:</span> {getLabelValue(reel, 'GE Entry') || getLabelValue(reel, 'ge_no') || getLabelValue(reel, 'ge_entry')}</div>
              <div><span>Reel:</span> {reelNo}</div>
              <div><span>Weight:</span> {getLabelValue(reel, 'Weight') || getLabelValue(reel, 'net_wt')}</div>
            </div>
            <div className="qr-container">
              <QRCode value={String(reelNo || getLabelValue(reel, 'ERP Code') || getLabelValue(reel, 'erp_code') || idx + 1)} size={printMode === 'a4' ? 220 : 110} />
              <div className="qr-hint">{reelNo}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const labelStyles = `
.labels-grid { display: flex; flex-direction: column; align-items: center; gap: 24px; padding-top: 10px; }
.print-label { border: 1px solid #111; padding: 12px; background: #fff; color: #111; font-family: Arial, sans-serif; text-align: center; margin: 0 auto; display: flex; flex-direction: column; box-sizing: border-box; }
.mode-label .print-label { width: 380px; height: 550px; }
.mode-a4 .print-label { width: 100%; height: 100%; padding: 30px; font-size: 1.5em; max-width: 800px; }
.print-label .brand-logo { margin: 0 auto; display: block; object-fit: contain; }
.mode-a4 .print-label .brand-logo { height: 160px; max-width: 100%; margin-bottom: 20px; }
.mode-label .print-label .brand-logo { height: 80px; max-width: 100%; margin-bottom: 12px; }

.mode-a4 .print-label .sub-info { font-size: 14px; margin-bottom: 8px; }
.mode-label .print-label .sub-info { font-size: 10px; margin-bottom: 4px; }
.print-label .sub-info { display: flex; justify-content: space-between; padding: 0 10px; }

.mode-a4 .print-label h3 { font-size: 20px; margin: 0 0 10px; }
.mode-label .print-label h3 { font-size: 14px; margin: 0 0 6px; }
.print-label h3 { font-weight: 900; }

.mode-a4 .print-label .specs { font-size: 16px; margin-bottom: 12px; }
.mode-label .print-label .specs { font-size: 11px; margin-bottom: 8px; }
.print-label .specs { font-weight: 700; }

.mode-a4 .print-label .grid-2 { font-size: 16px; padding: 0 30px; padding-top: 14px; row-gap: 10px; }
.mode-label .print-label .grid-2 { font-size: 11px; padding: 0 20px; padding-top: 8px; row-gap: 6px; }
.print-label .grid-2 { display: grid; grid-template-columns: 1fr 1fr; text-align: left; margin-bottom: 16px; column-gap: 10px; border-top: 1px solid #ccc; }
.print-label .grid-2 span { font-weight: 900; }

.print-label .qr-container { border-top: 1px solid #111; padding-top: 20px; margin-top: auto; display: flex; flex-direction: column; align-items: center; flex-grow: 1; justify-content: center; }

.mode-a4 .print-label .qr-hint { font-size: 24px; margin-top: 30px; }
.mode-label .print-label .qr-hint { font-size: 9px; margin-top: 12px; }
.print-label .qr-hint { color: #555; font-weight: 700; }

@media print {
  .no-print { display: none !important; }

  .labels-grid.mode-a4 { display: block !important; gap: 0; margin: 0; padding: 0; }
  .mode-a4 .print-label { page-break-inside: avoid !important; page-break-after: always !important; border: none; margin: 0; padding: 40px; width: 100vw; height: 100vh; max-width: none; max-height: none; justify-content: center; }

  .labels-grid.mode-label { display: flex !important; flex-wrap: wrap; justify-content: center; gap: 20px; padding: 0; }
  .mode-label .print-label { page-break-inside: avoid !important; margin-bottom: 20px; }

  body, .app { background: #fff !important; padding: 0; margin: 0; max-width: 100%; height: auto; }
  .sheet { border: 0 !important; box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
  @page { margin: 10px; size: A4 landscape; }
}
`;

export const styles = `
:root{--ink:#111;--paper:#fff;--bg:#d8d1c4;--line:#1e1e1e;--line-soft:#b9b9b9;--primary:#0f4f93;--ok:#166534;--warn:#8a5a10;--bad:#9b1c1c;--muted:#595959;--sheet-width:1140px}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif}.app{max-width:1180px;margin:0 auto;padding:16px 12px 28px}.pageHeader{max-width:var(--sheet-width);margin:0 auto 14px;background:#f8f5ee;border:1px solid #a79f92;padding:12px 14px}.pageHeader h1{margin:0 0 4px;font-size:20px;font-weight:700}.pageHeader p{margin:0;color:#444;font-size:12px;line-height:1.45}.toolbar,.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar{margin-top:10px}.status{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 12px;border:1px solid #bfb7aa;background:#fff;font-size:11px;font-weight:700;color:var(--muted)}.status.success{color:var(--ok)}.status.error{color:var(--bad)}.status.working{color:var(--warn)}.spinner{width:14px;height:14px;border:2px solid #cfc5b7;border-top-color:currentColor;border-radius:50%;animation:spin .45s linear infinite;flex:0 0 auto;will-change:transform}.spinner.tiny{width:8px;height:8px;border-width:1.5px}.approving-bubble{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.18);font-size:11px;line-height:1;font-weight:700}.approving-dots{display:inline-flex;align-items:center;gap:3px}.approving-dots span{width:4px;height:4px;border-radius:50%;background:currentColor;opacity:.35;animation:approvingPulse .9s infinite ease-in-out}.approving-dots span:nth-child(2){animation-delay:.15s}.approving-dots span:nth-child(3){animation-delay:.3s}@keyframes spin{to{transform:rotate(360deg)}}@keyframes approvingPulse{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}.loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(216,209,196,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:var(--primary);text-align:center;width:100%;height:100%}.loading-overlay .spinner{width:64px;height:64px;border-width:6px;margin-bottom:20px;border-top-color:var(--primary)}.loading-overlay h2{margin:0 0 8px;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em}.loading-overlay p{margin:0;font-size:14px;font-weight:700;color:var(--ink)} .toast{position:fixed;top:16px;right:16px;z-index:1000;max-width:430px;padding:12px 14px;border:1px solid #bfb7aa;background:#fff;box-shadow:0 10px 24px rgba(0,0,0,.12);font-size:12px;font-weight:700;line-height:1.45}.toast.success{border-color:#9cc7a6;color:var(--ok)}.toast.error{border-color:#d9a2a2;color:var(--bad)}.help{margin-top:8px;border:1px dashed #938a7a;background:#fffdf7}.stats{width:100%;border-collapse:collapse;table-layout:fixed}.stats th,.stats td{border-right:1px dashed #b6ad9e;padding:8px 10px;font-size:11px}.stats th:last-child,.stats td:last-child{border-right:0}.stats th{background:#f7f1e5;text-align:left;font-weight:700;color:#4a4438}.stats td{background:#fffdf7;font-weight:700}.btn{border:1px solid #4a4a4a;background:#fff;color:#111;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer}.btn:hover{background:#f1f1f1}.btn:disabled{opacity:.65;cursor:wait;background:#f5f5f5}.btn.main{background:#111;color:#fff;border-color:#111}.btn.main:hover{background:#222}.btn.main:disabled{background:#111}.btn.small{padding:2px 5px;font-size:9px}.hidden{display:none}.sectionHead{max-width:var(--sheet-width);margin:16px auto 6px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.sectionHead h2{margin:0;font-size:15px;font-weight:700}.sectionHead p{margin:2px 0 0;color:var(--muted);font-size:11px}.doc{margin-bottom:18px}.sheet{max-width:var(--sheet-width);margin:0 auto;background:var(--paper);border:1px solid var(--line);overflow:hidden;box-shadow:none}.hdr{display:grid;grid-template-columns:128px 1fr 92px;border-bottom:1px solid var(--line)}.logo{background:#585858;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;font-weight:700;padding:6px;line-height:1.35;border-right:1px solid var(--line);white-space:pre-line}.co{text-align:center;padding:6px 8px}.co h1{margin:0 0 3px;font-size:13px;letter-spacing:.02em}.co p{margin:1px 0;font-size:9px;line-height:1.2}.note{padding:6px 4px;border-left:1px solid var(--line);font-size:8px;text-align:center;white-space:pre-line;background:#585858;color:#fff}.title{text-align:center;font-size:13px;font-weight:700;border-bottom:1px solid var(--line);padding:6px 8px}.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-bottom:1px solid var(--line)}.card{min-width:0;border-right:1px solid var(--line)}.grid2>.card:last-child,.grid2>.meta:last-child{border-right:0}.cardTitle{font-size:10px;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--line);background:#f5f5f5}.card textarea,.foot textarea{width:100%;min-height:68px;border:0;border-bottom:1px solid var(--line);padding:5px 6px;font:inherit;font-size:10px;line-height:1.35;resize:vertical}.pairs{display:grid;grid-template-columns:1fr 1fr}.row{display:flex;align-items:center;gap:4px;padding:3px 5px;border-top:1px solid var(--line-soft);font-size:9px}.row span{white-space:nowrap;font-weight:700}.row.full{grid-column:1/-1}.row input,.row select,.meta input,.meta select,.line input,.line select,.table input,.table select{width:100%;border:1px solid #a8a8a8;padding:3px 4px;font:inherit;font-size:10px;background:#fff;min-width:0}.supplier-search-wrap{position:relative;width:100%}.supplier-search{padding-right:28px !important}.supplier-search::-webkit-calendar-picker-indicator{opacity:0;position:absolute;right:0}.supplier-search-wrap::after{content:"▼";position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#444;font-size:12px;line-height:1}.table input,.table select{padding:2px 3px;font-size:8px}.row input:focus,.row select:focus,.meta input:focus,.meta select:focus,.line input:focus,.line select:focus,.table input:focus,.table select:focus,.card textarea:focus,.foot textarea:focus{outline:none;border-color:#2d6fb3;box-shadow:none}.meta{width:100%;border-collapse:collapse;table-layout:fixed}.meta td{border:1px solid var(--line);padding:4px 5px;font-size:9px}.meta td:first-child{width:43%;font-weight:700;background:#f8f8f8}.line{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 6px;border-bottom:1px solid var(--line);font-size:9px}.wrap{overflow-x:auto;border-bottom:1px solid var(--line);background:#fff}.table{width:100%;border-collapse:collapse;table-layout:fixed}.invoiceTable{min-width:1140px}.packingTable{min-width:1800px}.poTable{min-width:2200px}.toolbar input,.actions input{border:1px solid #a8a8a8;padding:7px 10px;font:inherit;font-size:12px;background:#fff;min-width:180px}.table th,.table td{border:1px solid var(--line);padding:2px 3px;font-size:8px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}.table th{background:#f5f5f5;text-align:center;font-weight:700}.c{text-align:center}.r{text-align:right}.summary{display:grid;grid-template-columns:minmax(0,1fr) 250px;border-bottom:1px solid var(--line)}.panel{border-right:1px solid var(--line)}.summary>.panel:last-child{border-right:0}.panelBody{padding:6px;font-size:10px;line-height:1.35}.valueLine{padding:7px 8px;border-bottom:1px solid var(--line);font-size:12px;font-weight:700}.foot{display:grid;grid-template-columns:minmax(0,1fr) 220px;border-bottom:1px solid var(--line)}.sign{min-height:84px;padding:8px;border-right:1px solid var(--line);position:relative;text-align:center;font-size:10px}.sign:last-child{border-right:0}.sign.left{text-align:left}.sigLine{position:absolute;left:8px;right:8px;bottom:8px;border-top:1px solid var(--line);padding-top:3px;font-size:9px;font-weight:700}.actions{max-width:var(--sheet-width);margin:8px auto 0;justify-content:flex-end;padding-top:0}.muted{font-size:11px;color:var(--muted)}@media(max-width:900px){.app{padding:10px}.pageHeader,.sectionHead,.sheet,.actions{max-width:none}.hdr,.grid2,.summary,.foot{grid-template-columns:1fr}.logo,.note,.card,.panel,.sign{border-right:0;border-bottom:1px solid var(--line)}.pairs{grid-template-columns:1fr}.toolbar,.actions{align-items:stretch}.toolbar .btn,.actions .btn{flex:1 1 180px}.sectionHead{align-items:flex-start;flex-direction:column}.wrap{overflow-x:auto}.invoiceTable,.packingTable{min-width:980px}.toast{left:12px;right:12px;max-width:none}}@media print{body{background:#fff}.app{max-width:100%;padding:0}.pageHeader,.actions,.muted,.toast,.toolbar,.no-print{display:none!important}.sheet{box-shadow:none;border:1px solid #111}.doc{margin-bottom:8px;break-inside:avoid;page-break-inside:avoid}.wrap{overflow:visible}.invoiceTable,.packingTable{min-width:0}.table th:last-child,.table td:last-child{display:none!important}input,select,textarea{border:0!important;background:transparent!important;padding:0!important;outline:0!important;box-shadow:none!important;appearance:none!important;-webkit-appearance:none!important}.btn,button{display:none!important}@page{size:A4 landscape;margin:10px}}
.btn{transition:background-color .22s ease,border-color .22s ease,color .22s ease,transform .18s ease,box-shadow .22s ease;box-shadow:0 1px 2px rgba(0,0,0,.08)}.btn:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.12)}.btn:active{transform:translateY(0);box-shadow:0 1px 3px rgba(0,0,0,.12)}.btn:disabled{transform:none;box-shadow:none}.btn.main:hover{box-shadow:0 4px 12px rgba(0,0,0,.2)}.btn.main:active{box-shadow:0 1px 4px rgba(0,0,0,.16)}
`;

export const directLabelPrintStyles = `
.direct-label-print-sheet { display: none; }
@media print {
  body.print-labels-only .loading-overlay > *:not(.direct-label-print-sheet) { display: none !important; }
  body.print-labels-only .loading-overlay { background: #fff !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  body.print-labels-only .app > * { display: none !important; }
  body.print-labels-only .direct-label-print-sheet { display: block !important; }
}
`;

export const printGridStyles = `
@media print {
  .sheet .other-mrr-meta td {
    font-size: 8px !important;
    padding: 2px 3px !important;
  }

  .sheet .other-mrr-meta input {
    font-size: 8px !important;
    padding: 1px 2px !important;
  }

  .sheet .other-mrr-table {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: fixed !important;
  }

  .sheet .other-mrr-table th,
  .sheet .other-mrr-table td {
    font-size: 6px !important;
    padding: 1px 2px !important;
    line-height: 1.15 !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    white-space: normal !important;
  }

  .sheet .other-mrr-table input,
  .sheet .other-mrr-table select {
    font-size: 6px !important;
    padding: 0 !important;
    line-height: 1.1 !important;
  }

  .sheet .other-mrr-table th:nth-child(1),
  .sheet .other-mrr-table td:nth-child(1) { width: 4% !important; }
  .sheet .other-mrr-table th:nth-child(2),
  .sheet .other-mrr-table td:nth-child(2) { width: 8% !important; }
  .sheet .other-mrr-table th:nth-child(3),
  .sheet .other-mrr-table td:nth-child(3) { width: 7% !important; }
  .sheet .other-mrr-table th:nth-child(4),
  .sheet .other-mrr-table td:nth-child(4) { width: 10% !important; }
  .sheet .other-mrr-table th:nth-child(5),
  .sheet .other-mrr-table td:nth-child(5) { width: 12% !important; }
  .sheet .other-mrr-table th:nth-child(6),
  .sheet .other-mrr-table td:nth-child(6) { width: 6% !important; }
  .sheet .other-mrr-table th:nth-child(7),
  .sheet .other-mrr-table td:nth-child(7) { width: 6% !important; }
  .sheet .other-mrr-table th:nth-child(8),
  .sheet .other-mrr-table td:nth-child(8) { width: 5% !important; }
  .sheet .other-mrr-table th:nth-child(9),
  .sheet .other-mrr-table td:nth-child(9) { width: 7% !important; }
  .sheet .other-mrr-table th:nth-child(10),
  .sheet .other-mrr-table td:nth-child(10) { width: 5% !important; }
  .sheet .other-mrr-table th:nth-child(11),
  .sheet .other-mrr-table td:nth-child(11) { width: 8% !important; }
  .sheet .other-mrr-table th:nth-child(12),
  .sheet .other-mrr-table td:nth-child(12) { width: 10% !important; }
  .sheet .other-mrr-table th:nth-child(13),
  .sheet .other-mrr-table td:nth-child(13) { width: 5% !important; }
  .sheet .other-mrr-table th:nth-child(14),
  .sheet .other-mrr-table td:nth-child(14) { width: 5% !important; }
  .sheet .other-mrr-table th:nth-child(15),
  .sheet .other-mrr-table td:nth-child(15) { width: 6% !important; }
  .sheet .other-mrr-table th:nth-child(16),
  .sheet .other-mrr-table td:nth-child(16) { width: 6% !important; }

  .sheet .grid2 {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
    border-bottom: 1px solid #111 !important;
  }

  .sheet .grid2 > .meta,
  .sheet .grid2 > .card {
    border-right: 1px solid #111 !important;
    border-bottom: 0 !important;
  }

  .sheet .grid2 > .meta:last-child,
  .sheet .grid2 > .card:last-child {
    border-right: 0 !important;
  }

  .sheet .meta td,
  .sheet .table th,
  .sheet .table td {
    border: 1px solid #111 !important;
  }

  .sheet .meta input,
  .sheet .meta select,
  .sheet .table input,
  .sheet .table select,
  .sheet textarea {
    border: 1px solid #111 !important;
    background: #fff !important;
    color: #111 !important;
    opacity: 1 !important;
    padding: 2px 3px !important;
    -webkit-appearance: none !important;
    appearance: none !important;
  }

  .sheet .meta td:first-child,
  .sheet .table th {
    background: #f5f5f5 !important;
    font-weight: 700 !important;
  }

  /* Packing slip table: keep Pending Qty visible in PDF by tightening layout. */
  .sheet .packingTable {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: fixed !important;
  }

  .sheet .packingTable th,
  .sheet .packingTable td {
    font-size: 6px !important;
    padding: 1px 2px !important;
    line-height: 1.12 !important;
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }

  /* Column widths tuned for A4 landscape (Action column hidden by global print rule). */
  .sheet .packingTable th:nth-child(1),
  .sheet .packingTable td:nth-child(1) { width: 2.5% !important; }  /* Sr */
  .sheet .packingTable th:nth-child(2),
  .sheet .packingTable td:nth-child(2) { width: 5.5% !important; }  /* MRR No */
  .sheet .packingTable th:nth-child(3),
  .sheet .packingTable td:nth-child(3) { width: 5.5% !important; }  /* GE No */
  .sheet .packingTable th:nth-child(4),
  .sheet .packingTable td:nth-child(4) { width: 6% !important; }    /* Party Order */
  .sheet .packingTable th:nth-child(5),
  .sheet .packingTable td:nth-child(5) { width: 4% !important; }    /* PO No */
  .sheet .packingTable th:nth-child(6),
  .sheet .packingTable td:nth-child(6) { width: 7% !important; }    /* PO Details */
  .sheet .packingTable th:nth-child(7),
  .sheet .packingTable td:nth-child(7) { width: 13% !important; }   /* Description */
  .sheet .packingTable th:nth-child(8),
  .sheet .packingTable td:nth-child(8) { width: 6.5% !important; }  /* Supplier Reel */
  .sheet .packingTable th:nth-child(9),
  .sheet .packingTable td:nth-child(9) { width: 5.5% !important; }  /* ERP */
  .sheet .packingTable th:nth-child(10),
  .sheet .packingTable td:nth-child(10) { width: 4.5% !important; } /* Our Reel */
  .sheet .packingTable th:nth-child(11),
  .sheet .packingTable td:nth-child(11) { width: 4.5% !important; } /* Sort */
  .sheet .packingTable th:nth-child(12),
  .sheet .packingTable td:nth-child(12) { width: 3.2% !important; } /* BF */
  .sheet .packingTable th:nth-child(13),
  .sheet .packingTable td:nth-child(13) { width: 3.2% !important; } /* GSM */
  .sheet .packingTable th:nth-child(14),
  .sheet .packingTable td:nth-child(14) { width: 3.8% !important; } /* Size */
  .sheet .packingTable th:nth-child(15),
  .sheet .packingTable td:nth-child(15) { width: 3.2% !important; } /* Unit */
  .sheet .packingTable th:nth-child(16),
  .sheet .packingTable td:nth-child(16) { width: 4.5% !important; } /* Invoice Rate */
  .sheet .packingTable th:nth-child(17),
  .sheet .packingTable td:nth-child(17) { width: 4.5% !important; } /* PO Rate */
  .sheet .packingTable th:nth-child(18),
  .sheet .packingTable td:nth-child(18) { width: 5.2% !important; } /* Net Wt */
  .sheet .packingTable th:nth-child(19),
  .sheet .packingTable td:nth-child(19) { width: 5.2% !important; } /* Pending Qty */
}
`;

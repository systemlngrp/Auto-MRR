export const labelStyles = `
.labels-grid { display: flex; flex-direction: column; align-items: center; gap: 24px; padding-top: 10px; }
.print-label { border: 1px solid #111; padding: 12px; background: #fff; color: #111; font-family: Arial, sans-serif; text-align: center; margin: 0 auto; display: flex; flex-direction: column; box-sizing: border-box; }
.mode-label .print-label { width: 228px; height: 233px; padding: 8px; text-align: left; }
.mode-a4 .print-label { width: 100%; height: 100%; padding: 30px; font-size: 1.5em; max-width: 800px; }
.print-label .brand-logo { margin: 0 auto; display: block; object-fit: contain; }
.mode-a4 .print-label .brand-logo { height: 160px; max-width: 100%; margin-bottom: 20px; }
.mode-label .print-label .brand-logo { height: 80px; max-width: 100%; margin-bottom: 12px; }

.mode-label .print-label .sl-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.mode-label .print-label .sl-logo { width: 50px; height: auto; display: block; object-fit: contain; }
.mode-label .print-label .sl-company-name { font-size: 12px; font-weight: 700; text-transform: uppercase; line-height: 1.1; }
.mode-label .print-label .sl-row { display: flex; justify-content: space-between; font-size: 7px; margin-top: 2px; }
.mode-label .print-label .sl-supplier { font-size: 9px; font-weight: 700; margin-top: 4px; }
.mode-label .print-label .sl-specs { font-size: 9px; margin-bottom: 6px; }
.mode-label .print-label .sl-details { display: flex; justify-content: space-between; align-items: flex-start; font-size: 10px; margin-top: auto; }
.mode-label .print-label .sl-qrbox { border: 1px solid #000; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.mode-label .print-label .sl-qrbox svg { width: 106px; height: 106px; display: block; }

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
  /* A4: keep real-world sizing to avoid browser/viewport scaling issues */
  .mode-a4 .print-label { page-break-inside: avoid !important; page-break-after: always !important; border: none; margin: 0; padding: 10mm; width: 190mm; min-height: 277mm; max-width: none; max-height: none; justify-content: center; }

  .labels-grid.mode-label { display: block !important; gap: 0; margin: 0; padding: 0; }
  .mode-label .print-label { page-break-inside: avoid !important; page-break-after: always !important; margin: 0; }

  body, .app { background: #fff !important; padding: 0; margin: 0; max-width: 100%; height: auto; }
  .sheet { border: 0 !important; box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
}
`;

export const styles = `
:root {
  --ink: #1d4ed8;
  --paper: #fff;
  --bg: #f1f5f9;
  --line: #cbd5e1;
  --line-soft: #e2e8f0;
  --primary: #1d4ed8;
  --primary-dark: #1e40af;
  --ok: #1d4ed8;
  --warn: #3b82f6;
  --bad: #ef4444;
  --muted: #64748b;
  --sheet-width: 1140px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  font-size: 13px;
}

.bottom-back {
  position: fixed;
  left: 14px;
  bottom: 14px;
  z-index: 10010;
}

.app {
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px 12px 28px;
}

.pageHeader {
  max-width: var(--sheet-width);
  margin: 0 auto 14px;
  background: #fff;
  border: 1px solid var(--line);
  padding: 12px 14px;
  border-radius: 12px;
}

.pageHeader h1 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.pageHeader p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.toolbar, .actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar { margin-top: 10px; }

.status {
  display: inline-flex;
  align-items: center; gap: 8px; min-height: 32px; padding: 0 12px; border: 1px solid var(--line); background: #fff; font-size: 11px; font-weight: 700; color: var(--muted); border-radius: 8px; }
.status.success { color: var(--ok); }
.status.error { color: var(--bad); }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--line-soft);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .45s linear infinite;
  flex: 0 0 auto;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

/* Blue & White Theme Enforced */
.btn, button, input, select, textarea, table, th, td, label, span, div, p, h1, h2, h3, h4, h5, h6 { font-weight: 400; }
table, th, td { color: #000 !important; }
th { font-weight: bold !important; background-color: #1d4ed8 !important; color: #fff !important; }

.btn {
  font-weight: 800;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: var(--ink);
  padding: 9px 14px;
  font-size: 13px;
  border-radius: 10px;
  transition: all 0.2s;
  cursor: pointer;
}

.btn:hover { background: #f1f5f9; border-color: #94a3b8; }
.btn.main { background: var(--primary); border-color: var(--primary); color: #fff; }
.btn.main:hover { background: var(--primary-dark); border-color: var(--primary-dark); }
.btn.small { padding: 6px 10px; font-size: 12px; border-radius: 8px; }
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

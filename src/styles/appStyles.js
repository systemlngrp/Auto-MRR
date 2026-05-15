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

.hidden { display: none !important; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  font-size: 13px;
}

/* Inventory sidebar (reference styling) */
.inv-sidebar {
  width: 230px;
  height: 100vh;
  background: #0f172a;
  padding: 10px 8px;
  overflow-y: auto;
  border-right: 3px solid #1e293b;
  display: flex;
  flex-direction: column;
}

.inv-logo {
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  padding: 14px 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.inv-menu-section {
  margin-bottom: 8px;
}

.inv-menu-header {
  width: 100%;
  border: 1px solid #0b1220;
  border-radius: 6px;
  padding: 10px 12px;
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.25);
  transition: 0.25s;
}

.inv-menu-header:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #60a5fa, #2563eb);
}

.inv-menu-header.active {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.inv-menu-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inv-arrow {
  font-size: 12px;
  transition: 0.25s;
}

.inv-arrow.open {
  transform: rotate(180deg);
}

.inv-submenu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s ease;
  padding: 0 6px;
}

.inv-submenu.open {
  max-height: 700px;
  padding-top: 8px;
  padding-bottom: 4px;
}

.inv-submenu-item {
  width: 100%;
  background: #f8fafc;
  color: #111827;
  border: 1px solid #1f2937;
  border-radius: 5px;
  padding: 8px 8px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: 0.2s;
}

.inv-submenu-item > span {
  flex: 1;
  text-align: left;
}

.inv-submenu-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.inv-submenu-item:hover:not(:disabled) {
  background: #e0f2fe;
  transform: translateX(3px);
}

.inv-badge {
  min-width: 22px;
  height: 20px;
  border-radius: 5px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  padding: 0 6px;
}

.inv-badge.gray {
  background: #dbe3f5;
  color: #1e293b;
}

.inv-badge.red {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #ef4444;
}

.inv-badge.green {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #22c55e;
}

.inv-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.12);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inv-logout {
  background: #e2e8f0;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  color: #111827;
}

.inv-logout:hover {
  background: #cbd5e1;
}

/* Data tables */
.data-table,
table.table {
  border-collapse: collapse;
}

table { border-collapse: collapse !important; }
table, th, td { border: 2px solid #000 !important; }

body.mrr-classic-body {
  background: #d9d3c7;
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

.app.mrr-classic {
  max-width: 1320px;
  padding-top: 10px;
}

.pageHeader {
  max-width: var(--sheet-width);
  margin: 0 auto 14px;
  background: #fff;
  border: 1px solid var(--line);
  padding: 12px 14px;
  border-radius: 12px;
}

.app.mrr-classic .pageHeader {
  border-radius: 0;
  border: 1px solid #111;
  background: #efe9dd;
  padding: 10px 12px;
  margin-bottom: 6px;
}

.pageHeader h1 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.app.mrr-classic .pageHeader h1 {
  font-size: 18px;
  font-weight: 900;
  color: #111;
}

.pageHeader p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.app.mrr-classic .pageHeader p {
  color: #111;
  opacity: 0.75;
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
  width: 18px;
  height: 18px;
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

/* Required mark */
.req-star { color: #dc2626 !important; font-weight: 900 !important; }

/* Blue & White Theme Enforced */
.btn, button, input, select, textarea, table, th, td, label, span, div, p, h1, h2, h3, h4, h5, h6 { font-weight: 400; }
table, th, td { color: #000 !important; }
th { font-weight: bold !important; background-color: #1d4ed8 !important; color: #fff !important; }

.app.mrr-classic table,
.app.mrr-classic th,
.app.mrr-classic td {
  color: #111 !important;
}

.app.mrr-classic th {
  background-color: #f4efe6 !important;
  color: #111 !important;
}

.app.mrr-classic .help {
  max-width: var(--sheet-width);
  margin: 0 auto;
}

.app.mrr-classic .help .stats {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
  background: #efe9dd;
}

.app.mrr-classic .help .stats th,
.app.mrr-classic .help .stats td {
  border: 1px dotted #9a948c;
  padding: 6px 8px;
  text-align: left;
}

.app.mrr-classic .toolbar.no-print {
  max-width: var(--sheet-width);
  margin: 8px auto 0;
}

.app.mrr-classic .toolbar.no-print .btn {
  border-radius: 0;
  padding: 6px 12px;
  font-size: 12px;
}

.app.mrr-classic .toolbar.no-print .btn.main {
  background: #111;
  border-color: #111;
}

.app.mrr-classic .toolbar.no-print .btn.main:hover {
  background: #000;
  border-color: #000;
}

.app.mrr-classic .doc {
  max-width: 100%;
  margin: 12px auto 0;
  padding: 0 12px;
}

.app.mrr-classic .sheet {
  border-radius: 0;
  border: 1px solid #111;
  box-shadow: none;
  background: #fff;
}

.app.mrr-classic .sheet .hdr {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 110px;
  border-bottom: 1px solid #111;
  align-items: stretch;
}

.app.mrr-classic .sheet .hdr .logo,
.app.mrr-classic .sheet .hdr .note {
  background: #5b5b5b;
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  overflow: hidden;
}

.app.mrr-classic .sheet .hdr .co {
  padding: 6px 10px;
  text-align: center;
  color: #111;
}

.app.mrr-classic .sheet .hdr h1 {
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app.mrr-classic .sheet .hdr p {
  margin: 2px 0 0;
  font-size: 9px;
  line-height: 1.1;
}

.app.mrr-classic .sheet .title {
  text-align: center;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #111;
  padding: 6px 10px;
  border-bottom: 1px solid #111;
}

.app.mrr-classic .sheet table.meta,
.app.mrr-classic .sheet table.table,
.app.mrr-classic .sheet table.packingTable {
  width: 100%;
  border-collapse: collapse;
}

.app.mrr-classic .sheet table.meta td,
.app.mrr-classic .sheet table.table th,
.app.mrr-classic .sheet table.table td,
.app.mrr-classic .sheet table.packingTable th,
.app.mrr-classic .sheet table.packingTable td {
  border: 1px solid #111;
}

.app.mrr-classic .sheet table.meta td {
  padding: 4px 6px;
  font-size: 11px;
}

.app.mrr-classic .sheet table.meta td:first-child {
  width: 18%;
  font-weight: 800;
  background: #f5f5f5;
}

.app.mrr-classic .sheet table.meta input,
.app.mrr-classic .sheet table.meta select,
.app.mrr-classic .sheet table.table input,
.app.mrr-classic .sheet table.table select,
.app.mrr-classic .sheet table.packingTable input,
.app.mrr-classic .sheet table.packingTable select,
.app.mrr-classic .sheet textarea {
  border: 1px solid #111;
  border-radius: 0;
  padding: 2px 4px;
  font-size: 11px;
  width: 100%;
  background: #fff;
  color: #111;
}

.app.mrr-classic .sheet .grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #111;
}

.app.mrr-classic .sheet .grid2 > *:first-child {
  border-right: 1px solid #111;
}

.app.mrr-classic .sheet .table th {
  font-size: 10px;
  padding: 4px 6px;
  background: #f5f5f5 !important;
  color: #111 !important;
  font-weight: 800 !important;
}

.app.mrr-classic .sheet .table td,
.app.mrr-classic .sheet .packingTable td {
  font-size: 11px;
  padding: 4px 6px;
}

.app.mrr-classic .sheet .packingTable th {
  font-size: 10px;
  padding: 4px 6px;
  background: #f5f5f5 !important;
  color: #111 !important;
  font-weight: 800 !important;
}

.app.mrr-classic .sheet .addRowBtn {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  border: 1px solid #111;
  font-weight: 900;
}

.app.mrr-classic .wrap {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-gutter: stable both-edges;
  padding-bottom: 6px;
}

.app.mrr-classic .wrap table {
  width: max-content !important;
  min-width: 1800px !important;
  table-layout: auto;
}

.app.mrr-classic .wrap table.packingTable {
  min-width: 2400px !important;
}

.app.mrr-classic .wrap td,
.app.mrr-classic .wrap th {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.app.mrr-classic .sectionHead h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #111;
}

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

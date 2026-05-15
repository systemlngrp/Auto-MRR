import React, { useEffect, useMemo, useRef, useState } from 'react';
import SearchableSelect from '../components/layout/SearchableSelect';

const blankItemRow = () => ({
  item_id: '',
  pr_item_id: '',
  supplier: '',
  erp_code: '',
  item_name: '',
  description: '',
  unit: 'PCS',
  qty: '',
  rate: '',
  amount: '',
  last_po_date: '',
  last_po_rate: '',
  remark: ''
});

const blankPo = () => ({
  po_no: '',
  pr_no: '',
  po_type: 'reel',
  supplier: '',
  po_date: '',
  po_details: '',
  remark: '',
  status: 'draft'
});

function toNumber(value) {
  const num = Number(String(value ?? '').trim());
  return Number.isFinite(num) ? num : 0;
}

function isFiniteNumberText(value) {
  const t = String(value ?? '').trim();
  if (!t) return false;
  const num = Number(t);
  return Number.isFinite(num);
}

function formatAmount(value) {
  const num = toNumber(value);
  if (!num) return '';
  return String(Number(num.toFixed(2)));
}

function ddmmyyyyToIso(value) {
  const t = String(value || '').trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return '';
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDdmmyyyy(value) {
  const t = String(value || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function inferPrNoFromPoNo(poNo) {
  const text = String(poNo || '').trim();
  if (!text) return '';
  if (/^PO\s*-/i.test(text)) return text.replace(/^PO\s*-/i, 'PR-');
  if (/^PO\s+/i.test(text)) return text.replace(/^PO\s+/i, 'PR ');
  if (/^PO/i.test(text)) return text.replace(/^PO/i, 'PR');
  return '';
}

function inferErpFromText(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const m = /^(\d{4,})\b/.exec(text);
  return m ? m[1] : '';
}

let jsPdfLoaderPromise = null;

function ensureJsPdfLoaded_() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPdfLoaderPromise) return jsPdfLoaderPromise;

  jsPdfLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF loaded but not available on window.'));
    };
    script.onerror = () => reject(new Error('Could not load jsPDF library.'));
    document.head.appendChild(script);
  });

  return jsPdfLoaderPromise;
}

function fileSafeName_(value) {
  return String(value || 'purchase-order').replace(/[^\w.-]+/g, '_');
}

async function downloadPurchaseOrderPdfDirect(firm, po, items = []) {
  const poNo = String(po?.po_no || '').trim() || 'purchase-order';
  try {
    const jsPDFClass = await ensureJsPdfLoaded_();
    const pdf = new jsPDFClass({ orientation: 'p', unit: 'pt', format: 'a4' });

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 36;
    let y = margin;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('PURCHASE ORDER', pageWidth / 2, y, { align: 'center' });
    y += 22;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(firm?.name || ''), pageWidth / 2, y, { align: 'center' });
    y += 18;

    pdf.setDrawColor(180);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 16;

    const fields = [
      ['PO No', po?.po_no || ''],
      ['PR No', po?.pr_no || inferPrNoFromPoNo(po?.po_no) || ''],
      ['PO Date', po?.po_date || ''],
      ['Supplier', po?.supplier || ''],
      ['Status', po?.status || '']
    ];

    fields.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(`${label}:`, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(value || ''), margin + 95, y);
      y += 16;
    });

    const details = String(po?.po_details || '').trim();
    if (details) {
      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('PO Details:', margin, y);
      y += 12;
      pdf.setFont('helvetica', 'normal');
      const wrapped = pdf.splitTextToSize(details, pageWidth - margin * 2);
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 12 + 6;
    }

    const remark = String(po?.remark || '').trim();
    if (remark) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Remark:', margin, y);
      y += 12;
      pdf.setFont('helvetica', 'normal');
      const wrapped = pdf.splitTextToSize(remark, pageWidth - margin * 2);
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 12 + 6;
    }

    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('ITEMS', margin, y);
    y += 10;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 14;

    const colX = {
      sno: margin,
      item: margin + 34,
      qty: pageWidth - margin - 160,
      rate: pageWidth - margin - 95,
      amt: pageWidth - margin
    };

    const drawHeader = () => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('S#', colX.sno, y);
      pdf.text('Item', colX.item, y);
      pdf.text('Qty', colX.qty, y, { align: 'right' });
      pdf.text('Rate', colX.rate, y, { align: 'right' });
      pdf.text('Amount', colX.amt, y, { align: 'right' });
      y += 10;
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
    };

    drawHeader();

    const cleanItems = (Array.isArray(items) ? items : []).filter((it) => Object.values(it || {}).some((v) => String(v ?? '').trim() !== ''));
    let total = 0;

    for (let i = 0; i < cleanItems.length; i++) {
      const it = cleanItems[i] || {};
      const name = String(it?.description || it?.item_name || it?.erp_code || '').trim();
      const qty = String(it?.qty || '').trim();
      const rate = String(it?.rate || '').trim();
      const amountNum = toNumber(it?.amount) || (toNumber(qty) * toNumber(rate));
      total += amountNum;

      const itemText = name || '-';
      const wrapped = pdf.splitTextToSize(itemText, colX.qty - colX.item - 8);
      const rowHeight = Math.max(1, wrapped.length) * 11;

      if (y + rowHeight > pageHeight - margin - 40) {
        pdf.addPage();
        y = margin;
        drawHeader();
      }

      pdf.text(String(i + 1), colX.sno, y);
      pdf.text(wrapped, colX.item, y);
      pdf.text(String(qty || ''), colX.qty, y, { align: 'right' });
      pdf.text(String(rate || ''), colX.rate, y, { align: 'right' });
      pdf.text(formatAmount(amountNum), colX.amt, y, { align: 'right' });

      y += rowHeight;
      y += 4;
    }

    y += 10;
    if (y > pageHeight - margin - 30) {
      pdf.addPage();
      y = margin;
    }
    pdf.setDrawColor(120);
    pdf.line(pageWidth - margin - 220, y, pageWidth - margin, y);
    y += 14;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total', pageWidth - margin - 110, y, { align: 'right' });
    pdf.text(formatAmount(total), pageWidth - margin, y, { align: 'right' });

    pdf.save(`${fileSafeName_(poNo)}.pdf`);
  } catch (err) {
    alert((err && err.message) ? err.message : 'Could not download PO PDF.');
  }
}

export default function PurchaseOrdersPage({
  selectedFirm,
  deps,
  onBack,
  initialPrNo,
  initialPoNo,
  onInitialPrConsumed,
  onInitialPoConsumed,
  mode = 'make_po', // make_po | approve_po
  currentUser,
  onOpenSupplierForm,
  initialSupplierName,
  onInitialSupplierConsumed,
  initialTab = '',
  onInitialTabConsumed
}) {
  const {
    fetchItems,
    fetchLastPurchaseInfo,
    fetchSuppliers,
    saveSupplierMaster,
    fetchPurchaseOrders,
    fetchPurchaseOrderDetails,
    savePurchaseOrder,
    approvePurchaseOrder,
    fetchPurchaseRequests,
    fetchPurchaseRequestDetails
  } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState(() => (mode === 'approve_po' ? 'pending' : 'all'));
  const [search, setSearch] = useState('');

  const [pos, setPos] = useState([]);
  const [itemMaster, setItemMaster] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [lastPurchaseByKey, setLastPurchaseByKey] = useState({});

  const [view, setView] = useState('list'); // list | form
  const [formData, setFormData] = useState(blankPo());
  const [items, setItems] = useState([blankItemRow()]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPoNos, setSelectedPoNos] = useState({});
  const [toast, setToast] = useState({ open: false, message: '', variant: 'success' });
  const initialPrHandledRef = useRef('');
  const initialPoHandledRef = useRef('');

  const userEmail = String(currentUser?.user_email || currentUser?.user?.user_email || '').trim();
  const isApproveMode = mode === 'approve_po';
  const requiredMark = <span style={{ color: '#b91c1c', marginLeft: 2 }}>*</span>;

  const load = async () => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading purchase orders...');
    try {
      const data = await fetchPurchaseOrders({ spreadsheetId: selectedFirm.spreadsheetId });
      const nextPos = Array.isArray(data) ? data : [];
      setPos(nextPos);
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load purchase orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm]);

  useEffect(() => {
    const next = String(initialTab || '').trim().toLowerCase();
    if (!next) return;
    const allowed = new Set(['all', 'draft', 'pending', 'approved', 'rejected']);
    if (!allowed.has(next)) return;
    setTab(next);
    if (typeof onInitialTabConsumed === 'function') onInitialTabConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  useEffect(() => {
    async function loadItems() {
      if (!selectedFirm || !fetchItems) return;
      try {
        const data = await fetchItems({ spreadsheetId: selectedFirm.spreadsheetId });
        setItemMaster(Array.isArray(data) ? data : []);
      } catch {
        setItemMaster([]);
      }
    }
    loadItems();
  }, [fetchItems, selectedFirm]);

  useEffect(() => {
    async function loadSuppliers() {
      if (!selectedFirm || !fetchSuppliers) return;
      try {
        const data = await fetchSuppliers({ spreadsheetId: selectedFirm.spreadsheetId });
        setSupplierOptions(Array.isArray(data) ? data : []);
      } catch {
        setSupplierOptions([]);
      }
    }
    loadSuppliers();
  }, [fetchSuppliers, selectedFirm]);

  useEffect(() => {
    const prNo = String(initialPrNo || '').trim();
    if (!prNo || !selectedFirm) return;
    if (initialPrHandledRef.current === prNo) return;
    initialPrHandledRef.current = prNo;
    (async () => {
      await openNewFromPr(prNo);
      if (typeof onInitialPrConsumed === 'function') onInitialPrConsumed();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrNo, selectedFirm]);

  useEffect(() => {
    const poNo = String(initialPoNo || '').trim();
    if (!poNo || !selectedFirm) return;
    if (initialPoHandledRef.current === poNo) return;
    initialPoHandledRef.current = poNo;
    (async () => {
      await openEdit(poNo);
      if (typeof onInitialPoConsumed === 'function') onInitialPoConsumed();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoNo, selectedFirm]);

  const addSupplierQuick = async () => {
    if (typeof onOpenSupplierForm === 'function') {
      onOpenSupplierForm();
      return;
    }
    // Fallback (legacy): quick prompt add.
    if (!selectedFirm || !saveSupplierMaster) return;
    const name = window.prompt('Supplier name:', '');
    const supplierName = String(name || '').trim();
    if (!supplierName) return;
    try {
      await saveSupplierMaster({ supplier_name: supplierName, active: '1' }, { spreadsheetId: selectedFirm.spreadsheetId });
      const data = await fetchSuppliers({ spreadsheetId: selectedFirm.spreadsheetId });
      setSupplierOptions(Array.isArray(data) ? data : []);
      setFormData((p) => ({ ...p, supplier: supplierName }));
    } catch (err) {
      alert(err?.message || 'Could not save supplier.');
    }
  };

  useEffect(() => {
    const name = String(initialSupplierName || '').trim();
    if (!name) return;
    (async () => {
      try {
        const data = await fetchSuppliers({ spreadsheetId: selectedFirm?.spreadsheetId });
        setSupplierOptions(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
      setFormData((p) => ({ ...p, supplier: name }));
      if (typeof onInitialSupplierConsumed === 'function') onInitialSupplierConsumed();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSupplierName]);

  useEffect(() => {
    const supplierText = String(formData.supplier || '').trim();
    const dateText = String(formData.po_date || '').trim();
    const poNoText = String(formData.po_no || '').trim();
    const auto = [poNoText, dateText, supplierText].filter(Boolean).join(' - ');
    if (!String(formData.po_details || '').trim() && auto) {
      setFormData((p) => ({ ...p, po_details: auto }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.po_no, formData.po_date, formData.supplier]);

  const filteredPos = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return pos.filter((row) => {
      const statusOk = tab === 'all' ? true : String(row?.status || '').toLowerCase() === tab;
      if (!statusOk) return false;
      if (!q) return true;
      return [row?.po_no, row?.supplier, row?.po_date, row?.status].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [pos, tab, search]);

  const tabLabel = useMemo(() => {
    const t = String(tab || 'all').trim().toLowerCase();
    if (t === 'draft') return 'Draft';
    if (t === 'pending') return 'Pending';
    if (t === 'approved') return 'Approved';
    if (t === 'rejected') return 'Rejected';
    return 'All';
  }, [tab]);
  const tabOptions = useMemo(() => (isApproveMode ? ['Pending'] : ['All', 'Draft', 'Pending', 'Approved', 'Rejected']), [isApproveMode]);

  const setItem = (index, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...(next[index] || blankItemRow()), [key]: value };
      if (key === 'qty' || key === 'rate') {
        row.amount = formatAmount(toNumber(row.qty) * toNumber(row.rate));
      }
      if (key === 'erp_code') {
        const type = String(formData.po_type || 'reel') === 'other' ? 'other' : 'reel';
        const match = itemMaster.find((it) => String(it?.item_type || 'reel') === type && String(it?.erp_code || '').trim() === String(value || '').trim());
        if (match) {
          row.item_id = String(match.id || '').trim();
          if (!String(row.item_name || '').trim()) row.item_name = String(match.item_name || '').trim();
          if (!String(row.description || '').trim()) row.description = String(match.item_name || '').trim();
          if (!String(row.unit || '').trim()) row.unit = String(match.unit || 'PCS').trim();
        }
      }
      if (key === 'item_name') {
        const type = String(formData.po_type || 'reel') === 'other' ? 'other' : 'reel';
        const match = itemMaster.find((it) => String(it?.item_type || 'reel') === type && String(it?.item_name || '').trim() === String(value || '').trim());
        if (match) {
          row.item_id = String(match.id || '').trim();
          if (type === 'reel' && String(match.erp_code || '').trim()) row.erp_code = String(match.erp_code || '').trim();
          if (!String(row.description || '').trim()) row.description = String(match.item_name || '').trim();
          if (!String(row.unit || '').trim()) row.unit = String(match.unit || 'PCS').trim();
        } else {
          row.item_id = '';
        }
      }
      next[index] = row;
      return next;
    });
  };

  const hydrateLastPurchase = async (rowIndex, selectedKey, typeOverride) => {
    if (!selectedFirm || !fetchLastPurchaseInfo) return;
    const keyText = String(selectedKey || '').trim();
    if (!keyText) return;
    const itemType = String(typeOverride || formData.po_type || 'reel') === 'other' ? 'other' : 'reel';
    const cacheKey = `${itemType}:${keyText}`;
    let info = lastPurchaseByKey[cacheKey];
    if (!info) {
      try {
        const fetched = await fetchLastPurchaseInfo([keyText], itemType, { spreadsheetId: selectedFirm.spreadsheetId });
        const first = Array.isArray(fetched) ? fetched[0] : null;
        info = first || { key: keyText, po_date: '', last_rate: '' };
        setLastPurchaseByKey((prev) => ({ ...prev, [cacheKey]: info }));
      } catch {
        info = { key: keyText, po_date: '', last_rate: '' };
        setLastPurchaseByKey((prev) => ({ ...prev, [cacheKey]: info }));
      }
    }

    setItems((prev) => {
      const next = [...prev];
      const row = { ...(next[rowIndex] || blankItemRow()) };
      row.last_po_date = String(info?.po_date || '');
      row.last_po_rate = String(info?.last_rate || '');
      next[rowIndex] = row;
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!String(formData.po_date || '').trim()) next.po_date = 'PO date required';
    const isFromIndent = !!String(formData.pr_no || '').trim();
    if (!isFromIndent && !String(formData.po_details || '').trim()) next.po_details = 'PO details required';
    const meaningfulItems = items.filter((it) => Object.values(it).some((v) => String(v ?? '').trim() !== ''));
    if (!meaningfulItems.length) next.items = 'At least 1 item required';
    if (meaningfulItems.length && meaningfulItems.some((it) => !String(it?.supplier || '').trim())) {
      next.items = 'Supplier required for each item';
    }
    meaningfulItems.forEach((it, idx) => {
      const itemText = String(it.item_name || it.erp_code || it.description || '').trim();
      const hasAnyItemKey = !!itemText;
      // Don't hard-require item_id (older DB schemas may not have it).
      if (!hasAnyItemKey) next[`item_${idx}`] = 'Item required';
      if (!String(it.qty || '').trim()) next[`qty_${idx}`] = 'Qty required';
      if (!String(it.rate || '').trim()) next[`rate_${idx}`] = 'Rate required';
      else if (!isFiniteNumberText(it.rate)) next[`rate_${idx}`] = 'Rate must be numeric';
      if (String(it.qty || '').trim() && !isFiniteNumberText(it.qty)) next[`qty_${idx}`] = 'Qty must be numeric';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openNewFromPr = async (prNo) => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading PR items...');
    try {
      const payload = await fetchPurchaseRequestDetails(prNo, { spreadsheetId: selectedFirm.spreadsheetId });
      const prItems = Array.isArray(payload?.items) ? payload.items : [];
      const pr = payload?.purchase_request || {};
      const prStatus = String(payload?.purchase_request?.status || '').trim().toLowerCase();
      if (prStatus && prStatus !== 'approved') {
        throw new Error('Only approved Purchase Request can create PO.');
      }
      const inferPoType = () => {
        if (!prItems.length) return 'reel';
        const hasAnyErp = prItems.some((it) => String(it?.erp_code || '').trim());
        return hasAnyErp ? 'reel' : 'other';
      };
      const nextPoType = inferPoType();
      const prRemark = String(pr?.remark || '').trim();
      const poDetailsAuto = prRemark ? `PR ${prNo} - ${prRemark}` : `PR ${prNo}`;
      setFormData({
        ...blankPo(),
        pr_no: prNo,
        po_type: nextPoType,
        po_date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
        po_details: poDetailsAuto,
        status: 'pending'
      });
      setItems(prItems.length ? prItems.map((it) => ({
        ...blankItemRow(),
        ...it,
        item_id: String(it?.item_id || '').trim(),
        pr_item_id: String(it?.pr_item_id || '').trim(),
        supplier: String(it?.supplier || '').trim(),
        erp_code: nextPoType === 'other'
          ? ''
          : (String(it?.erp_code || '').trim() || inferErpFromText(it?.item_name) || inferErpFromText(it?.description)),
        amount: it?.amount || formatAmount(toNumber(it?.qty) * toNumber(it?.rate))
      })) : [blankItemRow()]);
      setErrors({});
      setView('form');
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load PR.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = async (poNo) => {
    if (!selectedFirm) return;
    setIsLoading(true);
    setStatus('Loading PO...');
    try {
      const payload = await fetchPurchaseOrderDetails(poNo, { spreadsheetId: selectedFirm.spreadsheetId });
      const po = payload?.purchase_order || {};
      const loadedItems = Array.isArray(payload?.items) ? payload.items : [];
      setFormData({
        ...blankPo(),
        ...po,
        po_type: String(po?.po_type || 'reel') === 'other' ? 'other' : 'reel',
        status: String(po?.status || 'draft')
      });
      setItems(loadedItems.length ? loadedItems.map((item) => ({
        ...blankItemRow(),
        ...item,
        item_id: String(item?.item_id || '').trim(),
        pr_item_id: String(item?.pr_item_id || '').trim(),
        supplier: String(item?.supplier || '').trim(),
        amount: item?.amount || formatAmount(toNumber(item?.qty) * toNumber(item?.rate))
      })) : [blankItemRow()]);
      setErrors({});
      setView('form');
      setStatus('');
    } catch (err) {
      setStatus(err?.message || 'Could not load PO.');
    } finally {
      setIsLoading(false);
    }
  };

  const save = async (nextStatus = 'draft') => {
    if (!selectedFirm) return;
    if (!validate()) return;
    setIsSaving(true);
    setStatus('Saving PO...');
    try {
      const meaningfulItems = items
        .filter((it) => Object.values(it).some((v) => String(v ?? '').trim() !== ''))
        .map((it) => ({
          supplier: String(it.supplier || '').trim(),
          item_id: String(it.item_id || '').trim(),
          pr_item_id: String(it.pr_item_id || '').trim(),
          item_type: String(formData.po_type || 'reel') === 'other' ? 'other' : 'reel',
          erp_code: String(it.erp_code || '').trim(),
          item_name: String(it.item_name || '').trim(),
          description: String(it.description || '').trim(),
          unit: String(it.unit || '').trim(),
          qty: String(it.qty || '').trim(),
          rate: String(it.rate || '').trim(),
          amount: String(it.amount || '').trim(),
          remark: String(it.remark || '').trim()
        }));

      const poPayload = {
        po_no: String(formData.po_no || '').trim(),
        pr_no: String(formData.pr_no || '').trim(),
        po_type: String(formData.po_type || 'reel') === 'other' ? 'other' : 'reel',
        supplier: (() => {
          const fromHeader = String(formData.supplier || '').trim();
          if (fromHeader) return fromHeader;
          const unique = Array.from(new Set(meaningfulItems.map((it) => String(it.supplier || '').trim()).filter(Boolean)));
          return unique.length === 1 ? unique[0] : '';
        })(),
        po_date: String(formData.po_date || '').trim(),
        po_details: String(formData.po_details || '').trim(),
        remark: String(formData.remark || '').trim(),
        status: nextStatus,
        created_by: userEmail
      };

      const resp = await savePurchaseOrder(poPayload, meaningfulItems, { spreadsheetId: selectedFirm.spreadsheetId, userEmail, item_type: poPayload.po_type });
      const poNos = Array.isArray(resp?.po_nos) ? resp.po_nos.map((v) => String(v || '').trim()).filter(Boolean) : [];
      const poNo = String(resp?.po_no || poPayload.po_no || '').trim();
      const message = poNos.length > 1 ? `Saved POs: ${poNos.join(', ')}` : (poNo ? `Saved ${poNo}` : 'Saved.');
      setStatus(message);
      setView('list');
      await load();

      if (poNo && window.confirm('PO saved. Download PO PDF now?')) {
        await downloadPurchaseOrderPdfDirect(selectedFirm, { ...poPayload, po_no: poNo }, meaningfulItems);
      }
    } catch (err) {
      setStatus(err?.message || 'Could not save PO.');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message, variant = 'success') => {
    setToast({ open: true, message: String(message || ''), variant });
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 2400);
  };

  const approve = async (poNo, decision) => {
    if (!selectedFirm) return;
    const remark = decision === 'reject' ? window.prompt('Reject remark (optional):', '') : '';
    setIsSaving(true);
    setStatus(decision === 'approve' ? 'Approving PO...' : 'Rejecting PO...');
    try {
      await approvePurchaseOrder(poNo, decision, String(remark || ''), { spreadsheetId: selectedFirm.spreadsheetId, userEmail });
      await load();
      showToast(`PO ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
    } catch (err) {
      showToast(err?.message || 'Could not update PO.', 'error');
    } finally {
      setIsSaving(false);
      setStatus('');
    }
  };

  const runBulkAction = async (decision) => {
    const selected = Object.keys(selectedPoNos).filter((k) => selectedPoNos[k]);
    if (!selected.length) return;
    const actionLabel = decision === 'approve' ? 'Approve' : 'Reject';
    if (!window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} ${selected.length} selected PO(s)?`)) return;
    
    if (!selectedFirm) return;
    const remark = decision === 'reject' ? window.prompt('Reject remark (optional):', '') : '';
    setIsSaving(true);
    setStatus(`${actionLabel}ing selected POs...`);
    try {
      const results = await Promise.allSettled(
        selected.map((poNo) => approvePurchaseOrder(poNo, decision, String(remark || ''), { spreadsheetId: selectedFirm.spreadsheetId, userEmail }))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      await load();
      setSelectedPoNos({});
      showToast(
        failed
          ? `${actionLabel} completed with ${failed} failure(s).`
          : `${actionLabel} successful for ${selected.length} PO(s).`,
        failed ? 'error' : 'success'
      );
    } catch (err) {
      showToast(err?.message || `Could not ${actionLabel.toLowerCase()} selected PO(s).`, 'error');
    } finally {
      setIsSaving(false);
      setStatus('');
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    padding: '10px 12px',
    border: `1.5px solid ${errors[field] ? '#b91c1c' : '#d1d5db'}`,
    borderRadius: '10px',
    outline: 'none',
    background: '#fff',
    color: '#111'
  });

  if (view === 'form') {
    const locked = isApproveMode || String(formData.status || 'draft') === 'approved';
    const isFromIndent = !!String(formData.pr_no || '').trim();
    const itemLocked = locked || isFromIndent;
    const itemType = String(formData.po_type || 'reel') === 'other' ? 'other' : 'reel';
    const itemOptions = itemMaster.filter((it) => {
      const type = String(it?.item_type || 'reel').trim().toLowerCase();
      const active = String(it?.active || '1') !== '0';
      if (!active) return false;
      if (itemType === 'other') return type === 'other';
      // Treat 'mrr' as 'reel' item master type (legacy naming).
      return type === 'reel' || type === 'mrr';
    });
    const showErp = itemType === 'reel';
    const itemNameOptions = Array.from(new Set(itemOptions.map((it) => String(it?.item_name || '').trim()).filter(Boolean)));
    const itemNameListId = `po-item-names-${itemType}`;
    const supplierListId = 'po-suppliers';
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: 0, overflowY: 'auto' }}>
        {(isLoading || isSaving) ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
            {status ? <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>{status}</div> : null}
          </div>
        ) : null}
        <div style={{ width: '100%', margin: 0, background: '#fff', border: 0, borderRadius: 0, padding: '18px', minHeight: '100vh', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 1000, color: '#1d4ed8' }}>{formData.po_no ? `Purchase Order - ${formData.po_no}` : 'New Purchase Order'}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{selectedFirm?.name || ''}{formData.pr_no ? ` | From PR: ${formData.pr_no}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn" onClick={() => setView('list')} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
              {String(formData.po_no || '').trim() ? (
                <button
                  type="button"
                  className="btn"
                  disabled={isSaving}
                  onClick={() => downloadPurchaseOrderPdfDirect(selectedFirm, formData, items)}
                  style={{ padding: '10px 14px', fontWeight: 900, background: '#0f766e', borderColor: '#0f766e', color: '#fff' }}
                >
                  Download PO PDF
                </button>
              ) : null}
            </div>
          </div>

          {errors.items ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 800 }}>{errors.items}</div> : null}
          {status ? <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}

          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {!isFromIndent ? (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>Type</div>
                <select
                  disabled={locked}
                  value={formData.po_type || 'reel'}
                  onChange={(e) => {
                    const nextType = String(e.target.value || 'reel');
                    setFormData((p) => ({ ...p, po_type: nextType }));
                    if (nextType === 'other') {
                      setItems((prev) => prev.map((row) => ({ ...row, erp_code: '' })));
                    }
                  }}
                  style={inputStyle('po_type')}
                >
                  <option value="reel">Reel</option>
                  <option value="other">Other</option>
                </select>
              </div>
            ) : null}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>PO Date{requiredMark}</div>
              <input
                type="date"
                disabled={locked}
                value={ddmmyyyyToIso(formData.po_date)}
                onChange={(e) => setFormData((p) => ({ ...p, po_date: isoToDdmmyyyy(e.target.value) }))}
                style={inputStyle('po_date')}
              />
            </div>
            {!isFromIndent ? (
              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#1d4ed8', marginBottom: '6px' }}>PO Details{requiredMark}</div>
                <input
                  disabled={locked}
                  value={formData.po_details}
                  onChange={(e) => setFormData((p) => ({ ...p, po_details: e.target.value }))}
                  style={inputStyle('po_details')}
                />
                {errors.po_details ? <div style={{ marginTop: 6, fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>{errors.po_details}</div> : null}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: '14px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 1000, color: '#1d4ed8' }}>Items</div>
              {!locked ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button type="button" className="btn small" onClick={addSupplierQuick}>+ Supplier</button>
                  <button type="button" className="btn small" onClick={() => setItems((p) => [...p, blankItemRow()])}>+ Add Row</button>
                </div>
              ) : null}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {showErp ? <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>ERP</th> : null}
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Supplier{requiredMark}</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Item</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Qty{requiredMark}</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Last PO Date</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Last PO Rate</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Remark</th>
                    {!locked ? <th style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }} /> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      {showErp ? (
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                          <select
                            disabled={itemLocked}
                            value={row.erp_code}
                            onChange={(e) => {
                              const value = e.target.value;
                              setItem(idx, 'erp_code', value);
                              hydrateLastPurchase(idx, value, itemType);
                            }}
                            style={{ width: '140px' }}
                          >
                            <option value="">Select ERP</option>
                            {itemOptions.map((it) => (
                              <option key={`${it.item_type}-${it.erp_code}`} value={it.erp_code}>{it.erp_code}</option>
                            ))}
                          </select>
                        </td>
                      ) : null}
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          disabled={locked}
                          list={supplierListId}
                          value={row.supplier}
                          onChange={(e) => setItem(idx, 'supplier', e.target.value)}
                          style={{ width: '200px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          disabled={itemLocked}
                          list={itemNameListId}
                          value={row.item_name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setItem(idx, 'item_name', value);
                            const match = itemOptions.find((it) => String(it?.item_name || '').trim() === String(value || '').trim());
                            if (match) {
                              setItems((prev) => {
                                const next = [...prev];
                                const nextRow = { ...(next[idx] || blankItemRow()) };
                                nextRow.item_name = String(match.item_name || '').trim();
                                if (!String(nextRow.description || '').trim()) nextRow.description = String(match.item_name || '').trim();
                                if (!String(nextRow.unit || '').trim()) nextRow.unit = String(match.unit || 'PCS').trim();
                                next[idx] = nextRow;
                                return next;
                              });
                              hydrateLastPurchase(idx, showErp ? match.erp_code : match.item_name, itemType);
                            }
                          }}
                          style={{ width: '220px' }}
                        />
                        {errors[`item_${idx}`] ? <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>{errors[`item_${idx}`]}</div> : null}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled={itemLocked} value={row.unit} onChange={(e) => setItem(idx, 'unit', e.target.value)} style={{ width: '80px' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input type="number" step="0.01" disabled={itemLocked} value={row.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} style={{ width: '80px', textAlign: 'right' }} />
                        {errors[`qty_${idx}`] ? <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>{errors[`qty_${idx}`]}</div> : null}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input type="number" step="0.01" disabled={itemLocked} value={row.rate} onChange={(e) => setItem(idx, 'rate', e.target.value)} style={{ width: '80px', textAlign: 'right' }} />
                        {errors[`rate_${idx}`] ? <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>{errors[`rate_${idx}`]}</div> : null}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input disabled={true} value={row.amount} style={{ width: '90px', textAlign: 'right', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled value={row.last_po_date} style={{ width: '120px', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <input disabled value={row.last_po_rate} style={{ width: '90px', textAlign: 'right', background: '#f9fafb' }} />
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        <input disabled={itemLocked} value={row.remark} onChange={(e) => setItem(idx, 'remark', e.target.value)} style={{ width: '160px' }} />
                      </td>
                      {!locked ? (
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                          <button type="button" className="btn small" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>X</button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <datalist id={itemNameListId}>
              {itemNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
            <datalist id={supplierListId}>
              {Array.from(new Set(supplierOptions.map(s => typeof s === 'string' ? s : (s?.supplier_name || '')).filter(Boolean))).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            {!locked ? (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', background: '#fff' }}>
                {!isFromIndent ? (
                  <button type="button" className="btn" disabled={isSaving} onClick={() => save('draft')} style={{ padding: '10px 14px', fontWeight: 900 }}>Save Draft</button>
                ) : null}
                <button type="button" className="btn main" disabled={isSaving} onClick={() => save('pending')} style={{ padding: '10px 14px', fontWeight: 900 }}>
                  {isFromIndent ? 'Save Pending PO' : 'Submit for Approval'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: '#f5f7fb' }}>
      <div style={{ margin: 0, background: 'transparent', padding: '18px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
        {(isLoading || isSaving) ? (
          <div className="loading-overlay" style={{ background: 'rgba(245, 247, 251, 0.65)' }}>
            <div className="spinner" />
            {status ? <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 1000, color: '#1d4ed8' }}>{status}</div> : null}
          </div>
        ) : null}

        {toast.open && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: toast.variant === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            fontWeight: 800,
            animation: 'slideIn 0.3s ease-out'
          }}>
            {toast.message}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 1000, color: '#1d4ed8' }}>{isApproveMode ? 'Approve PO' : 'PO'}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{selectedFirm?.name || ''}</span>
              <span style={{ background: '#e0f2fe', color: '#075985', border: '1px solid #0ea5e9', padding: '3px 10px', borderRadius: 999, fontWeight: 1000, fontSize: 11 }}>
                View: {tabLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO / supplier" style={{ ...inputStyle('search'), width: '260px', borderRadius: '999px' }} />
            {!isApproveMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#1d4ed8', paddingLeft: 10 }}>Status</div>
                <SearchableSelect
                  value={tabLabel}
                  onChange={(v) => {
                    const next = String(v || '').trim().toLowerCase();
                    if (next === 'all' || next === 'draft' || next === 'pending' || next === 'approved' || next === 'rejected') setTab(next);
                    else setTab('all');
                  }}
                  options={tabOptions}
                  allowCustom={false}
                  placeholder="Status"
                  inputStyle={{ ...inputStyle('tab'), width: 160, borderRadius: 999 }}
                />
              </div>
            ) : null}
            <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 14px', fontWeight: 800 }}>Back</button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{isLoading ? 'Loading...' : `Showing ${filteredPos.length} entries`}</div>
              {isApproveMode && tab === 'pending' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small"
                    disabled={!Object.values(selectedPoNos).some(Boolean) || isSaving}
                    onClick={() => runBulkAction('approve')}
                    style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', fontWeight: 900 }}
                  >
                    Approve Selected
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    disabled={!Object.values(selectedPoNos).some(Boolean) || isSaving}
                    onClick={() => runBulkAction('reject')}
                    style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff', fontWeight: 900 }}
                  >
                    Reject Selected
                  </button>
                </div>
              ) : null}
            </div>
            {status ? <div style={{ fontSize: '12px', color: '#6b7280' }}>{status}</div> : null}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  {isApproveMode && tab === 'pending' ? (
                    <th style={{ width: '40px', padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={filteredPos.length > 0 && filteredPos.every(r => selectedPoNos[r.po_no])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next = { ...selectedPoNos };
                          filteredPos.forEach(r => { next[r.po_no] = checked; });
                          setSelectedPoNos(next);
                        }}
                      />
                    </th>
                  ) : null}
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>PO</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Supplier</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>PO Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos.map((row) => {
                  const poNo = String(row?.po_no || '').trim();
                  const statusText = String(row?.status || 'draft').toLowerCase();
                  const statusPill = {
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 900,
                    border: '1px solid #e5e7eb',
                    background: statusText === 'approved' ? '#e0f2fe' : statusText === 'rejected' ? '#fee2e2' : '#f3f4f6',
                    color: '#1d4ed8'
                  };
                  return (
                    <tr key={poNo}>
                      {isApproveMode && tab === 'pending' ? (
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                          <input
                            type="checkbox"
                            checked={!!selectedPoNos[poNo]}
                            onChange={(e) => setSelectedPoNos(p => ({ ...p, [poNo]: e.target.checked }))}
                          />
                        </td>
                      ) : null}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 1000, color: '#000' }}>{poNo}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.supplier || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.po_date || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}><span style={statusPill}>{statusText.toUpperCase()}</span></td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn small" onClick={() => openEdit(poNo)} disabled={isSaving}>Open</button>{' '}
                        {statusText === 'pending' ? (
                          <>
                            <button type="button" className="btn small" onClick={() => approve(poNo, 'approve')} disabled={isSaving} style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}>Approve</button>{' '}
                            <button type="button" className="btn small" onClick={() => approve(poNo, 'reject')} disabled={isSaving} style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }}>Reject</button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {!filteredPos.length ? (
                  <tr>
                    <td colSpan={isApproveMode && tab === 'pending' ? 6 : 5} style={{ padding: '16px 12px', color: '#6b7280' }}>No entries found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

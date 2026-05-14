import React from 'react';
import ProfileMenu from './ProfileMenu';

export default function SidebarMenu({
  step,
  openMenuSection,
  toggleSection,
  canSeeMenu,
  pendingCounts,
  menuCountText,
  isLoadingPending,
  isLoadingEditMrr,
  isLoadingAllApprovals,
  isLoadingPreviewAll,
  isPreparingLabels,
  currentUser,
  onLogout,
  styles,
  actions
}) {
  const safeToggle = typeof toggleSection === 'function' ? toggleSection : () => {};
  const canSee = typeof canSeeMenu === 'function' ? canSeeMenu : () => true;
  const countText = typeof menuCountText === 'function' ? menuCountText : (v) => String(v ?? '');

  const badgeVariant = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'gray';
    if (n <= 0) return 'gray';
    return 'red';
  };

  const badge = (value, forcedVariant) => (
    <span className={`inv-badge ${forcedVariant || badgeVariant(value)}`}>{countText(value)}</span>
  );

  const SidebarTitle = String(styles?.sidebarTitle || 'Inventory Management').trim();

  return (
    <div className="inv-sidebar">
      <div className="inv-logo">📦 {SidebarTitle}</div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${step === 3 ? 'active' : ''}`} onClick={actions?.onDashboard}>
          <span className="inv-menu-title">▦ Dashboard</span>
          <span className="inv-arrow">⌄</span>
        </button>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'ge' ? 'active' : ''}`} onClick={() => safeToggle('ge')}>
          <span className="inv-menu-title">🚚 Gate Entry</span>
          <span className={`inv-arrow ${openMenuSection === 'ge' ? 'open' : ''}`}>⌄</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'ge' ? 'open' : ''}`}>
          {canSee('new_ge') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onNewGe}>
              <span>GE Form</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('ge_data') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onReviewGe}>
              <span>Review Gate Entry</span>
              {badge(pendingCounts?.ge_data || 0)}
            </button>
          ) : null}
          {canSee('download_label') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onDownloadLabel}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Download Label {isPreparingLabels ? <span className="spinner" /> : null}
              </span>
              {badge(0, 'gray')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'mrr' ? 'active' : ''}`} onClick={() => safeToggle('mrr')}>
          <span className="inv-menu-title">📄 MRR</span>
          <span className={`inv-arrow ${openMenuSection === 'mrr' ? 'open' : ''}`}>⌄</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'mrr' ? 'open' : ''}`}>
          {canSee('pending_mrr') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingMrr} disabled={isLoadingPending}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Pending MRR {isLoadingPending ? <span className="spinner" /> : null}
              </span>
              {badge(pendingCounts?.pending_mrr || 0)}
            </button>
          ) : null}
          {canSee('edit_mrr') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onEditMrr} disabled={isLoadingEditMrr}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Edit MRR {isLoadingEditMrr ? <span className="spinner" /> : null}
              </span>
              {badge(pendingCounts?.edit_mrr || 0, 'gray')}
            </button>
          ) : null}
          {canSee('approvals') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onApprovals} disabled={isLoadingAllApprovals}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Approvals {isLoadingAllApprovals ? <span className="spinner" /> : null}
              </span>
              {badge(pendingCounts?.all_approvals || 0)}
            </button>
          ) : null}
          {canSee('review') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onReviewAll} disabled={isLoadingPreviewAll}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                All MRR {isLoadingPreviewAll ? <span className="spinner" /> : null}
              </span>
              {badge(pendingCounts?.review || 0, 'gray')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'purchase' ? 'active' : ''}`} onClick={() => safeToggle('purchase')}>
          <span className="inv-menu-title">📝 Indent</span>
          <span className={`inv-arrow ${openMenuSection === 'purchase' ? 'open' : ''}`}>⌄</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'purchase' ? 'open' : ''}`}>
          {canSee('purchase_requests') ? (
            <>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onIndentTab?.('pending') ?? actions?.onIndent?.()}>
                <span>Pending</span>
                {badge(pendingCounts?.purchase_requests_pending || 0)}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onIndentTab?.('approved') ?? actions?.onIndent?.()}>
                <span>Approved</span>
                {badge(pendingCounts?.purchase_requests_approved || 0, 'green')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onIndentTab?.('complete') ?? actions?.onIndent?.()}>
                <span>Completed</span>
                {badge(pendingCounts?.purchase_requests_complete || 0, 'green')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onIndentTab?.('rejected') ?? actions?.onIndent?.()}>
                <span>Rejected</span>
                {badge(pendingCounts?.purchase_requests_rejected || 0)}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'po' ? 'active' : ''}`} onClick={() => safeToggle('po')}>
          <span className="inv-menu-title">🛒 Purchase Order</span>
          <span className={`inv-arrow ${openMenuSection === 'po' ? 'open' : ''}`}>⌄</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'po' ? 'open' : ''}`}>
          {canSee('make_po') ? (
            <>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('all') ?? actions?.onPo?.()}>
                <span>All</span>
                {badge(pendingCounts?.po_all || 0, 'gray')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('draft') ?? actions?.onPo?.()}>
                <span>Draft</span>
                {badge(pendingCounts?.po_draft || 0, 'gray')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('pending') ?? actions?.onPo?.()}>
                <span>Pending</span>
                {badge(pendingCounts?.po_pending || 0)}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('approved') ?? actions?.onPo?.()}>
                <span>Approved</span>
                {badge(pendingCounts?.po_approved || 0, 'green')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('rejected') ?? actions?.onPo?.()}>
                <span>Rejected</span>
                {badge(pendingCounts?.po_rejected || 0)}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'master' ? 'active' : ''}`} onClick={() => safeToggle('master')}>
          <span className="inv-menu-title">🗂 Masters</span>
          <span className={`inv-arrow ${openMenuSection === 'master' ? 'open' : ''}`}>⌄</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'master' ? 'open' : ''}`}>
          {canSee('item_master') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onItemMaster}>
              <span>Item Master</span>
              {badge(pendingCounts?.item_master || 0, 'gray')}
            </button>
          ) : null}
          {canSee('suppliers') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onSuppliers}>
              <span>Suppliers</span>
              {badge(pendingCounts?.suppliers || 0, 'gray')}
            </button>
          ) : null}
          {canSee('users') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onUsers}>
              <span>Users</span>
              {badge(pendingCounts?.users || 0, 'gray')}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }} />

      <div className="inv-footer">
        <ProfileMenu currentUser={currentUser} onLogout={onLogout} fixed={false} variant="pill" shortChars={6} zIndex={10002} placement="top" />
        <button type="button" className="inv-logout" onClick={actions?.onBackToFirms}>↩ Back to Firms</button>
      </div>
    </div>
  );
}


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

  return (
    <div className="inv-sidebar">
      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${step === 3 ? 'active' : ''}`} onClick={actions?.onDashboard}>
          <span className="inv-menu-title">Dashboard</span>
          <span className="inv-arrow">v</span>
        </button>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'master' ? 'active' : ''}`} onClick={() => safeToggle('master')}>
          <span className="inv-menu-title">Master</span>
          <span className={`inv-arrow ${openMenuSection === 'master' ? 'open' : ''}`}>v</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'master' ? 'open' : ''}`}>
          {canSee('item_master') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onItemMaster}>
              <span>Item</span>
              {badge(pendingCounts?.item_master || 0, 'gray')}
            </button>
          ) : null}

          {canSee('item_master') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onDpmItemsMaster}>
              <span>DPM Items Master</span>
              {badge(0, 'gray')}
            </button>
          ) : null}

          {canSee('suppliers') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onSuppliers}>
              <span>Suppliers</span>
              {badge(pendingCounts?.suppliers || 0, 'gray')}
            </button>
          ) : null}
          {canSee('companies') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onCompanyMaster}>
              <span>Company</span>
              {badge(pendingCounts?.companies || 0, 'gray')}
            </button>
          ) : null}
          <button type="button" className="inv-submenu-item" onClick={actions?.onStateMaster}>
            <span>State</span>
            {badge(pendingCounts?.state_master || 0, 'gray')}
          </button>
          {canSee('truck_master') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onTruckMaster}>
              <span>Truck Master</span>
              {badge(0, 'gray')}
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

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'purchase' ? 'active' : ''}`} onClick={() => safeToggle('purchase')}>
          <span className="inv-menu-title">Indent</span>
          <span className={`inv-arrow ${openMenuSection === 'purchase' ? 'open' : ''}`}>v</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'purchase' ? 'open' : ''}`}>
          {canSee('purchase_requests') ? (
            <>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onIndentForm?.() ?? actions?.onIndent?.()}>
                <span>Indent Form</span>
                {badge(0, 'gray')}
              </button>
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
          <span className="inv-menu-title">Purchase Order</span>
          <span className={`inv-arrow ${openMenuSection === 'po' ? 'open' : ''}`}>v</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'po' ? 'open' : ''}`}>
              {canSee('make_po') ? (
            <>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPendingPoList?.() ?? (actions?.onIndentTab?.('approved') ?? actions?.onIndent?.())}>
                <span>Pending PO</span>
                {badge(pendingCounts?.purchase_requests_approved || 0, 'green')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('all') ?? actions?.onPo?.()}>
                <span>All</span>
                {badge(pendingCounts?.po_all || 0, 'gray')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={() => actions?.onPoTab?.('draft') ?? actions?.onPo?.()}>
                <span>Draft</span>
                {badge(pendingCounts?.po_draft || 0, 'gray')}
              </button>
              <button type="button" className="inv-submenu-item" onClick={actions?.onApprovePo}>
                <span>Pending Approval</span>
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
        <button type="button" className={`inv-menu-header ${openMenuSection === 'ge' ? 'active' : ''}`} onClick={() => safeToggle('ge')}>
          <span className="inv-menu-title">GE Entry</span>
          <span className={`inv-arrow ${openMenuSection === 'ge' ? 'open' : ''}`}>v</span>
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
              <span>Review GE</span>
              {badge(pendingCounts?.ge_data || 0)}
            </button>
          ) : null}
        </div>
      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'orders' ? 'active' : ''}`} onClick={() => safeToggle('orders')}>
          <span className="inv-menu-title">Orders</span>
          <span className={`inv-arrow ${openMenuSection === 'orders' ? 'open' : ''}`}>v</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'orders' ? 'open' : ''}`}>
          {canSee('order_form') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onOrderForm}>
              <span>Order Form</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('order_pending_approval') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onOrderPendingApproval}>
              <span>Pending Approval</span>
              {badge(pendingCounts?.order_pending_approval || 0, 'orange')}
            </button>
          ) : null}
          {canSee('order_pending_scheduling') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onOrderPendingScheduling}>
              <span>Pending Scheduling</span>
              {badge(pendingCounts?.order_pending_scheduling || 0, 'blue')}
            </button>
          ) : null}
          {canSee('order_pending_jobs') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onOrderPendingJobs}>
              <span>Pending Planning</span>
              {badge(pendingCounts?.order_pending_planning || 0, 'green')}
            </button>
          ) : null}
          {canSee('dpm_jobs') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onDpmJobs}>
              <span>DPM Jobs</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('dispatch_planning') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onDispatchPlanning}>
              <span>Dispatch Planning</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('pending_loading_slip') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingLoadingSlip}>
              <span>Loading Slips</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('dispatch_master') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onDispatchMaster}>
              <span>Dispatch Master</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          </div>

      </div>

      <div className="inv-menu-section">
        <button type="button" className={`inv-menu-header ${openMenuSection === 'mrr' ? 'active' : ''}`} onClick={() => safeToggle('mrr')}>
          <span className="inv-menu-title">MRR</span>
          <span className={`inv-arrow ${openMenuSection === 'mrr' ? 'open' : ''}`}>v</span>
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
          {canSee('download_label') ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onDownloadLabel}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Download Label {isPreparingLabels ? <span className="spinner" /> : null}
              </span>
              {badge(0, 'gray')}
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
        <button type="button" className={`inv-menu-header ${openMenuSection === 'reel' ? 'active' : ''}`} onClick={() => safeToggle('reel')}>
          <span className="inv-menu-title">Reel</span>
          <span className={`inv-arrow ${openMenuSection === 'reel' ? 'open' : ''}`}>v</span>
        </button>
        <div className={`inv-submenu ${openMenuSection === 'reel' ? 'open' : ''}`}>
          {canSee('pending_reel_issue_return') && typeof actions?.onPendingReelIssueReturn === 'function' ? (

            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingReelIssueReturn}>
              <span>Pending Jobs For Reel Issue and Return</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('pending_sheet_plant') && typeof actions?.onPendingSheetPlant === 'function' ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingSheetPlant}>
              <span>Pending Jobs For Sheet Plant</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('pending_printing') && typeof actions?.onPendingPrinting === 'function' ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingPrinting}>
              <span>Pending Jobs For Printing</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {canSee('pending_closer') && typeof actions?.onPendingCloser === 'function' ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingCloser}>
              <span>Pending Jobs For Closer</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {typeof actions?.onReelStock === 'function' ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onReelStock}>
              <span>Reel Stock</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
          {typeof actions?.onPendingReelIssueReturn === 'function' ? (
            <button type="button" className="inv-submenu-item" onClick={actions?.onPendingReelIssueReturn}>
              <span>Reel Issue/Return</span>
              {badge(0, 'gray')}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }} />

      <div className="inv-footer">
        <ProfileMenu currentUser={currentUser} onLogout={onLogout} fixed={false} variant="pill" shortChars={6} zIndex={10002} placement="top" />
        <button type="button" className="inv-logout" onClick={actions?.onBackToFirms}>Back to Firms</button>
      </div>
    </div>
  );
}

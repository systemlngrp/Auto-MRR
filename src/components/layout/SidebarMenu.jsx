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
  const {
    sidebarStyle,
    sideButtonStyle,
    sideButtonActiveStyle,
    sideIconStyle,
    sideIconActiveStyle,
    sectionDividerStyle,
    sectionHeaderStyle,
    sectionHeaderTextStyle,
    sectionChevronStyle
  } = styles;

  return (
    <div style={sidebarStyle}>
      <button type="button" style={step === 3 ? sideButtonActiveStyle : sideButtonStyle} onClick={actions.onDashboard}>
        <span style={step === 3 ? sideIconActiveStyle : sideIconStyle}>🏠</span>
        <span>Dashboard</span>
      </button>

      <div style={sectionDividerStyle} />
      <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('ge')}>
        <span style={sectionHeaderTextStyle}>GE ENTRY</span>
        <span style={sectionChevronStyle(openMenuSection === 'ge')}>{'\u203A'}</span>
      </button>
      {openMenuSection === 'ge' && canSeeMenu('new_ge') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onNewGe}>
          <span style={sideIconStyle}>🚚</span>
          <span>New GE</span>
        </button>
      ) : null}
      {openMenuSection === 'ge' && canSeeMenu('ge_data') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onReviewGe}>
          <span style={sideIconStyle}>📋</span>
          <span>Review GE</span>
        </button>
      ) : null}

      <div style={sectionDividerStyle} />
      <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('mrr')}>
        <span style={sectionHeaderTextStyle}>MRR</span>
        <span style={sectionChevronStyle(openMenuSection === 'mrr')}>{'\u203A'}</span>
      </button>
      {openMenuSection === 'mrr' && canSeeMenu('pending_mrr') ? (
        <button
          type="button"
          disabled={isLoadingPending}
          style={{ ...sideButtonStyle, opacity: isLoadingPending ? 0.6 : 1 }}
          onClick={actions.onPendingMrr}
        >
          <span style={sideIconStyle}>⏳</span>
          <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
            <span>Pending MRR</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
              {isLoadingPending ? <span className="spinner" /> : null}
              <span>{menuCountText(pendingCounts.pending_mrr)}</span>
            </span>
          </span>
        </button>
      ) : null}
      {openMenuSection === 'mrr' && canSeeMenu('edit_mrr') ? (
        <button
          type="button"
          disabled={isLoadingEditMrr}
          style={{ ...sideButtonStyle, opacity: isLoadingEditMrr ? 0.6 : 1 }}
          onClick={actions.onEditMrr}
        >
          <span style={sideIconStyle}>📝</span>
          <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
            <span>Edit MRR</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
              {isLoadingEditMrr ? <span className="spinner" /> : null}
              <span>{menuCountText(pendingCounts.edit_mrr)}</span>
            </span>
          </span>
        </button>
      ) : null}
      {openMenuSection === 'mrr' && canSeeMenu('approvals') ? (
        <button
          type="button"
          disabled={isLoadingAllApprovals}
          style={{ ...sideButtonStyle, opacity: isLoadingAllApprovals ? 0.6 : 1 }}
          onClick={actions.onApprovals}
        >
          <span style={sideIconStyle}>✅</span>
          <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
            <span>Approval</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
              {isLoadingAllApprovals ? <span className="spinner" /> : null}
              <span>{menuCountText(pendingCounts.all_approvals)}</span>
            </span>
          </span>
        </button>
      ) : null}
      {openMenuSection === 'mrr' && canSeeMenu('review') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onReviewAll}>
          <span style={sideIconStyle}>🔍</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Review</span>
            {isLoadingPreviewAll ? <span className="spinner" /> : null}
          </span>
        </button>
      ) : null}
      {openMenuSection === 'mrr' && canSeeMenu('download_label') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onDownloadLabel}>
          <span style={sideIconStyle}>{'\u{1F3F7}\uFE0F'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Download Label</span>
            {isPreparingLabels ? <span className="spinner" /> : null}
          </span>
        </button>
      ) : null}

      <div style={sectionDividerStyle} />
      <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('reel')}>
        <span style={sectionHeaderTextStyle}>REEL</span>
        <span style={sectionChevronStyle(openMenuSection === 'reel')}>{'\u203A'}</span>
      </button>
      {openMenuSection === 'reel' && canSeeMenu('pending_reel_issue_return') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onPendingReelIssueReturn}>
          <span style={sideIconStyle}>⏳</span>
          <span>Pending Jobs (Issue &amp; Return)</span>
        </button>
      ) : null}
      {openMenuSection === 'reel' && canSeeMenu('dpm_jobs') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onDpmJobs}>
          <span style={sideIconStyle}>🧾</span>
          <span>DPM Jobs</span>
        </button>
      ) : null}
      {openMenuSection === 'reel' && canSeeMenu('pending_sheet_plant') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onPendingSheetPlant}>
          <span style={sideIconStyle}>🏭</span>
          <span>Pending Jobs (Sheet Plant)</span>
        </button>
      ) : null}
      {openMenuSection === 'reel' && canSeeMenu('pending_printing') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onPendingPrinting}>
          <span style={sideIconStyle}>🖨️</span>
          <span>Pending Jobs (Printing)</span>
        </button>
      ) : null}
      {openMenuSection === 'reel' && canSeeMenu('pending_closer') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onPendingCloser}>
          <span style={sideIconStyle}>🔒</span>
          <span>Pending Jobs (Closer)</span>
        </button>
      ) : null}
      {openMenuSection === 'reel' && canSeeMenu('reel_issue_data') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onReelIssueData}>
          <span style={sideIconStyle}>📄</span>
          <span>Reels Issue Data</span>
        </button>
      ) : null}
      {openMenuSection === 'reel' && canSeeMenu('reel_return_data') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onReelReturnData}>
          <span style={sideIconStyle}>📄</span>
          <span>Reel Return Data</span>
        </button>
      ) : null}

      <div style={sectionDividerStyle} />
      <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('purchase')}>
        <span style={sectionHeaderTextStyle}>PURCHASE</span>
        <span style={sectionChevronStyle(openMenuSection === 'purchase')}>{'\u203A'}</span>
      </button>
      {openMenuSection === 'purchase' && canSeeMenu('purchase_requests') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onIndent}>
          <span style={sideIconStyle}>🛒</span>
          <span>Indent</span>
        </button>
      ) : null}

      <div style={sectionDividerStyle} />
      <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('po')}>
        <span style={sectionHeaderTextStyle}>PO</span>
        <span style={sectionChevronStyle(openMenuSection === 'po')}>{'\u203A'}</span>
      </button>
      {openMenuSection === 'po' && canSeeMenu('make_po') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onPo}>
          <span style={sideIconStyle}>✍️</span>
          <span>PO</span>
        </button>
      ) : null}

      <div style={sectionDividerStyle} />
      <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('master')}>
        <span style={sectionHeaderTextStyle}>MASTER</span>
        <span style={sectionChevronStyle(openMenuSection === 'master')}>{'\u203A'}</span>
      </button>
      {openMenuSection === 'master' && canSeeMenu('item_master') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onItemMaster}>
          <span style={sideIconStyle}>{'\u{1F4E6}'}</span>
          <span>Item Master</span>
        </button>
      ) : null}
      {openMenuSection === 'master' && canSeeMenu('suppliers') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onSuppliers}>
          <span style={sideIconStyle}>🤝</span>
          <span>Supplier</span>
        </button>
      ) : null}
      {openMenuSection === 'master' && canSeeMenu('users') ? (
        <button type="button" style={sideButtonStyle} onClick={actions.onUsers}>
          <span style={sideIconStyle}>👥</span>
          <span>Users</span>
        </button>
      ) : null}

      <div style={{ marginTop: 'auto' }} />

      <div style={{ paddingTop: '10px', borderTop: '1px solid #eef2f7' }}>
        <ProfileMenu currentUser={currentUser} onLogout={onLogout} fixed={false} variant="pill" shortChars={6} zIndex={10002} placement="top" />
      </div>
      <button
        type="button"
        style={{ ...sideButtonStyle, color: '#1d4ed8', background: '#f3f4f6' }}
        onClick={actions.onBackToFirms}
      >
        <span style={sideIconStyle} />
        <span>Back to Firms</span>
      </button>
    </div>
  );
}

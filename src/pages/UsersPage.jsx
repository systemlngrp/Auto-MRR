import React, { useEffect, useState } from 'react';

export default function UsersPage({ selectedFirm, deps, onBack, currentUser, initialView = 'list' }) {
  const { fetchUsers, saveUsers, deleteUser } = deps;
  const currentUserRoleText = String(currentUser?.role || currentUser?.user?.role || '').trim().toLowerCase();
  const isAdmin = currentUserRoleText === 'admin';

  const MENU_OPTIONS = [
    { key: 'new_ge', label: 'New GE Entry' },
    { key: 'ge_data', label: 'GE Entry Data' },
    { key: 'pending_mrr', label: 'Pending MRR' },
    { key: 'edit_mrr', label: 'Edit MRR' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'review', label: 'Review' },
    { key: 'po_details', label: 'PO Details' },
    { key: 'item_master', label: 'Item Master' },
    { key: 'purchase_requests', label: 'Indent' },
    { key: 'make_po', label: 'PO' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'users', label: 'Users' },
    { key: 'download_label', label: 'Download Label' }
  ];

  const blankUser = () => ({
    login_id: '',
    display_name: '',
    user_email: '',
    mobile_no: '',
    role: '',
    menu_access: [],
    password: '',
    active: '1'
  });

  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(['Admin', 'Accounts', 'MD', 'Plant Head', 'Security', 'Plant MRR']);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [formData, setFormData] = useState(blankUser());
  const [errors, setErrors] = useState({});
  const [view, setView] = useState(initialView);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  const handleSetView = (nextView) => {
    if (nextView === 'form') {
      handleAddNew();
      return;
    }
    setView('list');
  };

  useEffect(() => {
    if (users.length > 0) {
      const rolesInUse = users.map(u => String(u.role || '').trim()).filter(Boolean);
      setAvailableRoles(prev => {
        const combined = [...new Set([...prev, ...rolesInUse])];
        return combined.sort((a, b) => a.localeCompare(b));
      });
    }
  }, [users]);

  useEffect(() => {
    if (initialView === 'form') {
      setEditingIndex(-1);
      setFormData(blankUser());
    }
  }, [initialView]);

  if (!isAdmin) {
    return (
      <div className="loading-overlay" style={{ display: 'flex', justifyContent: 'stretch', alignItems: 'stretch', background: 'var(--bg)', backdropFilter: 'blur(12px)' }}>
        <div style={{ margin: 0, background: '#fff', padding: '24px', border: '0', boxShadow: 'none', width: '100vw', height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '26px', letterSpacing: '0.02em' }}>Users</h2>
            <button type="button" className="btn" onClick={onBack} style={{ padding: '10px 16px' }}>Back</button>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', background: '#f9fafb', color: '#1d4ed8', maxWidth: '740px' }}>
            <div style={{ fontWeight: 900, marginBottom: '6px' }}>Access denied</div>
            <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
              Only <span style={{ fontWeight: 800 }}>Admin</span> can view or update users. Please contact Admin if you need access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    async function loadUsers() {
      if (!selectedFirm) return;
      setIsLoading(true);
      setStatus('');
      try {
        const data = await fetchUsers({
          spreadsheetId: selectedFirm.spreadsheetId
        });
        setUsers((data || []).map((user) => ({
          ...user,
          menu_access: Array.isArray(user?.menu_access) ? user.menu_access : []
        })));
        setStatus('');
      } catch (err) {
        setStatus(err?.message || 'Could not load users.');
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, [fetchUsers, selectedFirm]);

  const handleEdit = (index) => {
    setEditingIndex(index);
    const row = users[index] || {};
    setFormData({
      ...blankUser(),
      ...row,
      menu_access: Array.isArray(row?.menu_access) ? row.menu_access : [],
      password: ''
    });
    setErrors({});
    setView('form');
  };

  const handleAddNew = () => {
    setEditingIndex(-1);
    setFormData(blankUser());
    setErrors({});
    setView('form');
  };

  const validate = () => {
    const newErrors = {};
    const trimmedLoginId = String(formData.login_id).trim();
    const trimmedMobile = String(formData.mobile_no || '').trim();
    
    if (!trimmedLoginId) {
      newErrors.login_id = 'Login ID is required';
    } else if (!/^[a-z0-9]{7,16}$/i.test(trimmedLoginId)) {
      newErrors.login_id = 'Must be alpha-numeric (7 to 16 characters)';
    } else if (editingIndex === -1) {
      const normalizedLoginId = trimmedLoginId.toLowerCase();
      const isDuplicate = users.some(u => String(u.login_id).trim().toLowerCase() === normalizedLoginId);
      if (isDuplicate) newErrors.login_id = 'Login ID already exists';
    }

    if (!String(formData.display_name).trim()) newErrors.display_name = 'Display Name is required';
    if (!String(formData.user_email).trim()) newErrors.user_email = 'User Email is required';
    if (!formData.role) newErrors.role = 'Role is required';
    if (editingIndex === -1 && !formData.password) newErrors.password = 'Password is required for new users';
    if (trimmedMobile && !/^\d{10}$/.test(trimmedMobile)) newErrors.mobile_no = 'Mobile Number must be 10 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!selectedFirm) return;
    if (!validate()) return;

    setIsSaving(true);
    setStatus('');
    try {
      const userToSave = {
        ...formData,
        login_id: String(formData.login_id).trim(),
        display_name: String(formData.display_name).trim(),
        user_email: String(formData.user_email).trim(),
        mobile_no: String(formData.mobile_no || '').trim(),
        role: String(formData.role).trim(),
        menu_access: Array.isArray(formData.menu_access) ? formData.menu_access : [],
        password: String(formData.password).trim(),
        active: String(formData.active).trim() === '0' ? '0' : '1'
      };

      await saveUsers([userToSave], {
        spreadsheetId: selectedFirm.spreadsheetId
      });

      const data = await fetchUsers({
        spreadsheetId: selectedFirm.spreadsheetId
      });
      setUsers((data || []).map((user) => ({
        ...user,
        menu_access: Array.isArray(user?.menu_access) ? user.menu_access : []
      })));
      
      setStatus('User saved successfully.');
      setView('list');
    } catch (err) {
      setStatus(err?.message || 'Could not save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (index) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    
    const user = users[index];
    setIsSaving(true);
    try {
      await saveUsers([{ ...user, active: '0' }], {
        spreadsheetId: selectedFirm.spreadsheetId
      });
      
      const data = await fetchUsers({
        spreadsheetId: selectedFirm.spreadsheetId
      });
      setUsers((data || []).map((user) => ({
        ...user,
        menu_access: Array.isArray(user?.menu_access) ? user.menu_access : []
      })));
      setStatus('User deactivated.');
    } catch (err) {
      setStatus(err?.message || 'Could not deactivate user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (index) => {
    if (!selectedFirm || !deleteUser) return;
    const user = users[index];
    const loginId = String(user?.login_id || '').trim();
    if (!loginId) return;
    if (!window.confirm(`Delete user "${loginId}"? This cannot be undone.`)) return;

    setIsSaving(true);
    setStatus('');
    try {
      await deleteUser({
        spreadsheetId: selectedFirm.spreadsheetId,
        login_id: loginId,
      });
      const data = await fetchUsers({ spreadsheetId: selectedFirm.spreadsheetId });
      setUsers((data || []).map((userRow) => ({
        ...userRow,
        menu_access: Array.isArray(userRow?.menu_access) ? userRow.menu_access : []
      })));
      setStatus('User deleted.');
    } catch (err) {
      setStatus(err?.message || 'Could not delete user.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = (fieldName) => ({
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '14px',
    padding: '10px 12px',
    border: `1.5px solid ${errors[fieldName] ? '#b91c1c' : '#d1d5db'}`,
    borderRadius: '4px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: '#fff',
    color: '#111',
    ':focus': { borderColor: '#111', boxShadow: '0 0 0 2px rgba(0,0,0,0.05)' }
  });

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: '6px',
    display: 'block',
    letterSpacing: '0.01em'
  };

  const sectionHeaderStyle = {
    fontSize: '11px',
    fontWeight: '800',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px',
    marginBottom: '20px'
  };

  const errorMsg = (msg) => msg ? (
    <div style={{ color: '#b91c1c', fontSize: '11px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
       <span style={{ fontSize: '14px' }}>⚠️</span> {msg}
    </div>
  ) : null;

  if (view === 'form') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '18px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', borderRadius: '8px', width: '100%', maxWidth: '620px', padding: '18px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'inline-block', padding: '12px 20px', background: '#f9fafb', borderRadius: '50px', marginBottom: '16px', border: '1px solid #f3f4f6' }}>
               <span style={{ fontSize: '28px' }}>👤</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.01em', color: '#1d4ed8' }}>
              {editingIndex >= 0 ? 'Edit User' : 'New User'}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Login ID <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input 
                    value={formData.login_id} 
                    onChange={(e) => { setFormData({ ...formData, login_id: e.target.value }); setErrors({ ...errors, login_id: '' }); }} 
                    disabled={editingIndex >= 0}
                    minLength={7}
                    maxLength={16}
                    inputMode="text"
                    pattern="[A-Za-z0-9]{7,16}"
                    title="Alpha-numeric, 7 to 16 characters"
                    style={{ ...inputStyle('login_id'), background: editingIndex >= 0 ? '#f3f4f6' : '#fff', cursor: editingIndex >= 0 ? 'not-allowed' : 'text' }}
                    autoFocus
                  />
                  {errorMsg(errors.login_id)}
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Display Name <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input 
                    value={formData.display_name} 
                    onChange={(e) => { setFormData({ ...formData, display_name: e.target.value }); setErrors({ ...errors, display_name: '' }); }} 
                    style={inputStyle('display_name')}
                  />
                  {errorMsg(errors.display_name)}
                </div>
                <div>
                  <label style={labelStyle}>User Email <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input 
                    type="email"
                    value={formData.user_email} 
                    onChange={(e) => { setFormData({ ...formData, user_email: e.target.value }); setErrors({ ...errors, user_email: '' }); }} 
                    style={inputStyle('user_email')}
                  />
                  {errorMsg(errors.user_email)}
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number</label>
                  <input
                    value={formData.mobile_no}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => {
                      const next = String(e.target.value || '').replace(/[^\d]/g, '').slice(0, 10);
                      setFormData({ ...formData, mobile_no: next });
                      setErrors({ ...errors, mobile_no: '' });
                    }}
                    style={inputStyle('mobile_no')}
                  />
                  {errorMsg(errors.mobile_no)}
                </div>
                <div>
                  <label style={labelStyle}>Role <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      value={formData.role} 
                      onChange={(e) => { setFormData({ ...formData, role: e.target.value }); setErrors({ ...errors, role: '' }); }} 
                      style={{ ...inputStyle('role'), flex: 1 }}
                    >
                      <option value="">Select</option>
                      {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button 
                      type="button" 
                      className="btn main" 
                      title="Add New Role"
                      style={{ width: '40px', padding: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        const newRole = window.prompt('Enter new role name:');
                        if (newRole && newRole.trim()) {
                          const r = newRole.trim();
                          if (!availableRoles.includes(r)) {
                            setAvailableRoles(prev => [...prev, r].sort());
                          }
                          setFormData({ ...formData, role: r });
                          setErrors({ ...errors, role: '' });
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                  {errorMsg(errors.role)}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Menu Access</label>
                  <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', background: '#fff' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className="btn small"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        onClick={() => setFormData({ ...formData, menu_access: MENU_OPTIONS.map((opt) => opt.key) })}
                        disabled={isSaving}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn small"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        onClick={() => setFormData({ ...formData, menu_access: [] })}
                        disabled={isSaving}
                      >
                        Clear
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                      {MENU_OPTIONS.map((opt) => {
                        const selected = Array.isArray(formData.menu_access) && formData.menu_access.includes(opt.key);
                        return (
                          <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>
                            <input
                              type="checkbox"
                              checked={!!selected}
                              disabled={isSaving}
                              onChange={(e) => {
                                const checked = !!e.target.checked;
                                const current = Array.isArray(formData.menu_access) ? formData.menu_access : [];
                                const next = checked
                                  ? Array.from(new Set([...current, opt.key]))
                                  : current.filter((key) => key !== opt.key);
                                setFormData({ ...formData, menu_access: next });
                              }}
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Password {editingIndex === -1 && <span style={{ color: '#b91c1c' }}>*</span>}</label>
                  <input 
                    type="password"
                    value={formData.password} 
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }} 
                    style={inputStyle('password')}
                  />
                  {errorMsg(errors.password)}
                </div>
              </div>
            </div>

            <div>
              <div style={sectionHeaderStyle}>Status</div>
              <div>
                <label style={labelStyle}>Account Status</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" checked={String(formData.active) === '1'} onChange={() => setFormData({...formData, active: '1'})} /> Active
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" checked={String(formData.active) === '0'} onChange={() => setFormData({...formData, active: '0'})} /> Inactive
                   </label>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '48px', gap: '12px' }}>
            <button 
              className="btn" 
              onClick={() => setView('list')} 
              disabled={isSaving}
              style={{ padding: '12px 24px', fontWeight: '600' }}
            >
              Cancel
            </button>
            <button 
              className="btn main" 
              onClick={handleSave} 
              disabled={isSaving}
              style={{ padding: '12px 32px', fontWeight: '700', minWidth: '160px' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSaving ? <span className="spinner" /> : null}
                <span>{isSaving ? 'Saving...' : 'Save User'}</span>
              </span>
            </button>
          </div>

          {(isSaving || status) ? (
            <div className="status" style={{ marginTop: '24px', textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '10px', fontSize: '13px', border: '1px solid #f3f4f6', fontWeight: 800 }}>
              {isSaving ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner" /> Saving...
                </span>
              ) : status}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.03em', fontWeight: '900' }}>Users</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn" onClick={onBack} disabled={isLoading || isSaving} style={{ padding: '10px 20px' }}>{'← Back'}</button>
            <button 
              className="btn main" 
              onClick={handleAddNew} 
              disabled={isLoading || isSaving} 
              style={{ width: '42px', height: '42px', padding: 0, fontSize: '24px', fontWeight: '900', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Add New User"
            >
              +
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="status" style={{ marginBottom: '16px', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', border: '1px solid #e5e7eb', background: '#f8fafc', fontWeight: 900, fontSize: '12px', color: '#1d4ed8' }}>
            <span className="spinner" /> Loading users...
          </div>
        ) : status ? (
          <div className="status" style={{ marginBottom: '16px', padding: '12px' }}>{status}</div>
        ) : null}

        {(() => {
          const headerCellStyle = { fontSize: '12px', background: '#1d4ed8', color: '#fff', fontWeight: 'bold', padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
          const bodyCellStyle = { fontSize: '12px', color: '#000', padding: '10px 10px', verticalAlign: 'middle' };

          return (
        <div className="wrap" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '4px' }}>
          <table className="table data-table" style={{ minWidth: '1100px' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, width: '160px' }}>Login ID</th>
                <th style={{ ...headerCellStyle, width: '220px' }}>Name</th>
                <th style={{ ...headerCellStyle, width: '260px' }}>Email</th>
                <th style={{ ...headerCellStyle, width: '160px' }}>Mobile</th>
                <th style={{ ...headerCellStyle, width: '140px' }}>Role</th>
                <th style={{ ...headerCellStyle, width: '120px' }}>Status</th>
                <th style={{ ...headerCellStyle, width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.login_id || index} style={{ background: index % 2 === 1 ? '#fbfbfb' : '#fff' }}>
                  <td style={{ ...bodyCellStyle, fontWeight: 900 }}>{user.login_id}</td>
                  <td style={{ ...bodyCellStyle, fontWeight: 800 }}>{user.display_name}</td>
                  <td style={{ ...bodyCellStyle, color: '#1d4ed8' }}>{user.user_email}</td>
                  <td style={{ ...bodyCellStyle }}>{String(user.mobile_no || '').trim() || '-'}</td>
                  <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', background: '#f3f4f6', borderRadius: '50px', fontSize: '12px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase' }}>
                      {user.role}
                    </span>
                  </td>
                  <td className="c" style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    {String(user.active) === '1' ? (
                      <span style={{ color: '#059669', fontWeight: '800', fontSize: '12px' }}>● ACTIVE</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '12px' }}>● INACTIVE</span>
                    )}
                  </td>
                  <td className="c" style={{ ...bodyCellStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'flex-end' }}>
                      <button className="btn small" onClick={() => handleEdit(index)} style={{ padding: '6px 12px' }}>Edit</button>
                      <button 
                        className="btn small" 
                        style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', padding: '6px 12px' }} 
                        onClick={() => handleDeactivate(index)}
                        disabled={isSaving}
                      >
                        Deactivate
                      </button>
                      <button
                        className="btn small"
                        style={{ background: '#111827', borderColor: '#111827', color: '#fff', padding: '6px 12px' }}
                        onClick={() => handleDelete(index)}
                        disabled={isSaving}
                        title="Delete user (only if not used)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          );
        })()}
      </div>
    </div>
  );
}

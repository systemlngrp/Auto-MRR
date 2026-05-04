import React, { useEffect, useState } from 'react';

export default function UsersPage({ selectedFirm, deps, onBack, initialView = 'list' }) {
  const { fetchUsers, saveUsers } = deps;

  const blankUser = () => ({
    login_id: '',
    display_name: '',
    user_email: '',
    role: '',
    password: '',
    active: '1'
  });

  const [users, setUsers] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [formData, setFormData] = useState(blankUser());
  const [errors, setErrors] = useState({});
  const [view, setView] = useState(initialView); // respects prop
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (initialView === 'form') {
      setEditingIndex(-1);
      setFormData(blankUser());
    }
  }, [initialView]);

  useEffect(() => {
    async function loadUsers() {
      if (!selectedFirm) return;
      setIsLoading(true);
      setStatus('Loading users...');
      try {
        const data = await fetchUsers({
          firmKey: selectedFirm.firmKey,
          backendUrl: selectedFirm.backendUrl
        });
        setUsers(data || []);
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
    setFormData({ ...blankUser(), ...users[index], password: '' });
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
    
    if (!trimmedLoginId) {
      newErrors.login_id = 'Login ID is required';
    } else if (!/^\d{8}$/.test(trimmedLoginId)) {
      newErrors.login_id = 'Must be exactly 8 numeric digits';
    } else if (editingIndex === -1) {
      const isDuplicate = users.some(u => String(u.login_id).trim() === trimmedLoginId);
      if (isDuplicate) newErrors.login_id = 'Login ID already exists';
    }

    if (!String(formData.display_name).trim()) newErrors.display_name = 'Display Name is required';
    if (!String(formData.user_email).trim()) newErrors.user_email = 'User Email is required';
    if (!formData.role) newErrors.role = 'Role is required';
    if (editingIndex === -1 && !formData.password) newErrors.password = 'Password is required for new users';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!selectedFirm) return;
    if (!validate()) return;

    setIsSaving(true);
    setStatus('Saving user...');
    try {
      const userToSave = {
        ...formData,
        login_id: String(formData.login_id).trim(),
        display_name: String(formData.display_name).trim(),
        user_email: String(formData.user_email).trim(),
        role: String(formData.role).trim(),
        password: String(formData.password).trim(),
        active: String(formData.active).trim() === '0' ? '0' : '1'
      };

      await saveUsers([userToSave], {
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });

      const data = await fetchUsers({
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      setUsers(data || []);
      
      setStatus('User saved successfully.');
      setView('list');
    } catch (err) {
      setStatus(err?.message || 'Could not save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    
    const user = users[index];
    setIsSaving(true);
    try {
      await saveUsers([{ ...user, active: '0' }], {
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      
      const data = await fetchUsers({
        firmKey: selectedFirm.firmKey,
        backendUrl: selectedFirm.backendUrl
      });
      setUsers(data || []);
      setStatus('User deactivated.');
    } catch (err) {
      setStatus(err?.message || 'Could not deactivate user.');
    } finally {
      setIsSaving(false);
    }
  };

  // Shared UI Primitives
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
    color: '#374151',
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
      <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '40px 24px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', borderRadius: '8px', width: '100%', maxWidth: '540px', padding: '40px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-block', padding: '12px 20px', background: '#f9fafb', borderRadius: '50px', marginBottom: '16px', border: '1px solid #f3f4f6' }}>
               <span style={{ fontSize: '28px' }}>👤</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.01em', color: '#111827' }}>
              {editingIndex >= 0 ? 'Edit User' : 'New User'}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Login ID (Numeric 8-digits) <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input 
                    value={formData.login_id} 
                    onChange={(e) => { setFormData({ ...formData, login_id: e.target.value }); setErrors({ ...errors, login_id: '' }); }} 
                    disabled={editingIndex >= 0}
                    style={{ ...inputStyle('login_id'), background: editingIndex >= 0 ? '#f3f4f6' : '#fff', cursor: editingIndex >= 0 ? 'not-allowed' : 'text' }}
                    placeholder="e.g. 10002001"
                    autoFocus
                  />
                  {errorMsg(errors.login_id)}
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Display Name <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input 
                    value={formData.display_name} 
                    onChange={(e) => { setFormData({ ...formData, display_name: e.target.value }); setErrors({ ...errors, display_name: '' }); }} 
                    style={inputStyle('display_name')}
                    placeholder="Full name of user"
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
                    placeholder="email@example.com"
                  />
                  {errorMsg(errors.user_email)}
                </div>
                <div>
                  <label style={labelStyle}>Role <span style={{ color: '#b91c1c' }}>*</span></label>
                  <select 
                    value={formData.role} 
                    onChange={(e) => { setFormData({ ...formData, role: e.target.value }); setErrors({ ...errors, role: '' }); }} 
                    style={inputStyle('role')}
                  >
                    <option value="">Select Role...</option>
                    <option value="Admin">Admin</option>
                    <option value="Accounts">Accounts</option>
                    <option value="MD">MD</option>
                    <option value="Plant Head">Plant Head</option>
                    <option value="Security">Security</option>
                    <option value="Plant MRR">Plant MRR</option>
                  </select>
                  {errorMsg(errors.role)}
                </div>
                <div>
                  <label style={labelStyle}>Password {editingIndex === -1 && <span style={{ color: '#b91c1c' }}>*</span>}</label>
                  <input 
                    type="password"
                    value={formData.password} 
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }} 
                    style={inputStyle('password')}
                    placeholder={editingIndex >= 0 ? "Leave blank to keep current" : "Secure password"}
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
              {isSaving ? 'Saving...' : 'Save User'}
            </button>
          </div>

          {status && <div className="status" style={{ marginTop: '24px', textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '6px', fontSize: '13px', border: '1px solid #f3f4f6' }}>{status}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '24px' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.03em', fontWeight: '900' }}>GLOBAL USERS</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shared across all firms</p>
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

        {status ? <div className="status" style={{ marginBottom: '16px', padding: '12px' }}>{status}</div> : null}

        <div className="wrap" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '4px' }}>
          <table className="table" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ width: '150px', fontSize: '12px' }}>Login ID</th>
                <th style={{ width: '200px', fontSize: '12px' }}>Name</th>
                <th style={{ width: '220px', fontSize: '12px' }}>Email</th>
                <th style={{ width: '120px', fontSize: '12px' }}>Role</th>
                <th style={{ width: '100px', fontSize: '12px' }}>Status</th>
                <th style={{ width: '140px', fontSize: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {false && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>📁</div>
                    <div style={{ fontWeight: '700' }}>No users found.</div>
                    <div style={{ fontSize: '12px' }}>Click "+ Add New User" to create the first one.</div>
                  </td>
                </tr>
              )}
              {users.map((user, index) => (
                <tr key={user.login_id || index}>
                  <td style={{ fontWeight: '700', color: '#111827' }}>{user.login_id}</td>
                  <td>{user.display_name}</td>
                  <td style={{ color: '#4b5563' }}>{user.user_email}</td>
                  <td>
                    <span style={{ padding: '4px 10px', background: '#f3f4f6', borderRadius: '50px', fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>
                      {user.role}
                    </span>
                  </td>
                  <td className="c">
                    {String(user.active) === '1' ? (
                      <span style={{ color: '#059669', fontWeight: '800', fontSize: '12px' }}>● ACTIVE</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '12px' }}>● INACTIVE</span>
                    )}
                  </td>
                  <td className="c">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn small" onClick={() => handleEdit(index)} style={{ padding: '6px 12px' }}>Edit</button>
                      <button 
                        className="btn small" 
                        style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', padding: '6px 12px' }} 
                        onClick={() => handleDelete(index)}
                        disabled={isSaving}
                      >
                        Deact.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

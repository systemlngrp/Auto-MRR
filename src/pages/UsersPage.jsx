import React, { useEffect, useState } from 'react';

export default function UsersPage({ selectedFirm, deps, onBack }) {
  const { fetchUsers, saveUsers } = deps;

  const blankUser = () => ({
    login_id: '',
    display_name: '',
    user_email: '',
    role: '',
    password: '',
    active: '1'
  });

  const [rows, setRows] = useState([blankUser()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function loadUsers() {
      if (!selectedFirm) return;
      setIsLoading(true);
      setStatus('Loading users...');
      try {
        const users = await fetchUsers({
          spreadsheetId: selectedFirm.spreadsheetId,
          scriptUrl: selectedFirm.scriptUrl
        });
        setRows(users.length ? users.map((row) => ({ ...blankUser(), ...row, password: '' })) : [blankUser()]);
        setStatus('');
      } catch (err) {
        setRows([blankUser()]);
        setStatus(err?.message || 'Could not load users.');
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, [fetchUsers, selectedFirm]);

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, blankUser()]);

  const removeRow = (index) => {
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [blankUser()];
    });
  };

  const handleSave = async () => {
    if (!selectedFirm) return;
    const users = rows
      .map((row) => ({
        login_id: String(row.login_id || '').trim(),
        display_name: String(row.display_name || '').trim(),
        user_email: String(row.user_email || '').trim(),
        role: String(row.role || '').trim(),
        password: String(row.password || '').trim(),
        active: String(row.active || '1').trim() === '0' ? '0' : '1'
      }))
      .filter((row) => row.login_id);

    if (!users.length) {
      setStatus('Add at least one user ID before saving.');
      return;
    }

    setIsSaving(true);
    setStatus('Saving users...');
    try {
      await saveUsers(users, {
        spreadsheetId: selectedFirm.spreadsheetId,
        scriptUrl: selectedFirm.scriptUrl
      });
      setRows(users.map((row) => ({ ...row, password: '' })));
      setStatus('Users saved successfully.');
    } catch (err) {
      setStatus(err?.message || 'Could not save users.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(216, 209, 196, 0.98)', padding: '24px' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.03em' }}>USERS</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{selectedFirm?.name || ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={onBack} disabled={isLoading || isSaving}>{'< Back'}</button>
            <button className="btn" onClick={addRow} disabled={isLoading || isSaving}>+ Add User</button>
            <button className="btn main" onClick={handleSave} disabled={isLoading || isSaving}>{isSaving ? 'Saving...' : 'Save Users'}</button>
          </div>
        </div>

        {status ? <div className="status" style={{ marginBottom: '14px' }}>{status}</div> : null}

        <div className="wrap" style={{ overflowX: 'auto', border: '1px solid var(--line)' }}>
          <table className="table" style={{ minWidth: '1100px' }}>
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Login ID</th>
                <th style={{ width: '220px' }}>Name</th>
                <th style={{ width: '240px' }}>Email</th>
                <th style={{ width: '140px' }}>Role</th>
                <th style={{ width: '180px' }}>Password</th>
                <th style={{ width: '100px' }}>Active</th>
                <th style={{ width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.login_id || 'user'}-${index}`}>
                  <td><input value={row.login_id || ''} onChange={(e) => updateRow(index, 'login_id', e.target.value)} style={{ width: '100%' }} /></td>
                  <td><input value={row.display_name || ''} onChange={(e) => updateRow(index, 'display_name', e.target.value)} style={{ width: '100%' }} /></td>
                  <td><input value={row.user_email || ''} onChange={(e) => updateRow(index, 'user_email', e.target.value)} style={{ width: '100%' }} /></td>
                  <td><input value={row.role || ''} onChange={(e) => updateRow(index, 'role', e.target.value)} style={{ width: '100%' }} /></td>
                  <td><input value={row.password || ''} onChange={(e) => updateRow(index, 'password', e.target.value)} placeholder="Leave blank to keep" style={{ width: '100%' }} /></td>
                  <td>
                    <select value={String(row.active || '1')} onChange={(e) => updateRow(index, 'active', e.target.value)} style={{ width: '100%' }}>
                      <option value="1">Yes</option>
                      <option value="0">No</option>
                    </select>
                  </td>
                  <td className="c">
                    <button className="btn small" style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff' }} onClick={() => removeRow(index)} disabled={isLoading || isSaving}>Del</button>
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

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminAPI, locationAPI } from '../../services/api';
import { Modal } from '../../components/common';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ role: '', search: '', page: 1 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [officerForm, setOfficerForm] = useState({ email: '', password: '', full_name: '', phone: '', department_id: '', employee_id: '', state_id: '', district_id: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ ...filters, limit: 20 });
      setUsers(res.users || []);
      setPagination(res.pagination);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminAPI.getDepartments().then(res => setDepartments(res.departments || []));
    locationAPI.getStates().then(res => setStates(res.states || []));
  }, []);

  useEffect(() => {
    if (officerForm.state_id) {
      locationAPI.getDistricts(officerForm.state_id).then(res => setDistricts(res.districts || []));
    } else {
      setDistricts([]);
    }
  }, [officerForm.state_id]);

  const handleToggle = async (id, currentStatus) => {
    try {
      await adminAPI.toggleUserStatus(id);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminAPI.createOfficer(officerForm);
      toast.success('Officer account created successfully');
      setShowCreateModal(false);
      setOfficerForm({ email: '', password: '', full_name: '', phone: '', department_id: '', employee_id: '', state_id: '', district_id: '' });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const ROLE_BADGES = {
    citizen: { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Citizen' },
    officer: { bg: 'var(--info-bg)', color: 'var(--info)', label: 'Officer' },
    admin: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Admin' },
    super_admin: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Super Admin' }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage citizens, officers, and admins</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Officer Account
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input className="form-control" placeholder="Search by name or email..." value={filters.search}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))} style={{ flex: 2 }} />
        <select className="form-control" value={filters.role} onChange={e => setFilters(prev => ({ ...prev, role: e.target.value, page: 1 }))}>
          <option value="">All Roles</option>
          <option value="citizen">Citizens</option>
          <option value="officer">Officers</option>
          <option value="admin">Admins</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ role: '', search: '', page: 1 })}>Clear</button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
          Total: {pagination.total}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Points</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : (
                users.map(u => {
                  const roleBadge = ROLE_BADGES[u.role] || ROLE_BADGES.citizen;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        {u.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
                      </td>
                      <td>
                        <span style={{ background: roleBadge.bg, color: roleBadge.color, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {u.departments?.name || (u.role === 'citizen' ? '—' : 'Unassigned')}
                      </td>
                      <td>
                        {u.role === 'citizen' ? (
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.points || 0} pts</span>
                        ) : u.role === 'officer' ? (
                          <span style={{ fontWeight: 700, color: 'var(--success)' }}>{u.govt_points || 0} pts</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span style={{
                          background: u.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: u.is_active ? 'var(--success)' : 'var(--danger)',
                          borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700
                        }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggle(u.id, u.is_active)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Officer Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Department Officer Account"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateOfficer} disabled={creating}>
              {creating ? 'Creating...' : '+ Create Officer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateOfficer}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input className="form-control" placeholder="Officer's full name" value={officerForm.full_name}
                onChange={e => setOfficerForm(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-control" placeholder="Govt employee ID" value={officerForm.employee_id}
                onChange={e => setOfficerForm(p => ({ ...p, employee_id: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input type="email" className="form-control" placeholder="Official email" value={officerForm.email}
              onChange={e => setOfficerForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-control" value={officerForm.phone}
                onChange={e => setOfficerForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password <span className="required">*</span></label>
              <input type="password" className="form-control" placeholder="Set temporary password" value={officerForm.password}
                onChange={e => setOfficerForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Department <span className="required">*</span></label>
            <select className="form-control" value={officerForm.department_id}
              onChange={e => setOfficerForm(p => ({ ...p, department_id: e.target.value }))} required>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
            </select>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">State <span className="required">*</span></label>
              <select className="form-control" value={officerForm.state_id}
                onChange={e => setOfficerForm(p => ({ ...p, state_id: e.target.value, district_id: '' }))} required>
                <option value="">Select state</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">District <span className="required">*</span></label>
              <select className="form-control" value={officerForm.district_id}
                onChange={e => setOfficerForm(p => ({ ...p, district_id: e.target.value }))}
                disabled={!officerForm.state_id} required>
                <option value="">Select district</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

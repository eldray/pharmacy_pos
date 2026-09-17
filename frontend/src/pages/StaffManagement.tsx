// src/pages/StaffManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Building, Search, X, Loader2, Edit2,
  Ban, CheckCircle, Trash2, ShieldCheck, AlertCircle,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { useAppStore } from '../store';
import { User, Branch, StaffProfile } from '../types';

const VALID_ROLES = ['admin', 'manager', 'pharmacist_sales', 'cashier', 'lab_tech'] as const;
type ValidRole = typeof VALID_ROLES[number];

const ROLE_LABELS: Record<ValidRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  pharmacist_sales: 'Pharmacist (Sales)',
  cashier: 'Cashier',
  lab_tech: 'Lab Technician',
};

type UserRow = User & { staffProfile?: StaffProfile | null };

export const StaffManagement: React.FC = () => {
  const { currentUser, fetchUsers } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const canManage = ['admin', 'manager'].includes(currentUser?.role || '');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ValidRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [profileForUser, setProfileForUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/users'),
        api.get('/branches'),
      ]);
      setUsers(usersRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (err) {
      console.error('Staff load error:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBlockToggle = async (user: UserRow) => {
    const nextStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const verb = nextStatus === 'blocked' ? 'Block' : 'Unblock';
    if (!window.confirm(`${verb} user "${user.name}"?`)) return;

    setActionLoading(user.id);
    try {
      await api.patch(`/users/${user.id}/status`, { status: nextStatus });
      setSuccess(`User ${nextStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully.`);
      await fetchData();
      await fetchUsers().catch(() => { });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!window.confirm(
      `Delete user "${user.name}" permanently?\n\n` +
      `This removes their login AND HR profile. Transaction history is preserved but will reference a deleted user.\n\n` +
      `Consider "Block" instead if you just want to disable their login.`
    )) return;

    setActionLoading(user.id);
    try {
      await api.delete(`/users/${user.id}`);
      setSuccess('User deleted.');
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const filtered = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (!term) return true;
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.staffProfile?.employeeId || '').toLowerCase().includes(term) ||
      (u.staffProfile?.department || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" /> HR & Staff Management
          </h1>
          <p className="text-gray-500">
            Manage user accounts and their HR profiles. One row per user.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition"
          >
            <UserPlus className="w-5 h-5" /> Add New User
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-lg border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 border-gray-300"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="border rounded-lg px-3 py-2 border-gray-300"
        >
          <option value="all">All Roles</option>
          {VALID_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border rounded-lg px-3 py-2 border-gray-300"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No users match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600 font-semibold text-sm">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">HR Profile</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => {
                  const profile = u.staffProfile;
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      {/* User */}
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        {isSelf && (
                          <span className="text-[10px] font-bold text-indigo-600">YOU</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {ROLE_LABELS[u.role as ValidRole] || u.role}
                        </span>
                      </td>

                      {/* HR Profile */}
                      <td className="p-4">
                        {profile ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">{profile.designation}</div>
                            <div className="text-xs text-gray-500">{profile.department}</div>
                            <div className="text-xs font-mono text-indigo-600 mt-0.5">
                              ID: {profile.employeeId}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not linked</span>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="p-4">
                        {profile?.branch ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Building className="w-3 h-3 mr-1" />
                            {profile.branch.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">All branches</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${u.status === 'blocked'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                          {u.status === 'blocked' ? (
                            <><Ban className="w-3 h-3" /> Blocked</>
                          ) : (
                            <><CheckCircle className="w-3 h-3" /> Active</>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          {isAdmin && (
                            <button
                              onClick={() => setEditingUser(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                              title="Edit user"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={() => setProfileForUser(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                              style={{
                                background: 'var(--color-info-light)',
                                color: 'var(--color-info-text)',
                                border: '1px solid var(--color-info)',
                              }}
                              title={profile ? 'Edit HR profile' : 'Create HR profile'}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {profile ? 'HR' : 'Link HR'}
                            </button>
                          )}

                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => handleBlockToggle(u)}
                              disabled={actionLoading === u.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                              style={{
                                background: u.status === 'blocked'
                                  ? 'var(--color-success-light)'
                                  : 'var(--color-warning-light)',
                                color: u.status === 'blocked'
                                  ? 'var(--color-success-text)'
                                  : 'var(--color-warning-text)',
                                border: `1px solid ${u.status === 'blocked' ? 'var(--color-success)' : 'var(--color-warning)'}`,
                              }}
                            >
                              {u.status === 'blocked' ? (
                                <><CheckCircle className="w-3 h-3" /> Unblock</>
                              ) : (
                                <><Ban className="w-3 h-3" /> Block</>
                              )}
                            </button>
                          )}

                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={actionLoading === u.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                              style={{
                                background: 'var(--color-danger-light)',
                                color: 'var(--color-danger-text)',
                                border: '1px solid var(--color-danger)',
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create user modal (with optional HR section) */}
      {showCreateModal && (
        <UserFormModal
          mode="create"
          branches={branches}
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            setShowCreateModal(false);
            setSuccess('User created successfully.');
            await fetchData();
            await fetchUsers().catch(() => { });
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* Edit user modal */}
      {editingUser && (
        <UserFormModal
          mode="edit"
          user={editingUser}
          branches={branches}
          onClose={() => setEditingUser(null)}
          onSaved={async () => {
            setEditingUser(null);
            setSuccess('User updated successfully.');
            await fetchData();
            await fetchUsers().catch(() => { });
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* HR profile modal */}
      {profileForUser && (
        <StaffProfileModal
          user={profileForUser}
          existing={profileForUser.staffProfile}
          branches={branches}
          onClose={() => setProfileForUser(null)}
          onSaved={async () => {
            setProfileForUser(null);
            setSuccess('HR profile saved.');
            await fetchData();
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   User Form Modal — create or edit
   ═════════════════════════════════════════════════════════════════════ */
const UserFormModal: React.FC<{
  mode: 'create' | 'edit';
  user?: UserRow;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ mode, user, branches, onClose, onSaved }) => {
  const isEdit = mode === 'edit';

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<ValidRole>((user?.role as ValidRole) || 'cashier');

  // HR section (create only)
  const [withProfile, setWithProfile] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Pharmacy');
  const [branchId, setBranchId] = useState('');
  const [salary, setSalary] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required');
    if (!email.trim()) return setError('Email is required');

    if (!isEdit) {
      if (!password) return setError('Password is required');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (password !== confirmPassword) return setError('Passwords do not match');
    } else if (password) {
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (password !== confirmPassword) return setError('Passwords do not match');
    }

    if (!isEdit && withProfile) {
      if (!employeeId.trim()) return setError('Employee ID required when creating HR profile');
      if (!designation.trim()) return setError('Designation required when creating HR profile');
    }

    setBusy(true);
    try {
      if (isEdit) {
        const payload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        };
        if (password) payload.password = password;
        await api.put(`/users/${user!.id}`, payload);
      } else {
        const payload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        };
        if (withProfile) {
          payload.staffProfile = {
            employeeId: employeeId.trim(),
            designation: designation.trim(),
            department: department.trim() || 'Pharmacy',
            branchId: branchId || null,
            salary: salary ? parseFloat(salary) : 0,
          };
        }
        await api.post('/users', payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    fontSize: 13, background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 6, color: 'var(--color-input-text)',
    padding: '8px 12px', outline: 'none', height: 38, width: '100%',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit User' : 'Create User'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} placeholder="e.g. John Mensah" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} placeholder="john@pharmacy.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select value={role} onChange={(e) => setRole(e.target.value as ValidRole)} style={fieldStyle}>
              {VALID_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {isEdit ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} placeholder="leave blank to keep" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={fieldStyle} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Leave password fields blank to keep the current password.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} placeholder="min 6 chars" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm *</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={fieldStyle} />
                </div>
              </div>

              {/* HR section — optional on create */}
              <div style={{ paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={withProfile}
                    onChange={(e) => setWithProfile(e.target.checked)}
                  />
                  Also create HR profile now
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Leave unchecked to add HR details later from the main list.
                </p>

                {withProfile && (
                  <div className="space-y-3 mt-3 pl-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                        <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={fieldStyle} placeholder="EMP-001" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                        <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={fieldStyle} placeholder="e.g. Staff Pharmacist" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} style={fieldStyle} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={fieldStyle}>
                          <option value="">All branches</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
                      <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} style={fieldStyle} placeholder="0.00" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   Staff Profile Modal — create or edit HR profile
   ═════════════════════════════════════════════════════════════════════ */
const StaffProfileModal: React.FC<{
  user: UserRow;
  existing: StaffProfile | null | undefined;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, existing, branches, onClose, onSaved }) => {
  const [employeeId, setEmployeeId] = useState(existing?.employeeId || '');
  const [designation, setDesignation] = useState(existing?.designation || '');
  const [department, setDepartment] = useState(existing?.department || 'Pharmacy');
  const [branchId, setBranchId] = useState(existing?.branchId || '');
  const [phoneNumber, setPhoneNumber] = useState(existing?.phoneNumber || '');
  const [employmentType, setEmploymentType] = useState(existing?.employmentType || 'full_time');
  const [salary, setSalary] = useState(existing?.salary?.toString() || '0');
  const [hireDate, setHireDate] = useState(existing?.hireDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(existing?.status || 'active');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!employeeId.trim()) return setError('Employee ID is required');
    if (!designation.trim()) return setError('Designation is required');

    setBusy(true);
    try {
      await api.post('/staff', {
        userId: user.id,
        branchId: branchId || null,
        employeeId: employeeId.trim(),
        department: department.trim(),
        designation: designation.trim(),
        phoneNumber: phoneNumber.trim() || null,
        hireDate,
        employmentType,
        salary: parseFloat(salary) || 0,
        status,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    fontSize: 13, background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 6, color: 'var(--color-input-text)',
    padding: '8px 12px', outline: 'none', height: 38, width: '100%',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {existing ? 'Edit HR Profile' : 'Create HR Profile'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              For user: <strong>{user.name}</strong> ({ROLE_LABELS[user.role as ValidRole] || user.role})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
              <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={fieldStyle} placeholder="EMP-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
              <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={fieldStyle}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
              <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as any)} style={fieldStyle}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="locum">Locum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
              <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={fieldStyle}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Saving…' : (existing ? 'Save Changes' : 'Create Profile')}
          </button>
        </div>
      </div>
    </div>
  );
};
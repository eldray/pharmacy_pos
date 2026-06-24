// src/pages/StaffManagement.tsx
import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    Edit2,
    Trash2,
    User,
    Mail,
    Shield,
    Phone,
    Calendar,
    MoreVertical,
    FlaskConical,
    X,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    Filter,
    UserCheck,
    UserX,
    Clock,
    Award,
    Briefcase,
    Loader2
} from 'lucide-react';
import { useAppStore } from '../store';
import { User as UserType, UserRole } from '../types';
import { Card } from '../components/ui/Card';
import { validateUser, PASSWORD_RULE } from '../lib/validation';
import { validateUser, PASSWORD_RULE } from '../lib/validation';

export const StaffManagement: React.FC = () => {
    const { currentUser, users, fetchUsers, addUser, updateUser } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'cashier' as UserRole,
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // --- Shared field style ---
    const fieldStyle: React.CSSProperties = {
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-input-text)',
        outline: 'none',
        fontSize: '0.875rem',
        padding: '10px 14px',
        width: '100%',
        transition: 'border-color 100ms ease, box-shadow 100ms ease',
    };

    const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
    };

    const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border)';
        e.currentTarget.style.boxShadow = 'none';
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        await fetchUsers();
        setLoading(false);
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role: UserRole) => {
        const config = {
            admin: { cls: 'badge-admin' },
            cashier: { cls: 'badge-cashier' },
            officer: { cls: 'badge-officer' },
            lab: { cls: 'badge-lab' },
        };
        const { cls } = config[role] || { cls: 'badge-secondary' };
        const labels = {
            admin: 'Admin',
            cashier: 'Cashier',
            officer: 'Officer',
            lab: 'Lab Tech'
        };
        return (
            <span className={`badge ${cls} text-sm px-3 py-1.5`}>
                {labels[role] || role}
            </span>
        );
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case 'admin': return <Shield className="h-4 w-4" />;
            case 'cashier': return <User className="h-4 w-4" />;
            case 'officer': return <Award className="h-4 w-4" />;
            case 'lab': return <FlaskConical className="h-4 w-4" />;
            default: return <User className="h-4 w-4" />;
        }
    };

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'var(--color-role-admin)';
            case 'cashier': return 'var(--color-role-cashier)';
            case 'officer': return 'var(--color-role-officer)';
            case 'lab': return 'var(--color-role-lab)';
            default: return 'var(--color-text-muted)';
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'cashier' });
        setShowPassword(false);
        setMessage(null);
        setShowModal(true);
    };

    const openEditModal = (user: UserType) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
        });
        setShowPassword(false);
        setMessage(null);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Client-side validation mirrors the backend rules (incl. password policy).
        const errors = validateUser(formData, !editingUser);
        const firstError = Object.values(errors)[0];
        if (firstError) {
            setMessage({ type: 'error', text: firstError });
            return;
        }

        setIsSubmitting(true);
        try {
            let success = false;
            if (editingUser) {
                const updates: any = {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                };
                if (formData.password) updates.password = formData.password;
                success = !!(await updateUser(editingUser.id, updates));
            } else {
                success = !!(await addUser(formData));
            }

            if (success) {
                setMessage({ type: 'success', text: editingUser ? 'User updated successfully!' : 'User added successfully!' });
                setTimeout(() => {
                    setShowModal(false);
                    loadUsers();
                }, 1000);
            } else {
                setMessage({ type: 'error', text: 'Failed to save user. Please try again.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (user: UserType) => {
        if (user.id === currentUser?.id) {
            alert('You cannot delete your own account');
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
            // Implement delete - you'll need to add this to your store
            alert('Delete functionality to be implemented');
        }
    };

    const stats = {
        total: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        cashier: users.filter(u => u.role === 'cashier').length,
        officer: users.filter(u => u.role === 'officer').length,
        lab: users.filter(u => u.role === 'lab').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            {/* Header - Clean & Simple (matching AnalyticsPage) */}
            <div className="mb-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Staff Management</h1>
                        <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your pharmacy staff and their access levels</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="btn-accent flex items-center gap-2 px-4 py-1.5 text-[0.75rem]"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add Staff
                    </button>
                </div>
            </div>

            {/* Stats - Clean cards with theme colors */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-3 text-center">
                    <p className="text-xl font-bold text-primary tabular-nums">{stats.total}</p>
                    <p className="text-xs text-secondary">Total Staff</p>
                </Card>
                <Card className="p-3 text-center" style={{ borderColor: 'var(--color-role-admin)' }}>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-role-admin)' }}>{stats.admin}</p>
                    <p className="text-xs text-secondary">Admins</p>
                </Card>
                <Card className="p-3 text-center" style={{ borderColor: 'var(--color-role-cashier)' }}>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-role-cashier)' }}>{stats.cashier}</p>
                    <p className="text-xs text-secondary">Cashiers</p>
                </Card>
                <Card className="p-3 text-center" style={{ borderColor: 'var(--color-role-officer)' }}>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-role-officer)' }}>{stats.officer}</p>
                    <p className="text-xs text-secondary">Officers</p>
                </Card>
                <Card className="p-3 text-center" style={{ borderColor: 'var(--color-role-lab)' }}>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-role-lab)' }}>{stats.lab}</p>
                    <p className="text-xs text-secondary">Lab Techs</p>
                </Card>
            </div>

            {/* Search and Filter - Clean */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="input-base w-full pl-10 pr-4 text-sm"
                            style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
                            onFocus={onFieldFocus}
                            onBlur={onFieldBlur}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input-base text-sm"
                            style={fieldStyle}
                            onFocus={onFieldFocus}
                            onBlur={onFieldBlur}
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="cashier">Cashier</option>
                            <option value="officer">Officer</option>
                            <option value="lab">Lab Tech</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Staff List - Clean table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-subtle border-b border-theme">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Staff</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Users className="h-12 w-12 text-muted mx-auto mb-3" />
                                        <p className="text-lg font-medium text-primary">No staff found</p>
                                        <p className="text-sm text-secondary">
                                            {searchQuery || roleFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first staff member'}
                                        </p>
                                        {(searchQuery || roleFilter !== 'all') && (
                                            <button
                                                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                                                className="mt-3 text-sm text-accent hover:text-accent-hover"
                                            >
                                                Clear filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-subtle transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg" style={{ background: 'var(--gradient-accent)' }}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-primary group-hover:text-accent transition-colors">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-secondary flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2 text-sm text-secondary">
                                                <Mail className="h-4 w-4 text-muted" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(user.role)}
                                                {getRoleBadge(user.role)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {user.id === currentUser?.id ? (
                                                <span className="badge badge-info text-sm px-3 py-1.5 inline-flex items-center gap-1">
                                                    <UserCheck className="h-3 w-3" />
                                                    You
                                                </span>
                                            ) : (
                                                <span className="badge badge-success text-sm px-3 py-1.5 inline-flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 rounded-lg transition-all hover:bg-subtle"
                                                    style={{ color: 'var(--color-text-secondary)' }}
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {user.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="p-2 rounded-lg transition-all hover:bg-danger-light"
                                                        style={{ color: 'var(--color-danger-text)' }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Staff Modal - Clean with theme colors */}
            {showModal && (
                <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal">
                    <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border-theme">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-brand text-white rounded-t-2xl px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {editingUser ? 'Edit Staff' : 'Add New Staff'}
                                    </h2>
                                    <p className="text-white/80 text-sm">
                                        {editingUser ? 'Update staff information' : 'Create a new staff account'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {message && (
                                <div className={`p-3 rounded-xl flex items-start gap-2 text-sm border ${message.type === 'success'
                                        ? 'border-success text-success-text bg-success-light'
                                        : 'border-danger text-danger-text bg-danger-light'
                                    }`}>
                                    {message.type === 'success' ? (
                                        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    )}
                                    {message.text}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1.5">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-base w-full text-sm"
                                    style={fieldStyle}
                                    onFocus={onFieldFocus}
                                    onBlur={onFieldBlur}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1.5">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input-base w-full text-sm"
                                    style={fieldStyle}
                                    onFocus={onFieldFocus}
                                    onBlur={onFieldBlur}
                                    placeholder="Enter email address"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1.5">
                                    Password {!editingUser && '*'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                                        className="input-base w-full text-sm pr-10"
                                        style={fieldStyle}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                        required={!editingUser}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {(!editingUser || formData.password) && (
                                    <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                        {PASSWORD_RULE}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1.5">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="input-base w-full text-sm"
                                    style={fieldStyle}
                                    onFocus={onFieldFocus}
                                    onBlur={onFieldBlur}
                                    required
                                >
                                    <option value="cashier">Cashier</option>
                                    <option value="officer">Inventory Officer</option>
                                    <option value="lab">Lab Technician</option>
                                    <option value="admin">Administrator</option>
                                </select>
                                <div className={`mt-2 p-3 rounded-lg border text-xs`} style={{
                                    borderColor: getRoleColor(formData.role),
                                    background: 'var(--color-bg-subtle)',
                                    color: 'var(--color-text-secondary)'
                                }}>
                                    {formData.role === 'admin' && '🔑 Full access to all system features'}
                                    {formData.role === 'cashier' && '🛒 Point of sale and customer service only'}
                                    {formData.role === 'officer' && '📦 Inventory and purchase order management'}
                                    {formData.role === 'lab' && '🔬 Laboratory test management and results'}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-theme">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 btn-ghost py-2.5 text-sm"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-accent py-2.5 text-sm"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                                            {editingUser ? 'Updating...' : 'Adding...'}
                                        </>
                                    ) : (
                                        editingUser ? 'Update Staff' : 'Add Staff'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
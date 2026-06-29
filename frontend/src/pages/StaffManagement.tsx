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
    Briefcase
} from 'lucide-react';
import { useAppStore } from '../store';
import { User as UserType, UserRole } from '../types';
import { Card } from '../components/ui/Card';

export const StaffManagement: React.FC = () => {
    const { currentUser, users, fetchUsers, addUser, updateUser } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'cashier' as UserRole,
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            admin: { color: 'from-purple-500 to-pink-600', text: 'Admin' },
            cashier: { color: 'from-blue-500 to-cyan-600', text: 'Cashier' },
            officer: { color: 'from-orange-500 to-red-600', text: 'Officer' },
            lab: { color: 'from-green-500 to-emerald-600', text: 'Lab Tech' },
        };
        const { color, text } = config[role] || { color: 'from-gray-500 to-gray-600', text: role };
        return (
            <span className={`px-2.5 py-1 text-xs font-bold text-white rounded-full bg-gradient-to-r ${color}`}>
                {text}
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
            case 'admin': return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'cashier': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'officer': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'lab': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

        if (!formData.name || !formData.email || !formData.role) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        if (!editingUser && !formData.password) {
            setMessage({ type: 'error', text: 'Password is required for new users' });
            return;
        }

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Staff Management</h1>
                        <p className="text-white/80">Manage your pharmacy staff and their access levels</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20"
                    >
                        <UserPlus className="h-5 w-5" />
                        Add Staff
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-4 text-center backdrop-blur-sm bg-white/80 border-2 border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-xs text-gray-500">Total Staff</p>
                </Card>
                <Card className="p-4 text-center backdrop-blur-sm bg-white/80 border-2 border-purple-200 bg-purple-50/50">
                    <p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
                    <p className="text-xs text-gray-500">Admins</p>
                </Card>
                <Card className="p-4 text-center backdrop-blur-sm bg-white/80 border-2 border-blue-200 bg-blue-50/50">
                    <p className="text-2xl font-bold text-blue-600">{stats.cashier}</p>
                    <p className="text-xs text-gray-500">Cashiers</p>
                </Card>
                <Card className="p-4 text-center backdrop-blur-sm bg-white/80 border-2 border-orange-200 bg-orange-50/50">
                    <p className="text-2xl font-bold text-orange-600">{stats.officer}</p>
                    <p className="text-xs text-gray-500">Officers</p>
                </Card>
                <Card className="p-4 text-center backdrop-blur-sm bg-white/80 border-2 border-green-200 bg-green-50/50">
                    <p className="text-2xl font-bold text-green-600">{stats.lab}</p>
                    <p className="text-xs text-gray-500">Lab Techs</p>
                </Card>
            </div>

            {/* Search and Filter */}
            <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white/50 backdrop-blur-sm text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white/50 backdrop-blur-sm text-sm"
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

            {/* Staff List */}
            <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/80 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Staff</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-lg font-medium text-gray-900">No staff found</p>
                                        <p className="text-sm text-gray-500">
                                            {searchQuery || roleFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first staff member'}
                                        </p>
                                        {(searchQuery || roleFilter !== 'all') && (
                                            <button
                                                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                                                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                Clear filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(user.role)}
                                                {getRoleBadge(user.role)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.id === currentUser?.id ? (
                                                <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                                                    <UserCheck className="h-3 w-3" />
                                                    You
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {user.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

            {/* Staff Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl px-6 py-4">
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
                                <div className={`p-3 rounded-xl flex items-start gap-2 text-sm border-2 ${message.type === 'success'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
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
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="Enter email address"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Password {!editingUser && '*'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10"
                                        required={!editingUser}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                    required
                                >
                                    <option value="cashier">Cashier</option>
                                    <option value="officer">Inventory Officer</option>
                                    <option value="lab">Lab Technician</option>
                                    <option value="admin">Administrator</option>
                                </select>
                                <div className={`mt-2 p-3 rounded-lg border text-xs ${getRoleColor(formData.role)}`}>
                                    {formData.role === 'admin' && '🔑 Full access to all system features'}
                                    {formData.role === 'cashier' && '🛒 Point of sale and customer service only'}
                                    {formData.role === 'officer' && '📦 Inventory and purchase order management'}
                                    {formData.role === 'lab' && '🔬 Laboratory test management and results'}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                                >
                                    {editingUser ? 'Update Staff' : 'Add Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
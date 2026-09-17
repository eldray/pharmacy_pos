// src/pages/CustomersPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Users, Search, RefreshCw, Eye, Edit2, Plus, Shield,
    Phone, Mail, Calendar, Loader2, ChevronLeft, ChevronRight, X, Trash2,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { useAppStore } from '../store';
import { Customer, InsuranceProvider, CustomerInsurance } from '../types';
import { Card } from '../components/ui/Card';

const safeNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

export const CustomersPage: React.FC = () => {
    const { currentUser } = useAppStore();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [providers, setProviders] = useState<InsuranceProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Detail modal
    const [selected, setSelected] = useState<Customer | null>(null);

    // Edit / Create modal
    const [editing, setEditing] = useState<Customer | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const canEdit = ['admin', 'manager', 'cashier', 'pharmacist_sales'].includes(currentUser?.role || '');
    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [customersRes, providersRes] = await Promise.all([
                api.get(`/customers${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery)}` : ''}`),
                api.get('/insurance/providers'),
            ]);
            // Handle both paginated { data, pagination } and array responses
            const c = customersRes.data?.data ?? customersRes.data ?? [];
            setCustomers(Array.isArray(c) ? c : []);
            setProviders(providersRes.data || []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => { loadData(); }, [loadData]);

    const totalPages = Math.ceil(customers.length / itemsPerPage);
    const paginated = customers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const openCreate = () => {
        setEditing(null);
        setShowEditModal(true);
    };

    const openEdit = (c: Customer) => {
        setEditing(c);
        setShowEditModal(true);
    };

    const handleDelete = async (c: Customer) => {
        if (!canDelete) return;
        if (!window.confirm(`Deactivate customer "${c.fullName}"? They'll no longer appear in searches.`)) return;
        try {
            await api.delete(`/customers/${c.id}`);
            loadData();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Users className="h-5 w-5" style={{ color: 'var(--color-accent-text)' }} />
                        Customers
                    </h1>
                    <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        All registered customers and their insurance policies
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                    {canEdit && (
                        <button onClick={openCreate} className="btn-accent flex items-center gap-2 px-4 py-2 text-sm">
                            <Plus className="h-4 w-4" /> New Customer
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by name, phone, or email…"
                        className="input-base w-full text-sm"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <Card className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
                </Card>
            ) : error ? (
                <Card className="p-12 text-center">
                    <p className="text-danger">{error}</p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-subtle border-b border-theme">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Customer</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Insurance</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Added</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center">
                                            <Users className="h-12 w-12 text-muted mx-auto mb-3" />
                                            <p className="text-lg font-medium text-primary">No customers found</p>
                                            <p className="text-sm text-secondary">
                                                {searchQuery ? 'Try a different search' : 'Register your first customer to get started'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((c) => {
                                        const insurances = c.insurances || [];
                                        const primary = insurances.find((i) => i.isPrimary) || insurances[0];
                                        return (
                                            <tr key={c.id} className="hover:bg-subtle transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="flex items-center justify-center flex-shrink-0"
                                                            style={{
                                                                width: 32, height: 32, borderRadius: 999,
                                                                background: 'var(--color-accent-light)',
                                                                color: 'var(--color-accent-text)',
                                                                fontSize: 12, fontWeight: 700,
                                                            }}
                                                        >
                                                            {c.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-primary">{c.fullName}</p>
                                                            <p className="text-xs text-secondary capitalize">
                                                                {c.status === 'active' ? 'Active' : 'Inactive'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5 text-sm">
                                                        {c.phone && (
                                                            <span className="flex items-center gap-1 text-primary">
                                                                <Phone className="h-3 w-3 text-muted" /> {c.phone}
                                                            </span>
                                                        )}
                                                        {c.email && (
                                                            <span className="flex items-center gap-1 text-secondary text-xs">
                                                                <Mail className="h-3 w-3 text-muted" /> {c.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {primary ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-info-text)' }}>
                                                                <Shield className="h-3 w-3" /> {primary.provider?.name || 'Insurance'}
                                                            </span>
                                                            <span className="text-[0.65rem] font-mono text-muted">{primary.policyNumber}</span>
                                                            {insurances.length > 1 && (
                                                                <span className="text-[0.6rem] text-muted">+{insurances.length - 1} more</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-secondary">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-xs">
                                                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 justify-end flex-wrap">
                                                        <button
                                                            onClick={() => setSelected(c)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                        >
                                                            <Eye className="h-3 w-3" /> View
                                                        </button>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => openEdit(c)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                            >
                                                                <Edit2 className="h-3 w-3" /> Edit
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(c)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                                                                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)' }}
                                                            >
                                                                <Trash2 className="h-3 w-3" /> Deactivate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3">
                            <p className="text-sm text-secondary">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, customers.length)} of {customers.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="px-3 py-1.5 text-sm font-medium text-primary">{currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {selected && (
                <CustomerDetailModal
                    customer={selected}
                    onClose={() => setSelected(null)}
                    onEdit={() => { openEdit(selected); setSelected(null); }}
                    canEdit={canEdit}
                />
            )}

            {showEditModal && (
                <CustomerFormModal
                    customer={editing}
                    providers={providers}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => { setShowEditModal(false); loadData(); }}
                />
            )}
        </div>
    );
};

/* ═════════════════════════════════════════════════════════════════════
   Customer Detail Modal
   ═════════════════════════════════════════════════════════════════════ */
const CustomerDetailModal: React.FC<{
    customer: Customer;
    onClose: () => void;
    onEdit: () => void;
    canEdit: boolean;
}> = ({ customer, onClose, onEdit, canEdit }) => {
    const insurances = customer.insurances || [];

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', zIndex: 'var(--z-modal)' }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl overflow-hidden"
                style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                    width: '100%', maxWidth: 520,
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                width: 42, height: 42, borderRadius: 999,
                                background: 'var(--color-accent-light)',
                                color: 'var(--color-accent-text)',
                                fontSize: 14, fontWeight: 700,
                            }}
                        >
                            {customer.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {customer.fullName}
                            </h3>
                            <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                                {customer.status === 'active' ? 'Active customer' : 'Inactive'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded transition-colors"
                        style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Phone</p>
                            <p className="text-sm text-primary mt-0.5">{customer.phone || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Email</p>
                            <p className="text-sm text-primary mt-0.5 truncate">{customer.email || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Date of Birth</p>
                            <p className="text-sm text-primary mt-0.5">
                                {customer.dob ? new Date(customer.dob).toLocaleDateString() : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Gender</p>
                            <p className="text-sm text-primary capitalize mt-0.5">{customer.gender || '—'}</p>
                        </div>
                    </div>

                    {customer.address && (
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Address</p>
                            <p className="text-sm text-primary mt-0.5">{customer.address}</p>
                        </div>
                    )}

                    {customer.notes && (
                        <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
                            <p className="text-sm text-primary mt-0.5 whitespace-pre-wrap">{customer.notes}</p>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                            <Shield className="h-3 w-3" /> Insurance Policies ({insurances.length})
                        </p>
                        {insurances.length === 0 ? (
                            <p className="text-sm text-muted">No insurance on file</p>
                        ) : (
                            <div className="space-y-2">
                                {insurances.map((ins) => (
                                    <div
                                        key={ins.id}
                                        className="flex items-center justify-between p-3 rounded-lg"
                                        style={{
                                            background: ins.isPrimary ? 'var(--color-accent-light)' : 'var(--color-bg-subtle)',
                                            border: ins.isPrimary ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: ins.isPrimary ? 'var(--color-accent-text)' : 'var(--color-text-primary)' }}>
                                                {ins.provider?.name || 'Insurance'}
                                                {ins.isPrimary && <span className="ml-1.5 text-[0.65rem] font-bold">· PRIMARY</span>}
                                            </p>
                                            <p className="text-xs font-mono mt-0.5" style={{ color: ins.isPrimary ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}>
                                                {ins.policyNumber}
                                            </p>
                                        </div>
                                        <span
                                            className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                            style={{
                                                background: ins.status === 'active' ? 'var(--color-success-light)' : 'var(--color-bg-surface)',
                                                color: ins.status === 'active' ? 'var(--color-success-text)' : 'var(--color-text-muted)',
                                            }}
                                        >
                                            {ins.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                {canEdit && (
                    <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Close</button>
                        <button onClick={onEdit} className="btn-accent px-4 py-2 text-sm flex items-center gap-2">
                            <Edit2 className="h-3.5 w-3.5" /> Edit Customer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ═════════════════════════════════════════════════════════════════════
   Customer Form Modal (Create / Edit)
   ═════════════════════════════════════════════════════════════════════ */
const CustomerFormModal: React.FC<{
    customer: Customer | null;
    providers: InsuranceProvider[];
    onClose: () => void;
    onSaved: () => void;
}> = ({ customer, providers, onClose, onSaved }) => {
    const isEdit = !!customer;

    const [fullName, setFullName] = useState(customer?.fullName || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const [email, setEmail] = useState(customer?.email || '');
    const [dob, setDob] = useState(customer?.dob ? customer.dob.slice(0, 10) : '');
    const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>(customer?.gender || '');
    const [address, setAddress] = useState(customer?.address || '');
    const [notes, setNotes] = useState(customer?.notes || '');

    // ── Insurance (only used when creating) ─────────────────────
    const [providerId, setProviderId] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [isPrimary, setIsPrimary] = useState(true);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setError('');
        if (!fullName.trim()) return setError('Name is required');
        if (!phone.trim()) return setError('Phone is required');

        // If creating AND user filled in insurance, require both fields
        if (!isEdit) {
            const hasProvider = !!providerId;
            const hasPolicy = !!policyNumber.trim();
            if (hasProvider && !hasPolicy) return setError('Please enter the policy number');
            if (!hasProvider && hasPolicy) return setError('Please select an insurance provider');
        }

        setBusy(true);
        try {
            const payload: any = {
                fullName: fullName.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                dob: dob || undefined,
                gender: gender || undefined,
                address: address.trim() || undefined,
                notes: notes.trim() || undefined,
            };

            // Attach insurance on create (matches POS/Lab intake)
            if (!isEdit && providerId && policyNumber.trim()) {
                payload.insurances = [{
                    insuranceProviderId: providerId,
                    policyNumber: policyNumber.trim(),
                    isPrimary,
                    status: 'active',
                }];
            }

            if (isEdit) {
                await api.put(`/customers/${customer!.id}`, payload);
            } else {
                await api.post('/customers', payload);
            }
            onSaved();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const fieldStyle: React.CSSProperties = {
        fontSize: 13,
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: 6,
        color: 'var(--color-input-text)',
        padding: '8px 12px',
        outline: 'none',
        height: 36, width: '100%',
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', zIndex: 'calc(var(--z-modal) + 1)' }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl overflow-hidden"
                style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                    width: '100%', maxWidth: 520,
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                }}
            >
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {isEdit ? 'Edit Customer' : 'New Customer'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded"
                        style={{ width: 32, height: 32, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {error && (
                        <div className="p-2.5 rounded text-sm" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Full Name *</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={fieldStyle} placeholder="e.g. John Mensah" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Phone *</label>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldStyle} placeholder="0XX XXX XXXX" />
                        </div>
                        <div>
                            <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} placeholder="optional" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Date of Birth</label>
                            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                            <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Gender</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value as any)} style={fieldStyle}>
                                <option value="">—</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Address</label>
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={fieldStyle} placeholder="optional" />
                    </div>
                    <div>
                        <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="allergies, chronic conditions, etc."
                            rows={2}
                            style={{ ...fieldStyle, height: 'auto', minHeight: 60, resize: 'vertical' }}
                        />
                    </div>

                    {/* ═══ Insurance Section (only on create) ═══ */}
                    {!isEdit && (
                        <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                                <Shield style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                    Insurance (optional)
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                        Provider
                                    </label>
                                    <select value={providerId} onChange={(e) => setProviderId(e.target.value)} style={fieldStyle}>
                                        <option value="">— No insurance —</option>
                                        {providers.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                                {p.coverageType === 'percentage'
                                                    ? ` (${p.defaultCopayPercent}% co-pay)`
                                                    : ' (fixed rate)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {providerId && (
                                    <>
                                        <div>
                                            <label className="block text-[0.7rem] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                                Membership / Policy Number
                                            </label>
                                            <input
                                                type="text"
                                                value={policyNumber}
                                                onChange={(e) => setPolicyNumber(e.target.value)}
                                                placeholder="e.g. NHIS-0012345"
                                                style={fieldStyle}
                                            />
                                        </div>

                                        <label className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                                            Set as primary insurance
                                        </label>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* On edit, tell users where to manage policies */}
                    {isEdit && (
                        <div
                            className="text-xs p-3 rounded"
                            style={{
                                background: 'var(--color-info-light)',
                                color: 'var(--color-info-text)',
                                border: '1px solid var(--color-info)',
                            }}
                        >
                            To add or manage insurance policies, use the POS or Lab intake forms.
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button onClick={onClose} disabled={busy} className="btn-ghost px-4 py-2 text-sm">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={busy} className="btn-accent px-4 py-2 text-sm">
                        {busy ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Customer')}
                    </button>
                </div>
            </div>
        </div>
    );
};
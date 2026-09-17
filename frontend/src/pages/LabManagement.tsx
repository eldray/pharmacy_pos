// src/pages/LabManagement.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FlaskConical, Plus, Search, Eye, RefreshCw, CheckCircle, XCircle,
    Clock, Loader2, Calendar, ChevronLeft, ChevronRight, Ban,
    Shield, Info, Printer,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { LabRequestModal } from '../components/LabRequestModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { LabTransaction } from '../types';

const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

type DateFilter = 'today' | 'week' | 'month' | 'all';

export const LabManagement: React.FC = () => {
    const {
        labTransactions = [],
        fetchLabTransactions,
        fetchLabTestTemplates,
        getLabTransactionStats,
        payLabTransaction,
        cancelLabTransaction,
        currentUser,
    } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('today');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [printOrder, setPrintOrder] = useState<LabTransaction | null>(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, cancelled: 0, revenue: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        switch (dateFilter) {
            case 'today': return { startDate: today.toISOString(), endDate: tomorrow.toISOString() };
            case 'week': { const s = new Date(today); s.setDate(today.getDate() - 7); return { startDate: s.toISOString(), endDate: tomorrow.toISOString() }; }
            case 'month': { const s = new Date(today); s.setMonth(today.getMonth() - 1); return { startDate: s.toISOString(), endDate: tomorrow.toISOString() }; }
            default: return {};
        }
    }, [dateFilter]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchLabTransactions({
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    q: searchQuery.trim() || undefined,
                }),
                fetchLabTestTemplates(),
            ]);
            const s = await getLabTransactionStats(dateRange.startDate, dateRange.endDate);
            if (s) setStats(s);
        } catch (err: any) {
            console.error('Load data error:', err);
            setError(err?.response?.data?.message || err.message || 'Failed to load lab data');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateRange, searchQuery, fetchLabTransactions, fetchLabTestTemplates, getLabTransactionStats]);

    useEffect(() => { loadData(); }, [loadData]);

    const totalPages = Math.ceil(labTransactions.length / itemsPerPage);
    const paginatedOrders = labTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: string, paymentStatus: string) => {
        if (status === 'cancelled') {
            return <span className="badge badge-danger text-sm px-3 py-1.5">🚫 Cancelled</span>;
        }
        if (paymentStatus === 'paid') {
            return <span className="badge badge-success text-sm px-3 py-1.5">✅ Paid</span>;
        }
        return <span className="badge badge-warning text-sm px-3 py-1.5">⏳ Awaiting Payment</span>;
    };

    const canRequestLab = ['admin', 'manager', 'lab_tech', 'pharmacist_sales'].includes(currentUser?.role || '');
    const canCancel = ['admin', 'manager', 'lab_tech'].includes(currentUser?.role || '');
    const canPay = ['admin', 'manager', 'cashier'].includes(currentUser?.role || '');

    const handleCancel = async (order: LabTransaction) => {
        if (!window.confirm(`Cancel lab order ${order.transactionNumber}?`)) return;
        try {
            await cancelLabTransaction(order.id);
            loadData();
        } catch {
            alert('Failed to cancel order');
        }
    };

    const handlePay = async (order: LabTransaction) => {
        if (!window.confirm(`Collect payment for ${order.transactionNumber}?`)) return;
        try {
            await payLabTransaction(order.id, { paymentMethod: 'cash' });
            loadData();
        } catch {
            alert('Failed to record payment');
        }
    };

    const DateFilterBtn: React.FC<{ label: string; value: DateFilter }> = ({ label, value }) => (
        <button
            onClick={() => { setDateFilter(value); setCurrentPage(1); }}
            className="px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold"
            style={{
                background: dateFilter === value ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                color: dateFilter === value ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                border: dateFilter === value ? 'none' : '1px solid var(--color-border)',
                cursor: 'pointer',
            }}
        >
            {label}
        </button>
    );

    if (loading && labTransactions.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-4xl mb-4" style={{ color: 'var(--color-danger)' }}>⚠️</div>
                    <h3 className="text-xl font-bold text-primary">Error Loading Lab Data</h3>
                    <p className="mt-2 text-secondary">{error}</p>
                    <button onClick={loadData} className="btn-accent mt-4 px-4 py-2.5 text-sm">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <FlaskConical className="h-5 w-5" style={{ color: 'var(--color-accent-text)' }} />
                        Laboratory Service Orders
                    </h1>
                    <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Lab tests issued by lab technicians — collected at the cashier desk
                    </p>
                </div>
                {canRequestLab && (
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="btn-accent flex items-center gap-2 px-5 py-2.5 text-sm"
                    >
                        <Plus className="h-4 w-4" /> Request Lab Test
                    </button>
                )}
            </div>

            {/* Info banner */}
            <div
                className="flex items-start gap-2 p-3 rounded-lg text-sm"
                style={{ background: 'var(--color-info-light)', color: 'var(--color-info-text)', border: '1px solid var(--color-info)' }}
            >
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Lab orders are created here and paid by the cashier on the <strong>Payment &amp; Collections</strong> page. This screen is for tracking order status.</span>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-secondary font-medium">Total</p>
                            <p className="text-2xl font-bold text-primary tabular-nums">{stats.total}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}><FlaskConical className="h-4 w-4" /></div>
                    </div>
                </Card>
                <Card className="p-4" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-warning-text)' }}>Awaiting Payment</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-warning-text)' }}>{stats.pending}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-warning)', color: 'var(--color-accent-fg)' }}><Clock className="h-4 w-4" /></div>
                    </div>
                </Card>
                <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Paid</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success-text)' }}>{stats.paid}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}><CheckCircle className="h-4 w-4" /></div>
                    </div>
                </Card>
                <Card className="p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-danger-text)' }}>Cancelled</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-danger-text)' }}>{stats.cancelled}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-danger)', color: 'var(--color-accent-fg)' }}><XCircle className="h-4 w-4" /></div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search by order #, patient name, or phone…"
                                className="input-base w-full text-sm"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="input-base px-4 text-sm"
                            style={{ minWidth: 160 }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Awaiting Payment</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button onClick={loadData} className="btn-ghost px-4 py-2.5">
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Date:</span>
                        <div className="flex gap-1.5">
                            <DateFilterBtn label="Today" value="today" />
                            <DateFilterBtn label="Week" value="week" />
                            <DateFilterBtn label="Month" value="month" />
                            <DateFilterBtn label="All" value="all" />
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full ml-2" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                            {labTransactions.length} orders
                        </span>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead className="bg-subtle border-b border-theme">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Order #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Patient</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Tests</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Insurance</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Payment Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Created</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {paginatedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <FlaskConical className="h-12 w-12 text-muted mx-auto mb-3" />
                                        <p className="text-lg font-medium text-primary">No lab orders found</p>
                                        <p className="text-sm text-secondary">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order) => {
                                    const testCount = (order.labTests || []).length;
                                    const isPendingPayment = order.status === 'pending' && order.paymentStatus !== 'paid';
                                    const isPaid = order.paymentStatus === 'paid';
                                    const isCancelled = order.status === 'cancelled';

                                    return (
                                        <tr key={order.id} className="hover:bg-subtle transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-semibold text-sm text-primary">{order.transactionNumber}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-sm text-primary">{order.patientName || 'Walk-in'}</p>
                                                    {order.patientPhone && <p className="text-xs text-secondary">{order.patientPhone}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm tabular-nums text-primary">{testCount} test{testCount !== 1 ? 's' : ''}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {order.insuranceProviderName ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-info-text)' }}>
                                                            <Shield className="h-3 w-3" /> {order.insuranceProviderName}
                                                        </span>
                                                        {order.policyNumber && <span className="text-[0.65rem] font-mono text-muted">{order.policyNumber}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{getStatusBadge(order.status, order.paymentStatus)}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">
                                                <div className="flex flex-col">
                                                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-xs">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 justify-end flex-wrap">
                                                    {isPendingPayment && (
                                                        <button
                                                            onClick={() => setPrintOrder(order)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                        >
                                                            <Printer className="h-3 w-3" /> Print Slip
                                                        </button>
                                                    )}
                                                    {isPendingPayment && (
                                                        <Link
                                                            to={`/dashboard/lab/${order.id}`}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                        >
                                                            <Eye className="h-3 w-3" /> View
                                                        </Link>
                                                    )}
                                                    {isPendingPayment && canCancel && (
                                                        <button
                                                            onClick={() => handleCancel(order)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                                                            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)' }}
                                                        >
                                                            <Ban className="h-3 w-3" /> Cancel
                                                        </button>
                                                    )}
                                                    {isPaid && (
                                                        <>
                                                            <button
                                                                onClick={() => setPrintOrder(order)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                            >
                                                                <Printer className="h-3 w-3" /> Reprint
                                                            </button>
                                                            <Link
                                                                to={`/dashboard/lab/${order.id}`}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                            >
                                                                <Eye className="h-3 w-3" /> View
                                                            </Link>
                                                        </>
                                                    )}
                                                    {isCancelled && (
                                                        <span className="text-xs text-muted">No actions</span>
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
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, labTransactions.length)} of {labTransactions.length}
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

            <LabRequestModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSuccess={(createdOrder) => {
                    loadData();
                    if (createdOrder) setPrintOrder(createdOrder);
                }}
            />

            {printOrder && (
                <ReceiptModal
                    doc={printOrder}
                    mode="order"
                    onClose={() => setPrintOrder(null)}
                    onPrint={undefined}
                />
            )}
        </div>
    );
};
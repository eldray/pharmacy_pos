// src/pages/LabManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    FlaskConical,
    Plus,
    Search,
    Eye,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    Loader2,
    User,
    FileText,
    Printer,
    Calendar,
    AlertCircle,
    CreditCard,
    Filter,
    TrendingUp,
    Package,
    Zap,
    ChevronRight,
    ChevronLeft,
    ArrowUpRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { LabRequestModal } from '../components/LabRequestModal';
import { LabTransaction } from '../types';
import { Link } from 'react-router-dom';

export const LabManagement: React.FC = () => {
    const {
        labTransactions,
        labTestTemplates,
        fetchLabTransactions,
        fetchLabTestTemplates,
        getLabTransactionStats,
        currentUser
    } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Shared field style ---
    const fieldStyle: React.CSSProperties = {
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: '6px',
        color: 'var(--color-input-text)',
        outline: 'none',
        fontSize: '14px',
        padding: '10px 14px',
        width: '100%',
        height: '42px',
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

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            await fetchLabTransactions();
            await fetchLabTestTemplates();
            const statsData = await getLabTransactionStats();
            setStats(statsData);
        } catch (err: any) {
            console.error('Load data error:', err);
            setError(err.message || 'Failed to load lab data');
        } finally {
            setLoading(false);
        }
    };

    // ─── Date Filter Function ──────────────────────────────────────────────
    const filterByDate = (transactions: LabTransaction[], filter: string): LabTransaction[] => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (filter) {
            case 'today':
                return transactions.filter(t => {
                    const txDate = new Date(t.createdAt);
                    return txDate >= today;
                });
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 7);
                return transactions.filter(t => {
                    const txDate = new Date(t.createdAt);
                    return txDate >= weekStart;
                });
            case 'month':
                const monthStart = new Date(today);
                monthStart.setMonth(today.getMonth() - 1);
                return transactions.filter(t => {
                    const txDate = new Date(t.createdAt);
                    return txDate >= monthStart;
                });
            default:
                return transactions;
        }
    };

    const filteredTransactions = useMemo(() => {
        let transactions = labTransactions || [];

        // Apply date filter first
        transactions = filterByDate(transactions, dateFilter);

        // Apply status filter
        if (statusFilter !== 'all') {
            transactions = transactions.filter(t => t.status === statusFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            transactions = transactions.filter(t =>
                t.patientName?.toLowerCase().includes(query) ||
                t.transactionNumber?.toLowerCase().includes(query) ||
                t.labTests?.some(test => test.testType.toLowerCase().includes(query))
            );
        }

        return transactions;
    }, [labTransactions, statusFilter, searchQuery, dateFilter]);

    // ─── Calculate Filtered Stats ──────────────────────────────────────────
    const filteredStats = useMemo(() => {
        const total = filteredTransactions.length;
        const pending = filteredTransactions.filter(t => t.status === 'pending').length;
        const inProgress = filteredTransactions.filter(t => t.status === 'in_progress').length;
        const completed = filteredTransactions.filter(t => t.status === 'completed').length;
        const cancelled = filteredTransactions.filter(t => t.status === 'cancelled').length;
        const revenue = filteredTransactions.reduce((sum, t) => sum + safeNumber(t.totalAmount), 0);

        return { total, pending, inProgress, completed, cancelled, revenue };
    }, [filteredTransactions]);

    // ─── Date Filter Button ────────────────────────────────────────────────
    const DateFilterBtn: React.FC<{ label: string; value: string }> = ({ label, value }) => (
        <button
            onClick={() => setDateFilter(value)}
            className="px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap"
            style={{
                background: dateFilter === value ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                color: dateFilter === value ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                border: dateFilter === value ? 'none' : '1px solid var(--color-border)',
                cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
                if (dateFilter !== value) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (dateFilter !== value) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
                }
            }}
        >
            {label}
        </button>
    );

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: string) => {
        const config: Record<string, string> = {
            pending: 'badge-warning',
            in_progress: 'badge-info',
            completed: 'badge-success',
            cancelled: 'badge-danger',
        };
        const cls = config[status] || 'badge-info';
        return <span className={`badge ${cls} text-sm px-3 py-1.5`}>{status.replace('_', ' ')}</span>;
    };

    const getPaymentStatusBadge = (status: string) => {
        const config: Record<string, string> = {
            pending: 'badge-warning',
            paid: 'badge-success',
            partial: 'badge-warning',
            refunded: 'badge-danger',
        };
        const cls = config[status] || 'badge-info';
        return <span className={`badge ${cls} text-sm px-3 py-1.5`}>{status}</span>;
    };

    if (loading) {
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
                    <button
                        onClick={loadData}
                        className="btn-accent mt-4 px-4 py-2.5 text-sm"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Check if user can request lab tests
    const canRequestLab = currentUser?.role === 'admin' || currentUser?.role === 'lab' || currentUser?.role === 'officer';

    // Get date filter label for display
    const getDateFilterLabel = () => {
        switch (dateFilter) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            default: return 'All Time';
        }
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Header - Clean & Simple */}
            <div className="mb-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Laboratory Management</h1>
                        <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage lab test requests, results, and reports</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
                                {filteredTransactions.length} transactions
                            </span>
                            <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>•</span>
                            <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
                                {labTestTemplates?.length || 0} templates
                            </span>
                            <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>•</span>
                            <span className="text-[0.7rem]" style={{ color: 'var(--color-accent-text)' }}>
                                {getDateFilterLabel()}
                            </span>
                        </div>
                    </div>
                    {canRequestLab && (
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="btn-accent flex items-center gap-2 px-5 py-2.5 text-sm"
                            style={{ height: '42px' }}
                        >
                            <Plus className="h-4 w-4" />
                            Request Lab Test
                        </button>
                    )}
                </div>
            </div>

            {/* Stats - Filtered Results */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-secondary font-medium">Total</p>
                            <p className="text-2xl font-bold text-primary tabular-nums">{filteredStats.total}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                            <FlaskConical className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-warning-text)' }}>Pending</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-warning-text)' }}>{filteredStats.pending}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-warning)', color: 'var(--color-accent-fg)' }}>
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-info)', background: 'var(--color-info-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-info-text)' }}>In Progress</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-info-text)' }}>{filteredStats.inProgress}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-info)', color: 'var(--color-accent-fg)' }}>
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Completed</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success-text)' }}>{filteredStats.completed}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
                            <CheckCircle className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-danger-text)' }}>Cancelled</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-danger-text)' }}>{filteredStats.cancelled}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-danger)', color: 'var(--color-accent-fg)' }}>
                            <XCircle className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Revenue</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success-text)' }}>
                                GHS {safeNumber(filteredStats.revenue).toFixed(2)}
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search, Filter and Date Range */}
            <Card className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by patient name, transaction number, or test type..."
                                className="input-base w-full pl-10 pr-4 text-sm"
                                style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
                                onFocus={onFieldFocus}
                                onBlur={onFieldBlur}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input-base px-4 text-sm"
                                style={fieldStyle}
                                onFocus={onFieldFocus}
                                onBlur={onFieldBlur}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                                onClick={loadData}
                                className="btn-ghost px-4 py-2.5"
                                style={{ height: '42px' }}
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Date Filter Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Date:</span>
                        <div className="flex gap-1.5">
                            <DateFilterBtn label="All" value="all" />
                            <DateFilterBtn label="Today" value="today" />
                            <DateFilterBtn label="This Week" value="week" />
                            <DateFilterBtn label="This Month" value="month" />
                        </div>
                        {dateFilter !== 'all' && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                                {filteredTransactions.length} results
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {/* Transactions Table - Larger text */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-subtle border-b border-theme">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Transaction</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Patient</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Tests</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Payment</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Amount</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Date</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <FlaskConical className="h-12 w-12 text-muted mx-auto mb-3" />
                                        <p className="text-lg font-medium text-primary">No transactions found</p>
                                        <p className="text-sm text-secondary">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map((transaction) => {
                                    const testCount = transaction.labTests?.length || 0;
                                    const totalAmount = safeNumber(transaction.totalAmount);

                                    return (
                                        <tr key={transaction.id} className="hover:bg-subtle transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                                                        <FileText className="h-3 w-3" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-primary">{transaction.transactionNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-base text-primary">{transaction.patientName}</p>
                                                    {transaction.patientPhone && (
                                                        <p className="text-sm text-secondary">{transaction.patientPhone}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-base text-primary tabular-nums">{testCount}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(transaction.status)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {getPaymentStatusBadge(transaction.paymentStatus)}
                                                    <span className="text-sm text-secondary capitalize">
                                                        {transaction.paymentMethod || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <p className="font-bold text-base tabular-nums" style={{ color: 'var(--color-accent)' }}>
                                                    GHS {totalAmount.toFixed(2)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-secondary">
                                                {new Date(transaction.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link
                                                    to={`/dashboard/lab/${transaction.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 btn-accent text-sm"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Larger text */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3">
                        <p className="text-sm text-secondary">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-1.5 text-sm font-medium text-primary">{currentPage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <LabRequestModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSuccess={loadData}
            />
        </div>
    );
};
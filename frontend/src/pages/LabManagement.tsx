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
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    const filteredTransactions = useMemo(() => {
        let transactions = labTransactions || [];

        if (statusFilter !== 'all') {
            transactions = transactions.filter(t => t.status === statusFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            transactions = transactions.filter(t =>
                t.patientName?.toLowerCase().includes(query) ||
                t.transactionNumber?.toLowerCase().includes(query) ||
                t.labTests?.some(test => test.testType.toLowerCase().includes(query))
            );
        }

        return transactions;
    }, [labTransactions, statusFilter, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: string) => {
        const config: Record<string, string> = {
            pending: 'bg-yellow-500',
            in_progress: 'bg-blue-500',
            completed: 'bg-green-500',
            cancelled: 'bg-red-500',
        };
        const color = config[status] || 'bg-gray-500';
        return <span className={`px-2.5 py-1 text-xs font-bold text-white rounded-full ${color}`}>{status.replace('_', ' ')}</span>;
    };

    const getPaymentStatusBadge = (status: string) => {
        const config: Record<string, string> = {
            pending: 'bg-yellow-500',
            paid: 'bg-green-500',
            partial: 'bg-orange-500',
            refunded: 'bg-red-500',
        };
        const color = config[status] || 'bg-gray-500';
        return <span className={`px-2.5 py-1 text-xs font-bold text-white rounded-full ${color}`}>{status}</span>;
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
                    <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Error Loading Lab Data</h3>
                    <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
                    <button
                        onClick={loadData}
                        className="btn-accent mt-4 px-4 py-2"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-brand rounded-2xl shadow-xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Laboratory Management</h1>
                        <p className="text-white/80">Manage lab test requests, results, and reports</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-white/60 text-sm">
                                {labTransactions?.length || 0} transactions
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="text-white/60 text-sm">
                                {labTestTemplates?.length || 0} templates
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl transition-all duration-200 border border-white/20"
                    >
                        <Plus className="h-5 w-5" />
                        Request Test
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted text-xs">Total</p>
                                <p className="text-2xl font-bold text-primary">{stats.total || 0}</p>
                            </div>
                            <div className="p-2 bg-accent rounded-lg text-accent-fg">
                                <FlaskConical className="h-4 w-4" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-light)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted text-xs">Pending</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-warning-text)' }}>{stats.pending || 0}</p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: 'var(--color-warning)', color: 'var(--color-accent-fg)' }}>
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4" style={{ borderColor: 'var(--color-info)', background: 'var(--color-info-light)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted text-xs">In Progress</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-info-text)' }}>{stats.inProgress || 0}</p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: 'var(--color-info)', color: 'var(--color-accent-fg)' }}>
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted text-xs">Completed</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-success-text)' }}>{stats.completed || 0}</p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
                                <CheckCircle className="h-4 w-4" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted text-xs">Cancelled</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-danger-text)' }}>{stats.cancelled || 0}</p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: 'var(--color-danger)', color: 'var(--color-accent-fg)' }}>
                                <XCircle className="h-4 w-4" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-muted text-xs">Today Revenue</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-success-text)' }}>
                                    GHS {safeNumber(stats.today?.revenue).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Search and Filter */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by patient name, transaction number, or test type..."
                            className="input-base w-full pl-10 pr-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-base px-4 py-2.5 text-sm"
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
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Transactions Table */}
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
                                        <p className="text-sm text-muted">Try adjusting your filters</p>
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
                                                    <div className="p-1.5 bg-accent rounded-lg text-accent-fg">
                                                        <FileText className="h-3 w-3" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-primary text-sm">{transaction.transactionNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-primary">{transaction.patientName}</p>
                                                    {transaction.patientPhone && (
                                                        <p className="text-xs text-muted">{transaction.patientPhone}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-primary">{testCount}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(transaction.status)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {getPaymentStatusBadge(transaction.paymentStatus)}
                                                    <span className="text-xs text-muted capitalize">
                                                        {transaction.paymentMethod || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <p className="font-bold text-accent">GHS {totalAmount.toFixed(2)}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-muted">
                                                {new Date(transaction.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link
                                                    to={`/dashboard/lab/${transaction.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 btn-accent text-xs"
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-theme">
                        <p className="text-sm text-muted">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-1.5 text-sm text-primary">{currentPage} / {totalPages}</span>
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
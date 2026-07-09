// src/pages/LabDetail.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    ArrowLeft,
    Printer,
    FileText,
    CheckCircle,
    User,
    Phone,
    Calendar,
    DollarSign,
    CreditCard,
    Clock,
    AlertCircle,
    Edit2,
    Eye,
    FlaskConical,
    RefreshCw,
    XCircle,
    Loader2,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Receipt,
    Home,
    Search,
    Filter,
    Download,
    Plus,
    Minus,
    Activity,
    Thermometer,
    HeartPulse,
    Syringe,
    TestTube,
    Microscope,
    ClipboardCheck,
    Pill,
    Stethoscope
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { LabResultEntry } from '../components/LabResultEntry';
import { LabResultPrint } from '../components/LabResultPrint';
import { ReceiptModal, ReceiptContent } from '../components/ReceiptModal';

export const LabDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        fetchLabTransaction,
        updateLabTest,
        addLabTestResults,
        reprintLabReceipt,
        currentUser
    } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [transaction, setTransaction] = useState<any>(null);
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [showResultEntry, setShowResultEntry] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'results'>('overview');
    const [error, setError] = useState<string | null>(null);
    const [expandedTest, setExpandedTest] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // ── Print Refs ──────────────────────────────────────────────────────────
    const printReportRef = useRef<HTMLDivElement>(null);
    const printReceiptRef = useRef<HTMLDivElement>(null);

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    useEffect(() => {
        if (id) {
            loadTransaction();
        }
    }, [id]);

    const loadTransaction = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLabTransaction(id!);
            if (data) {
                setTransaction(data);
            } else {
                setError('Transaction not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load transaction');
        } finally {
            setLoading(false);
        }
    };

    // ── Print Handlers ──────────────────────────────────────────────────────
    const handlePrintReport = useReactToPrint({
        contentRef: printReportRef,  // ← Use contentRef
        documentTitle: `Lab-Report-${transaction?.transactionNumber || 'Unknown'}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 10mm;
            }
            @media print {
                body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .no-print {
                    display: none !important;
                }
                .print-content {
                    display: block !important;
                }
                .fixed.inset-0 {
                    display: none !important;
                }
            }
        `,
        onBeforePrint: () => {
            setShowPrintModal(false);
            return Promise.resolve();
        }
    });

    const handlePrintReceipt = useReactToPrint({
        contentRef: printReceiptRef,  // ← Use contentRef
        documentTitle: `Receipt-${transaction?.transactionNumber || 'Unknown'}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 10mm;
            }
            @media print {
                body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .no-print {
                    display: none !important;
                }
                .print-content {
                    display: block !important;
                }
                .fixed.inset-0 {
                    display: none !important;
                }
            }
        `,
        onBeforePrint: () => {
            setShowReceiptModal(false);
            return Promise.resolve();
        }
    });

    const getStatusConfig = (status: string) => {
        const config: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
            pending: {
                bg: 'var(--color-warning-light)',
                color: 'var(--color-warning-text)',
                icon: <Clock className="h-3.5 w-3.5" />,
                label: 'Pending'
            },
            in_progress: {
                bg: 'var(--color-info-light)',
                color: 'var(--color-info-text)',
                icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
                label: 'In Progress'
            },
            completed: {
                bg: 'var(--color-success-light)',
                color: 'var(--color-success-text)',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
                label: 'Completed'
            },
            cancelled: {
                bg: 'var(--color-danger-light)',
                color: 'var(--color-danger-text)',
                icon: <XCircle className="h-3.5 w-3.5" />,
                label: 'Cancelled'
            },
        };
        return config[status] || config.pending;
    };

    const getPriorityConfig = (priority: string) => {
        const config: Record<string, { bg: string; color: string; label: string }> = {
            stat: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-text)', label: 'STAT' },
            urgent: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)', label: 'Urgent' },
            normal: { bg: 'var(--color-info-light)', color: 'var(--color-info-text)', label: 'Normal' },
        };
        return config[priority] || config.normal;
    };

    const getPaymentStatusConfig = (status: string) => {
        const config: Record<string, { bg: string; color: string; label: string }> = {
            pending: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)', label: 'Pending' },
            paid: { bg: 'var(--color-success-light)', color: 'var(--color-success-text)', label: 'Paid' },
            partial: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)', label: 'Partial' },
            refunded: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-text)', label: 'Refunded' },
        };
        return config[status] || config.pending;
    };

    const getFlagConfig = (flag: string) => {
        const config: Record<string, { bg: string; color: string; icon: string }> = {
            critical: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-text)', icon: '🔴' },
            high: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)', icon: '⬆️' },
            low: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)', icon: '⬇️' },
            normal: { bg: 'var(--color-success-light)', color: 'var(--color-success-text)', icon: '✅' },
        };
        return config[flag] || config.normal;
    };

    const handleResultEntry = (test: any) => {
        setSelectedTest(test);
        setShowResultEntry(true);
    };

    const handleResultSaved = () => {
        setShowResultEntry(false);
        setSelectedTest(null);
        loadTransaction();
    };

    const handleOpenReceiptModal = () => {
        setShowReceiptModal(true);
    };

    const handleOpenReportModal = () => {
        const completedTests = transaction?.labTests?.filter((t: any) => t.status === 'completed') || [];
        if (completedTests.length === 0) {
            alert('No completed tests with results to print');
            return;
        }
        setShowPrintModal(true);
    };

    const toggleTestExpand = (testId: string) => {
        setExpandedTest(expandedTest === testId ? null : testId);
    };

    const filteredTests = () => {
        if (!transaction?.labTests) return [];
        let tests = transaction.labTests;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            tests = tests.filter((t: any) =>
                t.testType.toLowerCase().includes(query) ||
                t.testNumber?.toLowerCase().includes(query) ||
                t.testCategory?.toLowerCase().includes(query)
            );
        }
        
        if (statusFilter !== 'all') {
            tests = tests.filter((t: any) => t.status === statusFilter);
        }
        
        return tests;
    };

    const renderResultTable = (test: any) => {
        if (!test.results || Object.keys(test.results).length === 0) {
            return (
                <div className="text-center py-12 text-secondary">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm font-medium">No results entered for this test</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Results will appear here once entered</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '2px solid var(--color-border)' }}>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Parameter</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Result</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Reference Range</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Unit</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider">Flag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme">
                        {Object.entries(test.results).map(([key, value]) => {
                            const refRange = test.referenceRanges?.[key]?.referenceRange || '';
                            const unit = test.referenceRanges?.[key]?.unit || '';
                            const flag = test.referenceRanges?.[key]?.flag || 'normal';
                            const flagConfig = getFlagConfig(flag);

                            return (
                                <tr key={key} className="hover:bg-subtle transition-colors">
                                    <td className="px-4 py-3 text-sm font-medium text-primary">{key}</td>
                                    <td className="px-4 py-3 text-sm font-semibold" style={{
                                        color: flag === 'normal' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                                        fontVariantNumeric: 'tabular-nums'
                                    }}>
                                        {value || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-secondary">{refRange || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm text-secondary">{unit || 'N/A'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full`}
                                            style={{ background: flagConfig.bg, color: flagConfig.color }}
                                        >
                                            <span>{flagConfig.icon}</span>
                                            {flag.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
                    <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading transaction details...</p>
                </div>
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-primary">{error || 'Transaction not found'}</h3>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>The transaction you're looking for doesn't exist or has been removed</p>
                    <button
                        onClick={() => navigate('/dashboard/lab')}
                        className="btn-accent mt-6 px-6 py-2.5 inline-flex items-center gap-2 text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Lab Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const testCount = transaction.labTests?.length || 0;
    const completedTests = transaction.labTests?.filter((t: any) => t.status === 'completed').length || 0;
    const pendingTests = transaction.labTests?.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length || 0;
    const totalAmount = safeNumber(transaction.totalAmount);

    const receiptTransaction = {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
        items: transaction.labTests?.map((test: any) => ({
            product: { name: test.testType },
            quantity: 1,
            unitPrice: safeNumber(test.testPrice),
            total: safeNumber(test.testPrice),
        })) || [],
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        discount: 0,
        paymentMethod: transaction.paymentMethod || 'cash',
        paymentReference: transaction.paymentReference,
        cashierName: transaction.requestedByName,
        customerName: transaction.patientName,
        customerPhone: transaction.patientPhone,
        createdAt: transaction.createdAt,
    };

    return (
        <div className="space-y-6 pb-8">

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard/lab')}
                        className="p-2 rounded-lg hover:bg-subtle transition-colors"
                        style={{ border: '1px solid var(--color-border)' }}
                    >
                        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-primary flex items-center gap-3">
                            <span>Lab Transaction</span>
                            <span className="text-xs font-mono px-3 py-1 rounded-full" style={{
                                background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)'
                            }}>
                                {transaction.transactionNumber}
                            </span>
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {transaction.patientName} • {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleOpenReceiptModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            background: 'var(--color-bg-surface)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-subtle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-surface)';
                        }}
                    >
                        <Receipt size={16} />
                        Receipt
                    </button>
                    <button
                        onClick={handleOpenReportModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            background: 'var(--color-bg-surface)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-subtle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-surface)';
                        }}
                    >
                        <Printer size={16} />
                        Report
                    </button>
                    <button
                        onClick={loadTransaction}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            background: 'transparent',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-subtle)';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                        }}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── BREADCRUMB ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <Link to="/dashboard" className="hover:text-accent-text transition-colors flex items-center gap-1">
                    <Home size={14} />
                    Dashboard
                </Link>
                <ChevronRight size={14} />
                <Link to="/dashboard/lab" className="hover:text-accent-text transition-colors">
                    Lab
                </Link>
                <ChevronRight size={14} />
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {transaction.transactionNumber}
                </span>
            </div>

            {/* ── QUICK STATS ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: 'var(--color-info-light)' }}>
                            <User size={16} style={{ color: 'var(--color-info-text)' }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Patient</p>
                            <p className="text-sm font-semibold text-primary truncate">{transaction.patientName}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: 'var(--color-role-lab-bg)' }}>
                            <FlaskConical size={16} style={{ color: 'var(--color-role-lab)' }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Tests</p>
                            <p className="text-sm font-semibold text-primary">{testCount} total</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: 'var(--color-success-light)' }}>
                            <CheckCircle size={16} style={{ color: 'var(--color-success-text)' }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Completed</p>
                            <p className="text-sm font-semibold text-primary">{completedTests}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: 'var(--color-warning-light)' }}>
                            <Clock size={16} style={{ color: 'var(--color-warning-text)' }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Pending</p>
                            <p className="text-sm font-semibold text-primary">{pendingTests}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: 'var(--color-accent-light)' }}>
                            <DollarSign size={16} style={{ color: 'var(--color-accent-text)' }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Amount</p>
                            <p className="text-sm font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                GHS {totalAmount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ 
                            background: getPaymentStatusConfig(transaction.paymentStatus).bg 
                        }}>
                            <CreditCard size={16} style={{ 
                                color: getPaymentStatusConfig(transaction.paymentStatus).color 
                            }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Payment</p>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                                background: getPaymentStatusConfig(transaction.paymentStatus).bg,
                                color: getPaymentStatusConfig(transaction.paymentStatus).color
                            }}>
                                {getPaymentStatusConfig(transaction.paymentStatus).label}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── STATUS BAR ───────────────────────────────────────────────── */}
            <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Status:</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full" style={{
                            background: getStatusConfig(transaction.status).bg,
                            color: getStatusConfig(transaction.status).color
                        }}>
                            {getStatusConfig(transaction.status).icon}
                            {getStatusConfig(transaction.status).label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Priority:</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full" style={{
                            background: getPriorityConfig(transaction.priority).bg,
                            color: getPriorityConfig(transaction.priority).color
                        }}>
                            {getPriorityConfig(transaction.priority).label}
                        </span>
                    </div>
                    {transaction.patientPhone && (
                        <div className="flex items-center gap-2">
                            <Phone size={14} style={{ color: 'var(--color-text-muted)' }} />
                            <span className="text-sm text-secondary">{transaction.patientPhone}</span>
                        </div>
                    )}
                </div>
                {pendingTests > 0 && (
                    <button
                        onClick={() => {
                            const incomplete = transaction.labTests?.filter((t: any) => t.status !== 'completed') || [];
                            if (incomplete.length > 0) {
                                handleResultEntry(incomplete[0]);
                            }
                        }}
                        className="btn-accent inline-flex items-center gap-2 px-4 py-2 text-sm"
                    >
                        <Edit2 size={14} />
                        Enter Results ({pendingTests} pending)
                    </button>
                )}
            </Card>

            {/* ── TABS ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
                    { id: 'tests', label: `Tests (${testCount})`, icon: <FlaskConical size={16} /> },
                    { id: 'results', label: `Results (${completedTests})`, icon: <CheckCircle size={16} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative"
                        style={{
                            color: activeTab === tab.id ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.color = 'var(--color-text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.color = 'var(--color-text-muted)';
                            }
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ───────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Patient Information */}
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                                <User size={16} />
                                Patient Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Name</span>
                                    <span className="text-sm font-medium text-primary">{transaction.patientName}</span>
                                </div>
                                {transaction.patientPhone && (
                                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Phone</span>
                                        <span className="text-sm font-medium text-primary">{transaction.patientPhone}</span>
                                    </div>
                                )}
                                {transaction.patientAge && (
                                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Age</span>
                                        <span className="text-sm font-medium text-primary">{transaction.patientAge}</span>
                                    </div>
                                )}
                                {transaction.patientGender && (
                                    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Gender</span>
                                        <span className="text-sm font-medium text-primary">{transaction.patientGender}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Requested By</span>
                                    <span className="text-sm font-medium text-primary">{transaction.requestedByName}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Transaction Summary */}
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                                <Receipt size={16} />
                                Transaction Summary
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Transaction ID</span>
                                    <span className="text-sm font-mono font-medium text-primary">{transaction.transactionNumber}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Date</span>
                                    <span className="text-sm font-medium text-primary">{new Date(transaction.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Total Tests</span>
                                    <span className="text-sm font-medium text-primary">{testCount}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Total Amount</span>
                                    <span className="text-base font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                        GHS {totalAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Payment Method</span>
                                    <span className="text-sm font-medium text-primary capitalize">{transaction.paymentMethod || 'N/A'}</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {transaction.notes && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                                <FileText size={16} />
                                Notes
                            </h3>
                            <p className="text-sm text-primary" style={{ whiteSpace: 'pre-wrap' }}>{transaction.notes}</p>
                        </Card>
                    )}

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                        {pendingTests > 0 && (
                            <button
                                onClick={() => {
                                    const incomplete = transaction.labTests?.filter((t: any) => t.status !== 'completed') || [];
                                    if (incomplete.length > 0) {
                                        handleResultEntry(incomplete[0]);
                                    }
                                }}
                                className="btn-accent inline-flex items-center gap-2 px-6 py-2.5 text-sm"
                            >
                                <Edit2 size={16} />
                                Enter Results
                            </button>
                        )}
                        <button
                            onClick={handleOpenReceiptModal}
                            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
                            style={{
                                background: 'var(--color-bg-surface)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--color-bg-subtle)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--color-bg-surface)';
                            }}
                        >
                            <Receipt size={16} />
                            Print Receipt
                        </button>
                        {completedTests > 0 && (
                            <button
                                onClick={handleOpenReportModal}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
                                style={{
                                    background: 'var(--color-bg-surface)',
                                    color: 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--color-bg-subtle)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--color-bg-surface)';
                                }}
                            >
                                <Printer size={16} />
                                Print Report
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── TESTS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'tests' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <Card className="p-4 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search tests..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg"
                                    style={{
                                        background: 'var(--color-input-bg)',
                                        border: '1px solid var(--color-input-border)',
                                        color: 'var(--color-input-text)',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
                                        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-input-border)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-sm rounded-lg"
                            style={{
                                background: 'var(--color-input-bg)',
                                border: '1px solid var(--color-input-border)',
                                color: 'var(--color-input-text)',
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
                                e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-input-border)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {filteredTests().length} test{filteredTests().length !== 1 ? 's' : ''} found
                        </span>
                    </Card>

                    {/* Tests List */}
                    <div className="space-y-3">
                        {filteredTests().map((test: any) => {
                            const statusConfig = getStatusConfig(test.status);
                            const priorityConfig = getPriorityConfig(test.priority);
                            const isExpanded = expandedTest === test.id;

                            return (
                                <Card key={test.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-4 cursor-pointer" onClick={() => toggleTestExpand(test.id)}>
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex-shrink-0">
                                                    <div className="p-2 rounded-lg" style={{ background: statusConfig.bg }}>
                                                        {statusConfig.icon}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-semibold text-primary truncate">{test.testType}</h4>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{test.testNumber}</span>
                                                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>•</span>
                                                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{test.testCategory}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full" style={{
                                                    background: priorityConfig.bg,
                                                    color: priorityConfig.color
                                                }}>
                                                    {priorityConfig.label}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full" style={{
                                                    background: statusConfig.bg,
                                                    color: statusConfig.color
                                                }}>
                                                    {statusConfig.icon}
                                                    {statusConfig.label}
                                                </span>
                                                <span className="text-sm font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                                    GHS {safeNumber(test.testPrice).toFixed(2)}
                                                </span>
                                                {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                            <div className="space-y-4">
                                                {/* Test Details */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Category</p>
                                                        <p className="text-sm font-medium text-primary">{test.testCategory}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full" style={{
                                                            background: statusConfig.bg,
                                                            color: statusConfig.color
                                                        }}>
                                                            {statusConfig.icon}
                                                            {statusConfig.label}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Priority</p>
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full" style={{
                                                            background: priorityConfig.bg,
                                                            color: priorityConfig.color
                                                        }}>
                                                            {priorityConfig.label}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Price</p>
                                                        <p className="text-sm font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                                            GHS {safeNumber(test.testPrice).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                                    {test.status !== 'completed' && test.status !== 'cancelled' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleResultEntry(test);
                                                            }}
                                                            className="btn-accent inline-flex items-center gap-2 px-4 py-1.5 text-sm"
                                                        >
                                                            <Edit2 size={14} />
                                                            Enter Results
                                                        </button>
                                                    )}
                                                    {test.status === 'completed' && test.results && Object.keys(test.results).length > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveTab('results');
                                                            }}
                                                            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
                                                            style={{
                                                                background: 'var(--color-bg-subtle)',
                                                                color: 'var(--color-text-secondary)',
                                                                border: '1px solid var(--color-border)'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'var(--color-border)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'var(--color-bg-subtle)';
                                                            }}
                                                        >
                                                            <Eye size={14} />
                                                            View Results
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}

                        {filteredTests().length === 0 && (
                            <div className="text-center py-12">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                                <p className="text-sm font-medium text-secondary">No tests found</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                    {searchQuery ? 'Try adjusting your search or filters' : 'No tests available for this transaction'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── RESULTS TAB ────────────────────────────────────────────── */}
            {activeTab === 'results' && (
                <div className="space-y-4">
                    {transaction.labTests?.filter((t: any) => t.status === 'completed').map((test: any) => {
                        const hasResults = test.results && Object.keys(test.results).length > 0;
                        const isExpanded = expandedTest === test.id;
                        const statusConfig = getStatusConfig(test.status);

                        return (
                            <Card key={test.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4 cursor-pointer" onClick={() => toggleTestExpand(test.id)}>
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="flex-shrink-0">
                                                <div className="p-2 rounded-lg" style={{ background: statusConfig.bg }}>
                                                    {statusConfig.icon}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-semibold text-primary truncate">{test.testType}</h4>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{test.testNumber}</span>
                                                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>•</span>
                                                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{test.testCategory}</span>
                                                    {hasResults && (
                                                        <>
                                                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>•</span>
                                                            <span className="text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>
                                                                {Object.keys(test.results).length} parameters
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full" style={{
                                                background: statusConfig.bg,
                                                color: statusConfig.color
                                            }}>
                                                {statusConfig.icon}
                                                {statusConfig.label}
                                            </span>
                                            {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                        {hasResults ? (
                                            <div className="space-y-4">
                                                {renderResultTable(test)}

                                                {test.resultSummary && (
                                                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-info-light)', border: '1px solid var(--color-info)' }}>
                                                        <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--color-info-text)' }}>
                                                            <ClipboardCheck size={14} />
                                                            Summary
                                                        </p>
                                                        <p className="text-sm mt-1" style={{ color: 'var(--color-info-text)' }}>{test.resultSummary}</p>
                                                    </div>
                                                )}

                                                {test.resultInterpretation && (
                                                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-role-lab-bg)', border: '1px solid var(--color-role-lab)' }}>
                                                        <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--color-role-lab)' }}>
                                                            <Microscope size={14} />
                                                            Interpretation
                                                        </p>
                                                        <p className="text-sm mt-1" style={{ color: 'var(--color-role-lab)' }}>{test.resultInterpretation}</p>
                                                    </div>
                                                )}

                                                {test.performedByName && (
                                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                        Performed by: <span className="font-medium text-primary">{test.performedByName}</span>
                                                        {test.completedAt && ` on ${new Date(test.completedAt).toLocaleString()}`}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                                                <p className="text-sm font-medium text-secondary">No results available</p>
                                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>This test was marked as completed but no results were entered</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isExpanded && hasResults && (
                                    <div className="px-4 pb-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                            {Object.entries(test.results).slice(0, 5).map(([key, value]) => {
                                                const flag = test.referenceRanges?.[key]?.flag || 'normal';
                                                const flagConfig = getFlagConfig(flag);
                                                
                                                return (
                                                    <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{
                                                        background: 'var(--color-bg-subtle)',
                                                        border: '1px solid var(--color-border)'
                                                    }}>
                                                        <span style={{ color: 'var(--color-text-muted)' }}>{key}</span>
                                                        <span className="font-semibold" style={{ 
                                                            color: flag === 'normal' ? 'var(--color-success-text)' : 'var(--color-danger-text)'
                                                        }}>
                                                            {value || 'N/A'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {Object.keys(test.results).length > 5 && (
                                                <div className="flex items-center justify-center px-3 py-2 rounded-lg text-xs" style={{
                                                    background: 'var(--color-bg-subtle)',
                                                    border: '1px solid var(--color-border)',
                                                    color: 'var(--color-text-muted)'
                                                }}>
                                                    +{Object.keys(test.results).length - 5} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}

                    {transaction.labTests?.filter((t: any) => t.status === 'completed').length === 0 && (
                        <div className="text-center py-16">
                            <AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                            <h3 className="text-lg font-semibold text-primary">No Completed Tests</h3>
                            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                                Results will appear here once tests are completed
                            </p>
                            {pendingTests > 0 && (
                                <button
                                    onClick={() => {
                                        const incomplete = transaction.labTests?.filter((t: any) => t.status !== 'completed') || [];
                                        if (incomplete.length > 0) {
                                            handleResultEntry(incomplete[0]);
                                        }
                                    }}
                                    className="btn-accent inline-flex items-center gap-2 px-6 py-2.5 text-sm mt-6"
                                >
                                    <Edit2 size={16} />
                                    Enter Results Now
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── MODALS ────────────────────────────────────────────────────── */}
            {showResultEntry && selectedTest && (
                <LabResultEntry
                    test={selectedTest}
                    onClose={() => {
                        setSelectedTest(null);
                        setShowResultEntry(false);
                    }}
                    onSuccess={handleResultSaved}
                />
            )}

            {/* ── RECEIPT MODAL ────────────────────────────────────────────── */}
            {showReceiptModal && (
                <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal no-print">
                    <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-theme">
                        <div className="sticky top-0 p-4" style={{
                            background: 'var(--gradient-accent)',
                            color: '#fff',
                            borderRadius: '12px 12px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div className="flex items-center gap-3">
                                <Receipt size={24} />
                                <h2 className="text-lg font-bold">Receipt</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintReceipt}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Printer size={16} />
                                    Print
                                </button>
                                <button
                                    onClick={() => setShowReceiptModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <ReceiptModal
                                transaction={receiptTransaction}
                                customerName={transaction.patientName}
                                customerPhone={transaction.patientPhone}
                                onClose={() => setShowReceiptModal(false)}
                                onPrint={handlePrintReceipt}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── HIDDEN PRINT CONTENT FOR RECEIPT ────────────────────────── */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                {transaction && (
                    <ReceiptContent
                        ref={printReceiptRef}
                        transaction={receiptTransaction}
                        customerName={transaction.patientName}
                        customerPhone={transaction.patientPhone}
                    />
                )}
            </div>

            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <div ref={printReportRef}>
                    {transaction && (
                        <LabResultPrint transaction={transaction} />
                    )}
                </div>
            </div>

            {/* ── REPORT MODAL ─────────────────────────────────────────────── */}
            {showPrintModal && transaction && (
                <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal no-print">
                    <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-theme">
                        <div className="sticky top-0 p-4" style={{
                            background: 'var(--gradient-accent)',
                            color: '#fff',
                            borderRadius: '12px 12px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div className="flex items-center gap-3">
                                <Printer size={24} />
                                <h2 className="text-lg font-bold">Lab Report - {transaction.patientName}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintReport}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Printer size={16} />
                                    Print
                                </button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <LabResultPrint transaction={transaction} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
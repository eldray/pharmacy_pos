// src/pages/LabDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    Download,
    RefreshCw,
    XCircle,
    Loader2,
    TrendingUp,
    Package,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Receipt,
    Home
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { LabResultEntry } from '../components/LabResultEntry';
import { LabResultPrint } from '../components/LabResultPrint';
import { ReceiptModal } from '../components/ReceiptModal';

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

    const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
    };

    const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border)';
        e.currentTarget.style.boxShadow = 'none';
    };

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

    const getStatusBadge = (status: string) => {
        const config: Record<string, { cls: string; icon: React.ReactNode }> = {
            pending: { cls: 'badge-warning', icon: <Clock className="h-3 w-3" /> },
            in_progress: { cls: 'badge-info', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
            completed: { cls: 'badge-success', icon: <CheckCircle className="h-3 w-3" /> },
            cancelled: { cls: 'badge-danger', icon: <XCircle className="h-3 w-3" /> },
        };
        const { cls, icon } = config[status] || { cls: 'badge-info', icon: null };
        return (
            <span className={`badge ${cls} inline-flex items-center gap-1 text-sm px-3 py-1.5`}>
                {icon}
                {status.replace('_', ' ')}
            </span>
        );
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

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'stat':
                return <span className="badge badge-danger text-sm px-3 py-1.5 animate-pulse">STAT</span>;
            case 'urgent':
                return <span className="badge badge-warning text-sm px-3 py-1.5">Urgent</span>;
            default:
                return <span className="badge badge-info text-sm px-3 py-1.5">Normal</span>;
        }
    };

    const getFlagColor = (flag: string) => {
        switch (flag) {
            case 'critical': return 'bg-danger-light text-danger-text border-danger';
            case 'high': return 'bg-warning-light text-warning-text border-warning';
            case 'low': return 'bg-warning-light text-warning-text border-warning';
            default: return 'bg-success-light text-success-text border-success';
        }
    };

    const getFlagIcon = (flag: string) => {
        switch (flag) {
            case 'critical': return '🔴';
            case 'high': return '⬆️';
            case 'low': return '⬇️';
            default: return '✅';
        }
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

    const handlePrintReceipt = () => {
        setShowReceiptModal(true);
    };

    const handlePrintReport = () => {
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

    const renderResultTable = (test: any) => {
        if (!test.results || Object.keys(test.results).length === 0) {
            return (
                <div className="text-center py-8 text-secondary">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm">No results entered for this test</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-subtle border-b border-theme">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Parameter</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Result</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Reference Range</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Unit</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase">Flag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme">
                        {Object.entries(test.results).map(([key, value]) => {
                            const refRange = test.referenceRanges?.[key]?.referenceRange || '';
                            const unit = test.referenceRanges?.[key]?.unit || '';
                            const flag = test.referenceRanges?.[key]?.flag || 'normal';

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
                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border ${getFlagColor(flag)}`}>
                                            {getFlagIcon(flag)} {flag.toUpperCase()}
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
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-4xl mb-4" style={{ color: 'var(--color-danger)' }}>⚠️</div>
                    <h3 className="text-xl font-bold text-primary">{error || 'Transaction not found'}</h3>
                    <button
                        onClick={() => navigate('/dashboard/lab')}
                        className="btn-accent mt-4 px-5 py-2.5 inline-flex items-center gap-2 text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Lab
                    </button>
                </div>
            </div>
        );
    }

    const testCount = transaction.labTests?.length || 0;
    const completedTests = transaction.labTests?.filter((t: any) => t.status === 'completed').length || 0;
    const totalAmount = safeNumber(transaction.totalAmount);

    // Build transaction object for receipt
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px' }}>

            {/* ── HEADER WITH BACK BUTTON ───────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--color-border)',
            }}>
                <div className="flex items-center" style={{ gap: '16px' }}>
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/dashboard/lab')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            height: '38px',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back to Lab
                    </button>

                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Lab Transaction Details
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {transaction.transactionNumber} - {transaction.patientName}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                        onClick={handlePrintReceipt}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            height: '34px',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <Receipt size={14} />
                        Receipt
                    </button>
                    <button
                        onClick={handlePrintReport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            height: '34px',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <Printer size={14} />
                        Report
                    </button>
                    <button
                        onClick={loadTransaction}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            height: '34px',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                        }}
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── BREADCRUMB NAVIGATION ──────────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                padding: '6px 0',
            }}>
                <Link
                    to="/dashboard"
                    style={{
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        transition: 'color 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-accent-text)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'}
                >
                    <Home size={14} />
                    Dashboard
                </Link>
                <ChevronRight size={14} />
                <Link
                    to="/dashboard/lab"
                    style={{
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        transition: 'color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-accent-text)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'}
                >
                    Lab
                </Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {transaction.transactionNumber}
                </span>
            </div>

            {/* ── SUMMARY CARDS ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '12px' }}>
                <Card style={{ padding: '16px' }}>
                    <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
                        <User size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Patient</span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{transaction.patientName}</p>
                    {transaction.patientPhone && (
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{transaction.patientPhone}</p>
                    )}
                </Card>

                <Card style={{ padding: '16px' }}>
                    <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
                        <FlaskConical size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Tests</span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{testCount} total</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{completedTests} completed</p>
                </Card>

                <Card style={{ padding: '16px' }}>
                    <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
                        <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Status</span>
                    </div>
                    <div style={{ marginTop: '2px' }}>{getStatusBadge(transaction.status)}</div>
                    <div style={{ marginTop: '4px' }}>{getPaymentStatusBadge(transaction.paymentStatus)}</div>
                </Card>

                <Card style={{ padding: '16px' }}>
                    <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
                        <DollarSign size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Amount</span>
                    </div>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>
                        GHS {totalAmount.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>
                        {transaction.paymentMethod || 'N/A'}
                    </p>
                </Card>
            </div>

            {/* ── TABS ────────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                gap: '0',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: '4px',
            }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
                    { id: 'tests', label: `Tests (${testCount})`, icon: <FlaskConical size={16} /> },
                    { id: 'results', label: `Results (${completedTests}/${testCount})`, icon: <CheckCircle size={16} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: 'transparent',
                            border: 'none',
                            color: activeTab === tab.id ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            marginBottom: '-1px',
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== tab.id) {
                                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== tab.id) {
                                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: '12px', padding: '16px', background: 'var(--color-bg-subtle)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} />
                                Patient
                            </p>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{transaction.patientName}</p>
                        </div>
                        {transaction.patientPhone && (
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={14} />
                                    Phone
                                </p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{transaction.patientPhone}</p>
                            </div>
                        )}
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} />
                                Date
                            </p>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                                {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        {transaction.patientAge && (
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Age</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{transaction.patientAge}</p>
                            </div>
                        )}
                        {transaction.patientGender && (
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Gender</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{transaction.patientGender}</p>
                            </div>
                        )}
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Requested By</p>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{transaction.requestedByName}</p>
                        </div>
                    </div>

                    {transaction.notes && (
                        <div style={{ padding: '14px 16px', background: 'var(--color-bg-subtle)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Notes</p>
                            <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--color-text-primary)' }}>{transaction.notes}</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => {
                                const incomplete = transaction.labTests?.filter((t: any) => t.status !== 'completed') || [];
                                if (incomplete.length === 0) {
                                    alert('All tests are already completed');
                                    return;
                                }
                                handleResultEntry(incomplete[0]);
                            }}
                            className="btn-accent"
                            style={{ padding: '10px 24px', fontSize: '14px' }}
                        >
                            <Edit2 size={16} style={{ marginRight: '8px' }} />
                            Enter Results
                        </button>
                    </div>
                </div>
            )}

            {/* ── TESTS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'tests' && (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>Test</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>Category</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>Status</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>Priority</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>Price</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {transaction.labTests?.map((test: any, index: number) => (
                                    <tr key={test.id} style={{ borderBottom: index < transaction.labTests.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 150ms ease' }}
                                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'}
                                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '10px 14px' }}>
                                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{test.testType}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{test.testNumber}</p>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{test.testCategory}</td>
                                        <td style={{ padding: '10px 14px' }}>{getStatusBadge(test.status)}</td>
                                        <td style={{ padding: '10px 14px' }}>{getPriorityBadge(test.priority)}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>
                                            GHS {safeNumber(test.testPrice).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            {test.status !== 'completed' && test.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleResultEntry(test)}
                                                    className="btn-accent"
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    <Edit2 size={12} style={{ marginRight: '4px' }} />
                                                    Results
                                                </button>
                                            )}
                                            {test.status === 'completed' && (
                                                <button
                                                    onClick={() => setActiveTab('results')}
                                                    className="btn-accent"
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    <Eye size={12} style={{ marginRight: '4px' }} />
                                                    View
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ── RESULTS TAB ────────────────────────────────────────────── */}
            {activeTab === 'results' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {transaction.labTests?.map((test: any) => {
                        const isCompleted = test.status === 'completed';
                        const hasResults = test.results && Object.keys(test.results).length > 0;
                        const isExpanded = expandedTest === test.id;

                        return (
                            <Card key={test.id} style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Test Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: 'var(--color-bg-subtle)',
                                    borderBottom: '1px solid var(--color-border)',
                                }}>
                                    <div className="flex items-center" style={{ gap: '12px' }}>
                                        <div style={{
                                            padding: '6px',
                                            borderRadius: '8px',
                                            background: isCompleted ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {isCompleted ? (
                                                <CheckCircle size={18} style={{ color: 'var(--color-success-text)' }} />
                                            ) : (
                                                <Clock size={18} style={{ color: 'var(--color-warning-text)' }} />
                                            )}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{test.testType}</h4>
                                            <div className="flex items-center" style={{ gap: '8px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{test.testNumber}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>•</span>
                                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{test.testCategory}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center" style={{ gap: '8px' }}>
                                        {getStatusBadge(test.status)}
                                        <button
                                            onClick={() => toggleTestExpand(test.id)}
                                            style={{
                                                padding: '4px',
                                                borderRadius: '6px',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--color-text-secondary)',
                                                transition: 'all 150ms ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'}
                                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                        >
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Test Content - Expanded */}
                                {isExpanded && (
                                    <div style={{ padding: '16px' }}>
                                        {isCompleted && hasResults ? (
                                            <>
                                                {renderResultTable(test)}

                                                {/* Summary and Interpretation */}
                                                {test.resultSummary && (
                                                    <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-info-light)' }}>
                                                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-info-text)' }}>📋 Summary</p>
                                                        <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--color-info-text)' }}>{test.resultSummary}</p>
                                                    </div>
                                                )}
                                                {test.resultInterpretation && (
                                                    <div style={{ marginTop: '8px', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-role-lab-bg)' }}>
                                                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-role-lab)' }}>🔬 Interpretation</p>
                                                        <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--color-role-lab)' }}>{test.resultInterpretation}</p>
                                                    </div>
                                                )}
                                                {test.performedByName && (
                                                    <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                        Performed by: <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{test.performedByName}</span>
                                                        on {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                )}
                                            </>
                                        ) : isCompleted ? (
                                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
                                                <AlertCircle size={32} style={{ margin: '0 auto 8px', color: 'var(--color-text-muted)' }} />
                                                <p style={{ fontSize: '13px' }}>No results entered for this test</p>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
                                                <Clock size={32} style={{ margin: '0 auto 8px', color: 'var(--color-text-muted)' }} />
                                                <p style={{ fontSize: '13px' }}>Results pending</p>
                                                {test.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleResultEntry(test)}
                                                        className="btn-accent"
                                                        style={{ marginTop: '12px', padding: '8px 16px', fontSize: '13px' }}
                                                    >
                                                        <Edit2 size={14} style={{ marginRight: '6px' }} />
                                                        Enter Results Now
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                                }

                                {/* Collapsed Preview */}
                                {!isExpanded && isCompleted && hasResults && (
                                    <div style={{ padding: '12px 16px 16px 16px' }}>
                                        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '6px' }}>
                                            {Object.entries(test.results).slice(0, 4).map(([key, value]) => (
                                                <div key={key} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    background: 'var(--color-bg-subtle)',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)',
                                                }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{key}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value || 'N/A'}</span>
                                                </div>
                                            ))}
                                            {Object.keys(test.results).length > 4 && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '8px 12px',
                                                    fontSize: '12px',
                                                    color: 'var(--color-text-muted)',
                                                }}>
                                                    +{Object.keys(test.results).length - 4} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}

                    {(!transaction.labTests || transaction.labTests.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                            <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--color-text-muted)' }} />
                            <p style={{ fontSize: '14px' }}>No tests found in this transaction</p>
                        </div>
                    )}
                </div>
            )
            }

            {/* ── MODALS ────────────────────────────────────────────────────── */}
            {
                showResultEntry && selectedTest && (
                    <LabResultEntry
                        test={selectedTest}
                        onClose={() => {
                            setSelectedTest(null);
                            setShowResultEntry(false);
                        }}
                        onSuccess={handleResultSaved}
                    />
                )
            }

            {
                showReceiptModal && (
                    <ReceiptModal
                        transaction={receiptTransaction}
                        customerName={transaction.patientName}
                        customerPhone={transaction.patientPhone}
                        onClose={() => setShowReceiptModal(false)}
                        onPrint={() => window.print()}
                    />
                )
            }

            {
                showPrintModal && transaction && (
                    <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal">
                        <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-theme">
                            <div className="sticky top-0" style={{
                                background: 'var(--gradient-accent)',
                                color: '#fff',
                                borderRadius: '12px 12px 0 0',
                                padding: '16px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div className="flex items-center" style={{ gap: '12px' }}>
                                    <Printer size={24} />
                                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Lab Report - {transaction.patientName}</h2>
                                </div>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    style={{
                                        padding: '6px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        transition: 'background 150ms ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'}
                                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <LabResultPrint transaction={transaction} />
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                                    <button
                                        onClick={() => window.print()}
                                        className="btn-accent"
                                        style={{ flex: 1, padding: '12px 24px', fontSize: '14px' }}
                                    >
                                        <Printer size={16} style={{ marginRight: '8px' }} />
                                        Print Report
                                    </button>
                                    <button
                                        onClick={() => setShowPrintModal(false)}
                                        className="btn-ghost"
                                        style={{ padding: '12px 24px', fontSize: '14px' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
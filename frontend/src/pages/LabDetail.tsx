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
    Receipt
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
            <span className={`badge ${cls} inline-flex items-center gap-1`}>
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
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'stat':
                return <span className="badge badge-danger animate-pulse">STAT</span>;
            case 'urgent':
                return <span className="badge badge-warning">Urgent</span>;
            default:
                return <span className="badge badge-info">Normal</span>;
        }
    };

    const getFlagColor = (flag: string) => {
        switch (flag) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-300';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default: return 'bg-green-100 text-green-800 border-green-300';
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
                <div className="text-center py-6 text-muted">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No results entered for this test</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-subtle border-b border-theme">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase">Parameter</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase">Result</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase">Reference Range</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase">Unit</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-secondary uppercase">Flag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme">
                        {Object.entries(test.results).map(([key, value]) => {
                            const refRange = test.referenceRanges?.[key]?.referenceRange || '';
                            const unit = test.referenceRanges?.[key]?.unit || '';
                            const flag = test.referenceRanges?.[key]?.flag || 'normal';

                            return (
                                <tr key={key} className="hover:bg-subtle transition-colors">
                                    <td className="px-4 py-2 text-sm font-medium text-primary">{key}</td>
                                    <td className="px-4 py-2 text-sm font-semibold" style={{ color: flag === 'normal' ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                                        {value || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-secondary">{refRange || 'N/A'}</td>
                                    <td className="px-4 py-2 text-sm text-secondary">{unit || 'N/A'}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getFlagColor(flag)}`}>
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
                    <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{error || 'Transaction not found'}</h3>
                    <Link to="/dashboard/lab" className="btn-accent mt-4 px-4 py-2 inline-block">
                        <ArrowLeft className="h-4 w-4 inline mr-2" />
                        Back to Lab
                    </Link>
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
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-brand rounded-2xl shadow-xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard/lab"
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Lab Transaction Details</h1>
                            <p className="text-white/80 text-sm">
                                {transaction.transactionNumber} - {transaction.patientName}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handlePrintReceipt}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20"
                        >
                            <Receipt className="h-4 w-4" />
                            Receipt
                        </button>
                        <button
                            onClick={handlePrintReport}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20"
                        >
                            <Printer className="h-4 w-4" />
                            Report
                        </button>
                        <button
                            onClick={loadTransaction}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <p className="text-xs text-muted">Patient</p>
                    <p className="font-semibold text-primary">{transaction.patientName}</p>
                    {transaction.patientPhone && (
                        <p className="text-xs text-muted">{transaction.patientPhone}</p>
                    )}
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-muted">Tests</p>
                    <p className="font-semibold text-primary">{testCount} total</p>
                    <p className="text-xs text-muted">{completedTests} completed</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-muted">Status</p>
                    <div className="mt-1">{getStatusBadge(transaction.status)}</div>
                    <div className="mt-1">{getPaymentStatusBadge(transaction.paymentStatus)}</div>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-muted">Amount</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>GHS {totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted capitalize">Paid via {transaction.paymentMethod || 'N/A'}</p>
                </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-theme">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-secondary hover:text-primary'
                            }`}
                    >
                        <FileText className="h-4 w-4 inline mr-2" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('tests')}
                        className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tests'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-secondary hover:text-primary'
                            }`}
                    >
                        <FlaskConical className="h-4 w-4 inline mr-2" />
                        Tests ({testCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'results'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-secondary hover:text-primary'
                            }`}
                    >
                        <CheckCircle className="h-4 w-4 inline mr-2" />
                        Results ({completedTests}/{testCount})
                    </button>
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-subtle rounded-xl border border-theme">
                        <div>
                            <p className="text-xs text-muted flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Patient
                            </p>
                            <p className="font-semibold text-primary">{transaction.patientName}</p>
                        </div>
                        {transaction.patientPhone && (
                            <div>
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    Phone
                                </p>
                                <p className="font-semibold text-primary">{transaction.patientPhone}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Date
                            </p>
                            <p className="font-semibold text-primary">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        {transaction.patientAge && (
                            <div>
                                <p className="text-xs text-muted">Age</p>
                                <p className="font-semibold text-primary">{transaction.patientAge}</p>
                            </div>
                        )}
                        {transaction.patientGender && (
                            <div>
                                <p className="text-xs text-muted">Gender</p>
                                <p className="font-semibold text-primary">{transaction.patientGender}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted">Requested By</p>
                            <p className="font-semibold text-primary">{transaction.requestedByName}</p>
                        </div>
                    </div>

                    {transaction.notes && (
                        <div className="p-4 bg-subtle rounded-xl border border-theme">
                            <p className="text-xs text-muted">Notes</p>
                            <p className="text-sm mt-1 text-primary">{transaction.notes}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                const incomplete = transaction.labTests?.filter((t: any) => t.status !== 'completed') || [];
                                if (incomplete.length === 0) {
                                    alert('All tests are already completed');
                                    return;
                                }
                                handleResultEntry(incomplete[0]);
                            }}
                            className="btn-accent px-6 py-2.5"
                        >
                            <Edit2 className="h-4 w-4 inline mr-2" />
                            Enter Results
                        </button>
                    </div>
                </div>
            )}

            {/* Tests Tab */}
            {activeTab === 'tests' && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-subtle border-b border-theme">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Test</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Priority</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Price</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme">
                                {transaction.labTests?.map((test: any) => (
                                    <tr key={test.id} className="hover:bg-subtle transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-primary">{test.testType}</p>
                                            <p className="text-xs text-muted">{test.testNumber}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-secondary">{test.testCategory}</td>
                                        <td className="px-4 py-3">{getStatusBadge(test.status)}</td>
                                        <td className="px-4 py-3">{getPriorityBadge(test.priority)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-primary">
                                            GHS {safeNumber(test.testPrice).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {test.status !== 'completed' && test.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleResultEntry(test)}
                                                    className="btn-accent px-3 py-1.5 text-xs"
                                                >
                                                    <Edit2 className="h-3 w-3 inline mr-1" />
                                                    Results
                                                </button>
                                            )}
                                            {test.status === 'completed' && (
                                                <button
                                                    onClick={() => setActiveTab('results')}
                                                    className="btn-accent px-3 py-1.5 text-xs"
                                                >
                                                    <Eye className="h-3 w-3 inline mr-1" />
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

            {/* Results Tab */}
            {activeTab === 'results' && (
                <div className="space-y-4">
                    {transaction.labTests?.map((test: any) => {
                        const isCompleted = test.status === 'completed';
                        const hasResults = test.results && Object.keys(test.results).length > 0;
                        const isExpanded = expandedTest === test.id;

                        return (
                            <Card key={test.id} className="overflow-hidden">
                                {/* Test Header */}
                                <div className="flex items-center justify-between p-4 bg-subtle border-b border-theme">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isCompleted ? 'bg-success-light' : 'bg-warning-light'}`}>
                                            {isCompleted ? (
                                                <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-success-text)' }} />
                                            ) : (
                                                <Clock className="h-4 w-4" style={{ color: 'var(--color-warning-text)' }} />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-primary">{test.testType}</h4>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted">{test.testNumber}</p>
                                                <span className="text-xs text-muted">•</span>
                                                <p className="text-xs text-muted">{test.testCategory}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(test.status)}
                                        <button
                                            onClick={() => toggleTestExpand(test.id)}
                                            className="p-1.5 hover:bg-subtle rounded-lg transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-muted" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Test Content - Expanded */}
                                {isExpanded && (
                                    <div className="p-4">
                                        {isCompleted && hasResults ? (
                                            <>
                                                {renderResultTable(test)}

                                                {/* Summary and Interpretation */}
                                                {test.resultSummary && (
                                                    <div className="mt-4 p-3 rounded-lg border border-theme" style={{ background: 'var(--color-info-light)' }}>
                                                        <p className="text-xs font-semibold text-info-text">📋 Summary</p>
                                                        <p className="text-sm mt-1 text-info-text">{test.resultSummary}</p>
                                                    </div>
                                                )}
                                                {test.resultInterpretation && (
                                                    <div className="mt-3 p-3 rounded-lg border border-theme" style={{ background: 'var(--color-role-lab-bg)' }}>
                                                        <p className="text-xs font-semibold" style={{ color: 'var(--color-role-lab)' }}>🔬 Interpretation</p>
                                                        <p className="text-sm mt-1" style={{ color: 'var(--color-role-lab)' }}>{test.resultInterpretation}</p>
                                                    </div>
                                                )}
                                                {test.performedByName && (
                                                    <p className="mt-3 text-xs text-muted">
                                                        Performed by: <span className="font-medium text-primary">{test.performedByName}</span>
                                                        on {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                )}
                                            </>
                                        ) : isCompleted ? (
                                            <div className="text-center py-6 text-muted">
                                                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                                                <p className="text-sm">No results entered for this test</p>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-muted">
                                                <Clock className="h-8 w-8 mx-auto mb-2" />
                                                <p className="text-sm">Results pending</p>
                                                {test.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleResultEntry(test)}
                                                        className="btn-accent mt-3 px-4 py-2 text-sm"
                                                    >
                                                        <Edit2 className="h-4 w-4 inline mr-2" />
                                                        Enter Results Now
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Collapsed Preview */}
                                {!isExpanded && isCompleted && hasResults && (
                                    <div className="px-4 pb-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {Object.entries(test.results).slice(0, 4).map(([key, value]) => (
                                                <div key={key} className="flex items-center justify-between p-2 bg-subtle rounded-lg border border-theme">
                                                    <span className="text-xs text-muted">{key}</span>
                                                    <span className="text-xs font-semibold text-primary">{value || 'N/A'}</span>
                                                </div>
                                            ))}
                                            {Object.keys(test.results).length > 4 && (
                                                <div className="flex items-center justify-center p-2 text-xs text-muted">
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
                        <div className="text-center py-12 text-muted">
                            <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                            <p>No tests found in this transaction</p>
                        </div>
                    )}
                </div>
            )}

            {/* Result Entry Modal */}
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

            {/* Receipt Modal */}
            {showReceiptModal && (
                <ReceiptModal
                    transaction={receiptTransaction}
                    customerName={transaction.patientName}
                    customerPhone={transaction.patientPhone}
                    onClose={() => setShowReceiptModal(false)}
                    onPrint={() => window.print()}
                />
            )}

            {/* Report Print Modal */}
            {showPrintModal && transaction && (
                <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-50">
                    <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-theme">
                        <div className="sticky top-0 bg-accent text-accent-fg rounded-t-2xl px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Printer className="h-6 w-6" />
                                <h2 className="text-xl font-bold">Lab Report - {transaction.patientName}</h2>
                            </div>
                            <button
                                onClick={() => setShowPrintModal(false)}
                                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <LabResultPrint transaction={transaction} />
                            <div className="flex gap-3 mt-6 pt-6 border-t border-theme">
                                <button
                                    onClick={() => window.print()}
                                    className="btn-accent flex-1 px-6 py-3"
                                >
                                    <Printer className="h-4 w-4 inline mr-2" />
                                    Print Report
                                </button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="btn-ghost px-6 py-3"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
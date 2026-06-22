// src/pages/LabReports.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    FlaskConical,
    TrendingUp,
    DollarSign,
    Calendar,
    Download,
    BarChart3,
    Users,
    Zap,
    ArrowRight,
    Loader2,
    Award,
    Activity,
    PieChart,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Search,
    Filter
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

export const LabReports: React.FC = () => {
    const [dateRange, setDateRange] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [viewBy, setViewBy] = useState<'tests' | 'patients' | 'revenue'>('tests');
    const [loading, setLoading] = useState(true);

    const { labTransactions = [], fetchLabTransactions, labTestTemplates = [] } = useAppStore();

    // --- Shared field style with HARD-CODED values ---
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

    const onFieldFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
    };

    const onFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border)';
        e.currentTarget.style.boxShadow = 'none';
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await fetchLabTransactions();
        } catch (err) {
            console.error('Failed to load lab data:', err);
        } finally {
            setLoading(false);
        }
    };

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    const allLabTests = useMemo(() => {
        const transactions = Array.isArray(labTransactions) ? labTransactions : [];
        const tests: any[] = [];
        transactions.forEach(t => {
            if (t.labTests && Array.isArray(t.labTests)) {
                t.labTests.forEach((test: any) => {
                    tests.push({
                        ...test,
                        patientName: t.patientName,
                        patientPhone: t.patientPhone,
                        patientAge: t.patientAge,
                        patientGender: t.patientGender,
                        transactionNumber: t.transactionNumber,
                        transactionDate: t.createdAt,
                        totalAmount: t.totalAmount,
                        paymentMethod: t.paymentMethod,
                        paymentStatus: t.paymentStatus,
                    });
                });
            }
        });
        return tests;
    }, [labTransactions]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let filterDate = new Date();
        const transactions = Array.isArray(labTransactions) ? labTransactions : [];

        switch (dateRange) {
            case 'today': filterDate.setHours(0, 0, 0, 0); break;
            case 'week': filterDate.setDate(now.getDate() - 7); break;
            case 'month': filterDate.setMonth(now.getMonth() - 1); break;
            case 'quarter': filterDate.setMonth(now.getMonth() - 3); break;
            case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
            case 'custom':
                if (startDate && endDate) {
                    return transactions.filter((t) => {
                        const txDate = new Date(t.createdAt);
                        return txDate >= new Date(startDate) && txDate <= new Date(endDate);
                    });
                }
                return transactions;
            default: return transactions;
        }
        return transactions.filter((t) => new Date(t.createdAt) >= filterDate);
    }, [dateRange, startDate, endDate, labTransactions]);

    const filteredTests = useMemo(() => {
        const now = new Date();
        let filterDate = new Date();
        const tests = Array.isArray(allLabTests) ? allLabTests : [];

        switch (dateRange) {
            case 'today': filterDate.setHours(0, 0, 0, 0); break;
            case 'week': filterDate.setDate(now.getDate() - 7); break;
            case 'month': filterDate.setMonth(now.getMonth() - 1); break;
            case 'quarter': filterDate.setMonth(now.getMonth() - 3); break;
            case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
            case 'custom':
                if (startDate && endDate) {
                    return tests.filter((t) => {
                        const txDate = new Date(t.createdAt);
                        return txDate >= new Date(startDate) && txDate <= new Date(endDate);
                    });
                }
                return tests;
            default: return tests;
        }
        return tests.filter((t) => new Date(t.createdAt) >= filterDate);
    }, [dateRange, startDate, endDate, allLabTests]);

    const analytics = useMemo(() => {
        const totalRevenue = filteredTransactions.reduce((sum, t) => sum + safeNumber(t.totalAmount), 0);
        const totalTransactions = filteredTransactions.length;
        const totalTests = filteredTests.length;
        const completedTests = filteredTests.filter(t => t.status === 'completed').length;
        const pendingTests = filteredTests.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        const cancelledTests = filteredTests.filter(t => t.status === 'cancelled').length;
        const completionRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

        const testFrequency = filteredTests.reduce((acc, t) => {
            const testName = t.testType || 'Unknown';
            acc[testName] = (acc[testName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topTests = Object.entries(testFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const revenueByTest = filteredTests.reduce((acc, t) => {
            const testName = t.testType || 'Unknown';
            acc[testName] = (acc[testName] || 0) + safeNumber(t.testPrice);
            return acc;
        }, {} as Record<string, number>);
        const topRevenueTests = Object.entries(revenueByTest).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const uniquePatients = new Set(filteredTests.map(t => t.patientName)).size;
        const avgTestsPerPatient = uniquePatients > 0 ? (totalTests / uniquePatients) : 0;
        const avgRevenuePerPatient = uniquePatients > 0 ? (totalRevenue / uniquePatients) : 0;

        const dailyTests = filteredTests.reduce((acc, t) => {
            const date = new Date(t.createdAt).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const dailyTestsArray = Object.entries(dailyTests).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-7);

        const paymentBreakdown = filteredTransactions.reduce((acc, t) => {
            const method = t.paymentMethod || 'unknown';
            acc[method] = (acc[method] || 0) + safeNumber(t.totalAmount);
            return acc;
        }, {} as Record<string, number>);

        return {
            totalRevenue,
            totalTransactions,
            totalTests,
            completedTests,
            pendingTests,
            cancelledTests,
            completionRate,
            topTests,
            topRevenueTests,
            uniquePatients,
            avgTestsPerPatient,
            avgRevenuePerPatient,
            dailyTestsArray,
            paymentBreakdown,
        };
    }, [filteredTransactions, filteredTests]);

    const formatPaymentMethod = (method: string) => {
        if (!method) return 'Unknown';
        switch (method.toLowerCase()) {
            case 'mtn': return 'MTN Mobile Money';
            case 'vodafone': return 'Vodafone Cash';
            case 'airteltigo': return 'AirtelTigo Money';
            default: return method.charAt(0).toUpperCase() + method.slice(1);
        }
    };

    const exportLabReport = () => {
        const csvData = [
            ['Metric', 'Value'],
            ['Total Revenue', `GHS ${analytics.totalRevenue.toFixed(2)}`],
            ['Total Transactions', analytics.totalTransactions],
            ['Total Tests', analytics.totalTests],
            ['Completed Tests', analytics.completedTests],
            ['Pending Tests', analytics.pendingTests],
            ['Cancelled Tests', analytics.cancelledTests],
            ['Completion Rate', `${analytics.completionRate}%`],
            ['Unique Patients', analytics.uniquePatients],
            ['Avg Tests Per Patient', analytics.avgTestsPerPatient.toFixed(2)],
            ['Avg Revenue Per Patient', `GHS ${analytics.avgRevenuePerPatient.toFixed(2)}`],
            [],
            ['Top Tests', 'Count'],
            ...analytics.topTests.map(([name, count]) => [name, count]),
            [],
            ['Top Revenue Tests', 'Revenue'],
            ...analytics.topRevenueTests.map(([name, revenue]) => [name, `GHS ${revenue.toFixed(2)}`]),
        ];
        const csvContent = csvData.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-analytics-${dateRange}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: 256 }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
        );
    }

    // Status badge helper
    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        const config: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
            completed: {
                bg: 'var(--color-success-light)',
                color: 'var(--color-success-text)',
                icon: <CheckCircle size={12} />,
                label: 'Completed'
            },
            pending: {
                bg: 'var(--color-warning-light)',
                color: 'var(--color-warning-text)',
                icon: <Clock size={12} />,
                label: 'Pending'
            },
            in_progress: {
                bg: 'var(--color-info-light)',
                color: 'var(--color-info-text)',
                icon: <Activity size={12} />,
                label: 'In Progress'
            },
            cancelled: {
                bg: 'var(--color-danger-light)',
                color: 'var(--color-danger-text)',
                icon: <XCircle size={12} />,
                label: 'Cancelled'
            },
        };
        const { bg, color, icon, label } = config[status] || config.pending;
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: bg,
                color: color,
            }}>
                {icon}
                {label}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px' }}>

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: '4px' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Lab Analytics & Reports
                        </h1>
                        <p style={{ fontSize: '13px', marginTop: '2px', color: 'var(--color-text-muted)' }}>
                            Comprehensive laboratory test analytics and performance metrics
                        </p>
                    </div>
                    <div className="hidden md:flex items-center" style={{ gap: '8px', padding: '6px 14px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <Activity size={14} style={{ color: 'var(--color-warning)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Live Analytics</span>
                    </div>
                </div>
            </div>

            {/* ── DATE RANGE SELECTOR ────────────────────────────────── */}
            <Card style={{ padding: '16px 20px' }}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between" style={{ gap: '12px' }}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center" style={{ gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                        <div className="flex items-center" style={{ gap: '8px', flexShrink: 0 }}>
                            <Calendar size={18} style={{ color: 'var(--color-text-muted)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Date Range:</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {['today', 'week', 'month', 'quarter', 'year', 'custom'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        background: dateRange === range ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                                        color: dateRange === range ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                                        border: dateRange === range ? 'none' : '1px solid var(--color-border)',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        height: 'auto',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (dateRange !== range) {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
                                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (dateRange !== range) {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                                            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
                                        }
                                    }}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                        {dateRange === 'custom' && (
                            <div className="flex flex-col sm:flex-row" style={{ gap: '8px', alignItems: 'start sm:items-center' }}>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ ...fieldStyle, width: 140 }}
                                    onFocus={onFieldFocus}
                                    onBlur={onFieldBlur}
                                />
                                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ ...fieldStyle, width: 140 }}
                                    onFocus={onFieldFocus}
                                    onBlur={onFieldBlur}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={exportLabReport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px 18px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--color-success)',
                            color: '#fff',
                            cursor: 'pointer',
                            height: '42px',
                            flexShrink: 0,
                            transition: 'opacity 150ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = '0.9'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    >
                        <Download size={16} />
                        Export Report
                    </button>
                </div>
            </Card>

            {/* ── VIEW TYPE TABS ──────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--color-border)', marginBottom: '4px' }}>
                {[
                    { id: 'tests', label: 'Test Analytics', icon: <FlaskConical size={16} /> },
                    { id: 'patients', label: 'Patient Analytics', icon: <Users size={16} /> },
                    { id: 'revenue', label: 'Revenue Analytics', icon: <DollarSign size={16} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setViewBy(tab.id as any)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: 'transparent',
                            border: 'none',
                            color: viewBy === tab.id ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                            borderBottom: viewBy === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            marginBottom: '-1px',
                        }}
                        onMouseEnter={(e) => {
                            if (viewBy !== tab.id) {
                                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (viewBy !== tab.id) {
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

            {/* ── KEY METRICS ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '12px' }}>
                <Card style={{ padding: '16px', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Total Revenue</span>
                        <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'var(--color-success)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        GHS {analytics.totalRevenue.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{analytics.totalTransactions} transactions</p>
                </Card>

                <Card style={{ padding: '16px', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Total Tests</span>
                        <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'var(--color-accent)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <FlaskConical size={16} />
                        </div>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.totalTests}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Requested tests</p>
                </Card>

                <Card style={{ padding: '16px', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Completion Rate</span>
                        <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'var(--color-accent2)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Award size={16} />
                        </div>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.completionRate}%</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{analytics.completedTests} completed</p>
                </Card>

                <Card style={{ padding: '16px', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Unique Patients</span>
                        <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'var(--color-warning)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Users size={16} />
                        </div>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.uniquePatients}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Active patients</p>
                </Card>
            </div>

            {/* ── TEST ANALYTICS VIEW ──────────────────────────────────── */}
            {viewBy === 'tests' && (
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '12px' }}>
                    {/* Most Requested Tests */}
                    <Card style={{ padding: '16px' }}>
                        <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                            <Award size={18} style={{ color: 'var(--color-warning)' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Most Requested Tests</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 320, overflowY: 'auto' }}>
                            {analytics.topTests.map(([name, count], index) => {
                                const percentage = analytics.totalTests > 0 ? (count / analytics.totalTests) * 100 : 0;
                                return (
                                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center" style={{ gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', width: 20, fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{count} tests</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'var(--color-bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.min(percentage * 10, 100)}%`,
                                                height: 6,
                                                background: 'var(--gradient-accent)',
                                                borderRadius: '9999px',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {analytics.topTests.length === 0 && (
                                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', padding: '16px 0' }}>No test data available</p>
                            )}
                        </div>
                    </Card>

                    {/* Status Distribution */}
                    <Card style={{ padding: '16px' }}>
                        <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                            <PieChart size={18} style={{ color: 'var(--color-accent)' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Test Status Distribution</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { label: 'Completed', value: analytics.completedTests, color: 'var(--color-success)' },
                                { label: 'Pending', value: analytics.pendingTests, color: 'var(--color-warning)' },
                                { label: 'Cancelled', value: analytics.cancelledTests, color: 'var(--color-danger)' },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between">
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{item.label}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
                                    </div>
                                    <div style={{ width: '100%', height: 8, background: 'var(--color-bg-subtle)', borderRadius: '9999px', overflow: 'hidden', marginTop: '2px' }}>
                                        <div style={{
                                            width: analytics.totalTests > 0 ? `${(item.value / analytics.totalTests) * 100}%` : '0%',
                                            height: 8,
                                            background: item.color,
                                            borderRadius: '9999px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Total Tests</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.totalTests}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Daily Test Trend */}
                    {analytics.dailyTestsArray.length > 0 && (
                        <Card style={{ padding: '16px', gridColumn: '1 / -1' }}>
                            <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                                <TrendingUp size={18} style={{ color: 'var(--color-accent)' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Daily Test Trend (Last 7 Days)</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {analytics.dailyTestsArray.map(([date, count]) => {
                                    const maxCount = Math.max(...analytics.dailyTestsArray.map(([_, c]) => c));
                                    return (
                                        <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div className="flex items-center justify-between">
                                                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{date}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{count} tests</span>
                                            </div>
                                            <div style={{ width: '100%', height: 6, background: 'var(--color-bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
                                                    height: 6,
                                                    background: 'var(--gradient-accent)',
                                                    borderRadius: '9999px',
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* ── PATIENT ANALYTICS VIEW ────────────────────────────────── */}
            {viewBy === 'patients' && (
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '12px' }}>
                    <Card style={{ padding: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>Patient Overview</h3>
                        <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                            <div style={{
                                padding: '14px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-info)',
                                background: 'var(--color-info-light)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-info-text)', fontVariantNumeric: 'tabular-nums' }}>{analytics.uniquePatients}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Total Patients</p>
                            </div>
                            <div style={{
                                padding: '14px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-accent)',
                                background: 'var(--color-accent-light)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>{analytics.avgTestsPerPatient.toFixed(1)}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Avg Tests/Patient</p>
                            </div>
                            <div style={{
                                padding: '14px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-success)',
                                background: 'var(--color-success-light)',
                                textAlign: 'center',
                                gridColumn: '1 / -1',
                            }}>
                                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success-text)', fontVariantNumeric: 'tabular-nums' }}>GHS {analytics.avgRevenuePerPatient.toFixed(2)}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Avg Revenue Per Patient</p>
                            </div>
                        </div>
                    </Card>

                    <Card style={{ padding: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>Patient Activity</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                background: 'var(--color-bg-subtle)',
                            }}>
                                <div className="flex items-center" style={{ gap: '8px' }}>
                                    <Users size={16} style={{ color: 'var(--color-accent)' }} />
                                    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>Active Patients</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.uniquePatients}</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                background: 'var(--color-bg-subtle)',
                            }}>
                                <div className="flex items-center" style={{ gap: '8px' }}>
                                    <FlaskConical size={16} style={{ color: 'var(--color-accent2)' }} />
                                    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>Total Tests</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.totalTests}</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                background: 'var(--color-bg-subtle)',
                            }}>
                                <div className="flex items-center" style={{ gap: '8px' }}>
                                    <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
                                    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>Tests Per Patient</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{analytics.avgTestsPerPatient.toFixed(1)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── REVENUE ANALYTICS VIEW ────────────────────────────────── */}
            {viewBy === 'revenue' && (
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '12px' }}>
                    {/* Top Revenue Tests */}
                    <Card style={{ padding: '16px' }}>
                        <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                            <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Top Revenue Tests</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 320, overflowY: 'auto' }}>
                            {analytics.topRevenueTests.map(([name, revenue], index) => {
                                const percentage = analytics.totalRevenue > 0 ? (revenue / analytics.totalRevenue) * 100 : 0;
                                return (
                                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center" style={{ gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', width: 20, fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success-text)', fontVariantNumeric: 'tabular-nums' }}>GHS {revenue.toFixed(2)}</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'var(--color-bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.min(percentage * 5, 100)}%`,
                                                height: 6,
                                                background: 'var(--color-success)',
                                                borderRadius: '9999px',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{percentage.toFixed(1)}% of total revenue</span>
                                    </div>
                                );
                            })}
                            {analytics.topRevenueTests.length === 0 && (
                                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', padding: '16px 0' }}>No revenue data available</p>
                            )}
                        </div>
                    </Card>

                    {/* Payment Method Breakdown */}
                    <Card style={{ padding: '16px' }}>
                        <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
                            <PieChart size={18} style={{ color: 'var(--color-accent)' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Payment Method Breakdown</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.entries(analytics.paymentBreakdown).map(([method, amount]) => {
                                const percentage = analytics.totalRevenue > 0 ? ((amount / analytics.totalRevenue) * 100) : 0;
                                return (
                                    <div key={method}>
                                        <div className="flex items-center justify-between">
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{formatPaymentMethod(method)}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>GHS {safeNumber(amount).toFixed(2)}</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'var(--color-bg-subtle)', borderRadius: '9999px', overflow: 'hidden', marginTop: '2px' }}>
                                            <div style={{
                                                width: `${percentage}%`,
                                                height: 6,
                                                background: 'var(--gradient-accent)',
                                                borderRadius: '9999px',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{percentage.toFixed(1)}% of total revenue</span>
                                    </div>
                                );
                            })}
                            {Object.keys(analytics.paymentBreakdown).length === 0 && (
                                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', padding: '16px 0' }}>No payment data available</p>
                            )}
                        </div>
                    </Card>

                    {/* Revenue Summary */}
                    <Card style={{ padding: '16px', gridColumn: '1 / -1' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>Revenue Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '12px' }}>
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-success)',
                                background: 'var(--color-success-light)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success-text)', fontVariantNumeric: 'tabular-nums' }}>GHS {analytics.totalRevenue.toFixed(2)}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Total Revenue</p>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-info)',
                                background: 'var(--color-info-light)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-info-text)', fontVariantNumeric: 'tabular-nums' }}>{analytics.totalTransactions}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Transactions</p>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-accent)',
                                background: 'var(--color-accent-light)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>GHS {(analytics.totalRevenue / (analytics.totalTransactions || 1)).toFixed(2)}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Avg Transaction</p>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-accent2)',
                                background: 'var(--color-accent2-light)',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent2-text)', fontVariantNumeric: 'tabular-nums' }}>{analytics.topRevenueTests.length}</p>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Revenue Tests</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
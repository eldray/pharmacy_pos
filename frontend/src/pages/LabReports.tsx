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

    // Use labTransactions and fetchLabTransactions from store
    const { labTransactions = [], fetchLabTransactions, labTestTemplates = [] } = useAppStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch lab transactions which include all lab tests
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

    // Extract all lab tests from transactions
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

    // Filter transactions by date
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let filterDate = new Date();

        const transactions = Array.isArray(labTransactions) ? labTransactions : [];

        switch (dateRange) {
            case 'today':
                filterDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                filterDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                filterDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                filterDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                filterDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'custom':
                if (startDate && endDate) {
                    return transactions.filter((t) => {
                        const txDate = new Date(t.createdAt);
                        return txDate >= new Date(startDate) && txDate <= new Date(endDate);
                    });
                }
                return transactions;
            default:
                return transactions;
        }

        return transactions.filter((t) => new Date(t.createdAt) >= filterDate);
    }, [dateRange, startDate, endDate, labTransactions]);

    // Filter tests by date
    const filteredTests = useMemo(() => {
        const now = new Date();
        let filterDate = new Date();

        const tests = Array.isArray(allLabTests) ? allLabTests : [];

        switch (dateRange) {
            case 'today':
                filterDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                filterDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                filterDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                filterDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                filterDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'custom':
                if (startDate && endDate) {
                    return tests.filter((t) => {
                        const txDate = new Date(t.createdAt);
                        return txDate >= new Date(startDate) && txDate <= new Date(endDate);
                    });
                }
                return tests;
            default:
                return tests;
        }

        return tests.filter((t) => new Date(t.createdAt) >= filterDate);
    }, [dateRange, startDate, endDate, allLabTests]);

    // LAB ANALYTICS
    const analytics = useMemo(() => {
        // Revenue metrics
        const totalRevenue = filteredTransactions.reduce((sum, t) => sum + safeNumber(t.totalAmount), 0);
        const totalTransactions = filteredTransactions.length;

        // Test metrics
        const totalTests = filteredTests.length;
        const completedTests = filteredTests.filter(t => t.status === 'completed').length;
        const pendingTests = filteredTests.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        const cancelledTests = filteredTests.filter(t => t.status === 'cancelled').length;
        const completionRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

        // Most requested tests
        const testFrequency = filteredTests.reduce((acc, t) => {
            const testName = t.testType || 'Unknown';
            acc[testName] = (acc[testName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topTests = Object.entries(testFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Revenue by test type
        const revenueByTest = filteredTests.reduce((acc, t) => {
            const testName = t.testType || 'Unknown';
            acc[testName] = (acc[testName] || 0) + safeNumber(t.testPrice);
            return acc;
        }, {} as Record<string, number>);

        const topRevenueTests = Object.entries(revenueByTest)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Patient metrics
        const uniquePatients = new Set(filteredTests.map(t => t.patientName)).size;
        const avgTestsPerPatient = uniquePatients > 0 ? (totalTests / uniquePatients) : 0;
        const avgRevenuePerPatient = uniquePatients > 0 ? (totalRevenue / uniquePatients) : 0;

        // Daily trends
        const dailyTests = filteredTests.reduce((acc, t) => {
            const date = new Date(t.createdAt).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const dailyTestsArray = Object.entries(dailyTests)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .slice(-7);

        // Payment method breakdown for lab tests
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
                        <h1 className="text-2xl font-bold mb-2">Lab Analytics & Reports</h1>
                        <p className="text-white/80">Comprehensive laboratory test analytics and performance metrics</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                        <Activity className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium">Live Analytics</span>
                    </div>
                </div>
            </div>

            {/* Date Range Selector */}
            <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 shrink-0">
                            <Calendar className="h-5 w-5 text-gray-600" />
                            <span className="font-semibold text-gray-700">Date Range:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['today', 'week', 'month', 'quarter', 'year', 'custom'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${dateRange === range
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                                        }`}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                        {dateRange === 'custom' && (
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                                <span className="text-gray-500 text-sm hidden sm:block">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={exportLabReport}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg whitespace-nowrap shrink-0"
                    >
                        <Download className="h-4 w-4" />
                        Export Report
                    </button>
                </div>
            </Card>

            {/* View Type Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setViewBy('tests')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${viewBy === 'tests'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <FlaskConical className="h-4 w-4 inline mr-1" />
                    Test Analytics
                </button>
                <button
                    onClick={() => setViewBy('patients')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${viewBy === 'patients'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users className="h-4 w-4 inline mr-1" />
                    Patient Analytics
                </button>
                <button
                    onClick={() => setViewBy('revenue')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${viewBy === 'revenue'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Revenue Analytics
                </button>
            </div>

            {/* Rest of the component remains the same... */}
            {/* KEY METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Total Revenue</p>
                        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                            <DollarSign className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        GHS {analytics.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{analytics.totalTransactions} transactions</p>
                </Card>

                <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Total Tests</p>
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                            <FlaskConical className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{analytics.totalTests}</p>
                    <p className="text-xs text-gray-500 mt-1">Requested tests</p>
                </Card>

                <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Completion Rate</p>
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                            <Award className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{analytics.completionRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">{analytics.completedTests} completed</p>
                </Card>

                <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Unique Patients</p>
                        <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                            <Users className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{analytics.uniquePatients}</p>
                    <p className="text-xs text-gray-500 mt-1">Active patients</p>
                </Card>
            </div>

            {/* TEST ANALYTICS VIEW */}
            {viewBy === 'tests' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Most Requested Tests */}
                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-500" />
                            Most Requested Tests
                        </h2>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {analytics.topTests.map(([name, count], index) => {
                                const percentage = analytics.totalTests > 0 ? (count / analytics.totalTests) * 100 : 0;
                                return (
                                    <div key={name} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
                                                <span className="font-medium text-gray-700 truncate">{name}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{count} tests</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(percentage * 10, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {analytics.topTests.length === 0 && (
                                <p className="text-center text-gray-500 py-4">No test data available</p>
                            )}
                        </div>
                    </Card>

                    {/* Status Distribution */}
                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-blue-500" />
                            Test Status Distribution
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-green-600">Completed</span>
                                    <span className="font-semibold">{analytics.completedTests}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                                    <div
                                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: analytics.totalTests > 0 ? `${(analytics.completedTests / analytics.totalTests) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-yellow-600">Pending</span>
                                    <span className="font-semibold">{analytics.pendingTests}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                                    <div
                                        className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: analytics.totalTests > 0 ? `${(analytics.pendingTests / analytics.totalTests) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-red-600">Cancelled</span>
                                    <span className="font-semibold">{analytics.cancelledTests}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                                    <div
                                        className="bg-red-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: analytics.totalTests > 0 ? `${(analytics.cancelledTests / analytics.totalTests) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <span>Total Tests</span>
                                    <span>{analytics.totalTests}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Daily Test Trend */}
                    {analytics.dailyTestsArray.length > 0 && (
                        <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 lg:col-span-2">
                            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                Daily Test Trend (Last 7 Days)
                            </h2>
                            <div className="space-y-2">
                                {analytics.dailyTestsArray.map(([date, count]) => {
                                    const maxCount = Math.max(...analytics.dailyTestsArray.map(([_, c]) => c));
                                    return (
                                        <div key={date} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">{date}</span>
                                                <span className="font-semibold text-gray-900">{count} tests</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* PATIENT ANALYTICS VIEW */}
            {viewBy === 'patients' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-3">Patient Overview</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{analytics.uniquePatients}</p>
                                    <p className="text-xs text-gray-600">Total Patients</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                                    <p className="text-2xl font-bold text-purple-600">{analytics.avgTestsPerPatient.toFixed(1)}</p>
                                    <p className="text-xs text-gray-600">Avg Tests/Patient</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center col-span-2">
                                    <p className="text-2xl font-bold text-green-600">GHS {analytics.avgRevenuePerPatient.toFixed(2)}</p>
                                    <p className="text-xs text-gray-600">Avg Revenue Per Patient</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-3">Patient Activity</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm">Active Patients</span>
                                </div>
                                <span className="font-bold">{analytics.uniquePatients}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm">Total Tests</span>
                                </div>
                                <span className="font-bold">{analytics.totalTests}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span className="text-sm">Tests Per Patient</span>
                                </div>
                                <span className="font-bold">{analytics.avgTestsPerPatient.toFixed(1)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* REVENUE ANALYTICS VIEW */}
            {viewBy === 'revenue' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top Revenue Tests */}
                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            Top Revenue Tests
                        </h2>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {analytics.topRevenueTests.map(([name, revenue], index) => {
                                const percentage = analytics.totalRevenue > 0 ? (revenue / analytics.totalRevenue) * 100 : 0;
                                return (
                                    <div key={name} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
                                                <span className="font-medium text-gray-700 truncate">{name}</span>
                                            </div>
                                            <span className="font-semibold text-green-600">GHS {revenue.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(percentage * 5, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500">{percentage.toFixed(1)}% of total revenue</p>
                                    </div>
                                );
                            })}
                            {analytics.topRevenueTests.length === 0 && (
                                <p className="text-center text-gray-500 py-4">No revenue data available</p>
                            )}
                        </div>
                    </Card>

                    {/* Payment Method Breakdown */}
                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
                        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-blue-500" />
                            Payment Method Breakdown
                        </h2>
                        <div className="space-y-2">
                            {Object.entries(analytics.paymentBreakdown).map(([method, amount]) => {
                                const percentage = analytics.totalRevenue > 0 ? ((amount / analytics.totalRevenue) * 100) : 0;
                                return (
                                    <div key={method} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-700">
                                                {formatPaymentMethod(method)}
                                            </span>
                                            <span className="text-xs font-bold text-gray-900">
                                                GHS {safeNumber(amount).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500">{percentage.toFixed(1)}% of total revenue</p>
                                    </div>
                                );
                            })}
                            {Object.keys(analytics.paymentBreakdown).length === 0 && (
                                <p className="text-center text-gray-500 py-4">No payment data available</p>
                            )}
                        </div>
                    </Card>

                    {/* Revenue Summary */}
                    <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 lg:col-span-2">
                        <h2 className="text-base font-bold text-gray-900 mb-3">Revenue Summary</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                                <p className="text-lg font-bold text-green-600">GHS {analytics.totalRevenue.toFixed(2)}</p>
                                <p className="text-xs text-gray-600">Total Revenue</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                                <p className="text-lg font-bold text-blue-600">{analytics.totalTransactions}</p>
                                <p className="text-xs text-gray-600">Transactions</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
                                <p className="text-lg font-bold text-purple-600">GHS {(analytics.totalRevenue / (analytics.totalTransactions || 1)).toFixed(2)}</p>
                                <p className="text-xs text-gray-600">Avg Transaction</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                                <p className="text-lg font-bold text-emerald-600">{analytics.topRevenueTests.length}</p>
                                <p className="text-xs text-gray-600">Revenue Generating Tests</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
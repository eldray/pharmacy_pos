// src/pages/AnalyticsPage.tsx
import React, { useMemo, useState } from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, Package, Calendar, Download,
  BarChart3, Users, Zap, ArrowRight, AlertTriangle, Clock,
  PieChart, Activity, Award, TrendingDown, Filter, X, XCircle,
  Printer, FileText, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'expiry'>('sales');
  const [expiryThreshold, setExpiryThreshold] = useState(30); // days

  const { currentUser, transactions, products, inventoryLogs } = useAppStore();

  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let filterDate = new Date();

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
  }, [dateRange, startDate, endDate, transactions]);

  // Expiry Reports
  const expiryData = useMemo(() => {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + expiryThreshold);

    const expiringProducts = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      return expiry <= thresholdDate && expiry >= today;
    });

    const expiredProducts = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      return expiry < today;
    });

    const expiringSoon = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= expiryThreshold;
    });

    // Group by expiry month
    const expiryByMonth = products.reduce((acc, p) => {
      if (!p.expiryDate) return acc;
      const month = new Date(p.expiryDate).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[month]) acc[month] = [];
      acc[month].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    return {
      expired: expiredProducts,
      expiringSoon: expiringSoon,
      totalExpiring: expiringProducts.length,
      totalExpired: expiredProducts.length,
      expiryByMonth,
      threshold: expiryThreshold
    };
  }, [products, expiryThreshold]);

  // Sales Metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + safeNumber(t.total), 0);
    const totalTransactions = filteredTransactions.length;
    const totalItemsSold = filteredTransactions.reduce(
      (sum, t) => sum + t.items.reduce((itemSum, item) => itemSum + safeNumber(item.quantity), 0),
      0
    );

    const paymentBreakdown = filteredTransactions.reduce((acc, t) => {
      const method = t.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + safeNumber(t.total);
      return acc;
    }, {} as Record<string, number>);

    const productSales = filteredTransactions.reduce((acc, t) => {
      t.items.forEach((item) => {
        const productName = item.product?.name || item.productName || 'Unknown Product';
        if (!acc[productName]) {
          acc[productName] = { quantity: 0, revenue: 0 };
        }
        acc[productName].quantity += safeNumber(item.quantity);
        acc[productName].revenue += safeNumber(item.total);
      });
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);

    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const inventoryValue = products.reduce((sum, p) => {
      return sum + safeNumber(p.quantity) * safeNumber(p.unitPrice);
    }, 0);

    // Daily sales trend
    const dailySales = filteredTransactions.reduce((acc, t) => {
      const date = new Date(t.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + safeNumber(t.total);
      return acc;
    }, {} as Record<string, number>);

    const dailySalesArray = Object.entries(dailySales)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7);

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      avgTransactionValue,
      inventoryValue,
      paymentBreakdown,
      topProducts,
      dailySales: dailySalesArray,
    };
  }, [filteredTransactions, products]);

  const exportToCSV = () => {
    const csvData = [
      ['Transaction Number', 'Date', 'Cashier', 'Payment Method', 'Subtotal', 'Tax', 'Total'],
      ...filteredTransactions.map((t) => [
        t.transactionNumber || 'N/A',
        new Date(t.createdAt).toLocaleString(),
        t.cashierName || 'N/A',
        t.paymentMethod || 'N/A',
        safeNumber(t.subtotal).toFixed(2),
        safeNumber(t.tax).toFixed(2),
        safeNumber(t.total).toFixed(2),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-analytics-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExpiryReport = () => {
    const csvData = [
      ['Product Name', 'SKU', 'Batch Number', 'Quantity', 'Expiry Date', 'Days Until Expiry', 'Status'],
      ...expiryData.expiringSoon.map((p) => {
        const daysUntil = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return [
          p.name,
          p.sku,
          p.batchNumber || 'N/A',
          p.quantity,
          new Date(p.expiryDate).toLocaleDateString(),
          daysUntil,
          daysUntil <= 7 ? 'Critical' : daysUntil <= 30 ? 'Warning' : 'OK'
        ];
      }),
      ...expiryData.expired.map((p) => [
        p.name,
        p.sku,
        p.batchNumber || 'N/A',
        p.quantity,
        new Date(p.expiryDate).toLocaleDateString(),
        'EXPIRED',
        'EXPIRED'
      ])
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiry-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPaymentMethod = (method: string) => {
    if (!method) return 'Unknown';
    switch (method.toLowerCase()) {
      case 'mtn': return 'MTN Mobile Money';
      case 'vodafone': return 'Vodafone Cash';
      case 'airteltigo': return 'AirtelTigo Money';
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const getExpiryStatusColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-600 bg-red-50 border-red-200';
    if (daysUntil <= 7) return 'text-red-600 bg-red-50 border-red-200';
    if (daysUntil <= 30) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Analytics & Reports</h1>
            <p className="text-white/80">Comprehensive sales, inventory, and expiry reports</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <Activity className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium">Live Analytics</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'sales'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <DollarSign className="h-4 w-4 inline mr-1" />
          Sales Analytics
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'inventory'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Package className="h-4 w-4 inline mr-1" />
          Inventory Report
        </button>
        <button
          onClick={() => setActiveTab('expiry')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'expiry'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          Expiry Reports
          {expiryData.totalExpiring > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {expiryData.totalExpiring}
            </span>
          )}
        </button>
      </div>

      {/* Sales Analytics Tab */}
      {activeTab === 'sales' && (
        <>
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
                      className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                    <span className="text-gray-500 text-sm hidden sm:block">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={exportToCSV}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Total Revenue</p>
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">
                GHS {safeNumber(metrics.totalRevenue).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{metrics.totalTransactions} transactions</p>
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Avg Transaction</p>
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">
                GHS {safeNumber(metrics.avgTransactionValue).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per sale average</p>
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Items Sold</p>
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">{metrics.totalItemsSold}</p>
              <p className="text-xs text-gray-500 mt-1">Total units</p>
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Inventory Value</p>
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">
                GHS {safeNumber(metrics.inventoryValue).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{products.length} products</p>
            </Card>
          </div>

          {/* Daily Sales Trend */}
          {metrics.dailySales.length > 0 && (
            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
              <h2 className="text-base font-bold text-gray-900 mb-3">Daily Sales Trend</h2>
              <div className="space-y-2">
                {metrics.dailySales.map(([date, amount]) => (
                  <div key={date} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{date}</span>
                      <span className="font-semibold text-gray-900">GHS {safeNumber(amount).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((amount / Math.max(...metrics.dailySales.map(([_, a]) => a))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Payment & Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
              <h2 className="text-base font-bold text-gray-900 mb-3">Payment Method Breakdown</h2>
              <div className="space-y-2">
                {Object.entries(metrics.paymentBreakdown).map(([method, amount]) => {
                  const percentage = metrics.totalRevenue > 0 ? ((amount / metrics.totalRevenue) * 100).toFixed(1) : 0;
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
                      <p className="text-[10px] text-gray-500">{percentage}% of total revenue</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
              <h2 className="text-base font-bold text-gray-900 mb-3">Top Products</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {metrics.topProducts.map(([name, data], index) => (
                  <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-bold text-xs shadow-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                      <p className="text-xs text-gray-500">{data.quantity} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">GHS {safeNumber(data.revenue).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Inventory Report Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{products.length}</p>
                <p className="text-xs text-gray-600">Total Products</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => safeNumber(p.quantity) > 50).length}
                </p>
                <p className="text-xs text-gray-600">Well Stocked</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-600">
                  {products.filter(p => safeNumber(p.quantity) > 0 && safeNumber(p.quantity) <= 20).length}
                </p>
                <p className="text-xs text-gray-600">Low Stock</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => safeNumber(p.quantity) === 0).length}
                </p>
                <p className="text-xs text-gray-600">Out of Stock</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3">Inventory Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Total Value</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.slice(0, 20).map((product) => {
                    const qty = safeNumber(product.quantity);
                    const price = safeNumber(product.unitPrice);
                    const status = qty === 0 ? 'Out of Stock' : qty <= 20 ? 'Low Stock' : 'In Stock';
                    const statusColor = qty === 0 ? 'text-red-600' : qty <= 20 ? 'text-yellow-600' : 'text-green-600';

                    return (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2 text-sm font-medium">{product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{product.sku}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">{qty}</td>
                        <td className="px-4 py-2 text-sm text-right">GHS {price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">GHS {(qty * price).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColor} bg-opacity-10`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Expiry Reports Tab */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          {/* Expiry Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Expired Products</p>
                  <p className="text-2xl font-bold text-red-600">{expiryData.totalExpired}</p>
                </div>
                <div className="p-2 bg-red-500 rounded-lg">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{expiryData.totalExpiring}</p>
                </div>
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Threshold Days</p>
                  <p className="text-2xl font-bold text-blue-600">{expiryThreshold}</p>
                </div>
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                value={expiryThreshold}
                onChange={(e) => setExpiryThreshold(parseInt(e.target.value))}
                className="w-full mt-2"
              />
            </Card>

            <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Expiry Value</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    GHS {expiryData.expiringSoon.reduce((sum, p) => sum + safeNumber(p.quantity) * safeNumber(p.unitPrice), 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>
          </div>

          {/* Expiry by Month */}
          <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Expiry by Month</h2>
              <button
                onClick={exportExpiryReport}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow"
              >
                <Download className="h-4 w-4" />
                Export Report
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(expiryData.expiryByMonth).map(([month, products]) => (
                <div key={month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700">{month}</span>
                    <span className="text-gray-500">{products.length} products</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((products.length / Math.max(...Object.values(expiryData.expiryByMonth).map(p => p.length))) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Expiring Products List */}
          <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3">Products Expiring Soon</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Batch</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Expiry Date</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Days Left</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...expiryData.expired, ...expiryData.expiringSoon].slice(0, 20).map((product) => {
                    const daysUntil = Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysUntil < 0;
                    const status = isExpired ? 'EXPIRED' : daysUntil <= 7 ? 'Critical' : daysUntil <= 30 ? 'Warning' : 'OK';
                    const statusColor = isExpired ? 'text-red-600' : daysUntil <= 7 ? 'text-red-600' : daysUntil <= 30 ? 'text-orange-600' : 'text-green-600';

                    return (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2 text-sm font-medium">{product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{product.batchNumber || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">{product.quantity}</td>
                        <td className="px-4 py-2 text-sm">{new Date(product.expiryDate).toLocaleDateString()}</td>
                        <td className={`px-4 py-2 text-sm text-right font-bold ${isExpired ? 'text-red-600' : ''}`}>
                          {isExpired ? 'EXPIRED' : `${daysUntil} days`}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${getExpiryStatusColor(daysUntil)}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
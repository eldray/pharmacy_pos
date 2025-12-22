// src/pages/AnalyticsPage.tsx (Fixed)
import React, { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Package, Calendar, Download, BarChart3, Users, Zap, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { currentUser, transactions, products } = useAppStore();

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

  // Get only the last 10 transactions for display
  const recentTransactions = useMemo(() => {
    return filteredTransactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [filteredTransactions]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactions.length;
    const totalItemsSold = filteredTransactions.reduce(
      (sum, t) => sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );

    // Payment method breakdown
    const paymentBreakdown = filteredTransactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
      return acc;
    }, {} as Record<string, number>);

    // Top products
    const productSales = filteredTransactions.reduce((acc, t) => {
      t.items.forEach((item) => {
        if (!acc[item.product.name]) {
          acc[item.product.name] = { quantity: 0, revenue: 0 };
        }
        acc[item.product.name].quantity += item.quantity;
        acc[item.product.name].revenue += item.total;
      });
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    // Average transaction value
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Inventory value
    const inventoryValue = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      avgTransactionValue,
      inventoryValue,
      paymentBreakdown,
      topProducts,
    };
  }, [filteredTransactions, products]);

  // Export to CSV
  const exportToCSV = () => {
    const csvData = [
      ['Transaction Number', 'Date', 'Cashier', 'Payment Method', 'Subtotal', 'Tax', 'Total'],
      ...filteredTransactions.map((t) => [
        t.transactionNumber,
        new Date(t.createdAt).toLocaleString(),
        t.cashierName,
        t.paymentMethod,
        t.subtotal.toFixed(2),
        t.tax.toFixed(2),
        t.total.toFixed(2),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-sales-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'mtn':
        return 'MTN Mobile Money';
      case 'vodafone':
        return 'Vodafone Cash';
      case 'airteltigo':
        return 'AirtelTigo Money';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Sales Analytics & Reports</h1>
            <p className="text-white/80">Track sales performance and generate detailed reports</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <BarChart3 className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium">Live Analytics</span>
          </div>
        </div>
      </div>

      {/* Date Range Selector and Export */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-700">Date Range:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['today', 'week', 'month', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                      dateRange === range
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

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </Card>
      </div>

      {/* Key Metrics Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all duration-200">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-gray-600">Total Revenue</p>
      <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
        <DollarSign className="h-4 w-4 text-white" />
      </div>
    </div>
    <p className="text-xl font-bold text-gray-900">GHS {metrics.totalRevenue.toFixed(2)}</p>
    <p className="text-xs text-gray-500 mt-1">{metrics.totalTransactions} transactions</p>
  </Card>

  <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200 hover:border-blue-200 transition-all duration-200">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-gray-600">Avg Transaction</p>
      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
        <TrendingUp className="h-4 w-4 text-white" />
      </div>
    </div>
    <p className="text-xl font-bold text-gray-900">GHS {metrics.avgTransactionValue.toFixed(2)}</p>
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
    <p className="text-xl font-bold text-gray-900">GHS {metrics.inventoryValue.toFixed(2)}</p>
    <p className="text-xs text-gray-500 mt-1">{products.length} products</p>
  </Card>
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* Payment Method Breakdown */}
  <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
    <h2 className="text-base font-bold text-gray-900 mb-3">Payment Method Breakdown</h2>
    <div className="space-y-2">
      {Object.entries(metrics.paymentBreakdown).map(([method, amount]) => {
        const percentage =
          metrics.totalRevenue > 0 ? ((amount / metrics.totalRevenue) * 100).toFixed(1) : 0;
        return (
          <div key={method} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                {formatPaymentMethod(method)}
              </span>
              <span className="text-xs font-bold text-gray-900">GHS {amount.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-500">{percentage}% of total revenue</p>
          </div>
        );
      })}
    </div>
  </Card>

  {/* Top Products */}
  <Card className="p-4 backdrop-blur-sm bg-white/80 border border-gray-200">
    <h2 className="text-base font-bold text-gray-900 mb-3">Top Selling Products</h2>
    <div className="space-y-2">
      {metrics.topProducts.map(([name, data], index) => (
        <div
          key={name}
          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200"
        >
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-bold text-xs shadow-sm">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
            <p className="text-xs text-gray-500">{data.quantity} units sold</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900 text-sm">GHS {data.revenue.toFixed(2)}</p>
          </div>
        </div>
      ))}
      {metrics.topProducts.length === 0 && (
        <div className="text-center py-6">
          <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No sales data available</p>
        </div>
      )}
    </div>
  </Card>
</div>

      {/* Recent Transactions */}
      <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-sm text-gray-500">
                Showing last {recentTransactions.length} transactions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Zap className="h-4 w-4" />
                <span>Real-time Data</span>
              </div>
              <Link
                to="/dashboard/sales"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
              >
                View All Sales
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Transaction #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cashier
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <BarChart3 className="h-12 w-12 text-gray-400" />
                      <p className="text-lg font-medium text-gray-900">No transactions found</p>
                      <p className="text-gray-500">No transactions match your current filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                      {transaction.transactionNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        {transaction.cashierName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {transaction.items.length} item(s)
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {formatPaymentMethod(transaction.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      GHS {transaction.total.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

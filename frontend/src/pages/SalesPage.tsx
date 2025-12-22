// src/pages/SalesPage.tsx (Updated with Receipt Modal)
import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Calendar, 
  Download, 
  Search,
  Eye,
  Receipt,
  User,
  CreditCard,
  ArrowUpRight,
  Zap,
  X,
  ChevronDown
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { Transaction } from '../types';
import { ReceiptModal } from '../components/ReceiptModal'; // Import the ReceiptModal

export const SalesPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);

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

  // Filter by search query
  const searchedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions;
    const query = searchQuery.toLowerCase();
    return filteredTransactions.filter(
      (t) =>
        t.transactionNumber.toLowerCase().includes(query) ||
        t.cashierName.toLowerCase().includes(query) ||
        t.paymentMethod.toLowerCase().includes(query) ||
        (t.customerName && t.customerName.toLowerCase().includes(query)) ||
        (t.customerPhone && t.customerPhone.toLowerCase().includes(query))
    );
  }, [filteredTransactions, searchQuery]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = searchedTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = searchedTransactions.length;
    const totalItemsSold = searchedTransactions.reduce(
      (sum, t) => sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );

    // Payment method breakdown with revenue (excluding cash)
    const paymentBreakdown = searchedTransactions.reduce((acc, t) => {
      if (t.paymentMethod === 'cash') return acc;
      
      if (!acc[t.paymentMethod]) {
        acc[t.paymentMethod] = { count: 0, revenue: 0 };
      }
      acc[t.paymentMethod].count += 1;
      acc[t.paymentMethod].revenue += t.total;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    // Cash transactions summary
    const cashTransactions = searchedTransactions.filter(t => t.paymentMethod === 'cash');
    const cashRevenue = cashTransactions.reduce((sum, t) => sum + t.total, 0);
    const cashCount = cashTransactions.length;

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      paymentBreakdown,
      cashRevenue,
      cashCount,
    };
  }, [searchedTransactions]);

  // Export to CSV
  const exportToCSV = () => {
    const csvData = [
      ['Transaction Number', 'Date', 'Cashier', 'Customer', 'Payment Method', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total'],
      ...searchedTransactions.map((t) => [
        t.transactionNumber,
        new Date(t.createdAt).toLocaleString(),
        t.cashierName,
        t.customerName || 'N/A',
        t.paymentMethod,
        t.items.reduce((sum, item) => sum + item.quantity, 0),
        t.subtotal.toFixed(2),
        t.tax.toFixed(2),
        (t.discount || 0).toFixed(2),
        t.total.toFixed(2),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewTransactionReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return DollarSign;
      case 'mtn':
      case 'vodafone':
      case 'airteltigo':
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'from-green-500 to-emerald-600';
      case 'mtn':
        return 'from-yellow-500 to-orange-600';
      case 'vodafone':
        return 'from-red-500 to-pink-600';
      case 'airteltigo':
        return 'from-purple-500 to-indigo-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
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

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    if (range !== 'custom') {
      setShowCustomDate(false);
    } else {
      setShowCustomDate(true);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-3">Sales Management</h1>
            {/* Compact Metrics Row */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span>Total: <strong className="text-white">GHS {metrics.totalRevenue.toFixed(2)}</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <ShoppingCart className="h-4 w-4 text-blue-400" />
                <span>Transactions: <strong className="text-white">{metrics.totalTransactions}</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <Package className="h-4 w-4 text-orange-400" />
                <span>Items: <strong className="text-white">{metrics.totalItemsSold}</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span>Cash: <strong className="text-white">GHS {metrics.cashRevenue.toFixed(2)}</strong></span>
                <span className="text-white/60 text-xs">({metrics.cashCount})</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium">Live Sales</span>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search and Date Range - Single Compact Row */}
      <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Search - Smaller */}
          <div className="relative flex-1 max-w-xs min-w-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm text-sm"
            />
          </div>

          {/* Date Range - Inline Custom */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-semibold text-gray-700 text-sm whitespace-nowrap">Date Range:</span>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {['today', 'week', 'month', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    dateRange === range
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
              
              {/* Custom Date - Inline when active */}
              {dateRange === 'custom' ? (
                <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-200 rounded-lg px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                    <span className="text-gray-500 text-xs">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                  </div>
                  <button
                    onClick={() => handleDateRangeChange('all')}
                    className="p-1 hover:bg-blue-100 rounded transition-colors"
                    title="Close custom date"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDateRangeChange('custom')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    dateRange === 'custom'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  Custom
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Method Breakdown - Compact Grid */}
      {Object.keys(metrics.paymentBreakdown).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(metrics.paymentBreakdown).map(([method, data]) => {
            const Icon = getPaymentMethodIcon(method);
            const percentage = ((data.count / metrics.totalTransactions) * 100).toFixed(1);
            return (
              <Card key={method} className="p-3 backdrop-blur-sm bg-white/80 border-2 border-gray-100 hover:border-blue-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${getPaymentMethodColor(method)} text-white shadow-lg`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{data.count}</p>
                    <p className="text-xs text-gray-500">txns</p>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-xs mt-2 truncate">{formatPaymentMethod(method)}</h3>
                <p className="text-xs font-bold text-blue-600">GHS {data.revenue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{percentage}% of total</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transaction History - Optimized Table */}
      <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">Transaction History</h2>
              <p className="text-xs text-gray-500">
                {searchedTransactions.length} transactions
                {metrics.cashCount > 0 && ` • ${metrics.cashCount} cash`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              <span>Real-time Updates</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Transaction #
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Date & Time
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Cashier
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Items
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Payment
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Total
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {searchedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">No transactions found</p>
                      <p className="text-xs text-gray-500">No transactions match your current filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                searchedTransactions.map((transaction) => {
                  const PaymentIcon = getPaymentMethodIcon(transaction.paymentMethod);
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-3 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                        {transaction.transactionNumber}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[80px]">{transaction.cashierName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        <div className="max-w-[100px]">
                          <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                            {transaction.customerName || (
                              <span className="text-gray-400">Walk-in</span>
                            )}
                          </div>
                          {transaction.customerPhone && (
                            <div className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
                              {transaction.customerPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-gray-400" />
                          <span className="font-semibold">
                            {transaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getPaymentMethodColor(transaction.paymentMethod)} text-white shadow-lg`}>
                            <PaymentIcon className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 capitalize truncate max-w-[60px]">
                            {formatPaymentMethod(transaction.paymentMethod)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-gray-900 text-right whitespace-nowrap">
                        GHS {transaction.total.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={() => viewTransactionReceipt(transaction)}
                          className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-lg group/btn"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          customerName={selectedTransaction.customerName || undefined}
          customerPhone={selectedTransaction.customerPhone || undefined}
          onClose={() => setShowReceiptModal(false)}
          onPrint={handlePrintReceipt}
        />
      )}
    </div>
  );
};

// src/pages/SalesPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useReactToPrint } from 'react-to-print';
import { Card } from '../components/ui/Card';
import { Transaction } from '../types';
import { ReceiptModal, ReceiptContent } from '../components/ReceiptModal';

export const SalesPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);

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

  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const { currentUser, transactions, products } = useAppStore();

  // ─── Print Ref ───────────────────────────────────────────────────────────
  const printRef = useRef<HTMLDivElement>(null);

  // ─── Print Handler using react-to-print ─────────────────────────────────
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Receipt-${selectedTransaction?.transactionNumber || 'Unknown'}`,
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
    onBeforeGetContent: () => {
      // Close the modal before printing
      setShowReceiptModal(false);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log('Print completed');
    }
  });

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

    const paymentBreakdown = searchedTransactions.reduce((acc, t) => {
      if (t.paymentMethod === 'cash') return acc;

      if (!acc[t.paymentMethod]) {
        acc[t.paymentMethod] = { count: 0, revenue: 0 };
      }
      acc[t.paymentMethod].count += 1;
      acc[t.paymentMethod].revenue += t.total;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

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
      [
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        metrics.totalRevenue.toFixed(2)
      ]
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
        return 'var(--color-success)';
      case 'mtn':
        return 'var(--color-warning)';
      case 'vodafone':
        return 'var(--color-danger)';
      case 'airteltigo':
        return 'var(--color-accent)';
      default:
        return 'var(--color-text-muted)';
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
      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Sales Management</h1>
            <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Track and manage all sales transactions</p>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--color-success-text)' }} />
                <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
                  Total: <strong style={{ color: 'var(--color-text-primary)' }}>GHS {metrics.totalRevenue.toFixed(2)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-text)' }} />
                <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
                  Transactions: <strong style={{ color: 'var(--color-text-primary)' }}>{metrics.totalTransactions}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5" style={{ color: 'var(--color-warning-text)' }} />
                <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
                  Items: <strong style={{ color: 'var(--color-text-primary)' }}>{metrics.totalItemsSold}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--color-success-text)' }} />
                <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
                  Cash: <strong style={{ color: 'var(--color-text-primary)' }}>GHS {metrics.cashRevenue.toFixed(2)}</strong>
                </span>
                <span className="text-[0.65rem]" style={{ color: 'var(--color-text-muted)' }}>({metrics.cashCount})</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
              <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-warning)' }} />
              <span className="text-[0.72rem] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Live Sales</span>
            </div>
            <button
              onClick={exportToCSV}
              className="btn-success flex items-center justify-center gap-2 px-4 py-1.5 text-[0.75rem]"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search and Date Range */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-xs min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="input-base w-full pl-10 pr-4 text-sm"
              style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
            />
          </div>

          <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-muted" />
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-secondary)' }}>Range:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {['today', 'week', 'month', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={`px-2.5 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap ${
                    dateRange === range ? 'btn-accent' : 'btn-ghost'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}

              {dateRange === 'custom' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-accent-light)', border: '1px solid var(--color-accent)' }}>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 border rounded text-xs focus:ring-2 outline-none"
                      style={{
                        borderColor: 'var(--color-input-border)',
                        background: 'var(--color-input-bg)',
                        color: 'var(--color-input-text)',
                      }}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                    />
                    <span className="text-xs text-muted">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 border rounded text-xs focus:ring-2 outline-none"
                      style={{
                        borderColor: 'var(--color-input-border)',
                        background: 'var(--color-input-bg)',
                        color: 'var(--color-input-text)',
                      }}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                    />
                  </div>
                  <button
                    onClick={() => handleDateRangeChange('all')}
                    className="p-1 rounded transition-colors hover:bg-subtle"
                    title="Close custom date"
                  >
                    <X className="h-3 w-3 text-muted" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDateRangeChange('custom')}
                  className="px-2.5 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap btn-ghost"
                >
                  Custom
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Method Breakdown */}
      {Object.keys(metrics.paymentBreakdown).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(metrics.paymentBreakdown).map(([method, data]) => {
            const Icon = getPaymentMethodIcon(method);
            const percentage = ((data.count / metrics.totalTransactions) * 100).toFixed(1);
            const color = getPaymentMethodColor(method);
            return (
              <Card key={method} className="p-3 border-theme hover:border-accent transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg" style={{ background: color, color: 'var(--color-accent-fg)' }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary tabular-nums">{data.count}</p>
                    <p className="text-xs text-secondary">txns</p>
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-primary mt-2 truncate">{formatPaymentMethod(method)}</h3>
                <p className="text-sm font-bold" style={{ color: 'var(--color-accent-text)' }}>GHS {data.revenue.toFixed(2)}</p>
                <p className="text-xs text-secondary">{percentage}% of total</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <div className="px-4 py-3 border-b border-theme">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-primary">Transaction History</h2>
              <p className="text-sm text-secondary">
                {searchedTransactions.length} transactions
                {metrics.cashCount > 0 && ` • ${metrics.cashCount} cash`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-secondary">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Real-time Updates</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-subtle border-b border-theme">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Transaction #
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Date & Time
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Cashier
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Items
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Payment
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Total
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {searchedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Receipt className="h-8 w-8 text-muted mx-auto mb-2" />
                    <p className="text-sm font-medium text-primary">No transactions found</p>
                    <p className="text-xs text-secondary">No transactions match your current filters</p>
                  </td>
                </tr>
              ) : (
                <>
                  {searchedTransactions.map((transaction) => {
                    const PaymentIcon = getPaymentMethodIcon(transaction.paymentMethod);
                    const color = getPaymentMethodColor(transaction.paymentMethod);
                    return (
                      <tr key={transaction.id} className="hover:bg-subtle transition-colors group">
                        <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap group-hover:text-accent transition-colors">
                          {transaction.transactionNumber}
                        </td>
                        <td className="px-3 py-3 text-sm text-secondary whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                            <span className="text-xs text-secondary">
                              {new Date(transaction.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-secondary whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted" />
                            <span className="truncate max-w-[80px]">{transaction.cashierName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-secondary">
                          <div className="max-w-[100px]">
                            <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium text-primary">
                              {transaction.customerName || (
                                <span className="text-secondary">Walk-in</span>
                              )}
                            </div>
                            {transaction.customerPhone && (
                              <div className="text-xs text-secondary whitespace-nowrap overflow-hidden text-ellipsis">
                                {transaction.customerPhone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-secondary whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-muted" />
                            <span className="font-semibold text-primary tabular-nums">
                              {transaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <div className="p-1.5 rounded-lg" style={{ background: color, color: 'var(--color-accent-fg)' }}>
                              <PaymentIcon className="h-3 w-3" />
                            </div>
                            <span className="text-sm font-semibold text-secondary capitalize truncate max-w-[60px]">
                              {formatPaymentMethod(transaction.paymentMethod)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-primary text-right whitespace-nowrap tabular-nums">
                          GHS {transaction.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => viewTransactionReceipt(transaction)}
                            className="btn-accent flex items-center gap-1 px-3 py-1.5 text-sm"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL ROW */}
                  {searchedTransactions.length > 0 && (
                    <tr 
                      className="border-t-2 border-theme-strong"
                      style={{ background: 'var(--color-bg-subtle)' }}
                    >
                      <td colSpan={6} className="px-3 py-3 text-right">
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          TOTAL SALES
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base font-bold" style={{ color: 'var(--color-accent-text)' }}>
                          GHS {metrics.totalRevenue.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-3"></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── RECEIPT MODAL ─────────────────────────────────────────────────── */}
      {showReceiptModal && selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          customerName={selectedTransaction.customerName || undefined}
          customerPhone={selectedTransaction.customerPhone || undefined}
          onClose={() => setShowReceiptModal(false)}
          onPrint={handlePrint}
        />
      )}

      {/* ─── PRINT CONTENT (Hidden with CSS, but rendered) ────────────────── */}
      <style>{`
        .print-content-hidden {
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }
        @media print {
          .print-content-hidden {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
        }
      `}</style>

// ─── HIDDEN PRINT CONTENT ──────────────────────────────────────────────────
{/* Use ReceiptContent here, not ReceiptModal - no modal wrapper! */}
<div style={{ display: 'none' }}>
  <div ref={printRef}>
    {selectedTransaction && (
      <ReceiptContent
        transaction={selectedTransaction}
        customerName={selectedTransaction.customerName || undefined}
        customerPhone={selectedTransaction.customerPhone || undefined}
      />
    )}
  </div>
</div>
    </div>
  );
};
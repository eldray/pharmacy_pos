// src/pages/SalesPage.tsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Calendar,
  Download,
  Search,
  Eye,
  Receipt,
  User,
  Zap,
  X,
  Filter,
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { Transaction } from '../types';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { formatPaymentMethod, paymentMethodKey, paymentMethodMeta } from '../utils/document';
import { safeNumber } from '../utils/number';

export const SalesPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  const { transactions } = useAppStore();

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
          // 'YYYY-MM-DD' parses as midnight, so the end day needs to run to 23:59:59.
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          return transactions.filter((t) => {
            const txDate = new Date(t.createdAt);
            return txDate >= new Date(startDate) && txDate <= endOfDay;
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
        (t.transactionNumber || '').toLowerCase().includes(query) ||
        (t.cashierName || '').toLowerCase().includes(query) ||
        (t.paymentMethod || '').toLowerCase().includes(query) ||
        formatPaymentMethod(t.paymentMethod).toLowerCase().includes(query) ||
        formatPaymentMethod(t.paymentMethod, 'short').toLowerCase().includes(query) ||
        (t.customerName && t.customerName.toLowerCase().includes(query)) ||
        (t.customerPhone && t.customerPhone.toLowerCase().includes(query))
    );
  }, [filteredTransactions, searchQuery]);

  // Clicking a payment card narrows the table without changing the breakdown above it.
  const visibleTransactions = useMemo(() => {
    if (!methodFilter) return searchedTransactions;
    return searchedTransactions.filter((t) => paymentMethodKey(t.paymentMethod) === methodFilter);
  }, [searchedTransactions, methodFilter]);

  const pager = usePagination(visibleTransactions, {
    resetKey: `${dateRange}|${startDate}|${endDate}|${searchQuery}|${methodFilter}`,
  });

  const metrics = useMemo(() => {
    const totalRevenue = searchedTransactions.reduce((sum, t) => sum + safeNumber(t.total), 0);
    const totalTransactions = searchedTransactions.length;
    const totalItemsSold = searchedTransactions.reduce(
      (sum, t) => sum + (t.items || []).reduce((itemSum, item) => itemSum + safeNumber(item.quantity), 0),
      0
    );

    // Every method that appears in the range gets a card — cash included.
    const buckets: Record<string, { count: number; revenue: number; items: number }> = {};
    searchedTransactions.forEach((t) => {
      const key = paymentMethodKey(t.paymentMethod) || 'unknown';
      if (!buckets[key]) buckets[key] = { count: 0, revenue: 0, items: 0 };
      buckets[key].count += 1;
      buckets[key].revenue += safeNumber(t.total);
      buckets[key].items += (t.items || []).reduce((sum, item) => sum + safeNumber(item.quantity), 0);
    });

    const paymentBreakdown = Object.entries(buckets)
      .map(([key, data]) => ({ key, ...data, meta: paymentMethodMeta(key) }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);

    const visibleRevenue = visibleTransactions.reduce((sum, t) => sum + safeNumber(t.total), 0);

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      averageSale: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      paymentBreakdown,
      visibleRevenue,
    };
  }, [searchedTransactions, visibleTransactions]);

  // Export exactly what the table is showing, with spreadsheet-safe quoting.
  const exportToCSV = () => {
    const rows: (string | number)[][] = [
      ['Transaction Number', 'Date', 'Cashier', 'Customer', 'Phone', 'Payment Method', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total'],
      ...visibleTransactions.map((t) => [
        t.transactionNumber,
        new Date(t.createdAt).toLocaleString(),
        t.cashierName || '',
        t.customerName || 'Walk-in',
        t.customerPhone || '',
        formatPaymentMethod(t.paymentMethod),
        (t.items || []).reduce((sum, item) => sum + safeNumber(item.quantity), 0),
        safeNumber(t.subtotal).toFixed(2),
        safeNumber(t.tax).toFixed(2),
        safeNumber(t.discount).toFixed(2),
        safeNumber(t.total).toFixed(2),
      ]),
      ['TOTAL', '', '', '', '', methodFilter ? formatPaymentMethod(methodFilter) : (searchQuery.trim() ? 'Search results' : 'All methods'), '', '', '', '', metrics.visibleRevenue.toFixed(2)],
    ];

    const cell = (value: string | number) => {
      const text = String(value ?? '');
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csvContent = rows.map((row) => row.map(cell).join(',')).join('\r\n');
    const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setMethodFilter(null);
  };

  const rangeLabel =
    dateRange === 'custom' && startDate && endDate
      ? `${startDate} → ${endDate}`
      : { today: 'since midnight', week: 'last 7 days', month: 'last 30 days', all: 'all time', custom: 'set both dates' }[dateRange] || 'all time';

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Sales Management</h1>
          <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Every completed sale, broken down by how it was paid
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
            <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-warning)' }} />
            <span className="text-[0.72rem] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Live Sales</span>
          </div>
          <button
            onClick={exportToCSV}
            disabled={visibleTransactions.length === 0}
            className="btn-success flex items-center justify-center gap-2 px-4 py-1.5 text-[0.75rem] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total revenue', value: `GHS ${metrics.totalRevenue.toFixed(2)}`, icon: TrendingUp, token: '--color-success', tint: '--color-success-light', note: rangeLabel },
          { label: 'Transactions', value: String(metrics.totalTransactions), icon: ShoppingCart, token: '--color-accent', tint: '--color-accent-light', note: `${metrics.paymentBreakdown.length} payment ${metrics.paymentBreakdown.length === 1 ? 'method' : 'methods'}` },
          { label: 'Items sold', value: String(metrics.totalItemsSold), icon: Package, token: '--color-warning', tint: '--color-warning-light', note: 'units across all sales' },
          { label: 'Average sale', value: `GHS ${metrics.averageSale.toFixed(2)}`, icon: Receipt, token: '--color-info', tint: '--color-info-light', note: 'per transaction' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</p>
                <p className="text-lg font-bold mt-1 tabular-nums truncate" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</p>
                <p className="text-[0.65rem] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{kpi.note}</p>
              </div>
              <div className="p-2 rounded-lg shrink-0" style={{ background: `var(${kpi.tint})` }}>
                <kpi.icon className="h-4 w-4" style={{ color: `var(${kpi.token})` }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search and Date Range */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 sm:max-w-sm min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search number, cashier, customer or payment..."
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
                  className={`px-2.5 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap ${dateRange === range ? 'btn-accent' : 'btn-ghost'
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

      {/* Payment Method Breakdown — every method in the range, cash included */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-[0.8rem] font-bold" style={{ color: 'var(--color-text-primary)' }}>Payment methods</h2>
            <span className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
              {metrics.paymentBreakdown.length === 0
                ? 'none in this range'
                : `${metrics.paymentBreakdown.length} used · tap a card to filter the table`}
            </span>
          </div>
          {methodFilter && (
            <button
              onClick={() => setMethodFilter(null)}
              className="btn-ghost flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.7rem] font-semibold"
            >
              <X className="h-3 w-3" />
              Clear filter
            </button>
          )}
        </div>

        {metrics.paymentBreakdown.length === 0 ? (
          <Card className="p-6 text-center">
            <Receipt className="h-7 w-7 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>No payments in this range</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Widen the date range or clear the search to see how sales were paid.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {metrics.paymentBreakdown.map(({ key, count, revenue, items, meta }) => {
              const share = metrics.totalRevenue > 0 ? (revenue / metrics.totalRevenue) * 100 : 0;
              const active = methodFilter === key;
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethodFilter(active ? null : key)}
                  aria-pressed={active}
                  className="text-left rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: `1px solid ${active ? `var(${meta.color})` : 'var(--color-border)'}`,
                    boxShadow: active ? `0 0 0 2px var(${meta.tint}), var(--shadow-card)` : 'var(--shadow-card)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg shrink-0" style={{ background: `var(${meta.tint})` }}>
                        <Icon className="h-4 w-4" style={{ color: `var(${meta.color})` }} />
                      </div>
                      <span className="text-[0.78rem] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {meta.full}
                      </span>
                    </div>
                    {active && (
                      <span className="text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: `var(${meta.tint})`, color: `var(${meta.color})` }}>
                        Filtering
                      </span>
                    )}
                  </div>

                  <p className="text-lg font-bold mt-2.5 tabular-nums" style={{ color: `var(${meta.color})` }}>
                    GHS {revenue.toFixed(2)}
                  </p>

                  <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--color-bg-subtle)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(share, revenue > 0 ? 2 : 0)}%`, background: `var(${meta.color})` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 text-[0.68rem]" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="tabular-nums">{count} {count === 1 ? 'sale' : 'sales'} · {items} {items === 1 ? 'item' : 'items'}</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{share.toFixed(1)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <div className="px-4 py-3 border-b border-theme">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-primary">Transaction History</h2>
              <p className="text-sm text-secondary">
                {visibleTransactions.length} {visibleTransactions.length === 1 ? 'transaction' : 'transactions'}
                {methodFilter && ` · ${formatPaymentMethod(methodFilter)} only`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-secondary shrink-0">
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
              {visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Receipt className="h-8 w-8 text-muted mx-auto mb-2" />
                    <p className="text-sm font-medium text-primary">No transactions found</p>
                    <p className="text-xs text-secondary">No transactions match your current filters</p>
                    {methodFilter && (
                      <button
                        onClick={() => setMethodFilter(null)}
                        className="btn-ghost mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        Show all payment methods
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <>
                  {pager.pageItems.map((transaction) => {
                    const meta = paymentMethodMeta(transaction.paymentMethod);
                    const PaymentIcon = meta.icon;
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
                              {(transaction.items || []).reduce((sum, item) => sum + safeNumber(item.quantity), 0)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div
                            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg max-w-[150px]"
                            style={{ background: `var(${meta.tint})` }}
                            title={meta.full}
                          >
                            <PaymentIcon className="h-3.5 w-3.5 shrink-0" style={{ color: `var(${meta.color})` }} />
                            <span className="text-[0.72rem] font-bold truncate" style={{ color: `var(${meta.color})` }}>
                              {meta.short}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-primary text-right whitespace-nowrap tabular-nums">
                          GHS {safeNumber(transaction.total).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => viewTransaction(transaction)}
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
                  {visibleTransactions.length > 0 && (
                    <tr
                      className="border-t-2 border-theme-strong"
                      style={{ background: 'var(--color-bg-subtle)' }}
                    >
                      <td colSpan={6} className="px-3 py-3 text-right">
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {methodFilter ? `${formatPaymentMethod(methodFilter).toUpperCase()} TOTAL` : 'TOTAL SALES'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base font-bold" style={{ color: 'var(--color-accent-text)' }}>
                          GHS {metrics.visibleRevenue.toFixed(2)}
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
        <Pagination pager={pager} label="transactions" />
      </Card>

      {/* ─── TRANSACTION DETAILS ───────────────────────────────────────────── */}
      {showDetailsModal && selectedTransaction && (
        <DocumentDetailsModal
          doc={selectedTransaction}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
};
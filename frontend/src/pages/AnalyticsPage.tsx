// src/pages/AnalyticsPage.tsx
import React, { useMemo, useState } from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, Package, Calendar, Download,
  BarChart3, Users, AlertTriangle, Clock, CheckCircle, PackageSearch, Filter,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'expiry'>('sales');
  const [expiryThreshold, setExpiryThreshold] = useState(30);

  const { transactions, products } = useAppStore();

  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // --- Define field focus/blur handlers ---
  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

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
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  };

  /* ── Date filtering ────────────────────────────────────────────────── */
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let filterDate = new Date();
    switch (dateRange) {
      case 'today': filterDate.setHours(0, 0, 0, 0); break;
      case 'week': filterDate.setDate(now.getDate() - 7); break;
      case 'month': filterDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': filterDate.setMonth(now.getMonth() - 3); break;
      case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
      case 'custom':
        if (startDate && endDate) {
          return transactions.filter((t) => {
            const d = new Date(t.createdAt);
            return d >= new Date(startDate) && d <= new Date(endDate);
          });
        }
        return transactions;
      default: return transactions;
    }
    return transactions.filter((t) => new Date(t.createdAt) >= filterDate);
  }, [dateRange, startDate, endDate, transactions]);

  /* ── Expiry data ──────────────────────────────────────────────────── */
  const expiryData = useMemo(() => {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + expiryThreshold);

    const expiringProducts = products.filter((p) => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      return expiry <= thresholdDate && expiry >= today;
    });
    const expiredProducts = products.filter((p) => {
      if (!p.expiryDate) return false;
      return new Date(p.expiryDate) < today;
    });

    const expiryByMonth = products.reduce((acc, p) => {
      if (!p.expiryDate) return acc;
      const month = new Date(p.expiryDate).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[month]) acc[month] = [];
      acc[month].push(p);
      return acc;
    }, {} as Record<string, typeof products[]>);

    return { expired: expiredProducts, expiringSoon: expiringProducts, totalExpiring: expiringProducts.length, totalExpired: expiredProducts.length, expiryByMonth, threshold: expiryThreshold };
  }, [products, expiryThreshold]);

  /* ── Sales metrics ───────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + safeNumber(t.total), 0);
    const totalTransactions = filteredTransactions.length;
    const totalItemsSold = filteredTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + safeNumber(i.quantity), 0), 0);

    const paymentBreakdown = filteredTransactions.reduce((acc, t) => {
      const m = t.paymentMethod || 'unknown';
      acc[m] = (acc[m] || 0) + safeNumber(t.total);
      return acc;
    }, {} as Record<string, number>);

    const productSales = filteredTransactions.reduce((acc, t) => {
      t.items.forEach((item) => {
        const name = item.product?.name || item.productName || 'Unknown';
        if (!acc[name]) acc[name] = { quantity: 0, revenue: 0 };
        acc[name].quantity += safeNumber(item.quantity);
        acc[name].revenue += safeNumber(item.total);
      });
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const topProducts = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8);
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const inventoryValue = products.reduce((sum, p) => sum + safeNumber(p.quantity) * safeNumber(p.unitPrice), 0);

    const dailySales = filteredTransactions.reduce((acc, t) => {
      const date = new Date(t.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + safeNumber(t.total);
      return acc;
    }, {} as Record<string, number>);

    const dailySalesArray = Object.entries(dailySales).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-7);
    const maxDaily = Math.max(...dailySalesArray.map(([, a]) => a), 1);

    return { totalRevenue, totalTransactions, totalItemsSold, avgTransactionValue, inventoryValue, paymentBreakdown, topProducts, dailySales: dailySalesArray, maxDaily };
  }, [filteredTransactions, products]);

  const formatPaymentMethod = (m: string) => {
    if (!m) return 'Unknown';
    switch (m.toLowerCase()) {
      case 'mtn': return 'MTN MoMo';
      case 'vodafone': return 'Vodafone Cash';
      case 'airteltigo': return 'AirtelTigo';
      default: return m.charAt(0).toUpperCase() + m.slice(1);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Transaction', 'Date', 'Cashier', 'Method', 'Subtotal', 'Tax', 'Total'],
      ...filteredTransactions.map((t) => [t.transactionNumber || '', new Date(t.createdAt).toLocaleDateString(), t.cashierName || '', formatPaymentMethod(t.paymentMethod || ''), safeNumber(t.subtotal).toFixed(2), safeNumber(t.tax).toFixed(2), safeNumber(t.total).toFixed(2)]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${dateRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportExpiryCSV = () => {
    const rows = [
      ['Product', 'SKU', 'Batch', 'Qty', 'Expiry', 'Days Left', 'Status'],
      ...[...expiryData.expired, ...expiryData.expiringSoon].map((p) => {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / 86400000);
        return [p.name, p.sku, p.batchNumber || '', p.quantity, new Date(p.expiryDate).toLocaleDateString(), days < 0 ? 'EXPIRED' : days, days <= 7 ? 'Critical' : days <= 30 ? 'Warning' : 'OK'];
      }),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expiry-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── Shared styles ──────────────────────────────────────────────────── */
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-card)',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '12px',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg-subtle)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '13px',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  // Define Num component for tabular numbers
  const Num: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
  }) => (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  );

  /* ── Metric card ─────────────────────────────────────────────────── */
  const MetricCard: React.FC<{
    label: string;
    value: string;
    sub: string;
    icon: React.ReactNode;
    iconBg?: string;
    iconColor?: string;
  }> = ({ label, value, sub, icon, iconBg, iconColor }) => (
    <div className="card" style={{ padding: '16px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.02em'
        }}>
          {label}
        </span>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            background: iconBg || 'var(--color-accent-light)',
            color: iconColor || 'var(--color-accent-text)',
          }}
        >
          {icon}
        </div>
      </div>
      <Num className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</Num>
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</p>
    </div>
  );

  /* ── Mini stat box ─────────────────────────────────────────────── */
  const MiniStat: React.FC<{ label: string; value: number | string; color: string }> = ({ label, value, color }) => (
    <div
      className="card text-center"
      style={{
        padding: '12px',
        borderColor: color === 'green' ? 'var(--color-success)' :
          color === 'yellow' ? 'var(--color-warning)' :
            color === 'red' ? 'var(--color-danger)' :
              'var(--color-accent)',
        borderWidth: '1px',
        borderStyle: 'solid',
        background: color === 'green' ? 'var(--color-success-light)' :
          color === 'yellow' ? 'var(--color-warning-light)' :
            color === 'red' ? 'var(--color-danger-light)' :
              'var(--color-accent-light)',
      }}
    >
      <Num className="text-2xl font-bold" style={{
        color: color === 'green' ? 'var(--color-success-text)' :
          color === 'yellow' ? 'var(--color-warning-text)' :
            color === 'red' ? 'var(--color-danger-text)' :
              'var(--color-accent-text)'
      }}>{value}</Num>
      <p style={{
        fontSize: '11px',
        color: color === 'green' ? 'var(--color-success-text)' :
          color === 'yellow' ? 'var(--color-warning-text)' :
            color === 'red' ? 'var(--color-danger-text)' :
              'var(--color-accent-text)',
        marginTop: '2px'
      }}>
        {label}
      </p>
    </div>
  );

  /* ── Progress bar ──────────────────────────────────────────────────── */
  const Bar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color }) => (
    <div style={{
      width: '100%',
      height: 6,
      background: 'var(--color-bg-subtle)',
      borderRadius: '9999px',
      overflow: 'hidden',
      marginTop: '4px'
    }}>
      <div style={{
        height: '100%',
        width: `${Math.max((value / max) * 100, 0.5)}%`,
        background: color || 'var(--color-accent)',
        borderRadius: '9999px',
        transition: 'width 0.4s ease'
      }} />
    </div>
  );

  /* ── Status badge ──────────────────────────────────────────────────── */
  const StatusBadge: React.FC<{ days: number }> = ({ days }) => {
    const style: React.CSSProperties =
      days < 0
        ? { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' }
        : days <= 7
          ? { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' }
          : days <= 30
            ? { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }
            : { background: 'var(--color-success-light)', color: 'var(--color-success-text)' };
    const label = days < 0 ? 'EXPIRED' : `${days}d`;
    return (
      <span style={{
        fontSize: '11px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontWeight: 600,
        ...style
      }}>
        {label}
      </span>
    );
  };

  /* ── Date range button ─────────────────────────────────────────────── */
  const DateBtn: React.FC<{ range: string; active: boolean }> = ({ range, active }) => (
    <button
      onClick={() => setDateRange(range)}
      className="btn-ghost"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: '6px',
        background: active ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
        color: active ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
        border: active ? 'none' : '1px solid var(--color-border)',
        height: 'auto',
        transition: 'all 150ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--color-border)';
          el.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--color-bg-subtle)';
          el.style.color = 'var(--color-text-secondary)';
        }
      }}
    >
      {range.charAt(0).toUpperCase() + range.slice(1)}
    </button>
  );

  const dateRanges = ['today', 'week', 'month', 'quarter', 'year', 'custom'];

  // Tab configuration
  const tabs = [
    { id: 'sales' as const, label: 'Sales', icon: <DollarSign size={16} /> },
    { id: 'inventory' as const, label: 'Inventory', icon: <Package size={16} /> },
    { id: 'expiry' as const, label: 'Expiry', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Analytics & Reports
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Sales, inventory, and expiry reports
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '2px',
        marginBottom: '16px'
      }}>
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center"
            style={{
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              color: activeTab === id ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
              borderBottom: activeTab === id ? '2px solid var(--color-accent)' : '2px solid transparent',
              transition: 'all 150ms ease',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              marginBottom: '-1px',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            {icon}
            {label}
            {id === 'expiry' && expiryData.totalExpiring > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 8px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  background: 'var(--color-danger)',
                  color: '#fff',
                }}
              >
                {expiryData.totalExpiring}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SALES TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Date range + export */}
          <div className="card" style={{ padding: '12px 16px' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: '12px' }}>
              <div className="flex flex-wrap items-center" style={{ gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Period:</span>
                <div className="flex flex-wrap" style={{ gap: '4px' }}>
                  {dateRanges.map((r) => (
                    <DateBtn key={r} range={r} active={dateRange === r} />
                  ))}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: '8px' }}>
                {dateRange === 'custom' && (
                  <div className="flex items-center" style={{ gap: '8px' }}>
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
                <button
                  onClick={exportCSV}
                  className="btn-ghost flex items-center"
                  style={{
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    height: 'auto',
                  }}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '12px' }}>
            <MetricCard
              label="Revenue"
              value={`GHS ${safeNumber(metrics.totalRevenue).toFixed(2)}`}
              sub={`${metrics.totalTransactions} transactions`}
              icon={<DollarSign size={18} />}
              iconBg="var(--color-success-light)"
              iconColor="var(--color-success-text)"
            />
            <MetricCard
              label="Avg. Transaction"
              value={`GHS ${safeNumber(metrics.avgTransactionValue).toFixed(2)}`}
              sub="Per sale"
              icon={<TrendingUp size={18} />}
              iconBg="var(--color-accent-light)"
              iconColor="var(--color-accent-text)"
            />
            <MetricCard
              label="Items Sold"
              value={String(metrics.totalItemsSold)}
              sub={`${metrics.totalTransactions} transactions`}
              icon={<ShoppingCart size={18} />}
              iconBg="var(--color-accent2-light)"
              iconColor="var(--color-accent2-text)"
            />
            <MetricCard
              label="Inventory Value"
              value={`GHS ${safeNumber(metrics.inventoryValue).toFixed(2)}`}
              sub={`${products.length} products`}
              icon={<Package size={18} />}
              iconBg="var(--color-warning-light)"
              iconColor="var(--color-warning-text)"
            />
          </div>

          {/* Daily trend */}
          {metrics.dailySales.length > 0 && (
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={headerStyle}>Daily Sales Trend</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.dailySales.map(([date, amount]) => (
                  <div key={date}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{date}</span>
                      <Num style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        GHS {safeNumber(amount).toFixed(2)}
                      </Num>
                    </div>
                    <Bar value={amount} max={metrics.maxDaily} color="var(--color-accent)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment + Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '12px' }}>
            {/* Payment breakdown */}
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={headerStyle}>Payment Methods</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(metrics.paymentBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, amount]) => {
                    const pct = metrics.totalRevenue > 0 ? ((amount / metrics.totalRevenue) * 100) : 0;
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            {formatPaymentMethod(method)}
                          </span>
                          <Num style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            GHS {safeNumber(amount).toFixed(2)}
                          </Num>
                        </div>
                        <Bar value={amount} max={Math.max(...Object.values(metrics.paymentBreakdown))} color="var(--color-accent2)" />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Top products */}
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={headerStyle}>Top Products</h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: 280,
                overflowY: 'auto'
              }}>
                {metrics.topProducts.map(([name, data], i) => (
                  <div
                    key={name}
                    className="flex items-center"
                    style={{
                      gap: '12px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '6px',
                        background: 'var(--color-bg-subtle)',
                        color: 'var(--color-text-muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {name}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{data.quantity} sold</p>
                    </div>
                    <Num style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-text)', flexShrink: 0 }}>
                      GHS {safeNumber(data.revenue).toFixed(2)}
                    </Num>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ─────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: '12px' }}>
            <MiniStat label="Total Products" value={products.length} color="blue" />
            <MiniStat label="Well Stocked" value={products.filter((p) => safeNumber(p.quantity) > 50).length} color="green" />
            <MiniStat label="Low Stock" value={products.filter((p) => safeNumber(p.quantity) > 0 && safeNumber(p.quantity) <= 20).length} color="yellow" />
            <MiniStat label="Out of Stock" value={products.filter((p) => safeNumber(p.quantity) === 0).length} color="red" />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Product</th>
                    <th style={thStyle}>SKU</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 20).map((p) => {
                    const qty = safeNumber(p.quantity);
                    const price = safeNumber(p.unitPrice);
                    const status = qty === 0 ? 'Out' : qty <= 20 ? 'Low' : 'OK';
                    const statusStyle: React.CSSProperties =
                      qty === 0
                        ? { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' }
                        : qty <= 20
                          ? { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }
                          : { background: 'var(--color-success-light)', color: 'var(--color-success-text)' };
                    return (
                      <tr key={p.id}>
                        <td style={tdStyle}>{p.name}</td>
                        <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{p.sku}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{qty}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>GHS {price.toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>GHS {(qty * price).toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontWeight: 600,
                            ...statusStyle
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPIRY TAB ────────────────────────────────────────────────── */}
      {activeTab === 'expiry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: '12px' }}>
            <MiniStat label="Expired" value={expiryData.totalExpired} color="red" />
            <MiniStat label={`Expiring (${expiryThreshold}d)`} value={expiryData.totalExpiring} color="yellow" />
            <div className="card" style={{ padding: '12px' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                marginBottom: '8px'
              }}>
                Threshold
              </p>
              <div className="flex items-center" style={{ gap: '12px' }}>
                <input
                  type="range"
                  min={7}
                  max={90}
                  value={expiryThreshold}
                  onChange={(e) => setExpiryThreshold(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--color-accent)',
                    height: 4,
                    background: 'var(--color-bg-subtle)',
                    borderRadius: '9999px',
                  }}
                />
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 30,
                  textAlign: 'right'
                }}>
                  {expiryThreshold}d
                </span>
              </div>
            </div>
            <MiniStat
              label="At Risk Value"
              value={`GHS ${expiryData.expiringSoon.reduce((s, p) => s + safeNumber(p.quantity) * safeNumber(p.unitPrice), 0).toFixed(2)}`}
              color="red"
            />
          </div>

          {/* ── EXPIRY BY MONTH - ENHANCED GRID CARDS ────────────────── */}
          <div className="card" style={{ padding: '16px', overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <div className="flex items-center" style={{ gap: '12px' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '6px',
                    background: 'var(--color-danger-light)',
                    color: 'var(--color-danger-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}>
                    Expiry by Month
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    margin: '2px 0 0 0',
                  }}>
                    Products expiring in the next {expiryThreshold} days
                  </p>
                </div>
              </div>
              <button
                onClick={exportExpiryCSV}
                className="btn-ghost flex items-center"
                style={{
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  height: 'auto',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
                }}
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>

            {/* Expiry by Month Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(expiryData.expiryByMonth)
                .sort((a, b) => {
                  // Sort by date (most recent first)
                  const dateA = new Date(a[0]);
                  const dateB = new Date(b[0]);
                  return dateB.getTime() - dateA.getTime();
                })
                .map(([month, prods]) => {
                  const count = prods.length;
                  const maxCount = Math.max(...Object.values(expiryData.expiryByMonth).map((p) => p.length));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  // Determine urgency level
                  const urgencyLevel =
                    count >= 10 ? 'critical' :
                      count >= 5 ? 'warning' :
                        'normal';

                  const urgencyColors = {
                    critical: {
                      bg: 'var(--color-danger-light)',
                      border: 'var(--color-danger)',
                      text: 'var(--color-danger-text)',
                      bar: 'var(--color-danger)',
                      label: '🔴 Critical',
                    },
                    warning: {
                      bg: 'var(--color-warning-light)',
                      border: 'var(--color-warning)',
                      text: 'var(--color-warning-text)',
                      bar: 'var(--color-warning)',
                      label: '🟡 Warning',
                    },
                    normal: {
                      bg: 'var(--color-success-light)',
                      border: 'var(--color-success)',
                      text: 'var(--color-success-text)',
                      bar: 'var(--color-success)',
                      label: '🟢 Normal',
                    },
                  };

                  const colors = urgencyColors[urgencyLevel];

                  return (
                    <div
                      key={month}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        background: 'var(--color-bg-surface)',
                        border: `1px solid ${colors.border}`,
                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      {/* Month and count */}
                      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                        }}>
                          {month}
                        </span>
                        <span style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: colors.text,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {count}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        width: '100%',
                        height: 6,
                        background: 'var(--color-bg-subtle)',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        marginBottom: '8px',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(percentage, 2)}%`,
                          background: colors.bar,
                          borderRadius: '9999px',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>

                      {/* Products list preview */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {prods.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-secondary)',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.name}
                            </span>
                          ))}
                          {prods.length > 3 && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--color-bg-subtle)',
                              color: 'var(--color-text-muted)',
                            }}>
                              +{prods.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 10px',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          background: colors.bg,
                          color: colors.text,
                        }}>
                          {colors.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Empty state */}
            {Object.keys(expiryData.expiryByMonth).length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: 'var(--color-text-muted)',
                }}
              >
                <PackageSearch size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '14px' }}>No products with expiry dates found</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  Add expiry dates to your products to track them here
                </p>
              </div>
            )}
          </div>

          {/* ── EXPIRY PRODUCTS TABLE ────────────────────────────────── */}
          <div className="card" style={{ padding: '16px', overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <div className="flex items-center" style={{ gap: '12px' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '6px',
                    background: 'var(--color-danger-light)',
                    color: 'var(--color-danger-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={16} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}>
                    Expiring Products
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    margin: '2px 0 0 0',
                  }}>
                    {expiryData.expired.length + expiryData.expiringSoon.length} products expiring within {expiryThreshold} days
                  </p>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, minWidth: '140px' }}>Product</th>
                    <th style={{ ...thStyle, minWidth: '100px' }}>Batch</th>
                    <th style={{ ...thStyle, textAlign: 'center', minWidth: '60px' }}>Qty</th>
                    <th style={{ ...thStyle, minWidth: '110px' }}>Expiry</th>
                    <th style={{ ...thStyle, textAlign: 'center', minWidth: '80px' }}>Days Left</th>
                    <th style={{ ...thStyle, textAlign: 'center', minWidth: '100px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...expiryData.expired, ...expiryData.expiringSoon]
                    .sort((a, b) => {
                      // Sort by expiry date (soonest first)
                      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                    })
                    .slice(0, 25)
                    .map((p) => {
                      const days = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / 86400000);
                      const isExpired = days < 0;

                      // Get urgency color for row
                      const rowColor = isExpired
                        ? 'var(--color-danger-light)'
                        : days <= 7
                          ? 'var(--color-danger-light)'
                          : days <= 30
                            ? 'var(--color-warning-light)'
                            : 'transparent';

                      return (
                        <tr
                          key={p.id}
                          style={{
                            background: rowColor,
                            transition: 'background 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              rowColor === 'transparent'
                                ? 'var(--color-bg-subtle)'
                                : rowColor;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = rowColor;
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            {p.name}
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>
                            {p.batchNumber || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                            {p.quantity}
                          </td>
                          <td style={{
                            ...tdStyle,
                            color: isExpired ? 'var(--color-danger-text)' : 'var(--color-text-secondary)',
                            fontWeight: isExpired ? 600 : 400,
                          }}>
                            {new Date(p.expiryDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td style={{
                            ...tdStyle,
                            textAlign: 'center',
                            fontWeight: 600,
                            color: isExpired
                              ? 'var(--color-danger-text)'
                              : days <= 7
                                ? 'var(--color-danger-text)'
                                : days <= 30
                                  ? 'var(--color-warning-text)'
                                  : 'var(--color-success-text)',
                          }}>
                            <Num>{isExpired ? 'EXPIRED' : `${days}d`}</Num>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <StatusBadge days={days} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Empty state for table */}
            {expiryData.expired.length === 0 && expiryData.expiringSoon.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 0',
                  color: 'var(--color-text-muted)',
                }}
              >
                <CheckCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--color-success)' }} />
                <p style={{ fontSize: '14px' }}>No products expiring soon</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  All products are within safe expiry limits
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
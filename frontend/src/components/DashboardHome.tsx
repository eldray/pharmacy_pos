// src/components/DashboardHome.tsx
import React, { useMemo, useState } from 'react';
import {
  ShoppingCart, Package, DollarSign,
  Receipt, TrendingUp, AlertTriangle,
  Zap, ArrowUpRight, Users, Truck,
  FlaskConical, Clock, CheckCircle,
  XCircle, FileText, Box,
  TrendingDown, BarChart3, PieChart as PieChartIcon,
  PlusCircle, Eye, List, Calendar
} from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';

/* ─── Date Filter Button ───────────────────────────────────────────────────── */
const DateFilterBtn: React.FC<{ 
  label: string; 
  value: string; 
  active: boolean; 
  onClick: () => void 
}> = ({ label, value, active, onClick }) => (
  <button
    onClick={onClick}
    className="px-2.5 py-1 rounded-lg text-[0.65rem] font-semibold transition-all duration-200 whitespace-nowrap"
    style={{
      background: active ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
      color: active ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
      border: active ? 'none' : '1px solid var(--color-border)',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
      }
    }}
  >
    {label}
  </button>
);

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  subtitle,
  trend = 'neutral',
  trendValue
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <div
      className="card theme-transition"
      style={{
        padding: '16px 20px',
        background: 'var(--color-bg-surface)',
        borderRadius: '10px',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        cursor: 'default',
        border: '1px solid var(--color-border)',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: '12px' }}>
        <div className="flex-1 min-w-0">
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: '4px',
          }}>
            {label}
          </p>
          <p style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {value}
          </p>
          {(subtitle || trendValue) && (
            <div className="flex items-center" style={{ gap: '6px', marginTop: '4px' }}>
              {TrendIcon && (
                <TrendIcon style={{
                  width: '14px',
                  height: '14px',
                  color: trend === 'up' ? 'var(--color-success)' : 'var(--color-danger)'
                }} />
              )}
              {trendValue && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: trend === 'up' ? 'var(--color-success-text)' : 'var(--color-danger-text)'
                }}>
                  {trendValue}
                </span>
              )}
              {subtitle && !trendValue && (
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--color-bg-subtle)',
            color: 'var(--color-accent-text)'
          }}
        >
          <Icon style={{ width: '18px', height: '18px' }} />
        </div>
      </div>
    </div>
  );
};

/* ─── Quick Action Card ──────────────────────────────────────────────────────── */
interface QuickActionProps {
  to: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ to, label, icon: Icon, description }) => {
  return (
    <Link
      to={to}
      className="flex items-center group"
      style={{
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '8px',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        transition: 'all 150ms ease',
        textDecoration: 'none',
        minHeight: '56px',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'var(--color-accent-light)';
        el.style.borderColor = 'var(--color-accent)';
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'var(--color-bg-surface)';
        el.style.borderColor = 'var(--color-border)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          background: 'var(--color-accent)',
          color: 'white'
        }}
      >
        <Icon style={{ width: '18px', height: '18px' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.2, margin: 0, marginTop: '2px' }}>
            {description}
          </p>
        )}
      </div>
      <ArrowUpRight
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)', flexShrink: 0 }}
      />
    </Link>
  );
};

/* ─── Status Badge ──────────────────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { cls: string; icon: React.ReactNode }> = {
    pending: { cls: 'badge-warning', icon: <Clock style={{ width: 10, height: 10 }} /> },
    in_progress: { cls: 'badge-info', icon: <Clock style={{ width: 10, height: 10 }} /> },
    completed: { cls: 'badge-success', icon: <CheckCircle style={{ width: 10, height: 10 }} /> },
    received: { cls: 'badge-success', icon: <CheckCircle style={{ width: 10, height: 10 }} /> },
    cancelled: { cls: 'badge-danger', icon: <XCircle style={{ width: 10, height: 10 }} /> },
    paid: { cls: 'badge-success', icon: <CheckCircle style={{ width: 10, height: 10 }} /> },
    pending_payment: { cls: 'badge-warning', icon: <Clock style={{ width: 10, height: 10 }} /> },
  };
  const { cls, icon } = config[status] || { cls: 'badge-info', icon: null };
  return (
    <span
      className={`badge ${cls} inline-flex items-center`}
      style={{ gap: 3, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px' }}
    >
      {icon}
      {status.replace('_', ' ')}
    </span>
  );
};

/* ─── Section Header ─────────────────────────────────────────────────────────── */
const SectionHeader: React.FC<{ icon: React.ElementType; title: string; linkTo?: string; linkText?: string }> = ({
  icon: Icon,
  title,
  linkTo,
  linkText = 'View all'
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px 8px 20px',
    marginBottom: 0,
  }}>
    <div className="flex items-center" style={{ gap: '8px' }}>
      <Icon style={{ width: '16px', height: '16px', color: 'var(--color-accent-text)' }} />
      <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {title}
      </h3>
    </div>
    {linkTo && (
      <Link
        to={linkTo}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-accent-text)',
          textDecoration: 'none',
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-accent-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {linkText}
        <ArrowUpRight style={{ width: 10, height: 10 }} />
      </Link>
    )}
  </div>
);

/* ─── DashboardHome ──────────────────────────────────────────────────────────── */
export const DashboardHome: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const {
    currentUser,
    products,
    transactions,
    suppliers,
    purchaseOrders,
    labTransactions,
  } = useAppStore();

  const userFirstName = React.useMemo(() => {
    if (!currentUser?.name) return 'Guest';
    return currentUser.name.split(' ')[0];
  }, [currentUser]);

  // ─── Filter transactions by date ──────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return transactions.filter(t => {
          const txDate = new Date(t.createdAt);
          return txDate >= today;
        });
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return transactions.filter(t => {
          const txDate = new Date(t.createdAt);
          return txDate >= weekStart;
        });
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        return transactions.filter(t => {
          const txDate = new Date(t.createdAt);
          return txDate >= monthStart;
        });
      default:
        return transactions;
    }
  }, [transactions, dateFilter]);

  // ─── Filter lab transactions by date ──────────────────────────────────────
  const filteredLabTransactions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return labTransactions?.filter(t => {
          const txDate = new Date(t.createdAt);
          return txDate >= today;
        }) || [];
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return labTransactions?.filter(t => {
          const txDate = new Date(t.createdAt);
          return txDate >= weekStart;
        }) || [];
      case 'month':
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        return labTransactions?.filter(t => {
          const txDate = new Date(t.createdAt);
          return txDate >= monthStart;
        }) || [];
      default:
        return labTransactions || [];
    }
  }, [labTransactions, dateFilter]);

  // Calculate stats using filtered transactions
  const stats = React.useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactions.length;
    
    const today = new Date().toDateString();
    const todaySales = filteredTransactions
      .filter((t) => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.total, 0);

    const lowStockCount = products.filter((p) => p.quantity < 20).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;
    const totalPurchaseOrders = purchaseOrders.length;
    const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').length;
    const completedLabTests = filteredLabTransactions?.filter(t => t.status === 'completed').length || 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySales = filteredTransactions
      .filter((t) => new Date(t.createdAt).toDateString() === yesterday.toDateString())
      .reduce((sum, t) => sum + t.total, 0);

    const salesTrend = yesterdaySales > 0
      ? ((todaySales - yesterdaySales) / yesterdaySales * 100)
      : 0;

    return {
      todaySales,
      yesterdaySales,
      salesTrend,
      lowStockCount,
      outOfStockCount,
      totalPurchaseOrders,
      pendingPOs,
      completedLabTests,
      totalProducts: products.length,
      totalTransactions,
      totalRevenue,
    };
  }, [products, filteredTransactions, purchaseOrders, filteredLabTransactions]);

  // ── Chart Data ──────────────────────────────────────────────────────────────

  const dailySalesData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => {
      const dayTransactions = filteredTransactions.filter((t) => {
        const txDate = new Date(t.createdAt);
        return txDate.toLocaleString('en', { weekday: 'short' }) === day;
      });
      return {
        day,
        sales: dayTransactions.reduce((sum, t) => sum + t.total, 0),
        count: dayTransactions.length,
      };
    });
  }, [filteredTransactions]);

  const paymentDistribution = useMemo(() => {
    const methods: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      const method = t.paymentMethod || 'cash';
      methods[method] = (methods[method] || 0) + t.total;
    });
    return Object.entries(methods).map(([name, value]) => ({
      name: name === 'mtn' ? 'MTN MoMo' : name === 'vodafone' ? 'Vodafone' : name === 'airteltigo' ? 'AirtelTigo' : name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value),
    }));
  }, [filteredTransactions]);

  const CHART_COLORS = [
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
    'var(--color-accent)',
    'var(--color-role-lab)',
    'var(--color-text-muted)',
  ];

  const stockDistribution = useMemo(() => {
    const inStock = products.filter(p => p.quantity > 50).length;
    const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 20).length;
    const outOfStock = products.filter(p => p.quantity === 0).length;
    return [
      { name: 'In Stock', value: inStock, color: 'var(--color-success)' },
      { name: 'Low Stock', value: lowStock, color: 'var(--color-warning)' },
      { name: 'Out of Stock', value: outOfStock, color: 'var(--color-danger)' },
    ];
  }, [products]);

  const recentTransactions = filteredTransactions.slice(0, 5);
  const recentPurchaseOrders = purchaseOrders.slice(0, 3);
  const recentLabTests = filteredLabTransactions.slice(0, 3);

  const role = currentUser?.role;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          {label && (
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px 0' }}>{label}</p>
          )}
          {payload.map((p: any) => (
            <p key={p.name} style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '2px 0' }}>
              {p.name}: {typeof p.value === 'number' ? `GHS ${p.value.toFixed(2)}` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get quick actions based on role
  const getQuickActions = () => {
    const actions = [];

    if (role === 'admin' || role === 'cashier') {
      actions.push({
        to: '/dashboard/pos',
        label: 'New Sale',
        icon: ShoppingCart,
        description: 'Process transaction'
      });
    }

    if (role === 'admin' || role === 'officer') {
      actions.push({
        to: '/dashboard/products',
        label: 'Add Product',
        icon: PlusCircle,
        description: 'Update inventory'
      });
      actions.push({
        to: '/dashboard/inventory',
        label: 'View Stock',
        icon: Eye,
        description: 'Check levels'
      });
      actions.push({
        to: '/dashboard/purchase-orders',
        label: 'Purchase Order',
        icon: Truck,
        description: 'Order from supplier'
      });
    }

    if (role === 'admin' || role === 'lab') {
      actions.push({
        to: '/dashboard/lab',
        label: 'Lab Tests',
        icon: FlaskConical,
        description: 'Manage tests'
      });
    }

    if (role === 'admin') {
      actions.push({
        to: '/dashboard/users',
        label: 'Staff',
        icon: Users,
        description: 'Manage accounts'
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  return (
    <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Welcome header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 4px',
      }}>
        <div>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
            margin: 0,
            marginBottom: '4px',
          }}>
            {getGreeting()}, {userFirstName}
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}>
            Here's your pharmacy overview for today
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'var(--color-bg-subtle)',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            whiteSpace: 'nowrap',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── Date Filter ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 4px',
        flexWrap: 'wrap',
      }}>
        <Calendar style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)' }} />
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Show:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <DateFilterBtn 
            label="Today" 
            value="today" 
            active={dateFilter === 'today'} 
            onClick={() => setDateFilter('today')} 
          />
          <DateFilterBtn 
            label="Week" 
            value="week" 
            active={dateFilter === 'week'} 
            onClick={() => setDateFilter('week')} 
          />
          <DateFilterBtn 
            label="Month" 
            value="month" 
            active={dateFilter === 'month'} 
            onClick={() => setDateFilter('month')} 
          />
          <DateFilterBtn 
            label="All" 
            value="all" 
            active={dateFilter === 'all'} 
            onClick={() => setDateFilter('all')} 
          />
        </div>
        <span style={{
          fontSize: '10px',
          padding: '2px 10px',
          borderRadius: '9999px',
          background: 'var(--color-accent-light)',
          color: 'var(--color-accent-text)',
          fontWeight: 500,
        }}>
          {stats.totalTransactions} transactions
        </span>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        padding: 0,
      }}>
        <StatCard
          label="Today's Sales"
          value={`GHS ${stats.todaySales.toFixed(2)}`}
          icon={DollarSign}
          trend={stats.salesTrend > 0 ? 'up' : stats.salesTrend < 0 ? 'down' : 'neutral'}
          trendValue={stats.salesTrend !== 0 ? `${stats.salesTrend > 0 ? '+' : ''}${stats.salesTrend.toFixed(1)}%` : undefined}
        />
        <StatCard
          label="Total Revenue"
          value={`GHS ${stats.totalRevenue.toFixed(2)}`}
          icon={Receipt}
          subtitle={`${stats.totalTransactions} transactions`}
        />
        <StatCard
          label="Inventory"
          value={stats.totalProducts.toString()}
          icon={Package}
          subtitle={`${stats.lowStockCount} low, ${stats.outOfStockCount} out`}
          trend={stats.lowStockCount > 0 ? 'down' : 'up'}
          trendValue={stats.lowStockCount > 0 ? `${stats.lowStockCount} need attention` : 'All stocked'}
        />
        <StatCard
          label="Pending Orders"
          value={stats.pendingPOs.toString()}
          icon={FileText}
          subtitle={`${stats.totalPurchaseOrders} total`}
          trend={stats.pendingPOs > 0 ? 'neutral' : 'up'}
        />
      </div>

      {/* ── Charts Section ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '12px' }}>
        {/* Daily Sales Chart */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <SectionHeader icon={BarChart3} title={`Daily Sales (${getDateFilterLabel()})`} linkTo="/dashboard/analytics" />
          <div style={{ padding: '4px 20px 16px 20px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="var(--color-accent)"
                  fill="var(--color-accent-light)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <SectionHeader icon={PieChartIcon} title="Payment Methods" />
          <div style={{ padding: '4px 20px 16px 20px' }}>
            {paymentDistribution.length === 0 ? (
              <div className="text-center" style={{ padding: '16px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No payment data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: 'var(--color-text-secondary)', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions & Stock Distribution ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '12px' }}>
        {/* Quick Actions */}
        <div className="lg:col-span-2 card" style={{ padding: 0, overflow: 'hidden', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <SectionHeader icon={Zap} title="Quick Actions" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            padding: '4px 20px 20px 20px',
          }}>
            {quickActions.map((action) => (
              <QuickAction
                key={action.to}
                to={action.to}
                label={action.label}
                icon={action.icon}
                description={action.description}
              />
            ))}
          </div>
          {quickActions.length === 0 && (
            <div className="text-center" style={{ padding: '16px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No actions available</p>
            </div>
          )}
        </div>

        {/* Stock Distribution */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <SectionHeader icon={Package} title="Stock Distribution" />
          <div style={{ padding: '4px 20px 20px 20px' }}>
            {products.length === 0 ? (
              <div className="text-center" style={{ padding: '16px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No products data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stockDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-text-muted)" fontSize={10} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Products" radius={[0, 4, 4, 0]}>
                    {stockDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '12px' }}>
        {/* Recent Transactions */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <SectionHeader icon={Receipt} title={`Recent Transactions (${getDateFilterLabel()})`} linkTo="/dashboard/sales" />

          <div style={{
            padding: '4px 20px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            {recentTransactions.length === 0 ? (
              <div className="text-center" style={{ padding: '16px 0' }}>
                <div
                  className="flex items-center justify-center mx-auto"
                  style={{ width: 36, height: 36, borderRadius: '9999px', background: 'var(--color-bg-subtle)', marginBottom: '8px' }}
                >
                  <Receipt style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No transactions in this period</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id ?? tx._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-subtle)',
                    transition: 'background 150ms ease',
                    cursor: 'default',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    flex: 1,
                    minWidth: 0,
                  }}>
                    <p style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-secondary)',
                      letterSpacing: '-0.01em',
                      margin: 0,
                    }}>
                      {tx.transactionNumber}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        margin: 0,
                      }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0" style={{ marginLeft: '8px' }}>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      margin: 0,
                      marginBottom: '2px',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      GHS {tx.total.toFixed(2)}
                    </p>
                    <span
                      className="capitalize"
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: 'var(--color-bg-surface)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        display: 'inline-block',
                      }}
                    >
                      {tx.paymentMethod || 'Cash'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity - Lab Tests & Purchase Orders */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <SectionHeader icon={List} title={`Recent Activity (${getDateFilterLabel()})`} linkTo="/dashboard/analytics" />

          <div style={{
            padding: '4px 20px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            {/* Lab Tests Section */}
            {recentLabTests.length > 0 && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 6px',
                  marginBottom: '2px',
                }}>
                  <FlaskConical style={{ width: 12, height: 12, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Lab Tests
                  </span>
                </div>
                {recentLabTests.map((test) => (
                  <div
                    key={test.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-subtle)',
                      transition: 'background 150ms ease',
                      cursor: 'default',
                      gap: '12px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {test.patientName}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
                        {test.transactionNumber}
                      </p>
                    </div>
                    <div className="flex-shrink-0" style={{ marginLeft: '8px' }}>
                      <StatusBadge status={test.status} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Purchase Orders Section */}
            {recentPurchaseOrders.length > 0 && (
              <>
                {recentLabTests.length > 0 && (
                  <div style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 6px',
                  marginBottom: '2px',
                }}>
                  <Truck style={{ width: 12, height: 12, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Purchase Orders
                  </span>
                </div>
                {recentPurchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-subtle)',
                      transition: 'background 150ms ease',
                      cursor: 'default',
                      gap: '12px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {po.orderNumber}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
                        {po.supplierName || 'Supplier'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0" style={{ marginLeft: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent-text)', margin: 0, marginBottom: '2px', fontVariantNumeric: 'tabular-nums' }}>
                        GHS {po.totalAmount.toFixed(2)}
                      </p>
                      <StatusBadge status={po.status} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {recentLabTests.length === 0 && recentPurchaseOrders.length === 0 && (
              <div className="text-center" style={{ padding: '16px 0' }}>
                <div
                  className="flex items-center justify-center mx-auto"
                  style={{ width: 36, height: 36, borderRadius: '9999px', background: 'var(--color-bg-subtle)', marginBottom: '8px' }}
                >
                  <Box style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No recent activity in this period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
// src/components/DashboardHome.tsx
import React, { useMemo } from 'react';
import {
  ShoppingCart, Package, DollarSign,
  Receipt, TrendingUp, AlertTriangle,
  Zap, ArrowUpRight, Users, Truck,
  FlaskConical, Clock, CheckCircle,
  XCircle, FileText, Box,
  TrendingDown, BarChart3, PieChart as PieChartIcon,
  PlusCircle, Eye, List
} from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';

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
      className="card theme-transition stat-card"
      style={{
        padding: 'var(--space-4) var(--space-5)',
        background: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-lg)',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        cursor: 'default',
        border: '1px solid var(--color-border)',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 'var(--space-3)' }}>
        <div className="flex-1 min-w-0">
          <p style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 'var(--space-1)',
          }}>
            {label}
          </p>
          <p style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: 'var(--tracking-tight)'
          }}>
            {value}
          </p>
          {(subtitle || trendValue) && (
            <div className="flex items-center" style={{ gap: 'var(--space-1.5)', marginTop: 'var(--space-1)' }}>
              {TrendIcon && (
                <TrendIcon style={{
                  width: 'var(--icon-sm)',
                  height: 'var(--icon-sm)',
                  color: trend === 'up' ? 'var(--color-success)' : 'var(--color-danger)'
                }} />
              )}
              {trendValue && (
                <span style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  color: trend === 'up' ? 'var(--color-success-text)' : 'var(--color-danger-text)'
                }}>
                  {trendValue}
                </span>
              )}
              {subtitle && !trendValue && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
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
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-subtle)',
            color: 'var(--color-accent-text)'
          }}
        >
          <Icon style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
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
      className="flex items-center group quick-action-btn"
      style={{
        gap: 'var(--space-2.5)',
        padding: 'var(--space-3) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        transition: 'all var(--transition-fast)',
        textDecoration: 'none',
        minHeight: '64px',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
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
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-accent)',
          color: 'white'
        }}
      >
        <Icon style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.2, margin: 0, marginTop: 'var(--space-0.5)' }}>
            {description}
          </p>
        )}
      </div>
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
      style={{ gap: 3, fontSize: 'var(--text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
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
  <div className="section-header-with-link" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3) var(--space-5) var(--space-2)',
    marginBottom: 0,
  }}>
    <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
      <Icon style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)', color: 'var(--color-accent-text)' }} />
      <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>
        {title}
      </h3>
    </div>
    {linkTo && (
      <Link
        to={linkTo}
        className="view-all-link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: 'var(--color-accent-text)',
          textDecoration: 'none',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-sm)',
          transition: 'background var(--transition-fast)',
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

  // Calculate stats
  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = transactions
      .filter((t) => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.total, 0);

    const lowStockCount = products.filter((p) => p.quantity < 20).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;
    const totalPurchaseOrders = purchaseOrders.length;
    const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').length;
    const completedLabTests = labTransactions?.filter(t => t.status === 'completed').length || 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySales = transactions
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
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.total, 0),
    };
  }, [products, transactions, purchaseOrders, labTransactions]);

  // ── Chart Data ──────────────────────────────────────────────────────────────

  const dailySalesData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => {
      const dayTransactions = transactions.filter((t) => {
        const txDate = new Date(t.createdAt);
        return txDate.toLocaleString('en', { weekday: 'short' }) === day;
      });
      return {
        day,
        sales: dayTransactions.reduce((sum, t) => sum + t.total, 0),
        count: dayTransactions.length,
      };
    });
  }, [transactions]);

  const paymentDistribution = useMemo(() => {
    const methods: Record<string, number> = {};
    transactions.forEach((t) => {
      const method = t.paymentMethod || 'cash';
      methods[method] = (methods[method] || 0) + t.total;
    });
    return Object.entries(methods).map(([name, value]) => ({
      name: name === 'mtn' ? 'MTN MoMo' : name === 'vodafone' ? 'Vodafone' : name === 'airteltigo' ? 'AirtelTigo' : name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value),
    }));
  }, [transactions]);

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

  const recentTransactions = transactions.slice(0, 5);
  const recentPurchaseOrders = purchaseOrders.slice(0, 3);
  const recentLabTests = labTransactions?.slice(0, 3) || [];

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
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          {label && (
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-0.5) 0' }}>{label}</p>
          )}
          {payload.map((p: any) => (
            <p key={p.name} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 'var(--space-0.5) 0' }}>
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

  return (
    <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* ── Welcome header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-1)',
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-tight)',
            margin: 0,
            marginBottom: 'var(--space-1)',
          }}>
            {getGreeting()}, {userFirstName}
          </h1>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}>
            Here's your pharmacy overview for today
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-bg-subtle)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            whiteSpace: 'nowrap',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="metrics-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-4)',
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
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
        {/* Daily Sales Chart */}
        <div className="card lg:col-span-2" style={{ padding: 0, overflow: 'hidden' }}>
          <SectionHeader icon={BarChart3} title="Daily Sales (7 Days)" linkTo="/dashboard/analytics" />
          <div style={{ padding: 'var(--space-1) var(--space-5) var(--space-4)' }}>
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SectionHeader icon={PieChartIcon} title="Payment Methods" />
          <div style={{ padding: 'var(--space-1) var(--space-5) var(--space-4)' }}>
            {paymentDistribution.length === 0 ? (
              <div className="text-center" style={{ padding: 'var(--space-4) 0' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No payment data yet</p>
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
                  <Legend wrapperStyle={{ fontSize: '10px', color: 'var(--color-text-secondary)', paddingTop: 'var(--space-2)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions & Stock Distribution ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
        {/* Quick Actions - Now placed first and spans 2 columns */}
        <div className="lg:col-span-2 card" style={{ padding: 0, overflow: 'hidden' }}>
          <SectionHeader icon={Zap} title="Quick Actions" />
          <div className="quick-actions-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 'var(--space-2.5)',
            padding: 'var(--space-1) var(--space-5) var(--space-5)',
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
            <div className="text-center" style={{ padding: 'var(--space-4) 0' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No actions available</p>
            </div>
          )}
        </div>

        {/* Stock Distribution */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SectionHeader icon={Package} title="Stock Distribution" />
          <div style={{ padding: 'var(--space-1) var(--space-5) var(--space-4)' }}>
            {products.length === 0 ? (
              <div className="text-center" style={{ padding: 'var(--space-4) 0' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No products data yet</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
        {/* Recent Transactions */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SectionHeader icon={Receipt} title="Recent Transactions" linkTo="/dashboard/sales" />

          <div className="transactions-list" style={{
            padding: 'var(--space-1) var(--space-5) var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1.5)',
          }}>
            {recentTransactions.length === 0 ? (
              <div className="text-center" style={{ padding: 'var(--space-4) 0' }}>
                <div
                  className="flex items-center justify-center mx-auto"
                  style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-subtle)', marginBottom: 'var(--space-2)' }}
                >
                  <Receipt style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No transactions yet</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id ?? tx._id}
                  className="transaction-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2.5) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-subtle)',
                    transition: 'background var(--transition-fast)',
                    cursor: 'default',
                    gap: 'var(--space-3)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                >
                  <div className="txn-info" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-0.5)',
                    flex: 1,
                    minWidth: 0,
                  }}>
                    <p className="txn-id" style={{
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-secondary)',
                      letterSpacing: 'var(--tracking-tight)',
                      margin: 0,
                    }}>
                      {tx.transactionNumber}
                    </p>
                    <div className="txn-details" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      flexWrap: 'wrap',
                    }}>
                      <p style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                        margin: 0,
                      }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0" style={{ marginLeft: 'var(--space-2)' }}>
                    <p className="txn-amount" style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      margin: 0,
                      marginBottom: 'var(--space-0.5)',
                    }}>
                      GHS {tx.total.toFixed(2)}
                    </p>
                    <span
                      className="txn-meta capitalize"
                      style={{
                        fontSize: 'var(--text-xs)',
                        padding: '1px 8px',
                        borderRadius: 'var(--radius-full)',
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SectionHeader icon={List} title="Recent Activity" linkTo="/dashboard/analytics" />

          <div className="activity-list" style={{
            padding: 'var(--space-1) var(--space-5) var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1.5)',
          }}>
            {/* Lab Tests Section */}
            {recentLabTests.length > 0 && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1.5)',
                  padding: 'var(--space-1) var(--space-1.5)',
                  marginBottom: 'var(--space-0.5)',
                }}>
                  <FlaskConical style={{ width: 12, height: 12, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>
                    Lab Tests
                  </span>
                </div>
                {recentLabTests.map((test) => (
                  <div
                    key={test.id}
                    className="activity-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2.5) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-bg-subtle)',
                      transition: 'background var(--transition-fast)',
                      cursor: 'default',
                      gap: 'var(--space-3)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {test.patientName}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, marginTop: 'var(--space-0.5)' }}>
                        {test.transactionNumber}
                      </p>
                    </div>
                    <div className="flex-shrink-0" style={{ marginLeft: 'var(--space-2)' }}>
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
                  <div style={{ height: '1px', background: 'var(--color-border)', margin: 'var(--space-2) 0' }} />
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1.5)',
                  padding: 'var(--space-1) var(--space-1.5)',
                  marginBottom: 'var(--space-0.5)',
                }}>
                  <Truck style={{ width: 12, height: 12, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>
                    Purchase Orders
                  </span>
                </div>
                {recentPurchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="activity-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2.5) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-bg-subtle)',
                      transition: 'background var(--transition-fast)',
                      cursor: 'default',
                      gap: 'var(--space-3)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {po.orderNumber}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, marginTop: 'var(--space-0.5)' }}>
                        {po.supplierName || 'Supplier'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0" style={{ marginLeft: 'var(--space-2)' }}>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-accent-text)', margin: 0, marginBottom: 'var(--space-0.5)' }}>
                        GHS {po.totalAmount.toFixed(2)}
                      </p>
                      <StatusBadge status={po.status} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {recentLabTests.length === 0 && recentPurchaseOrders.length === 0 && (
              <div className="text-center" style={{ padding: 'var(--space-4) 0' }}>
                <div
                  className="flex items-center justify-center mx-auto"
                  style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-subtle)', marginBottom: 'var(--space-2)' }}
                >
                  <Box style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
// src/components/DashboardHome.tsx
import React from 'react';
import {
  ShoppingCart, Package, DollarSign,
  Receipt, TrendingUp, AlertTriangle,
  Zap, ArrowUpRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string;
  change: string;
  icon: React.ElementType;
  variant: 'success' | 'warning' | 'accent' | 'info';
}

const variantMap = {
  success: { icon: 'var(--color-success)', bg: 'var(--color-success-light)', text: 'var(--color-success-text)' },
  warning: { icon: 'var(--color-warning)', bg: 'var(--color-warning-light)', text: 'var(--color-warning-text)' },
  accent: { icon: 'var(--color-accent)', bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)' },
  info: { icon: 'var(--color-info)', bg: 'var(--color-info-light)', text: 'var(--color-info-text)' },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon: Icon, variant }) => {
  const v = variantMap[variant];
  return (
    <div
      className="card p-4 theme-transition cursor-default"
      style={{ transition: 'transform 150ms ease, box-shadow 150ms ease' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: v.text }}>
            {change}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: v.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: v.icon }} />
        </div>
      </div>
    </div>
  );
};

/* ─── Quick Action Link ──────────────────────────────────────────────────────── */
interface QuickActionProps {
  to: string;
  label: string;
  icon: React.ElementType;
  variant: 'accent' | 'success' | 'info';
}

const quickActionColors = {
  accent: { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)', border: 'var(--color-accent)' },
  success: { bg: 'var(--color-success-light)', text: 'var(--color-success-text)', border: 'var(--color-success)' },
  info: { bg: 'var(--color-info-light)', text: 'var(--color-info-text)', border: 'var(--color-info)' },
};

const QuickAction: React.FC<QuickActionProps> = ({ to, label, icon: Icon, variant }) => {
  const c = quickActionColors[variant];
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-150"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}20`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
    >
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <Icon className="h-4 w-4" />
        <ArrowUpRight className="h-3 w-3" />
      </span>
    </Link>
  );
};

/* ─── DashboardHome ──────────────────────────────────────────────────────────── */
export const DashboardHome: React.FC = () => {
  const { currentUser, products, transactions } = useAppStore();

  const userFirstName = React.useMemo(() => {
    if (!currentUser?.name) return 'Guest';
    return currentUser.name.split(' ')[0];
  }, [currentUser]);

  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = transactions
      .filter((t) => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.total, 0);

    const lowStockCount = products.filter((p) => p.quantity < 20).length;

    return [
      {
        label: "Today's Sales",
        value: `GHS ${todaySales.toFixed(2)}`,
        icon: DollarSign,
        variant: 'success' as const,
        change: '+12% vs yesterday',
      },
      {
        label: 'Low Stock Items',
        value: lowStockCount.toString(),
        icon: AlertTriangle,
        variant: 'warning' as const,
        change: lowStockCount > 0 ? 'Needs attention' : 'All stocked up',
      },
      {
        label: 'Total Products',
        value: products.length.toString(),
        icon: Package,
        variant: 'accent' as const,
        change: 'Active SKUs',
      },
      {
        label: 'Total Transactions',
        value: transactions.length.toString(),
        icon: ShoppingCart,
        variant: 'info' as const,
        change: 'All time',
      },
    ];
  }, [products, transactions]);

  const recentTransactions = transactions.slice(0, 5);
  const role = currentUser?.role;

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 shadow-lg"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>
              Welcome back, {userFirstName}! 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Here's what's happening with your pharmacy today.
            </p>
          </div>
          <div
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--color-text-inverse)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Zap className="h-4 w-4" style={{ color: '#FBBF24' }} />
            Live Dashboard
          </div>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Quick actions + Recent transactions ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Quick Actions */}
        <div className="card p-4 theme-transition">
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Quick Actions
          </h3>
          <div className="space-y-2">
            {(role === 'admin' || role === 'cashier') && (
              <QuickAction to="/dashboard/pos" label="Start New Sale" icon={ShoppingCart} variant="accent" />
            )}
            {(role === 'admin' || role === 'officer') && (
              <>
                <QuickAction to="/dashboard/products" label="Manage Products" icon={Package} variant="success" />
                <QuickAction to="/dashboard/inventory" label="View Inventory" icon={TrendingUp} variant="info" />
              </>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card p-4 theme-transition">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Recent Transactions
            </h3>
            <Link
              to="/dashboard/analytics"
              className="text-xs font-medium transition-opacity hover:opacity-75"
              style={{ color: 'var(--color-accent-text)' }}
            >
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--color-bg-subtle)' }}
                >
                  <Receipt className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No transactions yet
                </p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id ?? tx._id}
                  className="flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-default"
                  style={{ background: 'var(--color-bg-subtle)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {tx.transactionNumber}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      GHS {tx.total.toFixed(2)}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: 'var(--color-bg-surface)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
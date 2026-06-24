// src/pages/LabReports.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, TrendingUp, DollarSign, Calendar,
  Download, Users, Activity, PieChart, Clock,
  CheckCircle, XCircle, Award, BarChart3,
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card, CardHeader } from '../components/ui/Card';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ViewTab   = 'tests' | 'patients' | 'revenue';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const safeNum = (v: unknown): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

const fmtPayment = (m: string) => {
  switch ((m || '').toLowerCase()) {
    case 'mtn':        return 'MTN Mobile Money';
    case 'vodafone':   return 'Vodafone Cash';
    case 'airteltigo': return 'AirtelTigo Money';
    default:           return m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Unknown';
  }
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Metric card used in the KPI row */
const KpiCard: React.FC<{
  label:    string;
  value:    string | number;
  sub:      string;
  icon:     React.ElementType;
  variant:  'success' | 'accent' | 'info' | 'warning';
}> = ({ label, value, sub, icon: Icon, variant }) => {
  const v = {
    success: { bg: 'var(--color-success-light)', icon: 'var(--color-success)', text: 'var(--color-success-text)' },
    accent:  { bg: 'var(--color-accent-light)',  icon: 'var(--color-accent)',  text: 'var(--color-accent-text)'  },
    info:    { bg: 'var(--color-info-light)',     icon: 'var(--color-info)',    text: 'var(--color-info-text)'    },
    warning: { bg: 'var(--color-warning-light)',  icon: 'var(--color-warning)', text: 'var(--color-warning-text)' },
  }[variant];

  return (
    <Card className="p-4 theme-transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: v.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: v.icon }} />
        </div>
      </div>
    </Card>
  );
};

/** Horizontal bar row (used in ranked lists) */
const BarRow: React.FC<{
  rank?:    number;
  label:    string;
  value:    string;
  pct:      number;           // 0–100
  barColor: string;
  subLabel?: string;
}> = ({ rank, label, value, pct, barColor, subLabel }) => (
  <div>
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="flex items-center gap-2 min-w-0">
        {rank !== undefined && (
          <span
            className="text-xs font-bold tabular-nums w-5 flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {rank}
          </span>
        )}
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-sm font-semibold tabular-nums flex-shrink-0"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </div>
    <div
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ background: 'var(--color-bg-subtle)' }}
    >
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
      />
    </div>
    {subLabel && (
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subLabel}</p>
    )}
  </div>
);

/** Status distribution row */
const StatusRow: React.FC<{
  label: string; count: number; total: number;
  color: string; bgColor: string; icon: React.ElementType;
}> = ({ label, count, total, color, bgColor, icon: Icon }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: bgColor }}>
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: color + '33' }}
    >
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
          {count}
        </span>
      </div>
      <div className="w-full h-1 rounded-full" style={{ background: 'var(--color-bg-subtle)' }}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%', background: color }}
        />
      </div>
    </div>
    <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
      {total > 0 ? `${((count / total) * 100).toFixed(0)}%` : '0%'}
    </span>
  </div>
);

/** Summary tile (used in revenue summary grid) */
const SummaryTile: React.FC<{
  value: string; label: string;
  border: string; bg: string; textColor: string;
}> = ({ value, label, border, bg, textColor }) => (
  <div
    className="p-4 rounded-xl text-center"
    style={{ background: bg, border: `1px solid ${border}` }}
  >
    <p className="text-lg font-bold tabular-nums" style={{ color: textColor }}>{value}</p>
    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
  </div>
);

/* ─── Date input ─────────────────────────────────────────────────────────── */
const DateInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="text-sm px-3 py-2 outline-none transition-all"
    style={{
      background:   'var(--color-input-bg)',
      border:       '1px solid var(--color-input-border)',
      borderRadius: 'var(--radius-md)',
      color:        'var(--color-input-text)',
      height:       '38px',
    }}
    onFocus={(e) => {
      e.target.style.borderColor = 'var(--color-input-border-focus)';
      e.target.style.boxShadow   = '0 0 0 3px var(--color-input-ring)';
    }}
    onBlur={(e) => {
      e.target.style.borderColor = 'var(--color-input-border)';
      e.target.style.boxShadow   = 'none';
    }}
  />
);

/* ─── LabReports ─────────────────────────────────────────────────────────── */
export const LabReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [viewBy,    setViewBy]    = useState<ViewTab>('tests');
  const [loading,   setLoading]   = useState(true);

  const { labTransactions = [], fetchLabTransactions } = useAppStore();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await fetchLabTransactions(); } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const allLabTests = useMemo(() => {
    const txns = Array.isArray(labTransactions) ? labTransactions : [];
    return txns.flatMap((t) =>
      Array.isArray(t.labTests)
        ? t.labTests.map((test: unknown) => ({
            ...(test as object),
            patientName:       t.patientName,
            transactionNumber: t.transactionNumber,
            transactionDate:   t.createdAt,
            paymentMethod:     t.paymentMethod,
            paymentStatus:     t.paymentStatus,
          }))
        : []
    );
  }, [labTransactions]);

  const filterByDate = <T extends { createdAt: string }>(items: T[]): T[] => {
    const now = new Date();
    if (dateRange === 'custom') {
      if (!startDate || !endDate) return items;
      const s = new Date(startDate), e = new Date(endDate);
      return items.filter((i) => { const d = new Date(i.createdAt); return d >= s && d <= e; });
    }
    const cutoff = new Date(now);
    if (dateRange === 'today')   cutoff.setHours(0, 0, 0, 0);
    if (dateRange === 'week')    cutoff.setDate(now.getDate() - 7);
    if (dateRange === 'month')   cutoff.setMonth(now.getMonth() - 1);
    if (dateRange === 'quarter') cutoff.setMonth(now.getMonth() - 3);
    if (dateRange === 'year')    cutoff.setFullYear(now.getFullYear() - 1);
    return items.filter((i) => new Date(i.createdAt) >= cutoff);
  };

  const filteredTxns  = useMemo(
    () => filterByDate(Array.isArray(labTransactions) ? labTransactions : []),
    [dateRange, startDate, endDate, labTransactions]
  );
  const filteredTests = useMemo(
    () => filterByDate(allLabTests as { createdAt: string }[]),
    [dateRange, startDate, endDate, allLabTests]
  );

  const analytics = useMemo(() => {
    const totalRevenue    = filteredTxns.reduce((s, t) => s + safeNum(t.totalAmount), 0);
    const totalTests      = filteredTests.length;
    const completedTests  = filteredTests.filter((t: any) => t.status === 'completed').length;
    const pendingTests    = filteredTests.filter((t: any) => ['pending', 'in_progress'].includes(t.status)).length;
    const cancelledTests  = filteredTests.filter((t: any) => t.status === 'cancelled').length;
    const completionRate  = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
    const uniquePatients  = new Set(filteredTests.map((t: any) => t.patientName)).size;

    const freq = filteredTests.reduce((acc: Record<string, number>, t: any) => {
      const k = t.testType || 'Unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const topTests = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const rev = filteredTests.reduce((acc: Record<string, number>, t: any) => {
      const k = t.testType || 'Unknown';
      acc[k] = (acc[k] || 0) + safeNum(t.testPrice);
      return acc;
    }, {});
    const topRevenueTests = Object.entries(rev).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const daily = filteredTests.reduce((acc: Record<string, number>, t: any) => {
      const d = new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    const dailyArr = Object.entries(daily).slice(-7);

    const pmBreakdown = filteredTxns.reduce((acc: Record<string, number>, t) => {
      const k = t.paymentMethod || 'unknown';
      acc[k] = (acc[k] || 0) + safeNum(t.totalAmount);
      return acc;
    }, {});

    return {
      totalRevenue, totalTransactions: filteredTxns.length,
      totalTests, completedTests, pendingTests, cancelledTests,
      completionRate, uniquePatients,
      avgTestsPerPatient:   uniquePatients > 0 ? totalTests / uniquePatients : 0,
      avgRevenuePerPatient: uniquePatients > 0 ? totalRevenue / uniquePatients : 0,
      topTests, topRevenueTests, dailyArr, pmBreakdown,
    };
  }, [filteredTxns, filteredTests]);

  /* ── Export ────────────────────────────────────────────────────────────── */
  const exportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue',           `GHS ${analytics.totalRevenue.toFixed(2)}`],
      ['Total Transactions',      analytics.totalTransactions],
      ['Total Tests',             analytics.totalTests],
      ['Completed Tests',         analytics.completedTests],
      ['Pending Tests',           analytics.pendingTests],
      ['Cancelled Tests',         analytics.cancelledTests],
      ['Completion Rate',         `${analytics.completionRate}%`],
      ['Unique Patients',         analytics.uniquePatients],
      ['Avg Tests / Patient',     analytics.avgTestsPerPatient.toFixed(2)],
      ['Avg Revenue / Patient',   `GHS ${analytics.avgRevenuePerPatient.toFixed(2)}`],
      [], ['Top Tests', 'Count'],
      ...analytics.topTests.map(([n, c]) => [n, c]),
      [], ['Top Revenue Tests', 'Revenue (GHS)'],
      ...analytics.topRevenueTests.map(([n, r]) => [n, (r as number).toFixed(2)]),
    ];
    const csv  = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `lab-report-${dateRange}-${Date.now()}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Loading state ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 320 }}>
        <div
          className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-3"
          style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading lab data…</p>
      </div>
    );
  }

  const RANGE_LABELS: Record<DateRange, string> = {
    today: 'Today', week: 'This Week', month: 'This Month',
    quarter: 'Quarter', year: 'Year', custom: 'Custom',
  };

  const VIEW_TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
    { id: 'tests',    label: 'Test Analytics',    icon: FlaskConical },
    { id: 'patients', label: 'Patient Analytics', icon: Users        },
    { id: 'revenue',  label: 'Revenue Analytics', icon: DollarSign   },
  ];

  return (
    <div className="space-y-5 pb-6">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <FlaskConical className="h-4 w-4" style={{ color: '#fff' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Lab Analytics & Reports
            </h1>
          </div>
          <p className="text-sm ml-10" style={{ color: 'var(--color-text-muted)' }}>
            Comprehensive laboratory performance metrics and analytics
          </p>
        </div>

        {/* Live badge */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            background: 'var(--color-success-light)',
            border:     '1px solid var(--color-success)',
            color:      'var(--color-success-text)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--color-success)' }}
          />
          Live Data
        </div>
      </div>

      {/* ── CONTROLS CARD ───────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">

          {/* Date range pills */}
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Calendar className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Period
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => {
                const active = dateRange === r;
                return (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background:   active ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                      color:        active ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                      border:       `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                        (e.currentTarget as HTMLElement).style.color       = 'var(--color-accent-text)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLElement).style.color       = 'var(--color-text-secondary)';
                      }
                    }}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                );
              })}
            </div>

            {/* Custom range pickers */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <DateInput value={startDate} onChange={setStartDate} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>to</span>
                <DateInput value={endDate}   onChange={setEndDate}   />
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85 flex-shrink-0"
            style={{
              background: 'var(--color-success)',
              color:      '#fff',
              border:     'none',
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </Card>

      {/* ── KPI ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Revenue"
          value={`GHS ${analytics.totalRevenue.toFixed(2)}`}
          sub={`${analytics.totalTransactions} transactions`}
          icon={DollarSign}
          variant="success"
        />
        <KpiCard
          label="Total Tests"
          value={analytics.totalTests}
          sub="Requested this period"
          icon={FlaskConical}
          variant="accent"
        />
        <KpiCard
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
          sub={`${analytics.completedTests} completed`}
          icon={Award}
          variant="info"
        />
        <KpiCard
          label="Unique Patients"
          value={analytics.uniquePatients}
          sub={`${analytics.avgTestsPerPatient.toFixed(1)} tests / patient`}
          icon={Users}
          variant="warning"
        />
      </div>

      {/* ── STATUS SUMMARY STRIP ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusRow
          label="Completed"
          count={analytics.completedTests}
          total={analytics.totalTests}
          color="var(--color-success)"
          bgColor="var(--color-success-light)"
          icon={CheckCircle}
        />
        <StatusRow
          label="Pending / In Progress"
          count={analytics.pendingTests}
          total={analytics.totalTests}
          color="var(--color-warning)"
          bgColor="var(--color-warning-light)"
          icon={Clock}
        />
        <StatusRow
          label="Cancelled"
          count={analytics.cancelledTests}
          total={analytics.totalTests}
          color="var(--color-danger)"
          bgColor="var(--color-danger-light)"
          icon={XCircle}
        />
      </div>

      {/* ── VIEW TABS ───────────────────────────────────────────────── */}
      <div
        className="flex gap-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {VIEW_TABS.map(({ id, label, icon: Icon }) => {
          const active = viewBy === id;
          return (
            <button
              key={id}
              onClick={() => setViewBy(id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all"
              style={{
                background:       'transparent',
                border:           'none',
                borderBottom:     active ? '2px solid var(--color-accent)' : '2px solid transparent',
                color:            active ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                marginBottom:     '-1px',
                cursor:           'pointer',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── TEST ANALYTICS ──────────────────────────────────────────── */}
      {viewBy === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Most Requested Tests */}
          <Card className="p-5">
            <CardHeader
              title="Most Requested Tests"
              description="Ranked by volume"
              action={
                <div
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }}
                >
                  Top {analytics.topTests.length}
                </div>
              }
            />
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {analytics.topTests.length === 0 ? (
                <EmptyState label="No test data for this period" />
              ) : analytics.topTests.map(([name, count], i) => (
                <BarRow
                  key={name}
                  rank={i + 1}
                  label={name}
                  value={`${count}`}
                  pct={analytics.totalTests > 0 ? (count / analytics.totalTests) * 100 : 0}
                  barColor="var(--gradient-accent)"
                  subLabel={`${analytics.totalTests > 0 ? ((count / analytics.totalTests) * 100).toFixed(1) : 0}% of total`}
                />
              ))}
            </div>
          </Card>

          {/* Test Status Distribution */}
          <Card className="p-5">
            <CardHeader
              title="Status Distribution"
              description="All tests this period"
              action={
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {analytics.totalTests} total
                </span>
              }
            />

            {/* Completion dial (pure CSS) */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {/* Track */}
                  <circle cx="60" cy="60" r="48" fill="none"
                    stroke="var(--color-bg-subtle)" strokeWidth="10" />
                  {/* Filled arc */}
                  <circle cx="60" cy="60" r="48" fill="none"
                    stroke="var(--color-success)" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - analytics.completionRate / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                    {analytics.completionRate}%
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Complete</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Completed',          count: analytics.completedTests, color: 'var(--color-success)' },
                { label: 'Pending / Progress', count: analytics.pendingTests,   color: 'var(--color-warning)' },
                { label: 'Cancelled',          count: analytics.cancelledTests, color: 'var(--color-danger)'  },
              ].map(({ label, count, color }) => (
                <BarRow
                  key={label}
                  label={label}
                  value={`${count}`}
                  pct={analytics.totalTests > 0 ? (count / analytics.totalTests) * 100 : 0}
                  barColor={color}
                />
              ))}
            </div>
          </Card>

          {/* Daily Trend — full width */}
          {analytics.dailyArr.length > 0 && (
            <Card className="p-5 lg:col-span-2">
              <CardHeader title="Daily Test Volume" description="Last 7 days" />
              <div className="space-y-2">
                {analytics.dailyArr.map(([date, count]) => {
                  const max = Math.max(...analytics.dailyArr.map(([, c]) => c));
                  return (
                    <BarRow
                      key={date}
                      label={date}
                      value={`${count} tests`}
                      pct={max > 0 ? (count / max) * 100 : 0}
                      barColor="var(--gradient-accent)"
                    />
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── PATIENT ANALYTICS ───────────────────────────────────────── */}
      {viewBy === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Patient overview tiles */}
          <Card className="p-5">
            <CardHeader title="Patient Overview" description="Period summary" />
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile
                value={analytics.uniquePatients.toString()}
                label="Total Patients"
                border="var(--color-info)"
                bg="var(--color-info-light)"
                textColor="var(--color-info-text)"
              />
              <SummaryTile
                value={analytics.avgTestsPerPatient.toFixed(1)}
                label="Avg Tests / Patient"
                border="var(--color-accent)"
                bg="var(--color-accent-light)"
                textColor="var(--color-accent-text)"
              />
              <div className="col-span-2">
                <SummaryTile
                  value={`GHS ${analytics.avgRevenuePerPatient.toFixed(2)}`}
                  label="Avg Revenue / Patient"
                  border="var(--color-success)"
                  bg="var(--color-success-light)"
                  textColor="var(--color-success-text)"
                />
              </div>
            </div>
          </Card>

          {/* Patient activity list */}
          <Card className="p-5">
            <CardHeader title="Activity Breakdown" description="Tests and revenue per patient" />
            <div className="space-y-2">
              {[
                { Icon: Users,       label: 'Active Patients',    val: analytics.uniquePatients.toString(),            color: 'var(--color-accent)'  },
                { Icon: FlaskConical,label: 'Total Tests',        val: analytics.totalTests.toString(),                color: 'var(--color-info)'    },
                { Icon: TrendingUp,  label: 'Tests / Patient',   val: analytics.avgTestsPerPatient.toFixed(1),        color: 'var(--color-success)' },
                { Icon: DollarSign,  label: 'Revenue / Patient', val: `GHS ${analytics.avgRevenuePerPatient.toFixed(2)}`, color: 'var(--color-warning)' },
              ].map(({ Icon, label, val, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'var(--color-bg-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {label}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── REVENUE ANALYTICS ───────────────────────────────────────── */}
      {viewBy === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top revenue tests */}
          <Card className="p-5">
            <CardHeader
              title="Top Revenue Tests"
              description="Ranked by earnings"
              action={
                <span className="text-xs font-bold" style={{ color: 'var(--color-success-text)' }}>
                  GHS {analytics.totalRevenue.toFixed(2)} total
                </span>
              }
            />
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {analytics.topRevenueTests.length === 0 ? (
                <EmptyState label="No revenue data for this period" />
              ) : analytics.topRevenueTests.map(([name, rev], i) => {
                const r = rev as number;
                return (
                  <BarRow
                    key={name}
                    rank={i + 1}
                    label={name}
                    value={`GHS ${r.toFixed(2)}`}
                    pct={analytics.totalRevenue > 0 ? (r / analytics.totalRevenue) * 100 : 0}
                    barColor="var(--color-success)"
                    subLabel={`${analytics.totalRevenue > 0 ? ((r / analytics.totalRevenue) * 100).toFixed(1) : 0}% of total`}
                  />
                );
              })}
            </div>
          </Card>

          {/* Payment method breakdown */}
          <Card className="p-5">
            <CardHeader title="Payment Breakdown" description="Revenue by payment method" />
            <div className="space-y-3">
              {Object.keys(analytics.pmBreakdown).length === 0 ? (
                <EmptyState label="No payment data for this period" />
              ) : Object.entries(analytics.pmBreakdown).map(([method, amount]) => {
                const a = amount as number;
                return (
                  <BarRow
                    key={method}
                    label={fmtPayment(method)}
                    value={`GHS ${a.toFixed(2)}`}
                    pct={analytics.totalRevenue > 0 ? (a / analytics.totalRevenue) * 100 : 0}
                    barColor="var(--gradient-accent)"
                    subLabel={`${analytics.totalRevenue > 0 ? ((a / analytics.totalRevenue) * 100).toFixed(1) : 0}%`}
                  />
                );
              })}
            </div>
          </Card>

          {/* Revenue summary — full width */}
          <Card className="p-5 lg:col-span-2">
            <CardHeader title="Revenue Summary" description="Key financial metrics for the period" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile
                value={`GHS ${analytics.totalRevenue.toFixed(2)}`}
                label="Total Revenue"
                border="var(--color-success)" bg="var(--color-success-light)"
                textColor="var(--color-success-text)"
              />
              <SummaryTile
                value={analytics.totalTransactions.toString()}
                label="Transactions"
                border="var(--color-info)" bg="var(--color-info-light)"
                textColor="var(--color-info-text)"
              />
              <SummaryTile
                value={`GHS ${(analytics.totalRevenue / (analytics.totalTransactions || 1)).toFixed(2)}`}
                label="Avg / Transaction"
                border="var(--color-accent)" bg="var(--color-accent-light)"
                textColor="var(--color-accent-text)"
              />
              <SummaryTile
                value={analytics.topRevenueTests.length.toString()}
                label="Billable Test Types"
                border="var(--color-warning)" bg="var(--color-warning-light)"
                textColor="var(--color-warning-text)"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

/* ─── Empty state ────────────────────────────────────────────────────────── */
const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-8">
    <BarChart3 className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
  </div>
);
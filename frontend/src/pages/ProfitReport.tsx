import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Printer, RefreshCw, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';

interface ProductRow {
  productName: string;
  quantity: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}
interface Summary {
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  transactionCount: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const ghs = (n: number) => `GHS ${Number(n || 0).toFixed(2)}`;

export const ProfitReport: React.FC = () => {
  const { getProfitReport } = useAppStore();
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ revenue: 0, cogs: 0, profit: 0, margin: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(false);

  const fieldStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: '6px',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '0.8125rem',
    padding: '8px 10px',
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfitReport(startDate, `${endDate}T23:59:59`);
      setRows(res?.products || []);
      setSummary(res?.summary || { revenue: 0, cogs: 0, profit: 0, margin: 0, transactionCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [getProfitReport, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const profitColor = summary.profit >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)';

  return (
    <div className="space-y-5 pb-6 print-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-success-text)' }} />
            Profit &amp; Margin Report
          </h1>
          <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Revenue, cost of goods sold, and profit by product
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2 px-4 py-1.5 text-[0.75rem] no-print">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{ghs(summary.revenue)}</p>
          <p className="text-xs text-secondary">Revenue</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{ghs(summary.cogs)}</p>
          <p className="text-xs text-secondary">Cost of Goods</p>
        </Card>
        <Card className="p-3 text-center" style={{ borderColor: profitColor }}>
          <p className="text-lg font-bold tabular-nums" style={{ color: profitColor }}>{ghs(summary.profit)}</p>
          <p className="text-xs text-secondary">Profit</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold tabular-nums" style={{ color: profitColor }}>{summary.margin.toFixed(1)}%</p>
          <p className="text-xs text-secondary">Margin</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[0.7rem] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label className="block text-[0.7rem] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={fieldStyle} />
          </div>
          <button onClick={load} disabled={loading} className="btn-accent flex items-center gap-2 px-4 py-2 text-[0.75rem]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <span className="ml-auto text-xs text-secondary self-center">
            {summary.transactionCount} transactions
          </span>
        </div>
      </Card>

      {/* Per-product table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-subtle border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">COGS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted mx-auto mb-3" />
                  <p className="text-sm font-medium text-primary">No sales in this range</p>
                  <p className="text-xs text-secondary">Set cost prices on products so profit can be calculated.</p>
                </td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="hover:bg-subtle transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">{r.productName}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary tabular-nums">{r.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary tabular-nums">{ghs(r.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary tabular-nums">{ghs(r.cogs)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums"
                      style={{ color: r.profit >= 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                      {ghs(r.profit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-secondary tabular-nums">{r.margin.toFixed(1)}%</td>
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

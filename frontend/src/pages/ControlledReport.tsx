import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Printer, RefreshCw, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { Card } from '../components/ui/Card';

interface DispenseRecord {
  date: string;
  transactionNumber: string;
  productName: string;
  sku: string;
  schedule: string;
  quantity: number;
  cashierName: string;
  customerName: string | null;
  customerPhone: string | null;
}

// Default range: this month → today.
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export const ControlledReport: React.FC = () => {
  const { getControlledReport } = useAppStore();
  const [startDate, setStartDate] = useState(monthStartStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [records, setRecords] = useState<DispenseRecord[]>([]);
  const [summary, setSummary] = useState<{ totalRecords: number; totalQuantity: number }>({ totalRecords: 0, totalQuantity: 0 });
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
      // Include the whole end day.
      const res = await getControlledReport(startDate, `${endDate}T23:59:59`);
      setRecords(res?.data || []);
      setSummary(res?.summary || { totalRecords: 0, totalQuantity: 0 });
    } finally {
      setLoading(false);
    }
  }, [getControlledReport, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return s; }
  };

  return (
    <div className="space-y-5 pb-6 print-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <ShieldAlert className="h-4 w-4" style={{ color: 'var(--color-danger-text)' }} />
            Controlled Substances Report
          </h1>
          <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Dispensing log for scheduled (II–V) medications
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2 px-4 py-1.5 text-[0.75rem] no-print">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* Filters + summary */}
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

          <div className="flex gap-6 ml-auto">
            <div className="text-center">
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{summary.totalRecords}</p>
              <p className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>Dispenses</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{summary.totalQuantity}</p>
              <p className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>Units</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-subtle border-b border-theme">
              <tr>
                {['Date', 'Receipt', 'Product', 'Schedule', 'Qty', 'Cashier', 'Customer'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-secondary">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <ShieldAlert className="h-12 w-12 text-muted mx-auto mb-3" />
                  <p className="text-sm font-medium text-primary">No controlled dispenses in this range</p>
                  <p className="text-xs text-secondary">Sales of Schedule II–V products will appear here.</p>
                </td></tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i} className="hover:bg-subtle transition-colors">
                    <td className="px-4 py-3 text-sm text-secondary tabular-nums">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-secondary">{r.transactionNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{r.productName}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-danger text-xs px-2 py-0.5">Schedule {r.schedule}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary tabular-nums">{r.quantity}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{r.cashierName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {r.customerName || 'Walk-in'}
                      {r.customerPhone ? <span className="block text-xs text-muted">{r.customerPhone}</span> : null}
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

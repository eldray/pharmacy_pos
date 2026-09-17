// src/pages/PaymentPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Search, CheckCircle, Clock,
  X, Printer, RefreshCw, Receipt, User, Shield, FlaskConical,
  ChevronRight, Banknote, Smartphone, AlertCircle, Ban,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { SalesOrder, LabTransaction, PaymentMethod } from '../types';
import { useAppStore } from '../store';
import { useSearchParams } from 'react-router-dom';

const safeNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

type Tab = 'pos' | 'lab';
type DateFilter = 'pending' | 'today' | 'yesterday' | 'week' | 'month' | 'all';
type Order = SalesOrder | LabTransaction;

const DATE_LABELS: Record<DateFilter, string> = {
  pending: 'All Pending',
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'This Month',
  all: 'All',
};

/**
 * Compute the query window for a given filter.
 *  - 'pending'   → no date window, only unpaid (any age)
 *  - 'all'       → no filters at all
 *  - the rest    → a specific date window, unpaid only
 */
function rangeFor(filter: DateFilter): {
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  switch (filter) {
    case 'pending':
      return { paymentStatus: 'pending' };
    case 'today':
      return {
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        paymentStatus: 'pending',
      };
    case 'yesterday': {
      const y = new Date(today); y.setDate(today.getDate() - 1);
      return {
        startDate: y.toISOString(),
        endDate: today.toISOString(),
        paymentStatus: 'pending',
      };
    }
    case 'week': {
      const s = new Date(today); s.setDate(today.getDate() - 7);
      return {
        startDate: s.toISOString(),
        endDate: tomorrow.toISOString(),
        paymentStatus: 'pending',
      };
    }
    case 'month': {
      const s = new Date(today); s.setMonth(today.getMonth() - 1);
      return {
        startDate: s.toISOString(),
        endDate: tomorrow.toISOString(),
        paymentStatus: 'pending',
      };
    }
    case 'all':
    default:
      return {};
  }
}

/* ─── Age chip ───────────────────────────────────────────────────── */
function ageChip(createdAt: string): { label: string; bg: string; color: string } {
  const created = new Date(createdAt).getTime();
  if (isNaN(created)) return { label: '—', bg: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' };
  const days = Math.floor((Date.now() - created) / 86_400_000);

  if (days <= 0) return { label: 'Today', bg: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' };
  if (days === 1) return { label: '1d', bg: 'var(--color-info-light)', color: 'var(--color-info-text)' };
  if (days <= 6) return { label: `${days}d`, bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)' };
  return { label: `${days}d`, bg: 'var(--color-danger-light)', color: 'var(--color-danger-text)' };
}

/* ─── Status badge ───────────────────────────────────────────────── */
const statusBadge = (status: string, paymentStatus?: string) => {
  if (status === 'cancelled') {
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', whiteSpace: 'nowrap' }}>
        🚫 Cancelled
      </span>
    );
  }
  if (paymentStatus === 'paid' || status === 'paid') {
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: 'var(--color-success-light)', color: 'var(--color-success-text)', whiteSpace: 'nowrap' }}>
        ✅ Paid
      </span>
    );
  }
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: 'var(--color-warning-light)', color: 'var(--color-warning-text)', whiteSpace: 'nowrap' }}>
      ⏳ Pending
    </span>
  );
};

const paymentIcons: Record<string, React.ReactNode> = {
  cash: <Banknote style={{ width: 18, height: 18 }} />,
  card: <CreditCard style={{ width: 18, height: 18 }} />,
  mtn: <Smartphone style={{ width: 18, height: 18 }} />,
  vodafone: <Smartphone style={{ width: 18, height: 18 }} />,
  airteltigo: <Smartphone style={{ width: 18, height: 18 }} />,
};

/* ─── Type guards & helpers ──────────────────────────────────────── */
const isLab = (o: Order): o is LabTransaction =>
  !!o && (('labTests' in o) || ('tests' in o && !('items' in o)));

const docNumber = (o: Order): string =>
  (o as any).transactionNumber || (o as any).orderNumber || '';

const displayName = (o: Order): string =>
  isLab(o)
    ? (o as LabTransaction).patientName || 'Walk-in'
    : ((o as SalesOrder).customerName || 'Walk-in Customer');

const displayPhone = (o: Order): string | undefined =>
  isLab(o) ? (o as LabTransaction).patientPhone : (o as SalesOrder).customerPhone;

const getItems = (o: Order): any[] =>
  isLab(o)
    ? ((o as any).labTests || (o as any).tests || [])
    : ((o as SalesOrder).items || []);

const amountDue = (o: Order): number =>
  safeNum((o as any).copayAmount) || safeNum((o as any).totalAmount) || safeNum((o as any).total);

const isPaid = (o: Order): boolean =>
  isLab(o)
    ? (o as LabTransaction).paymentStatus === 'paid'
    : o.status === 'paid';

const isCancelled = (o: Order): boolean => o.status === 'cancelled';

/* ═══════════════════════════════════════════════════════════════════ */
export const PaymentPage: React.FC = () => {
  const { company } = useAppStore();

  const [tab, setTab] = useState<Tab>('pos');
  const [dateFilter, setDateFilter] = useState<DateFilter>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState<any>(null);
  const [lastPaidOrder, setLastPaidOrder] = useState<Order | null>(null);
  const [searchParams] = useSearchParams();

  const searchMode = !!searchQuery.trim();

  /* ── Fetch orders for the active tab + filter ─────────────────── */
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const range = rangeFor(dateFilter);
      const params = new URLSearchParams();
      if (range.startDate) params.append('startDate', range.startDate);
      if (range.endDate) params.append('endDate', range.endDate);
      if (range.paymentStatus) params.append('paymentStatus', range.paymentStatus);

      const base = tab === 'lab' ? '/lab-transactions' : '/orders';
      const url = `${base}${params.toString() ? `?${params.toString()}` : ''}`;
      const r = await api.get(url);
      setOrders(r.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [tab, dateFilter]);

  /* ── Search (ignores date filter) ─────────────────────────────── */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setOrders([]); return; }
    setIsLoading(true);
    try {
      const base = tab === 'lab' ? '/lab-transactions' : '/orders';
      const r = await api.get(`${base}?q=${encodeURIComponent(q)}`);
      setOrders(r.data || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setSelectedOrder(null);
    setSuccessTx(null);
    setSearchQuery('');
    fetchOrders();
  }, [tab, dateFilter, fetchOrders]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (searchMode) doSearch(searchDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounce, searchMode]);

  const refreshList = () => {
    if (searchMode) doSearch(searchDebounce);
    else fetchOrders();
  };

  /* ── Read ?tab= on mount ──────────────────────────────────────── */
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'pos' || t === 'lab') setTab(t);
  }, [searchParams]);

  /* ── Auto-select when ?orderId= is present ───────────────────── */
  useEffect(() => {
    const targetId = searchParams.get('orderId');
    if (!targetId || orders.length === 0) return;
    const found = orders.find((o) => String(o.id) === String(targetId));
    if (found) {
      setSelectedOrder(found);
      setPaymentMethod('cash');
      setPaymentRef('');
      setSuccessTx(null);
      setError('');
    }
  }, [orders, searchParams]);

  const handleSelectOrder = (o: Order) => {
    setSelectedOrder(o);
    setError('');
    setSuccessTx(null);
    setPaymentMethod('cash');
    setPaymentRef('');
  };

  /* ── Pay ─────────────────────────────────────────────────────── */
  const handlePayOrder = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    setError('');
    try {
      const url = tab === 'lab'
        ? `/lab-transactions/${selectedOrder.id}/pay`
        : `/orders/${selectedOrder.id}/pay`;

      const res = await api.post(url, {
        paymentMethod,
        paymentReference: paymentRef || undefined,
      });
      const tx = res.data.transaction || res.data;
      setSuccessTx(tx);
      setLastPaidOrder(selectedOrder);
      refreshList();

      setSelectedOrder((prev) => {
        if (!prev) return null;
        if (isLab(prev)) {
          return { ...prev, paymentStatus: 'paid', status: 'in_progress' } as any;
        }
        return { ...prev, status: 'paid' } as any;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── Cancel ──────────────────────────────────────────────────── */
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Cancel ${docNumber(selectedOrder)}?`)) return;
    setIsProcessing(true);
    setError('');
    try {
      const url = tab === 'lab'
        ? `/lab-transactions/${selectedOrder.id}/cancel`
        : `/orders/${selectedOrder.id}/cancel`;
      await api.post(url);
      refreshList();
      setSelectedOrder((prev) => prev ? { ...prev, status: 'cancelled' } as any : null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  /* ── Receipt printer (handles both POS and Lab) ──────────────── */
  const handlePrint = (order: Order | null, tx: any) => {
    if (!order || !tx) return;
    const co = company;
    const lab = isLab(order);

    const items: { name: string; qty: number; price: number }[] = lab
      ? getItems(order).map((t: any) => ({
        name: t.testType,
        qty: t.quantity || 1,
        price: safeNum(t.testPrice),
      }))
      : getItems(order).map((i: any) => ({
        name: i?.product?.name || i?.productName || 'Item',
        qty: i?.quantity || 0,
        price: safeNum(i?.unitPrice),
      }));

    const itemRows = items.map((it) =>
      `<div class="item-row">
        <span class="item-name">${it.name}</span>
        <span class="item-qty">${it.qty}</span>
        <span class="item-price">${it.price.toFixed(2)}</span>
        <span class="item-total">${(it.qty * it.price).toFixed(2)}</span>
      </div>`).join('');

    const num = docNumber(order) || tx.transactionNumber || '';
    const patient = displayName(order);
    const phone = displayPhone(order);

    const subtotal = safeNum((order as any).subtotal);
    const tax = safeNum((order as any).tax);
    const insuranceCoverage = safeNum((order as any).insuranceCoverage);
    const copay = safeNum((order as any).copayAmount);
    const total = safeNum((order as any).totalAmount) || safeNum((order as any).total);
    const finalAmount = copay || total;

    const html = `<!DOCTYPE html><html><head>
      <title>Receipt - ${num}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier New',monospace; font-size:9pt; max-width:72mm; margin:0 auto; padding:4mm 2mm; line-height:1.4; color:#000; background:#fff; }
        .header { text-align:center; border-bottom:1px dashed #000; padding-bottom:4mm; margin-bottom:3mm; }
        .company-name { font-size:12pt; font-weight:bold; text-transform:uppercase; letter-spacing:1px; }
        .divider { border-bottom:1px dashed #000; margin:2mm 0; }
        .row { display:flex; justify-content:space-between; padding:0.5mm 0; font-size:8pt; }
        .items-header { display:flex; border-bottom:1px solid #000; padding-bottom:1mm; margin-bottom:1mm; font-weight:bold; font-size:8pt; }
        .item-row { display:flex; padding:0.5mm 0; border-bottom:1px dotted #ccc; font-size:8pt; }
        .item-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .item-qty { width:24px; text-align:center; }
        .item-price { width:48px; text-align:right; }
        .item-total { width:48px; text-align:right; font-weight:bold; }
        .totals { margin-top:2mm; padding-top:2mm; border-top:1px dashed #000; }
        .total-final { font-size:11pt; font-weight:bold; border-top:2px solid #000; padding-top:1mm; margin-top:1mm; }
        .ins-box { border:1px dashed #000; padding:1mm 2mm; margin:2mm 0; font-size:7.5pt; }
        .footer { text-align:center; margin-top:3mm; padding-top:3mm; border-top:1px dashed #000; font-size:7pt; color:#666; }
      </style>
    </head><body>
      <div class="header">
        <div class="company-name">${co?.name || 'PHARMACY POS'}</div>
        ${co?.contact?.phone ? `<div style="font-size:7pt;color:#555;">${co.contact.phone}</div>` : ''}
        ${lab ? '<div style="font-size:7.5pt;font-weight:bold;margin-top:2mm;">LABORATORY SERVICES</div>' : ''}
      </div>
      <div class="row"><span>${lab ? 'Order' : 'Receipt'}:</span><span>${num}</span></div>
      ${tx.transactionNumber ? `<div class="row"><span>TXN:</span><span>${tx.transactionNumber}</span></div>` : ''}
      <div class="row"><span>Date:</span><span>${new Date(tx.createdAt || new Date()).toLocaleString()}</span></div>
      <div class="row"><span>Cashier:</span><span>${tx.cashierName || 'Cashier'}</span></div>
      <div class="row"><span>${lab ? 'Patient' : 'Customer'}:</span><span>${patient || 'Walk-in'}</span></div>
      ${phone ? `<div class="row"><span>Phone:</span><span>${phone}</span></div>` : ''}
      <div class="row"><span>Payment:</span><span>${(tx.paymentMethod || 'Cash').toUpperCase()}</span></div>
      ${tx.paymentReference ? `<div class="row"><span>Ref:</span><span>${tx.paymentReference}</span></div>` : ''}
      <div class="divider"></div>
      <div class="items-header">
        <span class="item-name">${lab ? 'Test' : 'Item'}</span>
        <span class="item-qty">Qty</span>
        <span class="item-price">Price</span>
        <span class="item-total">Total</span>
      </div>
      ${itemRows || '<div style="text-align:center;padding:2mm;color:#999;">No items</div>'}
      <div class="divider"></div>
      <div class="totals">
        <div class="row"><span>Subtotal:</span><span>GHS ${subtotal.toFixed(2)}</span></div>
        <div class="row"><span>VAT:</span><span>GHS ${tax.toFixed(2)}</span></div>
        ${(order as any).insuranceProviderName ? `
        <div class="ins-box">
          <div><strong>Insurance: ${(order as any).insuranceProviderName}</strong></div>
          ${(order as any).policyNumber ? `<div>Policy: ${(order as any).policyNumber}</div>` : ''}
          <div>Insurance covers: GHS ${insuranceCoverage.toFixed(2)}</div>
          <div><strong>Patient Co-Pay: GHS ${copay.toFixed(2)}</strong></div>
        </div>` : ''}
        <div class="row total-final"><span>AMOUNT PAID:</span><span>GHS ${finalAmount.toFixed(2)}</span></div>
      </div>
      <div class="footer">
        <div>Thank you for your visit!</div>
        <div style="margin-top:1mm;">Keep this receipt for your records.</div>
      </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=340,height=620');
    if (!win) { alert('Please allow pop-ups to print receipts.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => { win.print(); win.onafterprint = () => win.close(); };
    setTimeout(() => { if (!win.closed) { win.print(); win.onafterprint = () => win.close(); } }, 400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - var(--navbar-height) - 48px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard style={{ width: 20, height: 20, color: 'var(--color-accent-text)' }} /> Payment & Collections
          </h1>
          <p style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}>
            Collect payment for POS sales orders and lab transactions
          </p>
        </div>
        <button
          onClick={refreshList}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: '8px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setTab('pos')}
          style={{
            fontSize: '13px', fontWeight: 600, padding: '8px 16px',
            borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === 'pos' ? 'var(--color-accent)' : 'transparent',
            color: tab === 'pos' ? '#fff' : 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Receipt style={{ width: 14, height: 14 }} /> POS Orders
        </button>
        <button
          onClick={() => setTab('lab')}
          style={{
            fontSize: '13px', fontWeight: 600, padding: '8px 16px',
            borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === 'lab' ? 'var(--color-accent)' : 'transparent',
            color: tab === 'lab' ? '#fff' : 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <FlaskConical style={{ width: 14, height: 14 }} /> Lab Orders
        </button>
      </div>

      {/* Date filter pills */}
      {!searchMode && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(Object.keys(DATE_LABELS) as DateFilter[]).map((f) => {
            const active = dateFilter === f;
            return (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: active ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                  color: active ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 100ms',
                }}
              >
                {DATE_LABELS[f]}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order number, patient name, or phone…"
          style={{ fontSize: '14px', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: '10px', color: 'var(--color-input-text)', padding: '10px 16px 10px 38px', outline: 'none', height: '44px', width: '100%' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-input-border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--color-input-border)'; e.target.style.boxShadow = 'none'; }}
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)', fontSize: '13px' }}>
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* Left: Order list */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {searchMode
                ? 'Search Results'
                : `${DATE_LABELS[dateFilter]} ${dateFilter === 'pending' ? 'Payments' : 'Orders'}`}
            </span>
            {isLoading && <RefreshCw style={{ width: 14, height: 14, color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!isLoading && orders.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', color: 'var(--color-text-muted)', gap: '8px' }}>
                {tab === 'pos' ? <Receipt style={{ width: 32, height: 32, opacity: 0.3 }} /> : <FlaskConical style={{ width: 32, height: 32, opacity: 0.3 }} />}
                <p style={{ fontSize: '13px', textAlign: 'center' }}>
                  {searchMode ? 'No orders match your search' : `No ${tab === 'pos' ? 'POS' : 'Lab'} orders in this range`}
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const lab = isLab(order);
                const name = displayName(order);
                const phone = displayPhone(order);
                const num = docNumber(order);
                const paymentStatus = lab ? (order as LabTransaction).paymentStatus : undefined;
                const age = ageChip(order.createdAt);
                return (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      background: selectedOrder?.id === order.id ? 'var(--color-accent-light)' : 'transparent',
                      borderLeft: selectedOrder?.id === order.id ? '3px solid var(--color-accent)' : '3px solid transparent',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { if (selectedOrder?.id !== order.id) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                    onMouseLeave={(e) => { if (selectedOrder?.id !== order.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--color-accent-text)' }}>
                          {num}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          background: age.bg,
                          color: age.color,
                          whiteSpace: 'nowrap',
                        }}>
                          {age.label}
                        </span>
                      </div>
                      {statusBadge(order.status, paymentStatus)}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                      {name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        <Clock style={{ width: 10, height: 10, display: 'inline', marginRight: 3 }} />
                        {new Date(order.createdAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {(order as any).insuranceProviderName && ` · 🛡 ${(order as any).insuranceProviderName}`}
                        {phone && ` · ${phone}`}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        GHS {amountDue(order).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Order detail + payment */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' }}>
          {!selectedOrder ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', color: 'var(--color-text-muted)', gap: '12px' }}>
              <ChevronRight style={{ width: 40, height: 40, opacity: 0.2 }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Select an order</p>
              <p style={{ fontSize: '12px', textAlign: 'center' }}>Click an order on the left to view details and collect payment</p>
            </div>
          ) : (() => {
            const lab = isLab(selectedOrder);
            const items = getItems(selectedOrder);
            const patientName = displayName(selectedOrder);
            const patientPhone = displayPhone(selectedOrder);
            const num = docNumber(selectedOrder);
            const paymentStatus = lab ? (selectedOrder as LabTransaction).paymentStatus : undefined;
            const paid = isPaid(selectedOrder);
            const cancelled = isCancelled(selectedOrder);
            const age = ageChip(selectedOrder.createdAt);

            return (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: 'var(--color-accent-text)' }}>
                          #{num}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          background: age.bg,
                          color: age.color,
                        }}>
                          {age.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Issued by {(selectedOrder as any).createdByName || (selectedOrder as any).requestedByName} · {new Date(selectedOrder.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {statusBadge(selectedOrder.status, paymentStatus)}
                  </div>
                </div>

                <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {(patientName || patientPhone) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--color-bg-subtle)', borderRadius: '8px' }}>
                      <User style={{ width: 16, height: 16, color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{patientName || 'Walk-in'}</div>
                        {patientPhone && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{patientPhone}</div>}
                      </div>
                    </div>
                  )}

                  {(selectedOrder as any).insuranceProviderName && (
                    <div style={{ background: 'var(--color-info-light)', border: '1px solid var(--color-info)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-info-text)', marginBottom: 4 }}>
                        <Shield style={{ width: 14, height: 14 }} /> {(selectedOrder as any).insuranceProviderName}
                      </div>
                      {(selectedOrder as any).policyNumber && (
                        <div style={{ color: 'var(--color-info-text)' }}>Policy: <strong>{(selectedOrder as any).policyNumber}</strong></div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: 'var(--color-info-text)' }}>
                        <span>Insurance covers: GHS {safeNum((selectedOrder as any).insuranceCoverage).toFixed(2)}</span>
                        <span style={{ fontWeight: 700 }}>Co-Pay: GHS {safeNum((selectedOrder as any).copayAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lab ? 'Tests Ordered' : 'Items Ordered'}
                    </div>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      {items.map((item: any, i: number) => {
                        const name = lab
                          ? item.testType
                          : (item?.product?.name || item?.productName || 'Item');
                        const qty = item.quantity || 0;
                        const unitPrice = lab ? safeNum(item.testPrice) : safeNum(item.unitPrice);
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none', fontSize: '13px' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Qty {qty} × GHS {unitPrice.toFixed(2)}
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                              GHS {(qty * unitPrice).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                      {items.length === 0 && (
                        <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                          No items
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totals */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      <span>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {safeNum((selectedOrder as any).subtotal).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      <span>Tax</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {safeNum((selectedOrder as any).tax).toFixed(2)}</span>
                    </div>
                    {(selectedOrder as any).insuranceProviderName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-info-text)' }}>
                        <span>Insurance ({(selectedOrder as any).insuranceProviderName})</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>− GHS {safeNum((selectedOrder as any).insuranceCoverage).toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid var(--color-border)', marginTop: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {(selectedOrder as any).insuranceProviderName ? 'Patient Co-Pay' : 'Total'}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>
                        GHS {amountDue(selectedOrder).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {cancelled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--color-danger-light)', borderRadius: '8px', color: 'var(--color-danger-text)', fontSize: '13px', fontWeight: 600 }}>
                      <Ban style={{ width: 18, height: 18 }} /> This order has been cancelled
                    </div>
                  )}

                  {paid && !cancelled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--color-success-light)', borderRadius: '8px', color: 'var(--color-success-text)', fontSize: '13px', fontWeight: 600 }}>
                        <CheckCircle style={{ width: 18, height: 18 }} /> This order has been paid
                      </div>
                      <button
                        onClick={() => handlePrint(selectedOrder, {
                          transactionNumber: num,
                          cashierName: (selectedOrder as any).cashierName,
                          paymentMethod: (selectedOrder as any).paymentMethod || 'N/A',
                          paymentReference: (selectedOrder as any).paymentReference,
                          createdAt: new Date(),
                        })}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                      >
                        <Printer style={{ width: 16, height: 16 }} /> Reprint Receipt
                      </button>
                    </div>
                  )}

                  {!paid && !cancelled && (
                    <>
                      {successTx && lastPaidOrder?.id === selectedOrder.id && (
                        <div style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--color-success-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                          <span>Payment accepted! <strong>{successTx.transactionNumber}</strong></span>
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {(['cash', 'card', 'mtn', 'vodafone', 'airteltigo'] as PaymentMethod[]).map(pm => (
                            <button
                              key={pm}
                              onClick={() => setPaymentMethod(pm)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                padding: '10px 8px', borderRadius: '8px',
                                border: `2px solid ${paymentMethod === pm ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                background: paymentMethod === pm ? 'var(--color-accent-light)' : 'var(--color-bg-subtle)',
                                color: paymentMethod === pm ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                                cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 100ms',
                              }}
                            >
                              {paymentIcons[pm]}
                              {pm === 'cash' ? 'Cash' : pm === 'card' ? 'Card' : pm === 'mtn' ? 'MTN' : pm === 'vodafone' ? 'Vodafone' : 'AirtelTigo'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {paymentMethod !== 'cash' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Reference / Transaction ID</label>
                          <input
                            type="text"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            placeholder="e.g. MoMo reference number"
                            style={{ fontSize: '13px', background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: '6px', color: 'var(--color-input-text)', padding: '9px 12px', outline: 'none', width: '100%', height: '40px' }}
                          />
                        </div>
                      )}

                      <button
                        onClick={handlePayOrder}
                        disabled={isProcessing}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'var(--color-success)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.65 : 1, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                      >
                        <CreditCard style={{ width: 18, height: 18 }} />
                        {isProcessing ? 'Processing…' : `Accept Payment · GHS ${amountDue(selectedOrder).toFixed(2)}`}
                      </button>

                      <button
                        onClick={handleCancelOrder}
                        disabled={isProcessing}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: 'var(--color-danger-text)', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1 }}
                      >
                        <Ban style={{ width: 14, height: 14 }} /> Cancel Order
                      </button>

                      {successTx && lastPaidOrder?.id === selectedOrder.id && (
                        <button
                          onClick={() => handlePrint(lastPaidOrder, successTx)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                        >
                          <Printer style={{ width: 16, height: 16 }} /> Print Receipt
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
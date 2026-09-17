// src/pages/OrdersPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ClipboardList, Search, RefreshCw, Eye, Printer, Ban,
    Clock, CheckCircle, XCircle, DollarSign, User, Shield,
    ChevronLeft, ChevronRight, CreditCard, Filter, Calendar, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/api';
import { useAppStore } from '../store';
import { SalesOrder } from '../types';
import { Card } from '../components/ui/Card';

const safeNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

type StatusFilter = 'all' | 'pending_payment' | 'paid' | 'cancelled';
type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

export const OrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, company } = useAppStore();

    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, cancelled: 0, revenue: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Compute date range from dateFilter
    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        switch (dateFilter) {
            case 'today':
                return { startDate: today.toISOString(), endDate: tomorrow.toISOString() };
            case 'week': {
                const start = new Date(today); start.setDate(today.getDate() - 7);
                return { startDate: start.toISOString(), endDate: tomorrow.toISOString() };
            }
            case 'month': {
                const start = new Date(today); start.setMonth(today.getMonth() - 1);
                return { startDate: start.toISOString(), endDate: tomorrow.toISOString() };
            }
            case 'custom':
                return startDate && endDate ? { startDate, endDate: endDate + 'T23:59:59' } : {};
            default:
                return {};
        }
    }, [dateFilter, startDate, endDate]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (dateRange.startDate) params.append('startDate', dateRange.startDate);
            if (dateRange.endDate) params.append('endDate', dateRange.endDate);
            if (searchQuery.trim()) params.append('q', searchQuery.trim());

            const [ordersRes, statsRes] = await Promise.all([
                api.get(`/orders${params.toString() ? `?${params.toString()}` : ''}`),
                api.get(`/orders/stats/summary${dateRange.startDate ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ''}`),
            ]);

            setOrders(ordersRes.data || []);
            setStats(statsRes.data || { total: 0, pending: 0, paid: 0, cancelled: 0, revenue: 0 });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateRange, searchQuery]);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredOrders = orders;

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            pending_payment: { label: '⏳ Pending', cls: 'badge-warning' },
            paid: { label: '✅ Paid', cls: 'badge-success' },
            cancelled: { label: '🚫 Cancelled', cls: 'badge-danger' },
        };
        const s = map[status] || { label: status, cls: 'badge-info' };
        return <span className={`badge ${s.cls} text-sm px-3 py-1.5`}>{s.label}</span>;
    };

    // ── Print receipt for a PAID order ────────────────────────────────
    const handlePrint = (order: SalesOrder) => {
        const co = company;
        const items = Array.isArray(order.items) ? order.items : [];
        const itemRows = items.map((item: any) =>
            `<div class="item-row">
        <span class="item-name">${item?.product?.name || item?.productName || 'Item'}</span>
        <span class="item-qty">${item?.quantity || 0}</span>
        <span class="item-price">${safeNum(item?.unitPrice).toFixed(2)}</span>
        <span class="item-total">${(safeNum(item?.quantity) * safeNum(item?.unitPrice)).toFixed(2)}</span>
      </div>`
        ).join('');

        const html = `<!DOCTYPE html><html><head>
      <title>Receipt - ${order.orderNumber}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier New',monospace; font-size:9pt; max-width:72mm; margin:0 auto; padding:4mm 2mm; line-height:1.4; color:#000; }
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
      </div>
      <div class="row"><span>Order #:</span><span>${order.orderNumber}</span></div>
      <div class="row"><span>Date:</span><span>${new Date(order.createdAt).toLocaleString()}</span></div>
      <div class="row"><span>Cashier:</span><span>${order.cashierName || 'Cashier'}</span></div>
      <div class="row"><span>Patient:</span><span>${order.customerName || 'Walk-in'}</span></div>
      ${order.customerPhone ? `<div class="row"><span>Phone:</span><span>${order.customerPhone}</span></div>` : ''}
      <div class="divider"></div>
      <div class="items-header">
        <span class="item-name">Item</span>
        <span class="item-qty">Qty</span>
        <span class="item-price">Price</span>
        <span class="item-total">Total</span>
      </div>
      ${itemRows || '<div style="text-align:center;padding:2mm;color:#999;">No items</div>'}
      <div class="divider"></div>
      <div class="totals">
        <div class="row"><span>Subtotal:</span><span>GHS ${safeNum(order.subtotal).toFixed(2)}</span></div>
        <div class="row"><span>VAT:</span><span>GHS ${safeNum(order.tax).toFixed(2)}</span></div>
        ${order.insuranceProviderName ? `
        <div class="ins-box">
          <div><strong>Insurance: ${order.insuranceProviderName}</strong></div>
          ${order.policyNumber ? `<div>Policy: ${order.policyNumber}</div>` : ''}
          <div>Insurance covers: GHS ${safeNum(order.insuranceCoverage).toFixed(2)}</div>
          <div><strong>Patient Co-Pay: GHS ${safeNum(order.copayAmount).toFixed(2)}</strong></div>
        </div>` : ''}
        <div class="row total-final"><span>AMOUNT PAID:</span><span>GHS ${safeNum(order.copayAmount || order.total).toFixed(2)}</span></div>
      </div>
      <div class="footer"><div>Thank you for your visit!</div></div>
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

    // ── Cancel order ──────────────────────────────────────────────────
    const handleCancel = async (order: SalesOrder) => {
        if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
        try {
            await api.post(`/orders/${order.id}/cancel`);
            loadData();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    // ── Navigate to Payment page with this order selected ─────────────
    const handlePay = (order: SalesOrder) => {
        navigate(`/dashboard/payment?tab=pos&orderId=${order.id}`);
    };

    const DateFilterBtn: React.FC<{ label: string; value: DateFilter }> = ({ label, value }) => (
        <button
            onClick={() => { setDateFilter(value); setCurrentPage(1); }}
            className="px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap"
            style={{
                background: dateFilter === value ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                color: dateFilter === value ? 'var(--color-accent-fg)' : 'var(--color-text-secondary)',
                border: dateFilter === value ? 'none' : '1px solid var(--color-border)',
                cursor: 'pointer',
            }}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <ClipboardList className="h-5 w-5" style={{ color: 'var(--color-accent-text)' }} />
                        Orders
                    </h1>
                    <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        All sales orders — pending, paid, cancelled
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm"
                >
                    <RefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-secondary font-medium">Total</p>
                            <p className="text-2xl font-bold text-primary tabular-nums">{stats.total}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                            <ClipboardList className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-warning-text)' }}>Pending</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-warning-text)' }}>{stats.pending}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-warning)', color: 'var(--color-accent-fg)' }}>
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Paid</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success-text)' }}>{stats.paid}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
                            <CheckCircle className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-danger-text)' }}>Cancelled</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-danger-text)' }}>{stats.cancelled}</p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-danger)', color: 'var(--color-accent-fg)' }}>
                            <XCircle className="h-4 w-4" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Revenue</p>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success-text)' }}>
                                GHS {safeNum(stats.revenue).toFixed(2)}
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search by order #, customer name, or phone…"
                                className="input-base w-full text-sm"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
                            className="input-base px-4 text-sm"
                            style={{ minWidth: 160 }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending_payment">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Date:</span>
                        <div className="flex gap-1.5">
                            <DateFilterBtn label="Today" value="today" />
                            <DateFilterBtn label="Week" value="week" />
                            <DateFilterBtn label="Month" value="month" />
                            <DateFilterBtn label="All" value="all" />
                        </div>

                        {dateFilter === 'custom' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-accent-light)', border: '1px solid var(--color-accent)' }}>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-2 py-1 border rounded text-xs outline-none"
                                    style={{ borderColor: 'var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-input-text)' }}
                                />
                                <span className="text-xs">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-2 py-1 border rounded text-xs outline-none"
                                    style={{ borderColor: 'var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-input-text)' }}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setDateFilter('custom')}
                                className="px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold btn-ghost"
                            >
                                Custom
                            </button>
                        )}

                        <span className="text-xs px-2 py-0.5 rounded-full ml-2" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                            {filteredOrders.length} orders
                        </span>
                    </div>
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <Card className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
                </Card>
            ) : error ? (
                <Card className="p-12 text-center">
                    <p className="text-danger">{error}</p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-subtle border-b border-theme">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Order #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Customer</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Items</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Insurance</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Created</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme">
                                {paginatedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <ClipboardList className="h-12 w-12 text-muted mx-auto mb-3" />
                                            <p className="text-lg font-medium text-primary">No orders found</p>
                                            <p className="text-sm text-secondary">Try adjusting your filters</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedOrders.map((order) => {
                                        const itemCount = (order.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
                                        return (
                                            <tr key={order.id} className="hover:bg-subtle transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono font-semibold text-sm text-primary">{order.orderNumber}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-sm text-primary">{order.customerName || 'Walk-in'}</p>
                                                        {order.customerPhone && <p className="text-xs text-secondary">{order.customerPhone}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm tabular-nums text-primary">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {order.insuranceProviderName ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-info-text)' }}>
                                                                <Shield className="h-3 w-3" /> {order.insuranceProviderName}
                                                            </span>
                                                            {order.policyNumber && <span className="text-[0.65rem] font-mono text-muted">{order.policyNumber}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <p className="font-bold text-sm tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                                                        GHS {safeNum(order.copayAmount || order.total).toFixed(2)}
                                                    </p>
                                                    {order.insuranceProviderName && (
                                                        <p className="text-[0.65rem] text-muted">
                                                            cover: GHS {safeNum(order.insuranceCoverage).toFixed(2)}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                                                <td className="px-4 py-3 text-sm text-secondary">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-xs">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 justify-end flex-wrap">
                                                        {order.status === 'pending_payment' && (
                                                            <>
                                                                {(currentUser?.role === 'cashier' || currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                                                    <button
                                                                        onClick={() => handlePay(order)}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-accent"
                                                                    >
                                                                        <CreditCard className="h-3 w-3" /> Pay
                                                                    </button>
                                                                )}
                                                                {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'pharmacist_sales') && (
                                                                    <button
                                                                        onClick={() => handleCancel(order)}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                                                                        style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)' }}
                                                                    >
                                                                        <Ban className="h-3 w-3" /> Cancel
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {order.status === 'paid' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handlePrint(order)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                                >
                                                                    <Printer className="h-3 w-3" /> Reprint
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate(`/dashboard/sales`)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold btn-ghost"
                                                                >
                                                                    <Eye className="h-3 w-3" /> View
                                                                </button>
                                                            </>
                                                        )}
                                                        {order.status === 'cancelled' && (
                                                            <span className="text-xs text-muted">No actions</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3">
                            <p className="text-sm text-secondary">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="px-3 py-1.5 text-sm font-medium text-primary">{currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};
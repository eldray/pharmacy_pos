// src/components/ProductHistoryModal.tsx
import React, { useMemo, useState } from 'react';
import { X, History, Clock, DollarSign, Receipt, User, ShoppingCart, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { Product } from '../types';
import { Card } from './ui/Card';
import { ReceiptModal } from './ReceiptModal';

interface ProductHistoryModalProps {
    product: Product;
    onClose: () => void;
}

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
    product,
    onClose,
}) => {
    const { transactions } = useAppStore();
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    // Get all transactions related to this product
    const productTransactions = useMemo(() => {
        if (!product || !transactions) return [];

        return transactions.filter(tx => {
            const items = tx.items || [];
            return items.some(item => {
                const productId = item.productId || item.product?.id || item.product?._id;
                return productId === product.id;
            });
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [transactions, product]);

    // Calculate total quantity sold
    const totalQuantitySold = useMemo(() => {
        let total = 0;
        productTransactions.forEach(tx => {
            const items = tx.items || [];
            items.forEach(item => {
                const productId = item.productId || item.product?.id || item.product?._id;
                if (productId === product.id) {
                    total += Number(item.quantity) || 0;
                }
            });
        });
        return total;
    }, [productTransactions, product]);

    // Calculate total revenue
    const totalRevenue = useMemo(() => {
        let total = 0;
        productTransactions.forEach(tx => {
            const items = tx.items || [];
            items.forEach(item => {
                const productId = item.productId || item.product?.id || item.product?._id;
                if (productId === product.id) {
                    total += Number(item.total) || 0;
                }
            });
        });
        return total;
    }, [productTransactions, product]);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { cls: string; label: string }> = {
            completed: { cls: 'badge-success', label: 'Completed' },
            pending: { cls: 'badge-warning', label: 'Pending' },
            cancelled: { cls: 'badge-danger', label: 'Cancelled' },
            paid: { cls: 'badge-success', label: 'Paid' },
            pending_payment: { cls: 'badge-warning', label: 'Pending Payment' },
        };
        const { cls, label } = config[status] || { cls: 'badge-info', label: status };
        return <span className={`badge ${cls} text-sm px-3 py-1.5`}>{label}</span>;
    };

    const handleViewReceipt = (tx: any) => {
        // Build receipt transaction object
        const receiptTransaction = {
            ...tx,
            items: tx.items || [],
            customerName: tx.customerName,
            customerPhone: tx.customerPhone,
        };
        setSelectedTransaction(receiptTransaction);
        setShowReceipt(true);
    };

    return (
        <>
            <div
                className="fixed inset-0 flex items-center justify-center p-4"
                style={{
                    background: 'var(--color-bg-overlay)',
                    zIndex: 'var(--z-modal)',
                }}
                onClick={onClose}
            >
                <div
                    className="rounded-[12px] overflow-hidden"
                    style={{
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-xl)',
                        width: '100%',
                        maxWidth: 1100,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ─────────────────────────────────────────────────── */}
                    <div
                        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                        style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: 'var(--color-bg-surface)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '8px',
                                    background: 'var(--color-accent-light)',
                                    color: 'var(--color-accent-text)',
                                }}
                            >
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    Product History
                                </h2>
                                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                    {product.name} • SKU: {product.sku}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center flex-shrink-0 transition-colors duration-100 cursor-pointer"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                            }}
                            onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background =
                                'var(--color-bg-subtle)')
                            }
                            onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.background = 'transparent')
                            }
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* ── Body ────────────────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShoppingCart className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total Sold</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {totalQuantitySold}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Units sold</p>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total Revenue</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                    GHS {totalRevenue.toFixed(2)}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>From {productTransactions.length} transactions</p>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Receipt className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Transactions</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {productTransactions.length}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total transactions</p>
                            </Card>
                        </div>

                        {/* Transactions Table - Larger and cleaner */}
                        {productTransactions.length === 0 ? (
                            <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                                <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                <p className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>No transactions found</p>
                                <p className="text-sm mt-1">This product has not been sold yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px]">
                                    <thead>
                                        <tr style={{ background: 'var(--color-bg-subtle)' }}>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Transaction</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Customer</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Unit Price</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Total</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-theme">
                                        {productTransactions.map((tx) => {
                                            const txItems = tx.items || [];
                                            const productItem = txItems.find(item => {
                                                const productId = item.productId || item.product?.id || item.product?._id;
                                                return productId === product.id;
                                            });

                                            return (
                                                <tr key={tx.id} className="hover:bg-subtle transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                            {tx.transactionNumber || 'N/A'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                                                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                                {tx.customerName || 'Walk-in'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                                            {productItem?.quantity || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                                            GHS {safeNumber(productItem?.unitPrice).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-sm font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                                            GHS {safeNumber(productItem?.total).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {getStatusBadge(tx.status || 'completed')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>{formatDate(tx.createdAt)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleViewReceipt(tx)}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                                            style={{
                                                                background: 'var(--color-accent)',
                                                                color: 'var(--color-accent-fg)',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)';
                                                            }}
                                                        >
                                                            <Receipt className="h-4 w-4" />
                                                            View Receipt
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Footer ──────────────────────────────────────────────────── */}
                    <div
                        className="flex-shrink-0 px-6 py-3.5"
                        style={{
                            borderTop: '1px solid var(--color-border)',
                            background: 'var(--color-bg-surface)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                {productTransactions.length} transaction{productTransactions.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={onClose}
                                className="btn-ghost px-4 py-2 text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && selectedTransaction && (
                <ReceiptModal
                    transaction={selectedTransaction}
                    customerName={selectedTransaction.customerName}
                    customerPhone={selectedTransaction.customerPhone}
                    onClose={() => {
                        setShowReceipt(false);
                        setSelectedTransaction(null);
                    }}
                    onPrint={() => window.print()}
                />
            )}
        </>
    );
};
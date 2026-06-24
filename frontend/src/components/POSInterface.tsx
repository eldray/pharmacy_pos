// src/components/POSInterface.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Search, ShoppingCart, Trash2, DollarSign,
  Plus, Minus, X
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product, PaymentMethod, Transaction } from '../types';
import { ReceiptModal } from './ReceiptModal';

const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

/* ─── Tabular number wrapper ─────────────────────────────────────────────── */
const Num: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = '',
  style,
}) => (
  <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
    {children}
  </span>
);

/* ─── Stock badge ────────────────────────────────────────────────────────── */
const StockBadge: React.FC<{ quantity: number }> = ({ quantity }) => {
  const style: React.CSSProperties =
    quantity > 10
      ? { background: 'var(--color-success-light)', color: 'var(--color-success-text)' }
      : quantity > 0
        ? { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }
        : { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' };

  return (
    <span
      className="whitespace-nowrap"
      style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', ...style }}
    >
      {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}
    </span>
  );
};

/* ─── Product card ───────────────────────────────────────────────────────── */
const ProductCard: React.FC<{ product: Product; onSelect: (p: Product) => void }> = React.memo(({
  product,
  onSelect,
}) => {
  const onClick = () => onSelect(product);
  const outOfStock = product.quantity <= 0;
  return (
    <div
      onClick={!outOfStock ? onClick : undefined}
      className="transition-all duration-100"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px',
        cursor: outOfStock ? 'not-allowed' : 'pointer',
        opacity: outOfStock ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (outOfStock) return;
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--color-border-focus)';
        el.style.boxShadow = 'var(--shadow-sm)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--color-border)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      <p
        className="truncate"
        style={{ fontSize: '13px', fontWeight: 600, lineHeight: 'var(--leading-tight)', color: 'var(--color-text-primary)' }}
      >
        {product.name}
      </p>
      <p
        className="truncate"
        style={{ fontSize: '10px', marginTop: 2, color: 'var(--color-text-muted)' }}
      >
        {product.category}
      </p>
      <div className="flex items-center justify-between" style={{ marginTop: '8px' }}>
        <StockBadge quantity={product.quantity} />
        <Num
          style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-accent-text)' }}
        >
          GHS {safeNumber(product.unitPrice).toFixed(2)}
        </Num>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

/* ─── Field — compact labeled input with HARD-CODED padding ────────────── */
const Field: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
> = ({ label, ...props }) => (
  <div>
    {label && (
      <label
        className="block"
        style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-muted)' }}
      >
        {label}
      </label>
    )}
    <input
      {...props}
      className="w-full transition-all duration-100"
      style={{
        fontSize: '14px',
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: '6px',
        color: 'var(--color-input-text)',
        padding: '10px 14px',
        outline: 'none',
        height: '42px',
        width: '100%',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--color-input-border-focus)';
        e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--color-input-border)';
        e.target.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
    />
  </div>
);

/* ─── Small square button for qty controls ───────────────────────────────── */
const QtyBtn: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  ariaLabel: string;
}> = ({ children, onClick, danger, ariaLabel }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="flex items-center justify-center transition-colors duration-100 cursor-pointer"
    style={{
      width: 28,
      height: 28,
      borderRadius: '4px',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg-surface)',
      color: danger ? 'var(--color-danger-text)' : 'var(--color-text-secondary)',
      padding: 0,
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = danger
        ? 'var(--color-danger-light)'
        : 'var(--color-bg-subtle)';
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLElement;
      el.style.background = 'var(--color-bg-surface)';
    }}
  >
    {children}
  </button>
);

/* ─── POSInterface ───────────────────────────────────────────────────────── */
export const POSInterface: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [editingQtyIndex, setEditingQtyIndex] = useState<string | null>(null);

  // ─── Print Ref ───────────────────────────────────────────────────────────
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const {
    fetchProducts, products,
    cartItems, addToCart, updateCartItem, removeFromCart, clearCart,
    getCartTotal, addTransaction, transactions,
  } = useAppStore();

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ─── Print Handler ──────────────────────────────────────────────────────
  const handlePrintReceipt = useReactToPrint({
    content: () => receiptPrintRef.current,
    documentTitle: `Receipt-${lastTransaction?.transactionNumber || 'Unknown'}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .no-print {
          display: none !important;
        }
        .print-content {
          display: block !important;
        }
        .fixed.inset-0 {
          display: none !important;
        }
      }
    `,
    onBeforeGetContent: () => {
      setShowReceipt(false);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log('Receipt printed successfully');
    }
  });

  // ─── Get top selling products ──────────────────────────────────────────
  const topSellingProducts = useMemo(() => {
    if (transactions.length > 0) {
      const salesCount: Record<string, number> = {};
      
      transactions.forEach(tx => {
        tx.items.forEach(item => {
          const productId = item.productId;
          if (productId) {
            salesCount[productId] = (salesCount[productId] || 0) + item.quantity;
          }
        });
      });

      const sorted = Object.entries(salesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([productId]) => products.find(p => p.id === productId))
        .filter(Boolean) as Product[];

      return sorted;
    }
    
    return products.slice(0, 12);
  }, [transactions, products]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const byBarcode = products.find((p) => p.barcode === searchQuery);
    if (byBarcode) return [byBarcode];
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const handleAddProduct = React.useCallback((product: Product) => {
    setFormError('');
    if (!product.id) { setFormError('This product is missing an ID and cannot be added.'); return; }
    if (product.quantity <= 0) { setFormError(`${product.name} is out of stock.`); return; }
    addToCart(product, 1);
    setSearchQuery('');
  }, [addToCart]);

  const handleQtyChange = (cartId: string, qty: number) => {
    if (qty < 1) removeFromCart(cartId);
    else updateCartItem(cartId, qty);
  };

  const handleQtyInputChange = (cartId: string, value: string) => {
    const qty = parseInt(value);
    if (isNaN(qty)) return;
    if (qty < 1) removeFromCart(cartId);
    else updateCartItem(cartId, qty);
  };

  const { subtotal, tax, taxRate } = getCartTotal();
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal - discountAmount + tax;

  const handlePayment = async () => {
    setFormError('');
    if (cartItems.length === 0) { setFormError('Cart is empty — add a product before checking out.'); return; }
    if (selectedPayment !== 'cash' && !mobileMoneyNumber) { setFormError('Please enter a mobile money number.'); return; }
    if (selectedPayment !== 'cash' && mobileMoneyNumber.length < 10) { setFormError('Please enter a valid phone number.'); return; }

    setPaymentLoading(true);
    try {
      const transactionItems = cartItems.map((i) => ({
        productId: i.productId,
        product: {
          id: i.productId,
          name: i.product.name,
          sku: i.product.sku,
          category: i.product.category,
          unitPrice: i.unitPrice,
        },
        productName: i.product.name,
        productSku: i.product.sku,
        productCategory: i.product.category,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
        discount: i.discount || 0,
      }));

      const txn = await addTransaction({
        items: transactionItems,
        subtotal,
        tax,
        total: finalTotal,
        paymentMethod: selectedPayment,
        paymentReference: selectedPayment !== 'cash'
          ? `${selectedPayment.toUpperCase()}-${mobileMoneyNumber}` : undefined,
        discount: discountAmount,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });

      if (txn) {
        const receiptTransaction = {
          ...txn,
          items: transactionItems,
        };
        setLastTransaction(receiptTransaction);
        setShowReceipt(true);
        clearCart();
        setDiscountPercent(0);
        setMobileMoneyNumber('');
        setCustomerName('');
        setCustomerPhone('');
      } else {
        setFormError('Transaction failed. Please try again.');
      }
    } catch {
      setFormError('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ─── Determine which products to show ──────────────────────────────────
  const displayedProducts = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return topSellingProducts;
  }, [searchQuery, searchResults, topSellingProducts]);

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 256 }}>
        <div className="text-center">
          <div
            className="rounded-full animate-spin mx-auto"
            style={{ width: 32, height: 32, border: '3px solid var(--color-accent)', borderTopColor: 'transparent' }}
          />
          <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Loading products…
          </p>
        </div>
      </div>
    );
  }

  /* ─── Shared input style ──────────────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: '6px',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '14px',
    padding: '10px 14px',
    width: '100%',
    height: '42px',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}
          >
            Point of Sale
          </h1>
          <p
            style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}
          >
            {products.length} products available
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!searchQuery.trim() && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'var(--color-info-light)',
                color: 'var(--color-info-text)',
              }}
            >
              Top Selling
            </span>
          )}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'var(--color-success-light)',
              color: 'var(--color-success-text)',
            }}
          >
            Ready to scan
          </span>
        </div>
      </div>

      {/* Form-level error banner */}
      {formError && (
        <div
          className="flex items-center justify-between"
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            background: 'var(--color-danger-light)',
            color: 'var(--color-danger-text)',
            border: '1px solid var(--color-danger)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span>{formError}</span>
          <button
            onClick={() => setFormError('')}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: 4 }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '16px' }}>

        {/* ── Products ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-2">
          {/* Search */}
          <div className="relative" style={{ marginBottom: '12px' }}>
            <Search
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: 12, width: 16, height: 16, color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                searchResults[0] &&
                handleAddProduct(searchResults[0])
              }
              placeholder="Search by name, SKU, barcode, or category…"
              autoFocus
              className="w-full transition-all duration-100"
              style={{
                fontSize: '14px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                borderRadius: '10px',
                color: 'var(--color-input-text)',
                padding: '10px 16px 10px 36px',
                outline: 'none',
                height: '42px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-input-border-focus)';
                e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-input-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ right: 12, background: 'none', border: 'none', color: 'var(--color-text-muted)', padding: 4 }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Results label */}
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}
            >
              {searchQuery.trim() ? 'Search Results' : 'Top Selling Products'}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                marginBottom: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: searchQuery.trim() ? 'var(--color-info-light)' : 'var(--color-accent-light)',
                color: searchQuery.trim() ? 'var(--color-info-text)' : 'var(--color-accent-text)',
              }}
            >
              {displayedProducts.length}
            </span>
          </div>

          {/* Grid */}
          {displayedProducts.length === 0 ? (
            <div className="text-center" style={{ padding: '40px 0' }}>
              <Search style={{ width: 28, height: 28, margin: '0 auto', color: 'var(--color-text-muted)', opacity: 0.4 }} />
              <p style={{ fontSize: '13px', marginTop: '12px', color: 'var(--color-text-muted)' }}>
                {searchQuery.trim() ? `No products match "${searchQuery}"` : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: '10px' }}>
              {displayedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={handleAddProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Cart ─────────────────────────────────────────────────────── */}
        <div className="xl:col-span-1">
          <div className="sticky" style={{ top: 'calc(var(--navbar-height) + 12px)' }}>
            <div
              className="overflow-hidden"
              style={{
                borderRadius: '14px',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
                minHeight: '500px',
                maxHeight: 'calc(100vh - 140px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Cart header */}
              <div
                className="flex items-center justify-between flex-shrink-0"
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <ShoppingCart style={{ width: 16, height: 16, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Cart
                  </span>
                  {cartItems.length > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: '6px',
                        background: 'var(--color-accent-light)',
                        color: 'var(--color-accent-text)',
                      }}
                    >
                      {cartItems.length}
                    </span>
                  )}
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="transition-colors duration-100 cursor-pointer"
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: '6px',
                      color: 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = 'var(--color-danger-text)';
                      el.style.background = 'var(--color-danger-light)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = 'var(--color-text-muted)';
                      el.style.background = 'transparent';
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart body - Scrollable */}
              <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                {cartItems.length === 0 ? (
                  <div className="text-center" style={{ padding: '40px 0' }}>
                    <div
                      className="flex items-center justify-center mx-auto"
                      style={{ width: 44, height: 44, borderRadius: '9999px', background: 'var(--color-bg-subtle)', marginBottom: '12px' }}
                    >
                      <ShoppingCart style={{ width: 18, height: 18, color: 'var(--color-text-muted)' }} />
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Cart is empty
                    </p>
                    <p style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}>
                      Search or tap a product to add it
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cart items - Larger display */}
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', margin: '0 -4px' }}>
                      {cartItems.map((item) => (
                        <div
                          key={item.cartId}
                          className="flex flex-col"
                          style={{ padding: '8px 4px', borderBottom: '1px solid var(--color-border)' }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate"
                                style={{ fontSize: '13px', fontWeight: 600, lineHeight: 'var(--leading-tight)', color: 'var(--color-text-primary)' }}
                              >
                                {item.product.name}
                              </p>
                              <Num style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                GHS {safeNumber(item.unitPrice).toFixed(2)} ea
                              </Num>
                            </div>

                            <Num
                              className="text-right flex-shrink-0"
                              style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-accent-text)' }}
                            >
                              GHS {safeNumber(item.total).toFixed(2)}
                            </Num>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center flex-shrink-0" style={{ gap: 2 }}>
                              <QtyBtn
                                ariaLabel={`Decrease quantity of ${item.product.name}`}
                                onClick={() => handleQtyChange(item.cartId, item.quantity - 1)}
                              >
                                <Minus style={{ width: 12, height: 12 }} />
                              </QtyBtn>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQtyInputChange(item.cartId, e.target.value)}
                                onFocus={() => setEditingQtyIndex(item.cartId)}
                                onBlur={() => setEditingQtyIndex(null)}
                                style={{
                                  width: '36px',
                                  height: '28px',
                                  textAlign: 'center',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '4px',
                                  background: editingQtyIndex === item.cartId ? 'var(--color-accent-light)' : 'var(--color-input-bg)',
                                  color: 'var(--color-text-primary)',
                                  outline: 'none',
                                  padding: '0',
                                }}
                                min="1"
                              />
                              <QtyBtn
                                ariaLabel={`Increase quantity of ${item.product.name}`}
                                onClick={() => handleQtyChange(item.cartId, item.quantity + 1)}
                              >
                                <Plus style={{ width: 12, height: 12 }} />
                              </QtyBtn>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.cartId)}
                              aria-label={`Remove ${item.product.name} from cart`}
                              className="flex-shrink-0 transition-colors duration-100 cursor-pointer"
                              style={{
                                color: 'var(--color-text-muted)',
                                background: 'transparent',
                                border: 'none',
                                padding: 4,
                                opacity: 0.5,
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.color = 'var(--color-danger-text)';
                                el.style.opacity = '1';
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.color = 'var(--color-text-muted)';
                                el.style.opacity = '0.5';
                              }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Customer info */}
                    <div className="grid grid-cols-2" style={{ gap: '10px', marginTop: '12px' }}>
                      <Field
                        label="Customer name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Optional"
                      />
                      <Field
                        label="Phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    {/* Discount */}
                    <div style={{ marginTop: '10px' }}>
                      <Field
                        label="Discount %"
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) =>
                          setDiscountPercent(
                            Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                          )
                        }
                      />
                    </div>

                    {/* Totals */}
                    <div
                      style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}
                    >
                      {[
                        { label: 'Subtotal', value: subtotal, color: 'var(--color-text-secondary)' },
                        ...(discountAmount > 0
                          ? [{ label: 'Discount', value: -discountAmount, color: 'var(--color-success-text)' }]
                          : []),
                        { label: `VAT ${taxRate}%`, value: tax, color: 'var(--color-text-secondary)' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between" style={{ fontSize: '13px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                          <Num style={{ fontWeight: 600, color }}>
                            GHS {safeNumber(value).toFixed(2)}
                          </Num>
                        </div>
                      ))}

                      <div
                        className="flex justify-between"
                        style={{ paddingTop: '10px', marginTop: '4px', borderTop: '1px solid var(--color-border)' }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          Total
                        </span>
                        <Num style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-accent-text)' }}>
                          GHS {safeNumber(finalTotal).toFixed(2)}
                        </Num>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div style={{ marginTop: '12px' }}>
                      <label
                        className="block"
                        style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-muted)' }}
                      >
                        Payment method
                      </label>
                      <select
                        value={selectedPayment}
                        onChange={(e) => setSelectedPayment(e.target.value as PaymentMethod)}
                        className="w-full"
                        style={selectStyle}
                      >
                        <option value="cash">Cash</option>
                        <option value="mtn">MTN Mobile Money</option>
                        <option value="vodafone">Vodafone Cash</option>
                        <option value="airteltigo">AirtelTigo Money</option>
                      </select>

                      {selectedPayment !== 'cash' && (
                        <div style={{ marginTop: '10px' }}>
                          <Field
                            type="tel"
                            value={mobileMoneyNumber}
                            onChange={(e) => setMobileMoneyNumber(e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                      )}
                    </div>

                    {/* Pay button */}
                    <button
                      onClick={handlePayment}
                      disabled={paymentLoading || cartItems.length === 0}
                      className="w-full flex items-center justify-center transition-all duration-100 cursor-pointer"
                      style={{
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 700,
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background:
                          paymentLoading || cartItems.length === 0
                            ? 'var(--color-bg-subtle)'
                            : 'var(--color-success)',
                        color:
                          paymentLoading || cartItems.length === 0
                            ? 'var(--color-text-muted)'
                            : '#fff',
                        boxShadow:
                          paymentLoading || cartItems.length === 0
                            ? 'none'
                            : '0 2px 10px rgba(22, 163, 74, 0.28)',
                        height: '42px',
                      }}
                    >
                      {paymentLoading ? (
                        <div
                          className="rounded-full animate-spin"
                          style={{ width: 15, height: 15, border: '2px solid #fff', borderTopColor: 'transparent' }}
                        />
                      ) : (
                        <DollarSign style={{ width: 15, height: 15 }} />
                      )}
                      {paymentLoading ? 'Processing…' : `Pay GHS ${safeNumber(finalTotal).toFixed(2)}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RECEIPT MODAL ────────────────────────────────────────────────── */}
      {showReceipt && lastTransaction && (
        <>
          {/* Modal Overlay */}
          <ReceiptModal
            transaction={lastTransaction}
            customerName={customerName}
            customerPhone={customerPhone}
            onClose={() => setShowReceipt(false)}
            onPrint={handlePrintReceipt}
          />
          
          {/* Hidden print content for react-to-print */}
          <div style={{ display: 'none' }}>
            <div ref={receiptPrintRef}>
              <ReceiptModal
                transaction={lastTransaction}
                customerName={customerName}
                customerPhone={customerPhone}
                onClose={() => {}}
                onPrint={() => {}}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
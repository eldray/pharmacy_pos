// src/components/POSInterface.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, ShoppingCart, Trash2, DollarSign,
  Plus, Minus, Scan, User, Phone
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product, CartItem, PaymentMethod, Transaction } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { Card } from './ui/Card';

const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

/* ─── Stock badge helper ─────────────────────────────────────────────────── */
const StockBadge: React.FC<{ quantity: number }> = ({ quantity }) => {
  const style: React.CSSProperties =
    quantity > 10
      ? { background: 'var(--color-success-light)', color: 'var(--color-success-text)' }
      : quantity > 0
        ? { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }
        : { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' };

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={style}>
      {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}
    </span>
  );
};

/* ─── Product Card ───────────────────────────────────────────────────────── */
const ProductCard: React.FC<{ product: Product; onClick: () => void }> = ({ product, onClick }) => (
  <div
    onClick={onClick}
    className="rounded-xl p-4 cursor-pointer transition-all duration-150"
    style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLElement;
      el.style.borderColor = 'var(--color-accent)';
      el.style.boxShadow = 'var(--shadow-md)';
      el.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLElement;
      el.style.borderColor = 'var(--color-border)';
      el.style.boxShadow = 'var(--shadow-sm)';
      el.style.transform = 'translateY(0)';
    }}
  >
    <h4 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
      {product.name}
    </h4>
    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
      {product.category}
    </p>
    <div className="flex items-center justify-between mt-3 gap-2">
      <StockBadge quantity={product.quantity} />
      <span className="text-sm font-bold" style={{ color: 'var(--color-accent-text)' }}>
        GHS {safeNumber(product.unitPrice).toFixed(2)}
      </span>
    </div>
  </div>
);

/* ─── Input helper ───────────────────────────────────────────────────────── */
const FieldInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({
  label, ...props
}) => (
  <div>
    {label && (
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
    )}
    <input
      {...props}
      className="input-base w-full px-3 py-2 text-sm"
      style={{
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-input-text)',
        ...props.style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--color-input-border-focus)';
        e.target.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
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

  const {
    fetchProducts, products,
    cartItems, addToCart, updateCartItem, removeFromCart, clearCart,
    getCartTotal, addTransaction,
  } = useAppStore();

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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

  const handleAddProduct = (product: Product) => {
    if (!product.id) { alert('Error: Product missing ID'); return; }
    if (product.quantity <= 0) { alert('Product out of stock'); return; }
    addToCart(product, 1);
    setSearchQuery('');
  };

  const handleQtyChange = (cartId: string, qty: number) => {
    if (qty < 1) removeFromCart(cartId);
    else updateCartItem(cartId, qty);
  };

  const { subtotal, tax } = getCartTotal();
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal - discountAmount + tax;

  const handlePayment = async () => {
    if (cartItems.length === 0) { alert('Cart is empty'); return; }
    if (selectedPayment !== 'cash' && !mobileMoneyNumber) { alert('Please enter mobile money number'); return; }
    if (selectedPayment !== 'cash' && mobileMoneyNumber.length < 10) { alert('Please enter a valid phone number'); return; }

    setPaymentLoading(true);
    try {
      const txn = await addTransaction({
        items: cartItems.map((i) => ({
          productId: i.productId, productName: i.product.name,
          productSku: i.product.sku, productCategory: i.product.category,
          quantity: i.quantity, unitPrice: i.unitPrice,
          total: i.total, discount: i.discount || 0,
        })),
        subtotal, tax, total: finalTotal,
        paymentMethod: selectedPayment,
        paymentReference: selectedPayment !== 'cash'
          ? `${selectedPayment.toUpperCase()}-${mobileMoneyNumber}` : undefined,
        discount: discountAmount,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });

      if (txn) {
        setLastTransaction(txn);
        setShowReceipt(true);
        clearCart();
        setDiscountPercent(0);
        setMobileMoneyNumber('');
        setCustomerName('');
        setCustomerPhone('');
      } else {
        alert('Transaction failed');
      }
    } catch {
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div
            className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
          />
          <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  const displayedProducts = searchQuery.trim() ? searchResults : products;

  return (
    <div className="space-y-5">

      {/* Header banner */}
      <div className="rounded-2xl p-5 shadow-md" style={{ background: 'var(--gradient-brand)' }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-inverse)' }}>
          Point of Sale
        </h1>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: <Scan className="h-4 w-4" />, text: 'Ready to Scan' },
            { icon: <ShoppingCart className="h-4 w-4" />, text: `Products: ${products.length}` },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--color-text-inverse)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {icon}
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Products panel ─────────────────────────────────────────── */}
        <div className="xl:col-span-2">
          <Card noPadding>
            <div className="p-5">
              {/* Search */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Search — Name, SKU, Barcode or Category
                  </label>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
                  >
                    {products.length} products
                  </span>
                </div>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchResults[0] && handleAddProduct(searchResults[0])}
                    placeholder="Type to search or scan barcode…"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm"
                    style={{
                      background: 'var(--color-input-bg)',
                      border: '1px solid var(--color-input-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-input-text)',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-input-border-focus)';
                      e.target.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-input-border)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Results header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {searchQuery.trim() ? 'Search Results' : 'Available Products'}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: searchQuery.trim() ? 'var(--color-info-light)' : 'var(--color-bg-subtle)',
                    color: searchQuery.trim() ? 'var(--color-info-text)' : 'var(--color-text-muted)',
                  }}
                >
                  {displayedProducts.length} {searchQuery.trim() ? 'found' : 'total'}
                </span>
              </div>

              {/* Grid */}
              {displayedProducts.length === 0 && searchQuery.trim() ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                  No products match "{searchQuery}"
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} onClick={() => handleAddProduct(p)} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Cart panel ─────────────────────────────────────────────── */}
        <div className="xl:col-span-1">
          <div className="sticky top-20">
            <Card noPadding style={{ boxShadow: 'var(--shadow-lg)' }}>

              {/* Cart header */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-t-xl"
                style={{
                  background: 'var(--color-accent-light)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    <ShoppingCart className="h-4 w-4" style={{ color: 'var(--color-accent-fg)' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      Cart
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cartItems.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-danger-text)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                      }}
                      title="Clear cart"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--gradient-accent)', color: 'var(--color-accent-fg)' }}
                  >
                    {cartItems.length}
                  </span>
                </div>
              </div>

              <div className="p-4">
                {cartItems.length === 0 ? (
                  /* Empty state */
                  <div className="text-center py-10">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'var(--color-bg-subtle)' }}
                    >
                      <ShoppingCart className="h-6 w-6" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      Cart is empty
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Add products to get started
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cart items */}
                    <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
                      {cartItems.map((item) => (
                        <div
                          key={item.cartId}
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{
                            background: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {item.product.name}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              GHS {safeNumber(item.unitPrice).toFixed(2)} each
                            </p>
                            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--color-accent-text)' }}>
                              GHS {safeNumber(item.total).toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            {/* Minus */}
                            <button
                              onClick={() => handleQtyChange(item.cartId, item.quantity - 1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
                            >
                              <Minus className="h-3 w-3" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>

                            <span
                              className="w-7 text-center text-xs font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {item.quantity}
                            </span>

                            {/* Plus */}
                            <button
                              onClick={() => handleQtyChange(item.cartId, item.quantity + 1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-success-light)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
                            >
                              <Plus className="h-3 w-3" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>

                            {/* Remove */}
                            <button
                              onClick={() => removeFromCart(item.cartId)}
                              className="w-6 h-6 rounded-md flex items-center justify-center ml-1 transition-colors"
                              style={{ color: 'var(--color-danger-text)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-light)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Customer info */}
                    <div className="space-y-2 mb-4">
                      <FieldInput
                        label="Customer Name (optional)"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                      />
                      <FieldInput
                        label="Customer Phone (optional)"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>

                    {/* Discount */}
                    <div className="mb-4">
                      <FieldInput
                        label="Discount (%)"
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) =>
                          setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                        }
                      />
                    </div>

                    {/* Totals */}
                    <div
                      className="space-y-2 mb-4 p-3 rounded-xl"
                      style={{
                        background: 'var(--color-accent-light)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {[
                        { label: 'Subtotal', value: `GHS ${safeNumber(subtotal).toFixed(2)}`, color: 'var(--color-text-primary)' },
                        ...(discountAmount > 0 ? [{ label: 'Discount', value: `-GHS ${safeNumber(discountAmount).toFixed(2)}`, color: 'var(--color-success-text)' }] : []),
                        { label: 'VAT (15%)', value: `GHS ${safeNumber(tax).toFixed(2)}`, color: 'var(--color-text-primary)' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span style={{ color: 'var(--color-text-secondary)' }}>{label}:</span>
                          <span className="font-semibold" style={{ color }}>{value}</span>
                        </div>
                      ))}
                      <div
                        className="flex justify-between text-sm font-bold pt-2"
                        style={{ borderTop: '1px solid var(--color-border)' }}
                      >
                        <span style={{ color: 'var(--color-text-primary)' }}>Total:</span>
                        <span style={{ color: 'var(--color-accent-text)' }}>
                          GHS {safeNumber(finalTotal).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Payment Method
                      </label>
                      <select
                        value={selectedPayment}
                        onChange={(e) => setSelectedPayment(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 text-sm"
                        style={{
                          background: 'var(--color-input-bg)',
                          border: '1px solid var(--color-input-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-input-text)',
                          outline: 'none',
                        }}
                      >
                        <option value="cash">Cash</option>
                        <option value="mtn">MTN Mobile Money</option>
                        <option value="vodafone">Vodafone Cash</option>
                        <option value="airteltigo">AirtelTigo Money</option>
                      </select>

                      {selectedPayment !== 'cash' && (
                        <div className="mt-2">
                          <FieldInput
                            type="tel"
                            value={mobileMoneyNumber}
                            onChange={(e) => setMobileMoneyNumber(e.target.value)}
                            placeholder="Phone number (e.g. 0551234567)"
                          />
                        </div>
                      )}
                    </div>

                    {/* Pay button */}
                    <button
                      onClick={handlePayment}
                      disabled={paymentLoading || cartItems.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                      style={{
                        background: paymentLoading || cartItems.length === 0
                          ? 'var(--color-bg-subtle)'
                          : 'linear-gradient(135deg, var(--color-success) 0%, #059669 100%)',
                        color: paymentLoading || cartItems.length === 0
                          ? 'var(--color-text-muted)'
                          : '#fff',
                        cursor: paymentLoading ? 'not-allowed' : 'pointer',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      <DollarSign className="h-4 w-4" />
                      {paymentLoading
                        ? 'Processing…'
                        : `Pay GHS ${safeNumber(finalTotal).toFixed(2)}`}
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {showReceipt && lastTransaction && (
        <ReceiptModal
          transaction={lastTransaction}
          customerName={customerName}
          customerPhone={customerPhone}
          onClose={() => setShowReceipt(false)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
};
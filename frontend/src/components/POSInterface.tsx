// src/components/POSInterface.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X,
  User, Shield, CheckCircle, ClipboardList, Banknote,
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product, InsuranceProvider, Customer, CustomerInsurance } from '../types';
import api, { getErrorMessage } from '../api/api';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { ReceiptModal } from './ReceiptModal';
import { SalesOrder } from '../types';

const safeNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

/* ─── Stock badge ──────────────────────────────────────────────────── */
const StockBadge: React.FC<{ quantity: number }> = ({ quantity }) => {
  const style: React.CSSProperties =
    quantity > 10
      ? { background: 'var(--color-success-light)', color: 'var(--color-success-text)' }
      : quantity > 0
        ? { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }
        : { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' };
  return (
    <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', ...style }}>
      {quantity > 0 ? quantity : '0'}
    </span>
  );
};

/* ─── Product card ─────────────────────────────────────────────────── */
const ProductCard: React.FC<{
  product: Product;
  onSelect: (p: Product) => void;
  disabled?: boolean;
}> = React.memo(({ product, onSelect, disabled }) => {
  const outOfStock = product.quantity <= 0;
  const blocked = outOfStock || disabled;
  const price = safeNum(product.sellingPrice || product.unitPrice);
  return (
    <button
      type="button"
      disabled={blocked}
      onClick={() => !blocked && onSelect(product)}
      style={{
        textAlign: 'left',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 12px',
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.5 : 1,
        transition: 'all 100ms',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (blocked) return;
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--color-accent)';
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
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        <p className="truncate" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
          {product.name}
        </p>
        <StockBadge quantity={product.quantity} />
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: '6px' }}>
        <p className="truncate" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{product.category}</p>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>
          GHS {price.toFixed(2)}
        </span>
      </div>
    </button>
  );
});
ProductCard.displayName = 'ProductCard';

/* ─── Qty button ───────────────────────────────────────────────────── */
const QtyBtn: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  ariaLabel: string;
}> = ({ children, onClick, danger, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    style={{
      width: 24, height: 24, borderRadius: '4px',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg-surface)',
      color: danger ? 'var(--color-danger-text)' : 'var(--color-text-secondary)',
      padding: 0, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? 'var(--color-danger-light)' : 'var(--color-bg-subtle)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)'; }}
  >
    {children}
  </button>
);

/* ─── Shared field ─────────────────────────────────────────────────── */
const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, ...props }) => (
  <div>
    {label && (
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
        {label}
      </label>
    )}
    <input
      {...props}
      style={{
        fontSize: '13px',
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: '6px',
        color: 'var(--color-input-text)',
        padding: '8px 12px',
        outline: 'none',
        height: '36px',
        width: '100%',
        transition: 'border-color 100ms',
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

/* ═════════════════════════════════════════════════════════════════════
   Add/Edit Customer Modal — with insurance
   ═════════════════════════════════════════════════════════════════════ */
interface CustomerModalProps {
  open: boolean;
  insuranceProviders: InsuranceProvider[];
  requireInsurance: boolean;
  onCancel: () => void;
  onCreated: (customer: Customer, chosenPolicy: { providerId: string; policyNumber: string }) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  open, insuranceProviders, requireInsurance, onCancel, onCreated,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [providerId, setProviderId] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFullName(''); setPhone(''); setEmail(''); setDob(''); setGender('');
      setAddress(''); setNotes('');
      setProviderId(''); setPolicyNumber(''); setIsPrimary(true);
      setBusy(false); setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    setError('');
    if (!fullName.trim()) return setError('Name is required');
    if (!phone.trim()) return setError('Phone is required');
    if (requireInsurance) {
      if (!providerId) return setError('Insurance provider is required');
      if (!policyNumber.trim()) return setError('Membership / policy number is required');
    }

    setBusy(true);
    try {
      const payload: any = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (providerId && policyNumber.trim()) {
        payload.insurances = [{
          insuranceProviderId: providerId,
          policyNumber: policyNumber.trim(),
          isPrimary,
          status: 'active',
        }];
      }
      const r = await api.post('/customers', payload);
      const created: Customer = r.data;
      onCreated(created, {
        providerId: providerId || '',
        policyNumber: policyNumber.trim(),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', zIndex: 'var(--z-modal)', padding: 16 }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 14, padding: 20,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%', maxWidth: 520,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          Add New Customer
        </h3>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          {requireInsurance
            ? 'Insurance details are required in this mode.'
            : 'Only name and phone are required.'}
        </p>

        {error && (
          <div
            style={{
              padding: '8px 12px', borderRadius: 6, fontSize: 12,
              background: 'var(--color-danger-light)',
              color: 'var(--color-danger-text)',
              border: '1px solid var(--color-danger)',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Name *" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <Field label="Phone *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0XX XXX XXXX" />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Date of Birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                style={{
                  fontSize: 13,
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-input-border)',
                  borderRadius: 6,
                  color: 'var(--color-input-text)',
                  padding: '8px 12px',
                  outline: 'none',
                  height: 36, width: '100%',
                }}
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Field label="Address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="optional" />
          <Field label="Notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="allergies, chronic conditions, etc." />

          <div
            style={{
              marginTop: 6, paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Shield style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Insurance {requireInsurance && <span style={{ color: 'var(--color-danger-text)' }}>*</span>}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                  Provider {requireInsurance && '*'}
                </label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  style={{
                    fontSize: 13,
                    background: 'var(--color-input-bg)',
                    border: '1px solid var(--color-input-border)',
                    borderRadius: 6,
                    color: 'var(--color-input-text)',
                    padding: '8px 12px',
                    outline: 'none',
                    height: 36, width: '100%',
                  }}
                >
                  <option value="">— {requireInsurance ? 'Select provider' : 'No insurance'} —</option>
                  {insuranceProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.coverageType === 'percentage'
                        ? ` (${p.defaultCopayPercent}% co-pay)`
                        : ' (fixed rate)'}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label={`Membership / Policy Number ${requireInsurance ? '*' : ''}`}
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="e.g. NHIS-0012345"
              />

              <label className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                Set as primary insurance
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end" style={{ gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--color-accent)', color: '#fff',
              border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving…' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   Walk-in prompt (Cash mode)
   ═════════════════════════════════════════════════════════════════════ */
const WalkInPrompt: React.FC<{
  open: boolean;
  onCancel: () => void;
  onConfirm: (name: string, phone: string) => void;
  busy: boolean;
}> = ({ open, onCancel, onConfirm, busy }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => { if (open) { setName(''); setPhone(''); } }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', zIndex: 'var(--z-modal)', padding: 16 }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 14, padding: 20,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%', maxWidth: 400,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          Customer Details
        </h3>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14 }}>
          Optional — leave blank to record this as a walk-in customer.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Customer Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Mensah" />
          <Field label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0XX XXX XXXX" />
        </div>

        <div className="flex justify-end" style={{ gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(name.trim(), phone.trim())}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--color-accent)', color: '#fff',
              border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   Main POS Interface
   ═════════════════════════════════════════════════════════════════════ */
type SaleMode = 'cash' | 'insurance';

export const POSInterface: React.FC = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [issuingOrder, setIssuingOrder] = useState(false);
  const [successTrx, setSuccessTrx] = useState('');
  const [editingQty, setEditingQty] = useState<string | null>(null);

  const [saleMode, setSaleMode] = useState<SaleMode>('cash');
  const [showWalkInPrompt, setShowWalkInPrompt] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [customerInsurances, setCustomerInsurances] = useState<CustomerInsurance[]>([]);

  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
  const [policyNumber, setPolicyNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lastCreatedOrder, setLastCreatedOrder] = useState<SalesOrder | null>(null);

  const {
    fetchProducts, products,
    cartItems, addToCart, updateCartItem, removeFromCart, clearCart,
    getCartTotal,
    transactions,
  } = useAppStore();

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    api.get('/insurance/providers').then(r => setInsuranceProviders(r.data || [])).catch(() => { });
  }, []);

  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerSearchResults([]); setShowCustomerDrop(false); return; }
    const timer = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const r = await api.get(`/customers/search?q=${encodeURIComponent(customerSearch)}`);
        setCustomerSearchResults(r.data || []);
        setShowCustomerDrop((r.data || []).length > 0);
      } catch {
        setCustomerSearchResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const insuranceReady =
    saleMode !== 'insurance' || (!!selectedProvider && !!policyNumber.trim());

  const switchMode = (mode: SaleMode) => {
    if (mode === saleMode) return;
    if (cartItems.length > 0) {
      const ok = window.confirm('Switching mode will clear the current cart. Continue?');
      if (!ok) return;
      clearCart();
    }
    setSaleMode(mode);
    setSelectedProvider(null);
    setPolicyNumber('');
    setCustomerInsurances([]);
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerSearch('');
    setFormError('');
  };

  const handlePickCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.fullName);
    setCustomerPhone(c.phone);
    setCustomerSearch(c.fullName);
    setCustomerInsurances(c.insurances || []);

    const list = c.insurances || [];
    const chosen = list.find((i) => i.isPrimary) || list.find((i) => i.status === 'active') || list[0];
    if (chosen) {
      const prov = insuranceProviders.find((p) => String(p.id) === String(chosen.insuranceProviderId));
      if (prov) setSelectedProvider(prov);
      setPolicyNumber(chosen.policyNumber);
    } else {
      setSelectedProvider(null);
      setPolicyNumber('');
    }
    setShowCustomerDrop(false);
  };

  const handleCustomerCreated = (c: Customer, chosen: { providerId: string; policyNumber: string }) => {
    setShowCustomerModal(false);
    setCustomerId(c.id);
    setCustomerName(c.fullName);
    setCustomerPhone(c.phone);
    setCustomerSearch(c.fullName);
    setCustomerInsurances(c.insurances || []);
    if (chosen.providerId) {
      const prov = insuranceProviders.find((p) => String(p.id) === chosen.providerId);
      if (prov) setSelectedProvider(prov);
      setPolicyNumber(chosen.policyNumber);
    }
  };

  const clearCustomer = () => {
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerSearch('');
    setCustomerInsurances([]);
    setSelectedProvider(null);
    setPolicyNumber('');
  };

  const topSellingProducts = useMemo(() => {
    if (transactions.length > 0) {
      const salesCount: Record<string, number> = {};
      transactions.forEach(tx => {
        if (Array.isArray(tx.items)) tx.items.forEach(item => {
          if (item.productId) salesCount[item.productId] = (salesCount[item.productId] || 0) + item.quantity;
        });
      });
      const sorted = Object.entries(salesCount).sort((a, b) => b[1] - a[1]).slice(0, 16)
        .map(([pid]) => products.find(p => p.id === pid)).filter(Boolean) as Product[];
      return sorted.length ? sorted : products.slice(0, 16);
    }
    return products.slice(0, 16);
  }, [transactions, products]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const byBarcode = products.find(p => p.barcode === searchQuery);
    if (byBarcode) return [byBarcode];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const displayedProducts = useMemo(() =>
    searchQuery.trim() ? searchResults : topSellingProducts,
    [searchQuery, searchResults, topSellingProducts]
  );

  const handleAddProduct = React.useCallback((product: Product) => {
    setFormError('');
    if (saleMode === 'insurance' && !insuranceReady) {
      setFormError('Select customer and insurance policy first.');
      return;
    }
    if (!product.id) { setFormError('Product missing ID.'); return; }
    if (product.quantity <= 0) { setFormError(`${product.name} is out of stock.`); return; }
    addToCart(product, 1);
    setSearchQuery('');
  }, [addToCart, saleMode, insuranceReady]);

  const handleQtyChange = (cartId: string, qty: number) => {
    if (qty < 1) removeFromCart(cartId);
    else updateCartItem(cartId, qty);
  };

  const handleScan = React.useCallback((code: string) => {
    const product = products.find(p => p.barcode === code) || products.find(p => p.sku === code);
    if (product) handleAddProduct(product);
    else setFormError(`No product found for scanned code "${code}".`);
  }, [products, handleAddProduct]);

  useBarcodeScanner(handleScan);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { subtotal, tax, taxRate } = getCartTotal();

  /* ═══════════════════════════════════════════════════════════════════
     DUAL CO-PAY MATH — fixed (NHIS) vs percentage (private)
     ═══════════════════════════════════════════════════════════════════ */
  const { insuranceCoverage, copayAmount } = useMemo(() => {
    if (saleMode !== 'insurance' || !selectedProvider) {
      return { insuranceCoverage: 0, copayAmount: subtotal + tax };
    }

    if (selectedProvider.coverageType === 'fixed') {
      // NHIS-style: subtract insurancePrice per unit from each line
      let covered = 0;
      let patientSub = 0;
      cartItems.forEach((item) => {
        const unitPrice = safeNum(item.product.sellingPrice || item.unitPrice);
        const insPrice = safeNum(item.product.insurancePrice);
        const lineTotal = item.quantity * unitPrice;
        // Cap coverage at lineTotal (never overpay)
        const lineCovered = Math.min(lineTotal, insPrice * item.quantity);
        covered += lineCovered;
        patientSub += (lineTotal - lineCovered);
      });
      const patientTax = patientSub * (taxRate / 100);
      return { insuranceCoverage: covered, copayAmount: patientSub + patientTax };
    }

    // Percentage style
    const copayPct = safeNum(selectedProvider.defaultCopayPercent) / 100;
    const patientSub = subtotal * copayPct;
    const patientTax = patientSub * (taxRate / 100);
    return { insuranceCoverage: subtotal - patientSub, copayAmount: patientSub + patientTax };
  }, [saleMode, selectedProvider, subtotal, tax, taxRate, cartItems]);

  const grandTotal = copayAmount;

  const resetForm = () => {
    clearCart();
    clearCustomer();
    setNotes('');
    setSaleMode('cash');
  };

  const submitOrder = async (opts: {
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
  }) => {
    setIssuingOrder(true);
    setFormError('');
    try {
      const items = cartItems.map((i) => ({
        productId: i.productId,
        product: { name: i.product.name, sku: i.product.sku },
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: safeNum(i.product.sellingPrice || i.unitPrice),
        total: i.quantity * safeNum(i.product.sellingPrice || i.unitPrice),
      }));

      const useInsurance = saleMode === 'insurance' && !!selectedProvider;

      const res = await api.post('/orders', {
        items,
        subtotal,
        tax,
        total: grandTotal,
        customerId: opts.customerId || undefined,
        customerName: opts.customerName || undefined,
        customerPhone: opts.customerPhone || undefined,
        insuranceProviderId: useInsurance ? selectedProvider?.id : undefined,
        insuranceProviderName: useInsurance ? selectedProvider?.name : undefined,
        policyNumber: useInsurance ? policyNumber : undefined,
        insuranceCoverage: useInsurance ? insuranceCoverage : 0,
        copayAmount: grandTotal,
        notes: notes || undefined,
      });

      const trx = res.data?.orderNumber || 'N/A';
      setSuccessTrx(trx);
      // ✅ Auto-open print slip
      if (res.data) setLastCreatedOrder(res.data);
      resetForm();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIssuingOrder(false);
    }
  };

  const handleCreateOrder = async () => {
    setFormError('');
    setSuccessTrx('');
    if (cartItems.length === 0) {
      setFormError('Cart is empty — add products first.');
      return;
    }
    if (saleMode === 'insurance') {
      if (!insuranceReady) {
        setFormError('Customer and insurance policy are required.');
        return;
      }
      await submitOrder({ customerId, customerName, customerPhone });
    } else {
      setShowWalkInPrompt(true);
    }
  };

  const handleWalkInConfirm = async (name: string, phone: string) => {
    setShowWalkInPrompt(false);
    await submitOrder({
      customerName: name || undefined,
      customerPhone: phone || undefined,
    });
  };

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 256 }}>
        <div className="text-center">
          <div className="rounded-full animate-spin mx-auto" style={{ width: 32, height: 32, border: '3px solid var(--color-accent)', borderTopColor: 'transparent' }} />
          <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading products…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title + mode toggle */}
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Point of Sale</h1>
          <p style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}>
            {products.length} products available
          </p>
        </div>

        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--color-bg-subtle)', padding: 4, borderRadius: 10,
            border: '1px solid var(--color-border)', minWidth: 260,
          }}
        >
          <button
            type="button"
            onClick={() => switchMode('cash')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 7,
              background: saleMode === 'cash' ? 'var(--color-bg-surface)' : 'transparent',
              color: saleMode === 'cash' ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              boxShadow: saleMode === 'cash' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Banknote style={{ width: 15, height: 15 }} /> Cash
          </button>
          <button
            type="button"
            onClick={() => switchMode('insurance')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 7,
              background: saleMode === 'insurance' ? 'var(--color-bg-surface)' : 'transparent',
              color: saleMode === 'insurance' ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              boxShadow: saleMode === 'insurance' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Shield style={{ width: 15, height: 15 }} /> Insurance
          </button>
        </div>
      </div>

      {/* Success */}
      {successTrx && (
        <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--color-success-light)', border: '1px solid var(--color-success)', color: 'var(--color-success-text)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Sales Order Created</span>
            <span style={{ fontSize: 13 }}>TRX: <strong style={{ fontFamily: 'monospace' }}>{successTrx}</strong></span>
          </div>
          <button onClick={() => setSuccessTrx('')} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderRadius: 6, background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)', fontSize: 13, fontWeight: 500 }}>
          <span>{formError}</span>
          <button onClick={() => setFormError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5" style={{ gap: 16 }}>

        {/* Insurance panel */}
        {saleMode === 'insurance' && (
          <div className="xl:col-span-5">
            <div
              style={{
                background: 'var(--color-bg-surface)',
                border: insuranceReady ? '1px solid var(--color-success)' : '1px solid var(--color-warning)',
                borderRadius: 12, padding: 14,
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <Shield style={{ width: 16, height: 16, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Customer & Insurance
                  </span>
                  {insuranceReady ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-success-light)', color: 'var(--color-success-text)' }}>
                      ✓ Ready
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }}>
                      Required before adding products
                    </span>
                  )}
                </div>

                {customerId && (
                  <button
                    onClick={clearCustomer}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                      background: 'transparent', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)', cursor: 'pointer',
                    }}
                  >
                    Change customer
                  </button>
                )}
              </div>

              {!customerId ? (
                <>
                  <div className="relative" style={{ marginBottom: 8 }}>
                    <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer by name or phone…"
                      style={{
                        fontSize: 13,
                        background: 'var(--color-input-bg)',
                        border: '1px solid var(--color-input-border)',
                        borderRadius: 6, color: 'var(--color-input-text)',
                        padding: '8px 12px 8px 32px', outline: 'none',
                        height: 38, width: '100%',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--color-input-border-focus)'; if (customerSearchResults.length) setShowCustomerDrop(true); }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--color-input-border)'; setTimeout(() => setShowCustomerDrop(false), 180); }}
                    />
                    {customerSearching && (
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--color-text-muted)' }}>…</span>
                    )}

                    {showCustomerDrop && customerSearchResults.length > 0 && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8, boxShadow: 'var(--shadow-lg)',
                          zIndex: 100, maxHeight: 220, overflowY: 'auto', marginTop: 2,
                        }}
                      >
                        {customerSearchResults.map((c) => (
                          <div
                            key={c.id}
                            onMouseDown={() => handlePickCustomer(c)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: 12 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.fullName}</div>
                            <div style={{ color: 'var(--color-text-muted)' }}>
                              {c.phone}
                              {c.insurances && c.insurances.length > 0
                                ? ` · ${c.insurances.length} polic${c.insurances.length === 1 ? 'y' : 'ies'}`
                                : ' · no insurance'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6,
                      background: 'transparent', border: '1px dashed var(--color-border)',
                      color: 'var(--color-accent-text)', cursor: 'pointer', width: '100%',
                    }}
                  >
                    + Add new customer
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="flex items-center justify-between"
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'var(--color-accent-light)',
                      border: '1px solid var(--color-accent)',
                      marginBottom: 10,
                    }}
                  >
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <User style={{ width: 16, height: 16, color: 'var(--color-accent-text)' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-text)' }}>{customerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-accent-text)', opacity: 0.8 }}>{customerPhone}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                        Insurance Provider <span style={{ color: 'var(--color-danger-text)' }}>*</span>
                      </label>
                      <select
                        value={selectedProvider?.id || ''}
                        onChange={(e) => {
                          const prov = insuranceProviders.find((p) => String(p.id) === e.target.value);
                          setSelectedProvider(prov || null);
                        }}
                        style={{
                          fontSize: 13,
                          background: 'var(--color-input-bg)',
                          border: '1px solid var(--color-input-border)',
                          borderRadius: 6, color: 'var(--color-input-text)',
                          padding: '8px 12px', outline: 'none',
                          height: 38, width: '100%',
                        }}
                      >
                        <option value="">— Select provider —</option>
                        {insuranceProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.coverageType === 'percentage'
                              ? ` (${p.defaultCopayPercent}% co-pay)`
                              : ' (fixed rate per product)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Field
                      label="Policy / Card Number *"
                      type="text"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      placeholder="e.g. NHIS-0012345"
                    />
                  </div>

                  {customerInsurances.length > 1 && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
                        Customer has {customerInsurances.length} policies — pick one:
                      </label>
                      <div className="flex flex-wrap" style={{ gap: 6 }}>
                        {customerInsurances.map((ins) => {
                          const prov = insuranceProviders.find((p) => String(p.id) === String(ins.insuranceProviderId));
                          const isActive = policyNumber === ins.policyNumber;
                          return (
                            <button
                              key={ins.id}
                              type="button"
                              onClick={() => {
                                if (prov) setSelectedProvider(prov);
                                setPolicyNumber(ins.policyNumber);
                              }}
                              style={{
                                fontSize: 11, fontWeight: 600, padding: '5px 10px',
                                borderRadius: 6, cursor: 'pointer',
                                background: isActive ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                                border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                              }}
                            >
                              {prov?.name || 'Insurance'} · {ins.policyNumber}
                              {ins.isPrimary && ' · primary'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="xl:col-span-3">
          <div className="relative" style={{ marginBottom: 12 }}>
            <Search className="absolute top-1/2 -translate-y-1/2" style={{ left: 12, width: 16, height: 16, color: 'var(--color-text-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchResults[0] && handleAddProduct(searchResults[0])}
              placeholder={
                saleMode === 'insurance' && !insuranceReady
                  ? 'Select customer & insurance first…'
                  : 'Search by name, SKU, barcode, or category… (F2)'
              }
              autoFocus
              disabled={saleMode === 'insurance' && !insuranceReady}
              style={{
                fontSize: 14,
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                borderRadius: 10,
                color: 'var(--color-input-text)',
                padding: '10px 16px 10px 36px',
                outline: 'none', height: 44, width: '100%',
                opacity: saleMode === 'insurance' && !insuranceReady ? 0.55 : 1,
                cursor: saleMode === 'insurance' && !insuranceReady ? 'not-allowed' : 'text',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-input-border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--color-input-border)'; e.target.style.boxShadow = 'none'; }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute top-1/2 -translate-y-1/2" style={{ right: 12, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {searchQuery.trim() ? 'Search Results' : 'Top Selling Products'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: searchQuery.trim() ? 'var(--color-info-light)' : 'var(--color-accent-light)', color: searchQuery.trim() ? 'var(--color-info-text)' : 'var(--color-accent-text)' }}>
              {displayedProducts.length}
            </span>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="text-center" style={{ padding: '40px 0' }}>
              <Search style={{ width: 28, height: 28, margin: '0 auto', color: 'var(--color-text-muted)', opacity: 0.4 }} />
              <p style={{ fontSize: 13, marginTop: 12, color: 'var(--color-text-muted)' }}>
                {searchQuery.trim() ? `No products match "${searchQuery}"` : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: 8 }}>
              {displayedProducts.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={handleAddProduct} disabled={saleMode === 'insurance' && !insuranceReady} />
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="xl:col-span-2">
          <div className="sticky" style={{ top: 'calc(var(--navbar-height) + 12px)' }}>
            <div
              className="overflow-hidden"
              style={{
                borderRadius: 14, background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)',
                maxHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column',
              }}
            >
              <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <ShoppingCart style={{ width: 16, height: 16, color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Order Cart</span>
                  {cartItems.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 6, background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                      {cartItems.length}
                    </span>
                  )}
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 6, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-danger-text)'; el.style.background = 'var(--color-danger-light)'; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-text-muted)'; el.style.background = 'transparent'; }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div style={{ padding: '12px 14px', flex: 1, overflowY: 'auto' }}>
                {cartItems.length === 0 ? (
                  <div className="text-center" style={{ padding: '40px 0' }}>
                    <div className="flex items-center justify-center mx-auto" style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--color-bg-subtle)', marginBottom: 12 }}>
                      <ShoppingCart style={{ width: 18, height: 18, color: 'var(--color-text-muted)' }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Cart is empty</p>
                    <p style={{ fontSize: 11, marginTop: 2, color: 'var(--color-text-muted)' }}>Search or tap a product to add</p>
                  </div>
                ) : (
                  <>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px 70px 24px', gap: 4, padding: '6px 8px', background: 'var(--color-bg-subtle)', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <span>Item</span>
                        <span style={{ textAlign: 'center' }}>Qty</span>
                        <span style={{ textAlign: 'right' }}>Total</span>
                        <span></span>
                      </div>

                      <div style={{ maxHeight: '34vh', overflowY: 'auto' }}>
                        {cartItems.map((item) => {
                          const unitPrice = safeNum(item.product.sellingPrice || item.unitPrice);
                          const lineTotal = item.quantity * unitPrice;
                          return (
                            <div
                              key={item.cartId}
                              style={{ display: 'grid', gridTemplateColumns: '1fr 84px 70px 24px', gap: 4, padding: '7px 8px', borderTop: '1px solid var(--color-border)', alignItems: 'center' }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{item.product.name}</p>
                                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>GHS {unitPrice.toFixed(2)} ea</p>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                                <QtyBtn ariaLabel={`Decrease ${item.product.name}`} onClick={() => handleQtyChange(item.cartId, item.quantity - 1)}>
                                  <Minus style={{ width: 11, height: 11 }} />
                                </QtyBtn>
                                {editingQty === item.cartId ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    defaultValue={item.quantity}
                                    onBlur={(e) => {
                                      const q = parseInt(e.target.value);
                                      if (!isNaN(q)) handleQtyChange(item.cartId, q);
                                      setEditingQty(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const q = parseInt((e.target as HTMLInputElement).value);
                                        if (!isNaN(q)) handleQtyChange(item.cartId, q);
                                        setEditingQty(null);
                                      }
                                    }}
                                    style={{ width: 34, height: 24, textAlign: 'center', fontSize: 12, fontWeight: 700, border: '1px solid var(--color-border)', borderRadius: 4, background: 'var(--color-accent-light)', color: 'var(--color-text-primary)', outline: 'none' }}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingQty(item.cartId)}
                                    style={{ width: 34, height: 24, borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', cursor: 'text', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    {item.quantity}
                                  </button>
                                )}
                                <QtyBtn ariaLabel={`Increase ${item.product.name}`} onClick={() => handleQtyChange(item.cartId, item.quantity + 1)}>
                                  <Plus style={{ width: 11, height: 11 }} />
                                </QtyBtn>
                              </div>

                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {lineTotal.toFixed(2)}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeFromCart(item.cartId)}
                                style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 2 }}
                                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-danger-text)'; el.style.opacity = '1'; }}
                                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-text-muted)'; el.style.opacity = '0.5'; }}
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {saleMode === 'insurance' && selectedProvider && (
                      <div style={{ marginTop: 10, background: 'var(--color-info-light)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--color-info-text)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          Co-Pay Breakdown
                          {selectedProvider.coverageType === 'fixed' && ' (fixed rate per product)'}
                        </div>
                        <div className="flex justify-between"><span>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between">
                          <span>
                            Insurance covers
                            {selectedProvider.coverageType === 'percentage' && ` (${100 - safeNum(selectedProvider.defaultCopayPercent)}%)`}
                          </span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {insuranceCoverage.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontWeight: 700, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--color-info)' }}>
                          <span>
                            Patient Pays
                            {selectedProvider.coverageType === 'percentage' && ` (${selectedProvider.defaultCopayPercent}%)`}
                          </span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {copayAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="flex justify-between" style={{ fontSize: 13 }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>GHS {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between" style={{ fontSize: 13 }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>VAT {taxRate}%</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>GHS {tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between" style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {saleMode === 'insurance' && selectedProvider ? 'Patient Pays' : 'Total'}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent-text)', fontVariantNumeric: 'tabular-nums' }}>
                          GHS {grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Prescription notes, doctor, etc."
                        rows={2}
                        style={{ fontSize: 13, background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 6, color: 'var(--color-input-text)', padding: '8px 12px', outline: 'none', width: '100%', resize: 'vertical' }}
                      />
                    </div>

                    <button
                      onClick={handleCreateOrder}
                      disabled={issuingOrder || cartItems.length === 0}
                      className="flex items-center justify-center w-full gap-2 font-bold"
                      style={{ marginTop: 12, background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, cursor: issuingOrder || cartItems.length === 0 ? 'not-allowed' : 'pointer', opacity: cartItems.length === 0 ? 0.45 : 1 }}
                    >
                      <ClipboardList style={{ width: 18, height: 18 }} />
                      {issuingOrder ? 'Creating Order…' : 'Create Sales Order'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <WalkInPrompt
        open={showWalkInPrompt}
        busy={issuingOrder}
        onCancel={() => setShowWalkInPrompt(false)}
        onConfirm={handleWalkInConfirm}
      />

      <CustomerModal
        open={showCustomerModal}
        insuranceProviders={insuranceProviders}
        requireInsurance={saleMode === 'insurance'}
        onCancel={() => setShowCustomerModal(false)}
        onCreated={handleCustomerCreated}
      />

      {lastCreatedOrder && (
        <ReceiptModal
          doc={lastCreatedOrder}
          mode="order"
          onClose={() => setLastCreatedOrder(null)}
          onPrint={undefined} // internal print fallback
        />
      )}
    </div>
  );
};
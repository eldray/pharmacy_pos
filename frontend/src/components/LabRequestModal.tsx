// src/components/LabRequestModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, FlaskConical, User, Search, Minus, Plus, Trash2,
    Package, Shield, Info,
} from 'lucide-react';
import { useAppStore } from '../store';
import { LabTestTemplate, Customer, InsuranceProvider, LabTransaction } from '../types';
import api, { getErrorMessage } from '../api/api';

interface LabRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called with the created order (or null on failure). */
    onSuccess: (createdOrder?: LabTransaction | null) => void;
}

interface SelectedTest {
    template: LabTestTemplate;
    quantity: number;
}

const Num: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
    children, className = '', style,
}) => (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>
);

const QtyBtn: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({
    onClick, children, disabled,
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center justify-center transition-colors duration-100 cursor-pointer"
        style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', padding: 0 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)')}
    >
        {children}
    </button>
);

/* ═══ Add New Patient Modal ═══ */
const LabCustomerModal: React.FC<{
    open: boolean;
    insuranceProviders: InsuranceProvider[];
    onCancel: () => void;
    onCreated: (c: Customer) => void;
}> = ({ open, insuranceProviders, onCancel, onCreated }) => {
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
            setFullName(''); setPhone(''); setEmail(''); setDob('');
            setGender(''); setAddress(''); setNotes('');
            setProviderId(''); setPolicyNumber(''); setIsPrimary(true);
            setBusy(false); setError('');
        }
    }, [open]);

    if (!open) return null;

    const handleSave = async () => {
        setError('');
        if (!fullName.trim()) return setError('Name is required');
        if (!phone.trim()) return setError('Phone is required');

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
            onCreated(r.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const fieldStyle: React.CSSProperties = {
        fontSize: 13, background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: 6, color: 'var(--color-input-text)',
        padding: '8px 12px', outline: 'none', height: 36, width: '100%',
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)', zIndex: 'calc(var(--z-modal) + 1)', padding: 16 }}
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-bg-elevated)', borderRadius: 14, padding: 20,
                    border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)',
                    width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
                }}
            >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Add New Patient</h3>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Name and phone are required.</p>

                {error && (
                    <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 12, background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)', marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Name *</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={fieldStyle} placeholder="Full name" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Phone *</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldStyle} placeholder="0XX XXX XXXX" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} placeholder="optional" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Date of Birth</label>
                            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={fieldStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Gender</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value as any)} style={fieldStyle}>
                                <option value="">—</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Address</label>
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={fieldStyle} placeholder="optional" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Notes</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} style={fieldStyle} placeholder="allergies, chronic conditions, etc." />
                    </div>

                    <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                            <Shield style={{ width: 14, height: 14, color: 'var(--color-text-secondary)' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>Insurance (optional)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Provider</label>
                                <select value={providerId} onChange={(e) => setProviderId(e.target.value)} style={fieldStyle}>
                                    <option value="">— No insurance —</option>
                                    {insuranceProviders.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                            {p.coverageType === 'percentage' ? ` (${p.defaultCopayPercent}% co-pay)` : ' (fixed rate)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Membership / Policy Number</label>
                                <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} style={fieldStyle} placeholder="e.g. NHIS-0012345" />
                            </div>
                            <label className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                                Set as primary insurance
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end" style={{ gap: 8, marginTop: 18 }}>
                    <button type="button" onClick={onCancel} disabled={busy} style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={busy} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--color-accent)', color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Saving…' : 'Save Patient'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══ Main Lab Request Modal ═══ */
export const LabRequestModal: React.FC<LabRequestModalProps> = ({
    isOpen, onClose, onSuccess,
}) => {
    // ✅ Use addLabServiceOrder — the correct endpoint
    const {
        labTestTemplates,
        addLabTransaction,          // ⬅ was addLabServiceOrder
        fetchLabTestTemplates,
    } = useAppStore();

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [notes, setNotes] = useState('');

    const [customerId, setCustomerId] = useState<string>('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAge, setCustomerAge] = useState<number | null>(null);
    const [customerGender, setCustomerGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
    const [customerEmail, setCustomerEmail] = useState('');

    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<Customer[]>([]);
    const [customerSearching, setCustomerSearching] = useState(false);
    const [showCustomerDrop, setShowCustomerDrop] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);

    const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
    const [policyNumber, setPolicyNumber] = useState('');
    const [useInsurance, setUseInsurance] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const customerDropRef = useRef<HTMLDivElement>(null);

    const safeNumber = (v: any): number => {
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    };

    const computeAge = (dob?: string) => {
        if (!dob) return null;
        const d = new Date(dob);
        if (isNaN(d.getTime())) return null;
        return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    };

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
            if (customerDropRef.current && !customerDropRef.current.contains(e.target as Node)) setShowCustomerDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        fetchLabTestTemplates();
        api.get('/insurance/providers').then(r => setInsuranceProviders(r.data || [])).catch(() => { });
        setSearchQuery('');
        setShowDropdown(false);
        setSelectedTests([]);
        setNotes('');
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAge(null);
        setCustomerGender(null);
        setCustomerEmail('');
        setCustomerSearch('');
        setCustomerResults([]);
        setShowCustomerModal(false);
        setSelectedProvider(null);
        setPolicyNumber('');
        setUseInsurance(false);
    }, [isOpen, fetchLabTestTemplates]);

    useEffect(() => {
        if (!isOpen) return;
        if (!customerSearch.trim() || customerId) {
            setCustomerResults([]);
            setShowCustomerDrop(false);
            return;
        }
        const t = setTimeout(async () => {
            setCustomerSearching(true);
            try {
                const r = await api.get(`/customers/search?q=${encodeURIComponent(customerSearch)}`);
                setCustomerResults(r.data || []);
                setShowCustomerDrop((r.data || []).length > 0);
            } catch {
                setCustomerResults([]);
            } finally {
                setCustomerSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [customerSearch, isOpen, customerId]);

    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return labTestTemplates;
        const q = searchQuery.toLowerCase();
        return labTestTemplates.filter((t) =>
            t.name?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        );
    }, [labTestTemplates, searchQuery]);

    const isTemplateAdded = (id: string) => selectedTests.some((t) => t.template.id === id);

    const handleTemplateSelect = (template: LabTestTemplate) => {
        if (isTemplateAdded(template.id)) return;
        setSelectedTests([...selectedTests, { template, quantity: 1 }]);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const removeTest = (id: string) => setSelectedTests(selectedTests.filter((t) => t.template.id !== id));

    const updateQuantity = (id: string, q: number) => {
        if (q < 1) return;
        setSelectedTests(selectedTests.map((t) => (t.template.id === id ? { ...t, quantity: q } : t)));
    };

    const calculateTotal = () =>
        selectedTests.reduce((sum, t) => sum + safeNumber(t.template.price) * t.quantity, 0);

    /* Dual co-pay math (for display) */
    const { insuranceCoverage, copayAmount } = useMemo(() => {
        const subtotal = calculateTotal();
        if (!useInsurance || !selectedProvider) {
            return { insuranceCoverage: 0, copayAmount: subtotal };
        }

        if (selectedProvider.coverageType === 'fixed') {
            let covered = 0;
            let patientSub = 0;
            selectedTests.forEach(({ template, quantity }) => {
                const lineTotal = safeNumber(template.price) * quantity;
                const insPrice = safeNumber(template.insurancePrice);
                const lineCovered = Math.min(lineTotal, insPrice * quantity);
                covered += lineCovered;
                patientSub += (lineTotal - lineCovered);
            });
            return { insuranceCoverage: covered, copayAmount: patientSub };
        }

        const copayPct = safeNumber(selectedProvider.defaultCopayPercent) / 100;
        const patientSub = subtotal * copayPct;
        return { insuranceCoverage: subtotal - patientSub, copayAmount: patientSub };
    }, [selectedTests, useInsurance, selectedProvider]);

    const applyCustomer = (c: Customer) => {
        setCustomerId(c.id);
        setCustomerName(c.fullName);
        setCustomerPhone(c.phone || '');
        setCustomerEmail(c.email || '');
        setCustomerAge(computeAge(c.dob));
        setCustomerGender(
            c.gender === 'male' ? 'Male' : c.gender === 'female' ? 'Female' : c.gender === 'other' ? 'Other' : null
        );
        setCustomerSearch(c.fullName);
        const list = c.insurances || [];
        const chosen = list.find((i) => i.isPrimary) || list.find((i) => i.status === 'active') || list[0];
        if (chosen) {
            const prov = insuranceProviders.find((p) => String(p.id) === String(chosen.insuranceProviderId));
            if (prov) {
                setSelectedProvider(prov);
                setPolicyNumber(chosen.policyNumber);
                setUseInsurance(true);
            }
        }
        setShowCustomerDrop(false);
    };

    const clearCustomer = () => {
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAge(null);
        setCustomerGender(null);
        setCustomerSearch('');
        setCustomerResults([]);
        setSelectedProvider(null);
        setPolicyNumber('');
        setUseInsurance(false);
    };

    const handleCustomerCreated = (c: Customer) => {
        setShowCustomerModal(false);
        applyCustomer(c);
    };

    /* Submit — creates a LAB SERVICE ORDER (not a LabTransaction) */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId) { alert('Please select or create a patient first'); return; }
        if (selectedTests.length === 0) { alert('Please select at least one test'); return; }

        setLoading(true);
        try {
            const total = calculateTotal();
            const useIns = useInsurance && !!selectedProvider;

            const created = await addLabTransaction({
                customerId,
                patientName: customerName,
                patientPhone: customerPhone || null,
                patientEmail: customerEmail || null,
                patientAge: customerAge,
                patientGender: customerGender || 'Male',
                subtotal: total,
                tax: 0,
                totalAmount: total,
                paidAmount: 0,
                insuranceProviderId: useIns ? selectedProvider!.id : null,
                insuranceProviderName: useIns ? selectedProvider!.name : null,
                policyNumber: useIns ? policyNumber : null,
                insuranceCoverage: useIns ? insuranceCoverage : 0,
                copayAmount: useIns ? copayAmount : total,
                notes: notes || null,
                // 'pending' = awaiting cashier payment. The cashier flips this to 'paid'.
                status: 'pending',
                paymentStatus: 'pending',
                tests: selectedTests.map((st) => ({
                    testType: st.template.name,
                    testCategory: st.template.category,
                    testPrice: safeNumber(st.template.price) * st.quantity,
                    quantity: st.quantity,
                    sampleType: st.template.sampleType || null,
                    priority: 'normal',
                })),
            });

            if (created) {
                onSuccess(created);
                onClose();
            } else {
                alert('Failed to create lab order');
            }
        } catch (err) {
            alert(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const total = calculateTotal();
    const grandTotal = useInsurance && selectedProvider ? copayAmount : total;

    const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
    };
    const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border)';
        e.currentTarget.style.boxShadow = 'none';
    };
    const fieldStyle: React.CSSProperties = {
        background: 'var(--color-input-bg)',
        border: '1px solid var(--color-input-border)',
        borderRadius: 6, color: 'var(--color-input-text)',
        outline: 'none', fontSize: 13,
        padding: '8px 12px', width: '100%', height: 38,
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal)' }}
            onClick={onClose}
        >
            <div
                className="rounded-[12px] overflow-hidden"
                style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                    width: '100%', maxWidth: 680, maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                            <FlaskConical className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-[0.85rem] font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>Request Lab Tests</h2>
                            <p className="text-[0.65rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {selectedTests.length > 0 ? `${selectedTests.length} test${selectedTests.length > 1 ? 's' : ''} selected` : 'Search and select tests'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center flex-shrink-0 cursor-pointer"
                        style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="p-5 space-y-5 flex-1">

                        {/* Patient */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <User className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-text)' }} />
                                <span className="text-[0.75rem] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Patient</span>
                            </div>

                            {customerId ? (
                                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-accent-light)', border: '1px solid var(--color-accent)' }}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <User className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent-text)' }} />
                                        <div className="min-w-0">
                                            <p className="text-[0.8rem] font-semibold truncate" style={{ color: 'var(--color-accent-text)' }}>{customerName}</p>
                                            <p className="text-[0.7rem] truncate" style={{ color: 'var(--color-accent-text)', opacity: 0.85 }}>
                                                {customerPhone}
                                                {customerAge ? ` · ${customerAge}y` : ''}
                                                {customerGender ? ` · ${customerGender}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={clearCustomer} className="text-[0.7rem] font-semibold px-2.5 py-1 rounded cursor-pointer flex-shrink-0" style={{ background: 'transparent', color: 'var(--color-accent-text)', border: '1px solid var(--color-accent)' }}>
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div ref={customerDropRef} style={{ position: 'relative', marginBottom: 8 }}>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                                            <input
                                                type="text"
                                                value={customerSearch}
                                                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                                                placeholder="Search existing patient by name or phone…"
                                                autoComplete="off"
                                                style={{ ...fieldStyle, paddingLeft: 32 }}
                                                onFocus={(e) => { onFieldFocus(e); setShowCustomerDrop(true); }}
                                                onBlur={onFieldBlur}
                                            />
                                            {customerSearching && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem]" style={{ color: 'var(--color-text-muted)' }}>…</span>
                                            )}
                                        </div>

                                        {showCustomerDrop && customerResults.length > 0 && (
                                            <div className="absolute z-20 mt-1 rounded-lg overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)', width: '100%', maxHeight: 220, overflowY: 'auto', left: 0 }}>
                                                {customerResults.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => applyCustomer(c)}
                                                        className="w-full text-left px-3 py-2 cursor-pointer"
                                                        style={{ borderBottom: '1px solid var(--color-border)', background: 'transparent', border: 'none', color: 'inherit' }}
                                                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)')}
                                                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                                                    >
                                                        <div className="font-medium text-[0.82rem]" style={{ color: 'var(--color-text-primary)' }}>{c.fullName}</div>
                                                        <div className="text-[0.7rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                                            {c.phone}
                                                            {c.insurances && c.insurances.length > 0 ? ` · ${c.insurances.length} polic${c.insurances.length === 1 ? 'y' : 'ies'}` : ''}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowCustomerModal(true)}
                                        className="w-full text-left px-3 py-2 rounded-md text-[0.72rem] font-semibold cursor-pointer"
                                        style={{ background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-accent-text)' }}
                                    >
                                        + Add new patient
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Insurance */}
                        {customerId && (
                            <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-text)' }} />
                                    <span className="text-[0.75rem] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Insurance</span>
                                    <label className="flex items-center gap-1.5 ml-auto" style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={useInsurance} onChange={(e) => setUseInsurance(e.target.checked)} />
                                        Apply insurance
                                    </label>
                                </div>

                                {useInsurance && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[0.68rem] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Provider</label>
                                            <select
                                                value={selectedProvider?.id || ''}
                                                onChange={(e) => {
                                                    const prov = insuranceProviders.find((p) => String(p.id) === e.target.value);
                                                    setSelectedProvider(prov || null);
                                                }}
                                                style={{ ...fieldStyle, cursor: 'pointer' }}
                                                onFocus={onFieldFocus}
                                                onBlur={onFieldBlur}
                                            >
                                                <option value="">— Select provider —</option>
                                                {insuranceProviders.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                        {p.coverageType === 'percentage' ? ` (${p.defaultCopayPercent}% co-pay)` : ' (fixed rate)'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[0.68rem] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Policy Number</label>
                                            <input
                                                type="text"
                                                value={policyNumber}
                                                onChange={(e) => setPolicyNumber(e.target.value)}
                                                placeholder="e.g. NHIS-0012345"
                                                style={fieldStyle}
                                                onFocus={onFieldFocus}
                                                onBlur={onFieldBlur}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search tests */}
                        <div ref={dropdownRef} style={{ position: 'relative' }}>
                            <label className="block text-[0.7rem] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Search tests</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                                    placeholder="e.g. CBC, Malaria, Glucose…"
                                    autoComplete="off"
                                    style={{ ...fieldStyle, paddingLeft: 32 }}
                                    onFocus={(e) => { onFieldFocus(e); setShowDropdown(true); }}
                                    onBlur={onFieldBlur}
                                />
                            </div>
                            {showDropdown && searchQuery && (
                                <div className="absolute z-20 mt-1 rounded-lg overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)', width: '100%', maxHeight: 200, overflowY: 'auto', left: 0 }}>
                                    {filteredTemplates.length === 0 ? (
                                        <div className="px-3 py-3 text-center text-[0.78rem]" style={{ color: 'var(--color-text-muted)' }}>No tests found</div>
                                    ) : (
                                        filteredTemplates.map((template) => {
                                            const price = safeNumber(template.price);
                                            const added = isTemplateAdded(template.id);
                                            return (
                                                <button
                                                    key={template.id}
                                                    type="button"
                                                    onClick={() => handleTemplateSelect(template)}
                                                    disabled={added}
                                                    className="w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer"
                                                    style={{ opacity: added ? 0.45 : 1, cursor: added ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none', color: 'inherit', fontSize: 13 }}
                                                    onMouseEnter={(e) => { if (!added) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium truncate" style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>
                                                            {template.name}{added && <span className="ml-1.5 text-[0.65rem]" style={{ color: 'var(--color-success-text)' }}>✓</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[0.6rem] px-1.5 py-[1px] rounded" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>{template.category}</span>
                                                        </div>
                                                    </div>
                                                    <Num className="font-semibold flex-shrink-0 ml-3" style={{ color: 'var(--color-accent-text)', fontSize: 13 }}>
                                                        GHS {price.toFixed(2)}
                                                    </Num>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected tests */}
                        {selectedTests.length > 0 && (
                            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                                <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                                    <div className="flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-text)' }} />
                                        <span className="text-[0.72rem] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Selected Tests</span>
                                        <span className="text-[0.6rem] px-1.5 py-[1px] rounded font-semibold" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>{selectedTests.length}</span>
                                    </div>
                                    <button type="button" onClick={() => setSelectedTests([])} className="text-[0.65rem] font-medium cursor-pointer" style={{ color: 'var(--color-danger)', background: 'none', border: 'none', padding: '2px 6px' }}>Clear All</button>
                                </div>

                                <div className="max-h-[180px] overflow-y-auto">
                                    {selectedTests.map(({ template, quantity }, idx) => {
                                        const price = safeNumber(template.price);
                                        const lineTotal = price * quantity;
                                        return (
                                            <div key={template.id} className="flex items-center gap-2 px-3 py-2" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[0.75rem] font-medium truncate leading-tight" style={{ color: 'var(--color-text-primary)' }}>{template.name}</p>
                                                    <p className="text-[0.6rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{template.category}</p>
                                                </div>
                                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                                    <QtyBtn onClick={() => updateQuantity(template.id, quantity - 1)} disabled={quantity <= 1}>
                                                        <Minus className="h-3 w-3" />
                                                    </QtyBtn>
                                                    <Num className="w-6 text-center text-[0.72rem] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{quantity}</Num>
                                                    <QtyBtn onClick={() => updateQuantity(template.id, quantity + 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </QtyBtn>
                                                </div>
                                                <Num className="text-[0.75rem] font-semibold flex-shrink-0" style={{ color: 'var(--color-accent-text)', minWidth: 65, textAlign: 'right' }}>
                                                    GHS {lineTotal.toFixed(2)}
                                                </Num>
                                                <button type="button" onClick={() => removeTest(template.id)} className="flex-shrink-0 cursor-pointer" style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: 2, opacity: 0.5 }}
                                                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-danger-text)'; el.style.opacity = '1'; }}
                                                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--color-text-muted)'; el.style.opacity = '0.5'; }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Co-pay breakdown */}
                        {useInsurance && selectedProvider && selectedTests.length > 0 && (
                            <div style={{ background: 'var(--color-info-light)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--color-info-text)' }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                    Quoted Co-Pay Breakdown
                                    {selectedProvider.coverageType === 'fixed' && ' (fixed rate per test)'}
                                </div>
                                <div className="flex justify-between"><span>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {total.toFixed(2)}</span></div>
                                <div className="flex justify-between">
                                    <span>Insurance covers{selectedProvider.coverageType === 'percentage' && ` (${100 - safeNumber(selectedProvider.defaultCopayPercent)}%)`}</span>
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {insuranceCoverage.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between" style={{ fontWeight: 700, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--color-info)' }}>
                                    <span>Patient will pay{selectedProvider.coverageType === 'percentage' && ` (${selectedProvider.defaultCopayPercent}%)`}</span>
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>GHS {copayAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-[0.68rem] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" style={fieldStyle} onFocus={onFieldFocus} onBlur={onFieldBlur} />
                        </div>

                        {/* Info */}
                        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--color-info-light)', color: 'var(--color-info-text)', border: '1px solid var(--color-info)' }}>
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div className="text-[0.75rem]">
                                <strong>Payment is collected by the cashier.</strong>
                                <div style={{ marginTop: 2, opacity: 0.85 }}>
                                    This order will appear on the Payment &amp; Collections page for the cashier to collect.
                                    Estimated patient total: <strong>GHS {grandTotal.toFixed(2)}</strong>.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 px-5 py-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[0.72rem] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''}
                            </span>
                            <Num className="text-[0.95rem] font-bold" style={{ color: 'var(--color-accent-text)' }}>GHS {grandTotal.toFixed(2)}</Num>
                        </div>

                        <div className="flex gap-2.5">
                            <button type="button" onClick={onClose} className="btn-ghost flex-1" style={{ height: 38, fontSize: 14 }}>Cancel</button>
                            <button type="submit" disabled={loading || selectedTests.length === 0 || !customerId} className="btn-accent flex-1 flex items-center justify-center gap-1.5" style={{ height: 38, fontSize: 14 }}>
                                {loading ? 'Creating…' : (<><FlaskConical className="h-3.5 w-3.5" /> Create Service Order</>)}
                            </button>
                        </div>
                    </div>
                </form>

                <LabCustomerModal
                    open={showCustomerModal}
                    insuranceProviders={insuranceProviders}
                    onCancel={() => setShowCustomerModal(false)}
                    onCreated={handleCustomerCreated}
                />
            </div>
        </div>
    );
};
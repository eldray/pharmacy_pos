import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, FlaskConical, User, Phone, Calendar, DollarSign,
    Loader2, Search, CheckCircle, Minus, AlertCircle,
    Plus, Trash2, Package, CreditCard, Printer
} from 'lucide-react';
import { useAppStore } from '../store';
import { LabTestTemplate, PaymentMethod } from '../types';

interface LabRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customerName?: string;
    customerPhone?: string;
}

interface SelectedTest {
    template: LabTestTemplate;
    quantity: number;
}

/* Tabular number helper */
const Num: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {children}
    </span>
);

/* Compact qty button */
const QtyBtn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({ onClick, children, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center justify-center transition-colors duration-100 cursor-pointer"
        style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
            padding: 0,
        }}
        onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
            'var(--color-bg-subtle)')}
        onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
            'var(--color-bg-surface)')}
    >
        {children}
    </button>
);

export const LabRequestModal: React.FC<LabRequestModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    customerName,
    customerPhone,
}) => {
    const {
        labTestTemplates,
        addLabTransaction,
        fetchLabTestTemplates,
    } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
    const [formData, setFormData] = useState({
        patientName: customerName || '',
        patientPhone: customerPhone || '',
        patientAge: '',
        patientGender: 'Male' as 'Male' | 'Female' | 'Other',
        notes: '',
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    /* Close dropdown on outside click */
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchLabTestTemplates();
            setSearchQuery('');
            setShowDropdown(false);
            if (customerName) {
                setFormData((prev) => ({
                    ...prev,
                    patientName: customerName || '',
                    patientPhone: customerPhone || '',
                }));
            }
        }
    }, [isOpen, fetchLabTestTemplates, customerName, customerPhone]);

    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return labTestTemplates;
        const query = searchQuery.toLowerCase();
        return labTestTemplates.filter(
            (template) =>
                template.name?.toLowerCase().includes(query) ||
                template.category?.toLowerCase().includes(query) ||
                template.description?.toLowerCase().includes(query)
        );
    }, [labTestTemplates, searchQuery]);

    const isTemplateAdded = (templateId: string) =>
        selectedTests.some((t) => t.template.id === templateId);

    const handleTemplateSelect = (template: LabTestTemplate) => {
        if (isTemplateAdded(template.id)) return;
        setSelectedTests([...selectedTests, { template, quantity: 1 }]);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const removeTest = (templateId: string) =>
        setSelectedTests(selectedTests.filter((t) => t.template.id !== templateId));

    const updateQuantity = (templateId: string, quantity: number) => {
        if (quantity < 1) return;
        setSelectedTests(
            selectedTests.map((t) =>
                t.template.id === templateId ? { ...t, quantity } : t
            )
        );
    };

    const calculateTotal = () =>
        selectedTests.reduce(
            (sum, test) => sum + safeNumber(test.template.price) * test.quantity,
            0
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTests.length === 0) {
            alert('Please select at least one test');
            return;
        }
        if (!formData.patientName) {
            alert('Please enter patient name');
            return;
        }
        if (paymentMethod !== 'cash' && !mobileMoneyNumber) {
            alert('Please enter mobile money number');
            return;
        }
        if (paymentMethod !== 'cash' && mobileMoneyNumber.length < 10) {
            alert('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        try {
            const total = calculateTotal();
            const result = await addLabTransaction({
                patientName: formData.patientName,
                patientPhone: formData.patientPhone || null,
                patientAge: formData.patientAge ? parseInt(formData.patientAge) : null,
                patientGender: formData.patientGender || 'Male',
                totalAmount: total,
                paidAmount: total,
                paymentMethod,
                paymentReference:
                    paymentMethod !== 'cash' ? mobileMoneyNumber : undefined,
                paymentStatus: 'paid',
                notes: formData.notes || null,
                tests: selectedTests.map((st) => ({
                    testType: st.template.name,
                    testCategory: st.template.category,
                    testPrice: safeNumber(st.template.price) * st.quantity,
                    quantity: st.quantity,
                    sampleType: st.template.sampleType || null,
                    priority: 'normal',
                })),
            });

            if (result) {
                onSuccess();
                onClose();
                setSelectedTests([]);
                setSearchQuery('');
                setFormData({
                    patientName: '',
                    patientPhone: '',
                    patientAge: '',
                    patientGender: 'Male',
                    notes: '',
                });
                setMobileMoneyNumber('');
            } else {
                alert('Failed to create lab request');
            }
        } catch (err) {
            console.error('Lab request failed:', err);
            alert('Failed to create lab request');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const total = calculateTotal();

    /* Shared input handlers */
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
        borderRadius: '6px',
        color: 'var(--color-input-text)',
        outline: 'none',
        fontSize: '13px',
        padding: '8px 12px',
        width: '100%',
        height: '38px',
        transition: 'border-color 100ms ease, box-shadow 100ms ease',
    };

    return (
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
                    maxWidth: 680,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ─────────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: '6px',
                                background: 'var(--color-accent-light)',
                                color: 'var(--color-accent-text)',
                            }}
                        >
                            <FlaskConical className="h-4 w-4" />
                        </div>
                        <div>
                            <h2
                                className="text-[0.85rem] font-bold leading-none"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                Request Lab Tests
                            </h2>
                            <p
                                className="text-[0.65rem] mt-0.5"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {selectedTests.length > 0
                                    ? `${selectedTests.length} test${selectedTests.length > 1 ? 's' : ''} selected`
                                    : 'Search and select tests'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center flex-shrink-0 transition-colors duration-100 cursor-pointer"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                        }}
                        onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                            'var(--color-bg-subtle)')}
                        onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* ── Scrollable body ───────────────────────────────────────── */}
                <form
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto"
                    style={{ display: 'flex', flexDirection: 'column' }}
                >
                    <div className="p-5 space-y-5 flex-1">

                        {/* ── Search tests ──────────────────────────────────────── */}
                        <div ref={dropdownRef} style={{ position: 'relative' }}>
                            <label
                                className="block text-[0.7rem] font-medium mb-1.5"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                Search tests
                            </label>
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    placeholder="e.g. CBC, Malaria, Glucose…"
                                    autoComplete="off"
                                    style={{ ...fieldStyle, paddingLeft: 32 }}
                                    onFocus={(e) => {
                                        onFieldFocus(e);
                                        setShowDropdown(true);
                                    }}
                                    onBlur={onFieldBlur}
                                />
                            </div>

                            {/* ─── DROPDOWN - FIXED ─── */}
                            {showDropdown && searchQuery && (
                                <div
                                    className="absolute z-20 mt-1 rounded-lg overflow-hidden"
                                    style={{
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        boxShadow: 'var(--shadow-lg)',
                                        width: '100%',
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                        left: 0,
                                    }}
                                >
                                    {filteredTemplates.length === 0 ? (
                                        <div
                                            className="px-3 py-3 text-center text-[0.78rem]"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >
                                            No tests found
                                        </div>
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
                                                    className="w-full text-left px-3 py-2 transition-colors duration-100 flex items-center justify-between"
                                                    style={{
                                                        borderBottom: '1px solid var(--color-border)',
                                                        opacity: added ? 0.45 : 1,
                                                        cursor: added ? 'not-allowed' : 'pointer',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'inherit',
                                                        fontSize: '13px',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!added)
                                                            (e.currentTarget as HTMLElement).style.background =
                                                                'var(--color-bg-subtle)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background =
                                                            'transparent';
                                                    }}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div
                                                            className="font-medium truncate"
                                                            style={{ color: 'var(--color-text-primary)', fontSize: '13px' }}
                                                        >
                                                            {template.name}
                                                            {added && (
                                                                <span
                                                                    className="ml-1.5 text-[0.65rem] font-normal"
                                                                    style={{ color: 'var(--color-success-text)' }}
                                                                >
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span
                                                                className="text-[0.6rem] px-1.5 py-[1px] rounded"
                                                                style={{
                                                                    background: 'var(--color-bg-subtle)',
                                                                    color: 'var(--color-text-muted)',
                                                                }}
                                                            >
                                                                {template.category}
                                                            </span>
                                                            {template.sampleType && (
                                                                <span
                                                                    className="text-[0.6rem]"
                                                                    style={{ color: 'var(--color-text-muted)' }}
                                                                >
                                                                    {template.sampleType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Num
                                                        className="font-semibold flex-shrink-0 ml-3"
                                                        style={{ color: 'var(--color-accent-text)', fontSize: '13px' }}
                                                    >
                                                        GHS {price.toFixed(2)}
                                                    </Num>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Selected tests list ──────────────────────────────── */}
                        {selectedTests.length > 0 && (
                            <div
                                className="rounded-lg overflow-hidden"
                                style={{ border: '1px solid var(--color-border)' }}
                            >
                                <div
                                    className="flex items-center justify-between px-3 py-2"
                                    style={{
                                        background: 'var(--color-bg-subtle)',
                                        borderBottom: '1px solid var(--color-border)',
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Package
                                            className="h-3.5 w-3.5"
                                            style={{ color: 'var(--color-accent-text)' }}
                                        />
                                        <span
                                            className="text-[0.72rem] font-semibold"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            Selected Tests
                                        </span>
                                        <span
                                            className="text-[0.6rem] px-1.5 py-[1px] rounded font-semibold"
                                            style={{
                                                background: 'var(--color-accent)',
                                                color: 'var(--color-accent-fg)',
                                            }}
                                        >
                                            {selectedTests.length}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTests([])}
                                        className="text-[0.65rem] font-medium cursor-pointer"
                                        style={{
                                            color: 'var(--color-danger)',
                                            background: 'none',
                                            border: 'none',
                                            padding: '2px 6px',
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>

                                <div className="max-h-[180px] overflow-y-auto">
                                    {selectedTests.map(({ template, quantity }, idx) => {
                                        const price = safeNumber(template.price);
                                        const lineTotal = price * quantity;
                                        return (
                                            <div
                                                key={template.id}
                                                className="flex items-center gap-2 px-3 py-2 transition-colors duration-100"
                                                style={{
                                                    borderTop:
                                                        idx === 0
                                                            ? 'none'
                                                            : '1px solid var(--color-border)',
                                                }}
                                                onMouseEnter={(e) =>
                                                ((e.currentTarget as HTMLElement).style.background =
                                                    'var(--color-bg-subtle)')}
                                                onMouseLeave={(e) =>
                                                ((e.currentTarget as HTMLElement).style.background =
                                                    'transparent')}
                                            >
                                                {/* Name + category */}
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="text-[0.75rem] font-medium truncate leading-tight"
                                                        style={{ color: 'var(--color-text-primary)' }}
                                                    >
                                                        {template.name}
                                                    </p>
                                                    <p
                                                        className="text-[0.6rem] mt-0.5"
                                                        style={{ color: 'var(--color-text-muted)' }}
                                                    >
                                                        {template.category}
                                                    </p>
                                                </div>

                                                {/* Qty controls */}
                                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                                    <QtyBtn
                                                        onClick={() =>
                                                            updateQuantity(template.id, quantity - 1)
                                                        }
                                                        disabled={quantity <= 1}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </QtyBtn>
                                                    <Num
                                                        className="w-6 text-center text-[0.72rem] font-semibold"
                                                        style={{ color: 'var(--color-text-primary)' }}
                                                    >
                                                        {quantity}
                                                    </Num>
                                                    <QtyBtn
                                                        onClick={() =>
                                                            updateQuantity(template.id, quantity + 1)
                                                        }
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </QtyBtn>
                                                </div>

                                                {/* Line total */}
                                                <Num
                                                    className="text-[0.75rem] font-semibold flex-shrink-0"
                                                    style={{
                                                        color: 'var(--color-accent-text)',
                                                        minWidth: 65,
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    GHS {lineTotal.toFixed(2)}
                                                </Num>

                                                {/* Remove */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTest(template.id)}
                                                    className="flex-shrink-0 transition-colors duration-100 cursor-pointer"
                                                    style={{
                                                        color: 'var(--color-text-muted)',
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: 2,
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
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Patient details ──────────────────────────────────── */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <User
                                    className="h-3.5 w-3.5"
                                    style={{ color: 'var(--color-accent-text)' }}
                                />
                                <span
                                    className="text-[0.75rem] font-semibold"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    Patient Details
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, patientName: e.target.value })
                                        }
                                        required
                                        placeholder="Patient name"
                                        style={fieldStyle}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.patientPhone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, patientPhone: e.target.value })
                                        }
                                        placeholder="Phone number"
                                        style={fieldStyle}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Age
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.patientAge}
                                        onChange={(e) =>
                                            setFormData({ ...formData, patientAge: e.target.value })
                                        }
                                        placeholder="Age"
                                        min="0"
                                        max="150"
                                        style={fieldStyle}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Gender
                                    </label>
                                    <select
                                        value={formData.patientGender}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                patientGender: e.target.value as any,
                                            })
                                        }
                                        style={{
                                            ...fieldStyle,
                                            appearance: 'none',
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 10px center',
                                            cursor: 'pointer',
                                        }}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3">
                                <label
                                    className="block text-[0.68rem] font-medium mb-1"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Notes
                                </label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notes: e.target.value })
                                    }
                                    placeholder="Optional notes"
                                    style={fieldStyle}
                                    onFocus={onFieldFocus}
                                    onBlur={onFieldBlur}
                                />
                            </div>
                        </div>

                        {/* ── Payment ─────────────────────────────────────────── */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <CreditCard
                                    className="h-3.5 w-3.5"
                                    style={{ color: 'var(--color-accent-text)' }}
                                />
                                <span
                                    className="text-[0.75rem] font-semibold"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    Payment
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Method
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) =>
                                            setPaymentMethod(e.target.value as PaymentMethod)
                                        }
                                        style={{
                                            ...fieldStyle,
                                            appearance: 'none',
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 10px center',
                                            cursor: 'pointer',
                                        }}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="mtn">MTN Mobile Money</option>
                                        <option value="vodafone">Vodafone Cash</option>
                                        <option value="airteltigo">AirtelTigo Money</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Amount
                                    </label>
                                    <div
                                        className="flex items-center"
                                        style={{
                                            ...fieldStyle,
                                            background: 'var(--color-bg-subtle)',
                                            color: 'var(--color-text-secondary)',
                                            padding: '8px 12px',
                                            height: '38px',
                                        }}
                                    >
                                        <DollarSign
                                            className="h-3.5 w-3.5 mr-2 flex-shrink-0"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        />
                                        <Num className="font-semibold flex-1 text-center">
                                            GHS {total.toFixed(2)}
                                        </Num>
                                    </div>
                                </div>
                            </div>

                            {paymentMethod !== 'cash' && (
                                <div className="mt-3">
                                    <label
                                        className="block text-[0.68rem] font-medium mb-1"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        MoMo Number *
                                    </label>
                                    <input
                                        type="tel"
                                        value={mobileMoneyNumber}
                                        onChange={(e) => setMobileMoneyNumber(e.target.value)}
                                        placeholder="e.g. 0551234567"
                                        style={fieldStyle}
                                        onFocus={onFieldFocus}
                                        onBlur={onFieldBlur}
                                        required={paymentMethod !== 'cash'}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Footer: total + actions ────────────────────────────── */}
                    <div
                        className="flex-shrink-0 px-5 py-3"
                        style={{
                            borderTop: '1px solid var(--color-border)',
                            background: 'var(--color-bg-surface)',
                        }}
                    >
                        {/* Total row */}
                        <div className="flex items-center justify-between mb-3">
                            <span
                                className="text-[0.72rem] font-medium"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} ·{' '}
                                {paymentMethod.toUpperCase()}
                            </span>
                            <Num
                                className="text-[0.95rem] font-bold"
                                style={{ color: 'var(--color-accent-text)' }}
                            >
                                GHS {total.toFixed(2)}
                            </Num>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-ghost flex-1"
                                style={{
                                    height: '38px',
                                    fontSize: '14px',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    loading || selectedTests.length === 0 || !formData.patientName
                                }
                                className="btn-success flex-1 flex items-center justify-center gap-1.5"
                                style={{
                                    height: '38px',
                                    fontSize: '14px',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div
                                            className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                                            style={{
                                                borderColor: 'rgba(255,255,255,0.3)',
                                                borderTopColor: '#fff',
                                            }}
                                        />
                                        Processing…
                                    </>
                                ) : (
                                    <>
                                        <Printer className="h-3.5 w-3.5" />
                                        Pay & Print
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
// src/pages/Preferences.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Moon, Sun, Monitor, Printer, Receipt,
    Bell, Mail, Phone, Save, RefreshCw,
    DollarSign, Calendar, Package, Eye, Palette,
    Building, AlertTriangle, CheckCircle, Loader2,
    ChevronRight, Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { useThemeStore, Theme } from '../store/themeStore';

/* ═══════════════════════════════════════════════════════════════════════
   Types & defaults
   ═══════════════════════════════════════════════════════════════════════ */
interface Preferences {
    theme: Theme;
    receiptPaperSize: '80mm' | '58mm';
    receiptFooter: string;
    receiptHeader: string;
    showCustomerName: boolean;
    showCustomerPhone: boolean;
    showCashierName: boolean;
    lowStockAlert: boolean;
    expiryAlert: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    currency: string;
    taxRate: number;
    decimalPlaces: number;
    hidePrices: boolean;
    showFullNames: boolean;
}

const defaultPreferences: Preferences = {
    theme: 'light',
    receiptPaperSize: '80mm',
    receiptFooter: 'Thank you for your patronage!',
    receiptHeader: 'Your Trusted Pharmacy',
    showCustomerName: true,
    showCustomerPhone: true,
    showCashierName: true,
    lowStockAlert: true,
    expiryAlert: true,
    emailNotifications: false,
    smsNotifications: false,
    currency: 'GHS',
    taxRate: 15,
    decimalPlaces: 2,
    hidePrices: false,
    showFullNames: true,
};

const PREFS_KEY = 'pharmacy_preferences';

/* ═══════════════════════════════════════════════════════════════════════
   Shared styles
   ═══════════════════════════════════════════════════════════════════════ */
const fieldStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '0.82rem',
    padding: '8px 12px',
    width: '100%',
    height: 38,
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.68rem',
    fontWeight: 600,
    marginBottom: 6,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
};

const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
};
const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
};

/* ═══════════════════════════════════════════════════════════════════════
   Primitives
   ═══════════════════════════════════════════════════════════════════════ */

/** Card with header */
const Section: React.FC<{
    icon: React.ReactNode;
    title: string;
    description?: string;
    hint?: string;
    children: React.ReactNode;
}> = ({ icon, title, description, hint, children }) => (
    <section
        style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
        }}
    >
        <header
            style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
            }}
        >
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-accent-light)',
                    color: 'var(--color-accent-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                    {title}
                </h3>
                {description && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                        {description}
                    </p>
                )}
                {hint && (
                    <p
                        style={{
                            fontSize: '0.68rem',
                            color: 'var(--color-info-text)',
                            margin: '6px 0 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <Info size={11} /> {hint}
                    </p>
                )}
            </div>
        </header>
        <div style={{ padding: '16px 18px' }}>{children}</div>
    </section>
);

/** Pill-style choice group */
function PillGroup<T extends string>({
    value,
    onChange,
    options,
    columns = 3,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string; icon?: React.ElementType }[];
    columns?: number;
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 8 }}>
            {options.map(({ value: v, label, icon: Icon }) => {
                const active = value === v;
                return (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onChange(v)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 8px',
                            borderRadius: 'var(--radius-md)',
                            background: active ? 'var(--color-accent-light)' : 'var(--color-bg-subtle)',
                            border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            color: active ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 100ms',
                        }}
                    >
                        {Icon && <Icon size={16} />}
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/** Toggle row — the switch is a proper styled control, not a raw checkbox */
const ToggleRow: React.FC<{
    label: string;
    description?: string;
    icon: React.ElementType;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}> = ({ label, description, icon: Icon, checked, onChange, disabled }) => (
    <label
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.55 : 1,
            transition: 'background 100ms',
        }}
        onMouseEnter={(e) => {
            if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
        }}
        onMouseLeave={(e) => {
            if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
        }}
    >
        <Icon size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {label}
            </div>
            {description && (
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                    {description}
                </div>
            )}
        </div>
        <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </label>
);

/** An actual toggle switch */
const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
    checked,
    onChange,
    disabled,
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        aria-pressed={checked}
        style={{
            position: 'relative',
            width: 36,
            height: 20,
            borderRadius: 999,
            border: 'none',
            padding: 0,
            background: checked ? 'var(--color-accent)' : 'var(--color-border-strong)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 150ms',
            flexShrink: 0,
        }}
    >
        <span
            style={{
                position: 'absolute',
                top: 2,
                left: checked ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                transition: 'left 150ms',
            }}
        />
    </button>
);

/** Read-only info row */
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
            gap: 12,
        }}
    >
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</span>
        <span
            style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            {value || 'Not set'}
        </span>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */
export const Preferences: React.FC = () => {
    const { theme: storeTheme, setTheme } = useThemeStore();
    const { company, updateCompany } = useAppStore();

    const [preferences, setPreferences] = useState<Preferences>(() => {
        const saved = localStorage.getItem(PREFS_KEY);
        const base = saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
        return { ...base, theme: storeTheme };
    });
    const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(preferences));
    const [isSaving, setIsSaving] = useState(false);
    const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const initialised = useRef(false);

    // Keep theme in sync with the store (source of truth)
    useEffect(() => {
        setPreferences((prev) => (prev.theme !== storeTheme ? { ...prev, theme: storeTheme } : prev));
    }, [storeTheme]);

    // Sync tax rate from company on first load only
    useEffect(() => {
        if (!company || initialised.current) return;
        initialised.current = true;
        setPreferences((prev) => ({
            ...prev,
            taxRate: company.receiptSettings?.taxRate ?? prev.taxRate,
            receiptHeader: company.receiptSettings?.header ?? prev.receiptHeader,
            receiptFooter: company.receiptSettings?.footer ?? prev.receiptFooter,
        }));
    }, [company]);

    // Update saved snapshot whenever the user saves
    useEffect(() => {
        if (!isSaving && banner?.type === 'success') {
            setSavedSnapshot(JSON.stringify(preferences));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSaving]);

    const isDirty = useMemo(
        () => JSON.stringify(preferences) !== savedSnapshot,
        [preferences, savedSnapshot]
    );

    const handleChange = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
        setPreferences((prev) => ({ ...prev, [key]: value }));

    const handleThemeChange = (theme: Theme) => {
        handleChange('theme', theme);
        setTheme(theme); // live preview
    };

    const handleSave = async () => {
        setIsSaving(true);
        setBanner(null);
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));

            if (company) {
                await updateCompany({
                    receiptSettings: {
                        ...company.receiptSettings,
                        taxRate: preferences.taxRate,
                        footer: preferences.receiptFooter,
                        header: preferences.receiptHeader,
                    },
                });
            }

            setTheme(preferences.theme);
            setSavedSnapshot(JSON.stringify(preferences));
            setBanner({ type: 'success', text: 'Preferences saved successfully' });
            setTimeout(() => setBanner(null), 3000);
        } catch {
            setBanner({ type: 'error', text: 'Failed to save preferences' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (!window.confirm('Reset all preferences to their default values?')) return;
        setPreferences(defaultPreferences);
        setTheme(defaultPreferences.theme);
        localStorage.setItem(PREFS_KEY, JSON.stringify(defaultPreferences));
        setSavedSnapshot(JSON.stringify(defaultPreferences));
        setBanner({ type: 'info', text: 'Preferences reset to defaults' });
        setTimeout(() => setBanner(null), 3000);
    };

    /* ── Warn on navigation away with unsaved changes ────────────────── */
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--gradient-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Palette className="h-4 w-4" style={{ color: '#fff' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                            Preferences
                        </h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                            Personalise the look, receipts, and alerts you work with
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isDirty && (
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-warning-light)',
                                color: 'var(--color-warning-text)',
                                border: '1px solid var(--color-warning)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                            }}
                        >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)' }} />
                            Unsaved changes
                        </span>
                    )}
                    <button onClick={handleReset} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={14} />
                        Reset
                    </button>
                </div>
            </div>

            {/* ── Banner ──────────────────────────────────────────────────── */}
            {banner && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        background:
                            banner.type === 'success' ? 'var(--color-success-light)'
                                : banner.type === 'error' ? 'var(--color-danger-light)'
                                    : 'var(--color-info-light)',
                        color:
                            banner.type === 'success' ? 'var(--color-success-text)'
                                : banner.type === 'error' ? 'var(--color-danger-text)'
                                    : 'var(--color-info-text)',
                        border: `1px solid ${banner.type === 'success' ? 'var(--color-success)'
                                : banner.type === 'error' ? 'var(--color-danger)'
                                    : 'var(--color-info)'
                            }`,
                    }}
                >
                    {banner.type === 'success' ? <CheckCircle className="h-4 w-4" />
                        : banner.type === 'error' ? <AlertTriangle className="h-4 w-4" />
                            : <Info className="h-4 w-4" />}
                    <span style={{ flex: 1 }}>{banner.text}</span>
                    <button
                        onClick={() => setBanner(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, fontSize: 16, lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* ── Two-column layout ──────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>

                {/* LEFT COLUMN — Appearance + Receipt + Notifications */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <Section
                        icon={<Palette size={16} />}
                        title="Appearance"
                        description="How the app looks on your device"
                    >
                        <label style={labelStyle}>Theme</label>
                        <PillGroup
                            value={preferences.theme}
                            onChange={handleThemeChange}
                            options={[
                                { value: 'light' as Theme, label: 'Light', icon: Sun },
                                { value: 'dark' as Theme, label: 'Dark', icon: Moon },
                                { value: 'system' as Theme, label: 'System', icon: Monitor },
                            ]}
                        />
                        {preferences.theme === 'system' && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                                Follows your operating system's light / dark preference.
                            </p>
                        )}
                    </Section>

                    <Section
                        icon={<Receipt size={16} />}
                        title="Receipt"
                        description="Printed output for sales and lab slips"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Paper size</label>
                                <PillGroup
                                    value={preferences.receiptPaperSize}
                                    onChange={(v) => handleChange('receiptPaperSize', v)}
                                    columns={2}
                                    options={[
                                        { value: '80mm' as const, label: '80mm — Standard', icon: Printer },
                                        { value: '58mm' as const, label: '58mm — Compact', icon: Printer },
                                    ]}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Header line</label>
                                <input
                                    type="text"
                                    value={preferences.receiptHeader}
                                    onChange={(e) => handleChange('receiptHeader', e.target.value)}
                                    style={fieldStyle}
                                    onFocus={onF}
                                    onBlur={onB}
                                    placeholder="Your Trusted Pharmacy"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Footer line</label>
                                <input
                                    type="text"
                                    value={preferences.receiptFooter}
                                    onChange={(e) => handleChange('receiptFooter', e.target.value)}
                                    style={fieldStyle}
                                    onFocus={onF}
                                    onBlur={onB}
                                    placeholder="Thank you for your patronage!"
                                />
                            </div>
                        </div>
                    </Section>

                    <Section
                        icon={<Bell size={16} />}
                        title="Notifications"
                        description="Which alerts you want to receive"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <ToggleRow
                                icon={Package}
                                label="Low stock alerts"
                                description="Warn when a product drops below its reorder level"
                                checked={preferences.lowStockAlert}
                                onChange={(v) => handleChange('lowStockAlert', v)}
                            />
                            <ToggleRow
                                icon={Calendar}
                                label="Expiry alerts"
                                description="Warn when batches are nearing expiry"
                                checked={preferences.expiryAlert}
                                onChange={(v) => handleChange('expiryAlert', v)}
                            />
                            <ToggleRow
                                icon={Mail}
                                label="Email notifications"
                                description="Also deliver alerts to your inbox (coming soon)"
                                checked={preferences.emailNotifications}
                                onChange={(v) => handleChange('emailNotifications', v)}
                                disabled
                            />
                            <ToggleRow
                                icon={Phone}
                                label="SMS notifications"
                                description="Also deliver alerts via SMS (coming soon)"
                                checked={preferences.smsNotifications}
                                onChange={(v) => handleChange('smsNotifications', v)}
                                disabled
                            />
                        </div>
                    </Section>
                </div>

                {/* RIGHT COLUMN — Currency + Display + Company */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <Section
                        icon={<DollarSign size={16} />}
                        title="Currency & Tax"
                        description="Financial display and receipt calculations"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Currency</label>
                                <select
                                    value={preferences.currency}
                                    onChange={(e) => handleChange('currency', e.target.value)}
                                    style={{ ...fieldStyle, cursor: 'pointer' }}
                                    onFocus={onF}
                                    onBlur={onB}
                                >
                                    <option value="GHS">GHS (₵) — Ghana Cedi</option>
                                    <option value="USD">USD ($) — US Dollar</option>
                                    <option value="EUR">EUR (€) — Euro</option>
                                    <option value="GBP">GBP (£) — British Pound</option>
                                    <option value="NGN">NGN (₦) — Nigerian Naira</option>
                                    <option value="KES">KES (KSh) — Kenyan Shilling</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Tax rate (%)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    value={preferences.taxRate}
                                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                                    style={fieldStyle}
                                    onFocus={onF}
                                    onBlur={onB}
                                />
                                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                    Applied to POS sales and mirrored in Company Settings.
                                </p>
                            </div>
                            <div>
                                <label style={labelStyle}>Decimal places</label>
                                <select
                                    value={preferences.decimalPlaces}
                                    onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value, 10))}
                                    style={{ ...fieldStyle, cursor: 'pointer' }}
                                    onFocus={onF}
                                    onBlur={onB}
                                >
                                    <option value={0}>0 — Whole numbers</option>
                                    <option value={1}>1 decimal</option>
                                    <option value={2}>2 decimals</option>
                                    <option value={3}>3 decimals</option>
                                </select>
                            </div>
                        </div>
                    </Section>

                    <Section
                        icon={<Eye size={16} />}
                        title="Receipt display"
                        description="Choose what appears on printed receipts"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <ToggleRow
                                icon={Eye}
                                label="Show customer name"
                                checked={preferences.showCustomerName}
                                onChange={(v) => handleChange('showCustomerName', v)}
                            />
                            <ToggleRow
                                icon={Eye}
                                label="Show customer phone"
                                checked={preferences.showCustomerPhone}
                                onChange={(v) => handleChange('showCustomerPhone', v)}
                            />
                            <ToggleRow
                                icon={Eye}
                                label="Show cashier name"
                                checked={preferences.showCashierName}
                                onChange={(v) => handleChange('showCashierName', v)}
                            />
                            <ToggleRow
                                icon={Eye}
                                label="Show full names"
                                description="Otherwise initials are shown"
                                checked={preferences.showFullNames}
                                onChange={(v) => handleChange('showFullNames', v)}
                            />
                            <ToggleRow
                                icon={Eye}
                                label="Hide prices"
                                description="Useful when showing the screen to customers"
                                checked={preferences.hidePrices}
                                onChange={(v) => handleChange('hidePrices', v)}
                            />
                        </div>
                    </Section>

                    <Section
                        icon={<Building size={16} />}
                        title="Company"
                        description="Managed in Company Settings"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <InfoRow label="Name" value={company?.name || ''} />
                            <InfoRow label="Tax ID" value={company?.taxId || ''} />
                            <InfoRow label="Phone" value={company?.contact?.phone || ''} />
                            <InfoRow label="Email" value={company?.contact?.email || ''} />
                            <Link
                                to="/dashboard/settings"
                                style={{
                                    marginTop: 8,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: 'var(--color-accent-text)',
                                    textDecoration: 'none',
                                }}
                            >
                                Edit company details
                                <ChevronRight size={14} />
                            </Link>
                        </div>
                    </Section>
                </div>
            </div>

            {/* ── Sticky save bar ─────────────────────────────────────────── */}
            <div
                style={{
                    position: 'sticky',
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {isDirty
                        ? 'You have unsaved changes.'
                        : 'All changes are saved.'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleReset}
                        className="btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <RefreshCw size={14} />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className="btn-accent"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 160,
                            justifyContent: 'center',
                            opacity: isSaving || !isDirty ? 0.6 : 1,
                            cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSaving ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                        ) : (
                            <><Save className="h-3.5 w-3.5" /> Save Preferences</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Preferences;
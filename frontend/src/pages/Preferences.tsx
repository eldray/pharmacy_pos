// src/pages/Preferences.tsx
import React, { useState, useEffect } from 'react';
import {
    Moon, Sun, Monitor, Printer, Receipt,
    Bell, Mail, Phone, Save, RefreshCw,
    DollarSign, Percent, Globe, Shield, Calendar, Package,
    CreditCard, UserCog, FileText, Eye,
    CheckCircle, X, Settings, Palette,
    Clock, Award, Building, MapPin
} from 'lucide-react';
import { useAppStore } from '../store';

interface Preferences {
    theme: 'light' | 'dark' | 'system';
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

// ─── Shared field styles ───────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '0.8125rem',
    padding: '8px 12px',
    width: '100%',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 500,
    marginBottom: 6,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
};

const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
};

const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
};

/* ─── Setting Card ────────────────────────────────────────────────────── */
const SettingCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description?: string;
    children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
    <div
        className="overflow-hidden transition-all duration-100"
        style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
        }}
    >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center" style={{ gap: '10px' }}>
                <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-accent-light)',
                        color: 'var(--color-accent-text)',
                    }}
                >
                    {icon}
                </div>
                <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {title}
                    </h3>
                    {description && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
            {children}
        </div>
    </div>
);

export const Preferences: React.FC = () => {
    const [preferences, setPreferences] = useState<Preferences>(() => {
        const saved = localStorage.getItem('pharmacy_preferences');
        return saved ? JSON.parse(saved) : defaultPreferences;
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const { company, updateCompany } = useAppStore();

    useEffect(() => {
        if (company?.receiptSettings?.taxRate) {
            setPreferences(prev => ({
                ...prev,
                taxRate: company.receiptSettings.taxRate || 15,
            }));
        }
    }, [company]);

    const handleChange = <K extends keyof Preferences>(
        key: K,
        value: Preferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');

        try {
            localStorage.setItem('pharmacy_preferences', JSON.stringify(preferences));

            if (company) {
                await updateCompany({
                    receiptSettings: {
                        ...company.receiptSettings,
                        taxRate: preferences.taxRate,
                        footer: preferences.receiptFooter,
                        header: preferences.receiptHeader,
                    }
                });
            }

            if (preferences.theme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            } else {
                document.documentElement.setAttribute('data-theme', preferences.theme);
            }

            setSaveMessage('✅ Preferences saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('❌ Failed to save preferences.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Reset all preferences to default values?')) {
            setPreferences(defaultPreferences);
            localStorage.setItem('pharmacy_preferences', JSON.stringify(defaultPreferences));
            setSaveMessage('🔄 Preferences reset to defaults.');
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Preferences
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Customize your pharmacy management experience
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-100"
                        style={{
                            background: 'var(--color-bg-subtle)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <RefreshCw size={16} />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg transition-all duration-100"
                        style={{
                            background: 'var(--color-accent)',
                            color: 'var(--color-accent-fg)',
                            border: 'none',
                            opacity: isSaving ? 0.7 : 1,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>

            {saveMessage && (
                <div className="mb-6 p-3 rounded-lg text-sm font-medium" style={{
                    background: saveMessage.includes('✅') ? 'var(--color-success-light)' :
                        saveMessage.includes('🔄') ? 'var(--color-info-light)' :
                            'var(--color-danger-light)',
                    color: saveMessage.includes('✅') ? 'var(--color-success-text)' :
                        saveMessage.includes('🔄') ? 'var(--color-info-text)' :
                            'var(--color-danger-text)',
                }}>
                    {saveMessage}
                </div>
            )}

            {/* ─── Grid Layout ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ─── Appearance ──────────────────────────────────────────── */}
                <SettingCard icon={<Palette size={16} />} title="Appearance" description="Choose your theme preference">
                    <div>
                        <label style={labelStyle}>Theme Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'light', icon: Sun, label: 'Light' },
                                { value: 'dark', icon: Moon, label: 'Dark' },
                                { value: 'system', icon: Monitor, label: 'System' },
                            ].map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    onClick={() => handleChange('theme', value as Preferences['theme'])}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-100"
                                    style={{
                                        background: preferences.theme === value
                                            ? 'var(--color-accent-light)'
                                            : 'var(--color-bg-subtle)',
                                        border: `2px solid ${preferences.theme === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                        color: preferences.theme === value
                                            ? 'var(--color-accent-text)'
                                            : 'var(--color-text-secondary)',
                                    }}
                                >
                                    <Icon size={18} />
                                    <span className="text-xs font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </SettingCard>

                {/* ─── Receipt Settings ────────────────────────────────────── */}
                <SettingCard icon={<Receipt size={16} />} title="Receipt Settings" description="Configure receipt appearance">
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>Paper Size</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: '80mm', icon: Printer, label: '80mm (Standard)' },
                                    { value: '58mm', icon: Printer, label: '58mm (Compact)' },
                                ].map(({ value, icon: Icon, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => handleChange('receiptPaperSize', value as Preferences['receiptPaperSize'])}
                                        className="flex items-center gap-2 p-2.5 rounded-lg transition-all duration-100"
                                        style={{
                                            background: preferences.receiptPaperSize === value
                                                ? 'var(--color-accent-light)'
                                                : 'var(--color-bg-subtle)',
                                            border: `2px solid ${preferences.receiptPaperSize === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                            color: preferences.receiptPaperSize === value
                                                ? 'var(--color-accent-text)'
                                                : 'var(--color-text-secondary)',
                                        }}
                                    >
                                        <Icon size={16} />
                                        <span className="text-xs font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Receipt Header</label>
                            <input
                                type="text"
                                value={preferences.receiptHeader}
                                onChange={(e) => handleChange('receiptHeader', e.target.value)}
                                style={fieldStyle}
                                onFocus={onF}
                                onBlur={onB}
                                placeholder="e.g., Your Trusted Pharmacy"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Receipt Footer</label>
                            <input
                                type="text"
                                value={preferences.receiptFooter}
                                onChange={(e) => handleChange('receiptFooter', e.target.value)}
                                style={fieldStyle}
                                onFocus={onF}
                                onBlur={onB}
                                placeholder="e.g., Thank you for your patronage!"
                            />
                        </div>
                    </div>
                </SettingCard>

                {/* ─── Notifications ────────────────────────────────────────── */}
                <SettingCard icon={<Bell size={16} />} title="Notifications" description="Manage alert preferences">
                    <div className="space-y-3">
                        {[
                            { key: 'lowStockAlert', icon: Package, label: 'Low Stock Alerts' },
                            { key: 'expiryAlert', icon: Calendar, label: 'Expiry Alerts' },
                            { key: 'emailNotifications', icon: Mail, label: 'Email Notifications' },
                            { key: 'smsNotifications', icon: Phone, label: 'SMS Notifications' },
                        ].map(({ key, icon: Icon, label }) => (
                            <label key={key} className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-100" style={{
                                background: 'var(--color-bg-subtle)',
                            }}>
                                <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <Icon size={16} />
                                    {label}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={preferences[key as keyof Preferences] as boolean}
                                    onChange={(e) => handleChange(key as keyof Preferences, e.target.checked)}
                                    className="w-4 h-4 rounded cursor-pointer"
                                    style={{
                                        accentColor: 'var(--color-accent)',
                                    }}
                                />
                            </label>
                        ))}
                    </div>
                </SettingCard>

                {/* ─── Currency & Tax ──────────────────────────────────────── */}
                <SettingCard icon={<DollarSign size={16} />} title="Currency & Tax" description="Financial settings">
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>Currency</label>
                            <select
                                value={preferences.currency}
                                onChange={(e) => handleChange('currency', e.target.value)}
                                style={fieldStyle}
                                onFocus={onF}
                                onBlur={onB}
                            >
                                <option value="GHS">GHS (₵) - Ghana Cedi</option>
                                <option value="USD">USD ($) - US Dollar</option>
                                <option value="EUR">EUR (€) - Euro</option>
                                <option value="GBP">GBP (£) - British Pound</option>
                                <option value="NGN">NGN (₦) - Nigerian Naira</option>
                                <option value="KES">KES (KSh) - Kenyan Shilling</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Tax Rate (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={preferences.taxRate}
                                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                                style={fieldStyle}
                                onFocus={onF}
                                onBlur={onB}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Decimal Places</label>
                            <select
                                value={preferences.decimalPlaces}
                                onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value))}
                                style={fieldStyle}
                                onFocus={onF}
                                onBlur={onB}
                            >
                                <option value="0">0 (Whole numbers)</option>
                                <option value="1">1 decimal</option>
                                <option value="2">2 decimals</option>
                                <option value="3">3 decimals</option>
                            </select>
                        </div>
                    </div>
                </SettingCard>

                {/* ─── Display Settings ────────────────────────────────────── */}
                <SettingCard icon={<Eye size={16} />} title="Display Settings" description="Control what you see">
                    <div className="space-y-3">
                        {[
                            { key: 'showCustomerName', icon: UserCog, label: 'Show Customer Name on Receipt' },
                            { key: 'showCustomerPhone', icon: Phone, label: 'Show Customer Phone on Receipt' },
                            { key: 'showCashierName', icon: UserCog, label: 'Show Cashier Name on Receipt' },
                            { key: 'showFullNames', icon: UserCog, label: 'Show Full Names (not initials)' },
                            { key: 'hidePrices', icon: Eye, label: 'Hide Prices (for public view)' },
                        ].map(({ key, icon: Icon, label }) => (
                            <label key={key} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors duration-100" style={{
                                background: 'var(--color-bg-subtle)',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={preferences[key as keyof Preferences] as boolean}
                                    onChange={(e) => handleChange(key as keyof Preferences, e.target.checked)}
                                    className="w-4 h-4 rounded cursor-pointer"
                                    style={{
                                        accentColor: 'var(--color-accent)',
                                    }}
                                />
                                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <Icon size={14} className="inline mr-2" />
                                    {label}
                                </span>
                            </label>
                        ))}
                    </div>
                </SettingCard>

                {/* ─── Company Info (Read-only from settings) ──────────────── */}
                <SettingCard icon={<Building size={16} />} title="Company Information" description="Current company settings">
                    <div className="space-y-2">
                        <div className="flex justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg-subtle)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Company Name</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                {company?.name || 'Not set'}
                            </span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg-subtle)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Tax ID</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                {company?.taxId || 'Not set'}
                            </span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg-subtle)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Phone</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                {company?.contact?.phone || 'Not set'}
                            </span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg-subtle)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Email</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                {company?.contact?.email || 'Not set'}
                            </span>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            <a
                                href="/dashboard/settings"
                                style={{ color: 'var(--color-accent)' }}
                                className="hover:underline"
                            >
                                Edit company details →
                            </a>
                        </p>
                    </div>
                </SettingCard>
            </div>

            {/* ─── Save Footer ───────────────────────────────────────────── */}
            <div className="flex justify-end pt-6 mt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-accent flex items-center justify-center gap-2"
                    style={{ minWidth: 140 }}
                >
                    {isSaving ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                            Saving…
                        </>
                    ) : (
                        <>
                            <Save className="h-3.5 w-3.5" />
                            Save Preferences
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Preferences;
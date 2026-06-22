// src/pages/CompanySettings.tsx
import React, { useState, useEffect } from 'react';
import {
  Save, Building, Mail, Phone, MapPin, Receipt,
  X, CheckCircle, Settings, Globe, Clock,
  User, Award, Shield, Calendar
} from 'lucide-react';
import { useAppStore } from '../store';

/* ── Tabular number wrapper ─────────────────────────────────────────── */
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{children}</span>
);

/* ── Shared field helpers ─────────────────────────────────────────────── */
const fieldStyle: React.CSSProperties = {
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-input-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-input-text)',
  outline: 'none',
  fontSize: '0.8125rem',
  padding: '7px 10px',
  width: '100%',
  transition: 'border-color 100ms ease, box-shadow 100ms ease',
};

const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
  e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
};

const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-input-border)';
  e.currentTarget.style.boxShadow = 'none';
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 500,
  marginBottom: 6,
  color: 'var(--color-text-muted)',
};

/* ─── Company Details Card ─────────────────────────────────────────────── */
const DetailCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div
    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
    style={{ background: 'var(--color-bg-subtle)' }}
  >
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
    <div className="flex-1 min-w-0">
      <p className="text-[0.6rem] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="text-[0.82rem] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
        {value || 'Not set'}
      </p>
    </div>
  </div>
);

export const CompanySettings: React.FC = () => {
  const { company, updateCompany } = useAppStore();
  const [activeTab, setActiveTab] = useState<'company' | 'address' | 'receipt'>('company');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    taxId: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'Ghana' },
    contact: { phone: '', email: '', website: '' },
    receiptSettings: { header: '', footer: '', taxRate: 15, includeTaxId: false },
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        logo: company.logo || '',
        taxId: company.taxId || '',
        address: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          state: company.address?.state || '',
          zipCode: company.address?.zipCode || '',
          country: company.address?.country || 'Ghana',
        },
        contact: {
          phone: company.contact?.phone || '',
          email: company.contact?.email || '',
          website: company.contact?.website || '',
        },
        receiptSettings: {
          header: company.receiptSettings?.header || '',
          footer: company.receiptSettings?.footer || '',
          taxRate: company.receiptSettings?.taxRate || 15,
          includeTaxId: company.receiptSettings?.includeTaxId || false,
        },
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await updateCompany(formData);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (path: string, value: any) => {
    setFormData((prev) => {
      const keys = path.split('.');
      const lastKey = keys.pop()!;
      const target = keys.reduce((obj: any, key) => obj[key], prev);
      target[lastKey] = value;
      return { ...prev };
    });
  };

  const tabs = [
    { id: 'company' as const, label: 'Company Information', icon: <Building className="h-3.5 w-3.5" /> },
    { id: 'address' as const, label: 'Address', icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: 'receipt' as const, label: 'Receipt Settings', icon: <Receipt className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* ── Header - Clean & Simple ────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Company Settings
        </h1>
        <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage your company information and system preferences
        </p>
      </div>

      {/* ── Message ────────────────────────────────────────────────── */}
      {message && (
        <div
          className="flex items-center gap-2 p-3 rounded-[10px] text-[0.78rem] font-medium mb-5"
          style={{
            background: message.type === 'success' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
            color: message.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          }}
        >
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <X className="h-4 w-4 flex-shrink-0" />}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-0 mb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setMessage(null); }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[0.8rem] font-medium transition-colors duration-100 cursor-pointer"
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === id ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
              boxShadow: activeTab === id ? 'inset 0 -2px 0 var(--color-accent)' : 'inset 0 -2px 0 transparent',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 -2px 0 var(--color-border-strong)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 -2px 0 transparent';
              }
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        {/* ── Company Information Tab ──────────────────────────────────── */}
        {activeTab === 'company' && (
          <div
            className="rounded-[12px] overflow-hidden"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="p-5 space-y-5">
              {/* Company Details Preview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailCard
                  icon={<Building className="h-4 w-4" />}
                  label="Company Name"
                  value={formData.name || 'Not set'}
                />
                <DetailCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Tax ID"
                  value={formData.taxId || 'Not set'}
                />
                <DetailCard
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={formData.contact.email || 'Not set'}
                />
                <DetailCard
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={formData.contact.phone || 'Not set'}
                />
                <DetailCard
                  icon={<Globe className="h-4 w-4" />}
                  label="Website"
                  value={formData.contact.website || 'Not set'}
                />
                <DetailCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Tax Rate"
                  value={`${formData.receiptSettings.taxRate}%`}
                />
              </div>

              {/* Edit Section */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-[0.72rem] font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Edit Company Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Company Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Tax ID</label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => handleChange('taxId', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => handleChange('contact.email', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={formData.contact.phone}
                      onChange={(e) => handleChange('contact.phone', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="+233..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label style={labelStyle}>Website</label>
                    <input
                      type="url"
                      value={formData.contact.website}
                      onChange={(e) => handleChange('contact.website', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Address Tab ────────────────────────────────────────────────── */}
        {activeTab === 'address' && (
          <div
            className="rounded-[12px] overflow-hidden"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="p-5 space-y-5">
              {/* Address Preview */}
              <div className="grid grid-cols-1 gap-3">
                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="Full Address"
                  value={
                    formData.address.street || formData.address.city || formData.address.country
                      ? `${formData.address.street || ''}${formData.address.street && formData.address.city ? ', ' : ''}${formData.address.city || ''}${formData.address.city && formData.address.state ? ', ' : ''}${formData.address.state || ''}${formData.address.state && formData.address.country ? ', ' : ''}${formData.address.country || ''}`
                      : 'Not set'
                  }
                />
              </div>

              {/* Edit Section */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-[0.72rem] font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Edit Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label style={labelStyle}>Street</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => handleChange('address.street', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleChange('address.city', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="Accra"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>State/Region</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleChange('address.state', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="Greater Accra"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP Code</label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => handleChange('address.zipCode', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="00000"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleChange('address.country', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="Ghana"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Receipt Settings Tab ──────────────────────────────────────── */}
        {activeTab === 'receipt' && (
          <div
            className="rounded-[12px] overflow-hidden"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="p-5 space-y-5">
              {/* Receipt Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailCard
                  icon={<Receipt className="h-4 w-4" />}
                  label="Receipt Header"
                  value={formData.receiptSettings.header || 'Not set'}
                />
                <DetailCard
                  icon={<Receipt className="h-4 w-4" />}
                  label="Receipt Footer"
                  value={formData.receiptSettings.footer || 'Not set'}
                />
                <DetailCard
                  icon={<Award className="h-4 w-4" />}
                  label="Tax Rate"
                  value={`${formData.receiptSettings.taxRate}%`}
                />
                <DetailCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Include Tax ID"
                  value={formData.receiptSettings.includeTaxId ? 'Yes' : 'No'}
                />
              </div>

              {/* Edit Section */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-[0.72rem] font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Edit Receipt Settings
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label style={labelStyle}>Receipt Header</label>
                    <input
                      type="text"
                      value={formData.receiptSettings.header}
                      onChange={(e) => handleChange('receiptSettings.header', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="Thank you for shopping with us"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Receipt Footer</label>
                    <input
                      type="text"
                      value={formData.receiptSettings.footer}
                      onChange={(e) => handleChange('receiptSettings.footer', e.target.value)}
                      style={fieldStyle}
                      onFocus={onF}
                      onBlur={onB}
                      placeholder="Visit us again!"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.receiptSettings.taxRate}
                        onChange={(e) => handleChange('receiptSettings.taxRate', parseFloat(e.target.value))}
                        style={fieldStyle}
                        onFocus={onF}
                        onBlur={onB}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer" style={labelStyle}>
                        <input
                          type="checkbox"
                          id="includeTaxId"
                          checked={formData.receiptSettings.includeTaxId}
                          onChange={(e) => handleChange('receiptSettings.includeTaxId', e.target.checked)}
                          style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }}
                        />
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
                          Include Tax ID on receipts
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Save Button ────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-4 mt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button type="submit" disabled={isLoading} className="btn-accent flex items-center justify-center gap-2" style={{ minWidth: 120 }}>
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
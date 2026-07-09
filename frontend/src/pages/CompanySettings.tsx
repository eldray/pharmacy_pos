// src/pages/CompanySettings.tsx
import React, { useState, useEffect } from 'react';
import {
  Save, Building, Mail, Phone, MapPin, Receipt,
  X, CheckCircle, Settings, Globe, Clock,
  User, Award, Shield, Calendar, Edit2,
  Truck, Package, DollarSign, AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store';

/* ── Shared field helpers ─────────────────────────────────────────────── */
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

/* ─── Detail Card ─────────────────────────────────────────────────────── */
const DetailCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color = 'var(--color-accent)' }) => (
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
        background: `${color}22`,
        color: color,
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

/* ─── Setting Section Card ────────────────────────────────────────────── */
const SettingSection: React.FC<{
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
      setMessage({ type: 'success', text: '✅ Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: '❌ Failed to update settings' });
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
    { id: 'company' as const, label: 'Company', icon: <Building className="h-3.5 w-3.5" /> },
    { id: 'address' as const, label: 'Address', icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: 'receipt' as const, label: 'Receipt', icon: <Receipt className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Company Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Manage your company information and system preferences
        </p>
      </div>

      {/* ── Message ────────────────────────────────────────────────── */}
      {message && (
        <div
          className="flex items-center gap-2 p-3 rounded-[10px] text-[0.82rem] font-medium mb-5"
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
      <div className="flex gap-0 mb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setMessage(null); }}
            className="flex items-center gap-2 px-5 py-3 text-[0.82rem] font-medium transition-colors duration-100 cursor-pointer"
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === id ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
              boxShadow: activeTab === id ? 'inset 0 -2px 0 var(--color-accent)' : 'inset 0 -2px 0 transparent',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        {/* ── Company Information Tab ──────────────────────────────────── */}
        {activeTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Details Preview */}
            <SettingSection
              icon={<Building size={16} />}
              title="Company Details"
              description="Current company information"
            >
              <div className="space-y-3">
                <DetailCard
                  icon={<Building className="h-4 w-4" />}
                  label="Company Name"
                  value={formData.name}
                  color="var(--color-accent)"
                />
                <DetailCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Tax ID"
                  value={formData.taxId}
                  color="var(--color-role-officer)"
                />
                <DetailCard
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={formData.contact.email}
                  color="var(--color-info)"
                />
                <DetailCard
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={formData.contact.phone}
                  color="var(--color-success)"
                />
                <DetailCard
                  icon={<Globe className="h-4 w-4" />}
                  label="Website"
                  value={formData.contact.website}
                  color="var(--color-role-lab)"
                />
                <DetailCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Tax Rate"
                  value={`${formData.receiptSettings.taxRate}%`}
                  color="var(--color-warning)"
                />
              </div>
            </SettingSection>

            {/* Right: Edit Form */}
            <SettingSection
              icon={<Edit2 size={16} />}
              title="Edit Information"
              description="Update company details"
            >
              <div className="space-y-4">
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
                    placeholder="Pharmacy Name"
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
                    placeholder="GRA Tax ID"
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
                    placeholder="info@pharmacy.com"
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
                    placeholder="+233 55 123 4567"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input
                    type="url"
                    value={formData.contact.website}
                    onChange={(e) => handleChange('contact.website', e.target.value)}
                    style={fieldStyle}
                    onFocus={onF}
                    onBlur={onB}
                    placeholder="https://www.pharmacy.com"
                  />
                </div>
              </div>
            </SettingSection>
          </div>
        )}

        {/* ── Address Tab ────────────────────────────────────────────────── */}
        {activeTab === 'address' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Address Preview */}
            <SettingSection
              icon={<MapPin size={16} />}
              title="Current Address"
              description="Your business location"
            >
              <div className="space-y-3">
                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="Street"
                  value={formData.address.street}
                  color="var(--color-accent)"
                />
                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="City"
                  value={formData.address.city}
                  color="var(--color-info)"
                />
                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="State/Region"
                  value={formData.address.state}
                  color="var(--color-success)"
                />
                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="ZIP Code"
                  value={formData.address.zipCode}
                  color="var(--color-warning)"
                />
                <DetailCard
                  icon={<Globe className="h-4 w-4" />}
                  label="Country"
                  value={formData.address.country}
                  color="var(--color-role-lab)"
                />
              </div>
            </SettingSection>

            {/* Right: Edit Form */}
            <SettingSection
              icon={<Edit2 size={16} />}
              title="Edit Address"
              description="Update your location"
            >
              <div className="space-y-4">
                <div>
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
            </SettingSection>
          </div>
        )}

        {/* ── Receipt Settings Tab ──────────────────────────────────────── */}
        {activeTab === 'receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Receipt Preview */}
            <SettingSection
              icon={<Receipt size={16} />}
              title="Receipt Preview"
              description="Current receipt settings"
            >
              <div className="space-y-3">
                <DetailCard
                  icon={<Receipt className="h-4 w-4" />}
                  label="Receipt Header"
                  value={formData.receiptSettings.header}
                  color="var(--color-accent)"
                />
                <DetailCard
                  icon={<Receipt className="h-4 w-4" />}
                  label="Receipt Footer"
                  value={formData.receiptSettings.footer}
                  color="var(--color-success)"
                />
                <DetailCard
                  icon={<Award className="h-4 w-4" />}
                  label="Tax Rate"
                  value={`${formData.receiptSettings.taxRate}%`}
                  color="var(--color-warning)"
                />
                <DetailCard
                  icon={<Shield className="h-4 w-4" />}
                  label="Include Tax ID"
                  value={formData.receiptSettings.includeTaxId ? 'Yes ✅' : 'No ❌'}
                  color={formData.receiptSettings.includeTaxId ? 'var(--color-success)' : 'var(--color-danger)'}
                />
              </div>
            </SettingSection>

            {/* Right: Edit Form */}
            <SettingSection
              icon={<Edit2 size={16} />}
              title="Edit Receipt Settings"
              description="Customize your receipts"
            >
              <div className="space-y-4">
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
                  <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Appears at the top of every receipt
                  </p>
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
                  <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Appears at the bottom of every receipt
                  </p>
                </div>
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
                <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--color-bg-subtle)' }}>
                  <input
                    type="checkbox"
                    id="includeTaxId"
                    checked={formData.receiptSettings.includeTaxId}
                    onChange={(e) => handleChange('receiptSettings.includeTaxId', e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="includeTaxId" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                    Include Tax ID on receipts
                  </label>
                </div>
              </div>
            </SettingSection>
          </div>
        )}

        {/* ── Save Button ────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-6 mt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button type="submit" disabled={isLoading} className="btn-accent flex items-center justify-center gap-2" style={{ minWidth: 140 }}>
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

export default CompanySettings;
// src/pages/CompanySettings.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Building, Mail, Phone, MapPin, Receipt,
  X, CheckCircle, Settings, Globe, Clock,
  Shield, Edit2, Database, Download, Upload,
  AlertTriangle, Loader2, RefreshCw, HardDrive,
} from 'lucide-react';
import { useAppStore } from '../store';
import api, { getErrorMessage } from '../api/api';

/* ─── Shared field styles ─────────────────────────────────────────────── */
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
  fontSize: '0.7rem',
  fontWeight: 600,
  marginBottom: 6,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.03em',
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

/* ─── Section card ────────────────────────────────────────────────────── */
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, description, action, children }) => (
  <div
    style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
        <div style={{ minWidth: 0 }}>
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
      {action}
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

/* ─── Info tile ───────────────────────────────────────────────────────── */
const InfoTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color = 'var(--color-accent)' }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      background: 'var(--color-bg-subtle)',
      borderRadius: 'var(--radius-md)',
    }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        background: `${color}22`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-primary)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || 'Not set'}
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
type Tab = 'company' | 'address' | 'receipt' | 'backup';

export const CompanySettings: React.FC = () => {
  const { company, updateCompany } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('company');
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

  /* ── Backup state ─────────────────────────────────────────────────── */
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    file: File;
    meta: { name?: string; size: number; createdAt?: string; tables?: number } | null;
  } | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const last = keys.pop()!;
      const target = keys.reduce((obj: any, k) => obj[k], prev);
      target[last] = value;
      return { ...prev };
    });
  };

  /* ── Backup handlers ─────────────────────────────────────────────── */
  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMessage(null);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `pharmacy-backup-${stamp}.json`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMessage({ type: 'success', text: 'Backup downloaded successfully' });
      setTimeout(() => setBackupMessage(null), 4000);
    } catch (err) {
      setBackupMessage({ type: 'error', text: getErrorMessage(err, 'Backup failed') });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestorePick = (file: File) => {
    setBackupMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      let meta: any = null;
      try {
        const parsed = JSON.parse(String(reader.result));
        meta = {
          name: parsed?.metadata?.name || parsed?.name,
          size: file.size,
          createdAt: parsed?.metadata?.createdAt,
          tables: parsed?.metadata?.tables ?? (parsed?.tables ? Object.keys(parsed.tables).length : undefined),
        };
      } catch {
        setBackupMessage({ type: 'error', text: 'Invalid backup file — not valid JSON' });
        return;
      }
      setRestorePreview({ file, meta });
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restorePreview) return;
    if (!window.confirm(
      'This will OVERWRITE the current database with the backup file. ' +
      'Any data created since the backup was taken will be lost.\n\nContinue?'
    )) return;

    setRestoreLoading(true);
    setBackupMessage(null);
    try {
      const text = await restorePreview.file.text();
      const parsed = JSON.parse(text);
      await api.post('/backup/restore', parsed);
      setBackupMessage({ type: 'success', text: 'Database restored successfully. Reloading…' });
      setRestorePreview(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setBackupMessage({ type: 'error', text: getErrorMessage(err, 'Restore failed') });
    } finally {
      setRestoreLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'Company', icon: <Building className="h-3.5 w-3.5" /> },
    { id: 'address', label: 'Address', icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: 'receipt', label: 'Receipt', icon: <Receipt className="h-3.5 w-3.5" /> },
    { id: 'backup', label: 'Backup & Restore', icon: <Database className="h-3.5 w-3.5" /> },
  ];

  const banner = message || backupMessage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
            <Settings className="h-4 w-4" style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Company Settings
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              Manage company information, receipts, and system backups
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-success-light)',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success-text)',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
          Auto-saved to database
        </div>
      </div>

      {/* ── Global message banner ───────────────────────────────────── */}
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
            background: banner.type === 'success' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
            color: banner.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            border: `1px solid ${banner.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          }}
        >
          {banner.type === 'success'
            ? <CheckCircle className="h-4 w-4" style={{ flexShrink: 0 }} />
            : <AlertTriangle className="h-4 w-4" style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{banner.text}</span>
          <button
            onClick={() => { setMessage(null); setBackupMessage(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        {tabs.map(({ id, label, icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setMessage(null); setBackupMessage(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
                color: active ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'color 100ms',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Form (company / address / receipt) ──────────────────────── */}
      {activeTab !== 'backup' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {activeTab === 'company' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
              <Section icon={<Building size={16} />} title="Company Details" description="Current company information">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <InfoTile icon={<Building className="h-4 w-4" />} label="Company Name" value={formData.name} />
                  <InfoTile icon={<Shield className="h-4 w-4" />} label="Tax ID" value={formData.taxId} color="var(--color-info)" />
                  <InfoTile icon={<Mail className="h-4 w-4" />} label="Email" value={formData.contact.email} color="var(--color-info)" />
                  <InfoTile icon={<Phone className="h-4 w-4" />} label="Phone" value={formData.contact.phone} color="var(--color-success)" />
                  <InfoTile icon={<Globe className="h-4 w-4" />} label="Website" value={formData.contact.website} color="var(--color-role-lab)" />
                  <InfoTile icon={<Clock className="h-4 w-4" />} label="Tax Rate" value={`${formData.receiptSettings.taxRate}%`} color="var(--color-warning)" />
                </div>
              </Section>

              <Section icon={<Edit2 size={16} />} title="Edit Information" description="Update company details">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Company Name *</label>
                    <input type="text" value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB} required placeholder="Pharmacy Name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Tax ID</label>
                    <input type="text" value={formData.taxId}
                      onChange={(e) => handleChange('taxId', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB} placeholder="GRA Tax ID" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={formData.contact.email}
                      onChange={(e) => handleChange('contact.email', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB} placeholder="info@pharmacy.com" />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input type="tel" value={formData.contact.phone}
                      onChange={(e) => handleChange('contact.phone', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB} placeholder="+233 55 123 4567" />
                  </div>
                  <div>
                    <label style={labelStyle}>Website</label>
                    <input type="url" value={formData.contact.website}
                      onChange={(e) => handleChange('contact.website', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB} placeholder="https://pharmacy.com" />
                  </div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'address' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
              <Section icon={<MapPin size={16} />} title="Current Address" description="Your business location">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <InfoTile icon={<MapPin className="h-4 w-4" />} label="Street" value={formData.address.street} />
                  <InfoTile icon={<MapPin className="h-4 w-4" />} label="City" value={formData.address.city} color="var(--color-info)" />
                  <InfoTile icon={<MapPin className="h-4 w-4" />} label="State / Region" value={formData.address.state} color="var(--color-success)" />
                  <InfoTile icon={<MapPin className="h-4 w-4" />} label="ZIP Code" value={formData.address.zipCode} color="var(--color-warning)" />
                  <InfoTile icon={<Globe className="h-4 w-4" />} label="Country" value={formData.address.country} color="var(--color-role-lab)" />
                </div>
              </Section>

              <Section icon={<Edit2 size={16} />} title="Edit Address" description="Update your location">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(['street', 'city', 'state', 'zipCode', 'country'] as const).map((field) => (
                    <div key={field}>
                      <label style={labelStyle}>
                        {field === 'zipCode' ? 'ZIP Code' : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <input type="text" value={formData.address[field]}
                        onChange={(e) => handleChange(`address.${field}`, e.target.value)}
                        style={fieldStyle} onFocus={onF} onBlur={onB} />
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'receipt' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
              <Section icon={<Receipt size={16} />} title="Receipt Preview" description="Current receipt settings">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <InfoTile icon={<Receipt className="h-4 w-4" />} label="Receipt Header" value={formData.receiptSettings.header} />
                  <InfoTile icon={<Receipt className="h-4 w-4" />} label="Receipt Footer" value={formData.receiptSettings.footer} color="var(--color-success)" />
                  <InfoTile icon={<Clock className="h-4 w-4" />} label="Tax Rate" value={`${formData.receiptSettings.taxRate}%`} color="var(--color-warning)" />
                  <InfoTile
                    icon={<Shield className="h-4 w-4" />}
                    label="Include Tax ID"
                    value={formData.receiptSettings.includeTaxId ? 'Yes' : 'No'}
                    color={formData.receiptSettings.includeTaxId ? 'var(--color-success)' : 'var(--color-danger)'}
                  />
                </div>
              </Section>

              <Section icon={<Edit2 size={16} />} title="Edit Receipt Settings" description="Customize your receipts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Receipt Header</label>
                    <input type="text" value={formData.receiptSettings.header}
                      onChange={(e) => handleChange('receiptSettings.header', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB}
                      placeholder="Thank you for shopping with us" />
                    <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      Appears at the top of every receipt
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Receipt Footer</label>
                    <input type="text" value={formData.receiptSettings.footer}
                      onChange={(e) => handleChange('receiptSettings.footer', e.target.value)}
                      style={fieldStyle} onFocus={onF} onBlur={onB}
                      placeholder="Visit us again!" />
                    <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      Appears at the bottom of every receipt
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Tax Rate (%)</label>
                    <input type="number" step="0.01" min="0" max="100"
                      value={formData.receiptSettings.taxRate}
                      onChange={(e) => handleChange('receiptSettings.taxRate', parseFloat(e.target.value))}
                      style={fieldStyle} onFocus={onF} onBlur={onB} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <input
                      type="checkbox" id="includeTaxId"
                      checked={formData.receiptSettings.includeTaxId}
                      onChange={(e) => handleChange('receiptSettings.includeTaxId', e.target.checked)}
                      style={{ accentColor: 'var(--color-accent)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label htmlFor="includeTaxId" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                      Include Tax ID on receipts
                    </label>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-accent"
              style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'center' }}
            >
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save Settings</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── Backup & Restore tab ────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info strip */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-info-light)',
              border: '1px solid var(--color-info)',
              color: 'var(--color-info-text)',
              fontSize: '0.82rem',
            }}
          >
            <HardDrive className="h-4 w-4" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Backups are full JSON snapshots of every table.</strong>
              <div style={{ marginTop: 2, opacity: 0.85 }}>
                Take a backup before upgrades or major data entry. Restoring will overwrite the
                current database with the contents of the file.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>

            {/* Backup card */}
            <Section
              icon={<Download size={16} />}
              title="Download Backup"
              description="Export a snapshot of the entire database"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  <li>Every table, all rows</li>
                  <li>Safe to run any time</li>
                  <li>Saved as <code>pharmacy-backup-YYYY-MM-DD.json</code></li>
                </ul>
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={backupLoading}
                  className="btn-accent"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                >
                  {backupLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…</>
                  ) : (
                    <><Download className="h-3.5 w-3.5" /> Download Backup</>
                  )}
                </button>
              </div>
            </Section>

            {/* Restore card */}
            <Section
              icon={<Upload size={16} />}
              title="Restore from Backup"
              description="Overwrite the database with a saved backup"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {!restorePreview ? (
                  <>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleRestorePick(f);
                      }}
                      style={{
                        border: '2px dashed var(--color-border-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'var(--color-bg-subtle)',
                        transition: 'border-color 100ms',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)'; }}
                    >
                      <Upload className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        Click or drop a backup file
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        Accepts .json files created by this system
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleRestorePick(f);
                        e.target.value = '';
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Database className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {restorePreview.file.name}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        <div>Size: {(restorePreview.file.size / 1024).toFixed(1)} KB</div>
                        {restorePreview.meta?.tables !== undefined && (
                          <div>Tables in backup: {restorePreview.meta.tables}</div>
                        )}
                        {restorePreview.meta?.createdAt && (
                          <div>Created: {new Date(restorePreview.meta.createdAt).toLocaleString()}</div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'var(--color-warning-light)',
                        border: '1px solid var(--color-warning)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-warning-text)',
                        fontSize: '0.75rem',
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      This will overwrite the current database.
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setRestorePreview(null)}
                        disabled={restoreLoading}
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: restoreLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRestore}
                        disabled={restoreLoading}
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-danger)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: restoreLoading ? 'not-allowed' : 'pointer',
                          opacity: restoreLoading ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {restoreLoading ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Restoring…</>
                        ) : (
                          <><Upload className="h-3.5 w-3.5" /> Restore Database</>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {backupMessage?.type === 'success' && !restorePreview && (
                  <button
                    type="button"
                    onClick={() => setBackupMessage(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                      fontSize: '0.75rem', color: 'var(--color-text-muted)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    }}
                  >
                    <RefreshCw className="h-3 w-3" /> Clear message
                  </button>
                )}
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySettings;
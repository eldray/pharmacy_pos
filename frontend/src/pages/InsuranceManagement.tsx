import React, { useState, useEffect } from 'react';
import { Shield, Plus, FileText, Percent, Phone, Mail, Building, Edit2, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { InsuranceProvider, InsuranceClaim } from '../types';
import { Card } from '../components/ui/Card';

export const InsuranceManagement: React.FC = () => {
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [activeTab, setActiveTab] = useState<'providers' | 'claims'>('providers');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    coverageType: 'percentage' as 'percentage' | 'fixed',
    defaultCopayPercent: 20,
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  // --- Shared field style (matches SupplierManagement) ---
  const fieldStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '0.875rem',
    padding: '10px 14px',
    width: '100%',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
  };

  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/insurance/providers'),
        api.get('/insurance/claims'),
      ]);
      setProviders(pRes.data);
      setClaims(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      name: '', code: '', coverageType: 'percentage',
      defaultCopayPercent: 20, contactPerson: '', phone: '', email: '', address: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: InsuranceProvider) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      code: p.code,
      coverageType: p.coverageType || 'percentage',
      defaultCopayPercent: p.defaultCopayPercent ?? 20,
      contactPerson: p.contactPerson || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      if (editingId) {
        await api.put(`/insurance/providers/${editingId}`, formData);
        setSuccess('Provider updated successfully!');
      } else {
        await api.post('/insurance/providers', formData);
        setSuccess('Insurance provider added successfully!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Shield className="w-4 h-4" style={{ color: 'var(--color-accent-text)' }} /> Insurance &amp; Co-Pay Management
          </h1>
          <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Configure providers, coverage type, and reimbursement claims.
          </p>
        </div>
        <button
          onClick={openNew}
          className="btn-accent flex items-center gap-2 px-4 py-1.5 text-[0.75rem]"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {success && (
        <div
          className="p-4 rounded-lg text-sm font-medium"
          style={{
            background: 'var(--color-success-light)',
            color: 'var(--color-success-text)',
            border: '1px solid var(--color-success)',
          }}
        >
          {success}
        </div>
      )}

      <div className="flex rounded-xl p-1 w-fit" style={{ background: 'var(--color-bg-subtle)' }}>
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 rounded-lg text-[0.75rem] font-semibold transition-all flex items-center gap-2 ${activeTab === 'providers'
            ? 'surface-elevated shadow-sm'
            : 'hover:bg-subtle'
            }`}
          style={{
            color: activeTab === 'providers' ? 'var(--color-accent-text)' : 'var(--color-text-muted)'
          }}
        >
          <Building className="w-4 h-4" /> Providers ({providers.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-lg text-[0.75rem] font-semibold transition-all flex items-center gap-2 ${activeTab === 'claims'
            ? 'surface-elevated shadow-sm'
            : 'hover:bg-subtle'
            }`}
          style={{
            color: activeTab === 'claims' ? 'var(--color-accent-text)' : 'var(--color-text-muted)'
          }}
        >
          <FileText className="w-4 h-4" /> Claims ({claims.length})
        </button>
      </div>

      {activeTab === 'providers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <Card className="p-12 text-center col-span-full">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
            </Card>
          ) : providers.length === 0 ? (
            <Card className="p-12 text-center col-span-full">
              <Shield className="h-16 w-16 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">No Providers Yet</h3>
              <p className="text-secondary">Add an insurance provider to start tracking co-pay and reimbursement.</p>
            </Card>
          ) : providers.map((p) => (
            <Card key={p.id} className="p-6 space-y-4 border-theme hover:border-accent transition-all duration-200 group">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-primary text-lg group-hover:text-accent transition-colors">{p.name}</h3>
                  <div className="text-xs font-mono text-muted">Code: {p.code}</div>
                </div>
                {p.coverageType === 'percentage' ? (
                  <span className="badge badge-success font-bold flex items-center gap-1">
                    <Percent className="w-3 h-3" /> {p.defaultCopayPercent}% Co-Pay
                  </span>
                ) : (
                  <span className="badge badge-warning font-bold flex items-center gap-1">
                    Fixed Rate (per product)
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-secondary pt-2 border-t border-theme">
                {p.contactPerson && <div>Contact: <span className="font-medium text-primary">{p.contactPerson}</span></div>}
                {p.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted" /> {p.phone}</div>}
                {p.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted" /> {p.email}</div>}
              </div>

              <div className="pt-2 border-t border-theme flex justify-end">
                <button
                  onClick={() => openEdit(p)}
                  className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--color-accent-text)' }}
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : isLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
        </Card>
      ) : claims.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Claims Yet</h3>
          <p className="text-secondary">Reimbursement claims raised at the till will be listed here.</p>
        </Card>
      ) : (
        <Card noPadding className="overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-subtle border-b border-theme">
              <tr className="text-secondary font-semibold text-xs uppercase">
                <th className="p-4 text-left">Claim #</th>
                <th className="p-4 text-left">Provider</th>
                <th className="p-4 text-left">Policy #</th>
                <th className="p-4 text-left">Total</th>
                <th className="p-4 text-left">Claimable</th>
                <th className="p-4 text-left">Co-Pay</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-subtle transition-colors">
                  <td className="p-4 font-mono font-semibold text-sm text-accent">{c.claimNumber}</td>
                  <td className="p-4 text-sm text-primary">{c.provider?.name || 'N/A'}</td>
                  <td className="p-4 font-mono text-xs text-secondary">{c.policyNumber}</td>
                  <td className="p-4 font-semibold text-sm text-primary">${Number(c.totalAmount).toFixed(2)}</td>
                  <td className="p-4 font-medium text-sm" style={{ color: 'var(--color-success-text)' }}>${Number(c.claimAmount).toFixed(2)}</td>
                  <td className="p-4 text-sm" style={{ color: 'var(--color-info-text)' }}>${Number(c.copayPaid).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="badge badge-warning font-medium">{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal"
          style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal)' }}
        >
          <div className="surface-elevated rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border-theme">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {editingId ? 'Edit Insurance Provider' : 'Add Insurance Provider'}
            </h2>
            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  background: 'var(--color-danger-light)',
                  color: 'var(--color-danger-text)',
                  border: '1px solid var(--color-danger)',
                }}
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Provider Name</label>
                <input
                  type="text" required
                  placeholder="e.g. National Health Insurance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base w-full text-sm"
                  style={fieldStyle}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Code</label>
                  <input
                    type="text" required placeholder="NHIS-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Coverage Type</label>
                  <select
                    value={formData.coverageType}
                    onChange={(e) => setFormData({ ...formData, coverageType: e.target.value as any })}
                    className="select-base w-full text-sm"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-input-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-input-text)',
                      outline: 'none',
                      fontSize: '0.875rem',
                      padding: '10px 32px 10px 14px',
                      width: '100%',
                      transition: 'border-color 100ms ease, box-shadow 100ms ease',
                    }}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rate (per product)</option>
                  </select>
                </div>
              </div>

              {formData.coverageType === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Default Co-Pay (%)</label>
                  <input
                    type="number" required min="0" max="100"
                    value={formData.defaultCopayPercent}
                    onChange={(e) => setFormData({ ...formData, defaultCopayPercent: parseFloat(e.target.value) || 0 })}
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                  <p className="text-xs text-muted mt-1">
                    Patient pays this % of the bill. Insurer pays the rest.
                  </p>
                </div>
              )}

              {formData.coverageType === 'fixed' && (
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{
                    background: 'var(--color-warning-light)',
                    color: 'var(--color-warning-text)',
                    border: '1px solid var(--color-warning)',
                  }}
                >
                  Fixed rate uses the <strong>Insurance Price</strong> set on each product/test.
                  The insurer pays that amount; the patient pays the remaining balance.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="btn-ghost px-4 py-2"
                >Cancel</button>
                <button
                  type="submit"
                  className="btn-accent px-4 py-2"
                >{editingId ? 'Save Changes' : 'Save Provider'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Shield, Plus, FileText, Percent, Phone, Mail, Building, Edit2, X } from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { InsuranceProvider, InsuranceClaim } from '../types';

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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" /> Insurance & Co-Pay Management
          </h1>
          <p className="text-gray-500">Configure providers, coverage type, and reimbursement claims.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition"
        >
          <Plus className="w-5 h-5" /> Add Provider
        </button>
      </div>

      {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg border border-emerald-200">{success}</div>}

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'providers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Building className="w-4 h-4" /> Providers ({providers.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'claims' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <FileText className="w-4 h-4" /> Claims ({claims.length})
        </button>
      </div>

      {activeTab === 'providers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                  <div className="text-xs font-mono text-gray-400">Code: {p.code}</div>
                </div>
                {p.coverageType === 'percentage' ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Percent className="w-3 h-3" /> {p.defaultCopayPercent}% Co-Pay
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    Fixed Rate (per product)
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600 pt-2 border-t border-gray-100">
                {p.contactPerson && <div>Contact: <span className="font-medium text-gray-800">{p.contactPerson}</span></div>}
                {p.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {p.phone}</div>}
                {p.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {p.email}</div>}
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => openEdit(p)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600 font-semibold text-sm">
                <th className="p-4">Claim #</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Policy #</th>
                <th className="p-4">Total</th>
                <th className="p-4">Claimable</th>
                <th className="p-4">Co-Pay</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-mono font-semibold text-indigo-600">{c.claimNumber}</td>
                  <td className="p-4">{c.provider?.name || 'N/A'}</td>
                  <td className="p-4 font-mono text-xs">{c.policyNumber}</td>
                  <td className="p-4 font-semibold">${Number(c.totalAmount).toFixed(2)}</td>
                  <td className="p-4 text-emerald-600 font-medium">${Number(c.claimAmount).toFixed(2)}</td>
                  <td className="p-4 text-blue-600">${Number(c.copayPaid).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              {editingId ? 'Edit Insurance Provider' : 'Add Insurance Provider'}
            </h2>
            {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                <input
                  type="text" required
                  placeholder="e.g. National Health Insurance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text" required placeholder="NHIS-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border rounded-lg p-2.5 border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type</label>
                  <select
                    value={formData.coverageType}
                    onChange={(e) => setFormData({ ...formData, coverageType: e.target.value as any })}
                    className="w-full border rounded-lg p-2.5 border-gray-300"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rate (per product)</option>
                  </select>
                </div>
              </div>

              {formData.coverageType === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Co-Pay (%)</label>
                  <input
                    type="number" required min="0" max="100"
                    value={formData.defaultCopayPercent}
                    onChange={(e) => setFormData({ ...formData, defaultCopayPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2.5 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Patient pays this % of the bill. Insurer pays the rest.
                  </p>
                </div>
              )}

              {formData.coverageType === 'fixed' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  Fixed rate uses the <strong>Insurance Price</strong> set on each product/test.
                  The insurer pays that amount; the patient pays the remaining balance.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >Cancel</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >{editingId ? 'Save Changes' : 'Save Provider'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
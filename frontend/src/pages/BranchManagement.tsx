// src/pages/BranchManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, ArrowRightLeft, Warehouse, CheckCircle, MapPin, Phone, Mail,
  X, Loader2, Package, User, Truck, Ban, Trash2, Filter,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { useAppStore } from '../store';
import { Branch, Product, StockTransfer, StockTransferItem } from '../types';
import { Card } from '../components/ui/Card';

const STATUS_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: '⏳ Pending', bg: 'var(--color-warning-light)', color: 'var(--color-warning-text)' },
  in_transit: { label: '🚚 In Transit', bg: 'var(--color-info-light)', color: 'var(--color-info-text)' },
  completed: { label: '✅ Completed', bg: 'var(--color-success-light)', color: 'var(--color-success-text)' },
  rejected: { label: '🚫 Rejected', bg: 'var(--color-danger-light)', color: 'var(--color-danger-text)' },
};

export const BranchManagement: React.FC = () => {
  const { currentUser, products } = useAppStore();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [activeTab, setActiveTab] = useState<'branches' | 'transfers'>('branches');
  const [transferStatusFilter, setTransferStatusFilter] = useState<'all' | StockTransfer['status']>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManageBranches = ['admin', 'manager'].includes(currentUser?.role || '');
  const canCreateTransfer = ['admin', 'manager', 'pharmacist_sales'].includes(currentUser?.role || '');
  const canApproveTransfer = ['admin', 'manager'].includes(currentUser?.role || '');

  const [branchForm, setBranchForm] = useState({
    name: '', code: '', type: 'branch' as 'branch' | 'warehouse',
    address: '', phone: '', email: '', isMain: false,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bRes, tRes] = await Promise.all([
        api.get('/branches'),
        api.get('/branches/transfers'),
      ]);
      setBranches(bRes.data || []);
      setTransfers(tRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/branches', branchForm);
      setSuccess('Branch created successfully!');
      setShowBranchModal(false);
      setBranchForm({ name: '', code: '', type: 'branch', address: '', phone: '', email: '', isMain: false });
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleTransferCreated = () => {
    setShowTransferModal(false);
    setSuccess('Transfer request created. Awaiting approval.');
    fetchData();
  };

  const handleTransferStatus = async (id: string, status: StockTransfer['status']) => {
    const labels: Record<string, string> = {
      in_transit: 'approve & mark as In Transit',
      completed: 'mark as Completed (will move stock)',
      rejected: 'reject',
    };
    if (!window.confirm(`Are you sure you want to ${labels[status] || status}?`)) return;

    setActionLoading(id);
    try {
      await api.put(`/branches/transfers/${id}/status`, { status });
      setSuccess(`Transfer status updated to ${status}.`);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTransfers = useMemo(() => {
    if (transferStatusFilter === 'all') return transfers;
    return transfers.filter((t) => t.status === transferStatusFilter);
  }, [transfers, transferStatusFilter]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" /> Multi-Branch & Warehouse
          </h1>
          <p className="text-gray-500">Manage warehouses, branches, and inter-branch stock transfers.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCreateTransfer && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition"
            >
              <ArrowRightLeft className="w-5 h-5" /> New Stock Transfer
            </button>
          )}
          {canManageBranches && (
            <button
              onClick={() => setShowBranchModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition"
            >
              <Plus className="w-5 h-5" /> Add Branch / Warehouse
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-lg border border-rose-200">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'branches' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Building2 className="w-4 h-4" /> Locations ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'transfers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Stock Transfers ({transfers.length})
        </button>
      </div>

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <Card className="p-12 text-center col-span-full">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            </Card>
          ) : branches.length === 0 ? (
            <Card className="p-12 text-center col-span-full">
              <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No branches yet. Add your first location to get started.</p>
            </Card>
          ) : branches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${b.type === 'warehouse' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {b.type === 'warehouse' ? <Warehouse className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{b.name}</h3>
                    <div className="text-xs font-mono text-gray-400">Code: {b.code}</div>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${b.type === 'warehouse' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                  {b.type.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-gray-600 pt-2 border-t border-gray-100">
                {b.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {b.address}</div>}
                {b.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {b.phone}</div>}
                {b.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {b.email}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Status:</span>
            {(['all', 'pending', 'in_transit', 'completed', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setTransferStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${transferStatusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="p-12 text-center">
                <ArrowRightLeft className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No stock transfers {transferStatusFilter !== 'all' ? `with status "${transferStatusFilter}"` : ''} yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600 font-semibold text-sm">
                    <th className="p-4">Transfer #</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Items</th>
                    <th className="p-4">Requested By</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransfers.map((t) => {
                    const badge = STATUS_BADGES[t.status] || STATUS_BADGES.pending;
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-mono font-semibold text-indigo-600 text-sm">{t.transferNumber}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-700">{t.fromBranch?.name || 'N/A'}</span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{t.toBranch?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {t.items?.length || 0} item{(t.items?.length || 0) !== 1 ? 's' : ''}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            {t.requester?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {canApproveTransfer && t.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleTransferStatus(t.id, 'in_transit')}
                                  disabled={actionLoading === t.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                                  style={{ background: 'var(--color-info-light)', color: 'var(--color-info-text)', border: '1px solid var(--color-info)' }}
                                >
                                  <Truck className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handleTransferStatus(t.id, 'rejected')}
                                  disabled={actionLoading === t.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                                  style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)' }}
                                >
                                  <Ban className="w-3 h-3" /> Reject
                                </button>
                              </>
                            )}
                            {canApproveTransfer && t.status === 'in_transit' && (
                              <button
                                onClick={() => handleTransferStatus(t.id, 'completed')}
                                disabled={actionLoading === t.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                                style={{ background: 'var(--color-success-light)', color: 'var(--color-success-text)', border: '1px solid var(--color-success)' }}
                              >
                                <CheckCircle className="w-3 h-3" /> Mark Completed
                              </button>
                            )}
                            {(t.status === 'completed' || t.status === 'rejected') && (
                              <span className="text-xs text-gray-400">No actions</span>
                            )}
                            {!canApproveTransfer && t.status === 'pending' && (
                              <span className="text-xs text-gray-400">Awaiting approval</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showBranchModal && canManageBranches && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowBranchModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Location / Branch</h2>
              <button onClick={() => setShowBranchModal(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                <input type="text" required placeholder="e.g. Central Warehouse"
                  value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 border-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code *</label>
                  <input type="text" required placeholder="WH-01"
                    value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="w-full border rounded-lg p-2.5 border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={branchForm.type} onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value as any })}
                    className="w-full border rounded-lg p-2.5 border-gray-300">
                    <option value="branch">Branch (Retail POS)</option>
                    <option value="warehouse">Central Warehouse</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full border rounded-lg p-2.5 border-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full border rounded-lg p-2.5 border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    className="w-full border rounded-lg p-2.5 border-gray-300" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={branchForm.isMain} onChange={(e) => setBranchForm({ ...branchForm, isMain: e.target.checked })} />
                Mark as main branch
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowBranchModal(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Transfer Modal */}
      {showTransferModal && canCreateTransfer && (
        <TransferModal
          branches={branches}
          products={products}
          onClose={() => setShowTransferModal(false)}
          onCreated={handleTransferCreated}
        />
      )}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════════
   Transfer Creation Modal
   ═════════════════════════════════════════════════════════════════════ */
const TransferModal: React.FC<{
  branches: Branch[];
  products: Product[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ branches, products, onClose, onCreated }) => {
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockTransferItem[]>([
    { productId: '', productName: '', quantity: 1 },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => setItems([...items, { productId: '', productName: '', quantity: 1 }]);

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<StockTransferItem>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleProductChange = (idx: number, productId: string) => {
    const p = products.find((x) => String(x.id) === productId);
    updateItem(idx, { productId, productName: p?.name || '' });
  };

  const handleSubmit = async () => {
    setError('');
    if (!fromBranchId) return setError('Select a source branch');
    if (!toBranchId) return setError('Select a destination branch');
    if (fromBranchId === toBranchId) return setError('Source and destination must be different');
    if (items.length === 0) return setError('Add at least one item');
    for (const it of items) {
      if (!it.productId) return setError('Select a product for each item');
      if (!it.quantity || it.quantity <= 0) return setError('Quantity must be greater than 0');
    }

    setBusy(true);
    try {
      await api.post('/branches/transfers', {
        fromBranchId, toBranchId, notes,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
        })),
      });
      onCreated();
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
    padding: '8px 12px', outline: 'none', height: 38, width: '100%',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" /> New Stock Transfer
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Branch *</label>
              <select value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)} style={fieldStyle}>
                <option value="">-- Select source --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Branch *</label>
              <select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} style={fieldStyle}>
                <option value="">-- Select destination --</option>
                {branches.filter((b) => String(b.id) !== fromBranchId).map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Package className="w-4 h-4" /> Items ({items.length})
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      value={it.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">-- Select product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                    style={{ ...fieldStyle, width: 90 }}
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="p-2 rounded transition disabled:opacity-30"
                    style={{ color: 'var(--color-danger-text)' }}
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer, urgency, etc."
              rows={2}
              style={{ ...fieldStyle, height: 'auto', minHeight: 60, resize: 'vertical' }}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Note:</strong> Stock is only deducted from the source branch when a manager/admin marks the transfer as <em>Completed</em>.
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Submitting…' : 'Submit Transfer Request'}
          </button>
        </div>
      </div>
    </div>
  );
};
// src/pages/SupplierManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Truck, Phone, Mail, MapPin, Building,
  Search, ArrowUpRight, Users, X, TrendingUp, Loader2
} from 'lucide-react';
import { useAppStore } from '../store';
import { Supplier } from '../types';
import { Card } from '../components/ui/Card';

export const SupplierManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  // --- Shared field style ---
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

  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const { currentUser, fetchSuppliers, suppliers, addSupplier, updateSupplier } = useAppStore();

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open modal for new supplier
  const openNewSupplierModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Ghana',
    });
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || 'Ghana',
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const commonData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city || undefined,
        country: formData.country || undefined,
      };

      let success = false;
      if (editingSupplier) {
        success = !!(await updateSupplier(editingSupplier.id, commonData));
      } else {
        success = !!(await addSupplier(commonData));
      }

      if (success) {
        setShowModal(false);
        await fetchSuppliers();
      } else {
        alert('Failed to save supplier');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      alert('Delete functionality to be implemented');
      await fetchSuppliers();
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header - Clean & Simple (matching AnalyticsPage) */}
      <div className="mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Supplier Management</h1>
            <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your pharmacy suppliers and contact information</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
              <Users className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-text)' }} />
              <span className="text-[0.72rem] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {suppliers.length} Suppliers
              </span>
            </div>
            <button
              onClick={openNewSupplierModal}
              className="btn-accent flex items-center gap-2 px-4 py-1.5 text-[0.75rem]"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Search - Clean */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suppliers by name, email, or phone..."
              className="input-base w-full pl-10 pr-4 text-sm"
              style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
            />
          </div>
        </div>
      </Card>

      {/* Suppliers Grid - Clean cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="p-5 border-theme hover:border-accent transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-text)' }}>
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-primary group-hover:text-accent transition-colors">
                    {supplier.name}
                  </h3>
                  {supplier.city && (
                    <p className="text-sm text-secondary">{supplier.city}, {supplier.country}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(supplier)}
                  className="p-1.5 rounded-lg transition-all duration-200 hover:bg-subtle"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="p-1.5 rounded-lg transition-all duration-200 hover:bg-danger-light"
                  style={{ color: 'var(--color-danger-text)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2 text-secondary">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted" />
                <span className="break-all font-medium text-primary">{supplier.email}</span>
              </div>
              <div className="flex items-start gap-2 text-secondary">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted" />
                <span className="font-medium text-primary">{supplier.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-secondary">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted" />
                <span className="text-primary">{supplier.address}</span>
              </div>
              {(supplier.city || supplier.country) && (
                <div className="flex items-start gap-2 text-secondary">
                  <Building className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted" />
                  <span className="text-primary">{supplier.city}, {supplier.country}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-theme text-xs text-secondary">
              Added: {new Date(supplier.createdAt).toLocaleDateString()}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State - Clean */}
      {filteredSuppliers.length === 0 && (
        <Card className="p-12 text-center">
          <Truck className="h-16 w-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">
            {searchQuery ? 'No Suppliers Found' : 'No Suppliers Yet'}
          </h3>
          <p className="text-secondary mb-6">
            {searchQuery ? 'No suppliers match your search' : 'Get started by adding your first supplier'}
          </p>
          <button
            onClick={openNewSupplierModal}
            className="btn-accent inline-flex items-center gap-2 px-6 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Supplier
          </button>
        </Card>
      )}

      {/* Supplier Form Modal - Clean with theme colors */}
      {showModal && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal">
          <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-2xl border-theme">
            <div className="sticky top-0 bg-brand text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pharma Supply Co."
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="supplier@example.com"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+233 555 123 456"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Accra"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Ghana"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-ghost py-3 text-base"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-accent py-3 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                      {editingSupplier ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingSupplier ? 'Update Supplier' : 'Add Supplier'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
// src/pages/ProductManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Package, Barcode, X, Calendar, Search,
  ArrowUpRight, Zap, TrendingUp, Grid, List, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Loader2, History
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product } from '../types';
import { Card } from '../components/ui/Card';
import { ProductHistoryModal } from '../components/ProductHistoryModal';

export const ProductManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showLowStock, setShowLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    unitPrice: '',
    quantity: '',
    batchNumber: '',
    expiryDate: '',
    supplier: '',
  });

  // --- Shared field style ---
  const fieldStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: '6px',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '14px',
    padding: '10px 14px',
    width: '100%',
    height: '42px',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
  };

  const textareaStyle: React.CSSProperties = {
    ...fieldStyle,
    height: 'auto',
    minHeight: '80px',
    resize: 'vertical',
  };

  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const {
    currentUser,
    fetchProducts,
    products,
    addProduct,
    updateProduct,
    deleteProduct,  // ← Added
    transactions
  } = useAppStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.quantity < 20);
  const totalProducts = products.length;

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const generateSKU = () => `SKU-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const generateBarcode = () => `BAR-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;

  const openNewProductModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      unitPrice: '',
      quantity: '',
      batchNumber: '',
      expiryDate: '',
      supplier: '',
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      unitPrice: product.unitPrice.toString(),
      quantity: product.quantity.toString(),
      batchNumber: product.batchNumber || '',
      expiryDate: product.expiryDate || '',
      supplier: product.supplier || '',
    });
    setShowModal(true);
  };

  const openHistoryModal = (product: Product) => {
    setSelectedProduct(product);
    setShowHistoryModal(true);
  };

  // ─── DELETE PRODUCT FUNCTION ──────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Check if product has transactions (we can check in the store)
    const hasTransactions = transactions.some(tx =>
      tx.items.some(item =>
        item.productId === id || item.product?.id === id
      )
    );

    let confirmMessage = 'Are you sure you want to delete this product?';
    if (hasTransactions) {
      confirmMessage = 'This product has existing transactions. It will be archived (soft deleted) to preserve transaction history. Continue?';
    } else {
      confirmMessage = 'Are you sure you want to delete this product? This action cannot be undone.';
    }

    if (!window.confirm(confirmMessage)) return;

    setDeleteLoading(id);
    try {
      const result = await deleteProduct(id);
      if (result) {
        await fetchProducts();
        alert(hasTransactions
          ? 'Product archived successfully. Transaction history preserved.'
          : 'Product deleted successfully.'
        );
      } else {
        alert('Failed to delete product. Please try again.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting the product');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unitPrice || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const commonData = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        unitPrice: parseFloat(formData.unitPrice),
        quantity: parseInt(formData.quantity),
        batchNumber: formData.batchNumber || undefined,
        expiryDate: formData.expiryDate || undefined,
        supplier: formData.supplier || undefined,
      };

      let success = false;
      if (editingProduct) {
        success = !!(await updateProduct(editingProduct.id, commonData));
      } else {
        const newProduct = {
          ...commonData,
          sku: generateSKU(),
          barcode: generateBarcode(),
        };
        success = !!(await addProduct(newProduct));
      }

      if (success) {
        setShowModal(false);
        fetchProducts();
      } else {
        alert('Failed to save product');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0)
      return <span className="badge badge-danger text-sm px-3 py-1.5">Out of Stock</span>;
    if (quantity < 10)
      return <span className="badge badge-danger text-sm px-3 py-1.5">Critical</span>;
    if (quantity < 20)
      return <span className="badge badge-warning text-sm px-3 py-1.5">Low Stock</span>;
    if (quantity < 50)
      return <span className="badge badge-info text-sm px-3 py-1.5">Medium</span>;
    return <span className="badge badge-success text-sm px-3 py-1.5">In Stock</span>;
  };

  // Pagination Component
  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3">
      <div className="text-sm text-secondary">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${currentPage === page
                  ? 'btn-accent'
                  : 'btn-ghost'
                  }`}
              >
                {page}
              </button>
            );
          })}
          {totalPages > 7 && (
            <span className="px-2 py-1.5 text-sm text-secondary">...</span>
          )}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Product Management</h1>
        <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage your pharmacy products and inventory</p>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="text-[0.7rem]" style={{ color: 'var(--color-text-muted)' }}>
            {totalProducts} Products
          </span>
        </div>
      </div>

      {/* Low Stock Alert with Dropdown */}
      {lowStockProducts.length > 0 && (
        <Card className="border-2" style={{ borderColor: 'var(--color-warning)' }}>
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className="w-full p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' }}>
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-warning-text)' }}>Low Stock Alert</h3>
                  <p className="text-sm" style={{ color: 'var(--color-warning-text)' }}>
                    {lowStockProducts.length} products below 20 units
                  </p>
                </div>
              </div>
              {showLowStock ? (
                <ChevronUp className="h-4 w-4" style={{ color: 'var(--color-warning-text)' }} />
              ) : (
                <ChevronDown className="h-4 w-4" style={{ color: 'var(--color-warning-text)' }} />
              )}
            </div>
          </button>

          {showLowStock && (
            <div className="border-t p-4" style={{ borderColor: 'var(--color-warning)' }}>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-warning-light)', border: '1px solid var(--color-warning)' }}>
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: 'var(--color-warning-text)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-warning-text)' }}>SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm" style={{ color: 'var(--color-warning-text)' }}>{p.quantity} units</p>
                      {getStockBadge(p.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Search, Add Button and View Toggle */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search products by name, SKU, or category..."
              className="input-base w-full pl-10 pr-4 text-sm"
              style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl p-1" style={{ background: 'var(--color-bg-subtle)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                  ? 'surface-elevated shadow-sm'
                  : 'hover:bg-subtle'
                  }`}
                style={{
                  color: viewMode === 'grid' ? 'var(--color-accent-text)' : 'var(--color-text-muted)'
                }}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                  ? 'surface-elevated shadow-sm'
                  : 'hover:bg-subtle'
                  }`}
                style={{
                  color: viewMode === 'list' ? 'var(--color-accent-text)' : 'var(--color-text-muted)'
                }}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={openNewProductModal}
              className="btn-accent flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add New Product
            </button>
          </div>
        </div>
      </Card>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentProducts.map((product) => (
            <Card key={product.id} className="p-4 border-theme hover:border-accent transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-primary text-sm group-hover:text-accent transition-colors truncate">
                      {product.name}
                    </h3>
                    <span className="badge badge-secondary text-xs px-2 py-0.5">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(product)}
                    className="p-1.5 rounded-lg transition-all duration-200 hover:bg-subtle"
                    style={{ color: 'var(--color-text-secondary)' }}
                    title="Edit Product"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => openHistoryModal(product)}
                    className="p-1.5 rounded-lg transition-all duration-200 hover:bg-info-light"
                    style={{ color: 'var(--color-info-text)' }}
                    title="View History"
                  >
                    <History className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deleteLoading === product.id}
                    className="p-1.5 rounded-lg transition-all duration-200 hover:bg-danger-light"
                    style={{
                      color: deleteLoading === product.id ? 'var(--color-text-muted)' : 'var(--color-danger-text)',
                      cursor: deleteLoading === product.id ? 'not-allowed' : 'pointer',
                    }}
                    title="Delete Product"
                  >
                    {deleteLoading === product.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-secondary mb-3 line-clamp-2">{product.description}</p>
              )}

              <div className="space-y-2 mb-3 text-sm">
                <div className="flex items-center gap-1 text-secondary">
                  <Barcode className="h-3 w-3" />
                  <span className="font-mono text-sm">{product.sku}</span>
                </div>
                {product.batchNumber && (
                  <div className="flex items-center gap-1 text-secondary">
                    <Calendar className="h-3 w-3" />
                    <span>Batch: {product.batchNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-theme">
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-accent-text)' }}>
                    GHS {product.unitPrice.toFixed(2)}
                  </p>
                  <div className="mt-1">
                    {getStockBadge(product.quantity)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-primary tabular-nums">{product.quantity}</p>
                  <p className="text-sm text-secondary">units</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-subtle border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">SKU / Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Batch / Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {currentProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-subtle transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                          <Package className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary text-sm group-hover:text-accent transition-colors">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-sm text-secondary truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-semibold text-primary">{product.sku}</p>
                      <span className="badge badge-secondary text-xs px-2 py-0.5">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      <p>Batch: {product.batchNumber || 'N/A'}</p>
                      {product.expiryDate && (
                        <p>Exp: {new Date(product.expiryDate).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-bold" style={{ color: 'var(--color-accent-text)' }}>
                        GHS {product.unitPrice.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-base font-semibold text-primary tabular-nums">{product.quantity}</p>
                      <p className="text-sm text-secondary">units</p>
                    </td>
                    <td className="px-4 py-3">
                      {getStockBadge(product.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded-lg transition-all duration-200 hover:bg-subtle"
                          style={{ color: 'var(--color-text-secondary)' }}
                          title="Edit Product"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => openHistoryModal(product)}
                          className="p-1.5 rounded-lg transition-all duration-200 hover:bg-info-light"
                          style={{ color: 'var(--color-info-text)' }}
                          title="View History"
                        >
                          <History className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deleteLoading === product.id}
                          className="p-1.5 rounded-lg transition-all duration-200 hover:bg-danger-light"
                          style={{
                            color: deleteLoading === product.id ? 'var(--color-text-muted)' : 'var(--color-danger-text)',
                            cursor: deleteLoading === product.id ? 'not-allowed' : 'pointer',
                          }}
                          title="Delete Product"
                        >
                          {deleteLoading === product.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">
            {searchQuery ? 'No Products Found' : 'No Products Yet'}
          </h3>
          <p className="text-secondary mb-6">
            {searchQuery ? 'No products match your search' : 'Get started by adding your first product'}
          </p>
          <button
            onClick={openNewProductModal}
            className="btn-accent inline-flex items-center gap-2 px-6 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        </Card>
      )}

      {/* Pagination */}
      {filteredProducts.length > itemsPerPage && <Pagination />}

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal">
          <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-theme">
            <div className="sticky top-0 bg-brand text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
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
                  <label className="block text-sm font-semibold text-primary mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Paracetamol 500mg"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-primary mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                    rows={3}
                    className="input-base w-full text-sm resize-none"
                    style={textareaStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Pain Relief"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="e.g., Pharma Supply Co."
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Unit Price (GHS) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.00"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="e.g., BATCH-001"
                    className="input-base w-full text-sm"
                    style={fieldStyle}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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
                      {editingProduct ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingProduct ? 'Update Product' : 'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product History Modal */}
      {showHistoryModal && selectedProduct && (
        <ProductHistoryModal
          product={selectedProduct}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};
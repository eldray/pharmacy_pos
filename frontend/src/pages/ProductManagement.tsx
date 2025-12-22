// src/pages/ProductManagement.tsx (Updated)
import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Package, Barcode, X, Calendar, Search, 
  ArrowUpRight, Zap, TrendingUp, Grid, List, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product } from '../types';
import { Card } from '../components/ui/Card';

export const ProductManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showLowStock, setShowLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9); // 3x3 grid for cards
  
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

  const { currentUser, fetchProducts, products, addProduct, updateProduct } = useAppStore();

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
      batchNumber: product.batchNumber,
      expiryDate: product.expiryDate,
      supplier: product.supplier || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unitPrice || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }

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
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      // Add delete API call if needed
      await fetchProducts(); // Refresh
    }
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full shadow">Out of Stock</span>;
    if (quantity < 10)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-full shadow">Critical</span>;
    if (quantity < 20)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-full shadow">Low Stock</span>;
    if (quantity < 50)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow">Medium</span>;
    return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow">In Stock</span>;
  };

  // Pagination Component
  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <div className="text-sm text-gray-500">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Product Management</h1>
            <p className="text-white/80">Manage your pharmacy products and inventory</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <TrendingUp className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium">{totalProducts} Products</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert with Dropdown */}
      {lowStockProducts.length > 0 && (
        <Card className="backdrop-blur-sm bg-white/80 border-2 border-yellow-200">
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className="w-full p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg shadow">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
                  <p className="text-sm text-yellow-800">
                    {lowStockProducts.length} products below 20 units
                  </p>
                </div>
              </div>
              {showLowStock ? <ChevronUp className="h-4 w-4 text-yellow-600" /> : <ChevronDown className="h-4 w-4 text-yellow-600" />}
            </div>
          </button>
          
          {showLowStock && (
            <div className="border-t border-yellow-200 p-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900 text-sm">{p.name}</p>
                      <p className="text-xs text-yellow-700">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-900">{p.quantity} units</p>
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
      <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              placeholder="Search products by name, SKU, or category..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={openNewProductModal}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
            >
              <Plus className="h-5 w-5" />
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
            <Card key={product.id} className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100 hover:border-blue-200 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                      {product.name}
                    </h3>
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-gray-500 to-gray-700 text-white rounded-full">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all duration-200"
                  >
                    <Edit2 className="h-3 w-3 text-gray-600" />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{product.description}</p>
              )}

              <div className="space-y-2 mb-3 text-xs">
                <div className="flex items-center gap-1 text-gray-600">
                  <Barcode className="h-3 w-3" />
                  <span className="font-mono text-xs">{product.sku}</span>
                </div>
                {product.batchNumber && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>Batch: {product.batchNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    GHS {product.unitPrice.toFixed(2)}
                  </p>
                  <div className="mt-1">
                    {getStockBadge(product.quantity)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{product.quantity}</p>
                  <p className="text-xs text-gray-500">units</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU / Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Batch / Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                          <Package className="h-3 w-3 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold">{product.sku}</p>
                      <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>Batch: {product.batchNumber || 'N/A'}</p>
                      {product.expiryDate && (
                        <p>Exp: {new Date(product.expiryDate).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        GHS {product.unitPrice.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{product.quantity}</p>
                      <p className="text-xs text-gray-500">units</p>
                    </td>
                    <td className="px-4 py-3">
                      {getStockBadge(product.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openEditModal(product)}
                          className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all duration-200"
                        >
                          <Edit2 className="h-3 w-3 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
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
        <Card className="p-12 text-center backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No Products Found' : 'No Products Yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 'No products match your search' : 'Get started by adding your first product'}
          </p>
          <button
            onClick={openNewProductModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add New Product
          </button>
        </Card>
      )}

      {/* Pagination */}
      {filteredProducts.length > itemsPerPage && <Pagination />}

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-100">
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-t-2xl px-6 py-4">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Paracetamol 500mg"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none bg-white/50 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Pain Relief"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="e.g., Pharma Supply Co."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit Price (GHS) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="e.g., BATCH-001"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

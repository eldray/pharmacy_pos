// src/pages/InventoryPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Edit2,
  Plus,
  Minus,
  Search,
  Calendar,
  Tag,
  Loader2,
  ArrowUpRight,
  Zap,
  TrendingUp,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product, InventoryLog } from '../types';
import { Card } from '../components/ui/Card';

const InventoryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [disposalQty, setDisposalQty] = useState(0);
  const [disposalReason, setDisposalReason] = useState('');
  
  // Pagination states
  const [productsCurrentPage, setProductsCurrentPage] = useState(1);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const {
    currentUser,
    fetchProducts,
    products,
    updateProduct,
    addInventoryLog,
    inventoryLogs,
    fetchInventoryLogs,
    isLoading: storeLoading,
  } = useAppStore();

  useEffect(() => {
    fetchProducts();
    fetchInventoryLogs();
  }, [fetchProducts, fetchInventoryLogs]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.quantity < 20),
    [products]
  );

  const expiringProducts = useMemo(() => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return products.filter((p) => p.expiryDate && new Date(p.expiryDate) <= threeMonthsFromNow);
  }, [products]);

  // Products pagination
  const productsTotalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const productsStartIndex = (productsCurrentPage - 1) * itemsPerPage;
  const productsEndIndex = productsStartIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(productsStartIndex, productsEndIndex);

  // History pagination
  const historyTotalPages = Math.ceil(inventoryLogs.length / itemsPerPage);
  const historyStartIndex = (historyCurrentPage - 1) * itemsPerPage;
  const historyEndIndex = historyStartIndex + itemsPerPage;
  const currentHistoryLogs = inventoryLogs.slice(historyStartIndex, historyEndIndex);

  const goToProductsPage = (page: number) => {
    setProductsCurrentPage(Math.max(1, Math.min(page, productsTotalPages)));
  };

  const goToHistoryPage = (page: number) => {
    setHistoryCurrentPage(Math.max(1, Math.min(page, historyTotalPages)));
  };

  const openAdjustmentModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQty(0);
    setAdjustmentNotes('');
    setShowAdjustmentModal(true);
  };

  const openDisposalModal = (product: Product) => {
    setSelectedProduct(product);
    setDisposalQty(0);
    setDisposalReason('');
    setShowDisposalModal(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || adjustmentQty === 0) {
      alert('Enter a valid quantity');
      return;
    }

    const newQty = selectedProduct.quantity + adjustmentQty;
    if (newQty < 0) {
      alert('Cannot go below 0');
      return;
    }

    setIsAdjusting(true);
    try {
      const updated = await updateProduct(selectedProduct.id, { quantity: newQty });
      if (updated) {
        await addInventoryLog({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          type: 'adjustment',
          quantity: adjustmentQty,
          userId: currentUser?.id || '',
          userName: currentUser?.name || '',
          notes: adjustmentNotes || `Manual adjustment: ${adjustmentQty > 0 ? '+' : ''}${adjustmentQty}`,
        });

        setShowAdjustmentModal(false);
        setAdjustmentQty(0);
        setAdjustmentNotes('');
        fetchProducts();
        fetchInventoryLogs();
      }
    } catch (err) {
      alert('Adjustment failed');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleDisposal = async () => {
    if (!selectedProduct || disposalQty <= 0) {
      alert('Enter a valid disposal quantity');
      return;
    }

    if (disposalQty > selectedProduct.quantity) {
      alert('Disposal quantity cannot exceed current stock');
      return;
    }

    if (!disposalReason.trim()) {
      alert('Please provide a reason for disposal');
      return;
    }

    setIsAdjusting(true);
    try {
      const newQty = selectedProduct.quantity - disposalQty;
      const updated = await updateProduct(selectedProduct.id, { quantity: newQty });
      if (updated) {
        await addInventoryLog({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          type: 'outflow',
          quantity: -disposalQty,
          userId: currentUser?.id || '',
          userName: currentUser?.name || '',
          notes: `Disposal: ${disposalReason}`,
        });

        setShowDisposalModal(false);
        setDisposalQty(0);
        setDisposalReason('');
        fetchProducts();
        fetchInventoryLogs();
      }
    } catch (err) {
      alert('Disposal failed');
    } finally {
      setIsAdjusting(false);
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

  const getExpiryBadge = (expiryDate: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const oneMonth = new Date(today);
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    const threeMonths = new Date(today);
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    if (expiry < today)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full shadow">Expired</span>;
    if (expiry < oneMonth)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow">Expiring Soon</span>;
    if (expiry < threeMonths)
      return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-full shadow">3mo</span>;
    return <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow">Valid</span>;
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'inflow': return 'text-green-600 bg-green-50 border-green-200';
      case 'outflow': return 'text-red-600 bg-red-50 border-red-200';
      case 'adjustment': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'inflow': return <Plus className="h-3 w-3" />;
      case 'outflow': return <Minus className="h-3 w-3" />;
      case 'adjustment': return <Edit2 className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  // Pagination Component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    startIndex,
    endIndex,
    totalItems 
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    startIndex: number;
    endIndex: number;
    totalItems: number;
  }) => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <div className="text-sm text-gray-500">
        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
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
              onClick={() => onPageChange(page)}
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
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Inventory Management</h1>
            <p className="text-white/80">Manage stock levels, track expiry, and adjust inventory</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <TrendingUp className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium">Live Inventory</span>
          </div>
        </div>
      </div>

      {/* Compact Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <Card className="backdrop-blur-sm bg-white/80 border-2 border-yellow-200">
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className="w-full p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg shadow">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900">Low Stock</h3>
                  <p className="text-sm text-yellow-800">
                    {lowStockProducts.length} products below 20 units
                  </p>
                </div>
              </div>
              {showLowStock ? <ChevronUp className="h-4 w-4 text-yellow-600" /> : <ChevronDown className="h-4 w-4 text-yellow-600" />}
            </div>
          </button>
          
          {showLowStock && lowStockProducts.length > 0 && (
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

        {/* Expiry Alert */}
        <Card className="backdrop-blur-sm bg-white/80 border-2 border-red-200">
          <button
            onClick={() => setShowExpiring(!showExpiring)}
            className="w-full p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg shadow">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900">Expiry Alert</h3>
                  <p className="text-sm text-red-800">
                    {expiringProducts.length} products expiring soon
                  </p>
                </div>
              </div>
              {showExpiring ? <ChevronUp className="h-4 w-4 text-red-600" /> : <ChevronDown className="h-4 w-4 text-red-600" />}
            </div>
          </button>
          
          {showExpiring && expiringProducts.length > 0 && (
            <div className="border-t border-red-200 p-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {expiringProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1">
                      <p className="font-medium text-red-900 text-sm">{p.name}</p>
                      <p className="text-xs text-red-700">Batch: {p.batchNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-900 text-sm">
                        {new Date(p.expiryDate).toLocaleDateString()}
                      </p>
                      {getExpiryBadge(p.expiryDate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Inventory History */}
      <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow">
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Inventory History</h3>
                <p className="text-sm text-gray-600">
                  {inventoryLogs.length} recent activities
                </p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
          </div>
        </button>
        
        {showHistory && (
          <div className="border-t border-gray-200">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentHistoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {log.productName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getLogTypeColor(log.type)}`}>
                          {getLogIcon(log.type)}
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <span className={log.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                          {log.quantity > 0 ? '+' : ''}{log.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.userName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {log.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventoryLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No inventory activity yet</p>
                </div>
              )}
            </div>

            {/* History Pagination */}
            {inventoryLogs.length > itemsPerPage && (
              <Pagination
                currentPage={historyCurrentPage}
                totalPages={historyTotalPages}
                onPageChange={goToHistoryPage}
                startIndex={historyStartIndex}
                endIndex={historyEndIndex}
                totalItems={inventoryLogs.length}
              />
            )}
          </div>
        )}
      </Card>

      {/* Search */}
      <Card className="p-4 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setProductsCurrentPage(1); // Reset to first page when searching
            }}
            placeholder="Search by name, SKU, barcode, or category..."
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm text-sm"
          />
        </div>
      </Card>

      {/* Products Table */}
      <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU / Barcode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Batch / Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-sm">{product.sku}</p>
                    <p className="text-gray-500 text-xs">{product.barcode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-gray-500 to-gray-700 text-white rounded-full shadow">
                      <Tag className="h-3 w-3 inline mr-1" />
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-base font-bold text-gray-900">{product.quantity}</p>
                      <div className="mt-1">{getStockBadge(product.quantity)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-semibold text-xs">Batch: {product.batchNumber}</p>
                    {product.expiryDate && (
                      <>
                        <p className="text-gray-500 text-xs">
                          Exp: {new Date(product.expiryDate).toLocaleDateString()}
                        </p>
                        <div className="mt-1">{getExpiryBadge(product.expiryDate)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {getStockBadge(product.quantity)}
                      {product.expiryDate && getExpiryBadge(product.expiryDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openAdjustmentModal(product)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow"
                      >
                        <Edit2 className="h-3 w-3" />
                        
                      </button>
                      <button
                        onClick={() => openDisposalModal(product)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow"
                      >
                        <Trash2 className="h-3 w-3" />
                        
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-900 mb-1">No products found</p>
              <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        {/* Products Pagination */}
        {filteredProducts.length > itemsPerPage && (
          <Pagination
            currentPage={productsCurrentPage}
            totalPages={productsTotalPages}
            onPageChange={goToProductsPage}
            startIndex={productsStartIndex}
            endIndex={productsEndIndex}
            totalItems={filteredProducts.length}
          />
        )}
      </Card>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-100">
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Stock Adjustment</h2>
                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                  <p className="text-sm text-gray-600">
                    Current: <strong>{selectedProduct.quantity}</strong> units
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Adjustment Amount *
                </label>

<div className="flex items-center gap-3">
  <button
    onClick={() =>
      setAdjustmentQty(
        Math.max(-selectedProduct.quantity, adjustmentQty - 1)
      )
    }
    className="p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
  >
    <Minus className="h-5 w-5" />
  </button>
  <input
    type="number"
    value={adjustmentQty}
    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
    className="w-64 px-3 py-3 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
  />
  <button
    onClick={() => setAdjustmentQty(adjustmentQty + 1)}
    className="p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
  >
    <Plus className="h-5 w-5" />
  </button>
</div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Use negative to reduce, positive to add
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 text-center">
                  New Stock: <span className={selectedProduct.quantity + adjustmentQty < 0 ? 'text-red-600' : 'text-green-600'}>
                    {selectedProduct.quantity + adjustmentQty}
                  </span> units
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="e.g., Damaged stock, received shipment, found discrepancy..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none bg-white text-sm"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                disabled={isAdjusting}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                disabled={
                  isAdjusting ||
                  adjustmentQty === 0 ||
                  selectedProduct.quantity + adjustmentQty < 0
                }
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow disabled:opacity-50"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Applying...
                  </>
                ) : (
                  'Apply Adjustment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Modal */}
      {showDisposalModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-100">
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Dispose Stock</h2>
                <button
                  onClick={() => setShowDisposalModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg text-white">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900">{selectedProduct.name}</h3>
                  <p className="text-sm text-red-700">
                    Current: <strong>{selectedProduct.quantity}</strong> units
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Quantity to Dispose *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDisposalQty(Math.max(0, disposalQty - 1))}
                    className="p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    value={disposalQty}
                    onChange={(e) => setDisposalQty(parseInt(e.target.value) || 0)}
                    min="0"
                    max={selectedProduct.quantity}
                    className="flex-1 px-4 py-3 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                  />
                  <button
                    onClick={() => setDisposalQty(Math.min(selectedProduct.quantity, disposalQty + 1))}
                    className="p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Max: {selectedProduct.quantity} units
                </p>
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm font-semibold text-red-900 text-center">
                  After disposal: <strong>{selectedProduct.quantity - disposalQty}</strong> units
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Disposal *
                </label>
                <select
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-sm"
                >
                  <option value="">Select reason</option>
                  <option value="expired">Expired</option>
                  <option value="damaged">Damaged</option>
                  <option value="recalled">Recalled</option>
                  <option value="quality_issue">Quality Issue</option>
                  <option value="other">Other</option>
                </select>
                {disposalReason === 'other' && (
                  <input
                    type="text"
                    placeholder="Specify reason..."
                    className="w-full mt-3 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-sm"
                    onChange={(e) => setDisposalReason(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowDisposalModal(false)}
                disabled={isAdjusting}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisposal}
                disabled={
                  isAdjusting ||
                  disposalQty <= 0 ||
                  disposalQty > selectedProduct.quantity ||
                  !disposalReason.trim()
                }
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 shadow disabled:opacity-50"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Disposing...
                  </>
                ) : (
                  'Confirm Disposal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;

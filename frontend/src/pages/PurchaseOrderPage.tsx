// src/pages/PurchaseOrderPage.tsx (Fixed supplier selection and added pagination)
import React, { useState, useEffect } from 'react';
import { 
  Plus, Package, FileText, Calendar, CheckCircle, XCircle, Clock, 
  Truck, Search, Edit2, Trash2, ArrowUpRight, X, Zap, TrendingUp, 
  Eye, ChevronRight, DollarSign, Box, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { useAppStore } from '../store';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Product } from '../types';
import { Card } from '../components/ui/Card';

export const PurchaseOrderPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    items: [] as PurchaseOrderItem[],
  });
  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    batchNumber: '',
    expiryDate: '',
  });
  const [formErrors, setFormErrors] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    items: ''
  });

  const {
    currentUser,
    fetchSuppliers,
    suppliers,
    fetchProducts,
    products,
    fetchPurchaseOrders,
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
  } = useAppStore();

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchPurchaseOrders();
  }, [fetchSuppliers, fetchProducts, fetchPurchaseOrders]);

  // Filter purchase orders based on search query
  const filteredPurchaseOrders = purchaseOrders.filter(po =>
    po.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suppliers.find(s => s.id === po.supplierId)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchaseOrders = filteredPurchaseOrders.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const generatePONumber = () => `PO-${Date.now()}`;

  const openNewPOModal = () => {
    setSelectedPO(null);
    setFormData({
      supplierId: suppliers.length > 0 ? suppliers[0].id : '',
      expectedDeliveryDate: '',
      items: [],
    });
    setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
    setFormErrors({ supplierId: '', expectedDeliveryDate: '', items: '' });
    setShowModal(true);
  };

  const openDetailModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowDetailModal(true);
  };

  const addItemToPO = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.unitPrice) {
      alert('Please fill in product, quantity, and unit price');
      return;
    }

    const product = products.find((p) => p.id === newItem.productId);
    if (!product) return;

    const item: PurchaseOrderItem = {
      productId: newItem.productId,
      productName: product.name,
      quantity: parseInt(newItem.quantity),
      unitPrice: parseFloat(newItem.unitPrice),
      total: parseInt(newItem.quantity) * parseFloat(newItem.unitPrice),
      batchNumber: newItem.batchNumber,
      expiryDate: newItem.expiryDate,
    };

    setFormData({ ...formData, items: [...formData.items, item] });
    setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
    setFormErrors(prev => ({ ...prev, items: '' }));
  };

  const removeItemFromPO = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const calculateTotal = (items: PurchaseOrderItem[]) => items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = {
      supplierId: !formData.supplierId ? 'Please select a supplier' : '',
      expectedDeliveryDate: !formData.expectedDeliveryDate ? 'Please select expected delivery date' : '',
      items: formData.items.length === 0 ? 'Please add at least one item' : ''
    };

    setFormErrors(errors);

    if (Object.values(errors).some(error => error)) {
      return;
    }

    const poData = {
      orderNumber: generatePONumber(),
      supplierId: formData.supplierId,
      items: formData.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
        batchNumber: i.batchNumber || undefined,
        expiryDate: i.expiryDate || undefined,
      })),
      totalAmount: Number(calculateTotal(formData.items)),
      expectedDeliveryDate: formData.expectedDeliveryDate,
    };

    console.log('Creating PO with data:', poData);

    try {
      const po = await addPurchaseOrder(poData);
      if (po) {
        setShowModal(false);
        setFormData({ supplierId: suppliers[0]?.id || '', expectedDeliveryDate: '', items: [] });
        setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
        fetchPurchaseOrders();
        alert('Purchase order created successfully!');
      } else {
        alert('Failed to create purchase order. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Failed to create purchase order. Please try again.');
    }
  };

  const markAsReceived = async (po: PurchaseOrder) => {
    if (window.confirm('Mark this purchase order as received? This will update inventory quantities.')) {
      const poId = po.id || (po as any)._id;
      
      if (!poId) {
        console.error('No valid PO ID found:', po);
        alert('Error: Could not find purchase order ID');
        return;
      }

      const updates = {
        status: 'received' as const,
        deliveryDate: new Date().toISOString(),
      };
      
      const updatedPO = await updatePurchaseOrder(poId, updates);
      if (updatedPO) {
        fetchPurchaseOrders();
        fetchProducts();
        setShowDetailModal(false);
        alert('Purchase order marked as received and inventory updated');
      } else {
        alert('Failed to update PO');
      }
    }
  };

  const cancelPO = async (po: PurchaseOrder) => {
    if (window.confirm('Cancel this purchase order?')) {
      const poId = po.id || (po as any)._id;
      
      if (!poId) {
        console.error('No valid PO ID found for cancellation:', po);
        alert('Error: Could not find purchase order ID');
        return;
      }

      const updates = { status: 'cancelled' as const };
      await updatePurchaseOrder(poId, updates);
      fetchPurchaseOrders();
      setShowDetailModal(false);
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending':
        return { 
          icon: Clock, 
          text: 'Pending', 
          color: 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800'
        };
      case 'received':
        return { 
          icon: CheckCircle, 
          text: 'Received', 
          color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800'
        };
      case 'cancelled':
        return { 
          icon: XCircle, 
          text: 'Cancelled', 
          color: 'bg-gradient-to-r from-red-500 to-pink-600 text-white',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800'
        };
      default:
        return { 
          icon: Clock, 
          text: 'Pending', 
          color: 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800'
        };
    }
  };

  const getStatusCounts = () => {
    return {
      pending: purchaseOrders.filter(po => po.status === 'pending').length,
      received: purchaseOrders.filter(po => po.status === 'received').length,
      cancelled: purchaseOrders.filter(po => po.status === 'cancelled').length,
      total: purchaseOrders.length
    };
  };

  const statusCounts = getStatusCounts();

  // Get supplier name with fallback
  const getSupplierName = (po: PurchaseOrder) => {
    const supplier = suppliers.find(s => s.id === po.supplierId);
    return supplier?.name || po.supplierName || 'Unknown Supplier';
  };

  if (suppliers.length === 0 || products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Purchase Orders</h1>
            <p className="text-white/80">Manage supplier orders and inventory restocking</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <TrendingUp className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium">{statusCounts.total} Orders</span>
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{statusCounts.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{statusCounts.pending}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Received</p>
              <p className="text-3xl font-bold text-gray-900">{statusCounts.received}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-3xl font-bold text-gray-900">{statusCounts.cancelled}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-lg">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Create Button */}
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
              placeholder="Search purchase orders by number, supplier, or status..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
            />
          </div>
          <button
            onClick={openNewPOModal}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Create Purchase Order
          </button>
        </div>
      </Card>

      {/* Purchase Orders List View */}
      <Card className="backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Purchase Orders</h2>
              <p className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredPurchaseOrders.length)} of {filteredPurchaseOrders.length} orders
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Truck className="h-4 w-4" />
              <span>Supplier Orders</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Order Details
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Supplier
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Items
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Dates
                </th>
                <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Total
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPurchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 sm:px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Truck className="h-12 w-12 text-gray-400" />
                      <p className="text-lg font-medium text-gray-900">No purchase orders found</p>
                      <p className="text-gray-500">
                        {searchQuery ? 'No purchase orders match your search' : 'Get started by creating your first purchase order'}
                      </p>
                      <button
                        onClick={openNewPOModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg mt-4"
                      >
                        <Plus className="h-5 w-5" />
                        Create Purchase Order
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPurchaseOrders.map((po) => {
                  const badge = getStatusBadge(po.status);
                  const StatusIcon = badge.icon;
                  const supplierName = getSupplierName(po);
                  const totalItems = po.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  return (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {po.orderNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(po.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="max-w-[150px]">
                          <p className="truncate font-medium">{supplierName}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">{po.items.length} products</span>
                          <span className="text-gray-500">({totalItems} items)</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Expected:</span>
                          <span className="font-medium">
                            {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Not set'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          GHS {po.totalAmount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openDetailModal(po)}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg group/btn"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                            <ChevronRight className="h-3 w-3 transform group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredPurchaseOrders.length > itemsPerPage && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
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
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Purchase Order Detail Modal */}
      {showDetailModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-gray-100">
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Purchase Order Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedPO.orderNumber}</h3>
                    <p className="text-sm text-gray-500">
                      Supplier: {getSupplierName(selectedPO)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(selectedPO.status).color} flex items-center gap-2 shadow-lg`}>
                    {selectedPO.status === 'pending' && <Clock className="h-4 w-4" />}
                    {selectedPO.status === 'received' && <CheckCircle className="h-4 w-4" />}
                    {selectedPO.status === 'cancelled' && <XCircle className="h-4 w-4" />}
                    {getStatusBadge(selectedPO.status).text}
                  </span>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Order Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedPO.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Expected Delivery</p>
                  <p className="font-semibold text-gray-900">
                    {selectedPO.expectedDeliveryDate ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Total Amount</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    GHS {selectedPO.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedPO.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity} × GHS {item.unitPrice.toFixed(2)}
                          {item.batchNumber && ` • Batch: ${item.batchNumber}`}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">GHS {item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedPO.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => markAsReceived(selectedPO)}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Mark as Received
                  </button>
                  <button
                    onClick={() => cancelPO(selectedPO)}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <XCircle className="h-5 w-5" />
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Purchase Order Detail Modal */}
      {showDetailModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-gray-100">
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Purchase Order Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedPO.orderNumber}</h3>
                    <p className="text-sm text-gray-500">
                      Supplier: {suppliers.find(s => s.id === selectedPO.supplierId)?.name || selectedPO.supplierName}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(selectedPO.status).color} flex items-center gap-2 shadow-lg`}>
    {selectedPO.status === 'pending' && <Clock className="h-4 w-4" />}
    {selectedPO.status === 'received' && <CheckCircle className="h-4 w-4" />}
    {selectedPO.status === 'cancelled' && <XCircle className="h-4 w-4" />}
    {getStatusBadge(selectedPO.status).text}
                  </span>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Order Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedPO.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Expected Delivery</p>
                  <p className="font-semibold text-gray-900">
                    {selectedPO.expectedDeliveryDate ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Total Amount</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    GHS {selectedPO.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedPO.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity} × GHS {item.unitPrice.toFixed(2)}
                          {item.batchNumber && ` • Batch: ${item.batchNumber}`}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">GHS {item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedPO.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => markAsReceived(selectedPO)}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Mark as Received
                  </button>
                  <button
                    onClick={() => cancelPO(selectedPO)}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <XCircle className="h-5 w-5" />
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-bg-blur flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-gray-100">
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Create Purchase Order</h2>
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
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => {
                      setFormData({ ...formData, supplierId: e.target.value });
                      setFormErrors(prev => ({ ...prev, supplierId: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm ${
                      formErrors.supplierId ? 'border-red-500' : 'border-gray-200'
                    }`}
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.supplierId && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.supplierId}</p>
                  )}
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => {
                      setFormData({ ...formData, expectedDeliveryDate: e.target.value });
                      setFormErrors(prev => ({ ...prev, expectedDeliveryDate: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm ${
                      formErrors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-200'
                    }`}
                    required
                  />
                  {formErrors.expectedDeliveryDate && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.expectedDeliveryDate}</p>
                  )}
                </div>
              </div>

              {/* Add Items Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Items *</h3>
                {formErrors.items && (
                  <p className="text-red-500 text-sm mb-4">{formErrors.items}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Product *</label>
                    <select
                      value={newItem.productId}
                      onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Stock: {product.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      placeholder="0"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addItemToPO}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={newItem.batchNumber}
                      onChange={(e) => setNewItem({ ...newItem, batchNumber: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={newItem.expiryDate}
                      onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="border-2 border-gray-200 rounded-xl">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">Order Items ({formData.items.length})</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between px-4 py-3">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{item.productName}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} × GHS {item.unitPrice.toFixed(2)}
                              {item.batchNumber && ` • Batch: ${item.batchNumber}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-gray-900">GHS {item.total.toFixed(2)}</p>
                            <button
                              type="button"
                              onClick={() => removeItemFromPO(index)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Amount:</span>
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          GHS {calculateTotal(formData.items).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={formData.items.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// src/pages/PurchaseOrderPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Package, FileText, Calendar, CheckCircle, XCircle, Clock,
  Truck, Search, Edit2, Trash2, ArrowUpRight, X, Zap, TrendingUp,
  Eye, ChevronRight, DollarSign, Box, ChevronLeft, ChevronRight as ChevronRightIcon,
  Loader2, Save, ArrowLeft, Printer, Download, Upload, FileSpreadsheet
} from 'lucide-react';
import { useAppStore } from '../store';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Product } from '../types';
import { Card } from '../components/ui/Card';
import * as XLSX from 'xlsx';

export const PurchaseOrderPage: React.FC = () => {
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter products based on search query
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Filter suppliers based on search query
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    s.phone?.includes(supplierSearchQuery)
  );

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

  const openNewPOPage = () => {
    setSelectedPO(null);
    setFormData({
      supplierId: '',
      expectedDeliveryDate: '',
      items: [],
    });
    setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
    setProductSearchQuery('');
    setSupplierSearchQuery('');
    setShowProductDropdown(false);
    setShowSupplierDropdown(false);
    setEditingItemIndex(null);
    setFormErrors({ supplierId: '', expectedDeliveryDate: '', items: '' });
    setShowCreatePage(true);
    setShowDetailPage(false);
  };

  const openDetailPage = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowDetailPage(true);
    setShowCreatePage(false);
  };

  const goBackToList = () => {
    setShowCreatePage(false);
    setShowDetailPage(false);
    setSelectedPO(null);
  };

  const selectSupplier = (supplier: Supplier) => {
    setFormData({ ...formData, supplierId: supplier.id });
    setSupplierSearchQuery(supplier.name);
    setShowSupplierDropdown(false);
    setFormErrors(prev => ({ ...prev, supplierId: '' }));
  };

  const selectProduct = (product: Product) => {
    setNewItem({
      ...newItem,
      productId: product.id,
      unitPrice: product.unitPrice?.toString() || '',
    });
    setProductSearchQuery(product.name);
    setShowProductDropdown(false);
  };

  // ─── BULK IMPORT FROM EXCEL ──────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const importedItems: PurchaseOrderItem[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: any, index: number) => {
          const productName = row['Product Name'] || row['Product'] || row['ProductName'];
          const quantity = parseInt(row['Quantity'] || row['Qty'] || 0);
          const unitPrice = parseFloat(row['Cost Price'] || row['Unit Price'] || row['Price'] || row['UnitPrice'] || 0);
          const batchNumber = row['Batch Number'] || row['Batch'] || row['BatchNo'] || '';
          const expiryDate = row['Expiry Date'] || row['Expiry'] || '';

          if (!productName || !quantity || !unitPrice) {
            errors.push(`Row ${index + 2}: Missing product name, quantity, or cost price`);
            return;
          }

          // Find product by name
          const product = products.find(p =>
            p.name.toLowerCase() === productName.toLowerCase() ||
            p.name.toLowerCase().includes(productName.toLowerCase())
          );

          if (!product) {
            errors.push(`Row ${index + 2}: Product "${productName}" not found in inventory`);
            return;
          }

          // Format expiry date
          let formattedExpiryDate = '';
          if (expiryDate) {
            try {
              const date = new Date(expiryDate);
              if (!isNaN(date.getTime())) {
                formattedExpiryDate = date.toISOString().split('T')[0];
              }
            } catch (err) {
              // If date parsing fails, keep as string
              formattedExpiryDate = String(expiryDate);
            }
          }

          importedItems.push({
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            unitPrice: unitPrice,
            total: quantity * unitPrice,
            batchNumber: batchNumber || undefined,
            expiryDate: formattedExpiryDate || undefined,
          });
        });

        if (errors.length > 0) {
          alert(`Import completed with errors:\n\n${errors.join('\n')}`);
        }

        if (importedItems.length > 0) {
          setFormData({ ...formData, items: [...formData.items, ...importedItems] });
          alert(`Successfully imported ${importedItems.length} items from Excel`);
        } else if (errors.length > 0) {
          alert('No items were imported. Please check the errors above.');
        } else {
          alert('No items found in the Excel file. Please check the format.');
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Error parsing Excel file. Please make sure it\'s a valid .xlsx or .xls file.');
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const addItemToPO = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.unitPrice) {
      alert('Please fill in product, quantity, and cost price');
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

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items];
      updatedItems[editingItemIndex] = item;
      setFormData({ ...formData, items: updatedItems });
      setEditingItemIndex(null);
    } else {
      setFormData({ ...formData, items: [...formData.items, item] });
    }

    setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
    setProductSearchQuery('');
    setShowProductDropdown(false);
    setFormErrors(prev => ({ ...prev, items: '' }));
  };

  const editItem = (index: number) => {
    const item = formData.items[index];
    const product = products.find(p => p.id === item.productId);
    setNewItem({
      productId: item.productId,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
    });
    setProductSearchQuery(product?.name || item.productName);
    setEditingItemIndex(index);
    setShowProductDropdown(false);
  };

  const removeItemFromPO = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
      setProductSearchQuery('');
    }
  };

  const cancelEdit = () => {
    setEditingItemIndex(null);
    setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
    setProductSearchQuery('');
    setShowProductDropdown(false);
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

    setIsSubmitting(true);
    try {
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

      const po = await addPurchaseOrder(poData);
      if (po) {
        setShowCreatePage(false);
        setFormData({ supplierId: '', expectedDeliveryDate: '', items: [] });
        setNewItem({ productId: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: '' });
        setProductSearchQuery('');
        setSupplierSearchQuery('');
        setEditingItemIndex(null);
        fetchPurchaseOrders();
        alert('Purchase order created successfully!');
      } else {
        alert('Failed to create purchase order. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Failed to create purchase order. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        setShowDetailPage(false);
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
      setShowDetailPage(false);
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending',
          cls: 'badge-warning'
        };
      case 'received':
        return {
          icon: CheckCircle,
          text: 'Received',
          cls: 'badge-success'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          text: 'Cancelled',
          cls: 'badge-danger'
        };
      default:
        return {
          icon: Clock,
          text: 'Pending',
          cls: 'badge-warning'
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

  // Safe number helper
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Excel template download
  const downloadExcelTemplate = () => {
    const headers = ['Product Name', 'Quantity', 'Cost Price', 'Batch Number', 'Expiry Date'];
    const sampleData = [
      ['Paracetamol 500mg', 100, 2.50, 'BATCH-001', '2025-12-31'],
      ['Amoxicillin 250mg', 50, 3.75, 'BATCH-002', '2025-10-15'],
      ['Vitamin C 1000mg', 75, 1.99, 'BATCH-003', '2026-01-20'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'purchase_order_template.xlsx');
  };

  // Pagination Component
  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3">
      <div className="text-sm text-secondary">
        Showing {startIndex + 1}-{Math.min(endIndex, filteredPurchaseOrders.length)} of {filteredPurchaseOrders.length} orders
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
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // ─── CREATE PO PAGE ──────────────────────────────────────────────────────
  if (showCreatePage) {
    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
    const selectedProduct = products.find(p => p.id === newItem.productId);

    return (
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={goBackToList}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
              }}
            >
              <ArrowLeft size={18} />
              Back to Orders
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Create Purchase Order
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {formData.items.length} items added · Total: GHS {calculateTotal(formData.items).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
              Draft
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Section */}
          <Card className="p-6">
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Supplier Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative" ref={supplierDropdownRef}>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Supplier *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    value={supplierSearchQuery}
                    onChange={(e) => {
                      setSupplierSearchQuery(e.target.value);
                      setShowSupplierDropdown(true);
                      if (formData.supplierId && e.target.value !== selectedSupplier?.name) {
                        setFormData({ ...formData, supplierId: '' });
                      }
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="Search for a supplier..."
                    className="input-base w-full text-sm"
                    style={{
                      ...fieldStyle,
                      paddingLeft: '2.5rem',
                      borderColor: formErrors.supplierId ? 'var(--color-danger)' : 'var(--color-input-border)'
                    }}
                  />
                  {selectedSupplier && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-text)' }}>
                        ✓ Selected
                      </span>
                    </div>
                  )}
                </div>

                {showSupplierDropdown && supplierSearchQuery && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg overflow-hidden" style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}>
                    {filteredSuppliers.length === 0 ? (
                      <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No suppliers found
                      </div>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => selectSupplier(supplier)}
                          className="w-full text-left px-4 py-2.5 transition-colors duration-100 flex items-center justify-between"
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-text-primary)',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{supplier.name}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {supplier.email || supplier.phone || 'No contact info'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {formErrors.supplierId && (
                  <p className="text-danger text-sm mt-1">{formErrors.supplierId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Expected Delivery Date *
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => {
                    setFormData({ ...formData, expectedDeliveryDate: e.target.value });
                    setFormErrors(prev => ({ ...prev, expectedDeliveryDate: '' }));
                  }}
                  className="input-base w-full text-sm"
                  style={{
                    ...fieldStyle,
                    borderColor: formErrors.expectedDeliveryDate ? 'var(--color-danger)' : 'var(--color-input-border)'
                  }}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  required
                />
                {formErrors.expectedDeliveryDate && (
                  <p className="text-danger text-sm mt-1">{formErrors.expectedDeliveryDate}</p>
                )}
              </div>
            </div>
          </Card>
          {/* Add Items Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Add Items *
              </h3>
              <div className="flex items-center gap-2">
                {editingItemIndex !== null && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-sm hover:text-primary transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* ─── BULK IMPORT SECTION ─────────────────────────────────────────── */}
            <div
              className="mb-4 p-4 rounded-lg border-2 border-dashed"
              style={{
                borderColor: 'var(--color-accent)',
                background: 'var(--color-accent-light)',
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8" style={{ color: 'var(--color-accent-text)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Bulk Import from Excel
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Upload an Excel file to add multiple items at once
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors"
                    style={{
                      background: 'var(--color-bg-surface)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
                    }}
                  >
                    <Download size={16} />
                    Download Template
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                    style={{
                      background: 'var(--color-accent)',
                      color: 'var(--color-accent-fg)',
                      opacity: isImporting ? 0.6 : 1,
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isImporting) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isImporting) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)';
                      }
                    }}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Import Excel
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
              {formData.items.length > 0 && (
                <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-success-text)' }}>
                    ✓ {formData.items.length} items added
                  </span>
                  {' · '}
                  <span>Total: GHS {calculateTotal(formData.items).toFixed(2)}</span>
                </div>
              )}
            </div>

            {formErrors.items && (
              <p className="text-danger text-sm mb-4">{formErrors.items}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Product Search */}
              <div className="md:col-span-2 relative" ref={productDropdownRef}>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Product *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                      if (newItem.productId && e.target.value !== selectedProduct?.name) {
                        setNewItem({ ...newItem, productId: '', unitPrice: '' });
                      }
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search for a product..."
                    className="input-base w-full text-sm"
                    style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
                  />
                  {selectedProduct && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                        Stock: {selectedProduct.quantity}
                      </span>
                    </div>
                  )}
                </div>

                {showProductDropdown && productSearchQuery && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg overflow-hidden" style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}>
                    {filteredProducts.length === 0 ? (
                      <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No products found
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => selectProduct(product)}
                          className="w-full text-left px-4 py-2.5 transition-colors duration-100 flex items-center justify-between"
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-text-primary)',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              SKU: {product.sku} • Stock: {product.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-semibold ml-3" style={{ color: 'var(--color-accent-text)' }}>
                            GHS {safeNumber(product.unitPrice).toFixed(2)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Quantity *
                </label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="input-base w-full text-sm"
                  style={fieldStyle}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  placeholder="0"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Cost Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  className="input-base w-full text-sm"
                  style={fieldStyle}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  placeholder="0.00"
                  min="0"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addItemToPO}
                  className="w-full btn-accent py-2.5 text-sm"
                  style={{ height: '42px' }}
                >
                  {editingItemIndex !== null ? (
                    <>
                      <Save className="h-4 w-4 inline mr-1" />
                      Update Item
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 inline mr-1" />
                      Add Item
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Batch Number
                </label>
                <input
                  type="text"
                  value={newItem.batchNumber}
                  onChange={(e) => setNewItem({ ...newItem, batchNumber: e.target.value })}
                  className="input-base w-full text-sm"
                  style={fieldStyle}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                  className="input-base w-full text-sm"
                  style={fieldStyle}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                />
              </div>
            </div>
          </Card>

          {/* Items Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Order Items ({formData.items.length})
              </h3>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Total: <span className="font-bold" style={{ color: 'var(--color-accent-text)' }}>
                  GHS {calculateTotal(formData.items).toFixed(2)}
                </span>
              </span>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No items added yet</p>
                <p className="text-xs mt-1">Search and add products above, or import from Excel</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--color-bg-subtle)' }}>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Product</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Cost Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Total</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Batch</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {formData.items.map((item, index) => (
                      <tr
                        key={index}
                        style={{
                          background: editingItemIndex === index ? 'var(--color-accent-light)' : 'transparent',
                          transition: 'background 150ms ease',
                        }}
                        className="hover:bg-subtle"
                      >
                        <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          {index + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium text-primary">{item.productName}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-semibold text-primary tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-primary tabular-nums">
                          GHS {safeNumber(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                          GHS {safeNumber(item.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {item.batchNumber || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => editItem(index)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-info-light"
                              style={{ color: 'var(--color-info-text)' }}
                              title="Edit item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemFromPO(index)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-danger-light"
                              style={{ color: 'var(--color-danger-text)' }}
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: 'var(--color-bg-subtle)' }}>
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-primary">
                        Grand Total:
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                        GHS {calculateTotal(formData.items).toFixed(2)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={goBackToList}
              className="flex-1 btn-ghost py-3 text-base"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formData.items.length === 0 || isSubmitting}
              className="flex-1 btn-accent py-3 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Creating...
                </>
              ) : (
                'Create Purchase Order'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── DETAIL PAGE ──────────────────────────────────────────────────────
  if (showDetailPage && selectedPO) {
    return (
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={goBackToList}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
              }}
            >
              <ArrowLeft size={18} />
              Back to Orders
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {selectedPO.orderNumber}
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {getSupplierName(selectedPO)} • {new Date(selectedPO.orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const badge = getStatusBadge(selectedPO.status);
              const StatusIcon = badge.icon;
              return (
                <span className={`badge ${badge.cls} inline-flex items-center gap-1.5 text-sm px-4 py-2`}>
                  <StatusIcon className="h-4 w-4" />
                  {badge.text}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Supplier</p>
            <p className="text-base font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {getSupplierName(selectedPO)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Order Date</p>
            <p className="text-base font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {new Date(selectedPO.orderDate).toLocaleDateString()}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Expected Delivery</p>
            <p className="text-base font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {selectedPO.expectedDeliveryDate ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString() : 'Not set'}
            </p>
          </Card>
          <Card className="p-4" style={{ borderColor: 'var(--color-accent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total Amount</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-accent-text)' }}>
              GHS {safeNumber(selectedPO.totalAmount).toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Order Items ({selectedPO.items.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-subtle)' }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Product</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Cost Price</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Total</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Batch</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {selectedPO.items.map((item, index) => (
                  <tr key={index} className="hover:bg-subtle">
                    <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-primary">{item.productName}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center text-sm font-semibold text-primary tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-primary tabular-nums">
                      GHS {safeNumber(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                      GHS {safeNumber(item.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {item.batchNumber || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: 'var(--color-bg-subtle)' }}>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold text-primary">
                    Grand Total:
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                    GHS {safeNumber(selectedPO.totalAmount).toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Actions */}
        {selectedPO.status === 'pending' && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => markAsReceived(selectedPO)}
              className="btn-success flex items-center gap-2 px-6 py-3 text-base"
            >
              <CheckCircle className="h-5 w-5" />
              Mark as Received
            </button>
            <button
              onClick={() => cancelPO(selectedPO)}
              className="px-6 py-3 text-base font-semibold rounded-xl transition-all duration-200"
              style={{
                background: 'var(--color-danger)',
                color: '#fff'
              }}
            >
              <XCircle className="h-5 w-5 inline mr-2" />
              Cancel Order
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST PAGE ──────────────────────────────────────────────────────
  if (suppliers.length === 0 || products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
          <p className="mt-4 text-secondary">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Purchase Orders</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage supplier orders and inventory restocking</p>
        </div>
        <button
          onClick={openNewPOPage}
          className="btn-accent flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary">Total Orders</p>
              <p className="text-2xl font-bold text-primary tabular-nums">{statusCounts.total}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
              <FileText className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-light)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-warning-text)' }}>Pending</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-warning-text)' }}>{statusCounts.pending}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-warning)', color: 'var(--color-accent-fg)' }}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-light)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-success-text)' }}>Received</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success-text)' }}>{statusCounts.received}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-success)', color: 'var(--color-accent-fg)' }}>
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-danger-text)' }}>Cancelled</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-danger-text)' }}>{statusCounts.cancelled}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--color-danger)', color: 'var(--color-accent-fg)' }}>
              <XCircle className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search purchase orders by number, supplier, or status..."
            className="input-base w-full pl-10 pr-4 text-sm"
            style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          />
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <div className="px-4 py-4 border-b border-theme">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-primary">Purchase Orders</h2>
              <p className="text-sm text-secondary">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredPurchaseOrders.length)} of {filteredPurchaseOrders.length} orders
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-subtle border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Order Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Dates</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {currentPurchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Truck className="h-12 w-12 text-muted mx-auto mb-3" />
                    <p className="text-lg font-medium text-primary">No purchase orders found</p>
                    <p className="text-sm text-secondary mt-1">
                      {searchQuery ? 'No purchase orders match your search' : 'Get started by creating your first purchase order'}
                    </p>
                    <button
                      onClick={openNewPOPage}
                      className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 text-sm mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      Create Purchase Order
                    </button>
                  </td>
                </tr>
              ) : (
                currentPurchaseOrders.map((po) => {
                  const badge = getStatusBadge(po.status);
                  const StatusIcon = badge.icon;
                  const supplierName = getSupplierName(po);
                  const totalItems = po.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <tr key={po.id} className="hover:bg-subtle transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                              {po.orderNumber}
                            </p>
                            <p className="text-sm text-secondary">
                              {new Date(po.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-primary truncate max-w-[150px]">{supplierName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted" />
                          <span className="font-semibold text-primary">{po.items.length} products</span>
                          <span className="text-secondary">({totalItems} items)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-secondary">Expected:</span>
                          <span className="text-sm font-medium text-primary">
                            {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Not set'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4" style={{ color: 'var(--color-success-text)' }} />
                          <span className="text-base font-bold tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                            GHS {safeNumber(po.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${badge.cls} inline-flex items-center gap-1 text-sm px-3 py-1.5`}>
                          <StatusIcon className="h-3 w-3" />
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetailPage(po)}
                          className="btn-accent flex items-center gap-1 px-3 py-1.5 text-sm"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPurchaseOrders.length > itemsPerPage && <Pagination />}
      </Card>
    </div>
  );
};
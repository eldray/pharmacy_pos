// src/pages/InventoryPage.tsx - Updated with Sorting
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
  X,
  Box,
  Clock,
  Filter,
  Eye,
  Download,
  LayoutDashboard,
  CheckCircle,
  GripVertical,
  Layers,
  AlertCircle,
  Clock as ClockIcon,
  ArrowUpDown
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product, InventoryLog } from '../types';
import { Card } from '../components/ui/Card';

type TabType = 'overview' | 'low-stock' | 'expiry' | 'history';

// ─── SORT TYPES ──────────────────────────────────────────────────────
type SortField = 'name' | 'sku' | 'category' | 'quantity' | 'price' | 'expiry' | 'date' | 'type';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [disposalQty, setDisposalQty] = useState(0);
  const [disposalReason, setDisposalReason] = useState('');

  // Pagination states
  const [overviewPage, setOverviewPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [expiryPage, setExpiryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ─── SORT STATES ──────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });

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

  const onFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const onFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  useEffect(() => {
    fetchProducts();
    fetchInventoryLogs();
  }, [fetchProducts, fetchInventoryLogs]);

  // ─── SORT FUNCTION ──────────────────────────────────────────────────
  const sortProducts = (items: Product[], field: SortField, direction: SortDirection): Product[] => {
    return [...items].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (field) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'sku':
          aVal = a.sku.toLowerCase();
          bVal = b.sku.toLowerCase();
          break;
        case 'category':
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case 'price':
          aVal = a.unitPrice;
          bVal = b.unitPrice;
          break;
        case 'expiry':
          aVal = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          bVal = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortLogs = (items: InventoryLog[], field: SortField, direction: SortDirection): InventoryLog[] => {
    return [...items].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (field) {
        case 'name':
          aVal = a.productName.toLowerCase();
          bVal = b.productName.toLowerCase();
          break;
        case 'type':
          aVal = a.type.toLowerCase();
          bVal = b.type.toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // ─── SORT HANDLER ──────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    // Reset to page 1 when sorting
    setOverviewPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  // ─── FILTERED AND SORTED DATA ────────────────────────────────────
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

  const sortedProducts = useMemo(() => {
    return sortProducts(filteredProducts, sortConfig.field, sortConfig.direction);
  }, [filteredProducts, sortConfig]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.quantity < 20),
    [products]
  );

  const sortedLowStock = useMemo(() => {
    return sortProducts(lowStockProducts, sortConfig.field, sortConfig.direction);
  }, [lowStockProducts, sortConfig]);

  const expiringProducts = useMemo(() => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return products.filter((p) => p.expiryDate && new Date(p.expiryDate) <= threeMonthsFromNow);
  }, [products]);

  const sortedExpiry = useMemo(() => {
    return sortProducts(expiringProducts, 'expiry', 'asc');
  }, [expiringProducts]);

  const sortedHistory = useMemo(() => {
    return sortLogs(inventoryLogs, 'date', 'desc');
  }, [inventoryLogs]);

  // ─── PAGINATION ──────────────────────────────────────────────────
  const overviewTotalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const overviewStartIndex = (overviewPage - 1) * itemsPerPage;
  const overviewEndIndex = overviewStartIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(overviewStartIndex, overviewEndIndex);

  const goToOverviewPage = (page: number) => {
    setOverviewPage(Math.max(1, Math.min(page, overviewTotalPages)));
  };

  const lowStockTotalPages = Math.ceil(sortedLowStock.length / itemsPerPage);
  const lowStockStartIndex = (lowStockPage - 1) * itemsPerPage;
  const lowStockEndIndex = lowStockStartIndex + itemsPerPage;
  const currentLowStock = sortedLowStock.slice(lowStockStartIndex, lowStockEndIndex);

  const goToLowStockPage = (page: number) => {
    setLowStockPage(Math.max(1, Math.min(page, lowStockTotalPages)));
  };

  const expiryTotalPages = Math.ceil(sortedExpiry.length / itemsPerPage);
  const expiryStartIndex = (expiryPage - 1) * itemsPerPage;
  const expiryEndIndex = expiryStartIndex + itemsPerPage;
  const currentExpiry = sortedExpiry.slice(expiryStartIndex, expiryEndIndex);

  const goToExpiryPage = (page: number) => {
    setExpiryPage(Math.max(1, Math.min(page, expiryTotalPages)));
  };

  const historyTotalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const historyStartIndex = (historyPage - 1) * itemsPerPage;
  const historyEndIndex = historyStartIndex + itemsPerPage;
  const currentHistory = sortedHistory.slice(historyStartIndex, historyEndIndex);

  const goToHistoryPage = (page: number) => {
    setHistoryPage(Math.max(1, Math.min(page, historyTotalPages)));
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
      return <span className="badge badge-danger text-sm px-3 py-1.5">Out of Stock</span>;
    if (quantity < 10)
      return <span className="badge badge-danger text-sm px-3 py-1.5">Critical</span>;
    if (quantity < 20)
      return <span className="badge badge-warning text-sm px-3 py-1.5">Low Stock</span>;
    if (quantity < 50)
      return <span className="badge badge-info text-sm px-3 py-1.5">Medium</span>;
    return <span className="badge badge-success text-sm px-3 py-1.5">In Stock</span>;
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
      return <span className="badge badge-danger text-sm px-3 py-1.5">Expired</span>;
    if (expiry < oneMonth)
      return <span className="badge badge-warning text-sm px-3 py-1.5">Expiring Soon</span>;
    if (expiry < threeMonths)
      return <span className="badge badge-warning text-sm px-3 py-1.5">3mo</span>;
    return <span className="badge badge-success text-sm px-3 py-1.5">Valid</span>;
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'inflow': return 'badge-success';
      case 'outflow': return 'badge-danger';
      case 'adjustment': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  // ─── PAGINATION COMPONENT ──────────────────────────────────────
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    startIndex,
    endIndex,
    totalItems,
    itemsLabel = 'items'
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    startIndex: number;
    endIndex: number;
    totalItems: number;
    itemsLabel?: string;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3">
        <div className="text-sm text-secondary">
          Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} {itemsLabel}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-50"
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
                  onClick={() => onPageChange(page)}
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
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // ─── SORTABLE TABLE HEADER ──────────────────────────────────────
  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase cursor-pointer hover:text-primary transition-colors select-none"
      onClick={() => handleSort(field)}
      style={{ whiteSpace: 'nowrap' }}
    >
      <div className="flex items-center gap-1">
        {label}
        {getSortIcon(field)}
      </div>
    </th>
  );

  // ─── OVERVIEW VIEW ──────────────────────────────────────────────
  const renderOverview = () => {
    const totalProducts = products.length;
    const lowStockCount = lowStockProducts.length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;
    const expiringCount = expiringProducts.length;
    const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);

    const stats = [
      {
        label: 'Total Products',
        value: totalProducts,
        icon: Package,
        color: 'var(--color-accent)',
        bg: 'var(--color-accent-light)'
      },
      {
        label: 'Low Stock',
        value: lowStockCount,
        icon: AlertTriangle,
        color: 'var(--color-warning-text)',
        bg: 'var(--color-warning-light)',
        link: 'low-stock'
      },
      {
        label: 'Out of Stock',
        value: outOfStockCount,
        icon: AlertCircle,
        color: 'var(--color-danger-text)',
        bg: 'var(--color-danger-light)'
      },
      {
        label: 'Expiring Soon',
        value: expiringCount,
        icon: Calendar,
        color: 'var(--color-danger-text)',
        bg: 'var(--color-danger-light)',
        link: 'expiry'
      },
      {
        label: 'Inventory Value',
        value: `GHS ${totalValue.toFixed(2)}`,
        icon: TrendingUp,
        color: 'var(--color-success-text)',
        bg: 'var(--color-success-light)'
      },
      {
        label: 'Activity Logs',
        value: inventoryLogs.length,
        icon: History,
        color: 'var(--color-info-text)',
        bg: 'var(--color-info-light)',
        link: 'history'
      },
    ];

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => stat.link && setActiveTab(stat.link as TabType)}
              style={{
                cursor: stat.link ? 'pointer' : 'default',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary">{stat.label}</p>
                  <p className="text-xl font-bold text-primary tabular-nums">{stat.value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: stat.bg, color: stat.color }}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              {stat.link && (
                <div className="mt-2">
                  <span className="text-xs font-medium" style={{ color: stat.color }}>
                    Click to view →
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOverviewPage(1);
            }}
            placeholder="Search products by name, SKU, barcode, or category..."
            className="input-base w-full pl-10 pr-4 text-sm"
            style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          />
        </div>

        {/* Products Table with Sortable Headers */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-subtle border-b border-theme">
                <tr>
                  <SortableHeader field="name" label="Product" />
                  <SortableHeader field="sku" label="SKU" />
                  <SortableHeader field="category" label="Category" />
                  <SortableHeader field="quantity" label="Quantity" />
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
                          {product.batchNumber && (
                            <p className="text-xs text-secondary">Batch: {product.batchNumber}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm text-primary">{product.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-secondary text-xs px-2 py-0.5">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-base font-bold text-primary tabular-nums">{product.quantity}</p>
                        <p className="text-xs text-secondary">units</p>
                      </div>
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
                          className="btn-accent flex items-center gap-1 px-3 py-1.5 text-sm"
                        >
                          <Edit2 className="h-3 w-3" />
                          Adjust
                        </button>
                        <button
                          onClick={() => openDisposalModal(product)}
                          className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm"
                          style={{ color: 'var(--color-danger-text)' }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Dispose
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted mx-auto mb-3" />
                <p className="text-base font-medium text-primary mb-1">No products found</p>
                <p className="text-sm text-secondary">Try adjusting your search criteria</p>
              </div>
            )}
          </div>

          {/* Overview Pagination */}
          <Pagination
            currentPage={overviewPage}
            totalPages={overviewTotalPages}
            onPageChange={goToOverviewPage}
            startIndex={overviewStartIndex}
            endIndex={overviewEndIndex}
            totalItems={sortedProducts.length}
            itemsLabel="products"
          />
        </Card>
      </div>
    );
  };

  // ─── LOW STOCK VIEW ──────────────────────────────────────────────
  const renderLowStock = () => (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-primary">Low Stock Items</h2>
            <p className="text-sm text-secondary">{sortedLowStock.length} products below 20 units</p>
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-1"
          >
            <ArrowUpRight className="h-4 w-4" />
            Back to Overview
          </button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-subtle border-b border-theme">
              <tr>
                <SortableHeader field="name" label="Product" />
                <SortableHeader field="quantity" label="Quantity" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {currentLowStock.map((product) => (
                <tr key={product.id} className="hover:bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-primary">{product.name}</p>
                      <p className="text-xs text-secondary">SKU: {product.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-base font-bold text-primary tabular-nums">{product.quantity}</p>
                  </td>
                  <td className="px-4 py-3">
                    {getStockBadge(product.quantity)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openAdjustmentModal(product)}
                      className="btn-accent flex items-center gap-1 px-3 py-1.5 text-sm"
                    >
                      <Edit2 className="h-3 w-3" />
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedLowStock.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
              <p className="text-base font-medium text-primary">All products are well stocked!</p>
            </div>
          )}
        </div>

        <Pagination
          currentPage={lowStockPage}
          totalPages={lowStockTotalPages}
          onPageChange={goToLowStockPage}
          startIndex={lowStockStartIndex}
          endIndex={lowStockEndIndex}
          totalItems={sortedLowStock.length}
          itemsLabel="products"
        />
      </Card>
    </div>
  );

  // ─── EXPIRY VIEW ──────────────────────────────────────────────
  const renderExpiry = () => (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-primary">Expiry Management</h2>
            <p className="text-sm text-secondary">{sortedExpiry.length} products expiring within 3 months</p>
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-1"
          >
            <ArrowUpRight className="h-4 w-4" />
            Back to Overview
          </button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-subtle border-b border-theme">
              <tr>
                <SortableHeader field="name" label="Product" />
                <SortableHeader field="expiry" label="Expiry Date" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {currentExpiry.map((product) => (
                <tr key={product.id} className="hover:bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-primary">{product.name}</p>
                      <p className="text-xs text-secondary">Batch: {product.batchNumber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-base font-medium text-primary">
                      {new Date(product.expiryDate).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {getExpiryBadge(product.expiryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDisposalModal(product)}
                      className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm"
                      style={{ color: 'var(--color-danger-text)' }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Dispose
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedExpiry.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
              <p className="text-base font-medium text-primary">No products expiring soon!</p>
            </div>
          )}
        </div>

        <Pagination
          currentPage={expiryPage}
          totalPages={expiryTotalPages}
          onPageChange={goToExpiryPage}
          startIndex={expiryStartIndex}
          endIndex={expiryEndIndex}
          totalItems={sortedExpiry.length}
          itemsLabel="products"
        />
      </Card>
    </div>
  );

  // ─── HISTORY VIEW ──────────────────────────────────────────────
  const renderHistory = () => (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-primary">Inventory History</h2>
            <p className="text-sm text-secondary">{sortedHistory.length} total activities</p>
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-1"
          >
            <ArrowUpRight className="h-4 w-4" />
            Back to Overview
          </button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-subtle border-b border-theme sticky top-0">
              <tr>
                <SortableHeader field="name" label="Product" />
                <SortableHeader field="type" label="Type" />
                <SortableHeader field="quantity" label="Quantity" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">User</th>
                <SortableHeader field="date" label="Date" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {currentHistory.map((log) => (
                <tr key={log.id} className="hover:bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm text-primary">{log.productName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getLogTypeColor(log.type)} text-sm inline-flex items-center gap-1`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${log.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                      {log.quantity > 0 ? '+' : ''}{log.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {log.userName || 'System'}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary max-w-xs truncate">
                    {log.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedHistory.length === 0 && (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium text-primary">No history yet</p>
              <p className="text-sm text-secondary">Inventory adjustments will appear here</p>
            </div>
          )}
        </div>

        <Pagination
          currentPage={historyPage}
          totalPages={historyTotalPages}
          onPageChange={goToHistoryPage}
          startIndex={historyStartIndex}
          endIndex={historyEndIndex}
          totalItems={sortedHistory.length}
          itemsLabel="logs"
        />
      </Card>
    </div>
  );

  // ─── TABS ──────────────────────────────────────────────────────
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard size={16} />,
      description: 'Dashboard & Products'
    },
    {
      id: 'low-stock',
      label: 'Low Stock',
      icon: <AlertTriangle size={16} />,
      description: 'Items below 20 units',
      count: lowStockProducts.length,
      countColor: 'var(--color-warning)'
    },
    {
      id: 'expiry',
      label: 'Expiry',
      icon: <Calendar size={16} />,
      description: 'Expiring soon',
      count: expiringProducts.length,
      countColor: 'var(--color-danger)'
    },
    {
      id: 'history',
      label: 'History',
      icon: <History size={16} />,
      description: 'Activity logs',
      count: inventoryLogs.length,
      countColor: 'var(--color-info)'
    },
  ];

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Inventory Management</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage stock levels, track expiry, and adjust inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
            {products.length} products
          </span>
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
            Sort: {sortConfig.field} {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        </div>
      </div>

      {/* Cute Tab Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType);
              if (tab.id === 'overview') setOverviewPage(1);
              else if (tab.id === 'low-stock') setLowStockPage(1);
              else if (tab.id === 'expiry') setExpiryPage(1);
              else if (tab.id === 'history') setHistoryPage(1);
            }}
            className="relative p-4 rounded-xl text-left transition-all duration-200 group"
            style={{
              background: activeTab === tab.id
                ? 'var(--color-accent)'
                : 'var(--color-bg-surface)',
              border: activeTab === tab.id
                ? '2px solid var(--color-accent)'
                : '2px solid var(--color-border)',
              boxShadow: activeTab === tab.id
                ? '0 4px 12px rgba(14, 116, 144, 0.25)'
                : 'var(--shadow-card)',
              transform: activeTab === tab.id ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    background: activeTab === tab.id
                      ? 'rgba(255,255,255,0.2)'
                      : 'var(--color-bg-subtle)',
                    color: activeTab === tab.id
                      ? '#fff'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {tab.icon}
                </div>
                <div>
                  <p
                    className="font-semibold text-sm"
                    style={{
                      color: activeTab === tab.id
                        ? '#fff'
                        : 'var(--color-text-primary)',
                    }}
                  >
                    {tab.label}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: activeTab === tab.id
                        ? 'rgba(255,255,255,0.7)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {tab.description}
                  </p>
                </div>
              </div>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: activeTab === tab.id
                      ? 'rgba(255,255,255,0.25)'
                      : tab.countColor || 'var(--color-accent)',
                    color: activeTab === tab.id
                      ? '#fff'
                      : '#fff',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </div>
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.5)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Render Active Tab */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'low-stock' && renderLowStock()}
      {activeTab === 'expiry' && renderExpiry()}
      {activeTab === 'history' && renderHistory()}

      {/* ─── MODALS (same as before) ────────────────────────────────── */}
      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal">
          <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-md border-theme">
            <div className="sticky top-0 bg-brand text-white rounded-t-2xl px-6 py-4">
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
              <div className="flex items-center gap-3 p-4 bg-subtle rounded-xl border-theme">
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">{selectedProduct.name}</h3>
                  <p className="text-sm text-secondary">
                    Current: <strong className="text-primary">{selectedProduct.quantity}</strong> units
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-3">
                  Adjustment Amount *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdjustmentQty(Math.max(-selectedProduct.quantity, adjustmentQty - 1))}
                    className="p-3 border-2 rounded-xl hover:bg-subtle transition-colors flex-shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Minus className="h-5 w-5 text-secondary" />
                  </button>
                  <input
                    type="number"
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    className="w-64 px-3 py-3 text-center text-lg font-bold border-2 rounded-xl focus:ring-2 outline-none transition-all"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-input-bg)',
                      color: 'var(--color-text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                  <button
                    onClick={() => setAdjustmentQty(adjustmentQty + 1)}
                    className="p-3 border-2 rounded-xl hover:bg-subtle transition-colors flex-shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Plus className="h-5 w-5 text-secondary" />
                  </button>
                </div>
                <p className="text-xs text-secondary mt-2 text-center">
                  Use negative to reduce, positive to add
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--color-info-light)', border: '1px solid var(--color-info)' }}>
                <p className="text-sm font-semibold text-center" style={{ color: 'var(--color-info-text)' }}>
                  New Stock: <span className={selectedProduct.quantity + adjustmentQty < 0 ? 'text-danger' : 'text-success'}>
                    {selectedProduct.quantity + adjustmentQty}
                  </span> units
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="e.g., Damaged stock, received shipment, found discrepancy..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all resize-none text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-input-bg)',
                    color: 'var(--color-text-primary)'
                  }}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                />
              </div>
            </div>

            <div className="border-t border-theme px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                disabled={isAdjusting}
                className="flex-1 btn-ghost py-3 text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                disabled={isAdjusting || adjustmentQty === 0 || selectedProduct.quantity + adjustmentQty < 0}
                className="flex-1 btn-accent py-3 text-base"
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
        <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-modal">
          <div className="surface-elevated rounded-2xl shadow-xl w-full max-w-md border-theme">
            <div className="sticky top-0 bg-brand text-white rounded-t-2xl px-6 py-4">
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
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' }}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-danger-text)' }}>{selectedProduct.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>
                    Current: <strong>{selectedProduct.quantity}</strong> units
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-3">
                  Quantity to Dispose *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDisposalQty(Math.max(0, disposalQty - 1))}
                    className="p-3 border-2 rounded-xl hover:bg-subtle transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Minus className="h-5 w-5 text-secondary" />
                  </button>
                  <input
                    type="number"
                    value={disposalQty}
                    onChange={(e) => setDisposalQty(parseInt(e.target.value) || 0)}
                    min="0"
                    max={selectedProduct.quantity}
                    className="flex-1 px-4 py-3 text-center text-lg font-bold border-2 rounded-xl focus:ring-2 outline-none transition-all"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-input-bg)',
                      color: 'var(--color-text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                  <button
                    onClick={() => setDisposalQty(Math.min(selectedProduct.quantity, disposalQty + 1))}
                    className="p-3 border-2 rounded-xl hover:bg-subtle transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Plus className="h-5 w-5 text-secondary" />
                  </button>
                </div>
                <p className="text-xs text-secondary mt-2 text-center">
                  Max: {selectedProduct.quantity} units
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' }}>
                <p className="text-sm font-semibold text-center" style={{ color: 'var(--color-danger-text)' }}>
                  After disposal: <strong>{selectedProduct.quantity - disposalQty}</strong> units
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Reason for Disposal *
                </label>
                <select
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-input-bg)',
                    color: 'var(--color-text-primary)'
                  }}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
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
                    className="w-full mt-3 px-4 py-3 border-2 rounded-xl focus:ring-2 outline-none transition-all text-sm"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-input-bg)',
                      color: 'var(--color-text-primary)'
                    }}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                  />
                )}
              </div>
            </div>

            <div className="border-t border-theme px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowDisposalModal(false)}
                disabled={isAdjusting}
                className="flex-1 btn-ghost py-3 text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDisposal}
                disabled={isAdjusting || disposalQty <= 0 || disposalQty > selectedProduct.quantity || !disposalReason.trim()}
                className="flex-1 py-3 text-base font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'var(--color-danger)',
                  color: '#fff'
                }}
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
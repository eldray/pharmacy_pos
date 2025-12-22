// src/components/POSInterface.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, ShoppingCart, Trash2, DollarSign,
  Plus, Minus, Scan, X, User, Phone
} from 'lucide-react';
import { useAppStore } from '../store';
import { Product, CartItem, PaymentMethod, Transaction } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { Card } from './ui/Card';

export const POSInterface: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const {
    currentUser,
    fetchProducts,
    products,
    cartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    addTransaction,
  } = useAppStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search products by name, SKU, barcode, or category
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const byBarcode = products.find((p) => p.barcode === searchQuery);
    if (byBarcode) return [byBarcode];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  // FIXED: Always add as NEW line item — NO merging
  const handleAddProduct = (product: Product) => {
    if (!product.id) {
      alert('Error: Product missing ID');
      return;
    }
    if (product.quantity <= 0) {
      alert('Product out of stock');
      return;
    }

    // Always create a new cart row
    addToCart(product, 1);

    setSearchQuery('');
  };

  // Handle quantity change (+ / -)
  const handleQuantityChange = (cartId: string, newQty: number) => {
    if (newQty < 1) {
      removeFromCart(cartId);
    } else {
      updateCartItem(cartId, newQty);
    }
  };

  // Calculate totals
  const { subtotal, tax } = getCartTotal();
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal - discountAmount + tax;

  // Process payment
  const handlePayment = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }
    if (selectedPayment !== 'cash' && !mobileMoneyNumber) {
      alert('Please enter mobile money number');
      return;
    }
    if (selectedPayment !== 'cash' && mobileMoneyNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    setPaymentLoading(true);
    try {
      const transactionData = {
        items: cartItems.map(i => ({
          productId: i.productId,
          productName: i.product.name,
          productSku: i.product.sku,
          productCategory: i.product.category,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
          discount: i.discount || 0,
        })),
        subtotal,
        tax,
        total: finalTotal,
        paymentMethod: selectedPayment,
        paymentReference:
          selectedPayment !== 'cash'
            ? `${selectedPayment.toUpperCase()}-${mobileMoneyNumber}`
            : undefined,
        discount: discountAmount,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      };

      const txn = await addTransaction(transactionData);
      if (txn) {
        setLastTransaction(txn);
        setShowReceipt(true);
        clearCart();
        setDiscountPercent(0);
        setMobileMoneyNumber('');
        setCustomerName('');
        setCustomerPhone('');
      } else {
        alert('Transaction failed');
      }
    } catch {
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">Point of Sale</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                <Scan className="h-4 w-4 text-blue-400" />
                <span>Ready to Scan</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                <ShoppingCart className="h-4 w-4 text-green-400" />
                <span>Products: <strong>{products.length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* PRODUCTS SECTION */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Quick Search – Name, SKU, Barcode or Category
                </label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {products.length} products
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults[0]) {
                      handleAddProduct(searchResults[0]);
                    }
                  }}
                  placeholder="Type to search or scan barcode..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Search Results</h3>
                  <span className="text-xs text-gray-500 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {searchResults.length} found
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer bg-white group hover:border-blue-300"
                      onClick={() => handleAddProduct(p)}
                    >
                      <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {p.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 truncate">{p.category}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            p.quantity > 10
                              ? 'bg-green-100 text-green-800'
                              : p.quantity > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.quantity > 0 ? `${p.quantity} stock` : 'Out of stock'}
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          GHS {p.unitPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Products */}
            {!searchQuery && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Available Products</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {products.length} total
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer bg-white group hover:border-blue-300"
                      onClick={() => handleAddProduct(p)}
                    >
                      <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {p.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 truncate">{p.category}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            p.quantity > 10
                              ? 'bg-green-100 text-green-800'
                              : p.quantity > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.quantity > 0 ? `${p.quantity} stock` : 'Out of stock'}
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          GHS {p.unitPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* CART SECTION */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6 backdrop-blur-sm bg-white/90 border-2 border-gray-100 shadow-xl">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
                  <p className="text-xs text-gray-600">{cartItems.length} items</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    title="Clear cart"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {cartItems.length}
                </div>
              </div>
            </div>

            <div className="p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Cart is empty</p>
                  <p className="text-gray-400 text-sm mt-1">Add products to get started</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                    {cartItems.map((i) => (
                      <div
                        key={i.cartId}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-100 hover:border-blue-200 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{i.product.name}</p>
                          <p className="text-xs text-gray-500 mt-1">GHS {i.unitPrice.toFixed(2)} each</p>
                          <p className="text-xs font-bold text-blue-600 mt-1">
                            GHS {i.total.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => handleQuantityChange(i.cartId, i.quantity - 1)}
                            className="p-1.5 text-gray-500 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-gray-900 bg-white border-2 border-gray-200 rounded-md py-1">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(i.cartId, i.quantity + 1)}
                            className="p-1.5 text-gray-500 hover:text-white hover:bg-green-600 rounded-lg transition-all duration-200"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(i.cartId)}
                            className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 ml-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Information */}
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <User className="h-4 w-4 inline mr-1" />
                        Customer Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Customer Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) =>
                        setDiscountPercent(
                          Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        )
                      }
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-gray-900">GHS {subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-semibold">
                        <span>Discount:</span>
                        <span>-GHS {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT (15%):</span>
                      <span className="font-semibold text-gray-900">GHS {tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pt-2 border-t-2 border-blue-200">
                      <span>Total Amount:</span>
                      <span>GHS {finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Method Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={selectedPayment}
                      onChange={(e) => setSelectedPayment(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="cash">Cash</option>
                      <option value="mtn">MTN Mobile Money</option>
                      <option value="vodafone">Vodafone Cash</option>
                      <option value="airteltigo">AirtelTigo Money</option>
                    </select>

                    {selectedPayment !== 'cash' && (
                      <div className="mt-3">
                        <input
                          type="tel"
                          value={mobileMoneyNumber}
                          onChange={(e) => setMobileMoneyNumber(e.target.value)}
                          placeholder="Enter phone number (e.g., 0551234567)"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Pay Button */}
                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading || cartItems.length === 0}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-lg">
                      {paymentLoading ? 'Processing...' : `Pay GHS ${finalTotal.toFixed(2)}`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastTransaction && (
        <ReceiptModal
          transaction={lastTransaction}
          customerName={customerName}
          customerPhone={customerPhone}
          onClose={() => setShowReceipt(false)}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
};

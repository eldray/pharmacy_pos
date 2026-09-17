import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, CheckCircle, CreditCard, User, X } from 'lucide-react';
import api, { getErrorMessage } from '../api/api';
import { SalesOrder, PaymentMethod } from '../types';

interface PendingOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPaid: (order: SalesOrder, transaction: any) => void;
}

export const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({ isOpen, onClose, onOrderPaid }) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPendingOrders();
    }
  }, [isOpen]);

  const fetchPendingOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/orders?status=pending_payment');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayOrder = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    setError('');
    try {
      const res = await api.post(`/orders/${selectedOrder.id}/pay`, {
        paymentMethod,
        paymentReference
      });
      onOrderPaid(selectedOrder, res.data.transaction);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center pb-3 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-600" /> Pending Sales Orders (Cashier Queue)
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm">{error}</div>}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Orders List */}
          <div className="border border-gray-200 rounded-xl overflow-y-auto divide-y">
            {isLoading ? (
              <div className="p-6 text-center text-gray-400">Loading pending orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No pending orders waiting for payment.</div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-4 cursor-pointer transition ${
                    selectedOrder?.id === ord.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-indigo-600">{ord.orderNumber}</span>
                    <span className="text-xs text-gray-400">{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 mt-1">
                    Customer: {ord.customerName || 'Walk-in Customer'}
                  </div>
                  <div className="text-xs text-gray-500">Issued by: {ord.createdByName || 'Pharmacist'}</div>
                  <div className="mt-2 text-right font-bold text-gray-900 text-lg">
                    ${Number(ord.total).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Selected Order Detail & Payment Collect */}
          {selectedOrder ? (
            <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <div className="font-bold text-gray-900 text-lg">Order #{selectedOrder.orderNumber}</div>
                  <div className="text-xs text-gray-500">Issued by {selectedOrder.createdByName}</div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between border-b pb-1">
                      <div>
                        <div className="font-medium text-gray-800">{item.product?.name || 'Product'}</div>
                        <div className="text-xs text-gray-400">Qty: {item.quantity} × ${item.unitPrice}</div>
                      </div>
                      <div className="font-semibold text-gray-900">${(item.quantity * item.unitPrice).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {selectedOrder.insuranceProviderName && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-emerald-800">Insurance Attached: {selectedOrder.insuranceProviderName}</div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Coverage: ${Number(selectedOrder.insuranceCoverage).toFixed(2)}</span>
                      <span className="font-bold">Co-Pay: ${Number(selectedOrder.copayAmount).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="border-t pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${Number(selectedOrder.subtotal).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Tax</span><span>${Number(selectedOrder.tax).toFixed(2)}</span></div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-1">
                    <span>Total Bill</span><span>${Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full border rounded-lg p-2 text-sm border-gray-300"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vodafone">Vodafone Cash</option>
                    <option value="airteltigo">AirtelTigo Money</option>
                  </select>
                </div>

                <button
                  onClick={handlePayOrder}
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5" /> Accept Payment (${Number(selectedOrder.total).toFixed(2)})
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-6 text-center text-gray-400 flex flex-col items-center justify-center">
              <ShoppingBag className="w-12 h-12 mb-2 text-gray-300" />
              <div>Select a pending order from the list on the left to collect payment.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

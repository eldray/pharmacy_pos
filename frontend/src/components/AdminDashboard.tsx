import React, { useState } from 'react';
import { Package, Truck, BarChart3, Users, FileText, ShoppingCart } from 'lucide-react';
import { ProductManagement } from '../pages/ProductManagement';
import { SupplierManagement } from '../pages/SupplierManagement';
import { PurchaseOrderPage } from '../pages/PurchaseOrderPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { POSInterface } from './POSInterface';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'products' | 'suppliers' | 'purchaseOrders' | 'analytics' | 'pos';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('products');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition border-b-2 ${
                  activeTab === 'products'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="h-5 w-5" />
                Products
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition border-b-2 ${
                  activeTab === 'suppliers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Truck className="h-5 w-5" />
                Suppliers
              </button>
              <button
                onClick={() => setActiveTab('purchaseOrders')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition border-b-2 ${
                  activeTab === 'purchaseOrders'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-5 w-5" />
                Purchase Orders
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition border-b-2 ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('pos')}
                className={`flex items-center gap-2 px-4 py-4 font-medium transition border-b-2 ${
                  activeTab === 'pos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                POS / Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && <ProductManagement onLogout={onLogout} />}
      {activeTab === 'suppliers' && <SupplierManagement onLogout={onLogout} />}
      {activeTab === 'purchaseOrders' && <PurchaseOrderPage onLogout={onLogout} />}
      {activeTab === 'analytics' && <AnalyticsPage onLogout={onLogout} />}
      {activeTab === 'pos' && <POSInterface onLogout={onLogout} />}
    </div>
  );
};


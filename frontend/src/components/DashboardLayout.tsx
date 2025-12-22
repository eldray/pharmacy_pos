// src/components/DashboardLayout.tsx
import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ProfileSettings } from './ProfileSettings';
import { DashboardHome } from './DashboardHome';
import { POSInterface } from './POSInterface';
import { ProductManagement } from '../pages/ProductManagement';
import { SupplierManagement } from '../pages/SupplierManagement';
import { PurchaseOrderPage } from '../pages/PurchaseOrderPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SalesPage } from '../pages/SalesPage'; // Add this import
import InventoryPage from '../pages/InventoryPage';
import { CompanySettings } from '../pages/CompanySettings';

export const DashboardLayout: React.FC = () => {
  const { currentUser, logout, company } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
        userRole={currentUser.role}
      />

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Fixed Navbar */}
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          user={currentUser}
          companyName={company?.name}
        />

        {/* Scrollable Main Content */}
        <main className="min-h-screen pt-16">
          {/* Consistent padding container */}
          <div className="p-6">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="pos" element={<POSInterface />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="suppliers" element={<SupplierManagement />} />
              <Route path="purchase-orders" element={<PurchaseOrderPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="sales" element={<SalesPage />} /> {/* Add this route */}
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="inventory" element={<InventoryPage />} />
              {currentUser.role === 'admin' && (
                <>
                  <Route path="settings" element={<CompanySettings />} />
                </>
              )}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

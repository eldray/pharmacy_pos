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
import { SalesPage } from '../pages/SalesPage';
import InventoryPage from '../pages/InventoryPage';
import { CompanySettings } from '../pages/CompanySettings';
import { LabManagement } from '../pages/LabManagement';
import { LabDetail } from '../pages/LabDetail';
import { StaffManagement } from '../pages/StaffManagement';
import { LabReports } from '../pages/LabReports';

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
    <div
      className="min-h-screen theme-transition"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Fixed Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
        userRole={currentUser.role}
      />

      {/* Main content — offset by sidebar width on lg+ */}
      <div className="lg:ml-64">
        {/* Fixed Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          user={currentUser}
          companyName={company?.name}
        />

        {/* Scrollable page content */}
        <main
          className="min-h-screen pt-16"
          style={{ background: 'var(--color-bg-base)' }}
        >
          <div className="p-5 lg:p-6">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="pos" element={<POSInterface />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="suppliers" element={<SupplierManagement />} />
              <Route path="purchase-orders" element={<PurchaseOrderPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="lab" element={<LabManagement />} />
              <Route path="lab/:id" element={<LabDetail />} />
              <Route path="lab-reports" element={<LabReports />} />

              {currentUser.role === 'admin' && (
                <>
                  <Route path="settings" element={<CompanySettings />} />
                  <Route path="users" element={<StaffManagement />} />
                </>
              )}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};
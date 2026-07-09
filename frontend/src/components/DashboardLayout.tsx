// src/components/DashboardLayout.tsx
import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useIdleLogout } from '../hooks/useIdleLogout';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

// Code-split imports
const ProfileSettings = React.lazy(() => import('./ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const DashboardHome = React.lazy(() => import('./DashboardHome').then(m => ({ default: m.DashboardHome })));
const POSInterface = React.lazy(() => import('./POSInterface').then(m => ({ default: m.POSInterface })));
const ProductManagement = React.lazy(() => import('../pages/ProductManagement').then(m => ({ default: m.ProductManagement })));
const SupplierManagement = React.lazy(() => import('../pages/SupplierManagement').then(m => ({ default: m.SupplierManagement })));
const PurchaseOrderPage = React.lazy(() => import('../pages/PurchaseOrderPage').then(m => ({ default: m.PurchaseOrderPage })));
const AnalyticsPage = React.lazy(() => import('../pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SalesPage = React.lazy(() => import('../pages/SalesPage').then(m => ({ default: m.SalesPage })));
const InventoryPage = React.lazy(() => import('../pages/InventoryPage'));
const CompanySettings = React.lazy(() => import('../pages/CompanySettings').then(m => ({ default: m.CompanySettings })));
const LabManagement = React.lazy(() => import('../pages/LabManagement').then(m => ({ default: m.LabManagement })));
const LabDetail = React.lazy(() => import('../pages/LabDetail').then(m => ({ default: m.LabDetail })));
const StaffManagement = React.lazy(() => import('../pages/StaffManagement').then(m => ({ default: m.StaffManagement })));
const LabReports = React.lazy(() => import('../pages/LabReports').then(m => ({ default: m.LabReports })));
const ControlledReport = React.lazy(() => import('../pages/ControlledReport').then(m => ({ default: m.ControlledReport })));
const ProfitReport = React.lazy(() => import('../pages/ProfitReport').then(m => ({ default: m.ProfitReport })));
const Preferences = React.lazy(() => import('../pages/Preferences').then(m => ({ default: m.Preferences })));
const HelpSupport = React.lazy(() => import('../pages/HelpSupport').then(m => ({ default: m.HelpSupport })));

export const DashboardLayout: React.FC = () => {
  const { currentUser, logout, company } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = React.useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Auto-logout after 30 min of inactivity, warning 1 min before.
  const { warning, stayActive } = useIdleLogout({ onTimeout: handleLogout });

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div
      className="min-h-screen theme-transition"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Idle session warning */}
      {warning && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-3"
          style={{
            top: 12,
            zIndex: 'var(--z-modal)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-warning)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-xl)',
            padding: '10px 14px',
            maxWidth: '92vw',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
            You'll be signed out soon due to inactivity.
          </span>
          <button
            onClick={stayActive}
            className="btn-accent"
            style={{ fontSize: '0.75rem', padding: '5px 12px' }}
          >
            Stay signed in
          </button>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ fontSize: '0.75rem', padding: '5px 12px' }}
          >
            Log out
          </button>
        </div>
      )}

      {/* Fixed Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
        userRole={currentUser.role}
      />

      {/* Main content — offset by sidebar width on lg+ */}
      <div
        className="layout-content-shell"
        style={{ minHeight: '100vh' }}
      >
        {/* Fixed Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          user={currentUser}
          companyName={company?.name}
        />

        {/* Scrollable page content */}
        <main
          className="theme-transition"
          style={{
            background: 'var(--color-bg-base)',
            paddingTop: 'var(--navbar-height)',
            minHeight: '100vh',
          }}
        >
          <div
            className="w-full"
            style={{
              padding: 'var(--space-4) var(--space-5)',
            }}
          >
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                  <div
                    className="rounded-full animate-spin"
                    style={{ width: 32, height: 32, border: '3px solid var(--color-accent)', borderTopColor: 'transparent' }}
                  />
                </div>
              }
            >
              <Routes>
                {/* Main Routes */}
                <Route index element={<DashboardHome />} />
                <Route path="pos" element={<POSInterface />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="suppliers" element={<SupplierManagement />} />
                <Route path="purchase-orders" element={<PurchaseOrderPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="inventory" element={<InventoryPage />} />

                {/* Lab Routes */}
                <Route path="lab" element={<LabManagement />} />
                <Route path="lab/:id" element={<LabDetail />} />
                <Route path="lab-reports" element={<LabReports />} />

                {/* Report Routes */}
                <Route path="controlled-report" element={<ControlledReport />} />
                {currentUser.role === 'admin' && (
                  <Route path="profit-report" element={<ProfitReport />} />
                )}

                {/* Settings & User Routes */}
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="preferences" element={<Preferences />} />
                <Route path="help" element={<HelpSupport />} />

                {/* Admin Only Routes */}
                {currentUser.role === 'admin' && (
                  <>
                    <Route path="settings" element={<CompanySettings />} />
                    <Route path="users" element={<StaffManagement />} />
                  </>
                )}
              </Routes>
            </React.Suspense>
          </div>
        </main>
      </div>

      {/* Scoped layout rule */}
      <style>{`
        .layout-content-shell {
          margin-left: 0;
        }
        @media (min-width: 1024px) {
          .layout-content-shell {
            margin-left: var(--sidebar-width);
          }
        }
      `}</style>
    </div>
  );
};
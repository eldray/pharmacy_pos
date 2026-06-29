// src/components/Sidebar.tsx
import React from 'react';
import {
  X, LayoutDashboard, ShoppingCart, Package, Truck,
  FileText, BarChart3, Settings, Receipt, Warehouse,
  Store, FlaskConical, UserCog
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  userRole: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'cashier', 'officer', 'lab'] },
  { icon: ShoppingCart, label: 'Point of Sale', path: '/dashboard/pos', roles: ['admin', 'cashier'] },
  { icon: Receipt, label: 'Sales', path: '/dashboard/sales', roles: ['admin', 'cashier', 'officer'] },
  { icon: Package, label: 'Products', path: '/dashboard/products', roles: ['admin', 'officer'] },
  { icon: Warehouse, label: 'Inventory', path: '/dashboard/inventory', roles: ['admin', 'officer'] },
  { icon: Truck, label: 'Suppliers', path: '/dashboard/suppliers', roles: ['admin', 'officer'] },
  { icon: FileText, label: 'Purchase Orders', path: '/dashboard/purchase-orders', roles: ['admin', 'officer'] },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', roles: ['admin'] },
  { icon: FlaskConical, label: 'Laboratory', path: '/dashboard/lab', roles: ['admin', 'lab', 'officer'] },
  { icon: FileText, label: 'Lab Reports', path: '/dashboard/lab-reports', roles: ['admin', 'lab'] },
  { icon: UserCog, label: 'Staff Management', path: '/dashboard/users', roles: ['admin'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['admin'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userRole }) => {
  const location = useLocation();

  const filtered = menuItems.filter((item) => item.roles.includes(userRole));

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--color-bg-overlay)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 z-50
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'var(--color-sidebar-bg)',
          borderRight: '1px solid var(--color-sidebar-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 py-5"
          style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Store className="h-5 w-5" style={{ color: 'var(--color-accent-fg)' }} />
              </div>
              <div>
                <span
                  className="text-base font-bold"
                  style={{ color: 'var(--color-sidebar-text-active)' }}
                >
                  PharmacyPOS
                </span>
                <p className="text-xs" style={{ color: 'var(--color-sidebar-text)' }}>
                  Management System
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-sidebar-text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-sidebar-item-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Role + status badges */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize badge-${userRole}`}
            >
              {userRole}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: 'var(--color-success)',
                color: 'var(--color-accent-fg)'
              }}
            >
              Online
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? 'var(--color-sidebar-item-active)' : 'transparent',
                  color: active ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                  border: active ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-sidebar-item-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-sidebar-text-active)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-sidebar-text)';
                  }
                }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            borderTop: '1px solid var(--color-sidebar-border)',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-sidebar-text)' }}>
              PharmacyPOS v1.0
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-success)', color: '#fff' }}
            >
              Live
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
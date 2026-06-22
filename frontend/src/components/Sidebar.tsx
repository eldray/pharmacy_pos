// src/components/Sidebar.tsx
import React from 'react';
import {
  X, LayoutDashboard, ShoppingCart, Package, Truck,
  FileText, BarChart3, Settings, Receipt, Warehouse,
  Store, FlaskConical, UserCog, ChevronRight
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

  const sections: { title?: string; items: MenuItem[] }[] = [
    { items: filtered.filter((i) => ['/dashboard', '/dashboard/pos', '/dashboard/sales'].includes(i.path)) },
    { title: 'Catalog', items: filtered.filter((i) => ['/dashboard/products', '/dashboard/inventory', '/dashboard/suppliers', '/dashboard/purchase-orders'].includes(i.path)) },
    { title: 'Operations', items: filtered.filter((i) => ['/dashboard/analytics', '/dashboard/lab', '/dashboard/lab-reports'].includes(i.path)) },
    { title: 'System', items: filtered.filter((i) => ['/dashboard/users', '/dashboard/settings'].includes(i.path)) },
  ].filter((s) => s.items.length > 0);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 lg:hidden"
          style={{ zIndex: 'var(--z-overlay)', background: 'var(--color-bg-overlay)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          zIndex: 'var(--z-sidebar)',
          width: 'var(--sidebar-width)',
          background: 'var(--color-sidebar-bg)',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0"
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-sidebar-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Store
                  style={{
                    width: 'var(--icon-md)',
                    height: 'var(--icon-md)',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                />
              </div>
              <div>
                <span
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'var(--color-sidebar-text-active)',
                    display: 'block',
                  }}
                >
                  PharmacyPOS
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-sidebar-text)',
                    opacity: 0.6,
                    display: 'block',
                    marginTop: 1,
                  }}
                >
                  Management System
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-sidebar-text)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
                padding: 4,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'var(--color-sidebar-item-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'transparent';
              }}
            >
              <X style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
            </button>
          </div>

          <div
            className="flex items-center"
            style={{
              gap: 'var(--space-2.5)',
              marginTop: 'var(--space-3)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--color-sidebar-border)',
            }}
          >
            <span
              className={`capitalize badge-${userRole}`}
              style={{
                padding: '2px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              {userRole}
            </span>
            <span
              className="flex items-center"
              style={{
                gap: 6,
                padding: '2px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                background: 'var(--color-success-light)',
                color: 'var(--color-success-text)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-success)',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }}
              />
              Online
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto"
          style={{
            padding: 'var(--space-3) var(--space-3)',
            scrollbarWidth: 'thin',
          }}
        >
          {sections.map((section, si) => (
            <div key={si} style={{ marginTop: si > 0 ? 'var(--space-4)' : 0 }}>
              {section.title && (
                <p
                  style={{
                    padding: '0 var(--space-3)',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-sidebar-text)',
                    opacity: 0.5,
                    letterSpacing: 'var(--tracking-wide)',
                    textTransform: 'uppercase',
                  }}
                >
                  {section.title}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => window.innerWidth < 1024 && onClose()}
                      className="group flex items-center"
                      style={{
                        gap: 'var(--space-2.5)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        borderRadius: 'var(--radius-md)',
                        padding: '9px var(--space-3)',
                        background: active
                          ? 'var(--color-sidebar-item-active)'
                          : 'transparent',
                        color: active
                          ? 'var(--color-sidebar-text-active)'
                          : 'var(--color-sidebar-text)',
                        textDecoration: 'none',
                        transition: 'all var(--transition-fast)',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'var(--color-sidebar-item-hover)';
                          el.style.color = 'var(--color-sidebar-text-active)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'transparent';
                          el.style.color = 'var(--color-sidebar-text)';
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          flexShrink: 0,
                          opacity: active ? 1 : 0.6,
                          transition: 'opacity var(--transition-fast)',
                        }}
                      >
                        <Icon
                          style={{
                            width: 'var(--icon-md)',
                            height: 'var(--icon-md)',
                          }}
                        />
                      </div>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {active && (
                        <div
                          style={{
                            width: 3,
                            height: 20,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-accent)',
                            flexShrink: 0,
                            marginLeft: 'var(--space-1)',
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="flex-shrink-0"
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--color-sidebar-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-sidebar-text)',
                opacity: 0.4,
              }}
            >
              v1.0.0
            </span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-sidebar-text)',
                opacity: 0.3,
              }}
            >
              © 2026
            </span>
          </div>
        </div>
      </aside>

      {/* Pulse animation for online status dot */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
};
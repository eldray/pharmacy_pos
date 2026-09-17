// src/components/Sidebar.tsx
import React from 'react';
import {
  X, LayoutDashboard, ShoppingCart, Package, Truck,
  FileText, BarChart3, Settings, Receipt, Warehouse,
  Store, FlaskConical, UserCog, ShieldAlert, TrendingUp,
  CreditCard, ClipboardList, Users,
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

// Roles: 'admin' | 'manager' | 'pharmacist_sales' | 'cashier' | 'lab_tech'
const menuItems: MenuItem[] = [
  // ─── MAIN ────────────────────────────────────────────────────────
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'manager', 'cashier', 'pharmacist_sales', 'lab_tech'] },
  { icon: ShoppingCart, label: 'Point of Sale', path: '/dashboard/pos', roles: ['admin', 'manager', 'cashier', 'pharmacist_sales'] },
  { icon: ClipboardList, label: 'Orders', path: '/dashboard/orders', roles: ['admin', 'manager', 'cashier', 'pharmacist_sales'] },
  { icon: CreditCard, label: 'Payment & Collections', path: '/dashboard/payment', roles: ['admin', 'manager', 'cashier'] },
  { icon: Receipt, label: 'Sales History', path: '/dashboard/sales', roles: ['admin', 'manager', 'cashier', 'pharmacist_sales'] },
  { icon: Users, label: 'Customers', path: '/dashboard/customers', roles: ['admin', 'manager', 'cashier', 'pharmacist_sales', 'lab_tech'] },

  // ─── CATALOG ─────────────────────────────────────────────────────
  { icon: Package, label: 'Products', path: '/dashboard/products', roles: ['admin', 'manager', 'pharmacist_sales'] },
  { icon: Warehouse, label: 'Inventory', path: '/dashboard/inventory', roles: ['admin', 'manager', 'pharmacist_sales'] },
  { icon: Store, label: 'Branches & Warehouse', path: '/dashboard/branches', roles: ['admin', 'manager'] },
  { icon: Truck, label: 'Suppliers', path: '/dashboard/suppliers', roles: ['admin', 'manager', 'pharmacist_sales'] },
  { icon: FileText, label: 'Purchase Orders', path: '/dashboard/purchase-orders', roles: ['admin', 'manager', 'pharmacist_sales'] },

  // ─── LABORATORY ──────────────────────────────────────────────────
  { icon: FlaskConical, label: 'Laboratory', path: '/dashboard/lab', roles: ['admin', 'manager', 'pharmacist_sales', 'lab_tech'] },
  { icon: FileText, label: 'Lab Reports', path: '/dashboard/lab-reports', roles: ['admin', 'manager', 'lab_tech'] },

  // ─── OPERATIONS ──────────────────────────────────────────────────
  { icon: ShieldAlert, label: 'Insurance & Co-Pay', path: '/dashboard/insurance', roles: ['admin', 'manager', 'pharmacist_sales'] },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', roles: ['admin', 'manager', 'pharmacist_sales'] },
  { icon: TrendingUp, label: 'Profit Report', path: '/dashboard/profit-report', roles: ['admin', 'manager'] },
  { icon: ShieldAlert, label: 'Controlled Report', path: '/dashboard/controlled-report', roles: ['admin', 'manager', 'pharmacist_sales'] },

  // ─── SYSTEM ──────────────────────────────────────────────────────
  { icon: UserCog, label: 'HR Staff Management', path: '/dashboard/staff', roles: ['admin', 'manager'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['admin'] },
];

const SECTION_GROUPS: { title?: string; paths: string[] }[] = [
  {
    paths: [
      '/dashboard',
      '/dashboard/pos',
      '/dashboard/orders',
      '/dashboard/payment',
      '/dashboard/sales',
      '/dashboard/customers',
    ],
  },
  {
    title: 'Catalog',
    paths: [
      '/dashboard/products',
      '/dashboard/inventory',
      '/dashboard/branches',
      '/dashboard/suppliers',
      '/dashboard/purchase-orders',
    ],
  },
  {
    title: 'Laboratory',
    paths: ['/dashboard/lab', '/dashboard/lab-reports'],
  },
  {
    title: 'Operations',
    paths: [
      '/dashboard/insurance',
      '/dashboard/analytics',
      '/dashboard/profit-report',
      '/dashboard/controlled-report',
    ],
  },
  {
    title: 'System',
    paths: ['/dashboard/staff', '/dashboard/settings'],
  },
];

// Human-friendly role labels
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  pharmacist_sales: 'Pharmacist',
  cashier: 'Cashier',
  lab_tech: 'Lab Technician',
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userRole }) => {
  const location = useLocation();
  const filtered = menuItems.filter((item) => item.roles.includes(userRole));

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  const sections = SECTION_GROUPS
    .map((group) => ({
      title: group.title,
      items: filtered.filter((i) => group.paths.includes(i.path)),
    }))
    .filter((s) => s.items.length > 0);

  const roleLabel = ROLE_LABELS[userRole] || userRole;

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
        {/* ═══════════════ HEADER ═══════════════ */}
        <div
          className="flex-shrink-0"
          style={{
            padding: '20px 20px 16px 20px',
            borderBottom: '1px solid var(--color-sidebar-border)',
          }}
        >
          {/* Brand row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: 12 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--color-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <Store style={{ width: 20, height: 20, color: '#fff' }} />
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <span
                  style={{
                    fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
                    color: 'var(--color-sidebar-text-active)',
                    display: 'block',
                  }}
                >
                  PharmacyPOS
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: 'var(--color-sidebar-text)',
                    opacity: 0.55,
                    display: 'block',
                    marginTop: 2,
                    letterSpacing: '0.02em',
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
                width: 32, height: 32, borderRadius: 8,
                color: 'var(--color-sidebar-text)',
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-sidebar-item-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* ═══ Role + status row ═══ */}
          <div
            className="flex items-center"
            style={{
              gap: 8,
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--color-sidebar-border)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.01em',
                background: 'var(--color-sidebar-item-active)',
                color: 'var(--color-sidebar-text-active)',
                border: '1px solid var(--color-sidebar-border)',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {roleLabel}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background: 'var(--color-success-light)',
                color: 'var(--color-success-text)',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: 'var(--color-success)',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                  flexShrink: 0,
                }}
              />
              Online
            </span>
          </div>
        </div>

        {/* ═══════════════ NAVIGATION ═══════════════ */}
        <nav
          className="flex-1 overflow-y-auto"
          style={{
            padding: '16px 12px 20px 12px',
            scrollbarWidth: 'thin',
          }}
        >
          {sections.map((section, si) => (
            <div
              key={si}
              style={{ marginTop: si > 0 ? 20 : 0 }}
            >
              {section.title && (
                <p
                  style={{
                    padding: '0 12px',
                    marginBottom: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--color-sidebar-text)',
                    opacity: 0.45,
                    letterSpacing: '0.08em',
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
                        gap: 12,
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: active ? 'var(--color-sidebar-item-active)' : 'transparent',
                        color: active ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                        textDecoration: 'none',
                        transition: 'background 120ms ease, color 120ms ease',
                        position: 'relative',
                        lineHeight: 1.2,
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
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                          opacity: active ? 1 : 0.65,
                          transition: 'opacity 120ms ease',
                        }}
                      >
                        <Icon style={{ width: 16, height: 16 }} />
                      </div>
                      <span style={{ flex: 1, letterSpacing: '0.005em' }}>{item.label}</span>
                      {active && (
                        <div
                          style={{
                            width: 3,
                            height: 16,
                            borderRadius: 999,
                            background: 'var(--color-accent)',
                            flexShrink: 0,
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

        {/* ═══════════════ FOOTER ═══════════════ */}
        <div
          className="flex-shrink-0"
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-sidebar-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--color-sidebar-text)', opacity: 0.4, letterSpacing: '0.01em' }}>
              v1.0.0
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-sidebar-text)', opacity: 0.3, letterSpacing: '0.01em' }}>
              © 2026
            </span>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
};
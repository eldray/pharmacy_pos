// src/components/Navbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, User, LogOut, Store, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';

interface NavbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
  user: { name: string; role: string; email?: string };
  companyName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  onLogout,
  user,
  companyName = 'PharmacyPOS',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const closeAll = () => {
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  return (
    <header
      className="fixed top-0 right-0 left-0 theme-transition navbar-shell"
      style={{
        height: 'var(--navbar-height)',
        zIndex: 'var(--z-sticky)',
        background: 'var(--color-navbar-bg)',
        borderBottom: '1px solid var(--color-navbar-border)',
      }}
    >
      <div className="flex items-center justify-between h-full" style={{ padding: '0 20px' }}>

        {/* Left */}
        <div className="flex items-center" style={{ gap: '12px' }}>
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: 4,
            }}
            onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              'var(--color-bg-subtle)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'transparent')
            }
          >
            <Menu style={{ width: 18, height: 18 }} />
          </button>

          <div className="hidden sm:flex items-center" style={{ gap: '10px' }}>
            <Store
              style={{ width: 18, height: 18, color: 'var(--color-accent)', flexShrink: 0 }}
            />
            <div>
              <h1
                style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1, color: 'var(--color-text-primary)' }}
              >
                {companyName}
              </h1>
              <p
                style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}
              >
                Pharmacy Management
              </p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center" style={{ gap: '10px' }}>

          {/* Theme toggle */}
          <div className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
            <ThemeToggle />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                padding: 4,
              }}
              onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                'var(--color-bg-subtle)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
            >
              <Bell style={{ width: 16, height: 16 }} />
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '9999px',
                  fontSize: '8px',
                  fontWeight: 700,
                  background: 'var(--color-danger)',
                  color: '#fff',
                  border: '2px solid var(--color-navbar-bg)',
                }}
              >
                3
              </span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div
                className="absolute top-full right-0 overflow-hidden"
                style={{
                  marginTop: '8px',
                  width: 340,
                  borderRadius: '12px',
                  zIndex: 30,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-xl)',
                  transformOrigin: 'top right',
                  animation: 'dropdownFadeIn 0.15s ease',
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}
                >
                  <span
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}
                  >
                    Notifications
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      background: 'var(--color-accent-light)',
                      color: 'var(--color-accent-text)',
                    }}
                  >
                    3 new
                  </span>
                </div>

                <div className="max-h-[280px] overflow-y-auto" style={{ padding: '4px 0' }}>
                  {[
                    {
                      dot: 'var(--color-warning)',
                      title: 'Low Stock Alert',
                      desc: '5 products are running low',
                      time: '2 min ago',
                    },
                    {
                      dot: 'var(--color-info)',
                      title: 'New Order Received',
                      desc: 'Marshall Blakeley · GHS 245.00',
                      time: '5 min ago',
                    },
                    {
                      dot: 'var(--color-success)',
                      title: 'Transaction Completed',
                      desc: 'POS Sale #2204 · GHS 89.50',
                      time: '12 min ago',
                    },
                  ].map((n, i) => (
                    <div
                      key={i}
                      className="flex transition-colors duration-100 cursor-pointer"
                      style={{
                        gap: '12px',
                        padding: '12px 18px',
                        borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                      }}
                      onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        'var(--color-bg-subtle)')
                      }
                      onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        'transparent')
                      }
                    >
                      <span
                        className="flex-shrink-0"
                        style={{ width: 8, height: 8, borderRadius: '9999px', marginTop: 5, background: n.dot }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate"
                          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}
                        >
                          {n.title}
                        </p>
                        <p
                          className="truncate"
                          style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
                        >
                          {n.desc}
                        </p>
                        <span
                          style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}
                        >
                          {n.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{ padding: '12px 18px', borderTop: '1px solid var(--color-border)' }}
                >
                  <button
                    className="w-full transition-colors duration-100 cursor-pointer"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '10px 0',
                      borderRadius: '6px',
                      background: 'var(--color-bg-subtle)',
                      color: 'var(--color-accent-text)',
                      border: 'none',
                    }}
                    onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'var(--color-accent-light)')
                    }
                    onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'var(--color-bg-subtle)')
                    }
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="hidden sm:block"
            style={{ width: 1, height: 28, background: 'var(--color-border)', margin: '0 4px' }}
          />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center transition-colors duration-100 cursor-pointer"
              style={{
                gap: '8px',
                padding: '6px 10px 6px 6px',
                borderRadius: '6px',
                background: showUserMenu
                  ? 'var(--color-bg-subtle)'
                  : 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
              }}
              onMouseEnter={(e) => {
                if (!showUserMenu)
                  (e.currentTarget as HTMLElement).style.background =
                    'var(--color-bg-subtle)';
              }}
              onMouseLeave={(e) => {
                if (!showUserMenu)
                  (e.currentTarget as HTMLElement).style.background =
                    'transparent';
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '6px',
                  background: 'var(--color-accent-light)',
                  color: 'var(--color-accent-text)',
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '0.3px',
                }}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p
                  style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1, color: 'var(--color-text-primary)' }}
                >
                  {user.name}
                </p>
                <p
                  className="capitalize"
                  style={{ fontSize: '10px', marginTop: 2, color: 'var(--color-text-muted)' }}
                >
                  {user.role}
                </p>
              </div>
              <ChevronDown
                className="hidden sm:block"
                style={{
                  width: 14,
                  height: 14,
                  color: 'var(--color-text-muted)',
                  transform: showUserMenu
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {/* ─── USER MENU DROPDOWN - FIXED WITH HARD-CODED VALUES ────────── */}
            {showUserMenu && (
              <div
                className="absolute top-full right-0 overflow-hidden"
                style={{
                  marginTop: '8px',
                  width: '280px',
                  borderRadius: '12px',
                  zIndex: 30,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                  transformOrigin: 'top right',
                  animation: 'dropdownFadeIn 0.15s ease',
                }}
              >
                {/* User info section - INCREASED PADDING */}
                <div
                  style={{
                    padding: '20px 24px 16px 24px',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <p
                    className="truncate"
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="truncate"
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {user.email || user.role}
                  </p>
                </div>

                {/* Menu items - INCREASED PADDING */}
                <div style={{ padding: '8px 0' }}>
                  {[
                    { to: '/dashboard/profile', icon: User, label: 'Profile Settings' },
                    { to: '#', icon: Store, label: 'Preferences' },
                    { to: '#', icon: Bell, label: 'Help & Support' },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={closeAll}
                      className="flex items-center transition-colors duration-100"
                      style={{
                        gap: '14px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'var(--color-bg-subtle)';
                        el.style.color = 'var(--color-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'transparent';
                        el.style.color = 'var(--color-text-secondary)';
                      }}
                    >
                      <Icon style={{ width: 18, height: 18 }} />
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Sign out - INCREASED PADDING */}
                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => {
                      closeAll();
                      onLogout();
                    }}
                    className="w-full flex items-center transition-colors duration-100 cursor-pointer"
                    style={{
                      gap: '14px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      color: 'var(--color-danger)',
                      background: 'transparent',
                      border: 'none',
                    }}
                    onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'var(--color-danger-light)')
                    }
                    onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'transparent')
                    }
                  >
                    <LogOut style={{ width: 18, height: 18 }} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown animation keyframes */}
      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (min-width: 1024px) {
          .navbar-shell {
            left: var(--sidebar-width);
          }
        }
      `}</style>
    </header>
  );
};
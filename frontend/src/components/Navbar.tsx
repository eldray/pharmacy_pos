// src/components/Navbar.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Bell, User, LogOut, Store, ChevronDown, Package, HelpCircle, Settings, Calendar, X, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';
import { useAppStore } from '../store';

interface NavbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
  user: { name: string; role: string; email?: string };
  companyName?: string;
}

// ─── Notification helpers ──────────────────────────────────────────────────
interface Notification {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry' | 'expired';
  title: string;
  desc: string;
  dot: string;
}

const DISMISSED_KEY = 'pharmacy_dismissed_notifications';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  onLogout,
  user,
  companyName = 'PharmacyPOS',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { products } = useAppStore();

  // ─── Build alert list from live product data ───────────────────────────
  const allNotifications = useMemo((): Notification[] => {
    const now = new Date();
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const notes: Notification[] = [];

    products.forEach((p) => {
      if (p.quantity === 0) {
        notes.push({
          id: `out_${p.id}`,
          type: 'out_of_stock',
          title: 'Out of Stock',
          desc: `${p.name} — no units remaining`,
          dot: 'var(--color-danger)',
        });
      } else if (p.quantity < 20) {
        notes.push({
          id: `low_${p.id}`,
          type: 'low_stock',
          title: 'Low Stock',
          desc: `${p.name} — ${p.quantity} unit${p.quantity !== 1 ? 's' : ''} left`,
          dot: 'var(--color-warning)',
        });
      }

      if (p.expiryDate) {
        const expiry = new Date(p.expiryDate);
        if (expiry < now) {
          const days = Math.abs(Math.ceil((expiry.getTime() - now.getTime()) / 86400000));
          notes.push({
            id: `exp_${p.id}`,
            type: 'expired',
            title: 'Expired',
            desc: `${p.name} — expired ${days} day${days !== 1 ? 's' : ''} ago`,
            dot: 'var(--color-danger)',
          });
        } else if (expiry <= in30days) {
          const days = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
          notes.push({
            id: `exp_${p.id}`,
            type: 'expiry',
            title: 'Expiring Soon',
            desc: `${p.name} — expires in ${days} day${days !== 1 ? 's' : ''}`,
            dot: 'var(--color-warning)',
          });
        }
      }
    });

    return notes;
  }, [products]);

  const unread = allNotifications.filter((n) => !dismissed.has(n.id));
  const unreadCount = unread.length;

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const markAllRead = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      allNotifications.forEach((n) => next.add(n.id));
      saveDismissed(next);
      return next;
    });
  };

  const restoreAll = () => {
    setDismissed(new Set());
    saveDismissed(new Set());
  };

  // ─── Close on outside click ────────────────────────────────────────────
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

  const notifIcon = (type: Notification['type']) =>
    type === 'expiry' || type === 'expired'
      ? <Calendar style={{ width: 12, height: 12 }} />
      : <Package style={{ width: 12, height: 12 }} />;

  // Helper function for mouse enter/leave handlers
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = 'transparent';
  };

  const handleMouseEnterColor = (color: string) => (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = color;
  };

  const handleMouseLeaveColor = (color: string) => (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = color;
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
              width: 36, height: 36, borderRadius: '6px', background: 'transparent',
              border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Menu style={{ width: 18, height: 18 }} />
          </button>

          <div className="hidden sm:flex items-center" style={{ gap: '10px' }}>
            <Store style={{ width: 18, height: 18, color: 'var(--color-accent)', flexShrink: 0 }} />
            <div>
              <h1 style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1, color: 'var(--color-text-primary)' }}>
                {companyName}
              </h1>
              <p style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}>
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

          {/* ─── Notifications Bell ──────────────────────────────────── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
              className="relative flex items-center justify-center"
              title="Notifications"
              style={{
                width: 36, height: 36, borderRadius: '6px', background: 'transparent',
                border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4,
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Bell style={{ width: 16, height: 16 }} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
                  style={{
                    minWidth: 18, height: 18, borderRadius: '9999px',
                    fontSize: '8px', fontWeight: 700, padding: '0 3px',
                    background: 'var(--color-danger)', color: '#fff',
                    border: '2px solid var(--color-navbar-bg)',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* ─── Dropdown ───────────────────────────────────────────── */}
            {showNotifications && (
              <div
                className="absolute top-full right-0"
                style={{
                  marginTop: 8, width: 360, borderRadius: 12, zIndex: 30,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-xl)',
                  transformOrigin: 'top right',
                  animation: 'dropdownFadeIn 0.15s ease',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between"
                  style={{ padding: '13px 16px', borderBottom: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span style={{
                        fontSize: '10px', padding: '1px 7px', borderRadius: 99,
                        fontWeight: 600, background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                      }}>
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                        color: 'var(--color-accent-text)', background: 'none', border: 'none',
                      }}
                    >
                      <CheckCheck style={{ width: 12, height: 12 }} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {unread.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                      <Bell style={{ width: 26, height: 26, margin: '0 auto 8px', opacity: 0.2, display: 'block' }} />
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        All caught up — no new alerts.
                      </p>
                    </div>
                  ) : (
                    unread.map((n, i) => (
                      <div
                        key={n.id}
                        className="flex items-start transition-colors duration-100"
                        style={{
                          gap: 10, padding: '10px 16px',
                          borderBottom: i < unread.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        {/* Colour dot */}
                        <span style={{
                          width: 7, height: 7, borderRadius: 99, marginTop: 5,
                          flexShrink: 0, background: n.dot,
                        }} />

                        {/* Icon + text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center" style={{ gap: 5, marginBottom: 1 }}>
                            <span style={{ color: n.dot, display: 'flex' }}>
                              {notifIcon(n.type)}
                            </span>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {n.title}
                            </p>
                          </div>
                          <p className="truncate" style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {n.desc}
                          </p>
                        </div>

                        {/* Dismiss × */}
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                          title="Dismiss"
                          style={{
                            flexShrink: 0, background: 'none', border: 'none',
                            cursor: 'pointer', color: 'var(--color-text-muted)',
                            padding: 2, borderRadius: 4,
                            display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer — restore link when all dismissed */}
                {allNotifications.length > 0 && unread.length === 0 && (
                  <div style={{
                    padding: '9px 16px', borderTop: '1px solid var(--color-border)',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {allNotifications.length} alert{allNotifications.length !== 1 ? 's' : ''} dismissed —{' '}
                      <button
                        onClick={restoreAll}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--color-accent-text)', fontSize: '11px', fontWeight: 600,
                        }}
                      >
                        restore all
                      </button>
                    </p>
                  </div>
                )}

                {allNotifications.length === 0 && (
                  <div style={{ padding: '9px 16px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      No stock or expiry issues detected.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="hidden sm:block"
            style={{ width: 1, height: 28, background: 'var(--color-border)', margin: '0 4px' }}
          />

          {/* ─── User menu ───────────────────────────────────────────── */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="flex items-center transition-colors duration-100 cursor-pointer"
              style={{
                gap: '8px', padding: '6px 10px 6px 6px', borderRadius: '6px',
                background: showUserMenu ? 'var(--color-bg-subtle)' : 'transparent',
                border: 'none', color: 'var(--color-text-primary)',
              }}
              onMouseEnter={(e) => {
                if (!showUserMenu) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showUserMenu) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 34, height: 34, borderRadius: '6px',
                  background: 'var(--color-accent-light)', color: 'var(--color-accent-text)',
                  fontWeight: 700, fontSize: '12px', letterSpacing: '0.3px',
                }}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1, color: 'var(--color-text-primary)' }}>
                  {user.name}
                </p>
                <p className="capitalize" style={{ fontSize: '10px', marginTop: 2, color: 'var(--color-text-muted)' }}>
                  {user.role}
                </p>
              </div>
              <ChevronDown
                className="hidden sm:block"
                style={{
                  width: 14, height: 14, color: 'var(--color-text-muted)',
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {showUserMenu && (
              <div
                className="absolute top-full right-0 overflow-hidden"
                style={{
                  marginTop: '8px', width: '280px', borderRadius: '12px', zIndex: 30,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                  transformOrigin: 'top right',
                  animation: 'dropdownFadeIn 0.15s ease',
                }}
              >
                <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid var(--color-border)' }}>
                  <p className="truncate" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    {user.name}
                  </p>
                  <p className="truncate" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {user.email || user.role}
                  </p>
                </div>

                <div style={{ padding: '8px 0' }}>
                  {[
                    { to: '/dashboard/profile', icon: User, label: 'Profile Settings' },
                    { to: '/dashboard/preferences', icon: Settings, label: 'Preferences' },
                    { to: '/dashboard/help', icon: HelpCircle, label: 'Help & Support' },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={closeAll}
                      className="flex items-center transition-colors duration-100"
                      style={{
                        gap: '14px', padding: '12px 24px', fontSize: '14px',
                        color: 'var(--color-text-secondary)', textDecoration: 'none',
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

                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => { closeAll(); onLogout(); }}
                    className="w-full flex items-center transition-colors duration-100 cursor-pointer"
                    style={{
                      gap: '14px', padding: '12px 24px', fontSize: '14px',
                      color: 'var(--color-danger)', background: 'transparent', border: 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (min-width: 1024px) {
          .navbar-shell { left: var(--sidebar-width); }
        }
      `}</style>
    </header>
  );
};
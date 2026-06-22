// src/components/Login.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore, initStore } from '../store';
import { getDemoUsers } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, Store,
  Shield, TrendingUp, ShoppingCart,
  FlaskConical, CheckCircle, Zap, AlertCircle
} from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);

  const { loginUser, currentUser } = useAppStore();
  const navigate = useNavigate();
  const demoUsers = getDemoUsers();

  useEffect(() => {
    if (currentUser) navigate('/dashboard');
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const result = await loginUser(email, password);
    if (result) {
      await initStore(result.user.role);
      navigate('/dashboard');
    } else {
      setError('Invalid email or password');
    }
    setIsLoading(false);
  };

  const quickLogin = async (demoEmail: string, demoPassword: string, role: string) => {
    setError('');
    setQuickLoginLoading(role);
    setEmail(demoEmail);
    setPassword(demoPassword);
    await new Promise((r) => setTimeout(r, 300));
    const result = await loginUser(demoEmail, demoPassword);
    if (result) {
      await initStore(result.user.role);
      navigate('/dashboard');
    } else {
      setError('Quick login failed');
    }
    setQuickLoginLoading(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield style={{ width: 14, height: 14 }} />;
      case 'officer': return <TrendingUp style={{ width: 14, height: 14 }} />;
      case 'cashier': return <ShoppingCart style={{ width: 14, height: 14 }} />;
      case 'lab': return <FlaskConical style={{ width: 14, height: 14 }} />;
      default: return <User style={{ width: 14, height: 14 }} />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full system access';
      case 'officer': return 'Inventory & operations';
      case 'cashier': return 'Point of sale';
      case 'lab': return 'Laboratory management';
      default: return '';
    }
  };

  const features = [
    'Inventory Management',
    'Multi-role Access',
    'Sales & Analytics',
    'Lab Test Management',
    'Prescription Tracking',
    'Supplier Management',
  ];

  /* Input styles with hard-coded values */
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: 'var(--color-text-inverse)',
    outline: 'none',
    fontSize: '14px',
    padding: '10px 14px 10px 38px',
    width: '100%',
    height: '42px',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  };

  const buttonStyle: React.CSSProperties = {
    background: 'var(--gradient-accent)',
    color: 'var(--color-accent-fg)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 150ms ease, transform 150ms ease',
    height: '42px',
  };

  return (
    <div
      className="min-h-screen flex flex-col theme-transition"
      style={{ background: 'var(--gradient-brand)' }}
    >
      {/* Theme toggle */}
      <div className="absolute" style={{ top: '16px', right: '16px', zIndex: 30 }}>
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center relative" style={{ padding: '16px', zIndex: 1 }}>
        <div className="w-full flex flex-col lg:flex-row items-center" style={{ maxWidth: 960, gap: '32px' }}>

          {/* ── LEFT: Brand ─────────────────────────────────────────── */}
          <div
            className="lg:w-[45%] text-center lg:text-left"
            style={{ color: 'var(--color-text-inverse)' }}
          >
            <div className="flex items-center justify-center lg:justify-start" style={{ gap: '12px', marginBottom: '24px' }}>
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  background: 'var(--gradient-accent)',
                  boxShadow: '0 4px 14px rgba(14, 116, 144, 0.35)',
                }}
              >
                <Store style={{ width: 22, height: 22, color: 'var(--color-accent-fg)' }} />
              </div>
              <div>
                <h1
                  style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--color-text-inverse)' }}
                >
                  PharmacyPOS
                </h1>
                <p
                  style={{ fontSize: '13px', marginTop: 2, color: 'rgba(255,255,255,0.60)' }}
                >
                  Pharmacy Management System
                </p>
              </div>
            </div>

            <p
              className="mx-auto lg:mx-0"
              style={{ fontSize: '14px', marginBottom: '24px', lineHeight: '1.5', maxWidth: 360, color: 'rgba(255,255,255,0.55)' }}
            >
              Inventory, sales, lab tests, and customer care for modern pharmacies.
            </p>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {features.map((f) => (
                <li key={f} className="flex items-center justify-center lg:justify-start" style={{ gap: '10px' }}>
                  <CheckCircle
                    style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--color-success)', opacity: 0.85 }}
                  />
                  <span
                    style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── RIGHT: Login card ─────────────────────────────────────── */}
          <div className="lg:w-[55%] w-full" style={{ maxWidth: 400 }}>
            <div
              style={{
                borderRadius: '16px',
                padding: '24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
              }}
            >
              <div className="text-center" style={{ marginBottom: '20px' }}>
                <h2
                  style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-inverse)' }}
                >
                  Welcome Back
                </h2>
                <p
                  style={{ fontSize: '14px', marginTop: 2, color: 'rgba(255,255,255,0.50)' }}
                >
                  Sign in to your account
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-center"
                  style={{
                    gap: '8px',
                    marginBottom: '16px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: 'var(--color-danger-light)',
                    color: 'var(--color-danger-text)',
                    border: '1px solid var(--color-danger)',
                  }}
                >
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label
                    className="block"
                    style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'rgba(255,255,255,0.70)' }}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <User
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: 12, width: 16, height: 16, color: 'rgba(255,255,255,0.30)' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-accent)';
                        e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block"
                    style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'rgba(255,255,255,0.70)' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: 12, width: 16, height: 16, color: 'rgba(255,255,255,0.30)' }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-accent)';
                        e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{
                        right: 10,
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.40)',
                        padding: 4,
                      }}
                    >
                      {showPassword ? (
                        <EyeOff style={{ width: 16, height: 16 }} />
                      ) : (
                        <Eye style={{ width: 16, height: 16 }} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || quickLoginLoading !== null}
                  style={{
                    ...buttonStyle,
                    opacity: (isLoading || quickLoginLoading !== null) ? 0.6 : 1,
                    cursor: (isLoading || quickLoginLoading !== null) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <div
                        className="rounded-full animate-spin"
                        style={{
                          width: 16,
                          height: 16,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                        }}
                      />
                      Signing in…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Quick access */}
              <div
                style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-center" style={{ gap: '6px', marginBottom: '12px' }}>
                  <Zap
                    style={{ width: 14, height: 14, color: '#FBBF24', opacity: 0.85 }}
                  />
                  <span
                    style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}
                  >
                    Quick Demo Access
                  </span>
                </div>

                <div className="grid grid-cols-2" style={{ gap: '8px' }}>
                  {demoUsers.map((u) => {
                    const isThisLoading = quickLoginLoading === u.role;
                    const anyLoading = quickLoginLoading !== null || isLoading;
                    return (
                      <button
                        key={u.email}
                        onClick={() => quickLogin(u.email, u.password, u.role)}
                        disabled={anyLoading}
                        className="flex items-center text-left transition-all duration-100 cursor-pointer"
                        style={{
                          gap: '10px',
                          padding: '10px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          opacity: anyLoading && !isThisLoading ? 0.4 : 1,
                          cursor: anyLoading ? 'not-allowed' : 'pointer',
                          minHeight: '52px',
                        }}
                        onMouseEnter={(e) => {
                          if (anyLoading) return;
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.16)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            background: 'var(--gradient-accent)',
                            color: 'var(--color-accent-fg)',
                          }}
                        >
                          {isThisLoading ? (
                            <div
                              className="rounded-full animate-spin"
                              style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                            />
                          ) : (
                            getRoleIcon(u.role)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="capitalize truncate"
                            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-inverse)' }}
                          >
                            {u.role}
                          </p>
                          <p
                            className="truncate"
                            style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)' }}
                          >
                            {getRoleDescription(u.role)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="text-center"
                  style={{
                    marginTop: '10px',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.15)',
                    color: 'rgba(253,230,138,0.8)',
                  }}
                >
                  Click any role to auto-login
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="text-center"
        style={{ padding: '12px 0', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}
      >
        PharmacyPOS v1.0 · Professional Healthcare Management
      </footer>
    </div>
  );
};
// src/components/Login.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore, initStore } from '../store';
import { getDemoUsers } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, Store,
  Shield, TrendingUp, ShoppingCart,
  FlaskConical, CheckCircle, Zap
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
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'officer': return <TrendingUp className="h-4 w-4" />;
      case 'cashier': return <ShoppingCart className="h-4 w-4" />;
      case 'lab': return <FlaskConical className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'badge-admin';
      case 'officer': return 'badge-officer';
      case 'cashier': return 'badge-cashier';
      case 'lab': return 'badge-lab';
      default: return '';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full system access & control';
      case 'officer': return 'Inventory & operations';
      case 'cashier': return 'Point of sale & service';
      case 'lab': return 'Laboratory management';
      default: return '';
    }
  };

  const features = [
    'Real-time Inventory Management',
    'Multi-role Access Control',
    'Sales Analytics & Reports',
    'Laboratory Test Management',
    'Customer Relationship Management',
    'Prescription Tracking',
    'Supplier Management',
  ];

  return (
    <div
      className="min-h-screen flex flex-col theme-transition"
      style={{ background: 'var(--gradient-brand)' }}
    >
      {/* Ambient orbs — subtle, not distracting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--color-accent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: 'var(--color-accent)' }}
        />
      </div>

      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 lg:gap-16 items-center">

          {/* ── LEFT: Brand + features ───────────────────────────────────── */}
          <div className="lg:w-1/2 text-center lg:text-left" style={{ color: 'var(--color-text-inverse)' }}>
            {/* Logo mark */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
              <div
                className="p-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <Store className="h-9 w-9" style={{ color: 'var(--color-text-inverse)' }} />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: 'var(--color-text-inverse)' }}>
                  PharmaPOS
                </h1>
                <p className="text-base mt-1" style={{ color: 'rgba(255,255,255,0.70)' }}>
                  Pharmacy Management System
                </p>
              </div>
            </div>

            <p className="text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Complete solution for inventory management, sales tracking, lab tests, and customer care in modern pharmacies.
            </p>

            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: 'var(--color-success)' }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── RIGHT: Login card ────────────────────────────────────────── */}
          <div className="lg:w-1/2 w-full max-w-md">
            <div
              className="rounded-3xl p-7 shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>
                  Welcome Back
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  Sign in to your account
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: 'var(--color-danger-light)',
                    color: 'var(--color-danger-text)',
                    border: '1px solid var(--color-danger)'
                  }}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                      style={{ color: 'rgba(255,255,255,0.40)' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'var(--color-text-inverse)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-accent)';
                        e.target.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                      style={{ color: 'rgba(255,255,255,0.40)' }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'var(--color-text-inverse)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-accent)';
                        e.target.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                      style={{ color: 'rgba(255,255,255,0.50)' }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-accent w-full py-3 text-sm font-semibold rounded-xl mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              {/* Quick access */}
              <div
                className="mt-6 pt-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Zap className="h-4 w-4" style={{ color: '#FBBF24' }} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Quick Demo Access
                  </span>
                  <Zap className="h-4 w-4" style={{ color: '#FBBF24' }} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {demoUsers.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => quickLogin(u.email, u.password, u.role)}
                      disabled={quickLoginLoading === u.role}
                      className={`
                        p-3 rounded-xl text-left transition-all duration-200
                        disabled:opacity-50
                        ${quickLoginLoading === u.role ? 'animate-pulse' : ''}
                      `}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.20)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)';
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1.5 rounded-lg text-white ${getRoleBadgeClass(u.role)}`}
                          style={{ background: 'var(--gradient-accent)' }}
                        >
                          {getRoleIcon(u.role)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold capitalize truncate" style={{ color: 'var(--color-text-inverse)' }}>
                            {u.role}
                            {quickLoginLoading === u.role && (
                              <span className="ml-1 inline-block w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin align-middle" />
                            )}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>
                            {u.email.split('@')[0]}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Role descriptions */}
                <div className="mt-3 grid grid-cols-2 gap-1">
                  {demoUsers.map((u) => (
                    <div
                      key={`desc-${u.email}`}
                      className={`px-2 py-1 rounded-lg text-xs text-center ${getRoleBadgeClass(u.role)}`}
                    >
                      {getRoleDescription(u.role)}
                    </div>
                  ))}
                </div>

                <div
                  className="mt-3 p-2 rounded-lg text-xs text-center"
                  style={{
                    background: 'rgba(251,191,36,0.10)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    color: '#FDE68A'
                  }}
                >
                  Click any role to auto-login instantly
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="py-3 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
        PharmacyPOS v1.0 • Professional Healthcare Management
      </footer>
    </div>
  );
};
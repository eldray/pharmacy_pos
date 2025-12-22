import React, { useState, useEffect } from 'react';
import { useAppStore, initStore } from '../store';
import { getDemoUsers } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Store,
  Shield,
  TrendingUp,
  Package,
  CheckCircle,
  Zap,
} from 'lucide-react';

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

  /* ──────────────────────  Auto-Redirect if logged in  ────────────────────── */
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  /* ──────────────────────  LOGIN HANDLERS  ────────────────────── */
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

  /* ──────────────────────  ICON / COLOR HELPERS  ────────────────────── */
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'manager': return <TrendingUp className="h-4 w-4" />;
      case 'cashier': return <User className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'from-purple-500 to-purple-600';
      case 'manager': return 'from-blue-500 to-blue-600';
      case 'cashier': return 'from-green-500 to-green-600';
      case 'inventory': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  /* ──────────────────────  RENDER  ────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Subtle background animations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000" />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 lg:p-6 relative z-10">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
          {/* ── LEFT SECTION ── */}
          <div className="lg:w-1/2 flex items-center justify-center">
            <div className="text-center lg:text-left text-white max-w-md">
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Store className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold mb-2">PharmaPOS</h1>
                  <p className="text-xl lg:text-2xl text-white/80">
                    Pharmacy Management System
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-lg text-white/70 leading-relaxed">
                  Complete solution for inventory management, sales tracking, and customer care in modern pharmacies.
                </p>
              </div>

              <div className="space-y-3 text-white/70">
                {[
                  'Real-time Inventory Management',
                  'Multi-role Access Control', 
                  'Sales Analytics & Reports',
                  'Customer Relationship Management',
                  'Prescription Tracking',
                  'Supplier Management'
                ].map((txt) => (
                  <div key={txt} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-base">{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT SECTION ── */}
          <div className="lg:w-1/2 w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome Back
                </h2>
                <p className="text-white/70 text-sm">Sign in to your account</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/90">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition backdrop-blur-sm text-sm"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/90">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition backdrop-blur-sm text-sm"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-white/50 hover:text-white/70 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Quick Demo Access */}
              <div className="mt-6 border-t border-white/20 pt-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <p className="text-sm font-medium text-white/90">Quick Demo Access</p>
                  <Zap className="h-4 w-4 text-yellow-400" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {demoUsers.map((user) => (
                    <button
                      key={user.email}
                      onClick={() => quickLogin(user.email, user.password, user.role)}
                      disabled={quickLoginLoading === user.role}
                      className={`p-2 bg-white/5 border border-white/10 rounded-lg text-left hover:bg-white/10 transition-all duration-200 backdrop-blur-sm group hover:border-white/30 disabled:opacity-50 ${
                        quickLoginLoading === user.role ? 'animate-pulse' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-md bg-gradient-to-r ${getRoleColor(
                            user.role
                          )} text-white`}
                        >
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-white text-xs truncate">
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                            {quickLoginLoading === user.role && (
                              <div className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                          </div>
                          <p className="text-xs text-white/70 truncate">{user.email.split('@')[0]}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-200 text-center">Click any role to auto-login</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-3 text-center text-white/50 text-sm">
        Pharmacy POS System v1.0 • Professional Healthcare Management
      </footer>
    </div>
  );
};


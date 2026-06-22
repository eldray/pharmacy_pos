// src/pages/LandingPage.tsx
import React, { useState } from 'react';
import {
  Package, ShoppingCart, BarChart3, Shield,
  Download, Play, Users, Truck, Smartphone,
  Calendar, FileText, Star, CheckCircle,
  ArrowRight, Zap, Heart, Pill,
} from 'lucide-react';
import { Login } from '../components/Login';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ThemeToggle } from '../components/ui/ThemeToggle';

/* ─── Data ───────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: ShoppingCart,
    title: 'Lightning-Fast POS',
    description: 'Process sales in seconds with intuitive barcode scanning and mobile payment integration.',
    variant: 'info' as const,
  },
  {
    icon: Package,
    title: 'Smart Inventory',
    description: 'AI-powered stock tracking with automatic expiry alerts and batch management.',
    variant: 'success' as const,
  },
  {
    icon: BarChart3,
    title: 'Live Analytics',
    description: 'Real-time sales dashboards, profit insights, and customer behaviour analytics.',
    variant: 'accent' as const,
  },
  {
    icon: Truck,
    title: 'Supplier Network',
    description: 'Automated purchase orders and supplier performance tracking.',
    variant: 'warning' as const,
  },
];

const variantTokens = {
  info: { iconBg: 'var(--color-info-light)', iconColor: 'var(--color-info)' },
  success: { iconBg: 'var(--color-success-light)', iconColor: 'var(--color-success)' },
  accent: { iconBg: 'var(--color-accent-light)', iconColor: 'var(--color-accent)' },
  warning: { iconBg: 'var(--color-warning-light)', iconColor: 'var(--color-warning)' },
};

const testimonials = [
  {
    name: 'Dr. Kwame Mensah',
    role: 'Pharmacy Owner, Accra',
    quote: 'Increased sales by 40% and eliminated stockouts completely. The analytics helped us optimise our inventory like never before.',
    avatar: 'KM',
    rating: 5,
  },
  {
    name: 'Sarah Addo',
    role: 'Head Pharmacist, Kumasi',
    quote: 'The expiry alert system saved us over ₵50,000 in potential losses. The interface is so intuitive our staff learned it in hours.',
    avatar: 'SA',
    rating: 5,
  },
];

const stats = [
  { number: '500+', label: 'Pharmacies' },
  { number: '99.9%', label: 'Uptime' },
  { number: '24/7', label: 'Support' },
  { number: 'Free', label: 'Updates' },
];

const demoChecklist = [
  { Icon: Shield, text: 'Military-grade security for patient data' },
  { Icon: Calendar, text: 'Automated inventory and expiry management' },
  { Icon: ShoppingCart, text: 'Process sales 3× faster than before' },
  { Icon: Heart, text: 'Designed specifically for African pharmacies' },
];

const footerCols = [
  { title: 'Product', links: ['Features', 'Pricing', 'Download'] },
  { title: 'Support', links: ['Documentation', 'Help Centre', 'Status'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers'] },
];

/* ─── LandingPage ────────────────────────────────────────────────────────── */
export const LandingPage: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  if (showDemo) return <Login />;

  return (
    <div
      className="min-h-screen theme-transition"
      style={{ background: 'var(--color-bg-base)' }}
    >

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 w-full z-50 theme-transition"
        style={{
          background: 'var(--color-navbar-bg)',
          borderBottom: '1px solid var(--color-navbar-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Pill className="h-4 w-4" style={{ color: 'var(--color-accent-fg)' }} />
              </div>
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--color-accent-text)' }}
              >
                PharmacyPOS
              </span>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Testimonials', 'Pricing', 'Support'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent-text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button size="sm" onClick={() => setShowDemo(true)}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, var(--color-accent-light) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          {/* Pill badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{
              background: 'var(--color-info-light)',
              border: '1px solid var(--color-info)',
              color: 'var(--color-info-text)',
            }}
          >
            <Zap className="h-4 w-4" />
            Trusted by 500+ pharmacies across Ghana
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Smarter
            <span
              className="block"
              style={{ color: 'var(--color-accent)' }}
            >
              Pharmacy
            </span>
            Management
          </h1>

          <p
            className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            The complete{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              Point of Sale & Inventory System
            </strong>{' '}
            built specifically for African pharmacies. Sell faster, track smarter, grow with confidence.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" onClick={() => setShowDemo(true)}>
              <Play className="h-5 w-5 mr-2" />
              Start Free Demo
            </Button>
            <Button size="lg" variant="outline">
              <Download className="h-5 w-5 mr-2" />
              Download App
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-xl mx-auto">
            {stats.map(({ number, label }) => (
              <div key={label} className="text-center">
                <div
                  className="text-2xl md:text-3xl font-bold"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {number}
                </div>
                <div
                  className="text-sm font-medium mt-0.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ background: 'var(--color-bg-surface)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Built for{' '}
              <span style={{ color: 'var(--color-accent)' }}>Modern Pharmacies</span>
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Everything you need to run your pharmacy efficiently — from inventory to insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              const tok = variantTokens[f.variant];
              const active = activeFeature === i;

              return (
                <Card
                  key={i}
                  className="p-5 cursor-pointer transition-all duration-200"
                  style={{
                    border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    boxShadow: active ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                    transform: active ? 'translateY(-3px)' : 'none',
                  }}
                  onMouseEnter={() => setActiveFeature(i)}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: tok.iconBg }}
                  >
                    <Icon className="h-5 w-5" style={{ color: tok.iconColor }} />
                  </div>
                  <h3
                    className="font-bold text-base mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {f.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Demo / Why section ────────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ background: 'var(--color-bg-base)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">

            {/* Video placeholder */}
            <div className="lg:w-1/2">
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-2xl blur-xl opacity-20"
                  style={{ background: 'var(--gradient-accent)' }}
                />
                <div
                  className="relative rounded-2xl overflow-hidden shadow-2xl"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <div
                    className="aspect-video flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)' }}
                  >
                    <div className="text-center">
                      <button
                        onClick={() => setShowDemo(true)}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-transform hover:scale-110"
                        style={{ background: 'var(--gradient-accent)' }}
                      >
                        <Play className="h-7 w-7 ml-1" style={{ color: '#fff' }} />
                      </button>
                      <p className="text-base font-semibold" style={{ color: 'var(--color-text-inverse)' }}>
                        Interactive Demo
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.60)' }}>
                        Experience PharmacyPOS in action
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy */}
            <div className="lg:w-1/2 space-y-6">
              <h3
                className="text-3xl md:text-4xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                See the Difference in{' '}
                <span style={{ color: 'var(--color-accent)' }}>3 Minutes</span>
              </h3>
              <p
                className="text-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Our live demo shows you exactly how PharmacyPOS transforms daily operations.
              </p>

              <ul className="space-y-3">
                {demoChecklist.map(({ text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <CheckCircle
                      className="h-5 w-5 flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-success)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button size="lg" onClick={() => setShowDemo(true)}>
                Launch Interactive Demo
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ background: 'var(--color-bg-surface)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Loved by{' '}
              <span style={{ color: 'var(--color-accent)' }}>Pharmacists</span>
            </h2>
            <p
              className="text-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Join hundreds of pharmacies revolutionising their operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} className="p-7">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                      style={{ background: 'var(--gradient-accent)', color: 'var(--color-accent-fg)' }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <h4
                        className="font-bold text-sm"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {t.name}
                      </h4>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {t.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4"
                        style={{ color: 'var(--color-warning)', fill: 'var(--color-warning)' }}
                      />
                    ))}
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  "{t.quote}"
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: 'var(--color-text-inverse)' }}
          >
            Ready to Transform Your Pharmacy?
          </h2>
          <p
            className="text-xl mb-10"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Join 500+ successful pharmacies using PharmacyPOS today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => setShowDemo(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{
                background: 'var(--color-bg-surface)',
                color: 'var(--color-accent-text)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <Play className="h-5 w-5" />
              Start Free Demo
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/10"
              style={{
                background: 'transparent',
                color: 'var(--color-text-inverse)',
                border: '1px solid rgba(255,255,255,0.30)',
              }}
            >
              <Download className="h-5 w-5" />
              Download for Windows
            </button>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm max-w-xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            {[
              { Icon: Smartphone, text: 'Works Offline & Online' },
              { Icon: FileText, text: 'Lifetime Free Updates' },
              { Icon: Users, text: 'Dedicated 24/7 Support' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-2 font-medium">
                <Icon className="h-5 w-5" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        className="py-14"
        style={{
          background: '#0B1120',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--gradient-accent)' }}
                >
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">PharmacyPOS</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Empowering African pharmacies with modern, reliable management solutions.
              </p>
            </div>

            {/* Links */}
            {footerCols.map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-semibold text-sm mb-4 text-white">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm transition-colors"
                        style={{ color: 'rgba(255,255,255,0.45)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="pt-8 text-center text-sm"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            © {new Date().getFullYear()} PharmacyPOS. Built with ❤️ for African pharmacies. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};
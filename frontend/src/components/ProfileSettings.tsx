// src/components/ProfileSettings.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store';
import api from '../api/api';
import {
  User, Save, CheckCircle, AlertCircle,
  ArrowLeft, Shield, Calendar, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfileSettings: React.FC = () => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [form, setForm] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (message) setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (form.password && form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      const payload: any = {};
      if (form.name !== currentUser?.name) payload.name = form.name;
      if (form.email !== currentUser?.email) payload.email = form.email;
      if (form.password) payload.password = form.password;

      if (Object.keys(payload).length === 0) {
        setMessage({ type: 'error', text: 'No changes to save' });
        setLoading(false);
        return;
      }

      const res = await api.patch('/users/profile', payload);
      setCurrentUser(res.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setForm((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.msg || 'Update failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'badge-admin';
      case 'cashier':
        return 'badge-cashier';
      case 'pharmacist':
        return 'badge-officer';
      case 'lab':
        return 'badge-lab';
      default:
        return 'badge-secondary';
    }
  };

  const initials = currentUser?.name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* ── Meta rows for the profile card ─────────────────────────────── */
  const metaItems = [
    { icon: <Calendar style={{ width: 14, height: 14 }} />, label: 'Member since', value: 'Jan 2024' },
    { icon: <Clock style={{ width: 14, height: 14 }} />, label: 'Last active', value: 'Just now' },
  ];

  /* ── Shared input style with proper padding ────────────────────── */
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: 'var(--text-base)',
    padding: '10px 14px',
    width: '100%',
    height: '42px',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
  };

  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="w-full" style={{ maxWidth: '100%', padding: 'var(--space-2)' }}>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1
            style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}
          >
            Profile Settings
          </h1>
          <p
            style={{ fontSize: 'var(--text-base)', marginTop: 4, color: 'var(--color-text-secondary)' }}
          >
            Manage your account information and security
          </p>
        </div>
        <Link
          to="/dashboard"
          className="flex items-center transition-colors duration-100"
          style={{
            gap: 'var(--space-2)',
            padding: 'var(--space-2.5) var(--space-5)',
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-subtle)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            textDecoration: 'none',
            height: '42px',
          }}
          onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            'var(--color-border)')
          }
          onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            'var(--color-bg-subtle)')
          }
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Dashboard
        </Link>
      </div>

      {/* ── Message banner ─────────────────────────────────────────── */}
      {message && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div
            className="flex items-center"
            style={{
              gap: 'var(--space-3)',
              padding: 'var(--space-3.5) var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-base)',
              fontWeight: 500,
              background:
                message.type === 'success'
                  ? 'var(--color-success-light)'
                  : 'var(--color-danger-light)',
              color:
                message.type === 'success'
                  ? 'var(--color-success-text)'
                  : 'var(--color-danger-text)',
              border: `1px solid ${message.type === 'success'
                ? 'var(--color-success)'
                : 'var(--color-danger)'
                }`,
            }}
          >
            {message.type === 'success' ? (
              <CheckCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
            ) : (
              <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                padding: 6,
                lineHeight: 1,
                fontSize: 'var(--text-lg)',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]" style={{ gap: 'var(--space-6)' }}>

        {/* ── LEFT: Identity card ─────────────────────────────────── */}
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Accent gradient strip */}
          <div
            style={{
              height: 64,
              background: 'var(--gradient-accent)',
              position: 'relative',
            }}
          >
            {/* Avatar overlapping the strip */}
            <div
              className="absolute"
              style={{
                bottom: -28,
                left: 'var(--space-6)',
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                border: '3px solid var(--color-bg-surface)',
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 'calc(var(--radius-xl) - 3px)',
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-fg)',
                  fontWeight: 700,
                  fontSize: 'var(--text-2xl)',
                  letterSpacing: '0.5px',
                }}
              >
                {initials || 'U'}
              </div>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: 'var(--space-10) var(--space-6) var(--space-6)' }}>
            <h2
              style={{ fontSize: 'var(--text-xl)', fontWeight: 700, lineHeight: 1.25, color: 'var(--color-text-primary)' }}
            >
              {currentUser?.name}
            </h2>

            <div className="flex items-center" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <span
                className={`capitalize ${getRoleBadgeClass(currentUser?.role || '')}`}
                style={{ padding: '3px 12px', fontSize: 'var(--text-sm)', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
              >
                {currentUser?.role}
              </span>
            </div>

            <p
              style={{ fontSize: 'var(--text-base)', marginTop: 'var(--space-3)', color: 'var(--color-text-secondary)' }}
            >
              {currentUser?.email}
            </p>

            {/* Divider */}
            <div
              style={{ margin: 'var(--space-5) 0', borderTop: '1px solid var(--color-border)' }}
            />

            {/* Meta rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3.5)' }}>
              {metaItems.map((item) => (
                <div key={item.label} className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-subtle)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p
                      style={{ fontSize: '0.65rem', lineHeight: 1, color: 'var(--color-text-muted)' }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginTop: 2, lineHeight: 1.25, color: 'var(--color-text-primary)' }}
                    >
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Form cards ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Personal Information card */}
          <form onSubmit={handleSubmit}>
            <div
              className="overflow-hidden"
              style={{
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center"
                style={{ gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-accent-light)',
                    color: 'var(--color-accent-text)',
                  }}
                >
                  <User style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3
                    style={{ fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 1, color: 'var(--color-text-primary)' }}
                  >
                    Personal Information
                  </h3>
                  <p
                    style={{ fontSize: 'var(--text-sm)', marginTop: 2, color: 'var(--color-text-muted)' }}
                  >
                    Update your name and email address
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ padding: 'var(--space-6)', gap: 'var(--space-5)' }}>
                <div>
                  <label
                    className="block"
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1.5)', color: 'var(--color-text-muted)' }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Enter your name"
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block"
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1.5)', color: 'var(--color-text-muted)' }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Enter your email"
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Security card */}
            <div
              className="overflow-hidden"
              style={{
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center"
                style={{ gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-danger-light)',
                    color: 'var(--color-danger-text)',
                  }}
                >
                  <Shield style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3
                    style={{ fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 1, color: 'var(--color-text-primary)' }}
                  >
                    Change Password
                  </h3>
                  <p
                    style={{ fontSize: 'var(--text-sm)', marginTop: 2, color: 'var(--color-text-muted)' }}
                  >
                    Leave blank to keep your current password
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div style={{ padding: 'var(--space-6)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-5)' }}>
                  <div>
                    <label
                      className="block"
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1.5)', color: 'var(--color-text-muted)' }}
                    >
                      New Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      style={inputStyle}
                      placeholder="Enter new password"
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>
                  <div>
                    <label
                      className="block"
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1.5)', color: 'var(--color-text-muted)' }}
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      style={inputStyle}
                      placeholder="Confirm new password"
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>
                </div>

                {/* Mismatch warning */}
                {form.password &&
                  form.confirmPassword &&
                  form.password !== form.confirmPassword && (
                    <div
                      className="flex items-center"
                      style={{
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-4)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        background: 'var(--color-danger-light)',
                        color: 'var(--color-danger-text)',
                      }}
                    >
                      <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                      Passwords do not match
                    </div>
                  )}
              </div>

              {/* Action footer */}
              <div
                className="flex items-center justify-end"
                style={{
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4) var(--space-6)',
                  borderTop: '1px solid var(--color-border)',
                  background: 'var(--color-bg-subtle)',
                }}
              >
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    height: '42px',
                    padding: '0 var(--space-5)',
                    fontSize: 'var(--text-base)',
                  }}
                  onClick={() => {
                    setForm({
                      name: currentUser?.name ?? '',
                      email: currentUser?.email ?? '',
                      password: '',
                      confirmPassword: '',
                    });
                    setMessage(null);
                  }}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-accent flex items-center justify-center"
                  style={{
                    gap: 'var(--space-2)',
                    minWidth: 160,
                    height: '42px',
                    fontSize: 'var(--text-base)',
                    padding: '0 var(--space-5)',
                  }}
                >
                  {loading ? (
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
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save style={{ width: 16, height: 16 }} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
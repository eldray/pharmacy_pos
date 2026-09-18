// src/components/ProfileSettings.tsx
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import api from '../api/api';
import {
  User, Save, CheckCircle, AlertCircle, ArrowLeft,
  Shield, Calendar, Clock, Mail, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════════════
   Shared styles (match Preferences / CompanySettings)
   ═══════════════════════════════════════════════════════════════════════ */
const fieldStyle: React.CSSProperties = {
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-input-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-input-text)',
  outline: 'none',
  fontSize: '0.82rem',
  padding: '8px 12px',
  width: '100%',
  height: 38,
  transition: 'border-color 100ms ease, box-shadow 100ms ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 600,
  marginBottom: 6,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const onF = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
};
const onB = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-input-border)';
  e.currentTarget.style.boxShadow = 'none';
};

/* ═══════════════════════════════════════════════════════════════════════
   Primitives
   ═══════════════════════════════════════════════════════════════════════ */
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <section
    style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
    }}
  >
    <header
      style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32, height: 32,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-accent-light)',
          color: 'var(--color-accent-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
            {description}
          </p>
        )}
      </div>
    </header>
    <div style={{ padding: '18px' }}>{children}</div>
  </section>
);

const MetaRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div
      style={{
        width: 32, height: 32,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg-subtle)',
        color: 'var(--color-text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={14} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */
export const ProfileSettings: React.FC = () => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [form, setForm] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initials = useMemo(() =>
    currentUser?.name
      ?.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U',
    [currentUser?.name]);

  const roleBadgeClass =
    currentUser?.role === 'admin' ? 'badge-admin'
      : currentUser?.role === 'manager' ? 'badge-manager'
        : currentUser?.role === 'cashier' ? 'badge-cashier'
          : currentUser?.role === 'pharmacist_sales' ? 'badge-pharmacist_sales'
            : currentUser?.role === 'lab_tech' ? 'badge-lab_tech'
              : 'badge-secondary';

  const roleLabel = (r?: string) =>
    r === 'pharmacist_sales' ? 'Pharmacist'
      : r === 'lab_tech' ? 'Lab Technician'
        : r ? r.charAt(0).toUpperCase() + r.slice(1)
          : 'User';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (message) setMessage(null);
  };

  const isDirty =
    form.name !== (currentUser?.name ?? '') ||
    form.email !== (currentUser?.email ?? '') ||
    form.password !== '';

  const handleDiscard = () => {
    setForm({
      name: currentUser?.name ?? '',
      email: currentUser?.email ?? '',
      password: '',
      confirmPassword: '',
    });
    setMessage(null);
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
    if (form.password && form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, string> = {};
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
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.msg || 'Update failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    !form.password || !form.confirmPassword || form.password === form.confirmPassword;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32, height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User className="h-4 w-4" style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Profile Settings
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              Manage your account information and security
            </p>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>

      {/* ── BANNER ─────────────────────────────────────────────────── */}
      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            fontWeight: 500,
            background: message.type === 'success' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
            color: message.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          }}
        >
          {message.type === 'success'
            ? <CheckCircle className="h-4 w-4" style={{ flexShrink: 0 }} />
            : <AlertCircle className="h-4 w-4" style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── TWO-COLUMN LAYOUT ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 16 }}>

        {/* ── LEFT: Identity card ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            {/* Gradient strip + avatar */}
            <div style={{ height: 72, background: 'var(--gradient-accent)', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  bottom: -30,
                  left: 20,
                  width: 68, height: 68,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-bg-surface)',
                  border: '3px solid var(--color-bg-surface)',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 62, height: 62,
                    borderRadius: 'calc(var(--radius-lg) - 3px)',
                    background: 'var(--color-accent)',
                    color: 'var(--color-accent-fg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    letterSpacing: '0.5px',
                  }}
                >
                  {initials}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '40px 20px 20px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.25 }}>
                {currentUser?.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className={roleBadgeClass} style={{ textTransform: 'none' }}>
                  {roleLabel(currentUser?.role)}
                </span>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: '0.65rem', fontWeight: 600,
                    padding: '3px 9px', borderRadius: 999,
                    background: 'var(--color-success-light)',
                    color: 'var(--color-success-text)',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--color-success)' }} />
                  Active
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 12,
                  padding: '9px 12px',
                  background: 'var(--color-bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Mail size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.email}
                </span>
              </div>

              {/* Divider */}
              <div style={{ margin: '18px 0', borderTop: '1px solid var(--color-border)' }} />

              {/* Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <MetaRow icon={Calendar} label="Member since" value="Jan 2024" />
                <MetaRow icon={Clock} label="Last active" value="Just now" />
                <MetaRow icon={Shield} label="Role" value={roleLabel(currentUser?.role)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Form ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Personal */}
          <Section
            icon={<User size={16} />}
            title="Personal information"
            description="Update your display name and email"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  style={fieldStyle}
                  onFocus={onF}
                  onBlur={onB}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  style={fieldStyle}
                  onFocus={onF}
                  onBlur={onB}
                  required
                />
              </div>
            </div>
          </Section>

          {/* Password */}
          <Section
            icon={<KeyRound size={16} />}
            title="Change password"
            description="Leave blank to keep your current password"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
              <div>
                <label style={labelStyle}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    style={{ ...fieldStyle, paddingRight: 38 }}
                    onFocus={onF}
                    onBlur={onB}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--color-text-muted)',
                      cursor: 'pointer', padding: 4,
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    style={{ ...fieldStyle, paddingRight: 38 }}
                    onFocus={onF}
                    onBlur={onB}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--color-text-muted)',
                      cursor: 'pointer', padding: 4,
                    }}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password strength / match hints */}
            {(form.password || form.confirmPassword) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 14,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  background: passwordsMatch ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                  color: passwordsMatch ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                  border: `1px solid ${passwordsMatch ? 'var(--color-success)' : 'var(--color-danger)'}`,
                }}
              >
                {passwordsMatch
                  ? <><CheckCircle size={14} /> Passwords match</>
                  : <><AlertCircle size={14} /> Passwords do not match</>}
              </div>
            )}
          </Section>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 4,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isDirty ? 'You have unsaved changes.' : 'All changes are saved.'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={!isDirty || loading}
                className="btn-ghost"
                style={{ minWidth: 110, justifyContent: 'center', opacity: (!isDirty || loading) ? 0.5 : 1, cursor: (!isDirty || loading) ? 'not-allowed' : 'pointer' }}
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={loading || !isDirty}
                className="btn-accent"
                style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'center', opacity: (loading || !isDirty) ? 0.6 : 1, cursor: (loading || !isDirty) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <>
                    <div
                      className="rounded-full animate-spin"
                      style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
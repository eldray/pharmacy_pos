// src/pages/HelpSupport.tsx
import React, { useState, useMemo } from 'react';
import {
    HelpCircle, Mail, Phone, MessageCircle,
    BookOpen, Video, Download, ChevronRight,
    CheckCircle, Clock, AlertCircle,
    ShoppingCart, Settings, FileText, BarChart3, Package,
    ThumbsUp, ThumbsDown, Send, Copy,
    LifeBuoy, Search, Filter, X, Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   Types & data
   ═══════════════════════════════════════════════════════════════════════ */
interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: 'general' | 'sales' | 'inventory' | 'reports' | 'settings' | 'lab';
}

interface SupportTicket {
    id: string;
    subject: string;
    message: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    createdAt: string;
    updatedAt: string;
}

const faqs: FAQ[] = [
    {
        id: '1', category: 'general', question: 'How do I get started with PharmacyPOS?',
        answer: "After logging in, you'll see the dashboard. Start by adding products to your inventory, then you can begin making sales from the POS interface. Check the quick start guide for a step-by-step tutorial."
    },
    {
        id: '2', category: 'sales', question: 'How do I process a sale?',
        answer: 'Go to the POS interface, search for products, add them to the cart, enter customer details (optional), select payment method, and click "Pay". The receipt will be displayed and can be printed or saved as PDF.'
    },
    {
        id: '3', category: 'sales', question: 'Can I apply discounts to a sale?',
        answer: 'Yes! In the cart section, enter a discount percentage. The discount will be applied to the subtotal before tax is calculated. You can also apply item-specific discounts.'
    },
    {
        id: '4', category: 'inventory', question: 'How do I add new products?',
        answer: 'Navigate to Inventory > Products and click "Add Product". Fill in the product details including name, SKU, price, quantity, and expiry date (if applicable). You can also add products via purchase orders.'
    },
    {
        id: '5', category: 'inventory', question: 'How does the low stock alert work?',
        answer: "When a product quantity drops below 20 units, you'll receive a notification. You can also set custom reorder levels for each product. The system will alert you when stock is low or out of stock."
    },
    {
        id: '6', category: 'reports', question: 'What reports are available?',
        answer: 'You can generate sales reports, profit reports, inventory reports, controlled substance reports, and lab test reports. Access them from the Reports section in the sidebar.'
    },
    {
        id: '7', category: 'settings', question: 'How do I change my company details?',
        answer: 'Go to Settings > Company Information. You can update your company name, address, contact details, tax ID, and receipt footer text there.'
    },
    {
        id: '8', category: 'general', question: 'Is my data secure?',
        answer: 'Yes! All data is stored securely in your local database. Your authentication token is stored in localStorage and all API communications use encrypted connections. Backups are available in Company Settings.'
    },
    {
        id: '9', category: 'lab', question: 'How do I manage lab tests?',
        answer: 'Navigate to Laboratory. You can create new lab test transactions, assign tests to patients, enter results, and generate reports. Each test can have custom reference ranges and flags.'
    },
    {
        id: '10', category: 'sales', question: 'Can I accept mobile money payments?',
        answer: "Yes! The POS supports MTN Mobile Money, Vodafone Cash, and AirtelTigo Money. Simply select the payment method and enter the customer's phone number when processing the sale."
    },
];

const categories = [
    { id: 'all', label: 'All topics', icon: HelpCircle },
    { id: 'general', label: 'General', icon: LifeBuoy },
    { id: 'sales', label: 'Sales & POS', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'lab', label: 'Lab management', icon: FileText },
] as const;

/* ═══════════════════════════════════════════════════════════════════════
   Shared styles
   ═══════════════════════════════════════════════════════════════════════ */
const inputStyle: React.CSSProperties = {
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

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    height: 'auto',
    minHeight: 96,
    resize: 'vertical',
    padding: '10px 12px',
    lineHeight: 1.5,
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

const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-input-ring)';
};
const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    action?: React.ReactNode;
    children: React.ReactNode;
}> = ({ icon, title, description, action, children }) => (
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
                justifyContent: 'space-between',
                gap: 12,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
            </div>
            {action}
        </header>
        <div style={{ padding: '16px 18px' }}>{children}</div>
    </section>
);

/** Primary quick-link tile */
const QuickTile: React.FC<{
    icon: React.ElementType;
    label: string;
    description: string;
    tint: string;
}> = ({ icon: Icon, label, description, tint }) => (
    <button
        type="button"
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'transform 120ms, box-shadow 120ms, border-color 120ms',
        }}
        onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(-2px)';
            el.style.boxShadow = 'var(--shadow-md)';
            el.style.borderColor = tint;
        }}
        onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = 'var(--shadow-card)';
            el.style.borderColor = 'var(--color-border)';
        }}
    >
        <div
            style={{
                width: 36, height: 36,
                borderRadius: 'var(--radius-md)',
                background: `${tint}22`,
                color: tint,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {label}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {description}
            </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
    </button>
);

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */
export const HelpSupport: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [showTicketForm, setShowTicketForm] = useState(false);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [feedback, setFeedback] = useState<Record<string, 'helpful' | 'not-helpful' | null>>({});
    const [tickets, setTickets] = useState<SupportTicket[]>(() => {
        const saved = localStorage.getItem('support_tickets');
        return saved ? JSON.parse(saved) : [];
    });
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const filteredFaqs = useMemo(() => {
        let result = faqs;
        if (activeCategory !== 'all') result = result.filter((f) => f.category === activeCategory);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
            );
        }
        return result;
    }, [activeCategory, searchQuery]);

    const toggleFaq = (id: string) => setExpandedFaq((prev) => (prev === id ? null : id));

    const handleSubmitTicket = () => {
        if (!ticketSubject.trim() || !ticketMessage.trim()) {
            setBanner({ type: 'error', text: 'Please fill in both subject and message.' });
            setTimeout(() => setBanner(null), 3000);
            return;
        }
        const newTicket: SupportTicket = {
            id: `TICKET-${Date.now().toString().slice(-8)}`,
            subject: ticketSubject,
            message: ticketMessage,
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const updated = [newTicket, ...tickets];
        setTickets(updated);
        localStorage.setItem('support_tickets', JSON.stringify(updated));
        setTicketSubject('');
        setTicketMessage('');
        setShowTicketForm(false);
        setBanner({ type: 'success', text: 'Ticket submitted — we\u2019ll respond within 24–48 hours.' });
        setTimeout(() => setBanner(null), 4000);
    };

    const handleFeedback = (faqId: string, value: 'helpful' | 'not-helpful') =>
        setFeedback((prev) => ({ ...prev, [faqId]: prev[faqId] === value ? null : value }));

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('support@pharmacypos.com');
        setBanner({ type: 'success', text: 'Email address copied to clipboard.' });
        setTimeout(() => setBanner(null), 3000);
    };

    const statusTint = (status: string) =>
        status === 'open' ? 'var(--color-warning)' :
            status === 'in-progress' ? 'var(--color-info)' :
                status === 'resolved' ? 'var(--color-success)' :
                    'var(--color-text-muted)';

    const statusIcon = (status: string) =>
        status === 'open' ? <Clock size={12} /> :
            status === 'in-progress' ? <AlertCircle size={12} /> :
                status === 'resolved' ? <CheckCircle size={12} /> :
                    <X size={12} />;

    const ticketCounts = {
        open: tickets.filter((t) => t.status === 'open').length,
        resolved: tickets.filter((t) => t.status === 'resolved').length,
    };

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
                        <HelpCircle className="h-4 w-4" style={{ color: '#fff' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                            Help & Support
                        </h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                            Find answers, browse topics, or contact support
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowTicketForm((v) => !v)}
                    className="btn-accent"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <MessageCircle size={14} />
                    {showTicketForm ? 'Close form' : 'Contact support'}
                </button>
            </div>

            {/* ── BANNER ─────────────────────────────────────────────────── */}
            {banner && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        background: banner.type === 'success' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                        color: banner.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                        border: `1px solid ${banner.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    }}
                >
                    {banner.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span style={{ flex: 1 }}>{banner.text}</span>
                    <button
                        onClick={() => setBanner(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, fontSize: 16, lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* ── QUICK LINKS ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <QuickTile
                    icon={BookOpen}
                    label="Documentation"
                    description="Full guides for every module"
                    tint="#0E7490"
                />
                <QuickTile
                    icon={Video}
                    label="Video tutorials"
                    description="Watch walkthroughs step by step"
                    tint="#7C3AED"
                />
                <QuickTile
                    icon={FileText}
                    label="Quick start"
                    description="Get running in under 10 minutes"
                    tint="#16A34A"
                />
                <QuickTile
                    icon={Download}
                    label="Resources"
                    description="Templates, checklists, downloads"
                    tint="#D97706"
                />
            </div>

            {/* ── TICKET FORM (collapsible) ──────────────────────────────── */}
            {showTicketForm && (
                <Section
                    icon={<MessageCircle size={16} />}
                    title="Submit a support ticket"
                    description="We usually respond within 24–48 hours"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>Subject</label>
                            <input
                                type="text"
                                value={ticketSubject}
                                onChange={(e) => setTicketSubject(e.target.value)}
                                placeholder="Brief summary of your issue"
                                style={inputStyle}
                                onFocus={onF}
                                onBlur={onB}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Message</label>
                            <textarea
                                value={ticketMessage}
                                onChange={(e) => setTicketMessage(e.target.value)}
                                placeholder="Describe what happened, what you expected, and any steps to reproduce…"
                                style={textareaStyle}
                                onFocus={onF}
                                onBlur={onB}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setShowTicketForm(false)}
                                className="btn-ghost"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitTicket}
                                className="btn-accent"
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <Send size={14} />
                                Submit ticket
                            </button>
                        </div>
                    </div>
                </Section>
            )}

            {/* ── MAIN GRID: filters + FAQs ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr)', gap: 16 }}>

                {/* Left rail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Section icon={<Filter size={16} />} title="Browse topics">
                        {/* Search */}
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search FAQs…"
                                style={{ ...inputStyle, paddingLeft: 32 }}
                                onFocus={onF}
                                onBlur={onB}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Categories */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {categories.map(({ id, label, icon: Icon }) => {
                                const active = activeCategory === id;
                                const count = faqs.filter((f) => id === 'all' || f.category === id).length;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setActiveCategory(id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 10px',
                                            borderRadius: 'var(--radius-md)',
                                            background: active ? 'var(--color-accent-light)' : 'transparent',
                                            color: active ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                                            fontSize: '0.8rem',
                                            fontWeight: active ? 600 : 500,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background 100ms, color 100ms',
                                        }}
                                        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)'; }}
                                        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <Icon size={14} style={{ flexShrink: 0 }} />
                                        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                padding: '1px 6px',
                                                borderRadius: 999,
                                                background: 'var(--color-bg-subtle)',
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Support summary */}
                    <Section icon={<LifeBuoy size={16} />} title="At a glance">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div style={{ padding: '10px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent-text)' }}>{faqs.length}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Articles</div>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-warning-text)' }}>{ticketCounts.open}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Open</div>
                            </div>
                            <div style={{ padding: '10px 12px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center', gridColumn: 'span 2' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success-text)' }}>{ticketCounts.resolved}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Resolved tickets</div>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Right — FAQ list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'}
                            {activeCategory !== 'all' && (
                                <> in <strong style={{ color: 'var(--color-text-secondary)' }}>{categories.find((c) => c.id === activeCategory)?.label}</strong></>
                            )}
                        </span>
                        {(searchQuery || activeCategory !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--color-accent-text)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={12} /> Clear filters
                            </button>
                        )}
                    </div>

                    {filteredFaqs.length === 0 ? (
                        <Section icon={<Info size={16} />} title="No matching articles">
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <HelpCircle size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.35, margin: '0 auto 12px', display: 'block' }} />
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                                    Nothing matched your search
                                </p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                    Try a different keyword or clear the filters.
                                </p>
                            </div>
                        </Section>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {filteredFaqs.map((faq) => {
                                const open = expandedFaq === faq.id;
                                return (
                                    <div
                                        key={faq.id}
                                        style={{
                                            background: 'var(--color-bg-surface)',
                                            border: `1px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                            borderRadius: 'var(--radius-lg)',
                                            boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-card)',
                                            overflow: 'hidden',
                                            transition: 'border-color 120ms, box-shadow 120ms',
                                        }}
                                    >
                                        <button
                                            onClick={() => toggleFaq(faq.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '14px 16px',
                                                background: open ? 'var(--color-accent-light)' : 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'background 120ms',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.05em',
                                                    textTransform: 'uppercase',
                                                    padding: '2px 8px',
                                                    borderRadius: 999,
                                                    background: 'var(--color-bg-subtle)',
                                                    color: 'var(--color-text-muted)',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {faq.category}
                                            </span>
                                            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.35 }}>
                                                {faq.question}
                                            </span>
                                            <ChevronRight
                                                size={16}
                                                style={{
                                                    color: 'var(--color-text-muted)',
                                                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    transition: 'transform 180ms ease',
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </button>

                                        {open && (
                                            <div style={{ padding: '0 16px 14px 16px', borderTop: '1px solid var(--color-border)' }}>
                                                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: '12px 0 0 0' }}>
                                                    {faq.answer}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--color-border)' }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                        Was this helpful?
                                                    </span>
                                                    <button
                                                        onClick={() => handleFeedback(faq.id, 'helpful')}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                                            padding: '4px 10px', borderRadius: 999,
                                                            fontSize: '0.72rem', fontWeight: 600,
                                                            background: feedback[faq.id] === 'helpful' ? 'var(--color-success-light)' : 'var(--color-bg-subtle)',
                                                            color: feedback[faq.id] === 'helpful' ? 'var(--color-success-text)' : 'var(--color-text-secondary)',
                                                            border: `1px solid ${feedback[faq.id] === 'helpful' ? 'var(--color-success)' : 'var(--color-border)'}`,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <ThumbsUp size={11} /> Yes
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(faq.id, 'not-helpful')}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                                            padding: '4px 10px', borderRadius: 999,
                                                            fontSize: '0.72rem', fontWeight: 600,
                                                            background: feedback[faq.id] === 'not-helpful' ? 'var(--color-danger-light)' : 'var(--color-bg-subtle)',
                                                            color: feedback[faq.id] === 'not-helpful' ? 'var(--color-danger-text)' : 'var(--color-text-secondary)',
                                                            border: `1px solid ${feedback[faq.id] === 'not-helpful' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <ThumbsDown size={11} /> No
                                                    </button>
                                                    {feedback[faq.id] === 'helpful' && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-success-text)', fontWeight: 500 }}>
                                                            Thanks — glad that helped.
                                                        </span>
                                                    )}
                                                    {feedback[faq.id] === 'not-helpful' && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                            We'll work on improving this.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── SUPPORT TICKETS ────────────────────────────────────────── */}
            {tickets.length > 0 && (
                <Section
                    icon={<FileText size={16} />}
                    title="Your support tickets"
                    description={`${tickets.length} submitted`}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                        {tickets.slice(0, 6).map((ticket) => {
                            const tint = statusTint(ticket.status);
                            return (
                                <div
                                    key={ticket.id}
                                    style={{
                                        padding: '12px 14px',
                                        background: 'var(--color-bg-subtle)',
                                        borderLeft: `3px solid ${tint}`,
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                                            {ticket.subject}
                                        </span>
                                        <span
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                                                padding: '2px 7px', borderRadius: 999,
                                                background: `${tint}22`,
                                                color: tint,
                                                flexShrink: 0,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {statusIcon(ticket.status)} {ticket.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-muted)',
                                            marginTop: 4,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    >
                                        {ticket.message}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                                        <span style={{ fontFamily: 'var(--font-mono)' }}>{ticket.id}</span>
                                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* ── CONTACT ────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <Section icon={<Mail size={16} />} title="Email support" description="Response within 24–48 hours">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px',
                                background: 'var(--color-bg-subtle)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <Mail size={16} style={{ color: 'var(--color-accent)' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                support@pharmacypos.com
                            </span>
                        </div>
                        <button
                            onClick={handleCopyEmail}
                            className="btn-ghost"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                        >
                            <Copy size={14} /> Copy address
                        </button>
                    </div>
                </Section>

                <Section icon={<Phone size={16} />} title="Phone support" description="Mon–Fri 8AM – 6PM · Sat 9AM – 2PM">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px',
                                background: 'var(--color-bg-subtle)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <Phone size={16} style={{ color: 'var(--color-success)' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                +233 55 123 4567
                            </span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            For urgent issues during working hours.
                        </p>
                    </div>
                </Section>
            </div>

            {/* ── FOOTER STRIP ───────────────────────────────────────────── */}
            <div
                style={{
                    padding: '12px 16px',
                    background: 'var(--color-bg-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                }}
            >
                <span>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>PharmacyPOS v1.0.0</strong>
                    {' · Made by Emmanuel Appiah'}
                </span>
                <div style={{ display: 'flex', gap: 14 }}>
                    <a href="#" style={{ color: 'var(--color-accent-text)', textDecoration: 'none' }}>Documentation</a>
                    <a href="#" style={{ color: 'var(--color-accent-text)', textDecoration: 'none' }}>Privacy policy</a>
                </div>
            </div>
        </div>
    );
};

export default HelpSupport;
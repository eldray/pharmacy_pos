// src/pages/HelpSupport.tsx
import React, { useState } from 'react';
import {
    HelpCircle, Mail, Phone, MessageCircle,
    BookOpen, Video, Download, ChevronRight,
    ExternalLink, CheckCircle, Clock, AlertCircle,
    Printer, ShoppingCart, Users, Settings,
    FileText, BarChart3, Package, Calendar,
    Star, ThumbsUp, ThumbsDown, Send, Copy,
    LifeBuoy, Headphones, FileQuestion, Zap,
    Award, Shield, Globe, Search, Filter,
    X, Plus, Minus
} from 'lucide-react';

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
        id: '1',
        category: 'general',
        question: 'How do I get started with PharmacyPOS?',
        answer: 'After logging in, you\'ll see the dashboard. Start by adding products to your inventory, then you can begin making sales from the POS interface. Check the quick start guide for a step-by-step tutorial.'
    },
    {
        id: '2',
        category: 'sales',
        question: 'How do I process a sale?',
        answer: 'Go to the POS interface, search for products, add them to the cart, enter customer details (optional), select payment method, and click "Pay". The receipt will be displayed and can be printed or saved as PDF.'
    },
    {
        id: '3',
        category: 'sales',
        question: 'Can I apply discounts to a sale?',
        answer: 'Yes! In the cart section, enter a discount percentage. The discount will be applied to the subtotal before tax is calculated. You can also apply item-specific discounts.'
    },
    {
        id: '4',
        category: 'inventory',
        question: 'How do I add new products?',
        answer: 'Navigate to Inventory > Products and click "Add Product". Fill in the product details including name, SKU, price, quantity, and expiry date (if applicable). You can also add products via purchase orders.'
    },
    {
        id: '5',
        category: 'inventory',
        question: 'How does the low stock alert work?',
        answer: 'When a product quantity drops below 20 units, you\'ll receive a notification. You can also set custom reorder levels for each product. The system will alert you when stock is low or out of stock.'
    },
    {
        id: '6',
        category: 'reports',
        question: 'What reports are available?',
        answer: 'You can generate sales reports, profit reports, inventory reports, controlled substance reports, and lab test reports. Access them from the Reports section in the sidebar.'
    },
    {
        id: '7',
        category: 'settings',
        question: 'How do I change my company details?',
        answer: 'Go to Settings > Company Information. You can update your company name, address, contact details, tax ID, and receipt footer text there.'
    },
    {
        id: '8',
        category: 'general',
        question: 'Is my data secure?',
        answer: 'Yes! All data is stored locally in your browser using IndexedDB. Your authentication token is securely stored in localStorage and all API communications use HTTPS. Data is encrypted at rest.'
    },
    {
        id: '9',
        category: 'lab',
        question: 'How do I manage lab tests?',
        answer: 'Navigate to Lab Management. You can create new lab test transactions, assign tests to patients, enter results, and generate reports. Each test can have custom reference ranges and flags.'
    },
    {
        id: '10',
        category: 'sales',
        question: 'Can I accept mobile money payments?',
        answer: 'Yes! The POS supports MTN Mobile Money, Vodafone Cash, and AirtelTigo Money. Simply select the payment method and enter the customer\'s phone number when processing the sale.'
    },
];

const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle },
    { id: 'general', label: 'General', icon: LifeBuoy },
    { id: 'sales', label: 'Sales & POS', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'lab', label: 'Lab Management', icon: FileText },
];

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

    // ─── Filter FAQs ──────────────────────────────────────────────────────
    const filteredFaqs = React.useMemo(() => {
        let result = faqs;

        // Filter by category
        if (activeCategory !== 'all') {
            result = result.filter(f => f.category === activeCategory);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(f =>
                f.question.toLowerCase().includes(query) ||
                f.answer.toLowerCase().includes(query)
            );
        }

        return result;
    }, [activeCategory, searchQuery]);

    const toggleFaq = (id: string) => {
        setExpandedFaq(expandedFaq === id ? null : id);
    };

    const handleSubmitTicket = () => {
        if (!ticketSubject.trim() || !ticketMessage.trim()) {
            alert('Please fill in both subject and message.');
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

        const updatedTickets = [newTicket, ...tickets];
        setTickets(updatedTickets);
        localStorage.setItem('support_tickets', JSON.stringify(updatedTickets));
        setTicketSubject('');
        setTicketMessage('');
        setShowTicketForm(false);
        alert('✅ Your support ticket has been submitted! We\'ll get back to you within 24-48 hours.');
    };

    const handleFeedback = (faqId: string, value: 'helpful' | 'not-helpful') => {
        setFeedback(prev => ({ ...prev, [faqId]: prev[faqId] === value ? null : value }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'var(--color-warning)';
            case 'in-progress': return 'var(--color-info)';
            case 'resolved': return 'var(--color-success)';
            case 'closed': return 'var(--color-text-muted)';
            default: return 'var(--color-text-muted)';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <Clock size={14} />;
            case 'in-progress': return <AlertCircle size={14} />;
            case 'resolved': return <CheckCircle size={14} />;
            case 'closed': return <X size={14} />;
            default: return null;
        }
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('support@pharmacypos.com');
        alert('📋 Email address copied to clipboard!');
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <HelpCircle size={24} />
                        Help & Support
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Find answers, get help, and contact support
                    </p>
                </div>
                <button
                    onClick={() => setShowTicketForm(!showTicketForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-100"
                    style={{
                        background: 'var(--color-accent)',
                        color: 'var(--color-accent-fg)',
                        border: 'none',
                    }}
                >
                    <MessageCircle size={16} />
                    {showTicketForm ? 'Close Form' : 'Contact Support'}
                </button>
            </div>

            {/* ─── Quick Actions ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { icon: BookOpen, label: 'Documentation', color: 'var(--color-info)', desc: 'Read the docs' },
                    { icon: Video, label: 'Video Tutorials', color: 'var(--color-accent)', desc: 'Watch & learn' },
                    { icon: FileText, label: 'Quick Start Guide', color: 'var(--color-success)', desc: 'Get started fast' },
                    { icon: Download, label: 'Resources', color: 'var(--color-warning)', desc: 'Downloads & tools' },
                ].map(({ icon: Icon, label, color, desc }) => (
                    <div
                        key={label}
                        className="flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-100"
                        style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-card)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                        }}
                    >
                        <div className="p-3 rounded-full mb-2" style={{ background: `${color}22`, color }}>
                            <Icon size={20} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {label}
                        </span>
                        <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {desc}
                        </span>
                    </div>
                ))}
            </div>

            {/* ─── Ticket Form ────────────────────────────────────────────── */}
            {showTicketForm && (
                <div className="mb-6 p-5 rounded-xl" style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-accent)',
                    boxShadow: 'var(--shadow-md)',
                }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                            <MessageCircle size={18} />
                            Submit a Support Ticket
                        </h3>
                        <button
                            onClick={() => setShowTicketForm(false)}
                            style={{
                                background: 'var(--color-bg-subtle)',
                                border: 'none',
                                padding: 4,
                                borderRadius: 6,
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                                Subject
                            </label>
                            <input
                                type="text"
                                value={ticketSubject}
                                onChange={(e) => setTicketSubject(e.target.value)}
                                placeholder="Brief summary of your issue"
                                style={{
                                    background: 'var(--color-input-bg)',
                                    border: '1px solid var(--color-input-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-input-text)',
                                    outline: 'none',
                                    fontSize: '0.8125rem',
                                    padding: '8px 12px',
                                    width: '100%',
                                }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--color-input-border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--color-input-border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                                Message
                            </label>
                            <textarea
                                value={ticketMessage}
                                onChange={(e) => setTicketMessage(e.target.value)}
                                placeholder="Describe your issue in detail..."
                                rows={4}
                                style={{
                                    background: 'var(--color-input-bg)',
                                    border: '1px solid var(--color-input-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-input-text)',
                                    outline: 'none',
                                    fontSize: '0.8125rem',
                                    padding: '8px 12px',
                                    width: '100%',
                                    resize: 'vertical',
                                    minHeight: '100px',
                                }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--color-input-border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--color-input-border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSubmitTicket}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg transition-all duration-100"
                            style={{
                                background: 'var(--color-accent)',
                                color: 'var(--color-accent-fg)',
                                border: 'none',
                            }}
                        >
                            <Send size={16} />
                            Submit Ticket
                        </button>
                    </div>
                </div>
            )}

            {/* ─── FAQ Section ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar - Categories & Search */}
                <div className="lg:col-span-1">
                    <div className="sticky" style={{ top: 'calc(var(--navbar-height) + 20px)' }}>
                        {/* Search */}
                        <div className="relative mb-4">
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-muted)'
                                }}
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search FAQs..."
                                style={{
                                    background: 'var(--color-input-bg)',
                                    border: '1px solid var(--color-input-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-input-text)',
                                    outline: 'none',
                                    fontSize: '0.8125rem',
                                    padding: '8px 12px 8px 36px',
                                    width: '100%',
                                }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--color-input-border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--color-input-ring)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--color-input-border)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Categories */}
                        <div className="rounded-xl overflow-hidden" style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-card)',
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                                    <Filter size={12} className="inline mr-2" />
                                    Categories
                                </span>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                {categories.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setActiveCategory(id)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
                                        style={{
                                            background: activeCategory === id ? 'var(--color-accent-light)' : 'transparent',
                                            color: activeCategory === id ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeCategory !== id) {
                                                e.currentTarget.style.background = 'var(--color-bg-subtle)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeCategory !== id) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        <Icon size={16} />
                                        <span className="flex-1 text-left">{label}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                            background: 'var(--color-bg-subtle)',
                                            color: 'var(--color-text-muted)',
                                        }}>
                                            {faqs.filter(f => id === 'all' || f.category === id).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Support Stats */}
                        <div className="mt-4 p-4 rounded-xl text-center" style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div className="flex items-center justify-center gap-4">
                                <div>
                                    <p className="text-lg font-bold" style={{ color: 'var(--color-accent-text)' }}>
                                        {faqs.length}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>FAQs</p>
                                </div>
                                <div className="w-px h-8" style={{ background: 'var(--color-border)' }} />
                                <div>
                                    <p className="text-lg font-bold" style={{ color: 'var(--color-success-text)' }}>
                                        {tickets.filter(t => t.status === 'resolved').length}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Resolved</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ List */}
                <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs flex items-center gap-1"
                                style={{ color: 'var(--color-accent-text)' }}
                            >
                                <X size={12} />
                                Clear search
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {filteredFaqs.map((faq) => (
                            <div
                                key={faq.id}
                                className="rounded-xl overflow-hidden transition-all duration-100"
                                style={{
                                    background: 'var(--color-bg-surface)',
                                    border: `1px solid ${expandedFaq === faq.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                    boxShadow: expandedFaq === faq.id ? 'var(--shadow-md)' : 'var(--shadow-card)',
                                }}
                            >
                                <button
                                    onClick={() => toggleFaq(faq.id)}
                                    className="w-full flex items-center justify-between p-4 text-left transition-colors duration-100"
                                    style={{
                                        background: expandedFaq === faq.id ? 'var(--color-accent-light)' : 'transparent',
                                    }}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-xs font-bold px-2 py-1 rounded" style={{
                                            background: 'var(--color-bg-subtle)',
                                            color: 'var(--color-text-muted)',
                                            textTransform: 'uppercase',
                                        }}>
                                            {faq.category}
                                        </span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                            {faq.question}
                                        </span>
                                    </div>
                                    <ChevronRight
                                        size={18}
                                        style={{
                                            color: 'var(--color-text-muted)',
                                            transform: expandedFaq === faq.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                            flexShrink: 0,
                                        }}
                                    />
                                </button>

                                {expandedFaq === faq.id && (
                                    <div className="px-4 pb-4 pt-1">
                                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                            {faq.answer}
                                        </p>
                                        <div className="mt-3 flex items-center gap-4">
                                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                Was this helpful?
                                            </span>
                                            <button
                                                onClick={() => handleFeedback(faq.id, 'helpful')}
                                                className="p-1.5 rounded-full transition-colors duration-100"
                                                style={{
                                                    background: feedback[faq.id] === 'helpful' ? 'var(--color-success-light)' : 'transparent',
                                                    color: feedback[faq.id] === 'helpful' ? 'var(--color-success-text)' : 'var(--color-text-muted)',
                                                }}
                                            >
                                                <ThumbsUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleFeedback(faq.id, 'not-helpful')}
                                                className="p-1.5 rounded-full transition-colors duration-100"
                                                style={{
                                                    background: feedback[faq.id] === 'not-helpful' ? 'var(--color-danger-light)' : 'transparent',
                                                    color: feedback[faq.id] === 'not-helpful' ? 'var(--color-danger-text)' : 'var(--color-text-muted)',
                                                }}
                                            >
                                                <ThumbsDown size={14} />
                                            </button>
                                            {feedback[faq.id] === 'helpful' && (
                                                <span className="text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>
                                                    ✓ Thanks for your feedback!
                                                </span>
                                            )}
                                            {feedback[faq.id] === 'not-helpful' && (
                                                <span className="text-xs font-medium" style={{ color: 'var(--color-danger-text)' }}>
                                                    We'll improve this answer.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredFaqs.length === 0 && (
                            <div className="text-center py-12" style={{
                                background: 'var(--color-bg-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                            }}>
                                <HelpCircle size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    No FAQs found
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                    Try adjusting your search or category filter
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Support Tickets ────────────────────────────────────────── */}
            {tickets.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <FileText size={18} />
                        Your Support Tickets
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                            background: 'var(--color-bg-subtle)',
                            color: 'var(--color-text-muted)',
                        }}>
                            {tickets.length}
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tickets.slice(0, 4).map((ticket) => (
                            <div
                                key={ticket.id}
                                className="p-4 rounded-xl transition-all duration-100"
                                style={{
                                    background: 'var(--color-bg-surface)',
                                    border: `1px solid ${getStatusColor(ticket.status)}44`,
                                    borderLeft: `3px solid ${getStatusColor(ticket.status)}`,
                                }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                                {ticket.subject}
                                            </span>
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap"
                                                style={{
                                                    background: `${getStatusColor(ticket.status)}22`,
                                                    color: getStatusColor(ticket.status),
                                                }}
                                            >
                                                {getStatusIcon(ticket.status)}
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                                            {ticket.message}
                                        </p>
                                        <div className="flex gap-4 mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                            <span>ID: {ticket.id}</span>
                                            <span>•</span>
                                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Contact Options ────────────────────────────────────────── */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl text-center" style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                }}>
                    <div className="flex flex-col items-center">
                        <div className="p-3 rounded-full mb-3" style={{ background: 'var(--color-accent-light)' }}>
                            <Mail size={20} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Email Support
                        </h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            support@pharmacypos.com
                        </p>
                        <button
                            onClick={handleCopyEmail}
                            className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-100"
                            style={{
                                background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <Copy size={12} />
                            Copy Email
                        </button>
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                            Response within 24-48 hours
                        </p>
                    </div>
                </div>

                <div className="p-5 rounded-xl text-center" style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                }}>
                    <div className="flex flex-col items-center">
                        <div className="p-3 rounded-full mb-3" style={{ background: 'var(--color-success-light)' }}>
                            <Phone size={20} style={{ color: 'var(--color-success-text)' }} />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Phone Support
                        </h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            +233 55 123 4567
                        </p>
                        <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <p>Mon-Fri: 8AM - 6PM</p>
                            <p>Sat: 9AM - 2PM</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Footer ────────────────────────────────────────────────── */}
            <div className="mt-8 p-4 rounded-xl text-center" style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
            }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="font-medium">PharmacyPOS v1.0.0</span>
                    <span className="mx-2">•</span>
                    Made with ❤️ by Emmanuel Appiah
                    <span className="mx-2">•</span>
                    <a
                        href="#"
                        style={{ color: 'var(--color-accent)' }}
                        className="hover:underline"
                    >
                        Documentation
                    </a>
                    <span className="mx-2">•</span>
                    <a
                        href="#"
                        style={{ color: 'var(--color-accent)' }}
                        className="hover:underline"
                    >
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
};

export default HelpSupport;
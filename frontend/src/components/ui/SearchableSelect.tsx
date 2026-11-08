// src/components/ui/SearchableSelect.tsx
//
// A type-to-search replacement for <select>, for lists too long to scroll
// (a pharmacy can have thousands of products). It filters as you type, supports
// the keyboard (↑ ↓ Enter Esc), and draws its list in a portal so it is never
// clipped by a modal's scroll area.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  /** Smaller line under the label, e.g. SKU · category. */
  sublabel?: string;
  /** Right-aligned detail, e.g. "120 in stock". */
  meta?: string;
  /** Extra text that should match a search but is not displayed. */
  keywords?: string;
  disabled?: boolean;
  /** Shown instead of `meta` styling when disabled, e.g. "Already added". */
  disabledReason?: string;
}

interface Props {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Cap on rows drawn at once, so a huge catalogue stays fast. */
  maxResults?: number;
  autoFocus?: boolean;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyText = 'No matches',
  disabled,
  style,
  maxResults = 50,
  autoFocus,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; anchorTop: number; width: number; above: boolean } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const { shown, total } = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    const matches = tokens.length
      ? options.filter((o) => {
          const hay = norm(`${o.label} ${o.sublabel || ''} ${o.keywords || ''}`);
          return tokens.every((t) => hay.includes(t));
        })
      : options;
    return { shown: matches.slice(0, maxResults), total: matches.length };
  }, [options, query, maxResults]);

  // Keep the list glued under (or above) the trigger, even while the modal scrolls.
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    setRect({ left: r.left, top: r.bottom + 4, anchorTop: r.top, width: r.width, above: spaceBelow < 280 && r.top > spaceBelow });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      // Wait for the portal to mount before focusing the search box.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.parentElement?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (o: SearchableOption | undefined) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(shown[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const trigger: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    textAlign: 'left',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        autoFocus={autoFocus}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={trigger}
      >
        <span
          className="truncate"
          style={{ color: selected ? 'var(--color-input-text)' : 'var(--color-text-muted)', flex: 1 }}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {open && rect &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: rect.left,
              width: Math.max(rect.width, 280),
              ...(rect.above ? { bottom: window.innerHeight - rect.anchorTop + 4 } : { top: rect.top }),
              zIndex: 100,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-lg, 0 10px 30px rgba(0,0,0,.25))',
              overflow: 'hidden',
            }}
          >
            <div
              className="flex items-center gap-2 px-3"
              style={{ borderBottom: '1px solid var(--color-border)', height: 38 }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder={searchPlaceholder}
                aria-label="Search"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--color-input-text)',
                }}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                </button>
              )}
            </div>

            <div ref={listRef} role="listbox" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {shown.length === 0 ? (
                <p className="px-3 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>{emptyText}</p>
              ) : (
                shown.map((o, i) => (
                  <div
                    key={o.value}
                    data-idx={i}
                    role="option"
                    aria-selected={o.value === value}
                    aria-disabled={o.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className="flex items-center justify-between gap-3 px-3"
                    style={{
                      padding: '7px 12px',
                      cursor: o.disabled ? 'not-allowed' : 'pointer',
                      opacity: o.disabled ? 0.45 : 1,
                      background: i === active ? 'var(--color-bg-subtle)' : 'transparent',
                      fontWeight: o.value === value ? 600 : 400,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p className="truncate" style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>{o.label}</p>
                      {o.sublabel && (
                        <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>{o.sublabel}</p>
                      )}
                    </div>
                    {(o.disabled ? o.disabledReason : o.meta) && (
                      <span className="shrink-0" style={{ fontSize: 11, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {o.disabled ? o.disabledReason : o.meta}
                      </span>
                    )}
                  </div>
                ))
              )}
              {total > shown.length && (
                <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
                  Showing {shown.length} of {total} — keep typing to narrow the list.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default SearchableSelect;

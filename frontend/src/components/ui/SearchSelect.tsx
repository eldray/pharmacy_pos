import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string;
}

// A select you can type into: the option list filters as you search, arrows +
// Enter work, Escape and outside clicks close it. For long catalogues (products,
// customers) where a native <select> means scrolling hundreds of rows.
export const SearchSelect: React.FC<{
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}> = ({ options, value, onChange, placeholder = '-- Select --', searchPlaceholder = 'Search…', disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pick = (option: SearchSelectOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) pick(filtered[activeIndex]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={rootRef} className="relative" style={{ opacity: disabled ? 0.5 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        className="input-base w-full text-sm flex items-center justify-between gap-2 text-left"
        style={{
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-input-border)',
          borderRadius: 6,
          color: selected ? 'var(--color-input-text)' : 'var(--color-text-muted)',
          padding: '8px 12px',
          minHeight: 38,
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              aria-label="Clear selection"
              className="p-0.5 rounded hover:bg-subtle"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="p-2 border-b border-theme">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="input-base w-full text-sm"
                style={{
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-input-border)',
                  borderRadius: 6,
                  color: 'var(--color-input-text)',
                  padding: '6px 8px 6px 28px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
          <div ref={listRef} style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No matches for "{query}"</p>
            ) : (
              filtered.map((option, i) => (
                <button
                  key={option.value}
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(option)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2"
                  style={{
                    background: i === activeIndex ? 'var(--color-accent-light)' : 'transparent',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{option.hint}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
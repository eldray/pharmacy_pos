// src/components/ui/Pagination.tsx
// Footer bar for usePagination: "Showing 1–25 of 312", rows-per-page, and page buttons
// (first / prev / 1 … 4 5 6 … 20 / next / last). Hidden while everything fits on the
// smallest page size, so short lists stay uncluttered.
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS, PaginationState } from '../../hooks/usePagination';

interface Props {
  pager: PaginationState<unknown>;
  /** Plural noun for the summary, e.g. "orders". */
  label?: string;
  /** Show the bar even when there is only one page. */
  alwaysShow?: boolean;
  className?: string;
}

// 1 … 4 5 6 … 20 — always includes first, last and the neighbours of the current page.
export const pageWindow = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
};

export const Pagination: React.FC<Props> = ({ pager, label = 'records', alwaysShow, className = '' }) => {
  const { page, totalPages, total, from, to, pageSize, setPage, setPageSize } = pager;
  if (!alwaysShow && total <= PAGE_SIZE_OPTIONS[0]) return null;

  const navBtn = 'btn-ghost p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-t border-theme flex-wrap gap-3 ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm text-secondary tabular-nums">
          Showing {from}–{to} of {total} {label}
        </span>
        <label className="flex items-center gap-2 text-sm text-secondary">
          Rows
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            style={{
              fontSize: 13,
              height: 30,
              padding: '0 8px',
              borderRadius: 6,
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              color: 'var(--color-input-text)',
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button type="button" className={navBtn} onClick={() => setPage(1)} disabled={page === 1} aria-label="First page" title="First page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" className={navBtn} onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" title="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-sm text-secondary" aria-hidden>…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg tabular-nums ${p === page ? 'btn-accent' : 'btn-ghost'}`}
            >
              {p}
            </button>
          )
        )}

        <button type="button" className={navBtn} onClick={() => setPage(page + 1)} disabled={page === totalPages} aria-label="Next page" title="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={navBtn} onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last page" title="Last page">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

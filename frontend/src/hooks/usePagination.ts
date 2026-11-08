// src/hooks/usePagination.ts
//
// Client-side pagination for lists that are already in memory (the store loads
// them whole and pages filter them). Pair it with <Pagination /> from
// components/ui/Pagination.
//
//   const pager = usePagination(filteredRows, { resetKey: `${search}|${status}` });
//   pager.pageItems.map(...)            // only the current page
//   <Pagination pager={pager} label="orders" />
//
// `resetKey` sends the user back to page 1 whenever the filters change. Without
// it the page is only clamped, so adding or deleting a row never throws you off
// the page you were looking at.
import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface PaginationState<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  /** 1-based index of the first / last row on this page (0 when empty). */
  from: number;
  to: number;
  pageItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPage: () => void;
}

export function usePagination<T>(
  items: readonly T[],
  options: { pageSize?: number; resetKey?: unknown } = {}
): PaginationState<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(options.pageSize ?? 25);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Filters changed: back to the first page.
  useEffect(() => {
    setPageRaw(1);
  }, [options.resetKey]);

  // The list shrank (rows deleted, stricter filter): never sit on a page that no longer exists.
  useEffect(() => {
    if (page > totalPages) setPageRaw(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    page: safePage,
    pageSize,
    totalPages,
    total,
    from: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, total),
    pageItems,
    setPage: (p: number) => setPageRaw(Math.max(1, Math.min(p, totalPages))),
    setPageSize: (size: number) => {
      setPageSizeRaw(size);
      setPageRaw(1);
    },
    resetPage: () => setPageRaw(1),
  };
}

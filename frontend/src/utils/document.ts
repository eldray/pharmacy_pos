// src/utils/document.ts
//
// Single source of truth for turning whatever the API returns — a POS
// Transaction, a SalesOrder, or a lab LabTransaction — into one flat shape that
// both the on-screen details view and the printable thermal receipt render from.
// Before this lived inside ReceiptModal, every caller re-derived (differently)
// the same fields, and lab documents rendered 0.00 because they carry
// `totalAmount`/`paidAmount` rather than `total`.

import { Banknote, CreditCard, ShieldCheck, Smartphone, Undo2, Wallet, type LucideIcon } from 'lucide-react';
import { safeNumber } from './number';
import type { LabTransaction, SalesOrder, Transaction } from '../types';

/* ─── Types ─────────────────────────────────────────────────────────── */

export type DocumentMode = 'receipt' | 'order';

export type PrintableDoc = Transaction | SalesOrder | LabTransaction;

export interface NormalizedItem {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unitLabel?: string;
}

export type DocumentStatusKey =
  | 'paid'
  | 'pending'
  | 'partial'
  | 'refunded'
  | 'cancelled';

export type StatusBadgeVariant = 'success' | 'warning' | 'info' | 'destructive' | 'default';

export interface DocumentStatus {
  key: DocumentStatusKey;
  label: string;
  badgeVariant: StatusBadgeVariant;
}

export interface NormalizedDocument {
  isOrder: boolean;
  isLab: boolean;
  /**
   * Whether the record is a SalesOrder rather than a completed Transaction.
   * Unlike `isOrder` this does not flip once the order is paid, so headings can
   * keep naming the document the way the list it came from names it.
   */
  isSalesOrder: boolean;

  docNumber: string;
  docLabel: string;
  title: string;

  staffLabel: string;
  staffName: string;

  paymentMethod: string | null;
  paymentReference: string | null;

  status: DocumentStatus;

  items: NormalizedItem[];
  itemCount: number;
  totalQuantity: number;

  subtotal: number;
  tax: number;
  /** Percentage to label the VAT line with; null when it cannot be derived. */
  taxRate: number | null;
  discount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;

  copayAmount: number;
  insuranceCoverage: number;
  insuranceProviderName: string | null;
  policyNumber: string | null;
  hasInsurance: boolean;

  /** What the patient actually owes / owed at the till. */
  amountDue: number;

  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string | undefined;
  /** When the money was taken. Null while a document is still awaiting payment. */
  paidAt: string | null;
}

/* ─── Money ─────────────────────────────────────────────────────────── */

export const CURRENCY = 'GHS';

export const round2 = (value: number): number => Math.round(safeNumber(value) * 100) / 100;

export const formatMoney = (value: unknown): string => round2(safeNumber(value)).toFixed(2);

export const formatAmount = (value: unknown): string => `${CURRENCY} ${formatMoney(value)}`;

/* ─── Detection ─────────────────────────────────────────────────────── */

export const isLabDoc = (doc: PrintableDoc | null | undefined): doc is LabTransaction =>
  !!doc && typeof doc === 'object' && 'labTests' in doc;

export const isOrderDoc = (doc: PrintableDoc | null | undefined): boolean =>
  !!doc && typeof doc === 'object' && 'orderNumber' in doc;

/* ─── Status ────────────────────────────────────────────────────────── */

const STATUS: Record<DocumentStatusKey, { label: string; badgeVariant: StatusBadgeVariant }> = {
  paid: { label: 'Paid', badgeVariant: 'success' },
  pending: { label: 'Awaiting payment', badgeVariant: 'warning' },
  partial: { label: 'Partially paid', badgeVariant: 'info' },
  refunded: { label: 'Refunded', badgeVariant: 'default' },
  cancelled: { label: 'Cancelled', badgeVariant: 'destructive' },
};

export function deriveStatus(doc: PrintableDoc): DocumentStatus {
  const raw = doc as any;

  if (raw.status === 'cancelled') return keyed('cancelled');

  // Lab orders carry an explicit payment status; POS sales do not.
  const paymentStatus = raw.paymentStatus;
  if (paymentStatus === 'pending' || paymentStatus === 'partial' || paymentStatus === 'refunded') {
    return keyed(paymentStatus);
  }
  if (paymentStatus === 'paid') return keyed('paid');

  const orderStatus = raw.status;
  if (orderStatus === 'pending_payment') return keyed('pending');

  // A recorded POS transaction is, by definition, a completed sale.
  return keyed('paid');
}

function keyed(key: DocumentStatusKey): DocumentStatus {
  return { key, ...STATUS[key] };
}

/* ─── Normalisation ─────────────────────────────────────────────────── */

function normalizeItems(doc: PrintableDoc): NormalizedItem[] {
  const raw: any[] = isLabDoc(doc)
    ? (doc.labTests || [])
    : ((doc as any).items || []);

  if (!Array.isArray(raw)) return [];

  return raw.map((item, index) => {
    if (isLabDoc(doc)) {
      const quantity = safeNumber(item.quantity) || 1;
      const unitPrice = safeNumber(item.testPrice);
      return {
        key: item.id || `lab-${index}`,
        name: item.testType || 'Lab Test',
        quantity,
        unitPrice,
        total: round2(unitPrice * quantity),
      };
    }

    const quantity = safeNumber(item.quantity);
    const unitPrice = safeNumber(item.unitPrice);
    return {
      key: item.cartId || `item-${index}`,
      name: item?.product?.name || item?.productName || 'Item',
      quantity,
      unitPrice,
      total: round2(safeNumber(item.total) || unitPrice * quantity),
      unitLabel: item.unitMode === 'package' ? (item.unitLabel || 'Package') : undefined,
    };
  });
}

export function normalizeDocument(
  doc: PrintableDoc | null | undefined,
  mode: DocumentMode = 'receipt',
): NormalizedDocument | null {
  if (!doc) return null;

  const raw = doc as any;
  const isLab = isLabDoc(doc);
  const status = deriveStatus(doc);

  // The slip is for money still owed. Once an order is settled it prints as a
  // receipt; a cancelled or refunded one is not awaiting payment either, so it
  // prints as a receipt carrying its own status rather than a "pay at the
  // cashier" slip. Lab requests are orders too — they carry a receiptNumber
  // rather than an orderNumber, so detection by column name alone let an unpaid
  // request print as a full receipt claiming PAID.
  const awaitingPayment = status.key === 'pending' || status.key === 'partial';
  const isOrder = awaitingPayment && (mode === 'order' || isOrderDoc(doc) || isLab);

  const items = normalizeItems(doc);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = round2(items.reduce((sum, item) => sum + item.total, 0));

  // Lab documents store the grand total in `totalAmount` and have no `subtotal`
  // or `tax` column at all, so the lines are the only source for those.
  const total = round2(safeNumber(raw.total) || safeNumber(raw.totalAmount));
  const subtotal = round2(safeNumber(raw.subtotal) || itemsSubtotal);
  const tax = round2(safeNumber(raw.tax));
  const discount = round2(safeNumber(raw.discount));
  // A zero tax on a non-zero subtotal is a genuine 0% — lab work is VAT-exempt —
  // so only a subtotal we could not work out leaves the rate unknown.
  const taxRate = subtotal > 0 ? (tax > 0 ? round2((tax / subtotal) * 100) : 0) : null;

  const paidAmount = round2(
    raw.paidAmount != null && safeNumber(raw.paidAmount) > 0
      ? safeNumber(raw.paidAmount)
      : status.key === 'paid'
        ? total
        : 0,
  );
  const balanceDue = round2(Math.max(0, total - paidAmount));

  const insuranceProviderName = raw.insuranceProviderName || null;
  const policyNumber = raw.policyNumber || null;
  const copayAmount = round2(safeNumber(raw.copayAmount));
  const insuranceCoverage = round2(safeNumber(raw.insuranceCoverage));
  const hasInsurance = !!insuranceProviderName;

  // With insurance the patient only ever pays the co-pay; otherwise the ticket.
  const amountDue = hasInsurance && copayAmount > 0 ? copayAmount : total;

  // A paid lab request owns a separate receipt number (REC-...). The money
  // document handed to the patient is that receipt, not the request, so print
  // it here; before this the REC- numbers only ever existed in the database.
  const docNumber = raw.receiptNumber || raw.transactionNumber || raw.orderNumber || 'N/A';
  const docLabel = isOrder
    ? isLab
      ? 'Lab Order #'
      : 'Order #'
    : isLab
      ? 'Lab Receipt #'
      : 'Receipt #';

  // Rows written before the paidAt column exists have no settlement timestamp of
  // their own. For those, the row's own times are the honest stand-in: a POS
  // transaction is inserted at the moment the money is taken, and a lab request
  // is last touched by the payment that flips it to paid.
  const paidAt =
    status.key === 'paid' ? raw.paidAt || raw.updatedAt || raw.createdAt || null : null;

  return {
    isOrder,
    isLab,
    isSalesOrder: isOrderDoc(doc),

    docNumber,
    docLabel,
    title: isLab ? 'Lab' : isOrder ? 'Order' : 'Sale',

    staffLabel: isOrder ? 'Issued by' : 'Cashier',
    staffName: raw.cashierName || raw.createdByName || raw.requestedByName || 'N/A',

    paymentMethod: raw.paymentMethod || null,
    paymentReference: raw.paymentReference || null,

    status,

    items,
    itemCount: items.length,
    totalQuantity,

    subtotal,
    tax,
    taxRate,
    discount,
    total,
    paidAmount,
    balanceDue,

    copayAmount,
    insuranceCoverage,
    insuranceProviderName,
    policyNumber,
    hasInsurance,

    amountDue,

    customerName: raw.customerName || raw.patientName || null,
    customerPhone: raw.customerPhone || raw.patientPhone || null,
    notes: raw.notes || null,
    createdAt: raw.createdAt,
    paidAt,
  };
}

/* ─── Formatting shared by view, print and PDF ──────────────────────── */

/**
 * The VAT percentage to print. Back-deriving it from a tax amount already rounded
 * to two decimals drifts on small tickets — GHS 0.98 on GHS 6.50 reads as 15.08% —
 * so the configured rate wins whenever the derived one sits within that rounding
 * distance of it. A genuinely different rate still prints as itself.
 */
export function receiptTaxRate(n: NormalizedDocument, configured?: number | null): number {
  if (n.taxRate == null) return configured ?? 15;
  if (configured == null || n.subtotal <= 0) return n.taxRate;
  const tolerance = (0.5 / n.subtotal) * 100;
  return Math.abs(n.taxRate - configured) <= tolerance ? configured : n.taxRate;
}

export function formatDocumentDate(value?: string): string {
  return formatDateWith(value, false);
}

/**
 * The same stamp with seconds. A receipt timestamp needs them: two slips printed
 * in the same minute would otherwise carry identical times, which is no help when
 * a customer disputes one of them.
 */
export function formatDocumentDateTime(value?: string | null): string {
  return formatDateWith(value, true);
}

function formatDateWith(value: string | null | undefined, withSeconds: boolean): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

/**
 * Every screen that shows a payment method needs the same names, and the charts
 * need shorter ones that fit a narrow column. Both live here so a new provider
 * is added in one place instead of in five switch statements.
 */
interface PaymentMethodMeta {
  full: string;
  short: string;
  /** Theme token names, without the `var()` wrapper, so callers can build tints too. */
  color: string;
  tint: string;
  icon: LucideIcon;
}

const PAYMENT_METHODS: Record<string, PaymentMethodMeta> = {
  cash: { full: 'Cash', short: 'Cash', color: '--color-success', tint: '--color-success-light', icon: Banknote },
  card: { full: 'Card', short: 'Card', color: '--color-info', tint: '--color-info-light', icon: CreditCard },
  mtn: { full: 'MTN Mobile Money', short: 'MTN MoMo', color: '--color-warning', tint: '--color-warning-light', icon: Smartphone },
  vodafone: { full: 'Vodafone Cash', short: 'Vodafone', color: '--color-danger', tint: '--color-danger-light', icon: Smartphone },
  airteltigo: { full: 'AirtelTigo Money', short: 'AirtelTigo', color: '--color-accent', tint: '--color-accent-light', icon: Smartphone },
  insurance: { full: 'Insurance / NHIS', short: 'Insurance', color: '--color-role-lab', tint: '--color-role-lab-bg', icon: ShieldCheck },
  refund: { full: 'Refund', short: 'Refund', color: '--color-text-secondary', tint: '--color-bg-subtle', icon: Undo2 },
};

export function paymentMethodKey(method?: string | null): string {
  return (method || '').toLowerCase().replace(/[\s-]/g, '');
}

/** Icon, colour and label for any method the API can return, known or not. */
export function paymentMethodMeta(method?: string | null): PaymentMethodMeta & { key: string } {
  const key = paymentMethodKey(method);
  const known = PAYMENT_METHODS[key];
  if (known) return { ...known, key };
  const spaced = (method || 'unknown').replace(/_/g, ' ');
  const label = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return {
    key,
    full: method ? label : 'Not recorded',
    short: label,
    color: '--color-text-secondary',
    tint: '--color-bg-subtle',
    icon: Wallet,
  };
}

export function formatPaymentMethod(
  method?: string | null,
  style: 'full' | 'short' = 'full',
): string {
  if (!method) return 'N/A';
  return paymentMethodMeta(method)[style];
}

// src/components/ReceiptModal.tsx
import React, { forwardRef } from 'react';
import { X, Printer, Download, AlertTriangle } from 'lucide-react';
import { Transaction, SalesOrder, LabTransaction } from '../types';
import { useAppStore } from '../store';

/* ─── Types ─────────────────────────────────────────────────────────── */

type PrintableDoc = Transaction | SalesOrder | LabServiceOrder;
type ReceiptMode = 'receipt' | 'order';

interface ReceiptModalProps {
  /** Preferred prop. Use this. */
  doc?: PrintableDoc;
  /** Backwards-compat alias for `doc`. Used by older callers. */
  transaction?: Transaction;
  mode?: ReceiptMode;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  onPrint: () => void;
}

interface ReceiptContentProps {
  doc: PrintableDoc;
  mode: ReceiptMode;
  customerName?: string;
  customerPhone?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value: any): string => safeNumber(value).toFixed(2);

const isLabOrder = (doc: PrintableDoc): doc is LabServiceOrder =>
  !!doc && typeof doc === 'object' && 'tests' in doc;

const isOrderDoc = (doc: PrintableDoc): boolean =>
  !!doc && typeof doc === 'object' && 'orderNumber' in doc;

/**
 * Normalizes any transaction / sales order / lab order into a
 * single shape the receipt renderer can consume.
 */
function normalizeDoc(doc: PrintableDoc, mode: ReceiptMode) {
  if (!doc) return null;

  const isOrder = mode === 'order' || isOrderDoc(doc);

  // Document number & label
  const docNumber =
    (doc as any).transactionNumber ||
    (doc as any).orderNumber ||
    'N/A';
  const docLabel = isOrder
    ? (isLabOrder(doc) ? 'Lab Order #' : 'Order #')
    : 'Receipt #';

  // Staff line
  const staffLabel = isOrder ? 'Issued by' : 'Cashier';
  const staffName =
    (doc as any).cashierName ||
    (doc as any).createdByName ||
    'N/A';

  // Payment (only meaningful on receipts)
  const paymentMethod = isOrder ? null : (doc as any).paymentMethod;
  const paymentReference = isOrder ? null : (doc as any).paymentReference;

  // Items — unify CartItem[] (POS) and LabServiceOrderTest[]
  const rawItems: any[] = isLabOrder(doc)
    ? ((doc as LabTransaction).labTests || (doc as any).tests || [])
    : ((doc as any).items || []);

  const items = rawItems.map((it: any, index: number) => {
    // Lab test
    if (isLabOrder(doc)) {
      const qty = safeNumber(it.quantity) || 1;
      const price = safeNumber(it.testPrice);
      return {
        key: `lab-${index}`,
        name: it.testType || 'Lab Test',
        quantity: qty,
        unitPrice: price,
        total: price * qty,
      };
    }
    // POS item
    const qty = safeNumber(it.quantity);
    const price = safeNumber(it.unitPrice);
    return {
      key: it.cartId || `item-${index}`,
      name: it?.product?.name || it?.productName || 'Item',
      quantity: qty,
      unitPrice: price,
      total: safeNumber(it.total) || (price * qty),
    };
  });

  // Totals — fall back to copayAmount when insurance
  const subtotal = safeNumber((doc as any).subtotal);
  const tax = safeNumber((doc as any).tax);
  const discount = safeNumber((doc as any).discount);
  const total = safeNumber((doc as any).total);
  const copayAmount = safeNumber((doc as any).copayAmount);
  const insuranceCoverage = safeNumber((doc as any).insuranceCoverage);
  const insuranceProviderName = (doc as any).insuranceProviderName || null;
  const policyNumber = (doc as any).policyNumber || null;

  // Amount actually payable by the patient
  const amountDue = insuranceProviderName && copayAmount > 0
    ? copayAmount
    : total;

  // Customer / patient
  const displayCustomerName =
    (doc as any).customerName ||
    (doc as any).patientName ||
    null;
  const displayCustomerPhone =
    (doc as any).customerPhone ||
    (doc as any).patientPhone ||
    null;

  return {
    isOrder,
    isLab: isLabOrder(doc),
    docNumber,
    docLabel,
    staffLabel,
    staffName,
    paymentMethod,
    paymentReference,
    items,
    subtotal,
    tax,
    discount,
    total,
    copayAmount,
    insuranceCoverage,
    insuranceProviderName,
    policyNumber,
    amountDue,
    customerName: displayCustomerName,
    customerPhone: displayCustomerPhone,
    createdAt: (doc as any).createdAt,
  };
}

/* ─── Tabular number helper ─────────────────────────────────────────── */

const Num: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>
);

/* ═══════════════════════════════════════════════════════════════════════
   RECEIPT CONTENT — Professional 80mm thermal layout
   Supports both receipt mode (paid) and order mode (awaiting payment)
   ═══════════════════════════════════════════════════════════════════════ */
export const ReceiptContent = forwardRef<
  HTMLDivElement,
  ReceiptContentProps & { transaction?: Transaction }
>(({ doc, mode, transaction, customerName, customerPhone }, ref) => {
  const { company } = useAppStore();

  // Backwards-compat: if only `transaction` is passed, treat it as the doc
  const actualDoc = doc || (transaction as PrintableDoc);
  const normalized = actualDoc ? normalizeDoc(actualDoc, mode) : null;

  const displayCustomerName =
    customerName || normalized?.customerName || undefined;
  const displayCustomerPhone =
    customerPhone || normalized?.customerPhone || undefined;

  if (!normalized) {
    return (
      <div ref={ref} style={{ padding: 20, textAlign: 'center' }}>
        <p>No document data available.</p>
      </div>
    );
  }

  const {
    isOrder,
    docNumber,
    docLabel,
    staffLabel,
    staffName,
    paymentMethod,
    paymentReference,
    items,
    subtotal,
    tax,
    discount,
    total,
    insuranceCoverage,
    insuranceProviderName,
    policyNumber,
    amountDue,
    createdAt,
  } = normalized;

  const hasItems = items.length > 0;

  const displayTaxRate = (() => {
    if (subtotal > 0 && tax) {
      return Math.round((tax / subtotal) * 100 * 100) / 100;
    }
    return company?.receiptSettings?.taxRate ?? 15;
  })();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  /* ─── Styles ──────────────────────────────────────────────────── */
  const receiptStyles = {
    container: {
      width: '72mm',
      margin: '0 auto',
      padding: '3mm 2mm',
      fontFamily: "'Courier New', 'SF Mono', 'Consolas', monospace",
      fontSize: '8.5pt',
      lineHeight: 1.5,
      background: '#ffffff',
      color: '#1a1a1a',
    } as React.CSSProperties,

    header: {
      textAlign: 'center' as const,
      borderBottom: '2px solid #1a1a1a',
      paddingBottom: '3mm',
      marginBottom: '2.5mm',
    } as React.CSSProperties,

    companyName: {
      fontSize: '14pt',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      color: '#1a1a1a',
    } as React.CSSProperties,

    companyTagline: {
      fontSize: '7pt',
      color: '#666',
      marginTop: '0.5mm',
      letterSpacing: '1px',
    } as React.CSSProperties,

    companyDetails: {
      fontSize: '6.5pt',
      color: '#888',
      marginTop: '1mm',
      lineHeight: 1.4,
    } as React.CSSProperties,

    row: {
      display: 'flex' as const,
      justifyContent: 'space-between' as const,
      padding: '0.3mm 0',
      fontSize: '8pt',
    } as React.CSSProperties,

    divider: {
      borderTop: '1px dashed #999',
      margin: '1.5mm 0',
    } as React.CSSProperties,

    dividerDouble: {
      borderTop: '2px solid #1a1a1a',
      margin: '1.5mm 0',
    } as React.CSSProperties,

    itemsHeader: {
      display: 'flex' as const,
      fontWeight: 700,
      borderBottom: '2px solid #1a1a1a',
      paddingBottom: '0.5mm',
      marginBottom: '1mm',
      fontSize: '7.5pt',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: '#333',
    } as React.CSSProperties,

    itemRow: {
      display: 'flex' as const,
      padding: '0.4mm 0',
      borderBottom: '1px dotted #e0e0e0',
      fontSize: '8pt',
    } as React.CSSProperties,

    itemRowLast: {
      display: 'flex' as const,
      padding: '0.4mm 0',
      fontSize: '8pt',
    } as React.CSSProperties,

    itemName: {
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      color: '#1a1a1a',
    } as React.CSSProperties,

    itemQty: {
      width: '20px',
      textAlign: 'center' as const,
      color: '#555',
      fontWeight: 500,
    } as React.CSSProperties,

    itemPrice: {
      width: '38px',
      textAlign: 'right' as const,
      color: '#555',
    } as React.CSSProperties,

    itemTotal: {
      width: '40px',
      textAlign: 'right' as const,
      fontWeight: 600,
      color: '#1a1a1a',
    } as React.CSSProperties,

    totals: {
      marginTop: '1.5mm',
      paddingTop: '1.5mm',
      borderTop: '2px solid #1a1a1a',
    } as React.CSSProperties,

    totalFinal: {
      fontSize: '12pt',
      fontWeight: 800,
      borderTop: '3px double #1a1a1a',
      paddingTop: '1mm',
      marginTop: '0.5mm',
      color: '#1a1a1a',
    } as React.CSSProperties,

    footer: {
      textAlign: 'center' as const,
      marginTop: '3mm',
      paddingTop: '2.5mm',
      borderTop: '2px solid #1a1a1a',
      fontSize: '6.5pt',
      color: '#888',
      lineHeight: 1.6,
    } as React.CSSProperties,

    customerBox: {
      border: '1px solid #ccc',
      padding: '1.5mm',
      margin: '1.5mm 0',
      fontSize: '7.5pt',
      background: '#f9f9f9',
      borderRadius: '2px',
    } as React.CSSProperties,

    customerLabel: {
      fontWeight: 700,
      fontSize: '6.5pt',
      textTransform: 'uppercase' as const,
      color: '#666',
      marginBottom: '0.5mm',
      letterSpacing: '0.5px',
    } as React.CSSProperties,

    paymentBadge: {
      display: 'inline-block',
      padding: '0.3mm 2mm',
      borderRadius: '2px',
      fontSize: '7pt',
      fontWeight: 600,
      background: '#1a1a1a',
      color: '#ffffff',
      letterSpacing: '0.5px',
    } as React.CSSProperties,

    paidBadge: {
      display: 'inline-block',
      padding: '0.3mm 2mm',
      borderRadius: '2px',
      fontSize: '6.5pt',
      fontWeight: 600,
      background: '#e8f5e9',
      color: '#2e7d32',
      letterSpacing: '0.5px',
    } as React.CSSProperties,

    pendingBadge: {
      display: 'inline-block',
      padding: '0.3mm 2mm',
      borderRadius: '2px',
      fontSize: '6.5pt',
      fontWeight: 700,
      background: '#fff3cd',
      color: '#856404',
      letterSpacing: '0.5px',
    } as React.CSSProperties,

    warningBanner: {
      border: '2px solid #856404',
      background: '#fff3cd',
      color: '#856404',
      padding: '1.5mm',
      margin: '2mm 0',
      textAlign: 'center' as const,
      fontSize: '7.5pt',
      fontWeight: 700,
      letterSpacing: '0.5px',
    } as React.CSSProperties,

    insuranceBox: {
      border: '1px dashed #666',
      padding: '1.5mm',
      margin: '1.5mm 0',
      fontSize: '7.5pt',
      background: '#f5f5f5',
    } as React.CSSProperties,
  };

  return (
    <div ref={ref} style={receiptStyles.container}>
      {/* ─── HEADER ─────────────────────────────────────── */}
      <div style={receiptStyles.header}>
        <div style={receiptStyles.companyName}>
          {company?.name || 'PHARMACY POS'}
        </div>
        <div style={receiptStyles.companyTagline}>
          {company?.receiptSettings?.header || 'Your Trusted Pharmacy'}
        </div>
        <div style={receiptStyles.companyDetails}>
          {company?.address?.street && <div>{company.address.street}</div>}
          {company?.address?.city && (
            <div>
              {company.address.city}
              {company?.address?.state ? `, ${company.address.state}` : ''}
              {company?.address?.zipCode ? ` ${company.address.zipCode}` : ''}
            </div>
          )}
          {company?.contact?.phone && <div>📞 {company.contact.phone}</div>}
          {company?.contact?.email && <div>✉ {company.contact.email}</div>}
        </div>
        {/* Document-type label */}
        <div
          style={{
            fontSize: '8pt',
            fontWeight: 700,
            letterSpacing: '2px',
            marginTop: '1.5mm',
            color: isOrder ? '#856404' : '#1a1a1a',
          }}
        >
          {isOrder ? '⟪ ORDER SLIP ⟫' : '⟪ OFFICIAL RECEIPT ⟫'}
        </div>
      </div>

      {/* ─── ORDER NOTICE BANNER (only in order mode) ───── */}
      {isOrder && (
        <div style={receiptStyles.warningBanner}>
          ⚠ NOT A RECEIPT
          <div style={{ fontSize: '6.5pt', fontWeight: 500, marginTop: '0.5mm' }}>
            Pay at the cashier desk to complete this order
          </div>
        </div>
      )}

      {/* ─── DOCUMENT INFO ──────────────────────────────── */}
      <div>
        <div style={receiptStyles.row}>
          <span>📋 {docLabel}</span>
          <Num style={{ fontWeight: 700 }}>{docNumber}</Num>
        </div>
        <div style={receiptStyles.row}>
          <span>📅 Date</span>
          <Num>{formatDate(createdAt)}</Num>
        </div>
        <div style={receiptStyles.row}>
          <span>👤 {staffLabel}</span>
          <span style={{ fontWeight: 500 }}>{staffName}</span>
        </div>

        {/* Payment row: show method on receipts, PENDING on orders */}
        {isOrder ? (
          <div style={receiptStyles.row}>
            <span>💳 Payment</span>
            <span style={receiptStyles.pendingBadge}>PENDING</span>
          </div>
        ) : (
          <>
            <div style={receiptStyles.row}>
              <span>💳 Payment</span>
              <span style={receiptStyles.paymentBadge}>
                {(paymentMethod || 'N/A').toUpperCase()}
              </span>
            </div>
            {paymentReference && (
              <div style={receiptStyles.row}>
                <span>🆔 Ref</span>
                <Num style={{ fontSize: '7.5pt' }}>{paymentReference}</Num>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── CUSTOMER ──────────────────────────────────── */}
      {(displayCustomerName || displayCustomerPhone) && (
        <div style={receiptStyles.customerBox}>
          <div style={receiptStyles.customerLabel}>👤 Customer Details</div>
          {displayCustomerName && (
            <div style={receiptStyles.row}>
              <span>Name</span>
              <span style={{ fontWeight: 500 }}>{displayCustomerName}</span>
            </div>
          )}
          {displayCustomerPhone && (
            <div style={receiptStyles.row}>
              <span>Phone</span>
              <Num style={{ fontWeight: 500 }}>{displayCustomerPhone}</Num>
            </div>
          )}
        </div>
      )}

      {/* ─── DIVIDER ───────────────────────────────────── */}
      <div style={receiptStyles.dividerDouble} />

      {/* ─── ITEMS ─────────────────────────────────────── */}
      <div style={receiptStyles.itemsHeader}>
        <span style={receiptStyles.itemName}>Item</span>
        <span style={receiptStyles.itemQty}>Qty</span>
        <span style={receiptStyles.itemPrice}>Price</span>
        <span style={receiptStyles.itemTotal}>Total</span>
      </div>

      {hasItems ? (
        <div>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <div
                key={item.key}
                style={isLast ? receiptStyles.itemRowLast : receiptStyles.itemRow}
              >
                <span style={receiptStyles.itemName}>{item.name}</span>
                <span style={receiptStyles.itemQty}>{item.quantity}</span>
                <span style={receiptStyles.itemPrice}>
                  {formatCurrency(item.unitPrice)}
                </span>
                <span style={receiptStyles.itemTotal}>
                  {formatCurrency(item.total)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2mm', color: '#999' }}>
          No items on this document
        </div>
      )}

      {/* ─── TOTALS ────────────────────────────────────── */}
      <div style={receiptStyles.totals}>
        <div style={receiptStyles.row}>
          <span>Subtotal</span>
          <span>GHS {formatCurrency(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div style={{ ...receiptStyles.row, color: '#2e7d32' }}>
            <span>Discount</span>
            <span>- GHS {formatCurrency(discount)}</span>
          </div>
        )}

        <div style={receiptStyles.row}>
          <span>VAT ({displayTaxRate}%)</span>
          <span>GHS {formatCurrency(tax)}</span>
        </div>

        {/* Insurance breakdown (if applicable) */}
        {insuranceProviderName && (
          <div style={receiptStyles.insuranceBox}>
            <div style={{ fontWeight: 700, marginBottom: '0.5mm' }}>
              🛡 {insuranceProviderName}
            </div>
            {policyNumber && (
              <div style={receiptStyles.row}>
                <span>Policy</span>
                <Num>{policyNumber}</Num>
              </div>
            )}
            <div style={receiptStyles.row}>
              <span>Insurance covers</span>
              <span>GHS {formatCurrency(insuranceCoverage)}</span>
            </div>
          </div>
        )}

        {/* Final line: "Amount Due" on orders, "TOTAL" on receipts */}
        <div style={{ ...receiptStyles.row, ...receiptStyles.totalFinal }}>
          <span>{isOrder ? 'AMOUNT DUE' : 'TOTAL'}</span>
          <span>GHS {formatCurrency(amountDue)}</span>
        </div>

        {isOrder && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '7pt',
              color: '#856404',
              marginTop: '1mm',
              fontStyle: 'italic',
            }}
          >
            Final amount confirmed by cashier on payment
          </div>
        )}
      </div>

      {/* ─── STATUS BADGE ──────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: '1.5mm' }}>
        {isOrder ? (
          <span style={receiptStyles.pendingBadge}>⏳ AWAITING PAYMENT</span>
        ) : (
          <span style={receiptStyles.paidBadge}>✓ PAID</span>
        )}
      </div>

      {/* ─── FOOTER ────────────────────────────────────── */}
      <div style={receiptStyles.footer}>
        {isOrder ? (
          <>
            <div style={{ fontSize: '8pt', fontWeight: 700, color: '#856404' }}>
              ⚠ PLEASE PROCEED TO CASHIER
            </div>
            <div style={{ marginTop: '0.5mm', color: '#856404' }}>
              Present this slip to complete payment
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '8pt', fontWeight: 600, color: '#333' }}>
              Thank You for Your Patronage!
            </div>
            <div style={{ marginTop: '0.5mm' }}>
              Items sold are not returnable or exchangeable
            </div>
          </>
        )}

        {company?.receiptSettings?.footer && (
          <div
            style={{
              marginTop: '0.5mm',
              fontWeight: 600,
              color: '#1a1a1a',
              fontSize: '7pt',
            }}
          >
            {company.receiptSettings.footer}
          </div>
        )}

        <div style={{ marginTop: '1mm', fontSize: '6pt', color: '#aaa' }}>
          {company?.name || 'Pharmacy POS'} • {new Date().getFullYear()}
        </div>
        <div style={{ fontSize: '6pt', color: '#bbb', marginTop: '0.3mm' }}>
          — END OF {isOrder ? 'ORDER SLIP' : 'RECEIPT'} —
        </div>
      </div>
    </div>
  );
});

ReceiptContent.displayName = 'ReceiptContent';

/* ═══════════════════════════════════════════════════════════════════════
   RECEIPT MODAL
   ═══════════════════════════════════════════════════════════════════════ */
export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  doc,
  transaction,
  mode = 'receipt',
  customerName,
  customerPhone,
  onClose,
  onPrint,
}) => {
  const { company } = useAppStore();

  // Resolve which doc we're rendering
  const actualDoc = doc || (transaction as PrintableDoc);
  const normalized = actualDoc ? normalizeDoc(actualDoc, mode) : null;
  const isOrder = mode === 'order' || (normalized?.isOrder ?? false);

  const displayCustomerName =
    customerName || normalized?.customerName || undefined;
  const displayCustomerPhone =
    customerPhone || normalized?.customerPhone || undefined;

  /* ─── Download as PDF / Print-to-file ─────────────────────────── */
  const handleDownload = async () => {
    if (!normalized) return;

    try {
      const n = normalized;
      const displayTaxRate =
        n.subtotal > 0 && n.tax
          ? Math.round((n.tax / n.subtotal) * 100 * 100) / 100
          : company?.receiptSettings?.taxRate ?? 15;

      const bannerHTML = n.isOrder
        ? `<div class="warning-banner">
            ⚠ NOT A RECEIPT
            <div style="font-size:6.5pt;font-weight:500;margin-top:0.5mm;">
              Pay at the cashier desk to complete this order
            </div>
          </div>`
        : '';

      const itemRows = n.items.length
        ? n.items
          .map(
            (item, index) => `
          <div class="${index === n.items.length - 1 ? 'item-row-last' : 'item-row'}">
            <span class="item-name">${item.name}</span>
            <span class="item-qty tabular">${item.quantity}</span>
            <span class="item-price tabular">${item.unitPrice.toFixed(2)}</span>
            <span class="item-total tabular">${item.total.toFixed(2)}</span>
          </div>`
          )
          .join('')
        : '<div style="text-align:center;padding:2mm;color:#999;">No items</div>';

      const insuranceHTML = n.insuranceProviderName
        ? `<div class="insurance-box">
            <div style="font-weight:700;margin-bottom:0.5mm;">🛡 ${n.insuranceProviderName}</div>
            ${n.policyNumber ? `<div class="row"><span>Policy</span><span class="tabular">${n.policyNumber}</span></div>` : ''}
            <div class="row"><span>Insurance covers</span><span>GHS ${n.insuranceCoverage.toFixed(2)}</span></div>
          </div>`
        : '';

      const paymentHTML = n.isOrder
        ? `<div class="row"><span>💳 Payment</span><span class="pending-badge">PENDING</span></div>`
        : `<div class="row"><span>💳 Payment</span><span class="payment-badge">${(n.paymentMethod || 'N/A').toUpperCase()}</span></div>
           ${n.paymentReference ? `<div class="row"><span>🆔 Ref</span><span class="tabular" style="font-size:7.5pt;">${n.paymentReference}</span></div>` : ''}`;

      const customerHTML = (displayCustomerName || displayCustomerPhone)
        ? `<div class="customer-box">
            <div class="customer-label">👤 Customer Details</div>
            ${displayCustomerName ? `<div class="row"><span>Name</span><span style="font-weight:500;">${displayCustomerName}</span></div>` : ''}
            ${displayCustomerPhone ? `<div class="row"><span>Phone</span><span class="tabular" style="font-weight:500;">${displayCustomerPhone}</span></div>` : ''}
          </div>`
        : '';

      const footerHTML = n.isOrder
        ? `<div style="font-size:8pt;font-weight:700;color:#856404;">⚠ PLEASE PROCEED TO CASHIER</div>
           <div style="margin-top:0.5mm;color:#856404;">Present this slip to complete payment</div>`
        : `<div style="font-size:8pt;font-weight:600;color:#333;">Thank You for Your Patronage!</div>
           <div style="margin-top:0.5mm;">Items sold are not returnable or exchangeable</div>`;

      const receiptContent = `<!DOCTYPE html>
<html>
<head>
  <title>${n.isOrder ? 'Order Slip' : 'Receipt'} - ${n.docNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 8.5pt;
      margin: 0 auto;
      max-width: 72mm;
      padding: 3mm 2mm;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
    }
    .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 3mm; margin-bottom: 2.5mm; }
    .company-name { font-size: 14pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
    .company-tagline { font-size: 7pt; color: #666; margin-top: 0.5mm; letter-spacing: 1px; }
    .company-details { font-size: 6.5pt; color: #888; margin-top: 1mm; line-height: 1.4; }
    .doc-type { font-size: 8pt; font-weight: 700; letter-spacing: 2px; margin-top: 1.5mm; ${n.isOrder ? 'color: #856404;' : 'color: #1a1a1a;'} }
    .divider { border-top: 1px dashed #999; margin: 1.5mm 0; }
    .divider-double { border-top: 2px solid #1a1a1a; margin: 1.5mm 0; }
    .row { display: flex; justify-content: space-between; padding: 0.3mm 0; font-size: 8pt; }
    .items-header { display: flex; font-weight: 700; border-bottom: 2px solid #1a1a1a; padding-bottom: 0.5mm; margin-bottom: 1mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #333; }
    .item-row { display: flex; padding: 0.4mm 0; border-bottom: 1px dotted #e0e0e0; font-size: 8pt; }
    .item-row-last { display: flex; padding: 0.4mm 0; font-size: 8pt; }
    .item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1a1a1a; }
    .item-qty { width: 20px; text-align: center; color: #555; font-weight: 500; }
    .item-price { width: 38px; text-align: right; color: #555; }
    .item-total { width: 40px; text-align: right; font-weight: 600; color: #1a1a1a; }
    .totals { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 2px solid #1a1a1a; }
    .total-final { font-size: 12pt; font-weight: 800; border-top: 3px double #1a1a1a; padding-top: 1mm; margin-top: 0.5mm; }
    .footer { text-align: center; margin-top: 3mm; padding-top: 2.5mm; border-top: 2px solid #1a1a1a; font-size: 6.5pt; color: #888; line-height: 1.6; }
    .customer-box { border: 1px solid #ccc; padding: 1.5mm; margin: 1.5mm 0; font-size: 7.5pt; background: #f9f9f9; border-radius: 2px; }
    .customer-label { font-weight: 700; font-size: 6.5pt; text-transform: uppercase; color: #666; margin-bottom: 0.5mm; letter-spacing: 0.5px; }
    .payment-badge { display: inline-block; padding: 0.3mm 2mm; border-radius: 2px; font-size: 7pt; font-weight: 600; background: #1a1a1a; color: #ffffff; letter-spacing: 0.5px; }
    .paid-badge { display: inline-block; padding: 0.3mm 2mm; border-radius: 2px; font-size: 6.5pt; font-weight: 600; background: #e8f5e9; color: #2e7d32; letter-spacing: 0.5px; }
    .pending-badge { display: inline-block; padding: 0.3mm 2mm; border-radius: 2px; font-size: 6.5pt; font-weight: 700; background: #fff3cd; color: #856404; letter-spacing: 0.5px; }
    .warning-banner { border: 2px solid #856404; background: #fff3cd; color: #856404; padding: 1.5mm; margin: 2mm 0; text-align: center; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.5px; }
    .insurance-box { border: 1px dashed #666; padding: 1.5mm; margin: 1.5mm 0; font-size: 7.5pt; background: #f5f5f5; }
    .tabular { font-variant-numeric: tabular-nums; }
    @media print { body { margin: 0; padding: 3mm 2mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company?.name || 'PHARMACY POS'}</div>
    <div class="company-tagline">${company?.receiptSettings?.header || 'Your Trusted Pharmacy'}</div>
    <div class="company-details">
      ${company?.address?.street ? `<div>${company.address.street}</div>` : ''}
      ${company?.address?.city ? `<div>${company.address.city}${company?.address?.state ? `, ${company.address.state}` : ''} ${company?.address?.zipCode || ''}</div>` : ''}
      ${company?.contact?.phone ? `<div>📞 ${company.contact.phone}</div>` : ''}
      ${company?.contact?.email ? `<div>✉ ${company.contact.email}</div>` : ''}
    </div>
    <div class="doc-type">${n.isOrder ? '⟪ ORDER SLIP ⟫' : '⟪ OFFICIAL RECEIPT ⟫'}</div>
  </div>

  ${bannerHTML}

  <div class="row"><span>📋 ${n.docLabel}</span><span class="tabular" style="font-weight:700;">${n.docNumber}</span></div>
  <div class="row"><span>📅 Date</span><span class="tabular">${new Date(n.createdAt).toLocaleString()}</span></div>
  <div class="row"><span>👤 ${n.staffLabel}</span><span style="font-weight:500;">${n.staffName}</span></div>
  ${paymentHTML}

  ${customerHTML}

  <div class="divider-double"></div>

  <div class="items-header">
    <span class="item-name">Item</span>
    <span class="item-qty">Qty</span>
    <span class="item-price">Price</span>
    <span class="item-total">Total</span>
  </div>

  ${itemRows}

  <div class="divider-double"></div>

  <div class="totals tabular">
    <div class="row"><span>Subtotal</span><span>GHS ${n.subtotal.toFixed(2)}</span></div>
    ${n.discount > 0 ? `<div class="row" style="color:#2e7d32;"><span>Discount</span><span>- GHS ${n.discount.toFixed(2)}</span></div>` : ''}
    <div class="row"><span>VAT (${displayTaxRate}%)</span><span>GHS ${n.tax.toFixed(2)}</span></div>
    ${insuranceHTML}
    <div class="row total-final"><span>${n.isOrder ? 'AMOUNT DUE' : 'TOTAL'}</span><span>GHS ${n.amountDue.toFixed(2)}</span></div>
    ${n.isOrder ? `<div style="text-align:center;font-size:7pt;color:#856404;margin-top:1mm;font-style:italic;">Final amount confirmed by cashier on payment</div>` : ''}
  </div>

  <div style="text-align:center;margin-top:1.5mm;">
    ${n.isOrder
          ? '<span class="pending-badge">⏳ AWAITING PAYMENT</span>'
          : '<span class="paid-badge">✓ PAID</span>'}
  </div>

  <div class="footer">
    ${footerHTML}
    ${company?.receiptSettings?.footer ? `<div style="margin-top:0.5mm;font-weight:600;color:#1a1a1a;font-size:7pt;">${company.receiptSettings.footer}</div>` : ''}
    <div style="margin-top:1mm;font-size:6pt;color:#aaa;">${company?.name || 'Pharmacy POS'} • ${new Date().getFullYear()}</div>
    <div style="font-size:6pt;color:#bbb;margin-top:0.3mm;">— END OF ${n.isOrder ? 'ORDER SLIP' : 'RECEIPT'} —</div>
  </div>
</body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=320,height=600');
      if (!printWindow) {
        alert('Please allow pop-ups to save the document as PDF.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(receiptContent);
      printWindow.document.close();

      printWindow.focus();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
      printWindow.onafterprint = () => printWindow.close();
    } catch (error) {
      console.error('Save as PDF failed:', error);
      alert('Failed to save PDF. Please try again.');
    }
  };

  /* ─── Empty state ─────────────────────────────────────────────── */
  if (!actualDoc || !normalized) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal)' }}
        onClick={onClose}
      >
        <div
          className="rounded-[12px] p-6 text-center"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: 360,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            No document data available.
          </p>
          <button
            onClick={onClose}
            className="text-[0.82rem] font-medium px-4 py-2 rounded-[8px] cursor-pointer"
            style={{
              background: 'var(--color-bg-subtle)',
              color: 'var(--color-text-primary)',
              border: 'none',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /* ─── Main modal ──────────────────────────────────────────────── */
  const title = isOrder
    ? (normalized.isLab ? 'Lab Order Slip' : 'Order Slip')
    : 'Receipt';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 no-print"
      style={{
        background: 'var(--color-bg-overlay)',
        zIndex: 'var(--z-modal)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-[12px] overflow-hidden"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: 400,
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <div className="flex items-center gap-2">
            {isOrder && (
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'var(--color-warning-light)',
                  color: 'var(--color-warning-text)',
                }}
                title="Awaiting payment"
              >
                <AlertTriangle style={{ width: 14, height: 14 }} />
              </div>
            )}
            <div>
              <h2 className="text-[0.82rem] font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
                {title}
              </h2>
              <p className="text-[0.68rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {normalized.docNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer transition-colors duration-100"
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto"
          style={{
            padding: '16px',
            maxHeight: 'calc(90vh - 110px)',
            background: '#ffffff',
          }}
        >
          <ReceiptContent
            doc={actualDoc}
            mode={mode}
            customerName={displayCustomerName}
            customerPhone={displayCustomerPhone}
          />
        </div>

        {/* Footer actions */}
        <div
          className="flex gap-2 p-3"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <button
            onClick={onPrint || handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 text-[0.78rem] font-medium py-2 rounded-[8px] cursor-pointer"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              border: 'none',
            }}
          >
            <Printer className="h-3.5 w-3.5" />
            Print {isOrder ? 'Slip' : 'Receipt'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 text-[0.78rem] font-medium py-2 rounded-[8px] cursor-pointer"
            style={{
              background: 'var(--color-bg-subtle)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};

ReceiptModal.displayName = 'ReceiptModal';
// src/components/ReceiptModal.tsx
import React, { forwardRef } from 'react';
import { AlertTriangle, Download, Printer } from 'lucide-react';
import { useAppStore } from '../store';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  formatAmount,
  formatDocumentDate,
  formatDocumentDateTime,
  formatMoney,
  formatPaymentMethod,
  normalizeDocument,
  receiptTaxRate,
  type DocumentMode,
  type PrintableDoc,
} from '../utils/document';
import { buildReceiptHtml, printDocument } from '../utils/receiptHtml';
import { describePrintOutcome, getReceiptPaper, savePdf } from '../utils/printEngine';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ReceiptModalProps {
  doc?: PrintableDoc;
  /** Backwards-compat alias for `doc`. Used by older callers. */
  transaction?: PrintableDoc;
  mode?: DocumentMode;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  /** Overrides the print action. */
  onPrint?: () => void;
}

interface ReceiptContentProps {
  doc: PrintableDoc;
  mode: DocumentMode;
  customerName?: string;
  customerPhone?: string;
}

/* ─── Tabular number helper ─────────────────────────────────────────── */

const slipLabelStyle: React.CSSProperties = {
  fontSize: '7.5pt',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  color: '#666',
};

const Num: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{children}</span>
);

/* ═══════════════════════════════════════════════════════════════════════
   RECEIPT CONTENT — the 80mm thermal slip itself, for preview and printing
   Supports both receipt mode (paid) and order mode (awaiting payment)
   ═══════════════════════════════════════════════════════════════════════ */
export const ReceiptContent = forwardRef<HTMLDivElement, ReceiptContentProps>(
  ({ doc, mode, customerName, customerPhone }, ref) => {
    const { company } = useAppStore();

    const n = normalizeDocument(doc, mode);

    const displayCustomerName = customerName || n?.customerName || undefined;
    const displayCustomerPhone = customerPhone || n?.customerPhone || undefined;

    if (!n) {
      return (
        <div ref={ref} style={{ padding: 20, textAlign: 'center' }}>
          <p>No document data available.</p>
        </div>
      );
    }

    const hasItems = n.items.length > 0;

    const displayTaxRate = receiptTaxRate(n, company?.receiptSettings?.taxRate);

    /* ─── Styles ──────────────────────────────────────────────────── */
    const receiptStyles = {
      container: {
        width: `${getReceiptPaper().contentMm}mm`,
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

      otherBadge: {
        display: 'inline-block',
        padding: '0.3mm 2mm',
        borderRadius: '2px',
        fontSize: '6.5pt',
        fontWeight: 700,
        background: '#eeeeee',
        color: '#444',
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

    // An unpaid order hands over a reference slip, not a receipt: the order
    // number and date are all the cashier needs to pull it up. The preview shows
    // exactly what buildOrderSlipHtml prints — no items, money or customer data.
    if (n.isOrder) {
      return (
        <div
          ref={ref}
          className="print-content"
          style={{ ...receiptStyles.container, fontSize: '9pt', padding: '4mm 2mm' }}
        >
          <div style={receiptStyles.header}>
            <div style={receiptStyles.companyName}>{company?.name || 'PHARMACY POS'}</div>
            <div style={receiptStyles.companyTagline}>
              {company?.receiptSettings?.header || 'Your Trusted Pharmacy'}
            </div>
            <div style={receiptStyles.companyDetails}>
              {company?.address?.street && <div>{company.address.street}</div>}
              {company?.address?.city && (
                <div>
                  {company.address.city}
                  {company.address.state ? `, ${company.address.state}` : ''}
                  {company.address.zipCode ? ` ${company.address.zipCode}` : ''}
                </div>
              )}
              {company?.contact?.phone && <div>📞 {company.contact.phone}</div>}
            </div>
            <div
              style={{
                fontSize: '9pt',
                fontWeight: 700,
                letterSpacing: '3px',
                marginTop: '2mm',
                color: '#856404',
              }}
            >
              ⟪ ORDER SLIP ⟫
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '4mm 0 2mm' }}>
            <div style={slipLabelStyle}>{n.docLabel}</div>
            <Num
              style={{
                display: 'block',
                fontSize: '22pt',
                fontWeight: 800,
                letterSpacing: '1px',
                margin: '1mm 0 4mm',
                wordBreak: 'break-all',
              }}
            >
              {n.docNumber}
            </Num>
            <div style={slipLabelStyle}>Date</div>
            <Num style={{ display: 'block', fontSize: '11pt', fontWeight: 600, marginTop: '1mm' }}>
              {formatDocumentDate(n.createdAt)}
            </Num>
          </div>

          <div
            style={{
              border: '2px solid #856404',
              background: '#fff3cd',
              color: '#856404',
              padding: '2mm',
              margin: '3mm 0',
              textAlign: 'center',
              fontSize: '8.5pt',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            ⚠ NOT A RECEIPT
            <div style={{ fontSize: '7pt', fontWeight: 500, marginTop: '1mm' }}>
              Pay at the cashier desk to complete this order
            </div>
          </div>

          <div style={{ ...receiptStyles.footer, fontSize: '7pt', lineHeight: 1.7 }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#856404' }}>
              ⚠ PLEASE PROCEED TO CASHIER
            </div>
            <div>Present this slip to complete payment</div>
            <div style={{ marginTop: '1.5mm', fontSize: '6pt', color: '#bbb' }}>
              — END OF ORDER SLIP —
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="print-content" style={receiptStyles.container}>
        {/* ─── HEADER ─────────────────────────────────────── */}
        <div style={receiptStyles.header}>
          <div style={receiptStyles.companyName}>{company?.name || 'PHARMACY POS'}</div>
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
          <div
            style={{
              fontSize: '8pt',
              fontWeight: 700,
              letterSpacing: '2px',
              marginTop: '1.5mm',
              color: '#1a1a1a',
            }}
          >
            ⟪ OFFICIAL RECEIPT ⟫
          </div>
        </div>

        {/* ─── DOCUMENT INFO ──────────────────────────────── */}
        <div>
          <div style={receiptStyles.row}>
            <span>📋 {n.docLabel}</span>
            <Num style={{ fontWeight: 700 }}>{n.docNumber}</Num>
          </div>
          <div style={receiptStyles.row}>
            <span>📅 Date</span>
            <Num>{formatDocumentDate(n.createdAt)}</Num>
          </div>
          <div style={receiptStyles.row}>
            <span>👤 {n.staffLabel}</span>
            <span style={{ fontWeight: 500 }}>{n.staffName}</span>
          </div>

          {/* A SalesOrder row carries no payment method, so an older paid
              order reprints without one rather than with a fake "N/A". */}
          {n.paymentMethod && (
            <div style={receiptStyles.row}>
              <span>💳 Payment</span>
              <span style={receiptStyles.paymentBadge}>
                {formatPaymentMethod(n.paymentMethod, 'short').toUpperCase()}
              </span>
            </div>
          )}
          {n.paymentReference && (
            <div style={receiptStyles.row}>
              <span>🆔 Ref</span>
              <Num style={{ fontSize: '7.5pt' }}>{n.paymentReference}</Num>
            </div>
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
            {n.items.map((item, index) => (
              <div
                key={item.key}
                style={
                  index === n.items.length - 1
                    ? receiptStyles.itemRowLast
                    : receiptStyles.itemRow
                }
              >
                <span style={receiptStyles.itemName}>{item.name}{item.unitLabel ? ` (${item.unitLabel})` : ''}</span>
                <span style={receiptStyles.itemQty}>{item.quantity}</span>
                <span style={receiptStyles.itemPrice}>{formatMoney(item.unitPrice)}</span>
                <span style={receiptStyles.itemTotal}>{formatMoney(item.total)}</span>
              </div>
            ))}
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
            <span>{formatAmount(n.subtotal)}</span>
          </div>

          {n.discount > 0 && (
            <div style={{ ...receiptStyles.row, color: '#2e7d32' }}>
              <span>Discount</span>
              <span>- {formatAmount(n.discount)}</span>
            </div>
          )}

          <div style={receiptStyles.row}>
            <span>VAT ({displayTaxRate}%)</span>
            <span>{formatAmount(n.tax)}</span>
          </div>

          {n.insuranceProviderName && (
            <div style={receiptStyles.insuranceBox}>
              <div style={{ fontWeight: 700, marginBottom: '0.5mm' }}>
                🛡 {n.insuranceProviderName}
              </div>
              {n.policyNumber && (
                <div style={receiptStyles.row}>
                  <span>Policy</span>
                  <Num>{n.policyNumber}</Num>
                </div>
              )}
              <div style={receiptStyles.row}>
                <span>Insurance covers</span>
                <span>{formatAmount(n.insuranceCoverage)}</span>
              </div>
            </div>
          )}

          <div style={{ ...receiptStyles.row, ...receiptStyles.totalFinal }}>
            <span>TOTAL</span>
            <span>{formatAmount(n.total)}</span>
          </div>

          {n.hasInsurance && (
            <div style={receiptStyles.row}>
              <span>Patient co-pay</span>
              <span style={{ fontWeight: 700 }}>{formatAmount(n.amountDue)}</span>
            </div>
          )}
        </div>

        {/* ─── STATUS BADGE ──────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '1.5mm' }}>
          <span style={n.status.key === 'paid' ? receiptStyles.paidBadge : receiptStyles.otherBadge}>
            {n.status.key === 'paid' ? '✓ PAID' : n.status.label.toUpperCase()}
          </span>
        </div>

        {/* ─── FOOTER ────────────────────────────────────── */}
        <div style={receiptStyles.footer}>
          <div style={{ fontSize: '8pt', fontWeight: 600, color: '#333' }}>
            Thank You for Your Patronage!
          </div>
          <div style={{ marginTop: '0.5mm' }}>
            Items sold are not returnable or exchangeable
          </div>

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

          {/* Same settlement stamp the printed slip carries. */}
          {n.paidAt && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '7pt',
                color: '#333',
                marginTop: '1.5mm',
                paddingTop: '1mm',
                borderTop: '1px dashed #999',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>PAID</span>
              <span>{formatDocumentDateTime(n.paidAt)}</span>
            </div>
          )}

          <div style={{ fontSize: '6pt', color: '#bbb', marginTop: '0.3mm' }}>
            — END OF RECEIPT —
          </div>
        </div>
      </div>
    );
  },
);

ReceiptContent.displayName = 'ReceiptContent';

/* ═══════════════════════════════════════════════════════════════════════
   RECEIPT MODAL — preview of the printable slip. Callers that want the user
   to READ a transaction should open DocumentDetailsModal instead.
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

  const actualDoc = doc || transaction;
  const normalized = normalizeDocument(actualDoc, mode);
  const isOrder = normalized?.isOrder ?? false;

  const handlePrint = async () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (!actualDoc) return;
    const message = describePrintOutcome(
      await printDocument(actualDoc, { company, mode, customerName, customerPhone }),
    );
    if (message) alert(message);
  };

  if (!normalized || !actualDoc) {
    return (
      <Modal open onClose={onClose} title="Receipt" size="sm">
        <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
          No document data available.
        </p>
      </Modal>
    );
  }

  const title = isOrder ? (normalized.isLab ? 'Lab Order Slip' : 'Order Slip') : 'Receipt';

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={normalized.docNumber}
      size="sm"
      icon={isOrder ? <AlertTriangle style={{ width: 14, height: 14 }} /> : undefined}
      iconTone={isOrder ? 'warning' : 'accent'}
      footer={
        <>
          <Button variant="primary" size="md" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print {isOrder ? 'Slip' : 'Receipt'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={async () => {
              const html = buildReceiptHtml(actualDoc, {
                company,
                mode,
                customerName,
                customerPhone,
              });
              const message = describePrintOutcome(
                await savePdf(html, {
                  profile: 'receipt',
                  title: `${title} ${normalized.docNumber}`,
                  fileName: `${title.replace(/\s+/g, '-')}-${normalized.docNumber}.pdf`,
                }),
              );
              if (message) alert(message);
            }}
          >
            <Download className="h-4 w-4" />
            Save PDF
          </Button>
        </>
      }
    >
      <div style={{ background: '#ffffff', margin: -16, padding: '16px 0' }}>
        <ReceiptContent
          doc={actualDoc}
          mode={mode}
          customerName={customerName}
          customerPhone={customerPhone}
        />
      </div>
    </Modal>
  );
};

ReceiptModal.displayName = 'ReceiptModal';

// src/components/ReceiptModal.tsx
import React, { forwardRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Transaction, CartItem } from '../types';
import { useAppStore } from '../store';

interface ReceiptModalProps {
  transaction: Transaction;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  onPrint: () => void;
}

interface ReceiptContentProps {
  transaction: Transaction;
  customerName?: string;
  customerPhone?: string;
}

/* Tabular number helper for receipt alignment */
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{children}</span>
);

// ============================================================
// RECEIPT CONTENT - Professional Design for 80mm Thermal Printers
// ============================================================
export const ReceiptContent = forwardRef<HTMLDivElement, ReceiptContentProps>(
  ({ transaction, customerName, customerPhone }, ref) => {
    const { company } = useAppStore();

    const getItems = (): CartItem[] => {
      if (!transaction) return [];

      if (Array.isArray(transaction.items)) {
        return transaction.items.map((item: any) => {
          if (item.product && typeof item.product === 'object') {
            return item;
          }
          return {
            ...item,
            product: {
              id: item.productId || item.id || '',
              name: item.productName || item.name || 'Unknown Product',
              sku: item.productSku || item.sku || '',
              category: item.productCategory || item.category || '',
              unitPrice: item.unitPrice || 0,
            }
          };
        });
      }

      if (transaction.items && typeof transaction.items === 'object') {
        if (Array.isArray((transaction.items as any).data)) {
          return (transaction.items as any).data.map((item: any) => {
            if (item.product && typeof item.product === 'object') {
              return item;
            }
            return {
              ...item,
              product: {
                id: item.productId || item.id || '',
                name: item.productName || item.name || 'Unknown Product',
                sku: item.productSku || item.sku || '',
                category: item.productCategory || item.category || '',
                unitPrice: item.unitPrice || 0,
              }
            };
          });
        }
      }

      return [];
    };

    const items = getItems();
    const hasItems = items.length > 0;

    const displayTaxRate = (() => {
      const sub = Number(transaction?.subtotal);
      const tx = Number(transaction?.tax);
      if (sub > 0 && !isNaN(tx)) return Math.round((tx / sub) * 100 * 100) / 100;
      return company?.receiptSettings?.taxRate ?? 15;
    })();

    const formatDate = (dateString: string) => {
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

    const safeNumber = (value: any): number => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    const formatCurrency = (value: any): string => {
      return safeNumber(value).toFixed(2);
    };

    const displayCustomerName = customerName || transaction?.customerName;
    const displayCustomerPhone = customerPhone || transaction?.customerPhone;

    if (!transaction) {
      return (
        <div ref={ref} style={{ padding: 20, textAlign: 'center' }}>
          <p>No transaction data available.</p>
        </div>
      );
    }

    // Professional receipt styles for 80mm thermal printers
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
      },
      header: {
        textAlign: 'center' as const,
        borderBottom: '2px solid #1a1a1a',
        paddingBottom: '3mm',
        marginBottom: '2.5mm',
      },
      companyName: {
        fontSize: '14pt',
        fontWeight: 800,
        textTransform: 'uppercase' as const,
        letterSpacing: '2px',
        color: '#1a1a1a',
      },
      companyTagline: {
        fontSize: '7pt',
        color: '#666',
        marginTop: '0.5mm',
        letterSpacing: '1px',
      },
      companyDetails: {
        fontSize: '6.5pt',
        color: '#888',
        marginTop: '1mm',
        lineHeight: 1.4,
      },
      row: {
        display: 'flex' as const,
        justifyContent: 'space-between' as const,
        padding: '0.3mm 0',
        fontSize: '8pt',
      },
      rowBold: {
        display: 'flex' as const,
        justifyContent: 'space-between' as const,
        padding: '0.3mm 0',
        fontSize: '8pt',
        fontWeight: 700,
      },
      divider: {
        borderTop: '1px dashed #999',
        margin: '1.5mm 0',
      },
      dividerDouble: {
        borderTop: '2px solid #1a1a1a',
        margin: '1.5mm 0',
      },
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
      },
      itemRow: {
        display: 'flex' as const,
        padding: '0.4mm 0',
        borderBottom: '1px dotted #e0e0e0',
        fontSize: '8pt',
      },
      itemRowLast: {
        display: 'flex' as const,
        padding: '0.4mm 0',
        fontSize: '8pt',
      },
      itemName: {
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        color: '#1a1a1a',
      },
      itemQty: {
        width: '20px',
        textAlign: 'center' as const,
        color: '#555',
        fontWeight: 500,
      },
      itemPrice: {
        width: '38px',
        textAlign: 'right' as const,
        color: '#555',
      },
      itemTotal: {
        width: '40px',
        textAlign: 'right' as const,
        fontWeight: 600,
        color: '#1a1a1a',
      },
      totals: {
        marginTop: '1.5mm',
        paddingTop: '1.5mm',
        borderTop: '2px solid #1a1a1a',
      },
      totalFinal: {
        fontSize: '12pt',
        fontWeight: 800,
        borderTop: '3px double #1a1a1a',
        paddingTop: '1mm',
        marginTop: '0.5mm',
        color: '#1a1a1a',
      },
      footer: {
        textAlign: 'center' as const,
        marginTop: '3mm',
        paddingTop: '2.5mm',
        borderTop: '2px solid #1a1a1a',
        fontSize: '6.5pt',
        color: '#888',
        lineHeight: 1.6,
      },
      customerBox: {
        border: '1px solid #ccc',
        padding: '1.5mm',
        margin: '1.5mm 0',
        fontSize: '7.5pt',
        background: '#f9f9f9',
        borderRadius: '2px',
      },
      customerLabel: {
        fontWeight: 700,
        fontSize: '6.5pt',
        textTransform: 'uppercase' as const,
        color: '#666',
        marginBottom: '0.5mm',
        letterSpacing: '0.5px',
      },
      paymentBadge: {
        display: 'inline-block',
        padding: '0.3mm 2mm',
        borderRadius: '2px',
        fontSize: '7pt',
        fontWeight: 600,
        background: '#1a1a1a',
        color: '#ffffff',
        letterSpacing: '0.5px',
      },
      statusBadge: {
        display: 'inline-block',
        padding: '0.3mm 2mm',
        borderRadius: '2px',
        fontSize: '6.5pt',
        fontWeight: 600,
        background: '#e8f5e9',
        color: '#2e7d32',
        letterSpacing: '0.5px',
      },
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
        </div>

        {/* ─── RECEIPT INFO ───────────────────────────────── */}
        <div>
          <div style={receiptStyles.row}>
            <span>📋 Receipt #</span>
            <Num style={{ fontWeight: 700 }}>{transaction.transactionNumber || 'N/A'}</Num>
          </div>
          <div style={receiptStyles.row}>
            <span>📅 Date</span>
            <Num>{formatDate(transaction.createdAt)}</Num>
          </div>
          <div style={receiptStyles.row}>
            <span>👤 Cashier</span>
            <span style={{ fontWeight: 500 }}>{transaction.cashierName || 'N/A'}</span>
          </div>
          <div style={receiptStyles.row}>
            <span>💳 Payment</span>
            <span style={receiptStyles.paymentBadge}>
              {(transaction.paymentMethod || 'N/A').toUpperCase()}
            </span>
          </div>
          {transaction.paymentReference && (
            <div style={receiptStyles.row}>
              <span>🆔 Ref</span>
              <Num style={{ fontSize: '7.5pt' }}>{transaction.paymentReference}</Num>
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

        {/* ─── DIVIDER ───────────────────────────────────── */}
        <div style={receiptStyles.dividerDouble} />

        {/* ─── ITEMS HEADER ──────────────────────────────── */}
        <div style={receiptStyles.itemsHeader}>
          <span style={receiptStyles.itemName}>Item</span>
          <span style={receiptStyles.itemQty}>Qty</span>
          <span style={receiptStyles.itemPrice}>Price</span>
          <span style={receiptStyles.itemTotal}>Total</span>
        </div>

        {/* ─── ITEMS LIST ────────────────────────────────── */}
        {hasItems ? (
          <div>
            {items.map((item, index) => {
              const productName = item?.product?.name || item?.productName || 'Unknown';
              const quantity = safeNumber(item?.quantity);
              const unitPrice = safeNumber(item?.unitPrice);
              const total = safeNumber(item?.total);
              const isLast = index === items.length - 1;

              return (
                <div key={item.cartId || index} style={isLast ? receiptStyles.itemRowLast : receiptStyles.itemRow}>
                  <span style={receiptStyles.itemName}>{productName}</span>
                  <span style={receiptStyles.itemQty}>{quantity}</span>
                  <span style={receiptStyles.itemPrice}>{formatCurrency(unitPrice)}</span>
                  <span style={receiptStyles.itemTotal}>{formatCurrency(total)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2mm', color: '#999' }}>
            No items on this receipt
          </div>
        )}

        {/* ─── TOTALS ────────────────────────────────────── */}
        <div style={receiptStyles.totals}>
          <div style={receiptStyles.row}>
            <span>Subtotal</span>
            <span>GHS {formatCurrency(transaction.subtotal)}</span>
          </div>
          {safeNumber(transaction.discount) > 0 && (
            <div style={{ ...receiptStyles.row, color: '#2e7d32' }}>
              <span>Discount</span>
              <span>- GHS {formatCurrency(transaction.discount)}</span>
            </div>
          )}
          <div style={receiptStyles.row}>
            <span>VAT ({displayTaxRate}%)</span>
            <span>GHS {formatCurrency(transaction.tax)}</span>
          </div>
          <div style={{ ...receiptStyles.row, ...receiptStyles.totalFinal }}>
            <span>TOTAL</span>
            <span>GHS {formatCurrency(transaction.total)}</span>
          </div>
        </div>

        {/* ─── STATUS ────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '1.5mm' }}>
          <span style={receiptStyles.statusBadge}>✓ PAID</span>
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
            <div style={{ marginTop: '0.5mm', fontWeight: 600, color: '#1a1a1a', fontSize: '7pt' }}>
              {company.receiptSettings.footer}
            </div>
          )}
          <div style={{ marginTop: '1mm', fontSize: '6pt', color: '#aaa' }}>
            {company?.name || 'Pharmacy POS'} • {new Date().getFullYear()}
          </div>
          <div style={{ fontSize: '6pt', color: '#bbb', marginTop: '0.3mm' }}>
            — END OF RECEIPT —
          </div>
        </div>
      </div>
    );
  }
);

ReceiptContent.displayName = 'ReceiptContent';

// ============================================================
// RECEIPT MODAL
// ============================================================
export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  customerName,
  customerPhone,
  onClose,
  onPrint,
}) => {
  const { company } = useAppStore();

  const getTaxRate = () => {
    const sub = Number(transaction?.subtotal);
    const tx = Number(transaction?.tax);
    if (sub > 0 && !isNaN(tx)) return Math.round((tx / sub) * 100 * 100) / 100;
    return company?.receiptSettings?.taxRate ?? 15;
  };

  const handleDownload = async () => {
    try {
      const displayTaxRate = getTaxRate();

      const receiptContent = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${transaction?.transactionNumber || 'N/A'}</title>
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
    .header { 
      text-align: center; 
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 3mm;
      margin-bottom: 2.5mm;
    }
    .company-name { 
      font-size: 14pt; 
      font-weight: 800; 
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .company-tagline {
      font-size: 7pt;
      color: #666;
      margin-top: 0.5mm;
      letter-spacing: 1px;
    }
    .company-details {
      font-size: 6.5pt;
      color: #888;
      margin-top: 1mm;
      line-height: 1.4;
    }
    .divider { border-top: 1px dashed #999; margin: 1.5mm 0; }
    .divider-double { border-top: 2px solid #1a1a1a; margin: 1.5mm 0; }
    .row { display: flex; justify-content: space-between; padding: 0.3mm 0; font-size: 8pt; }
    .row-bold { display: flex; justify-content: space-between; padding: 0.3mm 0; font-size: 8pt; font-weight: 700; }
    .items-header { 
      display: flex; 
      font-weight: 700;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 0.5mm;
      margin-bottom: 1mm;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #333;
    }
    .item-row { 
      display: flex; 
      padding: 0.4mm 0; 
      border-bottom: 1px dotted #e0e0e0;
      font-size: 8pt;
    }
    .item-row-last { 
      display: flex; 
      padding: 0.4mm 0; 
      font-size: 8pt;
    }
    .item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1a1a1a; }
    .item-qty { width: 20px; text-align: center; color: #555; font-weight: 500; }
    .item-price { width: 38px; text-align: right; color: #555; }
    .item-total { width: 40px; text-align: right; font-weight: 600; color: #1a1a1a; }
    .totals { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 2px solid #1a1a1a; }
    .total-final { 
      font-size: 12pt; 
      font-weight: 800; 
      border-top: 3px double #1a1a1a;
      padding-top: 1mm;
      margin-top: 0.5mm;
    }
    .footer { 
      text-align: center; 
      margin-top: 3mm; 
      padding-top: 2.5mm;
      border-top: 2px solid #1a1a1a;
      font-size: 6.5pt; 
      color: #888;
      line-height: 1.6;
    }
    .customer-box {
      border: 1px solid #ccc;
      padding: 1.5mm;
      margin: 1.5mm 0;
      font-size: 7.5pt;
      background: #f9f9f9;
      border-radius: 2px;
    }
    .customer-label { 
      font-weight: 700; 
      font-size: 6.5pt; 
      text-transform: uppercase;
      color: #666;
      margin-bottom: 0.5mm;
      letter-spacing: 0.5px;
    }
    .payment-badge {
      display: inline-block;
      padding: 0.3mm 2mm;
      border-radius: 2px;
      font-size: 7pt;
      font-weight: 600;
      background: #1a1a1a;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 0.3mm 2mm;
      border-radius: 2px;
      font-size: 6.5pt;
      font-weight: 600;
      background: #e8f5e9;
      color: #2e7d32;
      letter-spacing: 0.5px;
    }
    .tabular { font-variant-numeric: tabular-nums; }
    @media print {
      body { margin: 0; padding: 3mm 2mm; }
    }
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
  </div>

  <div class="row"><span>📋 Receipt #</span><span class="tabular" style="font-weight:700;">${transaction?.transactionNumber || 'N/A'}</span></div>
  <div class="row"><span>📅 Date</span><span class="tabular">${new Date(transaction?.createdAt).toLocaleString()}</span></div>
  <div class="row"><span>👤 Cashier</span><span style="font-weight:500;">${transaction?.cashierName || 'N/A'}</span></div>
  <div class="row"><span>💳 Payment</span><span class="payment-badge">${(transaction?.paymentMethod || 'N/A').toUpperCase()}</span></div>
  ${transaction?.paymentReference ? `<div class="row"><span>🆔 Ref</span><span class="tabular" style="font-size:7.5pt;">${transaction.paymentReference}</span></div>` : ''}

  ${(customerName || transaction?.customerName || customerPhone || transaction?.customerPhone) ? `
  <div class="customer-box">
    <div class="customer-label">👤 Customer Details</div>
    ${(customerName || transaction?.customerName) ? `<div class="row"><span>Name</span><span style="font-weight:500;">${customerName || transaction?.customerName}</span></div>` : ''}
    ${(customerPhone || transaction?.customerPhone) ? `<div class="row"><span>Phone</span><span class="tabular" style="font-weight:500;">${customerPhone || transaction?.customerPhone}</span></div>` : ''}
  </div>
  ` : ''}

  <div class="divider-double"></div>

  <div class="items-header">
    <span class="item-name">Item</span>
    <span class="item-qty">Qty</span>
    <span class="item-price">Price</span>
    <span class="item-total">Total</span>
  </div>

  ${(transaction?.items && transaction.items.length > 0) ? transaction.items.map((item: any, index: number) => {
        const isLast = index === transaction.items.length - 1;
        return `
    <div class="${isLast ? 'item-row-last' : 'item-row'}">
      <span class="item-name">${item?.product?.name || item?.productName || 'Unknown'}</span>
      <span class="item-qty tabular">${item?.quantity || 0}</span>
      <span class="item-price tabular">${(Number(item?.unitPrice) || 0).toFixed(2)}</span>
      <span class="item-total tabular">${(Number(item?.total) || 0).toFixed(2)}</span>
    </div>
    `;
      }).join('') : '<div style="text-align:center;padding:2mm;color:#999;">No items</div>'}

  <div class="divider-double"></div>

  <div class="totals tabular">
    <div class="row"><span>Subtotal</span><span>GHS ${(Number(transaction?.subtotal) || 0).toFixed(2)}</span></div>
    ${(Number(transaction?.discount) || 0) > 0 ? `<div class="row" style="color:#2e7d32;"><span>Discount</span><span>- GHS ${(Number(transaction?.discount) || 0).toFixed(2)}</span></div>` : ''}
    <div class="row"><span>VAT (${displayTaxRate}%)</span><span>GHS ${(Number(transaction?.tax) || 0).toFixed(2)}</span></div>
    <div class="row total-final"><span>TOTAL</span><span>GHS ${(Number(transaction?.total) || 0).toFixed(2)}</span></div>
  </div>

  <div style="text-align:center;margin-top:1.5mm;">
    <span class="status-badge">✓ PAID</span>
  </div>

  <div class="footer">
    <div style="font-size:8pt;font-weight:600;color:#333;">Thank You for Your Patronage!</div>
    <div style="margin-top:0.5mm;">Items sold are not returnable or exchangeable</div>
    ${company?.receiptSettings?.footer ? `<div style="margin-top:0.5mm;font-weight:600;color:#1a1a1a;font-size:7pt;">${company.receiptSettings.footer}</div>` : ''}
    <div style="margin-top:1mm;font-size:6pt;color:#aaa;">${company?.name || 'Pharmacy POS'} • ${new Date().getFullYear()}</div>
    <div style="font-size:6pt;color:#bbb;margin-top:0.3mm;">— END OF RECEIPT —</div>
  </div>
</body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=320,height=600');
      if (!printWindow) {
        alert('Please allow pop-ups to save the receipt as PDF.');
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

  if (!transaction) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{
          background: 'var(--color-bg-overlay)',
          zIndex: 'var(--z-modal)',
        }}
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
            No transaction data available.
          </p>
          <button
            onClick={onClose}
            className="text-[0.82rem] font-medium px-4 py-2 rounded-[8px] cursor-pointer transition-colors duration-100"
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
          <div>
            <h2 className="text-[0.82rem] font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
              Receipt
            </h2>
            <p className="text-[0.68rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {transaction.transactionNumber || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer transition-colors duration-100"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div
          className="overflow-y-auto"
          style={{
            padding: '16px',
            maxHeight: 'calc(90vh - 110px)',
            background: '#ffffff',
          }}
        >
          <ReceiptContent
            transaction={transaction}
            customerName={customerName}
            customerPhone={customerPhone}
          />
        </div>

        {/* Actions */}
        <div
          className="flex gap-2 p-3"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <button
            onClick={() => {
              console.log('🖨️ Print button clicked');
              onPrint();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 text-[0.78rem] font-medium py-2 rounded-[8px] cursor-pointer transition-colors duration-100"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              border: 'none',
            }}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 text-[0.78rem] font-medium py-2 rounded-[8px] cursor-pointer transition-colors duration-100"
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
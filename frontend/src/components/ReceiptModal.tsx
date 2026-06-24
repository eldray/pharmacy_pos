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

// ─── RECEIPT CONTENT (Print-friendly, no modal wrapper) ──────────────────
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
          if (item.productName && !item.product) {
            return {
              ...item,
              product: {
                id: item.productId || '',
                name: item.productName,
                sku: item.productSku || '',
                category: item.productCategory || '',
                unitPrice: item.unitPrice || 0,
              }
            };
          }
          return item;
        });
      }

      if (transaction.items && typeof transaction.items === 'object') {
        if (Array.isArray((transaction.items as any).data)) {
          return (transaction.items as any).data.map((item: any) => {
            if (item.product && typeof item.product === 'object') {
              return item;
            }
            if (item.productName && !item.product) {
              return {
                ...item,
                product: {
                  id: item.productId || '',
                  name: item.productName,
                  sku: item.productSku || '',
                  category: item.productCategory || '',
                  unitPrice: item.unitPrice || 0,
                }
              };
            }
            return item;
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

    return (
      <div
        ref={ref}
        style={{
          padding: '20px',
          fontFamily: "'Courier New', 'SF Mono', monospace",
          fontSize: '0.72rem',
          lineHeight: 1.4,
          maxWidth: '380px',
          margin: '0 auto',
          background: '#ffffff',
          color: '#000000',
        }}
      >
        {/* Company header */}
        <div
          className="text-center pb-3 mb-3"
          style={{ borderBottom: '1px dashed #ccc' }}
        >
          <div
            className="font-bold uppercase"
            style={{ fontSize: '0.85rem', color: '#000' }}
          >
            {company?.name || 'PHARMACY POS'}
          </div>
          <div
            className="mt-1"
            style={{ fontSize: '0.62rem', color: '#666', lineHeight: 1.3 }}
          >
            {company?.address?.street && <div>{company.address.street}</div>}
            {company?.address?.city && (
              <div>
                {company.address.city}
                {company?.address?.state ? `, ${company.address.state}` : ''}
                {company?.address?.zipCode ? ` ${company.address.zipCode}` : ''}
              </div>
            )}
            {company?.contact?.phone && <div>Tel: {company.contact.phone}</div>}
          </div>
        </div>

        {/* Receipt meta */}
        <div style={{ color: '#666' }}>
          <div className="flex justify-between py-[2px]">
            <span>Receipt:</span>
            <Num>{transaction.transactionNumber || 'N/A'}</Num>
          </div>
          <div className="flex justify-between py-[2px]">
            <span>Date:</span>
            <Num>{formatDate(transaction.createdAt)}</Num>
          </div>
          <div className="flex justify-between py-[2px]">
            <span>Cashier:</span>
            <span>{transaction.cashierName || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-[2px]">
            <span>Payment:</span>
            <span className="uppercase">{transaction.paymentMethod || 'N/A'}</span>
          </div>
          {transaction.paymentReference && (
            <div className="flex justify-between py-[2px]">
              <span>Ref:</span>
              <Num className="text-[0.65rem]">{transaction.paymentReference}</Num>
            </div>
          )}
        </div>

        {/* Customer */}
        {(displayCustomerName || displayCustomerPhone) && (
          <div
            className="my-3 p-2.5"
            style={{
              border: '1px solid #ccc',
              borderRadius: 6,
            }}
          >
            <div
              className="font-bold mb-1.5"
              style={{ fontSize: '0.6rem', color: '#666' }}
            >
              CUSTOMER
            </div>
            <div style={{ color: '#666' }}>
              {displayCustomerName && (
                <div className="flex justify-between py-[1px]">
                  <span>Name:</span>
                  <span className="font-medium" style={{ color: '#000' }}>
                    {displayCustomerName}
                  </span>
                </div>
              )}
              {displayCustomerPhone && (
                <div className="flex justify-between py-[1px]">
                  <span>Phone:</span>
                  <Num className="font-medium" style={{ color: '#000' }}>
                    {displayCustomerPhone}
                  </Num>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div
          className="flex font-bold py-2 mb-1"
          style={{
            borderBottom: '1px solid #000',
            color: '#000',
          }}
        >
          <span style={{ flex: 1 }}>Item</span>
          <span style={{ width: 28, textAlign: 'center' }}>Qty</span>
          <span style={{ width: 55, textAlign: 'right' }}>Price</span>
          <span style={{ width: 55, textAlign: 'right' }}>Total</span>
        </div>

        {hasItems ? (
          <div>
            {items.map((item, index) => {
              const productName = item?.product?.name || item?.productName || 'Unknown';
              const quantity = safeNumber(item?.quantity);
              const unitPrice = safeNumber(item?.unitPrice);
              const total = safeNumber(item?.total);

              return (
                <div
                  key={item.cartId || index}
                  className="flex py-[3px]"
                  style={{ borderBottom: index < items.length - 1 ? '1px dotted #ddd' : 'none' }}
                >
                  <span className="truncate" style={{ flex: 1, color: '#666' }}>
                    {productName}
                  </span>
                  <span style={{ width: 28, textAlign: 'center', color: '#666' }}>
                    {quantity}
                  </span>
                  <span style={{ width: 55, textAlign: 'right', color: '#666' }}>
                    {formatCurrency(unitPrice)}
                  </span>
                  <span
                    style={{ width: 55, textAlign: 'right', fontWeight: 600, color: '#000' }}
                  >
                    {formatCurrency(total)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="text-center py-3"
            style={{ color: '#999' }}
          >
            No items
          </div>
        )}

        {/* Totals */}
        <div
          className="mt-3 pt-2"
          style={{ borderTop: '1px dashed #ccc' }}
        >
          <div
            className="flex justify-between py-[2px]"
            style={{ color: '#666' }}
          >
            <span>Subtotal:</span>
            <span>GHS {formatCurrency(transaction.subtotal)}</span>
          </div>
          {safeNumber(transaction.discount) > 0 && (
            <div
              className="flex justify-between py-[2px]"
              style={{ color: '#006600' }}
            >
              <span>Discount:</span>
              <span>-GHS {formatCurrency(transaction.discount)}</span>
            </div>
          )}
          <div
            className="flex justify-between py-[2px]"
            style={{ color: '#666' }}
          >
            <span>VAT {displayTaxRate}%:</span>
            <span>GHS {formatCurrency(transaction.tax)}</span>
          </div>
          <div
            className="flex justify-between pt-2 mt-1 font-bold"
            style={{
              fontSize: '0.85rem',
              borderTop: '2px solid #000',
              color: '#000',
            }}
          >
            <span>TOTAL:</span>
            <span>GHS {formatCurrency(transaction.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center mt-4 pt-3"
          style={{
            borderTop: '1px dashed #ccc',
            fontSize: '0.62rem',
            color: '#666',
          }}
        >
          <div>Thank you for your purchase!</div>
          <div className="mt-1">Keep this receipt for returns.</div>
          {company?.receiptSettings?.footer && (
            <div
              className="mt-2 font-bold"
              style={{ color: '#000' }}
            >
              {company.receiptSettings.footer}
            </div>
          )}
          <div className="mt-2">
            {company?.name || 'Pharmacy POS'} • {new Date().getFullYear()}
          </div>
        </div>
      </div>
    );
  }
);

ReceiptContent.displayName = 'ReceiptContent';

// ─── RECEIPT MODAL (With overlay, for screen display) ────────────────────
export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  customerName,
  customerPhone,
  onClose,
  onPrint,
}) => {
  const { company } = useAppStore();

  const handleDownload = async () => {
    try {
      const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${transaction?.transactionNumber || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 11px; 
      margin: 0 auto;
      max-width: 280px;
      padding: 16px;
      line-height: 1.4;
      color: #000;
    }
    .header { 
      text-align: center; 
      margin-bottom: 12px; 
      border-bottom: 1px dashed #000; 
      padding-bottom: 10px;
    }
    .company-name { 
      font-size: 14px; 
      font-weight: bold; 
      margin-bottom: 4px;
    }
    .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .row-bold { font-weight: bold; }
    .items-header { 
      display: flex; 
      border-bottom: 1px solid #000; 
      padding-bottom: 4px;
      margin-bottom: 4px;
      font-weight: bold;
    }
    .item-row { 
      display: flex; 
      padding: 3px 0; 
      border-bottom: 1px dotted #ccc;
    }
    .item-name { flex: 1; }
    .item-qty { width: 30px; text-align: center; }
    .item-price { width: 55px; text-align: right; }
    .item-total { width: 55px; text-align: right; font-weight: bold; }
    .totals { margin-top: 8px; }
    .total-final { 
      font-size: 14px; 
      font-weight: bold; 
      border-top: 2px solid #000; 
      padding-top: 6px;
      margin-top: 6px;
    }
    .footer { 
      text-align: center; 
      margin-top: 12px; 
      font-size: 9px; 
      color: #666;
    }
    .customer-box {
      border: 1px solid #999;
      padding: 6px;
      margin: 8px 0;
    }
    .customer-label { font-weight: bold; margin-bottom: 3px; font-size: 10px; }
    .tabular { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company?.name || 'PHARMACY POS'}</div>
    <div style="font-size: 9px; line-height: 1.3;">
      ${company?.address?.street ? `<div>${company.address.street}</div>` : ''}
      ${company?.address?.city ? `<div>${company.address.city}${company?.address?.state ? `, ${company.address.state}` : ''} ${company?.address?.zipCode || ''}</div>` : ''}
      ${company?.contact?.phone ? `<div>Tel: ${company.contact.phone}</div>` : ''}
    </div>
  </div>

  <div class="divider"></div>

  <div class="row"><span>Receipt:</span><span class="tabular">${transaction?.transactionNumber || 'N/A'}</span></div>
  <div class="row"><span>Date:</span><span class="tabular">${new Date(transaction?.createdAt).toLocaleString()}</span></div>
  <div class="row"><span>Cashier:</span><span>${transaction?.cashierName || 'N/A'}</span></div>
  <div class="row"><span>Payment:</span><span>${(transaction?.paymentMethod || 'N/A').toUpperCase()}</span></div>
  ${transaction?.paymentReference ? `<div class="row"><span>Ref:</span><span class="tabular">${transaction.paymentReference}</span></div>` : ''}

  ${(customerName || transaction?.customerName || customerPhone || transaction?.customerPhone) ? `
  <div class="customer-box">
    <div class="customer-label">CUSTOMER</div>
    ${(customerName || transaction?.customerName) ? `<div class="row"><span>Name:</span><span>${customerName || transaction?.customerName}</span></div>` : ''}
    ${(customerPhone || transaction?.customerPhone) ? `<div class="row"><span>Phone:</span><span class="tabular">${customerPhone || transaction?.customerPhone}</span></div>` : ''}
  </div>
  ` : ''}

  <div class="divider"></div>

  <div class="items-header">
    <span class="item-name">Item</span>
    <span class="item-qty">Qty</span>
    <span class="item-price">Price</span>
    <span class="item-total">Total</span>
  </div>

  ${transaction?.items?.map((item: any) => `
    <div class="item-row">
      <span class="item-name">${item?.product?.name || item?.productName || 'Unknown'}</span>
      <span class="item-qty tabular">${item?.quantity || 0}</span>
      <span class="item-price tabular">${(item?.unitPrice || 0).toFixed(2)}</span>
      <span class="item-total tabular">${(item?.total || 0).toFixed(2)}</span>
    </div>
  `).join('') || '<div style="text-align: center; padding: 8px; color: #666;">No items</div>'}

  <div class="divider"></div>

  <div class="totals tabular">
    <div class="row"><span>Subtotal:</span><span>GHS ${(transaction?.subtotal || 0).toFixed(2)}</span></div>
    ${(transaction?.discount || 0) > 0 ? `<div class="row" style="color: #006600;"><span>Discount:</span><span>-GHS ${(transaction?.discount || 0).toFixed(2)}</span></div>` : ''}
    <div class="row"><span>VAT ${displayTaxRate}%:</span><span>GHS ${(transaction?.tax || 0).toFixed(2)}</span></div>
    <div class="row total-final"><span>TOTAL:</span><span>GHS ${(transaction?.total || 0).toFixed(2)}</span></div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div style="margin-top: 4px;">Keep this receipt for returns.</div>
    ${company?.receiptSettings?.footer ? `<div style="margin-top: 6px; font-weight: bold; color: #000;">${company.receiptSettings.footer}</div>` : ''}
    <div style="margin-top: 8px;">${company?.name || 'Pharmacy POS'} • ${new Date().getFullYear()}</div>
  </div>
</body>
</html>
      `;

      const blob = new Blob([receiptContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${transaction?.transactionNumber || 'N/A'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
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
          maxWidth: 380,
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
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
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-1.5 text-[0.78rem] font-medium py-2 rounded-[8px] cursor-pointer transition-colors duration-100"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)';
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-border)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

ReceiptModal.displayName = 'ReceiptModal';
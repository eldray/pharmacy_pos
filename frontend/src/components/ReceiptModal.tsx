// src/components/ReceiptModal.tsx
import React from 'react';
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

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  customerName,
  customerPhone,
  onClose,
  onPrint
}) => {
  const { company } = useAppStore();

  // Safe function to get items array
  const getItems = (): CartItem[] => {
    if (!transaction) return [];
    if (Array.isArray(transaction.items)) {
      return transaction.items;
    }
    // If items is not an array, try to get it from a nested property
    if (transaction.items && typeof transaction.items === 'object') {
      // @ts-ignore - Handle case where items might be an object with different structure
      if (Array.isArray(transaction.items.data)) {
        // @ts-ignore
        return transaction.items.data;
      }
    }
    return [];
  };

  const items = getItems();
  const hasItems = items.length > 0;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Safe number formatting
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Use customer name from props or from transaction data
  const displayCustomerName = customerName || transaction?.customerName;
  const displayCustomerPhone = customerPhone || transaction?.customerPhone;

  // PDF download functionality
  const handleDownload = async () => {
    try {
      const receiptContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${transaction?.transactionNumber || 'N/A'}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              margin: 20px; 
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              border-bottom: 1px solid #000; 
              padding-bottom: 10px;
            }
            .company-name { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .receipt-info { 
              margin: 10px 0; 
            }
            .customer-info {
              background: #f8f9fa;
              padding: 8px;
              border-radius: 4px;
              margin: 8px 0;
              border-left: 3px solid #007bff;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
            }
            .items-table th, .items-table td { 
              padding: 4px 2px; 
              text-align: left; 
            }
            .items-table th { 
              border-bottom: 1px solid #000; 
              font-weight: bold;
            }
            .items-table tr td { 
              border-bottom: 1px solid #ddd; 
            }
            .totals { 
              margin-top: 15px; 
              border-top: 1px solid #000; 
              padding-top: 10px;
            }
            .total-row { 
              font-weight: bold; 
              font-size: 14px;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 10px; 
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${company?.name || 'PHARMACY POS'}</div>
            <div>${company?.address?.street || ''}${company?.address?.city ? `, ${company.address.city}` : ''}${company?.address?.state ? `, ${company.address.state}` : ''}${company?.address?.zipCode ? ` ${company.address.zipCode}` : ''}</div>
            <div>${company?.contact?.phone ? `Tel: ${company.contact.phone}` : ''}</div>
          </div>

          <div class="receipt-info">
            <div><strong>Receipt No:</strong> ${transaction?.transactionNumber || 'N/A'}</div>
            <div><strong>Date:</strong> ${formatDate(transaction?.createdAt)}</div>
            <div><strong>Cashier:</strong> ${transaction?.cashierName || 'N/A'}</div>
            <div><strong>Payment:</strong> ${(transaction?.paymentMethod || 'N/A').toUpperCase()}</div>
            ${transaction?.paymentReference ? `<div><strong>Reference:</strong> ${transaction.paymentReference}</div>` : ''}
          </div>

          ${(displayCustomerName || displayCustomerPhone) ? `
          <div class="customer-info">
            <div style="font-weight: bold; margin-bottom: 4px;">CUSTOMER DETAILS</div>
            ${displayCustomerName ? `<div><strong>Name:</strong> ${displayCustomerName}</div>` : ''}
            ${displayCustomerPhone ? `<div><strong>Phone:</strong> ${displayCustomerPhone}</div>` : ''}
          </div>
          ` : ''}

          ${hasItems ? `
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item?.product?.name || 'Unknown Product'}</td>
                  <td class="text-center">${safeNumber(item?.quantity)}</td>
                  <td class="text-right">GHS ${safeNumber(item?.unitPrice).toFixed(2)}</td>
                  <td class="text-right">GHS ${safeNumber(item?.total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : `
          <div style="text-align: center; padding: 10px; color: #666;">
            No items in this transaction
          </div>
          `}

          <div class="totals">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>GHS ${safeNumber(transaction?.subtotal).toFixed(2)}</span>
            </div>
            ${safeNumber(transaction?.discount) > 0 ? `
            <div style="display: flex; justify-content: space-between; color: green;">
              <span>Discount:</span>
              <span>-GHS ${safeNumber(transaction?.discount).toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span>VAT (15%):</span>
              <span>GHS ${safeNumber(transaction?.tax).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;" class="total-row">
              <span>TOTAL:</span>
              <span>GHS ${safeNumber(transaction?.total).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div style="margin-bottom: 8px;">Thank you for your purchase!</div>
            <div style="margin-bottom: 8px;">Please keep this receipt for returns and warranty purposes.</div>
            ${company?.receiptSettings?.footer ? `<div style="font-weight: bold; margin: 10px 0;">${company.receiptSettings.footer}</div>` : ''}
            ${company?.receiptSettings?.header ? `<div style="font-weight: bold; margin: 10px 0;">${company.receiptSettings.header}</div>` : ''}
            <div>${company?.name || 'Pharmacy POS'} • ${new Date().getFullYear()}</div>
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

      alert('Receipt downloaded successfully! You can print it as PDF from your browser.');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try printing the receipt instead.');
    }
  };

  if (!transaction) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-gray-900">No Transaction Data</h3>
            <p className="text-gray-600 mt-2">This receipt cannot be displayed.</p>
            <button
              onClick={onClose}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-300">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">RECEIPT</h2>
              <p className="text-gray-600 text-sm">{transaction.transactionNumber || 'N/A'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-4 space-y-4 font-mono text-sm">
          {/* Company Header */}
          <div className="text-center border-b border-gray-300 pb-3">
            <h1 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
              {company?.name || 'PHARMACY POS'}
            </h1>
            {company?.address && (
              <div className="text-xs text-gray-600 mt-1 leading-tight">
                {company.address.street && <div>{company.address.street}</div>}
                {company.address.city && company.address.state && (
                  <div>{company.address.city}, {company.address.state}</div>
                )}
                {company.address.zipCode && <div>{company.address.zipCode}</div>}
              </div>
            )}
            <div className="text-xs text-gray-600 mt-1">
              {company?.contact?.phone && `Tel: ${company.contact.phone}`}
              {company?.contact?.email && ` | Email: ${company.contact.email}`}
            </div>
          </div>

          {/* Receipt Details */}
          <div className="space-y-2 border-b border-gray-300 pb-3">
            <div className="flex justify-between">
              <span className="font-semibold">Date:</span>
              <span>{formatDate(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Cashier:</span>
              <span>{transaction.cashierName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Payment:</span>
              <span className="uppercase">{transaction.paymentMethod || 'N/A'}</span>
            </div>
          </div>

          {/* Customer Details */}
          {(displayCustomerName || displayCustomerPhone) && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
              <div className="font-semibold text-blue-900 mb-2 text-xs uppercase tracking-wide">
                Customer Details
              </div>
              <div className="space-y-1 text-xs">
                {displayCustomerName && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Name:</span>
                    <span className="text-blue-900 font-semibold">{displayCustomerName}</span>
                  </div>
                )}
                {displayCustomerPhone && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">Phone:</span>
                    <span className="text-blue-900 font-semibold">{displayCustomerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {transaction.paymentReference && (
            <div className="border-b border-gray-300 pb-3">
              <div className="flex justify-between">
                <span className="font-semibold">Reference:</span>
                <span className="text-xs">{transaction.paymentReference}</span>
              </div>
            </div>
          )}

          {/* Items Header */}
          <div className="border-b border-gray-300 pb-2">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wide">
              <span className="w-32">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-16 text-right">Price</span>
              <span className="w-20 text-right">Amount</span>
            </div>
          </div>

          {/* Items List */}
          {hasItems ? (
            <div className="space-y-2 border-b border-gray-300 pb-3">
              {items.map((item, index) => (
                <div key={item.cartId || index} className="flex justify-between text-xs">
                  <div className="w-32 truncate">
                    {item?.product?.name || 'Unknown Product'}
                  </div>
                  <div className="w-8 text-center">
                    {safeNumber(item?.quantity)}
                  </div>
                  <div className="w-16 text-right">
                    GHS {safeNumber(item?.unitPrice).toFixed(2)}
                  </div>
                  <div className="w-20 text-right font-semibold">
                    GHS {safeNumber(item?.total).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 border-b border-gray-300">
              No items in this transaction
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 border-b border-gray-300 pb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>GHS {safeNumber(transaction.subtotal).toFixed(2)}</span>
            </div>
            {safeNumber(transaction.discount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-GHS {safeNumber(transaction.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>VAT (15%):</span>
              <span>GHS {safeNumber(transaction.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2 mt-1">
              <span>TOTAL:</span>
              <span>GHS {safeNumber(transaction.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Messages */}
          <div className="text-center text-xs space-y-2 pt-3 border-t border-gray-300">
            <div className="space-y-1 text-gray-600">
              <div>Thank you for your purchase!</div>
              <div>Please keep this receipt for returns</div>
              <div>and warranty purposes.</div>
            </div>

            {company?.receiptSettings?.footer && (
              <div className="font-semibold text-gray-800 bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-3 mt-2">
                {company.receiptSettings.footer}
              </div>
            )}
            {company?.receiptSettings?.header && (
              <div className="font-semibold text-gray-800 bg-blue-50 border border-blue-200 rounded-lg py-2 px-3">
                {company.receiptSettings.header}
              </div>
            )}

            <div className="text-gray-500 mt-3">
              {company?.name || 'Pharmacy POS'} • {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-2 sticky bottom-0">
          <button
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-all duration-200 text-sm"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-all duration-200 text-sm"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
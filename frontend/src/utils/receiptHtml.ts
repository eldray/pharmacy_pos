// src/utils/receiptHtml.ts
//
// The single 80mm thermal template, as a printable fragment. Everything that
// produces a printed receipt — the "Print" buttons in Orders, Payments and the
// receipt modal, and "Save PDF" — renders from here, so a reprint always matches
// what the till printed the first time. Previously three near-identical copies of
// this markup drifted apart in OrdersPage, PaymentPage and ReceiptModal.
//
// The paper size itself lives in utils/printEngine, not here, so the slip and the
// A4 lab report cannot disagree about how a page is set up.

import type { Company } from '../types';
import {
  formatDocumentDate,
  formatDocumentDateTime,
  formatPaymentMethod,
  normalizeDocument,
  type DocumentMode,
  type PrintableDoc,
} from './document';
import { getReceiptPaper, printFragment, type PrintResult } from './printEngine';
import { safeNumber } from './number';

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (value: unknown): string => safeNumber(value).toFixed(2);

export interface ReceiptHtmlOptions {
  company?: Company | null;
  mode?: DocumentMode;
  customerName?: string;
  customerPhone?: string;
}

export function buildReceiptHtml(
  doc: PrintableDoc,
  { company, mode = 'receipt', customerName, customerPhone }: ReceiptHtmlOptions = {},
): string {
  const n = normalizeDocument(doc, mode);
  if (!n) return '';

  const name = customerName || n.customerName || '';
  const phone = customerPhone || n.customerPhone || '';

  const taxRate = n.taxRate ?? company?.receiptSettings?.taxRate ?? 15;

  const cityLine = company?.address?.city
    ? `${company.address.city}${company.address.state ? `, ${company.address.state}` : ''}${company.address.zipCode ? ` ${company.address.zipCode}` : ''}`
    : '';

  const itemRows = n.items.length
    ? n.items
        .map(
          (item, index) => `
    <div class="${index === n.items.length - 1 ? 'item-row-last' : 'item-row'}">
      <span class="item-name">${esc(item.name)}</span>
      <span class="item-qty tabular">${item.quantity}</span>
      <span class="item-price tabular">${money(item.unitPrice)}</span>
      <span class="item-total tabular">${money(item.total)}</span>
    </div>`,
        )
        .join('')
    : '<div class="empty">No items</div>';

  const insuranceHtml = n.insuranceProviderName
    ? `<div class="insurance-box">
      <div class="strong">🛡 ${esc(n.insuranceProviderName)}</div>
      ${n.policyNumber ? `<div class="row"><span>Policy</span><span class="tabular">${esc(n.policyNumber)}</span></div>` : ''}
      <div class="row"><span>Insurance covers</span><span>GHS ${money(n.insuranceCoverage)}</span></div>
    </div>`
    : '';

  // A SalesOrder row has no payment method of its own — only the transaction
  // created when it was paid does — so reprinting an older order arrives here
  // without one. Better to drop the line than to print "N/A" on a paid receipt.
  const paymentHtml = n.isOrder
    ? '<div class="row"><span>💳 Payment</span><span class="pending-badge">PENDING</span></div>'
    : `${n.paymentMethod ? `<div class="row"><span>💳 Payment</span><span class="payment-badge">${esc(formatPaymentMethod(n.paymentMethod, 'short').toUpperCase())}</span></div>` : ''}
       ${n.paymentReference ? `<div class="row"><span>🆔 Ref</span><span class="tabular ref">${esc(n.paymentReference)}</span></div>` : ''}`;

  const customerHtml = name || phone
    ? `<div class="customer-box">
        <div class="customer-label">👤 Customer Details</div>
        ${name ? `<div class="row"><span>Name</span><span class="medium">${esc(name)}</span></div>` : ''}
        ${phone ? `<div class="row"><span>Phone</span><span class="tabular medium">${esc(phone)}</span></div>` : ''}
      </div>`
    : '';

  const bannerHtml = n.isOrder
    ? `<div class="warning-banner">⚠ NOT A RECEIPT
         <div class="banner-sub">Pay at the cashier desk to complete this order</div>
       </div>`
    : '';

  const statusHtml = n.isOrder
    ? '<span class="pending-badge">⏳ AWAITING PAYMENT</span>'
    : '<span class="paid-badge">✓ PAID</span>';

  const footerLines = n.isOrder
    ? `<div class="foot-lead warn">⚠ PLEASE PROCEED TO CASHIER</div>
       <div class="mt-half warn">Present this slip to complete payment</div>`
    : `<div class="foot-lead">Thank You for Your Patronage!</div>
       <div class="mt-half">Items sold are not returnable or exchangeable</div>`;

  // The moment the money was taken, stamped at the bottom of the slip. An order
  // slip has no payment yet, so it gets no stamp rather than a misleading time.
  const paidStampHtml =
    !n.isOrder && n.paidAt
      ? `<div class="paid-stamp"><span>PAID</span><span class="tabular">${esc(formatDocumentDateTime(n.paidAt))}</span></div>`
      : '';

  return `<style>
    body {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 8.5pt;
      margin: 0 auto;
      max-width: ${getReceiptPaper().contentMm}mm;
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
    .row { display: flex; justify-content: space-between; padding: 0.3mm 0; font-size: 8pt; }
    .items-header { display: flex; font-weight: 700; border-bottom: 2px solid #1a1a1a; padding-bottom: 0.5mm; margin-bottom: 1mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #333; }
    .item-row { display: flex; padding: 0.4mm 0; border-bottom: 1px dotted #e0e0e0; font-size: 8pt; }
    .item-row-last { display: flex; padding: 0.4mm 0; font-size: 8pt; }
    .item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1a1a1a; }
    .item-qty { width: 20px; text-align: center; color: #555; font-weight: 500; }
    .item-price { width: 38px; text-align: right; color: #555; }
    .item-total { width: 40px; text-align: right; font-weight: 600; color: #1a1a1a; }
    .divider-double { border-top: 2px solid #1a1a1a; margin: 1.5mm 0; }
    .totals { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 2px solid #1a1a1a; }
    .total-final { font-size: 12pt; font-weight: 800; border-top: 3px double #1a1a1a; padding-top: 1mm; margin-top: 0.5mm; }
    .footer { text-align: center; margin-top: 3mm; padding-top: 2.5mm; border-top: 2px solid #1a1a1a; font-size: 6.5pt; color: #888; line-height: 1.6; }
    .foot-lead { font-size: 8pt; font-weight: 600; color: #333; }
    .customer-box { border: 1px solid #ccc; padding: 1.5mm; margin: 1.5mm 0; font-size: 7.5pt; background: #f9f9f9; border-radius: 2px; }
    .customer-label { font-weight: 700; font-size: 6.5pt; text-transform: uppercase; color: #666; margin-bottom: 0.5mm; letter-spacing: 0.5px; }
    .payment-badge { display: inline-block; padding: 0.3mm 2mm; border-radius: 2px; font-size: 7pt; font-weight: 600; background: #1a1a1a; color: #ffffff; letter-spacing: 0.5px; }
    .paid-badge { display: inline-block; padding: 0.3mm 2mm; border-radius: 2px; font-size: 6.5pt; font-weight: 600; background: #e8f5e9; color: #2e7d32; letter-spacing: 0.5px; }
    .pending-badge { display: inline-block; padding: 0.3mm 2mm; border-radius: 2px; font-size: 6.5pt; font-weight: 700; background: #fff3cd; color: #856404; letter-spacing: 0.5px; }
    .warning-banner { border: 2px solid #856404; background: #fff3cd; color: #856404; padding: 1.5mm; margin: 2mm 0; text-align: center; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.5px; }
    .banner-sub { font-size: 6.5pt; font-weight: 500; margin-top: 0.5mm; }
    .insurance-box { border: 1px dashed #666; padding: 1.5mm; margin: 1.5mm 0; font-size: 7.5pt; background: #f5f5f5; }
    .discount { color: #2e7d32; }
    .empty { text-align: center; padding: 2mm; color: #999; }
    .tabular { font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; margin-bottom: 0.5mm; }
    .medium { font-weight: 500; }
    .ref { font-size: 7.5pt; }
    .warn { color: #856404; }
    .italic-note { text-align: center; font-size: 7pt; color: #856404; margin-top: 1mm; font-style: italic; }
    .mt-half { margin-top: 0.5mm; }
    .status { text-align: center; margin-top: 1.5mm; }
    .paid-stamp { display: flex; justify-content: space-between; font-size: 7pt; color: #333; margin-top: 1.5mm; padding-top: 1mm; border-top: 1px dashed #999; }
  </style>
  <div class="header">
    <div class="company-name">${esc(company?.name || 'PHARMACY POS')}</div>
    <div class="company-tagline">${esc(company?.receiptSettings?.header || 'Your Trusted Pharmacy')}</div>
    <div class="company-details">
      ${company?.address?.street ? `<div>${esc(company.address.street)}</div>` : ''}
      ${cityLine ? `<div>${esc(cityLine)}</div>` : ''}
      ${company?.contact?.phone ? `<div>📞 ${esc(company.contact.phone)}</div>` : ''}
      ${company?.contact?.email ? `<div>✉ ${esc(company.contact.email)}</div>` : ''}
    </div>
    <div class="doc-type">${n.isOrder ? '⟪ ORDER SLIP ⟫' : '⟪ OFFICIAL RECEIPT ⟫'}</div>
  </div>

  ${bannerHtml}

  <div class="row"><span>📋 ${esc(n.docLabel)}</span><span class="tabular strong">${esc(n.docNumber)}</span></div>
  <div class="row"><span>📅 Date</span><span class="tabular">${esc(formatDocumentDate(n.createdAt))}</span></div>
  <div class="row"><span>👤 ${esc(n.staffLabel)}</span><span class="medium">${esc(n.staffName)}</span></div>
  ${paymentHtml}

  ${customerHtml}

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
    <div class="row"><span>Subtotal</span><span>GHS ${money(n.subtotal)}</span></div>
    ${n.discount > 0 ? `<div class="row discount"><span>Discount</span><span>- GHS ${money(n.discount)}</span></div>` : ''}
    <div class="row"><span>VAT (${taxRate}%)</span><span>GHS ${money(n.tax)}</span></div>
    ${insuranceHtml}
    <div class="row total-final"><span>${n.isOrder ? 'AMOUNT DUE' : 'TOTAL'}</span><span>GHS ${money(n.isOrder ? n.amountDue : n.total)}</span></div>
    ${!n.isOrder && n.hasInsurance ? `<div class="row"><span>Patient co-pay</span><span class="strong">GHS ${money(n.amountDue)}</span></div>` : ''}
    ${n.isOrder ? '<div class="italic-note">Final amount confirmed by cashier on payment</div>' : ''}
  </div>

  <div class="status">${statusHtml}</div>

  <div class="footer">
    ${footerLines}
    ${company?.receiptSettings?.footer ? `<div class="mt-half strong" style="font-size:7pt;color:#1a1a1a;">${esc(company.receiptSettings.footer)}</div>` : ''}
    <div style="margin-top:1mm;font-size:6pt;color:#aaa;">${esc(company?.name || 'Pharmacy POS')} • ${new Date().getFullYear()}</div>
    ${paidStampHtml}
    <div style="font-size:6pt;color:#bbb;margin-top:0.3mm;">— END OF ${n.isOrder ? 'ORDER SLIP' : 'RECEIPT'} —</div>
  </div>`;
}

export async function printDocument(
  doc: PrintableDoc,
  options: ReceiptHtmlOptions = {},
): Promise<PrintResult> {
  const n = normalizeDocument(doc, options.mode ?? 'receipt');
  const label = n?.isOrder ? 'Order Slip' : 'Receipt';
  return printFragment(buildReceiptHtml(doc, options), {
    profile: 'receipt',
    title: `${label} ${n?.docNumber || ''}`.trim(),
  });
}

// src/components/DocumentDetailsModal.tsx
import React from 'react';
import { Banknote, Printer, Shield, User } from 'lucide-react';
import { useAppStore } from '../store';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  formatAmount,
  formatDocumentDate,
  formatDocumentDateTime,
  formatPaymentMethod,
  normalizeDocument,
  type DocumentMode,
  type PrintableDoc,
} from '../utils/document';
import { printDocument } from '../utils/receiptHtml';
import { describePrintOutcome } from '../utils/printEngine';

interface DocumentDetailsModalProps {
  doc: PrintableDoc | null;
  mode?: DocumentMode;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  /** Overrides how the Print action works; defaults to opening the thermal receipt. */
  onPrint?: () => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    className="text-[0.66rem] font-bold uppercase tracking-wider mb-2"
    style={{ color: 'var(--color-text-muted)' }}
  >
    {children}
  </p>
);

const MetaItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
      {label}
    </p>
    <p className="text-[0.8rem] font-medium" style={{ color: 'var(--color-text-primary)' }}>
      {value || '—'}
    </p>
  </div>
);

const TotalRow: React.FC<{
  label: string;
  value: string;
  emphasis?: 'strong' | 'negative';
}> = ({ label, value, emphasis }) => (
  <div className="flex items-center justify-between py-1 text-[0.8rem]">
    <span style={{ color: emphasis === 'strong' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
      {label}
    </span>
    <span
      className="tabular-nums"
      style={{
        fontWeight: emphasis ? 700 : 500,
        color:
          emphasis === 'negative'
            ? 'var(--color-success-text)'
            : emphasis === 'strong'
              ? 'var(--color-text-primary)'
              : 'var(--color-text-secondary)',
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * On-screen view of a sale, order or lab document: full item details, totals and
 * status. Deliberately separate from ReceiptModal, which shows the printable
 * thermal slip — "View" should not hand you something you can only read on paper.
 */
export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  doc,
  mode = 'receipt',
  customerName,
  customerPhone,
  onClose,
  onPrint,
}) => {
  const { company } = useAppStore();
  const n = normalizeDocument(doc, mode);

  if (!n) {
    return (
      <Modal open onClose={onClose} title="Document" size="sm">
        <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
          No document data available.
        </p>
      </Modal>
    );
  }

  // Sales history calls an unnamed sale "Walk-in", so the details view uses the
  // same word instead of a bare dash.
  const name = customerName || n.customerName || (n.isLab ? '' : 'Walk-in');
  const phone = customerPhone || n.customerPhone || '';
  const taxRate = n.taxRate ?? company?.receiptSettings?.taxRate ?? 15;

  const handlePrint = async () => {
    if (onPrint) {
      onPrint();
      return;
    }
    const message = describePrintOutcome(
      await printDocument(doc!, { company, mode, customerName, customerPhone }),
    );
    if (message) alert(message);
  };

  const title = n.isLab
    ? n.isOrder ? 'Lab Order Details' : 'Lab Receipt Details'
    : n.isSalesOrder ? 'Order Details' : 'Transaction Details';

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={n.docNumber}
      size="lg"
      icon={n.isLab ? <Banknote style={{ width: 14, height: 14 }} /> : <User style={{ width: 14, height: 14 }} />}
      iconTone={n.status.key === 'cancelled' ? 'danger' : n.status.key === 'pending' ? 'warning' : 'accent'}
      footer={
        <>
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="md" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print {n.isOrder ? 'Slip' : 'Receipt'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* ─── Status + amounts at a glance ─────────────────────── */}
        <div
          className="flex items-center justify-between rounded-[10px] px-4 py-3"
          style={{ background: 'var(--color-bg-subtle)' }}
        >
          <div>
            <p className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
              {n.isOrder && n.balanceDue > 0 ? 'Amount due' : 'Total'}
            </p>
            <p
              className="text-lg font-bold leading-tight tabular-nums"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {formatAmount(n.isOrder ? n.amountDue : n.total)}
            </p>
          </div>
          <Badge variant={n.status.badgeVariant}>{n.status.label}</Badge>
        </div>

        {/* ─── Meta ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Document</SectionLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <MetaItem label="Date" value={formatDocumentDate(n.createdAt)} />
            {n.paidAt && (
              <MetaItem label="Paid" value={formatDocumentDateTime(n.paidAt)} />
            )}
            <MetaItem label={n.staffLabel} value={n.staffName} />
            {/* Units sold, not line count, so the number matches the Orders list. */}
            <MetaItem label="Items" value={String(n.totalQuantity)} />
            <MetaItem label={n.isLab ? 'Patient' : 'Customer'} value={name} />
            <MetaItem label="Phone" value={phone} />
            <MetaItem
              label="Payment"
              value={n.paymentMethod ? formatPaymentMethod(n.paymentMethod) : null}
            />
            {n.paymentReference && <MetaItem label="Reference" value={n.paymentReference} />}
          </div>
        </div>

        {/* ─── Items ────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Items sold</SectionLabel>
          <div
            className="overflow-hidden rounded-[10px]"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-subtle)' }}>
                  <th className="text-left text-[0.68rem] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>
                    Item
                  </th>
                  <th className="text-center text-[0.68rem] font-semibold uppercase tracking-wider px-2 py-2 w-16" style={{ color: 'var(--color-text-muted)' }}>
                    Qty
                  </th>
                  <th className="text-right text-[0.68rem] font-semibold uppercase tracking-wider px-3 py-2 w-24" style={{ color: 'var(--color-text-muted)' }}>
                    Unit price
                  </th>
                  <th className="text-right text-[0.68rem] font-semibold uppercase tracking-wider px-3 py-2 w-24" style={{ color: 'var(--color-text-muted)' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {n.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-[0.78rem] py-4" style={{ color: 'var(--color-text-muted)' }}>
                      No items on this document.
                    </td>
                  </tr>
                ) : (
                  n.items.map((item, index) => (
                    <tr
                      key={item.key}
                      style={{
                        borderTop: index > 0 ? '1px solid var(--color-border)' : undefined,
                      }}
                    >
                      <td className="text-[0.78rem] px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>
                        {item.name}
                      </td>
                      <td className="text-[0.78rem] text-center tabular-nums px-2 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.quantity}
                      </td>
                      <td className="text-[0.78rem] text-right tabular-nums px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatAmount(item.unitPrice)}
                      </td>
                      <td className="text-[0.78rem] text-right tabular-nums font-semibold px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>
                        {formatAmount(item.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Totals ───────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {n.hasInsurance && (
            <div
              className="rounded-[10px] p-3"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-text)' }} />
                <p className="text-[0.75rem] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {n.insuranceProviderName}
                </p>
              </div>
              {n.policyNumber && <TotalRow label="Policy" value={n.policyNumber} />}
              <TotalRow label="Insurer covers" value={formatAmount(n.insuranceCoverage)} />
              <TotalRow label="Patient co-pay" value={formatAmount(n.copayAmount)} />
            </div>
          )}

          <div
            className="rounded-[10px] p-3"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <TotalRow label="Subtotal" value={formatAmount(n.subtotal)} />
            {n.discount > 0 && (
              <TotalRow label="Discount" value={`- ${formatAmount(n.discount)}`} emphasis="negative" />
            )}
            <TotalRow label={`VAT (${taxRate}%)`} value={formatAmount(n.tax)} />
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
            <TotalRow label="Total" value={formatAmount(n.total)} emphasis="strong" />
            {n.paidAmount > 0 && n.paidAmount !== n.total && (
              <TotalRow label="Paid" value={formatAmount(n.paidAmount)} />
            )}
            {n.balanceDue > 0 && (
              <TotalRow label="Balance" value={formatAmount(n.balanceDue)} emphasis="strong" />
            )}
          </div>
        </div>

        {n.notes && (
          <div>
            <SectionLabel>Notes</SectionLabel>
            <p className="text-[0.78rem]" style={{ color: 'var(--color-text-secondary)' }}>
              {n.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DocumentDetailsModal;

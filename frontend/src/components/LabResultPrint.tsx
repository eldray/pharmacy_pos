// src/components/LabResultPrint.tsx
// This component is intentionally print-first with hardcoded colors.
// It renders inside a modal or print view and is designed to be sent as a
// PDF to clients. Do NOT replace these colors with CSS variables —
// CSS custom properties are not supported in print contexts and PDF renderers.

import React from 'react';
import { useAppStore } from '../store';
import { LabTransaction } from '../types';

interface LabResultPrintProps {
  transaction: LabTransaction;
}

/* ─── Constants (hardcoded for print/PDF safety) ─────────────────────────── */
const BRAND_PURPLE   = '#5B21B6';
const BRAND_PURPLE_L = '#7C3AED';
const BRAND_NAVY     = '#0F172A';
const ACCENT_TEAL    = '#0D9488';
const ACCENT_GREEN   = '#059669';
const WARNING_AMBER  = '#D97706';
const DANGER_RED     = '#DC2626';

const FLAG_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: DANGER_RED, bg: '#FEF2F2', label: 'CRITICAL ▲' },
  high:     { color: '#EA580C', bg: '#FFF7ED', label: 'HIGH ▲'     },
  low:      { color: '#CA8A04', bg: '#FEFCE8', label: 'LOW ▼'      },
  normal:   { color: '#16A34A', bg: 'transparent', label: 'NORMAL' },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt = (d: string) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'Invalid Date'; }
};

/* ─── Shared print styles ────────────────────────────────────────────────── */
const BASE: React.CSSProperties = {
  fontFamily: "'Segoe UI', Arial, sans-serif",
  fontSize:   11,
  lineHeight: 1.5,
  color:      '#1E293B',
  maxWidth:   680,
  margin:     '0 auto',
  background: '#FFFFFF',
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

const Divider: React.FC<{ dashed?: boolean }> = ({ dashed }) => (
  <hr style={{
    border:       'none',
    borderTop:    dashed ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
    margin:       '12px 0',
  }} />
);

const InfoRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0' }}>
    <span style={{ fontSize: 10, color: '#64748B', minWidth: 110 }}>{label}</span>
    <span style={{ fontWeight: bold ? 700 : 500, color: '#0F172A', textAlign: 'right', flex: 1 }}>{value}</span>
  </div>
);

const SectionHeading: React.FC<{ children: React.ReactNode; icon?: string }> = ({ children, icon }) => (
  <div style={{
    display:         'flex',
    alignItems:      'center',
    gap:             6,
    background:      `linear-gradient(135deg, ${BRAND_PURPLE} 0%, ${BRAND_PURPLE_L} 100%)`,
    color:           '#fff',
    padding:         '6px 12px',
    borderRadius:    6,
    fontSize:        10,
    fontWeight:      700,
    letterSpacing:   '0.06em',
    textTransform:   'uppercase',
    marginBottom:    8,
  }}>
    {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
    {children}
  </div>
);

/* ─── LabResultPrint ─────────────────────────────────────────────────────── */
const LabResultPrint: React.FC<LabResultPrintProps> = ({ transaction }) => {
  const { company } = useAppStore();

  // ─── Get real data from the transaction ──────────────────────────────
  const completedTests =
    transaction?.labTests?.filter((t: any) => t.status === 'completed') ?? [];

  // ─── Calculate real stats from the data ──────────────────────────────
  const totalTests = transaction?.labTests?.length || 0;
  const completedCount = completedTests.length;
  const pendingCount = totalTests - completedCount;
  
  // Count abnormal results
  let abnormalCount = 0;
  completedTests.forEach((test: any) => {
    if (test.referenceRanges) {
      Object.values(test.referenceRanges).forEach((r: any) => {
        if (r.flag && r.flag !== 'normal') abnormalCount++;
      });
    }
  });

  /* ── Empty / no-data states ────────────────────────────────────────────── */
  if (!transaction) {
    return (
      <div style={{ ...BASE, padding: 40, textAlign: 'center', color: '#94A3B8' }}>
        No transaction data available.
      </div>
    );
  }

  if (completedTests.length === 0) {
    return (
      <div style={{ ...BASE, padding: 40 }}>
        <Header company={company} completedCount={0} pendingCount={pendingCount} />
        <div style={{
          marginTop:   24,
          padding:     24,
          textAlign:   'center',
          color:       '#94A3B8',
          border:      '1px dashed #E2E8F0',
          borderRadius: 8,
          fontSize:    12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
          <div style={{ fontWeight: 600, color: '#475569' }}>No Completed Tests</div>
          <div style={{ marginTop: 4, fontSize: 11 }}>
            {pendingCount > 0 
              ? `${pendingCount} test${pendingCount > 1 ? 's are' : ' is'} still pending. Results will appear here once completed.`
              : 'No test results are available for this transaction.'}
          </div>
        </div>
        <Footer company={company} />
      </div>
    );
  }

  const hasAbnormal = abnormalCount > 0;

  return (
    <div id="lab-result-print" style={{ ...BASE, padding: '32px 40px' }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <Header 
        company={company} 
        completedCount={completedTests.length} 
        pendingCount={pendingCount}
      />

      {/* ── CRITICAL ALERT BANNER ────────────────────────────────────── */}
      {hasAbnormal && (
        <div style={{
          margin:       '0 0 16px',
          padding:      '10px 16px',
          background:   '#FEF2F2',
          border:       '1px solid #FCA5A5',
          borderLeft:   `4px solid ${DANGER_RED}`,
          borderRadius: 6,
          fontSize:     10,
          fontWeight:   600,
          color:        '#991B1B',
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <span>
            This report contains <strong>{abnormalCount}</strong> abnormal result{abnormalCount > 1 ? 's' : ''}. 
            Please review flagged values carefully.
          </span>
        </div>
      )}

      {/* ── PATIENT INFORMATION ──────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <SectionHeading icon="👤">Patient Information</SectionHeading>
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '0 24px',
          background:          '#F8FAFC',
          border:              '1px solid #E2E8F0',
          borderRadius:        8,
          padding:             '12px 16px',
        }}>
          <InfoRow label="Report No."     value={transaction.transactionNumber || 'N/A'} bold />
          <InfoRow label="Date Collected" value={fmt(transaction.createdAt)} />
          <InfoRow label="Patient Name"   value={transaction.patientName || 'N/A'} bold />
          {transaction.patientAge    && <InfoRow label="Age"           value={String(transaction.patientAge)} />}
          {transaction.patientGender && <InfoRow label="Gender"        value={transaction.patientGender} />}
          {transaction.patientPhone  && <InfoRow label="Phone"         value={transaction.patientPhone} />}
          {transaction.requestedByName && <InfoRow label="Requested By" value={transaction.requestedByName} />}
          {transaction.priority && transaction.priority !== 'normal' && (
            <InfoRow label="Priority" value={transaction.priority.toUpperCase()} bold />
          )}
        </div>
      </div>

      {/* ── TEST RESULTS ─────────────────────────────────────────────── */}
      <SectionHeading icon="🔬">
        Laboratory Results — {completedTests.length} Test{completedTests.length > 1 ? 's' : ''} Completed
      </SectionHeading>

      {completedTests.map((test: any, index: number) => {
        const hasResults  = test.results && Object.keys(test.results).length > 0;
        const resultCount = hasResults ? Object.keys(test.results).length : 0;
        const testAbnormalCount = hasResults
          ? Object.keys(test.results).filter(
              (k) => test.referenceRanges?.[k]?.flag && test.referenceRanges[k].flag !== 'normal'
            ).length
          : 0;

        return (
          <div key={test.id || index} style={{ marginBottom: 20 }}>

            {/* Test banner */}
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              background:     '#F1F5F9',
              border:         '1px solid #E2E8F0',
              borderLeft:     `4px solid ${testAbnormalCount > 0 ? DANGER_RED : ACCENT_TEAL}`,
              borderRadius:   '0 6px 6px 0',
              padding:        '8px 12px',
              marginBottom:   8,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: BRAND_NAVY }}>
                  {index + 1}. {test.testType || 'Unknown Test'}
                  {test.testNumber && ` (${test.testNumber})`}
                </div>
                <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>
                  {[
                    test.testCategory && `Category: ${test.testCategory}`,
                    test.sampleType   && `Sample: ${test.sampleType}`,
                    test.quantity && `Quantity: ${test.quantity}`,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {testAbnormalCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                    background: '#FEF2F2', color: DANGER_RED,
                    border: '1px solid #FCA5A5', borderRadius: 99,
                  }}>
                    {testAbnormalCount} ABNORMAL
                  </span>
                )}
                {test.priority && test.priority !== 'normal' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                    background: '#FFF7ED', color: '#C2410C',
                    border: '1px solid #FED7AA', borderRadius: 99,
                  }}>
                    {test.priority.toUpperCase()}
                  </span>
                )}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px',
                  background: '#DCFCE7', color: '#166534',
                  border: '1px solid #86EFAC', borderRadius: 99,
                }}>
                  ✓ COMPLETED
                </span>
              </div>
            </div>

            {/* Results table */}
            {hasResults ? (
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 10, marginBottom: 6,
                border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden',
              }}>
                <thead>
                  <tr style={{ background: BRAND_NAVY }}>
                    {['Parameter', 'Result', 'Reference Range', 'Unit', 'Flag'].map((h) => (
                      <th key={h} style={{
                        padding: '7px 10px', textAlign: 'left',
                        fontWeight: 700, fontSize: 9,
                        color: '#FFFFFF', letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        borderRight: '1px solid rgba(255,255,255,0.10)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(test.results).map(([key, value], ri) => {
                    const refData  = test.referenceRanges?.[key] || {};
                    const flag     = refData.flag || 'normal';
                    const fs       = FLAG_STYLES[flag] || FLAG_STYLES.normal;
                    const abnormal = flag !== 'normal';
                    const isEven   = ri % 2 === 0;

                    return (
                      <tr key={key} style={{
                        background: abnormal ? fs.bg : isEven ? '#F8FAFC' : '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                      }}>
                        {/* Parameter */}
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: BRAND_NAVY }}>
                          {key}
                          {abnormal && (
                            <span style={{ marginLeft: 4, color: DANGER_RED, fontSize: 9 }}>⚠</span>
                          )}
                        </td>
                        {/* Result */}
                        <td style={{
                          padding:    '6px 10px',
                          fontWeight: abnormal ? 700 : 500,
                          color:      abnormal ? fs.color : '#0F172A',
                          fontSize:   abnormal ? 11 : 10,
                        }}>
                          {String(value ?? 'N/A')}
                        </td>
                        {/* Ref Range */}
                        <td style={{ padding: '6px 10px', color: '#475569' }}>
                          {refData.referenceRange || '—'}
                        </td>
                        {/* Unit */}
                        <td style={{ padding: '6px 10px', color: '#475569' }}>
                          {refData.unit || '—'}
                        </td>
                        {/* Flag */}
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{
                            fontSize:    9,
                            fontWeight:  700,
                            padding:     '2px 8px',
                            borderRadius: 99,
                            background:  abnormal ? fs.bg : '#DCFCE7',
                            color:       abnormal ? fs.color : '#166534',
                            border:      `1px solid ${abnormal ? fs.color + '55' : '#86EFAC'}`,
                            whiteSpace:  'nowrap',
                          }}>
                            {fs.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{
                padding: 16, textAlign: 'center',
                color: '#94A3B8', fontSize: 10,
                border: '1px dashed #E2E8F0', borderRadius: 6,
              }}>
                No results recorded for this test.
              </div>
            )}

            {/* Summary / Interpretation */}
            {(test.resultSummary || test.resultInterpretation) && (
              <div style={{ display: 'grid', gridTemplateColumns: test.resultSummary && test.resultInterpretation ? '1fr 1fr' : '1fr', gap: 8, marginTop: 8 }}>
                {test.resultSummary && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderLeft: `3px solid ${ACCENT_GREEN}`,
                    borderRadius: '0 6px 6px 0',
                    fontSize: 10,
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: ACCENT_GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Summary
                    </div>
                    {test.resultSummary}
                  </div>
                )}
                {test.resultInterpretation && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderLeft: '3px solid #3B82F6',
                    borderRadius: '0 6px 6px 0',
                    fontSize: 10,
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Clinical Interpretation
                    </div>
                    {test.resultInterpretation}
                  </div>
                )}
              </div>
            )}

            {/* Performed by */}
            {test.performedByName && (
              <div style={{
                marginTop:  8,
                fontSize:   9,
                color:      '#94A3B8',
                textAlign:  'right',
                fontStyle:  'italic',
              }}>
                Performed by: <strong style={{ color: '#475569' }}>{test.performedByName}</strong>
                {test.completedAt && ` · ${fmt(test.completedAt)}`}
              </div>
            )}

            {/* Test divider */}
            {index < completedTests.length - 1 && (
              <Divider dashed />
            )}
          </div>
        );
      })}

      {/* ── LEGEND ───────────────────────────────────────────────────── */}
      <div style={{
        marginTop:    16,
        padding:      '10px 14px',
        background:   '#F8FAFC',
        border:       '1px solid #E2E8F0',
        borderRadius: 8,
        fontSize:     9,
      }}>
        <div style={{ fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Result Flag Legend
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(FLAG_STYLES).map(([key, { color, label }]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8,
                borderRadius: '50%', background: color,
              }} />
              <span style={{ color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <Footer company={company} />
    </div>
  );
};

/* ─── Header sub-component ───────────────────────────────────────────────── */
const Header: React.FC<{ company: any; completedCount: number; pendingCount: number }> = ({ 
  company, 
  completedCount,
  pendingCount 
}) => (
  <div style={{ marginBottom: 20 }}>
    {/* Top gradient bar */}
    <div style={{
      height:     6,
      background: `linear-gradient(90deg, ${BRAND_PURPLE} 0%, ${BRAND_PURPLE_L} 50%, ${ACCENT_TEAL} 100%)`,
      borderRadius: '4px 4px 0 0',
      marginBottom: 0,
    }} />

    {/* Header body */}
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'flex-start',
      padding:        '16px 20px',
      background:     BRAND_NAVY,
      borderRadius:   '0 0 8px 8px',
      marginBottom:   16,
    }}>
      {/* Left — branding */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
          {company?.name || 'PHARMACY POS'}
        </div>
        {company?.addressCity && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {[company.addressStreet, company.addressCity, company.addressState]
              .filter(Boolean).join(', ')}
          </div>
        )}
        {company?.contactPhone && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>
            Tel: {company.contactPhone}
          </div>
        )}
      </div>

      {/* Right — document title */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize:        12,
          fontWeight:      800,
          color:           '#FFFFFF',
          letterSpacing:   '0.12em',
          textTransform:   'uppercase',
        }}>
          Laboratory Report
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {completedCount > 0 && (
            <span style={{
              fontSize:     9,
              fontWeight:   600,
              padding:      '3px 10px',
              background:   ACCENT_GREEN,
              color:        '#fff',
              borderRadius: 99,
            }}>
              ✓ {completedCount} Complete
            </span>
          )}
          {pendingCount > 0 && (
            <span style={{
              fontSize:     9,
              fontWeight:   600,
              padding:      '3px 10px',
              background:   WARNING_AMBER,
              color:        '#fff',
              borderRadius: 99,
            }}>
              ⏳ {pendingCount} Pending
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

/* ─── Footer sub-component ───────────────────────────────────────────────── */
const Footer: React.FC<{ company: any }> = ({ company }) => (
  <div style={{ marginTop: 24 }}>
    {/* Bottom gradient bar */}
    <div style={{
      height:     3,
      background: `linear-gradient(90deg, ${BRAND_PURPLE} 0%, ${BRAND_PURPLE_L} 50%, ${ACCENT_TEAL} 100%)`,
      borderRadius: 4,
      marginBottom: 10,
    }} />

    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'flex-end',
      fontSize:       8,
      color:          '#94A3B8',
      lineHeight:     1.6,
    }}>
      <div>
        <div>Report generated: {new Date().toLocaleString('en-GB')}</div>
        <div>This report is electronically generated and does not require a physical signature.</div>
        {company?.receiptSettings?.footer && (
          <div style={{ marginTop: 4, fontWeight: 600, color: '#475569', fontSize: 9 }}>
            {company.receiptSettings.footer}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, color: '#475569', fontSize: 9 }}>
          {company?.name || 'Pharmacy POS'}
        </div>
        <div>© {new Date().getFullYear()} All rights reserved</div>
      </div>
    </div>
  </div>
);

export { LabResultPrint };
export default LabResultPrint;
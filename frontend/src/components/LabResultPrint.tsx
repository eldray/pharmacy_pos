// src/components/LabResultPrint.tsx
import React from 'react';
import { useAppStore } from '../store';
import { LabTransaction } from '../types';

interface LabResultPrintProps {
    transaction: LabTransaction;
}

export const LabResultPrint: React.FC<LabResultPrintProps> = ({
    transaction,
}) => {
    const { company } = useAppStore();

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

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

    const getFlagStyle = (flag: string): React.CSSProperties => {
        switch (flag) {
            case 'critical': return { color: '#dc2626', fontWeight: 700 };
            case 'high': return { color: '#ea580c', fontWeight: 600 };
            case 'low': return { color: '#ca8a04', fontWeight: 600 };
            default: return { color: '#16a34a' };
        }
    };

    const getFlagLabel = (flag: string) => {
        switch (flag) {
            case 'critical': return 'CRITICAL';
            case 'high': return 'HIGH';
            case 'low': return 'LOW';
            default: return 'NORMAL';
        }
    };

    const completedTests =
        transaction?.labTests?.filter((t: any) => t.status === 'completed') || [];

    if (!transaction) {
        return (
            <div
                className="text-center py-8 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
            >
                No transaction data available
            </div>
        );
    }

    return (
        <div
            id="lab-result-print"
            style={{
                padding: 32,
                fontFamily: "'Courier New', monospace",
                fontSize: 11,
                lineHeight: 1.4,
                color: '#000',
                maxWidth: 280,
                margin: '0 auto',
            }}
        >
            {/* Header */}
            <div
                style={{
                    textAlign: 'center',
                    borderBottom: '2px solid #000',
                    paddingBottom: 12,
                    marginBottom: 16,
                }}
            >
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>
                    {company?.name || 'PHARMACY POS'}
                </div>
                <div style={{ fontSize: 9, color: '#555', marginTop: 4, lineHeight: 1.3 }}>
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
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 10,
                        letterSpacing: '0.1em',
                    }}
                >
                    LABORATORY TEST REPORT
                </div>
            </div>

            {/* Transaction info */}
            <div
                style={{
                    border: '1px solid #999',
                    padding: 8,
                    marginBottom: 16,
                    lineHeight: 1.5,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: '#666' }}>Report No:</span>
                    <span style={{ fontWeight: 600 }}>{transaction.transactionNumber || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: '#666' }}>Date:</span>
                    <span>{formatDate(transaction.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: '#666' }}>Patient:</span>
                    <span style={{ fontWeight: 600 }}>{transaction.patientName || 'N/A'}</span>
                </div>
                {transaction.patientAge && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 9, color: '#666' }}>Age:</span>
                        <span>{transaction.patientAge}</span>
                    </div>
                )}
                {transaction.patientGender && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 9, color: '#666' }}>Gender:</span>
                        <span>{transaction.patientGender}</span>
                    </div>
                )}
                {transaction.patientPhone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 9, color: '#666' }}>Phone:</span>
                        <span>{transaction.patientPhone}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: '#666' }}>Tests:</span>
                    <span>
                        {completedTests.length} / {transaction.labTests?.length || 0} completed
                    </span>
                </div>
            </div>

            {/* Tests */}
            {completedTests.length > 0 ? (
                completedTests.map((test: any, index: number) => (
                    <div key={test.id || index} style={{ marginBottom: 20 }}>
                        {/* Test header */}
                        <div
                            style={{
                                background: '#eee',
                                padding: '6px 8px',
                                marginBottom: 2,
                                fontSize: 10,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700 }}>
                                    {index + 1}. {test.testType || 'Unknown Test'}
                                </span>
                                <span
                                    style={{
                                        fontSize: 8,
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        background: '#16a34a',
                                        color: '#fff',
                                        borderRadius: 2,
                                    }}
                                >
                                    COMPLETED
                                </span>
                            </div>
                            <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                                {test.testCategory && <span>Category: {test.testCategory} </span>}
                                {test.sampleType && <span>· Sample: {test.sampleType}</span>}
                            </div>
                        </div>

                        {/* Results table */}
                        {test.results && Object.keys(test.results).length > 0 ? (
                            <>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: 10,
                                    }}
                                >
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #000' }}>
                                            <th
                                                style={{
                                                    padding: '4px 6px',
                                                    textAlign: 'left',
                                                    fontWeight: 700,
                                                    fontSize: 9,
                                                }}
                                            >
                                                Parameter
                                            </th>
                                            <th
                                                style={{
                                                    padding: '4px 6px',
                                                    textAlign: 'left',
                                                    fontWeight: 700,
                                                    fontSize: 9,
                                                }}
                                            >
                                                Result
                                            </th>
                                            <th
                                                style={{
                                                    padding: '4px 6px',
                                                    textAlign: 'center',
                                                    fontWeight: 700,
                                                    fontSize: 9,
                                                }}
                                            >
                                                Ref. Range
                                            </th>
                                            <th
                                                style={{
                                                    padding: '4px 6px',
                                                    textAlign: 'center',
                                                    fontWeight: 700,
                                                    fontSize: 9,
                                                }}
                                            >
                                                Unit
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(test.results).map(([key, value]) => {
                                            const refRange =
                                                test.referenceRanges?.[key]?.referenceRange || '';
                                            const unit = test.referenceRanges?.[key]?.unit || '';
                                            const flag = test.referenceRanges?.[key]?.flag || 'normal';
                                            const isAbnormal = flag !== 'normal';

                                            return (
                                                <tr
                                                    key={key}
                                                    style={{ borderBottom: '1px dotted #ccc' }}
                                                >
                                                    <td style={{ padding: '4px 6px' }}>{key}</td>
                                                    <td style={{ padding: '4px 6px', ...getFlagStyle(flag) }}>
                                                        <span style={{ fontWeight: isAbnormal ? 700 : 400 }}>
                                                            {String(value || 'N/A')}
                                                        </span>
                                                        {isAbnormal && (
                                                            <span
                                                                style={{
                                                                    fontSize: 8,
                                                                    marginLeft: 4,
                                                                    ...getFlagStyle(flag),
                                                                }}
                                                            >
                                                                [{getFlagLabel(flag)}]
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '4px 6px',
                                                            textAlign: 'center',
                                                            color: '#555',
                                                        }}
                                                    >
                                                        {refRange || 'N/A'}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '4px 6px',
                                                            textAlign: 'center',
                                                            color: '#555',
                                                        }}
                                                    >
                                                        {unit || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Summary */}
                                {test.resultSummary && (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            padding: 6,
                                            borderLeft: '2px solid #666',
                                            fontSize: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 8,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                color: '#666',
                                                marginBottom: 2,
                                            }}
                                        >
                                            Summary
                                        </div>
                                        {test.resultSummary}
                                    </div>
                                )}
                                {test.resultInterpretation && (
                                    <div
                                        style={{
                                            marginTop: 4,
                                            padding: 6,
                                            borderLeft: '2px solid #666',
                                            fontSize: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 8,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                color: '#666',
                                                marginBottom: 2,
                                            }}
                                        >
                                            Interpretation
                                        </div>
                                        {test.resultInterpretation}
                                    </div>
                                )}
                                {test.performedByName && (
                                    <div
                                        style={{
                                            marginTop: 4,
                                            fontSize: 8,
                                            color: '#888',
                                        }}
                                    >
                                        Performed by: {test.performedByName}
                                        {test.completedAt && ` on ${formatDate(test.completedAt)}`}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: 12,
                                    color: '#888',
                                    border: '1px solid #ddd',
                                    fontSize: 10,
                                }}
                            >
                                No results entered
                            </div>
                        )}

                        {index < completedTests.length - 1 && (
                            <hr
                                style={{
                                    border: 'none',
                                    borderTop: '1px dashed #999',
                                    margin: '16px 0',
                                }}
                            />
                        )}
                    </div>
                ))
            ) : (
                <div
                    style={{
                        textAlign: 'center',
                        padding: 16,
                        color: '#888',
                        border: '1px solid #ddd',
                        fontSize: 11,
                    }}
                >
                    No completed tests with results
                </div>
            )}

            {/* Footer */}
            <div
                style={{
                    marginTop: 24,
                    paddingTop: 10,
                    borderTop: '2px solid #000',
                    textAlign: 'center',
                    fontSize: 8,
                    color: '#888',
                    lineHeight: 1.5,
                }}
            >
                <div>Report generated: {new Date().toLocaleString()}</div>
                <div style={{ marginTop: 2 }}>
                    This report is electronically generated and does not require a signature.
                </div>
                {company?.receiptSettings?.footer && (
                    <div
                        style={{
                            marginTop: 8,
                            fontWeight: 700,
                            color: '#333',
                            fontSize: 9,
                        }}
                    >
                        {company.receiptSettings.footer}
                    </div>
                )}
                <div style={{ marginTop: 8 }}>
                    {company?.name || 'Pharmacy POS'} · {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};
export default LabResultPrint;
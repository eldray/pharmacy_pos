// src/components/LabResultPrint.tsx
import React from 'react';
import { useAppStore } from '../store';
import { LabTransaction } from '../types';

interface LabResultPrintProps {
    transaction: LabTransaction;
}

export const LabResultPrint: React.FC<LabResultPrintProps> = ({ transaction }) => {
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
                minute: '2-digit'
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const getFlagColor = (flag: string): React.CSSProperties => {
        switch (flag) {
            case 'critical': return { color: '#dc2626' };
            case 'high': return { color: '#ea580c' };
            case 'low': return { color: '#ca8a04' };
            default: return { color: '#16a34a' };
        }
    };

    const getFlagDisplay = (flag: string) => {
        switch (flag) {
            case 'critical': return '⚠️ CRITICAL';
            case 'high': return '⬆ HIGH';
            case 'low': return '⬇ LOW';
            default: return '✅ NORMAL';
        }
    };

    const renderResults = (test: any) => {
        if (!test.results) return null;

        return Object.entries(test.results).map(([key, value]) => {
            const refRange = test.referenceRanges?.[key]?.referenceRange || '';
            const unit = test.referenceRanges?.[key]?.unit || '';
            const flag = test.referenceRanges?.[key]?.flag || 'normal';

            return (
                <tr key={key}>
                    <td className="px-4 py-2 border border-gray-300 font-medium">{key}</td>
                    <td className="px-4 py-2 border border-gray-300" style={getFlagColor(flag)}>
                        <strong>{value || 'N/A'}</strong>
                        {flag !== 'normal' && (
                            <span className="ml-2 text-xs font-bold" style={getFlagColor(flag)}>
                                ({getFlagDisplay(flag)})
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-center">{refRange || 'N/A'}</td>
                    <td className="px-4 py-2 border border-gray-300 text-center">{unit || 'N/A'}</td>
                </tr>
            );
        });
    };

    const completedTests = transaction?.labTests?.filter((t: any) => t.status === 'completed') || [];

    if (!transaction) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No transaction data available</p>
            </div>
        );
    }

    return (
        <div className="p-8 font-mono text-sm" id="lab-result-print">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-6 mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-wider">
                    {company?.name || 'PHARMACY POS'}
                </h1>
                {company?.address && (
                    <p className="text-xs text-gray-600 mt-1">
                        {company.address.street && <span>{company.address.street}, </span>}
                        {company.address.city && <span>{company.address.city}, </span>}
                        {company.address.state && <span>{company.address.state} </span>}
                        {company.address.zipCode && <span>{company.address.zipCode}</span>}
                    </p>
                )}
                <p className="text-xs text-gray-600">
                    {company?.contact?.phone && `Tel: ${company.contact.phone}`}
                    {company?.contact?.email && ` | Email: ${company.contact.email}`}
                </p>
                <p className="text-sm font-bold mt-3 text-gray-800">LABORATORY TEST REPORT</p>
                <p className="text-xs text-gray-500 mt-1">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
            </div>

            {/* Transaction Information */}
            <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                        <p className="text-xs font-bold text-gray-500">Report No:</p>
                        <p className="text-sm font-semibold">{transaction.transactionNumber || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500">Date:</p>
                        <p className="text-sm">{formatDate(transaction.createdAt)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500">Patient:</p>
                        <p className="text-sm font-semibold">{transaction.patientName || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500">Status:</p>
                        <p className="text-sm capitalize">{transaction.status || 'N/A'}</p>
                    </div>
                    {transaction.patientAge && (
                        <div>
                            <p className="text-xs font-bold text-gray-500">Age:</p>
                            <p className="text-sm">{transaction.patientAge}</p>
                        </div>
                    )}
                    {transaction.patientGender && (
                        <div>
                            <p className="text-xs font-bold text-gray-500">Gender:</p>
                            <p className="text-sm">{transaction.patientGender}</p>
                        </div>
                    )}
                    {transaction.patientPhone && (
                        <div>
                            <p className="text-xs font-bold text-gray-500">Phone:</p>
                            <p className="text-sm">{transaction.patientPhone}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-bold text-gray-500">Tests:</p>
                        <p className="text-sm">{completedTests.length} / {transaction.labTests?.length || 0} completed</p>
                    </div>
                </div>
            </div>

            {/* Test Results */}
            {completedTests.length > 0 ? (
                completedTests.map((test: any, index: number) => (
                    <div key={test.id || index} className="mb-8">
                        <div className="bg-gray-100 p-3 mb-3 border border-gray-300 rounded">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold">
                                        Test #{index + 1}: {test.testType || 'Unknown Test'}
                                    </h3>
                                    <p className="text-xs text-gray-600">Category: {test.testCategory || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="px-3 py-1 text-xs font-bold bg-green-500 text-white rounded-full">
                                        COMPLETED
                                    </span>
                                </div>
                            </div>
                            {test.testNumber && (
                                <p className="text-xs text-gray-500 mt-1">Test ID: {test.testNumber}</p>
                            )}
                            {test.sampleType && (
                                <p className="text-xs text-gray-500">Sample: {test.sampleType}</p>
                            )}
                        </div>

                        {/* Results Table */}
                        {test.results && Object.keys(test.results).length > 0 ? (
                            <>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="px-4 py-2 border border-gray-300 text-left text-sm font-bold">Parameter</th>
                                            <th className="px-4 py-2 border border-gray-300 text-left text-sm font-bold">Result</th>
                                            <th className="px-4 py-2 border border-gray-300 text-center text-sm font-bold">Reference Range</th>
                                            <th className="px-4 py-2 border border-gray-300 text-center text-sm font-bold">Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {renderResults(test)}
                                    </tbody>
                                </table>

                                {/* Summary and Interpretation */}
                                {test.resultSummary && (
                                    <div className="mt-3 p-3 border border-blue-200 bg-blue-50 rounded">
                                        <p className="text-xs font-bold text-blue-800">📋 Summary</p>
                                        <p className="text-sm text-blue-900 mt-1">{test.resultSummary}</p>
                                    </div>
                                )}
                                {test.resultInterpretation && (
                                    <div className="mt-2 p-3 border border-purple-200 bg-purple-50 rounded">
                                        <p className="text-xs font-bold text-purple-800">🔬 Interpretation</p>
                                        <p className="text-sm text-purple-900 mt-1">{test.resultInterpretation}</p>
                                    </div>
                                )}
                                {test.performedByName && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Performed by: {test.performedByName} on {test.completedAt ? formatDate(test.completedAt) : 'N/A'}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-4 text-gray-500 border border-gray-200 rounded">
                                <p>No results entered for this test</p>
                            </div>
                        )}
                        {index < completedTests.length - 1 && (
                            <hr className="my-6 border-dashed border-gray-300" />
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-gray-500 border border-gray-200 rounded">
                    <p className="text-lg">No completed tests with results available</p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-black text-center">
                <p className="text-xs text-gray-600">
                    Report generated on {new Date().toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                    This report is electronically generated and does not require a signature.
                </p>
                {company?.receiptSettings?.footer && (
                    <div className="mt-3 text-xs font-bold text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-4 inline-block">
                        {company.receiptSettings.footer}
                    </div>
                )}
                <div className="mt-4 text-xs text-gray-500">
                    {company?.name || 'Pharmacy POS'} • {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};
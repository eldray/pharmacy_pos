// src/components/LabResultEntry.tsx
import React, { useState, useEffect } from 'react';
import {
    X, Save, Printer, Loader2, FileText,
    CheckCircle, Plus, Trash2, AlertCircle
} from 'lucide-react';
import { LabTest, LabTestTemplate } from '../types';
import { useAppStore } from '../store';

interface LabResultEntryProps {
    test: LabTest;
    onClose: () => void;
    onSuccess: () => void;
}

interface ResultField {
    name: string;
    value: string;
    referenceRange?: string;
    unit?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
}

/* ── Flag badge ────────────────────────────────────────────────────── */
const FlagBadge: React.FC<{ flag: string }> = ({ flag }) => {
    const styles: Record<string, React.CSSProperties> = {
        critical: { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' },
        high: { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' },
        low: { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' },
        normal: { background: 'var(--color-success-light)', color: 'var(--color-success-text)' },
    };
    const icons: Record<string, React.CSSProperties> = {
        critical: { color: 'var(--color-danger)' },
        high: { color: 'var(--color-warning)' },
        low: { color: 'var(--color-warning)' },
        normal: { color: 'var(--color-success)' },
    };

    return (
        <span
            className="inline-flex items-center gap-1 px-1.5 py-[2px] text-[0.6rem] font-semibold rounded"
            style={styles[flag] || styles.normal}
        >
            <AlertCircle className="h-3 w-3" style={icons[flag] || icons.normal} />
            {flag.toUpperCase()}
        </span>
    );
};

/* ── Shared field style ───────────────────────────────────────────── */
const fieldStyle: React.CSSProperties = {
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-input-text)',
    outline: 'none',
    fontSize: '0.78rem',
    padding: '6px 8px',
    width: '100%',
    transition: 'border-color 100ms ease, box-shadow 100ms ease',
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-input-ring)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-input-border)';
    e.currentTarget.style.boxShadow = 'none';
};

export const LabResultEntry: React.FC<LabResultEntryProps> = ({
    test,
    onClose,
    onSuccess,
}) => {
    const { addLabTestResults, labTestTemplates } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ResultField[]>([]);
    const [resultSummary, setResultSummary] = useState(test.resultSummary || '');
    const [resultInterpretation, setResultInterpretation] = useState(test.resultInterpretation || '');
    const [template, setTemplate] = useState<LabTestTemplate | null>(null);
    const [activeTab, setActiveTab] = useState<'results' | 'summary'>('results');

    useEffect(() => {
        const foundTemplate = labTestTemplates.find((t) => t.name === test.testType);
        setTemplate(foundTemplate || null);

        if (test.results && Object.keys(test.results).length > 0) {
            const existingResults: ResultField[] = Object.entries(test.results).map(
                ([key, value]) => ({
                    name: key,
                    value: String(value || ''),
                    referenceRange: test.referenceRanges?.[key]?.referenceRange || '',
                    unit: test.referenceRanges?.[key]?.unit || '',
                    flag: test.referenceRanges?.[key]?.flag || 'normal',
                })
            );
            setResults(existingResults);
        } else if (foundTemplate) {
            const templateFields: ResultField[] = (foundTemplate.resultFields || []).map(
                (field: any) => ({
                    name: field.name,
                    value: '',
                    referenceRange:
                        foundTemplate.defaultReferenceRanges?.[field.name]?.referenceRange || '',
                    unit: foundTemplate.defaultReferenceRanges?.[field.name]?.unit || '',
                    flag: 'normal',
                })
            );
            setResults(templateFields);
        } else {
            setResults([
                { name: 'Result', value: '', referenceRange: '', unit: '', flag: 'normal' },
            ]);
        }
    }, [test, labTestTemplates]);

    const handleResultChange = (index: number, field: keyof ResultField, value: any) => {
        const updated = [...results];
        updated[index] = { ...updated[index], [field]: value };

        if (field === 'value' && updated[index].referenceRange) {
            const val = parseFloat(value);
            const range = updated[index].referenceRange;
            if (!isNaN(val) && range) {
                const [low, high] = range.split('-').map((s) => parseFloat(s.trim()));
                if (!isNaN(low) && !isNaN(high)) {
                    if (val > high * 1.5) updated[index].flag = 'critical';
                    else if (val > high) updated[index].flag = 'high';
                    else if (val < low * 0.5) updated[index].flag = 'critical';
                    else if (val < low) updated[index].flag = 'low';
                    else updated[index].flag = 'normal';
                }
            }
        }

        setResults(updated);
    };

    const addResultRow = () =>
        setResults([
            ...results,
            { name: 'New Parameter', value: '', referenceRange: '', unit: '', flag: 'normal' },
        ]);

    const removeResultRow = (index: number) => {
        if (results.length > 1) setResults(results.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const resultsObject: Record<string, any> = {};
            const referenceRanges: Record<string, any> = {};
            results.forEach((r) => {
                resultsObject[r.name] = r.value;
                referenceRanges[r.name] = {
                    referenceRange: r.referenceRange,
                    unit: r.unit,
                    flag: r.flag,
                };
            });
            await addLabTestResults(test.id, {
                results: resultsObject,
                resultSummary,
                resultInterpretation,
                referenceRanges,
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to save results:', err);
            alert('Failed to save results');
        } finally {
            setLoading(false);
        }
    };

    /* ── Priority badge ─────────────────────────────────────────────── */
    const priorityStyle: Record<string, React.CSSProperties> = {
        stat: { background: 'var(--color-danger)', color: '#fff' },
        urgent: { background: 'var(--color-warning)', color: '#fff' },
        normal: { background: 'var(--color-info)', color: '#fff' },
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal)' }}
            onClick={onClose}
        >
            <div
                className="rounded-[12px] overflow-hidden flex flex-col"
                style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                    width: '100%',
                    maxWidth: 820,
                    maxHeight: '90vh',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ──────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-accent-light)',
                                color: 'var(--color-accent-text)',
                            }}
                        >
                            <FileText className="h-4 w-4" />
                        </div>
                        <div>
                            <h2
                                className="text-[0.85rem] font-bold leading-none"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                Enter Lab Results
                            </h2>
                            <p
                                className="text-[0.65rem] mt-0.5"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {test.testNumber} — {test.patientName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center flex-shrink-0 transition-colors duration-100 cursor-pointer"
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                        }}
                        onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                            'var(--color-bg-subtle)')}
                        onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-5">
                        {/* Patient info bar */}
                        <div
                            className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-[10px] mb-5"
                            style={{
                                background: 'var(--color-bg-subtle)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <div>
                                <p
                                    className="text-[0.6rem] font-medium mb-0.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Patient
                                </p>
                                <p
                                    className="text-[0.78rem] font-semibold truncate"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {test.patientName}
                                </p>
                            </div>
                            {test.patientPhone && (
                                <div>
                                    <p
                                        className="text-[0.6rem] font-medium mb-0.5"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        Phone
                                    </p>
                                    <p
                                        className="text-[0.78rem] font-semibold"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {test.patientPhone}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p
                                    className="text-[0.6rem] font-medium mb-0.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Test Type
                                </p>
                                <p
                                    className="text-[0.78rem] font-semibold"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {test.testType}
                                </p>
                            </div>
                            <div>
                                <p
                                    className="text-[0.6rem] font-medium mb-0.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Priority
                                </p>
                                <span
                                    className="inline-block text-[0.6rem] font-bold uppercase px-2 py-[2px] rounded mt-0.5"
                                    style={priorityStyle[test.priority] || priorityStyle.normal}
                                >
                                    {test.priority}
                                </span>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div
                            className="flex gap-0 mb-5"
                            style={{ borderBottom: '1px solid var(--color-border)' }}
                        >
                            {(['results', 'summary'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className="px-4 py-2.5 text-[0.78rem] font-medium transition-colors duration-100 cursor-pointer"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color:
                                            activeTab === tab
                                                ? 'var(--color-accent-text)'
                                                : 'var(--color-text-muted)',
                                        boxShadow:
                                            activeTab === tab
                                                ? 'inset 0 -2px 0 var(--color-accent)'
                                                : 'inset 0 -2px 0 transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== tab) {
                                            (e.currentTarget as HTMLElement).style.color =
                                                'var(--color-text-primary)';
                                            (e.currentTarget as HTMLElement).style.boxShadow =
                                                'inset 0 -2px 0 var(--color-border-strong)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== tab) {
                                            (e.currentTarget as HTMLElement).style.color =
                                                'var(--color-text-muted)';
                                            (e.currentTarget as HTMLElement).style.boxShadow =
                                                'inset 0 -2px 0 transparent';
                                        }
                                    }}
                                >
                                    {tab === 'results' ? 'Results' : 'Summary & Interpretation'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* ── Results tab ────────────────────────────────────── */}
                            {activeTab === 'results' && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span
                                            className="text-[0.72rem] font-semibold"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            Test Parameters
                                        </span>
                                        <button
                                            type="button"
                                            onClick={addResultRow}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.7rem] font-medium rounded-[6px] transition-colors duration-100 cursor-pointer"
                                            style={{
                                                background: 'var(--color-accent-light)',
                                                color: 'var(--color-accent-text)',
                                                border: 'none',
                                            }}
                                            onMouseEnter={(e) =>
                                                ((e.currentTarget as HTMLElement).style.background =
                                                    'var(--color-accent)') &&
                                                ((e.currentTarget as HTMLElement).style.color =
                                                    'var(--color-accent-fg)')}
                                            onMouseLeave={(e) =>
                                                ((e.currentTarget as HTMLElement).style.background =
                                                    'var(--color-accent-light)') &&
                                                ((e.currentTarget as HTMLElement).style.color =
                                                    'var(--color-accent-text)')}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add Row
                                        </button>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto rounded-[10px] border"
                                        style={{ borderColor: 'var(--color-border)' }}
                                    >
                                        <table
                                            className="w-full"
                                            style={{ borderCollapse: 'collapse' }}
                                        >
                                            <thead>
                                                <tr
                                                    style={{
                                                        background: 'var(--color-bg-subtle)',
                                                    }}
                                                >
                                                    {['Parameter', 'Result', 'Ref. Range', 'Unit', 'Flag', ''].map(
                                                        (h) => (
                                                            <th
                                                                key={h}
                                                                className="px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-wider"
                                                                style={{
                                                                    color: 'var(--color-text-muted)',
                                                                    borderBottom: '1px solid var(--color-border)',
                                                                }}
                                                            >
                                                                {h}
                                                            </th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map((result, index) => (
                                                    <tr
                                                        key={index}
                                                        style={{
                                                            borderBottom: index < results.length - 1
                                                                ? '1px solid var(--color-border)'
                                                                : 'none',
                                                        }}
                                                    >
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="text"
                                                                value={result.name}
                                                                onChange={(e) =>
                                                                    handleResultChange(index, 'name', e.target.value)
                                                                }
                                                                style={fieldStyle}
                                                                onFocus={onFocus}
                                                                onBlur={onBlur}
                                                                placeholder="Name"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="text"
                                                                value={result.value}
                                                                onChange={(e) =>
                                                                    handleResultChange(index, 'value', e.target.value)
                                                                }
                                                                style={fieldStyle}
                                                                onFocus={onFocus}
                                                                onBlur={onBlur}
                                                                placeholder="Value"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="text"
                                                                value={result.referenceRange}
                                                                onChange={(e) =>
                                                                    handleResultChange(
                                                                        index,
                                                                        'referenceRange',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={fieldStyle}
                                                                onFocus={onFocus}
                                                                onBlur={onBlur}
                                                                placeholder="10-20"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="text"
                                                                value={result.unit}
                                                                onChange={(e) =>
                                                                    handleResultChange(index, 'unit', e.target.value)
                                                                }
                                                                style={fieldStyle}
                                                                onFocus={onFocus}
                                                                onBlur={onBlur}
                                                                placeholder="mg/dL"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <FlagBadge flag={result.flag} />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeResultRow(index)}
                                                                disabled={results.length <= 1}
                                                                className="flex items-center justify-center transition-colors duration-100 cursor-pointer"
                                                                style={{
                                                                    width: 28,
                                                                    height: 28,
                                                                    borderRadius: 4,
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color:
                                                                        results.length <= 1
                                                                            ? 'var(--color-border-strong)'
                                                                            : 'var(--color-text-muted)',
                                                                    opacity: results.length <= 1 ? 0.4 : 0.6,
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (results.length > 1) {
                                                                        (e.currentTarget as HTMLElement).style.color =
                                                                            'var(--color-danger-text)';
                                                                        (e.currentTarget as HTMLElement).style.opacity =
                                                                            '1';
                                                                        (e.currentTarget as HTMLElement).style.background =
                                                                            'var(--color-danger-light)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    (e.currentTarget as HTMLElement).style.color =
                                                                        'var(--color-text-muted)';
                                                                    (e.currentTarget as HTMLElement).style.opacity =
                                                                        '0.6';
                                                                    (e.currentTarget as HTMLElement).style.background =
                                                                        'transparent';
                                                                }}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Template instructions */}
                                    {template?.instructions && (
                                        <div
                                            className="mt-3 p-3 rounded-[8px] text-[0.72rem]"
                                            style={{
                                                background: 'var(--color-info-light)',
                                                color: 'var(--color-info-text)',
                                                border: '1px solid var(--color-info)',
                                            }}
                                        >
                                            <span className="font-semibold">Instructions: </span>
                                            {template.instructions}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Summary tab ───────────────────────────────────── */}
                            {activeTab === 'summary' && (
                                <div className="space-y-4">
                                    <div>
                                        <label
                                            className="block text-[0.7rem] font-medium mb-1.5"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >
                                            Result Summary
                                        </label>
                                        <textarea
                                            value={resultSummary}
                                            onChange={(e) => setResultSummary(e.target.value)}
                                            rows={3}
                                            style={{
                                                ...fieldStyle,
                                                padding: '8px 10px',
                                                resize: 'vertical',
                                                minHeight: 72,
                                            }}
                                            onFocus={onFocus}
                                            onBlur={onBlur}
                                            placeholder="Summary of the results…"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="block text-[0.7rem] font-medium mb-1.5"
                                            style={{ color: 'var(--color-text-muted)' }}
                                        >
                                            Clinical Interpretation
                                        </label>
                                        <textarea
                                            value={resultInterpretation}
                                            onChange={(e) => setResultInterpretation(e.target.value)}
                                            rows={3}
                                            style={{
                                                ...fieldStyle,
                                                padding: '8px 10px',
                                                resize: 'vertical',
                                                minHeight: 72,
                                            }}
                                            onFocus={onFocus}
                                            onBlur={onBlur}
                                            placeholder="Clinical interpretation…"
                                        />
                                    </div>
                                    {test.notes && (
                                        <div
                                            className="p-3 rounded-[8px] text-[0.72rem]"
                                            style={{
                                                background: 'var(--color-bg-subtle)',
                                                color: 'var(--color-text-secondary)',
                                                border: '1px solid var(--color-border)',
                                            }}
                                        >
                                            <span className="font-semibold">Notes: </span>
                                            {test.notes}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Actions ───────────────────────────────────────── */}
                            <div
                                className="flex gap-2.5 pt-5 mt-5"
                                style={{ borderTop: '1px solid var(--color-border)' }}
                            >
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn-ghost flex-1"
                                    style={{
                                        height: 'var(--btn-height-lg)',
                                        fontSize: 'var(--text-base)',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="btn-ghost flex items-center justify-center gap-1.5"
                                    style={{
                                        padding: '0 var(--space-4)',
                                        height: 'var(--btn-height-lg)',
                                        fontSize: 'var(--text-base)',
                                    }}
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-success flex-1 flex items-center justify-center gap-1.5"
                                    style={{
                                        height: 'var(--btn-height-lg)',
                                        fontSize: 'var(--text-base)',
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div
                                                className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                                                style={{
                                                    borderColor: 'rgba(255,255,255,0.3)',
                                                    borderTopColor: '#fff',
                                                }}
                                            />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-3.5 w-3.5" />
                                            Save Results
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
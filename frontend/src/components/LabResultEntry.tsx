// src/components/LabResultEntry.tsx
import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Printer,
    Loader2,
    FileText,
    CheckCircle,
    Plus,
    Trash2,
    Edit2,
    Eye,
    Download,
    Calendar,
    User,
    Phone,
    Mail,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp
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

export const LabResultEntry: React.FC<LabResultEntryProps> = ({
    test,
    onClose,
    onSuccess
}) => {
    const { addLabTestResults, updateLabTest, labTestTemplates } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ResultField[]>([]);
    const [resultSummary, setResultSummary] = useState(test.resultSummary || '');
    const [resultInterpretation, setResultInterpretation] = useState(test.resultInterpretation || '');
    const [template, setTemplate] = useState<LabTestTemplate | null>(null);
    const [activeTab, setActiveTab] = useState<'results' | 'summary' | 'print'>('results');

    // Initialize results from template or existing data
    useEffect(() => {
        // Find template for this test
        const foundTemplate = labTestTemplates.find(t => t.name === test.testType);
        setTemplate(foundTemplate || null);

        // Initialize results
        if (test.results && Object.keys(test.results).length > 0) {
            // Load existing results
            const existingResults: ResultField[] = Object.entries(test.results).map(([key, value]) => ({
                name: key,
                value: String(value || ''),
                referenceRange: test.referenceRanges?.[key]?.referenceRange || '',
                unit: test.referenceRanges?.[key]?.unit || '',
                flag: test.referenceRanges?.[key]?.flag || 'normal'
            }));
            setResults(existingResults);
        } else if (foundTemplate) {
            // Initialize from template
            const templateFields: ResultField[] = (foundTemplate.resultFields || []).map((field: any) => ({
                name: field.name,
                value: '',
                referenceRange: foundTemplate.defaultReferenceRanges?.[field.name]?.referenceRange || '',
                unit: foundTemplate.defaultReferenceRanges?.[field.name]?.unit || '',
                flag: 'normal'
            }));
            setResults(templateFields);
        } else {
            // Default fields
            setResults([
                { name: 'Result', value: '', referenceRange: '', unit: '', flag: 'normal' },
                { name: 'Reference Range', value: '', referenceRange: '', unit: '', flag: 'normal' }
            ]);
        }
    }, [test, labTestTemplates]);

    const handleResultChange = (index: number, field: keyof ResultField, value: any) => {
        const updated = [...results];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-detect flags based on reference range
        if (field === 'value' && updated[index].referenceRange) {
            const val = parseFloat(value);
            const range = updated[index].referenceRange;
            if (!isNaN(val) && range) {
                const [low, high] = range.split('-').map(s => parseFloat(s.trim()));
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

    const addResultRow = () => {
        setResults([...results, { name: 'New Test', value: '', referenceRange: '', unit: '', flag: 'normal' }]);
    };

    const removeResultRow = (index: number) => {
        if (results.length > 1) {
            setResults(results.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Convert results to object format
            const resultsObject: Record<string, any> = {};
            const referenceRanges: Record<string, any> = {};

            results.forEach(r => {
                resultsObject[r.name] = r.value;
                referenceRanges[r.name] = {
                    referenceRange: r.referenceRange,
                    unit: r.unit,
                    flag: r.flag
                };
            });

            await addLabTestResults(test.id, {
                results: resultsObject,
                resultSummary,
                resultInterpretation,
                referenceRanges
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

    const handlePrint = () => {
        window.print();
    };

    const getFlagColor = (flag: string) => {
        switch (flag) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-300';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default: return 'bg-green-100 text-green-800 border-green-300';
        }
    };

    const getFlagIcon = (flag: string) => {
        switch (flag) {
            case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
            case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
            case 'low': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
            default: return <CheckCircle className="h-4 w-4 text-green-600" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-2xl px-6 py-4 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6" />
                            <div>
                                <h2 className="text-xl font-bold">Enter Lab Results</h2>
                                <p className="text-white/80 text-sm">{test.testNumber} - {test.patientName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Patient Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                        <div>
                            <p className="text-xs text-gray-500">Patient</p>
                            <p className="font-semibold flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {test.patientName}
                            </p>
                        </div>
                        {test.patientPhone && (
                            <div>
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="font-semibold flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {test.patientPhone}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500">Test Type</p>
                            <p className="font-semibold">{test.testType}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Priority</p>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${test.priority === 'stat' ? 'bg-red-500 text-white' :
                                    test.priority === 'urgent' ? 'bg-orange-500 text-white' :
                                        'bg-blue-500 text-white'
                                }`}>
                                {test.priority.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('results')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'results'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <FileText className="h-4 w-4 inline mr-1" />
                            Results
                        </button>
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'summary'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <FileText className="h-4 w-4 inline mr-1" />
                            Summary & Interpretation
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Results Table */}
                        {activeTab === 'results' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-700">Test Results</h3>
                                    <button
                                        type="button"
                                        onClick={addResultRow}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Row
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Test</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Result</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference Range</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Flag</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {results.map((result, index) => (
                                                <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={result.name}
                                                            onChange={(e) => handleResultChange(index, 'name', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                                                            placeholder="Test name"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={result.value}
                                                            onChange={(e) => handleResultChange(index, 'value', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                                                            placeholder="Result value"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={result.referenceRange}
                                                            onChange={(e) => handleResultChange(index, 'referenceRange', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                                                            placeholder="e.g., 10-20"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={result.unit}
                                                            onChange={(e) => handleResultChange(index, 'unit', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                                                            placeholder="Unit"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getFlagColor(result.flag)}`}>
                                                            {getFlagIcon(result.flag)}
                                                            {result.flag.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeResultRow(index)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            disabled={results.length <= 1}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {template?.instructions && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-800">
                                            <strong>Instructions:</strong> {template.instructions}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summary & Interpretation */}
                        {activeTab === 'summary' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Result Summary
                                    </label>
                                    <textarea
                                        value={resultSummary}
                                        onChange={(e) => setResultSummary(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                        placeholder="Summary of the results..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Clinical Interpretation
                                    </label>
                                    <textarea
                                        value={resultInterpretation}
                                        onChange={(e) => setResultInterpretation(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                        placeholder="Clinical interpretation of the results..."
                                    />
                                </div>

                                {test.notes && (
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-sm text-gray-600">
                                            <strong>Notes:</strong> {test.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                Print
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Results
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
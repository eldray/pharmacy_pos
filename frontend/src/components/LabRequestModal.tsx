import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    FlaskConical,
    User,
    Phone,
    Calendar,
    DollarSign,
    Loader2,
    Search,
    CheckCircle,
    Clock,
    Minus,
    AlertCircle,
    TrendingUp,
    Zap,
    UserCircle,
    FileText,
    ArrowRight,
    Plus,
    Trash2,
    Package,
    CreditCard,
    Printer
} from 'lucide-react';
import { useAppStore } from '../store';
import { LabTestTemplate, PaymentMethod } from '../types';

interface LabRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customerName?: string;
    customerPhone?: string;
}

interface SelectedTest {
    template: LabTestTemplate;
    quantity: number;
}

export const LabRequestModal: React.FC<LabRequestModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    customerName,
    customerPhone
}) => {
    const { labTestTemplates, addLabTransaction, fetchLabTestTemplates, currentUser } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
    const [formData, setFormData] = useState({
        patientName: customerName || '',
        patientPhone: customerPhone || '',
        patientAge: '',
        patientGender: 'Male' as 'Male' | 'Female' | 'Other',
        notes: ''
    });

    const safeNumber = (value: any): number => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    useEffect(() => {
        if (isOpen) {
            fetchLabTestTemplates();
            setSearchQuery('');
            setShowDropdown(false);
            if (customerName) {
                setFormData(prev => ({ ...prev, patientName: customerName || '', patientPhone: customerPhone || '' }));
            }
        }
    }, [isOpen, fetchLabTestTemplates, customerName, customerPhone]);

    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return labTestTemplates;
        const query = searchQuery.toLowerCase();
        return labTestTemplates.filter(template =>
            template.name?.toLowerCase().includes(query) ||
            template.category?.toLowerCase().includes(query) ||
            template.description?.toLowerCase().includes(query)
        );
    }, [labTestTemplates, searchQuery]);

    const isTemplateAdded = (templateId: string) => {
        return selectedTests.some(t => t.template.id === templateId);
    };

    const handleTemplateSelect = (template: LabTestTemplate) => {
        if (isTemplateAdded(template.id)) {
            alert('This test has already been added');
            return;
        }
        setSelectedTests([...selectedTests, { template, quantity: 1 }]);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const removeTest = (templateId: string) => {
        setSelectedTests(selectedTests.filter(t => t.template.id !== templateId));
    };

    const updateQuantity = (templateId: string, quantity: number) => {
        if (quantity < 1) return;
        setSelectedTests(selectedTests.map(t =>
            t.template.id === templateId ? { ...t, quantity } : t
        ));
    };

    const calculateTotal = () => {
        return selectedTests.reduce((sum, test) => {
            return sum + (safeNumber(test.template.price) * test.quantity);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTests.length === 0) {
            alert('Please select at least one test');
            return;
        }

        if (!formData.patientName) {
            alert('Please enter patient name');
            return;
        }

        if (paymentMethod !== 'cash' && !mobileMoneyNumber) {
            alert('Please enter mobile money number');
            return;
        }

        if (paymentMethod !== 'cash' && mobileMoneyNumber.length < 10) {
            alert('Please enter a valid phone number');
            return;
        }

        setLoading(true);

        try {
            const total = calculateTotal();

            const transactionData = {
                patientName: formData.patientName,
                patientPhone: formData.patientPhone || null,
                patientAge: formData.patientAge ? parseInt(formData.patientAge) : null,
                patientGender: formData.patientGender || 'Male',
                totalAmount: total,
                paidAmount: total,
                paymentMethod,
                paymentReference: paymentMethod !== 'cash' ? mobileMoneyNumber : undefined,
                paymentStatus: 'paid',
                notes: formData.notes || null,
                tests: selectedTests.map(st => ({
                    testType: st.template.name,
                    testCategory: st.template.category,
                    testPrice: safeNumber(st.template.price) * st.quantity,
                    quantity: st.quantity,
                    sampleType: st.template.sampleType || null,
                    priority: 'normal'
                }))
            };

            const result = await addLabTransaction(transactionData);

            if (result) {
                onSuccess();
                onClose();
                setSelectedTests([]);
                setSearchQuery('');
                setFormData({
                    patientName: '',
                    patientPhone: '',
                    patientAge: '',
                    patientGender: 'Male',
                    notes: ''
                });
                setMobileMoneyNumber('');
            } else {
                alert('Failed to create lab request');
            }
        } catch (err) {
            console.error('Lab request failed:', err);
            alert('Failed to create lab request');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const total = calculateTotal();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl px-6 py-5 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <FlaskConical className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Request Lab Tests</h2>
                                <p className="text-white/80 text-sm">
                                    Search and select tests for this patient
                                    {selectedTests.length > 0 && ` (${selectedTests.length} selected)`}
                                </p>
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

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Test Search */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Search & Add Tests
                            <span className="text-xs font-normal text-gray-500 ml-2">(Click to add to list)</span>
                        </label>

                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="Search for a test (e.g., CBC, Malaria, Glucose)..."
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                    autoComplete="off"
                                />
                            </div>

                            {showDropdown && searchQuery && (
                                <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-xl border-2 border-gray-100 max-h-64 overflow-y-auto">
                                    {filteredTemplates.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm">No templates found</p>
                                        </div>
                                    ) : (
                                        filteredTemplates.map((template) => {
                                            const price = safeNumber(template.price);
                                            const added = isTemplateAdded(template.id);
                                            return (
                                                <button
                                                    key={template.id}
                                                    type="button"
                                                    onClick={() => handleTemplateSelect(template)}
                                                    disabled={added}
                                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between group ${added ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                                                        }`}
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                                            {template.name}
                                                            {added && (
                                                                <span className="ml-2 text-xs text-green-600 font-normal">
                                                                    <CheckCircle className="h-3 w-3 inline mr-1" />
                                                                    Added
                                                                </span>
                                                            )}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                {template.category}
                                                            </span>
                                                            {template.sampleType && (
                                                                <span className="text-xs text-gray-500">
                                                                    Sample: {template.sampleType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-blue-600">GHS {price.toFixed(2)}</p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected Tests */}
                    {selectedTests.length > 0 && (
                        <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
                            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-600" />
                                    <span className="font-semibold text-gray-700">Selected Tests</span>
                                    <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full">
                                        {selectedTests.length}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTests([])}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                                {selectedTests.map(({ template, quantity }) => {
                                    const price = safeNumber(template.price);
                                    const total = price * quantity;
                                    return (
                                        <div key={template.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{template.name}</p>
                                                <p className="text-xs text-gray-500">{template.category}</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(template.id, quantity - 1)}
                                                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        <Minus className="h-4 w-4 text-gray-600" />
                                                    </button>
                                                    <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(template.id, quantity + 1)}
                                                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        <Plus className="h-4 w-4 text-gray-600" />
                                                    </button>
                                                </div>

                                                <div className="text-right min-w-[80px]">
                                                    <p className="font-bold text-blue-600">GHS {total.toFixed(2)}</p>
                                                    <p className="text-xs text-gray-500">@ GHS {price.toFixed(2)}</p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeTest(template.id)}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Patient Details */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-blue-600" />
                            Patient Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Patient Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter patient name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={formData.patientPhone}
                                        onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter phone number"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Age
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="number"
                                        value={formData.patientAge}
                                        onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Age"
                                        min="0"
                                        max="150"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Gender
                                </label>
                                <select
                                    value={formData.patientGender}
                                    onChange={(e) => setFormData({ ...formData, patientGender: e.target.value as any })}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Payment Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="mtn">MTN Mobile Money</option>
                                    <option value="vodafone">Vodafone Cash</option>
                                    <option value="airteltigo">AirtelTigo Money</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Amount
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={`GHS ${total.toFixed(2)}`}
                                        disabled
                                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        {paymentMethod !== 'cash' && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Mobile Money Number *
                                </label>
                                <input
                                    type="tel"
                                    value={mobileMoneyNumber}
                                    onChange={(e) => setMobileMoneyNumber(e.target.value)}
                                    placeholder="e.g., 0551234567"
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    required={paymentMethod !== 'cash'}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Notes (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Any additional notes"
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-gray-700">Total Amount:</span>
                                <span className="text-gray-600">{selectedTests.length} test{selectedTests.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-blue-600">GHS {total.toFixed(2)}</span>
                                <p className="text-xs text-gray-500">Payment: {paymentMethod.toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || selectedTests.length === 0 || !formData.patientName}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Printer className="h-5 w-5" />
                                    Pay & Print Receipt
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

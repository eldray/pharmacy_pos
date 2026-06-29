// src/pages/CompanySettings.tsx
import React, { useState, useEffect } from 'react';
import {
  Save,
  Building,
  Mail,
  Phone,
  MapPin,
  Receipt,
  Shield,
  Users,
  Plus,
  Edit2,
  Trash2,
  User,
  Search,
  Eye,
  EyeOff,
  FlaskConical
} from 'lucide-react';
import { useAppStore } from '../store';
import { User as UserType, UserRole } from '../types';
import { Card } from '../components/ui/Card';

export const CompanySettings: React.FC = () => {
  const { currentUser, company, updateCompany, fetchUsers, users, addUser, updateUser } = useAppStore();
  const [activeTab, setActiveTab] = useState('company');
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Company Settings Form Data
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    logo: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    taxId: '',
    receiptSettings: {
      header: '',
      footer: '',
      taxRate: 15,
      includeTaxId: false
    }
  });

  // User Management Form Data
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier' as UserRole,
  });

  useEffect(() => {
    if (company) {
      setCompanyFormData({
        name: company.name || '',
        logo: company.logo || '',
        address: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          state: company.address?.state || '',
          zipCode: company.address?.zipCode || '',
          country: company.address?.country || 'Ghana'
        },
        contact: {
          phone: company.contact?.phone || '',
          email: company.contact?.email || '',
          website: company.contact?.website || ''
        },
        taxId: company.taxId || '',
        receiptSettings: {
          header: company.receiptSettings?.header || 'Thank you for your business!',
          footer: company.receiptSettings?.footer || 'We hope to see you again soon!',
          taxRate: company.receiptSettings?.taxRate || 15,
          includeTaxId: company.receiptSettings?.includeTaxId || false
        }
      });
    }
    fetchUsers();
  }, [company, fetchUsers]);

  // Filter users for search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Company Settings Handlers
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateCompany(companyFormData);
      alert('Company settings updated successfully!');
    } catch (error) {
      alert('Failed to update company settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyInputChange = (path: string, value: any) => {
    setCompanyFormData(prev => {
      const keys = path.split('.');
      const lastKey = keys.pop()!;
      const target = keys.reduce((obj, key) => obj[key], prev as any);
      target[lastKey] = value;
      return { ...prev };
    });
  };

  // User Management Handlers
  const openNewUserModal = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'cashier',
    });
    setShowUserModal(true);
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userFormData.name || !userFormData.email || !userFormData.role) {
      alert('Please fill in all required fields');
      return;
    }

    if (!editingUser && !userFormData.password) {
      alert('Please enter a password for new user');
      return;
    }

    let success = false;
    if (editingUser) {
      const updates: any = {
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
      };
      if (userFormData.password) {
        updates.password = userFormData.password;
      }
      success = !!(await updateUser(editingUser.id, updates));
    } else {
      success = !!(await addUser(userFormData));
    }

    if (success) {
      setShowUserModal(false);
      fetchUsers();
    } else {
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      // Implement delete functionality
      alert('Delete functionality to be implemented');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { color: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white', label: 'Admin' },
      cashier: { color: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white', label: 'Cashier' },
      officer: { color: 'bg-gradient-to-r from-orange-500 to-red-600 text-white', label: 'Officer' },
      lab: { color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white', label: 'Lab' },
    };
    const config = roleConfig[role];
    if (!config) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-500 text-white shadow-lg">
          {role}
        </span>
      );
    }
    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${config.color} shadow-lg`}>
        {config.label}
      </span>
    );
  };

  const tabs = [
    { id: 'company', label: 'Company Info', icon: Building },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'receipt', label: 'Receipt Settings', icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">System Settings</h1>
        <p className="text-white/80">Manage your pharmacy information, receipt settings, and users</p>
      </div>

      <Card className="p-6 backdrop-blur-sm bg-white/80 border-2 border-gray-100">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200/50 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Company Information Tab */}
        {activeTab === 'company' && (
          <form onSubmit={handleCompanySubmit}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyFormData.name}
                      onChange={(e) => handleCompanyInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={companyFormData.taxId}
                      onChange={(e) => handleCompanyInputChange('taxId', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Contact Information Tab */}
        {activeTab === 'contact' && (
          <form onSubmit={handleCompanySubmit}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={companyFormData.contact.phone}
                      onChange={(e) => handleCompanyInputChange('contact.phone', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={companyFormData.contact.email}
                      onChange={(e) => handleCompanyInputChange('contact.email', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={companyFormData.contact.website}
                      onChange={(e) => handleCompanyInputChange('contact.website', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <form onSubmit={handleCompanySubmit}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={companyFormData.address.street}
                      onChange={(e) => handleCompanyInputChange('address.street', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={companyFormData.address.city}
                        onChange={(e) => handleCompanyInputChange('address.city', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Region
                      </label>
                      <input
                        type="text"
                        value={companyFormData.address.state}
                        onChange={(e) => handleCompanyInputChange('address.state', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={companyFormData.address.zipCode}
                        onChange={(e) => handleCompanyInputChange('address.zipCode', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={companyFormData.address.country}
                        onChange={(e) => handleCompanyInputChange('address.country', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Receipt Settings Tab */}
        {activeTab === 'receipt' && (
          <form onSubmit={handleCompanySubmit}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Settings</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt Header Message
                    </label>
                    <input
                      type="text"
                      value={companyFormData.receiptSettings.header}
                      onChange={(e) => handleCompanyInputChange('receiptSettings.header', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt Footer Message
                    </label>
                    <input
                      type="text"
                      value={companyFormData.receiptSettings.footer}
                      onChange={(e) => handleCompanyInputChange('receiptSettings.footer', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={companyFormData.receiptSettings.taxRate}
                      onChange={(e) => handleCompanyInputChange('receiptSettings.taxRate', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeTaxId"
                      checked={companyFormData.receiptSettings.includeTaxId}
                      onChange={(e) => handleCompanyInputChange('receiptSettings.includeTaxId', e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-xl"
                    />
                    <label htmlFor="includeTaxId" className="ml-3 block text-sm font-medium text-gray-700">
                      Include Tax ID on receipts
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

      </Card>
    </div>
  );
};
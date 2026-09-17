// src/utils/permissions.ts
import { useAppStore } from '../store';

// ═══════════════════════════════════════════════════════════════════════════
// Canonical roles — MUST match backend User model enum
// ═══════════════════════════════════════════════════════════════════════════
export type UserRole = 'admin' | 'manager' | 'pharmacist_sales' | 'cashier' | 'lab_tech';

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    pharmacist_sales: 'Pharmacist (Sales)',
    cashier: 'Cashier',
    lab_tech: 'Lab Technician',
};

// ═══════════════════════════════════════════════════════════════════════════
// Permission flags
// ═══════════════════════════════════════════════════════════════════════════
export interface Permission {
    canManageUsers: boolean;
    canDeleteUsers: boolean;
    canManageSettings: boolean;
    canManageCompany: boolean;
    canManageProducts: boolean;
    canManageInventory: boolean;
    canManageSuppliers: boolean;
    canManagePurchaseOrders: boolean;
    canManageLabTests: boolean;
    canPerformLabTests: boolean;
    canViewLabResults: boolean;
    canViewSales: boolean;
    canCreateSales: boolean;
    canAcceptPayments: boolean;
    canViewAnalytics: boolean;
    canViewProfitReport: boolean;
    canViewControlledReport: boolean;
    canViewInsurance: boolean;
    canViewBranches: boolean;
    canViewStaff: boolean;
}

const ALL_FALSE: Permission = {
    canManageUsers: false, canDeleteUsers: false, canManageSettings: false, canManageCompany: false,
    canManageProducts: false, canManageInventory: false, canManageSuppliers: false, canManagePurchaseOrders: false,
    canManageLabTests: false, canPerformLabTests: false, canViewLabResults: false,
    canViewSales: false, canCreateSales: false, canAcceptPayments: false,
    canViewAnalytics: false, canViewProfitReport: false, canViewControlledReport: false,
    canViewInsurance: false, canViewBranches: false, canViewStaff: false,
};

export const getPermissions = (role: UserRole): Permission => {
    switch (role) {
        case 'admin':
            return {
                canManageUsers: true, canDeleteUsers: true, canManageSettings: true, canManageCompany: true,
                canManageProducts: true, canManageInventory: true, canManageSuppliers: true, canManagePurchaseOrders: true,
                canManageLabTests: true, canPerformLabTests: true, canViewLabResults: true,
                canViewSales: true, canCreateSales: true, canAcceptPayments: true,
                canViewAnalytics: true, canViewProfitReport: true, canViewControlledReport: true,
                canViewInsurance: true, canViewBranches: true, canViewStaff: true,
            };

        case 'manager':
            // Manager = admin minus {Settings, Company, Delete Users}
            return {
                canManageUsers: true, canDeleteUsers: false, canManageSettings: false, canManageCompany: false,
                canManageProducts: true, canManageInventory: true, canManageSuppliers: true, canManagePurchaseOrders: true,
                canManageLabTests: true, canPerformLabTests: true, canViewLabResults: true,
                canViewSales: true, canCreateSales: true, canAcceptPayments: true,
                canViewAnalytics: true, canViewProfitReport: true, canViewControlledReport: true,
                canViewInsurance: true, canViewBranches: true, canViewStaff: true,
            };

        case 'pharmacist_sales':
            return {
                ...ALL_FALSE,
                canManageProducts: true,
                canManageInventory: true,
                canManageSuppliers: true,
                canManagePurchaseOrders: true,
                canViewLabResults: true,
                canViewSales: true,
                canCreateSales: true,
                canViewAnalytics: true,
                canViewControlledReport: true,
                canViewInsurance: true,
            };

        case 'cashier':
            return {
                ...ALL_FALSE,
                canViewSales: true,
                canCreateSales: true,
                canAcceptPayments: true,
                canViewInsurance: true,
            };

        case 'lab_tech':
            return {
                ...ALL_FALSE,
                canPerformLabTests: true,
                canViewLabResults: true,
            };

        default:
            return ALL_FALSE;
    }
};

export const usePermissions = (): Permission => {
    const { currentUser } = useAppStore();
    if (!currentUser) return getPermissions('cashier');
    return getPermissions(currentUser.role as UserRole);
};

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard visibility helpers
// ═══════════════════════════════════════════════════════════════════════════

export const getDashboardStats = (role: UserRole) => ({
    todaySales: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'cashier',
    totalRevenue: role === 'admin' || role === 'manager' || role === 'pharmacist_sales',
    inventory: role === 'admin' || role === 'manager' || role === 'pharmacist_sales',
    pendingOrders: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'cashier',
    completedLabTests: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'lab_tech',
});

export const getDashboardCharts = (role: UserRole) => ({
    dailySales: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'cashier',
    paymentMethods: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'cashier',
    stockDistribution: role === 'admin' || role === 'manager' || role === 'pharmacist_sales',
});

export const getRecentSections = (role: UserRole) => ({
    transactions: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'cashier',
    labTests: role === 'admin' || role === 'manager' || role === 'pharmacist_sales' || role === 'lab_tech',
    purchaseOrders: role === 'admin' || role === 'manager' || role === 'pharmacist_sales',
});

// ═══════════════════════════════════════════════════════════════════════════
// Quick actions for dashboard
// ═══════════════════════════════════════════════════════════════════════════
export interface QuickActionDef {
    to: string;
    label: string;
    description: string;
    iconKey: 'cart' | 'plus' | 'eye' | 'truck' | 'flask' | 'users' | 'credit-card';
}

export const getQuickActions = (role: UserRole): QuickActionDef[] => {
    const actions: QuickActionDef[] = [];

    if (role !== 'lab_tech') {
        actions.push({ to: '/dashboard/pos', label: 'New Sale', description: 'Create order', iconKey: 'cart' });
    }

    if (role === 'admin' || role === 'manager' || role === 'cashier') {
        actions.push({ to: '/dashboard/payment', label: 'Payment', description: 'Collect & print', iconKey: 'credit-card' });
    }

    if (role === 'admin' || role === 'manager' || role === 'pharmacist_sales') {
        actions.push({ to: '/dashboard/products', label: 'Add Product', description: 'Update inventory', iconKey: 'plus' });
        actions.push({ to: '/dashboard/inventory', label: 'View Stock', description: 'Check levels', iconKey: 'eye' });
        actions.push({ to: '/dashboard/purchase-orders', label: 'Purchase Order', description: 'Order from supplier', iconKey: 'truck' });
    }

    if (role !== 'cashier') {
        actions.push({ to: '/dashboard/lab', label: 'Lab Tests', description: 'Manage tests', iconKey: 'flask' });
    }

    if (role === 'admin' || role === 'manager') {
        actions.push({ to: '/dashboard/staff', label: 'Staff', description: 'Manage accounts', iconKey: 'users' });
    }

    return actions;
};
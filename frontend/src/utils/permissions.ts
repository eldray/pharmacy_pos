// src/utils/permissions.ts

import { useAppStore } from "../store";

export type UserRole = 'admin' | 'cashier' | 'pharmacist' | 'lab';

export interface Permission {
    canManageUsers: boolean;
    canManageProducts: boolean;
    canManageInventory: boolean;
    canManageSuppliers: boolean;
    canManagePurchaseOrders: boolean;
    canManageLabTests: boolean;
    canPerformLabTests: boolean;
    canViewLabResults: boolean;
    canViewSales: boolean;
    canCreateSales: boolean;
    canManageSettings: boolean;
    canViewAnalytics: boolean;
    canManageCompany: boolean;
}

export const getPermissions = (role: UserRole): Permission => {
    switch (role) {
        case 'admin':
            return {
                canManageUsers: true,
                canManageProducts: true,
                canManageInventory: true,
                canManageSuppliers: true,
                canManagePurchaseOrders: true,
                canManageLabTests: true,
                canPerformLabTests: true,
                canViewLabResults: true,
                canViewSales: true,
                canCreateSales: true,
                canManageSettings: true,
                canViewAnalytics: true,
                canManageCompany: true,
            };

        case 'pharmacist':
            return {
                canManageUsers: false,
                canManageProducts: true,
                canManageInventory: true,
                canManageSuppliers: true,
                canManagePurchaseOrders: true,
                canManageLabTests: false, // Can request but not manage templates
                canPerformLabTests: false,
                canViewLabResults: true,
                canViewSales: true,
                canCreateSales: false,
                canManageSettings: false,
                canViewAnalytics: true,
                canManageCompany: false,
            };

        case 'cashier':
            return {
                canManageUsers: false,
                canManageProducts: false,
                canManageInventory: false,
                canManageSuppliers: false,
                canManagePurchaseOrders: false,
                canManageLabTests: false, // Can request but not manage templates
                canPerformLabTests: false,
                canViewLabResults: true, // Can view their own patient's results
                canViewSales: true,
                canCreateSales: true,
                canManageSettings: false,
                canViewAnalytics: false,
                canManageCompany: false,
            };

        case 'lab':
            return {
                canManageUsers: false,
                canManageProducts: false,
                canManageInventory: false,
                canManageSuppliers: false,
                canManagePurchaseOrders: false,
                canManageLabTests: false, // Can't manage templates
                canPerformLabTests: true, // Can perform tests and enter results
                canViewLabResults: true,
                canViewSales: false, // Lab doesn't see sales data
                canCreateSales: false,
                canManageSettings: false,
                canViewAnalytics: false,
                canManageCompany: false,
            };

        default:
            return {
                canManageUsers: false,
                canManageProducts: false,
                canManageInventory: false,
                canManageSuppliers: false,
                canManagePurchaseOrders: false,
                canManageLabTests: false,
                canPerformLabTests: false,
                canViewLabResults: false,
                canViewSales: false,
                canCreateSales: false,
                canManageSettings: false,
                canViewAnalytics: false,
                canManageCompany: false,
            };
    }
};

// Hook to use permissions in components
export const usePermissions = () => {
    const { currentUser } = useAppStore();
    if (!currentUser) return getPermissions('cashier');
    return getPermissions(currentUser.role as UserRole);
};
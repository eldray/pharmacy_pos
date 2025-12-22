// User Roles
export type UserRole = 'admin' | 'cashier' | 'officer';

// User type
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

// Product/Drug type
export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode: string;
  category: string;
  unitPrice: number;
  quantity: number;
  batchNumber: string;
  expiryDate: string; // ISO date string
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

// Cart Item type
export interface CartItem {
  cartId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

// Payment Method type
export type PaymentMethod = 'cash' | 'mtn' | 'vodafone' | 'airteltigo' | 'card';

// Transaction type
export interface Transaction {
  id: string;
  transactionNumber: string;
  cashierId: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
}

// Supplier type
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  country?: string;
  createdAt: string;
}

// Purchase Order type
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'pending' | 'received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate: string;
  deliveryDate?: string;
  createdAt: string;
}

// Purchase Order Item type
export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
}

// Inventory Log type
export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: 'inflow' | 'outflow' | 'adjustment';
  quantity: number;
  reference?: string; // PO number, Transaction ID, etc.
  userId: string;
  userName: string;
  notes?: string;
  createdAt: string;
}

// Company type
export interface Company {
  id: string;
  name: string;
  logo?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  taxId?: string;
  receiptSettings: {
    header?: string;
    footer?: string;
    taxRate: number;
    includeTaxId: boolean;
  };
  createdAt: string;
  updatedAt: string;
}



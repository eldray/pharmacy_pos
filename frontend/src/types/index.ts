// User Roles
export type UserRole = 'admin' | 'cashier' | 'pharmacist' | 'lab';

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
  cost?: number; // cost price for COGS / profit reporting
  quantity: number;
  batchNumber?: string;
  expiryDate?: string; // ISO date string
  supplier?: string;
  schedule?: string; // controlled-substance schedule: 'none' | 'II'..'V'
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

// Add these to your existing types

export interface LabTestTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  sampleType?: string;
  defaultReferenceRanges?: Record<string, any>;
  resultFields: Array<{ name: string; type: string; required: boolean }>;
  instructions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabTest {
  id: string;
  testNumber: string;
  transactionId: string;
  transaction?: Transaction;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';
  testType: string;
  testCategory: string;
  testPrice: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  requestedBy: string;
  requestedByName: string;
  requestedByUser?: User;
  performedBy?: string;
  performedByName?: string;
  performedByUser?: User;
  sampleType?: string;
  sampleCollectedAt?: string;
  sampleReceivedAt?: string;
  results?: Record<string, any>;
  resultSummary?: string;
  resultInterpretation?: string;
  resultDate?: string;
  referenceRanges?: Record<string, any>;
  notes?: string;
  internalNotes?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}


// Lab Transaction Types
export interface LabTransaction {
  id: string;
  transactionNumber: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  requestedBy: string;
  requestedByName: string;
  receiptNumber?: string;
  receiptPrintedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  labTests?: LabTest[];
  createdAt: string;
  updatedAt: string;
}

export interface LabTestResult {
  id: string;
  testNumber: string;
  labTransactionId: string;
  testType: string;
  testCategory: string;
  testPrice: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  sampleType?: string;
  sampleCollectedAt?: string;
  sampleReceivedAt?: string;
  results: Record<string, any>;
  resultSummary?: string;
  resultInterpretation?: string;
  resultDate?: string;
  referenceRanges: Record<string, any>;
  notes?: string;
  performedBy?: string;
  performedByName?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  transaction?: LabTransaction;
}
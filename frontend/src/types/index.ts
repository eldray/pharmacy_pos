// User Roles
export type UserRole = 'admin' | 'manager' | 'pharmacist_sales' | 'cashier' | 'lab_tech';

// User type
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'blocked';
  token?: string;
  branchId?: string;
  staffProfile?: StaffProfile | null;
  createdAt?: string;
  updatedAt?: string;
}

// Branch / Warehouse type
export interface Branch {
  id: string;
  name: string;
  code: string;
  type: 'warehouse' | 'branch';
  address?: string;
  phone?: string;
  email?: string;
  isMain?: boolean;
  status: 'active' | 'inactive';
  createdAt?: string;
}

// Staff Profile (HR)
export interface StaffProfile {
  id: string;
  userId: string;
  user?: User;
  branchId?: string;
  branch?: Branch;
  employeeId: string;
  department: string;
  designation: string;
  phoneNumber?: string;
  address?: string;
  dob?: string;
  gender?: string;
  hireDate?: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'locum';
  salary: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'active' | 'on_leave' | 'suspended' | 'terminated';
}

// Sales Order (Pharmacist Issue -> Cashier Collect)
export interface SalesOrder {
  id: string;
  orderNumber: string;
  branchId?: string;
  createdById: string;
  createdByName?: string;
  cashierId?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  insuranceProviderId?: string;
  insuranceProviderName?: string;
  policyNumber?: string;
  insuranceCoverage?: number;
  copayAmount?: number;
  status: 'pending_payment' | 'paid' | 'cancelled';
  notes?: string;
  createdAt: string;
  refundedAt?: string;
}

export interface StockTransferItem {
  productId: string;
  productName?: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  fromBranch?: Branch;
  toBranch?: Branch;
  requestedById: string;
  requester?: User;
  approvedById?: string;
  approver?: User;
  items: StockTransferItem[];
  status: 'pending' | 'in_transit' | 'completed' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Insurance Provider
export interface InsuranceProvider {
  id: string;
  name: string;
  code: string;
  coverageType: 'fixed' | 'percentage';
  defaultCopayPercent: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
}

// Insurance Claim
export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  orderId?: string;
  insuranceProviderId: string;
  provider?: InsuranceProvider;
  policyNumber: string;
  totalAmount: number;
  claimAmount: number;
  copayPaid: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  createdAt: string;
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
  cost?: number;
  quantity: number;
  reorderLevel?: number;
  packageType?: string;
  dispensingUnit?: string;
  unitsPerPackage?: number;
  packagePrice?: number;
  sellingPrice?: number;
  insurancePrice?: number;
  allowUnitBreakdown?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  supplier?: string;
  schedule?: string;
  createdAt: string;
  updatedAt: string;
}

// Customer
export interface CustomerInsurance {
  id: string;
  customerId: string;
  insuranceProviderId: string;
  provider?: InsuranceProvider;
  policyNumber: string;
  isPrimary: boolean;
  status: 'active' | 'expired' | 'cancelled';
  notes?: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  insurances?: CustomerInsurance[];
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
  dispensingUnitMode?: 'single' | 'package';
  dosageInstructions?: string;
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
  reference?: string;
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

export interface LabTestTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  insurancePrice?: number;
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

// Lab Transaction — now the ONLY lab entity (order + transaction combined)
export interface LabTransaction {
  id: string;
  transactionNumber: string;
  orderNumber?: string;            // same value, kept for UI compat
  customerId?: string;
  customer?: Customer;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';

  subtotal: number;                // ⬅ added
  tax: number;                     // ⬅ added
  totalAmount: number;
  paidAmount: number;

  // Insurance
  insuranceProviderId?: string;
  insuranceProviderName?: string;
  policyNumber?: string;
  insuranceCoverage?: number;
  copayAmount?: number;

  // Payment
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded';

  // Lifecycle. 'pending' = awaiting cashier payment.
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  notes?: string;
  requestedBy: string;
  requestedByName: string;
  cashierId?: string;
  cashierName?: string;
  receiptNumber?: string;
  receiptPrintedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  labTests?: LabTest[];
  createdAt: string;
  updatedAt: string;
}
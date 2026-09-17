// src/store/index.ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  User,
  Product,
  CartItem,
  Transaction,
  InventoryLog,
  Supplier,
  PurchaseOrder,
  Company,
  LabTest,
  LabTestTemplate,
  LabTransaction,
} from '../types';
import api, { getErrorMessage } from '../api/api';

// ==================== INTERFACE ====================
interface AppStore {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  loginUser: (email: string, password: string) => Promise<{ user: User; token: string } | null>;

  // Company
  company: Company | null;
  fetchCompany: () => Promise<void>;
  updateCompany: (updates: Partial<Company>) => Promise<Company | null>;

  // Users
  users: User[];
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<User | null>;
  updateUser: (id: string, updates: Partial<User> & { password?: string }) => Promise<User | null>;

  // Products
  products: Product[];
  fetchProducts: (force?: boolean) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductByBarcode: (barcode: string) => Product | undefined;
  getProductByName: (name: string) => Product[];

  // Cart
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, discount?: number) => void;
  updateCartItem: (cartId: string, quantity: number, discount?: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; tax: number; total: number; taxRate: number };

  // Transactions
  transactions: Transaction[];
  fetchTransactions: (startDate?: string, endDate?: string) => Promise<void>;
  addTransaction: (transaction: Partial<Transaction>) => Promise<Transaction | null>;

  // Inventory Logs
  inventoryLogs: InventoryLog[];
  fetchInventoryLogs: () => Promise<void>;
  addInventoryLog: (log: Partial<InventoryLog>) => Promise<InventoryLog | null>;

  // Suppliers
  suppliers: Supplier[];
  fetchSuppliers: (force?: boolean) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier | null>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier | null>;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  fetchPurchaseOrders: () => Promise<void>;
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'orderDate'> & { orderDate?: string }) => Promise<PurchaseOrder | null>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<PurchaseOrder | null>;

  // Lab Test Templates
  labTestTemplates: LabTestTemplate[];
  fetchLabTestTemplates: () => Promise<void>;

  // Lab Transactions (order + transaction combined)
  labTransactions: LabTransaction[];
  fetchLabTransactions: (filters?: {
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
    patientName?: string;
  }) => Promise<void>;
  fetchLabTransaction: (id: string) => Promise<LabTransaction | null>;
  addLabTransaction: (data: any) => Promise<LabTransaction | null>;
  updateLabTransaction: (id: string, updates: any) => Promise<LabTransaction | null>;
  payLabTransaction: (id: string, payload: { paymentMethod: string; paymentReference?: string }) => Promise<any>;
  cancelLabTransaction: (id: string) => Promise<void>;
  updateLabTest: (testId: string, updates: any) => Promise<LabTest | null>;
  addLabTestResults: (testId: string, results: any) => Promise<LabTest | null>;
  reprintLabReceipt: (id: string) => Promise<any>;
  getLabTransactionStats: (startDate?: string, endDate?: string) => Promise<any>;

  // Reports
  getControlledReport: (startDate?: string, endDate?: string) => Promise<any>;
  getProfitReport: (startDate?: string, endDate?: string) => Promise<any>;
}

// ==================== HELPERS ====================
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Lightweight staleness guard.
const FRESH_MS = 30_000;
const _fetchedAt: Record<string, number> = {};
const isFresh = (key: string) => Date.now() - (_fetchedAt[key] || 0) < FRESH_MS;
const markFetched = (key: string) => { _fetchedAt[key] = Date.now(); };

const normalizeProduct = (p: any): Product => ({
  ...p,
  id: String(p._id || p.id),
  unitPrice: safeNumber(p.unitPrice),
  quantity: safeNumber(p.quantity),
  cost: safeNumber(p.cost),
  reorderLevel: safeNumber(p.reorderLevel) || 10,
});

const normalizeLabTest = (t: any): LabTest => ({
  ...t,
  id: String(t._id || t.id),
  testPrice: safeNumber(t.testPrice),
  quantity: safeNumber(t.quantity) || 1,
  patientAge: t.patientAge ? safeNumber(t.patientAge) : undefined,
  results: t.results || {},
  referenceRanges: t.referenceRanges || {},
});

const normalizeLabTransaction = (t: any): LabTransaction => ({
  ...t,
  id: String(t._id || t.id),
  transactionNumber: t.transactionNumber || t.orderNumber,
  orderNumber: t.orderNumber || t.transactionNumber,
  subtotal: safeNumber(t.subtotal ?? t.totalAmount),
  tax: safeNumber(t.tax),
  totalAmount: safeNumber(t.totalAmount ?? t.total),
  paidAmount: safeNumber(t.paidAmount),
  insuranceCoverage: safeNumber(t.insuranceCoverage),
  copayAmount: safeNumber(t.copayAmount),
  labTests: (t.labTests || t.tests || []).map(normalizeLabTest),
});

// ==================== STORE ====================
export const useAppStore = create<AppStore>((set, get) => ({
  // ==================== AUTH ====================
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => {
    set({ currentUser: null, cartItems: [] });
    localStorage.removeItem('auth_token');
  },
  loginUser: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = response.data?.user || response.data;
      const token = response.data?.token || response.data?.accessToken;
      if (userData && token) {
        localStorage.setItem('auth_token', token);
        const userWithToken = { ...userData, token };
        set({ currentUser: userWithToken });
        return { user: userWithToken, token };
      }
      return null;
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(getErrorMessage(error, 'Invalid email or password'));
    }
  },

  // ==================== COMPANY ====================
  company: null,
  fetchCompany: async () => {
    try {
      const response = await api.get('/company');
      set({ company: response.data });
    } catch (err) {
      console.error('Failed to fetch company');
    }
  },
  updateCompany: async (updates) => {
    try {
      const response = await api.put('/company', updates);
      if (response.data) {
        set({ company: response.data });
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to update company');
      return null;
    }
  },

  // ==================== USERS ====================
  users: [],
  fetchUsers: async () => {
    try {
      const response = await api.get('/users');
      set({ users: response.data });
    } catch (err) {
      console.error('Failed to fetch users');
    }
  },
  addUser: async (user) => {
    try {
      const response = await api.post('/users', user);
      if (response.data) {
        set((state) => ({ users: [...state.users, response.data] }));
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to add user');
      return null;
    }
  },
  updateUser: async (id, updates) => {
    try {
      const response = await api.put(`/users/${id}`, updates);
      if (response.data) {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? response.data : u)),
        }));
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to update user');
      return null;
    }
  },

  // ==================== PRODUCTS ====================
  products: [],
  fetchProducts: async (force = false) => {
    if (!force && isFresh('products') && get().products.length) return;
    try {
      const response = await api.get('/products');
      set({ products: response.data.map(normalizeProduct) });
      markFetched('products');
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  },
  addProduct: async (product) => {
    try {
      const formattedProduct = {
        ...product,
        unitPrice: safeNumber(product.unitPrice),
        quantity: safeNumber(product.quantity),
        cost: safeNumber(product.cost),
        reorderLevel: safeNumber(product.reorderLevel) || 10,
      };
      const response = await api.post('/products', formattedProduct);
      if (response.data) {
        const newProduct = normalizeProduct(response.data);
        set((state) => ({ products: [...state.products, newProduct] }));
        return newProduct;
      }
      return null;
    } catch (err) {
      console.error('Failed to add product');
      return null;
    }
  },
  updateProduct: async (id, updates) => {
    try {
      const formattedUpdates: any = { ...updates };
      if (updates.unitPrice !== undefined) formattedUpdates.unitPrice = safeNumber(updates.unitPrice);
      if (updates.quantity !== undefined) formattedUpdates.quantity = safeNumber(updates.quantity);
      if (updates.cost !== undefined) formattedUpdates.cost = safeNumber(updates.cost);
      if (updates.reorderLevel !== undefined) formattedUpdates.reorderLevel = safeNumber(updates.reorderLevel);

      const response = await api.put(`/products/${id}`, formattedUpdates);
      const updated = normalizeProduct(response.data);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
      }));
      return updated;
    } catch (err: any) {
      console.error('updateProduct error:', err.response?.data || err);
      return null;
    }
  },

  deleteProduct: async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id)
      }));
      return true;
    } catch (err: any) {
      console.error('deleteProduct error:', err.response?.data || err);
      return false;
    }
  },

  getProductByBarcode: (barcode: string): Product | undefined => {
    return get().products.find((p) => p.barcode === barcode);
  },
  getProductByName: (name: string): Product[] => {
    return get().products.filter((p) =>
      p.name.toLowerCase().includes(name.toLowerCase())
    );
  },

  // ==================== CART ====================
  cartItems: [],
  addToCart: (product: Product, quantity = 1, discount = 0) => {
    set((state) => {
      if (!product.id) {
        console.error('Cannot add product: missing ID', product);
        return state;
      }
      const unitPrice = safeNumber(product.unitPrice);
      const newItem: CartItem = {
        cartId: nanoid(8),
        productId: product.id,
        product: { ...product, unitPrice },
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        discount,
      };
      return { cartItems: [...state.cartItems, newItem] };
    });
  },
  updateCartItem: (cartId: string, quantity: number, discount = 0) =>
    set((state) => ({
      cartItems: state.cartItems
        .map((i) =>
          i.cartId === cartId
            ? { ...i, quantity, total: quantity * safeNumber(i.unitPrice), discount }
            : i
        )
        .filter((i) => i.quantity > 0),
    })),
  removeFromCart: (cartId: string) =>
    set((state) => ({
      cartItems: state.cartItems.filter((i) => i.cartId !== cartId),
    })),
  clearCart: () => set({ cartItems: [] }),
  getCartTotal: () => {
    const items = get().cartItems || [];
    const subtotal = items.reduce((sum, i) => sum + safeNumber(i.total), 0);
    const discount = items.reduce((sum, i) => sum + safeNumber(i.discount), 0);
    const taxRate = safeNumber(get().company?.receiptSettings?.taxRate ?? 15);
    const taxable = subtotal - discount;
    const tax = taxable * (taxRate / 100);
    const total = taxable + tax;
    return { subtotal: taxable, tax, total, taxRate };
  },

  // ==================== TRANSACTIONS ====================
  transactions: [],
  fetchTransactions: async (startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/transactions${params.toString() ? `?${params.toString()}` : ''}`);

      set({
        transactions: response.data.map((t: any) => ({
          ...t,
          subtotal: safeNumber(t.subtotal),
          tax: safeNumber(t.tax),
          total: safeNumber(t.total),
          discount: safeNumber(t.discount),
          items: (t.items || []).map((item: any) => ({
            ...item,
            quantity: safeNumber(item.quantity),
            unitPrice: safeNumber(item.unitPrice),
            total: safeNumber(item.total),
            discount: safeNumber(item.discount),
          })),
        })),
      });
    } catch (err) {
      console.error('Failed to fetch transactions');
    }
  },
  addTransaction: async (transaction) => {
    try {
      const formattedItems = (transaction.items || []).map((item: any) => ({
        productId: item.productId || item.product?.id,
        productName: item.product?.name || item.productName,
        productSku: item.product?.sku || item.productSku,
        productCategory: item.product?.category || item.productCategory,
        quantity: safeNumber(item.quantity),
        unitPrice: safeNumber(item.unitPrice),
        total: safeNumber(item.total),
        discount: safeNumber(item.discount),
      }));

      const payload = {
        ...transaction,
        items: formattedItems,
        subtotal: safeNumber(transaction.subtotal),
        tax: safeNumber(transaction.tax),
        total: safeNumber(transaction.total),
        discount: safeNumber(transaction.discount),
      };

      const response = await api.post('/transactions', payload);
      const savedTxn = response.data;
      set((state) => ({
        transactions: [savedTxn, ...state.transactions],
        cartItems: [],
      }));
      return savedTxn;
    } catch (err: any) {
      console.error('addTransaction error:', err.response?.data || err);
      return null;
    }
  },

  // ==================== INVENTORY LOGS ====================
  inventoryLogs: [],
  fetchInventoryLogs: async () => {
    try {
      const response = await api.get('/inventory/logs');
      set({ inventoryLogs: response.data });
    } catch (err) {
      console.error('Failed to fetch inventory logs');
    }
  },
  addInventoryLog: async (log) => {
    try {
      const response = await api.post('/inventory/logs', log);
      if (response.data) {
        set((state) => ({ inventoryLogs: [...state.inventoryLogs, response.data] }));
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to add inventory log');
      return null;
    }
  },

  // ==================== SUPPLIERS ====================
  suppliers: [],
  fetchSuppliers: async (force = false) => {
    if (!force && isFresh('suppliers') && get().suppliers.length) return;
    try {
      const response = await api.get('/suppliers');
      set({ suppliers: response.data });
      markFetched('suppliers');
    } catch (err) {
      console.error('Failed to fetch suppliers');
    }
  },
  addSupplier: async (supplier) => {
    try {
      const response = await api.post('/suppliers', supplier);
      if (response.data) {
        set((state) => ({ suppliers: [...state.suppliers, response.data] }));
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to add supplier');
      return null;
    }
  },
  updateSupplier: async (id, updates) => {
    try {
      const response = await api.put(`/suppliers/${id}`, updates);
      if (response.data) {
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === id ? response.data : s)),
        }));
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to update supplier');
      return null;
    }
  },

  // ==================== PURCHASE ORDERS ====================
  purchaseOrders: [],
  fetchPurchaseOrders: async () => {
    try {
      const response = await api.get('/purchase-orders');
      set({
        purchaseOrders: response.data.map((po: any) => ({
          ...po,
          id: String(po._id || po.id),
          totalAmount: safeNumber(po.totalAmount),
          items: (po.items || []).map((item: any) => ({
            ...item,
            quantity: safeNumber(item.quantity),
            unitPrice: safeNumber(item.unitPrice),
            total: safeNumber(item.total),
          })),
        })),
      });
    } catch (err) {
      console.error('Failed to fetch purchase orders');
    }
  },
  addPurchaseOrder: async (po) => {
    try {
      const formattedItems = (po.items || []).map((i: any) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: safeNumber(i.quantity),
        unitPrice: safeNumber(i.unitPrice),
        total: safeNumber(i.total),
        batchNumber: i.batchNumber || undefined,
        expiryDate: i.expiryDate || undefined,
      }));

      const payload = {
        orderNumber: po.orderNumber,
        supplierId: po.supplierId,
        items: formattedItems,
        totalAmount: safeNumber(po.totalAmount),
        expectedDeliveryDate: po.expectedDeliveryDate,
      };

      const response = await api.post('/purchase-orders', payload);
      const savedPO = response.data;
      set((state) => ({
        purchaseOrders: [savedPO, ...state.purchaseOrders],
      }));
      return savedPO;
    } catch (err: any) {
      console.error('addPurchaseOrder error:', err.response?.data || err);
      return null;
    }
  },
  updatePurchaseOrder: async (id, updates) => {
    try {
      const response = await api.put(`/purchase-orders/${id}`, updates);
      const updatedPO = response.data;
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((p) => {
          const poId = p.id || (p as any)._id;
          return poId === id ? updatedPO : p;
        }),
      }));

      if (updates.status === 'received') {
        const po = updatedPO;
        (po.items || []).forEach(async (item: any) => {
          const product = get().products.find(p => p.id === item.productId);
          if (product) {
            const newQty = safeNumber(product.quantity) + safeNumber(item.quantity);
            await get().updateProduct(item.productId, {
              quantity: newQty,
              batchNumber: item.batchNumber || product.batchNumber,
              expiryDate: item.expiryDate || product.expiryDate,
            });
          }
        });
      }
      return updatedPO;
    } catch (err: any) {
      console.error('updatePurchaseOrder error:', err.response?.data || err);
      return null;
    }
  },

  // ==================== LAB TEST TEMPLATES ====================
  labTestTemplates: [],
  fetchLabTestTemplates: async () => {
    try {
      const response = await api.get('/lab-tests/templates');
      const normalized = response.data.map((template: any) => ({
        ...template,
        price: safeNumber(template.price),
      }));
      set({ labTestTemplates: normalized });
      return normalized;
    } catch (err: any) {
      console.error('Failed to fetch lab test templates:', err.response?.data || err);
      throw err;
    }
  },

  // ==================== LAB TRANSACTIONS (single source of truth) ====================
  labTransactions: [],

  fetchLabTransactions: async (filters) => {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.q) params.append('q', filters.q);
      if (filters?.patientName) params.append('patientName', filters.patientName);

      const response = await api.get(
        `/lab-transactions${params.toString() ? `?${params.toString()}` : ''}`
      );
      set({ labTransactions: (response.data || []).map(normalizeLabTransaction) });
    } catch (err: any) {
      console.error('Failed to fetch lab transactions:', err.response?.data || err);
      throw err;
    }
  },

  fetchLabTransaction: async (id) => {
    try {
      const response = await api.get(`/lab-transactions/${id}`);
      return normalizeLabTransaction(response.data);
    } catch (err) {
      console.error('Failed to fetch lab transaction:', err);
      return null;
    }
  },

  /**
   * Creates a pre-payment lab order. Status = 'pending', paymentStatus = 'pending'.
   * The cashier pays it later via payLabTransaction().
   */
  addLabTransaction: async (data) => {
    const response = await api.post('/lab-transactions', data);
    const tx = normalizeLabTransaction(response.data);
    set((state) => ({ labTransactions: [tx, ...state.labTransactions] }));
    return tx;
  },

  updateLabTransaction: async (id, updates) => {
    try {
      const response = await api.put(`/lab-transactions/${id}`, updates);
      const updated = normalizeLabTransaction(response.data);
      set((state) => ({
        labTransactions: state.labTransactions.map((t) => (t.id === id ? updated : t)),
      }));
      return updated;
    } catch (err: any) {
      console.error('Update lab transaction error:', err.response?.data || err);
      return null;
    }
  },

  /** Cashier action: mark a pending lab transaction as paid. */
  payLabTransaction: async (id, payload: { paymentMethod: string; paymentReference?: string }) => {
    const response = await api.post(`/lab-transactions/${id}/pay`, payload);
    const updated = normalizeLabTransaction(response.data.transaction || response.data);
    set((state) => ({
      labTransactions: state.labTransactions.map((t) => (t.id === id ? updated : t)),
    }));
    return response.data;
  },

  cancelLabTransaction: async (id) => {
    await api.post(`/lab-transactions/${id}/cancel`);
    set((state) => ({
      labTransactions: state.labTransactions.map((t) =>
        t.id === id ? { ...t, status: 'cancelled' } : t
      ),
    }));
  },

  updateLabTest: async (testId, updates) => {
    try {
      const response = await api.put(`/lab-transactions/tests/${testId}`, updates);
      const updated = response.data;
      set((state) => ({
        labTransactions: state.labTransactions.map((t) => ({
          ...t,
          labTests: (t.labTests || []).map((test) =>
            test.id === testId ? { ...test, ...updated } : test
          ),
        })),
      }));
      return updated;
    } catch (err: any) {
      console.error('Update lab test error:', err.response?.data || err);
      return null;
    }
  },

  addLabTestResults: async (testId, results) => {
    try {
      const response = await api.post(`/lab-transactions/tests/${testId}/results`, results);
      const updated = response.data;
      set((state) => ({
        labTransactions: state.labTransactions.map((t) => ({
          ...t,
          labTests: (t.labTests || []).map((test) =>
            test.id === testId ? { ...test, ...updated } : test
          ),
        })),
      }));
      return updated;
    } catch (err: any) {
      console.error('Add results error:', err.response?.data || err);
      return null;
    }
  },

  reprintLabReceipt: async (id) => {
    try {
      const response = await api.post(`/lab-transactions/${id}/reprint`);
      return response.data;
    } catch (err: any) {
      console.error('Reprint receipt error:', err.response?.data || err);
      return null;
    }
  },

  getLabTransactionStats: async (startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(
        `/lab-transactions/stats/summary${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.data;
    } catch (err: any) {
      console.error('Get lab stats error:', err.response?.data || err);
      return null;
    }
  },

  // ==================== REPORTS ====================
  getControlledReport: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const qs = params.toString();
      const response = await api.get(`/transactions/reports/controlled${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (err: any) {
      console.error('Get controlled report error:', err.response?.data || err);
      return null;
    }
  },

  getProfitReport: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const qs = params.toString();
      const response = await api.get(`/transactions/reports/profit${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (err: any) {
      console.error('Get profit report error:', err.response?.data || err);
      return null;
    }
  },
}));

// ==================== INIT STORE ====================
// Role names MUST match backend User model enum:
//   'admin' | 'manager' | 'pharmacist_sales' | 'cashier' | 'lab_tech'
export const initStore = async (userRole: string) => {
  const store = useAppStore.getState();
  const errors: string[] = [];

  console.log(`🚀 Initializing store for role: ${userRole}`);

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isPharmacist = userRole === 'pharmacist_sales';
  const isCashier = userRole === 'cashier';
  const isLab = userRole === 'lab_tech';

  try {
    // BASE DATA (all roles)
    await Promise.all([
      store.fetchCompany().catch((e) => errors.push('Company: ' + e.message)),
      store.fetchProducts().catch((e) => errors.push('Products: ' + e.message)),
    ]);

    // SUPPLIERS (admin, manager, pharmacist_sales)
    if (isAdmin || isManager || isPharmacist) {
      await store.fetchSuppliers().catch((e) => errors.push('Suppliers: ' + e.message));
    }

    // TRANSACTIONS (admin, manager, pharmacist_sales, cashier)
    if (isAdmin || isManager || isPharmacist || isCashier) {
      await store.fetchTransactions().catch((e) => errors.push('Transactions: ' + e.message));
    }

    // PURCHASE ORDERS + INVENTORY LOGS (admin, manager, pharmacist_sales)
    if (isAdmin || isManager || isPharmacist) {
      await Promise.all([
        store.fetchPurchaseOrders().catch((e) => errors.push('Purchase Orders: ' + e.message)),
        store.fetchInventoryLogs().catch((e) => errors.push('Inventory Logs: ' + e.message)),
      ]);
    }

    // LAB DATA (admin, manager, pharmacist_sales, lab_tech)
    if (isAdmin || isManager || isPharmacist || isLab) {
      await Promise.all([
        store.fetchLabTransactions().catch((e) => errors.push('Lab Transactions: ' + e.message)),
        store.fetchLabTestTemplates().catch((e) => errors.push('Lab Templates: ' + e.message)),
      ]);
    }

    // USERS (admin, manager)
    if (isAdmin || isManager) {
      await store.fetchUsers().catch((e) => errors.push('Users: ' + e.message));
    }

    const state = useAppStore.getState();
    console.log(`✅ Store initialized for: ${userRole}`);
    console.log(`   Products: ${state.products.length}`);
    console.log(`   Lab Tests: ${state.labTransactions.length}`);
    console.log(`   Users: ${state.users.length}`);

    if (errors.length > 0) {
      console.warn('⚠️ Some data failed to load:', errors);
    }

    return { success: true, errors };
  } catch (error: any) {
    console.error('❌ Store initialization failed:', error);
    return { success: false, errors: [error.message] };
  }
};
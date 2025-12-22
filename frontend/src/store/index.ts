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
} from '../types';
import api from '../api/api';

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
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>;
  getProductByBarcode: (barcode: string) => Product | undefined;
  getProductByName: (name: string) => Product[];

  // Cart
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, discount?: number) => void;
  updateCartItem: (cartId: string, quantity: number, discount?: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; tax: number; total: number };

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
  fetchSuppliers: () => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier | null>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier | null>;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  fetchPurchaseOrders: () => Promise<void>;
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'orderDate'> & { orderDate?: string }) => Promise<PurchaseOrder | null>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<PurchaseOrder | null>;
}

// ==================== STORE IMPLEMENTATION ====================
export const useAppStore = create<AppStore>((set, get) => ({
  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => {
    set({ currentUser: null, cartItems: [] });
    localStorage.removeItem('auth_token');
  },
  loginUser: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data) {
        const userData = response.data.user || response.data;
        const token = response.data.token || response.data.accessToken;
        if (userData && token) {
          localStorage.setItem('auth_token', token);
          const userWithToken = { ...userData, token };
          set({ currentUser: userWithToken });
          return { user: userWithToken, token };
        }
      }
      return null;
    } catch (error: any) {
      console.error('Login failed:', error);
      return null;
    }
  },

  // Company
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

  // Users
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

  // Products
  products: [],
  fetchProducts: async () => {
    try {
      const response = await api.get('/products');
      const products = response.data.map((p: any) => ({
        ...p,
        id: String(p._id || p.id),
      }));
      set({ products });
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  },
  addProduct: async (product) => {
    try {
      const response = await api.post('/products', product);
      if (response.data) {
        set((state) => ({ products: [...state.products, response.data] }));
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to add product');
      return null;
    }
  },
  updateProduct: async (id, updates) => {
    try {
      const response = await api.put(`/products/${id}`, updates);
      const updated = response.data;
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
      }));
      return updated;
    } catch (err: any) {
      console.error('updateProduct error:', err.response?.data || err);
      return null;
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

  // Cart – Always add as NEW line item
  cartItems: [],
  addToCart: (product: Product, quantity = 1, discount = 0) => {
    set((state) => {
      if (!product.id) {
        console.error('Cannot add product: missing ID', product);
        return state;
      }

      const newItem: CartItem = {
        cartId: nanoid(8),
        productId: product.id,
        product: { ...product },
        quantity,
        unitPrice: product.unitPrice,
        total: quantity * product.unitPrice,
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
            ? { ...i, quantity, total: quantity * i.unitPrice, discount }
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
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const discount = items.reduce((sum, i) => sum + (i.discount || 0), 0);
    const tax = (subtotal - discount) * 0.15;
    const total = subtotal - discount + tax;
    return { subtotal: subtotal - discount, tax, total };
  },

  // Transactions – Backend handles stock
  transactions: [],
  fetchTransactions: async (startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/transactions${params.toString() ? `?${params.toString()}` : ''}`);
      set({ transactions: response.data });
    } catch (err) {
      console.error('Failed to fetch transactions');
    }
  },
addTransaction: async (transaction) => {
  try {
    const response = await api.post('/transactions', {
      ...transaction,
      // Ensure customer data is included
      customerName: transaction.customerName,
      customerPhone: transaction.customerPhone
    });
    const savedTxn = response.data;

    set((state) => ({
      transactions: [savedTxn, ...state.transactions],
      cartItems: [], // clear cart
    }));

    return savedTxn;
  } catch (err: any) {
    console.error('addTransaction error:', err.response?.data || err);
    return null;
  }
},

  // Inventory Logs
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

  // Suppliers
  suppliers: [],
  fetchSuppliers: async () => {
    try {
      const response = await api.get('/suppliers');
      set({ suppliers: response.data });
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

  // Purchase Orders
  purchaseOrders: [],
  fetchPurchaseOrders: async () => {
    try {
      const response = await api.get('/purchase-orders');
      const purchaseOrders = response.data.map((po: any) => ({
        ...po,
        id: String(po._id || po.id),
      }));
      set({ purchaseOrders });
    } catch (err) {
      console.error('Failed to fetch purchase orders');
    }
  },

  addPurchaseOrder: async (po) => {
    try {
      // Ensure all item data is properly formatted
      const formattedItems = po.items.map((i: any) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
        batchNumber: i.batchNumber || undefined,
        expiryDate: i.expiryDate || undefined,
      }));

      const payload = {
        orderNumber: po.orderNumber,
        supplierId: po.supplierId,
        items: formattedItems,
        totalAmount: Number(po.totalAmount),
        expectedDeliveryDate: po.expectedDeliveryDate,
      };

      console.log('Sending PO payload:', JSON.stringify(payload, null, 2));

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
      console.log('Updating PO:', { id, updates });
      
      const response = await api.put(`/purchase-orders/${id}`, updates);
      const updatedPO = response.data;

      console.log('PO updated successfully:', updatedPO);

      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((p) => {
          // Try multiple ID fields for matching
          const poId = p.id || (p as any)._id;
          return poId === id ? updatedPO : p;
        }),
      }));

      // If marked as received → update stock locally
      if (updates.status === 'received') {
        const po = updatedPO;
        po.items.forEach(async (item: any) => {
          const product = get().products.find(p => p.id === item.productId);
          if (product) {
            const newQty = product.quantity + item.quantity;
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
      console.error('updatePurchaseOrder error:', {
        id,
        updates,
        error: err.response?.data || err.message
      });
      return null;
    }
  },
}));

// Auto-fetch initial data
export const initStore = async (userRole: string) => {
  const store = useAppStore.getState();
  await store.fetchCompany();
  await store.fetchProducts();
  await store.fetchSuppliers();

  if (userRole === 'admin') {
    await store.fetchUsers();
    await store.fetchPurchaseOrders();
    await store.fetchInventoryLogs();
    await store.fetchTransactions();
  }

  if (userRole === 'admin' || userRole === 'officer') {
    await store.fetchPurchaseOrders();
    await store.fetchInventoryLogs();
  }
};

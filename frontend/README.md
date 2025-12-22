# Pharmacy POS & Inventory Management System

Modern React application for managing pharmacy/hospital inventory, sales, and operations with role-based access control.

## Project Status

- **Project Type**: React 18 + TypeScript Modern Web Application
- **Entry Point**: `src/main.tsx` (React application entry)
- **Build System**: Vite 7.0.0 (Fast development and build)
- **Styling System**: Tailwind CSS 3.4.17 (Atomic CSS framework)
- **State Management**: Zustand 4.4.7 (Lightweight client-side state)
- **Current Phase**: MVP Complete - POS System & Inventory Management

## ⚠️ CRITICAL: Do NOT Modify index.html Entry Point

**WARNING**: This is a Vite + React project. **NEVER** modify this critical line in `index.html`:

```html
<script type="module" src="/src/main.tsx"></script>
```

**Why**: This is the core entry point. Any modification will cause the app to completely stop working.

**Do instead**: Work in `src/` directory - modify `App.tsx`, add components in `src/components/`, pages in `src/pages/`.

## Features Implemented

### Phase 1: MVP - POS & Basic Inventory

### ✅ Authentication & Authorization
- Role-based access control (Admin, Cashier, Officer)
- JWT-like token system (simulated for MVP with localStorage)
- Demo login credentials for testing
- Session persistence across page reloads

### ✅ Point of Sale (POS) System (Cashier Role)
- **Product Search & Selection**:
  - Search by product name
  - Search by barcode scan
  - Display all available products
  - Real-time stock level display

- **Shopping Cart Management**:
  - Add/remove items from cart
  - Adjust quantities in-cart
  - Discount percentage application
  - Real-time cart calculations

- **Payment Processing**:
  - Multiple payment methods: Cash, MTN Mobile Money, Vodafone Cash, AirtelTigo Money
  - Mobile money number capture with provider selection
  - VAT (15%) automatic calculation
  - Payment reference generation

- **Receipt Generation**:
  - Professional receipt modal
  - Print receipt functionality
  - Transaction number and cashier tracking
  - Itemized breakdown with quantities and pricing

### ✅ Inventory Management
- Track product quantities
- Batch numbers and expiry dates
- SKU and barcode auto-generation
- Inventory logs for stock movements (inflow/outflow)
- In-memory inventory updates on sales

### ✅ Transaction Management
- Record all sales transactions
- Transaction number generation
- Cashier name and ID tracking
- Payment method recording
- Transaction history storage

### Phase 2: Inventory Management & Product CRUD (Completed)

### ✅ Officer Inventory Management Page
- **Stock Level Monitoring**:
  - View all products with real-time stock levels
  - Search products by name, SKU, barcode, or category
  - Visual stock badges (Out of Stock, Low Stock, Medium Stock, In Stock)
  - Expiry status badges (Expired, Expiring Soon, Expiring in 3mo, Valid)

- **Alert System**:
  - Low Stock Alert card showing products below 20 units
  - Expiry Alert card showing products expiring within 3 months
  - Real-time alert counts and product listings

- **Stock Adjustment Interface**:
  - Adjust inventory quantities (increase/decrease)
  - Add notes for each adjustment
  - Real-time calculation of new stock levels
  - Prevent negative stock adjustments
  - Automatic inventory log creation

### ✅ Admin Product Management
- **Product CRUD Operations**:
  - Add new products with complete details
  - Edit existing product information
  - View all products in organized grid layout
  - Auto-generate SKU and Barcode on creation

- **Product Details Tracked**:
  - Name, description, category
  - Unit price and quantity
  - SKU and barcode (auto-generated)
  - Batch number and expiry date
  - Supplier information

### ✅ Admin Supplier Management
- **Supplier CRUD Operations**:
  - Add new suppliers
  - Edit supplier information
  - View all suppliers in card layout
  - Complete contact information management

- **Supplier Details Tracked**:
  - Company name
  - Email and phone
  - Full address (street, city, country)
  - Creation date

### ✅ Admin Dashboard with Tabs
- **Unified Admin Interface**:
  - Tabbed navigation for Products, Suppliers, Purchase Orders, Analytics, and POS
  - Quick access to all admin functions
  - Seamless switching between management modules

### Phase 3: Purchase Orders & Supplier Integration (Completed)

### ✅ Purchase Order Management
- **PO Creation**:
  - Create purchase orders linked to suppliers
  - Add multiple products with quantities and unit prices
  - Optional batch numbers and expiry dates per item
  - Automatic PO number generation
  - Set expected delivery dates

- **PO Tracking**:
  - View all purchase orders with status badges
  - Status indicators: Pending, Received, Cancelled
  - Display supplier information and order details
  - Show order date, expected delivery, and actual delivery dates
  - Itemized breakdown with quantities and totals

- **Inventory Integration**:
  - Mark POs as received with one-click action
  - Automatic stock quantity updates on receipt
  - Update batch numbers and expiry dates from PO items
  - Automatic inventory log creation for inflow tracking
  - Cancel orders when needed

- **Order Management Actions**:
  - Receive orders and update inventory automatically
  - Cancel pending orders
  - View complete order history
  - Track delivery status and dates

## Project Architecture

### Directory Structure

```
src/
├── api/
│   └── auth.ts                    # Authentication logic & JWT helpers
├── assets/                        # Static assets
├── components/
│   ├── AdminDashboard.tsx        # Admin dashboard with tabbed navigation
│   ├── Login.tsx                 # Login page with demo credentials
│   ├── POSInterface.tsx          # Main POS interface
│   └── ReceiptModal.tsx          # Receipt display & print
├── pages/
│   ├── AnalyticsPage.tsx         # Admin sales analytics and reporting
│   ├── InventoryPage.tsx         # Officer inventory management with stock adjustments
│   ├── ProductManagement.tsx     # Admin product CRUD interface
│   ├── PurchaseOrderPage.tsx     # Admin purchase order creation and tracking
│   └── SupplierManagement.tsx    # Admin supplier management
├── store/
│   └── index.ts                  # Zustand store with all state management
├── types/
│   └── index.ts                  # TypeScript interfaces & types
├── App.tsx                       # Main app component with role-based routing
├── index.css                     # Global styles (Tailwind)
└── main.tsx                      # React entry point
```

### Core Data Models

**User Types**:
- `User`: Contains id, name, email, role, optional token
- `UserRole`: 'admin' | 'cashier' | 'officer'

**Product Management**:
- `Product`: Drug/consumable with SKU, barcode, batch number, expiry date, quantity tracking
- `CartItem`: Product in shopping cart with quantity and calculated totals
- `InventoryLog`: Track stock movements (inflow/outflow) with user & timestamp

**Sales**:
- `Transaction`: Complete sale record with items, totals, payment method, cashier info
- `PaymentMethod`: 'cash' | 'mtn' | 'vodafone' | 'airteltigo' | 'card'

**Supplier Management** (structure ready, UI pending):
- `Supplier`: Name, contact, address information
- `PurchaseOrder`: Order tracking with supplier, items, delivery status

## State Management (Zustand Store)

Central store (`src/store/index.ts`) manages:

- **Auth**: Current user, login/logout
- **Products**: Add, update, search by barcode/name
- **Cart**: Add/remove items, update quantities, calculate totals
- **Transactions**: Record and retrieve sales
- **Inventory**: Track stock movements
- **Suppliers & POs**: Structure for future expansion

## Development Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build (local testing)
npm run preview

# Lint & format (if added in future)
npm run lint
```

## Building & Deployment

The project uses Vite for fast builds:
- **Build output**: `dist/` directory
- **Build command**: `npm run build`
- **Build time**: ~40 seconds (optimized with code splitting)
- **Production ready**: Minified, tree-shaken, and optimized

## Authentication System

### Login Credentials (For Testing)

1. **Admin**
   - Email: `admin@pharmacy.com`
   - Password: `admin123`

2. **Cashier** (Primary for MVP)
   - Email: `cashier@pharmacy.com`
   - Password: `cashier123`

3. **Officer**
   - Email: `officer@pharmacy.com`
   - Password: `officer123`

### Token Management

- Tokens stored in `localStorage` with key `auth_token`
- JWT-like format: `jwt_<base64_encoded_payload>`
- Verified on app load for session persistence
- Includes userId, role, and timestamp

## MVP Data

### Initial Products

The system comes with 3 sample products:
1. Paracetamol 500mg - GHS 2.50 (100 qty)
2. Amoxicillin 250mg - GHS 5.00 (50 qty)
3. Ibuprofen 400mg - GHS 3.75 (75 qty)

### Initial Suppliers

1. Pharma Inc (Accra)
2. Health Plus (Kumasi)

### Phase 4: Analytics & Reporting (Completed)

### ✅ Sales Analytics Dashboard
- **Revenue Metrics**:
  - Total revenue tracking with date range filtering
  - Average transaction value calculation
  - Total items sold counter
  - Real-time inventory valuation

- **Date Range Filtering**:
  - Today, Week, Month presets
  - Custom date range selection
  - Dynamic transaction filtering

- **Payment Method Analytics**:
  - Revenue breakdown by payment method
  - Percentage distribution visualization
  - Progress bars for visual comparison

- **Top Products Report**:
  - Top 5 selling products by revenue
  - Quantity sold tracking
  - Revenue per product

- **Transaction History**:
  - Complete transaction log with filtering
  - Display transaction details (number, date, cashier, payment method, total)
  - Searchable and sortable table

- **Export Functionality**:
  - CSV export for filtered transactions
  - Automatic filename generation with timestamp
  - Include all transaction details in export

## Next Steps for Expansion

### Phase 5: Advanced Features
- Customer profile management & history
- Loyalty program integration
- SMS/Email receipt delivery
- Multi-location support
- Barcode label printing
- Admin user & permission management

## Technical Notes

### State Persistence
- User authentication persisted in `localStorage` (token)
- Transactions and inventory logs exist in-memory (session scope)
- For production, implement backend database integration

### In-Memory Data
Current MVP uses in-memory store for rapid prototyping. For production:
- Backend Integration Skill recommended
- Implement Youware Backend with:
  - D1 Database for data persistence
  - Authentication system for users
  - API endpoints for all operations
  - R2 Storage for receipts/reports if needed

### UI/UX Approach
- Responsive design with mobile-first approach
- Tailwind CSS for consistent styling
- Lucide React icons for visual feedback
- Form validation and error handling
- Accessibility considerations (semantic HTML, ARIA labels)

### Performance
- Zustand for minimal re-render overhead
- Code splitting via Vite
- Lazy loading components (ready for React Router expansion)
- Optimized for modern browsers

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Important Notes for Developers

1. **Types First**: Always update `src/types/index.ts` when adding new features
2. **Store Updates**: Modify `src/store/index.ts` for state changes
3. **Component Naming**: Use PascalCase for React components
4. **Props Interface**: Define TypeScript interfaces for all props
5. **Asset Paths**: Use absolute paths `/assets/` (not `src/assets/`)
6. **Tailwind**: Leverage utility classes instead of custom CSS
7. **Git Commits**: Include feature type (feat/fix/docs) in commit messages

## Role-Based Access Control

The application implements strict role-based routing:

- **Cashier**: Access to POS interface only (`POSInterface`)
- **Officer**: Access to Inventory Management page (`InventoryPage`)
  - View all products with stock levels
  - Adjust stock quantities
  - Monitor low stock and expiry alerts
- **Admin**: Full dashboard with tabbed navigation (`AdminDashboard`)
  - Products tab: Complete product CRUD
  - Suppliers tab: Supplier management
  - Purchase Orders tab: PO creation, tracking, and receipt
  - Analytics tab: Sales reports, revenue metrics, and data export
  - POS tab: Access to sales interface

Role assignment happens in `src/App.tsx` based on `currentUser.role`.

## How to Add New Features

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route logic in `src/App.tsx` based on `currentUser.role`
3. If needed for admin, add new tab in `src/components/AdminDashboard.tsx`
4. Update store if needed in `src/store/index.ts`

### Adding Store Actions
1. Add interface to `AppStore` in `src/store/index.ts`
2. Implement action in `create<AppStore>()` callback
3. Export and use via `useAppStore()` hook

### Adding Types
1. Define in `src/types/index.ts`
2. Import in files that use the type
3. Keep types organized by feature

## Contact & Support

For additional features or bug reports, refer to project documentation or contact the development team.


/**
 * Config.gs — Application Configuration
 * Al Amal Distribution Management System
 * شركة الأمل لتوزيع المنتجات الغذائية
 * 
 * IMPORTANT: Replace SPREADSHEET_ID with your actual Google Spreadsheet ID.
 * To find it: Open your spreadsheet → look at the URL:
 * https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
 * Copy the long string between /d/ and /edit
 */

var CONFIG = {
  SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE',
  
  // Application Info
  APP_NAME_AR: 'شركة الأمل لتوزيع المنتجات الغذائية',
  APP_NAME_EN: 'Al Amal Food Distribution Company',
  APP_VERSION: '1.0.0',
  COUNTRY: 'Egypt',
  CURRENCY_CODE: 'EGP',
  CURRENCY_SYMBOL_AR: 'ج.م.',
  CURRENCY_SYMBOL_EN: 'EGP',
  DECIMAL_PLACES: 2,
  DEFAULT_LANGUAGE: 'ar',
  TIMEZONE: 'Africa/Cairo',
  
  // Authentication
  SESSION_EXPIRY_HOURS: 24,
  MAX_FAILED_LOGINS: 5,
  LOCKOUT_MINUTES: 15,
  
  // Business Defaults
  DEFAULT_TAX_RATE: 0.14,
  DEFAULT_PAYMENT_TERMS_DAYS: 30,
  MAX_REP_DISCOUNT_PERCENT: 5,
  DEFAULT_CREDIT_LIMIT: 50000,
  LOW_STOCK_THRESHOLD: 10,
  EXPIRY_WARNING_DAYS: 30,
  
  // Invoice Numbering
  INVOICE_PREFIX: 'INV',
  PO_PREFIX: 'PO',
  PI_PREFIX: 'PI',
  RECEIPT_PREFIX: 'RCP',
  RETURN_PREFIX: 'RET',
  EXPENSE_PREFIX: 'EXP',
  CREDIT_NOTE_PREFIX: 'CN',
  SP_PREFIX: 'SP',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  
  // Roles
  ROLES: {
    MANAGER: 'MANAGER',
    REPRESENTATIVE: 'REPRESENTATIVE'
  },
  
  // Statuses
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
    POSTED: 'posted',
    CANCELLED: 'cancelled',
    PARTIALLY_PAID: 'partially_paid',
    PAID: 'paid',
    PARTIALLY_RETURNED: 'partially_returned',
    FULLY_RETURNED: 'fully_returned',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    COMPLETED: 'completed',
    SALEABLE: 'saleable',
    DAMAGED: 'damaged',
    EXPIRED: 'expired',
    QUARANTINE: 'quarantine'
  },
  
  // Movement Types
  MOVEMENT_TYPES: {
    PURCHASE_RECEIPT: 'purchase_receipt',
    SALES_DEDUCTION: 'sales_deduction',
    SALES_RETURN: 'sales_return',
    PURCHASE_RETURN: 'purchase_return',
    ADJUSTMENT_IN: 'adjustment_in',
    ADJUSTMENT_OUT: 'adjustment_out',
    DAMAGED: 'damaged',
    EXPIRED: 'expired'
  },
  
  // Payment Methods
  PAYMENT_METHODS: {
    CASH: 'cash',
    BANK_TRANSFER: 'bank_transfer',
    ELECTRONIC: 'electronic',
    CHECK: 'check'
  },
  
  // Financial Account Types
  ACCOUNT_TYPES: {
    CASH: 'cash',
    BANK: 'bank'
  },
  
  // Central Warehouse
  CENTRAL_WAREHOUSE_CODE: 'WH-001'
};

// ============================================================
// Sheet Names — Single source of truth for all sheet references
// ============================================================
var SHEETS = {
  USERS: 'Users',
  REPRESENTATIVES: 'Representatives',
  CUSTOMERS: 'Customers',
  CUSTOMER_ASSIGNMENTS: 'CustomerAssignments',
  SUPPLIERS: 'Suppliers',
  PRODUCT_CATEGORIES: 'ProductCategories',
  UNITS_OF_MEASURE: 'UnitsOfMeasure',
  PRODUCT_UNIT_CONVERSIONS: 'ProductUnitConversions',
  PRODUCTS: 'Products',
  WAREHOUSES: 'Warehouses',
  INVENTORY_BATCHES: 'InventoryBatches',
  INVENTORY_BALANCES: 'InventoryBalances',
  INVENTORY_MOVEMENTS: 'InventoryMovements',
  PURCHASE_ORDERS: 'PurchaseOrders',
  PURCHASE_ORDER_ITEMS: 'PurchaseOrderItems',
  PURCHASE_INVOICES: 'PurchaseInvoices',
  PURCHASE_INVOICE_ITEMS: 'PurchaseInvoiceItems',
  SUPPLIER_PAYMENTS: 'SupplierPayments',
  SALES_INVOICES: 'SalesInvoices',
  SALES_INVOICE_ITEMS: 'SalesInvoiceItems',
  SALES_RETURNS: 'SalesReturns',
  SALES_RETURN_ITEMS: 'SalesReturnItems',
  CUSTOMER_PAYMENTS: 'CustomerPayments',
  PAYMENT_ALLOCATIONS: 'PaymentAllocations',
  CUSTOMER_CREDIT_NOTES: 'CustomerCreditNotes',
  FINANCIAL_ACCOUNTS: 'FinancialAccounts',
  CASH_TRANSACTIONS: 'CashTransactions',
  EXPENSES: 'Expenses',
  SALES_TARGETS: 'SalesTargets',
  AUDIT_LOGS: 'AuditLogs',
  NOTIFICATIONS: 'Notifications',
  IMPORT_JOBS: 'ImportJobs',
  SETTINGS: 'Settings'
};

// ============================================================
// Schema Definitions — Column headers for each sheet (row 1)
// The first column is always the primary key ID
// ============================================================
var SCHEMAS = {
  Users: [
    'userId', 'username', 'displayNameAr', 'displayNameEn', 'email',
    'passwordHash', 'salt', 'role', 'repId', 'status',
    'failedLogins', 'lockedUntil', 'lastLoginAt', 'createdAt', 'updatedAt'
  ],
  Representatives: [
    'repId', 'repCode', 'nameAr', 'nameEn', 'userId',
    'phone', 'email', 'commissionRate', 'status', 'createdAt', 'updatedAt'
  ],
  Customers: [
    'customerId', 'customerCode', 'nameAr', 'nameEn', 'type',
    'phone', 'address', 'city', 'creditLimit', 'paymentTermsDays',
    'openingBalance', 'status', 'notes', 'createdAt', 'updatedAt'
  ],
  CustomerAssignments: [
    'assignmentId', 'customerId', 'repId', 'isPrimary', 'status',
    'createdAt', 'updatedAt'
  ],
  Suppliers: [
    'supplierId', 'supplierCode', 'nameAr', 'nameEn', 'contactPerson',
    'phone', 'email', 'address', 'openingBalance', 'paymentTermsDays',
    'status', 'notes', 'createdAt', 'updatedAt'
  ],
  ProductCategories: [
    'categoryId', 'nameAr', 'nameEn', 'description', 'status', 'createdAt'
  ],
  UnitsOfMeasure: [
    'unitId', 'nameAr', 'nameEn', 'abbreviationAr', 'abbreviationEn',
    'status', 'createdAt'
  ],
  ProductUnitConversions: [
    'conversionId', 'productId', 'fromUnitId', 'toUnitId',
    'conversionFactor', 'createdAt'
  ],
  Products: [
    'productId', 'sku', 'nameAr', 'nameEn', 'categoryId',
    'brand', 'baseUnitId', 'purchaseCost', 'sellingPrice',
    'minStockLevel', 'reorderLevel', 'primarySupplierId', 'taxRate',
    'status', 'createdAt', 'updatedAt'
  ],
  Warehouses: [
    'warehouseId', 'code', 'nameAr', 'nameEn', 'address',
    'type', 'status', 'createdAt'
  ],
  InventoryBatches: [
    'batchId', 'productId', 'warehouseId', 'batchNumber',
    'manufacturingDate', 'expirationDate', 'receivedQty', 'remainingQty',
    'unitCost', 'status', 'sourceType', 'sourceId', 'createdAt', 'updatedAt'
  ],
  InventoryBalances: [
    'balanceId', 'productId', 'warehouseId', 'availableQty',
    'reservedQty', 'damagedQty', 'expiredQty', 'weightedAvgCost',
    'lastUpdated'
  ],
  InventoryMovements: [
    'movementId', 'productId', 'warehouseId', 'batchId',
    'movementType', 'quantity', 'unitCost', 'totalCost',
    'sourceType', 'sourceId', 'idempotencyKey', 'notes',
    'createdBy', 'createdAt'
  ],
  PurchaseOrders: [
    'poId', 'poNumber', 'supplierId', 'orderDate', 'expectedDate',
    'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes',
    'createdBy', 'createdAt', 'updatedAt'
  ],
  PurchaseOrderItems: [
    'poItemId', 'poId', 'productId', 'unitId', 'orderedQty',
    'receivedQty', 'unitCost', 'lineTotal', 'createdAt'
  ],
  PurchaseInvoices: [
    'piId', 'piNumber', 'supplierId', 'poId', 'invoiceDate',
    'receivedDate', 'dueDate', 'status', 'subtotal', 'taxAmount',
    'totalAmount', 'paidAmount', 'notes', 'idempotencyKey',
    'createdBy', 'createdAt', 'updatedAt'
  ],
  PurchaseInvoiceItems: [
    'piItemId', 'piId', 'productId', 'unitId', 'receivedQty',
    'acceptedQty', 'unitCost', 'lineTotal', 'batchNumber',
    'expirationDate', 'createdAt'
  ],
  SupplierPayments: [
    'spId', 'paymentNumber', 'supplierId', 'piId', 'amount',
    'paymentDate', 'paymentMethod', 'accountId', 'reference',
    'status', 'idempotencyKey', 'createdBy', 'createdAt'
  ],
  SalesInvoices: [
    'invoiceId', 'invoiceNumber', 'customerId', 'repId', 'invoiceDate',
    'dueDate', 'status', 'subtotal', 'discountAmount', 'taxAmount',
    'totalAmount', 'paidAmount', 'costOfGoodsSold', 'paymentMethod',
    'notes', 'idempotencyKey', 'postedAt', 'createdBy', 'createdAt', 'updatedAt'
  ],
  SalesInvoiceItems: [
    'itemId', 'invoiceId', 'productId', 'unitId', 'quantity',
    'unitPrice', 'discountPercent', 'lineDiscount', 'lineTax',
    'lineTotal', 'unitCost', 'createdAt'
  ],
  SalesReturns: [
    'returnId', 'returnNumber', 'invoiceId', 'customerId', 'repId',
    'returnDate', 'reason', 'status', 'totalAmount', 'totalCost',
    'inventoryDisposition', 'approvedBy', 'idempotencyKey',
    'createdBy', 'createdAt', 'updatedAt'
  ],
  SalesReturnItems: [
    'returnItemId', 'returnId', 'invoiceItemId', 'productId', 'unitId',
    'quantity', 'unitPrice', 'lineTotal', 'unitCost', 'disposition',
    'createdAt'
  ],
  CustomerPayments: [
    'paymentId', 'receiptNumber', 'customerId', 'repId', 'amount',
    'paymentDate', 'paymentMethod', 'accountId', 'reference',
    'allocatedAmount', 'unallocatedAmount', 'status', 'idempotencyKey',
    'createdBy', 'createdAt'
  ],
  PaymentAllocations: [
    'allocationId', 'paymentId', 'invoiceId', 'amount', 'createdAt'
  ],
  CustomerCreditNotes: [
    'creditNoteId', 'creditNoteNumber', 'customerId', 'returnId',
    'amount', 'appliedAmount', 'remainingAmount', 'status',
    'createdBy', 'createdAt', 'updatedAt'
  ],
  FinancialAccounts: [
    'accountId', 'accountCode', 'nameAr', 'nameEn', 'type',
    'openingBalance', 'currentBalance', 'status', 'createdAt', 'updatedAt'
  ],
  CashTransactions: [
    'transactionId', 'accountId', 'transactionDate', 'transactionType',
    'amount', 'relatedType', 'relatedId', 'description', 'balanceAfter',
    'idempotencyKey', 'createdBy', 'createdAt'
  ],
  Expenses: [
    'expenseId', 'expenseNumber', 'date', 'categoryId', 'amount',
    'accountId', 'description', 'attachmentRef', 'approvalStatus',
    'approvedBy', 'createdBy', 'createdAt', 'updatedAt'
  ],
  SalesTargets: [
    'targetId', 'repId', 'period', 'periodType', 'targetAmount',
    'createdBy', 'createdAt', 'updatedAt'
  ],
  AuditLogs: [
    'logId', 'userId', 'username', 'action', 'entityType',
    'entityId', 'details', 'createdAt'
  ],
  Notifications: [
    'notificationId', 'userId', 'type', 'titleAr', 'titleEn',
    'messageAr', 'messageEn', 'isRead', 'relatedType', 'relatedId',
    'createdAt'
  ],
  ImportJobs: [
    'jobId', 'fileName', 'entityType', 'totalRows', 'successRows',
    'errorRows', 'status', 'errors', 'createdBy', 'createdAt'
  ],
  Settings: [
    'key', 'value', 'descriptionAr', 'descriptionEn', 'updatedBy', 'updatedAt'
  ]
};

// ============================================================
// Default Expense Categories
// ============================================================
var EXPENSE_CATEGORIES = [
  { nameAr: 'مواصلات ونقل', nameEn: 'Transportation' },
  { nameAr: 'وقود', nameEn: 'Fuel' },
  { nameAr: 'صيانة مركبات', nameEn: 'Vehicle Maintenance' },
  { nameAr: 'رواتب وأجور', nameEn: 'Salaries & Wages' },
  { nameAr: 'مصاريف مخزن', nameEn: 'Warehouse Expenses' },
  { nameAr: 'تغليف', nameEn: 'Packaging' },
  { nameAr: 'مصاريف إدارية', nameEn: 'Administrative' },
  { nameAr: 'أخرى', nameEn: 'Other' }
];

// ============================================================
// Default Product Categories
// ============================================================
var DEFAULT_PRODUCT_CATEGORIES = [
  { nameAr: 'ألبان ومنتجات الحليب', nameEn: 'Dairy Products' },
  { nameAr: 'مشروبات وعصائر', nameEn: 'Beverages & Juices' },
  { nameAr: 'زيوت وسمن', nameEn: 'Oils & Ghee' },
  { nameAr: 'أرز ومكرونة', nameEn: 'Rice & Pasta' },
  { nameAr: 'معلبات', nameEn: 'Canned Goods' },
  { nameAr: 'بسكويت وحلويات', nameEn: 'Biscuits & Sweets' },
  { nameAr: 'شيبسي ومقرمشات', nameEn: 'Chips & Snacks' },
  { nameAr: 'توابل وبهارات', nameEn: 'Spices & Seasonings' },
  { nameAr: 'شاي وقهوة', nameEn: 'Tea & Coffee' },
  { nameAr: 'مواد تنظيف', nameEn: 'Cleaning Products' }
];

// ============================================================
// Default Units of Measure
// ============================================================
var DEFAULT_UNITS = [
  { nameAr: 'قطعة', nameEn: 'Piece', abbreviationAr: 'قطعة', abbreviationEn: 'pc' },
  { nameAr: 'كرتونة', nameEn: 'Carton', abbreviationAr: 'كرتونة', abbreviationEn: 'ctn' },
  { nameAr: 'عبوة', nameEn: 'Pack', abbreviationAr: 'عبوة', abbreviationEn: 'pk' },
  { nameAr: 'كيلوجرام', nameEn: 'Kilogram', abbreviationAr: 'كجم', abbreviationEn: 'kg' },
  { nameAr: 'لتر', nameEn: 'Liter', abbreviationAr: 'لتر', abbreviationEn: 'L' },
  { nameAr: 'علبة', nameEn: 'Can', abbreviationAr: 'علبة', abbreviationEn: 'can' },
  { nameAr: 'كيس', nameEn: 'Bag', abbreviationAr: 'كيس', abbreviationEn: 'bag' },
  { nameAr: 'زجاجة', nameEn: 'Bottle', abbreviationAr: 'زجاجة', abbreviationEn: 'btl' }
];

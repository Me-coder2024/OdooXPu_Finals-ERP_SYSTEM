// ============================================
// Shiv Furniture Works ERP — TypeScript Types
// ============================================

export type UserRole = 'ADMIN' | 'SALES' | 'PURCHASE' | 'MANUFACTURING' | 'INVENTORY' | 'OWNER';
export type AccessType = 'FULL' | 'VIEW' | 'NONE';
export type ERPModule = 'PRODUCTS' | 'SALES' | 'PURCHASE' | 'MANUFACTURING' | 'BOM' | 'INVENTORY' | 'AUDIT' | 'USERS';
export type ProcurementType = 'PURCHASE' | 'MANUFACTURING';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_DELIVERED' | 'FULLY_DELIVERED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type StockMovement = 'SALE' | 'PURCHASE_RECEIPT' | 'MFG_CONSUMPTION' | 'MFG_PRODUCTION' | 'ADJUSTMENT' | 'RESERVATION' | 'UNRESERVATION';
export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  address?: string;
  dob?: string;
  profile_photo?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  module_access: ModuleAccess[];
}

export interface ModuleAccess {
  id: string;
  user_id: string;
  module: ERPModule;
  access_type: AccessType;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  sales_price: number;
  cost_price: number;
  on_hand_qty: number;
  reserved_qty: number;
  free_to_use_qty: number; // COMPUTED — never stored
  min_stock_qty: number;
  procure_on_demand: boolean;
  procurement_type?: ProcurementType;
  preferred_vendor_id?: string;
  bom_id?: string;
  is_active: boolean;
  vendor?: { id: string; name: string };
  bom?: { id: string; bom_reference: string };
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  customer: Customer;
  status: OrderStatus;
  order_date: string;
  expected_delivery?: string;
  total_amount: number;
  notes?: string;
  created_by: string;
  creator: { id: string; name: string };
  lines: SalesOrderLine[];
  triggered_pos?: { id: string; po_number: string; status: OrderStatus; auto_generated: boolean }[];
  triggered_mos?: { id: string; mo_number: string; status: OrderStatus; auto_generated: boolean }[];
}

export interface SalesOrderLine {
  id: string;
  so_id: string;
  product_id: string;
  product: Product;
  ordered_qty: number;
  delivered_qty: number;
  unit_price: number;
  subtotal: number;
  reserved: boolean;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor: Vendor;
  status: OrderStatus;
  order_date: string;
  expected_date?: string;
  total_amount: number;
  notes?: string;
  auto_generated: boolean;
  source_so_id?: string;
  source_so?: { id: string; so_number: string };
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: string;
  po_id: string;
  product_id: string;
  product: Product;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
  subtotal: number;
}

export interface BillOfMaterials {
  id: string;
  product_id: string;
  product: { id: string; name: string; sku: string };
  bom_reference: string;
  qty_produced: number;
  notes?: string;
  components: BoMComponent[];
  operations: BoMOperation[];
}

export interface BoMComponent {
  id: string;
  bom_id: string;
  product_id: string;
  product: { id: string; name: string; sku: string };
  quantity: number;
  unit: string;
}

export interface BoMOperation {
  id: string;
  bom_id: string;
  work_center_id: string;
  work_center: { id: string; name: string };
  name: string;
  duration_mins: number;
  sequence_order: number;
}

export interface WorkCenter {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  _count?: { operations: number; work_orders: number };
}

export interface ManufacturingOrder {
  id: string;
  mo_number: string;
  product_id: string;
  product: Product;
  bom_id: string;
  bom: { id: string; bom_reference: string };
  status: OrderStatus;
  qty_to_produce: number;
  qty_produced: number;
  scheduled_date: string;
  assigned_to?: string;
  assignee?: { id: string; name: string };
  source_so_id?: string;
  source_so?: { id: string; so_number: string };
  auto_generated: boolean;
  components: MOComponent[];
  work_orders: WorkOrder[];
}

export interface MOComponent {
  id: string;
  mo_id: string;
  product_id: string;
  product: { id: string; name: string; sku: string };
  required_qty: number;
  consumed_qty: number;
  is_available: boolean;
}

export interface WorkOrder {
  id: string;
  mo_id: string;
  operation_id: string;
  operation: { name: string; sequence_order: number };
  work_center_id: string;
  work_center: { id: string; name: string };
  status: WorkOrderStatus;
  assigned_to?: string;
  assignee?: { id: string; name: string };
  planned_duration_mins: number;
  actual_duration_mins?: number;
  started_at?: string;
  completed_at?: string;
}

export interface StockLedgerEntry {
  id: string;
  product_id: string;
  product: { id: string; name: string; sku: string };
  movement_type: StockMovement;
  qty_change: number;
  balance_after: number;
  reference_type: string;
  reference_id: string;
  notes?: string;
  performed_by: string;
  user: { id: string; name: string };
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user: { id: string; name: string; email: string };
  module: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  overview: {
    totalProducts: number;
    activeProducts: number;
    totalCustomers: number;
    totalVendors: number;
    totalRevenue: number;
  };
  salesOrders: { total: number; byStatus: Record<string, number> };
  purchaseOrders: { total: number; byStatus: Record<string, number> };
  manufacturingOrders: { total: number; byStatus: Record<string, number> };
  alerts: { lowStockProducts: Product[] };
  recent: {
    salesOrders: SalesOrder[];
    purchaseOrders: PurchaseOrder[];
    stockMovements: StockLedgerEntry[];
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  errors: { field: string; message: string }[];
}

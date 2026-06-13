// ============================================
// Field-Level Permission Configuration
// ============================================
// Defines which fields exist per module and their default CRUD access per role.

export type FieldPermission = {
  create: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
};

export type FieldConfig = {
  name: string;
  label: string;
  note?: string; // e.g. "Recomputed", "Auto Compute", "System Computed", "Not possible"
};

export type ModuleFieldConfig = {
  module: string;
  fields: FieldConfig[];
};

// Module-action permission matrix (global role-based access)
export type ActionPermission = {
  module: string;
  action: string;
  admin: boolean;
  user: boolean;
  none: boolean;
  note?: string; // "Optional", "Limited"
};

export const PERMISSION_MATRIX: ActionPermission[] = [
  { module: 'Sales', action: 'View', admin: true, user: true, none: false, note: 'Optional' },
  { module: 'Sales', action: 'Create', admin: true, user: true, none: false },
  { module: 'Sales', action: 'Edit', admin: true, user: true, none: false, note: 'Limited' },
  { module: 'Sales', action: 'Delete', admin: true, user: false, none: false },
  { module: 'Sales', action: 'Approve (Confirm)', admin: true, user: false, none: false },
  { module: 'Purchase', action: 'View', admin: true, user: true, none: false, note: 'Optional' },
  { module: 'Purchase', action: 'Approve', admin: true, user: false, none: false },
  { module: 'Purchase', action: 'Edit', admin: true, user: true, none: false, note: 'Limited' },
  { module: 'Purchase', action: 'Create', admin: true, user: false, none: false },
  { module: 'Manufacturing', action: 'Production Entry', admin: true, user: false, none: false },
  { module: 'Manufacturing', action: 'Edit BOM', admin: true, user: false, none: false },
  { module: 'Manufacturing', action: 'View', admin: true, user: true, none: false, note: 'Optional' },
  { module: 'Product', action: 'View', admin: true, user: true, none: false, note: 'Optional' },
  { module: 'Product', action: 'Create', admin: true, user: true, none: false },
  { module: 'Product', action: 'Edit', admin: true, user: true, none: false, note: 'Limited' },
];

// Per-module field definitions with CRUD defaults
export const MODULE_FIELDS: ModuleFieldConfig[] = [
  {
    module: 'Sales',
    fields: [
      { name: 'customer', label: 'Customer' },
      { name: 'customer_address', label: 'Customer Address' },
      { name: 'sales_person', label: 'Sales Person' },
      { name: 'product', label: 'Product' },
      { name: 'ordered_quantity', label: 'Ordered Quantity' },
      { name: 'delivered_quantity', label: 'Delivered Quantity' },
      { name: 'sales_price', label: 'Sales Price' },
      { name: 'status', label: 'Status' },
      { name: 'total', label: 'Total', note: 'Recomputed' },
      { name: 'creation_date', label: 'Creation Date', note: 'Auto Compute' },
    ],
  },
  {
    module: 'Purchase',
    fields: [
      { name: 'vendor', label: 'Vendor' },
      { name: 'vendor_address', label: 'Vendor Address' },
      { name: 'responsible_person', label: 'Responsible Person' },
      { name: 'product', label: 'Product' },
      { name: 'ordered_quantity', label: 'Ordered Quantity' },
      { name: 'received_quantity', label: 'Received Quantity' },
      { name: 'cost_price', label: 'Cost Price' },
      { name: 'total', label: 'Total', note: 'Auto Recomputed' },
      { name: 'creation_date', label: 'Creation Date', note: 'Auto Compute' },
    ],
  },
  {
    module: 'Manufacturing',
    fields: [
      { name: 'product_to_manufacture', label: 'Product to Manufacture' },
      { name: 'product_quantity', label: 'Product Quantity' },
      { name: 'bom', label: 'BoM' },
      { name: 'responsible_person', label: 'Responsible Person' },
      { name: 'finished_quantity', label: 'Finished Quantity' },
      { name: 'creation_date', label: 'Creation Date', note: 'Auto Compute' },
    ],
  },
  {
    module: 'Product',
    fields: [
      { name: 'product', label: 'Product' },
      { name: 'sales_price', label: 'Sales Price' },
      { name: 'cost_price', label: 'Cost Price' },
      { name: 'on_hand_qty', label: 'On Hand Qty' },
      { name: 'free_to_use_qty', label: 'Free To Use Qty', note: 'System Computed' },
      { name: 'procure_on_demand', label: 'Procure On Demand', note: 'Not possible' },
      { name: 'procurement_method', label: 'Procurement Method', note: 'Not Possible' },
      { name: 'vendor', label: 'Vendor' },
      { name: 'bill_of_materials', label: 'Bill of Materials (BoM)' },
    ],
  },
];

// Default field permissions for a given field
export function getDefaultFieldPermissions(fieldName: string, note?: string): FieldPermission {
  const isAutoComputed = note === 'Auto Compute' || note === 'System Computed';
  const isNotPossible = note === 'Not possible' || note === 'Not Possible';
  const isRecomputed = note === 'Recomputed' || note === 'Auto Recomputed';

  if (isAutoComputed) {
    return { create: false, view: true, edit: false, delete: false };
  }
  if (isNotPossible) {
    return { create: false, view: false, edit: false, delete: false };
  }
  if (isRecomputed) {
    return { create: true, view: true, edit: false, delete: false };
  }

  // Status field — no delete
  if (fieldName === 'status') {
    return { create: true, view: true, edit: true, delete: false };
  }

  return { create: true, view: true, edit: true, delete: true };
}

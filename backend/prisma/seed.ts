import { PrismaClient, UserRole, AccessType, ERPModule, ProcurementType, OrderStatus, StockMovement, WorkOrderStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Shiv Furniture Works ERP...');

  // ============================================
  // 1. USERS — 5 users, one per role
  // ============================================
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const salesHash = await bcrypt.hash('Sales@123', 12);
  const purchaseHash = await bcrypt.hash('Purchase@123', 12);
  const mfgHash = await bcrypt.hash('Mfg@123', 12);
  const ownerHash = await bcrypt.hash('Owner@123', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Krish Kumar Gupta',
      email: 'admin@shivfurniture.com',
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      mobile: '+91-9876543210',
      address: 'Indore, MP',
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'sales@shivfurniture.com',
      password_hash: salesHash,
      role: UserRole.SALES,
      mobile: '+91-9876543211',
      address: 'Bhopal, MP',
    },
  });

  const purchaseUser = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'purchase@shivfurniture.com',
      password_hash: purchaseHash,
      role: UserRole.PURCHASE,
      mobile: '+91-9876543212',
      address: 'Ujjain, MP',
    },
  });

  const mfgUser = await prisma.user.create({
    data: {
      name: 'Dixit Malviya',
      email: 'mfg@shivfurniture.com',
      password_hash: mfgHash,
      role: UserRole.MANUFACTURING,
      mobile: '+91-9876543213',
      address: 'Indore, MP',
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: 'Aksh Narwani',
      email: 'owner@shivfurniture.com',
      password_hash: ownerHash,
      role: UserRole.OWNER,
      mobile: '+91-9876543214',
      address: 'Indore, MP',
    },
  });

  console.log('✅ Users created');

  // ============================================
  // 2. MODULE ACCESS
  // ============================================
  const allModules = Object.values(ERPModule);

  // Admin gets FULL on everything
  for (const mod of allModules) {
    await prisma.userModuleAccess.create({
      data: { user_id: admin.id, module: mod, access_type: AccessType.FULL },
    });
  }

  // Owner gets FULL on everything
  for (const mod of allModules) {
    await prisma.userModuleAccess.create({
      data: { user_id: owner.id, module: mod, access_type: AccessType.FULL },
    });
  }

  // Sales user
  const salesAccess: Record<string, AccessType> = {
    PRODUCTS: AccessType.VIEW, SALES: AccessType.FULL, PURCHASE: AccessType.VIEW,
    MANUFACTURING: AccessType.NONE, BOM: AccessType.NONE, INVENTORY: AccessType.VIEW,
    AUDIT: AccessType.NONE, USERS: AccessType.NONE,
  };
  for (const [mod, access] of Object.entries(salesAccess)) {
    await prisma.userModuleAccess.create({
      data: { user_id: salesUser.id, module: mod as ERPModule, access_type: access },
    });
  }

  // Purchase user
  const purchaseAccess: Record<string, AccessType> = {
    PRODUCTS: AccessType.VIEW, SALES: AccessType.VIEW, PURCHASE: AccessType.FULL,
    MANUFACTURING: AccessType.NONE, BOM: AccessType.NONE, INVENTORY: AccessType.VIEW,
    AUDIT: AccessType.NONE, USERS: AccessType.NONE,
  };
  for (const [mod, access] of Object.entries(purchaseAccess)) {
    await prisma.userModuleAccess.create({
      data: { user_id: purchaseUser.id, module: mod as ERPModule, access_type: access },
    });
  }

  // Mfg user
  const mfgAccess: Record<string, AccessType> = {
    PRODUCTS: AccessType.VIEW, SALES: AccessType.VIEW, PURCHASE: AccessType.VIEW,
    MANUFACTURING: AccessType.FULL, BOM: AccessType.FULL, INVENTORY: AccessType.FULL,
    AUDIT: AccessType.NONE, USERS: AccessType.NONE,
  };
  for (const [mod, access] of Object.entries(mfgAccess)) {
    await prisma.userModuleAccess.create({
      data: { user_id: mfgUser.id, module: mod as ERPModule, access_type: access },
    });
  }

  console.log('✅ Module access configured');

  // ============================================
  // 3. VENDORS — 5 wood/material suppliers
  // ============================================
  const vendors = await Promise.all([
    prisma.vendor.create({ data: { name: 'Rajasthan Timber Co.', email: 'info@rajtimber.com', phone: '+91-141-2345678', address: 'Jaipur, Rajasthan' } }),
    prisma.vendor.create({ data: { name: 'Gupta Wood Works', email: 'gupta@woodworks.com', phone: '+91-731-2345679', address: 'Indore, MP' } }),
    prisma.vendor.create({ data: { name: 'Maharashtra Plywood Ltd', email: 'sales@mahaply.com', phone: '+91-22-2345680', address: 'Mumbai, Maharashtra' } }),
    prisma.vendor.create({ data: { name: 'Jain Fabric House', email: 'orders@jainfabric.com', phone: '+91-731-2345681', address: 'Indore, MP' } }),
    prisma.vendor.create({ data: { name: 'Steel Point India', email: 'sales@steelpoint.in', phone: '+91-79-2345682', address: 'Ahmedabad, Gujarat' } }),
  ]);

  console.log('✅ Vendors created');

  // ============================================
  // 4. CUSTOMERS — 10 businesses and individuals
  // ============================================
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Infosys Indore Office', email: 'facilities@infosys.com', phone: '+91-731-1111111', address: 'SEZ, Indore' } }),
    prisma.customer.create({ data: { name: 'TCS Bhopal', email: 'admin@tcs.com', phone: '+91-755-2222222', address: 'IT Park, Bhopal' } }),
    prisma.customer.create({ data: { name: 'Hotel Radisson Indore', email: 'purchase@radisson.com', phone: '+91-731-3333333', address: 'Vijay Nagar, Indore' } }),
    prisma.customer.create({ data: { name: 'Prestige Public School', email: 'admin@prestige.edu', phone: '+91-731-4444444', address: 'AB Road, Indore' } }),
    prisma.customer.create({ data: { name: 'City Hospital', email: 'admin@cityhospital.com', phone: '+91-731-5555555', address: 'MG Road, Indore' } }),
    prisma.customer.create({ data: { name: 'Raj Malhotra (Residence)', email: 'raj.malhotra@gmail.com', phone: '+91-9999888877', address: 'Scheme 78, Indore' } }),
    prisma.customer.create({ data: { name: 'Sharma Associates', email: 'info@sharmaassoc.com', phone: '+91-731-6666666', address: 'Palasia, Indore' } }),
    prisma.customer.create({ data: { name: 'Green Valley Resort', email: 'admin@greenvalley.com', phone: '+91-731-7777777', address: 'Mhow Road, Indore' } }),
    prisma.customer.create({ data: { name: 'Wipro Office Pune', email: 'facilities@wipro.com', phone: '+91-20-8888888', address: 'Hinjewadi, Pune' } }),
    prisma.customer.create({ data: { name: 'IIM Indore', email: 'admin@iimidr.ac.in', phone: '+91-731-9999999', address: 'Rau, Indore' } }),
  ]);

  console.log('✅ Customers created');

  // ============================================
  // 5. WORK CENTERS — 3 manufacturing stations
  // ============================================
  const workCenters = await Promise.all([
    prisma.workCenter.create({ data: { name: 'Cutting Station', description: 'Wood cutting and sizing operations' } }),
    prisma.workCenter.create({ data: { name: 'Assembly Line', description: 'Parts assembly and joining' } }),
    prisma.workCenter.create({ data: { name: 'Finishing Bay', description: 'Sanding, polishing, and varnishing' } }),
  ]);

  console.log('✅ Work Centers created');

  // ============================================
  // 6. PRODUCTS — 20 furniture items
  // ============================================
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Wooden Dining Table (6-Seater)', sku: 'TBL-DIN-6S', sales_price: 25000, cost_price: 15000, on_hand_qty: 12, reserved_qty: 3, min_stock_qty: 5, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Wooden Dining Table (4-Seater)', sku: 'TBL-DIN-4S', sales_price: 18000, cost_price: 11000, on_hand_qty: 8, reserved_qty: 2, min_stock_qty: 3, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Office Executive Desk', sku: 'DSK-OFF-EX', sales_price: 22000, cost_price: 13000, on_hand_qty: 15, reserved_qty: 5, min_stock_qty: 5, preferred_vendor_id: vendors[1].id } }),
    prisma.product.create({ data: { name: 'Computer Workstation', sku: 'DSK-CMP-WK', sales_price: 12000, cost_price: 7500, on_hand_qty: 20, reserved_qty: 4, min_stock_qty: 8, preferred_vendor_id: vendors[1].id } }),
    prisma.product.create({ data: { name: 'Wooden Bookshelf (5-Tier)', sku: 'SHF-BKS-5T', sales_price: 8500, cost_price: 4800, on_hand_qty: 18, reserved_qty: 0, min_stock_qty: 5, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Filing Cabinet (3-Drawer)', sku: 'CAB-FIL-3D', sales_price: 6500, cost_price: 3800, on_hand_qty: 25, reserved_qty: 2, min_stock_qty: 8, preferred_vendor_id: vendors[2].id } }),
    prisma.product.create({ data: { name: 'Conference Table (12-Seater)', sku: 'TBL-CNF-12', sales_price: 45000, cost_price: 28000, on_hand_qty: 3, reserved_qty: 1, min_stock_qty: 2, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Office Chair (Ergonomic)', sku: 'CHR-OFF-ER', sales_price: 9500, cost_price: 5500, on_hand_qty: 30, reserved_qty: 8, min_stock_qty: 10, preferred_vendor_id: vendors[3].id } }),
    prisma.product.create({ data: { name: 'Visitor Chair (Cushioned)', sku: 'CHR-VIS-CU', sales_price: 4500, cost_price: 2500, on_hand_qty: 40, reserved_qty: 0, min_stock_qty: 15, preferred_vendor_id: vendors[3].id } }),
    prisma.product.create({ data: { name: 'Reception Sofa (3-Seater)', sku: 'SOF-RCP-3S', sales_price: 35000, cost_price: 22000, on_hand_qty: 5, reserved_qty: 2, min_stock_qty: 2, preferred_vendor_id: vendors[3].id } }),
    prisma.product.create({ data: { name: 'TV Stand (Modern)', sku: 'STD-TV-MOD', sales_price: 7500, cost_price: 4200, on_hand_qty: 10, reserved_qty: 1, min_stock_qty: 3, preferred_vendor_id: vendors[2].id } }),
    prisma.product.create({ data: { name: 'Shoe Rack (Wooden)', sku: 'RCK-SHO-WD', sales_price: 3500, cost_price: 1800, on_hand_qty: 22, reserved_qty: 0, min_stock_qty: 8, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Wardrobe (Double Door)', sku: 'WRD-DBL-DR', sales_price: 32000, cost_price: 19000, on_hand_qty: 6, reserved_qty: 2, min_stock_qty: 3, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Bedside Table', sku: 'TBL-BED-SD', sales_price: 4000, cost_price: 2200, on_hand_qty: 15, reserved_qty: 0, min_stock_qty: 5, preferred_vendor_id: vendors[1].id } }),
    prisma.product.create({ data: { name: 'Study Table (Student)', sku: 'TBL-STD-ST', sales_price: 6000, cost_price: 3500, on_hand_qty: 14, reserved_qty: 3, min_stock_qty: 5, preferred_vendor_id: vendors[1].id } }),
    // Raw materials for BoM components
    prisma.product.create({ data: { name: 'Teak Wood Plank (per sq ft)', sku: 'RAW-TEAK-P', sales_price: 350, cost_price: 250, on_hand_qty: 200, reserved_qty: 30, min_stock_qty: 50, preferred_vendor_id: vendors[0].id } }),
    prisma.product.create({ data: { name: 'Plywood Sheet (8x4 ft)', sku: 'RAW-PLY-84', sales_price: 1200, cost_price: 800, on_hand_qty: 80, reserved_qty: 10, min_stock_qty: 20, preferred_vendor_id: vendors[2].id } }),
    prisma.product.create({ data: { name: 'Wood Screws (Box of 100)', sku: 'RAW-SCR-BX', sales_price: 150, cost_price: 80, on_hand_qty: 500, reserved_qty: 0, min_stock_qty: 100, preferred_vendor_id: vendors[4].id } }),
    prisma.product.create({ data: { name: 'PU Varnish (1 Ltr)', sku: 'RAW-VAR-1L', sales_price: 450, cost_price: 280, on_hand_qty: 60, reserved_qty: 5, min_stock_qty: 15, preferred_vendor_id: vendors[1].id } }),
    prisma.product.create({ data: { name: 'Foam Cushion (per pc)', sku: 'RAW-FOM-PC', sales_price: 800, cost_price: 450, on_hand_qty: 100, reserved_qty: 0, min_stock_qty: 30, preferred_vendor_id: vendors[3].id } }),
  ]);

  console.log('✅ Products created');

  // Set up MTS/MTO for some products
  await prisma.product.update({
    where: { id: products[0].id },
    data: { procure_on_demand: true, procurement_type: ProcurementType.MANUFACTURING },
  });
  await prisma.product.update({
    where: { id: products[7].id },
    data: { procure_on_demand: true, procurement_type: ProcurementType.MANUFACTURING },
  });
  await prisma.product.update({
    where: { id: products[6].id },
    data: { procure_on_demand: true, procurement_type: ProcurementType.PURCHASE },
  });

  // ============================================
  // 7. BILLS OF MATERIALS — 3 BoMs
  // ============================================
  // BoM 1: Dining Table (6-Seater)
  const bom1 = await prisma.billOfMaterials.create({
    data: {
      product_id: products[0].id,
      bom_reference: 'BOM-DIN-6S',
      qty_produced: 1,
      notes: 'Bill of Materials for 6-seater dining table',
      components: {
        create: [
          { product_id: products[15].id, quantity: 24, unit: 'sq ft' },   // Teak Wood
          { product_id: products[17].id, quantity: 2, unit: 'box' },      // Screws
          { product_id: products[18].id, quantity: 2, unit: 'ltr' },      // Varnish
        ],
      },
      operations: {
        create: [
          { work_center_id: workCenters[0].id, name: 'Cut table top and legs', duration_mins: 120, sequence_order: 1 },
          { work_center_id: workCenters[1].id, name: 'Assemble table structure', duration_mins: 180, sequence_order: 2 },
          { work_center_id: workCenters[2].id, name: 'Sand, polish and varnish', duration_mins: 90, sequence_order: 3 },
        ],
      },
    },
  });

  // BoM 2: Office Chair (Ergonomic)
  const bom2 = await prisma.billOfMaterials.create({
    data: {
      product_id: products[7].id,
      bom_reference: 'BOM-CHR-ER',
      qty_produced: 1,
      notes: 'Bill of Materials for ergonomic office chair',
      components: {
        create: [
          { product_id: products[16].id, quantity: 1, unit: 'sheet' },    // Plywood
          { product_id: products[19].id, quantity: 2, unit: 'pcs' },      // Foam
          { product_id: products[17].id, quantity: 1, unit: 'box' },      // Screws
        ],
      },
      operations: {
        create: [
          { work_center_id: workCenters[0].id, name: 'Cut seat and backrest', duration_mins: 60, sequence_order: 1 },
          { work_center_id: workCenters[1].id, name: 'Assemble frame and cushion', duration_mins: 90, sequence_order: 2 },
          { work_center_id: workCenters[2].id, name: 'Finishing and QC', duration_mins: 45, sequence_order: 3 },
        ],
      },
    },
  });

  // BoM 3: Conference Table (12-Seater)
  const bom3 = await prisma.billOfMaterials.create({
    data: {
      product_id: products[6].id,
      bom_reference: 'BOM-CNF-12',
      qty_produced: 1,
      notes: 'Bill of Materials for 12-seater conference table',
      components: {
        create: [
          { product_id: products[15].id, quantity: 40, unit: 'sq ft' },
          { product_id: products[16].id, quantity: 2, unit: 'sheet' },
          { product_id: products[17].id, quantity: 4, unit: 'box' },
          { product_id: products[18].id, quantity: 4, unit: 'ltr' },
        ],
      },
      operations: {
        create: [
          { work_center_id: workCenters[0].id, name: 'Cut large table sections', duration_mins: 180, sequence_order: 1 },
          { work_center_id: workCenters[1].id, name: 'Assemble and reinforce', duration_mins: 240, sequence_order: 2 },
          { work_center_id: workCenters[2].id, name: 'Multi-coat varnish finish', duration_mins: 150, sequence_order: 3 },
        ],
      },
    },
  });

  // Link BoMs to products
  await prisma.product.update({ where: { id: products[0].id }, data: { bom_id: bom1.id } });
  await prisma.product.update({ where: { id: products[7].id }, data: { bom_id: bom2.id } });
  await prisma.product.update({ where: { id: products[6].id }, data: { bom_id: bom3.id } });

  console.log('✅ Bills of Materials created');

  // ============================================
  // 8. SALES ORDERS — 10 orders in various statuses
  // ============================================
  const today = new Date();

  const so1 = await prisma.salesOrder.create({
    data: {
      so_number: 'SO-0001',
      customer_id: customers[0].id,
      status: OrderStatus.FULLY_DELIVERED,
      order_date: new Date(today.getFullYear(), today.getMonth() - 1, 5),
      expected_delivery: new Date(today.getFullYear(), today.getMonth() - 1, 15),
      total_amount: 110000,
      created_by: salesUser.id,
      lines: { create: [
        { product_id: products[2].id, ordered_qty: 5, delivered_qty: 5, unit_price: 22000, subtotal: 110000, reserved: true },
      ]},
    },
  });

  const so2 = await prisma.salesOrder.create({
    data: {
      so_number: 'SO-0002',
      customer_id: customers[1].id,
      status: OrderStatus.CONFIRMED,
      order_date: new Date(today.getFullYear(), today.getMonth(), 1),
      expected_delivery: new Date(today.getFullYear(), today.getMonth(), 20),
      total_amount: 180000,
      created_by: salesUser.id,
      lines: { create: [
        { product_id: products[0].id, ordered_qty: 4, delivered_qty: 0, unit_price: 25000, subtotal: 100000, reserved: true },
        { product_id: products[3].id, ordered_qty: 4, delivered_qty: 0, unit_price: 12000, subtotal: 48000, reserved: true },
        { product_id: products[13].id, ordered_qty: 8, delivered_qty: 0, unit_price: 4000, subtotal: 32000, reserved: true },
      ]},
    },
  });

  const so3 = await prisma.salesOrder.create({
    data: {
      so_number: 'SO-0003',
      customer_id: customers[2].id,
      status: OrderStatus.DRAFT,
      order_date: new Date(today.getFullYear(), today.getMonth(), 5),
      total_amount: 175000,
      created_by: salesUser.id,
      lines: { create: [
        { product_id: products[9].id, ordered_qty: 5, delivered_qty: 0, unit_price: 35000, subtotal: 175000, reserved: false },
      ]},
    },
  });

  const so4 = await prisma.salesOrder.create({
    data: {
      so_number: 'SO-0004',
      customer_id: customers[3].id,
      status: OrderStatus.CONFIRMED,
      order_date: new Date(today.getFullYear(), today.getMonth(), 3),
      expected_delivery: new Date(today.getFullYear(), today.getMonth(), 25),
      total_amount: 84000,
      created_by: salesUser.id,
      lines: { create: [
        { product_id: products[14].id, ordered_qty: 14, delivered_qty: 0, unit_price: 6000, subtotal: 84000, reserved: true },
      ]},
    },
  });

  const so5 = await prisma.salesOrder.create({
    data: {
      so_number: 'SO-0005',
      customer_id: customers[4].id,
      status: OrderStatus.PARTIALLY_DELIVERED,
      order_date: new Date(today.getFullYear(), today.getMonth() - 1, 20),
      expected_delivery: new Date(today.getFullYear(), today.getMonth(), 10),
      total_amount: 57000,
      created_by: salesUser.id,
      lines: { create: [
        { product_id: products[7].id, ordered_qty: 6, delivered_qty: 4, unit_price: 9500, subtotal: 57000, reserved: true },
      ]},
    },
  });

  for (let i = 6; i <= 10; i++) {
    await prisma.salesOrder.create({
      data: {
        so_number: `SO-000${i}`,
        customer_id: customers[i - 1].id,
        status: i % 3 === 0 ? OrderStatus.CANCELLED : OrderStatus.DRAFT,
        order_date: new Date(today.getFullYear(), today.getMonth(), i + 2),
        total_amount: (i * 5000) + 10000,
        created_by: salesUser.id,
        lines: { create: [
          { product_id: products[(i - 1) % 15].id, ordered_qty: i, delivered_qty: 0, unit_price: products[(i - 1) % 15].sales_price, subtotal: new Decimal(products[(i - 1) % 15].sales_price.toString()).mul(i), reserved: false },
        ]},
      },
    });
  }

  console.log('✅ Sales Orders created');

  // ============================================
  // 9. PURCHASE ORDERS — 8 orders
  // ============================================
  const po1 = await prisma.purchaseOrder.create({
    data: {
      po_number: 'PO-0001',
      vendor_id: vendors[0].id,
      status: OrderStatus.FULLY_RECEIVED,
      order_date: new Date(today.getFullYear(), today.getMonth() - 2, 10),
      expected_date: new Date(today.getFullYear(), today.getMonth() - 1, 10),
      total_amount: 50000,
      created_by: purchaseUser.id,
      lines: { create: [
        { product_id: products[15].id, ordered_qty: 100, received_qty: 100, unit_cost: 250, subtotal: 25000 },
        { product_id: products[15].id, ordered_qty: 100, received_qty: 100, unit_cost: 250, subtotal: 25000 },
      ]},
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      po_number: 'PO-0002',
      vendor_id: vendors[2].id,
      status: OrderStatus.CONFIRMED,
      order_date: new Date(today.getFullYear(), today.getMonth(), 2),
      expected_date: new Date(today.getFullYear(), today.getMonth(), 15),
      total_amount: 16000,
      created_by: purchaseUser.id,
      lines: { create: [
        { product_id: products[16].id, ordered_qty: 20, received_qty: 0, unit_cost: 800, subtotal: 16000 },
      ]},
    },
  });

  for (let i = 3; i <= 8; i++) {
    await prisma.purchaseOrder.create({
      data: {
        po_number: `PO-000${i}`,
        vendor_id: vendors[(i - 1) % 5].id,
        status: i <= 4 ? OrderStatus.DRAFT : OrderStatus.CONFIRMED,
        order_date: new Date(today.getFullYear(), today.getMonth(), i),
        total_amount: i * 8000,
        created_by: purchaseUser.id,
        lines: { create: [
          { product_id: products[(i + 14) % 20].id, ordered_qty: i * 10, received_qty: 0, unit_cost: products[(i + 14) % 20].cost_price, subtotal: new Decimal(products[(i + 14) % 20].cost_price.toString()).mul(i * 10) },
        ]},
      },
    });
  }

  console.log('✅ Purchase Orders created');

  // ============================================
  // 10. MANUFACTURING ORDERS — 5 orders
  // ============================================
  const bomOps1 = await prisma.boMOperation.findMany({ where: { bom_id: bom1.id }, orderBy: { sequence_order: 'asc' } });
  const bomOps2 = await prisma.boMOperation.findMany({ where: { bom_id: bom2.id }, orderBy: { sequence_order: 'asc' } });

  const mo1 = await prisma.manufacturingOrder.create({
    data: {
      mo_number: 'MO-0001',
      product_id: products[0].id,
      bom_id: bom1.id,
      status: OrderStatus.DONE,
      qty_to_produce: 5,
      qty_produced: 5,
      scheduled_date: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      assigned_to: mfgUser.id,
      created_by: mfgUser.id,
      components: { create: [
        { product_id: products[15].id, required_qty: 120, consumed_qty: 120, is_available: true },
        { product_id: products[17].id, required_qty: 10, consumed_qty: 10, is_available: true },
        { product_id: products[18].id, required_qty: 10, consumed_qty: 10, is_available: true },
      ]},
      work_orders: { create: bomOps1.map((op) => ({
        operation_id: op.id,
        work_center_id: op.work_center_id,
        status: WorkOrderStatus.DONE,
        assigned_to: mfgUser.id,
        planned_duration_mins: op.duration_mins * 5,
        actual_duration_mins: op.duration_mins * 5 + 15,
        started_at: new Date(today.getFullYear(), today.getMonth() - 1, 2),
        completed_at: new Date(today.getFullYear(), today.getMonth() - 1, 5),
      }))},
    },
  });

  const mo2 = await prisma.manufacturingOrder.create({
    data: {
      mo_number: 'MO-0002',
      product_id: products[7].id,
      bom_id: bom2.id,
      status: OrderStatus.IN_PROGRESS,
      qty_to_produce: 10,
      qty_produced: 0,
      scheduled_date: new Date(today.getFullYear(), today.getMonth(), 5),
      assigned_to: mfgUser.id,
      created_by: mfgUser.id,
      components: { create: [
        { product_id: products[16].id, required_qty: 10, consumed_qty: 0, is_available: true },
        { product_id: products[19].id, required_qty: 20, consumed_qty: 0, is_available: true },
        { product_id: products[17].id, required_qty: 10, consumed_qty: 0, is_available: true },
      ]},
      work_orders: { create: [
        { operation_id: bomOps2[0].id, work_center_id: bomOps2[0].work_center_id, status: WorkOrderStatus.DONE, assigned_to: mfgUser.id, planned_duration_mins: 600, actual_duration_mins: 580, started_at: new Date(today.getFullYear(), today.getMonth(), 6), completed_at: new Date(today.getFullYear(), today.getMonth(), 6) },
        { operation_id: bomOps2[1].id, work_center_id: bomOps2[1].work_center_id, status: WorkOrderStatus.IN_PROGRESS, assigned_to: mfgUser.id, planned_duration_mins: 900, started_at: new Date(today.getFullYear(), today.getMonth(), 7) },
        { operation_id: bomOps2[2].id, work_center_id: bomOps2[2].work_center_id, status: WorkOrderStatus.PENDING, assigned_to: mfgUser.id, planned_duration_mins: 450 },
      ]},
    },
  });

  for (let i = 3; i <= 5; i++) {
    await prisma.manufacturingOrder.create({
      data: {
        mo_number: `MO-000${i}`,
        product_id: products[0].id,
        bom_id: bom1.id,
        status: i === 3 ? OrderStatus.CONFIRMED : OrderStatus.DRAFT,
        qty_to_produce: i * 2,
        qty_produced: 0,
        scheduled_date: new Date(today.getFullYear(), today.getMonth(), i * 5),
        created_by: mfgUser.id,
      },
    });
  }

  console.log('✅ Manufacturing Orders created');

  // ============================================
  // 11. STOCK LEDGER ENTRIES
  // ============================================
  // Record some stock movements
  const stockEntries = [
    { product_id: products[0].id, movement_type: StockMovement.MFG_PRODUCTION, qty_change: 5, balance_after: 12, reference_type: 'ManufacturingOrder', reference_id: mo1.id, notes: 'MO-0001 production completed', performed_by: mfgUser.id },
    { product_id: products[15].id, movement_type: StockMovement.MFG_CONSUMPTION, qty_change: -120, balance_after: 200, reference_type: 'ManufacturingOrder', reference_id: mo1.id, notes: 'MO-0001 teak wood consumed', performed_by: mfgUser.id },
    { product_id: products[2].id, movement_type: StockMovement.SALE, qty_change: -5, balance_after: 15, reference_type: 'SalesOrder', reference_id: so1.id, notes: 'SO-0001 delivered', performed_by: salesUser.id },
    { product_id: products[2].id, movement_type: StockMovement.RESERVATION, qty_change: 0, balance_after: 15, reference_type: 'SalesOrder', reference_id: so2.id, notes: 'SO-0002 stock reserved', performed_by: salesUser.id },
    { product_id: products[15].id, movement_type: StockMovement.PURCHASE_RECEIPT, qty_change: 200, balance_after: 400, reference_type: 'PurchaseOrder', reference_id: po1.id, notes: 'PO-0001 teak wood received', performed_by: purchaseUser.id },
    { product_id: products[16].id, movement_type: StockMovement.PURCHASE_RECEIPT, qty_change: 50, balance_after: 80, reference_type: 'PurchaseOrder', reference_id: po1.id, notes: 'PO-0001 plywood received', performed_by: purchaseUser.id },
    { product_id: products[7].id, movement_type: StockMovement.RESERVATION, qty_change: 0, balance_after: 30, reference_type: 'SalesOrder', reference_id: so5.id, notes: 'SO-0005 chairs reserved', performed_by: salesUser.id },
    { product_id: products[7].id, movement_type: StockMovement.SALE, qty_change: -4, balance_after: 26, reference_type: 'SalesOrder', reference_id: so5.id, notes: 'SO-0005 partial delivery of 4 chairs', performed_by: salesUser.id },
  ];

  for (const entry of stockEntries) {
    await prisma.stockLedger.create({ data: entry });
  }

  console.log('✅ Stock Ledger entries created');

  // ============================================
  // 12. AUDIT LOGS
  // ============================================
  const auditEntries = [
    { user_id: admin.id, module: 'USERS', action: 'CREATE', entity: 'User', entity_id: salesUser.id, new_value: { name: 'Rahul Sharma', email: 'sales@shivfurniture.com', role: 'SALES' } },
    { user_id: salesUser.id, module: 'SALES', action: 'CREATE', entity: 'SalesOrder', entity_id: so1.id, new_value: { so_number: 'SO-0001', customer: 'Infosys Indore Office', total: 110000 } },
    { user_id: salesUser.id, module: 'SALES', action: 'STATUS_CHANGE', entity: 'SalesOrder', entity_id: so1.id, old_value: { status: 'DRAFT' }, new_value: { status: 'CONFIRMED' } },
    { user_id: salesUser.id, module: 'SALES', action: 'STATUS_CHANGE', entity: 'SalesOrder', entity_id: so1.id, old_value: { status: 'CONFIRMED' }, new_value: { status: 'FULLY_DELIVERED' } },
    { user_id: purchaseUser.id, module: 'PURCHASE', action: 'CREATE', entity: 'PurchaseOrder', entity_id: po1.id, new_value: { po_number: 'PO-0001', vendor: 'Rajasthan Timber Co.', total: 50000 } },
    { user_id: purchaseUser.id, module: 'PURCHASE', action: 'STATUS_CHANGE', entity: 'PurchaseOrder', entity_id: po1.id, old_value: { status: 'DRAFT' }, new_value: { status: 'FULLY_RECEIVED' } },
    { user_id: mfgUser.id, module: 'MANUFACTURING', action: 'CREATE', entity: 'ManufacturingOrder', entity_id: mo1.id, new_value: { mo_number: 'MO-0001', product: 'Wooden Dining Table (6-Seater)', qty: 5 } },
    { user_id: mfgUser.id, module: 'MANUFACTURING', action: 'STATUS_CHANGE', entity: 'ManufacturingOrder', entity_id: mo1.id, old_value: { status: 'DRAFT' }, new_value: { status: 'DONE' } },
    { user_id: admin.id, module: 'PRODUCTS', action: 'UPDATE', entity: 'Product', entity_id: products[0].id, old_value: { sales_price: 24000 }, new_value: { sales_price: 25000 } },
    { user_id: admin.id, module: 'USERS', action: 'UPDATE_ACCESS', entity: 'UserModuleAccess', entity_id: salesUser.id, old_value: { MANUFACTURING: 'VIEW' }, new_value: { MANUFACTURING: 'NONE' } },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }

  console.log('✅ Audit logs created');

  console.log('\n🎉 Seeding complete! Database populated with demo data.\n');
  console.log('Demo credentials:');
  console.log('  Admin: admin@shivfurniture.com / Admin@123');
  console.log('  Sales: sales@shivfurniture.com / Sales@123');
  console.log('  Purchase: purchase@shivfurniture.com / Purchase@123');
  console.log('  Manufacturing: mfg@shivfurniture.com / Mfg@123');
  console.log('  Owner: owner@shivfurniture.com / Owner@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

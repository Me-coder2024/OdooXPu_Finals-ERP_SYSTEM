import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { corsOptions } from './config/cors';
import { rateLimitGeneral } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import salesOrderRoutes from './routes/salesOrder.routes';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';
import manufacturingOrderRoutes from './routes/manufacturingOrder.routes';
import {
  bomRouter,
  workCenterRouter,
  vendorRouter,
  customerRouter,
  stockLedgerRouter,
  auditLogRouter,
  dashboardRouter,
} from './routes/other.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitGeneral);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRouter);
app.use('/api/customers', customerRouter);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/boms', bomRouter);
app.use('/api/work-centers', workCenterRouter);
app.use('/api/manufacturing-orders', manufacturingOrderRoutes);
app.use('/api/stock-ledger', stockLedgerRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 Shiv Furniture ERP Backend running on port ${env.PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
});

export default app;

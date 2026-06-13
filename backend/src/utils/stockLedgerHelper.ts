import { StockMovement, Prisma } from '@prisma/client';
import prisma from '../config/database';

interface StockLedgerParams {
  productId: string;
  movementType: StockMovement;
  qtyChange: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string;
  notes?: string;
  performedBy: string;
  tx?: Prisma.TransactionClient;
}

export const writeStockLedgerEntry = async ({
  productId,
  movementType,
  qtyChange,
  balanceAfter,
  referenceType,
  referenceId,
  notes,
  performedBy,
  tx,
}: StockLedgerParams): Promise<void> => {
  const client = tx || prisma;

  await client.stockLedger.create({
    data: {
      product_id: productId,
      movement_type: movementType,
      qty_change: new Prisma.Decimal(qtyChange),
      balance_after: new Prisma.Decimal(balanceAfter),
      reference_type: referenceType,
      reference_id: referenceId,
      notes: notes || null,
      performed_by: performedBy,
    },
  });
};

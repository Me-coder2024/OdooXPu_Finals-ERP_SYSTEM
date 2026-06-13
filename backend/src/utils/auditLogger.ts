import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../config/database';

interface AuditLogParams {
  userId: string;
  module: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  tx?: Prisma.TransactionClient;
}

export const writeAuditLog = async ({
  userId,
  module,
  action,
  entity,
  entityId,
  oldValue = null,
  newValue = null,
  ipAddress,
  tx,
}: AuditLogParams): Promise<void> => {
  const client = tx || prisma;

  await client.auditLog.create({
    data: {
      user_id: userId,
      module,
      action,
      entity,
      entity_id: entityId,
      old_value: oldValue as Prisma.InputJsonValue,
      new_value: newValue as Prisma.InputJsonValue,
      ip_address: ipAddress || null,
    },
  });
};

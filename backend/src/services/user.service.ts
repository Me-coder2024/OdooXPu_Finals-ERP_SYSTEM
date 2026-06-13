import prisma from '../config/database';
import { AuthService } from './auth.service';
import { writeAuditLog } from '../utils/auditLogger';
import { ERPModule, AccessType, UserRole } from '@prisma/client';

export class UserService {
  static async getAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          mobile: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          module_access: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobile: true,
        address: true,
        dob: true,
        profile_photo: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        module_access: true,
      },
    });

    if (!user) {
      throw { status: 404, message: 'User not found.' };
    }

    return user;
  }

  static async create(
    data: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      mobile?: string;
      address?: string;
      dob?: string;
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw { status: 400, message: 'Email already registered.' };
    }

    const passwordHash = await AuthService.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        role: data.role,
        mobile: data.mobile,
        address: data.address,
        dob: data.dob ? new Date(data.dob) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobile: true,
        is_active: true,
        created_at: true,
      },
    });

    // Create default module access based on role
    const moduleAccessData = getDefaultModuleAccess(user.id, data.role);
    if (moduleAccessData.length > 0) {
      await prisma.userModuleAccess.createMany({ data: moduleAccessData });
    }

    await writeAuditLog({
      userId: performedBy,
      module: 'USERS',
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      oldValue: null,
      newValue: { name: data.name, email: data.email, role: data.role },
      ipAddress,
    });

    return user;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      mobile?: string;
      address?: string;
      dob?: string;
      is_active?: boolean;
      role?: UserRole;
      password?: string;
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw { status: 404, message: 'User not found.' };
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) {
        throw { status: 400, message: 'Email already in use.' };
      }
    }

    const updateData: Record<string, unknown> = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (data.name !== undefined) {
      oldValue.name = existing.name;
      newValue.name = data.name;
      updateData.name = data.name;
    }
    if (data.email !== undefined) {
      oldValue.email = existing.email;
      newValue.email = data.email;
      updateData.email = data.email;
    }
    if (data.mobile !== undefined) {
      oldValue.mobile = existing.mobile;
      newValue.mobile = data.mobile;
      updateData.mobile = data.mobile;
    }
    if (data.address !== undefined) {
      oldValue.address = existing.address;
      newValue.address = data.address;
      updateData.address = data.address;
    }
    if (data.dob !== undefined) {
      oldValue.dob = existing.dob;
      newValue.dob = data.dob;
      updateData.dob = data.dob ? new Date(data.dob) : null;
    }
    if (data.is_active !== undefined) {
      oldValue.is_active = existing.is_active;
      newValue.is_active = data.is_active;
      updateData.is_active = data.is_active;
    }
    if (data.role !== undefined) {
      oldValue.role = existing.role;
      newValue.role = data.role;
      updateData.role = data.role;
    }
    if (data.password) {
      updateData.password_hash = await AuthService.hashPassword(data.password);
      newValue.password = '***changed***';
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobile: true,
        address: true,
        dob: true,
        is_active: true,
        updated_at: true,
        module_access: true,
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'USERS',
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      oldValue,
      newValue,
      ipAddress,
    });

    return user;
  }

  static async delete(id: string, performedBy: string, ipAddress?: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw { status: 404, message: 'User not found.' };
    }

    // Soft delete - deactivate instead of removing
    await prisma.user.update({
      where: { id },
      data: { is_active: false },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'USERS',
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      oldValue: { is_active: true },
      newValue: { is_active: false },
      ipAddress,
    });
  }

  static async updateAccess(
    userId: string,
    moduleAccess: { module: ERPModule; access_type: AccessType }[],
    performedBy: string,
    ipAddress?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { module_access: true },
    });

    if (!user) {
      throw { status: 404, message: 'User not found.' };
    }

    const oldAccess = user.module_access.map((a) => ({
      module: a.module,
      access_type: a.access_type,
    }));

    // Upsert each module access
    for (const access of moduleAccess) {
      await prisma.userModuleAccess.upsert({
        where: {
          user_id_module: {
            user_id: userId,
            module: access.module,
          },
        },
        update: { access_type: access.access_type },
        create: {
          user_id: userId,
          module: access.module,
          access_type: access.access_type,
        },
      });
    }

    await writeAuditLog({
      userId: performedBy,
      module: 'USERS',
      action: 'UPDATE_ACCESS',
      entity: 'UserModuleAccess',
      entityId: userId,
      oldValue: { access: oldAccess },
      newValue: { access: moduleAccess },
      ipAddress,
    });

    return prisma.user.findUnique({
      where: { id: userId },
      include: { module_access: true },
    });
  }
}

function getDefaultModuleAccess(userId: string, role: UserRole) {
  const allModules = Object.values(ERPModule);

  const roleAccessMap: Record<string, Record<string, AccessType>> = {
    ADMIN: Object.fromEntries(allModules.map((m) => [m, AccessType.FULL])),
    OWNER: Object.fromEntries(allModules.map((m) => [m, AccessType.FULL])),
    SALES: {
      PRODUCTS: AccessType.VIEW,
      SALES: AccessType.FULL,
      PURCHASE: AccessType.VIEW,
      MANUFACTURING: AccessType.NONE,
      BOM: AccessType.NONE,
      INVENTORY: AccessType.VIEW,
      AUDIT: AccessType.NONE,
      USERS: AccessType.NONE,
    },
    PURCHASE: {
      PRODUCTS: AccessType.VIEW,
      SALES: AccessType.VIEW,
      PURCHASE: AccessType.FULL,
      MANUFACTURING: AccessType.NONE,
      BOM: AccessType.NONE,
      INVENTORY: AccessType.VIEW,
      AUDIT: AccessType.NONE,
      USERS: AccessType.NONE,
    },
    MANUFACTURING: {
      PRODUCTS: AccessType.VIEW,
      SALES: AccessType.NONE,
      PURCHASE: AccessType.NONE,
      MANUFACTURING: AccessType.FULL,
      BOM: AccessType.FULL,
      INVENTORY: AccessType.VIEW,
      AUDIT: AccessType.NONE,
      USERS: AccessType.NONE,
    },
    INVENTORY: {
      PRODUCTS: AccessType.FULL,
      SALES: AccessType.VIEW,
      PURCHASE: AccessType.VIEW,
      MANUFACTURING: AccessType.VIEW,
      BOM: AccessType.VIEW,
      INVENTORY: AccessType.FULL,
      AUDIT: AccessType.NONE,
      USERS: AccessType.NONE,
    },
  };

  const access = roleAccessMap[role] || {};

  return allModules.map((module) => ({
    user_id: userId,
    module,
    access_type: access[module] || AccessType.NONE,
  }));
}

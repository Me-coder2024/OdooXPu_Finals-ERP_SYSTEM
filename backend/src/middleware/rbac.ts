import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import { ERPModule, AccessType } from '@prisma/client';

export const checkModuleAccess = (module: ERPModule, requiredAccess: AccessType = AccessType.VIEW) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          errors: [{ field: 'auth', message: 'Authentication required.' }],
        });
        return;
      }

      // OWNER and ADMIN have full access to everything
      if (req.user.role === 'OWNER' || req.user.role === 'ADMIN') {
        next();
        return;
      }

      const access = await prisma.userModuleAccess.findUnique({
        where: {
          user_id_module: {
            user_id: req.user.id,
            module: module,
          },
        },
      });

      if (!access) {
        res.status(403).json({
          errors: [{ field: 'access', message: `No access configured for module: ${module}` }],
        });
        return;
      }

      if (access.access_type === AccessType.NONE) {
        res.status(403).json({
          errors: [{ field: 'access', message: `Access denied for module: ${module}` }],
        });
        return;
      }

      // If FULL access is required but user only has VIEW
      if (requiredAccess === AccessType.FULL && access.access_type === AccessType.VIEW) {
        res.status(403).json({
          errors: [{ field: 'access', message: `Write access required for module: ${module}. You have view-only access.` }],
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        errors: [{ field: 'server', message: 'Error checking module access.' }],
      });
    }
  };
};

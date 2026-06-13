import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        module_access: true,
      },
    });

    if (!user) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    if (!user.is_active) {
      throw { status: 401, message: 'Account is deactivated. Contact admin.' };
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        module_access: user.module_access,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { module_access: true },
      });

      if (!user || !user.is_active) {
        throw { status: 401, message: 'Invalid refresh token.' };
      }

      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id },
        env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      const { password_hash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw { status: 401, message: 'Invalid or expired refresh token.' };
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    sponsorId?: string;
    isActive: boolean;
    membershipExpiry?: Date;
    totalEarnings: number;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        sponsorId: true,
        isActive: true,
        membershipExpiry: true,
        totalEarnings: true
      }
    });

    if (!user) {
      throw createError('User not found', 401);
    }

    // Attach user to request
    req.user = {
      ...user,
      sponsorId: user.sponsorId || undefined,
      membershipExpiry: user.membershipExpiry || undefined
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireActiveMembership = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }

  // Check if user has active membership
  const now = new Date();
  const hasActiveMembership = req.user.membershipExpiry && new Date(req.user.membershipExpiry) > now;

  if (!hasActiveMembership) {
    return next(createError('Active membership required', 403));
  }

  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }

  // For now, admin is determined by email (you can change this logic)
  const adminEmails = ['admin@videochat-mlm.com', 'demo@example.com'];

  if (!adminEmails.includes(req.user.email)) {
    return next(createError('Admin privileges required', 403));
  }

  next();
};

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validate, registerSchema, loginSchema } from '../validators';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validate(registerSchema), asyncHandler(async (req: any, res: any) => {
  const { email, username, firstName, lastName, password, sponsorCode } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw createError('Email already registered', 400);
    }
    if (existingUser.username === username) {
      throw createError('Username already taken', 400);
    }
  }

  // Find sponsor if sponsor code provided
  let sponsorId: string | undefined;
  if (sponsorCode) {
    const sponsor = await prisma.user.findFirst({
      where: {
        OR: [
          { username: sponsorCode },
          { id: sponsorCode }
        ]
      }
    });

    if (!sponsor) {
      throw createError('Invalid sponsor code', 400);
    }
    sponsorId = sponsor.id;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      firstName,
      lastName,
      password: hashedPassword,
      sponsorId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      sponsorId: true,
      totalEarnings: true,
      membershipExpiry: true,
      isActive: true,
      createdAt: true,
    }
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate(loginSchema), asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createError('Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken(user.id);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      token
    }
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      sponsorId: true,
      totalEarnings: true,
      membershipExpiry: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      sponsor: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      _count: {
        select: {
          referrals: true,
          createdRooms: true,
          payments: true,
          receivedCommissions: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: { user }
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const token = generateToken(req.user!.id);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: { token }
  });
}));

// @route   POST /api/auth/demo-login
// @desc    Login with demo user (for testing)
// @access  Public
router.post('/demo-login', asyncHandler(async (req: any, res: any) => {
  // Find or create demo user
  let demoUser = await prisma.user.findUnique({
    where: { email: 'demo@example.com' }
  });

  if (!demoUser) {
    // Create demo user if doesn't exist
    const hashedPassword = await bcrypt.hash('demo123', 12);

    demoUser = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        username: 'demo_user',
        firstName: 'Demo',
        lastName: 'User',
        password: hashedPassword,
        membershipExpiry: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days
        isActive: true,
        totalEarnings: 0,
      }
    });
  }

  // Generate token
  const token = generateToken(demoUser.id);

  // Return user without password
  const { password: _, ...userWithoutPassword } = demoUser;

  res.json({
    success: true,
    message: 'Demo login successful',
    data: {
      user: userWithoutPassword,
      token
    }
  });
}));

export default router;

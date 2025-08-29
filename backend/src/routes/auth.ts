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

// Generate unique referral code
const generateReferralCode = (firstName: string, lastName: string): string => {
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const prefix = (firstName.substring(0, 2) + lastName.substring(0, 2)).toUpperCase();
  return `${prefix}${randomNum}`;
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
        referralCode: sponsorCode
      }
    });

    if (!sponsor) {
      throw createError('Invalid sponsor referral code', 400);
    }
    sponsorId = sponsor.id;
  }

  // Generate unique referral code
  let referralCode: string;
  let isUnique = false;
  let attempts = 0;

  do {
    referralCode = generateReferralCode(firstName, lastName);
    const existing = await prisma.user.findUnique({
      where: { referralCode }
    });
    isUnique = !existing;
    attempts++;
  } while (!isUnique && attempts < 10);

  if (!isUnique) {
    throw createError('Unable to generate unique referral code. Please try again.', 500);
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
      referralCode,
      sponsorCode,
      sponsorId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      referralCode: true,
      sponsorCode: true,
      sponsorId: true,
      totalEarnings: true,
      membershipExpiry: true,
      isActive: true,
      status: true,
      createdAt: true,
      sponsor: {
        select: {
          firstName: true,
          lastName: true,
          referralCode: true
        }
      }
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
    where: { email },
    include: {
      sponsor: {
        select: {
          firstName: true,
          lastName: true,
          referralCode: true
        }
      },
      _count: {
        select: {
          referrals: true
        }
      }
    }
  });

  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  // Check if user is not banned
  if (user.status === 'banned') {
    throw createError('Account has been banned', 403);
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createError('Invalid credentials', 401);
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActive: new Date() }
  });

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
      referralCode: true,
      sponsorCode: true,
      sponsorId: true,
      totalEarnings: true,
      totalCommissionsPaid: true,
      membershipExpiry: true,
      isActive: true,
      status: true,
      lastActive: true,
      totalSessionTime: true,
      createdAt: true,
      updatedAt: true,
      sponsor: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          referralCode: true
        }
      },
      _count: {
        select: {
          referrals: true,
          createdRooms: true,
          payments: true,
          receivedCommissions: true,
          sentCommissions: true
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
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
        referralCode: 'DEMO0000',
        membershipExpiry: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days
        isActive: true,
        totalEarnings: 0,
      }
    });
  }

  // Update last active
  await prisma.user.update({
    where: { id: demoUser.id },
    data: { lastActive: new Date() }
  });

  // Generate token
  const token = generateToken(demoUser.id);

  // Return user without password and with additional info
  const userWithInfo = await prisma.user.findUnique({
    where: { id: demoUser.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      referralCode: true,
      sponsorCode: true,
      totalEarnings: true,
      membershipExpiry: true,
      isActive: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          referrals: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Demo login successful',
    data: {
      user: userWithInfo,
      token
    }
  });
}));

// @route   POST /api/auth/validate-sponsor
// @desc    Validate sponsor referral code
// @access  Public
router.post('/validate-sponsor', asyncHandler(async (req: any, res: any) => {
  const { sponsorCode } = req.body;

  if (!sponsorCode) {
    return res.json({
      success: true,
      data: { valid: false }
    });
  }

  const sponsor = await prisma.user.findUnique({
    where: { referralCode: sponsorCode },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      referralCode: true,
      _count: {
        select: {
          referrals: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: {
      valid: !!sponsor,
      sponsor: sponsor || null
    }
  });
}));

export default router;

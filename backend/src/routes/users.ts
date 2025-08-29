import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  validate,
  validateParams,
  validateQuery,
  updateProfileSchema,
  changePasswordSchema,
  idParamSchema,
  paginationSchema
} from '../validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/users/profile
// @desc    Get current user profile with detailed info
// @access  Private
router.get('/profile', asyncHandler(async (req: AuthRequest, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      sponsor: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      referrals: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          membershipExpiry: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
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

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: { user: userWithoutPassword }
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', validate(updateProfileSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { firstName, lastName, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(avatar !== undefined && { avatar }),
    },
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
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', validate(changePasswordSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw createError('Current password is incorrect', 400);
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password: hashedNewPassword }
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID (public info only)
// @access  Private
router.get('/:id', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
      membershipExpiry: true,
      createdAt: true,
      _count: {
        select: {
          referrals: true,
          createdRooms: true
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

// @route   GET /api/users
// @desc    Get users list (for admin or MLM network view)
// @access  Private
router.get('/', validateQuery(paginationSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { page, limit, sort, order } = req.query as any;
  const skip = (page - 1) * limit;

  // Build where clause - users can only see their downline
  const where = {
    OR: [
      { sponsorId: req.user!.id }, // Direct referrals
      { id: req.user!.id } // Self
    ]
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
        membershipExpiry: true,
        totalEarnings: true,
        createdAt: true,
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
            payments: true
          }
        }
      },
      orderBy: { [sort]: order },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @route   GET /api/users/search/:query
// @desc    Search users by username or name
// @access  Private
router.get('/search/:query', asyncHandler(async (req: AuthRequest, res: any) => {
  const { query } = req.params;

  if (query.length < 2) {
    throw createError('Search query must be at least 2 characters', 400);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } }
      ]
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
      membershipExpiry: true
    },
    take: 20 // Limit search results
  });

  res.json({
    success: true,
    data: { users }
  });
}));

// @route   GET /api/users/stats/overview
// @desc    Get user statistics overview
// @access  Private
router.get('/stats/overview', asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.id;

  // Get comprehensive stats
  const [
    directReferrals,
    totalEarnings,
    monthlyEarnings,
    activeReferrals,
    roomsCreated,
    totalPayments
  ] = await Promise.all([
    // Direct referrals count
    prisma.user.count({
      where: { sponsorId: userId }
    }),

    // Total earnings
    prisma.user.findUnique({
      where: { id: userId },
      select: { totalEarnings: true }
    }),

    // Monthly earnings
    prisma.mLMCommission.aggregate({
      where: {
        toUserId: userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: { amount: true }
    }),

    // Active referrals (with valid membership)
    prisma.user.count({
      where: {
        sponsorId: userId,
        membershipExpiry: {
          gt: new Date()
        }
      }
    }),

    // Rooms created
    prisma.room.count({
      where: { creatorId: userId }
    }),

    // Total payments made
    prisma.payment.count({
      where: {
        userId,
        status: 'COMPLETED'
      }
    })
  ]);

  // Calculate total network size (simplified for SQLite)
  const networkSize = await calculateNetworkSize(userId);

  res.json({
    success: true,
    data: {
      stats: {
        directReferrals,
        totalNetworkSize: networkSize,
        totalEarnings: totalEarnings?.totalEarnings || 0,
        monthlyEarnings: monthlyEarnings._sum.amount || 0,
        activeReferrals,
        roomsCreated,
        totalPayments,
        conversionRate: directReferrals > 0 ? Math.round((activeReferrals / directReferrals) * 100) : 0
      }
    }
  });
}));

// Helper function to calculate network size
async function calculateNetworkSize(userId: string): Promise<number> {
  let totalSize = 0;
  let currentLevel = [userId];

  for (let level = 1; level <= 6; level++) {
    const nextLevel = await prisma.user.findMany({
      where: { sponsorId: { in: currentLevel } },
      select: { id: true }
    });

    totalSize += nextLevel.length;

    if (nextLevel.length === 0) break;

    currentLevel = nextLevel.map(user => user.id);
  }

  return totalSize;
}

export default router;

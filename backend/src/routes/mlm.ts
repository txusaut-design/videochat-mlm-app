import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateQuery, paginationSchema } from '../validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/mlm/network
// @desc    Get user's MLM network structure
// @access  Private
router.get('/network', asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.id;

  // Get network structure up to 6 levels deep
  const network = await getMLMNetwork(userId, 6);

  res.json({
    success: true,
    data: { network }
  });
}));

// @route   GET /api/mlm/commissions
// @desc    Get user's commission history
// @access  Private
router.get('/commissions', validateQuery(paginationSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { page, limit, sort, order } = req.query as any;
  const skip = (page - 1) * limit;

  const [commissions, total] = await Promise.all([
    prisma.mLMCommission.findMany({
      where: { toUserId: req.user!.id },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            transactionHash: true,
            createdAt: true
          }
        }
      },
      orderBy: { [sort]: order },
      skip,
      take: limit
    }),
    prisma.mLMCommission.count({ where: { toUserId: req.user!.id } })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      commissions,
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

// @route   GET /api/mlm/stats
// @desc    Get MLM statistics
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.id;

  // Get comprehensive MLM stats
  const [
    directReferrals,
    totalCommissions,
    monthlyCommissions,
    levelStats,
    networkSize,
    activeReferrals
  ] = await Promise.all([
    // Direct referrals
    prisma.user.findMany({
      where: { sponsorId: userId },
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
        _count: {
          select: {
            referrals: true,
            payments: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),

    // Total commissions earned
    prisma.mLMCommission.aggregate({
      where: {
        toUserId: userId,
        status: 'PAID'
      },
      _sum: { amount: true },
      _count: true
    }),

    // Monthly commissions
    prisma.mLMCommission.aggregate({
      where: {
        toUserId: userId,
        status: 'PAID',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: { amount: true },
      _count: true
    }),

    // Commissions by level
    prisma.mLMCommission.groupBy({
      by: ['level'],
      where: {
        toUserId: userId,
        status: 'PAID'
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { level: 'asc' }
    }),

    // Total network size
    getNetworkSize(userId),

    // Active referrals count
    prisma.user.count({
      where: {
        sponsorId: userId,
        membershipExpiry: {
          gt: new Date()
        }
      }
    })
  ]);

  // Process level statistics
  const levelStatistics = Array.from({ length: 6 }, (_, i) => {
    const level = i + 1;
    const levelData = levelStats.find(stat => stat.level === level);

    return {
      level,
      commissionsEarned: levelData?._sum.amount || 0,
      commissionsCount: levelData?._count || 0,
      averageCommission: levelData?._count ? (levelData._sum.amount || 0) / levelData._count : 0
    };
  });

  // Calculate conversion rate
  const conversionRate = directReferrals.length > 0
    ? Math.round((activeReferrals / directReferrals.length) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      stats: {
        directReferralsCount: directReferrals.length,
        totalNetworkSize: networkSize,
        activeReferralsCount: activeReferrals,
        conversionRate,
        totalCommissionsEarned: totalCommissions._sum.amount || 0,
        totalCommissionsCount: totalCommissions._count || 0,
        monthlyCommissionsEarned: monthlyCommissions._sum.amount || 0,
        monthlyCommissionsCount: monthlyCommissions._count || 0,
        averageCommissionPerLevel: levelStatistics.reduce((sum, level) => sum + level.averageCommission, 0) / 6
      },
      directReferrals,
      levelStatistics
    }
  });
}));

// @route   GET /api/mlm/levels/:level
// @desc    Get users at specific MLM level
// @access  Private
router.get('/levels/:level', validateQuery(paginationSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { level } = req.params;
  const { page, limit } = req.query as any;
  const userId = req.user!.id;

  const levelNumber = parseInt(level);
  if (levelNumber < 1 || levelNumber > 6) {
    throw createError('Level must be between 1 and 6', 400);
  }

  // Get users at specific level
  const usersAtLevel = await getUsersAtLevel(userId, levelNumber, page, limit);

  res.json({
    success: true,
    data: {
      level: levelNumber,
      users: usersAtLevel
    }
  });
}));

// @route   GET /api/mlm/referral-link
// @desc    Get user's referral information
// @access  Private
router.get('/referral-link', asyncHandler(async (req: AuthRequest, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      _count: {
        select: {
          referrals: true
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  const referralCode = user.username;
  const referralLink = `${process.env.FRONTEND_URL}/register?ref=${referralCode}`;

  res.json({
    success: true,
    data: {
      referralCode,
      referralLink,
      totalReferrals: user._count.referrals,
      sharingMessage: `Join VideoChat MLM and earn money through our 6-level commission system! Use my referral code: ${referralCode}`
    }
  });
}));

// @route   GET /api/mlm/earnings-report
// @desc    Get detailed earnings report
// @access  Private
router.get('/earnings-report', asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.id;
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate as string);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate as string);
  }

  const whereClause = {
    toUserId: userId,
    status: 'PAID' as const,
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
  };

  const [
    commissionsByLevel,
    commissionsByMonth,
    topPerformingReferrals,
    recentCommissions
  ] = await Promise.all([
    // Commissions grouped by level
    prisma.mLMCommission.groupBy({
      by: ['level'],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
      orderBy: { level: 'asc' }
    }),

    // Get commissions for monthly grouping (simplified for SQLite)
    prisma.mLMCommission.findMany({
      where: whereClause,
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to avoid memory issues
    }),

    // Top performing referrals (users who generated most commissions)
    prisma.mLMCommission.groupBy({
      by: ['fromUserId'],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    }),

    // Recent commissions
    prisma.mLMCommission.findMany({
      where: whereClause,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        payment: {
          select: {
            amount: true,
            currency: true,
            transactionHash: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ]);

  // Process monthly data manually for SQLite compatibility
  const monthlyData = commissionsByMonth.reduce((acc: any[], commission: any) => {
    const monthKey = new Date(commission.createdAt).toISOString().substring(0, 7); // YYYY-MM format

    const existingMonth = acc.find(item => item.month === monthKey);
    if (existingMonth) {
      existingMonth.total_amount += commission.amount;
      existingMonth.commission_count += 1;
    } else {
      acc.push({
        month: monthKey,
        total_amount: commission.amount,
        commission_count: 1
      });
    }

    return acc;
  }, []).sort((a: any, b: any) => b.month.localeCompare(a.month)).slice(0, 12);

  // Get user details for top performing referrals
  const topReferralUserIds = topPerformingReferrals.map(ref => ref.fromUserId);
  const topReferralUsers = await prisma.user.findMany({
    where: { id: { in: topReferralUserIds } },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true
    }
  });

  const topPerformingReferralsWithUsers = topPerformingReferrals.map(ref => {
    const user = topReferralUsers.find(u => u.id === ref.fromUserId);
    return {
      ...ref,
      user
    };
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalEarnings: commissionsByLevel.reduce((sum, level) => sum + (level._sum.amount || 0), 0),
        totalCommissions: commissionsByLevel.reduce((sum, level) => sum + level._count, 0),
        averageCommission: commissionsByLevel.length > 0
          ? commissionsByLevel.reduce((sum, level) => sum + (level._sum.amount || 0), 0) /
            commissionsByLevel.reduce((sum, level) => sum + level._count, 0)
          : 0
      },
      commissionsByLevel,
      commissionsByMonth: monthlyData,
      topPerformingReferrals: topPerformingReferralsWithUsers,
      recentCommissions
    }
  });
}));

// Helper function to get MLM network structure
async function getMLMNetwork(userId: string, maxLevels: number) {
  const network: any[] = [];

  async function getLevel(sponsorIds: string[], currentLevel: number): Promise<any[]> {
    if (currentLevel > maxLevels || sponsorIds.length === 0) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: { sponsorId: { in: sponsorIds } },
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
        _count: {
          select: {
            referrals: true,
            payments: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (users.length === 0) {
      return [];
    }

    const nextLevelUsers = await getLevel(users.map(u => u.id), currentLevel + 1);

    return users.map(user => ({
      ...user,
      level: currentLevel,
      hasActiveMembership: user.membershipExpiry && new Date(user.membershipExpiry) > new Date(),
      children: nextLevelUsers.filter(child => child.sponsorId === user.id)
    }));
  }

  const directReferrals = await getLevel([userId], 1);
  return directReferrals;
}

// Helper function to get network size (SQLite compatible)
async function getNetworkSize(userId: string): Promise<number> {
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

// Helper function to get users at specific level
async function getUsersAtLevel(userId: string, level: number, page: number, limit: number) {
  // This is a simplified version - in production you'd want proper pagination
  const network = await getMLMNetwork(userId, level);

  function getUsersAtSpecificLevel(networkData: any[], targetLevel: number): any[] {
    let users: any[] = [];

    for (const user of networkData) {
      if (user.level === targetLevel) {
        users.push(user);
      }
      if (user.children) {
        users = users.concat(getUsersAtSpecificLevel(user.children, targetLevel));
      }
    }

    return users;
  }

  const usersAtLevel = getUsersAtSpecificLevel(network, level);

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    users: usersAtLevel.slice(startIndex, endIndex),
    total: usersAtLevel.length,
    page,
    limit,
    totalPages: Math.ceil(usersAtLevel.length / limit)
  };
}

export default router;

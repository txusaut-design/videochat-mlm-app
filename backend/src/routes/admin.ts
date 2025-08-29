import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Simple admin authentication middleware
const adminAuth = (req: any, res: any, next: any) => {
  const { authorization } = req.headers;

  // Simple admin token check - in production use proper JWT with admin role
  if (authorization === 'Bearer admin-token' || req.body.adminAuth === 'admin123') {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', asyncHandler(async (req: any, res: any) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token: 'admin-token',
        user: {
          username: 'admin',
          role: 'admin'
        }
      }
    });
  } else {
    throw createError('Invalid admin credentials', 401);
  }
}));

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Admin
router.get('/dashboard', adminAuth, asyncHandler(async (req: any, res: any) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get basic statistics
  const [
    totalUsers,
    activeUsers,
    totalRooms,
    activeRooms,
    totalCommissions,
    totalVotings,
    totalExpulsions,
    registrationsToday,
    revenueThisMonth
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    }),
    prisma.room.count(),
    prisma.room.count({
      where: {
        currentParticipants: {
          gt: 0
        }
      }
    }),
    prisma.mLMCommission.aggregate({
      _sum: {
        amount: true
      }
    }),
    prisma.voting.count(),
    prisma.expulsion.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    }),
    prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: thisMonth
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })
  ]);

  // Get average session duration (mock calculation)
  const avgSessionTime = await prisma.user.aggregate({
    _avg: {
      totalSessionTime: true
    }
  });

  const stats = {
    totalUsers,
    activeUsers,
    totalRooms,
    activeRooms,
    totalCommissions: totalCommissions._sum.amount || 0,
    totalVotings,
    totalExpulsions,
    registrationsToday,
    revenueThisMonth: revenueThisMonth._sum.amount || 0,
    averageSessionDuration: avgSessionTime._avg.totalSessionTime || 0
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

// @route   GET /api/admin/users
// @desc    Get all users with admin details
// @access  Admin
router.get('/users', adminAuth, asyncHandler(async (req: any, res: any) => {
  const { limit = 50, offset = 0, status, search } = req.query;

  const where: any = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } }
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      referralCode: true,
      sponsorCode: true,
      totalEarnings: true,
      totalCommissionsPaid: true,
      membershipExpiry: true,
      isActive: true,
      status: true,
      lastActive: true,
      totalSessionTime: true,
      createdAt: true,
      sponsor: {
        select: {
          firstName: true,
          lastName: true,
          referralCode: true
        }
      },
      _count: {
        select: {
          referrals: true,
          createdRooms: true,
          receivedCommissions: true,
          initiatedVotings: true,
          expulsions: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: parseInt(limit as string),
    skip: parseInt(offset as string)
  });

  const totalCount = await prisma.user.count({ where });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
      }
    }
  });
}));

// @route   PUT /api/admin/users/:userId/status
// @desc    Update user status (suspend/activate/ban)
// @access  Admin
router.put('/users/:userId/status', adminAuth, asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;
  const { status, reason } = req.body;

  if (!['active', 'suspended', 'banned'].includes(status)) {
    throw createError('Invalid status. Must be: active, suspended, or banned', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true
    }
  });

  // Create moderation log
  await prisma.moderationLog.create({
    data: {
      type: status === 'active' ? 'user_activated' : status === 'suspended' ? 'user_suspended' : 'user_banned',
      initiatorId: 'admin', // In real app, use actual admin user ID
      targetId: userId,
      details: `User ${status} by admin${reason ? `: ${reason}` : ''}`,
      metadata: {
        previousStatus: user.status,
        newStatus: status,
        reason
      }
    }
  });

  res.json({
    success: true,
    message: `User ${status} successfully`,
    data: { user }
  });
}));

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user (soft delete by banning)
// @access  Admin
router.delete('/users/:userId', adminAuth, asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;
  const { reason } = req.body;

  // Don't actually delete, just ban the user
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'banned',
      isActive: false
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  // Create moderation log
  await prisma.moderationLog.create({
    data: {
      type: 'user_banned',
      initiatorId: 'admin',
      targetId: userId,
      details: `User banned by admin${reason ? `: ${reason}` : ''}`,
      metadata: {
        action: 'delete_user',
        reason
      }
    }
  });

  res.json({
    success: true,
    message: 'User banned successfully',
    data: { user }
  });
}));

// @route   GET /api/admin/rooms
// @desc    Get all rooms with admin details
// @access  Admin
router.get('/rooms', adminAuth, asyncHandler(async (req: any, res: any) => {
  const rooms = await prisma.room.findMany({
    include: {
      creator: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      _count: {
        select: {
          members: true,
          votings: true,
          expulsions: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const roomsWithDetails = rooms.map(room => ({
    ...room,
    isCurrentlyActive: room.currentParticipants > 0,
    createdBy: `${room.creator.firstName} ${room.creator.lastName}`,
    totalParticipations: room._count.members,
    totalVotings: room._count.votings,
    totalExpulsions: room._count.expulsions
  }));

  res.json({
    success: true,
    data: { rooms: roomsWithDetails }
  });
}));

// @route   GET /api/admin/moderation/logs
// @desc    Get all moderation logs
// @access  Admin
router.get('/moderation/logs', adminAuth, asyncHandler(async (req: any, res: any) => {
  const { limit = 50, offset = 0, type, roomId } = req.query;

  const where: any = {};

  if (type) {
    where.type = type;
  }

  if (roomId) {
    where.roomId = roomId;
  }

  const logs = await prisma.moderationLog.findMany({
    where,
    include: {
      initiator: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      room: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: parseInt(limit as string),
    skip: parseInt(offset as string)
  });

  const totalCount = await prisma.moderationLog.count({ where });

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
      }
    }
  });
}));

// @route   GET /api/admin/mlm/commissions
// @desc    Get MLM commission history
// @access  Admin
router.get('/mlm/commissions', adminAuth, asyncHandler(async (req: any, res: any) => {
  const { limit = 50, offset = 0 } = req.query;

  const commissions = await prisma.mLMCommission.findMany({
    include: {
      fromUser: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      toUser: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      payment: {
        select: {
          amount: true,
          status: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: parseInt(limit as string),
    skip: parseInt(offset as string)
  });

  const totalCount = await prisma.mLMCommission.count();

  const formattedCommissions = commissions.map(commission => ({
    id: commission.id,
    payerName: `${commission.fromUser.firstName} ${commission.fromUser.lastName}`,
    recipientName: `${commission.toUser.firstName} ${commission.toUser.lastName}`,
    level: commission.level,
    amount: commission.amount,
    status: commission.status,
    description: commission.description || `Level ${commission.level} commission`,
    timestamp: commission.createdAt
  }));

  res.json({
    success: true,
    data: {
      commissions: formattedCommissions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
      }
    }
  });
}));

// @route   GET /api/admin/metrics
// @desc    Get platform metrics for charts
// @access  Admin
router.get('/metrics', adminAuth, asyncHandler(async (req: any, res: any) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  // Get daily registrations for last 7 days
  const dailyRegistrations = await Promise.all(
    last7Days.map(async (date) => {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      return { date, count };
    })
  );

  // Get daily active users for last 7 days
  const dailyActiveUsers = await Promise.all(
    last7Days.map(async (date) => {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');

      const count = await prisma.user.count({
        where: {
          lastActive: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      return { date, count };
    })
  );

  // Get room usage stats
  const roomUsage = await prisma.room.findMany({
    select: {
      name: true,
      totalParticipations: true,
      averageDuration: true
    },
    orderBy: {
      totalParticipations: 'desc'
    },
    take: 10
  });

  const metrics = {
    dailyActiveUsers,
    dailyRegistrations,
    dailyRevenue: last7Days.map(date => ({ date, amount: Math.floor(Math.random() * 500) + 100 })), // Mock data
    roomUsage: roomUsage.map(room => ({
      roomName: room.name,
      sessions: room.totalParticipations,
      duration: room.averageDuration
    })),
    deviceStats: { mobile: 45, desktop: 35, tablet: 20 }, // Mock data
    geographicStats: [ // Mock data
      { country: 'España', users: 45 },
      { country: 'México', users: 38 },
      { country: 'Argentina', users: 29 },
      { country: 'Colombia', users: 22 },
      { country: 'Chile', users: 15 }
    ]
  };

  res.json({
    success: true,
    data: { metrics }
  });
}));

export default router;

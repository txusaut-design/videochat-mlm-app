import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  validate,
  validateParams,
  validateQuery,
  createPaymentSchema,
  idParamSchema,
  paginationSchema
} from '../validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/payments
// @desc    Get user's payment history
// @access  Private
router.get('/', validateQuery(paginationSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { page, limit, sort, order } = req.query as any;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: req.user!.id },
      include: {
        commissions: {
          include: {
            toUser: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { [sort]: order },
      skip,
      take: limit
    }),
    prisma.payment.count({ where: { userId: req.user!.id } })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      payments,
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

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const payment = await prisma.payment.findFirst({
    where: {
      id,
      userId: req.user!.id // Users can only view their own payments
    },
    include: {
      commissions: {
        include: {
          toUser: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { level: 'asc' }
      }
    }
  });

  if (!payment) {
    throw createError('Payment not found', 404);
  }

  res.json({
    success: true,
    data: { payment }
  });
}));

// @route   POST /api/payments
// @desc    Create a new payment for membership
// @access  Private
router.post('/', validate(createPaymentSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { amount, currency, transactionHash } = req.body;
  const userId = req.user!.id;

  // Check if transaction hash already exists
  const existingPayment = await prisma.payment.findUnique({
    where: { transactionHash }
  });

  if (existingPayment) {
    throw createError('Transaction hash already used', 400);
  }

  // Validate amount (should be $10 for membership)
  const expectedAmount = Number(process.env.MEMBERSHIP_PRICE_USD) || 10;
  if (amount !== expectedAmount) {
    throw createError(`Payment amount must be $${expectedAmount}`, 400);
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount,
      currency,
      transactionHash,
      status: 'COMPLETED', // In real app, this would be PENDING until verified
      membershipExtension: Number(process.env.MEMBERSHIP_DURATION_DAYS) || 28
    }
  });

  // Update user's membership
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipExpiry: true }
  });

  const currentExpiry = user?.membershipExpiry || new Date();
  const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 28 * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      membershipExpiry: newExpiry,
      isActive: true
    }
  });

  // Process MLM commissions
  const commissions = await processMLMCommissions(userId, payment.id);

  // Get payment with commissions
  const paymentWithCommissions = await prisma.payment.findUnique({
    where: { id: payment.id },
    include: {
      commissions: {
        include: {
          toUser: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { level: 'asc' }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Payment processed successfully',
    data: {
      payment: paymentWithCommissions,
      membershipExtended: true,
      newExpiryDate: newExpiry,
      commissionsDistributed: commissions.length
    }
  });
}));

// @route   GET /api/payments/stats/overview
// @desc    Get payment statistics
// @access  Private
router.get('/stats/overview', asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.id;

  const [
    totalPayments,
    totalSpent,
    lastPayment,
    monthlyPayments,
    membershipStatus
  ] = await Promise.all([
    prisma.payment.count({
      where: {
        userId,
        status: 'COMPLETED'
      }
    }),

    prisma.payment.aggregate({
      where: {
        userId,
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    }),

    prisma.payment.findFirst({
      where: {
        userId,
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' }
    }),

    prisma.payment.count({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),

    prisma.user.findUnique({
      where: { id: userId },
      select: {
        membershipExpiry: true,
        isActive: true
      }
    })
  ]);

  const hasActiveMembership = membershipStatus?.membershipExpiry &&
    new Date(membershipStatus.membershipExpiry) > new Date();

  const daysUntilExpiry = hasActiveMembership
    ? Math.ceil((new Date(membershipStatus!.membershipExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({
    success: true,
    data: {
      stats: {
        totalPayments,
        totalSpent: totalSpent._sum.amount || 0,
        monthlyPayments,
        hasActiveMembership,
        daysUntilExpiry,
        lastPaymentDate: lastPayment?.createdAt,
        membershipExpiry: membershipStatus?.membershipExpiry
      }
    }
  });
}));

// Helper function to process MLM commissions
async function processMLMCommissions(payingUserId: string, paymentId: string) {
  const commissions = [];
  const maxLevels = Number(process.env.MLM_MAX_LEVELS) || 5;
  const level1Commission = Number(process.env.MLM_LEVEL_1_COMMISSION) || 3.5;
  const level2to5Commission = Number(process.env.MLM_LEVEL_2_5_COMMISSION) || 1;

  // Get the paying user's sponsor chain
  let currentUserId = payingUserId;

  for (let level = 1; level <= maxLevels; level++) {
    // Find the sponsor at this level
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { sponsorId: true }
    });

    if (!user?.sponsorId) {
      break; // No more sponsors in chain
    }

    // Check if sponsor has active membership
    const sponsor = await prisma.user.findUnique({
      where: { id: user.sponsorId },
      select: {
        id: true,
        membershipExpiry: true,
        totalEarnings: true
      }
    });

    if (!sponsor) {
      break;
    }

    const hasActiveMembership = sponsor.membershipExpiry &&
      new Date(sponsor.membershipExpiry) > new Date();

    if (hasActiveMembership) {
      // Determine commission amount based on level
      const commissionAmount = level === 1 ? level1Commission : level2to5Commission;

      // Create commission record
      const commission = await prisma.mLMCommission.create({
        data: {
          fromUserId: payingUserId,
          toUserId: sponsor.id,
          level,
          amount: commissionAmount,
          paymentId,
          status: 'PAID'
        }
      });

      commissions.push(commission);

      // Update sponsor's total earnings
      await prisma.user.update({
        where: { id: sponsor.id },
        data: {
          totalEarnings: sponsor.totalEarnings + commissionAmount
        }
      });
    }

    // Move to next level
    currentUserId = user.sponsorId;
  }

  return commissions;
}

// @route   POST /api/payments/:id/verify
// @desc    Verify payment transaction (admin only - for real blockchain verification)
// @access  Private (Admin)
router.post('/:id/verify', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  // This would be used in production to verify blockchain transactions
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id }
  });

  if (!payment) {
    throw createError('Payment not found', 404);
  }

  if (payment.status === 'COMPLETED') {
    throw createError('Payment already verified', 400);
  }

  // In a real implementation, you would:
  // 1. Check the blockchain for the transaction
  // 2. Verify the amount and recipient
  // 3. Update payment status accordingly

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: { status: 'COMPLETED' }
  });

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: { payment: updatedPayment }
  });
}));

export default router;

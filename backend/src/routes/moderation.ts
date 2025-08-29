import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// @route   POST /api/moderation/voting/start
// @desc    Start a voting to expel a user
// @access  Private
router.post('/voting/start', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { roomId, targetUserId, reason } = req.body;
  const initiatorId = req.user!.id;

  // Validate room exists and user is in it
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        where: {
          leftAt: null // Only active members
        }
      }
    }
  });

  if (!room) {
    throw createError('Room not found', 404);
  }

  // Check if initiator is in the room
  const initiatorInRoom = room.members.some(member => member.userId === initiatorId);
  if (!initiatorInRoom) {
    throw createError('You must be in the room to start a voting', 403);
  }

  // Check if target is in the room
  const targetInRoom = room.members.some(member => member.userId === targetUserId);
  if (!targetInRoom) {
    throw createError('Target user is not in the room', 400);
  }

  // Can't vote against yourself
  if (initiatorId === targetUserId) {
    throw createError('You cannot vote against yourself', 400);
  }

  // Check if there's already an active voting for this user in this room
  const existingVoting = await prisma.voting.findFirst({
    where: {
      roomId,
      targetId: targetUserId,
      isCompleted: false
    }
  });

  if (existingVoting) {
    throw createError('There is already an active voting for this user', 400);
  }

  // Calculate required votes (50% + 1)
  const totalParticipants = room.members.length;
  const requiredVotes = Math.floor(totalParticipants / 2) + 1;

  // Minimum 2 participants required for voting
  if (totalParticipants < 2) {
    throw createError('At least 2 participants required for voting', 400);
  }

  // Create voting
  const voting = await prisma.voting.create({
    data: {
      roomId,
      initiatorId,
      targetId: targetUserId,
      reason: reason || 'Inappropriate behavior',
      requiredVotes,
      totalParticipants
    },
    include: {
      initiator: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      target: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      votes: {
        include: {
          voter: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });

  // Create moderation log
  await prisma.moderationLog.create({
    data: {
      type: 'voting_started',
      roomId,
      initiatorId,
      targetId: targetUserId,
      details: `Voting started to expel ${voting.target.firstName} ${voting.target.lastName}`,
      metadata: {
        reason,
        requiredVotes,
        totalParticipants
      }
    }
  });

  // Update room voting count
  await prisma.room.update({
    where: { id: roomId },
    data: {
      totalVotings: {
        increment: 1
      },
      lastActivity: new Date()
    }
  });

  res.status(201).json({
    success: true,
    message: 'Voting started successfully',
    data: { voting }
  });
}));

// @route   POST /api/moderation/voting/:votingId/vote
// @desc    Cast a vote in an active voting
// @access  Private
router.post('/voting/:votingId/vote', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { votingId } = req.params;
  const { reason } = req.body;
  const voterId = req.user!.id;

  // Find the voting
  const voting = await prisma.voting.findUnique({
    where: { id: votingId },
    include: {
      room: {
        include: {
          members: {
            where: {
              leftAt: null
            }
          }
        }
      },
      votes: true,
      target: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!voting) {
    throw createError('Voting not found', 404);
  }

  if (voting.isCompleted) {
    throw createError('Voting is already completed', 400);
  }

  // Check if voter is in the room
  const voterInRoom = voting.room.members.some(member => member.userId === voterId);
  if (!voterInRoom) {
    throw createError('You must be in the room to vote', 403);
  }

  // Can't vote against yourself
  if (voterId === voting.targetId) {
    throw createError('You cannot vote against yourself', 400);
  }

  // Check if user already voted
  const existingVote = voting.votes.find(vote => vote.voterId === voterId);
  if (existingVote) {
    throw createError('You have already voted in this voting', 400);
  }

  // Create vote
  const vote = await prisma.vote.create({
    data: {
      votingId,
      voterId,
      reason: reason || 'Supporting the expulsion'
    }
  });

  // Check if voting should be completed
  const totalVotes = voting.votes.length + 1; // +1 for the new vote
  let updatedVoting = voting;

  if (totalVotes >= voting.requiredVotes) {
    // Voting successful - expel user

    // Update voting as completed
    updatedVoting = await prisma.voting.update({
      where: { id: votingId },
      data: {
        isCompleted: true,
        result: 'expelled',
        completedAt: new Date()
      },
      include: {
        votes: {
          include: {
            voter: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        target: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create expulsion record
    const expulsion = await prisma.expulsion.create({
      data: {
        votingId,
        userId: voting.targetId,
        roomId: voting.roomId,
        reason: `Expelled by democratic voting (${totalVotes}/${voting.requiredVotes} votes)`,
        expelledBy: updatedVoting.votes.map(v => v.voterId)
      }
    });

    // Remove user from room
    await prisma.roomMember.updateMany({
      where: {
        roomId: voting.roomId,
        userId: voting.targetId,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    });

    // Create moderation log
    await prisma.moderationLog.create({
      data: {
        type: 'user_expelled',
        roomId: voting.roomId,
        initiatorId: voting.initiatorId,
        targetId: voting.targetId,
        details: `User ${voting.target.firstName} ${voting.target.lastName} expelled by democratic voting`,
        metadata: {
          totalVotes,
          requiredVotes: voting.requiredVotes,
          expulsionId: expulsion.id
        }
      }
    });

    // Update room expulsion count
    await prisma.room.update({
      where: { id: voting.roomId },
      data: {
        totalExpulsions: {
          increment: 1
        },
        currentParticipants: {
          decrement: 1
        },
        lastActivity: new Date()
      }
    });
  }

  res.json({
    success: true,
    message: totalVotes >= voting.requiredVotes ? 'Vote cast - User expelled!' : 'Vote cast successfully',
    data: {
      vote,
      voting: {
        id: updatedVoting.id,
        currentVotes: totalVotes,
        requiredVotes: voting.requiredVotes,
        isCompleted: totalVotes >= voting.requiredVotes,
        result: totalVotes >= voting.requiredVotes ? 'expelled' : null
      }
    }
  });
}));

// @route   GET /api/moderation/voting/room/:roomId/active
// @desc    Get active votings in a room
// @access  Private
router.get('/voting/room/:roomId/active', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  // Check if user is in the room
  const roomMember = await prisma.roomMember.findFirst({
    where: {
      roomId,
      userId,
      leftAt: null
    }
  });

  if (!roomMember) {
    throw createError('You must be in the room to view votings', 403);
  }

  const activeVotings = await prisma.voting.findMany({
    where: {
      roomId,
      isCompleted: false
    },
    include: {
      initiator: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      target: {
        select: {
          firstName: true,
          lastName: true,
          username: true
        }
      },
      votes: {
        include: {
          voter: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({
    success: true,
    data: { votings: activeVotings }
  });
}));

// @route   GET /api/moderation/logs/room/:roomId
// @desc    Get moderation logs for a room
// @access  Private
router.get('/logs/room/:roomId', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { roomId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const logs = await prisma.moderationLog.findMany({
    where: { roomId },
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

  res.json({
    success: true,
    data: { logs }
  });
}));

// @route   GET /api/moderation/user/:userId/expulsions
// @desc    Check if user is expelled from any rooms
// @access  Private
router.get('/user/:userId/expulsions', authenticate, asyncHandler(async (req: AuthRequest, res: any) => {
  const { userId } = req.params;

  const expulsions = await prisma.expulsion.findMany({
    where: { userId },
    include: {
      voting: {
        include: {
          room: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get list of room IDs user is expelled from
  const expelledRoomIds = expulsions.map(exp => exp.voting.room.id);

  res.json({
    success: true,
    data: {
      expulsions,
      expelledRoomIds
    }
  });
}));

export default router;
